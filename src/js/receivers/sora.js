// ── sora.js ───────────────────────────────────────────────────────────────────
// WebGL2 / GLSL ES 3.0
//
// 구조: 클라드니 = 주기적 SDF → smin()으로 음절 합산
//   - 각 음절이 chladniPolar 기반 SDF 필드
//   - smin(IQ quadratic)으로 같은 단어 음절들을 메타볼처럼 합산
//   - 단어 간격 > smin 반경 → 자연스럽게 끊김 (별도 차단 없음)
//   - 등고선: d값 기반 heatmap 컬러링 (이전: abs(d) smoothstep 흑백)
//
// 복잡도 조절:
//   f1ToM / f2ToN 의 범위 상한 (M_MAX, N_MAX) 을 낮추면 패턴이 단순해짐
//   현재: 1~4 (이전: 1~7)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SYL = 9;
const MORPH_DUR = 0.8;
const WAVE_DUR = 2.4;

// ── 복잡도 조절 파라미터 (실험중)──────────────────────────────────────────────────────
const M_MAX = 2.0; // f1ToM 상한 (낮출수록 단순)
const N_MAX = 7.0; // f2ToN 상한

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
#ifdef GL_ES
precision highp float;
#endif
#define PI      3.14159265
#define MAX_SYL ${MAX_SYL}

uniform vec2  u_resolution;
uniform float u_time;
uniform int   u_sylCount;
uniform vec2  u_pos[MAX_SYL];
uniform vec4  u_cells[MAX_SYL];
uniform vec4  u_prev[MAX_SYL];
uniform float u_morphT[MAX_SYL];
uniform float u_waveT[MAX_SYL];
uniform float u_radii[MAX_SYL];
uniform float u_sminK;
uniform float u_f3Norm[MAX_SYL];

out vec4 fragColor;

float rand(vec3 p){
  float sd = dot(p, vec3(13.1313, 17.3535, 31.2323));
  float sv = sin(sd) * 45678.54321;
  return fract(sv);
}

float chladniVal(float m, float n, float theta, float r) {
  float A = cos(m * theta) * cos(n * PI * r);
  float B = cos(n * theta) * cos(m * PI * r);
  return abs(A - B);
}

float chladniAtUV(vec4 params, vec2 p, vec2 sylPos, float aspect, float radius) {
  vec2 delta = p - sylPos;
  delta.x   *= aspect;
  float r     = length(delta) / radius;
  float theta = atan(delta.y, delta.x);
  return chladniVal(params.x, params.y, theta, r);
}

float smin(float a, float b, float k) {
  k *= 4.0;
  float h = max(k - abs(a - b), 0.0);
  return min(a, b) - h * h * 0.25 / k;
}

float eio(float t) {
  return t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;
}

vec4 interpParams(int i) {
  float mt = eio(clamp(u_morphT[i], 0.0, 1.0));
  return mix(u_prev[i], u_cells[i], mt);
}

vec3 calcNormal(int i, vec2 uv, float aspect, float hsc) {
  vec4  params = interpParams(i);
  vec2  pos    = u_pos[i];
  float radius = u_radii[i];
  vec2  e      = vec2(0.003, 0.0);
  float h0 = chladniAtUV(params, uv,       pos, aspect, radius) * hsc;
  float h1 = chladniAtUV(params, uv+e.xy,  pos, aspect, radius) * hsc;
  float h2 = chladniAtUV(params, uv+e.yx,  pos, aspect, radius) * hsc;
  return normalize(cross(
    vec3(uv+e.xy, h1) - vec3(uv, h0),
    vec3(uv+e.yx, h2) - vec3(uv, h0)
  ));
}

