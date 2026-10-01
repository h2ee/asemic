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
    paginate,
    voiceFor,
    addedSyllable,
    lateEnding,
} from '../js/core.js';
import { createSound } from '../js/sound.js';
import { createBridge } from './bridge.js';
import { createLLM } from './llm.js';
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
// ?receiver= 를 직접 적으면 그 receiver로 고정 — 브릿지 {t:'receiver'}(TD 다이얼, 접속 시 동기화)를
// 무시한다. 안 적으면 TD 다이얼을 따라간다. 브라우저와 TD 화면을 따로 띄워 비교할 때 쓴다.
const RECEIVER_PINNED = params.has('receiver');
// 수신자 응답(LLM)을 누가 만드나. ?llm=web|td|off
//   td  — TD /chat/llm 이 만들어 브릿지 {t:'text', speaker:'receiver'}로 흘려보낸다 (TD 임베드 기본)
//   web — 이 페이지가 직접 로컬 Ollama를 부른다(src/dev/llm.js). TD 없이 완결 (브라우저 기본)
//   off — 응답 없음
// 페이지 둘(TD 임베드 + 브라우저)이 같은 허브에 붙어도 한 번의 제출에 LLM이 한 번만 돌도록
// turn/done 에 이 값을 실어 보낸다 — TD bridge_ext 는 llm==='td' 인 턴에만 응답한다.
const LLM_MODE = ['web', 'td', 'off'].includes(params.get('llm'))
    ? params.get('llm')
    : CHROME
      ? 'web'
      : 'td';

// 글자 영역 — 좌표의 원본은 output.html의 #glyph-window CSS다. 여기서 재서 쓰면
// 숫자가 두 곳에 갈라지지 않는다.
const glyphWindow = document.getElementById('glyph-window');
const glyphRect = () => {
    const r = glyphWindow.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const canvas = document.getElementById('stage-canvas');
const rm = new ReceiverManager(canvas);
// ── 사운드 — 음절이 화면에서 자라기 시작하는 순간 울린다(receiver가 onSyllableStart를 부름).
// ?sound=0 이면 끔. 브라우저는 첫 키 입력/클릭에서 오디오가 풀린다
const sound = createSound({ enabled: params.get('sound') !== '0' });
rm.onSyllableStart = (syl, name) => sound.play(voiceFor(syl, name), syl);
for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, sound.unlock, { capture: true });
sound.unlock(); // TD(CEF)가 autoplay를 허용하면 여기서 바로 풀린다
window.sound = sound; // 콘솔 디버깅용
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

// ── 웹 네이티브 LLM (LLM_MODE === 'web') ─────────────────────────────────────
// 콜백은 TD 경로의 브릿지 핸들러와 같은 자리에 꽂힌다: onText = {t:'text', speaker:'receiver'},
// onDone = {t:'submit'}. 그래서 화면 쪽 흐름(_held, 페이지 넘김, 채팅 기록)은 두 경로가 똑같다.
const llmOpts = {};
if (params.get('llm_model')) llmOpts.model = params.get('llm_model');
if (params.get('llm_rate')) llmOpts.revealRate = Number(params.get('llm_rate'));
const llm =
    LLM_MODE === 'web'
        ? createLLM({
              ...llmOpts,
              receiver: () => rm.name,
              onAsk: () => chat.setTalking('receiver', rm.name), // 응답 기다리는 동안 "… is talking …"
              onText: value => {
                  setSpeaker('receiver');
                  setText(value);
              },
              onDone: () => doSubmit(),
              onError: msg => {
                  console.warn('[llm]', msg);
                  chat.setTalking(_allItems.length ? _speaker : null, rm.name);
              },
          })
        : null;
window.llm = llm; // 콘솔: llm.ask('안녕') / llm.status

