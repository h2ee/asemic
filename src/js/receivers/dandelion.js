// ── dandelion.js ──────────────────────────────────────────────────────────────
// 민들레(🌼) 수신자 — 2026-08-31 전면 재설계 (dandelion_redesign_spec.md 기준)
//
// 구버전(5개 고정 식물 + p5 flower math 포팅)을 완전히 폐기하고,
// "자모 → 음절 → 단어" 3단 궤적(trajectory) 모델 + WebGL2 SDF 렌더링으로 교체.
//
// ── 3단 궤적 모델 (전부 2D 바닥 평면 위) ────────────────────────────────────────
//  Tier 1 (micro) — 자모 이동:
//    음절 하나가 들어오면 CHO→JUNG(→JONG) 세 자모 좌표를 잇는 짧은 폴리라인 생성.
//    각 세그먼트에는 wind-swirl(curl) 장식이 붙음 — curl 세기/주파수 = 소스 자모의
//    긴장도(z). 새로 자라는(가장 최근) 음절만 growT로 점진적으로 그려짐.
//  Tier 2 (meso) — 음절 blob:
//    음절이 "닫히면"(뒤에 다음 음절이 생기거나 단어 경계) blobT가 0→1로 올라가며
//    세그먼트/노드가 굵어져 SDF smooth-union으로 하나의 blob(꽃/씨앗머리)으로 뭉침.
//    blob 크기 = 모음 F2, 색 = 초성(조음위치→hue, 긴장도→채도). 종성이 있으면
//    씨앗머리(탈채도된 크림/흰색)로 전환.
//  Tier 3 (macro) — 단어 진행:
//    같은 단어의 연속 음절 anchor를 잇는 줄기(stem) 커넥터. Tier 1과 같은 curl로
//    장식. 단어 경계(공백)에서 끊김.
//
// ── 렌더링 ────────────────────────────────────────────────────────────────────
//  WebGL2 프래그먼트 셰이더 하나, 화면 전체 quad 1 draw call. 모든 엔트리(세그먼트/
//  노드/커넥터)를 RGBA32F 데이터 텍스처(width=MAX_ENTRIES, height=3)에 패킹하고
//  픽셀마다 순회하며 2D SDF(curl 캡슐 / 원)를 smooth-min으로 합침 —
//  mycelium.js의 SDF/smin 접근을 2D로 축소 적용(3D raymarch 아님).
//  출력은 non-premultiplied alpha(잉크색, 커버리지) — 캔버스 CSS 배경이 종이색이고,
//  submit 캡처 PNG는 잉크 밖이 투명이라 mycelium과 동일한 스택 히스토리에 얹힘.
//
// ── 3D 뷰 레이어 ──────────────────────────────────────────────────────────────
//  ENABLE_3D_PROTOTYPE 플래그로만 켜지는 프로토타입. 이번 범위는 "2D 바닥 좌표계와
//  top-down 직교 카메라 포커스가 정확히 겹치는지"만 확인. 생성 로직(SDF 블롭/가루
//  등)은 이번 범위 아님 — 플레이스홀더 지오메트리(anchor 구 + 레이아웃 사각형)만.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

// ── 튜닝 상수 (h2ee가 자주 바꿈 — 값은 항상 이 파일을 재확인) ──────────────────
const PAPER = [0.965, 0.955, 0.925]; // 종이색(캔버스 CSS 배경 + 셰이더 col 기본값)
const STEM = [0.42, 0.53, 0.29]; // 줄기/커넥터 녹색
const SEED = [0.93, 0.92, 0.86]; // 씨앗머리 크림/흰색 (종성 있는 음절이 여기로 섞임)

const SYL_SIZE = 120; // 음절 하나의 화면 기준 크기(px). main.js 레이아웃이 참조.
const WRAP_STEP = 150; // 음절 간 자간(px) — SYL_SIZE보다 살짝 커서 커넥터가 보임
const LINE_HEIGHT_RATIO = 1.9;

