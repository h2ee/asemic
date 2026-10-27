// ── DandelionReceiver (🌼) ───────────────────────────────────────────────────
//
// 2026-09-25: 구버전 dandelion(3단 궤적 + WebGL2 SDF, 2026-08-31 재설계본)을 폐기하고
// sketch 프로젝트 `04_trail_gl` 의 "마우스 궤적 + GPU 밀도장 goo" 엔진으로 교체했다.
// 구버전이 필요하면 git 이력에서 꺼낼 것.
//
// 엔진 파일들은 `trail/` 에 있다. 원래 sketch 쪽과 '바이트 단위로 동일'하게 유지했으나
// 2026-10-27부터 sketch와 맞추지 않는다 — asemic 쪽에서 직접 고친다(첫 분기: opts.dprCap).
// 디렉터리 이름이 receiver 이름과 다른 건 그 역사 때문이다(엔진은 receiver 가 아니라 "궤적 엔진"이다).
//
// 구조
//   CPU  자모 → 궤적 점 배열(trail/jamoTrail.js) → 리샘플/스무딩/동반 곡선
//   GPU  캡슐 SDF 커널을 누적 텍스처에 스탬프 → 밀도 임계 → 셰이딩 (goo)
//   2D   얇은 크리스프 잉크(점선 companion, 화살촉, 장식 사각형, 단어 윤곽선)만 투명 오버레이에
//
// 캔버스 2장: WebGL2(goo) + 엔진이 만드는 투명 2D 오버레이. 둘 다 dispose() 에서 치우고
// 등록한 리스너·body 배경도 되돌린다 (다른 receiver 로 전환해도 흔적이 남지 않게).
//
// 획 단위 = **단어**. 음절 하나는 경로가 200px 안팎이라 동반 곡선 생성기가 놀 공간이 없다.
// 타이핑 중인 단어는 hold 상태로 자라고, 공백/제출에서 구워진다.

import { createTrail } from './trail/trailgl.js';
import { jamoToTrail, jamoToTrailTurtle, jamoWordTrail, jongEntry } from './trail/jamoTrail.js';

// 자모 → 궤적 생성기 선택. A/B 비교용 — 콘솔에서 rm.current.setGenerator('anchor') 로도 바꾼다.
//   'turtle' (B) 자모가 운동(방향·곡률·속도)을 지시. 경로가 스스로 접혀 호길이가 2~3배
//   'anchor' (A) 자모 좌표를 제어점으로 놓고 스플라인 보간. 얌전하지만 단순
const GENERATOR = 'turtle';

// 뒤에서 몇 음절을 "아직 안 정해진 것"으로 볼지.
//   1 이면 조합 중인 마지막 음절만 — 그런데 한글은 **종성이 다음 글자의 초성으로 넘어간다**:
//   "반가" + ㅇ → "반강" → + ㅜ → "반가우". 이때 이미 그려진 *중간* 음절(강→가)이 바뀌므로
//   안정 구간이 깨져 단어 전체가 다시 그려졌다. 종성 이동은 바로 다음 음절까지만 일어나므로
//   2 면 충분하다. (대가: 마지막 두 음절은 타건마다 다시 만든다 — 그래도 재구성은 0회)
const UNSTABLE_TAIL = 2;

const SYL_SIZE = 110;
const WRAP_STEP = 100; // SYL_SIZE 보다 작게 두면 이웃 음절 궤적이 reach 안에 들어와 goo 로 이어진다
const LINE_HEIGHT_RATIO = 1.8;
// glyphmode scroll 따라가기 — 그린 프레임(24fps 기준)마다 남은 거리의 이만큼. mycelium과 같은 값
const SCROLL_EASE = 0.12;

// 스케치 기본값은 "화면을 가로지르는 긴 마우스 획"(1000px+) 기준이다.
// 음절 하나 = 획 하나면 경로가 200~260px 밖에 안 되므로 길이 계열 파라미터를 줄여야
// 동반 곡선 생성기(루프/방황)가 작동한다. **h2ee 가 튜닝할 자리.**
// orb = 종성 후크 (2026-10-09). 예전 무작위 배치(gap/prob/spread)는 안 쓴다 — 구간마다 orbs 를 지정해서.
//   반지름  중성 F1(250~900Hz) → radius
//   색      초성 x(조음위치 양순→후두) → hue / y(파열→유음) → 채도 / z(울림→거센) → 명도 — 전부 노란 계열 안에서
const ORB_JAMO = {
    at: 0.93, // 음절 구간의 어디에 (후크는 0.85~1)
    // 실선에서 법선 방향으로 (반지름 + off) px 밀어 윤곽 가장자리에 앉힌다 — 실선 위에 두면 이미 윤곽 깊숙한 안이라
    // bulge 가 안 보인다. 쪽은 엔진이 고른다(auto — 실선이 덜 붐비는 쪽, path.js settleSide)
    off: 22,
    f1: [250, 900],
    radius: [7, 22],
    hue: [44, 60], // 진한 노랑 ~ 연두빛 노랑
    sat: [78, 100],
    light: [68, 56],
    // 부채(orb.style 'fan', 2026-10-16) — 초성 조음방법 y(파열 0 → 유음 1) → 살 개수, 긴장도 z(울림 → 거센) → 살 굵기
    rays: [5, 15],
    // 도장 bead(bead.walker) 크기 — 지나는 음절의 초성 긴장도 z(울림 0 → 거센 1) → size px (2026-10-16)
    walkerSize: [3, 7],
    // 성게 가시(orb.spike, 2026-10-16) — 받침이 울림소리(ㄴ ㄹ ㅁ ㅇ, z 0)가 아닐 때 부채 반대편 옆구리에서.
    // 종성 조음위치 x(양순 → 후두) → 가시 개수 / 긴장도 z(예사 → 거센) → 길이 px
    spikeN: [12, 20],
    spikeLen: [18, 38],
    width: [2, 7], // 2026-10-16 두껍게 (예전 1.2~4)
};

