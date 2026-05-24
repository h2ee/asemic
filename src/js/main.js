// ── main.js ───────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadJamo } from './jamo_loader.js';
import { ReceiverManager } from './receivers/ReceiverManager.js';

const JAMO = await loadJamo();

// prettier-ignore
const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// prettier-ignore
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// prettier-ignore
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const MAX_SYL = 20;

// ── 음절 분해 ─────────────────────────────────────────────────────────────────
function decomposeSyllables(text) {
    const result = [];
    let wordId = 0;
    for (const ch of text) {
        if (ch === ' ') {
            result.push({ isSpace: true, wordId });
            wordId++;
            continue;
        }
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) {
            const offset = code - 0xac00;
            result.push({
                cho: CHO[Math.floor(offset / (21 * 28))],
                jung: JUNG[Math.floor((offset % (21 * 28)) / 28)],
                jong: JONG[offset % 28] || null,
                wordId,
                isSpace: false,
            });
        }
    }
    return result;
}

// ── 텍스트박스 레이아웃 엔진 ──────────────────────────────────────────────────
// offsetY: 이전 제출 줄 누적 높이(px) — 새 줄 시작 기준선
function calcTextboxLayout(items, sylSize, W, H, lineHeightRatio = 1.3, offsetY = 0) {
    const PAD_X = sylSize * 0.5;
    const PAD_Y = 40;
    const lineH = sylSize * lineHeightRatio;

    let curX = PAD_X;
    let curY = PAD_Y + sylSize + offsetY;

    const positions = [];
    const sylItems = [];

    for (const item of items) {
        if (item.isSpace) {
            curX += sylSize * 1.8;
            if (curX > W - PAD_X) {
                curX = PAD_X;
                curY += lineH;
            }
            continue;
        }
        if (curX + sylSize > W - PAD_X) {
            curX = PAD_X;
            curY += lineH;
        }
        positions.push([curX / W, curY / H]);
        sylItems.push(item);
        curX += sylSize * 2;
    }

    const lastY = sylItems.length > 0 ? curY : PAD_Y + sylSize + offsetY;
    return { positions, sylItems, lastY };
}

// ── 자모 pos → 3D 좌표 ────────────────────────────────────────────────────────
function jamoToVec3(key, type, scale, offset = new THREE.Vector3()) {
    let rawPos;
    if (type === 'jong') {
        const entry = JAMO[key + '_jong'];
        rawPos = entry?.pos ??
            (entry?.cluster_front ? JAMO[entry.cluster_front + '_jong']?.pos : null) ?? [0.5, 0.5, 0.5];
    } else {
        rawPos = JAMO[key]?.cho?.pos ?? [0.5, 0.5, 0.5];
    }
    return new THREE.Vector3(
        (rawPos[0] - 0.5) * scale * 2,
        (rawPos[1] - 0.5) * scale * 2,
        (rawPos[2] - 0.5) * scale * 2,
    ).add(offset);
}

