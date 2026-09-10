// ── core.js ──────────────────────────────────────────────────────────────────
// main.js / dev 페이지(dev/translator, dev/analyzer)가 공유하는 순수 로직 모음.
// main.js에서 그대로 옮겨온 것 — 로직 변경 없음, export만 추가함.
// DOM을 직접 건드리는 코드(buildUI, buildInput, buildHistory, Init)는 여기 없음 —
// 그건 main.js처럼 각 페이지가 자기 레이아웃에 맞게 따로 짬.

import * as THREE from 'three';
import { loadJamo } from './jamo_loader.js';

export const JAMO = await loadJamo();

// prettier-ignore
export const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// prettier-ignore
export const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// prettier-ignore
export const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

export const MAX_SYL = 50;

// ── 음절 분해 ─────────────────────────────────────────────────────────────────
export function decomposeSyllables(text) {
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

// 음절 item({cho,jung,jong}) → 완성형 한글 1자 (없으면 '')
export function composeChar(syl) {
    const c = CHO.indexOf(syl.cho);
    const v = JUNG.indexOf(syl.jung);
    const t = syl.jong ? JONG.indexOf(syl.jong) : 0;
    if (c < 0 || v < 0) return '';
    return String.fromCharCode(0xac00 + (c * 21 + v) * 28 + t);
}

// 음절 item → analyzer(모니터 2 / TD)용 페이로드.
// receiver로 실제 들어가는 자모 좌표 수치(초성 xyz, 중성 F1/F2/F3, 종성 xyz)를 담는다.
// TD가 이 값으로 blob-tracking 스타일 오버레이(추적 박스 + 수치 라벨)를 그림.
export function syllableData(syl) {
    const choPos = JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.5];
    const jungE = JAMO[syl.jung] ?? {};
    const jungPos = jungE.pos ?? [500, 1000, 2000];
    const jongE = syl.jong ? JAMO[syl.jong + '_jong'] : null;
    const jongPos =
        jongE?.pos ?? (jongE?.cluster_front ? JAMO[jongE.cluster_front + '_jong']?.pos : null) ?? null;
    return {
        char: composeChar(syl),
        cho: { jamo: syl.cho, x: choPos[0], y: choPos[1], z: choPos[2] },
        jung: {
            jamo: syl.jung,
            f1: jungPos[0],
            f2: jungPos[1],
            f3: jungPos[2],
            yang: jungE.yang ?? 0,
            diph: jungE.diphthong ?? 0,
        },
        jong: syl.jong
            ? { jamo: syl.jong, x: jongPos?.[0] ?? null, y: jongPos?.[1] ?? null, z: jongPos?.[2] ?? null }
            : null,
    };
}

// ── 텍스트박스 레이아웃 엔진 ──────────────────────────────────────────────────
// offsetY: 이전 제출 줄 누적 높이(px) — 새 줄 시작 기준선
export function calcTextboxLayout(
    items,
    sylSize,
    W,
    H,
    lineHeightRatio = 1.3,
    offsetY = 0,
    wrapStep = sylSize * 2,
    wrapMargin = sylSize,
) {
    const PAD_X = sylSize * 0.5;
    const PAD_Y = 40;
    const lineH = sylSize * lineHeightRatio;

    let curX = PAD_X;
    let curY = PAD_Y + sylSize + offsetY;

    const positions = [];
    const sylItems = [];

    for (const item of items) {
        if (item.isSpace) {
            curX += wrapStep * 0.2; // #띄어쓰기 공백 길이
            if (curX > W - PAD_X) {
                curX = PAD_X;
                curY += lineH;
            }
            continue;
        }
        if (curX + wrapMargin > W - PAD_X) {
            curX = PAD_X;
            curY += lineH;
        }
        positions.push([curX / W, curY / H]);
        sylItems.push(item);
        curX += wrapStep;
    }

    const lastY = sylItems.length > 0 ? curY : PAD_Y + sylSize + offsetY;
    return { positions, sylItems, lastY };
}

// ── signal 전용 Shelf 레이아웃 ────────────────────────────────────────────────
// 기존 calcTextboxLayout(고정 sylSize, 균일 grid)은 그대로 두고, signal(🚦)에서만
// 쓰는 별도 레이아웃. 음절마다 포먼트(F1) + yang + 이중모음 여부로 lattice 크기를
// 다르게 계산하고(calcSignalLatticeSize), 왼쪽부터 순서대로 쌓는다(shelf packing).
// 줄 높이 = 그 줄에 들어간 음절 height 중 최댓값. 이미 배치된 음절은 재배치하지
// 않음(실시간 타이핑 대응 — MaxRects류 빈틈 최소화는 포기).

