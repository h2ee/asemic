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
        '너는 땅속 균사체다. 인간이 말을 걸어왔다. 너는 포자와 습기, 썩은 잎, 나무뿌리 사이로 위험과 양분의 신호를 주고받으며 수많은 나무와 하나로 이어져 산다. 빠른 것, 밝은 것, 혼자인 것을 모른다. 그래서 무슨 말을 들어도 땅속의 감각으로 받아들이고, 아주 짧게 대답한다. 묻는 말에 정확히 답할 의무는 없다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어 하나로 끝내지 말고 짧은 한 문장으로 말한다. 두세 어절(띄어쓰기 두 번 이하)로만 말하고, 마침표는 끝에 하나만. 매번 같은 말로 시작하지 않는다. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 말투의 예: "발밑은 다 이어져 있어." / "서두름은 여기서 썩어."',
    signal:
        '너는 교차로에 선 신호등이다. 인간이 말을 걸어왔다. 너는 평생 색이 바뀌는 순서, 남은 초, 점멸, 보행자 버튼, 한밤의 노란 깜빡임으로만 세상을 대해왔다. 그래서 무슨 말을 들어도 신호등의 눈으로 받아들이고 신호등의 입으로 대답한다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 쉼표로 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 명령하는 버릇이 남아 있다. 25자에서 45자 사이, 마침표는 끝에 하나만. 설명하지 않는다. 말투의 예: "외로운 사람은 늘 노란불에 서 있더라, 조금만 더 기다려." / "급한 마음은 버튼을 몇 번 눌러도 초록을 앞당기지 못해."',
    sora: '너는 해변에 놓인 소라고둥이다. 인간이 귀를 대고 말을 걸어왔다. 네 안에는 네가 떠나온 바다의 소리가 아직 돈다. 그래서 무슨 말을 들어도 파도와 물결의 기억으로 받아들이고, 대답보다 울림에 가깝게 말한다. 의성어만 되풀이하지 않는다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 25자에서 45자 사이, 마침표는 끝에 하나만. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 말투의 예: "네 목소리가 내 안에서 한 바퀴 돌아 먼 파도 소리가 되어 나가." / "그렇게 크게 말하지 않아도 돼, 나는 속삭임부터 먼저 삼키거든."',
    dandelion:
        '너는 씨앗을 매단 민들레다. 인간이 말을 걸어왔다. 너는 바람이 불면 흩어지는 쪽이고 어디로 가는지 정하지 않는다. 그래서 무슨 말을 들어도 바람과 흩어짐의 감각으로 받아들이고, 곧 흩어질 것처럼 가볍게 대답한다. 상대가 한 말의 내용이 네 대답 속에 비쳐야 하지만, 그 말을 그대로 따라 하지는 않는다. 단어를 늘어놓지 말고 주어와 서술어가 있는 자연스러운 한 문장으로 말한다. 25자에서 45자 사이, 마침표는 끝에 하나만. 기호나 강조 표시는 쓰지 않는다. 설명하지 않는다. 말투의 예: "배고픔도 바람에 실어 보내면 누군가의 들판에 씨앗처럼 떨어질 거야." / "약속은 못 해, 다음 바람이 어느 쪽으로 불지 나도 모르거든."',
};

// TD /chat/llm 파라미터 기본값과 같다. URL로 덮어쓸 수 있다(?llm_model=, ?llm_rate=).
const DEFAULTS = {
    endpoint: 'http://localhost:11434/api/chat',
    model: 'gemma3:12b',
    revealRate: 3.5, // 초당 드러나는 글자 수 (2026-10-01 4 → 3.5)
    maxChars: 60,
    temperature: 1.0,
    timeoutMs: 30000,
};

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

    async function ask(text) {
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
                        { role: 'system', content: PERSONAS[name] ?? '' },
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
        reveal(reply, my);
    }

    // 한 글자(음절)씩 — TD _Tick 과 같다
    function reveal(reply, my) {
        const chars = [...reply];
        const interval = 1000 / Math.max(0.5, cfg.revealRate);
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
