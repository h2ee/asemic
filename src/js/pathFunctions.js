// ── pathFunctions.js ──────────────────────────────────────────────────────────
// syllablePath + sdSyllable 세트를 버전별로 관리합니다.
// shader.js에서 PATH_MODE 숫자로 선택합니다.
//
// 공통 시그니처:
//   syllablePath(vec3 start, float f1, float f2, float f3,
//                float amp, float t, float yang, float diph)
//
// 버전 목록:
//   1 — t 분리 (진행 + 진동 독립)
//   2 — start 기준 ±amp 진동
//   3 — sin을 0~1로 올려 양수 방향 누적
//   4 — 에피사이클 기본 (2D)
//   5 — 에피사이클 + phase/방향반전 (초성 데이터 활용)
//   6 — 에피사이클 tilt (각 disk가 다른 평면)
//   7 — 행성 궤도식 (구면 좌표 축)  ← 현재 기본값
//   8 — FM 변조
// ─────────────────────────────────────────────────────────────────────────────

// sdSyllable 공통 파라미터 — 버전마다 num, radius, k만 다름
function makeSdSyllable({ num, radius, k, useCho = false, callArgs = '' }) {
  return `
float sdSyllable(vec3 p, int idx, float growT) {
  vec3  start  = u_start[idx];
  ${useCho ? 'vec3  cho    = u_cho[idx];' : ''}
  vec3  end    = u_end[idx];
  float f1     = u_jung[idx].x;
  float f2     = u_jung[idx].y;
  float f3     = u_jung[idx].z;
  float amp    = u_amp[idx];
  float yang   = u_yangseong[idx];
  float diph   = u_diphthong[idx];
  float radius = ${radius};
  float k      = ${k};
  float d      = MAX_DIST;
  float num    = ${num};

  for (int i = 0; i < int(num); i++) {
    float t0 = float(i)       / num;
    float t1 = float(i + 1)   / num;
    if (t0 > growT) break;
    float t1c = min(t1, growT);
    vec3 a = syllablePath(${callArgs}, t0,  yang, diph);
    vec3 b = syllablePath(${callArgs}, t1c, yang, diph);
    float pullToEnd = smoothstep(0.95, 1.0, growT);
    b = mix(b, end, pullToEnd * step(growT - 0.001, t1));
    d = opSmoothUnion(d, sdCapsule(p, a, b, radius), k);
  }

  d = opSmoothUnion(d, sdSphere(p - start, radius * 1.2), k);
  if (growT >= 0.99) {
    d = opSmoothUnion(d, sdSphere(p - end, radius), k);
  }
  return d;
}`;
}

// ── 버전별 정의 ───────────────────────────────────────────────────────────────