const LOCAL_EXTENT = 0.4; // 자모 로컬 좌표(-1~1)를 anchor 주변 몇 px로 펼칠지 = SYL_SIZE * 이 값
const STROKE_R = SYL_SIZE * 0.028; // Tier 1 세그먼트/노드 기본 두께(px)
const SMIN_K = 6.0; // SDF smooth-union 반경(px) — blob 뭉침 정도
const EDGE_AA = 1.6; // 실루엣 안티에일리어싱 폭(px)

const GROW_EASE = 0.09; // 최근 음절 growT 접근 속도
const BLOB_EASE = 0.055; // 닫힌 음절 blobT 접근 속도
const BLOB_EASE_FINISH = 0.28; // finishGrowing()/flushQueue() 중 blobT 가속

const WIND_SWAY_PX = 6.0; // 전역 바람: 픽셀 x-스윙 진폭(px)
const WIND_SWAY_SPEED = 0.0011; // 전역 바람 속도(rad/ms)
const WIND_CURL_SPEED = 0.004; // curl 장식 flutter 속도(rad/ms)

const MAX_ENTRIES = 360; // 데이터 텍스처 정적 상한 (음절당 ≈6엔트리 × MAX_SYL(50) 일부 여유 — 40음절쯤부터 오래된 엔트리가 잘림)
const FRAME_INTERVAL = 1000 / 30;

// 3D 프로토타입 — 기본 OFF. 콘솔에서 rm.current.set3DPrototype(true)로 토글.
const ENABLE_3D_PROTOTYPE = false;

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)];
}

// 자모 문자 → 정규화 좌표. cho/jong: pos = [x,y,z] 0~1 그대로.
// jung: [F1,F2,F3] → open/front/z3 정규화 (main.js·signal.js와 같은 기준 범위).
// 겹받침(pos 없음)은 cluster_front로 대표 자음 참조.
function jamoCoord(JAMO, ch, role) {
    if (!ch || !JAMO) return null;
    if (role === 'jung') {
        const e = JAMO[ch];
        const p = e?.pos ?? [500, 1200, 2400];
        return {
            open: clamp01((p[0] - 250) / 650), // F1: 개구도
            front: clamp01((p[1] - 580) / 2020), // F2: 혀 전후
            z: clamp01((p[2] - 2080) / 1120), // F3
            yang: e?.yang ? 1 : 0,
            diph: e?.diphthong ? 1 : 0,
            type: 'jung',
        };
    }
    let e = role === 'jong' ? (JAMO[ch + '_jong'] ?? JAMO[ch]) : (JAMO[ch]?.cho ?? JAMO[ch]);
    let pos = e?.pos;
    if (!pos && e?.cluster_front) pos = JAMO[e.cluster_front + '_jong']?.pos;
    pos = pos ?? [0.5, 0.5, 0.5];
    return { x: pos[0], y: pos[1], z: pos[2], type: role };
}