// halo 칸 그라데이션 방향 = 음절 중성이 뻗는 쪽 (2026-10-16, halo.gradient.perSyl). 0 왼→오 / 90 위→아래 / 180 / 270
// 겹모음은 앞 글자(ㅘ = ㅗ). 뻗는 쪽이 없는 ㅡ ㅣ ㅢ 는 초성 조음위치 x 를 넷으로(양순 0 · 치조 90 · 경구개 180 · 연구개 270 · 후두 0)
const HALO_VOWEL_DIR = {
    ㅏ: 0,
    ㅑ: 0,
    ㅐ: 0,
    ㅒ: 0,
    ㅓ: 180,
    ㅕ: 180,
    ㅔ: 180,
    ㅖ: 180,
    ㅗ: 270,
    ㅛ: 270,
    ㅘ: 270,
    ㅙ: 270,
    ㅚ: 270,
    ㅜ: 90,
    ㅠ: 90,
    ㅝ: 90,
    ㅞ: 90,
    ㅟ: 90,
};
const HALO_CHO_DIR = [0, 90, 180, 270];
// halo 칸 톤 = 초성 (2026-10-17) — 그라데이션 stops 를 HSL 로 살짝 민다. 조음위치 x(양순 → 후두) → 색상(도),
// 조음방법 y(파열 → 유음) → 채도(%p), 긴장도 z(울림 → 거센) → 명도(%p, 거셀수록 어둡게)
const HALO_TONE = { hue: [-24, 24], sat: [-6, 6], light: [4, -5] };

// ── invert 모드 (2026-10-17) — `?dandelion=invert`. 지금 룩(CFG_OVERRIDE)은 그대로 두고 그 위에 덮는다:
//   초록 그라데이션 halo → 흰 채움 + 초록 외곽선(halo.edge) / 픽셀 goo(보조곡선) 흰색 → 초록 /
//   맨 뒤 흰 어긋난 halo(base) → 원래 halo 의 초록 그라데이션
const INVERT = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dandelion') === 'invert';
const INVERT_INK = '#4c9f4c'; // goo 초록 — halo stops 의 진한 쪽 rgb(76, 159, 76). hex 만 받는다
function cfgForMode() {
    if (!INVERT) return CFG_OVERRIDE;
    const C = CFG_OVERRIDE;
    const G = C.halo.gradient;
    return {
        ...C,
        ink: INVERT_INK,
        halo: {
            ...C.halo,
            fill: 'rgb(255, 255, 255)',
            gradient: { ...G, on: false },
            edge: { on: true, color: G.stops.at(-1)[1], width: 0.3 },
        },
        base: { ...C.base, gradient: { ...G, on: true, whole: false } },
    };
}

// index.html(스탠드얼론) 배경 종이색 — base(흰 채움)와 구분되게 회색
const STANDALONE_PAPER = '#cfcfcc';