// ── 상태 ─────────────────────────────────────────────────────────────────────
let _sylItems = [];
let _positions = [];
let _allItems = [];
let _prevSpaceCount = 0;
let _prevSylTotal = 0; // 사운드 대체 트리거용 음절 수
// 지금 글자 영역에 그려지는 문장이 누구 것인지. 'visitor' | 'receiver'.
// 브릿지 {t:'text', speaker}가 정하고, 키보드 직접 입력은 항상 관람객이다.
let _speaker = 'visitor';
// 지금 글자 영역에 그려지는 문장. input 엘리먼트가 아니라 **이쪽이 원본**이다 —
// 노란 바는 관람객 입력창이라 수신자(LLM) 문장은 거기 비치면 안 되기 때문.
let _text = '';
// 수신자 문장을 제출한 뒤에도 글자 영역에 남겨 둔 상태. 다음 글자가 들어오는 순간
// (보통 관람객의 첫 타이핑) 비운다 — setText / setSpeaker 참고.
let _held = false;
let _heldItems = []; // _held 동안 화면에 남아 있는 그 문장(모드 전환 시 다시 그리려고)

// ── 글자 표시 모드 (glyphmode) ──────────────────────────────────────────────
// step = 문장 전체, 넘치면 단계 축소 / page = 음절 PAGE_SIZE개씩 한 페이지 (core.paginate)
// scroll(기본) = 한 줄 테이프, 넘치면 왼쪽으로 흘러감. receiver가 scrollTo를 구현해야 먹는다
//          (2026-09-26 현재 mycelium만) — 없으면 step처럼 그린다.
// disperse = page처럼 끊되, 화면을 비울 때마다(페이지 넘김·제출·남겨 둔 문장 비움·화자 전환)
//          이전 글자가 흩어지며 사라지고 그사이 새 글자가 자란다. receiver.disperse가 없으면 page와 같다
//          (2026-09-27 현재 mycelium만).
// ?glyphmode=step|page|scroll|disperse 로 시작하거나 컨트롤 'glyphmode' 버튼(순환)·'paging' 토글로 바꾼다.
const GLYPH_MODES = ['step', 'page', 'scroll', 'disperse'];
const PAGE_SIZE = 5;
const PAGE_HOLD_MS = 1500; // 수신자 문장: 페이지가 다 자란 뒤 이만큼 더 보여 주고 넘긴다
// 기본은 scroll(2026-10-01). scrollTo가 없는 receiver(sora/signal/dandelion)는 어차피 step으로 그려진다.
let _glyphMode = GLYPH_MODES.includes(params.get('glyphmode')) ? params.get('glyphmode') : 'scroll';
const isScroll = () => _glyphMode === 'scroll' && typeof rm.current?.scrollTo === 'function';
const isPaged = () => _glyphMode === 'page' || _glyphMode === 'disperse';

// 글자 영역 비우기. disperse 모드면 지우기 직전 화면을 흩어지는 잔상으로 넘긴다.
// (명시적 지우기 clearAll · 모드 전환 · receiver 교체는 잔상 없이 바로 비운다 — 여기 안 거침)
function clearGlyphs() {
    if (_glyphMode === 'disperse') rm.current?.disperse?.();
    rm.current?.clearAccum?.();
}
let _pageSrc = []; // 페이지를 나눌 원본 문장 — 제출 후 _held 동안에도 남은 페이지를 넘기려고 따로 둔다
let _shownPage = 0; // 지금 화면에 있는 페이지
let _drawnPage = 0; // 마지막으로 receiver에 그린 페이지 — 다르면 clearAccum 후 새로 그린다
let _pageTimer = null;
let _idleAt = null;

function resetPager() {
    clearTimeout(_pageTimer);
    _pageTimer = null;
    _idleAt = null;
    _shownPage = 0;
    _drawnPage = 0;
    _pageSrc = [];
}

// 수신자 문장은 페이지가 다 자라고(isIdle) PAGE_HOLD_MS 뒤에 한 장 넘긴다. 그사이 들어온
// 글자는 _pageSrc에 쌓여 있다가 다음 페이지에서 그려진다.
function schedulePageFlip() {
    if (_pageTimer) return;
    const tick = () => {
        const idle = rm.current?.isIdle?.() ?? true;
        const now = performance.now();
        if (!idle) _idleAt = null;
        else if (_idleAt === null) _idleAt = now;
        if (!idle || now - _idleAt < PAGE_HOLD_MS) {
            _pageTimer = setTimeout(tick, 100);
            return;
        }
        _pageTimer = null;
        _idleAt = null;
        _shownPage++;
        reLayout(_allItems);
    };
    _pageTimer = setTimeout(tick, 100);
}

