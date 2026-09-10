// ── output-main.js ────────────────────────────────────────────────────────────
// 전시 디스플레이(= Chrome kiosk / TD Web Render TOP)용 "출력 전용" 페이지.
//
// main.js(전시 스탠드얼론 페이지)의 흐름을 그대로 따름:
//   입력 → decomposeSyllables → reLayout → dispatchToReceiver
//   제출 → flushQueue → captureFrame → history 스택에 고정 이미지 → clearAccum → _submitOffsetY 전진
//
// 차이:
//  - 디자인 크롬은 Figma export PNG(chrome/board1.png, control panel.png …)로 얹음 (output.html)
//  - receiver는 transparentOutput:true → 글자 사이로 board 텍스처가 비침
//  - TD와 WebSocket(bridge.js)으로 연결 — 하드웨어 노브/버튼 입력을 받고, 음절/턴 데이터를 보냄
//  - 신호등·로딩써클은 이 페이지가 아니라 TD가 그림 (bridge 'syllable'/'turn' 스트림 기반)
//
// TD 없이도 정상 동작 — bridge는 미접속 시 백그라운드 재접속만 시도한다.
// 개발 중 TD 대역: `npm run bridge`

import { ReceiverManager } from '../js/receivers/ReceiverManager.js';
import {
    MAX_SYL,
    decomposeSyllables,
    calcTextboxLayout,
    calcShelfLayout,
    dispatchToReceiver,
    syllableData,
} from '../js/core.js';
import { createBridge } from './bridge.js';

const params = new URLSearchParams(location.search);
// Figma output_canvas 프레임: 1080×1920 기준 y=408(=21.25%)에서 시작. 첫 줄 기준선을 뷰포트 비율로 환산.
// ?top=0 으로 끄고 풀스크린 검증 가능.
const CONTENT_TOP_FRAC = params.has('top') ? Number(params.get('top')) / 1920 : 408 / 1920;
const RECEIVER = params.get('receiver') ?? 'mycelium';
const contentTopPx = () => Math.round(CONTENT_TOP_FRAC * window.innerHeight);

const canvas = document.getElementById('stage-canvas');
const rm = new ReceiverManager(canvas);
await rm.setReceiver(RECEIVER, { transparentOutput: true });
window.rm = rm; // 콘솔 디버깅용

// ── TD 브릿지 ────────────────────────────────────────────────────────────────
const bridge = createBridge();
window.bridge = bridge;
const emit = msg => bridge.send(msg);
emit({ t: 'receiver', name: rm.name });

// ── 제출된 턴 히스토리 (캡처 이미지 누적) — main.js buildHistory 와 동일 ──────────
function buildHistory() {
    let totalH = 0;
    return {
        addCapture(dataUrl, heightPx) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.className = 'history-frame';
            Object.assign(img.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                display: 'block',
                pointerEvents: 'none',
                zIndex: String(10 + totalH),
            });
            document.body.appendChild(img);
            totalH += heightPx;
            return totalH;
        },
        clear() {
            document.querySelectorAll('img.history-frame').forEach(el => el.remove());
            totalH = 0;
        },
        get totalHeight() {
            return totalH;
        },
    };
}
const history = buildHistory();

// ── 상태 ─────────────────────────────────────────────────────────────────────
let _sylItems = [];
let _positions = [];
let _allItems = [];
let _submitOffsetY = contentTopPx(); // 제출된 줄 누적 높이(px) — 새 줄 기준선
let _prevSpaceCount = 0;

// ── 레이아웃 → 수신자 dispatch — main.js Init.reLayout 과 동일 ─────────────────
function reLayout(items) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const sylSize = rm.current?.sylSize ?? 55;
    const lineHeightRatio = rm.current?.lineHeightRatio ?? 1.3;
    const wrapStep = rm.current?.wrapStep ?? sylSize * 2;
    const wrapMargin = rm.current?.wrapMargin ?? sylSize;
    const layoutFn = rm.name === 'signal' ? calcShelfLayout : calcTextboxLayout;
    const { positions, sylItems, widths, heights } = layoutFn(
        items,
        sylSize,
        W,
        H,
        lineHeightRatio,
        _submitOffsetY,
        wrapStep,
        wrapMargin,
    );
    _sylItems = sylItems;
    _positions = positions;
    if (sylItems.length > 0) {
        dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights);
    }
}

