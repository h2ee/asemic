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
const MIN_DIST = 12; // presets(MIN_DIST:12|SYL_SIZE:180) (MIN_DIST:22|SYL_SIZE:250) (MIN_DIST:8|SYL_SIZE:120)

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
const JUNG_SCALE = 0.8;
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

// "구체(globe)" 왜곡 — 음절 하나하나가 스퀘어클(squircle) 실루엣으로 잘려서, 단어
// 전체가 음절 개수만큼 이어붙은 작은 구슬들의 사슬(레퍼런스 이미지)처럼 보이게 함.
// 구현은 전부 아래 SQUIRCLE_* / radialWarp() / gain() 쪽 — appendSyllable()에서
// site 위치·크기에 베이크되고, 셰이더는 그 결과(row0.w/row1.w)를 읽기만 함.
//
// ⚠️ 폐기된 접근 두 가지(기록용):
//  1. weight(power-diagram 크기 파라미터)에 위치 기반 감쇠를 곱하기 — 셀 경계는
//     "이웃끼리의 상대적 weight 차이"로만 정해져서, 옆 셀들이 다같이 비슷하게 낮은
//     weight를 받으면 경계가 거의 안 움직임(뚜렷한 차이엔 반응, 완만한 필드엔 무반응).
//  2. `GLOBE_STYLE` 토글로 (0) 크리스프 원형 클리핑 / (2) 스퀘어클 두 방식 병행 —
//     2026-08-27에 스퀘어클을 최종안으로 확정하고 style 0(및 GLOBE_RADIUS_RATIO /
//     HALO_EXTRA / u_globeStyle / u_globeRadiusRatio / u_haloExtra)을 전부 제거함.

// ── 음절 센터 radial gradient (셀 뒤에 깔리는 배경 레이어) ────────────────────
// 각 음절 중심이 배경(BG_GRAY)보다 살짝 밝고 바깥으로 갈수록 배경색으로 페이드 —
// "구슬 하나하나에 은은한 halo"가 지는 느낌. 셀 색은 이 배경 위에 mix로 얹힘.
const BG_GRAY = 0.25; // 배경 회색 — 기존 코드 곳곳의 vec3(0.75)/clearColor와 같은 값
const SYL_GRADIENT_STRENGTH = 0.94; // 중심에서 배경 대비 밝기 증가량 (0이면 gradient 꺼짐)
const SYL_GRADIENT_RADIUS_RATIO = 0.45; // gradient 반경 / min(음절 width, height)
const SYL_GRADIENT_FALLOFF = 1.6; // 페이드 곡선 exponent — 클수록 밝기가 중심 근처에 집중

// ── 셀 내부 미세 radial gradient (컬러 모드 전용) ─────────────────────────────
// 각 셀이 site 중심에선 원래 색, 바깥으로 갈수록 색이 변함 — 평평한 모자이크
// 대신 낱개 셀에 볼륨감. mono(BLINK) 모드엔 적용 안 됨. SAT/DEPTH 둘 다 cellT로
// 구동되며 각각 0이면 그 항만 꺼짐(둘 다 켜서 섞어도 됨).
const CELL_GRADIENT_SAT = 10.85; // 셀 가장자리에서 채도를 얼마나 올릴지 (0=off, 음수면 탈채도)
const CELL_GRADIENT_DEPTH = 0.0; // 셀 가장자리에서 명도를 얼마나 내릴지 (0=off, 1=검정, 음수면 밝아짐)
const CELL_GRADIENT_RADIUS_RATIO = 1.2; // 색 변화 기준 반경 / 셀 크기(√weight)
const CELL_GRADIENT_FALLOFF = 1.5; // 곡선 exponent — 클수록 가장자리 쪽에만 변화 집중

// ── squircle 실루엣 (p5.js 레퍼런스 포팅, 2026-08-27 최종안) ──────────────────
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

// ⚠️ (제거됨) "전략3 — 공간 자체를 warp해서 셀을 비등방으로 찌그러뜨림": query
// 픽셀과 site 양쪽에 같은 가역 변환을 적용하면 순/역방향 자코비안이 정확히
// 상쇄돼서 셀 "면적"이 절대 안 변함(모양 비율만 찌그러짐) — "가장자리로 갈수록
// 작아짐"은 원리상 불가능. 실제 축소는 squircle의 gain() 박스 클리핑(면적 비보존,
// 그냥 잘라냄)이 담당. 다시 시도한다면 site 재배치가 아니라 power distance에
// 비등방 메트릭을 직접 곱하는 방식으로.

const WORD_GAP_RATIO = 0.6; // 단어 사이 여백 = sylSize × 이 값 (signal.js의 yeoback 폭과 동일 비율)

// ── CA 전이 규칙 상수 (signal_ca_rework_prompt.md 최종안) ─────────────────────
// 순환 규칙(CHO→JUNG→JONG→CHO) — 전체 이웃 개수 기준 / 방향 이웃 개수 기준, OR로 결합
const CHO_TO_JUNG_ALL_THRESHOLD = 3;
const CHO_TO_JUNG_DIR_THRESHOLD = 1; // 동+남 방향
const JUNG_TO_JONG_ALL_THRESHOLD = 2;
const JUNG_TO_JONG_DIR_THRESHOLD = 1; // 남 방향
const JUNG_TO_CHO_DIR_THRESHOLD = 1; // 동 방향 이웃 중 CHO/BLANK — 규칙1 미발동시에만 체크
const JONG_TO_CHO_ALL_THRESHOLD = 3;
const JONG_TO_CHO_DIR_THRESHOLD = 1; // 동+북 방향

// blank 확산(규칙A) — 비대칭 threshold: 활성 셀일수록 더 많은 blank 이웃이 필요
const BLANK_SPREAD_THRESHOLD_FROM_BLANK = 2;
const BLANK_SPREAD_THRESHOLD_FROM_ACTIVE = 4;
const BLANK_SPREAD_TARGET_COUNT = 2; // 확산 시 blank로 만드는 이웃 개수

// blank 지속 부활(규칙B) — 5스텝 연속 조건 충족 시 발동
const BLANK_REVIVE_STREAK_LENGTH = 5;
const BLANK_REVIVE_NEIGHBOR_THRESHOLD = 3;

