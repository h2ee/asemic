// ── core.js ──────────────────────────────────────────────────────────────────
// main.js / dev 페이지(dev/translator, dev/analyzer)가 공유하는 순수 로직 모음.
// main.js에서 그대로 옮겨온 것 — 로직 변경 없음, export만 추가함.
// DOM을 직접 건드리는 코드(buildUI, buildInput, buildHistory, Init)는 여기 없음 —
// 그건 main.js처럼 각 페이지가 자기 레이아웃에 맞게 따로 짬.

import * as THREE from 'three';
import { loadJamo } from './jamo_loader.js';

export const JAMO = await loadJamo();

// 컨트롤 패널 매핑 표 — 의존성 없는 별도 파일(가상 패널 페이지가 three/CSV 없이 쓰도록)
export * from './controls.js';

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
// project(u, v) → THREE.Vector3 — 주면 positions를 "음절 중심의 화면 uv"로 보고 receiver
// 카메라로 역투영한다(mycelium.screenToWorld). 안 주면 예전 근사식(sceneH·layoutScale·
// startOffsetX)을 쓴다.
export function syllablesToUniforms(sylItems, positions, sylSize, layoutScale = { x: 1, y: 1 }, project = null) {
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

        let offset;
        if (project) {
            // pos = 음절 중심의 화면 uv. receiver가 자기 카메라로 정확히 역투영한다
            offset = project(pos[0], pos[1]);
        } else {
            let startOffsetX = 1.0;
            if (sylSize3D > 3.5) startOffsetX = sylSize3D * 0.32;
            else if (sylSize3D < 3.0) startOffsetX = sylSize3D * 0.3;

            const wx = (pos[0] - 0.5) * sceneW * layoutScale.x + startOffsetX;
            const wy = -(pos[1] - 0.5) * sceneH * layoutScale.y + 0.5;
            offset = new THREE.Vector3(wx, wy, 0);
        }
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

// ── 음절의 한글 구조 배치 (6종) ───────────────────────────────────────────────
// 초성/중성/종성이 음절 네모 안에서 어떻게 나뉘는지의 6가지 꼴. signal이 셀 색을
// 칠할 영역을 나눌 때 쓰고(patternState), 채팅창이 음절마다 같은 이름의 SVG
// (public/imgs/<type>.svg)를 얹을 때도 쓴다 — **6종 이름 = SVG 파일명**이라
// 매핑 테이블이 없다. 새 이름을 추가하면 SVG도 같이 만들어야 한다.
//
//   vertical     종성✗ · F2 높음(ㅏㅓㅣ)   초성 좌 + 중성 우(세로 모음)
//   horizontal   종성✗ · F2 낮음(ㅗㅜㅡ)   초성 위 + 중성 아래(가로 모음)
//   per75        종성✗ · 이중모음(ㅘㅝ)    초성 좌상 + 중성이 나머지를 감쌈
//   right_click  종성○ · F2 높음(간)       초성/중성 상단 2칸 + 종성 하단
//   hamburger    종성○ · F2 낮음(곤)       초성/중성/종성 3단
//   bed          종성○ · 이중모음(관)      초성 좌상 + 중성 우상·중단 + 종성 하단
//
// 2026-09-26: signal.js 안에 private이던 것을 여기로 옮김(채팅창이 같이 쓴다).
export const PATTERN_TYPES = ['vertical', 'horizontal', 'per75', 'right_click', 'hamburger', 'bed'];

// 세로 모음/가로 모음을 가르는 F2(Hz). 실측 F2 범위 580~2600의 가운데쯤.
export const F2_BOUNDARY = 1100;

export function getPatternType(jung, jong, jamo = JAMO) {
    if (!jung) return 'vertical';
    const entry = jamo[jung];
    const diph = entry?.diphthong ?? 0;
    const f2 = entry?.pos?.[1] ?? 1000;

    if (!jong) {
        if (diph) return 'per75';
        return f2 >= F2_BOUNDARY ? 'vertical' : 'horizontal';
    }
    if (diph) return 'bed';
    return f2 >= F2_BOUNDARY ? 'right_click' : 'hamburger';
}

// ── 레이아웃 분기 ─────────────────────────────────────────────────────────────
// signal만 Shelf, 나머지는 Textbox. 수신자가 들고 있는 크기 값(sylSize 등)의
// fallback도 여기서 한 번에 정한다.
//
// main.js / output-main.js 의 reLayout 과 handleSubmit 이 **넷 다** 이걸 부른다.
// 예전에는 네 곳이 각자 분기를 들고 있었고, handleSubmit 두 곳만 분기를 빠뜨려
// 늘 calcTextboxLayout을 썼다 — signal에서 제출하면 lastY(=다음 줄 기준선,
// 캡처 높이)가 Shelf 실제 배치와 어긋나는 원인이었다.
// rect = {x, y, w, h} (뷰포트 px). 주면 글자를 그 사각형 안에만 배치한다 —
// 줄바꿈을 rect.w 기준으로 하고, 나온 uv를 다시 "뷰포트 기준 uv"로 되돌린다.
// **캔버스는 뷰포트 전체를 유지**하므로 receiver 내부(전부 window.innerWidth 기준으로
// 픽셀을 계산한다)를 하나도 안 건드리고 영역을 좁힐 수 있다.
//
// ⚠️ positions를 실제 배치에 쓰는 receiver에만 먹는다 — mycelium / dandelion / trail.
//    sora는 positions를 무시하고 내부 랜덤 위치를 쓰고, signal은 _draw()가 자기
//    PAD_X/PAD_Y로 뷰포트에 직접 shelf를 깐다. 그 둘은 별도 작업(PRD 3-A).
//
// refHeight — receiver가 들고 있으면 px 값(sylSize/wrapStep/wrapMargin)을 "뷰포트 높이가
//    refHeight일 때의 값"으로 보고 H/refHeight 배로 스케일한다. mycelium처럼 월드 상수
//    (캡슐 반경·혹·노이즈)가 셰이더에 박혀 있는 receiver는 sylSize/H 비율이 같아야
//    글자 모양이 같다 — 안 그러면 큰 화면(TD 1440)에서 글자가 작고 뭉툭해진다.
//    없으면 예전처럼 고정 px.
//
// glyphExtent — 음절 중심에서 글자 끝까지의 거리(sylSize 배수). receiver가 들고 있으면
//    ① positions를 "슬롯 왼쪽"이 아니라 "음절 중심"으로 돌려준다(글자가 박스 가장자리에서
//       ext만큼 안쪽에 오도록 밀어 넣음 — 가로 줄바꿈도 그 폭 기준).
//    ② rect가 있으면 줄 수 단계(FIT_LINES)로 맞춘다(번역기 입력창처럼). 단계 N의 크기 =
//       "rect.h에 딱 N줄이 들어가는 크기"(단 기본 크기보다 커지진 않음). 1줄 크기에 안 들어가면
//       2줄 크기로, 그래도 넘치면 3줄 크기로. 연속값이 아니라 단계인 건, 크기가 바뀔 때마다
//       receiver가 문장 전체를 다시 구워야 해서다.
//       3줄로도 넘치면 안전망으로 4줄, 5줄… 크기까지 내려간다(잘리지 않게). LLM 문장 길이를
//       제한해 두면 실제로는 3단계 안에서 끝난다.
//    lastY는 rect 로컬 px 그대로 — 호출부가 다음 줄 기준선으로만 쓴다.
const FIT_LINES = 3;
const FIT_LINES_SAFETY = 12;

export function layoutFor(rm, items, W, H, offsetY, rect = null) {
    const r = rm.current;
    const refH = r?.refHeight;
    const k = refH ? H / refH : 1;
    const ext = r?.glyphExtent;
    const layoutFn = rm.name === 'signal' ? calcShelfLayout : calcTextboxLayout;
    const boxW = rect ? rect.w : W;
    const boxH = rect ? rect.h : H;

    const layoutAt = scale => {
        const sylSize = (r?.sylSize ?? 55) * scale;
        const lineHeightRatio = r?.lineHeightRatio ?? 1.3;
        const wrapStep = (r?.wrapStep ?? (sylSize / scale) * 2) * scale;
        const wrapMargin = (r?.wrapMargin ?? sylSize / scale) * scale;
        const meta = { sylSize, lineHeightRatio, wrapStep, wrapMargin };

        if (!ext) {
            const out = layoutFn(items, sylSize, boxW, boxH, lineHeightRatio, offsetY, wrapStep, wrapMargin);
            if (rect) {
                out.positions = out.positions.map(([u, v]) => [
                    (rect.x + u * rect.w) / W,
                    (rect.y + v * rect.h) / H,
                ]);
            }
            return { ...out, ...meta, bottom: 0 };
        }

        // calcTextboxLayout의 첫 슬롯(PAD_X, PAD_Y+sylSize)을 (e, e)로 옮기는 이동량.
        // 폭을 boxW-2dx로 줘야 오른쪽 끝 음절도 boxW-e 안에 들어온다.
        const e = ext * sylSize;
        const dx = e - sylSize * 0.5;
        const dy = e - (40 + sylSize);
        const innerW = boxW - 2 * dx;
        const out = layoutFn(items, sylSize, innerW, boxH, lineHeightRatio, offsetY, wrapStep, wrapMargin);
        const ox = rect ? rect.x : 0;
        const oy = rect ? rect.y : 0;
        out.positions = out.positions.map(([u, v]) => [(ox + u * innerW + dx) / W, (oy + v * boxH + dy) / H]);
        out.lastY += dy;
        const bottom = out.sylItems.length ? out.lastY + e - offsetY : 0;
        return { ...out, ...meta, bottom };
    };

    if (!(rect && ext)) {
        const res = layoutAt(k);
        delete res.bottom;
        return { ...res, fitLines: 0 };
    }
    // N줄 높이 = 2e + (N-1)·lineH = sylSize·(2·ext + (N-1)·lineHeightRatio)
    const lhr = r?.lineHeightRatio ?? 1.3;
    const baseSyl = (r?.sylSize ?? 55) * k;
    let res;
    for (let n = 1; n <= FIT_LINES_SAFETY; n++) {
        const s = Math.min(1, boxH / (baseSyl * (2 * ext + (n - 1) * lhr)));
        res = layoutAt(k * s);
        res.fitLines = n;
        if (res.bottom <= boxH + 0.5) break;
    }
    delete res.bottom;
    return res;
}

// 제출(submit) 3단 계약(flushQueue/captureFrame/clearAccum)을 구현한 수신자인가.
// 이름 목록 대신 계약으로 판단한다 — 수신자를 추가/교체할 때 이 분기를 같이
// 고쳐야 하는 걸 잊어서 제출이 조용히 안 되는 사고가 반복됐다.
// (2026-09-26 현재: 4종 전부 ○)
export function canSubmit(receiver) {
    return !!(receiver?.flushQueue && receiver?.captureFrame && receiver?.clearAccum);
}

// ── 수신자별 update 분기 ──────────────────────────────────────────────────────
export function dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights) {
    if (!sylItems.length) return;
    const layoutScale = rm.current?.layoutScale ?? { x: 1, y: 1 };
    if (rm.name === 'mycelium') {
        const project = rm.current?.screenToWorld ? (u, v) => rm.current.screenToWorld(u, v) : null;
        rm.update(syllablesToUniforms(sylItems, positions, sylSize, layoutScale, project), sylItems.length, sylItems);
    } else if (rm.name === 'sora') {
        rm.update(sylItems, positions, JAMO);
    } else if (rm.name === 'signal') {
        rm.update(sylItems, positions, JAMO, sylSize, widths, heights);
    } else if (rm.name === 'dandelion') {
        rm.update(sylItems, positions, JAMO);
    }
}
