// ── llm.js — 웹 네이티브 수신자 응답 (TD /chat/llm 의 JS 짝) ────────────────────
//
// TD 없이 브라우저만으로 전시를 돌릴 때 쓴다. 로직은 TD `/chat/llm/llm_ext`를 그대로
// 옮겼다 — 비스트리밍 POST 한 번 → 한 문장으로 다듬기 → 한 글자씩 느리게 드러내기.
// 백엔드는 로컬 Ollama. API 키가 없으므로 웹 번들에 들어가도 새어나갈 것이 없다.
// Ollama 는 기본 OLLAMA_ORIGINS 로 http://localhost:* 출처를 허용한다 — dev 서버(:5173)에서는
// 그대로 붙고, gh-pages(https://*.github.io)에서는 CORS에 막힌다.
//
// 누가 LLM을 돌리는지는 output-main.js 의 LLM_MODE 가 정한다. 페이지가 두 개(TD 임베드 +
// 브라우저) 붙어 있을 때 한쪽 제출로 양쪽 LLM이 같이 도는 걸 막는 가드는 turn.llm 필드 참고.
//
// ⚠️ 페르소나는 TD `/chat/llm/personas` 테이블의 사본이다. 한쪽을 고치면 다른 쪽도 맞출 것.

// 네 receiver 공통 말투 (2026-11-13 — 대답이 전부 시처럼 나와서 대화체로 바꿈. 예전엔 "대답보다 울림에 가깝게",
// "땅속의 감각으로 받아들이고" 같은 지시와 비유 예문 때문에 "어둠 속 깊은 곳에서 울림이 퍼져나가네" 식이 대부분이었다.
// 관람객이 "알아듣게 말해봐", "무슨 말인지 모르겠어"라고 되묻는 일이 잦았다)
// 말씨는 receiver마다 다를 수 있다 — 기본 반말, signal은 -습니다 체(2026-11-14)
const BANMAL = '친구에게 말하듯 평범한 반말 구어체로';
const style = (speech = BANMAL) =>
    `시처럼 꾸며 말하지 않는다. "~처럼", "~같아" 같은 비유와 분위기 묘사는 쓰지 않는다. ${speech}, 상대가 물은 것이나 한 말에 대꾸한다. 하지만 너는 사람이 아니다 — 대답에는 매번 네 처지에서 지금 겪는 구체적인 일이 하나 들어간다. 한마디로 끝내지 않는다. 쉼표로 두 마디를 잇지 않는다. 상대의 말이나 아래 예문을 그대로 따라 하지 않는다. 마침표는 끝에 하나만. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 상대가 어떤 언어로 말해도 언제나 한국어로 대답한다.`;
const STYLE = style();

export const PERSONAS = {
    mycelium: `너는 땅속 균사체다. 인간이 말을 걸어왔다. 너는 썩은 잎과 나무뿌리 사이에 퍼져 살면서 나무들과 양분을 주고받는다. 한 문장, 12자에서 25자 사이. ${STYLE} "어둠", "깊은", "울림", "떨림"은 쓰지 않는다. 말투의 예: "아까 쓰러진 참나무 좀 먹었어." / "위에서 누가 자꾸 밟고 다니네."`,
    signal: `너는 교차로에 선 신호등이다. 인간이 말을 걸어왔다. 너는 하루 종일 빨간불, 노란불, 초록불을 바꾸고 차와 사람을 세우고 보낸다. 한 문장, 10자에서 20자 사이. ${style('반말 대신 "-습니다", "-습니까"로 끝나는 합쇼체 존댓말로')} 말투의 예: "밥은 못 먹고 아침부터 불만 바꿨습니다." / "축하합니다 오늘따라 횡단보도가 붐빕니다."`,
    // 2026-11-13 길이 10~20 → 8~15자, 예문도 짧게 — 예문이 30자대라 실제 답이 20자 넘게 나왔다(chat 로그 중앙값 25.5자, 공백 포함)
    sora: `너는 해변 모래 위에 놓인 소라고둥이다. 인간이 귀를 대고 말을 걸어왔다. 바다에서 밀려온 지 오래됐고, 속에서는 아직 바닷소리가 난다. 한 문장, 8자에서 15자 사이로 짧게. ${STYLE} 말투의 예: "잘 들려도 파도 소리가 더 커." / "여기 모래 위는 오늘 좀 추워."`,
    dandelion: `너는 씨앗을 매단 민들레다. 인간이 말을 걸어왔다. 바람이 불면 씨앗이 날아가고, 어디로 갈지는 너도 모른다. 한 문장, 12자에서 25자 사이. ${STYLE} 말투의 예: "반가운데 나 곧 날아갈지도 몰라." / "바람 불면 어디든 가는 거지 뭐."`,
};