const CFG_OVERRIDE = {
    // ink: '#0b5306',
    // goo 를 순백으로 (2026-10-16) — 엔진 기본 shade 2(toon)는 ink 에 명암 계단(amb 0.55~)을 곱해서 흰색도 회색이 된다.
    // shade 0 = 명암 없이 ink 그대로
    ink: '#ffffff',
    shade: 0,
    spacing: 4,
    spineSmooth: -8,

    wanderAmp: [1, 100],
    wanderLen: [120, 240],
    weaveAmp: [6, 14],
    weaveLen: [80, 500],
    eventGap: [55, 60], // 점선 루프가 생기는 간격 : 좁을수록 루프가 많아진다
    swirlSpan: [18, 26],
    swirlRadius: [6, 24],
    compBaseSmooth: 28,
    compStep: 2.5,
    compSmooth: 2,
    headLag: 5,

    decorGap: [5, 70],
    decorSpread: 12,
    decorRadius: [2, 5], // 사각형 반변 길이(px) — 2배로
    decorLineWidth: 0.75, // 윤곽선 굵기 (decorStyle null 이면 안 씀)
    decorStyle: null, // 테두리 없이
    decorFill: 'rgb(255, 253, 222)', // 흰 채움 (2026-10-09)
    arrowSize: 0, // 점선 끝 화살촉 없음 (2026-10-09)
    companionStyle: 'rgb(255, 255, 255)', // 점선(동반 곡선)도 흰색 (2026-10-16, 엔진 기본 검정)
    // 메인 실선 = 흰 몸통 + 검정 테두리 (2026-10-16). width 몸통 굵기, borderWidth 테두리 한쪽 굵기(px)
    spineCasing: { on: true, width: 8.0, borderWidth: 0.3, fill: 'rgb(255, 255, 255)', border: 'rgb(0, 0, 0)' },

    growPx: 14,

    // th: B(터틀)로 오면서 경로가 접혀 밀도가 올라갔다 — 실측 p10(외톨이 선) 1.23 /
    // median 2.29 / p90 3.86. 1.15 로 두면 거의 전 구간이 임계를 넘어 검은 덩어리가 된다.
    goo: {
        reach: [3, 10], // [lo, hi] 로 주면 경로를 따라 lo~hi 를 오간다 (파장 reachLen)
        reachLen: 140,
        th: 1.8,
        edge: 0.004,
        spine: true,
        companion: true,
        fieldScale: 1.5,
        // 점선 자기 겹침 goo 억제 — 0 = 끔(예전), ~1.0 = 점선끼리는 임계를 못 넘고 실선과의 교차만 남는다
        compCap: 0,
        // 픽셀화(CSS px, halo 격자와 같은 원점 — cell 10 의 절반이라 칸이 맞물린다). 0 = 매끈한 metaball
        // pixel: 3,
        // [1, 3] = 12px 블록마다 1·2·3 중 하나 (2026-10-16). pixelVar.scale 노이즈라 이웃 블록끼리 비슷 — 0 이면 블록마다 따로
        pixel: [1, 3],
        pixelVar: { block: 12, scale: 0.02 },
        // 결 — 덩어리를 획과 나란한 가닥으로 가른다. amount 0 = 끔
        //amount: 10.9, freq: 1.2, warp: 0.6, scale: 0.035, width: 0.35
        grain: { amount: 8.9, freq: 1.2, warp: 0.6, scale: 0.035, width: 0.55 },
    },
    grow: { on: false },
    part: { on: false },

    // 윤곽선 — live: 자라는 동안 interval(ms)마다 다시 뽑아 실선과 같이 왼→오로 자란다(2026-10-09).
    // live 를 끄면 예전처럼 구울 때 획 시작점 근처에서 출발해 한 바퀴 돌아 닫힌다 (anim.speed px/s)
    outline: {
        anim: { on: true, speed: 850 },
        live: { on: true, interval: 60 },
        // 검정 선 대신 바깥으로 옅어지는 청록 띠(2026-10-16) — 윤곽에서 edge 불투명도, width px 바깥에서 투명.
        // 색은 halo 블록(rgb 211,221,209)보다 한 단계 진한 청록. on:false 면 예전 검정 선
        glow: { on: true, color: 'rgb(196, 140, 140)', width: 14, edge: 0.9, steps: 8 },
        // 스티플(2026-10-16) — 같은 그라데이션을 점 밀도로. 켜면 glow 대신. width = 점이 퍼지는 거리, gamma 클수록 빨리 성겨진다,
        // cell = 점 후보 격자(작을수록 촘촘), size = 점 반지름 범위, stretch = 타원 장단비 범위
        // px = 점 픽셀 크기(CSS px) — 알파 이진화 + nearest 로 또렷한 픽셀 점. 0 = 매끈하게
        stipple: {
            on: true,
            color: 'rgb(76, 159, 76)',
            width: 22,
            gap: 10,
            edge: 1,
            gamma: 2.6, // 8.6
            cell: 2.6,
            size: [0.3, 1.2],
            stretch: [1, 1.9],
            px: 0.5,
        }, // gap = 블록 윤곽에서 띄우는 거리
    },

    // 맨 아래 바탕 채움 (2026-10-16) — 가장 넓은 윤곽(스티플 gap + width 까지)을 꽉 채운다. 원래 흰색인데
    // 배경 위에서 모양을 보기 쉽게 지금은 옅은 회색 (mycelium 배경처럼). 흰색은 'rgb(255, 255, 255)'
    // base: { on: true, fill: 'rgb(232, 232, 230)', pad: null },
    // base: { on: true, fill: 'rgb(255, 255, 255)', pad: 0 }, // 흰색 — index.html 은 회색 종이(STANDALONE_PAPER) 위에서 보인다
    // halo 칸 모양 그대로, 오른쪽 아래로 살짝 어긋나게 (2026-10-17). shape 'outline' 이면 위 윤곽 채움
    base: { on: true, fill: 'rgb(255, 255, 255)', pad: 0, shape: 'halo', offset: [7, 7] },

    // 윤곽선 뒤 회색 픽셀 블록 — 같은 밀도장을 cell px 격자로 잰다. reach/th 가 null 이면 outline 값.
    // 격자 원점은 update() 가 스크롤만큼 따라 옮긴다(다시 구워도 블록이 글자에 붙어 있게)
    halo: {
        on: true,
        cell: 9,
        reach: null,
        th: null,
        fill: 'rgb(211, 221, 209)',
        opacity: 1,
        interval: 60,
        // 칸마다 linear gradient(2026-10-16) — angle 도(0 왼→오, 90 위→아래), stops [위치, 색]. on:false 면 fill 단색
        gradient: {
            on: true,
            whole: false, // true = 단어마다 블록 전체에 그라데이션 하나 / false = 칸마다 반복
            perSyl: true, // whole false 일 때 칸 방향 = 가까운 음절의 중성 방향(HALO_VOWEL_DIR). false = angle 하나
            angle: 180,
            // 201, 255, 201 = 연한 녹색. 247, 252, 247 = 거의 흰색
            stops: [
                [0, 'rgb(121, 211, 121)'],
                [1, 'rgb(76, 159, 76)'],
            ],
        },
    },

    // 실선 효과 (일러스트레이터 Roughen / Pucker & Bloat). target 'ink' = 2D 실선만 / 'all' = goo·윤곽선까지
    spineFx: {
        target: 'ink',
        roughen: { on: true, size: 6, gap: 6, mode: 'smooth' }, // mode 'smooth' | 'corner'
        puckerBloat: { on: true, amount: 12, gap: 2 }, // amount > 0 bloat / < 0 pucker
    },

    // 실선을 타고 흐르는 원. main = 획마다 하나, 실선을 왕복하며 orb 의 flow field 방향을 끌고 다닌다
    bead: {
        on: false, // 흐르는 구슬 여럿(✦✢✤ 무리) 대신 walker 하나 (2026-10-16). main·walker 는 따로 켜고 끈다
        // gap: [60, 90],
        gap: [140, 260], // 뭉침(cluster) 켜고 무리 사이 간격으로 — 전체 개수는 예전과 비슷
        radius: [1.5, 3.5],
        speed: 30,
        fill: 'rgb(0, 0, 0)',
        stroke: null,
        // 검정 구슬 → * (2026-10-16). 'circle' 이면 예전 원. 살 arms 개, 길이 = radius × scale
        // shape: 'star',
        star: { arms: 4, scale: 1.8, width: 2.5, turn: 0 },
        // ✦✢✤ 중 하나씩 (2026-10-16) — 구슬마다 획 시드로 고른다. 크기 = radius × scale
        shape: 'glyph',
        glyph: { kinds: ['sparkle', 'teardrop', 'balloon'], scale: 2.4, turn: 0 },
        // 뭉침 — size 개씩 무리, 무리 안 간격 cluster.gap, 무리 사이 간격 = gap(위)
        cluster: { on: true, size: [2, 5], gap: [6, 14] },
        // 도장 찍는 bead (2026-10-16) — 하나가 ✦ ↔ ✤ 로 morph 하며 다니다 이따금 발자국 2~5개, 단어당 max 개
        // size = 예비값 — 실제로는 음절마다 ORB_JAMO.walkerSize(초성)
        walker: { on: false, speed: 35, size: 9, morph: 2.4, every: 2, prob: 0.5, count: [2, 5], gap: 20, max: 12 },
        // glow 가 켜지면 radius = 번짐이 끝나는 바깥 반경 (꽉 찬 가운데 = radius × core)
        main: {
            on: true,
            radius: 32,
            speed: 30,
            fill: 'hsl(59, 100%, 81%)',
            stroke: null,
            glow: { on: true, core: 0.15, falloff: 6.4 },
            // 스티플(2026-10-16) — glow 의 알파를 점 밀도로. 점 모양·크기·px 는 outline.stipple 을 따르고 여기서 덮어쓴다.
            // frames 장을 fps 로 돌려 무늬가 끓는다(1 = 고정)
            // size/cell 은 따로 — outline 점을 작게 해도 bead 가 성겨지지 않게
            // 끊기며 움직이기 (2026-10-16) — 위치를 초당 fps 번만. 0 = 매끈
            fps: 2,
            // 입력 중엔 실선 끝(머리)에, 띄어쓰기로 단어가 완결되면 그 끝에서 출발해 왕복 (2026-10-17)
            waitLive: true,
            stipple: { on: true, frames: 4, fps: 6, size: [0.3, 1.0], cell: 1.2 },
        },
    },

    // 노란 원 + 내부 hatch 형 flow field (goo 아래에 깔린다)
    orb: {
        on: true,
        // 성게 가시 — 개수·길이는 ORB_JAMO.spikeN/spikeLen(받침). 색은 spineCasing 을 따라 실선과 한 몸
        spike: { on: true, spread: 1.55, depth: 0.4, jitter: 0.7 },
        // gap/prob/radius/spread/fill 은 무작위 배치용 — 지금은 ORB_JAMO 가 음절마다 지정해서 안 쓴다(기록)
        gap: [90, 200],
        prob: 0.7,
        radius: [10, 22],
        spread: 26,
        fill: '#fff07e',
        bulge: 3, // 윤곽선·블록이 orb 를 감싸며 부풀어 나온다 (outline.th 0.55 보다 커야 효과, 클수록 여유가 넓다)
        // 부채 — 원 대신. 살 개수·굵기는 ORB_JAMO(초성)가 음절마다. 펼침 = main bead 거리 near~far(px), 최소 min.
        // 'disc' 로 되돌리면 예전 노란 원 + hatch
        style: 'fan',
        // reach = 윤곽선이 살에서 떨어지는 거리 감(짧을수록 살 모양에 바싹), 세기는 bulge
        fan: {
            len: 2,
            near: 40,
            far: 320,
            min: 0.06,
            cap: 'butt',
            reach: 8,
            // 중심에 가까울수록 붉게 살짝 진하게 (2026-10-16) — 중심 = fill 에 tint 를 amount 만큼, extent(살 길이 비율)에서 fill
            heart: { on: true, tint: 'rgb(228, 102, 80)', amount: 0.5, extent: 0.3 },
        },
        flow: {
            cell: 8.6, // 대시 격자 간격(px)
            dash: 8.2, // 대시 길이(px)
            scale: 0.05, // 노이즈 주파수 — 클수록 잘게 굽이친다
            turns: 1, // 기본장 각도 범위(바퀴)
            follow: 0.85, // main bead 진행 방향을 따르는 정도 0~1
            falloff: 220, // px — 멀수록 덜 따른다. 0 = 거리 무관
            drift: 0.6, // bead 가 간 만큼 무늬가 흐르는 비율. 0 = 방향만 돈다
            style: 'rgba(60, 45, 0, 0.7)',
            width: 0.75,
        },
    },
};

