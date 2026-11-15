// 전시 진단 기록 (2026-11-12) — 전시 중에만 보이던 깜박임·하얀 배경(+ 깨진 이미지 아이콘)의 원인을 잡으려고.
// 집에서는 재현이 안 됐다(4K 외부 모니터 + 몇 시간 켜 둠 + Ollama가 GPU를 같이 씀이 다르다).
//
// 남기는 것 (한 줄 = JSON 하나):
//   start      페이지 시작 — 화면·DPR·캔버스 상한·UA
//   ctxlost / ctxrestored   WebGL 컨텍스트를 잃음/되찾음 (어느 캔버스인지)
//   reserr     이미지 등 리소스 로딩 실패
//   jserror / rejection     잡히지 않은 오류
//   stall      화면이 앞에 있는데 한 프레임이 STALL_MS 넘게 멈춤 (그때 화자·receiver)
//   bgdecode   배경 이미지 BG_d를 다시 디코딩해 봄 — 실패하면 '하얀 배경'과 같은 때일 가능성
//   beat       HEARTBEAT_MS마다 — 켠 지 몇 분, JS 메모리, 캔버스 수, 지금까지 멈춤·대답 수
//   event      페이지가 알려 주는 일(receiver 전환, 대답 시작/끝 등 — diag.note)
//
// 어디로: dev 서버(vite.config.js `/__diag`)가 logs/diag-<날짜>.jsonl 에 이어 쓴다(gitignore).
// 서버에 못 보내면(빌드본·gh-pages) localStorage 'asemic.diag'에 최근 것만 남긴다. 콘솔: diag.dump()
// 끄기: output.html?diag=0

const STALL_MS = 250;
const HEARTBEAT_MS = 5 * 60 * 1000;
const FLUSH_MS = 10 * 1000;
const LOCAL_KEY = 'asemic.diag';
const LOCAL_MAX = 400;

export function startDiag({ enabled = true, info = {}, bgUrl = null, state = () => ({}) } = {}) {
    const api = { note() {}, dump: () => [] };
    if (!enabled) return api;

    const t0 = performance.now();
    const session = new Date().toISOString();
    const counts = { stall: 0, ctxlost: 0, reserr: 0, jserror: 0, bgfail: 0 };
    let buf = [];
    let serverOk = true;

    const mins = () => +((performance.now() - t0) / 60000).toFixed(2);
    function log(kind, data = {}) {
        const row = { at: new Date().toISOString(), up: mins(), kind, ...safeState(), ...data };
        buf.push(row);
        if (kind !== 'beat') console.warn('[diag]', kind, data);
        if (kind === 'ctxlost' || kind === 'bgdecode') flush(); // 터지기 직전일 수 있다 — 바로 보낸다
    }
    function safeState() {
        try {
            return state();
        } catch {
            return {};
        }
    }

    async function flush() {
        if (!buf.length) return;
        const rows = buf;
        buf = [];
        keepLocal(rows);
        if (!serverOk) return;
        try {
            const r = await fetch(`/__diag?session=${encodeURIComponent(session)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-ndjson' },
                body: rows.map(r => JSON.stringify(r)).join('\n') + '\n',
                keepalive: true,
            });
            if (!r.ok) serverOk = false;
        } catch {
            serverOk = false;
        }
    }
    function keepLocal(rows) {
        try {
            const old = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
            localStorage.setItem(LOCAL_KEY, JSON.stringify(old.concat(rows).slice(-LOCAL_MAX)));
        } catch {
            /* 사생활 모드 등 — 없어도 된다 */
        }
    }

    const canvasName = el => el?.id || el?.parentElement?.id || el?.className || el?.tagName || '?';

    // 컨텍스트 이벤트는 거품이 안 올라가지만 캡처 단계로는 문서에서 잡힌다(문서에 붙은 캔버스만)
    document.addEventListener(
        'webglcontextlost',
        e => {
            counts.ctxlost++;
            log('ctxlost', { canvas: canvasName(e.target), w: e.target.width, h: e.target.height });
        },
        true,
    );
    document.addEventListener('webglcontextrestored', e => log('ctxrestored', { canvas: canvasName(e.target) }), true);
    window.addEventListener(
        'error',
        e => {
            if (e.target && e.target !== window) {
                counts.reserr++;
                log('reserr', { tag: e.target.tagName, src: String(e.target.src || e.target.href || '').slice(0, 200) });
            } else {
                counts.jserror++;
                log('jserror', { msg: String(e.message).slice(0, 300), src: `${e.filename}:${e.lineno}` });
            }
        },
        true,
    );
    window.addEventListener('unhandledrejection', e => {
        counts.jserror++;
        log('rejection', { msg: String(e.reason?.message ?? e.reason).slice(0, 300) });
    });

    // 멈춤 — 탭이 뒤에 있으면 rAF가 쉬므로 그땐 안 센다
    let last = performance.now();
    let wasHidden = document.hidden;
    (function frame() {
        const now = performance.now();
        const dt = now - last;
        if (!document.hidden && !wasHidden && dt > STALL_MS) {
            counts.stall++;
            log('stall', { ms: Math.round(dt) });
        }
        wasHidden = document.hidden;
        last = now;
        requestAnimationFrame(frame);
    })();
    document.addEventListener('visibilitychange', () => {
        // 탭이 뒤에 있으면 rAF가 아예 안 돌아서 frame이 hidden을 못 본다 — 돌아온 첫 프레임이 뒤에 있던 시간 전체를 멈춤으로 셌다(11-14 기록 179초·203초)
        wasHidden = true;
        log('event', { what: document.hidden ? 'hidden' : 'visible' });
    });

    // 배경 이미지를 따로 디코딩해 본다 — CSS 배경이 깨진 순간을 JS가 직접 볼 수는 없어서 대신 잰다
    async function checkBg() {
        if (!bgUrl) return;
        const im = new Image();
        im.src = bgUrl;
        try {
            await im.decode();
        } catch (err) {
            counts.bgfail++;
            log('bgdecode', { ok: false, msg: String(err?.message ?? err).slice(0, 200) });
        }
    }

    function beat() {
        const m = performance.memory;
        log('beat', {
            heapMB: m ? Math.round(m.usedJSHeapSize / 1e6) : null,
            heapLimitMB: m ? Math.round(m.jsHeapSizeLimit / 1e6) : null,
            canvases: document.querySelectorAll('canvas').length,
            dom: document.getElementsByTagName('*').length,
            ...counts,
        });
        checkBg();
    }

    log('start', {
        screen: `${screen.width}x${screen.height}`,
        win: `${innerWidth}x${innerHeight}`,
        dpr: devicePixelRatio,
        ua: navigator.userAgent,
        ...info,
    });
    beat();
    setInterval(beat, HEARTBEAT_MS);
    setInterval(flush, FLUSH_MS);
    addEventListener('pagehide', flush);

    api.note = (what, data = {}) => log('event', { what, ...data });
    api.dump = () => {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        } catch {
            return [];
        }
    };
    return api;
}