// 신호등 셀 밀도(음절당, 최소~최대 포함) — appendSyllable()에서 사용
const SIGNAL_DENSITY_MIN = 2;
const SIGNAL_DENSITY_MAX = 3;

// ── 신호등 플래싱 사이클 — 음절(lattice) 단위 자율 상태 순환 ─────────────────────
// RGB 색상 분석과 무관한 독립 타이머. 음절 생성 순간부터 무한 반복:
// NORMAL(초록, 원본 CA 렌더링 그대로) → BLINK(노랑, 모노↔원본 교차 노출)
// → FREEZE(빨강, CA 전이 완전 정지, 렌더링은 그 순간 원본 그대로) → 다시 NORMAL.
const CYCLE_NORMAL_MS = 5000; // 초록 지속시간 — STEP_INTERVAL(140ms)보다 충분히 길어야 인지 가능
const CYCLE_BLINK_MS = 1200; // 노랑(깜박임) 지속시간
const CYCLE_FREEZE_MS = 3000; // 빨강(정지) 지속시간
const CYCLE_TOTAL_MS = CYCLE_NORMAL_MS + CYCLE_BLINK_MS + CYCLE_FREEZE_MS;
const CYCLE_PHASE_STEP_MS = 400; // 음절 인덱스당 사이클 시작 지연 — 신호가 순차적으로 번지는 느낌
const CYCLE_BLINK_RATE_MS = 1200; // BLINK 구간 내 모노/원본 교차 반주기

const PHASE_NORMAL = 0,
    PHASE_BLINK = 1,
    PHASE_FREEZE = 2;

// BLINK 중 노출되는 모노 도형(대각선/X/점) 튜닝값
const MONO_LINE_THICKNESS_RATIO = 0.04; // 대각선/X 두께 / u_cellSize(MIN_DIST)
const MONO_DOT_RADIUS_RATIO = 0.04; // BLANK 점 반경 / u_cellSize(MIN_DIST)
const MONO_BORDER_THICKNESS_RATIO = 0.08; // 셀 테두리 두께 / u_cellSize(MIN_DIST)

// 한 draw call(=단어 하나)에 실릴 수 있는 최대 음절 수 — 신호등 사이클 타이밍(u_sylPhaseStart[])
// 셰이더 uniform 배열 정적 상한. 이 값을 넘는 음절은 항상 마지막 슬롯을 재사용함(clamp).
// (도형 자체는 셀 단위라 이 상한과 무관 — MAX_PTS가 그쪽 상한.)
const MAX_SYL_UNIFORM = 48;

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

    if (state === CHO) g = Math.min(255, Math.round(g * 1.7));
    if (state === JUNG) {
        r = Math.min(255, Math.round(r * 1.7));
        g = Math.min(255, Math.round(g * 1.7));
    }
    if (state === JONG) r = Math.min(255, Math.round(r * 1.7));

    return [r, g, b];
}

const SIGNAL_COLORS = [
    [0xff, 0x31, 0x1e],
    [0x19, 0xf8, 0x00],
    [0xff, 0xf2, 0x00],
];

// SIGNAL_COLORS 인덱스 ↔ state 매핑 — 신호등 셀은 색과 state를 생성 시점에 함께 확정
// (빨강→JONG, 초록→CHO, 노랑→JUNG). appendSyllable()에서 사용.
const SIGNAL_STATE_FOR_COLOR = [JONG, CHO, JUNG];

// ⚠️ 미사용/폐기된 접근 — p.flash/p.flashTimer와 아래 fv===1/fv===2 알파블렌드 분기는
// 구버전에서 이식된 flash 인프라. 새 신호등 플래싱은 셰이더의 사이클(u_time/u_sylPhaseStart,
// 위 main() 참고) 방식으로 대체됐고 p.flash는 이제 어디서도 0이 아닌 값으로 세팅되지 않음.
// 임의 삭제 금지 원칙에 따라 보존, 삭제 여부는 사용자 확인 후 결정.
// 포인트 하나의 RGB (fv===0 분기만 실질적으로 쓰임)
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
    if (p.state === JONG) return meta.jongEntry ?? meta.choEntry; // 종성 없는 음절은 CA상 JONG이 될 수 없어야 함 — 도달 시 이상 상황
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
        _sylPhaseStart: new Float32Array(MAX_SYL_UNIFORM), // 신호등 플래싱 사이클 타이밍 — uploadWordData()에서 채움
        _sylCount: 0,
    };
}

