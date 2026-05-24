// ── shader.js ─────────────────────────────────────────────────────────────────
// 2-pass 렌더링:
//   growFrag  — grow 중인 음절 1개만 레이마칭 → RenderTarget에 RGBA 저장
//   accumFrag — bckbuffer(누적)와 growTarget을 min 합성 → accumTarget에 저장
//   dispFrag  — accumTarget 텍스처를 화면에 표시 (레이마칭 없음)
// ─────────────────────────────────────────────────────────────────────────────

import { PATH_FUNCTIONS } from './pathFunctions.js';

const PATH_MODE = 7;
const { name, src } = PATH_FUNCTIONS[PATH_MODE];

// ── 공통 vert ─────────────────────────────────────────────────────────────────
export const vertSrc = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// ── 공통 SDF/유틸 + 경로함수 (growFrag에서만 사용) ───────────────────────────
const sdfSrc = `
#define MAX_STEPS 30
#define MAX_DIST  20.0
#define EPS       5e-3 // 5e-3
#define PI        3.14159
#define TWO_PI    6.28318
#define MAX_SYL   1

uniform vec2  u_resolution;
uniform float u_dpr;
uniform float u_time;

uniform vec3  u_ro;
uniform mat3  u_camMat;
uniform float u_fov;

// grow 중인 음절 1개만
uniform vec3  u_start;
uniform vec3  u_center;
uniform vec3  u_cho;
uniform vec3  u_end;
uniform vec3  u_jung;
uniform float u_amp;
uniform float u_yangseong;
uniform float u_diphthong;
uniform float u_growT;

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdRoundBox( vec3 p, vec3 b, float r )
{
  vec3 q = abs(p) - b + r;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = max(k - abs(d1 - d2), 0.0);
  return min(d1, d2) - h * h * 0.25 / k;
}

${src}

float map(vec3 p) {
  float f1   = u_jung.x;
  float f2   = u_jung.y;
  float f3   = u_jung.z;
  float amp  = u_amp;
  float yang = u_yangseong;
  float diph = u_diphthong;
  //캡슐 개수, smoothunion 강도(굵기), 캡슐 반지름 결정
  float num  = 100.0; // 30.0
  float k    = 0.02; //0.02
  float rad  = 0.012; //0.012
  float d    = MAX_DIST;
  //vec3 end = u_end*0.8;

  for (int i = 0; i < int(num); i++) {
    float t0  = float(i)     / num;
    float t1  = float(i + 1) / num;
    if (t0 > u_growT) break;
    float t1c = min(t1, u_growT);
    vec3 a = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t0,  yang, diph);
    vec3 b = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t1c, yang, diph);
    float pull = step(0.99, u_growT);
    b = mix(b, u_center + u_end, pull * step(u_growT - 0.001, t1));
    d = opSmoothUnion(d, sdCapsule(p, a, b, rad), k);
  }

  //d = opSmoothUnion(d, sdSphere(p - u_start, rad * 1.2), k);
  //if (u_growT >= 0.99) d = opSmoothUnion(d, sdSphere(p - (u_center + u_end), rad), k);
  return d;
}

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

float rand(vec3 p){
    float sd = dot(p, vec3(13.4545, 17.1717, 31.3131));
    float sd2 = dot(p, vec3(23.4545, 27.1717, 11.3131));

    float sv = sin(sd + sd2)*45678.54321;
    return fract(sv);
}
`;

// ── Pass 1: grow 셰이더 — 현재 grow 중인 음절 1개 레이마칭 → RGBA 출력 ────────
// 히트 없는 픽셀은 alpha=0 (투명)
export const growFrag = `
#ifdef GL_ES
precision highp float;
#endif

${sdfSrc}

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

  if (t < 0.0) {
    gl_FragColor = vec4(0.0);  // 히트 없음 → 투명
    return;
  }

  vec3 pos = u_ro + rd * t;
  vec3 nor = estimateNormal(pos);
  //vec3 L   = normalize(vec3(1.2, 2.0, 1.4));
  vec3 L = vec3(1.,1.,1.);
  
  float shk_a = rand(vec3(uv, .0)) * 2. * PI;
  float shk_r = rand(vec3(uv, 1.)) * 1.;
  vec2 shk = vec2(cos(shk_a), sin(shk_a)) * shk_r;
  L.xz += shk;
  
  float diff      = max(dot(nor, L), 0.0);
  float toonSteps = 4.0;
  float diffQ     = floor(diff * toonSteps) / toonSteps;
  float band      = floor(diffQ * (toonSteps - 1.0) + 1e-3);

  vec3 col = vec3(0.99) * (0.75 + 0.25 * diff);
  float m  = crossHatch(gl_FragCoord.xy, u_dpr, (toonSteps - 1.0) - band);
  //col = mix(vec3(0.08, 0.10, 0.14), col, m);
  col = mix(u_cho, col, m);

  vec3 V   = normalize(-rd);
  float sp = step(0.4, pow(max(dot(nor, normalize(L + V)), 0.0), 60.0));
  col += sp * 0.8;

  float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 2.0);
  col += 0.15 * rim * vec3(0.8, 0.6, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Pass 2: 누적 셰이더 — growTarget과 bckbuffer를 합성 → accumTarget ────────
// alpha 기반 over 합성: grow 픽셀이 있으면 덮고, 없으면 bckbuffer 유지
export const accumFrag = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_growTex;    // Pass 1 결과
uniform sampler2D u_bckbuffer;  // 이전 누적
uniform vec2      u_resolution;
uniform float     u_isFirst;    // 1.0 = 첫 글자 (bckbuffer 무시)

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 grow = texture2D(u_growTex,   uv);
  vec4 prev = texture2D(u_bckbuffer, uv);

  // grow 히트 픽셀은 새 색으로, 아니면 누적 유지
  vec4 col = (grow.a > 0.5)
    ? grow
    : (u_isFirst > 0.5 ? vec4(0.0) : prev);

  gl_FragColor = col;
}
`;

// ── Pass 3: 표시 셰이더 — accumTarget을 흰 배경 위에 표시 ────────────────────
export const dispFrag = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_accumTex;
uniform vec2      u_resolution;

void main() {
  vec2 uv  = gl_FragCoord.xy / u_resolution;
  vec4 acc = texture2D(u_accumTex, uv);

  // alpha 합성: 흰 배경 위에 누적된 글자
  vec3 col = mix(vec3(0.0), acc.rgb, acc.a);
  gl_FragColor = vec4(col, 1.0);
}
`;
