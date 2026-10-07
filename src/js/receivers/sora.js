// ── sora.js ───────────────────────────────────────────────────────────────────
// WebGL2 / GLSL ES 3.0
//
// 구조: 클라드니 = 주기적 SDF → smin()으로 음절 합산
//   - 진폭이 0이라 모래가 모이는 부분 = 거리 0 : 거리 기반 형태
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

  // sine 방식
  float disp = sin(r * 12.0 + theta * 2.0) * 0.9; //0.4, 1.4
  //noise 방식 (rand 활용)
  float disp2 = rand(vec3(floor(delta * 270.0), 0.0)) * 0.05;
  // 선에 필압 같은 효과
  float disp3 = cos(r * 2.0 + theta * 2.0) * 0.48;

  d += disp;
  d += disp2;
  d += disp3;

  float outside = max(0.0, r*0.9 - 1.0) * 2.0; //r*2.0, 0.8
  return d + outside + 0.2; // offset (실험 중)
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

//현재 사용
vec3 heatmap3(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 1.82); // 1.82
  float vivid = 0.05 + choZ * 0.50;
  vec3  peak  = mix(vec3(0.95), hue, vivid);
  vec3  dark  = peak * 1.5; //0.15, 3.15, 1.15
  float midT = 0.1; //0.1
  if (t < midT) {
    return mix(dark, peak, t / midT);
  } else {
    return mix(peak, vec3(0.9804, 0.9882, 1.0), (t - midT) / 0.65); // #bg color (조절 1)
  }
}

