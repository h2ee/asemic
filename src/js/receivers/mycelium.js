// ── mycelium.js ───────────────────────────────────────────────────────────────
// alien.js 기반 — 균사체(곰팡이) 수신자
//
// 2-pass 렌더링:
//   [Pass 1] grow 중인 음절 1개만 레이마칭 → growTarget
//   [Pass 2] growTarget + bckbuffer 합성   → accumTarget (ping-pong)
//   [Pass 3] accumTarget을 화면에 표시     (레이마칭 없음)
//
// 완성된 글자는 accumTarget에 구워지므로
// 글자가 쌓여도 항상 최대 1음절만 레이마칭 실행.
//
// grow queue: 음절이 빠르게 입력돼도 순서대로 하나씩 처리.
//   instant:true  → growT=1로 한 프레임에 즉시 bake (삭제 후 재구움용)
//   instant:false → grow 애니메이션
//
// ── alien.js 대비 변경점 ─────────────────────────────────────────────────────
//  1. syllablePath에 ep4(작은 에피사이클) 추가 — 균사 끝부분 미세 흔들림/잔가지
//  2. taper에 노이즈 기반 불규칙성 추가 — 매듭처럼 굵기가 불균일한 균사
//  3. map()에 lump(혹) 추가 — 경로 위 랜덤 위치에 작은 구, g_matID로 body/lump 구분
//  4. mode2(금속) 색 파이프라인을 body/lump로 분리(옵션 A: 현재는 동일색)
//     + mode1의 rim 항을 검은 edge glow로 재사용
//  5. 연결 실 / mother tree 허브 로직 — 음절당 최대 2개, 허브 중복 없이 선택
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

// ── 경로 함수 (syllablePath) ──────────────────────────────────────────────────
const pathSrc = `
vec3 orbitalPoint(float r, float freq, float angle, float theta, float phi, float e) {
  vec3 axis = vec3(sin(phi)*cos(theta), sin(phi)*sin(theta), cos(phi));
  vec3 up   = abs(axis.z) < 0.99 ? vec3(0,0,1) : vec3(1,0,0);
  vec3 u    = normalize(cross(axis, up));
  vec3 v    = cross(axis, u) * 1.2;  // #임의 조정
  float a   = freq * (1.0/3200.0) * angle;
  return r * cos(a)*u + r*(1.0-e) * sin(a)*v;
}

vec3 syllablePath(vec3 start, vec3 center, vec3 cho, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float angle = t * TWO_PI * 5.0; // 에피사이클 회전 3.0 ~12. default 7
  float r1 = amp*(1.0/1.75), r2=r1*0.5, r3=r1*0.25;

  vec3 ep1 = orbitalPoint(r1, f1, angle, cho.x * TWO_PI,           cho.y * PI, 0.03); //0.3
  vec3 ep2 = orbitalPoint(r2, f2, angle, cho.y * TWO_PI + yang*PI, cho.z * PI, 0.25); //0.25
  vec3 ep3 = orbitalPoint(r3, f3, angle, cho.z * TWO_PI + diph*PI, yang  * PI, 0.65); //0.95

  // ep4: 작은 에피사이클 — 균사 끝부분의 미세 흔들림/잔가지 느낌 (mycelium 전용 추가)
  vec3 ep4 = orbitalPoint(r3*0.4, f1*1.7, angle*1.3, cho.x*PI, cho.z*TWO_PI, 0.99);

  return center + ep1 + ep2 + ep3 - ep4*1.3; //임의 조정
}
`;

// ── 셰이더 ────────────────────────────────────────────────────────────────────