// ── 음절 → alien uniform 데이터 ───────────────────────────────────────────────
function syllablesToUniforms(sylItems, positions, sylSize) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const sceneH = 2.07 * 2;
    const sceneW = sceneH * (W / H);
    const sylSize3D = (sylSize / H) * sceneH * 6.0;
    const AMP_RATIO = 0.35;

    // i < length-1 이면 종성 확정 (뒤에 다음 음절이 있으므로)
    const confirmed = sylItems.map((_, i) => i < sylItems.length - 1);

    const starts = [],
        centers = [],
        chos = [],
        ends = [],
        jungs = [];
    const amps = [],
        yangseong = [],
        diphthong = [];

    for (let i = 0; i < MAX_SYL; i++) {
        const syl = sylItems[i];
        const pos = positions[i];

        if (!syl || !pos) {
            starts.push(new THREE.Vector3());
            centers.push(new THREE.Vector3());
            chos.push(new THREE.Vector3());
            ends.push(new THREE.Vector3());
            jungs.push(new THREE.Vector3());
            amps.push(0);
            yangseong.push(0);
            diphthong.push(0);
            continue;
        }

        let startOffsetX = 1.0;
        if (sylSize3D > 3.5) startOffsetX = sylSize3D * 0.32;
        else if (sylSize3D < 3.0) startOffsetX = sylSize3D * 0.3;

        const wx = (pos[0] - 0.5) * sceneW + startOffsetX;
        const wy = -(pos[1] - 0.5) * sceneH + 0.5;
        const offset = new THREE.Vector3(wx, wy, 0);
        const scale = sylSize3D * 0.5;

        const cellCenter = offset.clone();
        const start = jamoToVec3(syl.cho, 'cho', scale, offset);
        const jungEntry = JAMO[syl.jung];
        const jungPos = jungEntry?.pos ?? [500, 1000, 2000];

        const f1Normpos = (jungPos[0] - 250) / (900 - 250);
        const f2Normpos = (jungPos[1] - 580) / (2600 - 580);
        const f3Normpos = (jungPos[2] - 2080) / (3200 - 2080);
        const end = syl.jong
            ? jamoToVec3(syl.jong, 'jong', scale * 0.5, new THREE.Vector3())
            : new THREE.Vector3(f1Normpos - 0.5, f2Normpos - 0.5, f3Normpos - 0.5).multiplyScalar(scale * 0.5);

        const yang = jungEntry?.yang ?? 0;
        const diph = jungEntry?.diphthong ?? 0;
        const choPos = JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.5];
        const f1Norm = (jungPos[0] - 250) / 600;
        const f1Boost = 0.55 + f1Norm * 0.4;

        starts.push(start);
        centers.push(cellCenter);
        chos.push(new THREE.Vector3(choPos[0], choPos[1], choPos[2]));
        ends.push(end);
        jungs.push(new THREE.Vector3(jungPos[0], jungPos[1], jungPos[2]));
        amps.push(sylSize3D * AMP_RATIO * f1Boost);
        yangseong.push(yang);
        diphthong.push(diph);
    }
    return {
        starts,
        centers,
        chos,
        ends,
        jungs,
        amps,
        yangseong,
        diphthong,
        confirmed,
        count: Math.min(sylItems.length, MAX_SYL),
    };
}

// ── 수신자별 update 분기 ──────────────────────────────────────────────────────
function dispatchToReceiver(rm, sylItems, positions, sylSize) {
    if (!sylItems.length) return;
    if (rm.name === 'alien') {
        rm.update(syllablesToUniforms(sylItems, positions, sylSize), sylItems.length);
    } else if (rm.name === 'sora') {
        rm.update(sylItems, positions, JAMO);
    } else if (rm.name === 'signal') {
        rm.update(sylItems, positions, JAMO, sylSize);
    } else if (rm.name === 'dandelion') {
        rm.update(sylItems, positions, JAMO);
    }
}

// ── 제출된 줄 히스토리 (캡처 이미지 누적) ────────────────────────────────────
function buildHistory() {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        pointerEvents: 'none',
        zIndex: '5',
        display: 'flex',
        flexDirection: 'column',
    });
    document.body.appendChild(wrap);

    let totalH = 0;
    return {
        addCapture(dataUrl, heightPx) {
            const img = document.createElement('img');
            img.src = dataUrl;
            Object.assign(img.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                display: 'block',
                pointerEvents: 'none',
                zIndex: String(6 + totalH),
            });
            wrap.appendChild(img);
            totalH += heightPx;
            return totalH;
        },
        get totalHeight() {
            return totalH;
        },
    };
}

// ── UI (수신자 선택) ──────────────────────────────────────────────────────────
function buildUI(rm, getState) {
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: '20',
        background: 'rgba(0,0,0,0.55)',
        padding: '8px 14px',
        borderRadius: '10px',
        backdropFilter: 'blur(6px)',
    });

    for (const { id, label } of [
        { id: 'alien', label: '👾' },
        { id: 'sora', label: '🐚' },
        { id: 'signal', label: '🚦' },
        { id: 'dandelion', label: '🌼' },
    ]) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.dataset.id = id;
        Object.assign(btn.style, {
            padding: '4px 10px',
            fontSize: '16px',
            background: id === rm.name ? '#6c63ff' : 'transparent',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.2s',
        });
        btn.addEventListener('click', async () => {
            const { sylItems, positions, sylSize } = getState();
            await rm.setReceiver(id);
            dispatchToReceiver(rm, sylItems, positions, sylSize);
            container.querySelectorAll('button[data-id]').forEach(b => {
                b.style.background = b.dataset.id === rm.name ? '#6c63ff' : 'transparent';
            });
        });
        container.appendChild(btn);
    }
    document.body.appendChild(container);
}