export class DandelionReceiver {
    constructor(opts = {}) {
        this._opts = opts;
        this._trail = null;
        this._canvas = null;
        this._ownCanvas = false;
        this._JAMO = null;
        this._groups = []; // [{ sig, anchorKey, keys, pointCount }] — 이미 그려진 단어 획
        this._holdingIdx = -1; // hold 중인(=타이핑 중인 단어) 그룹 인덱스
        this._sampleStep = Math.max(CFG_OVERRIDE.spacing + 1, 5);
        this._generator = GENERATOR;

        // core.js 레이아웃 엔진이 읽는 값
        this.sylSize = SYL_SIZE;
        this.wrapStep = WRAP_STEP;
        this.wrapMargin = SYL_SIZE * 0.6;
        this.lineHeightRatio = LINE_HEIGHT_RATIO;

        // glyphmode scroll(세로, 2026-10-08). 밀도장은 픽셀로 밀 수가 없어서(goo·윤곽선·잉크가 따로 구워진다)
        // 줄이 늘면 페이지가 민 positions로 **새 자리에 전부 다시 굽고**(결정론이라 같은 모양), 캔버스 세 장을
        // 밀린 거리만큼 CSS로 내려 두었다가 0으로 끌어올린다 — 화면에선 위로 미끄러지는 것으로 보인다
        this._sylDrop = []; // 음절 번호 → 실선 맨 아래가 줄 기준선보다 몇 px 아래인지 (sylDrop, 음절 네모용)

        this._scrollAxis = 'y';
        this._scrollBase = 0;
        this._slide = 0;
        this._slideRaf = 0;
        this._scrollJump = true;
    }