// ── 공통 vert ─────────────────────────────────────────────────────────────────
const vertSrc = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// ── 공통 SDF/유틸 + 경로함수 (growFrag에서만 사용) ───────────────────────────
const sdfSrc = `
#define MAX_STEPS 20
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
uniform vec3  u_hubCenters[2]; // mother tree 허브 center들 (연결 실 타겟, 최대 2개)
uniform float u_connCount;     // 활성 연결 개수 (0~2)
uniform float u_amp;
uniform float u_yangseong;
uniform float u_diphthong;
uniform float u_growT;
uniform int   u_materialMode;  // 0=crosshatch, 1=태양, 2=금속

// 재질 ID: 0=경로(body), 1=혹(lump) — map()에서 기록, growFrag 컬러링에서 사용
float g_matID;

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * (h*1.0)) - r; //약간 끊김 0.95
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

${pathSrc}

float map(vec3 p) {
  float f1   = u_jung.x;
  float f2   = u_jung.y;
  float f3   = u_jung.z;
  float amp  = u_amp;
  float yang = u_yangseong;
  float diph = u_diphthong;
  float num  = 150.0;
  float k    = 0.08; //0.06
  float rad  = 0.007; // 0.02
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

    // 납작한 캡슐 트릭 (불안정) 지금 사용 안하는 중 - 적용 시 필기체 같은 비주얼 나옴.
    vec3 twistedP = opTwistPoint(p);
    twistedP *= 0.85;
    twistedP.y = twistedP.y + 4.0; //4
    twistedP.xz = twistedP.xz * 1.1;
    float twistedCapsule = sdCapsule(twistedP, a, b, rad);
    //d = opSmoothUnion(d, twistedCapsule, k);
    
    //thinD 얇은 점선 같은 똑같은 경로 옆에 하나 더 그리는 것 - 그냥 밀도용
    //p.x = p.x * 0.999;
    vec3 p1 = p;
    p1 = (p1 - a) * 45.0;
    float thinD = opSmoothUnion(d, sdCapsule(p1, a, b, 0.8), 0.008);
    
    // taper: 경로 중간(t=0.5)에서 가장 굵고 양 끝에서 얇아짐
    // + 노이즈로 불규칙한 굵기 변화 추가 (균사 매듭/잘록함 느낌, mycelium 전용)
    float taperBase  = 0.7 + 0.3 * sin(t0 * PI);  // 0.3~1.0 범위
    float taperNoise = 0.8 + 0.6 * noise(vec3(t0 * 18.0, u_cho.x * 7.0, u_cho.z * 3.0));
    float taper = taperBase * taperNoise;
    float d1 = sdCapsule(p, a, b, rad * taper);

    float d2 = sin(p.y * 10.0) * 0.1 * 0.175-0.0155; //for 태양 material
    float d3 = 0.008 * noise(p * 95.0); //진폭(돌출) 0.03, 주파수(촘촘함 정도) 80.0인 노이즈 --> for 노이즈 material
    float displaced = d1 + d2 + d3;

    d = opSmoothUnion(d, displaced, k);
    //d = opSmoothUnion(d, sdCapsule(p, a, b, rad), k); //displacement 없는 기본 캡슐
    
    d = min(d, thinD); //얇은 부분 추가
    
  }

  // ── lump (혹) — 경로 위 임의 위치에 작은 구를 붙여 포자/혹 같은 질감 추가 ──
  // 자모값을 시드로 사용해 음절마다 분포가 달라짐.
  // u_growT에 맞춰 점진적으로 등장(이미 그려진 경로 범위 내에서만).
  // -- connection thread (mother tree hub) --
  // trigger: tense consonant (cho.z>=0.65) / yeonum (prev jong + cur cho==ieung) / 종성 존재
  // grows together with pull, at growT>=0.99, thinner than body
  float seed = u_cho.x * 13.7 + u_cho.z * 5.3 + f1 * 0.01;
  float numLumps = 20.0 + u_cho.z * 34.0; // lump 개수
  float dLump = MAX_DIST;

  vec3 placed[54];
  int  placedCount = 0;

  for (int c = 0; c < 2; c++) {
    if (float(c) >= u_connCount) break;
    float connOn = step(0.99, u_growT);
    if (connOn > 0.5) {
        vec3 hub = u_hubCenters[c];
        float cSeed = seed + float(c) * 7.0; // 두 연결선이 다르게 휘도록 시드 분리

        vec3 mid = mix(u_center, hub, 0.5);
        mid += vec3(hash(vec3(cSeed, 1.0, 2.0)) - 0.5, hash(vec3(cSeed, 3.0, 4.0)) - 0.5, 0.0) * 0.8; // 0.3 = 휘어짐 강도, 조절 포인트

        float dConn = min(
            sdCapsule(p, u_center, mid, rad * 1.8),
            sdCapsule(p, mid, hub, rad * 0.3)
        );

        // 타겟 쪽 작은 앵커 — 실이 여기로 "녹아드는" 느낌
        float dAnchor = sdSphere(p - hub, rad * 0.2);
        dConn = opSmoothUnion(dConn, dAnchor, k * 1.6); // 앵커 쪽 melt 강도

        d = opSmoothUnion(d, dConn, k * 1.4);
    }
  }

  for (int j = 0; j < 54; j++) {
    if (float(j) >= numLumps * u_growT) break;
    float fj = float(j) * 91.7;

    // 문제2: 무작위 lt 대신 j마다 구간을 나눠 고르게 분산 (stratified) + 약간의 지터
    float jitter = hash(vec3(fj + seed * 3.1, seed, fj * 0.37));
    float lt = (float(j) + 0.15 + jitter * 0.05) / numLumps;
    if (lt > u_growT) continue; // 아직 도달 안 한 위치 — 스킵 (트레일 방지)

    float dt = 0.01;
    vec3 pathPos = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, lt, yang, diph);

    // tangent 기반 프레임 대신, 월드 기준 랜덤 방향 + 위/아래 알터네이션
    // side: 위(+y) / 아래(-y) 절반씩 분배
    float side = hash(vec3(fj * 1.7 + seed, fj, seed * 0.9)) > 0.5 ? 1.0 : -1.0;
    vec3 perpDir = normalize(vec3(
      hash(vec3(fj * 2.3 + seed, 1.0, fj)) * 2.0 - 1.0,
      side * (0.6 + 0.4 * hash(vec3(fj * 4.1 + seed, 2.0, fj))), // 위/아래 쪽으로 치우침
      hash(vec3(fj * 5.1 + seed, 3.0, fj)) * 2.0 - 1.0
    ));

// lump 크기
    // 문제1: 본체 표면 반경 추정에 smooth-union bulge(k) 보정 추가
    // taper에 노이즈도 반영해 실제 map()의 d1 반경과 더 가깝게
    float taperBaseAtLt  = 0.1 + 0.9 * sin(lt * PI);
    float taperNoiseAtLt = 0.85 + 0.05 * noise(vec3(lt * 18.0, u_cho.x * 7.0, u_cho.z * 3.0));
    float bodyR = rad * taperBaseAtLt * taperNoiseAtLt + k * 0.75; // k*0.5: 관절 bulge 보정

    float lumpR  = rad * (1.0 + hash(vec3(fj * 13.7 + seed, seed, 1.0)) * 1.8) * 2.2; // 크기 0.8배
    // lump 중심을 본체 표면 근처에 배치 → 절반은 묻히고 절반은 튀어나오는 혹 형태
    vec3 lumpPos = pathPos + perpDir * bodyR;

    placed[placedCount] = lumpPos;
    placedCount++;

    float dl = sdSphere(p - lumpPos, lumpR);
    dLump = min(dLump, dl);
  }

  // body(d)와 lump(dLump) 블렌딩 + 재질 ID(g_matID) 계산
  float lumpK = 0.012;
  float h = clamp(0.5 + 0.5 * (dLump - d) / lumpK, 0.0, 1.0);
  g_matID = 1.0 - h; // 0=경로(body), 1=혹(lump)
  d = mix(dLump, d, h) - lumpK * h * (1.0 - h);

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
const growFrag = `
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
  // 표면 지점에서의 재질 ID(g_matID) 확정 (estimateNormal의 마지막 호출값은 오프셋 지점이므로 재계산)
  float _surfD = map(pos);

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
    // ── Mode 1: 태양 코로나 ───────────────────────────────────────────────

    vec3 L = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(nor, L), 0.0);

    // 표면-가장자리 색온도: 코어(황백) → 외곽(코로나 주황)
    float rim = pow(1.0 - max(dot(nor, V), 0.0), 1.8);
    vec3 coreCol = vec3(1.0, 0.95, 0.75);   // 황백 (코어)
    vec3 edgeCol = vec3(1.0, 0.35, 0.02);   // 주황 (코로나 외곽)
    col = mix(coreCol, edgeCol, rim);
    col *= 0.6 + 0.4 * diff;

    // 초성 긴장도(choCol.z) → 플레어 강도
    float flareStr = 0.6 + choCol.z * 0.8;

    // 하이라이트 (표면 플레어)
    vec3 H  = normalize(L + V);
    float sp = pow(max(dot(nor, H), 0.0), 40.0);
    col += sp * vec3(1.0, 0.9, 0.6) * flareStr;

    // 외곽 발광 (코로나 루프 끝부분)
    col += rim * rim * vec3(1.0, 0.4, 0.0) * flareStr * 0.9;
  } else if (u_materialMode == 2) {
    // ── Mode 2: 금속 (mycelium 기본) ──────────────────────────────────────

    //vec3 L = vec3(1., 1., 0.8);

    vec3 L = vec3(1.0, -1.0, -0.2);
    float shk_a = rand(vec3(uv, .0)) * 1.2 * PI;
    float shk_r = rand(vec3(uv, 1.)) * 1.;
    vec2 shk = vec2(cos(shk_a), sin(shk_a)) * shk_r;
    L.xz += shk;

    float diff      = max(dot(nor, L), 0.0);
    float toonSteps = 4.0;
    float diffQ     = floor(diff * toonSteps) / toonSteps;
    float band      = floor(diffQ * (toonSteps - 1.0) + 1e-3);
    vec3 baseCol = vec3(0.999) * (0.85 + 0.15 * diff);
    vec3 monoCol = mix(vec3(0.48), baseCol, (toonSteps - 1.0) - band) * 1.2 + 0.3;
    baseCol = mix(choCol, baseCol, (toonSteps - 1.0) - band) * 1.2;

    // 경로(body) / 혹(lump) 색 분리 — 옵션 A: 현재는 동일색,
    // 추후 lumpCol만 따로 조정해 혹에 강조색 부여 가능
    vec3 bodyCol = monoCol;
    vec3 lumpCol = baseCol * 0.95;
    col = mix(bodyCol, lumpCol, g_matID);

    // 외곽 발광 (mode1의 rim 항 재사용) — 검은 edge glow로 적용
    float rim = pow(1.0 - max(dot(nor, V), 0.0), 1.2);
    float flareStr = 1.4;//0.6 + choCol.z * 0.8;
    col = mix(col, vec3(0.0), rim * rim * flareStr * 1.2);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Pass 2: 누적 셰이더 ───────────────────────────────────────────────────────
const accumFrag = `
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
const dispFrag = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_accumTex;
uniform vec2      u_resolution;
uniform int       u_dispMatMode;  // dispFrag용 materialMode 사본

void main() {
  vec2 uv  = gl_FragCoord.xy / u_resolution;
  vec4 acc = texture2D(u_accumTex, uv);

  // 0 mode에서 SSR 건너뜀
  if (u_dispMatMode == 0) {
    gl_FragColor = vec4(mix(vec3(0.0), acc.rgb, acc.a), 1.0);
    return;
  }
/*
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
*/
  gl_FragColor = vec4(mix(vec3(0.7), acc.rgb, acc.a), 1.0);// #bg color = vec3(1.0)
  //gl_FragColor = vec4(col, 1.0);

}
`;

// ── MyceliumReceiver ──────────────────────────────────────────────────────────

export class MyceliumReceiver {
    constructor() {
        this._renderer = null;
        this._clock = null;
        this._raf = null;
        this._lastTime = 0;
        this._FRAME_INTERVAL = 1000 / 24; // #frameRate

        this._camPos = new THREE.Vector3(0.3, 0.5, 7); //#camera pos | preset: zoom(-0.7, 0.9, 4) default(0.3, 0.5, 7)
        this._camTarget = new THREE.Vector3(0, 0, 0);

        this._growTarget = null;
        this._accumTarget = null;
        this._prevTarget = null;

        this._growScene = null;
        this._accumScene = null;
        this._dispScene = null;
        this._growUniforms = null;
        this._accumUniforms = null;
        this._dispUniforms = null;
        this._quadCam = null;

        // grow 큐
        this._queue = [];
        this._growing = false;
        this._instantBake = false;
        this._growStart = 0;
        this._isFirstGlyph = true;
        this._prevSylCount = 0;
        this._forceComplete = false; // single-flag: force current syllable to growT=1

        // hub state: syllable index -> { center: Vector3, connections: number }
        // 트리거: 자음이 비음/유음이 아니면(파열/파찰/마찰), 다음 음절로 넘어가는 순간 무조건 허브로 등록
        this._hubs = new Map();

        this.lineHeightRatio = 4.0;
        this.sylSize = 100; // per-receiver sylSize : #fontSize (alien 기본 fallback=55보다 크게)
        this.wrapStep = 200; // 자간(px)
        this.wrapMargin = 0;
        // 카메라(0.7, 0.5, 7) 오프셋으로 화면이 압축되어 보이는 것 보정
        // x=1.0이면 보정 없음. 1.3~1.6 사이에서 화면을 꽉 채우는 값을 찾아서 조절
        this.layoutScale = { x: 1.28, y: 1.0 };
    }

    // ── Receiver 인터페이스 ──────────────────────────────────────────────────────

    async init(canvas) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio, 2.0); // # pixel density DPR

        this._renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas ?? undefined });
        this._renderer.setSize(W, H);
        this._renderer.setPixelRatio(dpr);
        if (!canvas) {
            this._renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;';
            document.body.appendChild(this._renderer.domElement);
        }

        this._clock = new THREE.Clock();
        this._quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        };
        const rW = W * dpr,
            rH = H * dpr;
        this._growTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);
        this._accumTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);
        this._prevTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);

        const { ro, camMat, fov } = this._calcCamera();

        // Pass 1 — grow
        this._growUniforms = {
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_dpr: { value: dpr },
            u_time: { value: 0 },
            u_ro: { value: ro },
            u_camMat: { value: camMat },
            u_fov: { value: fov },
            u_start: { value: new THREE.Vector3() },
            u_center: { value: new THREE.Vector3() },
            u_cho: { value: new THREE.Vector3() },
            u_end: { value: new THREE.Vector3() },
            u_jung: { value: new THREE.Vector3() },
            u_hubCenters: { value: [new THREE.Vector3(), new THREE.Vector3()] },
            u_connCount: { value: 0 },
            u_amp: { value: 0 },
            u_yangseong: { value: 0 },
            u_diphthong: { value: 0 },
            u_growT: { value: 0 },
            u_materialMode: { value: 2 }, // 0=crosshatch, 1=태양, 2=금속
        };
        this._growScene = this._makeQuadScene(vertSrc, growFrag, this._growUniforms);

        // Pass 2 — accum
        this._accumUniforms = {
            u_growTex: { value: this._growTarget.texture },
            u_bckbuffer: { value: this._prevTarget.texture },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_isFirst: { value: 1.0 },
        };
        this._accumScene = this._makeQuadScene(vertSrc, accumFrag, this._accumUniforms);

        // Pass 3 — display
        this._dispUniforms = {
            u_accumTex: { value: this._accumTarget.texture },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_dispMatMode: { value: 2 }, // 0=crosshatch, 1=태양, 2=금속
        };
        this._dispScene = this._makeQuadScene(vertSrc, dispFrag, this._dispUniforms);

        window.addEventListener('resize', this._onResize);
        this._raf = requestAnimationFrame(this._animate);
    }

    forceRebake(uniformData, sylCount) {
        if (!uniformData || sylCount === 0) return;
        const { starts, centers, chos, ends, jungs, amps, yangseong, diphthong } = uniformData;
        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
        for (let i = 0; i < sylCount; i++) {
            this._queue.push(
                this._makeItem(
                    starts[i],
                    centers[i],
                    chos[i],
                    ends[i],
                    jungs[i],
                    amps[i],
                    yangseong[i],
                    diphthong[i],
                    true,
                ),
            );
        }
        this._prevSylCount = sylCount;
        this._dequeue();
    }

    update(uniformData, newSylCount = 0, sylItems = null) {
        if (!uniformData) return;
        const { starts, centers, chos, ends, jungs, amps, yangseong, diphthong, confirmed } = uniformData;
        const prevCount = this._prevSylCount;

        if (newSylCount < prevCount) {
            this._queue = [];
            this._growing = false;
            this._isFirstGlyph = true;
            this._hubs = new Map(); // index shifted -> reset hub state
            for (let i = 0; i < newSylCount; i++) {
                this._queue.push(
                    this._makeItem(
                        starts[i],
                        centers[i],
                        chos[i],
                        ends[i],
                        jungs[i],
                        amps[i],
                        yangseong[i],
                        diphthong[i],
                        true,
                    ),
                );
            }
        } else {
            for (let i = prevCount; i < newSylCount; i++) {
                // 이전 음절(i-1)이 확정됨 — 자음이 비음/유음이 아니면(파열/파찰/마찰) 무조건 허브로 등록
                if (i > 0) {
                    this._maybeRegisterHub(i - 1, uniformData);
                }

                // connection thread trigger — 된/거센소리, 연음, 종성 존재 중 만족 개수에 따라 연결 0~2개
                let hubCenters = [];
                if (sylItems && sylItems[i]) {
                    const cho = chos[i];
                    const tense = cho.z >= 0.65; // 된소리(0.67) + 거센소리(1.0)
                    const prevSyl = sylItems[i - 1];
                    const curSyl = sylItems[i];
                    const yeonum = i > 0 && !!prevSyl?.jong && curSyl.cho === 'ㅇ';
                    const hasJong = !!curSyl.jong;

                    const triggerCount = [tense, yeonum, hasJong].filter(Boolean).length;
                    const desired = triggerCount >= 2 ? 2 : triggerCount >= 1 ? 1 : 0;

                    if (desired > 0) {
                        const targets = this._pickHubTargets(desired);
                        hubCenters = targets.map(t => t.center);
                    }
                }

                const isInstant = confirmed ? confirmed[i] : false;
                this._queue.push(
                    this._makeItem(
                        starts[i],
                        centers[i],
                        chos[i],
                        ends[i],
                        jungs[i],
                        amps[i],
                        yangseong[i],
                        diphthong[i],
                        isInstant,
                        hubCenters,
                        hubCenters.length,
                    ),
                );
            }
            if (newSylCount > prevCount && prevCount > 0 && this._growing) {
                this._growUniforms.u_end.value.copy(ends[prevCount - 1]);
                this._forceComplete = true;
            }
        }

        this._prevSylCount = newSylCount;
        if (!this._growing) this._dequeue();
    }

    // 음절 i가 확정될 때 호출 — cho.y(조음방법)가 비음(0.75)/유음(1.0)이 아니면 허브로 등록
    // 허브 위치 = 셀 중심 + 자음 조음위치/방법/긴장도(cho.xyz, 0~1) 기반 로컬 오프셋
    _maybeRegisterHub(i, uniformData) {
        const cho = uniformData.chos[i];
        if (cho.y >= 0.75) return; // 비음/유음 제외

        const amp = uniformData.amps[i];
        const choOffset = new THREE.Vector3((cho.x - 0.5) * 2, (cho.y - 0.5) * 2, (cho.z - 0.5) * 2).multiplyScalar(
            amp * 0.6,
        ); // 0.6: 셀 내부 오프셋 강도, 조절 포인트

        const hubCenter = uniformData.centers[i].clone().add(choOffset);
        this._hubs.set(i, { center: hubCenter, connections: 0 });
    }

    // mother tree: 가중치(연결 많은 허브일수록 잘 뽑힘)로 최대 count개의 허브를 중복 없이 선택
    _pickHubTargets(count) {
        const picks = [];
        const used = new Set();
        for (let n = 0; n < count; n++) {
            const entries = [...this._hubs.entries()].filter(([id]) => !used.has(id));
            if (entries.length === 0) break;
            const weights = entries.map(([, h]) => h.connections + 1);
            const total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total;
            let chosen = entries[entries.length - 1];
            for (let idx = 0; idx < entries.length; idx++) {
                r -= weights[idx];
                if (r <= 0) {
                    chosen = entries[idx];
                    break;
                }
            }
            const [id, hub] = chosen;
            hub.connections++;
            used.add(id);
            picks.push(hub);
        }
        return picks;
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        this._growTarget?.dispose();
        this._accumTarget?.dispose();
        this._prevTarget?.dispose();
        this._renderer?.dispose();
        const el = this._renderer?.domElement;
        if (el?.parentNode) el.parentNode.removeChild(el);
    }

    // ── 공개 유틸 ─────────────────────────────────────────────────────────────────

    // materialMode 전환 (0=crosshatch, 1=태양, 2=금속)
    setMaterialMode(mode) {
        if (this._growUniforms) {
            this._growUniforms.u_materialMode.value = mode;
        }
        if (this._dispUniforms) {
            this._dispUniforms.u_dispMatMode.value = mode;
        }
    }

    // 큐가 빌 때까지 대기 후 2프레임 더 기다려 마지막 bake 확정
    flushQueue() {
        const wait2 = resolve => requestAnimationFrame(() => requestAnimationFrame(resolve));

        if (!this._growing && this._queue.length === 0) {
            return new Promise(wait2);
        }
        return new Promise(resolve => {
            const check = () => {
                if (!this._growing && this._queue.length === 0) {
                    wait2(resolve);
                } else {
                    requestAnimationFrame(check);
                }
            };
            requestAnimationFrame(check);
        });
    }

    captureFrame() {
        const rW = this._accumTarget.width;
        const rH = this._accumTarget.height;
        const buf = new Uint8Array(rW * rH * 4);
        this._renderer.readRenderTargetPixels(this._accumTarget, 0, 0, rW, rH, buf);

        const cvs = document.createElement('canvas');
        cvs.width = rW;
        cvs.height = rH;
        const ctx = cvs.getContext('2d');
        const imgData = ctx.createImageData(rW, rH);
        for (let y = 0; y < rH; y++) {
            const srcRow = (rH - 1 - y) * rW * 4;
            const dstRow = y * rW * 4;
            imgData.data.set(buf.subarray(srcRow, srcRow + rW * 4), dstRow);
        }
        ctx.putImageData(imgData, 0, 0);
        return cvs.toDataURL('image/png');
    }

    // accumTarget 초기화 (제출 후 새 줄 시작)
    clearAccum() {
        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
        this._prevSylCount = 0;
        this._hubs = new Map();

        const prevClear = this._renderer.getClearColor(new THREE.Color());
        const prevAlpha = this._renderer.getClearAlpha();
        this._renderer.setClearColor(0x000000, 0);
        this._renderer.setRenderTarget(this._accumTarget);
        this._renderer.clear();
        this._renderer.setRenderTarget(this._prevTarget);
        this._renderer.clear();
        this._renderer.setRenderTarget(null);
        this._renderer.setClearColor(prevClear, prevAlpha);
    }

    // ── 내부 ─────────────────────────────────────────────────────────────────────

    _makeItem(start, center, cho, end, jung, amp, yang, diph, instant, hubCenters = [], connCount = 0) {
        return {
            start: start.clone(),
            center: center.clone(),
            cho: cho.clone(),
            end: end.clone(),
            jung: jung.clone(),
            amp,
            yang,
            diph,
            instant,
            hubCenters: hubCenters.map(v => v.clone()),
            connCount,
        };
    }

    _dequeue() {
        if (this._queue.length === 0) return;
        const item = this._queue.shift();
        const u = this._growUniforms;
        u.u_start.value.copy(item.start);
        u.u_center.value.copy(item.center);
        u.u_cho.value.copy(item.cho);
        u.u_end.value.copy(item.end);
        u.u_jung.value.copy(item.jung);
        u.u_amp.value = item.amp;
        u.u_yangseong.value = item.yang;
        u.u_diphthong.value = item.diph;
        u.u_hubCenters.value[0].copy(item.hubCenters[0] ?? new THREE.Vector3());
        u.u_hubCenters.value[1].copy(item.hubCenters[1] ?? new THREE.Vector3());
        u.u_connCount.value = item.connCount ?? 0;
        u.u_growT.value = 0.0;
        this._growStart = this._clock.getElapsedTime();
        this._growing = true;
        this._instantBake = item.instant;
    }

    _swapAndAccum(isFirst) {
        const tmp = this._prevTarget;
        this._prevTarget = this._accumTarget;
        this._accumTarget = tmp;

        this._accumUniforms.u_bckbuffer.value = this._prevTarget.texture;
        this._accumUniforms.u_isFirst.value = isFirst ? 1.0 : 0.0;
        this._dispUniforms.u_accumTex.value = this._accumTarget.texture;

        this._renderer.setRenderTarget(this._accumTarget);
        this._renderer.render(this._accumScene, this._quadCam);
    }

    _animate = timestamp => {
        this._raf = requestAnimationFrame(this._animate);
        if (timestamp - this._lastTime < this._FRAME_INTERVAL) return;
        this._lastTime = timestamp;

        this._growUniforms.u_time.value = this._clock.getElapsedTime();

        if (!this._growing) {
            this._renderer.setRenderTarget(null);
            this._renderer.render(this._dispScene, this._quadCam);
            return;
        }

        let growT;
        if (this._instantBake) {
            growT = 1.0;
            this._growUniforms.u_growT.value = 1.0;
            this._renderer.setRenderTarget(this._growTarget);
            this._renderer.render(this._growScene, this._quadCam);
            this._swapAndAccum(this._isFirstGlyph);
            this._isFirstGlyph = false;
            this._growing = false;
            // 다음 프레임에 dequeue — 현재 프레임 렌더가 완전히 끝난 후 uniform 교체
            requestAnimationFrame(() => this._dequeue());
            return;
        } else {
            const prev = this._growUniforms.u_growT.value;
            growT = this._forceComplete ? 1.0 : prev + (1.0 - prev) * 0.08; //#growT step default 0.08
            this._forceComplete = false;
            this._growUniforms.u_growT.value = growT >= 0.98 ? 1.0 : growT;
        }

        this._renderer.setRenderTarget(this._growTarget);
        this._renderer.render(this._growScene, this._quadCam);

        this._swapAndAccum(this._isFirstGlyph);
        this._isFirstGlyph = false;

        this._renderer.setRenderTarget(null);
        this._renderer.render(this._dispScene, this._quadCam);

        if (growT >= 1.0) {
            this._growing = false;
            this._dequeue();
        }
    };

    _calcCamera() {
        const cam = this._camPos.clone();
        const target = this._camTarget.clone();
        const camDir = target.clone().sub(cam).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(camDir, up).normalize();
        const camUp = new THREE.Vector3().crossVectors(right, camDir).normalize();
        const camMat = new THREE.Matrix3().set(
            right.x,
            right.y,
            right.z,
            camUp.x,
            camUp.y,
            camUp.z,
            -camDir.x,
            -camDir.y,
            -camDir.z,
        );
        const fov = 1.0 / Math.tan(THREE.MathUtils.degToRad(45) / 2.0);
        return { ro: cam, camMat, fov };
    }

    _makeQuadScene(vert, frag, uniforms) {
        const scene = new THREE.Scene();
        scene.add(
            new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag }),
            ),
        );
        return scene;
    }

    _onResize = () => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const dpr = this._renderer.getPixelRatio();
        const rW = W * dpr,
            rH = H * dpr;

        this._renderer.setSize(W, H);
        this._growTarget.setSize(rW, rH);
        this._accumTarget.setSize(rW, rH);
        this._prevTarget.setSize(rW, rH);

        const res = new THREE.Vector2(rW, rH);
        this._growUniforms.u_resolution.value.copy(res);
        this._accumUniforms.u_resolution.value.copy(res);
        this._dispUniforms.u_resolution.value.copy(res);

        const { ro, camMat, fov } = this._calcCamera();
        this._growUniforms.u_ro.value.copy(ro);
        this._growUniforms.u_camMat.value.copy(camMat);
        this._growUniforms.u_fov.value = fov;

        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
    };
}
