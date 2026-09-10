// ── bridge.js ────────────────────────────────────────────────────────────────
// output.html(전시 디스플레이) ↔ TouchDesigner WebSocket 브릿지.
//
// TD 쪽: WebSocket DAT(server mode)를 ws://<host>:9980 로 열어둔다.
// 개발 중 TD 없이 테스트: `npm run bridge` (src/dev/bridge-server.mjs) 로 허브를 띄운다.
//
// 설계:
//  - TD/서버가 없어도 페이지는 정상 동작 (send는 큐잉, 백그라운드에서 재접속 시도만).
//  - 재접속: 지수 백오프(0.5s → 8s).
//  - 인터페이스는 BroadcastChannel 시절 syncChannel.js 와 호환되게 최소화: send / on / close.
//
// ── 메시지 스키마 ─────────────────────────────────────────────────────────────
// page → TD
//   { t:'hello',    role:'output' }                         접속 시 자동
//   { t:'compose',  text, sylCount }                        키 입력마다
//   { t:'syllable', char, cho:{jamo,x,y,z},                 마지막 완성 음절(→ analyzer)
//                   jung:{jamo,f1,f2,f3,yang,diph}, jong:{jamo,x,y,z}|null }
//   { t:'turn',     phase:'baking' }                        제출 시작
//   { t:'turn',     phase:'done', png:<dataURL>, h:<px> }   bake 완료(→ 아카이브)
//   { t:'receiver', name }                                  활성 receiver(로드/전환)
// TD → page
//   { t:'param',    size?, lineHeight?, letterSpacing? }    하드웨어 노브/슬라이더
//   { t:'text',     value }                                 입력 텍스트 주입(원격 키보드 / LLM 응답)
//   { t:'submit' }                                          물리 send 버튼
//   { t:'clear' }                                           입력/화면 초기화
//   { t:'mode',     joke?, question? }                      토글
//   { t:'receiver', name }                                  receiver 전환
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 9980;

export function createBridge(opts = {}) {
    const url =
        opts.url ??
        new URLSearchParams(location.search).get('bridge') ??
        `ws://${location.hostname || 'localhost'}:${DEFAULT_PORT}`;

    const listeners = new Map(); // type -> Set<cb>   (특수 타입: '*' 전체, '_open', '_close')
    let ws = null;
    let queue = [];
    let reconnectT = null;
    let backoff = 500;
    let closed = false;

    function fire(type, ...args) {
        listeners.get(type)?.forEach(cb => {
            try {
                cb(...args);
            } catch (e) {
                console.error('[bridge] listener error', e);
            }
        });
    }

    function rawSend(m) {
        try {
            ws.send(JSON.stringify(m));
            return true;
        } catch {
            return false;
        }
    }

    function connect() {
        if (closed) return;
        try {
            ws = new WebSocket(url);
        } catch {
            scheduleReconnect();
            return;
        }
        ws.addEventListener('open', () => {
            backoff = 500;
            rawSend({ t: 'hello', role: 'output' });
            const pending = queue;
            queue = [];
            for (const m of pending) if (!rawSend(m)) queue.push(m);
            fire('_open');
        });
        ws.addEventListener('message', ev => {
            let msg;
            try {
                msg = JSON.parse(ev.data);
            } catch {
                return;
            }
            if (msg && typeof msg.t === 'string') {
                fire(msg.t, msg);
                fire('*', msg);
            }
        });
        ws.addEventListener('close', () => {
            ws = null;
            fire('_close');
            scheduleReconnect();
        });
        ws.addEventListener('error', () => {
            try {
                ws.close();
            } catch {
                /* noop */
            }
        });
    }

    function scheduleReconnect() {
        if (closed || reconnectT) return;
        reconnectT = setTimeout(() => {
            reconnectT = null;
            connect();
        }, backoff);
        backoff = Math.min(Math.round(backoff * 1.7), 8000);
    }

    connect();

    return {
        // 메시지 전송 — 미접속이면 큐잉(상한 200, 오래된 것부터 버림)
        send(msg) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                if (rawSend(msg)) return;
            }
            queue.push(msg);
            if (queue.length > 200) queue.shift();
        },
        // on(type, cb) → 해제 함수 반환. type='*' 이면 모든 메시지.
        on(type, cb) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(cb);
            return () => listeners.get(type)?.delete(cb);
        },
        close() {
            closed = true;
            clearTimeout(reconnectT);
            reconnectT = null;
            try {
                ws?.close();
            } catch {
                /* noop */
            }
        },
        get connected() {
            return !!ws && ws.readyState === WebSocket.OPEN;
        },
        get url() {
            return url;
        },
    };
}
