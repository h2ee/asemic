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
import { setLightCurve, getLightCurve } from '../js/receivers/signal.js';
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
    knobSnapshot,
    moveKnob,
    rebaseKnob,
    paginate,
    voiceFor,
    beadStepVoice,
    TIMBRE,
    SOUND_FX,
    addedSyllable,
    lateEnding,
    CHO,
    JUNG,
} from '../js/core.js';
import { createSound } from '../js/sound.js';
import { createBridge } from './bridge.js';
import { createSerial } from './serial.js';
import { createLLM, translateToKorean } from './llm.js';
import { buildChat } from './chat.js';
import { mountBubble } from './bubble.js';
import { mountPeek } from './peek.js';
import { mountSent } from './sent.js';
import { buildSpeakers, iconFor } from './speakers.js';
import { buildCaption, fillRich } from './caption.js';
import { asset, injectFonts } from './assets.js';
import { startDiag } from './diag.js';
import { startChatLog } from './chatlog.js';
import { nextSeed, turnSeed } from '../js/seed.js';
import { setPixelBudget } from '../js/renderRes.js';

injectFonts();
document.getElementById('wilson').src = asset('imgs/wilson_wide.svg');
// 브라우저 모드 배경 — CSS에선 asset()을 못 쓰니 변수로 넘긴다(output.html body)
document.documentElement.style.setProperty('--bg-img', `url('${asset('imgs/BG_d.jpg')}')`);
// receiver별 배경 — 여기 없는 receiver는 BG_d. 지금은 한 장(BG_n)뿐이라 body::before 한 겹으로 크로스페이드
// (output.html). 두 장 이상 갈리게 되면 겹을 늘려야 한다
const BG_ALT = asset('imgs/BG_n.jpeg');
// signal 기본(light 룩, 2026-10-31~)은 밝은 배경에서 보려는 것이라 BG_d에 둔다. BG_n은 예전 어두운 룩 `?signal=dark`에서만
const BG_ALT_RECEIVERS = new Set(new URLSearchParams(location.search).get('signal') === 'dark' ? ['signal'] : []);
document.documentElement.style.setProperty('--bg-alt', `url('${BG_ALT}')`);
new Image().src = BG_ALT; // 처음 전환 때 디코딩하느라 페이드가 끊기지 않게 미리 받아 둔다

const params = new URLSearchParams(location.search);
// 캔버스 한 장 해상도 상한 (2026-11-12) — 전시 4K 모니터를 "2560×1440처럼 보기"로 쓰면 DPR 2라 캔버스가 5120×2880,
// 모니터 실제 픽셀보다 커서 보이지도 않는 픽셀을 그리느라 GPU가 버거웠다(대답 때 깜박임·하얀 배경 의심). 기본 3840×2160.
// `?dpr_budget=0`이면 상한 없음(예전), 숫자면 그 픽셀 수. 노트북 화면은 이미 그 밑이라 안 바뀐다 — src/js/renderRes.js
setPixelBudget(params.has('dpr_budget') ? Number(params.get('dpr_budget')) : 3840 * 2160);
// 전시 진단 기록 — logs/diag-<날짜>.jsonl (src/dev/diag.js). `?diag=0`이면 끔. state는 매 기록에 붙는 지금 상황
const diag = startDiag({
    enabled: params.get('diag') !== '0',
    info: { budget: params.get('dpr_budget') ?? 'default', query: location.search },
    bgUrl: asset('imgs/BG_d.jpg'),
    state: () => ({ receiver: rm?.name, talking: _talking ?? null }),
});
window.diag = diag; // 콘솔: diag.dump()
// 대화 기록 — 한 턴 = logs/chat-<날짜>.jsonl 한 줄 (src/dev/chatlog.js). 문장·receiver·설정·문장 시드. `?chatlog=0`이면 끔
const chatlog = startChatLog({ enabled: params.get('chatlog') !== '0' });
window.chatlog = chatlog; // 콘솔: chatlog.dump()
if (params.get('chatlog') === '0') document.documentElement.classList.add('no-chatlog'); // 기록을 끄면 고지(#record-note)도 내린다
// 문장 시드(src/js/seed.js) — 새 문장마다 새로 뽑아 기록에 남긴다. `?seed=N`이면 모든 문장이 그 시드(기록 다시 그려 보기)
const SEED_PIN = params.has('seed') ? Number(params.get('seed')) : null;
const newSeed = () => nextSeed(SEED_PIN);
newSeed();
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
// 줄이 늘 때 말풍선이 자라는 동안 글자를 목표 높이로 자를지 — mycelium만. 줄이 바뀌면 누적 버퍼를
// 거의 한 번에 위로 밀어서(scrollTo maxLag) 자라는 말풍선으로 자르면 윗줄이 잘린다. 나머지는 글자가
// 부드럽게 올라가므로 끈다(켜면 dandelion 글자가 말풍선 윗변 밖으로 비쳤다, 2026-11-09)
function syncClipAhead() {
    bubble.setClipAhead(rm.name === 'mycelium');
}
// 지난 수신자 말풍선 조각 — 관람객이 치기 시작하면 말풍선이 꼬리를 접고 위로 올라가 밑단만 남는다(peek.js)
const peek = mountPeek({
    root: document.getElementById('peek'),
    mover: document.getElementById('peek-move'),
    svg: document.getElementById('peek-bubble'),
    box: document.getElementById('peek-box'),
    ghost: document.getElementById('peek-ghost'),
    source: document.getElementById('glyph-window'),
    type: bubble.type,
    glass: CHROME ? asset('imgs/BG_d.jpg') : null,
    glassAlt: CHROME ? BG_ALT : null,
});
window.peek = peek;
// 보낸 관람객 문장 — 제출하면 바로 지우는 대신 위로 살짝 밀려 올라가며 흐려진다(sent.js)
const sent = mountSent({
    glyphLayer: document.getElementById('sent-glyphs'),
    tagLayer: document.getElementById('sent-tags'),
    source: document.getElementById('glyph-window'),
    tags: document.getElementById('syl-tags'),
});
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
        peek.setType(n);
    },
    { capture: true },
);
const RECEIVER = params.get('receiver') ?? 'mycelium';
// ?receiver= 를 직접 적으면 그 receiver로 고정 — 브릿지 {t:'receiver'}(TD 다이얼, 접속 시 동기화)를
// 무시한다. 안 적으면 TD 다이얼을 따라간다. 브라우저와 TD 화면을 따로 띄워 비교할 때 쓴다.
const RECEIVER_PINNED = params.has('receiver');
// mycelium 광학 자간·행간(core.layoutFor, 2026-11-09) — 글자 끝 기준으로 놓는다. ?optical=0 이면 예전 고정 간격(비교용)
const OPTICAL = params.get('optical') !== '0';
// 수신자 응답(LLM)을 누가 만드나. ?llm=web|td|off
//   td  — TD /chat/llm 이 만들어 브릿지 {t:'text', speaker:'receiver'}로 흘려보낸다 (TD 임베드 기본)
//   web — 이 페이지가 직접 로컬 Ollama를 부른다(src/dev/llm.js). TD 없이 완결 (브라우저 기본)
//   lorem — 무엇을 입력하든 정해진 분량의 한글 로렘 입숨(llm.js loremKo). Ollama 없는 시연용(gh-pages, demo.html)
//   off — 응답 없음
// 페이지 둘(TD 임베드 + 브라우저)이 같은 허브에 붙어도 한 번의 제출에 LLM이 한 번만 돌도록
// turn/done 에 이 값을 실어 보낸다 — TD bridge_ext 는 llm==='td' 인 턴에만 응답한다.
const LLM_MODE = ['web', 'td', 'lorem', 'off'].includes(params.get('llm')) ? params.get('llm') : CHROME ? 'web' : 'td';

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
SOUND_FX.on = params.get('soundfx') !== '0'; // 전자음 층 끄기(A/B) — core.TIMBRE 주석
if (params.get('myc')) SOUND_FX.variant.mycelium = params.get('myc'); // mycelium 소리 변형 bell(예전) | pulse | crackle — 기본은 둘을 섞은 것
if (params.get('dand')) SOUND_FX.variant.dandelion = params.get('dand'); // dandelion 소리 변형 wind(2026-11-10 판 — 비드 읽기 포함). 기본은 그 전 소리
// dandelion 비드 읽기 소리 — wind 판에서만. 0 끄기 / soft 첫 판. 꺼져 있으면 dandelion도 입력 순간 소리를 낸다(soundByBead 가드)
SOUND_FX.read = SOUND_FX.variant.dandelion !== 'wind' || params.get('read') === '0' ? false : params.get('read') === 'soft' ? 'soft' : true;
if (params.get('sora')) SOUND_FX.variant.sora = params.get('sora'); // sora 소리 변형 shell(예전)
const sound = createSound({ enabled: params.get('sound') !== '0' });
rm.onSyllableStart = (syl, name) => sound.play(voiceFor(syl, name), syl);
rm.onBeadStep = (step, name) => sound.playAux(beadStepVoice(step, name)); // dandelion 비드 읽기 소리
for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, sound.unlock, { capture: true });
sound.unlock(); // TD(CEF)가 autoplay를 허용하면 여기서 바로 풀린다
window.sound = sound; // 콘솔 디버깅용
window.TIMBRE = TIMBRE; // 콘솔 튜닝용 — 예: TIMBRE.sora.tau = 1.2 하고 치면 바로 들린다(새로고침하면 원래 값)
await rm.setReceiver(RECEIVER, { transparentOutput: true });
syncBackground({ instant: true });
syncClipAhead();
window.rm = rm; // 콘솔 디버깅용

