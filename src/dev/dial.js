// ── dial.js — iPad 로터리 다이얼 (TD /controller 의 three.js 이식) ─────────────────
//
// 구멍(파란 원) 위에서 누르고 **시계 방향**으로 끌어 멈추개(금색 쐐기)까지 돌린 뒤 놓으면
// 그 구멍의 receiver 가 선택된다 → 브릿지로 {t:'receiver', name}. 멈추개까지 못 가면 그냥 되돌아간다.
//
// 원본: TD `/controller` (demo5). 모양·동작을 바꾸지 않고 옮기는 게 목적이라
//   - 제스처 로직은 `/controller/dial/dial_ext`(Dial 클래스)를 줄 단위로 옮겼고
//   - 판(dial_base·dial_outer)은 `look_mat/frag_toon` + `lightlib` GLSL 을 그대로,
//     그림자도 `cam_shadow`/`frag_shadow` 와 같은 손수 만든 그림자 맵(선형 거리 기록)으로 그린다
//   - 멈추개(dial_btn)·구멍 바닥(dial_inner)은 TD 기본 phongMAT 이라 셰이더 원문이 없다 —
//     TD 문서의 Phong Lighting Equation 순서대로 짜고 림라이트만 근사했다(PHONG 주석 참고)
// SCENE 의 숫자는 2026-10-02 TD 에서 읽은 값. TD 에서 룩을 바꿨으면 여기도 같이 옮길 것.
// 모델 OBJ 사본: src/dev/chrome/model/dial_*.obj (원본 chrome3D/OBJS/).
// 아웃라인 패스(render_normal → edge)는 TD 에서 Outline=Off 라 옮기지 않았다.

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { createBridge } from './bridge.js';
import baseUrl from './chrome/model/dial_base.obj?url';
import outerUrl from './chrome/model/dial_outer.obj?url';
import btnUrl from './chrome/model/dial_btn.obj?url';
import innerUrl from './chrome/model/dial_inner.obj?url';
import myceliumPng from './chrome/img/mycelium.png';
import signalPng from './chrome/img/signal.png';
import dandelionPng from './chrome/img/dandelion.png';
import soraPng from './chrome/img/sora.png';

