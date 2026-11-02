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
//   ?ls=1       자간(음절 간격 배율, 1 = 전시 자간). mycelium·dandelion·signal(음절 사이 (ls − 1)·sylSize)
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
//
// ?receiver=signal|dandelion|sora (2026-10-28) — bake-text-others.js. 줄 접기 규칙(breakLines)과 저장은 같다.
//   signal    ?mode=typing(기본)|steps  ?interval=500(ms, typing 음절 간격)  ?after=0(typing 마지막 음절 뒤 step)
//             ?steps=0 ?settle=1(steps 모드)  ?sylsize=  — 출력 가로 0이면 CSS px × 2
//             ?ss=2 슈퍼샘플 — 출력의 ss배로 그려서 줄여 저장(셀 경계 gap이 0.5 CSS px라 k≈1이면 계단이 진다). 시간 ≈ ss²배
//             ?edge=1 셀 가장자리 섞는 폭(출력 px) — 0이면 전시값 0.5 CSS px(출력을 키우면 같이 번진다)
//   dandelion ?dpr=3 — 전시 크기 그대로라 창 가로 ≥ 페이지(한 줄 음절 × 100px + 여백). 출력 가로 0이면 페이지 × dpr
//
// ?flow=h (2026-10-31) — 가로로 긴 PNG(mycelium·dandelion·signal — signal은 구간 없이 한 줄, bake-text-others.js). 텍스트 전체를 한 줄로 이어 오른쪽으로 늘린다 — 세로 고정,
//   가로는 음절 수만큼. 굽는 건 세로와 같은 breakLines 줄 단위("구간")라 perLine = 한 화면에 키우는 음절 수이고,
//   구간을 종이 위에 오른쪽으로 이어 붙인다(구간 사이 = 띄어쓰기 0.2칸, 단어 중간에서 끊겼으면 0칸, 빈 줄 = 1칸).
//   구간은 늘 화면 같은 자리에서 키운다. 연결 실은 남은 허브를 구간 폭만큼 왼쪽으로 옮겨 다음 구간에 다시 심는다 —
//   화면 왼쪽 밖으로 나가면 버리므로 구간 경계 바로 앞 음절까지만 닿는다(perLine이 작을수록 더 많이 끊긴다).
//   출력 칸은 세로(px, 0 = 원본). 너무 길면 _p1, _p2…로 가로로 나눠 저장
// 출력 가로 기본 2160(인쇄용). mycelium·dandelion은 원본(창 × DPR / 페이지 × dpr)이 그보다 작으면 확대 저장되고 경고가 뜬다.
// signal·sora는 출력 해상도로 바로 그려서 상관없다
//   sora      ?boxes=3 — 문장마다 정사각 박스(안에 단어 원 랜덤), 한 줄 N박스. 출력 가로 0이면 박스 한 변 1080

import * as THREE from 'three';
import { JAMO, decomposeSyllables, syllablesToUniforms } from '../js/core.js';
import { makeBakeReceiver, glyphScaleFor, readAccum, alphaBounds, listSaved, savePng } from './bake-common.js';
import { makeSignalText, makeDandelionText, makeSoraText, crop } from './bake-text-others.js';

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);

const BAND = 1.9; // 줄 중심에서 띠 위아래 끝까지(글자 크기 배수) — 굽는 중 종이 높이 어림에만. 실제 띠는 잉크 범위로 자른다
const PAD = 0.3; // 종이 맨 위/아래 여백(글자 크기 배수)
const MAX_PNG_H = 16384; // 이보다 길면 _p1, _p2…로 나눠 저장(브라우저 캔버스 한계)

const RECEIVER = ['sora', 'signal', 'dandelion'].includes(q.get('receiver')) ? q.get('receiver') : 'mycelium';
$('receiver').value = RECEIVER;
$('receiver').onchange = () => {
    q.set('receiver', $('receiver').value);
    for (const k of ['dir', 'lh', 'width']) q.delete(k); // 수신자마다 기본값이 다르다
    location.search = q.toString();
};
// 가로(h)는 sora 빼고
const FLOW = q.get('flow') === 'h' && RECEIVER !== 'sora' ? 'h' : 'v';
$('flow').value = FLOW;
$('flow').onchange = () => {
    q.set('flow', $('flow').value);
    q.delete('width'); // 세로 = 출력 가로, 가로 = 출력 세로
    location.search = q.toString();
};
if (FLOW === 'h') {
    document.documentElement.classList.add('flow-h');
    $('width-label').textContent = '출력 세로(px, 0=원본)';
    $('perLine').parentElement.firstChild.textContent = '한 구간(화면) 음절';
    if (RECEIVER === 'signal') $('perLine').parentElement.dataset.for = ''; // signal 가로 굽기는 접지 않는다
}
for (const el of document.querySelectorAll('[data-for]'))
    if (!el.dataset.for.split(' ').includes(RECEIVER)) el.style.display = 'none';

