// ── glass.js — 말풍선 유리 (2026-10-08) ─────────────────────────────────────────
//
// Figma 'Glass' 효과(Light -45° 80% / Refraction 100 / Depth 100 / Dispersion 50 / Frost 54)를 따라 만든
// WebGL 한 장. 말풍선 SVG 안에 foreignObject로 들어가 그림자 위·면(path)·테(rim) 아래에 깔린다 —
// 등장 애니메이션(svg transform)을 그대로 같이 탄다.
//
// 뒤에 비치는 건 body 배경 이미지(BG_d / BG_n)뿐이라(글자는 말풍선 위에 그려진다) backdrop을 읽지 않고
// 같은 이미지를 화면에 100%로 늘린 배치 그대로 텍스처로 들고 있다.
//   Frost       배경을 미리 흐린 텍스처(이미지·크기·frost가 바뀔 때만 다시 굽는다)
//   Depth       굴절이 일어나는 가장자리 띠의 폭 — 말풍선 모양 마스크를 이만큼 흐려 "가장자리까지 거리"로 쓴다
//   Refraction  그 띠 안에서 배경을 안쪽에서 끌어오는 양(렌즈처럼 휜다)
//   Dispersion  R/G/B를 서로 다른 양만큼 굴절 — 가장자리에 색 번짐
//   Light       각도 쪽 가장자리는 밝게, 반대쪽은 약하게(유리 두께에 빛이 걸린 것)
// 값은 output.html #bubble-box의 --glass-* (Figma 슬라이더와 같은 0~100 단위).
//
// 다시 그리는 건 모양이 바뀔 때(draw)·배경 전환(setMix) 때뿐 — 가만히 있으면 GPU를 안 쓴다.

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y; // 위가 0 — 화면 px과 같은 방향
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_bgA;    // 흐린 배경(BG_d)
uniform sampler2D u_bgB;    // 흐린 배경(BG_n)
uniform sampler2D u_mask;   // R = 말풍선 모양(선명), G = 흐린 모양(가장자리 거리)
uniform float u_mix;        // 0 = A, 1 = B
uniform vec2 u_res;         // 화면 px
uniform vec2 u_maskTexel;   // 마스크 한 칸(uv)
uniform float u_refract;    // 굴절 최대 거리(px)
uniform float u_disp;       // 0~1
uniform vec2 u_light;       // 빛이 오는 쪽(화면 방향, y 아래)
uniform float u_lightAmt;   // 0~1
uniform float u_lift;       // 뿌옇게 밝히기

vec3 bg(vec2 uv) {
    uv = clamp(uv, vec2(0.0), vec2(1.0));
    return mix(texture(u_bgA, uv).rgb, texture(u_bgB, uv).rgb, u_mix);
}

