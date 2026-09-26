// 04_trail_gl — 마우스 궤적 + GPU 밀도장 goo (03_trail 의 GLSL 하이브리드판)
//
// 역할 분담
//   CPU (path.js)  경로 생성 — 리샘플/스무딩/방황/루프 이벤트. 순차적·상태 있는 로직은 JS 가 압도적으로 편하다.
//   GPU (field.js) 밀도장 goo — 캡슐 SDF 커널을 누적 텍스처에 스탬프 → 임계 → 셰이딩.
//   Canvas2D       얇은 크리스프 잉크(점선·화살촉·장식 원)만. 이건 2D 가 제일 잘한다.
//
// 레이어 (아래 → 위)
//   #c        WebGL2 — 종이색 + goo + 성장 + 파티클. 화면 전체를 이 셰이더들이 칠한다.
//   overlay   Canvas2D(투명) — ink2d 누적본 + 그리는 중인 잉크.
//
// GPU 패스 순서 (한 프레임)
//   1. field.stamp('live')   그리는 중인 획을 밀도장에 (baked 는 손 뗄 때만)
//   2. growth.step()         밀도장을 읽어 성장장 ping-pong — goo 경계에서 자라 나온다
//   3. field.composite()     밀도장 + 성장장 → 임계 + 셰이딩 → 화면
//   4. particles.step()      파티클 상태 ping-pong — 경계에서 스스로 방출/사멸
//   5. particles.draw()      화면 위에 알파 블렌딩
// growth / particles 는 밀도장을 읽기만 한다. 순서만 지키면 서로 독립적이다.
//
// 03_trail 대비 달라진 점
//   · 전체화면 blur 가 없다 → 최대 병목 제거. 캔버스 5장 → 2장 + 저해상도 필드 2장.
//   · goo 파라미터가 직교한다: reach(px 사거리) / th(겹친 선 개수) / edge(물렁함).
//     구버전의 gooWidth·blur·gooBright 는 셋이 하나의 스칼라로 붕괴해 있었다.
//   · 셰이딩 모드 — 밀도장의 gradient 로 노멀을 만들어 레이마칭 없이 3D 볼륨감(크롬/토온).
//   · 획 기하를 JS 에 보관 → 리사이즈에도 그림이 안 날아가고, undo 가 공짜로 된다.
//   · field 의 .g/.b 채널에 strokeId / birth 가 누적된다 → 나중에 "자람"·파티클 트리거 훅.
//
// 키
//   1/2/3  flat / lit / toon         4  밀도장 디버그 (th·성장장을 눈으로 보기)
//   g      성장 레이어 on/off        p  파티클 on/off
//   z      undo       c  전체 지우기       s  PNG 저장
//
// 콘솔에서 파라미터 실시간 수정: window.TRAIL.CFG.goo.th = 1.8

import { createStroke, pushPoint, growStroke, hashSeed } from './path.js';
import { createField, FLOATS_PER_SEG } from './field.js';
import { createGrowth } from './growth.js';
import { createParticles } from './particles.js';
import { makeQuadBuffer } from './glutil.js';
import { wordOutline } from './marchingSquares.js';

const BIRTH_SCALE = 60; // birth 를 "분" 단위로 저장 (16F 누적 레인지 보호)
const DPR_CAP = 2;

const hex2rgb = h => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
];

// 스케치 진입점 — 마우스/키보드를 붙이고 window.TRAIL 을 노출한다
export function start() {
    return createTrail({ mouse: true, keys: true, global: true });
}

