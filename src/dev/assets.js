// ── assets.js — public/ 자산 경로 + 폰트 등록 ─────────────────────────────────
//
// public/ 안의 파일은 vite가 가공하지 않고 `${BASE_URL}<경로>`로 그대로 서빙한다.
// base가 '/asemic/'이라 상대경로로 적으면 페이지 깊이에 따라 어긋나므로
// (output.html은 /asemic/src/dev/ 아래에 있다) 항상 이 함수를 거친다.
// jamo_loader.js의 csvPath와 같은 규칙.
export const asset = path => `${import.meta.env.BASE_URL}${path}`;

// CSS 안에서는 import.meta.env를 못 쓴다 — @font-face만 여기서 주입한다.
// TD의 Web Render TOP(CEF) 안에서 도는 페이지라 시스템 폰트에 기대지 않고
// 파일을 직접 싣는다.
//   Inconsolata     — 라틴/토스트("is talking ...")
//   MonoplexKR      — 한글/입력 바
let _injected = false;
export function injectFonts() {
    if (_injected) return;
    _injected = true;
    const style = document.createElement('style');
    style.textContent = `
@font-face {
    font-family: 'Inconsolata';
    src: url('${asset('fonts/Inconsolata.otf')}') format('opentype');
    font-display: block;
}
@font-face {
    font-family: 'MonoplexKR';
    src: url('${asset('fonts/MonoplexKR-Regular.ttf')}') format('truetype');
    font-display: block;
}`;
    document.head.appendChild(style);
}
