// 04_trail_gl — 마우스 궤적 + GPU 밀도장 goo (03_trail 의 GLSL 하이브리드판)
//
// 역할 분담
//   CPU (path.js)  경로 생성 — 리샘플/스무딩/방황/루프 이벤트. 순차적·상태 있는 로직은 JS 가 압도적으로 편하다.
//   GPU (field.js) 밀도장 goo — 캡슐 SDF 커널을 누적 텍스처에 스탬프 → 임계 → 셰이딩.
//   Canvas2D       얇은 크리스프 잉크(점선·화살촉·장식 원)만. 이건 2D 가 제일 잘한다.
//
// 레이어 (아래 → 위)
//   underlay  Canvas2D — 종이색(CSS 배경) + halo(픽셀 블록) + orb(노란 원 + flow field, 매 프레임). goo 아래에 깔린다.
//   #c        WebGL2 — goo + 성장 + 파티클 (straight alpha, 배경 투명).
//   overlay   Canvas2D(투명) — ink2d 누적본 + 그리는 중인 잉크 + 윤곽선 애니메이션 + bead / main bead.
//
// GPU 패스 순서 (한 프레임)
//   1. field.stamp('live')   그리는 중인 획을 밀도장에 (baked 는 손 뗄 때만)
//   2. growth.step()         밀도장을 읽어 성장장 ping-pong — goo 경계에서 자라 나온다
//   3. field.composite()     밀도장 + 성장장 → 임계 + 셰이딩 → 화면
//   4. particles.step()      파티클 상태 ping-pong — 경계에서 스스로 방출/사멸
//   5. particles.draw()      화면 위에 알파 블렌딩
// growth / particles 는 밀도장을 읽기만 한다. 순서만 지키면 서로 독립적이다.
//
// 03_trail 대비 달라진 점
//   · 전체화면 blur 가 없다 → 최대 병목 제거. 캔버스 5장 → 2장 + 저해상도 필드 2장.
//   · goo 파라미터가 직교한다: reach(px 사거리) / th(겹친 선 개수) / edge(물렁함).
//     구버전의 gooWidth·blur·gooBright 는 셋이 하나의 스칼라로 붕괴해 있었다.
//   · 셰이딩 모드 — 밀도장의 gradient 로 노멀을 만들어 레이마칭 없이 3D 볼륨감(크롬/토온).
//   · 획 기하를 JS 에 보관 → 리사이즈에도 그림이 안 날아가고, undo 가 공짜로 된다.
//   · field 의 .g/.b 채널에 strokeId / birth 가 누적된다 → 나중에 "자람"·파티클 트리거 훅.
//
// 키
//   1/2/3  flat / lit / toon         4  밀도장 디버그 (th·성장장을 눈으로 보기)
//   g      성장 레이어 on/off        p  파티클 on/off
//   z      undo       c  전체 지우기       s  PNG 저장
//
// 콘솔에서 파라미터 실시간 수정: window.TRAIL.CFG.goo.th = 1.8

import { createStroke, pushPoint, growStroke, hashSeed, makeRng, sample, reachAt } from './path.js';
import { createField, FLOATS_PER_SEG } from './field.js';
import { createGrowth } from './growth.js';
import { createParticles } from './particles.js';
import { makeQuadBuffer } from './glutil.js';
import { wordOutline, wordCells, densityGrid, densitySampler, addCapsules, capsuleDensity, contourGrid } from './marchingSquares.js';

const BIRTH_SCALE = 60; // birth 를 "분" 단위로 저장 (16F 누적 레인지 보호)
const DPR_CAP = 2; // 기본 상한 — opts.dprCap 으로 덮는다 (bake 고해상도 굽기)

const hex2rgb = h => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
];

// 스케치 진입점 — 마우스/키보드를 붙이고 window.TRAIL 을 노출한다
export function start() {
    return createTrail({ mouse: true, keys: true, global: true });
}