// ── TD 브릿지 ────────────────────────────────────────────────────────────────
const bridge = createBridge();
window.bridge = bridge;
const emit = msg => bridge.send(msg);
emit({ t: 'receiver', name: rm.name, from: 'output' });

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
    guide: document.getElementById('latin-guide'),
});

// 누가 말하는 중인지 — 토스트(chat)와 LED(speakers)에 같이 알린다. null = 아무도
let _talking = null;
function setTalking(speaker) {
    // iPad 다이얼의 파란 LED가 수신자 LED를 따라간다 — 바뀔 때만 알린다(키 입력마다 불리므로)
    if (speaker !== _talking) {
        emit({ t: 'talking', speaker });
        diag.note('talking', { from: _talking, to: speaker }); // 깜박임이 대답 때 몰린다 — 기록에서 맞춰 보려고
    }
    _talking = speaker;
    chat.setTalking(speaker, rm.name);
    speakers.setTalking(speaker);
    syncBubble();
}

// 말풍선 = 수신자 차례. LLM이 대답을 만들기 시작하면(onAsk) 아래에서 떠오르고, 제출 뒤 남겨 둔
// 문장(_held)이 있는 동안 남아 있다가, 관람객이 치기 시작하면(_held 해제 + 화자 전환) 사라진다
function syncBubble() {
    const on = _talking === 'receiver' || (_held && _heldItems.length > 0);
    if (on) peek.dismiss(); // 새 말풍선이 떠오르면 지난 조각은 위로 밀려 사라진다
    bubble.setVisible(on);
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
if (params.get('lorem_len')) llmOpts.loremMin = llmOpts.loremMax = Number(params.get('lorem_len')); // 고정 길이
const llm =
    LLM_MODE === 'web' || LLM_MODE === 'lorem'
        ? createLLM({
              ...llmOpts,
              lorem: LLM_MODE === 'lorem',
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

// 안내 알약(#notice) — 영문 안내(#latin-guide)와 같은 자리·모양으로 한 번에 하나씩(2026-11-10). 뒤에 온 것이 덮는다.
// 영문 입력 중엔 안 띄운다(같은 자리에 영문 안내가 있고, 거기 Enter/Send 안내도 들어 있다)
//   knob      행간 노브를 돌렸는데 줄이 하나뿐(또는 빈 화면) — 바뀌는 게 안 보인다
//   send      관람객이 치다 SEND_HINT_MS 동안 멈춤 — 다 썼으면 보내라고
//   question  물음표를 쳤는데 질문 토글이 꺼져 있음
const NOTICES = {
    knob: {
        ko: '행간은 글자가 두 줄 이상일 때 바뀌어요',
        en: 'Line spacing changes once there are two or more lines',
        ms: 1800,
    },
    // {send}/{question} = 실물 패널 아이콘(caption.js fillRich)
    send: { ko: '다 썼다면 Enter나 {send} 버튼을 눌러 보내 주세요', en: 'Done? Press Enter or {send}', ms: 0 }, // 0 = 다시 칠 때까지
    question: {
        ko: '질문이라면 {question} 스위치를 켜 보세요',
        en: 'Asking a question? Turn on {question}',
        ms: 6000,
    },
};
const SEND_HINT_MS = 8000; // 관람객이 마지막으로 친 뒤 이만큼 지나면 send 안내
const notice = document.getElementById('notice');
let _notice = null; // 지금 떠 있는 안내 키
let _noticeTimer = 0;
function showNotice(key) {
    if (_latin) return;
    const n = NOTICES[key];
    fillRich(notice.querySelector('.ko'), n.ko);
    fillRich(notice.querySelector('.en'), n.en);
    notice.hidden = false;
    _notice = key;
    clearTimeout(_noticeTimer);
    _noticeTimer = n.ms ? setTimeout(() => hideNotice(key), n.ms) : 0;
}
// key를 주면 그 안내가 떠 있을 때만 닫는다
function hideNotice(key = null) {
    if (key && _notice !== key) return;
    clearTimeout(_noticeTimer);
    notice.hidden = true;
    _notice = null;
}
let _lineCount = 0; // reLayout이 센 지금 화면의 줄 수
// 손으로 돌렸다고 볼 최소 이동. 패널 펌웨어는 0.01만 넘으면 보내서, 가만둔 포텐셔미터의 잡음(±0.01 남짓)도
// 줄로 온다 — 줄 하나하나를 '돌렸다'로 치면 아무도 안 만졌는데 안내가 계속 뜬다(2026-11-11).
// 그래서 마지막으로 안내를 판단한 자리(_knobNoteAt)에서 이만큼 벗어나야 돌린 것으로 친다. 잡음은 그 자리 근처를 맴돌 뿐이다
const KNOB_NOTICE_MIN = 0.1; // 슬라이더 전체의 10% — 확실히 돌렸을 때만(2026-11-11 0.04에서 올림)
const _knobNoteAt = {}; // id → 기준 슬라이더 값
function noteKnob(id, v) {
    const at = _knobNoteAt[id];
    if (at == null || Math.abs(v - at) < KNOB_NOTICE_MIN) {
        _knobNoteAt[id] ??= v;
        return;
    }
    _knobNoteAt[id] = v;
    // receiver가 행간 노브를 줄 간격이 아닌 데 쓰면(sora = 위아래 퍼짐, knobFields) 늘 보이니 안내하지 않는다
    if (id !== 'leading' || _lineCount > 1 || rm.current?.knobFields?.leading) return;
    showNotice('knob');
}

// 치다 멈춤 → 보내기 안내. 관람객 글자가 있을 때 칠 때마다 다시 센다
let _sendHintTimer = 0;
function armSendHint() {
    clearTimeout(_sendHintTimer);
    hideNotice('send');
    if (_speaker !== 'visitor' || !_allItems.length || _latin || _translating || _presetTimer) return;
    _sendHintTimer = setTimeout(() => {
        if (_speaker === 'visitor' && _allItems.length && !_latin) showNotice('send');
    }, SEND_HINT_MS);
}

// 물음표 → 질문 토글 안내. 새로 물음표가 생긴 순간에만(토글이 꺼져 있을 때).
// 물음표는 보통 마지막에 치고 바로 보내서, 제출로 입력이 비워질 땐 닫지 않는다(그러면 거의 안 보였다) —
// 물음표를 지웠을 때만 닫고, 나머지는 시간(NOTICES.question.ms)이나 토글이 닫는다
let _hadQuestion = false;
function checkQuestionMark() {
    const has = _speaker === 'visitor' && /[?？]/.test(_text);
    // 패널 프리셋 버튼(날씨·밥·안녕 …)이 흘리는 문장의 물음표엔 안 띄운다 — 관람객이 친 게 아니다 (2026-11-10)
    if (has && !_hadQuestion && !_presetPlaying && !window.__mode?.question) showNotice('question');
    if (!has && _text) hideNotice('question');
    _hadQuestion = has;
}

// 수신자 대답이 끝나고(제출 뒤 _held) 아무도 안 치면 IDLE_RESET_MS 뒤에 빈 화면(하고 싶은 말을 건네보세요)으로.
// 글자·말풍선을 IDLE_FADE_MS 동안 흐리게 한 뒤 clearAll. 관람객이 치거나 패널을 만지면 다시 센다
const IDLE_RESET_MS = 15000;
const IDLE_FADE_MS = 900;
let _idleResetTimer = 0;
function armIdleReset() {
    clearTimeout(_idleResetTimer);
    _idleResetTimer = 0;
    if (!_held) return;
    _idleResetTimer = setTimeout(idleReset, IDLE_RESET_MS);
}
async function idleReset() {
    _idleResetTimer = 0;
    if (!_held || _text) return;
    const layers = ['glyph-window', 'syl-tags'].map(id => document.getElementById(id));
    const fades = layers.map(el =>
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: IDLE_FADE_MS, easing: 'ease-in', fill: 'forwards' }),
    );
    bubble.setVisible(false);
    await Promise.all(fades.map(a => a.finished.catch(() => {})));
    // 그사이 관람객이 치기 시작했으면(setText가 _held를 풀었다) 비우지 않는다
    if (_held && !_text) clearAll();
    for (const a of fades) a.cancel();
}

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
    items = withQuestionMarks(items);
    const rect = glyphRect();
    // positions를 배치에 안 쓰는 receiver(sora=내부 랜덤, signal=_draw()가 직접 shelf)는
    // layoutFor(rect)만으론 영역이 안 좁혀진다 — 그쪽엔 rect를 직접 건넨다.
    rm.current?.setRect?.(rect);
    const line = isTape();
    const stack = isStack();
    if (line || stack) rm.current.setScrollAxis?.(stack ? 'y' : 'x');
    let { positions, sylItems, widths, heights, sylSize, glyphScale, scrollX, scrollY, lines, lineH, extent, top } =
        layoutFor(rm, items, window.innerWidth, window.innerHeight, 0, rect, { line, stack, optical: OPTICAL });
    // 관람객 음절 네모가 붙을 자리 — 스크롤을 빼기 전 테이프 좌표를 들고 있다가 매 프레임
    // 그때의 scrollBase를 빼서 화면 위치로 바꾼다(테이프가 흐르는 동안 네모도 같이 흐르게)
    // 물음표 자리(mark)도 네모에는 들어간다. ri = receiver에 보낸 음절 번호(dandelion sylDrop용 — 물음표는 없음)
    let ri = 0;
    const tagItems = sylItems.map(it => (it.mark ? it : { ...it, ri: ri++ }));
    _tagLayout = { positions, sylSize, heights, axis: line ? 'x' : stack ? 'y' : null, items: tagItems };
    addPendingTag(items, rect, { line, stack, optical: OPTICAL });
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
    // 줄 수 — 행간 노브 안내(noteKnob)용. 배치 순서대로 x가 줄어드는 곳이 줄바꿈(signal은 음절마다 y가 달라 y로는 못 센다)
    _lineCount = positions.length ? 1 + positions.filter((p, i) => i && p[0] < positions[i - 1][0]).length : 0;
    if (_lineCount > 1) hideNotice('knob');
    fitBubble(stack ? { rect, lines, lineH, extent, top } : null);
    document.documentElement.classList.toggle('glyph-stack', stack); // 위쪽 페이드 mask (output.html)
    // 물음표 자리는 receiver에 안 보낸다 — 글자 그림 없이 네모만(배치에선 한 음절 자리를 차지한다)
    if (sylItems.some(it => it.mark)) {
        const keep = sylItems.map(it => !it.mark);
        const pick = a => a && a.filter((_, i) => keep[i]);
        sylItems = pick(sylItems);
        positions = pick(positions);
        widths = pick(widths);
        heights = pick(heights);
    }
    _sylItems = sylItems;
    _positions = positions;
    if (sylItems.length > 0) {
        dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights, glyphScale);
    }
}

