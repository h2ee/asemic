import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { vertSrc, fragSrc } from './shader.js';
import { loadJamo, YANG, YANG_NEG, DIPHTHONG, TENSE, CLUSTER } from './jamo_loader.js';

// ── 자모 데이터 로드 ──────────────────────────────────────────────────────────
// 범위 변경 예시: loadJamo({ choRange: [-1, 1] })
const JAMO = await loadJamo();

console.log('ㅏ:', JAMO['ㅏ']);
console.log('ㄱ:', JAMO['ㄱ']);
console.log('ㄱ_jong:', JAMO['ㄱ_jong']);

const CHO = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
];
const JUNG = [
    'ㅏ',
    'ㅐ',
    'ㅑ',
    'ㅒ',
    'ㅓ',
    'ㅔ',
    'ㅕ',
    'ㅖ',
    'ㅗ',
    'ㅘ',
    'ㅙ',
    'ㅚ',
    'ㅛ',
    'ㅜ',
    'ㅝ',
    'ㅞ',
    'ㅟ',
    'ㅠ',
    'ㅡ',
    'ㅢ',
    'ㅣ',
];
const JONG = [
    '',
    'ㄱ',
    'ㄲ',
    'ㄳ',
    'ㄴ',
    'ㄵ',
    'ㄶ',
    'ㄷ',
    'ㄹ',
    'ㄺ',
    'ㄻ',
    'ㄼ',
    'ㄽ',
    'ㄾ',
    'ㄿ',
    'ㅀ',
    'ㅁ',
    'ㅂ',
    'ㅄ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
];

// ── 음절 분해 ────────────────────────────────────────────────────────────────
function decomposeSyllables(text) {
    const result = [];
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) {
            const offset = code - 0xac00;
            result.push({
                cho: CHO[Math.floor(offset / (21 * 28))],
                jung: JUNG[Math.floor((offset % (21 * 28)) / 28)],
                jong: JONG[offset % 28] || null,
            });
        }
    }
    return result;
}

// ── 자모 pos → 3D 좌표 ───────────────────────────────────────────────────────
// JAMO[key].pos [x,y,z] (이미 choRange 적용된 값)
function jamoToVec3(key, type, scale, offset = new THREE.Vector3()) {
    let rawPos;

    if (type === 'jong') {
        const entry = JAMO[key + '_jong'];
        rawPos = entry?.pos ??
            (entry?.cluster_front ? JAMO[entry.cluster_front + '_jong']?.pos : null) ?? [0.5, 0.5, 0.5];
    } else {
        // 초성: JAMO['ㄱ'].cho.pos
        rawPos = JAMO[key]?.cho?.pos ?? [0.5, 0.5, 0.5];
    }

    return new THREE.Vector3(
        (rawPos[0] - 0.5) * scale * 2,
        (rawPos[1] - 0.5) * scale * 2,
        (rawPos[2] - 0.5) * scale * 2,
    ).add(offset);
}

// ── 음절 → uniform 배열 ──────────────────────────────────────────────────────
function syllablesToUniforms(syllables) {
    const MAX = 8;
    const spacing = 0.4;
    const totalW = (syllables.length - 1) * spacing;

    const starts = [];
    const chos = [];
    const ends = [];
    const jungs = [];
    const amps = [];
    const yangseong = [];
    const diphthong = [];

    for (let i = 0; i < MAX; i++) {
        const syl = syllables[i];

        if (!syl) {
            starts.push(new THREE.Vector3());
            chos.push(new THREE.Vector3());
            ends.push(new THREE.Vector3());
            jungs.push(new THREE.Vector3());
            amps.push(0);
            yangseong.push(0);
            diphthong.push(0);
            continue;
        }

        const offsetX = -totalW / 2 + i * spacing;
        const offset = new THREE.Vector3(offsetX, 0, 0);
        const scale = 0.2;

        // 초성 pos
        const start = jamoToVec3(syl.cho, 'cho', scale, offset);

        // 종성 pos (겹받침 포함)
        let end = null;
        if (syl.jong) {
            end = jamoToVec3(syl.jong, 'jong', scale, offset);
        }

        // 중성 데이터
        const jungEntry = JAMO[syl.jung];
        const jungPos = jungEntry ? jungEntry.pos : [500, 1000, 2000];
        const yang = jungEntry ? jungEntry.yang : 0;
        const diph = jungEntry ? jungEntry.diphthong : 0;

        // amp: F1 기반
        const amp = jungPos[0] * 0.001 + 0.005;

        // 초성 원본 데이터 (phase 활용용)
        const choEntry = JAMO[syl.cho];
        const choPos = JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.5];

        starts.push(start);
        chos.push(new THREE.Vector3(choPos[0], choPos[1], choPos[2]));
        ends.push(end || start.clone());
        jungs.push(new THREE.Vector3(jungPos[0], jungPos[1], jungPos[2]));
        amps.push(amp);
        yangseong.push(yang);
        diphthong.push(diph);
    }

    return {
        starts,
        chos,
        ends,
        jungs,
        amps,
        yangseong,
        diphthong,
        count: Math.min(syllables.length, MAX),
    };
}

