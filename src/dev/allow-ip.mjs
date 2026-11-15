// ── allow-ip.mjs ─────────────────────────────────────────────────────────────
// LAN 으로 열었을 때 받을 상대 주소 목록 — dev 서버(vite.config.js)와 허브(bridge-server.mjs) 공용.
//
//   ALLOW_IP=192.168.0.23 npm run dev:lan
//   ALLOW_IP=192.168.0.23 npm run bridge:lan
//   (여러 대면 쉼표로: ALLOW_IP=192.168.0.23,192.168.0.40)
//
// 학교 와이파이처럼 남과 같이 쓰는 망에서 iPad 다이얼만 받으려고 (2026-11-09).
// 이 맥 자신(루프백)은 항상 받는다 — output.html 은 localhost 로 열기 때문.
// ALLOW_IP 가 없으면 예전처럼 전부 받는다.
// ─────────────────────────────────────────────────────────────────────────────

const LIST = (process.env.ALLOW_IP ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

export const allowList = LIST;

// '::ffff:192.168.0.23' 같은 IPv4-mapped 주소를 벗긴다
const norm = a => String(a ?? '').replace(/^::ffff:/, '');

export function isAllowed(remoteAddress) {
    const a = norm(remoteAddress);
    if (a === '127.0.0.1' || a === '::1') return true;
    if (!LIST.length) return true;
    return LIST.includes(a);
}

export function describe() {
    return LIST.length ? `ALLOW_IP: 이 맥 + ${LIST.join(', ')}` : 'ALLOW_IP 없음 — LAN 의 누구나 붙을 수 있다';
}

export const addrOf = norm;