// ── 음절 하나 → 궤적 지오메트리 (Tier 1 + Tier 2 파라미터) ────────────────────
// 위치/크기는 로컬 정규화(-1~1)로만 계산. 실제 px 변환은 _pack()에서 anchor +
// 현재 SYL_SIZE 기준으로 매 프레임 수행(리사이즈/바람/growth와 독립).
function buildSyllable(JAMO, syl, key) {
    const cho = jamoCoord(JAMO, syl.cho, 'cho');
    const jung = jamoCoord(JAMO, syl.jung, 'jung');
    const jong = syl.jong ? jamoCoord(JAMO, syl.jong, 'jong') : null;

    const choZ = cho?.z ?? 0.3;
    const jungZ = jung?.z ?? 0.3;

    // 노드 로컬 좌표 (-1~1). 화면 y는 아래로 증가.
    //  CHO — 조음위치(x) → 좌우, 조음방법(y) → 상하. 살짝 위쪽에서 시작.
    //  JUNG — 혀 전후(front) → 좌우, 개구도(open) → 상하(열릴수록 아래로).
    //  JONG — "형태가 끝나는 지점": 조음위치/방법 + 아래로 밀어냄.
    const nodes = [
        { x: (cho.x - 0.5) * 1.6, y: (cho.y - 0.5) * 1.5 - 0.15, w: 0.62 },
        { x: (jung.front - 0.5) * 1.8, y: (jung.open - 0.5) * 1.7 + 0.1, w: 1.0 },
    ];
    if (jong) nodes.push({ x: (jong.x - 0.5) * 1.4, y: (jong.y - 0.5) * 1.2 + 0.75, w: 0.8 });

    // 세그먼트 (Tier 1) — curl 세기/주파수 = 소스 자모 긴장도
    const segs = [
        { i0: 0, i1: 1, curlAmp: SYL_SIZE * (0.05 + choZ * 0.16), curlFreq: 1.5 + choZ * 3.5 },
    ];
    if (jong) {
        segs.push({ i0: 1, i1: 2, curlAmp: SYL_SIZE * (0.05 + jungZ * 0.16), curlFreq: 1.5 + jungZ * 3.5 });
    }

    // 색 — 초성 조음위치(x): hue 50°(gold) → 100°(yellow-green), 긴장도(z): 채도
    const choX = cho?.x ?? 0.5;
    let col = hslToRgb(lerp(0.14, 0.28, choX), 0.34 + choZ * 0.42, 0.5);
    if (jong) col = col.map((c, i) => lerp(c, SEED[i], 0.55)); // 종성 → 씨앗머리로 탈채도

    // blob 반경 — 모음 F2 낮을수록(후설/원순) 큰 머리
    const blobR = SYL_SIZE * (0.11 + (1 - jung.front) * 0.15);

    return {
        key,
        wordId: syl.wordId,
        anchorUV: [0, 0], // _pack 직전 update()에서 positions로 채움
        nodes,
        segs,
        col,
        blobR,
        growT: 0,
        blobT: 0,
        _lastNodeWorld: null,
    };
}

// ── 셰이더 ────────────────────────────────────────────────────────────────────
const VERT = `#version 300 es
in vec2 a_uv;
uniform vec2 u_res;
out vec2 v_px;
void main() {
    v_px = a_uv * u_res;          // 논리 px (y-down) — anchor/노드 좌표와 같은 공간
    vec2 clip = a_uv * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_px;
out vec4 outColor;

uniform sampler2D u_data;  // width=MAX_ENTRIES, height=3
                           //  row0: ax, ay, bx, by
                           //  row1: r, g, b, radius
                           //  row2: curlAmp, curlFreq, growT, _
uniform int   u_count;
uniform float u_time;      // wall-clock ms (performance.now / rAF timestamp)
uniform float u_aa;
uniform float u_k;         // smooth-union 반경(px)
uniform vec3  u_paper;

#define MAXE ${MAX_ENTRIES}
#define PI 3.14159265

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
    vec2 p = v_px;

    // 전역 바람 — y에 따라 위상차를 줘서 화면 전체가 한 덩어리로 흔들리지 않게.
    float sway = sin(u_time * ${WIND_SWAY_SPEED.toFixed(6)} + p.y * 0.010) * ${WIND_SWAY_PX.toFixed(2)}
               + sin(u_time * ${(WIND_SWAY_SPEED * 2.1).toFixed(6)} + p.y * 0.031) * ${(WIND_SWAY_PX * 0.35).toFixed(3)};
    p.x += sway;

    float scene = 1e9;
    float nearest = 1e9;
    vec3  col = u_paper;

    for (int i = 0; i < MAXE; i++) {
        if (i >= u_count) break;
        vec4 r0 = texelFetch(u_data, ivec2(i, 0), 0);
        vec4 r1 = texelFetch(u_data, ivec2(i, 1), 0);
        vec4 r2 = texelFetch(u_data, ivec2(i, 2), 0);

        float growT = r2.z;
        if (growT <= 0.001) continue;

        vec2 a = r0.xy, b = r0.zw;
        float rad = r1.w;
        vec2 ba = b - a;
        float baLen = length(ba);

        float d;
        if (baLen < 0.5) {
            // 노드(원)
            d = length(p - a) - rad;
        } else {
            // curl 캡슐 — 축을 따라 growT까지만 그리고, 수직으로 sin 변위(양끝 fade).
            // 엄밀한 SDF는 아니지만 얇은 스트로크에선 시각적으로 충분(mycelium과 같은 근사).
            vec2 dir = ba / baLen;
            vec2 perp = vec2(-dir.y, dir.x);
            float t = clamp(dot(p - a, dir) / baLen, 0.0, 1.0);
            t = min(t, growT);
            vec2 axP = a + ba * t;
            float env = sin(t * PI);
            float curl = sin(t * r2.y * PI + u_time * ${WIND_CURL_SPEED.toFixed(4)}) * r2.x * env;
            d = length(p - (axP + perp * curl)) - rad;
        }

        if (d < nearest) { nearest = d; col = r1.rgb; }
        scene = smin(scene, d, u_k);
    }

    float cov = 1.0 - smoothstep(0.0, u_aa, scene);
    outColor = vec4(col, cov);
}
`;

