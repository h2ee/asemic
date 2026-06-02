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
#define EPS       5e-3
#define PI        3.14159
#define TWO_PI    6.28318
#define MAX_SYL   1

uniform vec2  u_resolution;
uniform float u_dpr;
uniform float u_time;

uniform vec3  u_ro;
uniform mat3  u_camMat;
uniform float u_fov;

uniform vec3  u_start;
uniform vec3  u_center;
uniform vec3  u_cho;
uniform vec3  u_end;
uniform vec3  u_jung;
uniform float u_amp;
uniform float u_yangseong;
uniform float u_diphthong;
uniform float u_growT;
uniform int   u_materialMode;  // 0=crosshatch, 1=metal, 2=glass

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * (h*0.9)) - r; //약간 끊김
}

// HSL → RGB
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0,4,2),6.0)-3.0)-1.0, 0.0, 1.0);
  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

// 초성 좌표 → HSL 기반 컬러
// x(조음위치): hue 0=빨강(양순) → 0.7=파랑(후두)
// z(긴장도):   채도  울림=0.15 → 거센=0.9
// y(조음방법): 명도 미세조정
vec3 choToColor(vec3 cho) {
  float h = cho.x * 0.70;
  float s = 0.15 + cho.z * 0.75;
  float l = 0.45 + (cho.y - 0.5) * 0.12;
  return hsl2rgb(vec3(h, s, l));
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float opSmoothUnion(float d1, float d2, float k) {
  float h = max(k - abs(d1 - d2), 0.0);
  return min(d1, d2) - h * h * 0.25 / k;
}

vec3 opTwistPoint(vec3 p) {
    const float k = 0.5;
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * p.xz, p.y);
}

float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f); // smoothstep

    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), u.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y), u.z);
}

float displacement(vec3 p) {
    //return 0.1 * noise(p * 5.0);
    return sin(p.y * 10.0) * 0.1;
}

${src}

float map(vec3 p) {
  float f1   = u_jung.x;
  float f2   = u_jung.y;
  float f3   = u_jung.z;
  float amp  = u_amp;
  float yang = u_yangseong;
  float diph = u_diphthong;
  float num  = 100.0;
  float k    = 0.05; //0.06
  float rad  = 0.002; // 0.02
  float d    = MAX_DIST;

  for (int i = 0; i < int(num); i++) {
    float t0  = float(i)     / num;
    float t1  = float(i + 1) / num;
    if (t0 > u_growT) break;
    float t1c = min(t1, u_growT);
    vec3 a = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t0,  yang, diph);
    vec3 b = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t1c, yang, diph);
    float pull = step(0.99, u_growT);
    b = mix(b, u_center + u_end, pull * step(u_growT - 0.001, t1));

    // 납작한 캡슐 트릭 (불안정)
    vec3 twistedP = opTwistPoint(p);
    twistedP *= 0.7;
    twistedP.y = twistedP.y + 4.0;
    twistedP.xz = twistedP.xz * 1.2;
    float twistedCapsule = sdCapsule(twistedP, a, b, rad);
    //d = opSmoothUnion(d, twistedCapsule, k);
    

    //p.x = p.x * 0.999;
    vec3 p1 = p;
    p1 = (p1 - a) * 45.0;
    float thinD = opSmoothUnion(d, sdCapsule(p1, a, b, 0.4), 0.008);

    float d1 = sdCapsule(p, a, b, rad);
    float d2 = sin(p.y * 10.0) * 0.1 * 0.1; //for 금속 material
    //float d2 = 0.008 * noise(p * 105.0); //진폭(돌출) 0.03, 주파수(촘촘함 정도) 80.0인 노이즈 --> for 노이즈 material
    float displaced = d1 + d2;

    d = opSmoothUnion(d, displaced, k);
    //d = opSmoothUnion(d, sdCapsule(p, a, b, rad), k); //displacement 없는 기본 캡슐
    d = min(d, thinD); //얇은 부분 추가
    
  }
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
  float sd  = dot(p, vec3(13.4545, 17.1717, 31.3131));
  float sd2 = dot(p, vec3(23.4545, 27.1717, 11.3131));
  return fract(sin(sd + sd2) * 45678.54321);
}
`;

// ── Pass 1: grow 셰이더 ────────────────────────────────────────────────────────
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
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 pos = u_ro + rd * t;
  vec3 nor = estimateNormal(pos);

  vec3 V      = normalize(-rd);
  vec3 choCol = u_cho;//choToColor(u_cho);
  vec3 col    = vec3(0.0);

  if (u_materialMode == 0) {
    // ── Mode 0: 노이즈 ─────────────────────────────────────
    vec3 L = vec3(1., 1., 1.1);
    float shk_a = rand(vec3(uv, .0)) * 2. * PI;
    float shk_r = rand(vec3(uv, 1.)) * 1.;
    vec2 shk = vec2(cos(shk_a), sin(shk_a)) * shk_r;
    L.xz += shk;

    float diff      = max(dot(nor, L), 0.0);
    float toonSteps = 5.0;
    float diffQ     = floor(diff * toonSteps) / toonSteps;
    float band      = floor(diffQ * (toonSteps - 1.0) + 1e-3);
    col = vec3(0.99) * (0.5 + 0.5 * diff);
    float m = crossHatch(gl_FragCoord.xy, u_dpr, (toonSteps - 1.0) - band);
    col = mix(choCol, col, m*2.0);
    float sp  = step(0.4, pow(max(dot(nor, normalize(L + V)), 0.0), 60.0));
    col += sp * 0.8;
    float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 2.0);
    col += 0.15 * rim * vec3(0.8, 0.6, 1.0);

  } else if (u_materialMode == 1) {
    // ── Mode 1: 금속 ─────────────────────────────────────────────────────

    vec3 L = vec3(1., 1., 0.8);
    float diff      = max(dot(nor, L), 0.0);
    float toonSteps = 4.0;
    float diffQ     = floor(diff * toonSteps) / toonSteps;
    float band      = floor(diffQ * (toonSteps - 1.0) + 1e-3);
    col = vec3(0.999) * (0.75 + 0.25 * diff);
    col = mix(choCol, col, (toonSteps - 1.0) - band)*1.2;

  } else {
    // ── Mode 2: 홀로그램/유리 ────────────────────────────────────────────

    vec3 L = vec3(1., 1., 1.);
    float fresnel = pow(1.0 - max(dot(nor, V), 0.0), 2.0);
    vec3 irid = 0.5 + 5.0 * cos(TWO_PI * (
      vec3(0.0, 0.33, 0.67) +
      nor.y * 1.8 +
      choCol * 0.5
    ));
    vec3 H   = normalize(L + V);
    float sp = pow(max(dot(nor, H), 0.0), 90.0);
    col = mix(vec3(0.0), irid, fresnel * 0.85) + sp * 0.6;
    float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 1.5);
    col += rim * irid * 0.4;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Pass 2: 누적 셰이더 ───────────────────────────────────────────────────────
export const accumFrag = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_growTex;
uniform sampler2D u_bckbuffer;
uniform vec2      u_resolution;
uniform float     u_isFirst;

void main() {
  vec2 uv  = gl_FragCoord.xy / u_resolution;
  vec4 grow = texture2D(u_growTex,   uv);
  vec4 prev = texture2D(u_bckbuffer, uv);

  vec4 col = (grow.a > 0.5)
    ? grow
    : (u_isFirst > 0.5 ? vec4(0.0) : prev);

  gl_FragColor = col;
}
`;

