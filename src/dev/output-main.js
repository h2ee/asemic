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
    getPatternType,
    resolveControl,
    applyKnob,
    paginate,
    voiceFor,
    TIMBRE,
    addedSyllable,
    lateEnding,
} from '../js/core.js';
import { createSound } from '../js/sound.js';
import { createBridge } from './bridge.js';
import { createSerial } from './serial.js';
import { createLLM, translateToKorean } from './llm.js';
import { buildChat } from './chat.js';
import { mountBubble } from './bubble.js';
import { buildSpeakers, iconFor } from './speakers.js';
import { buildCaption } from './caption.js';
import { asset, injectFonts } from './assets.js';

injectFonts();
document.getElementById('wilson').src = asset('imgs/wilson_wide.svg');
// 브라우저 모드 배경 — CSS에선 asset()을 못 쓰니 변수로 넘긴다(output.html body)
document.documentElement.style.setProperty('--bg-img', `url('${asset('imgs/BG_d.jpg')}')`);
// receiver별 배경 — 여기 없는 receiver는 BG_d. 지금은 한 장(BG_n)뿐이라 body::before 한 겹으로 크로스페이드
// (output.html). 두 장 이상 갈리게 되면 겹을 늘려야 한다
const BG_ALT = asset('imgs/BG_n.jpeg');
const BG_ALT_RECEIVERS = new Set(['signal']);
document.documentElement.style.setProperty('--bg-alt', `url('${BG_ALT}')`);
new Image().src = BG_ALT; // 처음 전환 때 디코딩하느라 페이드가 끊기지 않게 미리 받아 둔다

const params = new URLSearchParams(location.search);
// ?chrome=0 → 배경을 투명하게 (전시 기본). 크롬은 TD의 controller가 3D로 그린다.
//   나머지 조각(글자·토스트·채팅창·입력 바)은 두 모드에서 똑같이 보인다 —
//   목업이 곧 chrome=0 위에 TD 크롬을 합성한 결과다.
const CHROME = params.get('chrome') !== '0';
if (!CHROME) {
    document.documentElement.classList.add('no-chrome');
    document.body.classList.add('no-chrome');
}
// ?chat=1 → 오른쪽 기록(구조 SVG 말풍선)을 아주 작게 띄운다. 2026-10-07부터 기본은 숨김
if (params.get('chat') === '1') document.documentElement.classList.add('show-log');

