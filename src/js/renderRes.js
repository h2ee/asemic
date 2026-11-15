// 캔버스 해상도(backing store) 상한 — 화면 크기 캔버스 한 장이 넘지 않을 픽셀 수.
//
// 왜 (2026-11-12): 전시 4K 외부 모니터를 macOS "2560×1440처럼 보기"로 쓰면 DPR 2라 캔버스 한 장이 5120×2880이다.
// 모니터 실제 픽셀(3840×2160)보다 커서 늘어난 만큼은 화면에 안 보이는데, receiver·유리·말풍선 조각·dandelion 오버레이
// 캔버스가 전부 그 크기로 GPU 메모리를 잡고 매 프레임 그린다. Ollama(GPU 100%)가 대답을 만드는 순간과 겹치면 깜박이고,
// 몇 시간 쌓이면 배경 이미지를 놓쳤다(하얀 배경 + 깨진 이미지 아이콘, 새로고침하면 복구).
//
// 기본은 상한 없음 — 페이지가 setPixelBudget으로 켠다(output-main.js). bake 페이지·index.html은 예전 그대로.
// 상한이 걸려도 DPR 1 밑으로는 안 내린다(CSS 크기보다 흐려지지 않게).
let _budget = Infinity;

export function setPixelBudget(px) {
    _budget = px > 0 ? px : Infinity;
}

// cap = 그 캔버스의 예전 DPR 상한(대개 2). w·h = 캔버스 CSS 크기(기본 창 크기)
export function renderDpr(cap = 2, w = window.innerWidth, h = window.innerHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    if (!isFinite(_budget)) return dpr;
    return Math.min(dpr, Math.max(1, Math.sqrt(_budget / Math.max(1, w * h))));
}