// 한 단어의 음절별 폭/높이 누적 유틸 — 음절마다 크기가 달라서(shelf 레이아웃)
// "sylIndex * sylSize"류 계산을 전부 이 누적합으로 대체해야 함.
function wordWidth(wordState) {
    let w = 0;
    for (const s of wordState.syllables) w += s.w;
    return w;
}
function wordHeight(wordState) {
    let h = 0;
    for (const s of wordState.syllables) if (s.h > h) h = s.h;
    return h;
}
// 새 음절의 point들을 word에 append (기존 점은 그대로 유지)
// sylW/sylH = 이 음절 lattice의 픽셀 폭/높이(main.js calcShelfLayout이 포먼트로 계산).
// 생략되면 sylSize 정사각으로 fallback.
function appendSyllable(wordState, syl, sylIndex, JAMO, sylSize, sylW, sylH) {
    sylW = sylW ?? sylSize;
    sylH = sylH ?? sylSize;
    const jungEntry = JAMO[syl.jung];
    const choEntry = JAMO[syl.cho]?.cho ?? JAMO[syl.cho];
    const jongEntry = syl.jong ? (JAMO[syl.jong + '_jong'] ?? JAMO[syl.jong]) : null;
    const type = getPatternType(syl.jung, syl.jong, JAMO);
    const sylMeta = {
        choEntry,
        jungEntry,
        jongEntry,
        type,
        cho: syl.cho,
        jung: syl.jung,
        jong: syl.jong,
        w: sylW,
        h: sylH,
    };
    // 신호등 사이클 시작 시각 — sylIndex가 늦을수록 뒤로 미뤄서 순차 전파 느낌(위 CYCLE_PHASE_STEP_MS)
    sylMeta.cyclePhaseStart = performance.now() + sylIndex * CYCLE_PHASE_STEP_MS;

    // 이전 음절들의 누적 너비 (현재 음절은 아직 push 전이므로 그대로 합산)
    const offsetX = wordWidth(wordState);
    wordState.syllables.push(sylMeta);

    const raw = jitteredGridSample(sylW, sylH, MIN_DIST, JITTER);

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

    // 신호등 랜덤 셀: 음절당 SIGNAL_DENSITY_MIN~MAX개
    const densityRange = SIGNAL_DENSITY_MAX - SIGNAL_DENSITY_MIN + 1;
    const signalCount = Math.min(SIGNAL_DENSITY_MIN + Math.floor(Math.random() * densityRange), newLocal.length);
    const signalIdx = new Set();
    while (signalIdx.size < signalCount) signalIdx.add(Math.floor(Math.random() * newLocal.length));

    newLocal.forEach(([x, y], i) => {
        const nx = (x - offsetX) / sylW;
        const ny = y / sylH;
        // originalState = 생성 시점 패턴 배정값, 부활(규칙A/B) 시 이 값으로 복귀
        const originalState = patternState(type, nx, ny); // 패턴 배정은 항상 원래(비압축) 격자 위치 기준
        // isBackground = 패턴 상 "여백"으로 남은 점(originalState===BLANK) — CA 트리거/부활 대상 제외
        const isBackground = originalState === BLANK;
        const isSignal = signalIdx.has(i);

        // 신호등 셀: 색 인덱스와 state를 여기서 함께 확정 — SIGNAL_STATE_FOR_COLOR와 항상 일치
        let state = originalState;
        let signalColor = null;
        if (isSignal) {
            const colorIdx = Math.floor(Math.random() * SIGNAL_COLORS.length);
            signalColor = SIGNAL_COLORS[colorIdx];
            state = SIGNAL_STATE_FOR_COLOR[colorIdx];
        }

        const targetScale = isSignal ? SIGNAL_SCALE : (STATE_SCALE[state] ?? BLANK_SCALE);

        // 실제 렌더/CA에 쓰이는 site 위치 자체를 squircle로 압축 — 격자를 [-1,1]²로
        // 정규화 → radialWarp(방사형 압축) → 다시 이 음절의 실제 sylW×sylH 박스로 되돌림.
        const gx = nx * 2 - 1,
            gy = ny * 2 - 1;
        // 크기(Cx, Cy)는 반드시 압축 "전" 원본 격자 좌표(gx,gy)로 계산 — radialWarp된
        // 위치로 계산하면 "바깥쪽 셀이 과하게 사라지는" 버그가 재현됨(SQUIRCLE 주석 참고).
        const tX = Math.max(0, (Math.abs(gx) - SQUIRCLE_T1) / (1 - SQUIRCLE_T1));
        const tY = Math.max(0, (Math.abs(gy) - SQUIRCLE_T1) / (1 - SQUIRCLE_T1));
        const cellCx = 1 - gain(Math.min(1, tX), SQUIRCLE_GAIN_K);
        const cellCy = 1 - gain(Math.min(1, tY), SQUIRCLE_GAIN_K);

        const [wx, wy] = radialWarp(gx, gy);
        // sylW≠sylH면 정규화 원이 그 비율만큼 늘어나 가로/세로로 긴 lattice가 됨.
        const px = offsetX + ((wx + 1) / 2) * sylW;
        const py = ((wy + 1) / 2) * sylH;

        wordState.points.push({
            localX: px,
            localY: py,
            cellCx,
            cellCy,
            sylIndex,
            sylMeta,
            state,
            originalState,
            isBackground,
            blankStreak: 0, // 규칙B용 연속 스텝 카운터 (isBackground면 진행 안 함)
            changedThisStep: false, // 이번 스텝에 이미 전이됐는지 (경합 방지, 매 스텝 리셋)
            isSignal,
            signalColor,
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
    const cols = wordWidth(wordState); // 음절별 폭이 제각각 — 누적합
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
                for (let i = matchLen; i < newCount; i++)
                    appendSyllable(entry, wordItems[i].syl, i, JAMO, sylSize, wordItems[i].w, wordItems[i].h);
                recomputeAdjacency(entry, sylSize);
            }
            return entry;
        }
        // prefix 불일치(중간 수정) 또는 길이 감소 — 통째로 재생성
    }

    entry = createWordState();
    for (let i = 0; i < newCount; i++)
        appendSyllable(entry, wordItems[i].syl, i, JAMO, sylSize, wordItems[i].w, wordItems[i].h);
    recomputeAdjacency(entry, sylSize);
    cache.set(wordId, entry);
    return entry;
}

// 방향 근사 헬퍼 — dirs는 'E'/'S'/'N'/'W' 조합. 화면 y는 아래로 갈수록 증가.
// 여러 방향을 OR로 묶어 "동+남"류 합성 방향을 표현(기존 esJung 로직의 일반화).
function inDirection(p, q, dirs) {
    return dirs.some(d => {
        if (d === 'E') return q.localX > p.localX;
        if (d === 'W') return q.localX < p.localX;
        if (d === 'S') return q.localY > p.localY;
        if (d === 'N') return q.localY < p.localY;
        return false;
    });
}

// 사이클 위상 계산 — sylMeta.cyclePhaseStart 기준 순수 함수. now < cyclePhaseStart(=아직
// 자기 위상 지연 순번이 안 됨)면 elapsed를 0에 고정 — 그 음절은 실제 시작 시각이 될 때까지
// "아직 시작 전"(=NORMAL) 상태로 보임. 이래야 여러 음절이 같은 틱에 한꺼번에 생성돼도
// (예: 붙여넣기) phaseStep이 음수 wrap 없이 "순차적으로 번지는" 효과를 만듦.
// 셰이더에서도 u_time/u_sylPhaseStart로 동일한 공식을 재현함(main() 참고).
function getCyclePhase(now, cycleStart) {
    const elapsed = Math.max(0, now - cycleStart);
    const t = elapsed % CYCLE_TOTAL_MS;
    if (t < CYCLE_NORMAL_MS) return PHASE_NORMAL;
    if (t < CYCLE_NORMAL_MS + CYCLE_BLINK_MS) return PHASE_BLINK;
    return PHASE_FREEZE;
}

function isFrozen(sylMeta, now) {
    return !!sylMeta && getCyclePhase(now, sylMeta.cyclePhaseStart) === PHASE_FREEZE;
}

// ── Word CA step — 이웃을 grid 대신 Delaunay adjacency로 계산 ────────────────
// signal_ca_rework_prompt.md 최종 규칙셋. 결정적(확률 없음) 2-pass 구조:
//  1차 패스 — 각 점이 스텝 시작 시점 상태 기준으로 자기 자신의 전이만 계산
//  (CHO→JUNG→JONG→CHO 순환 + 규칙B 지속 부활).
//  2차 패스 — 규칙A(blank 확산)는 "다른 점의 상태에 쓰기"가 필요해서 분리.
//  우선순위: 순환 전이/규칙B > 규칙A(1차 패스에서 이미 바뀐 타겟은 안 덮어씀).
function stepWord(wordState, now) {
    const pts = wordState.points;
    const n = pts.length;
    if (n === 0) return;

    const nextState = new Array(n);

    // ── 1차 패스: 순환 규칙 + 규칙B(지속 부활) ──────────────────────────────
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        nextState[i] = p.state;
        p.changedThisStep = false; // 매 스텝 리셋

        // 신호등 사이클이 FREEZE(빨강)면 이 음절은 전이/밝기 전부 그 순간 그대로 정지
        // (리셋 없음 — freeze 풀리면 멈췄던 지점에서 그대로 재개)
        if (isFrozen(p.sylMeta, now)) continue;

        const nbIdx = p.neighbors ?? [];
        const st = p.state;

        // 규칙6: blank 이웃 있으면 brightness ×1.1 (최대 2.5배) — 신호등 셀 포함, 전이와 무관
        if (st !== BLANK) {
            const hasBlank = nbIdx.some(j => pts[j].state === BLANK);
            if (hasBlank) p.brightness = Math.min(p.brightness * 1.1, 2.5);
        }

        if (p.isSignal) continue; // 신호등 셀은 전이 대상에서 제외(카운트에는 정상 포함됨)

        if (st === CHO) {
            let all = 0,
                dir = 0;
            for (const j of nbIdx) {
                const q = pts[j];
                if (q.state === JUNG) {
                    all++;
                    if (inDirection(p, q, ['E', 'S'])) dir++;
                }
            }
            if (all >= CHO_TO_JUNG_ALL_THRESHOLD || dir >= CHO_TO_JUNG_DIR_THRESHOLD) {
                nextState[i] = JUNG;
                p.changedThisStep = true;
            }
        } else if (st === JUNG) {
            const hasJong = !!p.sylMeta?.jongEntry; // 종성 없는 음절은 JONG 전이 자체가 발동 안 함
            let allJong = 0,
                dirJong = 0;
            if (hasJong) {
                for (const j of nbIdx) {
                    const q = pts[j];
                    if (q.state === JONG) {
                        allJong++;
                        if (inDirection(p, q, ['S'])) dirJong++;
                    }
                }
            }
            if (hasJong && (allJong >= JUNG_TO_JONG_ALL_THRESHOLD || dirJong >= JUNG_TO_JONG_DIR_THRESHOLD)) {
                nextState[i] = JONG;
                p.changedThisStep = true;
            } else {
                // 규칙1이 발동 안 했을 때만 체크: 동 방향 이웃 중 CHO/BLANK가 있으면 CHO로
                let toCho = false;
                for (const j of nbIdx) {
                    const q = pts[j];
                    if ((q.state === CHO || q.state === BLANK) && inDirection(p, q, ['E'])) {
                        toCho = true;
                        break;
                    }
                }
                if (toCho) {
                    nextState[i] = CHO;
                    p.changedThisStep = true;
                }
            }
        } else if (st === JONG) {
            let all = 0,
                dir = 0;
            for (const j of nbIdx) {
                const q = pts[j];
                if (q.state === CHO) {
                    all++;
                    if (inDirection(p, q, ['E', 'N'])) dir++;
                }
            }
            if (all >= JONG_TO_CHO_ALL_THRESHOLD || dir >= JONG_TO_CHO_DIR_THRESHOLD) {
                nextState[i] = CHO;
                p.changedThisStep = true;
            }
        } else if (st === BLANK && !p.isBackground) {
            // 규칙B — 최근 5스텝 연속으로 이웃 BLANK≥3이었으면 originalState로 부활
            const blankCount = nbIdx.reduce((c, j) => c + (pts[j].state === BLANK ? 1 : 0), 0);
            p.blankStreak = blankCount >= BLANK_REVIVE_NEIGHBOR_THRESHOLD ? p.blankStreak + 1 : 0;
            if (p.blankStreak >= BLANK_REVIVE_STREAK_LENGTH) {
                nextState[i] = p.originalState;
                p.changedThisStep = true;
                p.blankStreak = 0;
            }
        }
    }

    // ── 2차 패스: 규칙A — blank 확산(즉시 발동, 이웃 상태에 직접 씀) ─────────
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        // 배경 BLANK/신호등 셀/frozen 음절은 트리거 자격 없음
        if (p.isSignal || p.isBackground || isFrozen(p.sylMeta, now)) continue;

        const nbIdx = p.neighbors ?? [];
        const st = p.state; // 스텝 시작 시점 기준(동시성 유지)
        const blankCount = nbIdx.reduce((c, j) => c + (pts[j].state === BLANK ? 1 : 0), 0);
        const threshold = st === BLANK ? BLANK_SPREAD_THRESHOLD_FROM_BLANK : BLANK_SPREAD_THRESHOLD_FROM_ACTIVE;
        if (blankCount < threshold) continue;

        // 타겟 이웃 선택: 서/북 우선, 부족하면 나머지로 채움(blank→blank 허용, 신호등/frozen 셀 제외)
        const preferred = [];
        const rest = [];
        for (const j of nbIdx) {
            if (pts[j].isSignal || isFrozen(pts[j].sylMeta, now)) continue; // 이 두 종류는 상태가 절대 안 바뀜
            if (inDirection(p, pts[j], ['W', 'N'])) preferred.push(j);
            else rest.push(j);
        }
        const targets = preferred.concat(rest).slice(0, BLANK_SPREAD_TARGET_COUNT);
        for (const j of targets) {
            if (pts[j].changedThisStep) continue; // 우선순위: 순환 전이 > blank 확산
            nextState[j] = BLANK;
        }
        // 트리거한 점 자신이 BLANK 상태였을 때만 자신도 originalState로 복귀
        if (st === BLANK) nextState[i] = p.originalState;
    }

    // ── 적용 ────────────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        if (isFrozen(p.sylMeta, now)) continue; // freeze 중엔 밝기 감쇠도 정지 — "완전 정지" 유지
        if (p.state !== nextState[i]) {
            p.state = nextState[i];
            p.targetScale = p.isSignal ? SIGNAL_SCALE : (STATE_SCALE[p.state] ?? BLANK_SCALE);
        }
        if (p.state !== BLANK) p.blankStreak = 0; // 활성 상태면 카운터 리셋(다음 BLANK부터 재시작)
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
uniform sampler2D u_data; // width=count, height=3 (row0: x,y,weight,cellCx / row1: r,g,b,cellCy / row2: state,-,-,-)
uniform vec2 u_size;    // 단어 사각형 크기(px) — 바깥 테두리를 가상의 변으로 취급할 때 씀
uniform int u_count;
uniform float u_gapPx;
uniform float u_corner; // 모서리 라운딩 반경(px) — smooth-min의 k
uniform float u_cutoff; // 이 거리보다 먼 site는 모서리 계산에서 제외(smin 처짐 방지)
uniform float u_sylSize;   // 음절 기준 크기(px, base) — 이웃 음절 정보가 없을 때 fallback
// 음절별 lattice 기하 — (1) 픽셀이 어느 음절에 속하는지(누적 오프셋 구간 탐색, 신호등
// 플래싱용) (2) 음절 센터 배경 radial gradient의 중심/반경 계산용. 음절마다 폭/높이가
// 달라서 나눗셈 한 번으로는 안 됨.
uniform float u_sylOffsetX[${MAX_SYL_UNIFORM}]; // 각 음절 왼쪽 경계 x (누적합)
uniform float u_sylWidth[${MAX_SYL_UNIFORM}];
uniform float u_sylHeight[${MAX_SYL_UNIFORM}];
uniform float u_cellSize; // squircle 박스 클리핑 — site 하나가 그릴 수 있는 최대 폭/높이(px, MIN_DIST 기준). 모노 도형 크기 기준으로도 씀
uniform float u_time; // 신호등 플래싱용 wall-clock(ms) — JS의 rAF timestamp(performance.now()와 같은 시계)
// 신호등 플래싱 사이클 타이밍 — 음절(=sylIdx) 단위 uniform 배열. 사이클 시작 시각은 음절
// 전체가 공유하는 값이라 점(셀) 개수만큼 중복 저장할 필요 없이 배열 인덱싱이면 충분.
// (BLINK 때 어떤 "도형"을 그릴지는 셀 단위라 이 배열이 아니라 u_data의 row2에서 읽음.)
uniform float u_sylPhaseStart[${MAX_SYL_UNIFORM}];
uniform int u_sylCount;
out vec4 outColor;