    async init(canvas) {
        if (canvas) {
            this._canvas = canvas;
        } else {
            this._canvas = document.createElement('canvas');
            this._ownCanvas = true;
            document.body.appendChild(this._canvas);
        }
        this._trail = createTrail({
            canvas: this._canvas,
            mouse: false, // 자모 입력이 대체
            keys: false, // 한글 입력창과 충돌하므로 절대 등록하지 않는다
            global: false,
            // 스탠드얼론(index.html)만 종이색을 회색으로(2026-10-17) — 흰 글자 바탕(base)이 보이게. 전시(output.html)는 투명이라 무관
            cfg: this._opts.transparentOutput ? cfgForMode() : { ...cfgForMode(), paper: STANDALONE_PAPER },
            // 투명 합성(TD / output.html)에선 엔진이 종이색을 깔면 안 된다 — 캔버스가 뷰포트 전체라
            // TD 에선 흰 판이 크롬을 덮는다. 종이색은 body 배경 + 맨 아래 캔버스(underlay) CSS 배경 두 곳
            bodyBg: !this._opts.transparentOutput,
            paperBg: !this._opts.transparentOutput,
            dprCap: this._opts.dprCap, // bake 고해상도용 — 없으면 엔진 기본(2)
        });
        // 엔진은 오버레이(얇은 잉크·bead)를 body 끝에 붙인다 — 그러면 글자 창(#glyph-window)의 위쪽 페이드
        // mask·말풍선 clip이 안 걸린다. goo 캔버스 바로 뒤로 옮긴다(원래 trail/이 sketch 사본이라 여기서 했다)
        const { gl, overlay } = this._trail?.canvases ?? {};
        if (gl?.parentNode && overlay && overlay.parentNode !== gl.parentNode)
            gl.parentNode.insertBefore(overlay, gl.nextSibling);
    }

