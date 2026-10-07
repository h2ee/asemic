// ── mycelium.js ───────────────────────────────────────────────────────────────
// 균사체(곰팡이) 수신자
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
// ── 특징 ─────────────────────────────────────────────────────────────────────
//  1. syllablePath에 ep4(작은 에피사이클) 추가 — 균사 끝부분 미세 흔들림/잔가지
//  2. taper에 노이즈 기반 불규칙성 추가 — 매듭처럼 굵기가 불균일한 균사
//  3. map()에 lump(혹) 추가 — 경로 위 랜덤 위치에 작은 구, g_matID로 body/lump 구분
//  4. 재질은 금속 하나만 사용 — body/lump 색 파이프라인 분리(옵션 A: 현재는 동일색)
//     + edge rim을 검은 edge glow로 사용
//  5. 연결 실 / mother tree 허브 로직 — 음절당 최대 2개, 허브 중복 없이 선택
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

// ── 파라미터 ─────────────────────────────────────────────────────────────────
// d3(고주파 노이즈) 디테일 처리 방식
//   false: bump map — 가벼움
//   true : displacement — 실루엣 디테일, 무거움
const D3_DISPLACE_DEFAULT = true;

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
    float angle = t * TWO_PI * 5.0; // 에피사이클 회전 3.0 ~12. default 5
    float r1 = amp*(1.0/1.75), r2=r1*0.5, r3=r1*0.25;

    vec3 ep1 = orbitalPoint(r1, f1, angle, cho.x * TWO_PI,           cho.y * PI, 0.03); //0.3
    vec3 ep2 = orbitalPoint(r2, f2, angle, cho.y * TWO_PI + yang*PI, cho.z * PI, 0.25); //0.25
    vec3 ep3 = orbitalPoint(r3, f3, angle, cho.z * TWO_PI + diph*PI, yang  * PI, 0.65); //0.65

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
// 글자 전체 균일 스케일(음절 중심 기준). 모양은 늘 기준 크기(1단계)로 계산하고 여기서만
// 줄인다 → 작아져도 굵기·혹·노이즈 결이 같은 비율로 줄어 "같은 글자가 작아진 것"으로 보인다.
// map(p) = s · map_ref(center + (p-center)/s) — SDF의 정확한 균일 스케일.
uniform float u_glyphScale;
uniform float u_yangseong;
uniform float u_diphthong;
uniform float u_growT;
uniform float u_d3Displace;   // d3(고주파 노이즈) 처리 방식: 0=bump map만(가벼움), 1=거리장 displacement(디테일↑)

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

// ── 경로 사전계산 텍스처 (2026-09-26) ──────────────────────────────────────────
// 경로 점/테이퍼 노이즈/혹 위치는 음절 uniform만의 함수라 픽셀·스텝마다 다시 계산할
// 이유가 없다. 음절이 바뀔 때 pathFrag가 151×3 float 텍스처에 한 번 구워 두고 map()은
// 읽기만 한다(같은 GPU·같은 GLSL 식). u_usePathTex=0 이면 예전처럼 직접 계산.
//   row0: i=0..150 → (syllablePath(i/150), taperNoise(i/150))
//   row1: j=0..53  → (lumpPos, lumpR)      row2: j → (lt, 0, 0, 0)
uniform sampler2D u_pathTex;
uniform float     u_usePathTex;
#define PATH_TEX_W 151.0
vec4 pathTexel(float i, float row) {
  return texture2D(u_pathTex, vec2((i + 0.5) / PATH_TEX_W, (row + 0.5) / 3.0));
}

float taperNoiseAt(float t0) {
  return 0.8 + 0.6 * noise(vec3(t0 * 18.0, u_cho.x * 7.0, u_cho.z * 3.0));
}

// 혹 j 하나 — map()에 있던 식 그대로 옮김(growT 조건만 호출부에 남김)
void lumpAt(int j, out float lt, out vec3 lumpPos, out float lumpR) {
  float f1 = u_jung.x, f2 = u_jung.y, f3 = u_jung.z;
  float amp = u_amp, yang = u_yangseong, diph = u_diphthong;
  float k = 0.08, rad = 0.007;
  float seed = u_cho.x * 13.7 + u_cho.z * 5.3 + f1 * 0.01;
  float numLumps = 20.0 + u_cho.z * 34.0;
  float fj = float(j) * 91.7;

    // 문제2: 무작위 lt 대신 j마다 구간을 나눠 고르게 분산 (stratified) + 약간의 지터
    float jitter = hash(vec3(fj + seed * 3.1, seed, fj * 0.37));
    lt = (float(j) + 0.15 + jitter * 0.05) / numLumps;

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

    lumpR  = rad * (1.0 + hash(vec3(fj * 13.7 + seed, seed, 1.0)) * 1.8) * 2.2; // 크기 0.8배
    // lump 중심을 본체 표면 근처에 배치 → 절반은 묻히고 절반은 튀어나오는 혹 형태
    lumpPos = pathPos + perpDir * bodyR;
}

