// ── alien.js ──────────────────────────────────────────────────────────────────
// 2-pass 렌더링:
//   [Pass 1] grow 중인 음절 1개만 레이마칭 → growTarget
//   [Pass 2] growTarget + bckbuffer 합성   → accumTarget (ping-pong)
//   [Pass 3] accumTarget을 화면에 표시     (레이마칭 없음)
//
// 완성된 글자는 accumTarget에 구워지므로
// 글자가 쌓여도 항상 최대 1음절만 레이마칭 실행.
//
// grow queue: 음절이 빠르게 입력돼도 순서대로 하나씩 처리.
//   instant:true  → growT=1로 한 프레임에 즉시 bake (삭제 후 재구움용)
//   instant:false → grow 애니메이션
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { vertSrc, growFrag, accumFrag, dispFrag } from '../shader.js';

export class AlienReceiver {
    constructor() {
        this._renderer = null;
        this._clock = null;
        this._raf = null;
        this._lastTime = 0;
        this._FRAME_INTERVAL = 1000 / 24;

        this._camPos = new THREE.Vector3(0, 0.5, 5);
        this._camTarget = new THREE.Vector3(0, 0, 0);

        this._growTarget = null;
        this._accumTarget = null;
        this._prevTarget = null;

        this._growScene = null;
        this._accumScene = null;
        this._dispScene = null;
        this._growUniforms = null;
        this._accumUniforms = null;
        this._dispUniforms = null;
        this._quadCam = null;

        // grow 큐
        this._queue = [];
        this._growing = false;
        this._instantBake = false;
        this._growStart = 0;
        this._isFirstGlyph = true;
        this._prevSylCount = 0;
        this._forceComplete = false; // 현재 grow 중인 음절을 즉시 완료할 플래그

        this.lineHeightRatio = 4.0;
    }

    // ── Receiver 인터페이스 ──────────────────────────────────────────────────────

