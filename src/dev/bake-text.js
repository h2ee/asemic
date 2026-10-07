// ── bake-text.js ──────────────────────────────────────────────────────────────
// 단어·문단 = 세로로 긴 PNG 하나. 텍스트를 한 줄 최대 N음절(기본 7)로 접고, 줄마다 mycelium으로
// 한 음절씩 실제 성장 그대로 키운 뒤 그 줄의 띠(strip)를 떠서 "종이"에 붙인다. 줄이 쌓여 화면을
// 넘으면 웹툰처럼 아래로 스크롤된다. 저장 PNG는 가로 고정(?width), 세로는 줄 수만큼 늘어난다.
//
//   http://localhost:5173/asemic/src/dev/bake-text.html   (npm run dev — 저장은 vite.config.js /__bake)
//   ?perLine=7  한 줄 최대 음절 — 이 개수가 화면 가로에 꽉 차는 크기로 글자 크기가 정해진다
//   ?width=1080 출력 가로(px). 0이면 원본(창 가로 × DPR)
//   ?lh=2.3     줄 간격(글자 크기 배수). 기본은 receiver lineHeightRatio(전시와 같음)
//   ?fill=0.96  창 가로 대비 한 줄(N음절 + 양끝 글자 여백) 폭 비율
//   ?dir=mycelium-text  ?instant=1  ?text=…  ?auto=1  ?bg=%23b3b3b3(보기 배경)
//
// 텍스트 규칙: 줄바꿈 = 강제 줄바꿈(빈 줄 = 빈 줄), `---`만 있는 줄 = 다음 이미지로 나눔.
// 단어는 안 쪼갠다(한 줄보다 긴 단어만 쪼갬). 띄어쓰기 폭은 core.calcTextboxLayout과 같은 0.2칸.
//
// 줄은 늘 화면 세로 정중앙에서 키운다 — 카메라 원근이 줄마다 같아서 모든 줄이 같은 룩.
// 화면엔 mycelium 캔버스를 그 줄의 종이 위 자리로 translateY 해서 겹쳐 보인다.
// 줄끼리 세로로 겹치면(글자 끝 1.5× vs 줄 간격 2.3×) 뒤 줄이 위에 덮인다 — 전시 누적 버퍼와 같은 순서.
//
// 연결 실(허브)은 **문장 단위** — index.html에서 엔터로 낸 한 문장이 한 누적 버퍼인 것과 맞춘 것.
// 문장 끝 = `.?!…。`로 끝나는 단어, 그리고 줄바꿈. 문장은 줄 중간에서 끝나고 시작할 수 있다(배치는 그대로).
//   - 줄마다 버퍼를 비우므로, 줄이 끝날 때 남은 허브를 한 줄 높이만큼 위로(같은 카메라 깊이) 옮겨 다음 줄에
//     다시 심는다(mycelium 스크롤이 허브를 옮기는 것과 같은 방식). 위로 뻗는 실까지 띠에 담으려고 띠 위쪽을 넓힌다.
//   - 화면 밖(위)으로 나간 허브는 버린다 — 줄은 늘 화면 가운데서 자라니 대략 1~2줄 위까지만 닿는다.
//   - 다른 문장의 허브는 지우고, 문장 첫 음절이 앞 문장 끝 음절을 허브로 등록하지 못하게 막는다
//     (mycelium update()는 새 음절을 붙일 때 바로 앞 음절을 무조건 허브 후보로 올린다).

import * as THREE from 'three';
import { decomposeSyllables, syllablesToUniforms } from '../js/core.js';
import { makeBakeReceiver, glyphScaleFor, readAccum, listSaved, savePng } from './bake-common.js';

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);

const BAND = 1.9; // 줄 중심에서 띠 위아래 끝까지(글자 크기 배수) — 에피사이클 이론상 최대 ~1.84
const PAD = 0.3; // 종이 맨 위/아래 여백(글자 크기 배수)
const MAX_PNG_H = 16384; // 이보다 길면 _p1, _p2…로 나눠 저장(브라우저 캔버스 한계)

const { r, frame, waitIdle } = await makeBakeReceiver();
const overlay = r._renderer.domElement;
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '5';

$('text').value = q.get('text') ?? '';
$('perLine').value = q.get('perLine') ?? 7;
$('width').value = q.get('width') ?? 1080;
$('lh').value = q.get('lh') ?? r.lineHeightRatio;
$('dir').value = q.get('dir') ?? 'mycelium-text';
$('instant').checked = q.get('instant') === '1';
const FILL = parseFloat(q.get('fill')) || 0.96;
if (q.get('bg')) document.documentElement.style.setProperty('--bg', q.get('bg'));