// ── Init ─────────────────────────────────────────────────────────────────────
function Init() {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0.5, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(W, H) },
        u_dpr: { value: Math.min(window.devicePixelRatio, 1) },
        u_ro: { value: new THREE.Vector3() },
        u_camMat: { value: new THREE.Matrix3() },
        u_fov: { value: 1.8 },
        u_sylCount: { value: 0 },
        u_growT: { value: 0.0 },
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
        uniforms,
        vertexShader: vertSrc,
        fragmentShader: fragSrc,
    });
    scene.add(new THREE.Mesh(geo, mat));

    // ── 텍스트 입력 ────────────────────────────────────────────────────────────
    const input = document.createElement('input');
    input.type = 'text';
    Object.assign(input.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        fontSize: '18px',
        padding: '8px 12px',
        background: '#111',
        color: '#fff',
        border: '1px solid #555',
        borderRadius: '4px',
        zIndex: '10',
    });
    document.body.appendChild(input);

    let growStart = -999;
    let baked = false;

    input.addEventListener('input', () => {
        baked = false;
        growStart = clock.getElapsedTime();

        const syllables = decomposeSyllables(input.value);
        if (!syllables.length) {
            uniforms.u_sylCount.value = 0;
            return;
        }

        const { starts, chos, ends, jungs, amps, yangseong, diphthong, count } = syllablesToUniforms(syllables);

        uniforms.u_sylCount.value = count;
        for (let i = 0; i < 8; i++) {
            uniforms.u_start.value[i].copy(starts[i]);
            uniforms.u_cho.value[i].copy(chos[i]);
            uniforms.u_end.value[i].copy(ends[i]);
            uniforms.u_jung.value[i].copy(jungs[i]);
        }
        uniforms.u_amp.value = new Float32Array(amps);
        uniforms.u_yangseong.value = new Float32Array(yangseong);
        uniforms.u_diphthong.value = new Float32Array(diphthong);

        growStart = clock.getElapsedTime();
    });

    // ── 리사이즈 ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });

    // ── 카메라 uniform 업데이트 ────────────────────────────────────────────────
    function updateCameraUniforms() {
        uniforms.u_ro.value.copy(camera.position);
        const m = camera.matrixWorld.elements;
        uniforms.u_camMat.value.set(m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]);
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        uniforms.u_fov.value = 1.0 / Math.tan(fovRad / 2.0);
    }

    // ── 애니메이션 루프 ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const TARGET_FPS = 24;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastTime = 0;

    function Animate(timestamp) {
        requestAnimationFrame(Animate);
        if (timestamp - lastTime < FRAME_INTERVAL) return;
        lastTime = timestamp;

        uniforms.u_time.value = clock.getElapsedTime();
        const elapsed = clock.getElapsedTime() - growStart;
        const rawT = Math.min(elapsed / 2.0, 1.0);
        uniforms.u_growT.value = rawT;

        if (baked) return;
        if (rawT >= 1.0) baked = true;

        updateCameraUniforms();
        renderer.render(scene, quadCamera);
    }

    Animate(0);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Init);
} else {
    Init();
}