// page 모드에서 지금 그릴 음절들. step 모드면 items 그대로.
function visibleItems(items) {
    if (!isPaged()) return items;
    // 제출 후 _held 동안엔 _allItems가 비어도 남은 페이지를 계속 넘긴다
    if (items.length || !_held) _pageSrc = items;
    const pages = paginate(_pageSrc, PAGE_SIZE);
    const last = pages.length - 1;
    if (last < _shownPage) {
        _shownPage = last; // 지워서 앞 페이지로 돌아감
    } else if (last > _shownPage) {
        if (_speaker === 'receiver') schedulePageFlip();
        else _shownPage = last; // 관람객 입력은 밀리면 안 된다 — 바로 넘김
    }
    if (_shownPage !== _drawnPage) {
        // 앞으로 넘길 때만 흩어진다 — 지워서 앞 페이지로 돌아갈 땐 그냥 비움
        if (_shownPage > _drawnPage) clearGlyphs();
        else rm.current?.clearAccum?.();
        _drawnPage = _shownPage;
    }
    return pages[_shownPage];
}

// ── 레이아웃 → 수신자 dispatch ───────────────────────────────────────────────
// rect를 넘겨 글자를 #glyph-window 안에만 배치한다. offsetY는 늘 0 —
// 한 문장만 그리므로 누적할 기준선이 없다.
function reLayout(items) {
    items = visibleItems(items);
    const rect = glyphRect();
    // positions를 배치에 안 쓰는 receiver(sora=내부 랜덤, signal=_draw()가 직접 shelf)는
    // layoutFor(rect)만으론 영역이 안 좁혀진다 — 그쪽엔 rect를 직접 건넨다.
    rm.current?.setRect?.(rect);
    const line = isScroll();
    let { positions, sylItems, widths, heights, sylSize, glyphScale, scrollX } = layoutFor(
        rm,
        items,
        window.innerWidth,
        window.innerHeight,
        0,
        rect,
        { line },
    );
    if (line) {
        // 테이프 좌표 → 누적 버퍼 좌표. receiver는 목표(scrollX)를 향해 버퍼를 조금씩 밀고,
        // 새 음절은 "지금까지 실제로 민 양(scrollBase)"만큼 뺀 자리에 굽는다
        rm.current.scrollTo(scrollX ?? 0);
        const shift = rm.current.scrollBase / window.innerWidth;
        positions = positions.map(([u, v]) => [u - shift, v]);
    }
    _sylItems = sylItems;
    _positions = positions;
    if (sylItems.length > 0) {
        dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights, glyphScale);
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
        if (!hold) clearGlyphs();
    }

    chat.addTurn(speaker, turnItems);
    if (!hold) reLayout([]);
    _held = hold;
    _heldItems = hold ? turnItems : [];

    // speaker/text/llm 은 TD의 LLM이 쓴다 — 관람객 차례가 끝났을 때만 응답을 만들고,
    // 자기가 흘려보낸 수신자 차례에는 반응하지 않아야 하기 때문(안 그러면 무한루프).
    const text = turnItems.map(it => (it.isSpace ? ' ' : composeChar(it))).join('');
    emit({ t: 'turn', phase: 'done', speaker, text, llm: LLM_MODE, png: dataUrl, h: 0 });
    return { speaker, text };
}

async function doSubmit() {
    if (!_allItems.length) return;
    const turn = await handleSubmit();
    resetInput();
    // 웹 네이티브 LLM — 관람객 차례가 끝났을 때만(자기 응답에 또 응답하면 무한루프)
    if (llm && turn?.speaker === 'visitor') llm.ask(turn.text);
}

function resetInput() {
    setText('');
    chat.setTalking(null);
}

// 화자가 바뀌면 진행 중이던 문장은 버린다 — 글자 영역엔 한 화자만 있어야 한다.
function setSpeaker(speaker) {
    if (speaker !== _speaker) {
        _speaker = speaker;
        clearGlyphs();
        _held = false;
        resetPager();
        _text = '';
        input.value = '';
        fitInput();
        _allItems = [];
        _prevSpaceCount = 0;
        _prevSylTotal = 0;
    }
    chat.setTalking(speaker, rm.name);
}