function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('dandelion shader compile error: ' + log);
    }
    return sh;
}

// ── DandelionReceiver ─────────────────────────────────────────────────────────
export class DandelionReceiver {
    constructor() {
        this._canvas = null;
        this._ownCanvas = false;
        this._gl = null;
        this._prog = null;
        this._quadBuf = null;
        this._tex = null;
        this._u = null;
        this._raf = null;
        this._lastFrame = 0;

        this._JAMO = null;
        this._syls = [];
        this._finishAll = false;
        this._active = false;

        this._cssW = window.innerWidth;
        this._cssH = window.innerHeight;
        this._dataArr = new Float32Array(MAX_ENTRIES * 3 * 4);
        this._count = 0;

        // main.js 레이아웃 엔진이 읽는 값
        this.sylSize = SYL_SIZE;
        this.wrapStep = WRAP_STEP;
        this.wrapMargin = SYL_SIZE * 0.5;
        this.lineHeightRatio = LINE_HEIGHT_RATIO;

        this._three = null; // { renderer, scene, camera, markers, canvas } — 프로토타입만
        this._use3D = ENABLE_3D_PROTOTYPE;
    }

    async init(canvas) {
        if (canvas) {
            this._canvas = canvas;
        } else {
            this._canvas = document.createElement('canvas');
            this._ownCanvas = true;
            document.body.appendChild(this._canvas);
        }
        Object.assign(this._canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: `rgb(${PAPER.map(c => Math.round(c * 255)).join(',')})`,
        });

        const gl = this._canvas.getContext('webgl2', {
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true, // captureFrame()의 readPixels용
            antialias: true,
        });
        if (!gl) throw new Error('dandelion: WebGL2 not available');
        this._gl = gl;

        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        this._prog = gl.createProgram();
        gl.attachShader(this._prog, vs);
        gl.attachShader(this._prog, fs);
        gl.linkProgram(this._prog);
        if (!gl.getProgramParameter(this._prog, gl.LINK_STATUS)) {
            throw new Error('dandelion program link error: ' + gl.getProgramInfoLog(this._prog));
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        this._quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
        const aUv = gl.getAttribLocation(this._prog, 'a_uv');
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

        this._tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this._u = {
            res: gl.getUniformLocation(this._prog, 'u_res'),
            data: gl.getUniformLocation(this._prog, 'u_data'),
            count: gl.getUniformLocation(this._prog, 'u_count'),
            time: gl.getUniformLocation(this._prog, 'u_time'),
            aa: gl.getUniformLocation(this._prog, 'u_aa'),
            k: gl.getUniformLocation(this._prog, 'u_k'),
            paper: gl.getUniformLocation(this._prog, 'u_paper'),
        };

        // 블렌딩 불필요 — 화면 전체 quad 1 draw call, 픽셀마다 outColor를 한 번만 씀.
        // non-premultiplied (col, cov)를 그대로 버퍼에 남겨야 캡처 PNG가 깔끔함.
        gl.disable(gl.BLEND);

        this._resize();
        window.addEventListener('resize', this._onResize);

        if (this._use3D) this._init3DPrototype();

        this._raf = requestAnimationFrame(this._animate);
    }

