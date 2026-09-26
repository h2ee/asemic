// ── output-main.js ────────────────────────────────────────────────────────────
// 전시 디스플레이(= Chrome kiosk / TD Web Render TOP)용 "출력 전용" 페이지.
//
// 흐름:
//   입력 → decomposeSyllables → reLayout(글자 영역 rect 안에서) → dispatchToReceiver
//   한 문장 끝 → flushQueue → captureFrame(아카이빙용) → 채팅창에 구조 SVG로 남김 → clearAccum
//
// 2026-09-26 개편 (PRD 2장 "화면"):
//  - 말풍선 안에 글자를 그리던 안이 폐기됐다. 글자는 #glyph-window 라는 **고정 rect**에
//    **한 화자 · 한 문장**만 뜨고, 문장이 바뀌면 clearAccum() 후 처음부터 다시 그린다.
//    그래서 _submitOffsetY 누적도, 전체화면 PNG 스택(옛 buildHistory)도 없어졌다.
//  - 누가 말하는 중인지는 하단 토스트가, 지나간 발화는 오른쪽 채팅창이 맡는다 (chat.js).
//  - 크롬 스트립·하늘 배경·웹캠·수신자 프로필은 TD의 /chat 이 그린다. 이 페이지는
//    그 위에 투명 배경으로 얹히는 레이어다 (?chrome=0).
//  - TD와 WebSocket(bridge.js)으로 연결 — 하드웨어 노브/버튼 입력을 받고, 음절/턴 데이터를 보냄
//
// TD 없이도 정상 동작 — bridge는 미접속 시 백그라운드 재접속만 시도한다.
// 개발 중 TD 대역: `npm run bridge`

import { ReceiverManager } from '../js/receivers/ReceiverManager.js';
import {
    MAX_SYL,
    decomposeSyllables,
    layoutFor,
    canSubmit,
    dispatchToReceiver,
    syllableData,
    composeChar,
    resolveControl,
    applyKnob,
} from '../js/core.js';
import { createBridge } from './bridge.js';
import { buildChat } from './chat.js';
import { asset, injectFonts } from './assets.js';

injectFonts();
document.getElementById('wilson').src = asset('imgs/wilson_wide.svg');

const params = new URLSearchParams(location.search);
// ?chrome=0 → 배경을 투명하게 (전시 기본). 크롬은 TD의 controller가 3D로 그린다.
//   나머지 조각(글자·토스트·채팅창·입력 바)은 두 모드에서 똑같이 보인다 —
//   목업이 곧 chrome=0 위에 TD 크롬을 합성한 결과다.
const CHROME = params.get('chrome') !== '0';
if (!CHROME) {
    document.documentElement.classList.add('no-chrome');
    document.body.classList.add('no-chrome');
}
const RECEIVER = params.get('receiver') ?? 'mycelium';

