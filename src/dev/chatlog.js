// 대화 기록 (2026-11-13) — 관람객과 수신자(LLM)가 주고받은 문장을 한 턴 = JSON 한 줄로 남긴다.
// 문장만 남긴다(글자 그림 PNG·웹캠은 안 남김). 다시 그리는 데 필요한 것(receiver·문장 시드·노브·글자 모드·화면 크기)을 같이 적는다.
//
// 어디로: dev 서버(vite.config.js `/__chat`)가 logs/chat-<날짜>.jsonl 에 이어 쓴다(gitignore) — diag.js와 같은 길.
// 서버에 못 보내면(빌드본·gh-pages·서버가 잠깐 죽음) 쥐고 있다가 다음 턴 때 같이 다시 보내고,
// 그동안 localStorage 'asemic.chat'에도 최근 것만 남긴다. 콘솔: chatlog.dump()
// 끄기: output.html?chatlog=0
const LOCAL_KEY = 'asemic.chat';
const LOCAL_MAX = 500;
const PENDING_MAX = 2000;

export function startChatLog({ enabled = true } = {}) {
    const session = new Date().toISOString();
    let pending = [];
    let sending = false;
    let n = 0;

    function add(row) {
        if (!enabled) return;
        const full = { at: new Date().toISOString(), session, n: n++, ...row };
        pending.push(full);
        if (pending.length > PENDING_MAX) pending = pending.slice(-PENDING_MAX);
        keepLocal(full);
        flush();
    }

    async function flush() {
        if (sending || !pending.length) return;
        sending = true;
        const rows = pending;
        pending = [];
        let ok = false;
        try {
            const r = await fetch('/__chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-ndjson' },
                body: rows.map(r => JSON.stringify(r)).join('\n') + '\n',
                keepalive: true,
            });
            ok = r.ok;
        } catch {
            /* 서버 없음 — 아래에서 되돌려 둔다 */
        }
        if (!ok) pending = rows.concat(pending);
        sending = false;
    }

    function keepLocal(row) {
        try {
            const old = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
            localStorage.setItem(LOCAL_KEY, JSON.stringify(old.concat(row).slice(-LOCAL_MAX)));
        } catch {
            /* 사생활 모드 등 — 없어도 된다 */
        }
    }
    function dump() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        } catch {
            return [];
        }
    }

    return { add, dump, pending: () => pending.length };
}