float map(vec3 p) {
  p = u_center + (p - u_center) / u_glyphScale; // 기준 크기 공간으로 (끝에서 d에 s를 곱해 되돌림)
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
    vec3 a, b;
    float taperNoise;
    if (u_usePathTex > 0.5) {
      vec4 ta = pathTexel(float(i), 0.0);
      a = ta.xyz;
      taperNoise = ta.w;
      // t1 <= growT 이면 t1c == t1 → 다음 점 그대로. 자라는 끝 구간 하나만 직접 계산
      b = (t1 <= u_growT) ? pathTexel(float(i + 1), 0.0).xyz
                          : syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t1c, yang, diph);
    } else {
      a = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t0,  yang, diph);
      b = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t1c, yang, diph);
      taperNoise = taperNoiseAt(t0);
    }
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
    // taperNoise: 위에서 텍스처(또는 taperNoiseAt)로 — 식은 taperNoiseAt 참고
    float taper = taperBase * taperNoise;
    float d1 = sdCapsule(p, a, b, rad * taper);

    float d2 = sin(p.y * 10.0) * 0.1 * 0.175-0.0155; //for 태양 material
    // d3(고주파 노이즈): 기본은 실루엣/거리장에서 제외하고 bump map으로만 사용(가벼움).
    //   u_d3Displace > 0.5 이면 예전처럼 거리장에 직접 더해 실루엣까지 우글거리게 함(무거움, 디테일 look용).
    //   이땐 이중 적용 방지를 위해 growFrag의 applyBump를 끔.
    float displaced = d1 + d2;
    if (u_d3Displace > 0.5) displaced += 0.008 * noise(p * 95.0); //진폭(돌출), 주파수(촘촘함)

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
        vec3 hub = u_center + (u_hubCenters[c] - u_center) / u_glyphScale; // 허브(실제 위치)도 기준 공간으로
        float cSeed = seed + float(c) * 7.0; // 두 연결선이 다르게 휘도록 시드 분리

        vec3 mid = mix(u_center, hub, 0.5);
        mid += vec3(hash(vec3(cSeed, 1.0, 2.0)) - 0.5, hash(vec3(cSeed, 3.0, 4.0)) - 0.5, 0.0) * 0.8; // 0.3 = 휘어짐 강도, 조절 포인트

        float dConn = min(
            sdCapsule(p, u_center, mid, rad * 1.8),
            sdCapsule(p, mid, hub, rad * 0.3)
        );

        // 타겟 쪽 작은 앵커 blop
        float dAnchor = sdSphere(p - hub, rad * 0.2);
        dConn = opSmoothUnion(dConn, dAnchor, k * 1.6); // 앵커 쪽 melt 강도

        d = opSmoothUnion(d, dConn, k * 1.4);
    }
  }

  for (int j = 0; j < 54; j++) {
    if (float(j) >= numLumps * u_growT) break;
    float lt, lumpR;
    vec3 lumpPos;
    if (u_usePathTex > 0.5) {
      vec4 L = pathTexel(float(j), 1.0);
      lumpPos = L.xyz;
      lumpR = L.w;
      lt = pathTexel(float(j), 2.0).x;
    } else {
      lumpAt(j, lt, lumpPos, lumpR);
    }
    if (lt > u_growT) continue; // 아직 도달 안 한 위치 — 스킵 (트레일 방지)

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

  return d * u_glyphScale;
}


// ── 경계 판정 (2026-09-26) ─────────────────────────────────────────────────────
// 레이마칭은 전체 화면 픽셀마다 map()(캡슐 150개 + 혹 최대 54개)을 최대 20번 부른다.
// 음절은 화면의 일부만 차지하므로, 광선이 음절 경계에 아예 안 닿는 픽셀은 레이마칭 전에
// 버린다(TD 실측: growT=1 한 패스 482ms → TD fps 1~5). 닿는 픽셀은 예전과 똑같이 t=0부터
// 레이마칭하므로 룩은 그대로 — 버려지는 픽셀은 원래도 아무것도 안 맞던 픽셀이어야 한다.
//   경로 반경 ≤ 1.2·(r1+r2+r3) + ep4 ≈ 1.29·amp,  끝점 pull = u_center + u_end
//   BOUND_MARGIN: 혹(≤0.11) + d2 변형(0.033) + thinD 오프셋(|a|/45 ≈ 0.13) + smooth-union
//   부풀음 + noise — 전부 합쳐도 0.35 안쪽. 글자 끝이 잘려 보이면 이 값을 올릴 것
#define BOUND_MARGIN 0.45
// 연결 실: center→mid→hub, mid는 center-hub 중점에서 xy로 최대 ±0.4 → 선분에서 ≤0.57
#define CONN_MARGIN  0.75

bool hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b * b - (dot(oc, oc) - r * r);
  return h >= 0.0 && (-b + sqrt(h)) > 0.0;
}

// 광선과 선분(pa-pb) 사이 최단거리 < r 인가 (캡슐 판정)
bool hitCapsule(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float r) {
  vec3 ba = pb - pa, oa = ro - pa;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
  float a = baba - bard * bard;
  float b = baba * rdoa - baoa * bard;
  float c = baba * oaoa - baoa * baoa - r * r * baba;
  float h = b * b - a * c;
  if (h >= 0.0 && a > 1e-6) {
    float t = (-b - sqrt(h)) / a;
    float y = baoa + t * bard;
    if (y > 0.0 && y < baba) return true;
  }
  return hitSphere(ro, rd, pa, r) || hitSphere(ro, rd, pb, r);
}

bool hitSyllableBounds(vec3 ro, vec3 rd) {
  float R = (max(1.3 * u_amp, length(u_end)) + BOUND_MARGIN) * u_glyphScale;
  if (hitSphere(ro, rd, u_center, R)) return true;
  if (u_growT >= 0.99) {
    for (int c = 0; c < 2; c++) {
      if (float(c) >= u_connCount) break;
      if (hitCapsule(ro, rd, u_center, u_hubCenters[c], CONN_MARGIN * u_glyphScale)) return true;
    }
  }
  return false;
}

float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float d = map(ro + rd * t);
    if (d < EPS * u_glyphScale) return t; // 명중 임계도 같이 스케일 — 안 하면 작을수록 뚱뚱해짐
    t += d;
    if (t > MAX_DIST) break;
  }
  return -1.0;
}