let r, frame, waitIdle, overlay, other;
if (RECEIVER === 'mycelium') {
    ({ r, frame, waitIdle } = await makeBakeReceiver());
    overlay = r._renderer.domElement;
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '5';
} else if (RECEIVER === 'signal') other = await makeSignalText();
else if (RECEIVER === 'dandelion') other = await makeDandelionText(Number(q.get('dpr') ?? 3)); // 7음절 페이지 1000px × 3 ≥ 2160
else other = await makeSoraText();

$('text').value = q.get('text') ?? '';
$('perLine').value = q.get('perLine') ?? 7;
$('width').value = q.get('width') ?? (FLOW === 'h' ? 0 : 2160); // 인쇄용 — 가로 2160 이상(2026-10-28). 가로 굽기는 원본 세로
$('lh').value = q.get('lh') ?? (r ?? other.r).lineHeightRatio;
$('dir').value = q.get('dir') ?? `${RECEIVER}-text${FLOW === 'h' ? '-h' : ''}`;
$('instant').checked = q.get('instant') === '1';
$('mode').value = q.get('mode') === 'steps' ? 'steps' : 'typing';
$('interval').value = q.get('interval') ?? 500;
$('after').value = q.get('after') ?? 0;
$('steps').value = q.get('steps') ?? 0;
$('settle').checked = q.get('settle') === '1';
$('sylsize').value = q.get('sylsize') ?? (RECEIVER === 'signal' ? other.r.sylSize : '');
$('ss').value = q.get('ss') ?? 2;
$('edge').value = q.get('edge') ?? 1;
$('boxes').value = q.get('boxes') ?? 3;
$('ls').value = q.get('ls') ?? 1;
const FILL = parseFloat(q.get('fill')) || 0.96;
if (q.get('bg')) document.documentElement.style.setProperty('--bg', q.get('bg'));

$('fold').onclick = () => {
    const f = $('panel').classList.toggle('folded');
    $('fold').textContent = f ? '패널' : '패널 접기';
};

let resizes = 0;
window.addEventListener('resize', () => resizes++);

// ── 줄 접기 ───────────────────────────────────────────────────────────────────
// 줄 = [{ syl, u, sent, word }] — u는 줄 안 가로 위치(음절 간격 단위, 첫 음절 0), sent는 문장 번호,
// word는 텍스트 전체에서 단어 번호(줄을 넘어 쪼개진 단어도 같은 번호). 빈 배열 = 빈 줄
const SPACE_U = 0.2; // core.calcTextboxLayout: 공백 = wrapStep × 0.2
const SENTENCE_END = /[.?!…。][."'”’)\]]*$/; // 단어 끝 문장부호(뒤에 붙는 따옴표·괄호 허용)
function breakLines(text, perLine) {
    const maxU = perLine - 1;
    const lines = [];
    let sent = 0;
    let word = 0;
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
                cur.push({ syl, u, sent, word });
                open = true;
                u += 1;
            }
            word++;
            if (SENTENCE_END.test(raw)) endSentence();
        }
        flush(); // 문단 끝(빈 문단이면 빈 줄)
        endSentence(); // 줄바꿈도 문장 끝
    }
    while (lines.length && !lines[lines.length - 1].length) lines.pop();
    while (lines.length && !lines[0].length) lines.shift();
    return lines;
}

// ?flow=h — 줄(구간)마다 가로 시작 자리(음절 간격 단위, 첫 구간 0). 앞 구간 끝 음절 + 1칸 +
// 띄어쓰기(같은 단어가 쪼개졌으면 없음) + 빈 줄마다 1칸. 빈 줄은 null
function flowStarts(lines) {
    const starts = [];
    let end = null; // 앞 구간 끝 음절 자리
    let prevWord = -1;
    let blanks = 0;
    for (const line of lines) {
        if (!line.length) {
            starts.push(null);
            blanks++;
            continue;
        }
        const start = end === null ? 0 : end + 1 + (line[0].word === prevWord ? 0 : SPACE_U) + blanks;
        starts.push(start);
        end = start + line[line.length - 1].u;
        prevWord = line[line.length - 1].word;
        blanks = 0;
    }
    return { starts, endU: end ?? 0 };
}