// 조합 중인 낱자(초성만 친 'ㅇ' 등) — decomposeSyllables가 버려서 글자는 안 그리지만, 음절 네모만은
// 다른 한글 입력처럼 초성부터 다음 음절 자리에 먼저 띄운다(2026-11-05). 자리는 가짜 음절 하나를 붙여
// 다시 배치해서 그 마지막 자리를 쓴다. 글자 그림은 여기에 맞추지 않는다 — receiver엔 안 보낸다
// 가짜 음절 = 친 초성(겹자음 등 초성이 못 되는 낱자면 ㅇ) + 크기가 가운데인 모음. signal은 중성 F1·양성으로
// 음절 크기가 0.75~1.5배 갈리는데(calcSignalLatticeSize) ㅣ가 딱 1배라, 완성될 때 박스가 덜 움직인다.
// 모음만 친 경우엔 그 모음을 그대로 쓴다(ㅇ + 그 모음)
// 물음표 — 관람객이 친 '?'도 음절 네모로 보여 준다(2026-11-10). 글자 그림은 없고(receiver엔 안 보낸다) 배치에서만
// 한 음절 자리를 차지한다. 가짜 음절은 조합 중 낱자와 같은 ㅇ+ㅣ(크기가 가운데). decomposeSyllables가 버리는
// 물음표를 원문(_text)에서 다시 찾아 그 자리에 끼운다. 수신자 문장·page 모드는 안 한다(네모가 구조 블록·페이지 단위)
const QUESTION_RE = /[?？]/;
function withQuestionMarks(items) {
    if (_speaker !== 'visitor' || _held || isPaged() || !QUESTION_RE.test(_text)) return items;
    const out = [];
    let wordId = 0;
    let k = 0; // items(진짜 음절·띄어쓰기) 중 다음 것
    for (const ch of _text) {
        if (QUESTION_RE.test(ch)) {
            out.push({ cho: PENDING_CHO, jung: PENDING_JUNG, jong: null, wordId, isSpace: false, mark: true, ch: '?' });
            continue;
        }
        const code = ch.charCodeAt(0);
        if (ch !== ' ' && !(code >= 0xac00 && code <= 0xd7a3)) continue; // decomposeSyllables가 버리는 글자
        const it = items[k++];
        if (!it) break;
        out.push(it);
        if (ch === ' ') wordId++;
    }
    // 원문과 items가 어긋나면(page 등) 손대지 않는다
    return k === items.length ? out : items;
}