// 말풍선 모양 — Figma 시안 1~4번 중 고르는 중. ?bubble=N 으로 시작, Alt+1..4 로 바꿔 본다
const bubble = mountBubble(
    document.getElementById('bubble'),
    document.getElementById('bubble-box'),
    Number(params.get('bubble')) || 1,
    // 유리 — 브라우저 모드에서만. 뒤에 깔린 body 배경(BG_d)과 같은 이미지를 굴절시킨다
    {
        glass: CHROME ? asset('imgs/BG_d.jpg') : null,
        glassAlt: CHROME ? BG_ALT : null,
        // 말풍선이 떠 있는 동안 글자·음절 네모를 말풍선 모양으로 자른다(둥근 모서리 밖으로 안 비치게)
        clip: [document.getElementById('glyph-window'), document.getElementById('syl-tags')],
    },
);
window.bubble = bubble; // 콘솔: bubble.setType(3)
// 말풍선은 수신자(LLM)가 말할 때만 — 관람객 입력 땐 없다. 처음엔 아무도 안 말하므로 숨기고 시작
bubble.setVisible(false, { instant: true });
window.addEventListener(
    'keydown',
    e => {
        const n = e.altKey && /^Digit[1-4]$/.test(e.code) ? Number(e.code.slice(5)) : 0;
        if (!n) return;
        e.preventDefault(); // macOS Alt+숫자는 특수문자를 친다 — 입력창에 안 들어가게
        e.stopPropagation();
        bubble.setType(n);
    },
    { capture: true },
);
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
// 2026-10-08: 배치는 #glyph-rect, 자르기는 그보다 넓은 #glyph-window (획이 삐져나와도 안 잘리게)
const glyphLayoutEl = document.getElementById('glyph-rect');
const glyphRect = () => {
    const r = glyphLayoutEl.getBoundingClientRect();
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
window.TIMBRE = TIMBRE; // 콘솔 튜닝용 — 예: TIMBRE.sora.tau = 1.2 하고 치면 바로 들린다(새로고침하면 원래 값)
await rm.setReceiver(RECEIVER, { transparentOutput: true });
syncBackground({ instant: true });
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
// 2026-10-07: 토스트는 CSS로 숨김(→ 프로필 LED), 채팅창은 ?chat=1 일 때만 보인다. 기록은 계속 쌓는다.
const chat = buildChat({
    panel: document.getElementById('chat-panel'),
    toast: document.getElementById('toast'),
});

// ── 화자 프로필(LED) + 글자 밑 상자 ─────────────────────────────────────────
const speakers = buildSpeakers(document.getElementById('speakers'), {
    receiver: rm.name,
    cam: params.get('cam') !== '0',
    camPx: params.has('campx') ? Number(params.get('campx')) : undefined,
    camToggle: document.getElementById('cam-toggle'), // 임시 — 카메라 끄기 버튼
});
const caption = buildCaption({
    struct: document.getElementById('caption'),
    tags: document.getElementById('syl-tags'),
});

// 누가 말하는 중인지 — 토스트(chat)와 LED(speakers)에 같이 알린다. null = 아무도
let _talking = null;
function setTalking(speaker) {
    _talking = speaker;
    chat.setTalking(speaker, rm.name);
    speakers.setTalking(speaker);
    syncBubble();
}

// 말풍선 = 수신자 차례. LLM이 대답을 만들기 시작하면(onAsk) 아래에서 떠오르고, 제출 뒤 남겨 둔
// 문장(_held)이 있는 동안 남아 있다가, 관람객이 치기 시작하면(_held 해제 + 화자 전환) 사라진다
function syncBubble() {
    bubble.setVisible(_talking === 'receiver' || (_held && _heldItems.length > 0));
    syncIdle();
}

// 빈 화면 안내 — 아무도 말하지 않고 화면에 글자도 없을 때 "(아이콘)에게 하고 싶은 말을 건네보세요".
// 나타날 땐 조금 기다린다 — 관람객 제출 → LLM 요청 사이 한 틱 동안 깜빡이지 않게. 사라질 땐 바로
const hint = document.getElementById('hint');
const HINT_DELAY_MS = 700;
let _hintTimer = 0;
function syncIdle() {
    const idle = !_talking && !_held && !_text;
    clearTimeout(_hintTimer);
    if (!idle) {
        hint.hidden = true;
        return;
    }
    const icon = iconFor(rm.name);
    hint.querySelector('.icon').style.setProperty('--svg', icon ? `url('${icon}')` : 'none');
    _hintTimer = setTimeout(() => (hint.hidden = false), HINT_DELAY_MS);
}

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
              onAsk: () => setTalking('receiver'), // 응답 기다리는 동안 "… is talking …"
              onText: value => {
                  setSpeaker('receiver');
                  setText(value);
              },
              onDone: () => doSubmit(),
              onError: msg => {
                  console.warn('[llm]', msg);
                  setTalking(_allItems.length ? _speaker : null);
              },
          })
        : null;
window.llm = llm; // 콘솔: llm.ask('안녕') / llm.status

