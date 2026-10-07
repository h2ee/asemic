// ── bridge.js ────────────────────────────────────────────────────────────────
// output.html(전시 디스플레이) ↔ TouchDesigner WebSocket 브릿지.
//
// TD 쪽: WebSocket DAT(server mode)를 ws://<host>:9980 로 열어둔다.
// 개발 중 TD 없이 테스트: `npm run bridge` (src/dev/bridge-server.mjs) 로 허브를 띄운다.
//
// 설계:
//  - TD/서버가 없어도 페이지는 정상 동작 (send는 큐잉, 백그라운드에서 재접속 시도만).
//  - 재접속: 지수 백오프(0.5s → 8s).
//  - 인터페이스는 BroadcastChannel 시절 syncChannel.js 와 호환되게 최소화: send / on / close.
//
// ── 메시지 스키마 ─────────────────────────────────────────────────────────────
// page → TD
//   { t:'hello',    role:'output'|'control' }               접속 시 자동(createBridge({role}))
//   { t:'compose',  text, sylCount }                        키 입력마다
//   { t:'syllable', char, cho:{jamo,x,y,z},                 마지막 완성 음절(→ analyzer)
//                   jung:{jamo,f1,f2,f3,yang,diph}, jong:{jamo,x,y,z}|null }
//   { t:'turn',     phase:'baking', speaker }               제출 시작
//   { t:'turn',     phase:'done', speaker, text,            bake 완료(→ 아카이브 / LLM 트리거)
//                   png:<dataURL>, h:<px> }
//        speaker:'visitor'|'receiver', text = 방금 끝난 문장의 원문.
//        TD의 LLM은 speaker==='visitor' 일 때만 응답을 만든다 — 자기가 흘려보낸
//        수신자 차례에 또 반응하면 무한루프가 된다.
//        llm:'td'|'web'|'off' (2026-09-27) = 이 페이지의 LLM_MODE. TD는 'td'(없으면 td)일 때만
//        응답한다 — 브라우저 페이지(?llm=web)는 자기가 Ollama를 부르므로(src/dev/llm.js).
//        hint:string|null (2026-10-01) = 프리셋이 붙인 상황 설명(controls.js hints, 예: 안녕 hi/bye).
//        LLM 시스템 프롬프트(페르소나) 뒤에 덧붙인다. 관람객이 직접 친 문장이면 null.
//   { t:'receiver', name }                                  활성 receiver(로드/전환)
//   { t:'mode',     joke, question, bye }                   패널 토글 상태(→ LLM 프롬프트용)
// TD → page
//   { t:'param',    size?, lineHeight?, letterSpacing? }    하드웨어 노브/슬라이더
//   { t:'text',     value, speaker?:'visitor'|'receiver' }  입력 텍스트 주입(원격 키보드 / LLM 응답)
//        speaker 생략 시 'visitor'(하위호환). 글자 영역엔 한 화자·한 문장만 뜨고
//        화자 표시가 글자엔 없으므로, 이 필드가 하단 토스트의 유일한 근거다.
//        화자가 바뀌면 페이지가 진행 중이던 문장을 버리고 처음부터 그린다.
//   { t:'submit' }                                          물리 send 버튼
//   { t:'clear' }                                           입력/화면 초기화
//   { t:'mode',     joke?, question? }                      토글
//   { t:'receiver', name }                                  receiver 전환
// panel → page   (가상 패널 control.html, 또는 TD가 MIDI를 그대로 전달)
//   { t:'control',  id|cc, value }                          원시 입력. 의미는 src/js/controls.js
//        TD 허브는 control 페이지가 보낸 이 메시지를 output 페이지로 릴레이해야 한다
//        (npm run bridge 는 이미 모든 메시지를 릴레이함).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 9980;

export function createBridge(opts = {}) {
    const url =
        opts.url ??
        new URLSearchParams(location.search).get('bridge') ??
        `ws://${location.hostname || 'localhost'}:${DEFAULT_PORT}`;

    const listeners = new Map(); // type -> Set<cb>   (특수 타입: '*' 전체, '_open', '_close')
    let ws = null;
    let queue = [];
    let reconnectT = null;
    let backoff = 500;
    let closed = false;

    function fire(type, ...args) {
        listeners.get(type)?.forEach(cb => {
            try {
                cb(...args);
            } catch (e) {
                console.error('[bridge] listener error', e);
            }
        });
    }

    function rawSend(m) {
        try {
            ws.send(JSON.stringify(m));
            return true;
        } catch {
            return false;
        }
    }

    function connect() {
        if (closed) return;
        try {
            ws = new WebSocket(url);
        } catch {
            scheduleReconnect();
            return;
        }
        ws.addEventListener('open', () => {
            backoff = 500;
            rawSend({ t: 'hello', role: opts.role ?? 'output' });
            const pending = queue;
            queue = [];
            for (const m of pending) if (!rawSend(m)) queue.push(m);
            fire('_open');
        });
        ws.addEventListener('message', ev => {
            let msg;
            try {
                msg = JSON.parse(ev.data);
            } catch {
                return;
            }
            if (msg && typeof msg.t === 'string') {
                fire(msg.t, msg);
                fire('*', msg);
            }
        });
        ws.addEventListener('close', () => {
            ws = null;
            fire('_close');
            scheduleReconnect();
        });
        ws.addEventListener('error', () => {
            try {
                ws.close();
            } catch {
                /* noop */
            }
        });
    }

    function scheduleReconnect() {
        if (closed || reconnectT) return;
        reconnectT = setTimeout(() => {
            reconnectT = null;
            connect();
        }, backoff);
        backoff = Math.min(Math.round(backoff * 1.7), 8000);
    }

    connect();

    return {
        // 메시지 전송 — 미접속이면 큐잉(상한 200, 오래된 것부터 버림)
        send(msg) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                if (rawSend(msg)) return;
            }
            queue.push(msg);
            if (queue.length > 200) queue.shift();
        },
        // on(type, cb) → 해제 함수 반환. type='*' 이면 모든 메시지.
        on(type, cb) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(cb);
            return () => listeners.get(type)?.delete(cb);
        },
        close() {
            closed = true;
            clearTimeout(reconnectT);
            reconnectT = null;
            try {
                ws?.close();
            } catch {
                /* noop */
            }
        },
        get connected() {
            return !!ws && ws.readyState === WebSocket.OPEN;
        },
        get url() {
            return url;
        },
    };
}
