// ── signal.js ─────────────────────────────────────────────────────────────────
// 신호등 수신자 — 지터드 그리드(jittered grid) 샘플링 + Delaunay adjacency +
// GLSL 프래그먼트 셰이더 기반 가중 Voronoi(power diagram) 렌더링
//
// ⚠️ 이 파일은 원래 셀룰러 오토마타 + Canvas 2D로 그리던 구버전 signal.js를
// 완전히 대체한 재구성판(원래는 signal_voronoi.js라는 별도 실험 파일이었다가
// 검증 후 승격됨)이다. 구버전과의 핵심 차이:
//   - 정수 인덱스 격자(GRID×GRID, state 배열 자체가 격자) 대신, 음절 영역에
//     "규칙적인 격자 + 셀마다 무작위 흔들림(jitter)"으로 연속 좌표의 점을 뿌리고
//     그 점들을 Delaunay triangulation으로 연결한다. jitter를 낮추면 사각 격자에
//     가까운 Voronoi가, 높이면 유기적인 배치가 나옴(jitteredGridSample() 참고 —
//     Bridson's Poisson-disk와 달리 grid-aligned 배치를 낼 수 있어서 이걸로 바꿈).
//   - CA(cellular automata)의 "이웃"이 grid index가 아니라 Delaunay adjacency다.
//   - 포인트는 음절이 입력되는 즉시 해당 단어(wordId)의 point set에 append되고,
//     그 단어 전체 point set으로 Delaunay가 다시 계산된다.
//     (구버전처럼 매 키 입력마다 전부 다시 만드는 게 아니라 점진적으로 누적)
//   - 셀 크기(weight)가 커지면 이웃의 면적을 실제로 잠식하며 넓어짐 — 이걸
//     CPU에서 폴리곤으로 계산하는 대신(중간 버전) GPU 프래그먼트 셰이더에서
//     "이 픽셀에서 power distance(dist² - weight)가 가장 작은 점이 누구인가"를
//     픽셀마다 직접 계산해서 칠한다. 폴리곤 클리핑이 필요 없어서 오히려 더
//     단순하고, 셀 경계의 부드러운 gap도 per-pixel로 자연스럽게 만들어짐.
//
// 렌더링 파이프라인 (WebGL2, 단어 하나 = draw call 하나):
//   1. CPU: 그 단어의 point들(x, y, weight, color)을 RGBA32F 텍스처에 패킹
//      (row0 = x,y,weight / row1 = r,g,b) — state/brightness/scale이 실제로
//      바뀐 프레임에만 다시 올림(성능 최적화, 아래 _needsUpload 참고).
//   2. GPU: 단어 영역 크기의 quad 하나를 그리고, 프래그먼트 셰이더가 그
//      텍스처를 순회하며 각 픽셀의 최근접 가중 site를 찾아 그 색으로 칠함.
//
// CA 시뮬레이션(포인트 생성/상태 전이 규칙)은 그대로 CPU/JS에 남아있음 —
// GPU로 옮긴 건 "다이어그램을 그리는 방식"뿐, Math.random() 기반 상태 전이
// 자체를 셰이더로 옮기는 건 아님.
//
// 구버전 signal.js에서 그대로 이식한 것 — 패턴 타입 결정(getPatternType),
// 색상 계산(cellColor/hsvToRgb/getColor), CA 6가지 규칙, 신호등 랜덤 셀 로직.
// ─────────────────────────────────────────────────────────────────────────────

import { Delaunay } from 'd3-delaunay';

const BLANK = 0,
    CHO = 1,
    JUNG = 2,
    JONG = 3;

// ── 조절 가능한 상수 ──────────────────────────────────────────────────────────
// 음절 하나의 화면 크기(px) — "글자 크기" 조절은 이 상수 하나로. main.js
// 레이아웃 엔진이 참조하는 this.sylSize/this.wrapStep, 그리고 update() 호출 전
// 초기값들이 전부 이 값을 씀(아래 SignalReceiver 생성자, _estimateSylSize).
const DEFAULT_SYL_SIZE = 180;

// 지터드 그리드의 셀 크기(px). sylSize=130 기준으로 signal.js의 GRID*GRID=100개와
// 비슷한 밀도(대략 80~100점/음절)가 나오도록 잡음. 값을 낮추면 점이 촘촘해짐.
// (신규 음절의 점이 기존 점과 너무 가까울 때 걸러내는 dedup 임계값으로도 같이 쓰임 —
// appendSyllable() 참고.)
const MIN_DIST = 12;

// 포인트 위치 자체의 불규칙성(=Voronoi 사이트 배치의 "jitter"). jitteredGridSample()이
// 각 격자 셀 중심에서 점을 얼마나 무작위로 흔드는지를 0~1로 조절함.
// 1이면 셀 폭 전체 범위에서 자유롭게(경계까지) 흔들려서 grid 느낌이 거의 사라지고,
// 0에 가까울수록 사각 격자 그대로(첫 참고 이미지 느낌)에 가까워짐.
const JITTER = 0.02;

// 패턴 비율 — signal.js의 HIGH/LOW/OFFSET(GRID=10 기준 6/4/2)을 0~1 비율로 이식.
const HIGH_R = 0.6;
const LOW_R = 0.4;
const OFFSET_R = 0.2;

// F2 경계: vertical / horizontal 구분 (signal.js와 동일)
const F2_BOUNDARY = 1100;

// state별 목표 셀 크기 (brightness와 독립적인 값 — 자유롭게 실험 가능)
const CHO_SCALE = 1.4;
const JUNG_SCALE = 0.6;
const JONG_SCALE = 1.0;
const SIGNAL_SCALE = 0.8; // 신호등 랜덤 셀
const BLANK_SCALE = 0.9;
const STATE_SCALE = { [CHO]: CHO_SCALE, [JUNG]: JUNG_SCALE, [JONG]: JONG_SCALE, [BLANK]: BLANK_SCALE };

const SCALE_EASE = 0.08; // currentScale → targetScale 보간 계수 (매 프레임)

// 셰이더에 넘기는 weight = currentScale * WEIGHT_SCALE (power distance: dist² - weight
// 이므로 weight는 거리²와 같은 단위). 포인트 간 평균 간격(MIN_DIST)의 제곱 정도가
// "이웃 경계를 눈에 띄게 밀어낼 만한" 기준값 — 키우면 큰 셀이 이웃을 더 세게
// 잠식하고, 줄이면 균일한 Voronoi에 가까워짐.
const WEIGHT_SCALE = MIN_DIST * MIN_DIST;

const GAP_PX = 0.5; // 셀 경계 gap 두께(로컬 px 단위) — LED 픽셀처럼 셀 사이 틈을 냄

// 셀 모서리(3개 이상 셀이 만나는 지점) 라운딩. smooth-min(smin)으로 여러 변까지의
// 거리를 뭉쳐서 둥글리는데, smin을 후보 여러 개에 걸쳐 순차적으로 접으면(생플) 후보
// 수만큼 계속 아래로 처짐(N개를 접으면 대략 k*ln(N)만큼 실제보다 작아짐 — 값이
// 비슷한 이웃이 많을수록 심해짐). 그래서 두 가지로 그 처짐을 억제함:
//  1) EDGE_CUTOFF — 진짜 기하학적으로 가까운 site(대략 인접 격자 8칸)만 후보로 넣고
//     멀리 있는 site는 애초에 smin 대상에서 뺌(그래야 후보 수 N이 작게 유지됨).
//  2) CORNER_ROUND(k)를 작게 유지 — k*ln(N)의 k 자체를 줄여서 N이 좀 있어도 처짐이
//     GAP_PX 대비 작게 남도록.
const CORNER_ROUND = 2.2; // 라운딩 반경(로컬 px) — 0이면 각진 그대로
const EDGE_CUTOFF = MIN_DIST * 2.2; // 이 거리보다 먼 site는 모서리 계산에서 제외
const MAX_PTS = 2048; // 셰이더 루프 정적 상한 (한 단어에 실릴 수 있는 최대 포인트 수)