#define MAX_PTS ${MAX_PTS}
#define MAX_SYL_UNIFORM ${MAX_SYL_UNIFORM}
// 신호등 플래싱 사이클 상수 — JS 상단 CYCLE_*/MONO_* 상수와 항상 동일해야 함(단일 소스: JS)
#define CYCLE_NORMAL ${CYCLE_NORMAL_MS.toFixed(1)}
#define CYCLE_BLINK ${CYCLE_BLINK_MS.toFixed(1)}
#define CYCLE_TOTAL ${CYCLE_TOTAL_MS.toFixed(1)}
#define CYCLE_BLINK_RATE ${CYCLE_BLINK_RATE_MS.toFixed(1)}
#define MONO_LINE_RATIO ${MONO_LINE_THICKNESS_RATIO.toFixed(3)}
#define MONO_DOT_RATIO ${MONO_DOT_RADIUS_RATIO.toFixed(3)}
#define MONO_BORDER_RATIO ${MONO_BORDER_THICKNESS_RATIO.toFixed(3)}
// 음절 센터 radial gradient — JS 상단 BG_GRAY/SYL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define BG_GRAY ${BG_GRAY.toFixed(4)}
#define SYL_GRAD_STRENGTH ${SYL_GRADIENT_STRENGTH.toFixed(4)}
#define SYL_GRAD_RADIUS_RATIO ${SYL_GRADIENT_RADIUS_RATIO.toFixed(4)}
#define SYL_GRAD_FALLOFF ${SYL_GRADIENT_FALLOFF.toFixed(4)}
// 셀 내부 미세 radial gradient — JS 상단 CELL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define CELL_GRAD_SAT ${CELL_GRADIENT_SAT.toFixed(4)}
#define CELL_GRAD_DEPTH ${CELL_GRADIENT_DEPTH.toFixed(4)}
#define CELL_GRAD_RADIUS_RATIO ${CELL_GRADIENT_RADIUS_RATIO.toFixed(4)}
#define CELL_GRAD_FALLOFF ${CELL_GRADIENT_FALLOFF.toFixed(4)}

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
// squircle 크기 축소 곡선을 그대로 포팅. x=0→0, x=1→1이면서 k가 클수록
// x=0.5 부근에서 더 급격하게 꺾이는 S자 커브.
float gain(float x, float k) {
    float p = 0.16;
    float a = p * pow(2.0 * ((x < p) ? x : 1.0 - x), k);
    return (x < p) ? a : 1.0 - a;
}