// w = 정규화된 F1 = (F1-250)/600 — main.js의 f1Norm 계산과 동일 기준을 재사용.
export function calcSignalLatticeSize(syl, sylSizeBase) {
    const jungEntry = JAMO[syl.jung];
    const F1 = jungEntry?.pos?.[0] ?? 500;
    const w = Math.max(0, Math.min(1, (F1 - 250) / 600));
    const yang = jungEntry?.yang ? 1 : -1;
    const diph = jungEntry?.diphthong ?? 0;
    const scaleX = 1 + yang * 0.5 * w; // # signal scale diversity
    // 비이중모음: 등방(가로=세로). 이중모음: 가로축에만 스케일, 세로는 baseline 유지.
    //   양성(scaleX>1) → 가로로 긴 lattice / 음성(scaleX<1) → 세로가 상대적으로 큰 lattice
    return {
        width: sylSizeBase * scaleX,
        height: diph ? sylSizeBase : sylSizeBase * scaleX,
    };
}

// 반환: { positions(uv 0~1), sylItems, widths[], heights[], lastY }
export function calcShelfLayout(items, sylSize, W, H, lineHeightRatio = 1.0, offsetY = 0, wrapStep = sylSize, wrapMargin = 0) {
    const PAD_X = sylSize * 0.5;
    const PAD_Y = 40;
    const LINE_GAP = sylSize * Math.max(0, lineHeightRatio - 1); // 줄 사이 추가 여백

    const positions = [];
    const sylItems = [];
    const widths = [];
    const heights = [];

    const rightLimit = W - PAD_X;
    let curX = PAD_X;
    let rowTop = PAD_Y + offsetY;
    let rowMaxH = 0;

    const newRow = () => {
        rowTop += rowMaxH + LINE_GAP;
        curX = PAD_X;
        rowMaxH = 0;
    };

    for (const item of items) {
        if (item.isSpace) {
            curX += wrapStep * 0.2; // #띄어쓰기 — calcTextboxLayout과 동일 비율
            if (curX > rightLimit) newRow();
            continue;
        }
        const { width, height } = calcSignalLatticeSize(item, sylSize);
        if (curX + width > rightLimit && curX > PAD_X) newRow();
        // positions.y는 signal._syncRows의 줄 그룹핑(0.05*H 임계)에만 쓰이므로,
        // 같은 줄 음절이 항상 정확히 같은 y가 되도록 height가 아니라 sylSize(상수) 기준.
        positions.push([curX / W, (rowTop + sylSize * 0.5) / H]);
        sylItems.push(item);
        widths.push(width);
        heights.push(height);
        curX += width;
        if (height > rowMaxH) rowMaxH = height;
    }

    const lastY = sylItems.length > 0 ? rowTop + rowMaxH : PAD_Y + offsetY;
    return { positions, sylItems, widths, heights, lastY };
}

// ── 자모 pos → 3D 좌표 ────────────────────────────────────────────────────────
export function jamoToVec3(key, type, scale, offset = new THREE.Vector3()) {
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

// ── 음절 → mycelium uniform 데이터 ─────────────────────────────────────────────
export function syllablesToUniforms(sylItems, positions, sylSize, layoutScale = { x: 1, y: 1 }) {
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

        const wx = (pos[0] - 0.5) * sceneW * layoutScale.x + startOffsetX;
        const wy = -(pos[1] - 0.5) * sceneH * layoutScale.y + 0.5;
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
export function dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights) {
    if (!sylItems.length) return;
    const layoutScale = rm.current?.layoutScale ?? { x: 1, y: 1 };
    if (rm.name === 'mycelium') {
        rm.update(syllablesToUniforms(sylItems, positions, sylSize, layoutScale), sylItems.length, sylItems);
    } else if (rm.name === 'sora') {
        rm.update(sylItems, positions, JAMO);
    } else if (rm.name === 'signal') {
        rm.update(sylItems, positions, JAMO, sylSize, widths, heights);
    } else if (rm.name === 'dandelion') {
        rm.update(sylItems, positions, JAMO);
    }
}