// TD /chat/llm 파라미터 기본값과 같다. URL로 덮어쓸 수 있다(?llm_model=, ?llm_rate=).
const DEFAULTS = {
    endpoint: 'http://localhost:11434/api/chat',
    model: 'gemma3:12b',
    revealRate: 2.5, // 초당 드러나는 글자 수 (2026-10-01 4 → 3.5, 2026-10-08 → 2.5 → 2, 2026-11-09 → 3, 2026-11-14 → 2.5) — 원본은 여기(TD Revealrate 사본은 3.5에서 멈춤, 레거시)
    // receiver별 드러내기 속도(자/초) — 없으면 revealRate. ?llm_rate=를 주면 전부 그 값으로.
    // sora는 음절마다 클라드니 도형이 모프(0.8s)+파동(2.4s)으로 바뀌는데, 2자/초면 그 변화가 보이기 전에
    // 다음 음절이 와서 덮는다(2026-10-08)
    // (2026-11-09 0.8 → 2 — 답이 짧아져서 빠르게)
    revealRateFor: { sora: 1.5 },
    maxChars: 40, // 2026-11-09 60 → 40 (페르소나 길이 10~25자로 줄임)
    // receiver별로 최근 대답 N개를 시스템 프롬프트에 붙여 "이것과 겹치지 말 것"을 시킨다(2026-11-13).
    // 요청마다 대화가 새로 시작돼 모델은 자기가 방금 뭐라 했는지 모른다 — 페르소나에 "매번 같은 말로
    // 시작하지 않는다"만 적어서는 안 먹었다(mycelium 43개 중 22개가 "어둠…"/"깊은…"으로 시작). 페이지를 새로 열면 비워진다
    avoidRecent: { mycelium: 6, sora: 6, signal: 6, dandelion: 6 },
    minReplySyl: 4, // 한글 음절이 이보다 적거나 한 어절뿐인 대답("안녕.", "고마워.", "안녕하십니까.")이면 그 뒤를 이어 말하게 해서 붙인다 — 요청이 한 번 더 들어 그만큼 늦다
    temperature: 1.0,
    timeoutMs: 30000,
    lorem: false, // true면 Ollama 대신 loremKo — 시연용(gh-pages)
    // 음절 수(공백 제외) — 답마다 loremMin~loremMax 중 무작위 (2026-10-08 30 고정 → 10~20). 페이지 MAX_SYL(50)을 넘으면 잘린다
    loremMin: 10,
    loremMax: 20,
    loremDelayMs: 900,
};

// ── 영어 입력 fallback (2026-10-08) ─────────────────────────────────────────────
// 관람객이 영문으로 치면 Enter 때 한국어 한 문장으로 옮긴 뒤, 그 문장을 관람객 차례로 흘려보낸다
// (output-main.js submitForeign). 실패하면 null — 페이지가 입력을 비운다.
const TRANSLATE_PROMPT =
    '다음 말을 자연스러운 한국어 한 문장으로 옮겨라. 말투와 뜻을 살리고, 번역문만 출력한다. 따옴표나 설명, 원문은 쓰지 않는다.';