$('fold').onclick = () => {
    const f = $('panel').classList.toggle('folded');
    $('fold').textContent = f ? '패널' : '패널 접기';
};

let resizes = 0;
window.addEventListener('resize', () => resizes++);

// ── 줄 접기 ───────────────────────────────────────────────────────────────────
// 줄 = [{ syl, u, sent }] — u는 줄 안 가로 위치(음절 간격 단위, 첫 음절 0), sent는 문장 번호. 빈 배열 = 빈 줄
const SPACE_U = 0.2; // core.calcTextboxLayout: 공백 = wrapStep × 0.2
const SENTENCE_END = /[.?!…。][."'”’)\]]*$/; // 단어 끝 문장부호(뒤에 붙는 따옴표·괄호 허용)
function breakLines(text, perLine) {
    const maxU = perLine - 1;
    const lines = [];
    let sent = 0;
    let open = false; // 지금 문장에 음절이 있나 — 빈 문장으로 번호만 넘기지 않게
    const endSentence = () => {
        if (open) sent++;
        open = false;
    };
    for (const para of text.split('\n')) {
        let cur = [];
        const flush = () => {
            lines.push(cur);
            cur = [];
        };
        const words = para
            .split(/\s+/)
            .map(raw => ({ raw, w: decomposeSyllables(raw).filter(s => !s.isSpace) }))
            .filter(({ w }) => w.length);
        for (const { raw, w } of words) {
            let start = cur.length ? cur[cur.length - 1].u + 1 + SPACE_U : 0;
            if (cur.length && start + w.length - 1 > maxU) {
                flush();
                start = 0;
            }
            // 한 줄보다 긴 단어만 쪼갠다
            let u = start;
            for (const syl of w) {
                if (u > maxU) {
                    flush();
                    u = 0;
                }
                cur.push({ syl, u, sent });
                open = true;
                u += 1;
            }
            if (SENTENCE_END.test(raw)) endSentence();
        }
        flush(); // 문단 끝(빈 문단이면 빈 줄)
        endSentence(); // 줄바꿈도 문장 끝
    }
    while (lines.length && !lines[lines.length - 1].length) lines.pop();
    while (lines.length && !lines[0].length) lines.shift();
    return lines;
}

// 창 크기 → 글자 크기·줄 배치(CSS px)
function geometry(perLine, lh) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const maxU = perLine - 1;
    const wr = r.wrapStep / r.sylSize; // 음절 간격 / 글자 크기 — 전시 자간 그대로
    const s = (W * FILL) / (maxU * wr + 2 * r.glyphExtent);
    const pitch = wr * s;
    const left = (W - maxU * pitch) / 2;
    const lineH = lh * s;
    const B = Math.min(H / 2, BAND * s);
    const pad = PAD * s;
    return {
        W,
        H,
        s,
        pitch,
        left,
        lineH,
        B,
        centerY: k => pad + B + k * lineH,
        totalH: n => 2 * pad + 2 * B + Math.max(0, n - 1) * lineH,
    };
}

// ── 연결 실(허브) — 문장 단위 ────────────────────────────────────────────────
// mycelium update()가 새 음절 i를 붙일 때 부르는 허브 등록(_maybeRegisterHub(i-1))을 이 페이지에서 감싼다:
// 지금 음절과 같은 문장일 때만 등록하고, 허브에 문장 번호를 붙여 둔다
const registerHub = r._maybeRegisterHub.bind(r);
let lineSent = []; // 지금 줄의 음절별 문장 번호
let curSent = -1; // 지금 붙이는 음절의 문장
r._maybeRegisterHub = (i, ud) => {
    if (lineSent[i] !== curSent) return;
    registerHub(i, ud);
    const h = r._hubs.get(i);
    if (h) h.sent = lineSent[i];
};
function dropOtherSentences() {
    for (const [id, h] of r._hubs) if (h.sent !== curSent) r._hubs.delete(id);
}

// 월드 점 p를 화면에서 dy(CSS px)만큼 위로 — 같은 카메라 깊이 유지(mycelium _shiftAtDepth의 세로판).
// _toScreen: v = (1 - d.y/t)/2 → v가 dv 바뀌면 카메라 공간 d.y는 -2·dv·t
function shiftUp(p, dy) {
    const { camMat } = r._calcCamera();
    const { t } = r._toScreen(p);
    const dv = -dy / window.innerHeight;
    return p.clone().add(new THREE.Vector3(0, -2 * dv * t, 0).applyMatrix3(camMat));
}