// 문장 = [단어 = [syl…]…] — sora용. 문장 끝 규칙은 breakLines와 같다(문장부호로 끝나는 단어, 줄바꿈)
function splitSentences(text) {
    const sents = [];
    for (const line of breakLines(text, Infinity))
        for (const { syl, sent, word } of line) {
            const s = (sents[sent] ??= new Map());
            if (!s.has(word)) s.set(word, []);
            s.get(word).push(syl);
        }
    return sents.filter(Boolean).map(s => [...s.values()]);
}

// 창 크기 → 글자 크기·줄 배치(CSS px)
// ls = 자간 배율(음절 간격 × ls, 1 = 전시 자간). 한 줄이 창 폭에 맞으니 자간을 벌리면 글자가 그만큼 작아진다
function geometry(perLine, lh, ls = 1) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const maxU = perLine - 1;
    const wr = (r.wrapStep / r.sylSize) * ls; // 음절 간격 / 글자 크기
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
let lineSent = []; // 지금 줄의 음절별 문장 번호
let curSent = -1; // 지금 붙이는 음절의 문장
if (r) {
    const registerHub = r._maybeRegisterHub.bind(r);
    r._maybeRegisterHub = (i, ud) => {
        if (lineSent[i] !== curSent) return;
        registerHub(i, ud);
        const h = r._hubs.get(i);
        if (h) h.sent = lineSent[i];
    };
}
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
let liveLeft = null; // ?flow=h — 지금 자라는 구간의 화면 왼쪽 끝이 종이 위 어디인지(CSS px)
function syncOverlay() {
    if (liveCenter !== null) {
        const top = $('paper').getBoundingClientRect().top;
        overlay.style.transform = `translateY(${top + liveCenter - window.innerHeight / 2}px)`;
    } else if (liveLeft !== null) {
        const left = $('paper').getBoundingClientRect().left;
        overlay.style.transform = `translateX(${left + liveLeft}px)`;
    }
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
// signal·dandelion·sora — bake-text-others.js가 띠 목록을 다 만든 뒤 종이에 한꺼번에 붙여 보여 준다
async function bakeOther(text, opts, label) {
    const res = await other.bakeEntry(text, opts, {
        JAMO,
        breakLines,
        flowStarts,
        splitSentences,
        running: () => running,
        setStatus: s => setStatus(`${label} ${s}`),
    });
    if (!res) return null;
    const paper = $('paper');
    // 출력 px → 화면 CSS px — 세로 굽기는 창 가로에, 가로 굽기는 창 세로에 맞춘다
    const z = opts.flow === 'h' ? window.innerHeight / res.outH : window.innerWidth / res.outW;
    paper.replaceChildren();
    paper.style.height = `${res.outH * z}px`;
    if (opts.flow === 'h') paper.style.width = `${res.outW * z}px`;
    for (const { strip, xOut, yOut } of res.strips) {
        const view = document.createElement('canvas');
        view.width = strip.width;
        view.height = strip.height;
        view.getContext('2d').drawImage(strip, 0, 0);
        Object.assign(view.style, { left: `${xOut * z}px`, top: `${yOut * z}px`, width: `${strip.width * z}px`, height: `${strip.height * z}px` });
        paper.appendChild(view);
    }
    return res;
}

// mycelium — 텍스트 하나 → 줄(가로 굽기는 구간)마다 화면에서 키워 종이에 붙여 가며 굽고, 출력 해상도 띠 목록을 돌려준다.
// 띠 = 화면 전체를 읽어 잉크(알파) 범위로 자른 것 — 예전엔 줄 중심 ±BAND만 읽어서 그보다 크게 뻗은 글자가 잘렸다(2026-10-31).
// 종이 = 잉크 범위 합 + 둘레 여백 PAD(세로 굽기는 가로를 창 폭으로 고정). 화면 가장자리에 닿은 잉크는 화면에서 이미
// 잘린 것이라 경고만 한다
async function bakeEntry(text, opts, label) {
    const { perLine, lh, ls, outWidth, instant, flow } = opts;
    const H_FLOW = flow === 'h';
    const lines = breakLines(text, perLine);
    const { starts } = flowStarts(lines);
    const g = geometry(perLine, lh, ls);
    const gs = glyphScaleFor(r, g.s);
    const project = (u, v) => r.screenToWorld(u, v);

    const tgt = () => r._accumTarget;
    const Wd = tgt().width;
    const Hd = tgt().height;
    const kd = Wd / g.W; // CSS px → 디바이스 px

    const paper = $('paper');
    paper.replaceChildren();
    paper.style.height = `${H_FLOW ? g.H : Math.max(g.totalH(1), g.H)}px`;
    if (H_FLOW) paper.style.width = `${g.W}px`;
    window.scrollTo({ left: 0, top: 0 });

    const raw = []; // { strip(디바이스 px, 잉크 범위로 자름), xCss, yCss } — 종이 위 CSS px(아직 여백 전)
    let clipped = 0;
    const nSyl = lines.reduce((n, l) => n + l.length, 0);
    let done = 0;
    let carried = []; // 앞 줄(구간)에서 넘어온 허브(이미 이 줄 기준 자리로 옮김)
    let hubSeq = 0;
    for (let li = 0; li < lines.length; li++) {
        if (!running) return null;
        const line = lines[li];
        // 화면 왼쪽 위 = 종이 위 (ox, oy). 세로 굽기는 줄을 화면 세로 정중앙에, 가로 굽기는 구간을 화면 같은 자리에
        const ox = H_FLOW ? starts[li] * g.pitch : 0;
        const oy = H_FLOW ? 0 : g.centerY(li) - g.H / 2;
        if (!H_FLOW) paper.style.height = `${Math.max(g.totalH(li + 1), g.H)}px`;
        if (!line.length) {
            carried = []; // 빈 줄 = 문단 경계, 어차피 문장도 끝났다
            continue;
        }

        r.clearAccum();
        lineSent = line.map(x => x.sent);
        curSent = lineSent[0];
        for (const h of carried) r._hubs.set(`c${hubSeq++}`, h);
        dropOtherSentences();
        if (H_FLOW) {
            liveLeft = ox;
            paper.style.width = `${Math.max(parseFloat(paper.style.width), ox + g.W)}px`;
            syncOverlay();
            window.scrollTo({ left: ox, behavior: 'smooth' });
        } else {
            liveCenter = g.centerY(li);
            syncOverlay();
            window.scrollTo({ top: oy, behavior: 'smooth' });
        }

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
            setStatus(`${label}  ${H_FLOW ? '구간' : '줄'} ${li + 1}/${lines.length} · 음절 ${done}/${nSyl}`);
        }
        if (!running) return null;

        // 줄 끝 음절은 다음 음절이 안 붙어 허브 등록이 안 됐다 — 문장이 다음 줄로 이어질 수 있으니 직접 올린다
        curSent = lineSent[items.length - 1];
        r._maybeRegisterHub(items.length - 1, uni(items.length));
        // 남은 허브(이 줄 끝 문장 것만)를 다음 줄 기준 자리로 — 세로는 한 줄 위, 가로는 구간 폭만큼 왼쪽. 화면 밖이면 버린다
        carried = [];
        const next = starts.slice(li + 1).find(x => x !== null);
        for (const h of r._hubs.values()) {
            if (h.sent !== curSent) continue;
            if (H_FLOW) {
                if (next === undefined) break;
                const c = r._shiftAtDepth(h.center, ((next - starts[li]) * g.pitch) / g.W);
                if (r._toScreen(c).u > 0.02) carried.push({ ...h, center: c });
            } else {
                const c = shiftUp(h.center, g.lineH);
                if (r._toScreen(c).v > 0.02) carried.push({ ...h, center: c });
            }
        }

        // 화면 전체 → 잉크 범위로 잘라 종이에 붙이기
        const full = readAccum(r, 0, 0, Wd, Hd);
        const b = alphaBounds(full);
        if (!b) continue;
        if (b[0] === 0 || b[1] === 0 || b[2] === Wd || b[3] === Hd) clipped++;
        const strip = crop(full, b[0], b[1], b[2] - b[0], b[3] - b[1]);
        const xCss = ox + b[0] / kd;
        const yCss = oy + b[1] / kd;
        raw.push({ strip, xCss, yCss });

        const view = document.createElement('canvas');
        view.width = strip.width;
        view.height = strip.height;
        view.getContext('2d').drawImage(strip, 0, 0);
        Object.assign(view.style, { left: `${xCss}px`, top: `${yCss}px`, width: `${strip.width / kd}px`, height: `${strip.height / kd}px` });
        paper.appendChild(view);
    }
    liveCenter = liveLeft = null;
    r.clearAccum();
    await frame();
    if (!raw.length) return { strips: [], outW: 1, outH: 1, lines: lines.length };

    // 종이 = 잉크 범위 합 + 여백. 세로 굽기는 가로를 창 폭(출력 가로)에 고정, 가로 굽기는 세로가 출력 칸
    const pad = PAD * g.s;
    const y0 = Math.min(...raw.map(s => s.yCss)) - pad;
    const y1 = Math.max(...raw.map(s => s.yCss + s.strip.height / kd)) + pad;
    const x0 = H_FLOW ? Math.min(...raw.map(s => s.xCss)) - pad : 0;
    const x1 = H_FLOW ? Math.max(...raw.map(s => s.xCss + s.strip.width / kd)) + pad : g.W;
    const k = outWidth ? (H_FLOW ? outWidth / (y1 - y0) : outWidth / g.W) : kd; // CSS px → 출력 px
    const f = k / kd;
    const fit = s => (f === 1 ? s : crop(s, 0, 0, s.width, s.height, Math.round(s.width * f), Math.round(s.height * f)));
    return {
        strips: raw.map(s => ({ strip: fit(s.strip), xOut: Math.round((s.xCss - x0) * k), yOut: Math.round((s.yCss - y0) * k) })),
        outW: Math.round((x1 - x0) * k),
        outH: Math.round((y1 - y0) * k),
        axis: H_FLOW ? 'x' : 'y',
        lines: lines.length,
        unit: H_FLOW ? '구간' : '줄',
        warn: [
            clipped ? `⚠️ ${clipped}${H_FLOW ? '구간' : '줄'}의 잉크가 화면 가장자리에 닿음(화면에서 잘림) — 한 줄 음절 수를 늘리거나 창을 키울 것` : '',
            f > 1
                ? `⚠️ 원본 ${H_FLOW ? `세로 ${Math.round((y1 - y0) * kd)}` : Wd}px < 출력 ${outWidth}px — 확대 저장됨. 창을 넓힐 것`
                : '',
        ]
            .filter(Boolean)
            .join('\n'),
    };
}