void main() {
  int count = u_sylCount;
  if (count < 1) { fragColor = vec4(0.0); return; }   // premultiplied — 흰색을 남기면 배경을 칠한다

  vec2  uv     = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  // 그레인 - 현재 사용 안함
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
  if (presence < 0.001) { fragColor = vec4(0.0); return; }

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
  // 3.0 스케일: 등온선 폭 조절 (높일수록 색 띠가 좁아짐)
  float t   = clamp(d * 3.0, 0.0, 1.0);
  vec3  col = heatmap3(t, choXAcc, choZAcc);

  // fake normal 조명 (heatmap 색조 보존, 가볍게)
  col = col * (0.82 + 0.18 * diff);
  col = clamp(col + spec * 0.12, 0.0, 1.0);

  // ── 흑백 등고선 ──────────────────────────────────────
  float fw      = fwidth(d) * 0.8;
  float lineStr = 1.0 - smoothstep(0.0, fw, abs(d));
  float band    = abs(fract(d * 1.5) - 0.5) * 2.0;
  float bandStr = (1.0 - smoothstep(0.0, fw * 2.0, band)) * 0.18;
  float dark    = clamp(lineStr + bandStr, 0.0, 1.0);
  dark = lineStr; // 등고선만
  // heatmap 위에 검은 등고선 오버레이
  col = mix(col, vec3(0.0), dark);
  // ────────────────────────────────────────────────────────────────────────

  // ⚠️ 캔버스 컨텍스트가 premultipliedAlpha:true(기본값)다 — RGB를 알파로 미리 곱해서
  //    내보내야 한다. 안 그러면 합성기가 canvasRGB + dest*(1-canvasA) 로 섞으면서
  //    presence가 작은 자리마다 col이 그대로 더해져 **배경 위에 흰 상자**가 생긴다.
  //    (배경이 흰색이던 시절엔 안 보였고, TD 투명 합성으로 오면서 드러났다)
  fragColor = vec4(col * presence, presence);
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
        this._wordPositions = new Map(); // wordId → [x, y] (뷰포트 uv)
        this._wordRadii = new Map(); // wordId → radius (한 번 배정 후 유지)
        this._rect = null; // 글자 영역(뷰포트 px). null이면 뷰포트 전체 — setRect() 참고
        this.sylSize = 150; // per-receiver sylSize : #fontSize
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

        // preserveDrawingBuffer — captureFrame()이 toDataURL()로 읽으려면 필요하다.
        // 기본값(false)이면 draw 직후 다음 합성에서 버퍼가 버려져 빈 PNG가 나온다.
        const gl = this._canvas.getContext('webgl2', { preserveDrawingBuffer: true });
        if (!gl) {
            console.error('[sora] WebGL2 not supported');
            return;
        }
        this._gl = gl;

        this._prog = createProgram(gl, VERT, FRAG);
        if (!this._prog) return;
        gl.useProgram(this._prog);

        gl.enable(gl.BLEND);
        // 프리멀티플라이드 블렌딩 — 캔버스 컨텍스트가 premultipliedAlpha:true(기본값)라
        // 셰이더도 clearColor도 RGB를 알파로 미리 곱한 값이어야 한다. fragColor 주석 참고.
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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

    // 글자 영역을 뷰포트 일부로 좁힌다. {x, y, w, h}(뷰포트 px) 또는 null(=전체).
    // sora는 positions를 무시하고 단어마다 랜덤 자리를 잡기 때문에 core.js layoutFor(rect)가
    // 안 먹는다 — 이 메서드가 그 짝으로, 랜덤 범위와 반경 기준을 rect로 바꾼다.
    // 이미 자리를 배정받은 단어는 그대로 둔다(자리를 유지하는 게 이 receiver의 규칙).
    setRect(rect) {
        this._rect = rect ?? null;
    }

    // 화면에 떠 있는 단어 원들 — [{ wordId, x, y, r }](뷰포트 px, r = 보이는 반경). sora는 positions를
    // 안 쓰므로 페이지의 음절 네모가 이걸로 단어마다 원 가운데 아래에 붙는다(2026-10-08)
    wordAnchors() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        return (this._slotWordIds ?? []).map((wordId, i) => ({
            wordId,
            x: this._positions[i][0] * W,
            y: this._positions[i][1] * H,
            // 반경은 y-uv 단위, 셰이더 presence가 0.6r~1.2r에서 사라진다 — 눈에 보이는 끝 ≈ r
            r: this._radii[i] * H,
        }));
    }

    // 캔버스 전체 기준 uv(0~1)를 rect 안쪽 uv로 접는다. rect가 없으면 그대로.
    _toRect(u, v) {
        const r = this._rect;
        if (!r) return [u, v];
        // sora는 논리 px 크기를 따로 안 들고 있다(_resize가 window에서 바로 읽는다).
        return [(r.x + u * r.w) / window.innerWidth, (r.y + v * r.h) / window.innerHeight];
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
        // 반경은 y-uv 단위다(셰이더가 delta.x에만 aspect를 곱한다). 글자 영역이 좁아지면
        // 같이 줄어야 rect 밖으로 새지 않는다.
        const rectScale = this._rect ? this._rect.h / window.innerHeight : 1;
        const baseRadius = (this.sylSize / 550) * rectScale;
        for (const wid of wordIds) {
            if (!this._wordPositions.has(wid)) {
                this._wordPositions.set(
                    wid,
                    this._toRect(
                        MARGIN + Math.random() * (1 - MARGIN * 2),
                        MARGIN + Math.random() * (1 - MARGIN * 2),
                    ),
                );
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
        this._slotWordIds = wordIds.slice(0, slotCount);
        for (let i = slotCount; i < MAX_SYL; i++) {
            this._frozen[i] = false;
        }
    }

    // ── 제출(submit) 계약 — flushQueue → captureFrame → clearAccum ────────────
    // mycelium/dandelion/signal과 같은 3단 계약. sora는 성장 큐 대신 **슬롯별 모프**가
    // "자라는 중"에 해당한다(MORPH_DUR 0.8s + WAVE_DUR 2.4s).

    // 진행 중인 모프/파동을 즉시 끝내고, 그 상태가 화면에 올라오길 기다린다.
    // 다 자라길 실제로 기다리면 파동만 2.4초라 제출이 늘어진다 — mycelium의
    // finishGrowing()과 같은 취지로 목표값으로 스냅시킨다.
    // (_morphStart/_waveStart의 -999는 "아주 예전" 센티널이라 t가 곧바로 1.0이 된다)
    async flushQueue() {
        for (let i = 0; i < MAX_SYL; i++) {
            this._prevCells[i] = [...this._cells[i]];
            this._morphStart[i] = -999;
            this._waveStart[i] = -999;
        }
        await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    }

    // 투명 PNG다 — 셰이더가 프리멀티플라이드 알파를 내보내고 clearColor도 (0,0,0,0)라
    // 도형 바깥은 완전 투명하게 나온다. 화면엔 안 쓰이고 아카이빙(PRD 3-E)용.
    captureFrame() {
        if (!this._gl || !this._canvas) return null;
        this._render(); // 마지막 상태를 확실히 한 장 그린 뒤 읽는다
        return this._canvas.toDataURL('image/png');
    }

    // 제출 후 새 문장 시작 — 슬롯과 단어 자리 배정을 전부 비우고 빈 화면 한 장.
    // wordPositions/wordRadii까지 지워야 다음 문장이 같은 자리를 물려받지 않는다.
    clearAccum() {
        this._cells = Array.from({ length: MAX_SYL }, () => [2.0, 3.0, 0.5, 0.33]);
        this._prevCells = Array.from({ length: MAX_SYL }, () => [2.0, 3.0, 0.5, 0.33]);
        this._positions = Array.from({ length: MAX_SYL }, () => [0.5, 0.5]);
        this._radii = Array(MAX_SYL).fill(0.1);
        this._morphStart = Array(MAX_SYL).fill(-999);
        this._waveStart = Array(MAX_SYL).fill(-999);
        this._f3Norms = Array(MAX_SYL).fill(0.5);
        this._frozen = Array(MAX_SYL).fill(false);
        this._wordPositions.clear();
        this._wordRadii.clear();
        this._slotWordIds = [];
        this._sylCount = 0;
        this._render(); // 다음 _animate를 기다리면 방금 캡처한 화면이 한 프레임 더 남는다
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
        // 완전 투명. 예전엔 여기가 (0.98, 0.99, 1, 0) 이었는데, 알파가 0이라 배경색으로
        // 쓰이면 안 되는 값이 프리멀티플라이드 합성 버그를 타고 **흰 배경처럼 보이고 있었다**
        // (페이지 배경이 흰색이던 시절엔 구분이 안 됐고, TD 투명 합성에서 흰 상자로 드러남).
        gl.clearColor(0, 0, 0, 0);
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