const PENDING_JAMO_RE = /[\u3131-\u318e]$/;
const PENDING_CHO = 'ㅇ';
const PENDING_JUNG = 'ㅣ';
function pendingSyl(ch) {
    if (JUNG.includes(ch)) return { cho: PENDING_CHO, jung: ch, jong: null, isSpace: false };
    return { cho: CHO.includes(ch) ? ch : PENDING_CHO, jung: PENDING_JUNG, jong: null, isSpace: false };
}
function addPendingTag(items, rect, opts) {
    if (_speaker !== 'visitor' || _latin || !PENDING_JAMO_RE.test(_text)) return;
    const ch = _text.slice(-1);
    const wordId = (_text.match(/ /g) ?? []).length;
    const ph = { ...pendingSyl(ch), wordId };
    // page 모드에서 지금 페이지가 꽉 찼으면 그 음절은 다음 페이지 첫 자리로 간다
    const full = isPaged() && items.filter(it => !it.isSpace).length >= PAGE_SIZE;
    const out = layoutFor(rm, full ? [ph] : [...items, ph], window.innerWidth, window.innerHeight, 0, rect, opts);
    const pos = out.positions.at(-1);
    if (!pos) return;
    const t = _tagLayout;
    _tagLayout = {
        ...t,
        positions: [...t.positions, pos],
        heights: t.heights && [...t.heights, out.heights?.at(-1) ?? 0],
        items: [...t.items, { ...ph, ch, pending: true }],
    };
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
    // 대화 기록에 남길 것도 지금 — 아래에서 화면을 비우면 시드·노브가 다음 문장 것으로 바뀐다
    const logRow = {
        receiver: rm.name,
        speaker,
        seed: turnSeed(),
        via: speaker === 'receiver' ? 'llm' : (_turnVia?.via ?? 'typed'), // typed / preset(패널 버튼) / translated(영문 입력)
        ...(speaker === 'visitor' && _turnVia?.preset ? { preset: _turnVia.preset } : {}),
        ...(speaker === 'visitor' && _turnVia?.original ? { original: _turnVia.original } : {}),
        ...(speaker === 'receiver' ? { llm: LLM_MODE, ...(LLM_MODE === 'web' ? { model: llm?.config?.model ?? null } : {}) } : {}),
        modes: { joke: !!window.__mode?.joke, question: !!window.__mode?.question, bye: !!window.__mode?.bye },
        glyphmode: _glyphMode,
        knobs: knobSnapshot(receiver),
        view: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
        ...(location.search ? { query: location.search } : {}),
    };

    emit({ t: 'turn', phase: 'baking', speaker });

    let dataUrl = null;
    if (canSubmit(receiver)) {
        await receiver.flushQueue();
        dataUrl = receiver.captureFrame();
        // 관람객 문장은 떠서 위로 올려 보낸 뒤에 지운다(disperse 모드는 자기 흩어짐이 있으니 그대로)
        if (!hold && _glyphMode !== 'disperse') await sent.send();
        if (!hold) clearGlyphs();
    }
    if (!hold) rebaseKnobs(); // 관람객 문장이 비워졌다 — 다음 문장은 슬라이더 지금 자리 = 기본값

    chat.addTurn(speaker, turnItems);
    if (!hold) reLayout([]);
    _held = hold;
    _heldItems = hold ? turnItems : [];
    if (hold) peek.takeSnap(); // 관람객이 치기 시작하면 이 글자가 위로 올라간 조각 안에 흐리게 남는다

    // speaker/text/llm 은 TD의 LLM이 쓴다 — 관람객 차례가 끝났을 때만 응답을 만들고,
    // 자기가 흘려보낸 수신자 차례에는 반응하지 않아야 하기 때문(안 그러면 무한루프).
    const text = turnItems.map(it => (it.isSpace ? ' ' : composeChar(it))).join('');
    // hint = 프리셋이 붙인 상황 설명(예: 안녕 hi/bye). TD LLM도 쓸 수 있게 같이 싣는다.
    const hint = speaker === 'visitor' ? _presetHint : null;
    emit({ t: 'turn', phase: 'done', speaker, text, llm: LLM_MODE, hint, png: dataUrl, h: 0 });
    chatlog.add({ ...logRow, text, ...(hint ? { hint } : {}) });
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
    playPreset(ko, null, { via: 'translated', original: src }); // 번역 문장도 프리셋처럼 — 물음표 안내 없음
}