    // sylItems : { cho, jung, jong, wordId } 배열 (공백 제외)
    // positions: main.js calcTextboxLayout 결과 (uv 0~1) — anchor로 사용
    update(sylItems, positions, JAMO) {
        if (JAMO) this._JAMO = JAMO;
        if (!this._JAMO) return;

        if (!sylItems?.length) {
            this._syls = [];
            this._finishAll = false;
            this._active = false;
            return;
        }

        const keys = sylItems.map(s => `${s.cho}|${s.jung}|${s.jong}|${s.wordId}`);

        // append-only 프리픽스 매칭 — 일치하는 앞부분은 growth 상태 보존, 뒤는 새로 빌드
        const old = this._syls;
        let match = 0;
        while (match < old.length && match < keys.length && old[match].key === keys[match]) match++;

        const next = old.slice(0, match);
        for (let i = match; i < sylItems.length; i++) {
            next.push(buildSyllable(this._JAMO, sylItems[i], keys[i]));
        }
        // anchor는 매 update 갱신 (타이핑 중 자간/줄바꿈으로 위치가 계속 바뀜)
        for (let i = 0; i < next.length; i++) {
            if (positions?.[i]) next[i].anchorUV = positions[i];
        }
        // 뒤로 음절이 새로 붙었으면 직전까지는 전부 "닫힌" 것 — growth 강제 완료
        for (let i = 0; i < next.length - 1; i++) next[i].growT = 1;

        this._syls = next;
        this._finishAll = false;
        this._active = true;
    }

    // 공백(단어 경계) 발생 시 main.js가 호출 — 자라던 음절 즉시 완성
    finishGrowing() {
        this._finishAll = true;
    }

    // submit — 큐/애니메이션이 정착할 때까지 대기 후 2프레임 여유
    flushQueue() {
        this._finishAll = true;
        const wait2 = res => requestAnimationFrame(() => requestAnimationFrame(res));
        return new Promise(resolve => {
            const t0 = performance.now();
            const check = () => {
                const settled = this._syls.every(s => s.growT >= 0.999 && s.blobT >= 0.98);
                if (settled || performance.now() - t0 > 1400) wait2(resolve);
                else requestAnimationFrame(check);
            };
            requestAnimationFrame(check);
        });
    }