// ── TD 에서 옮긴 값 ──────────────────────────────────────────────────────────
const SCENE = {
    // cam1 — ortho, 회전 없음. 화면 ↔ 월드가 선형이라 구멍 판정에 renderpick 이 필요 없다
    cam: { pos: [4.62874, 8.73578, 9.49403], orthowidth: 3.00257, near: 0.1, far: 1000 },
    // cam_shadow worldTransform (행 우선). look_mat Shadowdir/Shadowdist 식이 만든 결과값이다
    shadowCam: {
        matrix: [
            0.8864586, -0.1699591, 0.4304709, 4.52442,
            -0.01407173, 0.9198004, 0.3921344, 11.19103,
            -0.4625941, -0.3536683, 0.8129732, 6.221734,
            0, 0, 0, 1,
        ],
        orthowidth: 9.59487, // 렌더용 (cam_shadow.orthowidth)
        lookupOrtho: 9.6, // 조회용 (uShadowOrtho = look_mat Shadowortho) — TD 도 둘이 미세하게 다르다
        near: 0.1,
        far: 100,
        res: 1024,
    },
    // look_mat (Style = toon)
    look: {
        L0dir: [-1.6, -0.8, 1.0], L0color: [0.944, 1.0, 0.88],
        L1dir: [1.4, 0.24, 0.21], L1color: [0.44, 0.6, 1.0],
        amb: [0.06, 0.06, 0.08], key: 1.0, rim: 0.217, lightJitter: 0.163,
        baseColor: [0.989, 1.0, 0.984], bands: 5, shininess: 3.2, specStep: 0.41,
        rimStrength: -6.65, shadowStrength: 0.373,
        enableShadow: 1, shadowBias: 0.09, shadowMapStrength: 0.771, shadowSoftness: 0.0,
    },
    // light_dial — distant, 흰색, dimmer 1. phongMAT(멈추개·구멍 바닥)만 받는다. 표면 → 빛 방향
    phongLight: { toLight: [0.6552255, 0.4763353, 0.5863312], color: [1, 1, 1] },
    // phong1_v2 (dial_btn, 금색 멈추개)
    btn: {
        diff: [1.0, 0.91, 0.597], spec: [0.9, 0.9, 0.9], emit: [0, 0, 0], constant: [0.048, 0.048, 0.048], shininess: 27,
        rim: [
            { color: [1, 1, 1], center: 311, width: 0.424, strength: 2.06 },
            { color: [1.5, 1.5, 1.5], center: 212, width: 1.0, strength: 5.29 },
        ],
    },
    // phong_dial_inner_v4 (구멍 바닥, 파랑) — emitmap = 아이콘 시트(icons/dial_sheet)
    inner: {
        diff: [0.387, 0.581117, 1.0], spec: [0, 0, 1], emit: [1, 1, 1], constant: [0.06, 0.06, 0.06], shininess: 4,
        rim: [{ color: [0, 0.184314, 1], center: 219, width: 1.0, strength: 70.24 }],
    },
    // icons — dial_inner 의 uv = (월드xy - Inner) / Innersize (geo4/uv_map), 아이콘은 구멍 중심에
    icons: {
        innerX: 3.59, innerY: 7.704, innerSize: 2.087, iconScale: 0.55, sheet: 1024,
        place: [
            { src: myceliumPng, x: 5.091, y: 9.336, k: 0.5 },
            { src: signalPng, x: 4.45, y: 9.327, k: 0.5 },
            { src: dandelionPng, x: 4.149, y: 8.748, k: 0.48 },
            { src: soraPng, x: 4.601, y: 8.322, k: 0.48 },
        ],
    },
};

// /controller/dial — 공개 계약 par 들과 holes 테이블
const DIAL = {
    centerX: 4.6335,
    centerY: 8.7475,
    stopAngle: -41.8, // 멈추개 각도
    hitScale: 1.1, // 구멍 판정 반경 배수 (1.3 이상이면 h4 판정이 중심까지 덮는다)
    dragLag: 0.05, // 드래그 중 랙(초)
    returnLag: 0.25, // 놓았을 때 되돌아가는 랙(초)
    pressDepth: 0.035, // 멈추개에 닿았을 때 금색 쐐기가 밀려 들어가는 거리
    // 순서는 전화기 규칙 — 멈추개에서 반시계로 가까운 순서. 배정은 receiver 칸만 고치면 된다
    holes: [
        { name: 'h1', x: 5.078, y: 9.336, r: 0.295, receiver: 'mycelium' },
        { name: 'h2', x: 4.478, y: 9.307, r: 0.312, receiver: 'signal' },
        { name: 'h3', x: 4.149, y: 8.758, r: 0.3, receiver: 'dandelion' },
        { name: 'h4', x: 4.611, y: 8.362, r: 0.32, receiver: 'sora' },
    ],
};

// ── 셰이더 ───────────────────────────────────────────────────────────────────
// look_mat/vert 와 같다. vCamVec = 카메라 위치 - 월드 위치 (ortho 여도 TD 원본이 이렇게 쓴다)
const VERT = /* glsl */ `
out vec3 vWorldPos;
out vec3 vWorldNorm;
out vec3 vCamVec;
out vec2 vUv2;
uniform vec4 uUvXform; // dial_inner 전용 평면 uv: (x0, y0, 1/size, 사용여부)
void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
    vWorldPos = wp.xyz;
    vWorldNorm = normalize(mat3(modelMatrix) * normal);
    vCamVec = cameraPosition - wp.xyz;
    vUv2 = (position.xy - uUvXform.xy) * uUvXform.z;
}`;