// ── 상태 ─────────────────────────────────────────────────────────────────────
let _sylItems = [];
let _tagLayout = { positions: [], sylSize: 0, axis: null, items: [] }; // 음절 네모 위치용 (reLayout → sylTags)
// 실제로 네모를 그리는 배치 — receiver가 재굽기 중(화면엔 아직 예전 배치)이면 끝날 때까지 예전 것을 쥐고 있는다
let _shownTags = _tagLayout;
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
// 2026-10-07: scroll 이 세로(줄이 아래에서 쌓여 올라가고 말풍선이 같이 자람)로 바뀌었다.
//   예전 가로 한 줄 테이프는 tape 로 남겨 둔다. 둘 다 receiver.scrollTo 가 있어야 먹는다(mycelium).
const GLYPH_MODES = ['step', 'page', 'scroll', 'disperse', 'tape'];
const PAGE_SIZE = 5;
const PAGE_HOLD_MS = 1500; // 수신자 문장: 페이지가 다 자란 뒤 이만큼 더 보여 주고 넘긴다
// 기본은 scroll(2026-10-01). scrollTo가 없는 receiver(sora)는 어차피 step으로 그려진다.
// 2026-10-08: signal·dandelion도 scrollTo를 달아 세로 scroll을 탄다. 가로 tape는 여전히 mycelium만(glyphExtent 필요)
let _glyphMode = GLYPH_MODES.includes(params.get('glyphmode')) ? params.get('glyphmode') : 'scroll';
const canScroll = () => typeof rm.current?.scrollTo === 'function';
const isTape = () => _glyphMode === 'tape' && canScroll() && !!rm.current?.glyphExtent;
const isStack = () => _glyphMode === 'scroll' && canScroll();
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
    // 제출 뒤 남겨 둔 수신자 문장 — 입력값은 비었어도 화면엔 그 문장이 있으니 그걸로 배치한다.
    // 빈 배치로 두면 말풍선이 한 줄로 줄어들고(fitBubble) 음절 네모 자리도 잃는다. (page 모드는 _pageSrc가 맡는다)
    if (_held && !items.length && !isPaged()) items = _heldItems;
    items = visibleItems(items);
    const rect = glyphRect();
    // positions를 배치에 안 쓰는 receiver(sora=내부 랜덤, signal=_draw()가 직접 shelf)는
    // layoutFor(rect)만으론 영역이 안 좁혀진다 — 그쪽엔 rect를 직접 건넨다.
    rm.current?.setRect?.(rect);
    const line = isTape();
    const stack = isStack();
    if (line || stack) rm.current.setScrollAxis?.(stack ? 'y' : 'x');
    let { positions, sylItems, widths, heights, sylSize, glyphScale, scrollX, scrollY, lines, lineH, extent, top } =
        layoutFor(rm, items, window.innerWidth, window.innerHeight, 0, rect, { line, stack });
    // 관람객 음절 네모가 붙을 자리 — 스크롤을 빼기 전 테이프 좌표를 들고 있다가 매 프레임
    // 그때의 scrollBase를 빼서 화면 위치로 바꾼다(테이프가 흐르는 동안 네모도 같이 흐르게)
    _tagLayout = { positions, sylSize, axis: line ? 'x' : stack ? 'y' : null, items: sylItems };
    if (line) {
        // 테이프 좌표 → 누적 버퍼 좌표. receiver는 목표(scrollX)를 향해 버퍼를 조금씩 밀고,
        // 새 음절은 "지금까지 실제로 민 양(scrollBase)"만큼 뺀 자리에 굽는다
        rm.current.scrollTo(scrollX ?? 0);
        const shift = rm.current.scrollBase / window.innerWidth;
        positions = positions.map(([u, v]) => [u - shift, v]);
    } else if (stack) {
        // 세로 — 줄이 늘 때마다 한 줄 높이만큼 위로. 마지막 줄은 늘 글자 영역 맨 아래
        rm.current.scrollTo(scrollY ?? 0);
        const shift = rm.current.scrollBase / window.innerHeight;
        positions = positions.map(([u, v]) => [u, v - shift]);
    }
    fitBubble(stack ? { rect, lines, lineH, extent, top } : null);
    document.documentElement.classList.toggle('glyph-stack', stack); // 위쪽 페이드 mask (output.html)
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
    // hint = 프리셋이 붙인 상황 설명(예: 안녕 hi/bye). TD LLM도 쓸 수 있게 같이 싣는다.
    const hint = speaker === 'visitor' ? _presetHint : null;
    emit({ t: 'turn', phase: 'done', speaker, text, llm: LLM_MODE, hint, png: dataUrl, h: 0 });
    return { speaker, text, hint };
}