// "구체(globe)" 왜곡 — 음절 하나하나가 원형 실루엣으로 잘려서, 단어 전체가 음절
// 개수만큼 이어붙은 작은 구체들의 사슬(레퍼런스 이미지)처럼 보이게 함.
//
// ⚠️ 시행착오: weight(power-diagram의 크기 파라미터)에 위치 기반 감쇠를 곱하는
// 식으로 처음 시도했는데 안 먹힘 — power-diagram의 셀 경계는 "이웃끼리의 상대적
// weight 차이"로만 정해지는데, 옆 셀들이 다같이 비슷하게 낮은 weight를 받으면
// 경계 위치 자체가 거의 안 움직임(CHO/JUNG/JONG처럼 뚜렷한 차이에는 반응하지만
// 완만한 필드에는 반응 안 함). 최종적으로는 원형 경계를 edgeDist의 smin 체인에
// 직접 접어 넣는 방식(아래 main()의 u_globeRadius 사용 부분)으로 정착 — 전환
// 폭은 항상 u_gapPx로 고정한 채 "문턱값"만 원 경계 쪽으로 밀어내서, 셀이 흐려지는
// 게 아니라 진짜로 작아지거나 사라지게 만듦. 이 상수는 그 원의 반지름만 정함.
const GLOBE_RADIUS_RATIO = 0.55; // 음절 박스(sylSize) 대비 구체 반경 비율. 대각선 절반
// (≈0.707×sylSize)보다 작아야 네 모서리가 확실히 원 밖으로 잘림.

// 0 = 원형 클리핑(크리스프, 위 GLOBE_RADIUS_RATIO 방식), 2 = 스퀘어클(squircle,
// 아래 SQUIRCLE_* 설명 참고) — 두 스타일만 유지. 기본은 2.
const GLOBE_STYLE = 2;

// halftone 그라데이션(GLOBE_STYLE=0 전용) — 셀의 site가 원 중심에서 멀수록
// 문턱값을 밀어올려서(전환 "폭"이 아니라 "시작점"만 이동) 그려지는 크기를
// 줄임 — 크리스프함을 유지하면서 중심→가장자리 dot 크기 그라데이션을 만듦.
const HALO_EXTRA = 4; // #TEMP 튜닝 중 — 셀의 최대 edgeDist(~MIN_DIST/2)보다 훨씬 작아야 함

// ── GLOBE_STYLE=2 (squircle, p5.js 레퍼런스 포팅) ─────────────────────────────
// 사용자가 p5.js로 직접 튜닝해서 검증해 준 두 가지 기법을 포팅:
//  1. 위치: 격자를 [-1,1]×[-1,1]로 보고, 반경(r_g=|cx,cy|) 기준으로 방사형
//     압축(radialWarp() 참고) — 중심은 거의 그대로, 바깥쪽은 반경이 상수로
//     수렴해서 실루엣이 원이 됨.
//  2. 크기: gain() 셰이핑 함수로 x/y 각각 독립적으로 셀의 너비/높이를 줄임
//     (아래 셰이더의 Cx, Cy) — |x_g|>T1인 site는 너비만, |y_g|>T1인 site는
//     높이만, 둘 다면 상하좌우 다 줄어듦(원래 요청한 "가로/세로 독립 압축"이
//     이번엔 진짜로 구현됨 — Voronoi 셀에 site 중심의 축소된 바운딩박스를
//     추가로 겹쳐 씌우는 방식이라 셀 모양 자체가 아니라 "그 자리에 그릴 수
//     있는 최대 폭/높이"를 제한하는 것 — main()의 boxClipX/Y 참고).
const RADIAL_MAX_R = 1.25; // 이 반경 이상이면 exponent가 최소값에 도달(완전 압축)
const RADIAL_EXP_NEAR = 0.99; // r=0에서의 exponent(1에 가까울수록 원래 위치 그대로)
const RADIAL_EXP_FAR = 0.01; // r=RADIAL_MAX_R에서의 exponent(0에 가까울수록 반경이 상수로 수렴)
const RADIAL_SCALE_OUT = 1.05; // 압축 후 전체적으로 살짝 키우는 배율(p5 레퍼런스 값 그대로)

const SQUIRCLE_T1 = 0.16; // p5 레퍼런스의 T1 — 이 값 넘는 |x_g| 또는 |y_g|부터 gain() 축소 시작
const SQUIRCLE_GAIN_K = 3.0; // gain() 커브의 가파름 — 클수록 threshold 근처에서 급격히 줄어듦

// ⚠️ 1축(x 또는 y)씩 따로 "중심 쪽으로 확 당기기"를 두 번 시도했다가 둘 다 실제로
// 렌더링이 깨지는 걸 확인했음(화면이 줄무늬처럼 갈라짐 — site 순서가 뒤집히거나
// 압축된 무리가 원래 안쪽 site들과 겹쳐버림). 사용자가 p5.js로 직접 검증해 준
// 방식으로 교체 — 핵심 차이는 "1축 독립 압축"이 아니라 **반경(r_g) 기준 방사형
// warp**라는 점: 같은 반경(r_g)에 있는 site들은 항상 같은 배율로 스케일되기
// 때문에(각도는 안 건드림), 반경 방향 매핑 factor(r)=pow(r,exp(r))*scaleOut가
// r에 대해 단조증가이기만 하면 site들끼리 절대 교차/겹침이 안 생김 — 중심
// 근처(r≈0)는 exponent가 1에 가까워 거의 원래 위치 그대로, 바깥쪽(r≥RADIAL_MAX_R)은
// exponent가 0에 가까워져서 반경이 거의 상수(RADIAL_SCALE_OUT)로 수렴 —
// 그 결과 격자 가장자리의 site들이 전부 비슷한 반경으로 몰리면서 실루엣이
// 뚜렷한 원이 된다.
function radialWarp(cx, cy) {
    const rg = Math.sqrt(cx * cx + cy * cy);
    if (rg < 1e-6) return [0, 0];
    const t = Math.min(1, rg / RADIAL_MAX_R); // 0..1, clamp
    const dynamicExp = RADIAL_EXP_NEAR + (RADIAL_EXP_FAR - RADIAL_EXP_NEAR) * t;
    const factor = Math.pow(rg, dynamicExp) * RADIAL_SCALE_OUT;
    const scale = factor / rg;
    return [cx * scale, cy * scale];
}

// gain() 셰이핑 함수 — 셰이더의 gain()과 동일(포팅 출처는 p5 레퍼런스).
// ⚠️ 바깥쪽 사각형들이 예상보다 훨씬 많이 사라지는 버그의 원인이 바로 여기
// 관련: p5 레퍼런스는 Cx/Cy(크기)를 "원본(왜곡 전) 격자 좌표 x_g,y_g"로
// 계산하는데, 셰이더 포팅판은 실수로 "이미 radialWarp로 압축된 site 위치"
// 기준으로 다시 계산했었음 — radialWarp가 바깥쪽 site들을 전부 비슷한 반경으로
// 밀어붙이다 보니 그 압축된 위치 기준 |n|이 원래보다 훨씬 자주 1에 가까워져서,
// 훨씬 넓은 바깥 영역이 Cx/Cy≈0(=안 보임)으로 뭉개짐. 그래서 지금은 이 함수로
// Cx/Cy를 여기(appendSyllable, 압축 전 nx/ny)에서 미리 계산해 site에 저장해두고,
// 셰이더는 그 값을 그대로 텍스처에서 읽기만 한다(위치 압축과 완전히 독립적으로).
function gain(x, k) {
    const p = 0.12;
    const a = p * Math.pow(2 * (x < p ? x : 1 - x), k);
    return x < p ? a : 1 - a;
}

