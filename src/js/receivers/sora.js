// ── sora.js ───────────────────────────────────────────────────────────────────
// WebGL2 / GLSL ES 3.0
//
// 구조: 클라드니 = 주기적 SDF → smin()으로 음절 합산
//   - 각 음절이 chladniPolar 기반 SDF 필드
//   - smin(IQ quadratic)으로 같은 단어 음절들을 메타볼처럼 합산
//   - 단어 간격 > smin 반경 → 자연스럽게 끊김 (별도 차단 없음)
//   - 등고선: abs(d) 기반 smoothstep (IQ 방식)
//
// 복잡도 조절:
//   f1ToM / f2ToN 의 범위 상한 (M_MAX, N_MAX) 을 낮추면 패턴이 단순해짐
//   현재: 1~4 (이전: 1~7)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SYL = 9;
const MORPH_DUR = 1.2;
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
uniform float u_radius;
uniform float u_sminK;

out vec4 fragColor;

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

float sylSDF(int i, vec2 p, float aspect) {
  vec2 delta = p - u_pos[i];
  delta.x   *= aspect;

  float dist  = length(delta);
  float r     = dist / u_radius;
  float theta = atan(delta.y, delta.x);

  vec4  params  = interpParams(i);
  float m       = params.x;
  float n       = params.y;
  float wt      = u_waveT[i];

  float waveEnv = exp(-wt * 3.2);
  float waveSin = sin(wt * 8.0 * PI);
  float waveAmp = waveEnv * waveSin * 0.5;

  float A = cos(m * theta) * cos(n * PI * r);
  float B = cos(n * theta) * cos(m * PI * r);
  float d = abs(A - B);
  d *= 1.0 + waveAmp * 0.4;

  float outside = max(0.0, r - 1.0) * 2.0;
  return d + outside;
}

vec3 darkToColor(float choX) {
  vec3 warm = vec3(0.08, 0.04, 0.0);
  vec3 cool = vec3(0.0, 0.04, 0.08);
  return mix(warm, cool, choX);
}

void main() {
  int count = u_sylCount;
  if (count < 1) { fragColor = vec4(1.0, 1.0, 1.0, 0.0); return; }

  vec2  uv     = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  float d       = 1e9;
  float choXAcc = 0.5;
  float totalW  = 0.0;

  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float di   = sylSDF(i, uv, aspect);
    float choX = interpParams(i).z;
    float w    = 1.0 / (di * di + 0.001);
    choXAcc   += choX * w;
    totalW    += w;
    d = smin(d, di, u_sminK);
  }
  choXAcc /= totalW;

  float minDist = 1e9;
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    vec2 delta = uv - u_pos[i];
    delta.x   *= aspect;
    minDist    = min(minDist, length(delta));
  }
  float presence = smoothstep(u_radius * 1.2, u_radius * 0.6, minDist);
  if (presence < 0.001) { fragColor = vec4(1.0, 1.0, 1.0, 0.0); return; }

  float fw      = fwidth(d) * 1.5;
  float lineStr = 1.0 - smoothstep(0.0, fw, abs(d));
  float band    = abs(fract(d * 1.5) - 0.5) * 2.0;
  float bandStr = (1.0 - smoothstep(0.0, fw * 2.0, band)) * 0.18;
  float dark    = lineStr;  // bandStr 주석 풀면 등고선 띠 추가됨
  // float dark = clamp(lineStr + bandStr, 0.0, 1.0);

  vec3 tint = darkToColor(choXAcc);
  vec3 col  = vec3(1.0) - dark * (vec3(1.0) - tint);

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
        this._morphStart = Array(MAX_SYL).fill(-999);
        this._waveStart = Array(MAX_SYL).fill(-999);
        this._sylCount = 0;
        this._radius = 0.14;
        this._sminK = 0.08;
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
            radius: gl.getUniformLocation(this._prog, 'u_radius'),
            sminK: gl.getUniformLocation(this._prog, 'u_sminK'),
        };
        for (let i = 0; i < MAX_SYL; i++) {
            this._locs[`pos_${i}`] = gl.getUniformLocation(this._prog, `u_pos[${i}]`);
            this._locs[`cell_${i}`] = gl.getUniformLocation(this._prog, `u_cells[${i}]`);
            this._locs[`prev_${i}`] = gl.getUniformLocation(this._prog, `u_prev[${i}]`);
            this._locs[`morph_${i}`] = gl.getUniformLocation(this._prog, `u_morphT[${i}]`);
            this._locs[`wave_${i}`] = gl.getUniformLocation(this._prog, `u_waveT[${i}]`);
        }

        this._raf = requestAnimationFrame(this._animate);
    }

    // @param sylItems   isSpace 제외 음절 배열 (main.js calcTextboxLayout 결과)
    // @param positions  0~1 uv 위치 배열 (sylItems 와 1:1 대응)
    // @param JAMO       자모 데이터
    update(sylItems, positions, JAMO) {
        if (!JAMO) return;
        const count = Math.min(sylItems?.length ?? 0, MAX_SYL);
        const nowSec = (performance.now() - this._startT) / 1000;

        // sminK: 음절 간격에서 계산 (positions 배열로부터 평균 간격 추정)
        // 위치는 이미 main에서 계산됐으므로 여기선 단순 추정값 사용
        const avgStep = count > 1 ? Math.abs(positions[1][0] - positions[0][0]) : 0.12;
        this._sminK = Math.max(0.04, avgStep * 1.8);
        this._radius = Math.max(0.04, avgStep * 0.85);

        for (let i = 0; i < count; i++) {
            const syl = sylItems[i];
            const pos = positions[i] ?? [0.5, 0.5];

            const jungEntry = JAMO[syl.jung];
            const choEntry = JAMO[syl.cho]?.cho;
            if (!jungEntry?.pos) continue;

            const [f1, f2] = jungEntry.pos;
            const choX = choEntry?.pos?.[0] ?? 0.5;
            const choZ = choEntry?.pos?.[2] ?? 0.33;
            const next = [f1ToM(f1, choX), f2ToN(f2), choX, choZ];
            const cur = this._cells[i];

            const changed = next.some((v, j) => Math.abs(v - cur[j]) > 0.01);
            if (changed) {
                this._prevCells[i] = [...cur];
                this._cells[i] = next;
                this._morphStart[i] = nowSec;
            }
            this._waveStart[i] = nowSec;
            this._positions[i] = pos;
        }
        this._sylCount = count;
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
        gl.uniform1f(l.radius, this._radius);
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