// look_mat/lightlib — 원문 그대로(uniform 선언 순서까지). TD 전용 함수만 뺐다
const LIGHTLIB = /* glsl */ `
uniform vec3  uL0dir;
uniform vec3  uL0color;
uniform vec3  uL1dir;
uniform vec3  uL1color;
uniform vec3  uAmb;
uniform float uKey;
uniform float uRimGain;
uniform float uLightJitter;
uniform mat4  uShadowViewMatrix;
uniform sampler2D uShadowMap;
uniform float uShadowOrtho;
uniform float uShadowBias;
uniform float uShadowMapStrength;
uniform float uEnableShadow;
uniform float uShadowSoftness;

const int LIGHT_COUNT = 2;
struct SLight { vec3 dir; vec3 color; };

float lightJitterRand(vec3 p) {
    float sd = dot(p, vec3(13.1313, 17.1717, 34.3535));
    float sv = sin(sd) * 45678.54321;
    return fract(sv);
}
vec3 jitterLightDir(vec3 dir, float seed) {
    if (uLightJitter <= 0.0) return dir;
    float a = lightJitterRand(vec3(gl_FragCoord.xy, seed))       * 6.28318530718;
    float r = lightJitterRand(vec3(gl_FragCoord.xy, seed + 1.0)) * uLightJitter;
    vec2 shk = vec2(cos(a), sin(a)) * r;
    vec3 d = dir;
    d.xz += shk;
    return normalize(d);
}
SLight getLight(int i) {
    if (i == 0) return SLight(jitterLightDir(normalize(uL0dir), 0.0),  uL0color * uKey);
    return             SLight(jitterLightDir(normalize(uL1dir), 10.0), uL1color);
}
const int SHADOW_TAPS = 8;
float shadowFactor(vec3 worldPos) {
    if (uEnableShadow < 0.5) return 1.0;
    vec4 camPos = uShadowViewMatrix * vec4(worldPos, 1.0);
    vec2 uv0  = camPos.xy / uShadowOrtho + 0.5;
    float dist = -camPos.z;
    float litSum = 0.0;
    for (int i = 0; i < SHADOW_TAPS; i++) {
        float a = lightJitterRand(vec3(gl_FragCoord.xy, float(i) + 20.0))        * 6.28318530718;
        float r = lightJitterRand(vec3(gl_FragCoord.xy, float(i) + 20.0 + 0.5)) * uShadowSoftness;
        vec2 uv = uv0 + vec2(cos(a), sin(a)) * r;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { litSum += 1.0; continue; }
        float mapDist = texture(uShadowMap, uv).r;
        litSum += (dist - uShadowBias) < mapDist ? 1.0 : 0.0;
    }
    float lit = litSum / float(SHADOW_TAPS);
    return mix(1.0, lit, uShadowMapStrength);
}
void accumulateLighting(vec3 N, vec3 V, vec3 worldPos, float shininess,
                        out vec3 diffuse, out float specular) {
    diffuse  = uAmb;
    specular = 0.0;
    float sh = shadowFactor(worldPos);
    for (int i = 0; i < LIGHT_COUNT; i++) {
        SLight L = getLight(i);
        float atten = (i == 0) ? sh : 1.0;
        vec3 l = -L.dir;
        float ndl = dot(N, l) * 0.5 + 0.5;
        diffuse += L.color * ndl * atten;
        vec3 h = normalize(l + V);
        specular += pow(max(dot(N, h), 0.0), shininess) * atten;
    }
}
vec3 rimTerm(vec3 N, vec3 V) {
    float r = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    r = smoothstep(0.45, 0.7, r);
    return r * uRimGain * (uL0color * uKey);
}`;

