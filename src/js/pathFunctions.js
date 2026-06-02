// ── pathFunctions.js ──────────────────────────────────────────────────────────
// syllablePath GLSL 소스를 버전별로 관리합니다.
// shader.js의 sdfSrc 안에 ${src}로 삽입됩니다.
//
//   7 — 행성 궤도식 (구면 좌표 축)  ← 현재 기본값
//   8 — FM 변조
// ─────────────────────────────────────────────────────────────────────────────

export const PATH_FUNCTIONS = {
    // ── 7: 행성 궤도식 ───────────────────────────────────────────────────────────
    7: {
        name: 'orbital',
        src: `
vec3 orbitalPoint(float r, float freq, float angle, float theta, float phi, float e) {
  vec3 axis = vec3(sin(phi)*cos(theta), sin(phi)*sin(theta), cos(phi));
  vec3 up   = abs(axis.z) < 0.99 ? vec3(0,0,1) : vec3(1,0,0);
  vec3 u    = normalize(cross(axis, up));
  vec3 v    = cross(axis, u);
  float a   = freq * (1.0/3200.0) * angle;
  return r * cos(a)*u + r*(1.0-e) * sin(a)*v;
}

vec3 syllablePath(vec3 start, vec3 center, vec3 cho, float f1, float f2, float f3,
                  float amp, float t, float yang, float diph) {
  float angle = t * TWO_PI * 6.0; // 에피사이클 회전 3.0 ~12.
  float r1 = amp*(1.0/1.75), r2=r1*0.5, r3=r1*0.25;

  vec3 ep1 = orbitalPoint(r1, f1, angle, cho.x * TWO_PI,           cho.y * PI, 0.03); //0.3
  vec3 ep2 = orbitalPoint(r2, f2, angle, cho.y * TWO_PI + yang*PI, cho.z * PI, 0.25); //0.25
  vec3 ep3 = orbitalPoint(r3, f3, angle, cho.z * TWO_PI + diph*PI, yang  * PI, 0.65); //0.95

  return center + ep1 + ep2 + ep3;
}
`,
    },

    // ── 8: FM 변조 ───────────────────────────────────────────────────────────────
    8: {
        name: 'fm',
        src: `
vec3 syllablePath(vec3 start, vec3 cho, float f1, float f2, float f3,
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
`,
    },
};