// opts:
//   canvas   WebGL2 캔버스를 직접 넘김 (없으면 #c, 그것도 없으면 새로 만든다)
//   mouse    포인터로 그리기 허용 (기본 false)
//   keys     키보드 단축키 등록 (기본 false — asemic 에선 한글 입력창과 충돌한다)
//   global   window.TRAIL 노출 (기본 false)
//   bodyBg   document.body 배경을 종이색으로 (기본 true)
//   cfg      CFG 위에 얕게 덮어쓸 값. goo/grow/part 는 한 단계 더 머지된다.
export function createTrail(opts = {}) {
    // ─────────────────────────── 설정 ───────────────────────────
    // 위치/길이 파라미터는 전부 CSS px. spacing 을 바꿔도 형태가 유지된다.
    const CFG = {
        // 세션 시드. 고정값으로 바꾸면 새로고침해도 같은 획이 나온다 (튜닝/비교용).
        seed: (Math.random() * 0xffffffff) >>> 0,

        // 경로
        spacing: 6, // 리샘플 간격(px)
        spineSmooth: 12, // 실선 스무딩 길이(px)
        minDist: 4, // 포인터 이벤트 최소 이동(px)
        maxRaw: 12000,

        // 동반 곡선
        companions: [1, 1], // 획당 개수 [최소, 최대]
        wanderAmp: [6, 18], // 완만한 드리프트 진폭(px) — 큰 굽이만 담당
        wanderLen: [500, 950], // 그 굽이의 파장(px)
        weaveAmp: [16, 32], // 실선을 넘나드는 진동 진폭(px)
        weaveLen: [340, 560], // 그 진동의 파장(px) — 획당 몇 번 교차할지
        noSwirlChance: 0.1,
        maxSwirls: 40,
        eventGap: [210, 450], // 루프 이벤트 간격(px)
        eventProb: 0.8,
        swirlSpan: [66, 78], // 루프가 걸치는 호 길이(px)
        swirlRadius: [35, 45], // 루프 반경(px)
        swirlTurns: [1, 1.7],
        compBaseSmooth: 96, // 기준 경로 스무딩 길이(px) — 클수록 급한 방향전환도 곡선 유지
        compStep: 3.6, // 동반 곡선 샘플 간격(px)
        compSmooth: 11, // 완성된 동반 곡선 스무딩 길이(px)
        headLag: 12, // 동반 곡선이 펜보다 이만큼 뒤에서 끝난다(px)

        // 점진 생성 — 큐에 들어온 획이 한 프레임에 이만큼(px)씩 그려진다.
        // 프레임 기준이라 120Hz 화면에서는 60Hz의 2배 속도가 된다. 전시 기기가
        // 확정되면 (dt 기반 px/s 로 바꾸려면) advanceGrowing 의 한 줄만 고치면 된다.
        growPx: 14,

        // 잉크 (Canvas2D 레이어)
        lineWidth: 0.5,
        baseStyle: 'rgb(0, 0, 0)',
        companionStyle: 'rgb(0, 0, 0)',
        companionDash: [3, 4],
        arrowSize: 7,
        decor: true,
        decorGap: [20, 80], // 장식 원 간격(px)
        decorSpread: 30, // 경로 법선 방향 흩뿌림(px)
        decorRadius: [1.5, 4], // 사각형 반변 길이(px)
        decorStyle: 'rgb(0, 0, 0)',
        decorLineWidth: 0.75,

        // 단어 윤곽선 — 획을 구울 때 marching squares 로 등고선을 뽑아 경로로 긋는다.
        // reach 를 goo 의 것보다 크게 잡을수록 이웃 획의 장이 합쳐져 획 하나가 아니라
        // **단어 전체를 감싸는** 외곽선이 된다. th 는 그 장 기준 밀도 임계.
        outline: {
            on: true,
            reach: 30, // px — 윤곽선 전용 커널 반경 (goo.reach 와 별개)
            th: 0.55, // 밀도 임계
            cell: 4, // 샘플 격자 간격(px) — 작을수록 매끈하지만 느리다
            style: 'rgba(0,0,0,0.45)',
            width: 0.6,
            dash: [], // 예: [2, 3] 이면 점선 윤곽
        },

        // goo — 밀도장. 세 값이 서로 독립적이다.
        // 실측 밀도(TRAIL.probe, reach 22 / compStep 3.6 기준):
        //   매끈한 외톨이 선 코어  ≈ 1.0     (커널 정규화의 기준점)
        //   자기 루프가 겹치는 곳  ≈ 1.2~1.6  (곡률이 큰 안쪽은 이웃 호가 가까워 자연히 높다)
        //   선 두 줄이 겹친 곳     ≈ 1.6~1.9
        goo: {
            reach: 18, // px. 커널 반경 = "두 선이 이만큼 가까우면 이어붙는다"
            th: 1.3, // 밀도 임계 ≈ "겹쳐야 하는 선의 개수".
            //   <1.0 모든 선이 두툼하게 goo / 1.1~1.5 루프·근접 구간만 / >1.6 진짜 교차점만
            edge: 0.005, // 임계 전이 폭 (안티에일리어싱·물렁함). th 와 무관하게 움직인다.
            // 어느 선을 밀도장에 넣을지 — 독립적으로 켜고 끈다. 둘 다 false 면 goo 없이 선만 남는다.
            // 둘 중 하나만 넣으면 "실선끼리" 또는 "점선끼리"만 서로 뭉친다.
            spine: true, // 실선(main 곡선)
            companion: false, // 점선(동반 곡선)
            fieldScale: 1.5, // 필드 해상도 / 화면 해상도 (밀도장은 저주파라 낮춰도 된다)
        },

        // 셰이딩
        paper: '#ffffff',
        ink: '#0a0a0a',
        shade: 2, // 0 flat / 1 lit / 2 toon / 3 밀도장 디버그
        light: [-0.45, 0.6, 0.66],
        normalZ: 34, // 노멀 기울기 스케일 — 작을수록 납작, 클수록 부풀어 보임
        amb: 0.55,
        diff: 0.75,
        spec: 0.5,
        specPow: 28,
        fres: 0.22,
        bands: 3, // toon 계단 수

        // 성장 레이어 — goo 경계에서 뭔가가 자라 나온다 (텍스처 공간 피드백)
        // 기본 off. 키 `g` 또는 TRAIL.CFG.grow.on = true 로 켠다.
        grow: {
            on: false,
            scale: 0.75, // 성장장 해상도 / 디바이스 해상도 (흐물흐물하니 낮춰도 된다)
            decay: 0.965, // 프레임당(60fps 기준) 감쇠 — 작을수록 짧게 자람
            outward: 26, // 경계 바깥으로 밀려나는 속도 (px/s)
            curlAmp: 55, // 바람 세기 (px/s)
            curlScale: 0.006, // 바람 공간 주파수 (1/px) — 작을수록 큰 소용돌이
            curlSpeed: 0.06,
            source: 1.0, // 발아 세기
            bandLo: 0.35, // 발아 밴드 아래쪽 폭 (th - bandLo)
            bandHi: 0.12, // 위쪽 폭 (th + bandHi)
            ageDelay: 0.02, // 분. 획을 그린 뒤 이 정도 지나서부터 자란다 (field .b 의 birth 사용)
            ink: '#6e6e66',
            gain: 1.4, // 성장장 → 불투명도
            opacity: 0.5,
        },

        // 파티클 레이어 — goo 경계에서 스스로 방출된다 (CPU 방출 없음)
        // 기본 off. 키 `p` 또는 TRAIL.CFG.part.on = true 로 켠다.
        part: {
            on: false,
            side: 128, // 상태 텍스처 한 변 → 파티클 수 상한 = side²
            spawnTol: 0.08, // |밀도 - th| 가 이보다 작은 곳을 경계로 인정
            spawnRate: 0.04, // 부활 시도 확률/프레임 — 실질적인 "개체수" 조절 노브.
            //   1.0 으로 두면 전원이 동시 탄생 → 동시 사망해서 개체수가 맥동한다
            lifespan: 4.5, // 초
            lifeVar: 0.5, // 수명 개체차 (0.5 = 0.5~1.5배). 맥동 방지
            curlAmp: 34, // 바람 (px/s)
            curlScale: 0.0075,
            curlSpeed: 0.09,
            flow: 26, // goo 경계를 따라 도는 속도 (px/s)
            repel: 14, // 경계 바깥으로 밀려나는 속도 (px/s)
            size: 2.6, // px
            ink: '#141414',
            opacity: 0.55,
        },
    };

    // CFG 에 opts.cfg 를 머지 (goo/grow/part 는 중첩이라 한 단계 더 들어간다)
    if (opts.cfg) {
        for (const [k, v] of Object.entries(opts.cfg)) {
            if (v && typeof v === 'object' && !Array.isArray(v) && CFG[k]) Object.assign(CFG[k], v);
            else CFG[k] = v;
        }
    }

    // ─────────────────────── 캔버스 2장 ───────────────────────
    // 아래: WebGL2(종이 + goo) / 위: Canvas2D 투명 오버레이(얇은 잉크)
    // 둘 다 여기서 만들거나 받아오고, dispose() 에서 자기가 만든 것만 치운다.
    const ownGl = !opts.canvas && !document.getElementById('c');
    const glCanvas = opts.canvas ?? document.getElementById('c') ?? document.createElement('canvas');
    if (ownGl) document.body.appendChild(glCanvas);
    const overlay = document.createElement('canvas');
    document.body.appendChild(overlay);
    for (const cv of [glCanvas, overlay]) {
        cv.style.position = 'fixed';
        cv.style.left = '0';
        cv.style.top = '0';
    }
    // 종이색은 셰이더가 아니라 캔버스 CSS 배경이 깐다 — 합성 셰이더는 straight alpha 로
    // 잉크만 출력하므로, 화면에선 이 배경이 비쳐 보이고 캡처는 투명하게 나온다.
    glCanvas.style.background = CFG.paper;
    overlay.style.touchAction = 'none';
    if (opts.mouse) overlay.style.cursor = 'crosshair';
    // 오버레이가 위에 깔리므로 마우스를 안 쓸 땐 클릭을 통과시킨다 (UI 버튼 가림 방지)
    if (!opts.mouse) overlay.style.pointerEvents = 'none';
    const prevBodyBg = document.body.style.background;
    if (opts.bodyBg !== false) document.body.style.background = CFG.paper;

    const gl = glCanvas.getContext('webgl2', {
        antialias: false,
        alpha: true, // 투명 캡처 — 종이색은 캔버스 CSS 배경이 담당
        premultipliedAlpha: false, // 셰이더가 straight alpha 를 낸다
        preserveDrawingBuffer: true, // PNG 저장 / captureFrame 의 readPixels·drawImage 용
    });
    if (!gl) {
        console.error('WebGL2 를 쓸 수 없습니다');
        return;
    }
    // 세 모듈이 같은 쿼드 버퍼를 공유한다
    const quadBuf = makeQuadBuffer(gl);
    const field = createField(gl, quadBuf);
    const growth = createGrowth(gl, quadBuf);
    const particles = createParticles(gl, quadBuf, CFG.part.side);

    const ink2d = document.createElement('canvas'); // 누적 잉크 (안 지움)
    const ictx = ink2d.getContext('2d');
    const octx = overlay.getContext('2d');

    let W = 0,
        H = 0,
        dpr = 1;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
        // 0 으로 떨어지지 않게 — 창이 0 크기인 채로 로드되면(숨겨진 패널 등) 캔버스 width 가 0 이
        // 되고, drawImage 가 매 프레임 InvalidStateError 를 던져 프레임 루프가 영구히 죽는다.
        W = Math.max(1, window.innerWidth);
        H = Math.max(1, window.innerHeight);
        for (const cv of [glCanvas, overlay, ink2d]) {
            cv.width = Math.round(W * dpr);
            cv.height = Math.round(H * dpr);
        }
        for (const cv of [glCanvas, overlay]) {
            cv.style.width = W + 'px';
            cv.style.height = H + 'px';
        }
        for (const c of [ictx, octx]) c.setTransform(dpr, 0, 0, dpr, 0, 0);
        field.resize(W, H, Math.round(W * dpr * CFG.goo.fieldScale), Math.round(H * dpr * CFG.goo.fieldScale));
        growth.resize(W, H, Math.round(W * dpr * CFG.grow.scale), Math.round(H * dpr * CFG.grow.scale));
        particles.resize(W, H);
        replayAll(); // 03_trail 과 달리 리사이즈해도 그림이 안 날아간다
    }

    // ─────────────────── 세그먼트 → 인스턴스 데이터 ───────────────────
    function addPoly(out, poly, R, id, birth) {
        for (let i = 1; i < poly.length; i++) {
            const a = poly[i - 1],
                b = poly[i];
            out.push(a.x, a.y, b.x, b.y, R, id, birth, 0);
        }
    }

    function collectSegs(stroke, out) {
        const R = CFG.goo.reach;
        if (CFG.goo.companion) for (const poly of stroke.compPolys) addPoly(out, poly, R, stroke.id, stroke.birth);
        if (CFG.goo.spine && stroke.spine) addPoly(out, stroke.spine, R, stroke.id, stroke.birth);
    }

    // ───────────────────── Canvas2D 잉크 ─────────────────────
    function strokePolyline(c, pts, style, w, dash) {
        if (pts.length < 2) return;
        c.strokeStyle = style;
        c.lineWidth = w;
        c.lineJoin = 'round';
        c.lineCap = 'round';
        c.setLineDash(dash || []);
        c.beginPath();
        c.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
        c.stroke();
        c.setLineDash([]);
    }

    function drawArrowhead(c, tip, prev, size) {
        if (!tip || !prev) return;
        const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
        c.fillStyle = 'rgb(0, 0, 0)';
        c.beginPath();
        c.moveTo(tip.x, tip.y);
        c.lineTo(tip.x - Math.cos(a - 0.4) * size, tip.y - Math.sin(a - 0.4) * size);
        c.lineTo(tip.x - Math.cos(a + 0.4) * size, tip.y - Math.sin(a + 0.4) * size);
        c.closePath();
        c.fill();
    }

    function drawStrokeInk(c, stroke) {
        if (stroke.outline)
            for (const poly of stroke.outline)
                strokePolyline(c, poly, CFG.outline.style, CFG.outline.width, CFG.outline.dash);
        if (stroke.spine) strokePolyline(c, stroke.spine, CFG.baseStyle, CFG.lineWidth);
        for (const d of stroke.decor) {
            c.strokeStyle = CFG.decorStyle;
            c.lineWidth = CFG.decorLineWidth;
            c.strokeRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
        }
        for (const poly of stroke.compPolys) {
            strokePolyline(c, poly, CFG.companionStyle, CFG.lineWidth, CFG.companionDash);
            drawArrowhead(c, poly.at(-1), poly.at(-3) || poly.at(-2), CFG.arrowSize);
        }
    }

    // ───────────────────────── 획 관리 ─────────────────────────
    const strokes = []; // 확정된 획의 기하 — replay/undo/리사이즈 대응
    let nextId = 1;
    let liveStroke = null; // 자라는 중인 획 — 마우스든 큐든 여기로 들어온다
    let drawingByMouse = false; // 마우스로 그리는 중이면 큐는 양보한다
    const t0 = performance.now();
    const nowBirth = () => (performance.now() - t0) / 1000 / BIRTH_SCALE;

    // 윤곽선용 세그먼트 — 밀도장에 스탬프되는 것과 같은 선들
    function outlineSegs(stroke) {
        const out = [];
        const push = poly => {
            for (let i = 1; i < poly.length; i++)
                out.push({ ax: poly[i - 1].x, ay: poly[i - 1].y, bx: poly[i].x, by: poly[i].y });
        };
        if (CFG.goo.companion) for (const poly of stroke.compPolys) push(poly);
        if (CFG.goo.spine && stroke.spine) push(stroke.spine);
        if (!out.length && stroke.spine) push(stroke.spine); // 둘 다 꺼둔 경우의 보험
        return out;
    }

    // 윤곽선은 구울 때 한 번만 계산한다 (단어당 수 ms). replay 도 이걸 거친다.
    function ensureOutline(stroke) {
        if (CFG.outline.on && !stroke.outline)
            stroke.outline = wordOutline(outlineSegs(stroke), CFG.outline);
    }

    function bakeStroke(stroke) {
        ensureOutline(stroke);
        drawStrokeInk(ictx, stroke);
        const segs = [];
        collectSegs(stroke, segs);
        field.stamp('baked', new Float32Array(segs), segs.length / FLOATS_PER_SEG);
    }

    // 자라는 중인 것과 큐를 버린다 (clear / 전면 재구성 때)
    function dropPending() {
        queue.length = 0;
        growing = null;
        liveStroke = null;
        drawingByMouse = false;
        field.clear('live');
    }

    function replayAll() {
        ictx.clearRect(0, 0, W, H);
        for (const s of strokes) s.outline = null; // outline.* 튜닝이 반영되도록 재계산
        field.clear('baked');
        field.clear('live');
        growth.clear(); // 없어진 획 자리에 자라던 것도 같이 지운다
        const segs = [];
        for (const s of strokes) {
            ensureOutline(s);
            drawStrokeInk(ictx, s);
            collectSegs(s, segs);
        }
        field.stamp('baked', new Float32Array(segs), segs.length / FLOATS_PER_SEG);
    }

    // ══════════════ 점진 생성 큐 (px/frame) ══════════════
    // 자모 입력은 마우스처럼 "실시간으로 손이 움직이는" 진행이 없다. 그래서 완성된 경로를
    // 큐에 넣고, 매 프레임 CFG.growPx 만큼 호길이를 소비하며 점을 흘려넣는다.
    //
    // 자라는 중인 획은 liveStroke 에 들어간다 — 마우스가 쓰던 그 자리라서
    // live 필드 스탬프·2D 오버레이 렌더 경로를 그대로 재사용한다.
    //
    // 결정론: ①에서 난수 소비가 경로 길이에만 의존하도록 고쳐놨기 때문에,
    // growPx 를 얼마로 두든 / 프레임이 몇 번 끊기든 최종 결과가 동일하다. (검증됨)

    const queue = []; // [{ pts, cum, seed }] — 대기 중인 획
    let growing = null; // { pts, cum, i, walked } — 자라는 중인 획의 진행 상태

    // 누적 호길이 — 프레임당 "px" 예산을 점 인덱스로 환산하는 데 쓴다
    function cumLength(pts) {
        const cum = [0];
        for (let i = 1; i < pts.length; i++)
            cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return cum;
    }

    // hold: true 면 점을 다 써도 완성하지 않고 대기한다 — extendGrowing 으로 뒤가
    // 계속 붙는 경우("단어 = 획"에서 타이핑 중인 단어)용. finishGrowing 이 풀어준다.
    function queueStroke(pts, seed, { hold = false } = {}) {
        if (!pts || pts.length < 2) return;
        queue.push({ pts, cum: cumLength(pts), seed, hold });
    }

    // 자라는 중인 획에 점을 이어붙인다 — "단어 = 획" 으로 갈 때 음절이 하나씩
    // 도착하는 상황용. raw 는 append-only 라 앞부분이 흔들리지 않는다.
    function extendGrowing(pts) {
        if (!growing || !pts?.length) return false;
        const g = growing;
        // pts 가 비어 있을 수 있다 (안정 구간이 0 점인 1음절 단어의 조합 중)
        let prev = g.pts.length ? g.pts[g.pts.length - 1] : null;
        for (const p of pts) {
            const d = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;
            g.pts.push(p);
            g.cum.push((g.cum.length ? g.cum[g.cum.length - 1] : 0) + d);
            prev = p;
        }
        return true;
    }

    function startNext() {
        const q = queue.shift();
        if (!q) return false;
        liveStroke = createStroke(CFG, nextId++, nowBirth(), q.seed);
        growing = { pts: q.pts, cum: q.cum, i: 0, walked: 0, hold: !!q.hold };
        return true;
    }

    function finalizeGrowing() {
        if (!liveStroke) return;
        const s = liveStroke;
        liveStroke = null;
        growing = null;
        growStroke(s, CFG); // 최종 기하
        field.clear('live');
        if (s.spine && (s.compPolys.length || s.decor.length)) {
            strokes.push(s);
            bakeStroke(s);
        }
    }

    // 매 프레임 1회. 예산만큼 호길이를 전진시키고 그 안에 들어온 점을 흘려넣는다.
    function advanceGrowing() {
        if (!growing && !startNext()) return;
        const g = growing;
        const total = g.cum[g.cum.length - 1];
        g.walked = Math.min(g.walked + CFG.growPx, total); // ← px/frame. dt 기반으로 바꾸려면 이 줄
        while (g.i < g.pts.length && g.cum[g.i] <= g.walked) {
            pushPoint(liveStroke, CFG, g.pts[g.i].x, g.pts[g.i].y);
            g.i++;
        }
        // 점을 다 썼고 예산도 끝까지 갔으면 완성.
        // hold 중이면 완성하지 않고 대기 — 뒤에 음절이 더 붙기를 기다린다.
        if (g.i >= g.pts.length && g.walked >= total && !g.hold) finalizeGrowing();
    }

    // 자라는 획의 앞 k 개 점은 두고 그 뒤를 tail 로 **교체**한다.
    //
    // 한글은 조합 중인 음절이 매 타건마다 바뀌고(ㅇ→아→안), 종성이 다음 글자의 초성으로
    // 넘어가기도 한다("반가"+ㅇ→"반강"→"반가우"). 그때 단어 전체를 다시 그리지 않고
    // 바뀐 뒤쪽만 갈아끼우려고 쓴다.
    //
    // 소비량(i)은 유지한다 — 되감았다가 다시 뻗으면 끝이 움찔거린다. 이미 그려진 길이만큼은
    // 곧바로 새 모양으로 보인다. 앞 k 점이 정말 동일하다는 보장은 **호출자 책임**이다
    // (receiver 가 "안정 구간 키 배열이 이전 키 배열의 프리픽스인가"로 검사한다).
    function replaceTail(k, tail) {
        if (!growing || !liveStroke) return;
        const g = growing;
        k = Math.max(0, Math.min(k, g.pts.length));
        g.pts.length = k;
        g.cum.length = k;
        let prev = k ? g.pts[k - 1] : null;
        for (const p of tail || []) {
            const d = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;
            g.pts.push(p);
            g.cum.push((g.cum.length ? g.cum[g.cum.length - 1] : 0) + d);
            prev = p;
        }
        const total = g.pts.length;
        const consumed = Math.min(g.i, total);
        // 같은 id/birth/seed 로 다시 만들어야 색·난수·나이가 그대로다
        const { id, birth, seed } = liveStroke;
        liveStroke = createStroke(CFG, id, birth, seed);
        for (let j = 0; j < consumed; j++) pushPoint(liveStroke, CFG, g.pts[j].x, g.pts[j].y);
        growStroke(liveStroke, CFG);
        g.i = consumed;
        g.walked = total ? Math.min(g.walked, g.cum[total - 1]) : 0;
    }

    // 자라는 중인 획을 즉시 완성. main.js 가 띄어쓰기/다음 음절 입력 때 호출하는 계약.
    function finishGrowing() {
        if (!growing) return;
        const g = growing;
        g.hold = false;
        while (g.i < g.pts.length) {
            pushPoint(liveStroke, CFG, g.pts[g.i].x, g.pts[g.i].y);
            g.i++;
        }
        finalizeGrowing();
    }

    // 큐에 남은 것까지 전부 완성. 제출(캡처) 직전에 호출되는 계약.
    // 스탬프가 동기라서 프레임을 기다릴 필요가 없다.
    async function flushQueue() {
        finishGrowing();
        while (startNext()) finishGrowing();
    }

    // ─────────── 외부 경로 주입 — 자모 생성기가 들어올 자리 ───────────
    // 마우스가 이 파이프라인에 하는 일은 "raw 점 배열을 만드는 것" 하나뿐이다.
    // 그 자리를 이 함수가 대신한다. 아래 전부(리샘플/스무딩/companion/goo)는 그대로 재사용.
    //
    //   pts   [{x,y}, ...]  — 점 간격이 CFG.minDist(4px) 미만이면 pushPoint 가 걸러낸다
    //   seed  이 획의 모든 난수를 결정. 같은 seed + 같은 pts → 항상 같은 그림
    //   step  한 번에 밀어넣는 점 개수. Infinity = 즉시 완성, 작은 값 = 점진 생성.
    //         난수 소비가 경로 길이에만 의존하므로 step 이 얼마든 결과는 동일하다.
    function addStroke(pts, seed, { step = Infinity } = {}) {
        const s = createStroke(CFG, nextId++, nowBirth(), seed);
        for (let i = 0; i < pts.length; i++) {
            pushPoint(s, CFG, pts[i].x, pts[i].y);
            if ((i + 1) % step === 0) growStroke(s, CFG);
        }
        growStroke(s, CFG); // 최종 기하
        if (s.spine && (s.compPolys.length || s.decor.length)) {
            strokes.push(s);
            bakeStroke(s);
        }
        return s;
    }

    // ───────────────────────── 입력 ─────────────────────────
    // dispose() 에서 전부 떼기 위해 등록한 리스너를 모아둔다. 안 떼면 다른 receiver 로
    // 전환한 뒤에도 살아남아 입력을 가로챈다.
    const listeners = [];
    const on = (target, type, fn, opt) => {
        target.addEventListener(type, fn, opt);
        listeners.push([target, type, fn, opt]);
    };

    const onPointerDown = e => {
        // 자라는 중인 큐 획이 있으면 먼저 완성시켜서 잃지 않게 한다
        finishGrowing();
        drawingByMouse = true;
        // 마우스 입력은 획 순번으로 시드를 만든다 (세션 시드와 섞어서 새로고침마다 다르게).
        // 자모 입력으로 갈 때는 여기가 hashSeed(cho, jung, jong ?? '', wordId) 로 바뀐다
        // → 같은 글자면 항상 같은 모양.
        const id = nextId++;
        liveStroke = createStroke(CFG, id, nowBirth(), hashSeed(CFG.seed, 'mouse', id));
        pushPoint(liveStroke, CFG, e.clientX, e.clientY);
        try {
            overlay.setPointerCapture?.(e.pointerId);
        } catch {
            /* 합성 이벤트 등 유효하지 않은 pointerId */
        }
        e.preventDefault();
    };

    const onPointerMove = e => {
        if (!drawingByMouse || !liveStroke) return; // 큐가 자라는 중인 건 건드리지 않는다
        pushPoint(liveStroke, CFG, e.clientX, e.clientY);
    };

    function endStroke() {
        if (!drawingByMouse || !liveStroke) return;
        drawingByMouse = false;
        const s = liveStroke;
        liveStroke = null;
        growStroke(s, CFG); // 최종 기하
        field.clear('live');
        if (s.spine && (s.compPolys.length || s.decor.length)) {
            strokes.push(s);
            bakeStroke(s);
        }
    }
    if (opts.mouse) {
        on(overlay, 'pointerdown', onPointerDown);
        on(window, 'pointermove', onPointerMove);
        on(window, 'pointerup', endStroke);
        on(window, 'pointercancel', endStroke);
    }

    const onKeyDown = e => {
        const k = e.key.toLowerCase();
        if (k === '1') CFG.shade = 0;
        else if (k === '2') CFG.shade = 1;
        else if (k === '3') CFG.shade = 2;
        else if (k === '4') CFG.shade = 3;
        else if (k === 'z') {
            strokes.pop();
            replayAll();
        } else if (k === 'c') {
            dropPending();
            strokes.length = 0;
            replayAll();
            particles.reset();
        } else if (k === 'g') {
            CFG.grow.on = !CFG.grow.on;
            if (!CFG.grow.on) growth.clear();
        } else if (k === 'p') {
            CFG.part.on = !CFG.part.on;
            if (CFG.part.on) particles.reset();
        } else if (k === 's') savePNG();
    };
    if (opts.keys) on(window, 'keydown', onKeyDown);

    // WebGL(goo) + 2D 오버레이(얇은 잉크)를 한 장으로 합친다. 결과는 **투명 배경**이다
    // — 종이색은 캔버스 CSS 배경이라 비트맵에 안 들어간다(drawImage 는 비트맵만 읽는다).
    // preserveDrawingBuffer: true 라서 마지막 프레임을 그대로 읽을 수 있다.
    function compositeCanvas() {
        const out = document.createElement('canvas');
        out.width = glCanvas.width;
        out.height = glCanvas.height;
        const c = out.getContext('2d');
        c.drawImage(glCanvas, 0, 0);
        c.drawImage(overlay, 0, 0);
        return out;
    }

    function savePNG() {
        compositeCanvas().toBlob(b => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `trail_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
        });
    }

    // ─────────────────────── 렌더 루프 ───────────────────────
    const liveSegs = [];
    const lightN = (() => {
        const [x, y, z] = CFG.light;
        const l = Math.hypot(x, y, z) || 1;
        return [x / l, y / l, z / l];
    })();

    let lastT = performance.now();

    function frame(now) {
        requestAnimationFrame(frame);

        // dt 를 캡한다 — 탭을 다시 활성화하면 now 가 크게 튀어서 성장/파티클이 순간이동한다
        const dt = Math.min((now - lastT) / 1000, 1 / 20);
        lastT = now;
        const time = (now - t0) / 1000;

        // 큐에 대기 중인 획을 growPx 만큼 전진시킨다 (마우스로 그리는 중이면 양보)
        if (!drawingByMouse) advanceGrowing();

        // 그리는 중인 획: 기하 갱신 → live 필드 전체 재스탬프 (누적하면 안 된다)
        if (liveStroke) {
            growStroke(liveStroke, CFG);
            liveSegs.length = 0;
            collectSegs(liveStroke, liveSegs);
            field.clear('live');
            field.stamp('live', new Float32Array(liveSegs), liveSegs.length / FLOATS_PER_SEG);
        }

        const tex = field.textures();
        const fieldTexel = field.texel();
        const sim = {
            bakedTex: tex.baked,
            liveTex: tex.live,
            fieldTexel,
            th: CFG.goo.th,
            time,
            dt,
        };

        // ── 성장장 갱신 (밀도장을 읽기만 한다)
        if (CFG.grow.on)
            growth.step({
                ...sim,
                nowMin: nowBirth(),
                decay: CFG.grow.decay,
                outward: CFG.grow.outward,
                curlAmp: CFG.grow.curlAmp,
                curlScale: CFG.grow.curlScale,
                curlSpeed: CFG.grow.curlSpeed,
                source: CFG.grow.source,
                bandLo: CFG.grow.bandLo,
                bandHi: CFG.grow.bandHi,
                ageDelay: CFG.grow.ageDelay,
            });

        // ── 아래 레이어 — 종이 + goo + 성장
        field.composite(
            {
                th: CFG.goo.th,
                edge: CFG.goo.edge,
                paper: hex2rgb(CFG.paper),
                ink: hex2rgb(CFG.ink),
                shade: CFG.shade,
                light: lightN,
                normalZ: CFG.normalZ,
                amb: CFG.amb,
                diff: CFG.diff,
                spec: CFG.spec,
                specPow: CFG.specPow,
                fres: CFG.fres,
                bands: CFG.bands,
                growthTex: growth.texture(),
                growInk: hex2rgb(CFG.grow.ink),
                growGain: CFG.grow.on ? CFG.grow.gain : 0,
                growOpacity: CFG.grow.opacity,
            },
            glCanvas.width,
            glCanvas.height,
        );

        // ── 파티클 — goo 합성 결과 위에 알파 블렌딩
        if (CFG.part.on) {
            particles.step({
                ...sim,
                spawnTol: CFG.part.spawnTol,
                spawnRate: CFG.part.spawnRate,
                lifespan: CFG.part.lifespan,
                lifeVar: CFG.part.lifeVar,
                curlAmp: CFG.part.curlAmp,
                curlScale: CFG.part.curlScale,
                curlSpeed: CFG.part.curlSpeed,
                flow: CFG.part.flow,
                repel: CFG.part.repel,
            });
            particles.draw(
                { size: CFG.part.size, ink: hex2rgb(CFG.part.ink), opacity: CFG.part.opacity },
                glCanvas.width,
                glCanvas.height,
                dpr,
            );
        }

        // ── 위 레이어 — 얇은 크리스프 잉크
        octx.clearRect(0, 0, W, H);
        octx.drawImage(ink2d, 0, 0, W, H);
        if (liveStroke) drawStrokeInk(octx, liveStroke);
    }

    on(window, 'resize', resize);
    resize();
    let raf = requestAnimationFrame(frame);

    function dispose() {
        cancelAnimationFrame(raf);
        raf = 0;
        for (const [t, type, fn, opt] of listeners) t.removeEventListener(type, fn, opt);
        listeners.length = 0;
        dropPending();
        strokes.length = 0;
        overlay.remove();
        if (ownGl) glCanvas.remove();
        // body 배경은 전역이다 — 다른 receiver 로 전환했을 때 남지 않게 되돌린다
        if (opts.bodyBg !== false) document.body.style.background = prevBodyBg;
        if (opts.global && window.TRAIL === api) delete window.TRAIL;
    }

    // 콘솔 튜닝용
    //   즉시 반영     goo.th / goo.edge / shade / normalZ / grow.* / part.* (전부 uniform)
    //   replay() 필요 goo.reach / goo.spine / goo.companion  (스탬프 시점에 굽히는 값)
    //   rebuild 필요  goo.fieldScale / grow.scale → TRAIL.rebuild()  (part.side 는 새로고침)
    //   TRAIL.probe(x, y) → 그 화면좌표의 밀도값. th 를 감으로 찍지 말고 이걸로 확인.
    const api = {
        CFG,
        strokes,
        dispose,
        canvases: { gl: glCanvas, overlay, ink2d },
        captureCanvas: () => compositeCanvas(), // 캡처용 합성 (captureFrame 이 dataURL 로 감쌈)
        replay: replayAll,
        rebuild: resize,
        clear: () => (dropPending(), (strokes.length = 0), replayAll(), particles.reset()),
        save: savePNG,
        probe: (x, y) => field.probe(x, y),
        pstats: () => particles.stats(),

        // ── 자모 생성기 / receiver 계약이 쓸 API
        hashSeed, // 자모에서 시드 뽑기 — hashSeed(cho, jung, jong ?? '', wordId)
        addStroke, // 즉시 완성 (테스트/replay 용)
        queueStroke, // 점진 생성 큐에 넣기 — growPx 씩 자란다
        extendGrowing, // 자라는 중인 획에 점 이어붙이기 ("단어 = 획" 용)
        replaceTail, // 자라는 획의 뒤쪽 교체 (조합/연음으로 바뀐 음절 갈아끼우기)
        finishGrowing, // 자라는 중인 획 즉시 완성 (main.js 계약)
        flushQueue, // 큐까지 전부 완성 (제출/캡처 직전 계약)
        pending: () => ({
            queued: queue.length,
            growing: growing ? growing.i : null,
            points: growing ? growing.pts.length : 0,
            hold: growing ? !!growing.hold : false,
        }),
        // 프레임 루프가 매 프레임 호출하는 것과 같은 것. n 프레임만큼 수동 전진.
        // 프레임 단위로 들여다볼 때, 그리고 rAF 없이(헤드리스) 검증할 때 쓴다.
        step: (n = 1) => {
            for (let k = 0; k < n; k++) advanceGrowing();
        },
    };
    if (opts.global) window.TRAIL = api;
    return api;
}
