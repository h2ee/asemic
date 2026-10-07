// ── bake-common.js ────────────────────────────────────────────────────────────
// bake.html(음절 하나 = PNG 하나)과 bake-text.html(단어·문단 = 세로로 긴 PNG 하나)이 같이 쓰는 것:
// 투명 출력 mycelium, 직접 돌리는 프레임 루프, 누적 버퍼 영역 읽기, /__bake 저장.

import { MyceliumReceiver } from '../js/receivers/mycelium.js';

// 투명 출력 mycelium을 띄우고 receiver의 rAF 루프를 끊는다. 대신 _animate를 직접 한 프레임씩 부른다 —
// 백그라운드 탭은 rAF가 멈추지만 MessageChannel은 안 멈춘다. 성장은 렌더 프레임당 전진이라
// (growT += (1-growT)·0.08) 24fps 스로틀·실제 시간과 무관하게 모양은 같다 — 속도만 빨라진다
export async function makeBakeReceiver() {
    const r = new MyceliumReceiver({ transparentOutput: true });
    await r.init();
    const animate = r._animate;
    cancelAnimationFrame(r._raf);
    let fakeT = 0;
    const mc = new MessageChannel();
    const yieldOnce = () => new Promise(res => ((mc.port1.onmessage = res), mc.port2.postMessage(0)));

    // 컨텍스트를 잃으면 크롬이 그 origin의 WebGL을 한동안 막는다 — 계속 돌지 말고 멈춘다
    let lost = false;
    r._renderer.domElement.addEventListener('webglcontextlost', () => (lost = true));
    const px = new Uint8Array(4);

    async function frame() {
        if (lost) throw new Error('WebGL 컨텍스트 손실 — 페이지를 새로고침할 것 (안 되면 크롬 재시작)');
        await yieldOnce();
        animate((fakeT += 1000)); // 스로틀 판정을 늘 통과하는 가짜 타임스탬프
        cancelAnimationFrame(r._raf); // _animate가 스스로 건 다음 rAF는 취소
        // GPU 동기화 — vsync 없이 연달아 그리면(특히 화면에 안 보이는 탭) 명령이 쌓이다가 GPU 워치독에
        // 걸려 컨텍스트를 잃는다. 1px 읽기가 이 프레임이 끝날 때까지 기다린다(ANGLE에선 gl.finish가 안 기다림)
        r._renderer.readRenderTargetPixels(r._accumTarget, 0, 0, 1, 1, px);
    }
    async function waitIdle() {
        do await frame();
        while (!r.isIdle());
        await frame();
        await frame(); // 마지막 bake가 누적 버퍼에 확정될 때까지(flushQueue와 같은 2프레임)
    }
    return { r, frame, waitIdle };
}

// 화면 크기와 무관한 글자 모양 — layoutFor와 같은 방식. 보일 크기(CSS px) sylSize에 대해
// 모양은 기준 크기(r.sylSize × H/refHeight)로 만들고 셰이더 균일 스케일 gs로 키운다
export function glyphScaleFor(r, sylSize) {
    return sylSize / (r.sylSize * (window.innerHeight / r.refHeight));
}

// 누적 버퍼(straight alpha)의 사각 영역 → 캔버스. x0/y0/w/h는 디바이스 px, 위→아래 기준.
// captureFrame과 같은 원본이되 필요한 부분만 읽는다. outW×outH로 줄여(늘여) 돌려준다
export function readAccum(r, x0, y0, w, h, outW = w, outH = h) {
    const tgt = r._accumTarget;
    const buf = new Uint8Array(w * h * 4);
    r._renderer.readRenderTargetPixels(tgt, x0, tgt.height - y0 - h, w, h, buf); // GL은 아래→위
    const src = new OffscreenCanvas(w, h);
    const img = new ImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    src.getContext('2d').putImageData(img, 0, 0);
    if (outW === w && outH === h) return src;
    const out = new OffscreenCanvas(outW, outH);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, outW, outH);
    return out;
}

export async function listSaved(dir) {
    return new Set(await fetch(`/__bake/list?dir=${encodeURIComponent(dir)}`).then(res => res.json()));
}

export async function savePng(dir, name, blob) {
    const res = await fetch(`/__bake/save?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(name)}`, {
        method: 'POST',
        body: blob,
    });
    if (!res.ok) throw new Error(`save ${name}: ${res.status}`);
}