// ── 입력 ─────────────────────────────────────────────────────────────────────
const input = document.getElementById('user-input');
input.focus();
document.body.addEventListener('click', () => input.focus()); // 포커스 유실 대비

// 노란 바는 <textarea rows=1> — 글이 넘치면 한 줄씩 위로 자란다(CSS가 bottom 고정).
// 채팅창 아래 끝이 바 위에 붙어 있으므로 실제 높이를 --input-h 로 알려 같이 밀어 올린다.
const inputBar = document.getElementById('input-bar');
function fitInput() {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
}
new ResizeObserver(() => {
    document.documentElement.style.setProperty('--input-h', `${inputBar.offsetHeight}px`);
}).observe(inputBar);
fitInput();

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
        clearGlyphs();
        _held = false;
        resetPager();
    }
    _text = value;
    // 노란 바에는 관람객 차례일 때만 원문을 비춘다.
    const mirrored = _speaker === 'visitor' ? _text : '';
    if (input.value !== mirrored) input.value = mirrored;
    fitInput();

    _allItems = decomposeSyllables(_text);

    // 사운드 — mycelium은 성장 시작에 직접 울리고, 나머지는 음절이 새로 생기는 순간 여기서
    const { count, added } = addedSyllable(_allItems, _prevSylTotal);
    _prevSylTotal = count;
    if (added && !rm.current?.emitsSyllableStart) rm.onSyllableStart?.(added, rm.name);
    sound.endLast(lateEnding(sound.lastSyl, _allItems)); // 받침이 소리보다 늦게 왔으면 지금 끝맺는다

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
    llm?.cancel(); // 관람객이 끼어들면 드러나던 응답은 버린다
    // setSpeaker가 화자 전환 시 input.value를 비우므로 방금 친 글자를 먼저 붙잡아 둔다.
    // textarea라 붙여넣기로 줄바꿈이 들어올 수 있다 — 문장은 한 줄이다.
    const typed = input.value.replace(/\n/g, ' ');
    setSpeaker('visitor');
    setText(typed);
});
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        doSubmit();
    }
});

window.addEventListener('resize', () => {
    fitInput(); // vh 단위 글자 크기가 바뀌므로 줄 수도 다시 잰다
    reLayout(_allItems);
});

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
    // 웹 LLM 모드면 수신자 문장은 이 페이지가 만든다 — 같은 허브에 붙은 TD LLM의 것은 무시
    if (llm && m.speaker === 'receiver') return;
    if (llm && m.speaker !== 'receiver') llm.cancel();
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
    llm?.cancel();
    resetPager();
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
    if (RECEIVER_PINNED || !m.name || m.name === rm.name) return;
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
    llm?.cancel();
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

// 모드를 바꾸면 지금 문장을 새 모드로 처음부터 다시 그린다
function setGlyphMode(mode) {
    _glyphMode = mode;
    console.log('[glyphmode]', mode);
    resetPager();
    rm.current?.clearAccum?.();
    reLayout(_held ? _heldItems : _allItems);
}

function applyControl(m) {
    const c = resolveControl(m);
    if (!c) return;
    const v = Number(m.value ?? 1);
    if (c.kind === 'knob') {
        _knobs[c.id] = v;
        if (applyKnob(rm.current, c, v)) reLayout(_allItems);
    } else if (c.id === 'paging') {
        setGlyphMode(v > 0.5 ? 'page' : 'step');
    } else if (c.kind === 'toggle') {
        window.__mode = { ...(window.__mode ?? {}), [c.id]: v > 0.5 };
        emit({ t: 'mode', joke: !!window.__mode.joke, question: !!window.__mode.question });
    } else if (v > 0.5) {
        if (c.text) playPreset(c.text);
        else if (c.id === 'glyphmode') setGlyphMode(GLYPH_MODES[(GLYPH_MODES.indexOf(_glyphMode) + 1) % GLYPH_MODES.length]);
        else if (c.id === 'send') {
            cancelPreset();
            doSubmit();
        } else if (c.id === 'clear') clearAll();
    }
}

bridge.on('control', applyControl);
window.control = applyControl; // 콘솔 테스트: control({id:'preset1'})