// ── 영어 입력 fallback (2026-10-08) ─────────────────────────────────────────
// 외국인 관람객도 전하고 싶은 뜻이 있다 — 영문을 자판 위치대로 자모로 바꾸면(두벌식) 화면이 고장 난 것처럼
// 보이고 대부분 낱자라 글자도 안 그려진다. 그래서 Enter 때 뜻을 한국어 한 문장으로 옮기고, 그 문장을
// 프리셋처럼 한 글자씩 흘려 관람객의 글자로 자라게 한 뒤 제출한다(수신자는 그 한국어 문장에 답한다).
const LATIN_RE = /[A-Za-z]/;
let _latin = false;
let _translating = false;
let _foreignGen = 0; // 옮기는 사이 관람객이 다시 치면 늦게 온 번역은 버린다
async function submitForeign() {
    const src = _text.trim();
    if (!src || _translating) return;
    const my = ++_foreignGen;
    _translating = true;
    refreshCaption();
    const ko = await translateToKorean(src, llmOpts);
    if (my !== _foreignGen) return;
    _translating = false;
    if (!ko) {
        console.warn('[foreign] 번역 실패 — 입력을 비운다');
        resetInput();
        return;
    }
    playPreset(ko);
}

async function doSubmit() {
    if (_latin) return submitForeign();
    if (!_allItems.length) return;
    const turn = await handleSubmit();
    _presetHint = null;
    resetInput();
    // 웹 네이티브 LLM — 관람객 차례가 끝났을 때만(자기 응답에 또 응답하면 무한루프)
    if (llm && turn?.speaker === 'visitor') llm.ask(turn.text, turn.hint);
}

function resetInput() {
    setText('');
    setTalking(null);
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
    setTalking(speaker);
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

    // 영문 입력(fallback) — 알파벳이 섞이면 글자는 그리지 않고 친 그대로 상자에만 보인다.
    // Enter 때 한국어로 옮겨 관람객 차례로 흘려보낸다(submitForeign)
    _latin = _speaker === 'visitor' && LATIN_RE.test(_text);
    _allItems = _latin ? [] : decomposeSyllables(_text);

    // 사운드 — mycelium은 성장 시작에 직접 울리고, 나머지는 음절이 새로 생기는 순간 여기서
    const { count, added } = addedSyllable(_allItems, _prevSylTotal);
    _prevSylTotal = count;
    if (added && !rm.current?.emitsSyllableStart) rm.onSyllableStart?.(added, rm.name);
    sound.endLast(lateEnding(sound.lastSyl, _allItems)); // 받침이 소리보다 늦게 왔으면 지금 끝맺는다

    // 토스트 — 글자가 있는 동안만 "말하는 중"
    setTalking(_allItems.length || _latin ? _speaker : null); // 영문(fallback)도 말하는 중

    // 띄어쓰기(단어 경계)가 새로 생기면 현재 자라는 음절을 즉시 완성
    const spaceCount = _allItems.reduce((n, it) => n + (it.isSpace ? 1 : 0), 0);
    if (spaceCount > _prevSpaceCount) rm.current?.finishGrowing?.();
    _prevSpaceCount = spaceCount;

    reLayout(_allItems);

    // TD/analyzer 로 마지막 완성 음절 + 자모 수치, 그리고 조합 상태 전송
    const lastSyl = [..._allItems].reverse().find(it => !it.isSpace);
    if (lastSyl) emit({ t: 'syllable', ...syllableData(lastSyl) });
    emit({ t: 'compose', text: _text, sylCount });
    refreshCaption();
}