    // ── glyphmode scroll — mycelium과 같은 인터페이스(scrollTo/scrollBase/shownScrollBase/setScrollAxis) ──
    setScrollAxis(axis) {
        if (axis === this._scrollAxis) return;
        this._scrollAxis = axis;
        this._resetScroll();
    }
    scrollTo(t) {
        t = Math.max(0, t);
        const d = t - this._scrollBase;
        // 비운 직후·되돌아가기(지우기)는 애니메이션 없이 그 자리로
        if (this._scrollJump || d < 0) this._slide = 0;
        else this._slide += d;
        this._scrollJump = false;
        this._scrollBase = t;
        this._applySlide();
        if (this._slide && !this._slideRaf) {
            let last = performance.now();
            const step = now => {
                this._slide *= Math.pow(1 - SCROLL_EASE, ((now - last) * 24) / 1000);
                last = now;
                if (Math.abs(this._slide) < 0.3) this._slide = 0;
                this._applySlide();
                this._slideRaf = this._slide ? requestAnimationFrame(step) : 0;
            };
            this._slideRaf = requestAnimationFrame(step);
        }
    }
    get scrollBase() {
        return this._scrollBase;
    }
    // 음절 네모 높이(2026-10-17) — i번째 음절 실선(메인 경로)의 가장 아래 점이 그 음절 positions y보다 몇 px 아래인지.
    // 아직 안 그린 음절은 null(페이지가 예전 TAG_Y로)
    sylDrop(i) {
        const d = this._sylDrop[i];
        return Number.isFinite(d) ? d : null;
    }
    // 화면에 실제로 보이는 스크롤 양 — 음절 네모가 이걸 따라간다
    get shownScrollBase() {
        return this._scrollBase - this._slide;
    }
    _applySlide() {
        const v = this._slide ? `translate${this._scrollAxis === 'x' ? 'X' : 'Y'}(${this._slide.toFixed(1)}px)` : '';
        for (const cv of Object.values(this._trail?.canvases ?? {})) if (cv.parentNode) cv.style.transform = v;
    }
    _resetScroll() {
        cancelAnimationFrame(this._slideRaf);
        this._slideRaf = 0;
        this._scrollBase = this._slide = 0;
        this._scrollJump = true;
        this._applySlide();
    }