// 관람객이 누른 보내기(Enter·패널 send) — 수신자가 말하는 중이면 무시한다 (2026-11-14).
// 대답이 드러나는 도중에 누르면 덜 나온 대답이 제출돼 글자 영역이 비워지고, 남은 글자가 빈 화면에 이어 찍혔다
// (11-14 대화 기록에 '햇볕' → '햇볕 때문에 …'처럼 같은 대답이 두 번 — 이틀 23번. 글자만 깜박이던 것의 한 원인).
// 수신자 차례는 llm onDone이 직접 doSubmit한다. bridge 'submit'(TD 시절)은 그대로 doSubmit
function visitorSubmit() {
    if (_speaker === 'receiver') {
        diag.note('submit-during-reply');
        return;
    }
    doSubmit();
}

async function doSubmit() {
    if (_latin) return submitForeign();
    if (!_allItems.length) return;
    const turn = await handleSubmit();
    _presetHint = null;
    _turnVia = null;
    resetInput();
    if (turn?.speaker === 'receiver') armIdleReset(); // 대답이 끝났다 — 아무도 안 치면 빈 화면으로
    // 웹 네이티브 LLM — 관람객 차례가 끝났을 때만(자기 응답에 또 응답하면 무한루프)
    if (llm && turn?.speaker === 'visitor') llm.ask(turn.text, turn.hint);
}

function resetInput() {
    setText('');
    setTalking(null);
}

// 화자가 바뀌면 진행 중이던 문장은 버린다 — 글자 영역엔 한 화자만 있어야 한다.
// keepInput = 키보드 입력이 부른 경우. 그땐 노란 바에 IME가 조합 중인 첫 음절이 들어 있어서
// input.value를 건드리면 조합이 깨져 첫 음절이 사라진다(수신자 문장 뒤 '안녕' → '녕'). 바는 이어지는 setText가 맞춘다.
function setSpeaker(speaker, { keepInput = false } = {}) {
    // 남겨 둔 수신자 문장에 관람객이 답하기 시작 — 말풍선은 사라지지 않고 위로 올라가 조각으로 남는다(peek.js).
    // 글자를 비우기 전에 넘긴다(조각 안의 글자는 제출 때 떠 둔 것)
    if (speaker === 'visitor' && _held && bubble.visible) {
        const box = document.getElementById('bubble-box');
        const ts = parseFloat(getComputedStyle(box).getPropertyValue('--tail-scale'));
        peek.handoff(box.getBoundingClientRect(), Number.isFinite(ts) ? ts : 1);
        bubble.setVisible(false, { instant: true });
    }
    if (speaker !== _speaker) {
        _speaker = speaker;
        clearGlyphs();
        rebaseKnobs(); // 화자가 바뀌어 새 문장 — 슬라이더 지금 자리 = 기본값
        _held = false;
        resetPager();
        _text = '';
        if (!keepInput) input.value = '';
        fitInput();
        _allItems = [];
        _prevSpaceCount = 0;
        _prevSylTotal = 0;
    }
    setTalking(speaker);
}

