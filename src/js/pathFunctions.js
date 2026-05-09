// ── pathFunctions.js ──────────────────────────────────────────────────────────
// syllablePath + sdSyllable 세트를 버전별로 관리합니다.
// shader.js에서 PATH_MODE 숫자로 선택합니다.
//
//   7 — 행성 궤도식 (구면 좌표 축)  ← 현재 기본값
//   8 — FM 변조
// ─────────────────────────────────────────────────────────────────────────────

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

export const PATH_FUNCTIONS = {

    // ── 7: 행성 궤도식 — 현재 기본값 ────────────────────────────────────────────
    7: {
        name: 'orbital',
        src: `
vec3 orbitalPoint(float r, float freq, float angle, float theta, float phi) {
  vec3 axis = vec3(sin(phi)*cos(theta), sin(phi)*sin(theta), cos(phi));
  vec3 up   = abs(axis.z) < 0.99 ? vec3(0,0,1) : vec3(1,0,0);
  vec3 u    = normalize(cross(axis, up));
  vec3 v    = cross(axis, u);
  float a   = freq * (1.0/3200.0) * angle;
  return r * (cos(a)*u + sin(a)*v);
}

vec3 syllablePath(vec3 start, vec3 cho, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float angle = t * TWO_PI * 3.0;
  float r1 = amp*(1.0/1.75), r2=r1*0.5, r3=r1*0.25;

  vec3 ep1 = orbitalPoint(r1, f1, angle, cho.x * TWO_PI,           cho.y * PI);
  vec3 ep2 = orbitalPoint(r2, f2, angle, cho.y * TWO_PI + yang*PI, cho.z * PI);
  vec3 ep3 = orbitalPoint(r3, f3, angle, cho.z * TWO_PI + diph*PI, yang  * PI);

  return start + ep1 + ep2 + ep3;
}
` + makeSdSyllable({ num: '30.0', radius: '0.01', k: '0.12', useCho: true, callArgs: 'start, cho, f1, f2, f3, amp' }),
    },

    // ── 8: FM 변조 ───────────────────────────────────────────────────────────────
    8: {
        name: 'fm',
        src: `
vec3 syllablePath(vec3 start, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float s     = 1.0 / 3200.0;
  float trad  = t * TWO_PI * 2.0;

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
` + makeSdSyllable({ num: '100.0', radius: '0.004', k: '0.2', callArgs: 'start, f1, f2, f3, amp' }),
    },
};