// 글자 영역 — 좌표의 원본은 output.html의 #glyph-window CSS다. 여기서 재서 쓰면
// 숫자가 두 곳에 갈라지지 않는다.
const glyphWindow = document.getElementById('glyph-window');
const glyphRect = () => {
    const r = glyphWindow.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const canvas = document.getElementById('stage-canvas');
const rm = new ReceiverManager(canvas);
await rm.setReceiver(RECEIVER, { transparentOutput: true });
window.rm = rm; // 콘솔 디버깅용

// ── TD 브릿지 ────────────────────────────────────────────────────────────────
const bridge = createBridge();
window.bridge = bridge;
const emit = msg => bridge.send(msg);
emit({ t: 'receiver', name: rm.name });

// ── 페이지 오류를 TD로 넘긴다 ────────────────────────────────────────────────
// webrenderTOP 안에서는 콘솔을 볼 수 없다. 캔버스가 조용히 멈추는 종류의 사고
// (예: receiver 전환 중 예외)는 화면만 보고는 원인을 알 수 없으므로, 오류를 브릿지로
// 흘려보내 TD쪽 bridge.par.Lasterror / Lastfrompage['jserror'] 에 남긴다.
function reportError(kind, msg, extra = {}) {
    // 콘솔에도 남긴다 — 브라우저로 직접 열어 디버깅할 때를 위해.
    console.error(`[${kind}]`, msg, extra);
    emit({ t: 'jserror', kind, msg: String(msg).slice(0, 500), ...extra });
}
window.addEventListener('error', e =>
    reportError('error', e.message, { src: String(e.filename || ''), line: e.lineno || 0 }),
);
window.addEventListener('unhandledrejection', e =>
    reportError('unhandledrejection', (e.reason && e.reason.message) || e.reason),
);

// ── 채팅창 + 토스트 ──────────────────────────────────────────────────────────
const chat = buildChat({
    panel: document.getElementById('chat-panel'),
    toast: document.getElementById('toast'),
});

// ── 상태 ─────────────────────────────────────────────────────────────────────
let _sylItems = [];
let _positions = [];
let _allItems = [];
let _prevSpaceCount = 0;
// 지금 글자 영역에 그려지는 문장이 누구 것인지. 'visitor' | 'receiver'.
// 브릿지 {t:'text', speaker}가 정하고, 키보드 직접 입력은 항상 관람객이다.
let _speaker = 'visitor';
// 지금 글자 영역에 그려지는 문장. input 엘리먼트가 아니라 **이쪽이 원본**이다 —
// 노란 바는 관람객 입력창이라 수신자(LLM) 문장은 거기 비치면 안 되기 때문.
let _text = '';
// 수신자 문장을 제출한 뒤에도 글자 영역에 남겨 둔 상태. 다음 글자가 들어오는 순간
// (보통 관람객의 첫 타이핑) 비운다 — setText / setSpeaker 참고.
let _held = false;

// ── 레이아웃 → 수신자 dispatch ───────────────────────────────────────────────
// rect를 넘겨 글자를 #glyph-window 안에만 배치한다. offsetY는 늘 0 —
// 한 문장만 그리므로 누적할 기준선이 없다.
function reLayout(items) {
    const rect = glyphRect();
    // positions를 배치에 안 쓰는 receiver(sora=내부 랜덤, signal=_draw()가 직접 shelf)는
    // layoutFor(rect)만으론 영역이 안 좁혀진다 — 그쪽엔 rect를 직접 건넨다.
    rm.current?.setRect?.(rect);
    const { positions, sylItems, widths, heights, sylSize } = layoutFor(
        rm,
        items,
        window.innerWidth,
        window.innerHeight,
        0,
        rect,
    );
    _sylItems = sylItems;
    _positions = positions;
    if (sylItems.length > 0) {
        dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights);
    }
}

// ── 한 문장 끝 ───────────────────────────────────────────────────────────────
// 글자 영역을 비우고, 그 문장을 오른쪽 채팅창에 구조 SVG로 남긴다.
// 단 수신자(LLM) 문장은 비우지 않고 남겨 둔다(_held) — 관람객이 그걸 보면서 다음 말을
// 고를 수 있게. 관람객이 치기 시작하면 setText가 비운다.
// captureFrame()은 화면에 쓰지 않는다 — 아카이빙(PRD 3-E)과 TD 쪽 turn 스트림용으로
// 남겨둔 것이고, 그래서 signal 캡처가 불투명해도 상관없다.
async function handleSubmit() {
    const receiver = rm.current;
    if (!_sylItems.length) return;

    // await 이전(동기 구간)에 먼저 스냅샷 — flushQueue가 제어권을 넘기는 사이
    // 사용자가 이어 입력하면 _allItems가 바뀐다.
    const turnItems = _allItems.slice();
    const speaker = _speaker;
    const hold = speaker === 'receiver';

    emit({ t: 'turn', phase: 'baking', speaker });

    let dataUrl = null;
    if (canSubmit(receiver)) {
        await receiver.flushQueue();
        dataUrl = receiver.captureFrame();
        if (!hold) receiver.clearAccum();
    }

    chat.addTurn(speaker, turnItems);
    if (!hold) reLayout([]);
    _held = hold;

    // speaker/text 는 TD의 LLM이 쓴다 — 관람객 차례가 끝났을 때만 응답을 만들고,
    // 자기가 흘려보낸 수신자 차례에는 반응하지 않아야 하기 때문(안 그러면 무한루프).
    emit({
        t: 'turn',
        phase: 'done',
        speaker,
        text: turnItems.map(it => (it.isSpace ? ' ' : composeChar(it))).join(''),
        png: dataUrl,
        h: 0,
    });
}