// ── 화면 ──────────────────────────────────────────────────────────────────────
let liveCenter = null; // 지금 자라는 줄의 종이 위 중심(CSS px) — 오버레이를 그 자리로 옮긴다
function syncOverlay() {
    if (liveCenter === null) return;
    const top = $('paper').getBoundingClientRect().top;
    overlay.style.transform = `translateY(${top + liveCenter - window.innerHeight / 2}px)`;
}
(function loop() {
    syncOverlay();
    requestAnimationFrame(loop);
})();
window.addEventListener('scroll', syncOverlay);

function setStatus(s) {
    $('status').textContent = s;
}

// ── 굽기 ──────────────────────────────────────────────────────────────────────
// 텍스트 하나 → 종이에 줄 띠를 붙여 가며 굽고, 출력 해상도 띠 목록을 돌려준다
async function bakeEntry(text, opts, label) {
    const { perLine, lh, outWidth, instant } = opts;
    const lines = breakLines(text, perLine);
    const g = geometry(perLine, lh);
    const gs = glyphScaleFor(r, g.s);
    const project = (u, v) => r.screenToWorld(u, v);

    const tgt = () => r._accumTarget;
    const Wd = tgt().width;
    const outW = outWidth || Wd;
    const k = outW / g.W; // CSS px → 출력 px
    const kd = Wd / g.W; // CSS px → 디바이스 px
    const Bd = Math.round(g.B * kd);

    const paper = $('paper');
    paper.replaceChildren();
    paper.style.height = `${Math.max(g.totalH(1), g.H)}px`;
    window.scrollTo({ top: 0 });

    const strips = [];
    const nSyl = lines.reduce((n, l) => n + l.length, 0);
    let done = 0;
    let carried = []; // 앞 줄에서 넘어온 허브(이미 이 줄 기준 자리로 옮김)
    let hubSeq = 0;
    for (let li = 0; li < lines.length; li++) {
        if (!running) return null;
        const line = lines[li];
        const center = g.centerY(li);
        paper.style.height = `${Math.max(g.totalH(li + 1), g.H)}px`;
        if (!line.length) {
            carried = []; // 빈 줄 = 문단 경계, 어차피 문장도 끝났다
            continue;
        }

        r.clearAccum();
        lineSent = line.map(x => x.sent);
        curSent = lineSent[0];
        for (const h of carried) r._hubs.set(`c${hubSeq++}`, h);
        dropOtherSentences();
        // 띠 위쪽 — 위 줄 허브로 뻗는 실까지 담는다(허브 둘레 여백 0.5×글자 크기)
        let topCss = g.H / 2 - g.B;
        for (const h of r._hubs.values()) topCss = Math.min(topCss, r._toScreen(h.center).v * g.H - 0.5 * g.s);
        topCss = Math.max(0, topCss);
        liveCenter = center;
        syncOverlay();
        window.scrollTo({ top: center - g.H / 2, behavior: 'smooth' });

        const items = line.map(x => x.syl);
        const pos = line.map(x => [(g.left + x.u * g.pitch) / g.W, 0.5]);
        const uni = n => syllablesToUniforms(items.slice(0, n), pos.slice(0, n), g.s / gs, r.layoutScale, project, gs);
        // 전시에서 타이핑하듯 한 음절씩 — 그래야 음절마다 자라고 허브·연결 실이 생긴다.
        // instant는 forceRebake 대신 같은 경로에서 finishGrowing으로 한 프레임에 완성
        // (forceRebake의 instant 큐는 다음 음절을 rAF로 꺼내서 백그라운드 탭에선 멈춘다)
        for (let n = 1; n <= items.length && running; n++) {
            curSent = lineSent[n - 1];
            dropOtherSentences(); // 문장이 바뀌었으면 앞 문장 허브를 버린다
            r.update(uni(n), n, items.slice(0, n));
            if (instant) r.finishGrowing();
            await waitIdle();
            done++;
            setStatus(`${label}  줄 ${li + 1}/${lines.length} · 음절 ${done}/${nSyl}`);
        }
        if (!running) return null;

        // 줄 끝 음절은 다음 음절이 안 붙어 허브 등록이 안 됐다 — 문장이 다음 줄로 이어질 수 있으니 직접 올린다
        curSent = lineSent[items.length - 1];
        r._maybeRegisterHub(items.length - 1, uni(items.length));
        // 남은 허브(이 줄 끝 문장 것만)를 다음 줄 기준 자리로. 화면 위로 나가면 버린다
        carried = [];
        for (const h of r._hubs.values()) {
            if (h.sent !== curSent) continue;
            const c = shiftUp(h.center, g.lineH);
            if (r._toScreen(c).v > 0.02) carried.push({ ...h, center: c });
        }

        // 화면 띠(위 줄로 뻗은 실 ~ 줄 아래 끝) → 출력 해상도 → 종이에 붙이기
        const cy = Math.round(tgt().height / 2);
        const topD = Math.round(topCss * kd);
        const hD = cy + Bd - topD;
        const stripH = Math.round(hD * (outW / Wd));
        const strip = readAccum(r, 0, topD, Wd, hD, outW, stripH);
        const topOnPaper = center - g.H / 2 + topCss; // 화면 세로 정중앙 = 종이의 center
        strips.push({ strip, yOut: Math.round(topOnPaper * k) });

        const view = document.createElement('canvas');
        view.width = outW;
        view.height = stripH;
        view.getContext('2d').drawImage(strip, 0, 0);
        view.style.top = `${topOnPaper}px`;
        view.style.height = `${hD / kd}px`;
        paper.appendChild(view);
    }
    liveCenter = null;
    r.clearAccum();
    await frame();
    return { strips, outW, outH: Math.round(g.totalH(lines.length) * k), lines: lines.length };
}