void main() {
    float inside = texture(u_mask, v_uv).r;
    if (inside < 0.002) { o = vec4(0.0); return; }
    float b = texture(u_mask, v_uv).g;
    // 흐린 마스크의 기울기 = 안쪽을 향한 방향
    vec2 t = u_maskTexel * 1.5;
    vec2 g = vec2(texture(u_mask, v_uv + vec2(t.x, 0.0)).g - texture(u_mask, v_uv - vec2(t.x, 0.0)).g,
                  texture(u_mask, v_uv + vec2(0.0, t.y)).g - texture(u_mask, v_uv - vec2(0.0, t.y)).g);
    float gl = length(g);
    vec2 nIn = gl > 1e-5 ? g / gl : vec2(0.0);
    // 가장자리 근접도 — 경계(흐린 값 ≈ 0.5)에서 1, 띠 안쪽 끝(1.0)에서 0
    float e = clamp((1.0 - b) * 2.0, 0.0, 1.0);
    float bend = pow(e, 1.6);

    // 굴절 — 가장자리일수록 안쪽 배경을 끌어온다. 채널마다 양을 달리해 분산
    vec2 off = nIn * bend * u_refract / u_res;
    vec3 col;
    col.r = bg(v_uv + off * (1.0 + u_disp * 0.35)).r;
    col.g = bg(v_uv + off).g;
    col.b = bg(v_uv + off * (1.0 - u_disp * 0.35)).b;

    col = mix(col, vec3(1.0), u_lift);

    // 빛 — 각도 쪽 가장자리는 밝게, 반대쪽은 약하게. 가장자리 아주 가까이에만(얇은 띠)
    vec2 nOut = -nIn;
    float lit = dot(nOut, u_light);
    float rim = pow(e, 5.0);
    float hl = (pow(max(lit, 0.0), 2.0) + 0.45 * pow(max(-lit, 0.0), 2.0)) * rim * u_lightAmt;
    // 분산은 빛띠에도 살짝 무지개를 남긴다
    vec3 tint = mix(vec3(1.0), vec3(1.0 + 0.25 * u_disp, 1.0, 1.0 + 0.4 * u_disp), clamp(lit * 0.5 + 0.5, 0.0, 1.0));
    col = mix(col, min(tint, vec3(1.0)), clamp(hl, 0.0, 1.0));

    o = vec4(col * inside, inside); // premultiplied
}`;

function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
}

function makeTex(gl) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 220, 235, 255]));
    return t;
}

const loadImage = src =>
    new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
    });

const BG_SCALE = 0.5; // 흐린 배경 텍스처 해상도(화면 대비) — 어차피 흐리므로 반이면 충분
const MASK_SCALE = 0.5; // 모양 마스크 해상도
const DPR_CAP = 1.5;

/**
 * @param images  [A, B] 배경 이미지 URL (B는 없어도 된다)
 * @returns null(WebGL2 없음) 또는 { canvas, setShape(d, params), setMix(on, {instant}) }
 */
export function createGlass(images) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!gl) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const U = n => gl.getUniformLocation(prog, n);
    const loc = {
        bgA: U('u_bgA'),
        bgB: U('u_bgB'),
        mask: U('u_mask'),
        mix: U('u_mix'),
        res: U('u_res'),
        maskTexel: U('u_maskTexel'),
        refract: U('u_refract'),
        disp: U('u_disp'),
        light: U('u_light'),
        lightAmt: U('u_lightAmt'),
        lift: U('u_lift'),
    };
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');

    const texA = makeTex(gl);
    const texB = makeTex(gl);
    const texMask = makeTex(gl);
    const imgs = [null, null];
    images.forEach((src, i) => src && loadImage(src).then(im => ((imgs[i] = im), (frostKey = ''), render())).catch(() => {}));

    // 모양 마스크 — 선명한 것(R)과 흐린 것(G)을 한 장에
    const mSharp = document.createElement('canvas');
    const mBlur = document.createElement('canvas');
    const mOut = document.createElement('canvas');
    // 흐린 배경 굽기용
    const fCan = document.createElement('canvas');

    let W = 1,
        H = 1;
    let d = null;
    let P = { refraction: 100, depth: 100, dispersion: 50, frost: 54, angle: -45, light: 80, lift: 0.06 };
    let frostKey = '';
    let mixNow = 0,
        mixTo = 0,
        mixRaf = 0;

    function bakeFrost() {
        const key = `${W}x${H}:${P.frost}:${!!imgs[0]}:${!!imgs[1]}`;
        if (key === frostKey) return;
        frostKey = key;
        const fw = Math.max(1, Math.round(W * BG_SCALE));
        const fh = Math.max(1, Math.round(H * BG_SCALE));
        fCan.width = fw;
        fCan.height = fh;
        const c = fCan.getContext('2d');
        // Frost 0~100 → 흐림 반경. 100 = 화면 높이의 4%
        const r = (P.frost / 100) * 0.04 * H * BG_SCALE;
        imgs.forEach((im, i) => {
            if (!im) return;
            c.filter = 'none';
            c.clearRect(0, 0, fw, fh);
            // 가장자리가 투명으로 번지지 않게 살짝 크게 그린다
            const pad = r * 2;
            c.filter = r > 0.1 ? `blur(${r}px)` : 'none';
            c.drawImage(im, -pad, -pad, fw + pad * 2, fh + pad * 2);
            gl.bindTexture(gl.TEXTURE_2D, i ? texB : texA);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fCan);
        });
        c.filter = 'none';
    }

    function bakeMask() {
        const mw = Math.max(1, Math.round(W * MASK_SCALE));
        const mh = Math.max(1, Math.round(H * MASK_SCALE));
        for (const c of [mSharp, mBlur, mOut]) {
            if (c.width !== mw) c.width = mw;
            if (c.height !== mh) c.height = mh;
        }
        const s = mSharp.getContext('2d');
        s.setTransform(1, 0, 0, 1, 0, 0);
        s.clearRect(0, 0, mw, mh);
        if (d) {
            s.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
            s.fillStyle = '#fff';
            s.fill(new Path2D(d));
        }
        // Depth 0~100 → 띠 폭. 100 = 화면 높이의 5%
        const band = Math.max(0.5, (P.depth / 100) * 0.05 * H * MASK_SCALE);
        const b = mBlur.getContext('2d');
        b.clearRect(0, 0, mw, mh);
        b.filter = `blur(${band / 2}px)`;
        b.drawImage(mSharp, 0, 0);
        b.filter = 'none';
        // R = 선명, G = 흐림 — 두 장을 채널로 합친다
        const o = mOut.getContext('2d');
        o.globalCompositeOperation = 'source-over';
        o.fillStyle = '#000';
        o.fillRect(0, 0, mw, mh);
        o.globalCompositeOperation = 'lighter';
        o.drawImage(tintChannel(mSharp, '#f00'), 0, 0);
        o.drawImage(tintChannel(mBlur, '#0f0'), 0, 0);
        o.globalCompositeOperation = 'source-over';
        gl.bindTexture(gl.TEXTURE_2D, texMask);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mOut);
    }
    // 흰 알파 마스크 → 한 채널 색으로
    const tintCans = {};
    function tintChannel(src, color) {
        const c = (tintCans[color] ??= document.createElement('canvas'));
        if (c.width !== src.width) c.width = src.width;
        if (c.height !== src.height) c.height = src.height;
        const x = c.getContext('2d');
        x.globalCompositeOperation = 'source-over';
        x.clearRect(0, 0, c.width, c.height);
        x.drawImage(src, 0, 0);
        x.globalCompositeOperation = 'source-in';
        x.fillStyle = color;
        x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = 'source-over';
        return c;
    }

    function render() {
        const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
        const cw = Math.round(W * dpr);
        const ch = Math.round(H * dpr);
        if (canvas.width !== cw) canvas.width = cw;
        if (canvas.height !== ch) canvas.height = ch;
        bakeFrost();
        gl.viewport(0, 0, cw, ch);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!d) return;
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        [texA, texB, texMask].forEach((t, i) => {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, t);
        });
        gl.uniform1i(loc.bgA, 0);
        gl.uniform1i(loc.bgB, 1);
        gl.uniform1i(loc.mask, 2);
        gl.uniform1f(loc.mix, mixNow);
        gl.uniform2f(loc.res, W, H);
        gl.uniform2f(loc.maskTexel, 1 / mSharp.width, 1 / mSharp.height);
        // Refraction 0~100 → 최대 굴절 거리. 100 = 화면 높이의 6%
        gl.uniform1f(loc.refract, (P.refraction / 100) * 0.06 * H);
        gl.uniform1f(loc.disp, P.dispersion / 100);
        const a = (P.angle * Math.PI) / 180;
        // Figma 각도 -45° = 왼쪽 위에서 오는 빛 → 화면 방향(y 아래) (-cos, sin) = (-0.71, -0.71)
        gl.uniform2f(loc.light, -Math.cos(a), Math.sin(a));
        gl.uniform1f(loc.lightAmt, P.light / 100);
        gl.uniform1f(loc.lift, P.lift);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return {
        canvas,
        // 모양이 바뀔 때마다(bubble.js draw) — d = 화면 px 경로, params = --glass-* 값
        setShape(path, w, h, params) {
            d = path;
            W = Math.max(1, w);
            H = Math.max(1, h);
            P = { ...P, ...params };
            bakeMask();
            render();
        },
        // 배경 A ↔ B 크로스페이드(body 배경과 같은 시간)
        setMix(on, { instant = false, ms = 1200 } = {}) {
            mixTo = on ? 1 : 0;
            cancelAnimationFrame(mixRaf);
            if (instant || mixNow === mixTo) {
                mixNow = mixTo;
                return render();
            }
            const from = mixNow;
            const t0 = performance.now();
            const step = now => {
                const t = Math.min(1, (now - t0) / ms);
                const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease-in-out
                mixNow = from + (mixTo - from) * k;
                render();
                mixRaf = t < 1 ? requestAnimationFrame(step) : 0;
            };
            mixRaf = requestAnimationFrame(step);
        },
    };
}