vec3 estimateNormal(vec3 p) {
  vec2 e = vec2(0.005 * u_glyphScale, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// d3를 raymarch용 map()에서 빼고 여기서 bump map으로만 적용 (테스트)
// -- map()/raymarch 루프에서 noise(p*95.0)를 반복 호출하지 않아도 되므로 훨씬 가벼움.
float bumpMap(vec3 p) {
  return 0.05 * noise(p * 105.0); //진폭(돌출) 주파수(촘촘함 정도)
}

vec3 applyBump(vec3 p, vec3 n) {
  p = u_center + (p - u_center) / u_glyphScale; // bump 결도 기준 공간에서
  vec2 e = vec2(0.005, 0.0);
  vec3 grad = vec3(
    bumpMap(p + e.xyy) - bumpMap(p - e.xyy),
    bumpMap(p + e.yxy) - bumpMap(p - e.yxy),
    bumpMap(p + e.yyx) - bumpMap(p - e.yyx)
  );
  return normalize(n + grad * 12.0);
}

float rand(vec3 p){
  float sd  = dot(p, vec3(13.4545, 17.1717, 31.3131));
  float sd2 = dot(p, vec3(23.4545, 27.1717, 11.3131));
  return fract(sin(sd + sd2) * 45678.54321);
}
`;

// ── Pass 0: 경로 사전계산 (음절이 바뀔 때 한 번, 151×3 float) ─────────────────
const pathFrag = `
#ifdef GL_ES
precision highp float;
#endif

${sdfSrc}

void main() {
    float i   = floor(gl_FragCoord.x);
    float row = floor(gl_FragCoord.y);
    if (row < 0.5) {
        float t0 = i / 150.0;
        vec3 P = syllablePath(u_start, u_center, u_cho, u_jung.x, u_jung.y, u_jung.z, u_amp, t0, u_yangseong, u_diphthong);
        gl_FragColor = vec4(P, taperNoiseAt(t0));
    } else {
        float lt, lumpR;
        vec3 lumpPos;
        lumpAt(int(i), lt, lumpPos, lumpR);
        gl_FragColor = row < 1.5 ? vec4(lumpPos, lumpR) : vec4(lt, 0.0, 0.0, 0.0);
    }
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

    float t = hitSyllableBounds(u_ro, rd) ? raymarch(u_ro, rd) : -1.0;

    if (t < 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec3 pos = u_ro + rd * t;

    vec3 nor = estimateNormal(pos);
    // d3 처리 방식 분기: displacement 모드(u_d3Displace>0.5)면 map()이 이미 디테일을 갖고 있으므로 bump 생략
    if (u_d3Displace < 0.5) nor = applyBump(pos, nor);
    // 표면 지점에서의 재질 ID(g_matID) 확정 (estimateNormal의 마지막 호출값은 오프셋 지점이므로 재계산)
    float _surfD = map(pos);

    vec3 V      = normalize(-rd);
    vec3 choCol = u_cho;//choToColor(u_cho);
    vec3 col    = vec3(0.0);

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

    // 외곽 발광 — 검은 edge glow로 적용
    float rim = pow(1.0 - max(dot(nor, V), 0.0), 1.2);
    float flareStr = 1.4;//0.6 + choCol.z * 0.8;
    col = mix(col, vec3(0.0), rim * rim * flareStr * 1.2);

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
// transparent=false: 배경색 vec3(0.7)을 섞어 alpha=1로 출력 (전시 스탠드얼론 페이지)
// transparent=true : straight alpha 그대로 출력 (크롬 PNG / TD 합성)
// ── 흩어짐(glyphmode disperse) ────────────────────────────────────────────────
// disperse()가 지우기 직전의 화면을 u_ghostTex로 한 번 복사해 두면, 표시 패스가 그걸
// u_ghostT(0→1) 동안 흩어 없앤다: 저주파 노이즈 방향으로 덩어리째 흘러가며(살짝 위로 떠오름)
// 고주파 알갱이부터 문턱 아래로 떨어져 사라진다(포자처럼). 새 글자(accum)는 그 위에 over.
// 알파는 accum과 같은 straight alpha.
const DISPERSE_MS = 1600; // #disperse 길이
const composeGlsl = `
uniform sampler2D u_accumTex;
uniform sampler2D u_ghostTex;
uniform float     u_ghostT;
uniform vec2      u_resolution;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec4 ghostAt(vec2 uv) {
    float p = u_ghostT;
    if (p >= 1.0) return vec4(0.0);
    vec2 asp = vec2(u_resolution.x / u_resolution.y, 1.0);
    // 덩어리(저주파)마다 다른 방향으로 흘러가고 전체는 조금 떠오른다(uv.y 위 = +)
    vec2 dir = vec2(vnoise(uv * asp * 6.0 + 3.1), vnoise(uv * asp * 6.0 + 7.7)) - 0.5;
    vec2 suv = uv - (dir * 0.06 + vec2(0.0, 0.025)) * p * p; // #disperse 흩어지는 거리
    vec4 g = texture2D(u_ghostTex, suv);
    // 침식 — 고주파 알갱이 + 중간 덩어리. 문턱이 -0.1→1.05로 올라가며 전부 사라진다
    vec2 sq = suv * asp;
    float n = vnoise(sq * 160.0) * 0.55 + vnoise(sq * 22.0) * 0.45; // #disperse 알갱이 크기
    float th = mix(-0.1, 1.05, p);
    g.a *= smoothstep(th, th + 0.08, n);
    return g;
}

// accum over ghost (straight alpha)
vec4 compose(vec2 uv) {
    vec4 a = texture2D(u_accumTex, uv);
    vec4 g = ghostAt(uv);
    float outA = a.a + g.a * (1.0 - a.a);
    vec3 rgb = outA > 0.0 ? (a.rgb * a.a + g.rgb * g.a * (1.0 - a.a)) / outA : vec3(0.0);
    return vec4(rgb, outA);
}
`;

// disperse() — 지금 보이는 그대로(accum + 흩어지던 ghost)를 새 ghost로 굽는다
const ghostFrag = `
#ifdef GL_ES
precision highp float;
#endif
${composeGlsl}
void main() {
    gl_FragColor = compose(gl_FragCoord.xy / u_resolution);
}
`;

const makeDispFrag = transparent => `
#ifdef GL_ES
precision highp float;
#endif
${composeGlsl}
void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution;
    vec4 acc = compose(uv);

    ${transparent
        ? 'gl_FragColor = vec4(acc.rgb, acc.a);'
        : 'gl_FragColor = vec4(mix(vec3(0.7), acc.rgb, acc.a), 1.0);// #bg color'}
}
`;

// ── 스크롤 패스: 누적 버퍼를 정수 px만큼 민 사본 ───────────────────────────────
// glyphmode scroll/tape. 정수 픽셀만 밀기 때문에 텍셀 중심끼리 복사돼 몇 번을 밀어도 흐려지지 않는다.
// u_shift = (k, 0) 왼쪽으로(tape, 가로) / (0, -k) 위로(scroll, 세로 — GL은 y가 위로 증가).
// 새로 들어오는 자리는 투명, 밖으로 빠져나간 건 버려진다.
const shiftFrag = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_src;
uniform vec2      u_resolution;
uniform vec2      u_shift;

void main() {
    vec2 uv = (gl_FragCoord.xy + u_shift) / u_resolution;
    bool inside = uv.x >= 0.0 && uv.x < 1.0 && uv.y >= 0.0 && uv.y < 1.0;
    gl_FragColor = inside ? texture2D(u_src, uv) : vec4(0.0);
}
`;

// 목표 스크롤 위치로 다가가는 비율(프레임당, 24fps 기준). 한 음절 폭이 ~1초에 걸쳐 흘러간다
const SCROLL_EASE = 0.12;

// ── MyceliumReceiver ──────────────────────────────────────────────────────────

export class MyceliumReceiver {
    // opts.transparentOutput: 최종 표시 패스를 배경색 합성 없이 straight alpha로 출력하고
    //   WebGLRenderer를 alpha:true로 만든다. TD Web Render TOP / 크롬 PNG 위 합성용.
    //   (전시 index.html은 이 옵션 없이 생성 → 기존 불투명 회색 배경 그대로.)
    constructor(opts = {}) {
        // 사운드 — 음절이 자라기 시작할 때 onSyllableStart를 직접 부른다(_dequeue). 페이지 대체 트리거는 끈다
        this.emitsSyllableStart = true;
        this._transparent = !!opts.transparentOutput;
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
        this._forceFinish = false; // sticky: force current + all queued syllables to growT=1 (bake)

        // hub state: syllable index -> { center: Vector3, connections: number }
        // 트리거: 자음이 비음/유음이 아니면(파열/파찰/마찰), 다음 음절로 넘어가는 순간 무조건 허브로 등록
        this._hubs = new Map();
        this._curScale = 1; // _makeItem 기본 scale — update()가 uniformData.scale로 갱신
        this._sylHubIds = []; // 음절 i가 연결 실을 뻗은 허브 id들 — 다시 구울 때 같은 연결을 재현
        this._bakedCenters = []; // 마지막 update의 음절 중심 — 바뀌면(크기/레이아웃 변경) 전체 재굽기
        this._bakedScale = 1; // 마지막 update의 glyphScale — 크기 노브는 중심을 안 옮기고 이것만 바꾼다
        // 재굽기 중(instant bake가 큐에 남음)에는 표시 패스를 안 그려서 화면엔 예전 모습이 남는다.
        // 페이지의 음절 네모가 이 동안 새 자리로 먼저 뛰지 않게 알려 준다(get rebaking)
        this._rebaking = false;

        // 2026-09-26 screenToWorld(정확한 역투영)로 바꾸면서 화면상 간격을 유지하도록 환산:
        //   예전 근사식은 가로 ~0.91배 / 세로 ~0.71배로 압축돼 보였다 → 180*0.91, 3.2*0.71
        this.lineHeightRatio = 2.3; // 3.2
        this.sylSize = 100; // per-receiver sylSize : #fontSize
        this.wrapStep = 165; // 자간(px) 180
        this.wrapMargin = 0;
        // 음절 중심에서 글자 끝까지(sylSize 배수) — core.js layoutFor가 가장자리 여백과
        // 넘침(→ 단계 축소) 판정에 쓴다. 에피사이클 이론상 최대는 ~1.84(r1+r2+r3 전부
        // 한 방향), 실측 대부분 1.2~1.5. 글자가 rect 끝에서 잘리면 올릴 것
        this.glyphExtent = 1.5;
        // 위 px 값들이 기준으로 삼는 뷰포트 높이(CSS px). core.js layoutFor가 H/refHeight 배로
        // 스케일해서, 어느 해상도에서든 이 높이에서 보던 글자 모양이 그대로 나온다.
        // 859 = 맥북 브라우저(1512×859)에서 룩을 잡던 때의 innerHeight
        this.refHeight = 859;
        // 카메라(0.7, 0.5, 7) 오프셋으로 화면이 압축되어 보이는 것 보정
        // x=1.0이면 보정 없음. 1.3~1.6 사이에서 화면을 꽉 채우는 값을 찾아서 조절
        this.layoutScale = { x: 1.28, y: 1.0 };
        // 룩을 그대로 둔 채 글자 전체를 키우는 배율 — core.js layoutFor 참고.
        // sylSize를 올리면 굵기가 안 따라와 가늘어진다. 크게 보고 싶으면 이걸 올릴 것
        this.displayScale = 1.2;

        // glyphmode scroll — 누적 버퍼를 왼쪽으로 민 양(디바이스 px). scrollTo()가 목표를 주고
        // _stepScroll()이 매 프레임 따라간다. _scrollBase는 정수(실제로 민 양), _scrollPos는 애니메이션 값
        this._scrollTarget = 0;
        this._scrollPos = 0;
        this._scrollBase = 0;
        this._shownScrollBase = 0; // 마지막으로 화면(표시 패스)에 나간 _scrollBase — 음절 네모가 이걸 따라간다
        this._scrollJump = true; // 다음 scrollTo는 애니메이션 없이 바로 그 자리로(비운 직후·리사이즈)
        // 미는 방향 — 'x' = 왼쪽(가로 테이프, glyphmode tape) / 'y' = 위(줄이 쌓이는 세로 스크롤, 2026-10-07).
        // 페이지가 setScrollAxis로 정한다. scrollTo/scrollBase는 이 축의 값(CSS px)이다
        this._scrollAxis = 'x';
        this._rect = null;

        this._ghostStart = null; // glyphmode disperse — 흩어짐 시작 시각(ms), null = 진행 중 아님

        // d3(고주파 노이즈) 디테일 방식 — 초기값은 파일 상단 D3_DISPLACE_DEFAULT, 런타임은 setD3Displace()
        this._d3Displace = D3_DISPLACE_DEFAULT;
    }

    // ── Receiver 인터페이스 ──────────────────────────────────────────────────────

    async init(canvas) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio, 2.0); // # pixel density DPR

        this._renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas ?? undefined,
            alpha: this._transparent,
            premultipliedAlpha: !this._transparent,
        });
        this._renderer.setSize(W, H);
        if (this._transparent) this._renderer.setClearColor(0x000000, 0);
        this._renderer.setPixelRatio(dpr);
        // 밖에서 받은 캔버스는 우리 것이 아니다 — dispose 때 지우면 안 된다(receiver 전환 시 화면이 사라짐)
        this._ownCanvas = !canvas;
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
        // 경로 사전계산(pathFrag) — 해상도와 무관한 151×3 float. 음절마다 _dequeue에서 한 번 굽는다
        this._pathTarget = new THREE.WebGLRenderTarget(151, 3, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
        });

        const { ro, camMat, fov } = this._calcCamera();

        // Pass 1 — grow
        this._growUniforms = {
            u_resolution: { value: new THREE.Vector2(rW, rH) },
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
            u_d3Displace: { value: this._d3Displace ? 1.0 : 0.0 },
            u_glyphScale: { value: 1.0 },
            u_pathTex: { value: this._pathTarget.texture },
            u_usePathTex: { value: 1.0 }, // 0 = 예전처럼 map()에서 직접 계산(비교/디버그용)
        };
        this._growScene = this._makeQuadScene(vertSrc, growFrag, this._growUniforms);
        // Pass 0 — path. 같은 uniform 객체를 공유하되 자기 출력(u_pathTex)은 빼서 피드백 바인딩을 막는다
        const { u_pathTex, ...pathUniforms } = this._growUniforms;
        this._pathScene = this._makeQuadScene(vertSrc, pathFrag, pathUniforms);

        // Pass 2 — accum
        this._accumUniforms = {
            u_growTex: { value: this._growTarget.texture },
            u_bckbuffer: { value: this._prevTarget.texture },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_isFirst: { value: 1.0 },
        };
        this._accumScene = this._makeQuadScene(vertSrc, accumFrag, this._accumUniforms);

        // Pass 3 — display
        this._ghostTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);
        this._ghostTarget2 = new THREE.WebGLRenderTarget(rW, rH, rtOpts);
        this._dispUniforms = {
            u_accumTex: { value: this._accumTarget.texture },
            u_ghostTex: { value: this._ghostTarget.texture },
            u_ghostT: { value: 1.0 }, // 1 = 흩어짐 없음
            u_resolution: { value: new THREE.Vector2(rW, rH) },
        };
        this._dispScene = this._makeQuadScene(vertSrc, makeDispFrag(this._transparent), this._dispUniforms);

        // disperse — accum + 이전 ghost → 새 ghost
        this._ghostUniforms = {
            u_accumTex: { value: null },
            u_ghostTex: { value: null },
            u_ghostT: { value: 1.0 },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
        };
        this._ghostScene = this._makeQuadScene(vertSrc, ghostFrag, this._ghostUniforms);

        // scroll — accum → prev 로 민 사본
        this._shiftUniforms = {
            u_src: { value: null },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_shift: { value: new THREE.Vector2() },
        };
        this._shiftScene = this._makeQuadScene(vertSrc, shiftFrag, this._shiftUniforms);

        window.addEventListener('resize', this._onResize);
        this._raf = requestAnimationFrame(this._animate);
    }

    forceRebake(uniformData, sylCount) {
        if (!uniformData || sylCount === 0) return;
        const { starts, centers, chos, ends, jungs, amps, yangseong, diphthong } = uniformData;
        this._curScale = uniformData.scale ?? 1;
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
        this._curScale = uniformData.scale ?? 1;

        // 이미 있던 음절의 중심이 움직였다 = 글자 크기가 바뀌었다(layoutFor 단계 축소, TD size
        // 노브, 리사이즈). accum에 구운 건 옮길 수 없으니 전부 새 자리에 다시 굽는다.
        const moved =
            newSylCount >= prevCount &&
            (this._bakedCenters.some((c, i) => i < prevCount && c.distanceToSquared(centers[i]) > 1e-8) ||
                (prevCount > 0 && Math.abs(this._curScale - this._bakedScale) > 1e-6)); // 크기 노브(제자리 확대)
        if (moved) this._rebake(uniformData, prevCount);
        this._bakedCenters = centers.slice(0, newSylCount).map(c => c.clone());
        this._bakedScale = this._curScale;

        if (newSylCount < prevCount) {
            this._queue = [];
            this._growing = false;
            this._isFirstGlyph = true;
            this._hubs = new Map(); // index shifted -> reset hub state
            this._sylHubIds = [];
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
                        this._sylHubIds[i] = targets.map(t => t.id);
                    }
                }

                const isInstant = confirmed ? confirmed[i] : false;
                const item = this._makeItem(
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
                );
                item.syl = sylItems?.[i] ?? null; // 자라기 시작할 때 onSyllableStart로 내보낼 음절
                this._queue.push(item);
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
            amp * 0.6 * (uniformData.scale ?? 1), // amp는 기준 크기 값 — 실제 크기로
        ); // 0.6: 셀 내부 오프셋 강도, 조절 포인트

        const hubCenter = uniformData.centers[i].clone().add(choOffset);
        this._hubs.set(i, { id: i, center: hubCenter, connections: 0 });
    }

    // 음절 0..count-1을 새 uniformData 자리에 즉시(instant) 다시 굽는다. 허브 중심도 새 자리로
    // 다시 계산하고, 각 음절이 예전에 고른 허브(_sylHubIds)에 그대로 연결 실을 뻗는다 —
    // 랜덤 선택을 다시 하지 않으므로 크기만 바뀌고 모양은 같다.
    _rebake(uniformData, count) {
        const { starts, centers, chos, ends, jungs, amps, yangseong, diphthong } = uniformData;
        for (const [id, hub] of this._hubs) {
            const cho = chos[id];
            const off = new THREE.Vector3((cho.x - 0.5) * 2, (cho.y - 0.5) * 2, (cho.z - 0.5) * 2).multiplyScalar(
                amps[id] * 0.6 * (uniformData.scale ?? 1),
            );
            hub.center = centers[id].clone().add(off);
        }
        this._queue = [];
        this._growing = false;
        this._forceComplete = false;
        this._isFirstGlyph = true; // 첫 bake가 accum을 비운다
        this._rebaking = count > 0;
        for (let i = 0; i < count; i++) {
            const hubCenters = (this._sylHubIds[i] ?? []).map(id => this._hubs.get(id)?.center).filter(Boolean);
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
                    hubCenters,
                    hubCenters.length,
                ),
            );
        }
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
        this._pathTarget?.dispose();
        this._ghostTarget?.dispose();
        this._ghostTarget2?.dispose();
        this._renderer?.dispose();
        const el = this._renderer?.domElement;
        if (this._ownCanvas && el?.parentNode) el.parentNode.removeChild(el);
    }

    // ── 공개 유틸 ─────────────────────────────────────────────────────────────────

    // 뷰포트 uv(0~1, 위→아래) → 그 픽셀을 지나는 광선이 z=0 평면과 만나는 월드 좌표.
    // growFrag의 rd 식(u_camMat * (uv.x, uv.y, -u_fov))을 그대로 뒤집은 것이라
    // 음절 중심이 레이아웃이 정한 화면 px에 정확히 떨어진다. core.syllablesToUniforms가
    // 이걸 받으면 sceneH/layoutScale 근사(화면 중심 쪽으로 ~0.71배 압축돼 보이던 원인)를
    // 안 쓴다.
    screenToWorld(u, v) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const { ro, camMat, fov } = this._calcCamera();
        const rd = new THREE.Vector3((u * 2 - 1) * (W / H), 1 - v * 2, -fov).applyMatrix3(camMat).normalize();
        return ro.clone().addScaledVector(rd, -ro.z / rd.z);
    }

    // screenToWorld의 역 — 월드 점 → 뷰포트 uv + 카메라 깊이. 스크롤로 민 만큼 월드 좌표를 옮길 때 쓴다
    _toScreen(p) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const { ro, camMat, fov } = this._calcCamera();
        const d = p.clone().sub(ro).applyMatrix3(camMat.clone().transpose()); // camMat은 정규직교
        const t = -d.z / fov;
        return { u: (d.x / t / (W / H) + 1) / 2, v: (1 - d.y / t) / 2, t };
    }

    // p를 화면에서 du(uv)만큼 왼쪽 / dv(uv)만큼 위로 민 자리 — 같은 카메라 깊이 유지(허브처럼 z≠0인 점용)
    _shiftAtDepth(p, du, dv = 0) {
        const { camMat } = this._calcCamera();
        const { t } = this._toScreen(p);
        const W = window.innerWidth;
        const H = window.innerHeight;
        return p.clone().add(new THREE.Vector3(-2 * du * (W / H) * t, 2 * dv * t, 0).applyMatrix3(camMat));
    }

    // glyphmode scroll: 페이지가 "테이프를 이만큼(CSS px) 왼쪽으로 밀어라"를 준다(core.layoutFor의 scrollX).
    // 실제로 미는 건 _stepScroll이 매 프레임 조금씩 — 그동안 페이지는 scrollBase만큼 뺀 자리로
    // 새 음절을 보낸다.
    // 미는 축 바꾸기. 이미 민 버퍼는 옛 축 기준이라 페이지가 모드를 바꿀 때 비운 뒤에 부른다
    setScrollAxis(axis) {
        if (axis === this._scrollAxis) return;
        this._scrollAxis = axis;
        this._scrollTarget = this._scrollPos = this._scrollBase = 0;
        this._scrollJump = true;
    }

    scrollTo(x) {
        const t = Math.max(0, x) * this._renderer.getPixelRatio();
        this._scrollTarget = t;
        if (this._scrollJump || t < this._scrollPos) {
            // 비운 직후·리사이즈·되돌아가기(지우기·크기 축소)는 애니메이션 없이 그 자리로.
            // 왼쪽으로 빠져나간 건 이미 버려졌지만, 이 경우엔 어차피 update가 전부 다시 굽는다
            // (음절 수 감소 → 재입력 경로 / 중심 이동 → _rebake).
            this._scrollJump = false;
            this._scrollPos = t;
            this._scrollBase = Math.round(t);
            return;
        }
        // 너무 뒤처지면(빠른 타이핑) 새 음절이 캔버스 오른쪽 밖에 구워져 사라진다 — 그만큼은 바로 민다.
        // 새 음절 오른쪽 끝 = rect 오른쪽 + (목표 - 민 양). 캔버스 끝까지 남은 폭의 80%까지만 허용
        const W = window.innerWidth;
        const H = window.innerHeight;
        const slackCss =
            this._scrollAxis === 'y'
                ? this._rect
                    ? H - (this._rect.y + this._rect.h)
                    : H * 0.1
                : this._rect
                  ? W - (this._rect.x + this._rect.w)
                  : W * 0.1;
        const maxLag = Math.max(1, slackCss * 0.8 * this._renderer.getPixelRatio());
        const k = Math.round(t - maxLag) - this._scrollBase;
        if (k > 0) {
            this._shiftAccum(k);
            this._scrollPos = Math.max(this._scrollPos, this._scrollBase);
        }
    }

    // glyphmode disperse: 지우기(clearAccum) **직전에** 부른다. 지금 보이는 그대로를 ghost로 떠 두고
    // DISPERSE_MS 동안 흩어 없앤다 — 그사이 새 글자는 비워진 accum에 자란다.
    // 이전 흩어짐이 아직 진행 중이면 반쯤 흩어진 그 모습째 새 ghost에 들어가 다시 흩어진다(툭 끊김 없음).
    disperse() {
        const r = this._renderer;
        const gu = this._ghostUniforms;
        gu.u_accumTex.value = this._accumTarget.texture;
        gu.u_ghostTex.value = this._ghostTarget.texture;
        gu.u_ghostT.value = this._dispUniforms.u_ghostT.value;
        r.setRenderTarget(this._ghostTarget2);
        r.render(this._ghostScene, this._quadCam);
        r.setRenderTarget(null);
        [this._ghostTarget, this._ghostTarget2] = [this._ghostTarget2, this._ghostTarget];
        this._dispUniforms.u_ghostTex.value = this._ghostTarget.texture;
        this._dispUniforms.u_ghostT.value = 0;
        this._ghostStart = performance.now();
    }

    // 누적 버퍼가 지금 실제로 밀려 있는 양(CSS px). 페이지는 테이프 좌표에서 이걸 빼서 보낸다
    get scrollBase() {
        return this._scrollBase / (this._renderer?.getPixelRatio() ?? 1);
    }
    // 화면에 실제로 보이는 스크롤 양(CSS px). scrollBase는 scrollTo가 뒤처짐을 메우느라 즉시 밀 때 먼저 바뀌고,
    // 그 결과는 다음 표시 패스(24fps)에야 보인다 — 화면 위 DOM(음절 네모)은 이쪽을 따라가야 글자와 같이 움직인다
    get shownScrollBase() {
        return this._shownScrollBase / (this._renderer?.getPixelRatio() ?? 1);
    }
    // 재굽기 중 — 화면엔 아직 예전 배치·크기가 떠 있다
    get rebaking() {
        return this._rebaking;
    }

    // 글자 영역 — scrollTo의 뒤처짐 한계 계산에만 쓴다(배치는 layoutFor가 positions로 끝낸다)
    setRect(rect) {
        this._rect = rect;
    }

    // d3(고주파 노이즈) 디테일 방식 전환 (UI 없음, 코드/콘솔에서 호출)
    //   false: bump map으로만 적용 — map()/raymarch에서 noise(p*95) 반복 호출 안 함, 가벼움 (기본)
    //   true : 예전처럼 거리장에 직접 더함 — 실루엣까지 우글거리는 디테일 look, 무거움
    // 이미 accum에 구워진 글자는 안 바뀜. 새로 입력/리레이아웃되는 음절부터 반영.
    setD3Displace(on) {
        this._d3Displace = !!on;
        if (this._growUniforms) this._growUniforms.u_d3Displace.value = this._d3Displace ? 1.0 : 0.0;
    }

    // 자라는 음절도, 큐에 남은 음절도 없다 — page 모드가 "이 페이지 다 그려졌나"를 볼 때 쓴다
    isIdle() {
        return !this._growing && this._queue.length === 0;
    }

    // 진행 중 + 큐에 남은 모든 음절을 growT=1로 즉시 완성(bake). bake 버튼처럼
    // "지금 있는 걸 그대로 확정"해야 할 때 사용. _animate가 다음 프레임부터 반영.
    finishGrowing() {
        if (this._growing || this._queue.length > 0) this._forceFinish = true;
    }

    // 큐가 빌 때까지 대기 후 2프레임 더 기다려 마지막 bake 확정
    flushQueue() {
        const wait2 = resolve => requestAnimationFrame(() => requestAnimationFrame(resolve));

        this.finishGrowing();

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
        this._forceFinish = false;
        this._isFirstGlyph = true;
        this._prevSylCount = 0;
        this._hubs = new Map();
        this._sylHubIds = [];
        this._bakedCenters = [];
        this._scrollTarget = this._scrollPos = this._scrollBase = 0;
        this._scrollJump = true;

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

    // scale 기본값 = 지금 처리 중인 uniformData.scale(update/forceRebake가 _curScale에 넣어 둠)
    _makeItem(start, center, cho, end, jung, amp, yang, diph, instant, hubCenters = [], connCount = 0, scale = this._curScale) {
        return {
            scale,
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

    // 현재 음절 uniform으로 경로 텍스처를 굽는다(151×3 픽셀 — 사실상 공짜)
    _bakePath() {
        const prev = this._renderer.getRenderTarget();
        this._renderer.setRenderTarget(this._pathTarget);
        this._renderer.render(this._pathScene, this._quadCam);
        this._renderer.setRenderTarget(prev);
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
        u.u_glyphScale.value = item.scale ?? 1;
        this._bakePath();
        u.u_growT.value = 0.0;
        this._growStart = this._clock.getElapsedTime();
        this._growing = true;
        this._instantBake = item.instant;
        // 사운드 트리거 — 실제로 자라는 음절만(재굽기·확정 음절의 instant bake는 소리 없음)
        if (!item.instant && item.syl) this.onSyllableStart?.(item.syl);
    }

    // glyphmode scroll 한 프레임 — _scrollPos를 목표로 당기고, 정수 px가 쌓이면 그만큼 민다
    _stepScroll() {
        if (this._scrollPos === this._scrollTarget) return;
        this._scrollPos += (this._scrollTarget - this._scrollPos) * SCROLL_EASE;
        if (Math.abs(this._scrollTarget - this._scrollPos) < 0.5) this._scrollPos = this._scrollTarget;
        const k = Math.round(this._scrollPos) - this._scrollBase;
        if (k > 0) this._shiftAccum(k);
    }

    // 누적 버퍼를 k 디바이스 px 왼쪽으로 민다 — 다시 굽지 않고 이미지만 옮긴다.
    // 월드 좌표로 들고 있는 것들(구운 중심·허브·자라는 음절·큐)도 같은 만큼 옮겨야
    // ① 다음 update의 moved 판정이 스크롤을 "크기 변화"로 오해해 전체를 다시 굽지 않고
    // ② 자라던 음절이 옛 자리에 이어서 자라지 않는다.
    _shiftAccum(k) {
        const r = this._renderer;
        const src = this._accumTarget;
        const w = Math.floor(src.width);
        const h = Math.floor(src.height);
        this._shiftUniforms.u_src.value = src.texture;
        this._shiftUniforms.u_resolution.value.set(w, h);
        const vertical = this._scrollAxis === 'y';
        this._shiftUniforms.u_shift.value.set(vertical ? 0 : k, vertical ? -k : 0);
        r.setRenderTarget(this._prevTarget);
        r.render(this._shiftScene, this._quadCam);
        r.setRenderTarget(null);
        this._accumTarget = this._prevTarget;
        this._prevTarget = src;
        this._dispUniforms.u_accumTex.value = this._accumTarget.texture;
        this._accumUniforms.u_bckbuffer.value = this._prevTarget.texture;
        this._scrollBase += k;

        // uv 이동량은 grow 패스와 같은 분모(W·dpr, 소수일 수 있음)로 — 페이지가 빼는 scrollBase/W와 일치해야 한다.
        // 텍스처 샘플링만 실제 텍스처 크기(내림)를 쓴다
        const du = vertical ? 0 : k / (window.innerWidth * r.getPixelRatio());
        const dv = vertical ? k / (window.innerHeight * r.getPixelRatio()) : 0;
        // z=0 평면 위의 음절 중심은 평면 위에서 정확히 옮긴다 — 페이지가 새 scrollBase로 역투영한
        // 중심과 비트 단위로 거의 같아져 moved 판정(1e-8)을 통과한다
        const onPlane = c => {
            const s = this._toScreen(c);
            return this.screenToWorld(s.u - du, s.v - dv);
        };
        // 음절 하나 = 중심의 이동량만큼 통째로(모양 유지), 허브는 각자 자기 깊이에서
        const moveItem = (start, center, hubs) => {
            const d = onPlane(center).sub(center);
            start.add(d);
            center.add(d);
            for (const hb of hubs) hb.copy(this._shiftAtDepth(hb, du, dv));
        };

        this._bakedCenters = this._bakedCenters.map(onPlane);
        for (const hub of this._hubs.values()) hub.center = this._shiftAtDepth(hub.center, du, dv);
        for (const it of this._queue) moveItem(it.start, it.center, it.hubCenters);
        if (this._growing) {
            const u = this._growUniforms;
            moveItem(u.u_start.value, u.u_center.value, u.u_hubCenters.value.slice(0, u.u_connCount.value));
            this._bakePath(); // 경로 텍스처는 절대 좌표라 다시 굽는다(151×3 — 사실상 공짜)
        }
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
        // 허용오차 4ms — webrenderTOP(maxrenderrate=24) 안에서는 rAF 자체가 41.6~41.8ms
        // 간격으로 오는데, 딱 41.67ms로 비교하면 그 중 ~40%가 "아직 이르다"로 버려져
        // 실효 ~16fps + 불규칙하게 끊겼다(2026-09-26 TD 실측: 4초간 rAF 97번 중 66번만 그림).
        // growT가 프레임당 전진이라 성장도 그만큼 느려진다. 브라우저(60/120Hz)는 영향 없음.
        if (timestamp - this._lastTime < this._FRAME_INTERVAL - 4) return;
        this._lastTime = timestamp;

        this._growUniforms.u_time.value = this._clock.getElapsedTime();
        this._stepScroll();
        if (this._ghostStart !== null) {
            const p = (performance.now() - this._ghostStart) / DISPERSE_MS;
            this._dispUniforms.u_ghostT.value = Math.min(1, p);
            if (p >= 1) this._ghostStart = null;
        }

        if (!this._growing) {
            // 재굽기 instant bake 사이(다음 음절 dequeue 대기) — 반쯤 다시 구운 accum을 내보내지 않는다
            if (this._queue.length) return;
            this._renderDisplay();
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
            // 다음 프레임에 dequeue — 현재 프레임 렌더가 완전히 끝난 후 uniform 교체.
            // 그사이 update()가 이미 다음 음절을 꺼냈으면(_rebake → _dequeue) 건너뛴다 — 안 그러면 방금 꺼낸
            // 음절(재굽기의 첫 음절)의 uniform을 다음 음절이 덮어써서 그 글자가 빠진 채 구워진다(노브를 돌릴 때 첫 글자 깜박임)
            requestAnimationFrame(() => {
                if (!this._growing) this._dequeue();
            });
            return;
        } else {
            const prev = this._growUniforms.u_growT.value;
            growT = this._forceComplete || this._forceFinish ? 1.0 : prev + (1.0 - prev) * 0.08; //#growT step default 0.08
            this._forceComplete = false;
            this._growUniforms.u_growT.value = growT >= 0.98 ? 1.0 : growT;
        }

        this._renderer.setRenderTarget(this._growTarget);
        this._renderer.render(this._growScene, this._quadCam);

        this._swapAndAccum(this._isFirstGlyph);
        this._isFirstGlyph = false;

        this._renderDisplay();

        if (growT >= 1.0) {
            this._growing = false;
            this._dequeue();
            if (this._forceFinish && this._queue.length === 0 && !this._growing) {
                this._forceFinish = false;
            }
        }
    };

    // 표시 패스 — 이 순간의 스크롤 양과 "재굽기 끝남"을 같이 기록한다(화면과 DOM을 맞추는 기준)
    _renderDisplay() {
        this._renderer.setRenderTarget(null);
        this._renderer.render(this._dispScene, this._quadCam);
        this._shownScrollBase = this._scrollBase;
        this._rebaking = false; // 자라는 음절이 보인다 = 그 앞의 instant 재굽기는 끝났다
    }

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
        this._ghostTarget.setSize(rW, rH);
        this._ghostTarget2.setSize(rW, rH);
        this._dispUniforms.u_ghostT.value = 1; // 크기가 바뀐 ghost는 버린다
        this._ghostStart = null;

        const res = new THREE.Vector2(rW, rH);
        this._growUniforms.u_resolution.value.copy(res);
        this._accumUniforms.u_resolution.value.copy(res);
        this._dispUniforms.u_resolution.value.copy(res);
        this._ghostUniforms.u_resolution.value.copy(res);

        const { ro, camMat, fov } = this._calcCamera();
        this._growUniforms.u_ro.value.copy(ro);
        this._growUniforms.u_camMat.value.copy(camMat);
        this._growUniforms.u_fov.value = fov;

        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
        this._scrollJump = true; // 다음 reLayout이 새 크기로 전부 다시 구우니 스크롤도 바로 그 자리로
    };
}