    // sylItems : { cho, jung, jong, wordId } 배열 (공백 제외)
    // positions: calcTextboxLayout 결과 (uv 0~1) — 음절 셀의 좌측 기준점
    update(sylItems, positions, JAMO) {
        if (JAMO) this._JAMO = JAMO;
        if (!this._JAMO || !this._trail) return;

        if (!sylItems?.length) {
            this.clearAccum();
            return;
        }

        const W = window.innerWidth;
        const H = window.innerHeight;

        // 블록 격자를 글자에 붙인다 — positions 는 scrollBase 만큼 민 화면 좌표라, 원점도 같이 밀어야
        // 스크롤로 다시 구울 때 칸이 글자에 대해 어긋나지 않는다
        const halo = this._trail.CFG.halo;
        if (halo) {
            halo.ox = this._scrollAxis === 'x' ? -this._scrollBase : 0;
            halo.oy = this._scrollAxis === 'y' ? -this._scrollBase : 0;
        }

        // ── 음절을 "단어 = 획" 단위로 묶는다.
        // 줄바꿈으로 단어가 두 줄에 걸치면(앵커 y가 달라지면) 거기서 끊어 별도 획으로.
        const groups = [];
        for (let i = 0; i < sylItems.length; i++) {
            const s = sylItems[i];
            const p = positions?.[i] ?? [0.5, 0.5];
            const prev = groups[groups.length - 1];
            if (prev && prev.wordId === s.wordId && Math.abs(prev.anchor[1] - p[1]) < 1e-4) {
                prev.syls.push(s);
                prev.keys.push(`${s.cho}${s.jung}${s.jong ?? ''}`);
            } else {
                groups.push({
                    wordId: s.wordId,
                    i0: i, // 이 단어 첫 음절의 sylItems 번호 — 음절 네모 높이(_sylDrop)를 음절 번호로 적는다
                    anchor: [p[0], p[1]],
                    syls: [s],
                    keys: [`${s.cho}${s.jung}${s.jong ?? ''}`],
                });
            }
        }
        const anchorKey = g => `${g.wordId}@${g.anchor[0].toFixed(5)},${g.anchor[1].toFixed(5)}`;
        const buildPts = (g, syls = g.syls, meta = null) =>
            jamoWordTrail(this._JAMO, syls, g.anchor[0] * W, g.anchor[1] * H, WRAP_STEP, this._sampleStep, meta);
        // 구간 계획 — 구간 = 음절, 시드 = 음절 내용만. 그래서 같은 음절은 어느 단어 어느 자리에
        // 있든, 어떤 순서로 타이핑했든(ㅇ→아→안 / 한 번에 '안') 같은 동반 곡선·장식이 나온다.
        const sylSeed = syl => this._trail.hashSeed('syl', syl.cho, syl.jung, syl.jong ?? '');
        const buildWord = (g, syls = g.syls) => {
            const meta = {};
            const pts = buildPts(g, syls, meta);
            let total = 0;
            for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            // 음절 네모 높이 — 음절 구간마다 실선(메인 경로) 가장 아래 점이 줄 기준선(anchor y)보다 몇 px 아래인지
            if (g.i0 != null) {
                let s = 0;
                let j = 0;
                const y0 = g.anchor[1] * H;
                for (let k = 0; k < meta.starts.length; k++) this._sylDrop[g.i0 + k] = -Infinity;
                for (let i = 0; i < pts.length; i++) {
                    if (i) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
                    while (j + 1 < meta.starts.length && s >= meta.starts[j + 1].px0) j++;
                    const d = pts[i].y - y0;
                    if (d > this._sylDrop[g.i0 + j]) this._sylDrop[g.i0 + j] = d;
                }
            }
            const plan = meta.starts.map((st, j) => {
                const segLen = (meta.starts[j + 1]?.px0 ?? total) - st.px0;
                return {
                    px0: st.px0,
                    seed: sylSeed(st.syl),
                    orbs: this._sylOrbs(st.syl, segLen),
                    haloAngle: this._sylHaloAngle(st.syl),
                    haloTone: this._sylHaloTone(st.syl),
                    walkerSize: this._sylWalkerSize(st.syl),
                };
            });
            return { pts, plan };
        };
        // 획 시드는 동반 곡선 개수·bead 배열만 정한다. 단어 내용만 쓴다(wordId 를 섞으면 같은 단어도 자리마다 달라진다)
        const seedOf = g => this._trail.hashSeed('word', ...g.keys);

        this._sylDrop.length = sylItems.length;
        const prev = this._groups;
        // 앞에서부터 완전히 같은 그룹은 그대로 둔다
        let match = 0;
        while (
            match < prev.length &&
            match < groups.length &&
            prev[match].sig === anchorKey(groups[match]) + '|' + groups[match].keys.join('')
        )
            match++;

        // ── 빠른 경로: 타이핑 중인 마지막 단어는 되감기+이어붙이기로 처리한다.
        //
        // 한글은 **마지막 음절이 조합되면서 계속 바뀐다**(ㅇ→아→안). 그래서 "음절이
        // 추가됐는가"만 보면 매 타건마다 판정이 실패해 단어 전체가 다시 그려졌다.
        // 대신 마지막 음절을 뺀 앞부분을 "안정 구간"으로 보고,
        //   · 안정 구간이 그대로면 → 거기까지 되감고(rewindGrowing) 마지막 음절만 다시 뻗는다
        // jamoWordTrail 이 append-only 라 안정 구간 좌표가 변하지 않는 게 전제다.
        if (match === prev.length - 1 && match === groups.length - 1 && this._holdingIdx === match) {
            const a = prev[match];
            const b = groups[match];
            const nStable = Math.max(0, b.keys.length - UNSTABLE_TAIL);
            const bStable = b.keys.slice(0, nStable);
            // 새 안정 구간이 **이전 키 배열의 프리픽스**여야 한다. 그래야 앞 k 점이 정말
            // 같은 점이고, replaceTail 이 옛 앞부분 + 새 꼬리를 섞는 사고가 안 난다.
            // (연음으로 중간 음절이 바뀌면 여기서 걸러져 정상적으로 재구성된다)
            const canExtend =
                a.anchorKey === anchorKey(b) &&
                bStable.length <= a.keys.length &&
                a.keys.slice(0, bStable.length).join('\u0000') === bStable.join('\u0000');
            if (canExtend) {
                const stablePts = nStable > 0 ? buildPts(b, b.syls.slice(0, nStable)) : [];
                const { pts: full, plan } = buildWord(b);
                this._trail.replaceTail(stablePts.length, full.slice(stablePts.length), plan);
                a.keys = b.keys.slice();
                a.stableKeys = bStable;
                a.sig = anchorKey(b) + '|' + b.keys.join('');
                a.pointCount = full.length;
                return;
            }
        }

        // 바뀐 게 전혀 없으면 여기서 끝낸다. (한글 조합 중에는 분해 결과가 그대로인
        // 타건이 섞인다 — 예: "안ㄴ" 은 여전히 ['안']. 그때 아래로 내려가 _holdingIdx 를
        // 리셋해버리면 **다음** 타건의 빠른 경로가 깨져서 단어 전체가 다시 그려진다.)
        if (match === prev.length && match === groups.length) return;

        // ── 그 외에는 달라진 지점부터 다시 그린다. 획이 이미 밀도장에 구워졌으면
        // 개별로 뺄 수 없으므로 전면 재구성 (결정론 덕분에 같은 글자는 같은 모양).
        const rebuild = match < prev.length;
        if (rebuild) {
            this._trail.clear();
            this._groups = [];
        }
        const from = rebuild ? 0 : match;
        this._holdingIdx = -1;

        for (let gi = from; gi < groups.length; gi++) {
            const g = groups[gi];
            const { pts, plan } = buildWord(g);
            if (pts.length < 2) continue;
            const isLast = gi === groups.length - 1;
            // 마지막 단어는 아직 타이핑 중일 수 있으므로 hold — 음절이 더 붙기를 기다린다.
            if (rebuild && !isLast) {
                // 다시 그리는 앞 단어들은 이미 화면에 있던 것 — 윤곽선이 한 바퀴 도는 애니메이션 없이 바로(2026-10-08).
                // 엔진(trail/)은 안 고치고 그 순간만 CFG를 끈다
                const anim = this._trail.CFG.outline.anim;
                const on = anim.on;
                anim.on = false;
                this._trail.addStroke(pts, seedOf(g), { plan });
                anim.on = on;
            } else this._trail.queueStroke(pts, seedOf(g), { hold: isLast, plan });
            if (isLast) this._holdingIdx = gi;
            this._groups.push({
                sig: anchorKey(g) + '|' + g.keys.join(''),
                anchorKey: anchorKey(g),
                keys: g.keys.slice(),
                stableKeys: g.keys.slice(0, Math.max(0, g.keys.length - UNSTABLE_TAIL)),
                pointCount: pts.length,
            });
        }
    }