float sylSDF(int i, vec2 p, float aspect) {
  float radius = u_radii[i];
  vec2  delta  = p - u_pos[i];
  delta.x     *= aspect;

  float dist  = length(delta);
  float r     = dist / radius;
  float theta = atan(delta.y, delta.x);

  vec4  params  = interpParams(i);
  float m       = params.x;
  float n       = params.y;
  float wt      = u_waveT[i];

  float waveEnv = exp(-wt * 3.2);
  float waveSin = sin(wt * 8.0 * PI);
  float waveAmp = waveEnv * waveSin * 0.5;

  float d = chladniVal(m, n, theta, r);
  d *= 1.0 + waveAmp * 0.4;

  // sine 방식 (3D의 sin(p.y*10.0)*0.1 과 동일한 구조)
  float disp = sin(r * 12.0 + theta * 2.0) * 0.9; //0.4, 1.4
  //noise 방식 (rand 활용)
  float disp2 = rand(vec3(floor(delta * 270.0), 0.0)) * 0.05;
  float disp3 = cos(r * 2.0 + theta * 2.0) * 0.48;

  d += disp;
  d += disp2;
  d += disp3;

  float outside = max(0.0, r*0.9 - 1.0) * 2.0; //r*2.0, 0.8
  return d + outside + 0.2;
}

// ── 컬러 등고선 ─────────────────────────────────────────────────────────────
vec3 hue2rgb(float h) {
  float r = abs(h * 6.0 - 3.0) - 1.0;
  float g = 2.0 - abs(h * 6.0 - 2.0);
  float b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3(r, g, b), 0.0, 1.0);
}

// 컬러 등고선 — 초성 값 기반 (고정 팔레트 없음)
// t=0: 마디선 (가장 진함)  t=1: 흰 배경
// choX (조음위치) → hue  |  choZ (긴장도) → 채도
vec3 heatmap(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 0.82);         // 조음위치 → 색상
  float vivid = 0.20 + choZ * 0.80;           // 긴장도 → 채도
  vec3  peak  = mix(vec3(0.65), hue, vivid);  // 포화 색
  vec3  dark  = peak * 0.15;                  // 마디선: 어둡게
  dark = peak * 1.5;
  if (t < 0.35) {
    return mix(dark, peak, t / 0.35);
  } else {
    return mix(peak, vec3(1.0), (t - 0.35) / 0.65);
  }
}

vec3 heatmap2(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 0.82);
  float vivid = 0.20 + choZ * 0.80;
  vec3  peak  = mix(vec3(0.65), hue, vivid);
  vec3  dark  = peak * 0.15;
  float midT = 0.15;
  if (t > midT) {
    return mix(dark, peak, t / midT);
  } else {
    return mix(peak, vec3(1.0), (t - midT) / 0.65);
  }
}

vec3 heatmap3(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 1.82); // 1.82
  float vivid = 0.05 + choZ * 0.50;
  vec3  peak  = mix(vec3(0.95), hue, vivid);
  vec3  dark  = peak * 1.5; //0.15, 3.15, 1.15
  float midT = 0.1; //0.1
  if (t < midT) {
    return mix(dark, peak, t / midT);
  } else {
    return mix(peak, vec3(1.0), (t - midT) / 0.65);
  }
}