// opts:
//   canvas   WebGL2 캔버스를 직접 넘김 (없으면 #c, 그것도 없으면 새로 만든다)
//   mouse    포인터로 그리기 허용 (기본 false)
//   keys     키보드 단축키 등록 (기본 false — asemic 에선 한글 입력창과 충돌한다)
//   global   window.TRAIL 노출 (기본 false)
//   bodyBg   document.body 배경을 종이색으로 (기본 true)
//   paperBg  맨 아래 캔버스(underlay)에 종이색 CSS 배경 (기본 true). 투명 합성이면 false
//   cfg      CFG 위에 얕게 덮어쓸 값. goo/grow/part 는 한 단계 더 머지된다.
export function createTrail(opts = {}) {
    // ─────────────────────────── 설정 ───────────────────────────
    // 위치/길이 파라미터는 전부 CSS px. spacing 을 바꿔도 형태가 유지된다.
    const CFG = {
        // 세션 시드. 고정값으로 바꾸면 새로고침해도 같은 획이 나온다 (튜닝/비교용).
        seed: (Math.random() * 0xffffffff) >>> 0,

        // 경로
        spacing: 6, // 리샘플 간격(px)
        spineSmooth: 12, // 실선 스무딩 길이(px)
        minDist: 4, // 포인터 이벤트 최소 이동(px)
        maxRaw: 12000,

        // 동반 곡선
        companions: [1, 1], // 획당 개수 [최소, 최대]
        wanderAmp: [6, 18], // 완만한 드리프트 진폭(px) — 큰 굽이만 담당
        wanderLen: [500, 950], // 그 굽이의 파장(px)
        weaveAmp: [16, 32], // 실선을 넘나드는 진동 진폭(px)
        weaveLen: [340, 560], // 그 진동의 파장(px) — 획당 몇 번 교차할지
        noSwirlChance: 0.1,
        maxSwirls: 40,
        eventGap: [210, 450], // 루프 이벤트 간격(px)
        eventProb: 0.8,
        swirlSpan: [66, 78], // 루프가 걸치는 호 길이(px)
        swirlRadius: [35, 45], // 루프 반경(px)
        swirlTurns: [1, 1.7],
        compBaseSmooth: 96, // 기준 경로 스무딩 길이(px) — 클수록 급한 방향전환도 곡선 유지
        compStep: 3.6, // 동반 곡선 샘플 간격(px)
        compSmooth: 11, // 완성된 동반 곡선 스무딩 길이(px)
        headLag: 12, // 동반 곡선이 펜보다 이만큼 뒤에서 끝난다(px)
        // 구간(plan) 경계에서 앞 구간 값과 섞는 길이(px). 자모 입력은 구간 = 음절 (path.js "구간 계획")
        segBlend: 24,

        // 실선 효과 — 일러스트레이터 Roughen / Pucker & Bloat (path.js applySpineFx)
        spineFx: {
            target: 'ink', // 'ink' = 2D 실선에만 / 'all' = goo·윤곽선·동반 곡선 기준까지
            roughen: { on: false, size: 2, gap: 8, mode: 'smooth' }, // size px, gap = 앵커 간격 px, 'smooth' | 'corner'
            puckerBloat: { on: false, amount: 4, gap: 24 }, // amount > 0 bloat / < 0 pucker (px), gap = 앵커 간격
        },

        // bead — 실선을 타고 흘러가는 원 (매 프레임 오버레이에 그린다, 굽지 않음)
        bead: {
            on: false,
            gap: [40, 90], // 원 사이 간격(px)
            radius: [1.5, 3.5],
            speed: 30, // px/s. 0 이면 멈춘 구슬
            fill: 'rgb(0, 0, 0)',
            stroke: null, // 테두리 색 (null = 없음)
            lineWidth: 0.75,
            // 'circle' = 원(예전) / 'star' = * — 살 arms 개, 길이 = 반지름 × scale, 굵기 width, 진행 방향 + turn(rad)으로 돈다
            // 'glyph' = 채운 기호 — 구슬마다 kinds 중 하나(획 시드): 'sparkle' ✦ / 'teardrop' ✢ / 'balloon' ✤. 크기 = 반지름 × scale
            shape: 'circle',
            star: { arms: 6, scale: 1.6, width: 1, turn: 0 },
            glyph: { kinds: ['sparkle', 'teardrop', 'balloon'], scale: 2.4, turn: 0 },
            // 뭉침 — on 이면 size 개씩 무리 짓는다: 무리 안 간격 cluster.gap, 무리 사이 간격 = gap
            cluster: { on: false, size: [2, 5], gap: [6, 14] },
            // 도장 찍는 bead — 획마다 하나가 실선을 왕복하며 ✦(m 0: 끝 뾰족·가운데 뚱뚱) ↔ ✤(m 1: 끝 둥긂·가는 목)로
            // morph 초 주기로 모양이 바뀐다. every 초 칸마다 prob 확률로 발동해 gap(px) 간격으로 count 개 발자국(그 순간 모양)을
            // 남긴다. 단어마다 max 개 — 넘으면 오래된 것부터 바로 사라진다. 전부 (시드, 시각)의 순수 함수라
            // 전면 재구성(스크롤)에도 그대로다. 발자국은 단어가 처음 보인 때부터 — resetStamps() 로 잊는다
            walker: {
                on: false,
                speed: 35, // px/s
                size: 7, // 중심 → 끝(px). 그 자리 구간에 plan[j].walkerSize 가 있으면 그걸로
                fill: 'rgb(0, 0, 0)',
                morph: 2.4, // 한 번 왕복하는 데 걸리는 초
                every: 2, // 발동 판정 간격(초)
                prob: 0.6,
                count: [2, 5],
                gap: 14, // 발자국 간격(px, 경로를 따라)
                max: 12, // 단어당 도장 상한
                turn: 0,
            },
            // main bead — 획마다 하나, 실선을 왕복한다. orb 의 flow field 가 이 진행 방향을 따른다.
            // bead.on 과 따로 켜고 끈다
            main: {
                on: false,
                radius: 4, // glow 가 켜지면 번짐이 끝나는 바깥 반경
                speed: 40,
                fill: 'rgb(0, 0, 0)',
                stroke: null,
                lineWidth: 0.75,
                // radial gradient — 가운데 core 비율까지 fill 색 그대로, 바깥으로 투명하게 번진다.
                // falloff > 1 이면 core 바로 밖에서 빨리 옅어지고, < 1 이면 오래 남는다
                glow: { on: false, core: 0.45, falloff: 1.4 },
                // 끊기는 움직임 — 위치를 초당 fps 번만 갱신한다(프레임이 적은 것처럼). 0 = 매끈
                fps: 0,
                // 자라는(입력 중인) 획에선 실선 끝(머리)에 붙어 있다가, 획이 완결되면 그 끝에서 출발해 왕복한다.
                // 완결 시각은 단어(시드·순번·길이)별로 기억해 전면 재구성에도 이어진다 — resetStamps() 로 잊는다
                waitLive: false,
            },
        },

        // orb — 경로 주변의 노란 원, 안에 hatch 형 flow field. goo 아래(underlay 캔버스)에 깔린다
        orb: {
            on: false,
            gap: [90, 200], // 후보 간격(px)
            prob: 0.7, // 후보가 실제 원이 될 확률
            radius: [6, 22],
            spread: 26, // 경로 법선 방향 흩뿌림(px)
            fill: '#ffe83d',
            ring: null, // 테두리 색 (null = 없음)
            ringWidth: 0.6,
            // 윤곽선·halo 밀도장에 orb 를 원으로 더하는 세기 (0 = 끔). outline.th 보다 크면 윤곽이 orb 를 감싸며 부풀어 나온다
            bulge: 0,
            // 'disc' = 원 + hatch flow field (예전) / 'fan' = 부채 — 실선 방향 밑변에서 바깥쪽으로 살이 펼쳐진다.
            // 사북(살이 모이는 점)은 orb 중심에서 실선 쪽으로 r. 살 길이 = r × len. 살은 차례로 펼쳐지고
            // 아직 안 펼친 살은 맨 앞 살 아래 겹쳐 있다. 펼침 = main bead 와의 거리 near(다 펼침)~far(접힘), 최소 min
            style: 'disc',
            // 윤곽선·halo 는 살 실루엣을 따라간다(살 = 캡슐: 막대 반폭 + 자기 reach, 세기 bulge) — 매 프레임 펼침이 바뀌므로
            // 단어 밀도 격자를 캐시해 두고 살만 더해 등고선을 다시 뽑는다. reach 가 짧을수록 윤곽이 살에 바싹 붙는다
            // (outline.reach 처럼 길면 살 꼬리끼리 더해져 부채 전체가 둥근 덩어리로 감싸인다). budget = 한 프레임에 다시 뽑는 단어 수
            fan: { rays: 13, width: 2, len: 2, near: 40, far: 320, min: 0.06, cap: 'butt', reach: 8, budget: 2,
                // 중심 쪽 진하게 — 살마다 중심에서 radial gradient: 0 = fill 에 tint 를 amount 만큼 섞은 색 → extent(살 길이 비율) = fill
                heart: { on: false, tint: 'rgb(200, 40, 10)', amount: 0.5, extent: 0.8 } },
            // 가시 — plan[j].orbs[k].spikes = { n, len } 가 있는 orb 의 반대편, 실선 옆구리에서 성게 가시가 터져 나온다.
            // spread = 퍼지는 반각(rad), depth = 가시 사이 골짜기 깊이(len 비율), jitter = 각도·길이 불규칙(0~1).
            // 색은 spineCasing 이 켜져 있으면 그걸 따라 실선과 한 몸으로, 아니면 fill/border
            spike: { on: false, spread: 1.35, depth: 0.16, jitter: 0.7, fill: 'rgb(255, 255, 255)', border: 'rgb(0, 0, 0)', borderWidth: 1 },
            flow: {
                cell: 2.6, // 대시 격자 간격(px) — 작을수록 촘촘
                dash: 2.2, // 대시 길이(px)
                scale: 0.05, // 노이즈 공간 주파수(1/px) — 클수록 잘게 굽이친다
                turns: 1, // 기본장 각도 범위(바퀴). 1 = 모든 방향
                follow: 0.85, // main bead 진행 방향을 따르는 정도 0~1 (bead.main 이 켜져 있을 때)
                falloff: 220, // 이 거리(px)마다 follow 가 1/e 로 약해진다. 0 = 거리 무관
                drift: 0.6, // bead 이동량 대비 무늬가 흐르는 비율. 0 = 무늬 고정, 방향만 돈다
                style: 'rgba(60, 45, 0, 0.7)',
                width: 0.5,
            },
        },

        // 점진 생성 — 큐에 들어온 획이 한 프레임에 이만큼(px)씩 그려진다.
        // 프레임 기준이라 120Hz 화면에서는 60Hz의 2배 속도가 된다. 전시 기기가
        // 확정되면 (dt 기반 px/s 로 바꾸려면) advanceGrowing 의 한 줄만 고치면 된다.
        growPx: 14,

        // 잉크 (Canvas2D 레이어)
        lineWidth: 0.5,
        baseStyle: 'rgb(0, 0, 0)',
        // 실선을 테두리 있는 띠로 — 테두리 색(border)으로 width + 2·borderWidth 를 먼저 긋고 그 위에 fill 로 width.
        // on 이면 baseStyle·lineWidth 대신. 자기 교차는 한 띠로 이어진다(검정을 다 긋고 흰색을 다 긋는다)
        spineCasing: { on: false, width: 2.5, borderWidth: 1, fill: 'rgb(255, 255, 255)', border: 'rgb(0, 0, 0)' },
        companionStyle: 'rgb(0, 0, 0)',
        companionDash: [3, 4],
        arrowSize: 7, // 0 = 화살촉 없음
        decor: true,
        decorGap: [20, 80], // 장식 원 간격(px)
        decorSpread: 30, // 경로 법선 방향 흩뿌림(px)
        decorRadius: [1.5, 4], // 사각형 반변 길이(px)
        decorStyle: 'rgb(0, 0, 0)', // 테두리 색. null = 테두리 없음
        decorLineWidth: 0.75,
        decorFill: null, // 채움 색. null = 채우지 않음 (예전)

        // 단어 윤곽선 — 획을 구울 때 marching squares 로 등고선을 뽑아 경로로 긋는다.
        // reach 를 goo 의 것보다 크게 잡을수록 이웃 획의 장이 합쳐져 획 하나가 아니라
        // **단어 전체를 감싸는** 외곽선이 된다. th 는 그 장 기준 밀도 임계.
        outline: {
            on: true,
            reach: 30, // px — 윤곽선 전용 커널 반경 (goo.reach 와 별개)
            th: 0.55, // 밀도 임계
            cell: 4, // 샘플 격자 간격(px) — 작을수록 매끈하지만 느리다
            style: 'rgba(0,0,0,0.45)',
            width: 0.6,
            dash: [], // 예: [2, 3] 이면 점선 윤곽
            // 구울 때 한 번에 나타나지 않고 획 시작점 근처에서 출발해 한 바퀴 돌아 닫힌다
            anim: { on: false, speed: 450 }, // px/s
            // 자라는 중에도 interval(ms)마다 윤곽선을 다시 뽑아 실선과 **같이** 자라게 한다. 켜면 anim 은 안 쓴다
            live: { on: false, interval: 60 },
            // 선 대신 바깥으로 옅어지는 띠 — 윤곽에서 edge 불투명도로 시작해 width px 바깥에서 0.
            // 넓은 선부터 좁은 선까지 steps 겹을 쌓고 안쪽(윤곽 안)은 지운다. 켜면 style/width/dash 는 안 쓴다
            glow: { on: false, color: 'rgb(120, 190, 180)', width: 14, edge: 0.9, steps: 8 },
            // 스티플 — 그라데이션을 점 밀도로. 화면 고정 지터 격자(cell px, 원점 halo.ox/oy)의 후보마다 윤곽까지 거리 d 를 재서
            // 확률 edge·(1 − d/width)^gamma 로 남긴다. 점 = 타원(반지름 size, 장단비 stretch, 회전 무작위). glow 보다 우선.
            // 격자가 화면에 고정이라 윤곽이 안 바뀐 곳의 점은 그대로다(부채가 움직이는 자리만 바뀐다)
            // 윤곽이 계속 바뀌면(부채) 점은 한 그리기에 한 획, 같은 획은 interval ms 에 한 번만 다시 만든다
            // px > 0 = 점을 그 CSS px 크기 픽셀로(알파 이진화 + nearest). 0 = 화면 해상도 그대로 매끈하게.
            // gap = 띠를 윤곽에서 바깥으로 이만큼(px) 띄운다 — 띠 두께(width)는 그대로, 시작점만 밀린다
            stipple: { on: false, color: 'rgb(120, 190, 180)', width: 18, gap: 0, edge: 1, gamma: 1.6, cell: 2.6, size: [0.5, 1.5], stretch: [1, 1.9], interval: 100, px: 0 },
        },

        // 바탕 채움 — 맨 아래(underlay, halo 보다 아래). 윤곽선을 pad px 만큼 바깥으로 불린 모양을 fill 로 꽉 채운다
        // (안쪽 구멍까지). pad null = 가장 넓은 윤곽 — 스티플이면 gap + width, glow 면 width, 아니면 0
        // shape 'halo' = 윤곽 대신 halo 칸 모양 그대로(pad 무시). offset = [dx, dy] px 만큼 어긋나게 — 그림자처럼 뒤로 비친다
        // gradient = halo.gradient 와 같은 꼴 — 주면 fill 대신 칸마다 그 그라데이션(shape 'halo' 일 때)
        base: { on: false, fill: 'rgb(255, 255, 255)', pad: null, shape: 'outline', offset: [0, 0], gradient: null },

        // 픽셀 블록 — 윤곽선과 같은 밀도장을 화면 고정 격자(cell px, 원점 ox/oy)로 재서 넘는 칸을 칠한다.
        // goo 아래(underlay, orb 보다 아래)에 깔린다. reach/th 가 null 이면 outline 의 값.
        // 자라는 획도 interval(ms)마다 다시 재서 같이 자란다. fill 은 불투명으로 — 겹친 칸이 두 번 칠해진다(opacity 로 조절)
        halo: {
            on: false,
            cell: 10,
            reach: null,
            th: null,
            fill: 'rgb(214, 212, 208)',
            opacity: 1,
            // 외곽선 — 블록 덩어리(구운 것 + 자라는 것 + 부채 칸) 바깥에 width px 테두리
            edge: { on: false, color: 'rgb(76, 159, 76)', width: 1.5 },
            ox: 0,
            oy: 0,
            interval: 60,
            // linear gradient — on 이면 fill 대신. angle = 도(0 = 왼→오, 90 = 위→아래), stops = [[위치 0~1, 색], …]
            // whole false = 칸마다 같은 그라데이션(칸 크기 타일 패턴, 원점 ox/oy) / true = 단어(획)마다 블록 전체 범위에 하나
            // perSyl: whole 이 아닐 때 plan[j].haloAngle(도) 이 있으면 칸마다 가장 가까운 실선 점의 구간 각도로
            gradient: { on: false, whole: false, perSyl: false, angle: 90, stops: [[0, 'rgb(214, 212, 208)'], [1, 'rgb(180, 178, 172)']] },
        },

        // goo — 밀도장. 세 값이 서로 독립적이다.
        // 실측 밀도(TRAIL.probe, reach 22 / compStep 3.6 기준):
        //   매끈한 외톨이 선 코어  ≈ 1.0     (커널 정규화의 기준점)
        //   자기 루프가 겹치는 곳  ≈ 1.2~1.6  (곡률이 큰 안쪽은 이웃 호가 가까워 자연히 높다)
        //   선 두 줄이 겹친 곳     ≈ 1.6~1.9
        goo: {
            reach: 18, // px. 커널 반경 = "두 선이 이만큼 가까우면 이어붙는다". [lo, hi] 면 경로를 따라 노이즈로 오간다
            reachLen: 140, // reach 가 범위일 때 그 변화의 파장(px)
            // 동반 곡선 밀도 상한. 0 = 끔(예전 그대로). 1.0 근처로 두면 점선이 자기 루프끼리 겹쳐
            // 만드는 goo 가 사라지고 실선과의 교차점만 남는다. 바꾸면 replay() 필요(스탬프 채널이 바뀜)
            compCap: 0,
            th: 1.3, // 밀도 임계 ≈ "겹쳐야 하는 선의 개수".
            //   <1.0 모든 선이 두툼하게 goo / 1.1~1.5 루프·근접 구간만 / >1.6 진짜 교차점만
            edge: 0.005, // 임계 전이 폭 (안티에일리어싱·물렁함). th 와 무관하게 움직인다.
            // 어느 선을 밀도장에 넣을지 — 독립적으로 켜고 끈다. 둘 다 false 면 goo 없이 선만 남는다.
            // 둘 중 하나만 넣으면 "실선끼리" 또는 "점선끼리"만 서로 뭉친다.
            spine: true, // 실선(main 곡선)
            companion: false, // 점선(동반 곡선)
            fieldScale: 1.5, // 필드 해상도 / 화면 해상도 (밀도장은 저주파라 낮춰도 된다)
            // 픽셀화 — 밀도장을 이 칸(CSS px)마다 한 번만 읽어 칸 단위로 칠한다. 0 = 끔(매끈한 metaball).
            // 격자 원점은 halo.ox/oy 와 같다 (블록과 칸이 맞물린다)
            pixel: 0,
            // [lo, hi] 로 주면 칸 크기가 block(px) 블록마다 lo~hi 정수 중 하나 — scale(1/px) 노이즈로 이웃 블록끼리 비슷하게,
            // scale 0 이면 블록마다 따로. block 은 lo~hi 의 공배수로 두면 칸이 블록 경계에 딱 맞는다(1~3 → 6·12·18)
            pixelVar: { block: 12, scale: 0.02 },
            // 결 — 밀도 등고선(= 획과 나란한 띠)마다 밀도를 깎아 덩어리를 가닥으로 가른다. amount 0 = 끔.
            //   freq  밀도 1 당 띠 개수 / warp 노이즈로 띠를 흔드는 양(띠 단위) / scale 노이즈 주파수(1/px)
            //   width 띠에서 깎이는 폭 0~1 (클수록 가닥이 가늘다)
            grain: { amount: 0, freq: 1.2, warp: 0.6, scale: 0.035, width: 0.35 },
        },

        // 셰이딩
        paper: '#ffffff',
        ink: '#0a0a0a',
        shade: 2, // 0 flat / 1 lit / 2 toon / 3 밀도장 디버그
        light: [-0.45, 0.6, 0.66],
        normalZ: 34, // 노멀 기울기 스케일 — 작을수록 납작, 클수록 부풀어 보임
        amb: 0.55,
        diff: 0.75,
        spec: 0.5,
        specPow: 28,
        fres: 0.22,
        bands: 3, // toon 계단 수

        // 성장 레이어 — goo 경계에서 뭔가가 자라 나온다 (텍스처 공간 피드백)
        // 기본 off. 키 `g` 또는 TRAIL.CFG.grow.on = true 로 켠다.
        grow: {
            on: false,
            scale: 0.75, // 성장장 해상도 / 디바이스 해상도 (흐물흐물하니 낮춰도 된다)
            decay: 0.965, // 프레임당(60fps 기준) 감쇠 — 작을수록 짧게 자람
            outward: 26, // 경계 바깥으로 밀려나는 속도 (px/s)
            curlAmp: 55, // 바람 세기 (px/s)
            curlScale: 0.006, // 바람 공간 주파수 (1/px) — 작을수록 큰 소용돌이
            curlSpeed: 0.06,
            source: 1.0, // 발아 세기
            bandLo: 0.35, // 발아 밴드 아래쪽 폭 (th - bandLo)
            bandHi: 0.12, // 위쪽 폭 (th + bandHi)
            ageDelay: 0.02, // 분. 획을 그린 뒤 이 정도 지나서부터 자란다 (field .b 의 birth 사용)
            ink: '#6e6e66',
            gain: 1.4, // 성장장 → 불투명도
            opacity: 0.5,
        },

        // 파티클 레이어 — goo 경계에서 스스로 방출된다 (CPU 방출 없음)
        // 기본 off. 키 `p` 또는 TRAIL.CFG.part.on = true 로 켠다.
        part: {
            on: false,
            side: 128, // 상태 텍스처 한 변 → 파티클 수 상한 = side²
            spawnTol: 0.08, // |밀도 - th| 가 이보다 작은 곳을 경계로 인정
            spawnRate: 0.04, // 부활 시도 확률/프레임 — 실질적인 "개체수" 조절 노브.
            //   1.0 으로 두면 전원이 동시 탄생 → 동시 사망해서 개체수가 맥동한다
            lifespan: 4.5, // 초
            lifeVar: 0.5, // 수명 개체차 (0.5 = 0.5~1.5배). 맥동 방지
            curlAmp: 34, // 바람 (px/s)
            curlScale: 0.0075,
            curlSpeed: 0.09,
            flow: 26, // goo 경계를 따라 도는 속도 (px/s)
            repel: 14, // 경계 바깥으로 밀려나는 속도 (px/s)
            size: 2.6, // px
            ink: '#141414',
            opacity: 0.55,
        },
    };

    // CFG 에 opts.cfg 를 머지 — 중첩 객체(goo / outline.anim / spineFx.roughen …)는 끝까지 들어가고
    // 배열·숫자는 통째로 바꾼다. (한 단계만 머지하면 outline:{anim:{on:true}} 가 anim.speed 를 날린다)
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
    const deepMerge = (dst, src) => {
        for (const [k, v] of Object.entries(src)) {
            if (isObj(v) && isObj(dst[k])) deepMerge(dst[k], v);
            else dst[k] = v;
        }
    };
    if (opts.cfg) deepMerge(CFG, opts.cfg);

    // ─────────────────────── 캔버스 3장 ───────────────────────
    // 아래: Canvas2D underlay(종이색 CSS + orb) / 가운데: WebGL2(goo) / 위: Canvas2D 투명 오버레이(얇은 잉크)
    // 전부 여기서 만들거나 받아오고, dispose() 에서 자기가 만든 것만 치운다.
    const ownGl = !opts.canvas && !document.getElementById('c');
    const glCanvas = opts.canvas ?? document.getElementById('c') ?? document.createElement('canvas');
    if (ownGl) document.body.appendChild(glCanvas);
    // underlay 는 goo 캔버스 **바로 앞(DOM)** 에 끼워 그 아래에 깔리게 한다
    const underlay = document.createElement('canvas');
    if (glCanvas.parentNode) glCanvas.parentNode.insertBefore(underlay, glCanvas);
    else document.body.prepend(underlay);
    const overlay = document.createElement('canvas');
    document.body.appendChild(overlay);
    for (const cv of [underlay, glCanvas, overlay]) {
        cv.style.position = 'fixed';
        cv.style.left = '0';
        cv.style.top = '0';
    }
    // 종이색은 셰이더가 아니라 맨 아래 캔버스(underlay)의 CSS 배경이 깐다 — 합성 셰이더는
    // straight alpha 로 잉크만 출력하므로, 화면에선 이 배경이 비쳐 보이고 캡처는 투명하게 나온다.
    // (goo 캔버스에 깔면 그 아래 orb 가 가려진다.) opts.paperBg === false 면 안 깐다 — 투명 합성용
    underlay.style.background = opts.paperBg === false ? 'transparent' : CFG.paper;
    glCanvas.style.background = 'transparent';
    underlay.style.pointerEvents = 'none';
    overlay.style.touchAction = 'none';
    if (opts.mouse) overlay.style.cursor = 'crosshair';
    // 오버레이가 위에 깔리므로 마우스를 안 쓸 땐 클릭을 통과시킨다 (UI 버튼 가림 방지)
    if (!opts.mouse) overlay.style.pointerEvents = 'none';
    const prevBodyBg = document.body.style.background;
    if (opts.bodyBg !== false) document.body.style.background = CFG.paper;

    const gl = glCanvas.getContext('webgl2', {
        antialias: false,
        alpha: true, // 투명 캡처 — 종이색은 캔버스 CSS 배경이 담당
        premultipliedAlpha: false, // 셰이더가 straight alpha 를 낸다
        preserveDrawingBuffer: true, // PNG 저장 / captureFrame 의 readPixels·drawImage 용
    });
    if (!gl) {
        console.error('WebGL2 를 쓸 수 없습니다');
        return;
    }
    // 세 모듈이 같은 쿼드 버퍼를 공유한다
    const quadBuf = makeQuadBuffer(gl);
    const field = createField(gl, quadBuf);
    const growth = createGrowth(gl, quadBuf);
    const particles = createParticles(gl, quadBuf, CFG.part.side);

    const ink2d = document.createElement('canvas'); // 누적 잉크 (안 지움)
    const ictx = ink2d.getContext('2d');
    const glow2d = document.createElement('canvas'); // 윤곽 띠 한 장 (그린 뒤 윤곽 안을 지우고 옮긴다)
    const gctx = glow2d.getContext('2d');
    const halo2d = document.createElement('canvas'); // 구운 획의 픽셀 블록 누적 (안 지움)
    const hctx = halo2d.getContext('2d');
    const haloTmp = document.createElement('canvas'); // 구운 것 + 자라는 것을 한 장으로 (opacity 를 한 번만 먹이려고)
    const tctx = haloTmp.getContext('2d');
    const edge2d = document.createElement('canvas'); // halo 외곽선용 — 블록 모양을 edge 색으로 물들인 한 장
    const ectx = edge2d.getContext('2d');
    const octx = overlay.getContext('2d');
    const uctx = underlay.getContext('2d'); // orb 는 굽지 않는다 — 매 프레임 다시 그린다

    let W = 0,
        H = 0,
        dpr = 1;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, opts.dprCap ?? DPR_CAP);
        // 0 으로 떨어지지 않게 — 창이 0 크기인 채로 로드되면(숨겨진 패널 등) 캔버스 width 가 0 이
        // 되고, drawImage 가 매 프레임 InvalidStateError 를 던져 프레임 루프가 영구히 죽는다.
        W = Math.max(1, window.innerWidth);
        H = Math.max(1, window.innerHeight);
        for (const cv of [glCanvas, overlay, ink2d, underlay, halo2d, haloTmp, glow2d, edge2d]) {
            cv.width = Math.round(W * dpr);
            cv.height = Math.round(H * dpr);
        }
        for (const cv of [underlay, glCanvas, overlay]) {
            cv.style.width = W + 'px';
            cv.style.height = H + 'px';
        }
        for (const c of [ictx, octx, uctx, hctx, tctx, gctx, ectx]) c.setTransform(dpr, 0, 0, dpr, 0, 0);
        field.resize(W, H, Math.round(W * dpr * CFG.goo.fieldScale), Math.round(H * dpr * CFG.goo.fieldScale));
        growth.resize(W, H, Math.round(W * dpr * CFG.grow.scale), Math.round(H * dpr * CFG.grow.scale));
        particles.resize(W, H);
        replayAll(); // 03_trail 과 달리 리사이즈해도 그림이 안 날아간다
    }

    // ─────────────────── 세그먼트 → 인스턴스 데이터 ───────────────────
    // Rat(px) — 그 지점의 커널 반경. kind 1 = 동반 곡선 → .a 채널 (goo.compCap)
    function addPoly(out, poly, Rat, step, id, birth, kind) {
        for (let i = 1; i < poly.length; i++) {
            const a = poly[i - 1],
                b = poly[i];
            out.push(a.x, a.y, b.x, b.y, Rat((i - 0.5) * step), id, birth, kind);
        }
    }

    // goo·윤곽선이 쓰는 실선 — spineFx.target 이 'all' 이면 효과 먹인 쪽
    const gooSpine = stroke => (CFG.spineFx?.target === 'all' && stroke.spineInk) || stroke.spine;

    function collectSegs(stroke, out) {
        const fixed = !Array.isArray(CFG.goo.reach);
        const R = which => (fixed ? () => CFG.goo.reach : px => reachAt(stroke, which, px, CFG));
        const compKind = CFG.goo.compCap > 0 ? 1 : 0;
        if (CFG.goo.companion)
            for (const poly of stroke.compPolys)
                addPoly(out, poly, R('comp'), CFG.compStep, stroke.id, stroke.birth, compKind);
        const sp = gooSpine(stroke);
        if (CFG.goo.spine && sp) addPoly(out, sp, R('spine'), CFG.spacing, stroke.id, stroke.birth, 0);
    }

    // ───────────────────── Canvas2D 잉크 ─────────────────────
    function strokePolyline(c, pts, style, w, dash) {
        if (pts.length < 2) return;
        c.strokeStyle = style;
        c.lineWidth = w;
        c.lineJoin = 'round';
        c.lineCap = 'round';
        c.setLineDash(dash || []);
        c.beginPath();
        c.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
        c.stroke();
        c.setLineDash([]);
    }

    function drawArrowhead(c, tip, prev, size) {
        if (!tip || !prev || !(size > 0)) return;
        const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
        c.fillStyle = 'rgb(0, 0, 0)';
        c.beginPath();
        c.moveTo(tip.x, tip.y);
        c.lineTo(tip.x - Math.cos(a - 0.4) * size, tip.y - Math.sin(a - 0.4) * size);
        c.lineTo(tip.x - Math.cos(a + 0.4) * size, tip.y - Math.sin(a + 0.4) * size);
        c.closePath();
        c.fill();
    }

    // 윤곽선 Path2D — stroke.outline 이 바뀔 때만 다시 만든다 (부채 모드에선 매 프레임 여러 번 긋는다)
    function outlinePath(stroke) {
        if (!stroke?.outline?.length) return null;
        if (stroke._olSrc === stroke.outline) return stroke._olPath;
        const p = new Path2D();
        for (const poly of stroke.outline) {
            if (poly.length < 2) continue;
            p.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) p.lineTo(poly[i].x, poly[i].y);
        }
        stroke._olSrc = stroke.outline;
        stroke._olPath = p;
        return p;
    }

    // 바탕 채움 (CFG.base) — 윤곽 폴리곤을 하나씩 채우고(구멍도 메운다) 2·pad 굵기로 그어 바깥으로 불린다
    function basePad() {
        const B = CFG.base;
        if (B.pad != null) return B.pad;
        const O = CFG.outline;
        if (O.stipple?.on) return (O.stipple.gap ?? 0) + O.stipple.width;
        if (O.glow?.on) return O.glow.width;
        return 0;
    }
    function drawBase(c, stroke) {
        const [dx, dy] = CFG.base.offset ?? [0, 0];
        if (CFG.base.shape === 'halo') {
            const cells = stroke?.halo;
            if (!cells?.length) return;
            const { cell, ox, oy } = CFG.halo;
            const BG = CFG.base.gradient;
            c.save();
            c.translate(dx, dy); // 패턴도 칸과 같이 밀린다
            c.fillStyle = BG?.on ? haloFill(c, null, BG.angle ?? 90, null, BG) : CFG.base.fill;
            c.beginPath();
            for (let i = 0; i < cells.length; i += 2) c.rect(ox + cells[i] * cell, oy + cells[i + 1] * cell, cell, cell);
            c.fill();
            c.restore();
            return;
        }
        if (!stroke?.outline?.length) return;
        if (stroke._baseSrc !== stroke.outline) {
            stroke._baseSrc = stroke.outline;
            stroke._basePaths = stroke.outline
                .filter(poly => poly.length > 2)
                .map(poly => {
                    const p = new Path2D();
                    p.moveTo(poly[0].x, poly[0].y);
                    for (let i = 1; i < poly.length; i++) p.lineTo(poly[i].x, poly[i].y);
                    p.closePath();
                    return p;
                });
        }
        const pad = basePad();
        c.save();
        c.translate(dx, dy);
        c.fillStyle = c.strokeStyle = CFG.base.fill;
        c.lineJoin = 'round';
        c.lineWidth = 2 * pad;
        for (const p of stroke._basePaths) {
            c.fill(p);
            if (pad > 0) c.stroke(p);
        }
        c.restore();
    }

    // 스티플 점 — 윤곽 세그먼트마다 주변 격자 칸까지 최단거리를 재고, 칸마다 해시로 지터·생존·크기·회전을 정한다
    // (같은 칸 = 늘 같은 점)
    const hashCell = (ix, iy, k) => {
        let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(k + 1, 0x9e3779b9);
        h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    // 획마다 점을 자기 bbox 크기 캔버스에 한 번 찍어 두고(stroke._st) 매 프레임엔 붙이기만 한다.
    // Path2D·ellipse 는 수천 개면 수십 ms 라 못 쓴다 — 점 = 원 두 개를 회전 방향으로 엇갈려 겹친 콩 모양(arc 는 빠르다)
    // 점 하나 — 칸 (ix, iy) 안 지터 위치에 원 두 개를 회전 방향으로 엇갈려 겹친 콩 모양. salt 로 같은 칸의 다른 변형
    function stippleDot(x, ox, oy, ix, iy, S, salt) {
        const c = S.cell;
        const cx = ox + (ix + hashCell(ix, iy, 1 + salt)) * c,
            cy = oy + (iy + hashCell(ix, iy, 2 + salt)) * c;
        const r = S.size[0] + (S.size[1] - S.size[0]) * hashCell(ix, iy, 3 + salt);
        const e = S.stretch[0] + (S.stretch[1] - S.stretch[0]) * hashCell(ix, iy, 4 + salt);
        const rot = hashCell(ix, iy, 5 + salt) * Math.PI;
        const ex = Math.cos(rot) * (e - 1) * r * 0.5,
            ey = Math.sin(rot) * (e - 1) * r * 0.5;
        x.moveTo(cx + ex + r, cy + ey);
        x.arc(cx + ex, cy + ey, r, 0, Math.PI * 2);
        if (e > 1.05) {
            x.moveTo(cx - ex + r, cy - ey);
            x.arc(cx - ex, cy - ey, r, 0, Math.PI * 2);
        }
    }
    // 알파 이진화 — 가장자리 반투명 픽셀을 nearest 로 키우면 흐린 블록이 된다
    function binarizeAlpha(x, cv) {
        const img = x.getImageData(0, 0, cv.width, cv.height);
        const a = img.data;
        for (let k = 3; k < a.length; k += 4) a[k] = a[k] >= 110 ? 255 : 0;
        x.putImageData(img, 0, 0);
    }

    function buildStipple(stroke) {
        const S = CFG.outline.stipple;
        const gap = S.gap ?? 0;
        const c = S.cell,
            w = S.width + gap, // 거리 격자가 덮는 범위 = 띄움 + 띠 두께
            ox = CFG.halo.ox ?? 0,
            oy = CFG.halo.oy ?? 0;
        let x0 = Infinity,
            y0 = Infinity,
            x1 = -Infinity,
            y1 = -Infinity;
        for (const poly of stroke.outline)
            for (const q of poly) {
                if (q.x < x0) x0 = q.x;
                if (q.x > x1) x1 = q.x;
                if (q.y < y0) y0 = q.y;
                if (q.y > y1) y1 = q.y;
            }
        const gx0 = Math.floor((x0 - w - ox) / c),
            gy0 = Math.floor((y0 - w - oy) / c);
        const nx = Math.floor((x1 + w - ox) / c) - gx0 + 1,
            ny = Math.floor((y1 + w - oy) / c) - gy0 + 1;
        if (nx * ny > 4e6) return;
        // 칸마다 윤곽까지 최단거리
        const dist = new Float32Array(nx * ny).fill(w);
        for (const poly of stroke.outline)
            for (let i = 1; i < poly.length; i++) {
                const a = poly[i - 1],
                    b = poly[i];
                const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - w - ox) / c) - gx0),
                    i1 = Math.min(nx - 1, Math.floor((Math.max(a.x, b.x) + w - ox) / c) - gx0),
                    j0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - w - oy) / c) - gy0),
                    j1 = Math.min(ny - 1, Math.floor((Math.max(a.y, b.y) + w - oy) / c) - gy0);
                const bx = b.x - a.x,
                    by = b.y - a.y,
                    bb = bx * bx + by * by || 1e-9;
                for (let j = j0; j <= j1; j++) {
                    const py = oy + (gy0 + j + 0.5) * c - a.y;
                    for (let i = i0; i <= i1; i++) {
                        const px = ox + (gx0 + i + 0.5) * c - a.x;
                        const h = Math.max(0, Math.min(1, (px * bx + py * by) / bb));
                        const dx = px - bx * h,
                            dy = py - by * h;
                        const d2 = dx * dx + dy * dy;
                        const k = j * nx + i;
                        if (d2 < dist[k] * dist[k]) dist[k] = Math.sqrt(d2);
                    }
                }
            }
        // 칸 중심이 윤곽 안인지 — 행마다 윤곽선과의 교점을 모아 evenodd 로 칠한다(스캔라인). 안쪽 칸엔 점을 안 둔다
        // (점을 지우개로 자르지 않고 통째로 빼야 반쪽 점이 안 생긴다)
        const inside = new Uint8Array(nx * ny);
        const cross = Array.from({ length: ny }, () => []);
        for (const poly of stroke.outline)
            for (let i = 1; i < poly.length; i++) {
                const a = poly[i - 1],
                    b = poly[i];
                if (a.y === b.y) continue;
                const lo = Math.min(a.y, b.y),
                    hi = Math.max(a.y, b.y);
                const j0 = Math.max(0, Math.ceil((lo - oy) / c - 0.5) - gy0),
                    j1 = Math.min(ny - 1, Math.ceil((hi - oy) / c - 0.5) - gy0 - 1);
                for (let j = j0; j <= j1; j++) {
                    const y = oy + (gy0 + j + 0.5) * c;
                    if (y < lo || y >= hi) continue;
                    cross[j].push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
                }
            }
        for (let j = 0; j < ny; j++) {
            const xs = cross[j].sort((p, q) => p - q);
            for (let k = 0; k + 1 < xs.length; k += 2) {
                const i0 = Math.max(0, Math.ceil((xs[k] - ox) / c - 0.5) - gx0),
                    i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - ox) / c - 0.5) - gx0);
                for (let i = i0; i <= i1; i++) inside[j * nx + i] = 1;
            }
        }
        // 캔버스 = 격자 범위 (+ 점 반지름 여유). px > 0 이면 CSS px 당 1/px 해상도로 찍고 알파를 이진화해
        // nearest 로 키운다 — 점이 또렷한 픽셀 덩어리가 된다. 원점은 px 배수로 맞춰 화면 픽셀 격자와 어긋나지 않게
        const pad = S.size[1] * S.stretch[1] + 1;
        const px = S.px > 0 ? S.px : 0;
        const snap = v => (px ? Math.floor(v / px) * px : v);
        const X = snap(ox + gx0 * c - pad),
            Y = snap(oy + gy0 * c - pad);
        const cw = Math.ceil((nx * c + pad * 2) / (px || 1)) * (px || 1),
            ch = Math.ceil((ny * c + pad * 2) / (px || 1)) * (px || 1);
        const res = px ? 1 / px : dpr;
        const st = stroke._st ?? { cv: document.createElement('canvas') };
        st.cv.width = Math.max(1, Math.round(cw * res));
        st.cv.height = Math.max(1, Math.round(ch * res));
        const x = st.cv.getContext('2d', { willReadFrequently: !!px });
        x.setTransform(res, 0, 0, res, -X * res, -Y * res);
        x.fillStyle = S.color;
        x.beginPath();
        for (let j = 0; j < ny; j++)
            for (let i = 0; i < nx; i++) {
                const d = dist[j * nx + i];
                if (d >= w || d < gap || inside[j * nx + i]) continue;
                const ix = gx0 + i,
                    iy = gy0 + j;
                if (hashCell(ix, iy, 0) >= S.edge * Math.pow(1 - (d - gap) / S.width, S.gamma)) continue;
                stippleDot(x, ox, oy, ix, iy, S, 0);
            }
        x.fill();
        if (px) binarizeAlpha(x, st.cv);
        Object.assign(st, { x: X, y: Y, w: cw, h: ch, src: stroke.outline, t: performance.now() });
        stroke._st = st;
    }

    // 획들의 윤곽선을 한 번에. stipple 이면 점을, glow 면 띠를 glow2d 에 쌓고 → 모든 획의 윤곽 안을 지운 뒤 → c 로 옮긴다
    // (한 장에서 지우므로 이웃 단어 안으로도 번지지 않는다)
    function drawOutlines(c, list) {
        const G = CFG.outline.glow;
        const S = CFG.outline.stipple;
        if (S?.on) {
            if (!list.some(st => st?.outline?.length)) return;
            gctx.clearRect(0, 0, W, H);
            gctx.save();
            gctx.imageSmoothingEnabled = !(S.px > 0);
            // 윤곽이 바뀐 획도 한 번 그리기에 하나만, 같은 획은 interval ms 에 한 번만 점을 다시 찍는다
            let budget = 1;
            const now = performance.now();
            for (const st of list) {
                if (!st.outline?.length) continue;
                const stale = st._st?.src !== st.outline;
                if (!st._st || (stale && budget > 0 && now - st._st.t >= (S.interval ?? 100))) {
                    if (st._st) budget--;
                    buildStipple(st);
                }
                if (st._st) gctx.drawImage(st._st.cv, st._st.x, st._st.y, st._st.w, st._st.h);
            }
            // 윤곽 안은 지우지 않는다 — 안쪽 칸엔 애초에 점이 없다(buildStipple). 지우면 경계에 걸친 점이 반쪽이 된다
            gctx.restore();
            c.drawImage(glow2d, 0, 0, W, H);
            return;
        }
        const paths = list.map(outlinePath).filter(Boolean);
        if (!paths.length) return;
        if (!G?.on) {
            c.strokeStyle = CFG.outline.style;
            c.lineWidth = CFG.outline.width;
            c.lineJoin = 'round';
            c.setLineDash(CFG.outline.dash || []);
            for (const p of paths) c.stroke(p);
            c.setLineDash([]);
            return;
        }
        const n = Math.max(1, Math.round(G.steps));
        // 겹 i(1..n) 는 윤곽에서 width·i/n 까지 덮는다. 거리 띠 k 의 목표 불투명도 O_k = edge·(1 − (k−1)/n) 가
        // 되도록 바깥 겹부터: a_n = O_n, a_k = 1 − (1 − O_k)/(1 − O_{k+1})
        const O = k => (k > n ? 0 : G.edge * (1 - (k - 1) / n));
        gctx.clearRect(0, 0, W, H);
        gctx.save();
        gctx.strokeStyle = G.color;
        gctx.lineJoin = 'round';
        gctx.lineCap = 'round';
        for (let k = n; k >= 1; k--) {
            gctx.globalAlpha = 1 - (1 - O(k)) / (1 - O(k + 1));
            gctx.lineWidth = (2 * G.width * k) / n;
            for (const p of paths) gctx.stroke(p);
        }
        gctx.globalAlpha = 1;
        gctx.globalCompositeOperation = 'destination-out';
        for (const p of paths) gctx.fill(p, 'evenodd');
        gctx.restore();
        c.drawImage(glow2d, 0, 0, W, H);
    }

    // 성게 가시 (orb.spike) — orb 반대쪽 법선 방향 반구로 가시 n 개. 모양은 orb 시드의 순수 함수
    function spikePaths(stroke, line) {
        const S = CFG.orb.spike;
        if (!S?.on || !CFG.orb.on) return [];
        const out = [];
        const sp = CFG.spacing;
        for (const o of stroke.orbs) {
            if (!o.spikes) continue;
            const p = sample(Math.min(o.px, (line.length - 1) * sp) / sp, line);
            if (!p) continue;
            const side = o.off >= 0 ? -1 : 1; // orb 의 반대편
            const a0 = Math.atan2(p.ny * side, p.nx * side);
            const rng = makeRng(hashSeed(o.seed, 'spike'));
            const n = Math.max(3, Math.round(o.spikes.n));
            const L = o.spikes.len;
            const step = (2 * S.spread) / n;
            const path = new Path2D();
            path.moveTo(p.x, p.y);
            for (let i = 0; i < n; i++) {
                const a = a0 - S.spread + step * (i + 0.5) + (rng() - 0.5) * step * S.jitter;
                const r = L * (1 - S.jitter * 0.6 * rng()) * (rng() < 0.2 ? 1.35 : 1); // 이따금 유난히 긴 가시
                const va = a0 - S.spread + step * i;
                const vr = L * S.depth * (0.6 + 0.8 * rng());
                path.lineTo(p.x + Math.cos(va) * vr, p.y + Math.sin(va) * vr);
                path.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
            }
            const va = a0 + S.spread;
            path.lineTo(p.x + Math.cos(va) * L * S.depth, p.y + Math.sin(va) * L * S.depth);
            path.closePath();
            out.push(path);
        }
        return out;
    }

    // withOutline: 윤곽선 애니메이션 중이면 false — 윤곽선은 advanceOutlineAnims 가 따로 긋는다
    function drawStrokeInk(c, stroke, withOutline = true) {
        if (withOutline) drawOutlines(c, [stroke]);
        const line = stroke.spineInk ?? stroke.spine;
        if (line) {
            const K = CFG.spineCasing;
            const spikes = spikePaths(stroke, line);
            // 테두리를 전부 긋고 몸통을 전부 칠한다 — 가시와 실선이 이음매 없이 한 몸
            const border = K?.on ? K.border : CFG.orb.spike.border;
            const bw = K?.on ? K.borderWidth : CFG.orb.spike.borderWidth;
            const fill = K?.on ? K.fill : CFG.orb.spike.fill;
            if (spikes.length) {
                c.lineJoin = 'miter';
                c.miterLimit = 30;
                c.fillStyle = c.strokeStyle = border;
                c.lineWidth = 2 * bw;
                for (const p of spikes) (c.fill(p), c.stroke(p));
            }
            if (K?.on) {
                strokePolyline(c, line, K.border, K.width + 2 * K.borderWidth);
                strokePolyline(c, line, K.fill, K.width);
            } else strokePolyline(c, line, CFG.baseStyle, CFG.lineWidth);
            if (spikes.length) {
                c.fillStyle = fill;
                for (const p of spikes) c.fill(p);
            }
        }
        for (const d of stroke.decor) {
            if (CFG.decorFill) {
                c.fillStyle = CFG.decorFill;
                c.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
            }
            if (CFG.decorStyle && CFG.decorLineWidth > 0) {
                c.strokeStyle = CFG.decorStyle;
                c.lineWidth = CFG.decorLineWidth;
                c.strokeRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
            }
        }
        for (const poly of stroke.compPolys) {
            strokePolyline(c, poly, CFG.companionStyle, CFG.lineWidth, CFG.companionDash);
            drawArrowhead(c, poly.at(-1), poly.at(-3) || poly.at(-2), CFG.arrowSize);
        }
    }

    // ───────────────────── main bead — 획마다 하나, 실선을 왕복한다 ─────────────────────
    // 끝에 닿으면 되돌아온다(ping-pong) — 처음으로 순간이동하지 않아 위치·방향이 늘 연속이다.
    // 진행 방향이 뒤집혀도 orb 의 대시는 방향 없는 선이라(π 대칭) 모양이 튀지 않는다.
    // 같은 프레임 안에서 orb 와 bead 그리기가 같이 쓰므로 프레임마다 한 번만 계산해 둔다.
    let frameNo = 0;
    const mainEpochs = new Map(); // bead.main.waitLive — 단어 키 → 완결된 시각(초)
    function mainBead(stroke, time) {
        if (stroke._mainFrame === frameNo) return stroke._main;
        stroke._mainFrame = frameNo;
        stroke._main = null;
        const M = CFG.bead.main;
        const line = stroke.spineInk ?? stroke.spine;
        if (!M?.on || !line || line.length < 2) return null;
        const sp = CFG.spacing;
        const len = (line.length - 1) * sp;
        if (M.waitLive) {
            let pos = len;
            if (stroke !== liveStroke) {
                const idx = strokes.indexOf(stroke);
                let occ = 0;
                for (let i = 0; i < idx; i++) if (strokes[i].seed === stroke.seed) occ++;
                const key = stroke.seed + '#' + occ + '#' + Math.round(len);
                let t0 = mainEpochs.get(key);
                if (t0 === undefined) {
                    mainEpochs.set(key, (t0 = time));
                    if (mainEpochs.size > 600) mainEpochs.delete(mainEpochs.keys().next().value);
                }
                const dt = M.fps > 0 ? Math.floor((time - t0) * M.fps) / M.fps : time - t0;
                const u = (M.speed * dt + len) % (2 * len); // 끝(len)에서 출발해 되돌아온다
                pos = u < len ? u : 2 * len - u;
            }
            const p = sample(pos / sp, line);
            if (!p) return null;
            stroke._main = { x: p.x, y: p.y, ang: p.angle };
            return stroke._main;
        }
        // 출발 위치를 획마다 다르게 — 여러 단어의 main bead 가 줄 맞춰 움직이지 않게
        const phase = makeRng(hashSeed(stroke.seed, 'main'))() * 2 * len;
        // 획마다 박자를 어긋나게 — 여러 bead 가 같은 순간에 한꺼번에 뛰지 않게
        const t = M.fps > 0 ? (Math.floor(time * M.fps + phase) - phase) / M.fps : time;
        const u = (M.speed * t + phase) % (2 * len);
        const pos = u < len ? u : 2 * len - u;
        const p = sample(pos / sp, line);
        if (!p) return null;
        stroke._main = { x: p.x, y: p.y, ang: p.angle };
        return stroke._main;
    }

    // CSS 색 문자열 → [r,g,b] (rgb()/hex/이름 전부). 2D 컨텍스트가 정규화해 준다
    const colorCtx = document.createElement('canvas').getContext('2d');
    const colorCache = new Map();
    function rgbOf(css) {
        if (colorCache.has(css)) return colorCache.get(css);
        colorCtx.fillStyle = '#000';
        colorCtx.fillStyle = css;
        const v = colorCtx.fillStyle; // '#rrggbb' 또는 'rgba(r, g, b, a)'
        const rgb = v.startsWith('#')
            ? [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16))
            : v
                  .match(/[\d.]+/g)
                  .slice(0, 3)
                  .map(Number);
        colorCache.set(css, rgb);
        return rgb;
    }

    // main bead 스티플 — 같은 radial 알파(core 안 1, 밖 (1-s)^falloff)를 점 밀도로. bead 는 매 프레임 움직이므로
    // 점 무늬를 frames 장 미리 찍어 두고(bead 국소 좌표) 붙이기만 한다. 장을 fps 로 바꿔 무늬가 끓게(frames 1 = 고정)
    let mainSprites = null;
    function mainStippleSprites() {
        const M = CFG.bead.main;
        const S = { ...CFG.outline.stipple, ...(M.stipple ?? {}) };
        const key = JSON.stringify([M.radius, M.fill, M.glow, S, dpr]);
        if (mainSprites?.key === key) return mainSprites;
        const R = M.radius;
        const core = Math.min(Math.max(M.glow?.core ?? 0.45, 0), 0.99);
        const px = S.px > 0 ? S.px : 0;
        const pad = S.size[1] * S.stretch[1] + 1;
        const half = Math.ceil((R + pad) / (px || 1)) * (px || 1); // 스프라이트 반폭 (px 배수)
        const res = px ? 1 / px : dpr;
        const n = Math.max(-Math.ceil(R / S.cell), -1e4);
        const frames = [];
        for (let f = 0; f < Math.max(1, S.frames ?? 1); f++) {
            const cv = document.createElement('canvas');
            cv.width = cv.height = Math.max(1, Math.round(half * 2 * res));
            const x = cv.getContext('2d', { willReadFrequently: !!px });
            x.setTransform(res, 0, 0, res, half * res, half * res);
            x.fillStyle = M.fill;
            x.beginPath();
            const salt = f * 7;
            for (let iy = n - 1; iy <= -n; iy++)
                for (let ix = n - 1; ix <= -n; ix++) {
                    const d = Math.hypot((ix + 0.5) * S.cell, (iy + 0.5) * S.cell) / R;
                    if (d >= 1) continue;
                    const pr = d <= core ? 1 : Math.pow(1 - (d - core) / (1 - core), M.glow?.falloff ?? 1.4);
                    if (hashCell(ix, iy, salt) >= (S.edge ?? 1) * pr) continue;
                    stippleDot(x, 0, 0, ix, iy, S, salt);
                }
            x.fill();
            if (px) binarizeAlpha(x, cv);
            frames.push(cv);
        }
        mainSprites = { key, frames, half, px };
        return mainSprites;
    }

    function drawMainBead(c, stroke, time) {
        const m = mainBead(stroke, time);
        if (!m) return;
        const M = CFG.bead.main;
        if (M.stipple?.on && M.fill) {
            const sp = mainStippleSprites();
            const fps = M.stipple.fps ?? 6;
            const k = (Math.floor(time * fps) + (stroke.seed >>> 0)) % sp.frames.length;
            const snap = v => (sp.px ? Math.round(v / sp.px) * sp.px : v);
            const smooth = c.imageSmoothingEnabled;
            c.imageSmoothingEnabled = !sp.px;
            c.drawImage(sp.frames[k], snap(m.x) - sp.half, snap(m.y) - sp.half, sp.half * 2, sp.half * 2);
            c.imageSmoothingEnabled = smooth;
            return;
        }
        if (M.glow?.on && M.fill) {
            // 배경 투명 radial gradient — core 까지 꽉 찬 색, 그 밖은 알파만 (1-s)^falloff 로 줄인다
            const [r, g, b] = rgbOf(M.fill);
            const core = Math.min(Math.max(M.glow.core, 0), 0.99);
            const grad = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, M.radius);
            grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
            grad.addColorStop(core, `rgba(${r},${g},${b},1)`);
            const N = 8; // 중간 단계 — 선형 보간 띠가 보이지 않을 만큼
            for (let k = 1; k <= N; k++) {
                const s = k / N;
                const a = Math.pow(1 - s, M.glow.falloff);
                grad.addColorStop(core + (1 - core) * s, `rgba(${r},${g},${b},${a.toFixed(4)})`);
            }
            c.beginPath();
            c.arc(m.x, m.y, M.radius, 0, Math.PI * 2);
            c.fillStyle = grad;
            c.fill();
            return;
        }
        c.beginPath();
        c.arc(m.x, m.y, M.radius, 0, Math.PI * 2);
        if (M.fill) {
            c.fillStyle = M.fill;
            c.fill();
        }
        if (M.stroke) {
            c.strokeStyle = M.stroke;
            c.lineWidth = M.lineWidth;
            c.stroke();
        }
    }

    // ───────────────────── orb — 노란 원 + 내부 flow field ─────────────────────
    // 짧은 대시를 촘촘한 격자에 놓고, 각 대시를 그 자리의 벡터장 방향으로 돌린다 (hatch 형 flow field).
    // 벡터장 = 노이즈 기본장을 그 획 main bead 의 진행 방향 쪽으로 follow 만큼 돌린 것.
    // bead 와 가까울수록(falloff) 더 많이 돈다. bead 가 움직인 만큼 노이즈 표본 위치도
    // drift 배로 밀려서 무늬가 bead 를 따라 흘러간다. 매 프레임 다시 그린다(굽지 않음).
    // 노이즈는 orb 국소 좌표 + orb 시드 → bead 가 없으면 같은 orb 는 어디서나 같은 무늬.

    // 2D value noise [0,1) — 시드마다 다른 장
    function makeNoise2(seed) {
        const s = (seed >>> 0) % 9973;
        const h = (i, j) => {
            const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
            return x - Math.floor(x);
        };
        return (x, y) => {
            const i = Math.floor(x),
                j = Math.floor(y);
            const fx = x - i,
                fy = y - j;
            const ux = fx * fx * (3 - 2 * fx),
                uy = fy * fy * (3 - 2 * fy);
            const a = h(i, j) + (h(i + 1, j) - h(i, j)) * ux;
            const b = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * ux;
            return a + (b - a) * uy;
        };
    }

    // 대시는 방향이 없다 → 각도 차이를 [-π/2, π/2] 로 접는다
    const halfTurn = a => a - Math.PI * Math.round(a / Math.PI);

    // 부채 — 밑변(살 0) = 실선 뒤쪽, 살 i 는 바깥쪽으로 min(i·step, 펼침·π) 만큼 돈다.
    // 프레임마다 한 번 계산해 두고 그리기·윤곽선·halo 가 같이 쓴다
    const fanMode = () => CFG.orb.on && CFG.orb.style === 'fan';
    function fanGeom(stroke, time) {
        if (stroke._fanFrame === frameNo) return stroke._fan;
        stroke._fanFrame = frameNo;
        const O = CFG.orb;
        const F = O.fan;
        const m = mainBead(stroke, time);
        const out = [];
        for (const orb of stroke.orbs) {
            if (orb.ang === undefined) continue;
            const side = orb.off < 0 ? -1 : 1;
            const nx = Math.cos(orb.ang + Math.PI / 2) * side,
                ny = Math.sin(orb.ang + Math.PI / 2) * side;
            const px = orb.x - nx * orb.r,
                py = orb.y - ny * orb.r;
            let open = F.min;
            if (m) {
                const d = Math.hypot(px - m.x, py - m.y);
                const t = Math.min(1, Math.max(0, (F.far - d) / Math.max(F.far - F.near, 1e-6)));
                open = F.min + (1 - F.min) * t * t * (3 - 2 * t);
            }
            const n = Math.max(2, Math.round(orb.rays ?? F.rays));
            const step = Math.PI / (n - 1);
            const L = orb.r * F.len;
            const tips = [];
            let last = -1;
            for (let i = 0; i < n; i++) {
                const th = Math.min(i * step, open * Math.PI);
                if (th === last) continue; // 안 펼친 살은 맨 앞 살 아래 겹쳐 있다 — 한 번만
                last = th;
                const a = orb.ang + Math.PI - side * th;
                tips.push({ x: px + Math.cos(a) * L, y: py + Math.sin(a) * L });
            }
            out.push({ px, py, L, open, tips, width: orb.width ?? F.width, fill: orb.fill ?? O.fill });
        }
        stroke._fan = out;
        return out;
    }

    function drawFans(c, stroke, time) {
        c.lineCap = CFG.orb.fan.cap;
        for (const f of fanGeom(stroke, time)) {
            c.beginPath();
            for (const t of f.tips) {
                c.moveTo(f.px, f.py);
                c.lineTo(t.x, t.y);
            }
            c.strokeStyle = fanStroke(c, f);
            c.lineWidth = f.width;
            c.stroke();
        }
    }

    // 살 색 — heart 가 켜져 있으면 중심에서 바깥으로 tint 섞인 색 → fill
    function fanStroke(c, f) {
        const K = CFG.orb.fan.heart;
        if (!K?.on || !f.tips.length) return f.fill;
        let R = 0;
        for (const t of f.tips) R = Math.max(R, Math.hypot(t.x - f.px, t.y - f.py));
        if (!(R > 0)) return f.fill;
        const a = rgbOf(f.fill),
            b = rgbOf(K.tint);
        const m = a.map((v, i) => Math.round(v + (b[i] - v) * K.amount));
        const g = c.createRadialGradient(f.px, f.py, 0, f.px, f.py, R);
        g.addColorStop(0, `rgb(${m[0]}, ${m[1]}, ${m[2]})`);
        g.addColorStop(Math.min(1, Math.max(0, K.extent)), f.fill);
        return g;
    }

    // 살 → 밀도 캡슐 (윤곽선·halo 용)
    function fanCaps(stroke, time) {
        const caps = [];
        for (const f of fanGeom(stroke, time))
            for (const t of f.tips)
                caps.push({ ax: f.px, ay: f.py, bx: t.x, by: t.y, r: f.width / 2, w: CFG.orb.bulge, reach: CFG.orb.fan.reach });
        return caps;
    }
    // 다 펼쳤을 때 살이 닿는 범위 — 윤곽 격자가 덮어야 하는 곳
    function fanExtent(stroke, reach) {
        let b = null;
        for (const orb of stroke.orbs) {
            const L = orb.r * CFG.orb.fan.len + (orb.width ?? CFG.orb.fan.width) + reach + orb.r;
            const e = [orb.x - L, orb.y - L, orb.x + L, orb.y + L];
            b = b ? [Math.min(b[0], e[0]), Math.min(b[1], e[1]), Math.max(b[2], e[2]), Math.max(b[3], e[3])] : e;
        }
        return b;
    }
    const fanKey = stroke => (stroke._fan ?? []).map(f => Math.round(f.open * 240)).join(',');

    // 부채가 있는 획의 윤곽선 — 격자는 캐시, 살만 더해 다시 뽑는다
    function fanOutline(stroke, time) {
        if (!stroke._grid) {
            stroke._grid = densityGrid(outlineSegs(stroke), {
                ...CFG.outline,
                compCap: CFG.goo.compCap,
                extra: fanExtent(stroke, CFG.outline.reach),
            });
        }
        if (!stroke._grid) return;
        fanGeom(stroke, time);
        stroke._fanKey = fanKey(stroke);
        stroke.outline = contourGrid(addCapsules(stroke._grid, fanCaps(stroke, time)), CFG.outline.th);
    }

    // 프레임마다: 펼침이 바뀐 획 중 오래 기다린 것부터 budget 개만 윤곽선을 다시 뽑는다
    let fanCursor = 0;
    function updateFanOutlines(time) {
        if (!fanMode() || !CFG.outline.on) return;
        const list = strokes.filter(s => s.orbs.length && s._grid);
        if (liveStroke?.orbs.length && liveStroke._grid) list.push(liveStroke);
        let done = 0;
        for (let k = 0; k < list.length && done < CFG.orb.fan.budget; k++) {
            const s = list[(fanCursor + k) % list.length];
            fanGeom(s, time);
            if (fanKey(s) === s._fanKey) continue;
            fanOutline(s, time);
            done++;
        }
        fanCursor = list.length ? (fanCursor + 1) % list.length : 0;
    }

    // halo — 부채가 덮는 칸만 매 프레임 덧칠한다 (기본 블록은 부채 없이 구워져 있다)
    function drawFanHalo(c, stroke, time) {
        if (!stroke.orbs.length) return;
        const H = haloOpts();
        if (!stroke._haloSample) stroke._haloSample = densitySampler(outlineSegs(stroke), H);
        const caps = fanCaps(stroke, time);
        if (!caps.length) return;
        const { cell, ox, oy } = H;
        let x0 = Infinity,
            y0 = Infinity,
            x1 = -Infinity,
            y1 = -Infinity;
        for (const k of caps) {
            const pad = (k.reach ?? H.reach) + k.r;
            x0 = Math.min(x0, k.ax - pad, k.bx - pad);
            y0 = Math.min(y0, k.ay - pad, k.by - pad);
            x1 = Math.max(x1, k.ax + pad, k.bx + pad);
            y1 = Math.max(y1, k.ay + pad, k.by + pad);
        }
        const per = perSylHalo(stroke);
        const xy = [];
        if (!per) {
            c.fillStyle = haloFill(c, cellsBox(stroke.halo)); // whole 이면 단어 블록 범위 그대로 — 부채 칸도 같은 그라데이션 위에
            c.beginPath();
        }
        for (let gy = Math.floor((y0 - oy) / cell); gy <= Math.floor((y1 - oy) / cell); gy++)
            for (let gx = Math.floor((x0 - ox) / cell); gx <= Math.floor((x1 - ox) / cell); gx++) {
                const cx = ox + (gx + 0.5) * cell,
                    cy = oy + (gy + 0.5) * cell;
                if (stroke._haloSample(cx, cy) + capsuleDensity(caps, H.reach, cx, cy) > H.th) {
                    if (per) xy.push(ox + gx * cell, oy + gy * cell);
                    else c.rect(ox + gx * cell, oy + gy * cell, cell, cell);
                }
            }
        if (per) fillGroups(c, stroke, groupCellsByAngle(stroke, xy));
        else c.fill();
    }

    function drawOrbs(c, stroke, time) {
        if (!CFG.orb.on || !stroke.orbs.length) return;
        if (CFG.orb.style === 'fan') return drawFans(c, stroke, time);
        const O = CFG.orb;
        const F = O.flow;
        const m = mainBead(stroke, time);
        for (const orb of stroke.orbs) {
            if (!orb._nz) orb._nz = makeNoise2(orb.seed);
            const nz = orb._nz;
            // bead 와의 거리로 따라가는 정도를 정한다 (falloff 0 = 거리 무관)
            const d = m ? Math.hypot(orb.x - m.x, orb.y - m.y) : 0;
            const w = m ? F.follow * (F.falloff > 0 ? Math.exp(-d / F.falloff) : 1) : 0;
            // 노이즈 표본 이동 = bead 위치 × drift → bead 가 간 만큼 무늬가 흐른다
            const ox = m ? m.x * F.drift : 0,
                oy = m ? m.y * F.drift : 0;

            c.save();
            c.translate(orb.x, orb.y);
            c.beginPath();
            c.arc(0, 0, orb.r, 0, Math.PI * 2);
            c.fillStyle = orb.fill ?? O.fill;
            c.fill();
            c.clip();

            c.beginPath();
            const r = orb.r;
            const half = F.dash * 0.5;
            const rIn = r + half; // 가장자리 대시는 clip 이 잘라 준다
            let row = 0;
            for (let y = -r; y <= r; y += F.cell, row++) {
                // 줄마다 반 칸 엇갈리게 — 참고 이미지처럼 대시가 세로로 줄 서지 않는다
                const x0 = -r + (row % 2 ? F.cell * 0.5 : 0);
                for (let x = x0; x <= r; x += F.cell) {
                    if (x * x + y * y > rIn * rIn) continue;
                    const base = nz((x - ox) * F.scale + 17.3, (y - oy) * F.scale - 5.1) * Math.PI * 2 * F.turns;
                    const a = m ? base + w * halfTurn(m.ang - base) : base;
                    const dx = Math.cos(a) * half,
                        dy = Math.sin(a) * half;
                    c.moveTo(x - dx, y - dy);
                    c.lineTo(x + dx, y + dy);
                }
            }
            c.strokeStyle = F.style;
            c.lineWidth = F.width;
            c.lineCap = 'butt';
            c.stroke();
            c.restore();

            if (O.ring) {
                c.beginPath();
                c.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
                c.strokeStyle = O.ring;
                c.lineWidth = O.ringWidth;
                c.stroke();
            }
        }
    }

    // ───────────────────── bead — 실선을 타고 흐르는 원 ─────────────────────
    // 굽지 않는다. 매 프레임 오버레이에 현재 시각 기준으로 그린다.
    // 간격·반경은 획 시드 스트림 → 같은 획이면 같은 구슬 배열이 같은 속도로 흐른다.
    function drawBeads(c, stroke, time) {
        const B = CFG.bead;
        const line = stroke.spineInk ?? stroke.spine;
        if (!line || line.length < 2) return;
        const sp = CFG.spacing;
        const len = (line.length - 1) * sp;
        const rng = makeRng(hashSeed(stroke.seed, 'bead'));
        const kindRng = makeRng(hashSeed(stroke.seed, 'beadKind')); // glyph 종류 — 위치 난수열과 따로
        const shift = (B.speed * time) % Math.max(len, 1);
        let cursor = rnd2(rng, B.gap);
        const C = B.cluster?.on ? B.cluster : null;
        let left = C ? Math.round(rnd2(rng, C.size)) : 0; // 지금 무리에 남은 구슬 수
        c.fillStyle = B.fill;
        if (B.stroke) {
            c.strokeStyle = B.stroke;
            c.lineWidth = B.lineWidth;
        }
        while (cursor < len) {
            const r0 = rnd2(rng, B.radius);
            const pos = (cursor + shift) % len;
            // 양 끝에서 작아지며 사라진다 — 한 바퀴 돌아 처음으로 넘어갈 때 툭 튀지 않게
            const fade = Math.min(1, pos / (r0 * 4), (len - pos) / (r0 * 4));
            const p = sample(pos / sp, line);
            if (p && fade > 0.05) {
                if (B.shape === 'star') {
                    // * — 살 arms 개, 길이 r × scale, 진행 방향을 따라 돈다 (색 = fill)
                    const S = B.star ?? {};
                    const n = Math.max(2, Math.round(S.arms ?? 6));
                    const R = r0 * fade * (S.scale ?? 1.6);
                    c.beginPath();
                    for (let k = 0; k < n; k++) {
                        const a = p.angle + (S.turn ?? 0) + (k * Math.PI * 2) / n;
                        c.moveTo(p.x, p.y);
                        c.lineTo(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
                    }
                    c.strokeStyle = B.fill;
                    c.lineWidth = S.width ?? 1;
                    c.lineCap = 'butt';
                    c.stroke();
                } else if (B.shape === 'glyph') {
                    const G = B.glyph ?? {};
                    const kinds = G.kinds?.length ? G.kinds : ['sparkle'];
                    const kind = kinds[Math.floor(kindRng() * kinds.length) % kinds.length];
                    drawBeadGlyph(c, kind, p.x, p.y, p.angle + (G.turn ?? 0), r0 * fade * (G.scale ?? 2.4));
                    c.fillStyle = B.fill;
                    c.fill();
                } else {
                    c.beginPath();
                    c.arc(p.x, p.y, r0 * fade, 0, Math.PI * 2);
                    if (B.fill) c.fill();
                    if (B.stroke) c.stroke();
                }
            }
            if (C && --left > 0) cursor += rnd2(rng, C.gap);
            else {
                cursor += rnd2(rng, B.gap);
                if (C) left = Math.round(rnd2(rng, C.size));
            }
        }
    }
    // ───────────── 도장 찍는 bead (bead.walker) ─────────────
    // 살 반쪽(골짜기 V → 끝 T)의 cubic 제어점 [V, C1, C2, T], 국소 (u = 살 방향, v = 옆). m 0 ✦ / m 1 ✤ 사이를 섞는다
    const MORPH_A = [0.28, -0.28, 0.45, -0.12, 0.78, -0.03, 1, 0]; // ✦ 끝 뾰족, 가운데 뚱뚱 (오목한 변)
    const MORPH_B = [0.05, -0.05, 0.3, -0.02, 1.0, -0.8, 1, 0]; // ✤ 가는 목 끝 둥근 풍선 (끝 접선이 수직)
    function drawMorphGlyph(c, x, y, a, R, m) {
        const q = MORPH_A.map((v, i) => v + (MORPH_B[i] - v) * m);
        c.beginPath();
        for (let k = 0; k < 4; k++) {
            const t = a + (k * Math.PI) / 2;
            const cs = Math.cos(t),
                sn = Math.sin(t);
            const P = (u, v) => [x + (cs * u - sn * v) * R, y + (sn * u + cs * v) * R];
            if (k === 0) c.moveTo(...P(q[0], q[1]));
            c.bezierCurveTo(...P(q[2], q[3]), ...P(q[4], q[5]), ...P(q[6], q[7]));
            c.bezierCurveTo(...P(q[4], -q[5]), ...P(q[2], -q[3]), ...P(q[0], -q[1]));
        }
        c.closePath();
    }
    const stampEpochs = new Map(); // 단어 키 → 처음 보인 시각(초)
    const walkerMorph = (W, seed, tau) => {
        const ph = makeRng(hashSeed(seed, 'morph'))() * Math.PI * 2;
        return 0.5 - 0.5 * Math.cos((tau / W.morph) * Math.PI * 2 + ph);
    };
    // key = 시드#같은 시드 순번#길이 — 글자가 바뀌면(시드·길이) 새 단어로 친다
    function drawWalker(c, stroke, time, key) {
        const W = CFG.bead.walker;
        const line = stroke.spineInk ?? stroke.spine;
        if (!line || line.length < 2) return;
        const sp = CFG.spacing;
        const len = (line.length - 1) * sp;
        key += '#' + Math.round(len);
        let epoch = stampEpochs.get(key);
        if (epoch === undefined) {
            stampEpochs.set(key, (epoch = time));
            if (stampEpochs.size > 600) stampEpochs.delete(stampEpochs.keys().next().value);
        }
        const phase = makeRng(hashSeed(stroke.seed, 'walker'))() * 2 * len;
        const { plan } = stroke;
        const at = tau => {
            const u = (W.speed * tau + phase) % (2 * len);
            const pos = u < len ? u : 2 * len - u;
            const p = sample(pos / sp, line);
            if (!p) return null;
            let j = 0;
            while (j + 1 < plan.length && plan[j + 1].px0 <= pos) j++;
            return { x: p.x, y: p.y, angle: p.angle, R: plan[j]?.walkerSize ?? W.size };
        };
        const turn = W.turn ?? 0;
        c.fillStyle = W.fill;
        // 발자국 — 지금 칸부터 거꾸로 max 개 모은다
        const dt = W.gap / Math.max(W.speed, 1e-3);
        const stamps = [];
        for (let i = Math.floor(time / W.every), guard = 0; stamps.length < W.max && (i + 1) * W.every >= epoch && guard < 4000; i--, guard++) {
            const rng = makeRng(hashSeed(stroke.seed, 'stamp', i));
            if (rng() >= W.prob) continue;
            const t0s = (i + rng() * 0.6) * W.every;
            const n = Math.round(rnd2(rng, W.count));
            for (let j = n - 1; j >= 0 && stamps.length < W.max; j--) {
                const tau = t0s + j * dt;
                if (tau <= time && tau >= epoch) stamps.push(tau);
            }
        }
        for (const tau of stamps) {
            const p = at(tau);
            if (!p) continue;
            drawMorphGlyph(c, p.x, p.y, p.angle + turn, p.R, walkerMorph(W, stroke.seed, tau));
            c.fill();
        }
        const p = at(time);
        if (p) {
            drawMorphGlyph(c, p.x, p.y, p.angle + turn, p.R, walkerMorph(W, stroke.seed, time));
            c.fill();
        }
    }

    // 채운 기호 하나의 경로 (fill 은 호출하는 쪽). R = 중심에서 끝까지, a = 회전
    function drawBeadGlyph(c, kind, x, y, a, R) {
        c.beginPath();
        for (let k = 0; k < 4; k++) {
            const t = a + (k * Math.PI) / 2;
            const cs = Math.cos(t),
                sn = Math.sin(t);
            // 국소 좌표 (u = 살 방향, v = 옆) → 화면
            const P = (u, v) => [x + cs * u * R - sn * v * R, y + sn * u * R + cs * v * R];
            if (kind === 'sparkle') {
                // ✦ — 끝 4개를 안으로 오목한 곡선으로 잇는다
                const t2 = t + Math.PI / 2;
                const [ax, ay] = [x + cs * R, y + sn * R];
                const [bx, by] = [x + Math.cos(t2) * R, y + Math.sin(t2) * R];
                const mx = x + Math.cos(t + Math.PI / 4) * R * 0.12,
                    my = y + Math.sin(t + Math.PI / 4) * R * 0.12;
                if (k === 0) c.moveTo(ax, ay);
                c.quadraticCurveTo(mx, my, bx, by);
            } else if (kind === 'teardrop') {
                // ✢ — 가운데가 뾰족하고 끝이 둥근 꽃잎
                c.moveTo(x, y);
                c.bezierCurveTo(...P(0.3, -0.36), ...P(1, -0.32), ...P(1, 0));
                c.bezierCurveTo(...P(1, 0.32), ...P(0.3, 0.36), x, y);
            } else {
                // ✤ — 가는 목 끝에 둥근 풍선
                c.moveTo(x, y);
                c.bezierCurveTo(...P(0.25, -0.07), ...P(0.4, -0.34), ...P(0.7, -0.3));
                c.bezierCurveTo(...P(1.02, -0.26), ...P(1.02, 0.26), ...P(0.7, 0.3));
                c.bezierCurveTo(...P(0.4, 0.34), ...P(0.25, 0.07), x, y);
            }
        }
        if (kind === 'sparkle') c.closePath();
    }
    const rnd2 = (rng, [a, b]) => a + rng() * (b - a);

    // ───────────────────────── 획 관리 ─────────────────────────
    const strokes = []; // 확정된 획의 기하 — replay/undo/리사이즈 대응
    let nextId = 1;
    let liveStroke = null; // 자라는 중인 획 — 마우스든 큐든 여기로 들어온다
    let drawingByMouse = false; // 마우스로 그리는 중이면 큐는 양보한다
    const t0 = performance.now();
    const nowBirth = () => (performance.now() - t0) / 1000 / BIRTH_SCALE;

    // 윤곽선용 세그먼트 — 밀도장에 스탬프되는 것과 같은 선들 (c = 동반 곡선, compCap 반영용)
    function outlineSegs(stroke) {
        const out = [];
        const push = (poly, c) => {
            for (let i = 1; i < poly.length; i++)
                out.push({ ax: poly[i - 1].x, ay: poly[i - 1].y, bx: poly[i].x, by: poly[i].y, c });
        };
        const sp = gooSpine(stroke);
        if (CFG.goo.companion) for (const poly of stroke.compPolys) push(poly, true);
        if (CFG.goo.spine && sp) push(sp, false);
        if (!out.length && sp) push(sp, false); // 둘 다 꺼둔 경우의 보험
        if (CFG.orb.on && CFG.orb.bulge > 0 && CFG.orb.style !== 'fan')
            for (const o of stroke.orbs) out.push({ ax: o.x, ay: o.y, bx: o.x, by: o.y, r: o.r, w: CFG.orb.bulge });
        return out;
    }

    // 윤곽선은 구울 때 한 번만 계산한다 (단어당 수 ms). replay 도 이걸 거친다.
    function ensureOutline(stroke) {
        if (!CFG.outline.on || stroke.outline) return;
        if (fanMode() && stroke.orbs.length) return fanOutline(stroke, (performance.now() - t0) / 1000);
        stroke.outline = wordOutline(outlineSegs(stroke), { ...CFG.outline, compCap: CFG.goo.compCap });
    }
    // 부채 모드에선 윤곽선이 매 프레임 바뀔 수 있어 누적 잉크(ink2d)에 굽지 않고 오버레이에 매 프레임 긋는다
    const outlineBaked = () => !(fanMode() && CFG.outline.on);

    // ───────────── 픽셀 블록 (halo) ─────────────
    const haloOpts = () => {
        const H = CFG.halo;
        return { ...H, reach: H.reach ?? CFG.outline.reach, th: H.th ?? CFG.outline.th, compCap: CFG.goo.compCap };
    };

    function ensureHalo(stroke) {
        if (CFG.halo.on && !stroke.halo) stroke.halo = wordCells(outlineSegs(stroke), haloOpts());
    }

    // 칸 채우기 — 단색 또는 칸마다 반복되는 gradient 패턴 (설정이 바뀔 때만 타일을 다시 만든다)
    const haloPats = new Map(); // 각도 → { key, tile, n }
    // box = [x0, y0, x1, y1] (CSS px) — gradient.whole 이면 이 범위에 그라데이션 하나
    // deg = 칸 패턴 각도 (없으면 gradient.angle)
    // tone = { h, s, l } — stops 색을 HSL 로 이만큼 민다(도, %p, %p). 음절마다 미세한 톤 차이(plan[j].haloTone)
    // G = 그라데이션 설정 (기본 halo.gradient — base.gradient 도 이걸 쓴다)
    function haloFill(c, box, deg, tone = null, G = CFG.halo.gradient) {
        const H = CFG.halo;
        if (!G?.on) return H.fill;
        if (deg == null) deg = G.angle ?? 90;
        if (G.whole && box) {
            const a = ((G.angle ?? 90) * Math.PI) / 180;
            const cx = (box[0] + box[2]) / 2,
                cy = (box[1] + box[3]) / 2;
            const L = (Math.abs(Math.cos(a)) * (box[2] - box[0]) + Math.abs(Math.sin(a)) * (box[3] - box[1])) / 2;
            const g = c.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
            for (const [p, col] of G.stops) g.addColorStop(p, col);
            return g;
        }
        const key = JSON.stringify([H.cell, G, dpr]);
        const pk = (G === H.gradient ? '' : 'g:' + JSON.stringify(G.stops) + '|') + (tone ? `${deg}|${tone.h ?? 0}|${tone.s ?? 0}|${tone.l ?? 0}` : deg);
        let haloPat = haloPats.get(pk);
        if (haloPat?.key !== key) {
            const n = Math.max(1, Math.round(H.cell * dpr));
            const tile = document.createElement('canvas');
            tile.width = tile.height = n;
            const t = tile.getContext('2d');
            const a = (deg * Math.PI) / 180;
            // 칸 중심을 지나는 방향 a 의 선분 — 양 끝이 칸 모서리에 닿도록 길이 = |cos|+|sin|
            const L = ((Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) * n) / 2;
            const g = t.createLinearGradient(n / 2 - Math.cos(a) * L, n / 2 - Math.sin(a) * L, n / 2 + Math.cos(a) * L, n / 2 + Math.sin(a) * L);
            for (const [p, col] of G.stops) g.addColorStop(p, tone ? toneColor(col, tone) : col);
            t.fillStyle = g;
            t.fillRect(0, 0, n, n);
            haloPat = { key, tile, n };
            haloPats.set(pk, haloPat);
        }
        const pat = c.createPattern(haloPat.tile, 'repeat');
        // 패턴은 컨텍스트 사용자 좌표(CSS px) 기준 — 타일(n 픽셀)을 칸 크기로 줄이고 격자 원점에 맞춘다
        pat.setTransform(new DOMMatrix().translate(H.ox ?? 0, H.oy ?? 0).scale(H.cell / haloPat.n));
        return pat;
    }

    // CSS 색 → HSL 로 tone 만큼 민 색
    function toneColor(css, { h = 0, s = 0, l = 0 }) {
        const [r, g, b] = rgbOf(css).map(v => v / 255);
        const mx = Math.max(r, g, b),
            mn = Math.min(r, g, b);
        const L = (mx + mn) / 2;
        const d = mx - mn;
        let H = 0,
            S = 0;
        if (d > 0) {
            S = d / (1 - Math.abs(2 * L - 1));
            H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            H *= 60;
        }
        const cl = v => Math.min(100, Math.max(0, v));
        return `hsl(${(((H + h) % 360) + 360) % 360}, ${cl(S * 100 + s)}%, ${cl(L * 100 + l)}%)`;
    }

    // 칸 목록의 범위 (CSS px)
    function cellsBox(cells) {
        if (!cells?.length) return null;
        const { cell, ox, oy } = CFG.halo;
        let x0 = Infinity,
            y0 = Infinity,
            x1 = -Infinity,
            y1 = -Infinity;
        for (let i = 0; i < cells.length; i += 2) {
            if (cells[i] < x0) x0 = cells[i];
            if (cells[i] > x1) x1 = cells[i];
            if (cells[i + 1] < y0) y0 = cells[i + 1];
            if (cells[i + 1] > y1) y1 = cells[i + 1];
        }
        return [ox + x0 * cell, oy + y0 * cell, ox + (x1 + 1) * cell, oy + (y1 + 1) * cell];
    }

    // 칸마다 방향 (gradient.perSyl) — 실선 점을 솎아 [x, y, 각도] 로 들고 있다가 칸 중심에서 가장 가까운 점의 구간 각도.
    // 실선 index i ↔ 경로 px = i·spacing (orb 배치와 같은 대응)
    const perSylHalo = stroke => {
        const G = CFG.halo.gradient;
        return G?.on && !G.whole && G.perSyl && stroke?.plan?.some(p => p.haloAngle != null || p.haloTone);
    };
    function sylAnglePts(stroke) {
        const sp = stroke.spine;
        if (!sp?.length) return null;
        if (stroke._angPts?.n === sp.length && stroke._angPts.plan === stroke.plan) return stroke._angPts.pts;
        const { plan } = stroke;
        const pts = [];
        let j = 0;
        for (let i = 0; i < sp.length; i += 2) {
            const px = i * CFG.spacing;
            while (j + 1 < plan.length && plan[j + 1].px0 <= px) j++;
            pts.push(sp[i].x, sp[i].y, j); // 구간(음절) 번호 — 각도·톤은 칠할 때 plan[j] 에서
        }
        stroke._angPts = { n: sp.length, plan: stroke.plan, pts };
        return pts;
    }
    function sylAngleAt(pts, x, y) {
        let best = Infinity,
            a = pts[2];
        for (let k = 0; k < pts.length; k += 3) {
            const d = (pts[k] - x) ** 2 + (pts[k + 1] - y) ** 2;
            if (d < best) {
                best = d;
                a = pts[k + 2];
            }
        }
        return a;
    }
    // 칸 왼쪽 위 좌표들(xy, CSS px) → 음절별 묶음 Map(구간 번호 → [x, y, …])
    function groupCellsByAngle(stroke, xy) {
        const groups = new Map();
        const pts = sylAnglePts(stroke);
        const h = CFG.halo.cell / 2;
        for (let i = 0; i < xy.length; i += 2) {
            const a = pts ? sylAngleAt(pts, xy[i] + h, xy[i + 1] + h) : -1;
            let g = groups.get(a);
            if (!g) groups.set(a, (g = []));
            g.push(xy[i], xy[i + 1]);
        }
        return groups;
    }
    function fillGroups(c, stroke, groups) {
        const { cell } = CFG.halo;
        for (const [j, g] of groups) {
            const seg = stroke.plan[j];
            c.fillStyle = haloFill(c, null, seg?.haloAngle ?? CFG.halo.gradient.angle ?? 90, seg?.haloTone ?? null);
            c.beginPath();
            for (let i = 0; i < g.length; i += 2) c.rect(g[i], g[i + 1], cell, cell);
            c.fill();
        }
    }

    function drawHalo(c, cells, stroke = null) {
        if (!cells?.length) return;
        const { cell, ox, oy } = CFG.halo;
        if (perSylHalo(stroke)) {
            // 묶음은 칸 목록이 바뀔 때만 (자라는 획은 interval 마다 새 목록)
            if (stroke._haloGroups?.src !== cells || stroke._haloGroups.ox !== ox || stroke._haloGroups.oy !== oy) {
                const xy = new Float32Array(cells.length);
                for (let i = 0; i < cells.length; i += 2) {
                    xy[i] = ox + cells[i] * cell;
                    xy[i + 1] = oy + cells[i + 1] * cell;
                }
                stroke._haloGroups = { src: cells, ox, oy, groups: groupCellsByAngle(stroke, xy) };
            }
            return fillGroups(c, stroke, stroke._haloGroups.groups);
        }
        c.fillStyle = haloFill(c, cellsBox(cells));
        c.beginPath();
        for (let i = 0; i < cells.length; i += 2) c.rect(ox + cells[i] * cell, oy + cells[i + 1] * cell, cell, cell);
        c.fill();
    }

    // 자라는 획 — 윤곽선·블록을 interval 마다 다시 뽑는다 (구울 때 최종 기하로 한 번 더)
    function refreshLive(stroke, now) {
        const wantOutline = CFG.outline.on && CFG.outline.live?.on;
        const wantHalo = CFG.halo.on;
        if (!wantOutline && !wantHalo) return;
        if (wantOutline && now - (stroke._outT ?? -Infinity) >= CFG.outline.live.interval) {
            stroke._outT = now;
            if (fanMode() && stroke.orbs.length) {
                stroke._grid = null; // 기하가 자랐다 — 격자부터 다시
                stroke._haloSample = null;
                fanOutline(stroke, (now - t0) / 1000);
            } else stroke.outline = wordOutline(outlineSegs(stroke), { ...CFG.outline, compCap: CFG.goo.compCap });
        }
        if (wantHalo && now - (stroke._haloT ?? -Infinity) >= CFG.halo.interval) {
            stroke._haloT = now;
            stroke.halo = wordCells(outlineSegs(stroke), haloOpts());
        }
    }

    // 자라는 동안 만든 근사치는 버리고 최종 기하로 다시 — finalize / 마우스 손 뗄 때
    function dropLiveCache(stroke) {
        stroke.outline = null;
        stroke.halo = null;
        stroke._grid = null;
        stroke._haloSample = null;
        stroke._fanKey = null;
    }

    // ───────────── 윤곽선 애니메이션 — 획 시작점 근처에서 출발해 한 바퀴 돌아 닫힌다 ─────────────
    // 진행 중인 건 매 프레임 오버레이에 부분만 긋고, 다 돌면 누적 잉크(ink2d)에 확정한다.
    const outlineAnims = []; // [{ polys: [{ pts, cum, total }], drawn }]

    // 닫힌 고리면 출발점(from)에 가장 가까운 꼭짓점부터 시작하게 돌린다.
    // 열린 선이면 from 에 가까운 끝에서 출발하도록 방향만 맞춘다.
    function fromNearest(poly, from) {
        const near = p => Math.hypot(p.x - from.x, p.y - from.y);
        const closed =
            poly.length > 3 && Math.hypot(poly[0].x - poly.at(-1).x, poly[0].y - poly.at(-1).y) <= CFG.outline.cell;
        let pts;
        if (closed) {
            const ring = poly.slice(0, -1);
            let k = 0;
            for (let i = 1; i < ring.length; i++) if (near(ring[i]) < near(ring[k])) k = i;
            pts = ring.slice(k).concat(ring.slice(0, k));
            pts.push(pts[0]);
        } else {
            pts = near(poly.at(-1)) < near(poly[0]) ? poly.slice().reverse() : poly;
        }
        const cum = [0];
        for (let i = 1; i < pts.length; i++)
            cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return { pts, cum, total: cum.at(-1) };
    }

    function startOutlineAnim(stroke) {
        const from = stroke.spine?.[0] ?? stroke.raw[0];
        outlineAnims.push({ stroke, polys: stroke.outline.map(p => fromNearest(p, from)), drawn: 0 });
    }

    function strokePartial(c, P, L) {
        if (L <= 0 || P.pts.length < 2) return;
        if (L >= P.total) return strokePolyline(c, P.pts, CFG.outline.style, CFG.outline.width, CFG.outline.dash);
        let i = 1;
        while (i < P.pts.length && P.cum[i] < L) i++;
        const a = P.pts[i - 1],
            b = P.pts[i];
        const t = (L - P.cum[i - 1]) / Math.max(P.cum[i] - P.cum[i - 1], 1e-6);
        const part = P.pts.slice(0, i);
        part.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        strokePolyline(c, part, CFG.outline.style, CFG.outline.width, CFG.outline.dash);
    }

    function commitOutline(A) {
        drawOutlines(ictx, [A.stroke]);
    }

    // 프레임마다: 진행 → 부분 긋기(오버레이) → 다 돈 것은 ink2d 로 확정
    function advanceOutlineAnims(dt) {
        for (let k = outlineAnims.length - 1; k >= 0; k--) {
            const A = outlineAnims[k];
            A.drawn += CFG.outline.anim.speed * dt;
            if (A.polys.every(P => A.drawn >= P.total)) {
                commitOutline(A);
                outlineAnims.splice(k, 1);
            } else for (const P of A.polys) strokePartial(octx, P, A.drawn);
        }
    }

    function finishOutlineAnims() {
        for (const A of outlineAnims) commitOutline(A);
        outlineAnims.length = 0;
    }

    function bakeStroke(stroke) {
        ensureOutline(stroke);
        ensureHalo(stroke);
        drawHalo(hctx, stroke.halo, stroke);
        // live 면 이미 실선과 같이 자라 왔다 — 한 바퀴 도는 애니메이션 없이 바로 확정
        const animate = outlineBaked() && CFG.outline.anim?.on && !CFG.outline.live?.on && stroke.outline?.length > 0;
        drawStrokeInk(ictx, stroke, !animate && outlineBaked());
        if (animate) startOutlineAnim(stroke);
        const segs = [];
        collectSegs(stroke, segs);
        field.stamp('baked', new Float32Array(segs), segs.length / FLOATS_PER_SEG);
    }

    // 자라는 중인 것과 큐를 버린다 (clear / 전면 재구성 때)
    function dropPending() {
        queue.length = 0;
        growing = null;
        liveStroke = null;
        drawingByMouse = false;
        field.clear('live');
    }

    // 전부 즉시 다시 그린다 — 진행 중이던 윤곽선 애니메이션은 완성본으로 대체된다
    function replayAll() {
        outlineAnims.length = 0;
        ictx.clearRect(0, 0, W, H);
        hctx.clearRect(0, 0, W, H);
        for (const s of strokes) dropLiveCache(s); // outline.* / halo.* 튜닝이 반영되도록 재계산
        field.clear('baked');
        field.clear('live');
        growth.clear(); // 없어진 획 자리에 자라던 것도 같이 지운다
        const segs = [];
        for (const s of strokes) {
            ensureOutline(s);
            ensureHalo(s);
            drawHalo(hctx, s.halo, s);
            drawStrokeInk(ictx, s, outlineBaked());
            collectSegs(s, segs);
        }
        field.stamp('baked', new Float32Array(segs), segs.length / FLOATS_PER_SEG);
    }

    // ══════════════ 점진 생성 큐 (px/frame) ══════════════
    // 자모 입력은 마우스처럼 "실시간으로 손이 움직이는" 진행이 없다. 그래서 완성된 경로를
    // 큐에 넣고, 매 프레임 CFG.growPx 만큼 호길이를 소비하며 점을 흘려넣는다.
    //
    // 자라는 중인 획은 liveStroke 에 들어간다 — 마우스가 쓰던 그 자리라서
    // live 필드 스탬프·2D 오버레이 렌더 경로를 그대로 재사용한다.
    //
    // 결정론: ①에서 난수 소비가 경로 길이에만 의존하도록 고쳐놨기 때문에,
    // growPx 를 얼마로 두든 / 프레임이 몇 번 끊기든 최종 결과가 동일하다. (검증됨)

    const queue = []; // [{ pts, cum, seed, hold, plan }] — 대기 중인 획
    let growing = null; // { pts, cum, i, walked, hold, plan } — 자라는 중인 획의 진행 상태

    // 누적 호길이 — 프레임당 "px" 예산을 점 인덱스로 환산하는 데 쓴다
    function cumLength(pts) {
        const cum = [0];
        for (let i = 1; i < pts.length; i++)
            cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return cum;
    }

    // hold: true 면 점을 다 써도 완성하지 않고 대기한다 — extendGrowing 으로 뒤가
    // 계속 붙는 경우("단어 = 획"에서 타이핑 중인 단어)용. finishGrowing 이 풀어준다.
    // plan: [{ px0, seed }] 구간 계획 (path.js). 없으면 획 시드 한 구간
    function queueStroke(pts, seed, { hold = false, plan = null } = {}) {
        if (!pts || pts.length < 2) return;
        queue.push({ pts, cum: cumLength(pts), seed, hold, plan });
    }

    // 자라는 중인 획에 점을 이어붙인다 — "단어 = 획" 으로 갈 때 음절이 하나씩
    // 도착하는 상황용. raw 는 append-only 라 앞부분이 흔들리지 않는다.
    function extendGrowing(pts) {
        if (!growing || !pts?.length) return false;
        const g = growing;
        // pts 가 비어 있을 수 있다 (안정 구간이 0 점인 1음절 단어의 조합 중)
        let prev = g.pts.length ? g.pts[g.pts.length - 1] : null;
        for (const p of pts) {
            const d = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;
            g.pts.push(p);
            g.cum.push((g.cum.length ? g.cum[g.cum.length - 1] : 0) + d);
            prev = p;
        }
        return true;
    }

    function startNext() {
        const q = queue.shift();
        if (!q) return false;
        liveStroke = createStroke(CFG, nextId++, nowBirth(), q.seed, q.plan);
        growing = { pts: q.pts, cum: q.cum, i: 0, walked: 0, hold: !!q.hold, plan: q.plan };
        return true;
    }

    function finalizeGrowing() {
        if (!liveStroke) return;
        const s = liveStroke;
        liveStroke = null;
        growing = null;
        growStroke(s, CFG); // 최종 기하
        dropLiveCache(s);
        field.clear('live');
        if (s.spine && (s.compPolys.length || s.decor.length)) {
            strokes.push(s);
            bakeStroke(s);
        }
    }

    // 매 프레임 1회. 예산만큼 호길이를 전진시키고 그 안에 들어온 점을 흘려넣는다.
    function advanceGrowing() {
        if (!growing && !startNext()) return;
        const g = growing;
        const total = g.cum[g.cum.length - 1];
        g.walked = Math.min(g.walked + CFG.growPx, total); // ← px/frame. dt 기반으로 바꾸려면 이 줄
        while (g.i < g.pts.length && g.cum[g.i] <= g.walked) {
            pushPoint(liveStroke, CFG, g.pts[g.i].x, g.pts[g.i].y);
            g.i++;
        }
        // 점을 다 썼고 예산도 끝까지 갔으면 완성.
        // hold 중이면 완성하지 않고 대기 — 뒤에 음절이 더 붙기를 기다린다.
        if (g.i >= g.pts.length && g.walked >= total && !g.hold) finalizeGrowing();
    }

    // 자라는 획의 앞 k 개 점은 두고 그 뒤를 tail 로 **교체**한다.
    //
    // 한글은 조합 중인 음절이 매 타건마다 바뀌고(ㅇ→아→안), 종성이 다음 글자의 초성으로
    // 넘어가기도 한다("반가"+ㅇ→"반강"→"반가우"). 그때 단어 전체를 다시 그리지 않고
    // 바뀐 뒤쪽만 갈아끼우려고 쓴다.
    //
    // 소비량(i)은 유지한다 — 되감았다가 다시 뻗으면 끝이 움찔거린다. 이미 그려진 길이만큼은
    // 곧바로 새 모양으로 보인다. 앞 k 점이 정말 동일하다는 보장은 **호출자 책임**이다
    // (receiver 가 "안정 구간 키 배열이 이전 키 배열의 프리픽스인가"로 검사한다).
    // plan 을 주면 구간 계획도 갈아끼운다 (조합 중 음절이 바뀌면 그 음절의 시드도 바뀐다).
    function replaceTail(k, tail, plan = undefined) {
        if (!growing || !liveStroke) return;
        const g = growing;
        if (plan !== undefined) g.plan = plan;
        k = Math.max(0, Math.min(k, g.pts.length));
        g.pts.length = k;
        g.cum.length = k;
        let prev = k ? g.pts[k - 1] : null;
        for (const p of tail || []) {
            const d = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;
            g.pts.push(p);
            g.cum.push((g.cum.length ? g.cum[g.cum.length - 1] : 0) + d);
            prev = p;
        }
        const total = g.pts.length;
        const consumed = Math.min(g.i, total);
        // 같은 id/birth/seed 로 다시 만들어야 색·난수·나이가 그대로다
        const was = liveStroke;
        const { id, birth, seed } = was;
        liveStroke = createStroke(CFG, id, birth, seed, g.plan);
        // 다음 갱신 전까지 예전 윤곽선·블록을 그대로 — 안 넘기면 타건마다 한 프레임씩 깜박인다
        liveStroke.outline = was.outline;
        liveStroke.halo = was.halo;
        liveStroke._outT = was._outT;
        liveStroke._haloT = was._haloT;
        for (let j = 0; j < consumed; j++) pushPoint(liveStroke, CFG, g.pts[j].x, g.pts[j].y);
        growStroke(liveStroke, CFG);
        g.i = consumed;
        g.walked = total ? Math.min(g.walked, g.cum[total - 1]) : 0;
    }

    // 자라는 중인 획을 즉시 완성. main.js 가 띄어쓰기/다음 음절 입력 때 호출하는 계약.
    function finishGrowing() {
        if (!growing) return;
        const g = growing;
        g.hold = false;
        while (g.i < g.pts.length) {
            pushPoint(liveStroke, CFG, g.pts[g.i].x, g.pts[g.i].y);
            g.i++;
        }
        finalizeGrowing();
    }

    // 큐에 남은 것까지 전부 완성. 제출(캡처) 직전에 호출되는 계약.
    // 스탬프가 동기라서 프레임을 기다릴 필요가 없다.
    async function flushQueue() {
        finishGrowing();
        while (startNext()) finishGrowing();
        finishOutlineAnims(); // 캡처에 반쯤 그린 윤곽선이 찍히지 않게
    }

    // ─────────── 외부 경로 주입 — 자모 생성기가 들어올 자리 ───────────
    // 마우스가 이 파이프라인에 하는 일은 "raw 점 배열을 만드는 것" 하나뿐이다.
    // 그 자리를 이 함수가 대신한다. 아래 전부(리샘플/스무딩/companion/goo)는 그대로 재사용.
    //
    //   pts   [{x,y}, ...]  — 점 간격이 CFG.minDist(4px) 미만이면 pushPoint 가 걸러낸다
    //   seed  이 획의 모든 난수를 결정. 같은 seed + 같은 pts → 항상 같은 그림
    //   step  한 번에 밀어넣는 점 개수. Infinity = 즉시 완성, 작은 값 = 점진 생성.
    //         난수 소비가 경로 길이에만 의존하므로 step 이 얼마든 결과는 동일하다.
    function addStroke(pts, seed, { step = Infinity, plan = null } = {}) {
        const s = createStroke(CFG, nextId++, nowBirth(), seed, plan);
        for (let i = 0; i < pts.length; i++) {
            pushPoint(s, CFG, pts[i].x, pts[i].y);
            if ((i + 1) % step === 0) growStroke(s, CFG);
        }
        growStroke(s, CFG); // 최종 기하
        if (s.spine && (s.compPolys.length || s.decor.length)) {
            strokes.push(s);
            bakeStroke(s);
        }
        return s;
    }

    // ───────────────────────── 입력 ─────────────────────────
    // dispose() 에서 전부 떼기 위해 등록한 리스너를 모아둔다. 안 떼면 다른 receiver 로
    // 전환한 뒤에도 살아남아 입력을 가로챈다.
    const listeners = [];
    const on = (target, type, fn, opt) => {
        target.addEventListener(type, fn, opt);
        listeners.push([target, type, fn, opt]);
    };

    const onPointerDown = e => {
        // 자라는 중인 큐 획이 있으면 먼저 완성시켜서 잃지 않게 한다
        finishGrowing();
        drawingByMouse = true;
        // 마우스 입력은 획 순번으로 시드를 만든다 (세션 시드와 섞어서 새로고침마다 다르게).
        // 자모 입력으로 갈 때는 여기가 hashSeed(cho, jung, jong ?? '', wordId) 로 바뀐다
        // → 같은 글자면 항상 같은 모양.
        const id = nextId++;
        liveStroke = createStroke(CFG, id, nowBirth(), hashSeed(CFG.seed, 'mouse', id));
        pushPoint(liveStroke, CFG, e.clientX, e.clientY);
        try {
            overlay.setPointerCapture?.(e.pointerId);
        } catch {
            /* 합성 이벤트 등 유효하지 않은 pointerId */
        }
        e.preventDefault();
    };

    const onPointerMove = e => {
        if (!drawingByMouse || !liveStroke) return; // 큐가 자라는 중인 건 건드리지 않는다
        pushPoint(liveStroke, CFG, e.clientX, e.clientY);
    };

    function endStroke() {
        if (!drawingByMouse || !liveStroke) return;
        drawingByMouse = false;
        const s = liveStroke;
        liveStroke = null;
        growStroke(s, CFG); // 최종 기하
        dropLiveCache(s);
        field.clear('live');
        if (s.spine && (s.compPolys.length || s.decor.length)) {
            strokes.push(s);
            bakeStroke(s);
        }
    }
    if (opts.mouse) {
        on(overlay, 'pointerdown', onPointerDown);
        on(window, 'pointermove', onPointerMove);
        on(window, 'pointerup', endStroke);
        on(window, 'pointercancel', endStroke);
    }

    const onKeyDown = e => {
        const k = e.key.toLowerCase();
        if (k === '1') CFG.shade = 0;
        else if (k === '2') CFG.shade = 1;
        else if (k === '3') CFG.shade = 2;
        else if (k === '4') CFG.shade = 3;
        else if (k === 'z') {
            strokes.pop();
            replayAll();
        } else if (k === 'c') {
            dropPending();
            strokes.length = 0;
            replayAll();
            particles.reset();
        } else if (k === 'g') {
            CFG.grow.on = !CFG.grow.on;
            if (!CFG.grow.on) growth.clear();
        } else if (k === 'p') {
            CFG.part.on = !CFG.part.on;
            if (CFG.part.on) particles.reset();
        } else if (k === 's') savePNG();
    };
    if (opts.keys) on(window, 'keydown', onKeyDown);

    // WebGL(goo) + 2D 오버레이(얇은 잉크)를 한 장으로 합친다. 결과는 **투명 배경**이다
    // — 종이색은 캔버스 CSS 배경이라 비트맵에 안 들어간다(drawImage 는 비트맵만 읽는다).
    // preserveDrawingBuffer: true 라서 마지막 프레임을 그대로 읽을 수 있다.
    function compositeCanvas() {
        const out = document.createElement('canvas');
        out.width = glCanvas.width;
        out.height = glCanvas.height;
        const c = out.getContext('2d');
        c.drawImage(underlay, 0, 0); // orb
        c.drawImage(glCanvas, 0, 0);
        c.drawImage(overlay, 0, 0);
        return out;
    }

    function savePNG() {
        compositeCanvas().toBlob(b => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `trail_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
        });
    }

    // ─────────────────────── 렌더 루프 ───────────────────────
    const liveSegs = [];
    const lightN = (() => {
        const [x, y, z] = CFG.light;
        const l = Math.hypot(x, y, z) || 1;
        return [x / l, y / l, z / l];
    })();

    let lastT = performance.now();

    function frame(now) {
        requestAnimationFrame(frame);

        // dt 를 캡한다 — 탭을 다시 활성화하면 now 가 크게 튀어서 성장/파티클이 순간이동한다
        const dt = Math.min((now - lastT) / 1000, 1 / 20);
        lastT = now;
        const time = (now - t0) / 1000;

        // 큐에 대기 중인 획을 growPx 만큼 전진시킨다 (마우스로 그리는 중이면 양보)
        if (!drawingByMouse) advanceGrowing();

        // 그리는 중인 획: 기하 갱신 → live 필드 전체 재스탬프 (누적하면 안 된다)
        if (liveStroke) {
            growStroke(liveStroke, CFG);
            liveSegs.length = 0;
            collectSegs(liveStroke, liveSegs);
            field.clear('live');
            field.stamp('live', new Float32Array(liveSegs), liveSegs.length / FLOATS_PER_SEG);
            refreshLive(liveStroke, now);
        }

        const tex = field.textures();
        const fieldTexel = field.texel();
        const sim = {
            bakedTex: tex.baked,
            liveTex: tex.live,
            fieldTexel,
            th: CFG.goo.th,
            compCap: CFG.goo.compCap,
            time,
            dt,
        };

        // ── 성장장 갱신 (밀도장을 읽기만 한다)
        if (CFG.grow.on)
            growth.step({
                ...sim,
                nowMin: nowBirth(),
                decay: CFG.grow.decay,
                outward: CFG.grow.outward,
                curlAmp: CFG.grow.curlAmp,
                curlScale: CFG.grow.curlScale,
                curlSpeed: CFG.grow.curlSpeed,
                source: CFG.grow.source,
                bandLo: CFG.grow.bandLo,
                bandHi: CFG.grow.bandHi,
                ageDelay: CFG.grow.ageDelay,
            });

        // ── 아래 레이어 — 종이 + goo + 성장
        field.composite(
            {
                th: CFG.goo.th,
                compCap: CFG.goo.compCap,
                edge: CFG.goo.edge,
                paper: hex2rgb(CFG.paper),
                ink: hex2rgb(CFG.ink),
                shade: CFG.shade,
                light: lightN,
                normalZ: CFG.normalZ,
                amb: CFG.amb,
                diff: CFG.diff,
                spec: CFG.spec,
                specPow: CFG.specPow,
                fres: CFG.fres,
                bands: CFG.bands,
                growthTex: growth.texture(),
                growInk: hex2rgb(CFG.grow.ink),
                growGain: CFG.grow.on ? CFG.grow.gain : 0,
                growOpacity: CFG.grow.opacity,
                pixel: CFG.goo.pixel ?? 0,
                pixelVar: CFG.goo.pixelVar,
                origin: [CFG.halo.ox ?? 0, CFG.halo.oy ?? 0],
                grain: CFG.goo.grain,
            },
            glCanvas.width,
            glCanvas.height,
        );

        // ── 파티클 — goo 합성 결과 위에 알파 블렌딩
        if (CFG.part.on) {
            particles.step({
                ...sim,
                spawnTol: CFG.part.spawnTol,
                spawnRate: CFG.part.spawnRate,
                lifespan: CFG.part.lifespan,
                lifeVar: CFG.part.lifeVar,
                curlAmp: CFG.part.curlAmp,
                curlScale: CFG.part.curlScale,
                curlSpeed: CFG.part.curlSpeed,
                flow: CFG.part.flow,
                repel: CFG.part.repel,
            });
            particles.draw(
                { size: CFG.part.size, ink: hex2rgb(CFG.part.ink), opacity: CFG.part.opacity },
                glCanvas.width,
                glCanvas.height,
                dpr,
            );
        }

        frameNo++; // mainBead 캐시 무효화
        updateFanOutlines(time);

        // ── 맨 아래 — orb. main bead 를 따라 움직이므로 매 프레임 전부 다시 칠한다
        // 그 아래 — 픽셀 블록 (구운 것 + 자라는 것)
        if (CFG.orb.on || CFG.halo.on || CFG.base?.on || underDirty) {
            uctx.clearRect(0, 0, W, H);
            if (CFG.base?.on) {
                for (const s of strokes) drawBase(uctx, s);
                if (liveStroke) drawBase(uctx, liveStroke);
            }
            if (CFG.halo.on) {
                let src = halo2d;
                const fans = fanMode();
                if (liveStroke?.halo?.length || fans) {
                    tctx.clearRect(0, 0, W, H);
                    tctx.drawImage(halo2d, 0, 0, W, H);
                    if (liveStroke) drawHalo(tctx, liveStroke.halo, liveStroke);
                    if (fans) {
                        for (const s of strokes) drawFanHalo(tctx, s, time);
                        if (liveStroke) drawFanHalo(tctx, liveStroke, time);
                    }
                    src = haloTmp;
                }
                uctx.globalAlpha = CFG.halo.opacity;
                const E = CFG.halo.edge;
                if (E?.on && E.width > 0) {
                    // 외곽선 — 블록 모양을 edge 색으로 물들여 8 방향으로 width 만큼 밀어 깔고, 그 위에 블록
                    ectx.clearRect(0, 0, W, H);
                    ectx.drawImage(src, 0, 0, W, H);
                    ectx.globalCompositeOperation = 'source-in';
                    ectx.fillStyle = E.color;
                    ectx.fillRect(0, 0, W, H);
                    ectx.globalCompositeOperation = 'source-over';
                    const w = E.width;
                    for (const [dx, dy] of [[w, 0], [-w, 0], [0, w], [0, -w], [w, w], [w, -w], [-w, w], [-w, -w]])
                        uctx.drawImage(edge2d, dx, dy, W, H);
                }
                uctx.drawImage(src, 0, 0, W, H);
                uctx.globalAlpha = 1;
            }
            for (const s of strokes) drawOrbs(uctx, s, time);
            if (liveStroke) drawOrbs(uctx, liveStroke, time);
            underDirty = CFG.orb.on || CFG.halo.on || !!CFG.base?.on; // 끈 직후 한 번 더 지워 잔상을 없앤다
        }

        // ── 위 레이어 — 얇은 크리스프 잉크
        octx.clearRect(0, 0, W, H);
        // 부채 모드 — 윤곽선은 굽지 않고 매 프레임 (자라는 획까지 한 번에, 잉크 아래에)
        if (!outlineBaked()) drawOutlines(octx, liveStroke ? [...strokes, liveStroke] : strokes);
        octx.drawImage(ink2d, 0, 0, W, H);
        if (liveStroke) drawStrokeInk(octx, liveStroke, outlineBaked());
        advanceOutlineAnims(dt);
        if (CFG.bead.on) {
            for (const s of strokes) drawBeads(octx, s, time);
            if (liveStroke) drawBeads(octx, liveStroke, time);
        }
        if (CFG.bead.walker?.on) {
            const occ = new Map(); // 같은 단어가 여럿이면 순번으로 가른다
            const keyOf = s => {
                const n = occ.get(s.seed) ?? 0;
                occ.set(s.seed, n + 1);
                return s.seed + '#' + n;
            };
            for (const s of strokes) drawWalker(octx, s, time, keyOf(s));
            // 자라는 획은 다 자란 뒤부터 (자라는 동안엔 길이가 계속 바뀐다)
            if (liveStroke && (!growing || growing.i >= growing.pts.length - 1)) drawWalker(octx, liveStroke, time, keyOf(liveStroke));
        }
        if (CFG.bead.main?.on) {
            for (const s of strokes) drawMainBead(octx, s, time);
            if (liveStroke) drawMainBead(octx, liveStroke, time);
        }
    }
    let underDirty = true;

    on(window, 'resize', resize);
    resize();
    let raf = requestAnimationFrame(frame);

    function dispose() {
        cancelAnimationFrame(raf);
        raf = 0;
        for (const [t, type, fn, opt] of listeners) t.removeEventListener(type, fn, opt);
        listeners.length = 0;
        dropPending();
        strokes.length = 0;
        overlay.remove();
        underlay.remove();
        if (ownGl) glCanvas.remove();
        // body 배경은 전역이다 — 다른 receiver 로 전환했을 때 남지 않게 되돌린다
        if (opts.bodyBg !== false) document.body.style.background = prevBodyBg;
        if (opts.global && window.TRAIL === api) delete window.TRAIL;
    }

    // 콘솔 튜닝용
    //   즉시 반영     goo.th / goo.edge / shade / normalZ / grow.* / part.* (전부 uniform)
    //   replay() 필요 goo.reach / goo.reachLen / goo.compCap / goo.spine / goo.companion  (스탬프 시점에 굽히는 값)
    //                 outline.* / halo 모양(cell·reach·th·fill·ox·oy) (구운 잉크·블록) — 자라는 중인 획은 다음 갱신부터 바로 반영
    //   즉시 반영     bead.* / bead.main.* / orb 모양·flow.* (매 프레임 그린다) / outline.anim.speed / halo.on·opacity
    //   다음 획부터   spineFx.* / decor* / orb 배치(gap·prob·spread) — 지난 획까지 바꾸려면 다시 입력
    //   rebuild 필요  goo.fieldScale / grow.scale → TRAIL.rebuild()  (part.side 는 새로고침)
    //   TRAIL.probe(x, y) → 그 화면좌표의 밀도값. th 를 감으로 찍지 말고 이걸로 확인.
    const api = {
        CFG,
        strokes,
        dispose,
        canvases: { gl: glCanvas, overlay, ink2d, underlay },
        captureCanvas: () => compositeCanvas(), // 캡처용 합성 (captureFrame 이 dataURL 로 감쌈)
        replay: replayAll,
        rebuild: resize,
        clear: () => (dropPending(), (strokes.length = 0), replayAll(), particles.reset()),
        resetStamps: () => (stampEpochs.clear(), mainEpochs.clear()), // 도장 bead 발자국을 잊는다 (clear 는 전면 재구성에도 쓰여서 따로)
        save: savePNG,
        probe: (x, y) => field.probe(x, y),
        pstats: () => particles.stats(),

        // ── 자모 생성기 / receiver 계약이 쓸 API
        hashSeed, // 자모에서 시드 뽑기 — hashSeed(cho, jung, jong ?? '', wordId)
        addStroke, // 즉시 완성 (테스트/replay 용)
        queueStroke, // 점진 생성 큐에 넣기 — growPx 씩 자란다
        extendGrowing, // 자라는 중인 획에 점 이어붙이기 ("단어 = 획" 용)
        replaceTail, // 자라는 획의 뒤쪽 교체 (조합/연음으로 바뀐 음절 갈아끼우기)
        finishGrowing, // 자라는 중인 획 즉시 완성 (main.js 계약)
        flushQueue, // 큐까지 전부 완성 (제출/캡처 직전 계약)
        pending: () => ({
            queued: queue.length,
            growing: growing ? growing.i : null,
            points: growing ? growing.pts.length : 0,
            hold: growing ? !!growing.hold : false,
        }),
        // 프레임 루프가 매 프레임 호출하는 것과 같은 것. n 프레임만큼 수동 전진.
        // 프레임 단위로 들여다볼 때, 그리고 rAF 없이(헤드리스) 검증할 때 쓴다.
        step: (n = 1) => {
            for (let k = 0; k < n; k++) advanceGrowing();
        },
    };
    if (opts.global) window.TRAIL = api;
    return api;
}