// 전략3 — 공간 자체를 warp해서 셀 모양을 비등방(anisotropic)하게 찌그러뜨림.
//
// ⚠️ 0으로 꺼둠 — 수학적으로 근본적인 한계를 발견함: query 픽셀과 site 양쪽에
// "같은" 가역(invertible) 변환을 일관되게 적용하는 방식이라, 자코비안(Jacobian)
// 이 아무리 위치마다 달라져도 순방향(실공간→warp공간)과 역방향(warp공간→실공간)
// 스케일이 정확히 상쇄돼서 — 결과적으로 셀의 "면적"은 절대 안 변함. 방향별로
// 다르게 늘어나서 모양(가로세로 비율)만 비등방적으로 찌그러질 뿐, "가장자리로
// 갈수록 작아지는" 느낌은 이 방법으로는 원리상 안 나옴(실제로 셀이 한쪽으로
// 길어지면 다른 쪽은 얇아지면서 면적은 그대로라, 오히려 "커 보이는" 방향이
// 생겨서 사각 격자 느낌만 깨짐 — 리뷰에서 지적된 증상 그대로).
// "진짜로 작아짐"을 만드는 건 지금 GLOBE_RADIUS_RATIO의 원형 클리핑(smin) 쪽 —
// 그건 면적을 보존 안 하는(그냥 잘라내는) 연산이라 실제 축소 효과가 남.
// 필요하면 나중에 "면적을 바꾸는" 방식(예: power distance 계산에 비등방
// 메트릭을 직접 곱하는 등 site 재배치가 아닌 방식)으로 다시 시도해볼 수 있음.
const WARP_POWER = 0;

const WORD_GAP_RATIO = 0.6; // 단어 사이 여백 = sylSize × 이 값 (signal.js의 yeoback 폭과 동일 비율)

// ── 패턴 선택 (signal.js와 동일 로직) ─────────────────────────────────────────
function getPatternType(jung, jong, JAMO) {
    if (!jung) return 'vertical';
    const entry = JAMO[jung];
    const diph = entry?.diphthong ?? 0;
    const f2 = entry?.pos?.[1] ?? 1000;
    const hasJong = !!jong;

    if (!hasJong) {
        if (diph) return 'per75';
        return f2 >= F2_BOUNDARY ? 'vertical' : 'horizontal';
    } else {
        if (diph) return 'bed';
        return f2 >= F2_BOUNDARY ? 'right_click' : 'hamburger';
    }
}

// ── 연속 좌표(0~1) 기반 패턴 배정 — signal.js의 makePattern()을 포인트 단위로 이식.
// nx/ny = 음절 내부 상대 위치(0~1). signal.js의 c(col)→nx, r(row)→ny에 대응.
// signal.js의 같은 순서(초성 배정 → 중성/종성이 덮어씀)를 그대로 재현해서,
// 원본과 동일하게 일부 영역은 아무 조건에도 안 걸려 BLANK로 남는다.
function patternState(type, nx, ny) {
    let st = BLANK;
    if (type === 'vertical') {
        if (ny < HIGH_R && nx >= OFFSET_R && nx < OFFSET_R + HIGH_R) st = CHO;
        if (nx >= HIGH_R) st = JUNG;
    } else if (type === 'horizontal') {
        if (ny >= OFFSET_R && ny < OFFSET_R + HIGH_R && nx < HIGH_R) st = CHO;
        if (ny >= HIGH_R) st = JUNG;
    } else if (type === 'per75') {
        if (ny < HIGH_R && nx < HIGH_R) st = CHO;
        if (st !== CHO) st = JUNG;
    } else if (type === 'right_click') {
        if (ny < HIGH_R && nx < HIGH_R) st = CHO;
        if (ny >= HIGH_R) st = JONG;
        if (ny < HIGH_R && nx >= HIGH_R) st = JUNG;
    } else if (type === 'hamburger') {
        if (ny < LOW_R && nx >= OFFSET_R && nx < OFFSET_R + HIGH_R) st = CHO;
        if (ny >= LOW_R && ny < 1 - LOW_R) st = JUNG;
        if (ny >= 1 - LOW_R) st = JONG;
    } else if (type === 'bed') {
        if (ny < LOW_R && nx < HIGH_R) st = CHO;
        if (ny >= 1 - LOW_R) st = JONG;
        if (st === BLANK) st = JUNG;
    }
    return st;
}

// ── 셀 색상 계산 (signal.js와 동일) ───────────────────────────────────────────
function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const [r, g, b] = [
        [v, t, p, p, q, v],
        [q, v, v, t, p, p],
        [p, p, q, v, v, t],
    ].map(ch => ch[i % 6]);
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function cellColor(state, jamoEntry) {
    if (state === BLANK) return [255, 255, 255];

    const pos = jamoEntry?.pos ?? [0.5, 0.5, 0.5];
    let r, g, b;
    if (jamoEntry?.type === 'jung') {
        r = Math.round(((pos[0] - 250) / 650) * 200 + 30);
        g = Math.round(((pos[1] - 580) / 2020) * 200 + 30);
        b = Math.round(((pos[2] - 2080) / 1120) * 200 + 30);
    } else {
        r = Math.round(pos[0] * 200 + 30);
        g = Math.round(pos[1] * 200 + 30);
        b = Math.round(pos[2] * 200 + 30);
    }

    if (state === CHO) g = Math.min(255, Math.round(g * 1.5));
    if (state === JUNG) {
        r = Math.min(255, Math.round(r * 1.5));
        g = Math.min(255, Math.round(g * 1.5));
    }
    if (state === JONG) r = Math.min(255, Math.round(r * 1.5));

    return [r, g, b];
}

const SIGNAL_COLORS = [
    [0xff, 0x31, 0x1e],
    [0x19, 0xf8, 0x00],
    [0xff, 0xf2, 0x00],
];

// 포인트 하나의 RGB (flash 포함 — 인프라만 이식, signal.js와 마찬가지로 트리거 미구현)
function pointColor(p, flashPhase) {
    if (p.isSignal) return p.signalColor;
    const jamoEntry = jamoEntryFor(p);
    const [rv, gv, bv] = cellColor(p.state, jamoEntry);
    const br = Math.min(p.brightness, 2.5);
    const fv = p.flash;
    if (fv === 0)
        return [
            Math.min(255, Math.round(rv * br)),
            Math.min(255, Math.round(gv * br)),
            Math.min(255, Math.round(bv * br)),
        ];
    if (fv === 1) {
        const alpha = 0.5 + 0.5 * Math.sin(flashPhase * 2.0);
        return [
            Math.min(255, Math.round(255 + (rv * br - 255) * alpha)),
            Math.min(255, Math.round(255 + (gv * br - 255) * alpha)),
            Math.min(255, Math.round(255 + (bv * br - 255) * alpha)),
        ];
    }
    const speed = 1.0 + 3.0 * (0.5 + 0.5 * Math.sin(flashPhase * 0.3));
    const alpha2 = 0.5 + 0.5 * Math.sin(flashPhase * speed);
    return [
        Math.min(255, Math.round(255 + (rv * br - 255) * alpha2)),
        Math.min(255, Math.round(255 + (gv * br - 255) * alpha2)),
        Math.min(255, Math.round(255 + (bv * br - 255) * alpha2)),
    ];
}

function jamoEntryFor(p) {
    const meta = p.sylMeta;
    if (!meta) return null;
    if (p.state === CHO) return meta.choEntry;
    if (p.state === JUNG) return meta.jungEntry;
    if (p.state === JONG) return meta.jongEntry ?? meta.choEntry;
    return null;
}

