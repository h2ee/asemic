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
// 노브(크기·자간)를 돌리는 동안은 다시 굽지 않고 지금 그림을 CSS로 늘이고 줄여 보여 주다가, 마지막으로 돌린 뒤
// 이만큼(ms) 지나면 한 번만 제대로 다시 굽는다(2026-11-10). 획 길이가 바뀌면 점선·고리·장식 위치와 블록 격자가
// 전부 새로 정해져서, 값마다 다시 구우면 글자가 쉴 새 없이 떨렸다
const KNOB_SETTLE_MS = 220;
// 위 미리보기를 쓸지. 2026-11-10 자간 늘임을 장식까지 다 만든 뒤에 하게 바꾸면서(path.js applyStretch) 다시 구워도
// 장식이 자리를 지켜 떨리지 않게 돼 끔 — 돌리는 동안에도 진짜로 다시 굽는다(문장 하나 ~20ms). 미리보기는 그림 전체를
// 한 점 기준으로 늘여서 둘째 단어부터 자리가 어긋났고, 손을 떼는 순간 그만큼 튀었다
const KNOB_PREVIEW = false;
// 크기 노브는 다시 굽지 않는다 — 획은 늘 기본 크기로 굽고 캔버스를 CSS로 통째로 키우고 줄인다(2026-11-10, mycelium
// displayScale과 같은 생각). 다시 구우면 점선·장식·블록이 전부 px 단위라 크기마다 모양이 새로 정해져, 손을 떼는 순간
// 글자가 바뀌어 보였다. 줄이면(×0.8) 기본 크기 좌표가 화면 오른쪽 밖까지 가므로 캔버스를 그만큼 넓게 잡는다 —
// controls.js 크기 노브 최소 0.8 → 1/0.8. 범위를 넓히면 같이 올릴 것
const CANVAS_W_SCALE = 1.25;
const SLIDE_MAX_DT = 1000 / 30; // 미끄러짐 한 프레임에 세는 최대 시간(ms) — 다시 굽느라 길어진 프레임에 튀지 않게

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
        // 소리는 비드 읽기 하나가 맡는다(2026-11-10) — 입력 중엔 머리가, 완결 뒤엔 왕복하는 비드가 읽는다(onBeadStep).
        // 페이지는 이게 있으면 입력 순간 대체 소리(voiceFor)를 안 낸다. 단 `?read=0`이면 예전처럼 입력 소리로 돌아간다
        this.soundByBead = true;
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
        // wrapStep(음절 보폭)은 getter — 자간 노브가 곱하는 _step × 크기 노브 배율(아래). 글자 모양이 보폭 하나로
        // 정해지는 receiver라 크기 노브가 보폭까지 같이 키워야 배치(layoutFor)와 그린 획이 맞는다(2026-11-10)
        this._step = WRAP_STEP;
        this.knobFields = { spacing: '_step' }; // controls.js applyKnob — 자간 노브는 wrapStep 대신 _step에
        this.wrapMargin = SYL_SIZE * 0.6;
        this.lineHeightRatio = LINE_HEIGHT_RATIO;

        // glyphmode scroll(세로, 2026-10-08). 밀도장은 픽셀로 밀 수가 없어서(goo·윤곽선·잉크가 따로 구워진다)
        // 줄이 늘면 페이지가 민 positions로 **새 자리에 전부 다시 굽고**(결정론이라 같은 모양), 캔버스 세 장을
        // 밀린 거리만큼 CSS로 내려 두었다가 0으로 끌어올린다 — 화면에선 위로 미끄러지는 것으로 보인다
        this._sylDrop = []; // 음절 번호 → 실선 맨 아래가 줄 기준선보다 몇 px 아래인지 (sylDrop, 음절 네모용)

        this._scrollAxis = 'y';
        this._scrollBase = 0;
        this._scrollBaseRef = 0; // 기본 크기 좌표로 센 스크롤(크기 노브가 줄 높이를 바꿔도 미끄러지지 않게)
        this._slide = 0;
        this._slideRaf = 0;
        this._scrollJump = true;

        this._drawnScale = null; // 지금 화면에 구워진 획 크기 { key, advance, stretch }
        this._preview = null; // 노브 미리보기 { sx, sy, ox, oy } — 화면 px 원점
        this._settleTimer = 0;
        this._settleArgs = null;
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
            widthScale: this._opts.transparentOutput ? CANVAS_W_SCALE : 1, // 전시(output.html)만 — 노브는 거기만 붙는다
            onMainStep: (stroke, info) => this._readStep(stroke, info), // 비드 읽기 소리 (2026-11-10)
        });
        // 엔진은 오버레이(얇은 잉크·bead)를 body 끝에 붙인다 — 그러면 글자 창(#glyph-window)의 위쪽 페이드
        // mask·말풍선 clip이 안 걸린다. goo 캔버스 바로 뒤로 옮긴다(원래 trail/이 sketch 사본이라 여기서 했다)
        const { gl, overlay } = this._trail?.canvases ?? {};
        if (gl?.parentNode && overlay && overlay.parentNode !== gl.parentNode)
            gl.parentNode.insertBefore(overlay, gl.nextSibling);
    }

    // ── 노브 (2026-11-10) — 예전엔 크기 노브가 줄 간격만 바꾸고(획은 wrapStep으로만 커진다) 자간 노브가 글자를
    // 통째로 키워서 둘 다 노브답지 않았다. 이제 크기 = 획을 통째로(_sizeMult), 자간 = 획을 가로로만 늘인다(_spacingMult)
    _sizeMult() {
        return this.sylSize / (this._ctlBase?.sylSize ?? this.sylSize);
    }
    _spacingMult() {
        return this._step / (this._ctlBase?._step ?? this._step);
    }
    get wrapStep() {
        return this._step * this._sizeMult();
    }
    // bake-text-others가 자간(ls)을 굽는 동안 직접 바꾼다 — 그땐 노브가 없어 예전처럼 획이 통째로 커진다
    set wrapStep(v) {
        this._step = v / this._sizeMult();
    }

    // ── glyphmode scroll — mycelium과 같은 인터페이스(scrollTo/scrollBase/shownScrollBase/setScrollAxis) ──
    setScrollAxis(axis) {
        if (axis === this._scrollAxis) return;
        this._scrollAxis = axis;
        this._resetScroll();
    }
    scrollTo(t) {
        t = Math.max(0, t);
        // 크기 노브로 줄 높이가 바뀌어 목표가 같이 변한 건 미끄러짐이 아니다 — 기본 크기 좌표로 비교한다
        const k = this._sizeMult();
        const d = (t / k - this._scrollBaseRef) * k;
        this._scrollBaseRef = t / k;
        // 비운 직후·되돌아가기(지우기)는 애니메이션 없이 그 자리로
        if (this._scrollJump || d < 0) this._slide = 0;
        else this._slide += d;
        this._scrollJump = false;
        this._scrollBase = t;
        this._applySlide();
        if (this._slide && !this._slideRaf) {
            let last = performance.now();
            const step = now => {
                // 한 프레임 시간은 최대 SLIDE_MAX_DT까지만 친다 — 줄이 바뀌면 문장 전체를 다시 굽느라 첫 프레임이
                // 100ms 넘게 걸리는데, 그걸 다 세면 미끄러짐이 첫 프레임에 절반쯤 끝나 윗줄이 툭 튀었다(2026-11-10)
                this._slide *= Math.pow(1 - SCROLL_EASE, (Math.min(now - last, SLIDE_MAX_DT) * 24) / 1000);
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
        return Number.isFinite(d) ? d * this._sizeMult() : null; // 기본 크기로 잰 값 → 화면(크기 노브)
    }
    // 글자 영역 — 크기 노브의 고정점(왼쪽 아래)을 여기서 잡는다
    setRect(rect) {
        this._rect = rect;
    }
    // 크기 노브 고정점(화면 px) — rect 왼쪽·아래. layoutFor 배치가 여기서부터 sylSize에 비례하므로(PAD_X·줄 높이·
    // 아래 여백 모두 sylSize 배수) 기본 크기 좌표 = 고정점 + (화면 좌표 − 고정점) / 배율이 정확히 성립한다
    _sizeOrigin() {
        const r = this._rect;
        return r ? [r.x, r.y + r.h] : [0, window.innerHeight];
    }
    // 화면에 실제로 보이는 스크롤 양 — 음절 네모가 이걸 따라간다
    get shownScrollBase() {
        return this._scrollBase - this._slide;
    }
    // 캔버스 transform = 미끄러짐(scroll) · 크기 노브(고정점 기준 통째로) · 노브 미리보기(자간). 오른쪽부터 적용된다 —
    // 미리보기는 기본 크기 좌표(구운 그림)에서, 크기는 그 결과에, 미끄러짐은 화면에서
    _applySlide() {
        const v = this._slide ? `translate${this._scrollAxis === 'x' ? 'X' : 'Y'}(${this._slide.toFixed(1)}px)` : '';
        const k = this._sizeMult();
        const pv = this._preview;
        for (const cv of Object.values(this._trail?.canvases ?? {})) {
            if (!cv.parentNode) continue;
            if (k === 1 && !pv) {
                cv.style.transform = v;
                cv.style.transformOrigin = '';
                continue;
            }
            // transform은 캔버스 자기 좌표(= 구울 때 쓴 px, 캔버스가 화면 0,0에 붙어 있으면 화면 px와 같다)로 건다.
            // 크기 고정점만 화면 px라 캔버스 자리(transform 뺀)를 빼서 옮긴다
            cv.style.transform = '';
            const r = cv.getBoundingClientRect();
            const about = (x, y, sx, sy) =>
                `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) translate(${(-x).toFixed(1)}px, ${(-y).toFixed(1)}px)`;
            const [ox, oy] = this._sizeOrigin();
            cv.style.transformOrigin = '0 0';
            cv.style.transform = [v, k !== 1 ? about(ox - r.left, oy - r.top, k, k) : '', pv ? about(pv.ox, pv.oy, pv.sx, pv.sy) : '']
                .filter(Boolean)
                .join(' ');
        }
    }
    _endPreview() {
        clearTimeout(this._settleTimer);
        this._settleTimer = 0;
        this._settleArgs = null;
        if (!this._preview) return;
        this._preview = null;
        this._applySlide();
    }
    _resetScroll() {
        cancelAnimationFrame(this._slideRaf);
        this._slideRaf = 0;
        this._scrollBase = this._slide = this._scrollBaseRef = 0;
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
            halo.ox = this._scrollAxis === 'x' ? -this._scrollBaseRef : 0;
            halo.oy = this._scrollAxis === 'y' ? -this._scrollBaseRef : 0;
        }

        const sz = this._sizeMult();
        const [ox, oy] = this._sizeOrigin();
        if (sz !== this._shownSize) {
            this._shownSize = sz;
            this._applySlide(); // 크기만 바뀐 거면 아래에서 다시 굽지 않고 끝난다 — CSS 배율은 여기서
        }

        // ── 음절을 "단어 = 획" 단위로 묶는다.
        // 줄바꿈으로 단어가 두 줄에 걸치면(앵커 y가 달라지면) 거기서 끊어 별도 획으로.
        const groups = [];
        for (let i = 0; i < sylItems.length; i++) {
            const s = sylItems[i];
            // 화면 좌표 → 기본 크기 좌표(크기 노브는 CSS가 곱한다)
            const q = positions?.[i] ?? [0.5, 0.5];
            const p = [(ox + (q[0] * W - ox) / sz) / W, (oy + (q[1] * H - oy) / sz) / H];
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
        // 획 크기·가로 늘임(노브)도 키에 넣는다 — 안 넣으면 자간 노브는 첫 단어 시작점을 안 바꿔서 단어 하나짜리
        // 문장(한 줄)에선 다시 그릴 계기가 없었다(2026-11-10)
        const scaleKey = `${(this._step / this._spacingMult()).toFixed(4)}x${this._spacingMult().toFixed(4)}`;
        const anchorKey = g => `${g.wordId}@${g.anchor[0].toFixed(5)},${g.anchor[1].toFixed(5)}@${scaleKey}`;
        const buildPts = (g, syls = g.syls, meta = null) =>
            // 획 크기 = 보폭 ÷ 자간 배율(= WRAP_STEP × 크기 배율), 가로로만 자간 배율만큼 늘인다 — 한 음절이 가로로
            // 나아가는 거리는 그대로 wrapStep이라 layoutFor 배치와 맞는다. 노브 없으면 둘 다 1(bake-text 자간은 wrapStep을 직접)
            jamoWordTrail(this._JAMO, syls, g.anchor[0] * W, g.anchor[1] * H, this._step / this._spacingMult(), this._sampleStep, meta);
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
                    syl: st.syl, // 비드 읽기 소리가 밑에 있는 음절을 안다(_readStep)
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
        // 자간 = 가로 늘임. 경로는 늘이지 않고 만들고 엔진이 장식까지 다 만든 뒤 단어 시작점 기준으로 늘인다
        // (path.js applyStretch) — 장식이 늘이지 않은 경로 길이로 정해져서 자간을 바꿔도 같은 자리에 남는다(2026-11-10)
        const stretchOf = g => (this._spacingMult() === 1 ? null : { x0: g.anchor[0] * W, sx: this._spacingMult() });

        // 노브 미리보기 — 글자(그룹 구성)는 그대로고 획 크기·늘임만 바뀌었으면 다시 굽지 않고 구운 그림을
        // 가로 sx·세로 sy로 늘인다. 원점 = 첫 단어 시작 x(왼쪽 정렬)·마지막 줄 y(stack은 마지막 줄이 rect 바닥에 고정).
        // 손을 떼고 KNOB_SETTLE_MS 뒤에 그때 값으로 한 번 제대로 굽는다
        const advance = this._step / this._spacingMult();
        const stretch = this._spacingMult();
        const prevGroups = this._groups;
        const sameText =
            prevGroups.length === groups.length && prevGroups.every((q, i) => q.keys.join('') === groups[i].keys.join(''));
        const d = this._drawnScale;
        if (KNOB_PREVIEW && d && scaleKey !== d.key && sameText) {
            this._preview = {
                sx: (advance * stretch) / (d.advance * d.stretch),
                sy: advance / d.advance,
                ox: groups[0].anchor[0] * W,
                oy: groups[groups.length - 1].anchor[1] * H,
            };
            this._applySlide();
            this._settleArgs = [sylItems, positions, JAMO];
            clearTimeout(this._settleTimer);
            this._settleTimer = setTimeout(() => {
                const args = this._settleArgs;
                this._endPreview();
                this._drawnScale = null; // 이번엔 미리보기 없이 제대로 굽는다
                if (args && this._trail) this.update(...args);
            }, KNOB_SETTLE_MS);
            return;
        }
        this._endPreview();
        this._drawnScale = { key: scaleKey, advance, stretch };

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
        // 다시 굽기 전 마지막 단어가 얼마나 자라 있었나 — 자리만 바뀐 경우(노브·줄바꿈) 처음부터 다시 자라지 않고
        // 거기서 이어 가게(2026-11-10). 예전엔 노브를 돌릴 때마다 마지막 단어가 0부터 다시 그려졌다.
        // 단어 단위로 센다 — 줄을 넘는 단어는 획이 둘로 갈리고, 노브를 돌리면 그 경계 음절이 바뀐다.
        // 마지막 획: 큐에 남아 있으면 아직 시작 전(0), 자라는 중이면 그 비율, 아무것도 없으면 다 자란 것.
        // 같은 단어의 앞 획들은 다 자라 있다
        let resume = null;
        if (rebuild && prev.length) {
            const pd = this._trail.pending();
            const frac = pd.queued ? 0 : pd.growing != null ? (pd.total ? pd.walked / pd.total : 0) : 1;
            const tail = prev[prev.length - 1];
            const keys = prev.filter(q => q.wordId === tail.wordId).flatMap(q => q.keys);
            resume = { wordId: tail.wordId, keys, drawn: keys.length - tail.keys.length * (1 - frac) };
        }
        if (rebuild) {
            this._trail.clear();
            this._groups = [];
        }
        const from = rebuild ? 0 : match;
        if (!rebuild) this._trail.releaseHold(); // 앞 단어들은 더 붙을 음절이 없다 — 새 마지막 단어만 hold
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
                this._trail.addStroke(pts, seedOf(g), { plan, stretch: stretchOf(g) });
                anim.on = on;
            } else {
                // 이어 갈 길이 — 같은 단어가 앞에서부터 같은 음절까지, 예전에 자라 있던 음절 수(소수)만큼.
                // 이 획 앞에 같은 단어의 획이 있으면(줄을 넘은 단어) 그 음절 수를 빼고 센다
                let at = 0;
                if (rebuild && isLast && resume?.wordId === g.wordId && resume.drawn > 0) {
                    const word = groups.filter(q => q.wordId === g.wordId);
                    const keys = word.flatMap(q => q.keys);
                    const before = keys.length - g.keys.length;
                    let same = 0;
                    while (same < keys.length && same < resume.keys.length && keys[same] === resume.keys[same]) same++;
                    const drawn = Math.min(g.keys.length, Math.min(resume.drawn, same) - before);
                    if (drawn > 0) {
                        const whole = Math.ceil(drawn);
                        const done = whole >= g.keys.length ? pts : buildPts(g, g.syls.slice(0, whole));
                        let len = 0;
                        for (let i = 1; i < done.length; i++) len += Math.hypot(done[i].x - done[i - 1].x, done[i].y - done[i - 1].y);
                        at = len * (drawn / whole);
                    }
                }
                this._trail.queueStroke(pts, seedOf(g), { hold: isLast, plan, at, stretch: stretchOf(g) });
            }
            if (isLast) this._holdingIdx = gi;
            this._groups.push({
                wordId: g.wordId,
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
        this._endPreview();
        this._drawnScale = null;
        this._trail?.clear();
        this._trail?.resetStamps();
        this._groups = [];
        this._sylDrop = [];
        this._holdingIdx = -1;
        this._resetScroll();
    }

    dispose() {
        this._endPreview();
        this._resetScroll(); // 캔버스 transform을 남기면 ReceiverManager가 cssText째 다음 캔버스로 옮긴다
        for (const cv of Object.values(this._trail?.canvases ?? {})) {
            cv.style.transform = ''; // 크기 노브 배율도(_resetScroll은 그건 남긴다)
            cv.style.transformOrigin = '';
        }
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

    // ── 비드 읽기 소리 (2026-11-10) — 메인 비드가 완결된 단어 위를 한 걸음 옮길 때마다(엔진 onMainStep) 그 자리의 그래픽을
    // 악보처럼 읽어 페이지로 넘긴다(onBeadStep → core.beadStepVoice → sound). 읽는 것:
    //   밑에 있는 음절(+ 한 걸음 전 음절) / 꺾인 각도 / 가장 가까운 부채까지 거리 → 펼침(화면 부채와 같은 near~far 식) /
    //   이번 걸음에 지난 orb(가시 있으면 가시) / 끝에서 되돌았나 / 화면 가로 위치
    _readStep(stroke, info) {
        if (!this.onBeadStep) return;
        const plan = stroke.plan ?? [];
        const segAt = pos => {
            let j = 0;
            while (j + 1 < plan.length && plan[j + 1].px0 <= pos) j++;
            return plan[j]?.syl ?? null;
        };
        const syl = segAt(info.pos);
        if (!syl) return;
        const F = this._trail.CFG.orb.fan;
        let near = null;
        let nearD = Infinity;
        const crossed = [];
        const lo = Math.min(info.pos, info.prevPos);
        const hi = Math.max(info.pos, info.prevPos);
        for (const o of stroke.orbs ?? []) {
            const d = Math.hypot(o.x - info.x, o.y - info.y);
            if (d < nearD) (nearD = d), (near = o);
            if (o.px > lo && o.px <= hi) crossed.push({ rays: o.rays, spikes: o.spikes });
        }
        // 부채 펼침 — 엔진 부채와 같은 식(near 이하 다 펼침, far 이상 접힘)
        const open = near ? Math.min(1, Math.max(0, (F.far - nearD) / (F.far - F.near))) : 0;
        this.onBeadStep({
            syl,
            prevSyl: segAt(info.prevPos),
            turn: Math.atan2(Math.sin(info.ang - info.prevAng), Math.cos(info.ang - info.prevAng)), // 꺾인 각(rad, 부호 = 도는 쪽)
            fan: near ? { open, rays: near.rays, dist: nearD } : null, // dist = 비드 → 가장 가까운 부채 중심(px)
            crossed,
            turned: info.turned,
            dir: info.dir, // +1 시작 → 끝 / -1 끝 → 시작 (처음엔 끝에서 출발해 거꾸로)
            live: !!info.live, // 자라는 획의 머리 — 입력 중
            x: info.x / info.width,
            rank: info.rank,
            walking: info.walking,
        });
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