    // 현재 프레임을 투명 배경 PNG로 — mycelium.captureFrame()과 같은 계약
    captureFrame() {
        this._renderNow();
        const gl = this._gl;
        const w = this._canvas.width;
        const h = this._canvas.height;
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            const src = (h - 1 - y) * w * 4;
            img.data.set(buf.subarray(src, src + w * 4), y * w * 4);
        }
        ctx.putImageData(img, 0, 0);
        return cvs.toDataURL('image/png');
    }

    // submit 후 새 줄 시작 — 누적 궤적 비움 (히스토리 이미지는 main.js가 관리)
    clearAccum() {
        this._syls = [];
        this._finishAll = false;
        this._active = false;
        this._count = 0;
        this._renderNow();
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        const gl = this._gl;
        if (gl) {
            if (this._tex) gl.deleteTexture(this._tex);
            if (this._quadBuf) gl.deleteBuffer(this._quadBuf);
            if (this._prog) gl.deleteProgram(this._prog);
        }
        if (this._three) {
            this._three.renderer.dispose();
            this._three.canvas.remove();
            this._three = null;
        }
        if (this._ownCanvas && this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
        this._canvas = null;
        this._gl = null;
    }

    // ── 콘솔 토글 — 3D 프로토타입 ────────────────────────────────────────────────
    set3DPrototype(on) {
        this._use3D = !!on;
        if (this._use3D && !this._three) this._init3DPrototype();
        if (this._three) this._three.canvas.style.display = this._use3D ? 'block' : 'none';
    }

    // ── 내부 ──────────────────────────────────────────────────────────────────
    _onResize = () => this._resize();

    _resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this._cssW = window.innerWidth;
        this._cssH = window.innerHeight;
        this._canvas.width = Math.round(this._cssW * dpr);
        this._canvas.height = Math.round(this._cssH * dpr);
        this._gl?.viewport(0, 0, this._canvas.width, this._canvas.height);
        if (this._three) this._resize3DPrototype();
    }

    _animate = ts => {
        this._raf = requestAnimationFrame(this._animate);
        if (ts - this._lastFrame < FRAME_INTERVAL) return;
        this._lastFrame = ts;

        this._tick();
        this._renderNow(ts);
    };

    // growT / blobT 진행
    _tick() {
        const n = this._syls.length;
        for (let i = 0; i < n; i++) {
            const s = this._syls[i];
            const isLast = i === n - 1;
            if (this._finishAll || !isLast) {
                s.growT = 1;
                const ease = this._finishAll ? BLOB_EASE_FINISH : BLOB_EASE;
                s.blobT += (1 - s.blobT) * ease;
            } else {
                s.growT += (1 - s.growT) * GROW_EASE;
                if (s.growT > 0.995) s.growT = 1;
            }
        }
    }

    // 궤적 → 데이터 텍스처 엔트리 패킹
    _pack() {
        const W = this._cssW;
        const H = this._cssH;
        const half = SYL_SIZE * LOCAL_EXTENT;
        const arr = this._dataArr;
        let e = 0;

        const put = (ax, ay, bx, by, r, g, b, rad, curlAmp, curlFreq, growT) => {
            if (e >= MAX_ENTRIES) return;
            const o0 = e * 4;
            const o1 = (MAX_ENTRIES + e) * 4;
            const o2 = (MAX_ENTRIES * 2 + e) * 4;
            arr[o0] = ax;
            arr[o0 + 1] = ay;
            arr[o0 + 2] = bx;
            arr[o0 + 3] = by;
            arr[o1] = r;
            arr[o1 + 1] = g;
            arr[o1 + 2] = b;
            arr[o1 + 3] = rad;
            arr[o2] = curlAmp;
            arr[o2 + 1] = curlFreq;
            arr[o2 + 2] = growT;
            arr[o2 + 3] = 0;
            e++;
        };

        const syls = this._syls;
        for (let i = 0; i < syls.length; i++) {
            const s = syls[i];
            const ax = s.anchorUV[0] * W;
            const ay = s.anchorUV[1] * H;
            const nodeW = s.nodes.map(nd => [ax + nd.x * half, ay + nd.y * half]);

            // Tier 3 — 같은 단어의 직전 음절과 잇는 줄기 커넥터
            const prev = syls[i - 1];
            if (prev && prev.wordId === s.wordId && prev._lastNodeWorld) {
                const A = prev._lastNodeWorld;
                put(
                    A[0], A[1], nodeW[0][0], nodeW[0][1],
                    STEM[0], STEM[1], STEM[2],
                    STROKE_R * 1.25, SYL_SIZE * 0.045, 1.2, s.growT,
                );
            }
            s._lastNodeWorld = nodeW[nodeW.length - 1];

            // Tier 1 — 세그먼트 (blobT에 따라 굵어짐)
            const segRad = lerp(STROKE_R, s.blobR * 0.5, s.blobT * 0.6);
            for (const seg of s.segs) {
                const A = nodeW[seg.i0];
                const B = nodeW[seg.i1];
                put(
                    A[0], A[1], B[0], B[1],
                    s.col[0], s.col[1], s.col[2],
                    segRad, seg.curlAmp, seg.curlFreq, s.growT,
                );
            }

            // Tier 2 — 노드 (blobT에 따라 원이 커져 smooth-union으로 blob 형성)
            for (let k = 0; k < nodeW.length; k++) {
                const P = nodeW[k];
                const rad = lerp(STROKE_R * 1.4, s.blobR * s.nodes[k].w, s.blobT);
                put(P[0], P[1], P[0], P[1], s.col[0], s.col[1], s.col[2], rad, 0, 0, s.growT);
            }
        }

        this._count = e;
    }

    _renderNow(ts) {
        const gl = this._gl;
        if (!gl || !this._prog) return;

        this._pack();

        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MAX_ENTRIES, 3, 0, gl.RGBA, gl.FLOAT, this._dataArr);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this._prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        const aUv = gl.getAttribLocation(this._prog, 'a_uv');
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(this._u.res, this._cssW, this._cssH);
        gl.uniform1i(this._u.count, this._count);
        gl.uniform1f(this._u.time, ts ?? performance.now());
        gl.uniform1f(this._u.aa, EDGE_AA);
        gl.uniform1f(this._u.k, SMIN_K);
        gl.uniform3f(this._u.paper, PAPER[0], PAPER[1], PAPER[2]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.uniform1i(this._u.data, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (this._three) this._render3DPrototype();
    }

    // ── 3D 프로토타입 레이어 ──────────────────────────────────────────────────
    // 목적(이번 범위): 2D 바닥 좌표계(px, y-down)와 top-down 직교 카메라 포커스가
    // 정확히 겹치는지 눈으로 확인. 생성 로직은 없음 — anchor마다 작은 구 + 현재
    // 입력 영역을 감싸는 와이어프레임 사각형만. 별도 투명 오버레이 캔버스 사용
    // (메인 WebGL2 컨텍스트와 분리).
    _init3DPrototype() {
        const canvas = document.createElement('canvas');
        Object.assign(canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '3',
        });
        document.body.appendChild(canvas);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        // 바닥 평면을 XY(z=0)로 두고 카메라가 +Z에서 -Z로 내려다봄 → 화면 x=px.x, y=px.y(부호 반전).
        const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 4000);
        camera.position.set(0, 0, 1000);
        camera.up.set(0, -1, 0); // y-down 화면과 정렬
        camera.lookAt(0, 0, 0);

        const markers = new THREE.Group();
        scene.add(markers);

        const bounds = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
            new THREE.LineBasicMaterial({ color: 0x4a8a3a, transparent: true, opacity: 0.5 }),
        );
        scene.add(bounds);

        this._three = { renderer, scene, camera, markers, bounds, canvas };
        this._resize3DPrototype();
    }

    _resize3DPrototype() {
        const t = this._three;
        if (!t) return;
        t.renderer.setSize(this._cssW, this._cssH, false);
        t.camera.left = 0;
        t.camera.right = this._cssW;
        t.camera.top = 0;
        t.camera.bottom = this._cssH;
        t.camera.updateProjectionMatrix();
    }

    _render3DPrototype() {
        const t = this._three;
        if (!t) return;
        const W = this._cssW;
        const H = this._cssH;

        while (t.markers.children.length) t.markers.remove(t.markers.children[0]);
        let minX = W,
            minY = H,
            maxX = 0,
            maxY = 0;
        for (const s of this._syls) {
            const x = s.anchorUV[0] * W;
            const y = s.anchorUV[1] * H;
            const m = new THREE.Mesh(
                new THREE.SphereGeometry(Math.max(s.blobR * (0.3 + s.blobT * 0.7), 4), 12, 8),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(s.col[0], s.col[1], s.col[2]),
                    transparent: true,
                    opacity: 0.45,
                }),
            );
            m.position.set(x, y, 0);
            t.markers.add(m);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        if (this._syls.length) {
            t.bounds.visible = true;
            t.bounds.position.set((minX + maxX) / 2, (minY + maxY) / 2, 0);
            t.bounds.scale.set(Math.max(maxX - minX, 1), Math.max(maxY - minY, 1), 1);
        } else {
            t.bounds.visible = false;
        }

        t.renderer.render(t.scene, t.camera);
    }
}
