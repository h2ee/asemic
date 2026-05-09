// ── alien.js ──────────────────────────────────────────────────────────────────
// 발신자 외계인(나) / 수신자 인간 — Three.js 레이마칭 + 행성궤도 에피사이클
// 기존 main.js + shader.js + pathFunctions.js(mode 7)의 로직을 Receiver 인터페이스로 래핑.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { vertSrc, fragSrc } from '../shader.js';

export class AlienReceiver {
    constructor() {
        this._renderer = null;
        this._scene = null;
        this._camera = null;
        this._quad = null;
        this._uniforms = null;
        this._controls = null;
        this._clock = null;
        this._raf = null;
        this._growStart = -999;
        this._baked = false;

        this._lastTime = 0;
        this._FRAME_INTERVAL = 1000 / 24; // 24 fps
    }

    // ── Receiver 인터페이스 ──────────────────────────────────────────────────────

    async init(canvas) {
        const W = window.innerWidth;
        const H = window.innerHeight;

        this._renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas ?? undefined });
        this._renderer.setSize(W, H);
        if (!canvas) {
            this._renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;';
            document.body.appendChild(this._renderer.domElement);
        }
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));

        this._scene = new THREE.Scene();

        // perspective camera (OrbitControls 용)
        this._camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        this._camera.position.set(0, 0.5, 5);
        this._camera.lookAt(0, 0, 0);
        this._camera.updateMatrixWorld();

        this._controls = new OrbitControls(this._camera, this._renderer.domElement);
        this._controls.enableDamping = true;

        // orthographic quad camera (fullscreen)
        this._quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this._uniforms = {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(W, H) },
            u_dpr: { value: Math.min(window.devicePixelRatio, 1) },
            u_ro: { value: new THREE.Vector3() },
            u_camMat: { value: new THREE.Matrix3() },
            u_fov: { value: 1.8 },
            u_sylCount: { value: 0 },
            u_growT: { value: 0.0 },
            u_growFrom: { value: 0 }, // ← 점진적 누적용 (미구현 준비)
            u_start: {
                value: Array(8)
                    .fill(null)
                    .map(() => new THREE.Vector3()),
            },
            u_cho: {
                value: Array(8)
                    .fill(null)
                    .map(() => new THREE.Vector3()),
            },
            u_end: {
                value: Array(8)
                    .fill(null)
                    .map(() => new THREE.Vector3()),
            },
            u_jung: {
                value: Array(8)
                    .fill(null)
                    .map(() => new THREE.Vector3()),
            },
            u_amp: { value: new Float32Array(8) },
            u_yangseong: { value: new Float32Array(8) },
            u_diphthong: { value: new Float32Array(8) },
        };

        const geo = new THREE.PlaneGeometry(2, 2);
        const mat = new THREE.ShaderMaterial({
            uniforms: this._uniforms,
            vertexShader: vertSrc,
            fragmentShader: fragSrc,
        });
        this._scene.add(new THREE.Mesh(geo, mat));

        this._clock = new THREE.Clock();

        window.addEventListener('resize', this._onResize);
        this._raf = requestAnimationFrame(this._animate);
    }

    /**
     * @param {Array<{start, cho, end, jung, amp, yang, diph}>} uniformData
     *   main.js의 syllablesToUniforms() 결과를 그대로 전달
     */
    update(uniformData) {
        if (!uniformData) return;
        const { starts, chos, ends, jungs, amps, yangseong, diphthong, count } = uniformData;
        const u = this._uniforms;

        u.u_sylCount.value = count;
        for (let i = 0; i < 8; i++) {
            u.u_start.value[i].copy(starts[i]);
            u.u_cho.value[i].copy(chos[i]);
            u.u_end.value[i].copy(ends[i]);
            u.u_jung.value[i].copy(jungs[i]);
        }
        u.u_amp.value = new Float32Array(amps);
        u.u_yangseong.value = new Float32Array(yangseong);
        u.u_diphthong.value = new Float32Array(diphthong);

        this._growStart = this._clock.getElapsedTime();
        this._baked = false;
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        this._controls?.dispose();
        this._renderer?.dispose();
        if (!this._renderer) return;
        const el = this._renderer.domElement;
        if (el.parentNode) el.parentNode.removeChild(el);
    }

    // ── 내부 ────────────────────────────────────────────────────────────────────

    _animate = timestamp => {
        this._raf = requestAnimationFrame(this._animate);
        if (timestamp - this._lastTime < this._FRAME_INTERVAL) return;
        this._lastTime = timestamp;

        const u = this._uniforms;
        u.u_time.value = this._clock.getElapsedTime();
        const elapsed = this._clock.getElapsedTime() - this._growStart;
        const rawT = Math.min(elapsed / 4.0, 1.0);
        u.u_growT.value = rawT;

        if (this._baked) return;
        if (rawT >= 1.0) this._baked = true;

        this._updateCameraUniforms();
        this._controls.update();
        this._renderer.render(this._scene, this._quadCam);
    };

    _updateCameraUniforms() {
        const u = this._uniforms;
        u.u_ro.value.copy(this._camera.position);
        const m = this._camera.matrixWorld.elements;
        u.u_camMat.value.set(m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]);
        const fovRad = THREE.MathUtils.degToRad(this._camera.fov);
        u.u_fov.value = 1.0 / Math.tan(fovRad / 2.0);
    }

    _onResize = () => {
        const W = window.innerWidth,
            H = window.innerHeight;
        this._camera.aspect = W / H;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(W, H);
        this._uniforms.u_resolution.value.set(W, H);
    };
}