export const PATH_FUNCTIONS = {

  // ── 1: t 분리 (진행 + 진동 독립) ───────────────────────────────────────────
  1: {
    name: 'v1_t_split',
    src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  vec3 base  = mix(start, start, t);  // end가 필요하면 uniform에서 직접 참조
  float s    = 1.0 / 3200.0;
  float trad = t * TWO_PI * 3.0;
  vec3 offset = amp * 0.003 * vec3(
    sin(f1 * s * trad),
    sin(f2 * s * trad),
    sin(f3 * s * trad)
  );
  return base + offset;
}
` + makeSdSyllable({ num: '100.0', radius: '0.008', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 2: start 기준 ±amp 진동 ─────────────────────────────────────────────────
  2: {
    name: 'v2_start_vibrate',
    src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float s    = 1.0 / 3200.0;
  float trad = t * TWO_PI * 6.0;
  return vec3(
    start.x + amp * sin(f1 * s * trad) * 0.005,
    start.y + amp * sin(f2 * s * trad) * 0.005,
    start.z + amp * sin(f3 * s * trad) * 0.005
  );
}
` + makeSdSyllable({ num: '200.0', radius: '0.005', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 3: sin 0~1 양수 방향 누적 ───────────────────────────────────────────────
  3: {
    name: 'v3_positive',
    src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float s    = 1.0 / 3200.0;
  float trad = t * TWO_PI * 3.0;
  return vec3(
    start.x + amp * (sin(f1 * s * trad) + 1.0) * 0.5 * 0.005,
    start.y + amp * (sin(f2 * s * trad) + 1.0) * 0.5 * 0.005,
    start.z + amp * (sin(f3 * s * trad) + 1.0) * 0.5 * 0.005
  );
}
` + makeSdSyllable({ num: '100.0', radius: '0.005', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 4: 에피사이클 기본 (2D) ─────────────────────────────────────────────────
  4: {
    name: 'epicycle_basic',
    src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float s     = 1.0 / 3200.0;
  float angle = t * TWO_PI * 3.0;
  float r1    = amp * (1.0 / 1.75);
  float r2    = r1 * 0.5;
  float r3    = r1 * 0.25;

  float x = r1 * cos(f1 * s * angle)
          + r2 * cos(f2 * s * angle)
          + r3 * cos(f3 * s * angle);
  float y = r1 * sin(f1 * s * angle)
          + r2 * sin(f2 * s * angle)
          + r3 * sin(f3 * s * angle);

  return vec3(start.x + x, start.y + y, start.z);
}
` + makeSdSyllable({ num: '60.0', radius: '0.005', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 5: 에피사이클 + phase/방향반전 (초성 데이터 활용) ───────────────────────
  5: {
    name: 'epicycle_phase',
    src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float s     = 1.0 / 3200.0;
  float angle = t * TWO_PI * 3.5;
  float r1    = amp * (1.0 / 1.75);
  float r2    = r1 * 0.5;
  float r3    = r1 * 0.25;

  // yang/diph로 phase 결정
  float ph1  = yang * TWO_PI;
  float ph2  = diph * TWO_PI;
  float ph3  = (yang + diph) * PI;
  float dir2 = yang > 0.5 ? -1.0 : 1.0;

  float x = r1 * cos(      f1 * s * angle + ph1)
          + r2 * cos(dir2 * f2 * s * angle + ph2)
          + r3 * cos(      f3 * s * angle + ph3);
  float y = r1 * sin(      f1 * s * angle + ph1)
          + r2 * sin(dir2 * f2 * s * angle + ph2)
          + r3 * sin(      f3 * s * angle + ph3);

  return vec3(start.x + x, start.y + y, start.z);
}
` + makeSdSyllable({ num: '100.0', radius: '0.005', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 6: 에피사이클 tilt (각 disk가 다른 평면) ────────────────────────────────
  6: {
    name: 'epicycle_tilt',
    src: `
vec3 tiltedEpicircle(float r, float freq, float angle, float tilt) {
  float a = freq * (1.0 / 3200.0) * angle;
  return vec3(r * cos(a), r * sin(a) * cos(tilt), r * sin(a) * sin(tilt));
}

vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float angle = t * TWO_PI * 3.0;
  float r1    = amp * (1.0 / 1.75);
  float r2    = r1 * 0.5;
  float r3    = r1 * 0.25;

  vec3 ep1 = tiltedEpicircle(r1, f1, angle, 0.0);
  vec3 ep2 = tiltedEpicircle(r2, f2, angle, PI * 0.667);
  vec3 ep3 = tiltedEpicircle(r3, f3, angle, PI * 1.333);

  return start + ep1 + ep2 + ep3;
}
` + makeSdSyllable({ num: '100.0', radius: '0.005', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 7: 행성 궤도식 — 현재 기본값 ────────────────────────────────────────────
  7: {
    name: 'orbital',
    src: `
vec3 orbitalPoint(float r, float freq, float angle, float theta, float phi) {
  vec3 axis = vec3(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
  vec3 up   = abs(axis.z) < 0.99 ? vec3(0, 0, 1) : vec3(1, 0, 0);
  vec3 u    = normalize(cross(axis, up));
  vec3 v    = cross(axis, u);
  float a   = freq * (1.0 / 3200.0) * angle;
  return r * (cos(a) * u + sin(a) * v);
}

vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float angle = t * TWO_PI * 3.0;
  float r1    = amp * (1.0 / 1.75);
  float r2    = r1 * 0.5;
  float r3    = r1 * 0.25;

  vec3 ep1 = orbitalPoint(r1, f1, angle, 0.0,         0.0);
  vec3 ep2 = orbitalPoint(r2, f2, angle, PI * 0.667,  PI * 0.333);
  vec3 ep3 = orbitalPoint(r3, f3, angle, PI * 1.333,  PI * 0.667);

  return start + ep1 + ep2 + ep3;
}
` + makeSdSyllable({ num: '100.0', radius: '0.01', k: '0.08',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

  // ── 8: FM 변조 ───────────────────────────────────────────────────────────────
  8: {
    name: 'fm',
    src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float s     = 1.0 / 3200.0;
  float trad  = t * TWO_PI * 2.0;

  // F1이 낮을수록 scBoost를 키워서 진동 균등 보정
  float f1Norm  = (f1 - 250.0) / 600.0;
  float scBoost = mix(2.5, 1.0, f1Norm);
  float sc      = amp * 0.005 * scBoost;

  float bx = sin(f2 * s * trad + sin(f1 * s * trad));
  float x  = yang > 0.5 ? abs(bx) : -bx;

  float by = sin(f1 * s * trad) * abs(cos(f2 * s * trad));
  float y  = diph > 0.5 ? pow(abs(by), 2.0) * sign(by) : by;

  float z  = sin(f2 * s * trad) * sin(f3 * s * trad + PI * 0.5);

  return vec3(start.x + x * sc, start.y + y * sc, start.z + z * sc);
}
` + makeSdSyllable({ num: '100.0', radius: '0.004', k: '0.2',
      callArgs: 'start, f1, f2, f3, amp' }),
  },

};