// ── 지터드 그리드 샘플링 (jittered grid) ──────────────────────────────────────
// w×h 영역(로컬 좌표, 0..w / 0..h)을 cellSize 간격의 규칙적인 격자로 나누고,
// 각 셀 중심을 jitter만큼 무작위로 흔들어 점을 하나씩 놓는다.
//
// Poisson-disk(Bridson's algorithm, 이전 버전)와의 차이: Bridson은 "임의의 활성점
// 하나를 골라 그 주변에 새 점을 붙여나가는" 성장 과정 자체가 랜덤이라, 로컬
// 반경을 아무리 좁혀도(=jitter를 낮춰도) 전역적으로는 항상 육각형에 가까운
// blue-noise packing으로 수렴함 — 즉 "grid 느낌"이 근본적으로 안 나옴.
// 지터드 그리드는 반대로 배치 자체가 격자이고 거기서부터 얼마나 흔드는지만
// 조절하는 구조라, jitter가 낮을수록(예 0.1~0.3) 사각 격자에 가까운 Voronoi가
// 뚜렷하게 나타난다. jitter=0: 완벽한 격자, jitter=1: 셀 폭 전체 범위에서
// 무작위(옆 셀 경계까지 흔들림 가능).
function jitteredGridSample(w, h, cellSize, jitter) {
    const cols = Math.max(1, Math.round(w / cellSize));
    const rows = Math.max(1, Math.round(h / cellSize));
    const cw = w / cols,
        ch = h / rows;
    const points = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const cx = (i + 0.5) * cw;
            const cy = (j + 0.5) * ch;
            const ox = (Math.random() - 0.5) * jitter * cw;
            const oy = (Math.random() - 0.5) * jitter * ch;
            points.push([cx + ox, cy + oy]);
        }
    }
    return points;
}

// ── Word 상태 — 한 단어의 누적 point set + Delaunay adjacency + GPU 텍스처 ───
function createWordState() {
    return {
        syllables: [], // [{choEntry, jungEntry, jongEntry, type, cho, jung, jong}]
        points: [], // Point[]
        delaunay: null,
        cols: 0,
        _glTex: null, // WebGLTexture — 이 단어의 포인트 데이터(x,y,weight,rgb)
        _needsUpload: true, // true면 다음 프레임에 텍스처를 다시 올려야 함
    };
}

// 새 음절의 point들을 word에 append (기존 점은 그대로 유지)
function appendSyllable(wordState, syl, sylIndex, JAMO, sylSize) {
    const jungEntry = JAMO[syl.jung];
    const choEntry = JAMO[syl.cho]?.cho ?? JAMO[syl.cho];
    const jongEntry = syl.jong ? (JAMO[syl.jong + '_jong'] ?? JAMO[syl.jong]) : null;
    const type = getPatternType(syl.jung, syl.jong, JAMO);
    const sylMeta = { choEntry, jungEntry, jongEntry, type, cho: syl.cho, jung: syl.jung, jong: syl.jong };
    wordState.syllables.push(sylMeta);

    const offsetX = sylIndex * sylSize;
    const raw = jitteredGridSample(sylSize, sylSize, MIN_DIST, JITTER);

    // 기존 점(특히 이웃 음절 경계 근처)과 너무 가까운 신규 점 제거
    const newLocal = [];
    for (const [lx, ly] of raw) {
        const x = lx + offsetX,
            y = ly;
        let ok = true;
        for (const p of wordState.points) {
            const dx = p.localX - x,
                dy = p.localY - y;
            if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
                ok = false;
                break;
            }
        }
        if (ok) newLocal.push([x, y]);
    }

    // 신호등 랜덤 셀: 음절당 2~3개
    const signalCount = Math.min(2 + Math.floor(Math.random() * 2), newLocal.length);
    const signalIdx = new Set();
    while (signalIdx.size < signalCount) signalIdx.add(Math.floor(Math.random() * newLocal.length));

    newLocal.forEach(([x, y], i) => {
        const nx = (x - offsetX) / sylSize;
        const ny = y / sylSize;
        const state = patternState(type, nx, ny); // 패턴 배정은 항상 원래(비압축) 격자 위치 기준
        const isSignal = signalIdx.has(i);
        const targetScale = isSignal ? SIGNAL_SCALE : (STATE_SCALE[state] ?? BLANK_SCALE);

        // GLOBE_STYLE=2일 때만 실제 렌더/CA에 쓰이는 site 위치 자체를 압축—
        // -1..1로 정규화 후 radialWarp(방사형 압축), 다시 실좌표로 되돌림.
        let px = x,
            py = y;
        let cellCx = 1,
            cellCy = 1;
        if (GLOBE_STYLE === 2) {
            const gx = nx * 2 - 1,
                gy = ny * 2 - 1;
            // 크기(Cx, Cy)는 반드시 압축 "전" 원본 격자 좌표(gx,gy)로 계산 —
            // radialWarp된 위치로 계산하면 위 주석에서 설명한 "바깥쪽이 과하게
            // 사라지는" 버그가 재현됨.
            const tX = Math.max(0, (Math.abs(gx) - SQUIRCLE_T1) / (1 - SQUIRCLE_T1));
            const tY = Math.max(0, (Math.abs(gy) - SQUIRCLE_T1) / (1 - SQUIRCLE_T1));
            cellCx = 1 - gain(Math.min(1, tX), SQUIRCLE_GAIN_K);
            cellCy = 1 - gain(Math.min(1, tY), SQUIRCLE_GAIN_K);

            const [wx, wy] = radialWarp(gx, gy);
            px = offsetX + ((wx + 1) / 2) * sylSize;
            py = ((wy + 1) / 2) * sylSize;
        }

        wordState.points.push({
            localX: px,
            localY: py,
            cellCx,
            cellCy,
            sylIndex,
            sylMeta,
            state,
            isSignal,
            signalColor: isSignal ? SIGNAL_COLORS[Math.floor(Math.random() * 3)] : null,
            brightness: 1.0,
            flash: 0,
            flashTimer: 0,
            currentScale: targetScale,
            targetScale,
            neighbors: null,
        });
    });
}

// Delaunay adjacency 재계산 — point 위치가 바뀌지 않는 한(신규 음절 append 시에만)
// 호출. point들은 생성 후 위치가 고정이고 state/brightness/scale만 바뀌므로,
// CA 이웃 그래프(neighbors)는 여기서 한 번만 캐싱해두고 stepWord()에서는 그
// 캐시만 읽는다 (성능 최적화).
function recomputeAdjacency(wordState, sylSize) {
    const pts = wordState.points;
    if (pts.length === 0) {
        wordState.delaunay = null;
        return;
    }
    const cols = wordState.syllables.length * sylSize;
    const delaunay = Delaunay.from(
        pts,
        p => p.localX,
        p => p.localY,
    );
    wordState.delaunay = delaunay;
    wordState.cols = cols;

    for (let i = 0; i < pts.length; i++) {
        pts[i].neighbors = Array.from(delaunay.neighbors(i));
    }
    wordState._needsUpload = true;
}