async function doSubmit() {
    if (!_allItems.length) return;
    await handleSubmit();
    resetInput();
}

function resetInput() {
    setText('');
    chat.setTalking(null);
}

// 화자가 바뀌면 진행 중이던 문장은 버린다 — 글자 영역엔 한 화자만 있어야 한다.
function setSpeaker(speaker) {
    if (speaker !== _speaker) {
        _speaker = speaker;
        rm.current?.clearAccum?.();
        _held = false;
        _text = '';
        input.value = '';
        _allItems = [];
        _prevSpaceCount = 0;
    }
    chat.setTalking(speaker, rm.name);
}

// ── 입력 ─────────────────────────────────────────────────────────────────────
const input = document.getElementById('user-input');
input.focus();
document.body.addEventListener('click', () => input.focus()); // 포커스 유실 대비

function setText(value) {
    // MAX_SYL(50) 상한 — main.js buildInput 과 동일. 넘으면 잘라냄.
    let sylCount = 0;
    let cutIdx = value.length;
    for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (ch === ' ') continue;
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) sylCount++;
        if (sylCount > MAX_SYL) {
            cutIdx = i;
            break;
        }
    }
    if (sylCount > MAX_SYL) {
        value = value.slice(0, cutIdx);
        sylCount = MAX_SYL;
    }
    // 남겨 둔 수신자 문장은 다음 글자가 들어오는 순간 비운다(빈 문자열은 resetInput이라 제외)
    if (_held && value) {
        rm.current?.clearAccum?.();
        _held = false;
    }
    _text = value;
    // 노란 바에는 관람객 차례일 때만 원문을 비춘다.
    const mirrored = _speaker === 'visitor' ? _text : '';
    if (input.value !== mirrored) input.value = mirrored;

    _allItems = decomposeSyllables(_text);

    // 토스트 — 글자가 있는 동안만 "말하는 중"
    chat.setTalking(_allItems.length ? _speaker : null, rm.name);

    // 띄어쓰기(단어 경계)가 새로 생기면 현재 자라는 음절을 즉시 완성
    const spaceCount = _allItems.reduce((n, it) => n + (it.isSpace ? 1 : 0), 0);
    if (spaceCount > _prevSpaceCount) rm.current?.finishGrowing?.();
    _prevSpaceCount = spaceCount;

    reLayout(_allItems);

    // TD/analyzer 로 마지막 완성 음절 + 자모 수치, 그리고 조합 상태 전송
    const lastSyl = [..._allItems].reverse().find(it => !it.isSpace);
    if (lastSyl) emit({ t: 'syllable', ...syllableData(lastSyl) });
    emit({ t: 'compose', text: _text, sylCount });
}

// 키보드 직접 입력은 언제나 관람객이다 — 수신자 차례였다면 그 문장을 버리고 넘겨받는다.
input.addEventListener('input', () => {
    cancelPreset();
    // setSpeaker가 화자 전환 시 input.value를 비우므로 방금 친 글자를 먼저 붙잡아 둔다.
    const typed = input.value;
    setSpeaker('visitor');
    setText(typed);
});
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
    cancelPreset();
    // speaker는 2026-09-26 추가(하위호환: 없으면 관람객). LLM 스트리밍이 수신자 차례를
    // 알리는 유일한 수단이다 — 글자 자체엔 화자 표시가 없고 토스트만 구분한다.
    setSpeaker(m.speaker === 'receiver' ? 'receiver' : 'visitor');
    setText(m.value);
});