// ── 입력창 + 제출 버튼 ────────────────────────────────────────────────────────
function buildInput(onInput, onSubmit) {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: '20',
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '한글을 입력하세요';
    Object.assign(input.style, {
        width: 'min(420px, 70vw)',
        fontSize: '17px',
        padding: '10px 14px',
        background: 'rgba(10,10,10,0.75)',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '8px',
        backdropFilter: 'blur(6px)',
        outline: 'none',
    });

    const btn = document.createElement('button');
    btn.textContent = '전송';
    Object.assign(btn.style, {
        padding: '10px 18px',
        fontSize: '15px',
        background: '#6c63ff',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    });

    const doSubmit = () => {
        if (!input.value.trim()) return;
        onSubmit(input.value.trim());
        input.value = '';
        onInput('');
    };

    input.addEventListener('input', () => {
        let sylCount = 0,
            cutIdx = input.value.length;
        for (let i = 0; i < input.value.length; i++) {
            const ch = input.value[i];
            if (ch === ' ') continue;
            const code = ch.charCodeAt(0);
            if (code >= 0xac00 && code <= 0xd7a3) sylCount++;
            if (sylCount > MAX_SYL) {
                cutIdx = i;
                break;
            }
        }
        if (sylCount > MAX_SYL) input.value = input.value.slice(0, cutIdx);
        onInput(input.value);
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSubmit();
    });
    btn.addEventListener('click', doSubmit);

    wrap.appendChild(input);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    return input;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function Init() {
    const params = new URLSearchParams(location.search);
    const initReceiver = params.get('receiver') ?? 'alien';

    const rm = new ReceiverManager();
    await rm.setReceiver(initReceiver);

    const history = buildHistory();

    const sylSize = 40;
    let _sylItems = [];
    let _positions = [];
    let _allItems = [];
    let _submitOffsetY = 0; // 제출된 줄 누적 높이(px) — 새 줄 기준선

    function reLayout(items) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const lineHeightRatio = rm.current?.lineHeightRatio ?? 1.3;
        const { positions, sylItems } = calcTextboxLayout(items, sylSize, W, H, lineHeightRatio, _submitOffsetY);
        _sylItems = sylItems;
        _positions = positions;
        if (sylItems.length > 0) {
            dispatchToReceiver(rm, sylItems, positions, sylSize);
        }
    }

    async function handleSubmit() {
        if (!_sylItems.length || rm.name !== 'alien') return;
        const alien = rm.current;

        await alien.flushQueue();

        const W = window.innerWidth;
        const H = window.innerHeight;
        const lineHeightRatio = rm.current?.lineHeightRatio ?? 1.3;
        const { lastY } = calcTextboxLayout(_allItems, sylSize, W, H, lineHeightRatio, _submitOffsetY);
        const capHeight = Math.round(lastY + sylSize * lineHeightRatio * 1.5);

        const dataUrl = alien.captureFrame();
        history.addCapture(dataUrl, capHeight);
        _submitOffsetY = lastY + sylSize * lineHeightRatio * 0.5;

        alien.clearAccum();

        _allItems = [];
        _sylItems = [];
        _positions = [];
    }

    buildInput(
        text => {
            _allItems = decomposeSyllables(text);
            reLayout(_allItems);
        },
        async () => {
            await handleSubmit();
        },
    );

    buildUI(rm, () => ({ sylItems: _sylItems, positions: _positions, sylSize }));

    window.addEventListener('resize', () => reLayout(_allItems));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Init);
} else {
    Init();
}