// ── Pass 3: 표시 셰이더 ───────────────────────────────────────────────────────
export const dispFrag = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_accumTex;
uniform vec2      u_resolution;
uniform int       u_dispMatMode;  // dispFrag용 materialMode 사본

void main() {
  vec2 uv  = gl_FragCoord.xy / u_resolution;
  vec4 acc = texture2D(u_accumTex, uv);

  // 금속 모드가 아니면 그대로 출력
  if (u_dispMatMode != 1) {
    gl_FragColor = vec4(mix(vec3(0.0), acc.rgb, acc.a), 1.0);
    return;
  }

  // ── SSR (스크린스페이스 반사) ─────────────────────────────────────────
  // accumTarget 밝기 기울기로 2D 법선 근사
  vec2 texel = 1.0 / u_resolution;
  float L  = dot(texture2D(u_accumTex, uv + vec2(-texel.x, 0.0)).rgb, vec3(0.299,0.587,0.114));
  float R  = dot(texture2D(u_accumTex, uv + vec2( texel.x, 0.0)).rgb, vec3(0.299,0.587,0.114));
  float D  = dot(texture2D(u_accumTex, uv + vec2(0.0, -texel.y)).rgb, vec3(0.299,0.587,0.114));
  float U  = dot(texture2D(u_accumTex, uv + vec2(0.0,  texel.y)).rgb, vec3(0.299,0.587,0.114));
  vec2 screenNor = vec2(R - L, U - D);  // 밝기 기울기 = 표면 법선 근사

  // 글자 위 픽셀에서만 반사 계산 (배경은 반사 없음)
  float onGlyph = acc.a;

  // 반사 UV: 법선 방향으로 오프셋해서 accumTarget 재샘플링
  float reflStr  = 0.098;              // 반사 강도(오프셋 크기). 여기서 조절
  vec2  reflUV   = uv + screenNor * reflStr;
  reflUV         = clamp(reflUV, vec2(0.0), vec2(1.0));
  vec4  reflCol  = texture2D(u_accumTex, reflUV);

  // 반사는 글자가 있는 곳(reflUV)에서만 의미있음
  float reflMask = reflCol.a;

  // 기울기 크기 = fresnel 근사 (가장자리일수록 기울기 크고 반사 강함)
  float edgeness = clamp(length(screenNor) * 6.0, 0.0, 1.0);

  vec3 base = mix(vec3(0.0), acc.rgb, acc.a);
  vec3 refl = reflCol.rgb * reflMask;

  // 가장자리에서 반사색 합성
  vec3 col = base + refl * edgeness * onGlyph * 0.95;

  gl_FragColor = vec4(col, 1.0);
}
`;