// ── 제출 — main.js handleSubmit 과 동일 ───────────────────────────────────────
async function handleSubmit() {
    if (!_sylItems.length || (rm.name !== 'mycelium' && rm.name !== 'dandelion')) return;
    const receiver = rm.current;

    // await 이전(동기 구간)에 먼저 스냅샷 — flushQueue가 제어권을 넘기는 사이
    // 사용자가 이어 입력해도 기준선이 어긋나지 않게.
    const W = window.innerWidth;
    const H = window.innerHeight;
    const sylSize = rm.current?.sylSize ?? 55;
    const lineHeightRatio = rm.current?.lineHeightRatio ?? 1.3;
    const wrapStep = rm.current?.wrapStep ?? sylSize * 2;
    const wrapMargin = rm.current?.wrapMargin ?? sylSize;
    const { lastY } = calcTextboxLayout(
        _allItems,
        sylSize,
        W,
        H,
        lineHeightRatio,
        _submitOffsetY,
        wrapStep,
        wrapMargin,
    );
    const capHeight = Math.round(lastY + sylSize * lineHeightRatio * 1.5);
    _submitOffsetY = lastY + sylSize * lineHeightRatio * 0.5;

    emit({ t: 'turn', phase: 'baking' });

    await receiver.flushQueue();

    const dataUrl = receiver.captureFrame();
    history.addCapture(dataUrl, capHeight);
    receiver.clearAccum();

    emit({ t: 'turn', phase: 'done', png: dataUrl, h: capHeight });
}

async function doSubmit() {
    if (!_allItems.length) return;
    await handleSubmit();
    resetInput();
}

function resetInput() {
    input.value = '';
    _allItems = [];
    _prevSpaceCount = 0;
}

// ── 입력 ─────────────────────────────────────────────────────────────────────
const input = document.getElementById('user-input');
input.focus();
document.body.addEventListener('click', () => input.focus()); // 포커스 유실 대비

function onInput() {
    // MAX_SYL(50) 상한 — main.js buildInput 과 동일. 넘으면 잘라냄.
    let sylCount = 0;
    let cutIdx = input.value.length;
    for (let i = 0; i < input.value.length; i++) {
        const ch = input.value[i];
        if (ch === ' ') continue;
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) sylCount++;
        if (sylCount > MAX_SYL) {
            cutIdx = i;
            break;
        }
    }
    if (sylCount > MAX_SYL) input.value = input.value.slice(0, cutIdx);

    _allItems = decomposeSyllables(input.value);

    // 띄어쓰기(단어 경계)가 새로 생기면 현재 자라는 음절을 즉시 완성
    const spaceCount = _allItems.reduce((n, it) => n + (it.isSpace ? 1 : 0), 0);
    if (spaceCount > _prevSpaceCount) rm.current?.finishGrowing?.();
    _prevSpaceCount = spaceCount;

    reLayout(_allItems);

    // TD/analyzer 로 마지막 완성 음절 + 자모 수치, 그리고 조합 상태 전송
    const lastSyl = [..._allItems].reverse().find(it => !it.isSpace);
    if (lastSyl) emit({ t: 'syllable', ...syllableData(lastSyl) });
    emit({ t: 'compose', text: input.value, sylCount });
}

input.addEventListener('input', onInput);
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        doSubmit();
    }
});

window.addEventListener('resize', () => reLayout(_allItems));

// ── TD → page 메시지 처리 ────────────────────────────────────────────────────
bridge.on('param', m => {
    const r = rm.current;
    if (!r) return;
    if (typeof m.size === 'number') r.sylSize = m.size;
    if (typeof m.lineHeight === 'number') r.lineHeightRatio = m.lineHeight;
    if (typeof m.letterSpacing === 'number') r.wrapStep = m.letterSpacing;
    reLayout(_allItems);
});

bridge.on('text', m => {
    if (typeof m.value !== 'string') return;
    input.value = m.value;
    onInput();
});

bridge.on('submit', () => doSubmit());

bridge.on('clear', () => {
    resetInput();
    reLayout([]);
});

bridge.on('mode', m => {
    // joke / question 토글 — 아직 receiver 동작에 연결 안 됨. 상태만 보관/에코.
    window.__mode = { ...(window.__mode ?? {}), ...m };
});

bridge.on('receiver', async m => {
    if (!m.name || m.name === rm.name) return;
    await rm.setReceiver(m.name, { transparentOutput: true });
    emit({ t: 'receiver', name: rm.name });
    reLayout(_allItems);
});