// 글자 밑 상자 — 화면에 떠 있는 문장을 따라간다. 제출 후 남겨 둔 수신자 문장(_held)도 계속 보인다.
// 관람객은 원문의 마지막 글자(조합 중인 자모 포함), 수신자는 문장 전체를 구조 블록으로.
function refreshCaption() {
    syncBubble();
    caption.latin(_latin ? _text : '', { busy: _translating });
    caption.tags(sylTags());
}

// 관람객 음절 네모 — 음절 가운데 x, 음절 중심에서 반지름 × TAG_Y 만큼 아래에 네모 윗변이 붙는다.
// 반지름 = glyphExtent × sylSize (mycelium), 없는 receiver는 sylSize/2.
// sora는 positions를 안 쓰고 자기 맘대로 흩뿌리므로 네모가 글자와 안 맞는다.
const TAG_Y = 0.6;
const SORA_TAG_Y = 1.05; // sora 단어 네모 — 원 중심에서 반경의 이 배만큼 아래(원 바깥 테두리 바로 밑)
function sylTags() {
    if (!rm.current?.rebaking) _shownTags = _tagLayout;
    const { positions, sylSize, axis, items } = _shownTags;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // 화면에 실제로 그려진 스크롤 양 — scrollBase는 표시 패스(24fps)보다 먼저 바뀔 수 있다(mycelium)
    const shift = axis ? (rm.current?.shownScrollBase ?? rm.current?.scrollBase ?? 0) : 0;
    const half = (rm.current?.glyphExtent ?? 0.5) * sylSize;
    // 수신자 문장(말하는 중 · 남겨 둔 것)은 원문 대신 구조 블록
    const receiver = _held || _speaker === 'receiver';
    // sora — positions를 안 쓰고 단어마다 원 하나(랜덤 자리)라 네모도 단어 하나에 하나, 원 가운데 아래에
    // 그 단어 음절을 이어서(2026-10-08)
    const anchors = rm.current?.wordAnchors?.();
    if (anchors) {
        return anchors.map(a => {
            const syls = items.filter(it => it.wordId === a.wordId);
            return {
                ...(receiver ? { types: syls.map(it => getPatternType(it.jung, it.jong)) } : { ch: syls.map(composeChar).join('') }),
                x: a.x,
                y: a.y + a.r * SORA_TAG_Y,
            };
        });
    }
    return items.map((it, i) => ({
        ...(receiver ? { type: getPatternType(it.jung, it.jong) } : { ch: composeChar(it) }),
        x: (positions[i]?.[0] ?? 0) * W - (axis === 'x' ? shift : 0),
        y: (positions[i]?.[1] ?? 0) * H + half * TAG_Y - (axis === 'y' ? shift : 0),
    }));
}
(function followTape() {
    caption.tags(sylTags());
    requestAnimationFrame(followTape);
})();

// 키보드 직접 입력은 언제나 관람객이다 — 수신자 차례였다면 그 문장을 버리고 넘겨받는다.
input.addEventListener('input', () => {
    // 번역 중이었다면 버린다 — 관람객이 다시 쓰기 시작했다
    _foreignGen++;
    _translating = false;
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
    refreshCaption();
}

bridge.on('mode', m => {
    // joke / question 토글 — 아직 receiver 동작에 연결 안 됨. 상태만 보관/에코.
    window.__mode = { ...(window.__mode ?? {}), ...m };
});

bridge.on('receiver', m => switchReceiver(m.name));
window.switchReceiver = switchReceiver; // 콘솔: switchReceiver('signal')
// 나중에 붙은 페이지(control.html 튜닝용 receiver 버튼)가 지금 receiver를 알 수 있게 — 누가 붙으면 다시 알린다
bridge.on('hello', () => emit({ t: 'receiver', name: rm.name }));

// receiver 전환 — iPad 다이얼(브릿지)이 부른다. 화면은 바로 바꾸고, 턴테이블은 그 사물을 앞으로 돌린다
// (도착은 기다리지 않는다 — 판이 빠져 있거나 멈춰도 화면은 따라가야 하므로. 도착 로그는 serial onTurntable)
// 배경을 지금 receiver에 맞춘다 — 전환 땐 --bg-fade 동안 크로스페이드, 처음 띄울 땐 바로
function syncBackground({ instant = false } = {}) {
    const root = document.documentElement;
    const on = BG_ALT_RECEIVERS.has(rm.name);
    root.classList.toggle('bg-instant', instant);
    root.classList.toggle('bg-alt', on);
    bubble.setGlassAlt(on);
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('bg-instant')));
}