// ── 입력 ─────────────────────────────────────────────────────────────────────
const input = document.getElementById('user-input');
// 입력기가 조합 중인가 — switchReceiver가 조합 중일 때만 blur로 확정시킨다(아래 2026-11-14)
let _composing = false;
input.addEventListener('compositionstart', () => (_composing = true));
input.addEventListener('compositionend', () => (_composing = false));
input.focus();
document.body.addEventListener('click', () => input.focus()); // 포커스 유실 대비
// 포커스 지키기 (2026-11-13) — 전시 중 키가 안 먹어 크롬 창을 한 번 눌러야 하던 것.
// 페이지 안에서 입력칸이 포커스를 놓치면(아무 데도 안 잡힘 = body) 바로 되잡고, 다른 앱에서 크롬으로 돌아오면 되잡고,
// 그래도 입력칸 밖에서 키가 오면 그 키부터 입력칸으로 보낸다(keydown 중에 focus하면 그 글자가 새 자리로 들어간다).
// 다른 입력 요소(?gui=1 슬라이더 등)로 간 포커스는 안 뺏는다. 다른 앱이 앞에 나온 건 페이지가 못 되돌린다 — docs/exhibition-setup.md
const strayFocus = () => !document.activeElement || document.activeElement === document.body || document.activeElement === document.documentElement;
input.addEventListener('blur', () => setTimeout(() => strayFocus() && input.focus(), 0));
window.addEventListener('focus', () => strayFocus() && input.focus());
document.addEventListener(
    'keydown',
    e => {
        if (e.target === input || !strayFocus() || e.metaKey || e.ctrlKey || e.altKey) return;
        input.focus();
        diag.note('refocus', { key: e.key });
    },
    true,
);

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
        newSeed(); // 화자는 그대로인데 새 문장(수신자 문장이 연달아 옴) — rebaseKnobs를 안 거친다
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
    // soundByBead(dandelion) — 소리는 비드 읽기가 맡는다. `?read=0`이면 예전 입력 소리로
    if (added && !rm.current?.emitsSyllableStart && !(rm.current?.soundByBead && SOUND_FX.read !== false)) rm.onSyllableStart?.(added, rm.name);
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
    armSendHint(); // 치다 멈추면 보내기 안내
    checkQuestionMark(); // 물음표 → 질문 토글 안내
    armIdleReset(); // 관람객이 치기 시작했으면(_held 풀림) 빈 화면 되돌리기는 취소
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
// dandelion — 그 음절 실선(메인 경로)의 가장 아래 점에서 이만큼(px) 더 아래에 네모 윗변 (2026-10-17, receiver.sylDrop)
const TAG_DROP_GAP = 24;
// signal — 음절마다 크기가 다르다(calcShelfLayout heights). 기본 크기(sylSize)까지는 예전 그대로(TAG_Y)이고,
// 그보다 큰 음절은 넘친 높이 × SIGNAL_TAG_GROW 만큼 네모를 더 내린다 (0.5 = 글자 아래끝과 같이 내려감)
const SIGNAL_TAG_GROW = 0.8;
const SORA_TAG_Y = 1.05; // sora 단어 네모 — 원 중심에서 반경의 이 배만큼 아래(원 바깥 테두리 바로 밑)
const tagChar = it => it.ch ?? composeChar(it); // 조합 중인 낱자(addPendingTag)는 ch를 그대로
function sylTags() {
    if (!rm.current?.rebaking) _shownTags = _tagLayout;
    const { positions, sylSize, heights, axis, items } = _shownTags;
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
        // 새 단어를 초성만 쳤으면(addPendingTag) 그 단어엔 아직 원이 없다 — 원이 뜰 자리에 네모만 먼저(2026-11-15)
        const pend = items.at(-1);
        if (pend?.pending && !anchors.some(a => a.wordId === pend.wordId) && rm.current.pendingAnchor)
            anchors.push(rm.current.pendingAnchor(pend.wordId));
        return anchors.map(a => {
            const syls = items.filter(it => it.wordId === a.wordId);
            return {
                ...(receiver
                    ? { types: syls.map(it => getPatternType(it.jung, it.jong)) }
                    : { ch: syls.map(tagChar).join('') }),
                x: a.x,
                y: a.y + a.r * SORA_TAG_Y,
            };
        });
    }
    const sylDrop = rm.current?.sylDrop?.bind(rm.current);
    const signal = rm.name === 'signal';
    let prevBelow = null;
    return items.map((it, i) => {
        const drop = it.mark || it.pending ? null : sylDrop?.(it.ri ?? i);
        let below =
            drop != null
                ? drop + TAG_DROP_GAP
                : signal
                  ? half * TAG_Y + Math.max(0, (heights?.[i] ?? 0) - sylSize) * SIGNAL_TAG_GROW
                  : half * TAG_Y;
        // 조합 중인 낱자는 아직 그려진 실선이 없다(dandelion sylDrop) — 같은 줄이면 앞 음절 네모 높이에 맞춘다
        if ((it.pending || it.mark) && drop == null && prevBelow != null && positions[i]?.[1] === positions[i - 1]?.[1])
            below = prevBelow;
        prevBelow = below;
        return {
            ...(receiver ? { type: getPatternType(it.jung, it.jong) } : { ch: tagChar(it) }),
            x: (positions[i]?.[0] ?? 0) * W - (axis === 'x' ? shift : 0),
            y: (positions[i]?.[1] ?? 0) * H + below - (axis === 'y' ? shift : 0),
        };
    });
}
// 관람객 글자 위끝(화면 px) — 지난 수신자 말풍선 조각(peek)이 이보다 위로 비켜 가게. 대략값:
// 음절 중심에서 반지름(mycelium glyphExtent × sylSize, signal 음절 높이/2, 그 외 sylSize/2) 위. sora는 단어 원 위끝
function glyphTop() {
    if (_speaker !== 'visitor' || !_allItems.length) return null;
    const anchors = rm.current?.wordAnchors?.();
    if (anchors) return anchors.length ? Math.min(...anchors.map(a => a.y - a.r)) : null;
    const { positions, sylSize, heights, axis } = _shownTags;
    if (!positions.length) return null;
    const shift = axis === 'y' ? (rm.current?.shownScrollBase ?? rm.current?.scrollBase ?? 0) : 0;
    const ext = rm.current?.glyphExtent;
    const H = window.innerHeight;
    let top = Infinity;
    positions.forEach(([, v], i) => {
        const half = heights?.[i] ? heights[i] / 2 : ext ? ext * sylSize : sylSize / 2;
        top = Math.min(top, v * H - shift - half);
    });
    return top;
}
(function followTape() {
    caption.tags(sylTags());
    peek.setFloor(glyphTop());
    requestAnimationFrame(followTape);
})();

