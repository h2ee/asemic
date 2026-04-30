// ── shader.js ─────────────────────────────────────────────────────────────────
// PATH_MODE 숫자만 바꾸면 syllablePath + sdSyllable 세트가 교체됩니다.
//
//   1 — t 분리 (진행 + 진동 독립)
//   2 — start 기준 ±amp 진동
//   3 — sin 0~1 양수 방향 누적
//   4 — 에피사이클 기본 (2D)
//   5 — 에피사이클 + phase/방향반전
//   6 — 에피사이클 tilt (각 disk가 다른 평면)
//   7 — 행성 궤도식                    ← 현재
//   8 — FM 변조
// ─────────────────────────────────────────────────────────────────────────────

import { PATH_FUNCTIONS } from './pathFunctions.js';

const PATH_MODE = 7;  // ← 여기 숫자만 바꾸면 됨

const { name, src } = PATH_FUNCTIONS[PATH_MODE];

// ─────────────────────────────────────────────────────────────────────────────

export const vertSrc = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const fragSrc = `
#ifdef GL_ES
precision highp float;
#endif

// 현재 경로 모드: ${PATH_MODE} — ${name}

#define MAX_STEPS 30
#define MAX_DIST  20.0
#define EPS       5e-3
#define PI        3.14159
#define TWO_PI    6.28318
#define MAX_SYL   8

uniform vec2  u_resolution;
uniform float u_dpr;
uniform float u_time;

uniform vec3  u_ro;
uniform mat3  u_camMat;
uniform float u_fov;

uniform int   u_sylCount;
uniform vec3  u_start[MAX_SYL];       // 초성 pos
uniform vec3  u_cho[MAX_SYL];         // 초성 원본 데이터 (phase 등에 활용)
uniform vec3  u_end[MAX_SYL];         // 종성 pos
uniform vec3  u_jung[MAX_SYL];        // 중성 F1/F2/F3 (Hz)
uniform float u_amp[MAX_SYL];
uniform float u_yangseong[MAX_SYL];   // 양성모음 여부 (0 or 1)
uniform float u_diphthong[MAX_SYL];   // 이중모음 여부 (0 or 1)
uniform float u_growT;

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdSphere(vec3 p, float r) { return length(p) - r; }

float opSmoothUnion(float d1, float d2, float k) {
  float h = max(k - abs(d1 - d2), 0.0);
  return min(d1, d2) - h * h * 0.25 / k;
}

float quantize(float x, float steps) {
  return floor(x * steps) / steps;
}

float hatch1(vec2 fc, float dpr, float a, float pitch, float width) {
  vec2 p = fc / max(dpr, 1.0);
  float u = p.x * cos(a) - p.y * sin(a);
  float g = abs(fract(u / pitch) - 0.5) * 2.0;
  return step(width / pitch, g);
}

float crossHatch(vec2 fc, float dpr, float band) {
  float m = 1.0;
  if (band >= 1.) m = min(m, hatch1(fc, dpr, radians(  0.), 1.5, 0.1));
  if (band >= 2.) m = min(m, hatch1(fc, dpr, radians( 60.), 1.5, 0.1));
  if (band >= 3.) m = min(m, hatch1(fc, dpr, radians(-60.), 1.5, 0.5));
  if (band >= 4.) m = min(m, hatch1(fc, dpr, radians( 90.), 1.5, 0.6));
  return m;
}

// ── 경로 함수 (PATH_MODE = ${PATH_MODE}: ${name}) ─────────────────────────────

${src}

// ── 씬 SDF ────────────────────────────────────────────────────────────────────

float map(vec3 p) {
  float d = MAX_DIST;
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= u_sylCount) break;
    d = opSmoothUnion(d, sdSyllable(p, i, u_growT), 0.12);
  }
  return d;
}

// ── 레이마치 ──────────────────────────────────────────────────────────────────

float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float d = map(ro + rd * t);
    if (d < EPS) return t;
    t += d;
    if (t > MAX_DIST) break;
  }
  return -1.0;
}

vec3 estimateNormal(vec3 p) {
  vec2 e = vec2(0.005, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// ── main ──────────────────────────────────────────────────────────────────────

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv = uv * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  vec3 rd = normalize(
    u_camMat[0] * uv.x +
    u_camMat[1] * uv.y -
    u_camMat[2] * u_fov
  );

  float t = raymarch(u_ro, rd);
  vec3 col = vec3(1.0);

  if (t > 0.0) {
    vec3 pos = u_ro + rd * t;
    vec3 nor = estimateNormal(pos);
    vec3 L   = normalize(vec3(1.2, 2.0, 1.4));

    float diff      = max(dot(nor, L), 0.0);
    float toonSteps = 3.0;
    float diffQ     = quantize(diff, toonSteps);
    float band      = floor(diffQ * (toonSteps - 1.0) + 1e-3);

    col = vec3(0.99, 0.99, 0.99) * (0.75 + 0.25 * diff);

    float m = crossHatch(gl_FragCoord.xy, u_dpr, (toonSteps - 1.0) - band);
    col = mix(vec3(0.08, 0.10, 0.14), col, m);

    vec3  V    = normalize(-rd);
    float spec = step(0.4, pow(max(dot(nor, normalize(L + V)), 0.0), 60.0));
    col += spec * 0.8;

    float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 2.0);
    col += 0.15 * rim * vec3(0.8, 0.6, 1.0);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;