// 04_trail_gl/particles.js — GPU 파티클 (상태 텍스처 ping-pong)
//
// 파티클 하나 = 상태 텍스처의 픽셀 하나. CPU 는 초기화만 하고 그 뒤론 아무것도 안 한다.
// 방출도 셰이더가 스스로 한다 (pupdate.frag 의 rejection sampling 참고).
//
// 위치를 CSS px 로 담기 때문에 상태 텍스처는 RGBA32F 를 쓴다 — 16F 는 값이 1000 근처에서
// 간격이 1px 이라 파티클이 격자에 붙어 버린다. 갱신 패스는 덮어쓰기라 블렌딩을 안 쓰므로
// EXT_float_blend 는 필요 없다.

import { link, uniforms, makeQuadVAO, makeTarget, dropTarget } from './glutil.js';
import quadVertSrc from './quad.vert';
import updateFragSrc from './pupdate.frag';
import particleVertSrc from './particle.vert';
import particleFragSrc from './particle.frag';

export function createParticles(gl, quadBuf, side = 128) {
    const canFloat = !!gl.getExtension('EXT_color_buffer_float');
    if (!canFloat)
        console.warn('[particles] EXT_color_buffer_float 없음 — 16F 로 대체(위치 정밀도 저하)');
    const fmt = canFloat
        ? { internal: gl.RGBA32F, type: gl.FLOAT, filter: gl.NEAREST }
        : { internal: gl.RGBA16F, type: gl.HALF_FLOAT, filter: gl.NEAREST };

    const updateProg = link(gl, quadVertSrc, updateFragSrc, 'pupdate');
    const drawProg = link(gl, particleVertSrc, particleFragSrc, 'particle');
    const uU = uniforms(gl, updateProg);
    const uD = uniforms(gl, drawProg);
    const quadVAO = makeQuadVAO(gl, quadBuf);
    const emptyVAO = gl.createVertexArray(); // 속성 없는 POINTS 드로우용

    const count = side * side;
    let a = null,
        b = null;
    let cssW = 1,
        cssH = 1,
        frame = 0; // 정수 해시의 시간축. uint 라 2^32 에서 감겨도 무해하다.

    // 전부 life=0(죽은 상태) + 서로 다른 시드로 시작 → 첫 프레임부터 스스로 리스폰을 시도한다
    function initData() {
        const d = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
            d[i * 4 + 0] = 0;
            d[i * 4 + 1] = 0;
            d[i * 4 + 2] = 0; // life
            d[i * 4 + 3] = Math.random(); // seed — [0,1) 로 유지 (해시 정밀도)
        }
        return d;
    }

    function reset() {
        dropTarget(gl, a);
        dropTarget(gl, b);
        a = makeTarget(gl, side, side, { ...fmt, data: initData() });
        b = makeTarget(gl, side, side, fmt);
    }

    function resize(nextCssW, nextCssH) {
        cssW = nextCssW;
        cssH = nextCssH;
        if (!a) reset();
    }

    // p: { bakedTex, liveTex, fieldTexel, th, time, dt, spawnTol, lifespan,
    //      curlAmp, curlScale, curlSpeed, flow, repel }
    function step(p) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
        gl.viewport(0, 0, side, side);
        gl.disable(gl.BLEND);
        gl.useProgram(updateProg);
        gl.bindVertexArray(quadVAO);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, a.tex);
        gl.uniform1i(uU('u_prev'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, p.bakedTex);
        gl.uniform1i(uU('u_baked'), 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, p.liveTex);
        gl.uniform1i(uU('u_live'), 2);

        gl.uniform2fv(uU('u_fieldTexel'), p.fieldTexel);
        gl.uniform2f(uU('u_cssSize'), cssW, cssH);
        gl.uniform1f(uU('u_time'), p.time);
        gl.uniform1ui(uU('u_frame'), frame++ >>> 0);
        gl.uniform1f(uU('u_dt'), p.dt);
        gl.uniform1f(uU('u_th'), p.th);
        gl.uniform1f(uU('u_compCap'), p.compCap ?? 0);
        gl.uniform1f(uU('u_spawnTol'), p.spawnTol);
        gl.uniform1f(uU('u_spawnRate'), p.spawnRate);
        gl.uniform1f(uU('u_lifespan'), p.lifespan);
        gl.uniform1f(uU('u_lifeVar'), p.lifeVar);
        gl.uniform1f(uU('u_curlAmp'), p.curlAmp);
        gl.uniform1f(uU('u_curlScale'), p.curlScale);
        gl.uniform1f(uU('u_curlSpeed'), p.curlSpeed);
        gl.uniform1f(uU('u_flow'), p.flow);
        gl.uniform1f(uU('u_repel'), p.repel);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        const t = a; // swap
        a = b;
        b = t;
    }

    // 기본 프레임버퍼(= goo 합성 결과) 위에 알파 블렌딩으로 얹는다
    function draw(p, viewW, viewH, dpr) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, viewW, viewH);
        gl.enable(gl.BLEND);
        // straight(non-premultiplied) alpha 타겟이라 알파 채널을 따로 블렌딩해야 한다.
        // 그냥 blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA) 를 쓰면 알파가 과소 누적돼서
        // 투명 배경 위 파티클이 캡처에서 흐려진다.
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(drawProg);
        gl.bindVertexArray(emptyVAO);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, a.tex);
        gl.uniform1i(uD('u_state'), 0);
        gl.uniform2i(uD('u_stateSize'), side, side);
        gl.uniform2f(uD('u_cssSize'), cssW, cssH);
        gl.uniform1f(uD('u_size'), p.size);
        gl.uniform1f(uD('u_dpr'), dpr);
        gl.uniform3fv(uD('u_ink'), p.ink);
        gl.uniform1f(uD('u_opacity'), p.opacity);

        gl.drawArrays(gl.POINTS, 0, count);
        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
    }

    // 튜닝/디버그용 — 상태 텍스처 전체를 읽어 살아있는 개수를 센다.
    // readPixels 라 파이프라인을 세운다. 매 프레임 호출 금지.
    function stats() {
        const buf = new Float32Array(count * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
        gl.readPixels(0, 0, side, side, gl.RGBA, gl.FLOAT, buf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let alive = 0,
            minX = Infinity,
            maxX = -Infinity;
        for (let i = 0; i < count; i++) {
            if (buf[i * 4 + 2] > 0) {
                alive++;
                minX = Math.min(minX, buf[i * 4]);
                maxX = Math.max(maxX, buf[i * 4]);
            }
        }
        const sample = [];
        for (let i = 0; i < 3; i++)
            sample.push(Array.from(buf.slice(i * 4, i * 4 + 4), v => +v.toFixed(4)));
        return { alive, count, xRange: alive ? [minX, maxX] : null, sample };
    }

    return { resize, reset, step, draw, count, stats };
}