void main() {
  int count = u_sylCount;
  if (count < 1) { fragColor = vec4(1.0, 1.0, 1.0, 0.0); return; }

  vec2  uv     = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  float shk_a = rand(vec3(uv, .0)) * 2. * PI;
  float shk_r = rand(vec3(uv, 1.)) * .005;
  vec2 shk = vec2(cos(shk_a), sin(shk_a)) * shk_r;
  //uv += shk;

  float d       = 1e9;
  float choXAcc = 0.5;
  float choZAcc = 0.33;
  float totalW  = 0.0;

  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float di   = sylSDF(i, uv, aspect);
    vec4  cp   = interpParams(i);
    float choX = cp.z;
    float choZ = cp.w;
    float w    = 1.0 / (di * di + 0.001);
    choXAcc   += choX * w;
    choZAcc   += choZ * w;
    totalW    += w;
    d = smin(d, di, u_sminK);
  }
  choXAcc /= totalW;
  choZAcc /= totalW;

  // presence: per-slot smoothstep 후 max 합산
  float presence = 0.0;
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float radius = u_radii[i];
    vec2  delta  = uv - u_pos[i];
    delta.x     *= aspect;
    presence = max(presence, smoothstep(radius * 1.2, radius * 0.6, length(delta)));
  }
  if (presence < 0.001) { fragColor = vec4(1.0, 1.0, 1.0, 0.0); return; }

  // ── fake normal (F3 → 기복 강도) ─────────────────────────────────────────
  vec3  nrmAcc = vec3(0.0);
  float nrmW   = 0.0;
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float di  = sylSDF(i, uv, aspect);
    float w   = 1.0 / (di * di + 0.001);
    float hsc = mix(3.0, 7.0, u_f3Norm[i]);
    nrmAcc   += calcNormal(i, uv, aspect, hsc) * w;
    nrmW     += w;
  }
  vec3 nrm = normalize(nrmAcc / max(nrmW, 0.001));

  vec3 light = vec3(0.5, 0.8, 1.0);
  vec3  lightDir = normalize(light);
  float diff     = clamp(dot(nrm, lightDir), 0.0, 1.0);
  float spec     = pow(max(dot(reflect(-lightDir, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 32.0);

  // ── 컬러 등고선 ──────────────────────────────────────────────────────────
  // d=0: 마디선, d 클수록 → 흰 배경
  // 1.2 스케일: 등온선 폭 조절 (높일수록 색 띠가 좁아짐)
  float t   = clamp(d * 3.0, 0.0, 1.0);
  vec3  col = heatmap3(t, choXAcc, choZAcc);

  // fake normal 조명 (heatmap 색조 보존, 가볍게)
  col = col * (0.82 + 0.18 * diff);
  col = clamp(col + spec * 0.12, 0.0, 1.0);

  // ── (참고용 보류) 흑백 등고선 방식 ──────────────────────────────────────
  float fw      = fwidth(d) * 0.8;
  float lineStr = 1.0 - smoothstep(0.0, fw, abs(d));
  float band    = abs(fract(d * 1.5) - 0.5) * 2.0;
  float bandStr = (1.0 - smoothstep(0.0, fw * 2.0, band)) * 0.18;
  float dark    = clamp(lineStr + bandStr, 0.0, 1.0);
  dark = lineStr; // 등고선만
  //vec3 tint = darkToColor(choXAcc);
  //col = vec3(1.0) - dark * (vec3(1.0) - tint);
  // heatmap 위에 검은 등고선
  col = mix(col, vec3(0.0), dark);
  // ────────────────────────────────────────────────────────────────────────

  fragColor = vec4(col, presence);
}
`;

// ── Hz → m/n (복잡도: M_MAX/N_MAX로 상한 조절) ───────────────────────────────
function f1ToM(f1Hz, choX = 0.5) {
    const range = M_MAX - 1.0;
    const base = 1.0 + ((f1Hz - 250) / (900 - 250)) * range;
    return Math.max(1.0, Math.min(M_MAX, base + (choX - 0.5) * 0.6));
}
function f2ToN(f2Hz) {
    const range = N_MAX - 1.0;
    return Math.max(1.0, Math.min(N_MAX, 1.0 + ((f2Hz - 580) / (2600 - 580)) * range));
}

function createShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[sora] Shader error:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
    }
    return sh;
}
function createProgram(gl, vSrc, fSrc) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('[sora] Link error:', gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

export class SoraReceiver {
    constructor() {
        this._canvas = null;
        this._gl = null;
        this._prog = null;
        this._locs = {};
        this._raf = null;
        this._startT = performance.now();
        this._ownCanvas = false;
        this._cells = Array.from({ length: MAX_SYL }, () => [2.0, 3.0, 0.5, 0.33]);
        this._prevCells = Array.from({ length: MAX_SYL }, () => [2.0, 3.0, 0.5, 0.33]);
        this._positions = Array.from({ length: MAX_SYL }, () => [0.5, 0.5]);
        this._radii = Array(MAX_SYL).fill(0.1);
        this._morphStart = Array(MAX_SYL).fill(-999);
        this._waveStart = Array(MAX_SYL).fill(-999);
        this._f3Norms = Array(MAX_SYL).fill(0.5);
        this._frozen = Array(MAX_SYL).fill(false);
        this._wordPositions = new Map(); // wordId → [x, y]
        this._wordRadii = new Map(); // wordId → radius (한 번 배정 후 유지)
        this.sylSize = 150; // per-receiver sylSize
        this._sylCount = 0;
        this._sminK = 0.06;
        this.lineHeightRatio = 1.5;
    }

    async init(canvas) {
        if (canvas) {
            this._canvas = canvas;
        } else {
            this._canvas = document.createElement('canvas');
            this._canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;';
            document.body.appendChild(this._canvas);
            this._ownCanvas = true;
        }
        this._resize();
        window.addEventListener('resize', this._onResize);

        const gl = this._canvas.getContext('webgl2');
        if (!gl) {
            console.error('[sora] WebGL2 not supported');
            return;
        }
        this._gl = gl;

        this._prog = createProgram(gl, VERT, FRAG);
        if (!this._prog) return;
        gl.useProgram(this._prog);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(this._prog, 'position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

        this._locs = {
            res: gl.getUniformLocation(this._prog, 'u_resolution'),
            time: gl.getUniformLocation(this._prog, 'u_time'),
            count: gl.getUniformLocation(this._prog, 'u_sylCount'),
            sminK: gl.getUniformLocation(this._prog, 'u_sminK'),
        };
        for (let i = 0; i < MAX_SYL; i++) {
            this._locs[`pos_${i}`] = gl.getUniformLocation(this._prog, `u_pos[${i}]`);
            this._locs[`cell_${i}`] = gl.getUniformLocation(this._prog, `u_cells[${i}]`);
            this._locs[`prev_${i}`] = gl.getUniformLocation(this._prog, `u_prev[${i}]`);
            this._locs[`morph_${i}`] = gl.getUniformLocation(this._prog, `u_morphT[${i}]`);
            this._locs[`wave_${i}`] = gl.getUniformLocation(this._prog, `u_waveT[${i}]`);
            this._locs[`f3_${i}`] = gl.getUniformLocation(this._prog, `u_f3Norm[${i}]`);
            this._locs[`rad_${i}`] = gl.getUniformLocation(this._prog, `u_radii[${i}]`);
        }

        this._raf = requestAnimationFrame(this._animate);
    }

    // @param sylItems   wordId 태깅된 음절 배열
    // @param positions  0~1 uv 위치 배열 — sora에서는 무시, 랜덤 위치 사용
    // @param JAMO       자모 데이터
    update(sylItems, positions, JAMO) {
        if (!JAMO) return;
        const nowSec = (performance.now() - this._startT) / 1000;

        // ── 단어별 그룹화 ──────────────────────────────────────────
        const wordGroups = new Map();
        (sylItems ?? []).forEach((syl, i) => {
            const wid = syl.wordId ?? 0;
            if (!wordGroups.has(wid)) wordGroups.set(wid, []);
            wordGroups.get(wid).push({ syl, pos: positions[i] ?? [0.5, 0.5] });
        });

        const wordIds = [...wordGroups.keys()].sort((a, b) => a - b);
        const slotCount = Math.min(wordIds.length, MAX_SYL);

        // 단어 슬롯 위치 + 반경: wordId별로 한 번만 배정, 이후 유지
        const MARGIN = 0.22;
        const baseRadius = this.sylSize / 550;
        for (const wid of wordIds) {
            if (!this._wordPositions.has(wid)) {
                this._wordPositions.set(wid, [
                    MARGIN + Math.random() * (1 - MARGIN * 2),
                    MARGIN + Math.random() * (1 - MARGIN * 2),
                ]);
            }
            if (!this._wordRadii.has(wid)) {
                this._wordRadii.set(wid, baseRadius * (Math.random() * 0.75 + 0.25));
            }
        }
        // 사라진 wordId 정리 (텍스트 삭제 시)
        for (const wid of this._wordPositions.keys()) {
            if (!wordGroups.has(wid)) {
                this._wordPositions.delete(wid);
                this._wordRadii.delete(wid);
            }
        }

        // ── 슬롯별 업데이트 ────────────────────────────────────────
        for (let slotIdx = 0; slotIdx < slotCount; slotIdx++) {
            const wid = wordIds[slotIdx];
            const group = wordGroups.get(wid);
            const lastSyl = group[group.length - 1];

            const isComplete = wordIds.some(w => w > wid);
            this._frozen[slotIdx] = isComplete;
            this._positions[slotIdx] = this._wordPositions.get(wid);
            this._radii[slotIdx] = this._wordRadii.get(wid);

            if (isComplete) continue;

            const jungEntry = JAMO[lastSyl.syl.jung];
            const choEntry = JAMO[lastSyl.syl.cho]?.cho;
            if (!jungEntry?.pos) continue;

            const [f1, f2] = jungEntry.pos;
            const choX = choEntry?.pos?.[0] ?? 0.5;
            const choZ = choEntry?.pos?.[2] ?? 0.33;
            const f3Hz = jungEntry.pos[2] ?? 2500;
            const f3Norm = Math.max(0, Math.min(1, (f3Hz - 2080) / (3200 - 2080)));
            this._f3Norms[slotIdx] = f3Norm;

            const next = [f1ToM(f1, choX), f2ToN(f2), choX, choZ];
            const cur = this._cells[slotIdx];

            const changed = next.some((v, j) => Math.abs(v - cur[j]) > 0.01);
            if (changed) {
                // 모프 도중 인터럽트 시: 현재 보간값을 prev로 캡처 (시각적 점프 방지)
                const elapsed = nowSec - this._morphStart[slotIdx];
                const rawT = Math.min(elapsed / MORPH_DUR, 1.0);
                const eased = rawT < 0.5 ? 2 * rawT * rawT : -1 + (4 - 2 * rawT) * rawT;
                const prev = this._prevCells[slotIdx];
                this._prevCells[slotIdx] = cur.map((v, j) => prev[j] + (v - prev[j]) * eased);
                this._cells[slotIdx] = next;
                this._morphStart[slotIdx] = nowSec;
                this._waveStart[slotIdx] = nowSec;
            }
        }

        this._sylCount = slotCount;
        for (let i = slotCount; i < MAX_SYL; i++) {
            this._frozen[i] = false;
        }
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        if (this._ownCanvas && this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
        if (this._gl && this._prog) this._gl.deleteProgram(this._prog);
        this._gl = null;
    }

    _animate = () => {
        this._raf = requestAnimationFrame(this._animate);
        this._render();
    };

    _render() {
        const gl = this._gl;
        if (!gl) return;
        const nowSec = (performance.now() - this._startT) / 1000;
        const l = this._locs;

        gl.viewport(0, 0, this._canvas.width, this._canvas.height);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(l.res, this._canvas.width, this._canvas.height);
        gl.uniform1f(l.time, nowSec);
        gl.uniform1i(l.count, this._sylCount);
        gl.uniform1f(l.sminK, this._sminK);

        for (let i = 0; i < MAX_SYL; i++) {
            const c = this._cells[i];
            const pv = this._prevCells[i];
            const p = this._positions[i];
            const mt = Math.min((nowSec - this._morphStart[i]) / MORPH_DUR, 1.0);
            const wt = Math.min((nowSec - this._waveStart[i]) / WAVE_DUR, 1.0);
            gl.uniform2f(l[`pos_${i}`], p[0], p[1]);
            gl.uniform4f(l[`cell_${i}`], c[0], c[1], c[2], c[3]);
            gl.uniform4f(l[`prev_${i}`], pv[0], pv[1], pv[2], pv[3]);
            gl.uniform1f(l[`morph_${i}`], mt);
            gl.uniform1f(l[`wave_${i}`], wt);
            gl.uniform1f(l[`f3_${i}`], this._f3Norms[i]);
            gl.uniform1f(l[`rad_${i}`], this._radii[i]);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _resize() {
        if (!this._canvas) return;
        const dpr = Math.min(window.devicePixelRatio, 2);
        this._canvas.width = window.innerWidth * dpr;
        this._canvas.height = window.innerHeight * dpr;
    }

    _onResize = () => {
        this._resize();
    };
}
