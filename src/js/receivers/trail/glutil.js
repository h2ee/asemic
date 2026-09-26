// 04_trail_gl/glutil.js — field / growth / particles 가 공유하는 WebGL2 잡일
//
// 세 모듈이 전부 "풀스크린 쿼드로 텍스처 → 텍스처" 패스라서 셋업이 똑같다.
// 여기에 모아두지 않으면 같은 60줄이 세 번 반복된다.

export function compile(gl, type, src, label) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        console.error(`[${label}] ${gl.getShaderInfoLog(sh)}`);
    return sh;
}

export function link(gl, vertSrc, fragSrc, label) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vertSrc, label + '.vert'));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fragSrc, label + '.frag'));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        console.error(`[${label}] ${gl.getProgramInfoLog(p)}`);
    return p;
}

// 이름 → location 캐시
export function uniforms(gl, prog) {
    const cache = new Map();
    return name => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
        return cache.get(name);
    };
}

// 렌더타겟 한 장. filter 는 LINEAR(밀도장·성장장) 또는 NEAREST(파티클 상태) 를 쓴다.
//   RGBA16F  누적/블렌딩용 (블렌딩이 코어에서 허용됨)
//   RGBA32F  파티클 위치용 (px 좌표를 담으려면 16F 로는 정밀도가 모자람. 블렌딩은 안 쓴다)
export function makeTarget(gl, w, h, opts = {}) {
    const internal = opts.internal ?? gl.RGBA16F;
    const type = opts.type ?? gl.HALF_FLOAT;
    const filter = opts.filter ?? gl.LINEAR;
    const data = opts.data ?? null;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        console.error(`[glutil] FBO incomplete (${w}x${h})`);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { tex, fbo, w, h };
}

export function dropTarget(gl, t) {
    if (!t) return;
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fbo);
}

// 화면 꽉 채우는 쿼드 (삼각형 2개). 스탬프 패스의 per-vertex 코너로도 재사용된다.
export const QUAD_VERTS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

export function makeQuadBuffer(gl) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);
    return buf;
}

export function makeQuadVAO(gl, quadBuf) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
}

// ping-pong 한 쌍. step() 마다 read/write 를 뒤집는다.
export function makePingPong(gl, w, h, opts) {
    let a = makeTarget(gl, w, h, opts);
    let b = makeTarget(gl, w, h, opts);
    return {
        get read() {
            return a;
        },
        get write() {
            return b;
        },
        swap() {
            const t = a;
            a = b;
            b = t;
        },
        drop() {
            dropTarget(gl, a);
            dropTarget(gl, b);
        },
    };
}