// look_mat/frag_toon — 원문 그대로
const FRAG_TOON = /* glsl */ `
out vec4 fragColor;
${LIGHTLIB}
uniform vec3  uBaseColor;
uniform float uBands;
uniform float uShininess;
uniform float uSpecStep;
uniform float uRimStrength;
uniform float uShadowStrength;
in vec3 vWorldPos;
in vec3 vWorldNorm;
in vec3 vCamVec;
void main() {
    vec3 N = normalize(vWorldNorm);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vCamVec);
    vec3 diff; float spec;
    accumulateLighting(N, V, vWorldPos, uShininess, diff, spec);
    float lum   = clamp(dot(diff, vec3(0.3333)), 0.0, 0.999);
    float bands = max(uBands, 2.0);
    float toon  = floor(lum * bands) / (bands - 1.0);
    float shadeMul = mix(1.0 - uShadowStrength, 1.0, toon);
    float hard = step(uSpecStep, spec);
    vec3  rim  = rimTerm(N, V) * uRimStrength;
    vec3 col = uBaseColor * shadeMul + vec3(hard) + rim;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// frag_shadow — cam_shadow 에서의 선형 거리
const FRAG_SHADOW = /* glsl */ `
out vec4 fragColor;
uniform mat4 uShadowViewMatrix;
in vec3 vWorldPos;
void main() {
    vec4 camPos = uShadowViewMatrix * vec4(vWorldPos, 1.0);
    float dist = -camPos.z;
    fragColor = vec4(dist, dist, dist, 1.0);
}`;

// PHONG — TD phongMAT 의 근사. 합산 순서는 TD 문서 "Phong Lighting Equation" 그대로:
//   light (diffuse·N.L + specular) → + emit*emitmap → + constant → + rim
// 림라이트(center = 카메라 공간 360° 위의 방향, width = 거기서 퍼지는 폭, strength)는 TD 가
// 공식을 공개하지 않아 근사다: 가장자리(1 - N.V) × 방향 마스크. RIM_POW 로 가장자리 집중도를 맞춘다.
const FRAG_PHONG = /* glsl */ `
out vec4 fragColor;
uniform vec3 uDiff, uSpec, uEmit, uConst, uLightToward, uLightColor;
uniform float uShininess;
uniform sampler2D uEmitMap;
uniform float uHasEmitMap;
uniform vec3 uRimColor[2];
uniform vec3 uRimParams[2]; // (center deg, width, strength) — strength 0 = 꺼짐
uniform float uRimPow;
in vec3 vWorldPos;
in vec3 vWorldNorm;
in vec3 vCamVec;
in vec2 vUv2;
void main() {
    vec3 N = normalize(vWorldNorm);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vCamVec);
    vec3 L = normalize(uLightToward);
    float ndl = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float spec = ndl > 0.0 ? pow(max(dot(N, H), 0.0), uShininess) : 0.0;
    vec3 col = (uDiff * ndl + uSpec * spec) * uLightColor;
    if (uHasEmitMap > 0.5) col += uEmit * texture(uEmitMap, vUv2).rgb;
    col += uConst;
    vec3 cn = normalize(mat3(viewMatrix) * N);
    float edge = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uRimPow);
    float cl = length(cn.xy);
    vec2 cdir = cl > 1e-4 ? cn.xy / cl : vec2(0.0);
    for (int i = 0; i < 2; i++) {
        vec3 p = uRimParams[i];
        if (p.z == 0.0) continue;
        float c = radians(p.x);
        float a = dot(cdir, vec2(cos(c), sin(c)));          // 1 = 정확히 center 방향
        float mask = clamp((a - (1.0 - 2.0 * p.y)) / max(2.0 * p.y, 1e-3), 0.0, 1.0);
        col += uRimColor[i] * p.z * edge * mask;
    }
    fragColor = vec4(col, 1.0);
}`;

const RIM_POW = 1.2; // TD 렌더와 나란히 놓고 맞춘 값(2026-10-02): 1 이면 구멍이 너무 하늘색, 2 면 네모가 남색

const v3 = a => new THREE.Vector3(...a);
const c3 = a => new THREE.Vector3(...a); // 색도 vec3 uniform 으로 (TD 처럼 1 초과 허용, 색공간 변환 없음)

function toonMaterial(shadowTex, shadowView) {
    const L = SCENE.look;
    return new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        side: THREE.DoubleSide,
        vertexShader: VERT,
        fragmentShader: FRAG_TOON,
        uniforms: {
            uUvXform: { value: new THREE.Vector4(0, 0, 0, 0) },
            uL0dir: { value: v3(L.L0dir) },
            uL0color: { value: c3(L.L0color) },
            uL1dir: { value: v3(L.L1dir) },
            uL1color: { value: c3(L.L1color) },
            uAmb: { value: c3(L.amb) },
            uKey: { value: L.key },
            uRimGain: { value: L.rim },
            uLightJitter: { value: L.lightJitter },
            uShadowViewMatrix: { value: shadowView },
            uShadowMap: { value: shadowTex },
            uShadowOrtho: { value: SCENE.shadowCam.lookupOrtho },
            uShadowBias: { value: L.shadowBias },
            uShadowMapStrength: { value: L.shadowMapStrength },
            uEnableShadow: { value: L.enableShadow },
            uShadowSoftness: { value: L.shadowSoftness },
            uBaseColor: { value: c3(L.baseColor) },
            uBands: { value: L.bands },
            uShininess: { value: L.shininess },
            uSpecStep: { value: L.specStep },
            uRimStrength: { value: L.rimStrength },
            uShadowStrength: { value: L.shadowStrength },
        },
    });
}

function phongMaterial(m, emitMap = null, uvXform = null) {
    const rimColor = [0, 1].map(i => c3(m.rim[i]?.color ?? [0, 0, 0]));
    const rimParams = [0, 1].map(i => (m.rim[i] ? v3([m.rim[i].center, m.rim[i].width, m.rim[i].strength]) : v3([0, 0, 0])));
    return new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        side: THREE.DoubleSide,
        vertexShader: VERT,
        fragmentShader: FRAG_PHONG,
        uniforms: {
            uUvXform: { value: uvXform ?? new THREE.Vector4(0, 0, 0, 0) },
            uDiff: { value: c3(m.diff) },
            uSpec: { value: c3(m.spec) },
            uEmit: { value: c3(m.emit) },
            uConst: { value: c3(m.constant) },
            uShininess: { value: m.shininess },
            uLightToward: { value: v3(SCENE.phongLight.toLight) },
            uLightColor: { value: c3(SCENE.phongLight.color) },
            uEmitMap: { value: emitMap },
            uHasEmitMap: { value: emitMap ? 1 : 0 },
            uRimColor: { value: rimColor },
            uRimParams: { value: rimParams },
            uRimPow: { value: RIM_POW },
        },
    });
}

// icons/dial_comp — 아이콘 4개를 dial_inner uv 시트 위 구멍 자리에 (TD transformTOP 과 같은 식)
async function iconSheet() {
    const I = SCENE.icons;
    const cv = document.createElement('canvas');
    cv.width = cv.height = I.sheet;
    const g = cv.getContext('2d');
    const imgs = await Promise.all(
        I.place.map(
            p =>
                new Promise((res, rej) => {
                    const im = new Image();
                    im.onload = () => res(im);
                    im.onerror = rej;
                    im.src = p.src;
                }),
        ),
    );
    I.place.forEach((p, i) => {
        const u = (p.x - I.innerX) / I.innerSize;
        const v = (p.y - I.innerY) / I.innerSize;
        const s = ((p.k * I.iconScale) / I.innerSize) * I.sheet;
        g.drawImage(imgs[i], u * I.sheet - s / 2, (1 - v) * I.sheet - s / 2, s, s);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
}

// dial_outer.obj 에 떠돌이 선분(`l`) 하나가 섞여 있다 — OBJLoader 는 그걸 보면 오브젝트 전체를
// LineSegments 로 만들어 버린다(면이 하나도 안 그려짐). 면만 쓰므로 선/점 줄은 버린다.
async function loadObj(url) {
    const text = await (await fetch(url)).text();
    return new OBJLoader().parse(text.replace(/^[lp] .*$/gm, ''));
}
// OBJ 그룹 하나 = 메시 하나로 쓰고 재질만 바꿔 끼운다
function withMaterial(obj, mat) {
    obj.traverse(o => {
        if (o.isMesh) o.material = mat;
    });
    return obj;
}

// ── Dial 로직 (dial_ext.Dial 그대로) ──────────────────────────────────────────
class Dial {
    constructor(onPick) {
        this.onPick = onPick;
        this.hole = -1;
        this.sweep = 0;
        this.reached = false;
        this._lastAngle = null;
        this._wasDown = false;
        this.lag = DIAL.returnLag;
    }
    required(i) {
        const h = DIAL.holes[i];
        const base = (Math.atan2(h.y - DIAL.centerY, h.x - DIAL.centerX) * 180) / Math.PI;
        return (((base - DIAL.stopAngle) % 360) + 360) % 360;
    }
    apply(wx, wy, down) {
        const ang = (Math.atan2(wy - DIAL.centerY, wx - DIAL.centerX) * 180) / Math.PI;
        if (down && !this._wasDown) this._grab(wx, wy, ang);
        else if (down && this.hole >= 0) this._drag(ang);
        else if (this._wasDown && !down) this._release();
        this._wasDown = down;
    }
    _grab(wx, wy, ang) {
        let best = -1;
        let bestd = 1e9;
        DIAL.holes.forEach((h, i) => {
            const d = Math.hypot(wx - h.x, wy - h.y);
            if (d < h.r * DIAL.hitScale && d < bestd) {
                best = i;
                bestd = d;
            }
        });
        this.hole = best;
        this.sweep = 0;
        this.reached = false;
        this._lastAngle = ang;
        if (best >= 0) this.lag = DIAL.dragLag;
    }
    _drag(ang) {
        // 시계방향 = 각도 감소. (-180, 180] 로 감싸서 한 바퀴 넘겨도 누적된다
        const step = ((((this._lastAngle - ang + 180) % 360) + 360) % 360) - 180;
        this._lastAngle = ang;
        const req = this.required(this.hole);
        this.sweep = Math.max(0, Math.min(req, this.sweep + step));
        if (this.sweep >= req - 0.5) this.reached = true;
    }
    _release() {
        const picked = this.hole >= 0 && this.reached ? DIAL.holes[this.hole].receiver : null;
        this.lag = DIAL.returnLag;
        this.hole = -1;
        this.sweep = 0;
        this.reached = false;
        this._lastAngle = null;
        if (picked) this.onPick(picked);
    }
    // target CHOP 세 채널: rz(양수 = 반시계), 멈추개 밀림 btnx/btny
    target() {
        const th = (DIAL.stopAngle * Math.PI) / 180;
        const depth = this.reached ? DIAL.pressDepth : 0;
        return { rz: -this.sweep, btnx: Math.sin(th) * depth, btny: -Math.cos(th) * depth };
    }
}

// ── 장면 ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('dial');
const statusEl = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // TD 처럼 감마 변환 없이 그대로 낸다

const C = SCENE.cam;
const camera = new THREE.OrthographicCamera(-C.orthowidth / 2, C.orthowidth / 2, C.orthowidth / 2, -C.orthowidth / 2, C.near, C.far);
camera.position.set(...C.pos);

const S = SCENE.shadowCam;
const shadowCam = new THREE.OrthographicCamera(-S.orthowidth / 2, S.orthowidth / 2, S.orthowidth / 2, -S.orthowidth / 2, S.near, S.far);
shadowCam.matrixAutoUpdate = false;
shadowCam.matrix.set(...S.matrix);
shadowCam.updateMatrixWorld(true);
const shadowView = shadowCam.matrixWorld.clone().invert(); // rel(world_origin → cam_shadow)

// mono32float 대신 half float — iPad Safari 에서도 렌더 타깃으로 확실히 잡힌다. 거리 ~20, 바이어스 0.09 라 정밀도 충분
const shadowRT = new THREE.WebGLRenderTarget(S.res, S.res, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
});
const shadowMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
    vertexShader: VERT,
    fragmentShader: FRAG_SHADOW,
    uniforms: { uUvXform: { value: new THREE.Vector4() }, uShadowViewMatrix: { value: shadowView } },
});

const scene = new THREE.Scene();
const toon = toonMaterial(shadowRT.texture, shadowView);
const I = SCENE.icons;

const [baseObj, outerObj, btnObj, innerObj, sheet] = await Promise.all([
    loadObj(baseUrl),
    loadObj(outerUrl),
    loadObj(btnUrl),
    loadObj(innerUrl),
    iconSheet(),
]);

// geo = dial_base + dial_spin(dial_outer 를 다이얼 축 기준으로 rz)
scene.add(withMaterial(baseObj, toon));
const spin = new THREE.Group(); // 피벗 = (Centerx, Centery) — 도형 중심이 아니라 다이얼 회전축
spin.position.set(DIAL.centerX, DIAL.centerY, 0);
outerObj.position.set(-DIAL.centerX, -DIAL.centerY, 0);
spin.add(withMaterial(outerObj, toon));
scene.add(spin);
// geo2 = dial_btn (멈추개). tx/ty 가 btnx/btny 를 따라간다
scene.add(withMaterial(btnObj, phongMaterial(SCENE.btn)));
// geo4 = dial_inner (구멍 바닥). 그림자를 만들지도 받지도 않는다(TD render_shadow 목록에 없음)
const innerUv = new THREE.Vector4(I.innerX, I.innerY, 1 / I.innerSize, 1);
scene.add(withMaterial(innerObj, phongMaterial(SCENE.inner, sheet, innerUv)));

// ── 입력 ─────────────────────────────────────────────────────────────────────
const bridge = createBridge({ role: 'dial' });
bridge.on('_open', () => {
    statusEl.className = 'ok';
    statusEl.textContent = 'bridge 연결됨';
});
bridge.on('_close', () => {
    statusEl.className = '';
    statusEl.textContent = 'bridge 연결 안 됨';
});

const dial = new Dial(name => {
    bridge.send({ t: 'receiver', name });
    console.log('[dial] receiver', name);
});
window.dial = dial; // 콘솔 디버깅용
window.dialScene = { scene, renderer, camera, shadowRT, THREE }; // 콘솔 디버깅용

// 패널 u,v(좌하 원점) → 월드. ortho 라서 선형 (Dial.CursorWorld)
function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = 1 - (e.clientY - r.top) / r.height;
    return [C.pos[0] + (u - 0.5) * C.orthowidth, C.pos[1] + (v - 0.5) * C.orthowidth];
}
let activePointer = null; // 손가락 하나만 — 두 번째 손가락은 무시
canvas.addEventListener('pointerdown', e => {
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    dial.apply(...toWorld(e), true);
});
canvas.addEventListener('pointermove', e => {
    if (e.pointerId === activePointer) dial.apply(...toWorld(e), true);
});
const up = e => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    dial.apply(...toWorld(e), false);
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

// ── 루프 ─────────────────────────────────────────────────────────────────────
function resize() {
    const css = Math.min(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(css, css, false);
}
addEventListener('resize', resize);
resize();

// spring(lagCHOP) — 지수 추종. 드래그 중엔 Draglag, 놓으면 Returnlag
const cur = { rz: 0, btnx: 0, btny: 0 };
let last = performance.now();
function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const tgt = dial.target();
    const k = 1 - Math.exp(-dt / Math.max(dial.lag, 1e-3));
    for (const ch of ['rz', 'btnx', 'btny']) cur[ch] += (tgt[ch] - cur[ch]) * k;

    spin.rotation.z = THREE.MathUtils.degToRad(cur.rz);
    btnObj.position.set(cur.btnx, cur.btny, 0);

    // render_shadow: geo + geo2 만 (dial_inner 제외), cam_shadow 에서 선형 거리
    innerObj.visible = false;
    scene.overrideMaterial = shadowMat;
    renderer.setRenderTarget(shadowRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, shadowCam);
    scene.overrideMaterial = null;
    innerObj.visible = true;
    renderer.setRenderTarget(null);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
