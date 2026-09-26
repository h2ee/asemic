// 04_trail_gl/growth.js — goo 경계에서 자라 나오는 성장장 (ping-pong 피드백)
//
// 밀도장(field)을 읽기만 하고 쓰지 않는다. 결과 텍스처는 합성 패스가 잉크로 얹는다.
// 해상도는 밀도장과 별개 — 성장장은 더 흐물흐물하므로 낮춰도 티가 안 난다.

import { link, uniforms, makePingPong, makeQuadVAO } from './glutil.js';
import quadVertSrc from './quad.vert';
import growthFragSrc from './growth.frag';

export function createGrowth(gl, quadBuf) {
    const prog = link(gl, quadVertSrc, growthFragSrc, 'growth');
    const u = uniforms(gl, prog);
    const vao = makeQuadVAO(gl, quadBuf);

    let pp = null;
    let w = 1,
        h = 1,
        cssW = 1,
        cssH = 1;

    function resize(nextCssW, nextCssH, nextW, nextH) {
        cssW = nextCssW;
        cssH = nextCssH;
        w = Math.max(1, nextW);
        h = Math.max(1, nextH);
        if (pp) pp.drop();
        pp = makePingPong(gl, w, h);
        clear();
    }

    function clear() {
        for (let i = 0; i < 2; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, pp.write.fbo);
            gl.viewport(0, 0, w, h);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            pp.swap();
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // p: { bakedTex, liveTex, fieldTexel:[x,y], th, time, dt, nowMin,
    //      decay, outward, curlAmp, curlScale, curlSpeed, source, bandLo, bandHi, ageDelay }
    function step(p) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pp.write.fbo);
        gl.viewport(0, 0, w, h);
        gl.disable(gl.BLEND);
        gl.useProgram(prog);
        gl.bindVertexArray(vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pp.read.tex);
        gl.uniform1i(u('u_prev'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, p.bakedTex);
        gl.uniform1i(u('u_baked'), 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, p.liveTex);
        gl.uniform1i(u('u_live'), 2);

        gl.uniform2fv(u('u_fieldTexel'), p.fieldTexel);
        gl.uniform2f(u('u_cssSize'), cssW, cssH);
        gl.uniform1f(u('u_time'), p.time);
        gl.uniform1f(u('u_dt'), p.dt);
        gl.uniform1f(u('u_th'), p.th);
        gl.uniform1f(u('u_decay'), p.decay);
        gl.uniform1f(u('u_outward'), p.outward);
        gl.uniform1f(u('u_curlAmp'), p.curlAmp);
        gl.uniform1f(u('u_curlScale'), p.curlScale);
        gl.uniform1f(u('u_curlSpeed'), p.curlSpeed);
        gl.uniform1f(u('u_source'), p.source);
        gl.uniform1f(u('u_bandLo'), p.bandLo);
        gl.uniform1f(u('u_bandHi'), p.bandHi);
        gl.uniform1f(u('u_nowMin'), p.nowMin);
        gl.uniform1f(u('u_ageDelay'), p.ageDelay);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        pp.swap();
    }

    const texture = () => pp.read.tex;

    return { resize, clear, step, texture };
}