// wordItems(현재 텍스트의 해당 단어 음절들)와 캐시를 비교해서 append-only면 이어붙이고,
// 중간 수정/삭제가 감지되면(prefix 불일치) 그 단어를 통째로 다시 만든다.
function syncWord(cache, wordId, wordItems, JAMO, sylSize) {
    let entry = cache.get(wordId);
    const newCount = wordItems.length;

    if (entry) {
        let matchLen = 0;
        const maxCheck = Math.min(entry.syllables.length, newCount);
        for (; matchLen < maxCheck; matchLen++) {
            const a = entry.syllables[matchLen];
            const b = wordItems[matchLen].syl;
            if (a.cho !== b.cho || a.jung !== b.jung || a.jong !== b.jong) break;
        }

        if (matchLen === entry.syllables.length) {
            // 순수 append — 새로 늘어난 음절만 이어붙임
            if (newCount > matchLen) {
                for (let i = matchLen; i < newCount; i++) appendSyllable(entry, wordItems[i].syl, i, JAMO, sylSize);
                recomputeAdjacency(entry, sylSize);
            }
            return entry;
        }
        // prefix 불일치(중간 수정) 또는 길이 감소 — 통째로 재생성
    }

    entry = createWordState();
    for (let i = 0; i < newCount; i++) appendSyllable(entry, wordItems[i].syl, i, JAMO, sylSize);
    recomputeAdjacency(entry, sylSize);
    cache.set(wordId, entry);
    return entry;
}

// ── Word CA step — 이웃을 grid 대신 Delaunay adjacency로 계산 ────────────────
function stepWord(wordState) {
    const pts = wordState.points;
    if (pts.length === 0) return;

    const nextState = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const nbIdx = p.neighbors ?? [];
        let st = p.state;
        nextState[i] = st;

        if (st === CHO) {
            const jungCount = nbIdx.reduce((n, j) => n + (pts[j].state === JUNG ? 1 : 0), 0);
            if (jungCount >= 1 && Math.random() < 0.15) {
                nextState[i] = JUNG;
                continue;
            }
        }
        // 규칙3: 방향 근사 — 이웃 포인트가 현재 포인트보다 오른쪽(x 큼) 또는
        // 아래쪽(y 큼)에 있으면 signal.js의 E/S(동/남) 방향으로 취급
        if (st === CHO) {
            let esJung = 0;
            for (const j of nbIdx) {
                const q = pts[j];
                if ((q.localX > p.localX || q.localY > p.localY) && q.state === JUNG) esJung++;
            }
            if (esJung >= 1) {
                nextState[i] = JUNG;
                continue;
            }
        }
        if (st === JUNG) {
            const jongCount = nbIdx.reduce((n, j) => n + (pts[j].state === JONG ? 1 : 0), 0);
            if (jongCount >= 1 && Math.random() < 0.15) {
                nextState[i] = JONG;
                continue;
            }
        }
        if (st === JONG) {
            const choCount = nbIdx.reduce((n, j) => n + (pts[j].state === CHO ? 1 : 0), 0);
            if (choCount >= 1 && Math.random() < 0.15) {
                nextState[i] = CHO;
                continue;
            }
        }
        // 규칙6: blank 이웃 있으면 brightness ×1.1 (최대 2.5배)
        if (st !== BLANK) {
            const hasBlank = nbIdx.some(j => pts[j].state === BLANK);
            if (hasBlank) p.brightness = Math.min(p.brightness * 1.1, 2.5);
        }
    }

    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.state !== nextState[i]) {
            p.state = nextState[i];
            p.targetScale = p.isSignal ? SIGNAL_SCALE : (STATE_SCALE[p.state] ?? BLANK_SCALE);
        }
        // brightness 감쇠 — blank 이웃 없으면 서서히 1.0으로 복귀
        p.brightness += (1.0 - p.brightness) * 0.05;
    }
    // brightness가 매 step마다 항상(감쇠든 누적이든) 바뀌므로 색 텍스처도 다시 올려야 함
    wordState._needsUpload = true;
}

// ── GLSL 셰이더 — 단어 하나의 quad 위에서 가중 Voronoi(power diagram)를 계산 ──
// 픽셀마다 u_data 텍스처를 순회하며 power distance(dist² - weight)가 가장
// 작은 점을 찾아 그 색으로 칠한다. 폴리곤 계산이 필요 없다 — CPU에서 넘긴
// site 목록에 대해 매 픽셀이 스스로 "누구에게 속하는지" 판단하는 것뿐.
//
// 셀 모서리 라운딩(bevel): 단순히 1등/2등 site와의 거리차만 보면 3개 이상
// 셀이 만나는 지점에서 뾰족한 꼭짓점이 생김. 이를 둥글리기 위해, best site를
// 기준으로 "각 이웃 site와의 실제 power-diagram 경계선(radical axis)까지의
// 수직 거리"를 전부 구한 뒤, 단순 min() 대신 polynomial smooth-min(smin)으로
// 합친다 — smin은 여러 값이 비슷하게 작아지는 지점(=여러 변이 만나는 모서리)을
// 자연스럽게 둥글게 뭉개주는 효과가 있음(CORNER_ROUND가 그 반경).
const vertSrc = `#version 300 es
in vec2 a_pos;
uniform vec2 u_resolution;
uniform vec2 u_origin; // 단어 사각형의 화면상 좌상단(px, y-down)
uniform vec2 u_size;   // 단어 사각형 크기(px)
out vec2 v_local;      // 0..u_size, point 좌표와 같은 로컬 px 공간(y-down)
void main() {
    v_local = a_pos * u_size;
    vec2 screenPx = u_origin + v_local;
    vec2 clip = (screenPx / u_resolution) * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const fragSrc = `#version 300 es
precision highp float;
in vec2 v_local;
uniform sampler2D u_data; // width=count, height=2 (row0: x,y,weight / row1: r,g,b)
uniform vec2 u_size;    // 단어 사각형 크기(px) — 바깥 테두리를 가상의 변으로 취급할 때 씀
uniform int u_count;
uniform float u_gapPx;
uniform float u_corner; // 모서리 라운딩 반경(px) — smooth-min의 k
uniform float u_cutoff; // 이 거리보다 먼 site는 모서리 계산에서 제외(smin 처짐 방지)
uniform float u_sylSize;   // 음절 하나의 폭/높이(px) — 픽셀이 어느 음절에 속하는지 계산용
uniform float u_globeRadius;   // "구체" 반경(px, 음절 중심 기준) — 원형 실루엣의 반지름
uniform float u_warpPower; // 전략3: 공간 자체를 압축하는 정도. 0이면 warp 없음
uniform float u_globeStyle;    // 0=크리스프 원형 클리핑, 2=squircle
uniform float u_haloExtra; // u_globeStyle=0일 때 halftone 그라데이션 세기(px) — 중심→가장자리로 갈수록 셀이 작아지는 정도
uniform float u_cellSize; // u_globeStyle=2일 때 — site 하나가 그릴 수 있는 최대 폭/높이(px, MIN_DIST 기준)
out vec4 outColor;

#define MAX_PTS ${MAX_PTS}

// polynomial smooth-min — a,b가 비슷할수록 더 깊이 둥글게 파고듦(k=반경).
// "여러 제약을 동시에 만족해야 하는" 교집합(intersection) 용도 — 여기서는
// site 경계(bisector)들 + 단어 사각형 테두리 + 내 음절의 원, 이렇게 "전부
// 만족해야 안쪽"인 조건들을 합칠 때 씀.
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// polynomial smooth-max — smin의 반대. "여러 도형 중 하나에라도 속하면" 안쪽인
// 합집합(union) 용도. 옆 음절 원과 부드럽게 겹쳐 이어붙이려면 이게 필요함 —
// ⚠️ 처음엔 실수로 여기도 smin을 썼는데, 그러면 "내 원 밖 = 무조건 바깥"이 되는
// 교집합 조건이 되어버려서, 옆 원 중심에서 멀리 떨어진(=거의 모든) 픽셀이
// 옆 원 항 때문에 큰 음수로 끌려 내려가 화면 전체가 하얗게 사라지는 버그가 남.
float smax(float a, float b, float k) {
    return -smin(-a, -b, k);
}