// 키보드 직접 입력은 언제나 관람객이다 — 수신자 차례였다면 그 문장을 버리고 넘겨받는다.
input.addEventListener('input', () => {
    // 번역 중이었다면 버린다 — 관람객이 다시 쓰기 시작했다
    _foreignGen++;
    _translating = false;
    cancelPreset();
    llm?.cancel(); // 관람객이 끼어들면 드러나던 응답은 버린다
    // textarea라 붙여넣기로 줄바꿈이 들어올 수 있다 — 문장은 한 줄이다.
    const typed = input.value.replace(/\n/g, ' ');
    setSpeaker('visitor', { keepInput: true }); // 조합 중인 첫 음절을 지우지 않는다
    setText(typed);
});
// Enter — 한글 조합 중이면 조합이 끝난 뒤에 보낸다 (2026-11-13).
// 마지막 음절을 조합하는 도중 Enter를 누르면, 예전엔 그 자리에서 보내고 입력칸을 비웠는데 입력기가 그 뒤에
// 조합하던 음절을 빈 칸에 확정해 넣었다 → 다음 문장이 앞 문장 끝 음절로 시작('말해봐' 다음 '봐동릐야').
// 입력기에 따라 확정 뒤 Enter가 한 번 더 와서 같은 문장이 두 번 보내지기도 했다(11-13 대화 기록에 둘 다 수십 번).
// 그래서 조합 중 Enter는 표시만 해 두고 compositionend(확정 → input 이벤트로 _text 반영) 뒤에 한 번 보낸다.
// 확정 직후 따라오는 두 번째 Enter는 SUBMIT_DEDUP_MS 안이면 버린다
const SUBMIT_DEDUP_MS = 400;
const COMPOSE_ENTER_MS = 300; // 조합 중 Enter 표시가 유효한 시간 — 남아 있으면 다음 문장을 치다 음절이 확정될 때 보내진다
let _submitAfterCompose = 0; // 조합 중 Enter를 누른 시각(0 = 없음)
let _lastEnterSubmit = 0;
function submitFromEnter() {
    if (performance.now() - _lastEnterSubmit < SUBMIT_DEDUP_MS) return;
    _lastEnterSubmit = performance.now();
    visitorSubmit();
}
input.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.keyCode !== 13) return;
    e.preventDefault();
    if (e.isComposing || e.keyCode === 229) {
        _submitAfterCompose = performance.now();
        return;
    }
    submitFromEnter();
});
input.addEventListener('compositionend', () => {
    const pressed = _submitAfterCompose;
    _submitAfterCompose = 0;
    if (!pressed || performance.now() - pressed > COMPOSE_ENTER_MS) return;
    // 확정된 음절이 input 이벤트로 _text에 들어간 다음에 보낸다
    setTimeout(submitFromEnter, 0);
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
    rebaseKnobs();
    peek.dismiss({ instant: true });
    peek.forget();
    sent.clear();
    chat.clear();
    _speaker = 'visitor';
    reLayout([]);
    refreshCaption();
    armIdleReset(); // _held가 풀렸으니 취소
}

bridge.on('mode', m => {
    // joke / question 토글 — 아직 receiver 동작에 연결 안 됨. 상태만 보관/에코.
    window.__mode = { ...(window.__mode ?? {}), ...m };
});

// 다른 output 페이지가 알린 receiver(from:'output')는 따르지 않는다 (2026-11-13) — output 탭이 둘 이상 허브에 붙으면
// 서로의 "지금 receiver" 알림을 받아 바꾸고 또 알리며 1초에 10~20번씩 끝없이 바뀌었다(진단 기록). 그러면 WebGL 컨텍스트가 쌓여
// 끊기고(웹캠·글자 캔버스) 수십 초 멈췄다. 다이얼·가상 패널이 보낸 것(from 없음)만 따른다
bridge.on('receiver', m => {
    if (m.from === 'output') return;
    switchReceiver(m.name);
});
window.switchReceiver = switchReceiver; // 콘솔: switchReceiver('signal')
// 나중에 붙은 페이지(control.html 튜닝용 receiver 버튼)가 지금 receiver를 알 수 있게 — 누가 붙으면 다시 알린다
bridge.on('hello', m => {
    // output이 하나 더 붙었다 — 전시에선 한 장이어야 한다(두 탭이 소리·패널·턴테이블을 같이 다룬다)
    if (m.role === 'output') {
        console.warn('[bridge] 다른 output 페이지가 허브에 붙었다 — 전시 화면은 하나만 띄울 것');
        diag.note('another-output');
    }
    emit({ t: 'receiver', name: rm.name, from: 'output' });
    emit({ t: 'talking', speaker: _talking }); // 다이얼 LED
    emitKnobs(); // 가상 패널 숫자
});

// receiver 전환 — iPad 다이얼(브릿지)이 부른다. 화면은 바로 바꾸고, 턴테이블은 그 사물을 앞으로 돌린다
// (도착은 기다리지 않는다 — 판이 빠져 있거나 멈춰도 화면은 따라가야 하므로. 도착 로그는 serial onTurntable)
// 배경을 지금 receiver에 맞춘다 — 전환 땐 --bg-fade 동안 크로스페이드, 처음 띄울 땐 바로
function syncBackground({ instant = false } = {}) {
    const root = document.documentElement;
    const on = BG_ALT_RECEIVERS.has(rm.name);
    root.classList.toggle('bg-instant', instant);
    root.classList.toggle('bg-alt', on);
    bubble.setGlassAlt(on, { instant });
    peek.setGlassAlt(on, { instant });
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('bg-instant')));
}

async function switchReceiver(name) {
    if (RECEIVER_PINNED || !name || name === rm.name) return;
    const from = rm.name;
    diag.note('switch', { from, to: name });
    serial.turntable(name);
    try {
        await rm.setReceiver(name, { transparentOutput: true });
    } catch (err) {
        reportError('setReceiver', (err && err.message) || err, { from, to: name });
        return;
    }
    _held = false; // 새 receiver는 빈 캔버스로 시작한다
    // 하던 말은 앞 receiver에게 한 것 — 관람객이 치던 문장·영문 번역·드러나던 대답을 다 버리고 빈 입력으로(2026-11-10).
    // 예전엔 치던 문장이 새 receiver로 그대로 넘어가 다시 그려졌다. 입력기가 조합 중이면 blur로 먼저 확정시킨 뒤 비운다
    cancelPreset();
    llm?.cancel();
    _foreignGen++;
    _translating = false;
    resetPager();
    _speaker = 'visitor';
    // blur → focus는 조합 중일 때만 (2026-11-14). 입력칸에 포커스가 새로 들어갈 때마다 macOS가 파란 입력 소스 표시기를 띄우는데,
    // 전시 중 그 표시기가 키보드 입력을 가져가 크롬을 한 번 눌러야 풀렸다(포커스 기록상 크롬은 내내 맨 앞, 페이지엔 키가 안 옴).
    // 예전엔 다이얼을 돌릴 때마다(하루 100번) blur → focus를 했다
    if (_composing) {
        input.blur();
        resetInput();
        input.focus();
    } else {
        resetInput();
    }
    syncClipAhead();
    peek.dismiss({ instant: true }); // 지난 조각은 앞 receiver의 말이다
    peek.forget();
    sent.clear();
    speakers.setReceiver(rm.name);
    syncBackground();
    refreshCaption();
    // 패널 노브 값은 receiver가 바뀌어도 유지 — 새 receiver 기본값에 다시 곱한다
    for (const [id, st] of Object.entries(_knobs)) applyKnob(rm.current, resolveControl({ id }), st.v, st.a);
    rebaseKnobs(); // 새 문장 — 슬라이더 지금 자리 = 기본값 (가상 패널 숫자도 여기서 — receiver마다 범위가 다르다)
    emit({ t: 'receiver', name: rm.name, from: 'output' });
    reLayout(_allItems);
    armIdleReset(); // 새 receiver는 빈 화면 — 취소
}