// 띠들을 세로로 긴 PNG로(너무 길면 나눠서)
async function toPngs({ strips, outW, outH }) {
    const blobs = [];
    for (let a = 0; a < outH; a += MAX_PNG_H) {
        const h = Math.min(MAX_PNG_H, outH - a);
        const c = new OffscreenCanvas(outW, h);
        const ctx = c.getContext('2d');
        for (const { strip, yOut } of strips) {
            if (yOut + strip.height > a && yOut < a + h) ctx.drawImage(strip, 0, yOut - a);
        }
        blobs.push(await c.convertToBlob({ type: 'image/png' }));
    }
    return blobs;
}

function slug(text) {
    const s = text
        .replace(/\s+/g, '_')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/^_+|_+$/g, '');
    return [...s].slice(0, 16).join('') || 'text';
}

let running = false;

async function run() {
    const entries = $('text')
        .value.split(/^\s*---\s*$/m)
        .map(t => t.trim())
        .filter(t => /[가-힣]/.test(t));
    if (!entries.length) return setStatus('한글 텍스트를 넣을 것');
    const opts = {
        perLine: Math.max(1, parseInt($('perLine').value, 10) || 7),
        lh: parseFloat($('lh').value) || r.lineHeightRatio,
        outWidth: Math.max(0, parseInt($('width').value, 10) || 0),
        instant: $('instant').checked,
    };
    const dir = $('dir').value.trim() || 'mycelium-text';
    const save = $('save').checked;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
    const saved = save ? await listSaved(dir) : new Set();

    const log = [];
    for (let i = 0; i < entries.length && running; i++) {
        const label = entries.length > 1 ? `[${i + 1}/${entries.length}]` : '';
        let res;
        for (;;) {
            const rz = resizes;
            res = await bakeEntry(entries[i], opts, label);
            if (rz !== resizes && running) continue; // 굽는 도중 창 크기가 바뀌었다 — 이 텍스트 처음부터
            break;
        }
        if (!res) break;
        if (!save) {
            log.push(`${label} ${res.lines}줄 · ${res.outW}×${res.outH}px (저장 안 함)`);
            continue;
        }
        const blobs = await toPngs(res);
        const base = `${stamp}_${String(i + 1).padStart(3, '0')}_${slug(entries[i])}`;
        for (let p = 0; p < blobs.length; p++) {
            let name = blobs.length > 1 ? `${base}_p${p + 1}.png` : `${base}.png`;
            if (saved.has(name)) name = name.replace(/\.png$/, `_${Date.now()}.png`);
            await savePng(dir, name, blobs[p]);
            log.push(`${label} → bake/${dir}/${name}`);
        }
        log.push(`   ${res.lines}줄 · ${res.outW}×${res.outH}px`);
    }
    setStatus(`${running ? '완료' : '중지'}\n${log.join('\n')}`);
}

$('go').onclick = async () => {
    if (running) {
        running = false;
        $('go').textContent = '굽기';
        return;
    }
    running = true;
    $('go').textContent = '중지';
    try {
        await run();
    } catch (e) {
        setStatus(`오류: ${e.message}`);
        console.error(e);
    }
    running = false;
    liveCenter = null;
    $('go').textContent = '굽기';
};

setStatus('준비됨');
if (q.get('auto') === '1') $('go').click();