// 띠들을 세로로(가로 굽기는 가로로) 긴 PNG로(너무 길면 나눠서)
async function toPngs({ strips, outW, outH, axis = 'y' }) {
    const blobs = [];
    const len = axis === 'x' ? outW : outH;
    for (let a = 0; a < len; a += MAX_PNG_H) {
        const n = Math.min(MAX_PNG_H, len - a);
        const c = axis === 'x' ? new OffscreenCanvas(n, outH) : new OffscreenCanvas(outW, n);
        const ctx = c.getContext('2d');
        for (const { strip, xOut = 0, yOut } of strips) {
            if (axis === 'x') {
                if (xOut + strip.width > a && xOut < a + n) ctx.drawImage(strip, xOut - a, yOut);
            } else if (yOut + strip.height > a && yOut < a + n) ctx.drawImage(strip, xOut, yOut - a);
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
        lh: parseFloat($('lh').value) || (r ?? other.r).lineHeightRatio,
        outWidth: Math.max(0, parseInt($('width').value, 10) || 0),
        instant: $('instant').checked,
        ls: Math.max(0.1, parseFloat($('ls').value) || 1),
        flow: FLOW,
        // signal
        sylSize: Math.max(24, parseFloat($('sylsize').value) || 180),
        ss: Math.min(4, Math.max(1, parseFloat($('ss').value) || 1)),
        edgePx: Math.max(0, parseFloat($('edge').value) || 0),
        mode: $('mode').value,
        interval: Math.max(0, parseFloat($('interval').value) || 0),
        after: Math.max(0, parseInt($('after').value, 10) || 0),
        steps: Math.max(0, parseInt($('steps').value, 10) || 0),
        settle: $('settle').checked,
        // sora
        boxesPerRow: Math.max(1, parseInt($('boxes').value, 10) || 3),
    };
    const dir = $('dir').value.trim() || `${RECEIVER}-text${FLOW === 'h' ? '-h' : ''}`;
    const save = $('save').checked;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
    const saved = save ? await listSaved(dir) : new Set();

    const log = [];
    for (let i = 0; i < entries.length && running; i++) {
        const label = entries.length > 1 ? `[${i + 1}/${entries.length}]` : '';
        let res;
        for (;;) {
            const rz = resizes;
            res = await (r ? bakeEntry : bakeOther)(entries[i], opts, label);
            if (rz !== resizes && running) continue; // 굽는 도중 창 크기가 바뀌었다 — 이 텍스트 처음부터
            break;
        }
        if (!res) break;
        const unit = res.unit ?? '줄';
        if (res.warn) log.push(`${label} ${res.warn}`);
        if (!save) {
            log.push(`${label} ${res.lines}${unit} · ${res.outW}×${res.outH}px (저장 안 함)`);
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
        log.push(`   ${res.lines}${unit} · ${res.outW}×${res.outH}px`);
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
    liveCenter = liveLeft = null;
    $('go').textContent = '굽기';
};

setStatus('준비됨');
if (q.get('auto') === '1') $('go').click();