bridge.on('submit', () => doSubmit());

bridge.on('clear', () => clearAll());

// 화면까지 비운다 — receiver 누적 버퍼와 채팅 기록 전부 초기화.
// (입력값만 비우면 이미 구워진 글자가 그대로 남아 TD에서 Esc를 눌러도 화면이 안 지워진다)
function clearAll() {
    cancelPreset();
    resetInput();
    rm.current?.clearAccum?.();
    _held = false;
    chat.clear();
    _speaker = 'visitor';
    reLayout([]);
}

bridge.on('mode', m => {
    // joke / question 토글 — 아직 receiver 동작에 연결 안 됨. 상태만 보관/에코.
    window.__mode = { ...(window.__mode ?? {}), ...m };
});

bridge.on('receiver', async m => {
    if (!m.name || m.name === rm.name) return;
    const from = rm.name;
    try {
        await rm.setReceiver(m.name, { transparentOutput: true });
    } catch (err) {
        reportError('setReceiver', (err && err.message) || err, { from, to: m.name });
        return;
    }
    _held = false; // 새 receiver는 빈 캔버스로 시작한다
    // 패널 노브 값은 receiver가 바뀌어도 유지 — 새 receiver 기본값에 다시 곱한다
    for (const [id, v] of Object.entries(_knobs)) applyKnob(rm.current, resolveControl({ id }), v);
    emit({ t: 'receiver', name: rm.name });
    reLayout(_allItems);
});

// ── 컨트롤 패널 ──────────────────────────────────────────────────────────────
// 패널(가상 src/dev/control.html / 피지컬 → TD midiinCHOP)은 {t:'control', id|cc, value}만
// 보낸다. 무엇을 할지는 여기서만 정한다 — 표는 src/js/controls.js.
const PRESET_CHAR_MS = 380; // 프리셋 문장을 한 글자씩 흘리는 간격
const PRESET_SUBMIT_MS = 1600; // 다 흘린 뒤 마지막 음절이 자랄 시간을 주고 제출
const _knobs = {}; // id → 0~1 (receiver 전환 시 다시 적용)
let _presetTimer = null;

function cancelPreset() {
    clearTimeout(_presetTimer);
    _presetTimer = null;
}

// 프리셋 버튼 = 관람객이 그 문장을 친 것과 같다. 한 번에 넣으면 제출 시 flushQueue가
// 성장 애니메이션을 전부 건너뛰므로(finishGrowing), 타이핑하듯 한 글자씩 흘린다.
function playPreset(text) {
    cancelPreset();
    setSpeaker('visitor');
    const chars = [...text];
    let i = 0;
    const step = () => {
        i++;
        setText(chars.slice(0, i).join(''));
        _presetTimer =
            i < chars.length
                ? setTimeout(step, PRESET_CHAR_MS)
                : setTimeout(() => {
                      _presetTimer = null;
                      doSubmit();
                  }, PRESET_SUBMIT_MS);
    };
    step();
}

function applyControl(m) {
    const c = resolveControl(m);
    if (!c) return;
    const v = Number(m.value ?? 1);
    if (c.kind === 'knob') {
        _knobs[c.id] = v;
        if (applyKnob(rm.current, c, v)) reLayout(_allItems);
    } else if (c.kind === 'toggle') {
        window.__mode = { ...(window.__mode ?? {}), [c.id]: v > 0.5 };
        emit({ t: 'mode', joke: !!window.__mode.joke, question: !!window.__mode.question });
    } else if (v > 0.5) {
        if (c.text) playPreset(c.text);
        else if (c.id === 'send') {
            cancelPreset();
            doSubmit();
        } else if (c.id === 'clear') clearAll();
    }
}

bridge.on('control', applyControl);
window.control = applyControl; // 콘솔 테스트: control({id:'preset1'})