// gain() 셰이핑 함수(Iñigo Quilez류 bias/gain 커브) — 사용자가 p5.js에서 검증한
// GLOBE_STYLE=2 크기 축소 곡선을 그대로 포팅. x=0→0, x=1→1이면서 k가 클수록
// x=0.5 부근에서 더 급격하게 꺾이는 S자 커브.
float gain(float x, float k) {
    float p = 0.16;
    float a = p * pow(2.0 * ((x < p) ? x : 1.0 - x), k);
    return (x < p) ? a : 1.0 - a;
}

// 전략3(공간 자체를 warp) — "가까운 site들의 실제 화면상 셀 크기"는 warp된
// 좌표계에서의 상대적 거리로 정해지기 때문에, 중심에서 먼 곳일수록 site들을
// 서로 더 "벌려" 놓으면(=warp 좌표에서의 간격을 넓히면) 같은 화면 거리 안에
// 더 많은 site가 들어가는 셈이 되어 실제 화면에 그려지는 셀은 오히려 작아진다
// (처음엔 반대로 "좁히는" 함수를 썼다가 셀이 오히려 방사형으로 길게 늘어나는
// 스파이크 모양이 나와서 발견한 부호 실수 — 압축이 아니라 팽창이 맞음).
// f(r)이 반경 방향으로만 커지는 함수라서(각도/접선 방향은 그대로), 중심에서
// 먼 점일수록 반경 방향 압축이 접선 방향보다 훨씬 강해져 자연히 비등방
// (anisotropic)하게 찌그러짐 — 구 표면이 시야에서 먼 쪽으로 납작해 보이는
// 원근 축소(foreshortening)와 같은 원리. query pixel과 site 양쪽에 반드시
// 같은 함수를 같은 중심 기준으로 적용해야 거리 비교가 의미를 가짐.
vec2 warpToward(vec2 p, vec2 center, float radius) {
    if (u_warpPower <= 0.0) return p;
    vec2 rel = p - center;
    float r = length(rel) / radius;
    float f = 1.0 + u_warpPower * r * r; // 중심에서 멀수록 더 세게 밀어냄(팽창)
    return center + rel * f;
}

