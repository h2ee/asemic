// ── bake-common.js ────────────────────────────────────────────────────────────
// bake.html(음절 하나 = PNG 하나)과 bake-text.html(단어·문단 = 세로로 긴 PNG 하나)이 같이 쓰는 것:
// 투명 출력 mycelium, 직접 돌리는 프레임 루프, 누적 버퍼 영역 읽기, /__bake 저장. bake.html의 sora·signal·dandelion 한 장 굽기.

import { MyceliumReceiver } from '../js/receivers/mycelium.js';
import { SoraReceiver } from '../js/receivers/sora.js';
import { SignalReceiver } from '../js/receivers/signal.js';
import { DandelionReceiver } from '../js/receivers/dandelion.js';
import { calcSignalLatticeSize } from '../js/core.js';

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

// ── sora ──────────────────────────────────────────────────────────────────────
// sora는 누적 버퍼·성장 큐가 없다 — 유니폼만 정해 주면 그 순간 한 장이 완성된다(모프·파동만 시간에 걸림).
// 그래서 rAF와 resize를 끊고 정사각 캔버스(한 변 = 출력 px)를 직접 잡아, 음절 하나를 단어 하나(슬롯 하나)로
// 정중앙·고정 반경에 놓고 모프를 끝난 상태로 스냅해 한 번 그린다. 창 크기와 무관.
// 종성은 나선 잔물결(주파수·위상)만 바꾼다(2026-10-28) — 가/각/간…이 본체는 같고 결만 다르다.

export async function makeSoraBake(canvas) {
    const r = new SoraReceiver();
    await r.init(canvas);
    cancelAnimationFrame(r._raf);
    window.removeEventListener('resize', r._onResize);

    // fill = 정사각형 한 변 대비 보이는 원 지름. 셰이더 presence가 1.2r에서 0이 된다(r은 세로 uv 단위)
    function draw(items, JAMO, side, fill) {
        canvas.width = canvas.height = side;
        r.clearAccum();
        r._wordPositions.set(items[0].wordId ?? 0, [0.5, 0.5]);
        r._wordRadii.set(items[0].wordId ?? 0, fill / 2.4);
        r.update(items, [[0.5, 0.5]], JAMO);
        // flushQueue와 같은 스냅(rAF 대기만 뺌) — 모프 끝, 파동 끝
        for (let i = 0; i < r._cells.length; i++) {
            r._prevCells[i] = [...r._cells[i]];
            r._prevRipple[i] = [...r._ripple[i]];
            r._morphStart[i] = -999;
            r._waveStart[i] = -999;
        }
        r._render();
    }
    return { r, draw };
}