async function switchReceiver(name) {
    if (RECEIVER_PINNED || !name || name === rm.name) return;
    const from = rm.name;
    serial.turntable(name);
    try {
        await rm.setReceiver(name, { transparentOutput: true });
    } catch (err) {
        reportError('setReceiver', (err && err.message) || err, { from, to: name });
        return;
    }
    _held = false; // 새 receiver는 빈 캔버스로 시작한다
    speakers.setReceiver(rm.name);
    syncBackground();
    refreshCaption();
    // 패널 노브 값은 receiver가 바뀌어도 유지 — 새 receiver 기본값에 다시 곱한다
    for (const [id, v] of Object.entries(_knobs)) applyKnob(rm.current, resolveControl({ id }), v);
    emit({ t: 'receiver', name: rm.name });
    reLayout(_allItems);
}

// ── 컨트롤 패널 ──────────────────────────────────────────────────────────────
// 패널(가상 src/dev/control.html / 피지컬 → TD midiinCHOP)은 {t:'control', id|cc, value}만
// 보낸다. 무엇을 할지는 여기서만 정한다 — 표는 src/js/controls.js.
const PRESET_CHAR_MS = 380; // 프리셋 문장을 한 글자씩 흘리는 간격
const PRESET_SUBMIT_MS = 1600; // 다 흘린 뒤 마지막 음절이 자랄 시간을 주고 제출
const _knobs = {}; // id → 0~1 (receiver 전환 시 다시 적용)
let _presetTimer = null;
let _presetHint = null; // 이번 턴에 LLM에 덧붙일 상황 설명(controls.js hints) — 제출 때 한 번 쓰고 버린다

function cancelPreset(keepHint = false) {
    clearTimeout(_presetTimer);
    _presetTimer = null;
    if (!keepHint) _presetHint = null; // 관람객이 끼어들어 직접 쓴 문장엔 안 붙는다
}