void main() {
    // 이 픽셀이 속한 음절 — 음절 폭이 제각각이라 나눗셈 대신 누적 오프셋 구간 탐색.
    // (음절 수는 MAX_SYL_UNIFORM 이하로 적어서 선형 순회 비용 무시 가능.)
    int sylI = 0;
    for (int s = 0; s < MAX_SYL_UNIFORM; s++) {
        if (s >= u_sylCount) break;
        if (v_local.x >= u_sylOffsetX[s]) sylI = s;
    }
    float sylIdx = float(sylI);
    float sylW_i = u_sylWidth[sylI] > 0.0 ? u_sylWidth[sylI] : u_sylSize;
    float sylH_i = u_sylHeight[sylI] > 0.0 ? u_sylHeight[sylI] : u_sylSize;
    // point 생성 시 py = ((wy+1)/2)*sylH — 음절은 단어 박스 상단 정렬. 중심 y = sylH_i*0.5.
    vec2 sylCenter = vec2(u_sylOffsetX[sylI] + sylW_i * 0.5, sylH_i * 0.5);

    // 음절 센터 radial gradient — 셀 뒤에 깔리는 배경. 중심이 BG_GRAY보다 밝고
    // 바깥으로 페이드(격자를 그리기 전 단계). 셀 색은 아래에서 이 bg 위에 mix됨.
    float gradR = max(min(sylW_i, sylH_i) * SYL_GRAD_RADIUS_RATIO, 1.0);
    float gradT = pow(clamp(1.0 - length(v_local - sylCenter) / gradR, 0.0, 1.0), SYL_GRAD_FALLOFF);
    vec3 bg = vec3(BG_GRAY + SYL_GRAD_STRENGTH * gradT);

    // 1st pass — power distance가 가장 작은 site(best) 찾기
    float best = 1e12;
    int bestIdx = 0;
    vec2 bestPos = vec2(0.0);
    float bestW = 0.0;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz; // x, y, weight
        vec2 d = v_local - pw.xy;
        float dist = dot(d, d) - pw.z; // power distance
        if (dist < best) {
            best = dist;
            bestIdx = i;
            bestPos = pw.xy;
            bestW = pw.z;
        }
    }

    // 2nd pass — best와 각 이웃 사이의 power-diagram 경계선(radical axis)까지
    // 실제 수직거리를 구해서 smooth-min으로 합침 (모서리 라운딩의 핵심).
    // 경계선 공식: dot(p - mid, n̂) = -(w_j - w_best) / (2*|s_j - s_best|)
    // 인 직선이 site best/j의 power-diagram bisector — 그 직선까지의
    // signed 거리(양수 = p가 best 쪽 안에 있음)를 아래 d로 계산.
    float edgeDist = 1e12;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        if (i == bestIdx) continue;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz;
        if (length(pw.xy - texelFetch(u_data, ivec2(bestIdx, 0), 0).xy) > u_cutoff) continue;
        vec2 n = pw.xy - bestPos;
        float nlen = length(n);
        if (nlen < 1e-4) continue;
        vec2 nHat = n / nlen;
        vec2 mid = 0.5 * (bestPos + pw.xy);
        float d = dot(mid - v_local, nHat) - (pw.z - bestW) / (2.0 * nlen);
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

    // ── squircle 실루엣 (2026-08-27 최종안) — p5.js 레퍼런스의 "가로/세로 독립
    // 축소". Cx(너비 배율)/Cy(높이 배율)는 여기서 다시 계산하지 않고 CPU에서 압축
    // "전" 원본 격자 좌표로 미리 계산해 텍스처에 실어둔 값을 그대로 읽는다
    // (row0.w, row1.w — appendSyllable() 참고. 압축된 site 위치 기준으로 다시 계산하면
    // 바깥쪽 셀이 과하게 사라짐). "이 site는 최대 Cx*u_cellSize 너비 / Cy*u_cellSize
    // 높이짜리 상자 안에서만 그려질 수 있다"는 축(axis)별 박스 클리핑을 edgeDist에
    // smin으로 접어 넣음 — Voronoi 셀 모양 자체를 안 건드리고 위에 상자를 겹쳐
    // 씌우는 방식이라, |x_g|만 threshold를 넘으면 너비만, 둘 다 넘는 모서리 site는
    // 상자 자체가 작아져서 상하좌우 다 줄어든다.
    float Cx = bestRow0.w * 1.4;
    float Cy = bestRow1.w * 1.4;
    float halfW = u_cellSize * 0.5 * Cx;
    float halfH = u_cellSize * 0.5 * Cy;
    float boxClipX = halfW - abs(v_local.x - bestPos.x);
    float boxClipY = halfH - abs(v_local.y - bestPos.y);
    edgeDist = smin(edgeDist, boxClipX, u_corner);
    edgeDist = smin(edgeDist, boxClipY, u_corner);

    // 경계에 가까울수록(=edgeDist가 작을수록) 배경 쪽으로 섞어서 LED 픽셀 같은
    // 셀 간 gap을 만듦 (CPU 폴리곤 축소 대신 per-pixel로 처리)
    float edge = smoothstep(0.0, u_gapPx, edgeDist);
    // ── 셀 내부 미세 radial gradient (컬러 모드 전용) — site 중심은 원래 색,
    // 바깥으로 갈수록 채도↑(CELL_GRAD_SAT) 그리고/또는 명도↓(CELL_GRAD_DEPTH).
    // 낱개 셀에 볼륨감을 줌. 셀 크기는 제각각(weight)이라 기준 반경을
    // sqrt(bestW)(≈currentScale×MIN_DIST)에 맞춤. mono(BLINK) 모드는 아래에서
    // finalColor를 통째로 덮으므로 영향 없음.
    float cellRef = max(sqrt(max(bestW, 1.0)) * CELL_GRAD_RADIUS_RATIO, 1.0);
    float cellT = pow(clamp(length(v_local - bestPos) / cellRef, 0.0, 1.0), CELL_GRAD_FALLOFF);
    // 채도: luma(무채색)에서 color를 밀어냄 — factor>1이면 채도↑. 명도: 곱 감쇠.
    float cellLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 cellShaded = mix(vec3(cellLuma), color, 1.0 + CELL_GRAD_SAT * cellT);
    cellShaded *= (1.0 - CELL_GRAD_DEPTH * cellT);
    cellShaded = clamp(cellShaded, 0.0, 1.0);

    vec3 finalColor = mix(bg, cellShaded, edge); // bg = 음절 센터 radial gradient (NORMAL/FREEZE 구간엔 이대로)

    // ── 신호등 플래싱 — sylIdx(이 픽셀이 속한 음절)의 NORMAL/BLINK/FREEZE를
    // u_sylPhaseStart[]로 계산. FREEZE는 별도 오버레이 없음(멈춘 순간의 CA 렌더링
    // 자체가 신호이므로 위 finalColor 그대로 노출). BLINK만 아래 모노 카드와 교차
    // 노출됨. now < 시작시각이면(=아직 그 위상 순번이 안 됨) elapsed를 0에 고정 —
    // JS getCyclePhase()와 동일한 공식(다른 소스 두 곳이 어긋나지 않게 유지).
    int sylIdxI = clamp(int(sylIdx), 0, u_sylCount - 1);
    float elapsed = max(0.0, u_time - u_sylPhaseStart[sylIdxI]);
    float cyclePhase = mod(elapsed, CYCLE_TOTAL);
    bool isBlink = cyclePhase >= CYCLE_NORMAL && cyclePhase < CYCLE_NORMAL + CYCLE_BLINK;
    bool showMono = isBlink && mod(cyclePhase, CYCLE_BLINK_RATE * 2.0) < CYCLE_BLINK_RATE;

    if (showMono) {
        // 모노 도형 — 셀(점) 하나하나가 색 대신 흑백 도형으로 바뀜. NORMAL 모드와 정확히
        // 같은 입자 단위(bestIdx가 가리키는 그 site) 유지 — 즉 지금 컬러풀한 모자이크가
        // 나오는 자리에 그대로 겹쳐서 색만 무채색+도형으로 바뀌는 것. bestPos(이 셀의 site
        // 위치) 기준 로컬 좌표로 그리고, state는 u_data row2에서 이 site의 실제 CA 상태를
        // 읽음(u_sylPhaseStart와 달리 이건 음절 전체가 아니라 셀마다 다름).
        // 셀 사이 구분: NORMAL과 같은 edge(gap 블렌드) 위에, 참고 이미지의 "둥근 사각형
        // 타일" 느낌을 살리려고 아주 얇은 테두리(MONO_BORDER_RATIO)를 셀 경계(edgeDist≈0)에
        // 추가로 얹음. 첫 시도 때는 이 테두리가 두꺼워서(그리고 도형 자체도 두꺼워서) 수십~
        // 백여 개가 겹쳐 노이즈가 됐었는데, 지금은 도형/테두리 둘 다 셀 크기 대비 훨씬
        // 얇게 잡아서 낱개 타일처럼 또렷하게 보이는 쪽을 노림.
        vec3 stateRow = texelFetch(u_data, ivec2(bestIdx, 2), 0).xyz;
        float st = stateRow.x;
        vec2 local = v_local - bestPos;
        float linePx = MONO_LINE_RATIO * u_cellSize;
        float shape;
        if (st < 0.5) {
            shape = length(local) - MONO_DOT_RATIO * u_cellSize;
        } else if (st < 1.5) {
            shape = abs(dot(local, normalize(vec2(1.0, -1.0))));
        } else if (st < 2.5) {
            shape = abs(dot(local, normalize(vec2(1.0, 1.0))));
        } else {
            float d1 = abs(dot(local, normalize(vec2(1.0, 1.0))));
            float d2 = abs(dot(local, normalize(vec2(1.0, -1.0))));
            shape = min(d1, d2);
        }
        float shapeMask = 1.0 - smoothstep(0.0, linePx, shape);
        float borderPx = MONO_BORDER_RATIO * u_cellSize;
        float borderMask = 1.0 - smoothstep(0.0, borderPx, abs(edgeDist));
        vec3 cellBG = vec3(1.0);
        vec3 cellMono = mix(cellBG, vec3(0.0), max(shapeMask, borderMask));
        finalColor = mix(bg, cellMono, edge); // NORMAL과 동일한 gap 블렌딩 재사용
    }

    outColor = vec4(finalColor, 1.0);
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

