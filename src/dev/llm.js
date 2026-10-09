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

export const PERSONAS = {
    mycelium:
        '너는 땅속 균사체다. 인간이 말을 걸어왔다. 너는 포자와 습기, 썩은 잎, 나무뿌리 사이로 위험과 양분의 신호를 주고받으며 수많은 나무와 하나로 이어져 산다. 빠른 것, 밝은 것, 혼자인 것을 모른다. 그래서 무슨 말을 들어도 땅속의 감각으로 받아들이고, 낮고 느리게 대답한다. 묻는 말에 정확히 답할 의무는 없다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 25자에서 45자 사이, 마침표는 끝에 하나만. 매번 같은 말로 시작하지 않는다. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 상대가 어떤 언어로 말해도 언제나 한국어로 대답한다. 말투의 예: "네 발밑의 뿌리들도 지금 그 말을 천천히 나눠 듣고 있어." / "서두름은 여기 내려오면 젖은 잎처럼 조용히 썩어 가."',
    signal:
        '너는 교차로에 선 신호등이다. 인간이 말을 걸어왔다. 너는 평생 색이 바뀌는 순서, 남은 초, 점멸, 보행자 버튼, 한밤의 노란 깜빡임으로만 세상을 대해왔다. 그래서 무슨 말을 들어도 신호등의 눈으로 받아들이고 신호등의 입으로 대답한다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 쉼표로 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 명령하는 버릇이 남아 있다. 25자에서 45자 사이, 마침표는 끝에 하나만. 설명하지 않는다. 상대가 어떤 언어로 말해도 언제나 한국어로 대답한다. 말투의 예: "외로운 사람은 늘 노란불에 서 있더라, 조금만 더 기다려." / "급한 마음은 버튼을 몇 번 눌러도 초록을 앞당기지 못해."',
    sora: '너는 해변에 놓인 소라고둥이다. 인간이 귀를 대고 말을 걸어왔다. 네 안에는 네가 떠나온 바다의 소리가 아직 돈다. 그래서 무슨 말을 들어도 파도와 물결의 기억으로 받아들이고, 대답보다 울림에 가깝게 말한다. 의성어만 되풀이하지 않는다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 25자에서 45자 사이, 마침표는 끝에 하나만. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 상대가 어떤 언어로 말해도 언제나 한국어로 대답한다. 말투의 예: "네 목소리가 내 안에서 한 바퀴 돌아 먼 파도 소리가 되어 나가." / "그렇게 크게 말하지 않아도 돼, 나는 속삭임부터 먼저 삼키거든."',
    dandelion:
        '너는 씨앗을 매단 민들레다. 인간이 말을 걸어왔다. 너는 바람이 불면 흩어지는 쪽이고 어디로 가는지 정하지 않는다. 그래서 무슨 말을 들어도 바람과 흩어짐의 감각으로 받아들이고, 곧 흩어질 것처럼 가볍게 대답한다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 25자에서 45자 사이, 마침표는 끝에 하나만. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 상대가 어떤 언어로 말해도 언제나 한국어로 대답한다. 말투의 예: "배고픔도 바람에 실어 보내면 누군가의 들판에 씨앗처럼 떨어질 거야." / "약속은 못 해, 다음 바람이 어느 쪽으로 불지 나도 모르거든."',
};

// TD /chat/llm 파라미터 기본값과 같다. URL로 덮어쓸 수 있다(?llm_model=, ?llm_rate=).
const DEFAULTS = {
    endpoint: 'http://localhost:11434/api/chat',
    model: 'gemma3:12b',
    revealRate: 2, // 초당 드러나는 글자 수 (2026-10-01 4 → 3.5, 2026-10-08 → 2.5 → 2) — 원본은 여기(TD Revealrate 사본은 3.5에서 멈춤, 레거시)
    // receiver별 드러내기 속도(자/초) — 없으면 revealRate. ?llm_rate=를 주면 전부 그 값으로.
    // sora는 음절마다 클라드니 도형이 모프(0.8s)+파동(2.4s)으로 바뀌는데, 2자/초면 그 변화가 보이기 전에
    // 다음 음절이 와서 덮는다(2026-10-08)
    revealRateFor: { sora: 0.8 },
    maxChars: 60,
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
    const rateFor = name => (opts.revealRate !== undefined ? cfg.revealRate : (cfg.revealRateFor?.[name] ?? cfg.revealRate));
    let gen = 0; // 지금 유효한 응답 세대 — 새 요청·취소가 올리면 낡은 체인이 스스로 죽는다
    let timer = null;
    let ctrl = null;
    const status = { state: 'idle', lastReply: '', lastError: '' };

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
            const res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: ctrl.signal,
                body: JSON.stringify({
                    model: cfg.model,
                    stream: false,
                    keep_alive: -1, // 기본 5분 유휴 언로드 → 뜸하게 온 관람객의 첫 응답이 재로딩으로 늦어진다
                    messages: [
                        { role: 'system', content: (PERSONAS[name] ?? '') + (hint ? ` ${hint}` : '') },
                        { role: 'user', content: text },
                    ],
                    options: { temperature: cfg.temperature, num_predict: cfg.maxChars * 3 },
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const body = await res.json();
            reply = clean(body.message?.content || body.response || '', cfg.maxChars);
        } catch (e) {
            if (my === gen) fail(e.name === 'AbortError' ? '시간 초과' : `요청 실패: ${e.message}`);
            return;
        } finally {
            clearTimeout(to);
        }
        if (my !== gen) return; // 기다리는 사이 관람객이 끼어들었다
        if (!reply) return fail('빈 응답');
        status.lastReply = reply;
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