void main() {
    // 이 픽셀이 속한 음절 자신의 중심 — 전략3 warp와 아래 "구체" gap 확장 둘 다
    // 이 중심 기준으로 계산됨. site를 warp할 때도 항상 이 (픽셀 기준) 중심을
    // 씀 — 같은 음절 안의 site들끼리는 정확하고, 아주 드물게 음절 경계 너머의
    // site와 비교할 때만 근사가 되지만(EDGE_CUTOFF가 애초에 그런 경우를 거의
    // 걸러줌) 수치적으로 항상 안전함.
    float sylIdx = floor(v_local.x / u_sylSize);
    vec2 sylCenter = vec2((sylIdx + 0.5) * u_sylSize, u_size.y * 0.5);
    vec2 vw = warpToward(v_local, sylCenter, u_globeRadius);

    // 1st pass — power distance가 가장 작은 site(best) 찾기 (warp된 좌표로 비교)
    float best = 1e12;
    int bestIdx = 0;
    vec2 bestPos = vec2(0.0);
    float bestW = 0.0;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz; // x, y, weight
        vec2 sw = warpToward(pw.xy, sylCenter, u_globeRadius);
        vec2 d = vw - sw;
        float dist = dot(d, d) - pw.z; // power distance
        if (dist < best) {
            best = dist;
            bestIdx = i;
            bestPos = sw;
            bestW = pw.z;
        }
    }

    // 2nd pass — best와 각 이웃 사이의 power-diagram 경계선(radical axis)까지
    // 실제 수직거리를 구해서 smooth-min으로 합침 (모서리 라운딩의 핵심).
    // 경계선 공식: dot(p - mid, n̂) = -(w_j - w_best) / (2*|s_j - s_best|)
    // 인 직선이 site best/j의 power-diagram bisector — 그 직선까지의
    // signed 거리(양수 = p가 best 쪽 안에 있음)를 아래 d로 계산.
    // (원본 pw.xy로 cutoff를 체크해서, warp로 site들이 서로 가까워 보여도
    // 실제로 멀리 있던 site가 후보로 끼어들지 않게 함)
    float edgeDist = 1e12;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        if (i == bestIdx) continue;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz;
        if (length(pw.xy - texelFetch(u_data, ivec2(bestIdx, 0), 0).xy) > u_cutoff) continue;
        vec2 sw = warpToward(pw.xy, sylCenter, u_globeRadius);
        vec2 n = sw - bestPos;
        float nlen = length(n);
        if (nlen < 1e-4) continue;
        vec2 nHat = n / nlen;
        vec2 mid = 0.5 * (bestPos + sw);
        float d = dot(mid - vw, nHat) - (pw.z - bestW) / (2.0 * nlen);
        edgeDist = smin(edgeDist, d, u_corner);
    }

    // 단어 사각형의 4변 — 이건 두 스타일 공통(교집합 조건, smin).
    edgeDist = smin(edgeDist, v_local.x, u_corner);
    edgeDist = smin(edgeDist, u_size.x - v_local.x, u_corner);
    edgeDist = smin(edgeDist, v_local.y, u_corner);
    edgeDist = smin(edgeDist, u_size.y - v_local.y, u_corner);

    vec4 bestRow0 = texelFetch(u_data, ivec2(bestIdx, 0), 0);
    vec4 bestRow1 = texelFetch(u_data, ivec2(bestIdx, 1), 0);
    vec3 color = bestRow1.rgb;
    float edge;

    if (u_globeStyle > 0.5) {
        // ── squircle 스타일 — p5.js 레퍼런스의 "가로/세로 독립 축소"를 구현.
        // Cx(너비 배율)/Cy(높이 배율)는 여기서 다시 계산하지 않고 CPU에서 미리
        // 계산해 텍스처에 실어둔 값을 그대로 읽는다(row0.w, row1.w — appendSyllable()
        // 참고). ⚠️ 예전엔 여기서 bestPos(=이미 radialWarp로 압축된 site 위치) 기준
        // |snx|,|sny|로 다시 계산했는데, 압축된 위치는 바깥쪽일수록 실제보다 훨씬
        // 자주 |n|≈1에 몰려서 Cx/Cy가 필요 이상으로 많은 site에서 0에 가까워지는
        // 버그가 있었음(바깥쪽 사각형들이 원본 대비 과하게 사라짐) — CPU 쪽에서
        // 압축 "전" 원본 격자 좌표로 미리 계산해두면 이 문제가 원천적으로 없다.
        // "이 site는 최대 Cx*u_cellSize 너비 / Cy*u_cellSize 높이짜리 상자 안에서만
        // 그려질 수 있다"는 축(axis)별 박스 클리핑을 edgeDist에 추가로 접어 넣는다
        // (교집합이라 smin) — Voronoi 셀 모양 자체를 안 건드리고 위에 상자를 겹쳐
        // 씌우는 방식이라, |x_g|만 threshold를 넘으면 너비만, |y_g|만 넘으면
        // 높이만 줄어들고, 둘 다 넘는 모서리 site는 상자 자체가 작아져서 상하좌우
        // 다 줄어든다.
        float Cx = bestRow0.w * 1.4;
        float Cy = bestRow1.w * 1.4;
        float halfW = u_cellSize * 0.5 * Cx;
        float halfH = u_cellSize * 0.5 * Cy;
        float boxClipX = halfW - abs(v_local.x - bestPos.x);
        float boxClipY = halfH - abs(v_local.y - bestPos.y);
        edgeDist = smin(edgeDist, boxClipX, u_corner);
        edgeDist = smin(edgeDist, boxClipY, u_corner);

        edge = smoothstep(0.0, u_gapPx, edgeDist);
    } else {
        // ── 현재 스타일 — 원형 실루엣을 edgeDist의 smin/smax 체인에 직접 접어
        // 넣어서, gap 폭은 항상 u_gapPx로 고정한 채(크리스프함 유지) 셀이 실제로
        // 작아지거나 사라지게 만듦. "CA 격자 밖에 테두리가 있다"는 트릭을 원
        // 모양에도 그대로 적용한 것 — 실루엣이 사각형이 아니라 진짜 원이 되고,
        // CORNER_ROUND로 안쪽 모서리와 똑같이 둥글게 깎인다. (원은 warp 안 된
        // v_local 기준 — 화면상 진짜 원형 실루엣이 나와야 하므로 안쪽 셀 모양만
        // warpToward로 찌그러뜨리고 바깥 윤곽은 손대지 않음.)
        //
        // 내 음절의 원: 지금까지와 같은 교집합 조건("전부 만족해야 안쪽")이라 smin.
        edgeDist = smin(edgeDist, u_globeRadius - length(v_local - sylCenter), u_corner);

        // 옆 음절의 원: GLOBE_RADIUS_RATIO가 0.5보다 크면(반지름 합 > 음절 간격)
        // 이웃 원끼리 기하학적으로 겹치는데, "내 원 밖이어도 옆 원 안이면 안쪽"
        // 이어야 metaball처럼 부드럽게 겹쳐 이어붙는다 — 합집합(union) 조건이라
        // smax를 써야 함(smin을 쓰면 옆 원 중심에서 먼 대부분의 픽셀이 그 항
        // 때문에 큰 음수로 끌려 내려가 화면 전체가 하얗게 사라짐 — 실제로 겪은 버그).
        vec2 leftCenter = sylCenter - vec2(u_sylSize, 0.0);
        vec2 rightCenter = sylCenter + vec2(u_sylSize, 0.0);
        edgeDist = smax(edgeDist, u_globeRadius - length(v_local - leftCenter), u_corner);
        edgeDist = smax(edgeDist, u_globeRadius - length(v_local - rightCenter), u_corner);

        // halftone 그라데이션 — 셀이 원 중심에서 먼 site에 속할수록 문턱값을
        // 밀어올려서 그려지는 크기를 줄임. bestPos(=이 셀의 site 위치, 셀 전체에서
        // 상수)를 기준으로 계산하기 때문에 문턱값이 셀 하나 안에서는 절대 안
        // 변함 — v_local(픽셀 위치)로 계산했다간 셀 내부에서 문턱값이 계속
        // 바뀌면서 전환 폭 자체가 넓어지는 예전 블러 버그가 그대로 재현됨.
        // 전환 "폭"은 항상 u_gapPx로 고정, 전환이 "시작하는 지점"만 셀 단위로
        // 밀어서 크리스프함을 유지한 채 중심→가장자리 크기 그라데이션을 만든다.
        float siteR = length(bestPos - sylCenter) / u_globeRadius;
        float haloShrink = smoothstep(0.0, 1.0, siteR) * u_haloExtra;

        // 경계에 가까울수록(=edgeDist가 작을수록) 흰 배경 쪽으로 섞어서
        // LED 픽셀 같은 셀 간 gap을 만듦 (CPU 폴리곤 축소 대신 per-pixel로 처리)
        edge = smoothstep(haloShrink, haloShrink + u_gapPx, edgeDist);
    }

    outColor = vec4(mix(vec3(1.0), color, edge), 1.0);
}
`;

function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('signal shader compile error: ' + log);
    }
    return sh;
}

function createProgram(gl) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog);
        throw new Error('signal program link error: ' + log);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
}

// wordState.points의 현재 상태(x,y,weight,color)를 RGBA32F 텍스처로 GPU에 올림.
// 매 프레임 하지 않음 — _needsUpload가 true인(움직이는 중이거나 방금 CA step이
// 지나간) 단어에서만 호출됨.
function uploadWordData(gl, wordState, flashPhase) {
    const pts = wordState.points;
    const n = pts.length;
    if (n === 0) return;
    const data = new Float32Array(n * 2 * 4); // row0: xy+weight, row1: rgb
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        data[i * 4 + 0] = p.localX;
        data[i * 4 + 1] = p.localY;
        data[i * 4 + 2] = p.currentScale * WEIGHT_SCALE;
        data[i * 4 + 3] = p.cellCx ?? 1; // GLOBE_STYLE=2 전용 — appendSyllable()에서 압축 전 좌표로 미리 계산해둔 값

        const [r, g, b] = pointColor(p, flashPhase);
        const base = n * 4 + i * 4;
        data[base + 0] = r / 255;
        data[base + 1] = g / 255;
        data[base + 2] = b / 255;
        data[base + 3] = p.cellCy ?? 1; // 위와 짝 — row1의 빈 alpha 채널을 재사용
    }

    if (!wordState._glTex) wordState._glTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, wordState._glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, 2, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    wordState._texCount = n;
}

// ── SignalReceiver ──────────────────────────────────────────────────
export class SignalReceiver {
    constructor() {
        this.lineHeightRatio = 1.4;
        this._canvas = null;
        this._gl = null;
        this._prog = null;
        this._quadBuf = null;
        this._uniforms = null;
        this._raf = null;
        this._rows = []; // [줄][단어] → wordState
        this._wordCache = new Map(); // wordId → wordState
        this._JAMO = null;
        this._sylItems = [];
        this._positions = [];
        this._sylSize = DEFAULT_SYL_SIZE;
        this._stepCount = 0;
        this._lastStep = 0;
        this._STEP_INTERVAL = 140; // ms — signal.js와 동일
        this._lastFrame = 0;
        this._FRAME_INTERVAL = 1000 / 24;
        this._flashPhase = 0;
        this._active = false;

        // main.js 레이아웃 엔진이 참조하는 값들 — signal.js와 동일하게 맞춤
        this.sylSize = DEFAULT_SYL_SIZE;
        this.wrapStep = DEFAULT_SYL_SIZE;
        this.wrapMargin = 0;
    }

    async init(canvas) {
        this._canvas = canvas ?? document.createElement('canvas');
        if (!canvas) {
            Object.assign(this._canvas.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
            });
            document.body.appendChild(this._canvas);
        }

        const gl = this._canvas.getContext('webgl2');
        if (!gl) throw new Error('signal: WebGL2 not available');
        this._gl = gl;
        this._prog = createProgram(gl);

        this._quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(this._prog, 'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        this._uniforms = {
            resolution: gl.getUniformLocation(this._prog, 'u_resolution'),
            origin: gl.getUniformLocation(this._prog, 'u_origin'),
            size: gl.getUniformLocation(this._prog, 'u_size'),
            data: gl.getUniformLocation(this._prog, 'u_data'),
            count: gl.getUniformLocation(this._prog, 'u_count'),
            gapPx: gl.getUniformLocation(this._prog, 'u_gapPx'),
            corner: gl.getUniformLocation(this._prog, 'u_corner'),
            cutoff: gl.getUniformLocation(this._prog, 'u_cutoff'),
            sylSize: gl.getUniformLocation(this._prog, 'u_sylSize'),
            globeRadius: gl.getUniformLocation(this._prog, 'u_globeRadius'),
            warpPower: gl.getUniformLocation(this._prog, 'u_warpPower'),
            globeStyle: gl.getUniformLocation(this._prog, 'u_globeStyle'),
            haloExtra: gl.getUniformLocation(this._prog, 'u_haloExtra'),
            cellSize: gl.getUniformLocation(this._prog, 'u_cellSize'),
        };

        this._resize();
        window.addEventListener('resize', () => this._resize());
        this._raf = requestAnimationFrame(this._animate);
    }

    // @param sylItems   isSpace 제외 음절 배열
    // @param positions  0~1 uv 위치 배열
    // @param JAMO       자모 데이터
    // @param sylSize    음절 픽셀 크기
    update(sylItems, positions, JAMO, sylSize) {
        this._JAMO = JAMO;
        this._sylItems = sylItems;
        this._positions = positions;
        this._sylSize = sylSize ?? this._estimateSylSize(positions);

        if (!JAMO || sylItems.length === 0) {
            this._rows = [];
            this._wordCache.clear();
            this._active = false;
            return;
        }

        this._syncRows(sylItems, positions, JAMO);
        this._active = true;
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._resize);
        const gl = this._gl;
        if (gl) {
            for (const wordState of this._wordCache.values()) {
                if (wordState._glTex) gl.deleteTexture(wordState._glTex);
            }
            if (this._quadBuf) gl.deleteBuffer(this._quadBuf);
            if (this._prog) gl.deleteProgram(this._prog);
        }
        if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
        this._wordCache.clear();
    }

    // ── 내부 ──────────────────────────────────────────────────────────────────

    _resize() {
        if (!this._canvas) return;
        // mycelium.js와 동일하게 DPR 2로 캡 — 그 이상은 체감 선명도 대비 비용만 커짐.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // "논리적"(CSS px) 크기는 따로 저장해둠 — sylSize/PAD_X/MIN_DIST 등 이
        // 파일의 모든 픽셀 단위 계산이 CSS px 기준이라, u_resolution도 반드시
        // 이 값을 써야 함(캔버스의 실제 backing store 해상도인 this._canvas.width
        // 를 쓰면 좌표계가 dpr배 어긋나서 전부 왼쪽 위 구석으로 쪼그라듦).
        // backing store만 dpr배로 키우면 클립 공간(-1~1)은 그대로인 채 GPU가
        // 더 많은 실제 픽셀에 래스터라이즈해주는 거라, 이 파일의 나머지 코드는
        // 하나도 안 건드려도 선명도만 올라간다.
        this._cssWidth = window.innerWidth;
        this._cssHeight = window.innerHeight;
        this._canvas.width = Math.round(this._cssWidth * dpr);
        this._canvas.height = Math.round(this._cssHeight * dpr);
        this._gl?.viewport(0, 0, this._canvas.width, this._canvas.height);
    }

    _estimateSylSize(positions) {
        if (positions.length < 2) return DEFAULT_SYL_SIZE;
        const dx = Math.abs(positions[1][0] - positions[0][0]) * window.innerWidth;
        return dx > 10 ? dx : DEFAULT_SYL_SIZE;
    }

    // 음절 배열 → 줄/단어로 그룹핑 후, 단어별 point set을 syncWord()로 갱신.
    // 사용되지 않게 된 wordId(입력에서 사라진 단어)는 캐시에서 제거.
    _syncRows(sylItems, positions, JAMO) {
        const lines = [];
        let curLine = [],
            prevY = -1;
        for (let i = 0; i < sylItems.length; i++) {
            const py = positions[i][1];
            if (prevY >= 0 && Math.abs(py - prevY) > 0.05) {
                lines.push(curLine);
                curLine = [];
            }
            curLine.push({ syl: sylItems[i], pos: positions[i] });
            prevY = py;
        }
        if (curLine.length > 0) lines.push(curLine);

        const seenWordIds = new Set();
        this._rows = lines.map(line => {
            const words = [];
            let cur = [];
            for (const item of line) {
                if (cur.length > 0 && item.syl.wordId !== cur[cur.length - 1].syl.wordId) {
                    words.push(cur);
                    cur = [];
                }
                cur.push(item);
            }
            if (cur.length > 0) words.push(cur);

            return words.map(wordItems => {
                const wordId = wordItems[0].syl.wordId;
                seenWordIds.add(wordId);
                return syncWord(this._wordCache, wordId, wordItems, JAMO, this._sylSize);
            });
        });

        for (const [key, wordState] of Array.from(this._wordCache.entries())) {
            if (!seenWordIds.has(key)) {
                if (wordState._glTex) this._gl?.deleteTexture(wordState._glTex);
                this._wordCache.delete(key);
            }
        }
    }

    _animate = timestamp => {
        this._raf = requestAnimationFrame(this._animate);
        if (timestamp - this._lastFrame < this._FRAME_INTERVAL) return;
        this._lastFrame = timestamp;
        this._flashPhase += 0.08;

        // CA step — signal.js와 동일 cadence(STEP_INTERVAL)
        if (this._active && timestamp - this._lastStep >= this._STEP_INTERVAL) {
            this._lastStep = timestamp;
            this._stepCount++;
            for (const row of this._rows) for (const wordState of row) stepWord(wordState);
        }

        // 셀 크기(weight) 보간 — brightness와 분리, 매 프레임 진행.
        // 값이 계속 움직이는(또는 CA step으로 방금 바뀐) 단어만 텍스처를
        // 다시 GPU에 올림 — 애니메이션이 멈추면 업로드도 멈춘다.
        for (const row of this._rows) {
            for (const wordState of row) {
                let moving = wordState._needsUpload;
                for (const p of wordState.points) {
                    const before = p.currentScale;
                    p.currentScale += (p.targetScale - p.currentScale) * SCALE_EASE;
                    if (Math.abs(p.currentScale - before) > 1e-3) moving = true;
                }
                if (moving) {
                    uploadWordData(this._gl, wordState, this._flashPhase);
                    wordState._needsUpload = false;
                }
            }
        }

        this._draw();
    };

    _draw() {
        const gl = this._gl;
        if (!gl) return;
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this._prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        // 캔버스 backing store(this._canvas.width/height, dpr배 확대됨)가 아니라
        // 논리적 CSS px 크기를 넘김 — _resize()의 주석 참고.
        gl.uniform2f(
            this._uniforms.resolution,
            this._cssWidth ?? this._canvas.width,
            this._cssHeight ?? this._canvas.height,
        );
        gl.uniform1f(this._uniforms.gapPx, GAP_PX);
        gl.uniform1f(this._uniforms.corner, CORNER_ROUND);
        gl.uniform1f(this._uniforms.cutoff, EDGE_CUTOFF);
        gl.uniform1f(this._uniforms.sylSize, this._sylSize);
        gl.uniform1f(this._uniforms.globeRadius, this._sylSize * GLOBE_RADIUS_RATIO);
        gl.uniform1f(this._uniforms.warpPower, WARP_POWER);
        gl.uniform1f(this._uniforms.globeStyle, GLOBE_STYLE);
        gl.uniform1f(this._uniforms.haloExtra, HALO_EXTRA);
        gl.uniform1f(this._uniforms.cellSize, MIN_DIST);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(this._uniforms.data, 0);

        const sylW = this._sylSize;
        const lineH = sylW * this.lineHeightRatio;
        const PAD_X = sylW * 0.5;
        const PAD_Y = 40;
        const gapPx = sylW * WORD_GAP_RATIO;

        for (let li = 0; li < this._rows.length; li++) {
            const row = this._rows[li];
            const baseY = PAD_Y + sylW + li * lineH;
            let curX = PAD_X;

            for (let wi = 0; wi < row.length; wi++) {
                const wordState = row[wi];
                const ox = curX;
                const oy = baseY - sylW;

                this._drawWord(gl, wordState, ox, oy, sylW);

                curX += wordState.syllables.length * sylW;
                if (wi < row.length - 1) curX += gapPx; // 단어 사이 여백(흰 배경 그대로 노출)
            }
        }
    }

    _drawWord(gl, wordState, ox, oy, sylW) {
        const n = wordState.points.length;
        if (n === 0 || !wordState._glTex) return;
        const w = wordState.syllables.length * sylW;
        const h = sylW;

        gl.bindTexture(gl.TEXTURE_2D, wordState._glTex);
        gl.uniform2f(this._uniforms.origin, ox, oy);
        gl.uniform2f(this._uniforms.size, w, h);
        gl.uniform1i(this._uniforms.count, Math.min(n, MAX_PTS));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