// wordState.points의 현재 상태(x,y,weight,color,state)를 RGBA32F 텍스처로 GPU에 올림.
// 매 프레임 하지 않음 — _needsUpload가 true인(움직이는 중이거나 방금 CA step이
// 지나간) 단어에서만 호출됨. 신호등 플래싱 사이클 타이밍 배열(_sylPhaseStart)도 여기서
// 같이 갱신(음절 수가 바뀔 수 있으므로).
function uploadWordData(gl, wordState, flashPhase) {
    const pts = wordState.points;
    const n = pts.length;
    if (n === 0) return;
    const data = new Float32Array(n * 3 * 4); // row0: xy+weight+cellCx, row1: rgb+cellCy, row2: state,-,-,-
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        data[i * 4 + 0] = p.localX;
        data[i * 4 + 1] = p.localY;
        data[i * 4 + 2] = p.currentScale * WEIGHT_SCALE;
        data[i * 4 + 3] = p.cellCx ?? 1; // squircle Cx — appendSyllable()에서 압축 전 좌표로 미리 계산해둔 값

        const [r, g, b] = pointColor(p, flashPhase);
        const base = n * 4 + i * 4;
        data[base + 0] = r / 255;
        data[base + 1] = g / 255;
        data[base + 2] = b / 255;
        data[base + 3] = p.cellCy ?? 1; // 위와 짝 — row1의 빈 alpha 채널을 재사용

        // row2 — BLINK 모노 도형용: 이 셀의 현재 CA state(0~3). 셰이더는 bestIdx(=픽셀이
        // 속한 셀의 site)일 때만 읽어서 셀 단위로 다른 도형(\/X·)을 고른다.
        const base2 = n * 8 + i * 4;
        data[base2 + 0] = p.state;
        data[base2 + 1] = 0;
        data[base2 + 2] = 0;
        data[base2 + 3] = 0;
    }

    if (!wordState._glTex) wordState._glTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, wordState._glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, 3, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    wordState._texCount = n;

    // 신호등 플래싱 사이클 타이밍 — 음절당 값 하나씩(cyclePhaseStart는 생성 시 고정).
    // MAX_SYL_UNIFORM을 넘는 음절은 마지막 슬롯 값을 그대로 재사용(clamp) — 셰이더의
    // `clamp(int(sylIdx), 0, u_sylCount-1)`과 짝을 맞추기 위해 u_sylCount 자체도 clamp.
    const sylCount = Math.min(wordState.syllables.length, MAX_SYL_UNIFORM);
    wordState._sylPhaseStart = new Float32Array(MAX_SYL_UNIFORM);
    for (let i = 0; i < sylCount; i++) {
        wordState._sylPhaseStart[i] = wordState.syllables[i].cyclePhaseStart;
    }
    wordState._sylCount = sylCount;
}