// ── signal ────────────────────────────────────────────────────────────────────
// signal은 음절마다 CA(cellular automata)가 STEP_INTERVAL(140ms)마다 한 step씩 돈다. 원하는 step 수만큼
// _animate를 가짜 60Hz 타임스탬프로 직접 돌려서 전시와 같은 시간축(24fps 스로틀·셀 크기 보간·신호등 FREEZE 구간에
// CA가 멈추는 것까지)으로 진행시킨 뒤 그 순간을 굽는다. 0 step = 막 친 순간의 패턴 그대로.
// 셀 격자는 CSS px(MIN_DIST 12px) 기준이라 글자 모양은 sylSize가 정한다 — 캔버스는 정사각 CSS 박스를
// 출력 px로 키운 backing store(DPR과 같은 방식)로 잡아, 출력 크기와 무관하게 전시와 같은 셀 수가 나온다.
// 색은 captureFrame과 같이 신호등 사이클을 NORMAL로 고정해서 그린다(BLINK 모노 카드로 굳지 않게).
// 지터·신호등 셀 위치는 매번 랜덤이다.
export async function makeSignalBake(canvas) {
    const r = new SignalReceiver({ transparentOutput: true });
    await r.init(canvas);
    cancelAnimationFrame(r._raf);
    window.removeEventListener('resize', r._onResize);
    const VSYNC = 1000 / 60;

    // fill = 정사각 한 변 대비 가장 큰 lattice(양성 모음 1.5·sylSize) 비율 — 음절끼리 상대 크기는 전시 그대로
    // steps = 구울 CA step 수, settle = 그 뒤 CA는 멈추고 셀 크기 보간만 끝까지(움직이던 셀이 자리 잡은 모양)
    function draw(items, JAMO, side, fill, steps, settle, sylSize = r.sylSize) {
        const css = (1.5 * sylSize) / fill;
        canvas.width = canvas.height = side;
        r.clearAccum();
        r._cssWidth = r._cssHeight = css;
        r._gl.viewport(0, 0, side, side);
        const { width, height } = calcSignalLatticeSize(items[0], sylSize);
        r.update(items, [[0.5, 0.5]], JAMO, sylSize, [width], [height]);

        // 신호등 cyclePhaseStart가 performance.now() 시계라 가짜 시간도 거기서 시작한다
        let t = performance.now();
        r._lastStep = r._lastFrame = 0; // 이전 음절의 가짜 시간이 남아 있으면 step이 한참 안 돈다
        const tick = () => {
            r._lastActivity = t; // 유휴 정지(30초) 판정을 늘 피한다
            r._animate(t);
            cancelAnimationFrame(r._raf);
            t += VSYNC;
        };
        for (let guard = 0; r._stepCount < steps && guard < 1e6; guard++) tick();
        r._active = false; // 여기부터 CA는 안 돈다 — 텍스처 업로드·셀 크기 보간만
        if (settle) for (let i = 0; i < 600; i++) tick();
        else if (steps === 0) for (let i = 0; i < 3; i++) tick(); // 첫 업로드(24fps 스로틀 한 번 통과)
        r._time = 0; // 신호등 NORMAL
        r._draw();
    }
    return { r, draw };
}

// ── dandelion ─────────────────────────────────────────────────────────────────
// dandelion(trail 엔진)은 캔버스가 창 크기 × DPR이고 orb·halo 칸·오프셋이 전부 CSS px라
// 셰이더 스케일로 키울 수 없다 — 전시 화면 크기 그대로 그려서 잘라낸다. 그래서 출력 해상도는 box × DPR이 원본이다.
// dpr을 주면 window.devicePixelRatio를 그 값으로 덮고 엔진 상한(기본 2)도 그만큼 풀어, 엔진이 그 배율로
// 캔버스를 잡게 한다(모양은 같고 선명도만). 3·4면 캔버스가 창 × 3·4라 음절당 시간·메모리가 는다.
// 음절 하나 = 단어 하나 = 획 하나로 놓고 flushQueue로 즉시 완성, 두 프레임 뒤 합성 캔버스를 읽는다 —
// main bead(waitLive)는 완결된 순간부터 fps(2) 박자로 움직이므로 이때는 실선 끝(오른쪽)에 막 선 자리다.
// 프레임은 엔진 자신의 rAF로 돈다 — 탭이 뒤로 가면 멈춘다(mycelium처럼 직접 돌리지 않음).
export async function makeDandelionBake(dpr) {
    if (dpr > 0) Object.defineProperty(window, 'devicePixelRatio', { get: () => dpr, configurable: true });
    const r = new DandelionReceiver({ transparentOutput: true, dprCap: dpr > 0 ? dpr : undefined });
    await r.init();

    async function draw(items, JAMO) {
        r.clearAccum(); // 도장 bead·main bead 시각(resetStamps)까지 비운다
        // 앵커 = 음절 셀 왼쪽 — 셀 가운데가 화면 가운데쯤 오게. 정확한 중심은 잘라낼 때 알파 범위로 다시 잡는다
        r.update(items, [[0.5 - r.wrapStep / 2 / window.innerWidth, 0.5]], JAMO);
        await r.flushQueue();
        return r._trail.captureCanvas();
    }
    return { r, draw };
}

// 캔버스에서 알파가 있는 범위 [x0, y0, x1, y1] (디바이스 px, x1·y1 제외). 비었으면 null
export function alphaBounds(cvs) {
    const { width: w, height: h } = cvs;
    const a = cvs.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    let x0 = w,
        y0 = h,
        x1 = -1,
        y1 = -1;
    for (let y = 0; y < h; y++)
        for (let x = 0, i = y * w * 4 + 3; x < w; x++, i += 4)
            if (a[i]) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                y1 = y;
            }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}