    async init(canvas) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio, 1);

        this._renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas ?? undefined });
        this._renderer.setSize(W, H);
        this._renderer.setPixelRatio(dpr);
        if (!canvas) {
            this._renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;';
            document.body.appendChild(this._renderer.domElement);
        }

        this._clock = new THREE.Clock();
        this._quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const rtOpts = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        };
        const rW = W * dpr,
            rH = H * dpr;
        this._growTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);
        this._accumTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);
        this._prevTarget = new THREE.WebGLRenderTarget(rW, rH, rtOpts);

        const { ro, camMat, fov } = this._calcCamera();

        // Pass 1 — grow
        this._growUniforms = {
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_dpr: { value: dpr },
            u_time: { value: 0 },
            u_ro: { value: ro },
            u_camMat: { value: camMat },
            u_fov: { value: fov },
            u_start: { value: new THREE.Vector3() },
            u_center: { value: new THREE.Vector3() },
            u_cho: { value: new THREE.Vector3() },
            u_end: { value: new THREE.Vector3() },
            u_jung: { value: new THREE.Vector3() },
            u_amp: { value: 0 },
            u_yangseong: { value: 0 },
            u_diphthong: { value: 0 },
            u_growT: { value: 0 },
            u_materialMode: { value: 0 },  // 0=crosshatch, 1=metal, 2=glass
        };
        this._growScene = this._makeQuadScene(vertSrc, growFrag, this._growUniforms);

        // Pass 2 — accum
        this._accumUniforms = {
            u_growTex: { value: this._growTarget.texture },
            u_bckbuffer: { value: this._prevTarget.texture },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_isFirst: { value: 1.0 },
        };
        this._accumScene = this._makeQuadScene(vertSrc, accumFrag, this._accumUniforms);

        // Pass 3 — display
        this._dispUniforms = {
            u_accumTex: { value: this._accumTarget.texture },
            u_resolution: { value: new THREE.Vector2(rW, rH) },
            u_dispMatMode: { value: 0 },
        };
        this._dispScene = this._makeQuadScene(vertSrc, dispFrag, this._dispUniforms);

        window.addEventListener('resize', this._onResize);
        this._raf = requestAnimationFrame(this._animate);
    }

    forceRebake(uniformData, sylCount) {
        if (!uniformData || sylCount === 0) return;
        const { starts, centers, chos, ends, jungs, amps, yangseong, diphthong } = uniformData;
        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
        for (let i = 0; i < sylCount; i++) {
            this._queue.push(
                this._makeItem(
                    starts[i],
                    centers[i],
                    chos[i],
                    ends[i],
                    jungs[i],
                    amps[i],
                    yangseong[i],
                    diphthong[i],
                    true,
                ),
            );
        }
        this._prevSylCount = sylCount;
        this._dequeue();
    }

    update(uniformData, newSylCount = 0) {
        if (!uniformData) return;
        const { starts, centers, chos, ends, jungs, amps, yangseong, diphthong, confirmed } = uniformData;
        const prevCount = this._prevSylCount;

        if (newSylCount < prevCount) {
            this._queue = [];
            this._growing = false;
            this._isFirstGlyph = true;
            for (let i = 0; i < newSylCount; i++) {
                this._queue.push(
                    this._makeItem(
                        starts[i],
                        centers[i],
                        chos[i],
                        ends[i],
                        jungs[i],
                        amps[i],
                        yangseong[i],
                        diphthong[i],
                        true,
                    ),
                );
            }
        } else {
            for (let i = prevCount; i < newSylCount; i++) {
                const isInstant = confirmed ? confirmed[i] : false;
                this._queue.push(
                    this._makeItem(
                        starts[i],
                        centers[i],
                        chos[i],
                        ends[i],
                        jungs[i],
                        amps[i],
                        yangseong[i],
                        diphthong[i],
                        isInstant,
                    ),
                );
            }
            if (newSylCount > prevCount && prevCount > 0 && this._growing) {
                this._growUniforms.u_end.value.copy(ends[prevCount - 1]);
                this._forceComplete = true;
            }
        }

        this._prevSylCount = newSylCount;
        if (!this._growing) this._dequeue();
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        this._growTarget?.dispose();
        this._accumTarget?.dispose();
        this._prevTarget?.dispose();
        this._renderer?.dispose();
        const el = this._renderer?.domElement;
        if (el?.parentNode) el.parentNode.removeChild(el);
    }

    // ── 공개 유틸 ─────────────────────────────────────────────────────────────────

    // materialMode 전환 (0=crosshatch, 1=metal, 2=glass)
    setMaterialMode(mode) {
        if (this._growUniforms) {
            this._growUniforms.u_materialMode.value = mode;
        }
        if (this._dispUniforms) {
            this._dispUniforms.u_dispMatMode.value = mode;
        }
    }

    // 큐가 빌 때까지 대기 후 2프레임 더 기다려 마지막 bake 확정
    flushQueue() {
        const wait2 = resolve => requestAnimationFrame(() => requestAnimationFrame(resolve));

        if (!this._growing && this._queue.length === 0) {
            return new Promise(wait2);
        }
        return new Promise(resolve => {
            const check = () => {
                if (!this._growing && this._queue.length === 0) {
                    wait2(resolve);
                } else {
                    requestAnimationFrame(check);
                }
            };
            requestAnimationFrame(check);
        });
    }

    captureFrame() {
        const rW = this._accumTarget.width;
        const rH = this._accumTarget.height;
        const buf = new Uint8Array(rW * rH * 4);
        this._renderer.readRenderTargetPixels(this._accumTarget, 0, 0, rW, rH, buf);

        const cvs = document.createElement('canvas');
        cvs.width = rW;
        cvs.height = rH;
        const ctx = cvs.getContext('2d');
        const imgData = ctx.createImageData(rW, rH);
        for (let y = 0; y < rH; y++) {
            const srcRow = (rH - 1 - y) * rW * 4;
            const dstRow = y * rW * 4;
            imgData.data.set(buf.subarray(srcRow, srcRow + rW * 4), dstRow);
        }
        ctx.putImageData(imgData, 0, 0);
        return cvs.toDataURL('image/png');
    }

    // accumTarget 초기화 (제출 후 새 줄 시작)
    clearAccum() {
        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
        this._prevSylCount = 0;

        const prevClear = this._renderer.getClearColor(new THREE.Color());
        const prevAlpha = this._renderer.getClearAlpha();
        this._renderer.setClearColor(0x000000, 0);
        this._renderer.setRenderTarget(this._accumTarget);
        this._renderer.clear();
        this._renderer.setRenderTarget(this._prevTarget);
        this._renderer.clear();
        this._renderer.setRenderTarget(null);
        this._renderer.setClearColor(prevClear, prevAlpha);
    }

    // ── 내부 ─────────────────────────────────────────────────────────────────────

    _makeItem(start, center, cho, end, jung, amp, yang, diph, instant) {
        return {
            start: start.clone(),
            center: center.clone(),
            cho: cho.clone(),
            end: end.clone(),
            jung: jung.clone(),
            amp,
            yang,
            diph,
            instant,
        };
    }

    _dequeue() {
        if (this._queue.length === 0) return;
        const item = this._queue.shift();
        const u = this._growUniforms;
        u.u_start.value.copy(item.start);
        u.u_center.value.copy(item.center);
        u.u_cho.value.copy(item.cho);
        u.u_end.value.copy(item.end);
        u.u_jung.value.copy(item.jung);
        u.u_amp.value = item.amp;
        u.u_yangseong.value = item.yang;
        u.u_diphthong.value = item.diph;
        u.u_growT.value = 0.0;
        this._growStart = this._clock.getElapsedTime();
        this._growing = true;
        this._instantBake = item.instant;
    }

    _swapAndAccum(isFirst) {
        const tmp = this._prevTarget;
        this._prevTarget = this._accumTarget;
        this._accumTarget = tmp;

        this._accumUniforms.u_bckbuffer.value = this._prevTarget.texture;
        this._accumUniforms.u_isFirst.value = isFirst ? 1.0 : 0.0;
        this._dispUniforms.u_accumTex.value = this._accumTarget.texture;

        this._renderer.setRenderTarget(this._accumTarget);
        this._renderer.render(this._accumScene, this._quadCam);
    }

    _animate = timestamp => {
        this._raf = requestAnimationFrame(this._animate);
        if (timestamp - this._lastTime < this._FRAME_INTERVAL) return;
        this._lastTime = timestamp;

        this._growUniforms.u_time.value = this._clock.getElapsedTime();

        if (!this._growing) {
            this._renderer.setRenderTarget(null);
            this._renderer.render(this._dispScene, this._quadCam);
            return;
        }

        let growT;
        if (this._instantBake) {
            growT = 1.0;
            this._growUniforms.u_growT.value = 1.0;
            this._renderer.setRenderTarget(this._growTarget);
            this._renderer.render(this._growScene, this._quadCam);
            this._swapAndAccum(this._isFirstGlyph);
            this._isFirstGlyph = false;
            this._growing = false;
            // 다음 프레임에 dequeue — 현재 프레임 렌더가 완전히 끝난 후 uniform 교체
            requestAnimationFrame(() => this._dequeue());
            return;
        } else {
            const prev = this._growUniforms.u_growT.value;
            growT = this._forceComplete ? 1.0 : prev + (1.0 - prev) * 0.08;
            this._forceComplete = false;
            this._growUniforms.u_growT.value = growT >= 0.98 ? 1.0 : growT;
        }

        this._renderer.setRenderTarget(this._growTarget);
        this._renderer.render(this._growScene, this._quadCam);

        this._swapAndAccum(this._isFirstGlyph);
        this._isFirstGlyph = false;

        this._renderer.setRenderTarget(null);
        this._renderer.render(this._dispScene, this._quadCam);

        if (growT >= 1.0) {
            this._growing = false;
            this._dequeue();
        }
    };

    _calcCamera() {
        const cam = this._camPos.clone();
        const target = this._camTarget.clone();
        const camDir = target.clone().sub(cam).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(camDir, up).normalize();
        const camUp = new THREE.Vector3().crossVectors(right, camDir).normalize();
        const camMat = new THREE.Matrix3().set(
            right.x,
            right.y,
            right.z,
            camUp.x,
            camUp.y,
            camUp.z,
            -camDir.x,
            -camDir.y,
            -camDir.z,
        );
        const fov = 1.0 / Math.tan(THREE.MathUtils.degToRad(45) / 2.0);
        return { ro: cam, camMat, fov };
    }

    _makeQuadScene(vert, frag, uniforms) {
        const scene = new THREE.Scene();
        scene.add(
            new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag }),
            ),
        );
        return scene;
    }

    _onResize = () => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const dpr = this._renderer.getPixelRatio();
        const rW = W * dpr,
            rH = H * dpr;

        this._renderer.setSize(W, H);
        this._growTarget.setSize(rW, rH);
        this._accumTarget.setSize(rW, rH);
        this._prevTarget.setSize(rW, rH);

        const res = new THREE.Vector2(rW, rH);
        this._growUniforms.u_resolution.value.copy(res);
        this._accumUniforms.u_resolution.value.copy(res);
        this._dispUniforms.u_resolution.value.copy(res);

        const { ro, camMat, fov } = this._calcCamera();
        this._growUniforms.u_ro.value.copy(ro);
        this._growUniforms.u_camMat.value.copy(camMat);
        this._growUniforms.u_fov.value = fov;

        this._queue = [];
        this._growing = false;
        this._isFirstGlyph = true;
    };
}