// 프리셋 버튼 = 관람객이 그 문장을 친 것과 같다. 한 번에 넣으면 제출 시 flushQueue가
// 성장 애니메이션을 전부 건너뛰므로(finishGrowing), 타이핑하듯 한 글자씩 흘린다.
function playPreset(text, hint = null) {
    cancelPreset();
    _presetHint = hint;
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
// 말풍선 세로 길이 — scroll(세로) 모드에서만 줄 수를 따라 위로 자란다(밑면 고정).
// 맨 윗줄 글자 위끝 + 여백까지. 최대치(프로필 아래)는 CSS가 자르고, 그 뒤로는 줄이 위로 밀려 사라진다
function fitBubble(st) {
    if (!st) return bubble.setHeight(null);
    const bubbleBox = document.getElementById('bubble-box');
    const { rect, lines, lineH, extent } = st;
    // top을 직접 주는 receiver(ext 없는 signal/dandelion)는 그걸, mycelium은 줄 수로 잰다
    const top = st.top ?? rect.y + rect.h - 2 * extent - (lines - 1) * lineH;
    const padTop = (parseFloat(getComputedStyle(bubbleBox).getPropertyValue('--bubble-pad-top')) || 0) * (window.innerHeight / 100);
    bubble.setHeight(bubbleBox.getBoundingClientRect().bottom - top + padTop);
}

function setGlyphMode(mode) {
    _glyphMode = mode;
    console.log('[glyphmode]', mode);
    resetPager();
    rm.current?.clearAccum?.();
    reLayout(_held ? _heldItems : _allItems);
}

// 피지컬 노브는 움직이는 동안 초당 수십 줄을 보낸다. 줄마다 reLayout(=mycelium 전체 재굽기)을 하면
// 밀려서 손보다 한참 늦게 따라온다 — 한 프레임에 한 번만 다시 배치하고 그 사이 값은 최신 것만 쓴다.
let _knobFrame = 0;
function knobReLayout() {
    if (_knobFrame) return;
    _knobFrame = requestAnimationFrame(() => {
        _knobFrame = 0;
        reLayout(_allItems);
    });
}

function applyControl(m) {
    const c = resolveControl(m);
    if (!c) return;
    const v = Number(m.value ?? 1);
    if (c.kind === 'knob') {
        _knobs[c.id] = v;
        if (applyKnob(rm.current, c, v)) knobReLayout();
    } else if (c.id === 'paging') {
        setGlyphMode(v > 0.5 ? 'page' : 'step');
    } else if (c.kind === 'toggle') {
        window.__mode = { ...(window.__mode ?? {}), [c.id]: v > 0.5 };
        emit({ t: 'mode', joke: !!window.__mode.joke, question: !!window.__mode.question, bye: !!window.__mode.bye });
    } else if (v > 0.5) {
        if (c.text) playPreset(c.text, c.hints?.[window.__mode?.[c.flip] ? 1 : 0] ?? null);
        else if (c.id === 'glyphmode') setGlyphMode(GLYPH_MODES[(GLYPH_MODES.indexOf(_glyphMode) + 1) % GLYPH_MODES.length]);
        else if (c.id === 'send') {
            cancelPreset(true); // 프리셋이 흐르는 중에 보내도 그 프리셋의 hint는 유지
            doSubmit();
        } else if (c.id === 'clear') clearAll();
    }
}

bridge.on('control', applyControl);
window.control = applyControl; // 콘솔 테스트: control({id:'preset1'})

// ── 피지컬 패널 + 턴테이블 (Web Serial) ──────────────────────────────────────
// 두 아두이노를 이 페이지가 직접 연다(src/dev/serial.js). 패널 줄은 가상 패널과 같은 applyControl로,
// 다이얼 선택은 switchReceiver가 턴테이블로 보낸다. 처음 한 번은 #serial 버튼(또는 Alt+S)으로
// 포트를 골라 권한을 줘야 하고(보드 둘이면 두 번), 그 뒤로는 새로고침·재연결 때 저절로 붙는다.
// ?serial=0 이면 안 연다 — 같은 맥에서 control.html 의 USB 연결로 시험할 때(한 포트는 한 탭만)
const serialBtn = document.getElementById('serial');
const serial =
    params.get('serial') === '0'
        ? { supported: false, request() {}, turntable() {}, status: () => ({}) }
        : createSerial({
              onControl: applyControl,
              onTurntable: line => {
                  console.log('[turntable]', line);
                  if (line.startsWith('home_fail') || line === 'lost' || line === 'wrong_mark')
                      reportError('turntable', line);
              },
              onStatus: st => {
                  serialBtn.textContent = `panel ${st.panel ? '●' : '○'} table ${st.turntable ? '●' : '○'}`;
                  serialBtn.classList.toggle('ok', st.panel && st.turntable);
              },
          });
window.serial = serial; // 콘솔: serial.turntable('sora') / serial.status()
serialBtn.hidden = !serial.supported;
serialBtn.addEventListener('click', e => {
    e.stopPropagation(); // body 클릭 = 입력창 포커스 — 선택 창이 뜨기 전에 뺏기지 않게
    serial.request().then(() => input.focus());
});
window.addEventListener(
    'keydown',
    e => {
        if (!(e.altKey && e.code === 'KeyS')) return;
        e.preventDefault(); // macOS Alt+S = ß
        e.stopPropagation();
        serial.request().then(() => input.focus());
    },
    { capture: true },
);
serial.turntable(rm.name); // 턴테이블이 호밍을 끝내면(homed) 이 자리로 간다

// 첫 화면 — 아직 아무도 말하지 않았으니 안내부터
syncIdle();
