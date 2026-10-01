// 04_trail_gl/field.js — WebGL2 밀도장(goo) 파이프라인
//
// 구조 — 03_trail 의 permanent / live 분리를 그대로 GPU 로 옮긴 것:
//
//   bakedTex   RGBA16F. 손 뗀 획을 "새 세그먼트만" additive 스탬프로 누적.
//              비용이 O(신규 세그먼트) 라 무한히 쌓아도 프레임 시간이 안 늘어난다.
//   liveTex    RGBA16F. 그리는 중인 획 전용. 매 프레임 clear + 전체 재스탬프.
//              (라이브 곡선은 매 프레임 모양이 바뀌므로 누적하면 안 된다)
//   composite  두 장을 더해 임계 + 셰이딩 → 기본 프레임버퍼.
//
// 세그먼트당 인스턴스 1개 + compact support 커널이라, 픽셀당 전체 엔트리를
// 순회하는 데이터텍스처 방식(asemic signal/dandelion)과 달리 세그먼트가 수만 개여도 버틴다.
//
// growth.js / particles.js 가 textures() 로 이 두 장을 읽어 간다 (쓰지는 않는다).

import { link, uniforms, makeTarget, dropTarget, makeQuadVAO } from './glutil.js';
import stampVertSrc from './stamp.vert';
import stampFragSrc from './stamp.frag';
import quadVertSrc from './quad.vert';
import compositeFragSrc from './composite.frag';

export const FLOATS_PER_SEG = 8; // ax, ay, bx, by, R, id, birth, kind(0 .r / 1 .a)