// ── 컨트롤 패널 ──────────────────────────────────────────────────────────────
// 패널(가상 src/dev/control.html / 피지컬 → TD midiinCHOP)은 {t:'control', id|cc, value}만
// 보낸다. 무엇을 할지는 여기서만 정한다 — 표는 src/js/controls.js.
const PRESET_CHAR_MS = 380; // 프리셋 문장을 한 글자씩 흘리는 간격
const PRESET_SUBMIT_MS = 1600; // 다 흘린 뒤 마지막 음절이 자랄 시간을 주고 제출
const _knobs = {}; // id → { v: 슬라이더 0~1, a: 기준점 } (controls.js 상대 노브, receiver 전환 시 다시 적용)
// 새 문장이 시작될 때(글자 영역이 비는 순간) — 지금 슬라이더 자리를 기본값으로 다시 잡는다(controls.js rebaseKnob).
// 화면이 비어 있을 때라 값이 기본으로 돌아가도 튀어 보이지 않는다
function rebaseKnobs() {
    newSeed(); // 새 문장 = 새 문장 시드(seed.js) — 여기가 "새 문장이 시작될 때"가 모이는 자리라 같이 둔다
    let changed = false;
    for (const [id, st] of Object.entries(_knobs)) {
        if (st.a === st.v) continue;
        rebaseKnob(st);
        changed = applyKnob(rm.current, resolveControl({ id }), st.v, st.a) || changed;
    }
    if (changed) knobReLayout();
    emitKnobs();
}
// 노브 상태를 가상 패널(control.html)에 — 그쪽 숫자가 기준점·receiver 범위를 반영하게.
// { t:'knobs', receiver, knobs: { id: { v, a, range } } } — range = receiver.knobRange[id] ?? null(표 기본)
let _knobsEmit = 0;
function emitKnobs() {
    if (_knobsEmit) return;
    _knobsEmit = requestAnimationFrame(() => {
        _knobsEmit = 0;
        const knobs = {};
        for (const [id, st] of Object.entries(_knobs))
            knobs[id] = { v: st.v, a: st.a, range: rm.current?.knobRange?.[id] ?? null };
        emit({ t: 'knobs', receiver: rm.name, knobs, ranges: rm.current?.knobRange ?? {} });
    });
}
let _presetTimer = null;
let _presetPlaying = false; // playPreset이 글자를 흘리는 중 — 물음표 안내(checkQuestionMark) 끄기용
let _presetHint = null; // 이번 턴에 LLM에 덧붙일 상황 설명(controls.js hints) — 제출 때 한 번 쓰고 버린다
let _turnVia = null; // 이번 관람객 문장이 어디서 왔나 — { via:'preset', preset } / { via:'translated', original }. 대화 기록용, hint와 같이 버린다

function cancelPreset(keepHint = false) {
    clearTimeout(_presetTimer);
    _presetTimer = null;
    _presetPlaying = false;
    if (!keepHint) _presetHint = _turnVia = null; // 관람객이 끼어들어 직접 쓴 문장엔 안 붙는다
}

// 프리셋 버튼 = 관람객이 그 문장을 친 것과 같다. 한 번에 넣으면 제출 시 flushQueue가
// 성장 애니메이션을 전부 건너뛰므로(finishGrowing), 타이핑하듯 한 글자씩 흘린다.
function playPreset(text, hint = null, via = { via: 'preset' }) {
    cancelPreset();
    _presetHint = hint;
    _turnVia = via;
    llm?.cancel();
    setSpeaker('visitor');
    const chars = [...text];
    let i = 0;
    const step = () => {
        i++;
        _presetPlaying = true;
        setText(chars.slice(0, i).join(''));
        _presetPlaying = false;
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
    const padTop =
        (parseFloat(getComputedStyle(bubbleBox).getPropertyValue('--bubble-pad-top')) || 0) *
        (window.innerHeight / 100);
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
    if (_idleResetTimer) armIdleReset(); // 누가 패널을 만지고 있다 — 남겨 둔 대답을 더 보여 준다
    if (c.id === 'question' && v > 0.5) hideNotice('question');
    if (c.kind === 'knob') {
        const st = (_knobs[c.id] = moveKnob(_knobs[c.id], v));
        // 처음 들어온 값(패널이 연결되며 보내는 현재 상태)은 기준 자리만 잡는다 — 손댄 게 아니다
        noteKnob(c.id, v);
        if (applyKnob(rm.current, c, st.v, st.a)) knobReLayout();
        emitKnobs();
    } else if (c.id === 'paging') {
        setGlyphMode(v > 0.5 ? 'page' : 'step');
    } else if (c.kind === 'toggle') {
        window.__mode = { ...(window.__mode ?? {}), [c.id]: v > 0.5 };
        emit({ t: 'mode', joke: !!window.__mode.joke, question: !!window.__mode.question, bye: !!window.__mode.bye });
    } else if (v > 0.5) {
        if (c.text) playPreset(c.text, c.hints?.[window.__mode?.[c.flip] ? 1 : 0] ?? null, { via: 'preset', preset: c.id });
        else if (c.id === 'glyphmode')
            setGlyphMode(GLYPH_MODES[(GLYPH_MODES.indexOf(_glyphMode) + 1) % GLYPH_MODES.length]);
        else if (c.id === 'send') {
            cancelPreset(true); // 프리셋이 흐르는 중에 보내도 그 프리셋의 hint는 유지
            visitorSubmit();
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
// Alt+C — signal light 룩의 색 곡선 비교: RGB 곡선(signal_curve) ↔ CMYK 곡선(signal_curve_cmyk, PSD 룩). 시작값은 `?curve=`
window.addEventListener(
    'keydown',
    e => {
        if (!(e.altKey && e.code === 'KeyC')) return;
        e.preventDefault(); // macOS Alt+C = ç
        e.stopPropagation();
        console.log('[signal] curve →', setLightCurve(getLightCurve() === 'cmyk' ? 'rgb' : 'cmyk'));
    },
    { capture: true },
);
serial.turntable(rm.name); // 턴테이블이 호밍을 끝내면(homed) 이 자리로 간다

// 첫 화면 — 아직 아무도 말하지 않았으니 안내부터
syncIdle();

// ── 시연용 lil-gui 패널 (?gui=1, demo.html) — 가상 패널(control.html) 대신 화면 옆에 붙는다.
// 브릿지 허브 없이 같은 applyControl/switchReceiver를 직접 부른다
if (params.get('gui') === '1')
    import('./gui.js').then(({ mountGui }) =>
        mountGui({
            rm,
            llm,
            applyControl,
            switchReceiver,
            setGlyphMode,
            glyphModes: GLYPH_MODES,
            glyphMode: () => _glyphMode,
            input,
        }),
    );