    // 공백(단어 경계)/다음 음절 입력 시 core.js 흐름이 호출 — 자라던 획 즉시 완성
    finishGrowing() {
        this._trail?.finishGrowing();
    }

    // submit — 큐를 비우고, 합성 프레임이 한 번 돌 때까지 기다린다.
    // captureFrame() 이 GL 프레임버퍼를 읽으므로 스탬프 직후가 아니라 렌더 직후여야 한다.
    async flushQueue() {
        if (!this._trail) return;
        await this._trail.flushQueue();
        await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    }

    // ⚠️ 아직 불투명 PNG (종이색 포함). 투명화는 composite.frag 알파 출력 작업에서.
    captureFrame() {
        if (!this._trail) return null;
        return this._trail.captureCanvas().toDataURL('image/png');
    }

    // submit 후 새 줄 시작 — 누적 궤적 비움 (히스토리 이미지는 core.js 흐름이 관리)
    clearAccum() {
        this._trail?.clear();
        this._trail?.resetStamps();
        this._groups = [];
        this._sylDrop = [];
        this._holdingIdx = -1;
        this._resetScroll();
    }

    dispose() {
        this._resetScroll(); // 캔버스 transform을 남기면 ReceiverManager가 cssText째 다음 캔버스로 옮긴다
        this._trail?.dispose(); // 리스너·오버레이 캔버스·body 배경 전부 되돌린다
        this._trail = null;
        if (this._ownCanvas && this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
        this._canvas = null;
    }

    // 콘솔에서 A/B 전환 — rm.current.setGenerator('anchor')
    setGenerator(name) {
        this._generator = name === 'anchor' ? 'anchor' : 'turtle';
        this._trail?.clear();
        this._groups = [];
        this._holdingIdx = -1;
    }

    // 음절 하나의 orb — 종성 후크 자리에 하나(받침 없으면 없음). 반지름 = 중성 F1(입 벌림),
    // 색 = 노란 계열 안에서 초성 xyz(조음위치 → 색상 / 조음방법 → 채도 / 긴장도 → 명도). segLen = 음절 구간 길이(px)
    _sylOrbs(syl, segLen) {
        const J = this._JAMO;
        const jE = jongEntry(J, syl.jong); // jamoTrail 이 후크를 만드는 조건과 같게(겹받침은 대표음)
        if (!jE) return [];
        const [x, y, z] = J[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.33];
        const f1 = J[syl.jung]?.pos?.[0] ?? 500;
        const O = ORB_JAMO;
        const t = Math.min(1, Math.max(0, (f1 - O.f1[0]) / (O.f1[1] - O.f1[0])));
        const h = O.hue[0] + (O.hue[1] - O.hue[0]) * x;
        const sat = O.sat[0] + (O.sat[1] - O.sat[0]) * y;
        const l = O.light[0] + (O.light[1] - O.light[0]) * z;
        const r = O.radius[0] + (O.radius[1] - O.radius[0]) * t;
        return [
            {
                at: segLen * O.at, // 후크 = 음절 경로의 마지막 15% (jamoTrail)
                r,
                fill: `hsl(${h.toFixed(1)}, ${sat.toFixed(1)}%, ${l.toFixed(1)}%)`,
                off: r + O.off,
                auto: true,
                rays: Math.round(O.rays[0] + (O.rays[1] - O.rays[0]) * y),
                width: O.width[0] + (O.width[1] - O.width[0]) * z,
                spikes: this._jongSpikes(jE),
            },
        ];
    }

    // 받침 가시 — 울림소리(z 0)면 없음
    _jongSpikes(jE) {
        const [jx, , jz] = jE.pos;
        if (!(jz > 0)) return null;
        const O = ORB_JAMO;
        return {
            n: O.spikeN[0] + (O.spikeN[1] - O.spikeN[0]) * jx,
            len: O.spikeLen[0] + (O.spikeLen[1] - O.spikeLen[0]) * jz,
        };
    }

    // 음절 하나의 도장 bead 크기 (ORB_JAMO.walkerSize ← 초성 z)
    _sylWalkerSize(syl) {
        const z = this._JAMO[syl.cho]?.cho?.pos?.[2] ?? 0.33;
        const [lo, hi] = ORB_JAMO.walkerSize;
        return lo + (hi - lo) * z;
    }

    // 음절 하나의 halo 톤 (HALO_TONE ← 초성 xyz)
    _sylHaloTone(syl) {
        const [x, y, z] = this._JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.33];
        const T = HALO_TONE;
        const lerp = ([a, b], t) => +(a + (b - a) * t).toFixed(1);
        return { h: lerp(T.hue, x), s: lerp(T.sat, y), l: lerp(T.light, z) };
    }

    // 음절 하나의 halo 그라데이션 각도 (HALO_VOWEL_DIR)
    _sylHaloAngle(syl) {
        const d = HALO_VOWEL_DIR[syl.jung];
        if (d != null) return d;
        const x = this._JAMO[syl.cho]?.cho?.pos?.[0] ?? 0;
        return HALO_CHO_DIR[Math.round(x * 4) % 4];
    }

    // 콘솔 튜닝용 — rm.current.cfg().goo.th = 1.4
    cfg() {
        return this._trail?.CFG;
    }
    engine() {
        return this._trail;
    }
}