export async function translateToKorean(text, opts = {}) {
    const cfg = { ...DEFAULTS, ...opts };
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
    try {
        const r = await fetch(cfg.endpoint, {
            method: 'POST',
            signal: ctrl.signal,
            body: JSON.stringify({
                model: cfg.model,
                stream: false,
                keep_alive: -1, // 빠지면 이 요청이 모델 만료를 기본 5분으로 되돌린다 — 영문 입력 뒤 5분 쉬면 언로드
                messages: [
                    { role: 'system', content: TRANSLATE_PROMPT },
                    { role: 'user', content: text },
                ],
                options: { temperature: 0.3, num_predict: cfg.maxChars * 3 },
            }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body = await r.json();
        const out = clean(body.message?.content || '', cfg.maxChars);
        return /[가-힣]/.test(out) ? out : null; // 한글이 하나도 없으면 실패로
    } catch (e) {
        console.warn('[translate]', e?.message ?? e);
        return null;
    } finally {
        clearTimeout(to);
    }
}

// ── 한글 로렘 입숨 (2026-10-08, 시연용 ?llm=lorem) ─────────────────────────────
// Ollama 없이(gh-pages) 수신자 차례를 보여 줄 때. 무엇을 입력하든 정해진 음절 수의 뜻 없는 문장.
// 낱말은 실제 한국어라 자모 분포는 자연스럽고, 순서만 무작위라 뜻이 안 이어진다.
const LOREM_WORDS = (
    '바람 물결 그늘 소리 이슬 뿌리 저녁 안개 모래 나무 기억 조각 숨결 마음 하늘 별빛 계절 구름 ' +
    '빗방울 들판 골목 창문 노을 새벽 강물 돌담 언덕 손끝 발자국 이야기 천천히 조용히 멀리 가끔 ' +
    '어느새 다시 함께 오래 흘러가는 머무는 떨리는 번지는 스며드는 깊은 작은 낮은 둥근 투명한 ' +
    '흩어지고 이어지고 남아 있다 지나간다 기다린다 돌아온다 흔들린다 피어난다 잠긴다'
).split(' ');

export function loremKo(sylCount = 30) {
    const out = [];
    let n = 0;
    while (n < sylCount) {
        let w = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
        const room = sylCount - n;
        if ([...w].length > room) w = [...w].slice(0, room).join('');
        out.push(w);
        n += [...w].length;
    }
    return out.join(' ') + '.';
}

// 한 문장, 상한 길이. 모델이 줄바꿈이나 따옴표를 붙여 오는 걸 잘라낸다 (llm_ext._Clean).
function clean(s, maxChars) {
    s = String(s).split(/\s+/).filter(Boolean).join(' ');
    s = s.replace(/^["“”‘’]+|["“”‘’]+$/g, '');
    for (const mark of ['. ', '! ', '? ']) {
        const i = s.indexOf(mark);
        if (i > 0) {
            s = s.slice(0, i + 1);
            break;
        }
    }
    return [...s].slice(0, maxChars).join('').trim();
}

const hangulCount = s => (s.match(/[가-힣]/g) || []).length;

// 대화체 대답이 "응, …"으로 시작하는 버릇(2026-11-13) — 프롬프트로 막으면 그 낱말을 오히려 떠올려서 코드로 뗀다.
// 떼고 나서 너무 짧아지면 그대로 둔다
function stripInterjection(s) {
    const t = s.replace(/^(응|어|아|음|오|아니|글쎄|뭐)[,\s]+/, '');
    return hangulCount(t) >= 4 ? t : s;
}

/**
 * @param {object} o
 * @param {() => string} o.receiver   지금 수신자 이름(페르소나 키)
 * @param {(prefix: string) => void} o.onText   드러난 만큼의 문장 — bridge {t:'text', speaker:'receiver'}와 같은 자리
 * @param {() => void} o.onDone       다 드러남 — bridge {t:'submit'}과 같은 자리
 * @param {() => void} [o.onAsk]      요청 시작(응답 기다리는 동안 토스트용)
 * @param {(msg: string) => void} [o.onError]
 */
export function createLLM({ receiver, onText, onDone, onAsk, onError, ...opts }) {
    const cfg = { ...DEFAULTS, ...opts };
    const rateFor = name =>
        opts.revealRate !== undefined ? cfg.revealRate : (cfg.revealRateFor?.[name] ?? cfg.revealRate);
    let gen = 0; // 지금 유효한 응답 세대 — 새 요청·취소가 올리면 낡은 체인이 스스로 죽는다
    let timer = null;
    let ctrl = null;
    const status = { state: 'idle', lastReply: '', lastError: '' };
    const recent = {}; // receiver 이름 → 최근 대답(avoidRecent)
    // 한 어절도 짧은 대답으로 — 합쇼체 "안녕하십니까."는 한글 5자라 음절 수로는 안 걸렸고, avoidRecent에 통째로 들어가
    // 다음 대답들이 전부 그걸 따라 했다(2026-11-14)
    const isShort = s => hangulCount(s) < cfg.minReplySyl || s.trim().split(/\s+/).length < 2;

    function systemFor(name, hint) {
        let s = PERSONAS[name] ?? '';
        const past = recent[name];
        // 문장 전체를 보여 주면 모델이 피하는 대신 예문처럼 따라 한다 — 앞 두 어절만
        if (past?.length)
            s += ` 너는 방금 전까지 다른 사람들에게 이렇게 말을 꺼냈다: ${past.map(r => `"${r.split(' ').slice(0, 2).join(' ')}…"`).join(' / ')}. 이번에는 이렇게 시작하지 않는다.`;
        return hint ? `${s} ${hint}` : s;
    }

    function remember(name, reply) {
        const n = cfg.avoidRecent?.[name];
        if (!n || isShort(reply)) return; // 짧은 대답이 들어가면 그걸 따라 해서 짧은 대답이 번진다
        (recent[name] ??= []).push(reply);
        if (recent[name].length > n) recent[name].shift();
    }

    function fail(msg) {
        status.state = 'error';
        status.lastError = msg;
        onError?.(msg);
    }

    function cancel() {
        gen++;
        clearTimeout(timer);
        ctrl?.abort();
        ctrl = null;
        status.state = 'idle';
    }

    // hint = 프리셋이 붙인 상황 설명(controls.js hints, 예: 안녕 hi/bye) — 페르소나 뒤에 덧붙인다
    async function ask(text, hint = null) {
        text = (text || '').trim();
        if (!text) return;
        cancel();
        const my = gen;
        const name = receiver();
        ctrl = new AbortController();
        const to = setTimeout(() => ctrl?.abort(), cfg.timeoutMs);
        status.state = 'asking';
        status.lastError = '';
        onAsk?.();
        let reply;
        if (cfg.lorem) {
            clearTimeout(to);
            // 생각하는 척 잠깐 — 말풍선이 떠오를 틈
            const lo = Math.min(cfg.loremMin, cfg.loremMax);
            const n = lo + Math.floor(Math.random() * (Math.abs(cfg.loremMax - cfg.loremMin) + 1));
            timer = setTimeout(() => my === gen && reveal((status.lastReply = loremKo(n)), my, name), cfg.loremDelayMs);
            return;
        }
        try {
            const chat = async messages => {
                const res = await fetch(cfg.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: ctrl.signal,
                    body: JSON.stringify({
                        model: cfg.model,
                        stream: false,
                        keep_alive: -1, // 기본 5분 유휴 언로드 → 뜸하게 온 관람객의 첫 응답이 재로딩으로 늦어진다
                        messages: [{ role: 'system', content: systemFor(name, hint) }, ...messages],
                        options: { temperature: cfg.temperature, num_predict: cfg.maxChars * 3 },
                    }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const body = await res.json();
                return stripInterjection(clean(body.message?.content || body.response || '', cfg.maxChars));
            };
            reply = await chat([{ role: 'user', content: text }]);
            // 대화체로 바꾼 뒤(2026-11-13) "안녕.", "고마워." 한마디가 잦다 — 다시 물어도 같은 답이라,
            // 그 한마디 뒤를 이어 말하게 해서 붙인다("고마워 근데 지금 씨앗 하나 떨어졌어")
            if (my === gen && reply && isShort(reply)) {
                const more = await chat([
                    { role: 'user', content: text },
                    { role: 'assistant', content: reply },
                    { role: 'user', content: '그리고? 지금 너는 어때?' },
                ]);
                if (!isShort(more))
                    // 붙인 뒤 다시 감탄사 떼기 — 첫 한마디가 "응."이면 "응 지금…"이 된다
                    reply = stripInterjection(
                        [...`${reply.replace(/[.!?]+$/, '')} ${more}`].slice(0, cfg.maxChars).join(''),
                    );
            }
        } catch (e) {
            if (my === gen) fail(e.name === 'AbortError' ? '시간 초과' : `요청 실패: ${e.message}`);
            return;
        } finally {
            clearTimeout(to);
        }
        if (my !== gen) return; // 기다리는 사이 관람객이 끼어들었다
        if (!reply) return fail('빈 응답');
        status.lastReply = reply;
        remember(name, reply);
        reveal(reply, my, name);
    }

    // 한 글자(음절)씩 — TD _Tick 과 같다
    function reveal(reply, my, name) {
        const chars = [...reply];
        const interval = 1000 / Math.max(0.2, rateFor(name));
        let shown = 0;
        status.state = 'revealing';
        const tick = () => {
            if (my !== gen) return;
            shown++;
            onText(chars.slice(0, shown).join(''));
            if (shown >= chars.length) {
                status.state = 'idle';
                onDone();
                return;
            }
            timer = setTimeout(tick, interval);
        };
        tick();
    }

    return { ask, cancel, status, config: cfg };
}