// ── SignalReceiver ──────────────────────────────────────────────────
export class SignalReceiver {
    constructor() {
        this.lineHeightRatio = 1.0;
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
            sylOffsetX: gl.getUniformLocation(this._prog, 'u_sylOffsetX'),
            sylWidth: gl.getUniformLocation(this._prog, 'u_sylWidth'),
            sylHeight: gl.getUniformLocation(this._prog, 'u_sylHeight'),
            cellSize: gl.getUniformLocation(this._prog, 'u_cellSize'),
            time: gl.getUniformLocation(this._prog, 'u_time'),
            sylPhaseStart: gl.getUniformLocation(this._prog, 'u_sylPhaseStart'),
            sylCount: gl.getUniformLocation(this._prog, 'u_sylCount'),
        };

        this._resize();
        window.addEventListener('resize', () => this._resize());
        this._raf = requestAnimationFrame(this._animate);
    }

    // @param sylItems   isSpace 제외 음절 배열
    // @param positions  0~1 uv 위치 배열
    // @param JAMO       자모 데이터
    // @param sylSize    음절 픽셀 기준 크기(base)
    // @param widths     음절별 lattice 폭(px) 배열 — main.js calcShelfLayout이 계산
    // @param heights    음절별 lattice 높이(px) 배열
    update(sylItems, positions, JAMO, sylSize, widths, heights) {
        this._JAMO = JAMO;
        this._sylItems = sylItems;
        this._positions = positions;
        this._sylSize = sylSize ?? this._estimateSylSize(positions);
        this._widths = widths ?? null;
        this._heights = heights ?? null;

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
            curLine.push({
                syl: sylItems[i],
                pos: positions[i],
                w: this._widths?.[i] ?? this._sylSize,
                h: this._heights?.[i] ?? this._sylSize,
            });
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
        this._time = timestamp; // 신호등 사이클용 wall-clock — appendSyllable()의 cyclePhaseStart와 같은 시계

        // CA step — signal.js와 동일 cadence(STEP_INTERVAL)
        if (this._active && timestamp - this._lastStep >= this._STEP_INTERVAL) {
            this._lastStep = timestamp;
            this._stepCount++;
            for (const row of this._rows) for (const wordState of row) stepWord(wordState, timestamp);
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
        gl.clearColor(BG_GRAY, BG_GRAY, BG_GRAY, 1); // # BG color
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
        gl.uniform1f(this._uniforms.cellSize, MIN_DIST);
        gl.uniform1f(this._uniforms.time, this._time ?? 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(this._uniforms.data, 0);

        const sylW = this._sylSize;
        const PAD_X = sylW * 0.5;
        const PAD_Y = 40;
        const gapPx = sylW * WORD_GAP_RATIO;
        const LINE_GAP = sylW * Math.max(0, this.lineHeightRatio - 1);

        // Shelf 레이아웃 — 줄 높이 = 그 줄 음절 height 최댓값. main.js calcShelfLayout과
        // 같은 규칙(rowTop 누적)이지만 여기선 캐시된 wordState.syllables[].h에서 직접 읽음.
        let rowTop = PAD_Y;
        for (let li = 0; li < this._rows.length; li++) {
            const row = this._rows[li];
            let rowMaxH = 0;
            for (const ws of row) rowMaxH = Math.max(rowMaxH, wordHeight(ws));
            if (rowMaxH === 0) rowMaxH = sylW;

            let curX = PAD_X;
            for (let wi = 0; wi < row.length; wi++) {
                const wordState = row[wi];
                const wH = wordHeight(wordState);
                const ox = curX;
                const oy = rowTop + (rowMaxH - wH) * 0.5; // 줄 안에서 세로 중앙 정렬

                this._drawWord(gl, wordState, ox, oy);

                curX += wordWidth(wordState);
                if (wi < row.length - 1) curX += gapPx; // 단어 사이 여백(흰 배경 그대로 노출)
            }
            rowTop += rowMaxH + LINE_GAP;
        }
    }

    _drawWord(gl, wordState, ox, oy) {
        const n = wordState.points.length;
        if (n === 0 || !wordState._glTex) return;
        const w = wordWidth(wordState);
        const h = wordHeight(wordState);

        // 음절별 누적 x-오프셋 / 폭 / 높이 — 셰이더가 픽셀→음절 매핑(나눗셈 대신 구간 탐색)과
        // 음절별 globe/squircle 중심·반경 계산에 씀.
        const meta = wordState.syllables;
        const nSyl = Math.min(meta.length, MAX_SYL_UNIFORM);
        const offX = new Float32Array(MAX_SYL_UNIFORM);
        const wArr = new Float32Array(MAX_SYL_UNIFORM);
        const hArr = new Float32Array(MAX_SYL_UNIFORM);
        let acc = 0;
        for (let i = 0; i < nSyl; i++) {
            offX[i] = acc;
            wArr[i] = meta[i].w;
            hArr[i] = meta[i].h;
            acc += meta[i].w;
        }

        gl.bindTexture(gl.TEXTURE_2D, wordState._glTex);
        gl.uniform2f(this._uniforms.origin, ox, oy);
        gl.uniform2f(this._uniforms.size, w, h);
        gl.uniform1i(this._uniforms.count, Math.min(n, MAX_PTS));
        gl.uniform1fv(this._uniforms.sylOffsetX, offX);
        gl.uniform1fv(this._uniforms.sylWidth, wArr);
        gl.uniform1fv(this._uniforms.sylHeight, hArr);
        // 신호등 플래싱 사이클 타이밍 — 음절 단위 배열(uploadWordData()에서 채워둔 캐시를 그대로 올림)
        gl.uniform1fv(this._uniforms.sylPhaseStart, wordState._sylPhaseStart);
        gl.uniform1i(this._uniforms.sylCount, Math.max(wordState._sylCount, 1));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