export function createField(gl, quadBuf) {
    // RGBA16F 를 렌더타겟으로 쓰려면 둘 중 하나가 필요하다. 16F 는 블렌딩도 허용되므로
    // EXT_float_blend(32F 전용) 는 필요 없다.
    if (!gl.getExtension('EXT_color_buffer_half_float') && !gl.getExtension('EXT_color_buffer_float'))
        console.warn('[field] float 렌더타겟 확장이 없습니다 — 밀도 누적이 8bit 로 깎입니다');

    const stampProg = link(gl, stampVertSrc, stampFragSrc, 'stamp');
    const compProg = link(gl, quadVertSrc, compositeFragSrc, 'composite');
    const uStamp = uniforms(gl, stampProg);
    const uComp = uniforms(gl, compProg);

    const instBuf = gl.createBuffer();
    let instCapacity = 0;

    // 스탬프 VAO — loc0 = 코너(per-vertex), loc1/2 = 세그먼트(per-instance)
    const stampVAO = gl.createVertexArray();
    gl.bindVertexArray(stampVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    const STRIDE = FLOATS_PER_SEG * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, STRIDE, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    const compVAO = makeQuadVAO(gl, quadBuf);

    let fw = 1,
        fh = 1,
        cssW = 1,
        cssH = 1,
        pxPerTexel = 1;
    let baked = null;
    let live = null;

    // 화면 크기가 바뀌면 타겟을 다시 만든다 → baked 내용은 사라지므로 앱이 replay 해야 한다.
    function resize(nextCssW, nextCssH, nextFw, nextFh) {
        cssW = nextCssW;
        cssH = nextCssH;
        fw = Math.max(1, nextFw);
        fh = Math.max(1, nextFh);
        pxPerTexel = cssW / fw;
        dropTarget(gl, baked);
        dropTarget(gl, live);
        baked = makeTarget(gl, fw, fh);
        live = makeTarget(gl, fw, fh);
    }

    function clear(which) {
        const t = which === 'baked' ? baked : live;
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.viewport(0, 0, fw, fh);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // data: Float32Array, FLOATS_PER_SEG 개씩. count 개 인스턴스를 additive 로 누적.
    function stamp(which, data, count) {
        if (!count) return;
        const t = which === 'baked' ? baked : live;

        gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
        if (data.length > instCapacity) {
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
            instCapacity = data.length;
        } else {
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.viewport(0, 0, fw, fh);
        gl.useProgram(stampProg);
        gl.bindVertexArray(stampVAO);
        gl.uniform2f(uStamp('u_cssSize'), cssW, cssH);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE); // 밀도 누적
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // p: { th, edge, paper, ink, shade, light, normalZ, amb, diff, spec, specPow, fres, bands,
    //      growthTex, growInk, growGain, growOpacity }
    function composite(p, viewW, viewH) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, viewW, viewH);
        gl.disable(gl.BLEND);
        gl.useProgram(compProg);
        gl.bindVertexArray(compVAO);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, baked.tex);
        gl.uniform1i(uComp('u_baked'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, live.tex);
        gl.uniform1i(uComp('u_live'), 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, p.growthTex ?? baked.tex);
        gl.uniform1i(uComp('u_growth'), 2);

        gl.uniform2f(uComp('u_texel'), 1 / fw, 1 / fh);
        gl.uniform1f(uComp('u_pxPerTexel'), pxPerTexel);
        gl.uniform1f(uComp('u_th'), p.th);
        gl.uniform1f(uComp('u_compCap'), p.compCap ?? 0);
        gl.uniform1f(uComp('u_edge'), p.edge);
        gl.uniform3fv(uComp('u_paper'), p.paper);
        gl.uniform3fv(uComp('u_ink'), p.ink);
        gl.uniform1i(uComp('u_shade'), p.shade);
        gl.uniform3fv(uComp('u_light'), p.light);
        gl.uniform1f(uComp('u_normalZ'), p.normalZ);
        gl.uniform1f(uComp('u_amb'), p.amb);
        gl.uniform1f(uComp('u_diff'), p.diff);
        gl.uniform1f(uComp('u_spec'), p.spec);
        gl.uniform1f(uComp('u_specPow'), p.specPow);
        gl.uniform1f(uComp('u_fres'), p.fres);
        gl.uniform1f(uComp('u_bands'), p.bands);
        gl.uniform3fv(uComp('u_growInk'), p.growInk);
        gl.uniform1f(uComp('u_growGain'), p.growGain);
        gl.uniform1f(uComp('u_growOpacity'), p.growOpacity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    }

    // half-float → float (읽기 포맷이 HALF_FLOAT 로 나오는 구현 대비)
    function halfToFloat(h) {
        const s = (h & 0x8000) >> 15,
            e = (h & 0x7c00) >> 10,
            f = h & 0x03ff;
        if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
        if (e === 0x1f) return f ? NaN : (s ? -1 : 1) * Infinity;
        return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
    }

    // 튜닝용 프로브 — 화면 좌표(CSS px)의 밀도값을 읽는다.
    // th 를 감으로 찍지 말고 이걸로 확인할 것. (readPixels 라 파이프라인을 세우므로 튜닝 전용)
    const probeF32 = new Float32Array(4);
    const probeU16 = new Uint16Array(4);
    function probe(cssX, cssY, which = 'baked') {
        const t = which === 'baked' ? baked : live;
        const px = Math.round((cssX / cssW) * fw);
        const py = Math.round((1 - cssY / cssH) * fh); // 텍스처는 y 위로
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
        let out;
        if (type === gl.HALF_FLOAT) {
            gl.readPixels(px, py, 1, 1, gl.RGBA, gl.HALF_FLOAT, probeU16);
            out = Array.from(probeU16, halfToFloat);
        } else {
            gl.readPixels(px, py, 1, 1, gl.RGBA, gl.FLOAT, probeF32);
            out = Array.from(probeF32);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const [density, gAcc, bAcc, comp] = out;
        return {
            density,
            comp, // 동반 곡선 밀도 (goo.compCap 이 켜졌을 때만 .a 에 들어간다 — cap 전 값)
            strokeId: density > 1e-4 ? gAcc / density : 0,
            birth: density > 1e-4 ? bAcc / density : 0,
        };
    }

    const textures = () => ({ baked: baked.tex, live: live.tex });
    const texel = () => [1 / fw, 1 / fh];

    return { resize, clear, stamp, composite, probe, textures, texel };
}
