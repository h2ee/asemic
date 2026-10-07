// ── DandelionReceiver (🌼) ───────────────────────────────────────────────────
//
// 2026-09-25: 구버전 dandelion(3단 궤적 + WebGL2 SDF, 2026-08-31 재설계본)을 폐기하고
// sketch 프로젝트 `04_trail_gl` 의 "마우스 궤적 + GPU 밀도장 goo" 엔진으로 교체했다.
// 구버전이 필요하면 git 이력에서 꺼낼 것.
//
// 엔진 파일들은 `trail/` 에 있고 sketch 쪽과 '바이트 단위로 동일'하다 — 스케치에서
// 튜닝하고 그대로 복사해 오는 워크플로를 유지하기 위함. 디렉터리 이름이 receiver 이름과
// 다른 건 그래서다(엔진은 receiver 가 아니라 "궤적 엔진"이다). 이 파일만 asemic 전용.
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
import { jamoToTrail, jamoToTrailTurtle, jamoWordTrail } from './trail/jamoTrail.js';

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
const CFG_OVERRIDE = {
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
    decorLineWidth: 0.75, // 윤곽선 굵기

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
    },
    grow: { on: false },
    part: { on: false },

    // 윤곽선 — 획 시작점 근처에서 출발해 한 바퀴 돌아 닫힌다 (speed px/s)
    outline: { anim: { on: true, speed: 850 } },

    // 실선 효과 (일러스트레이터 Roughen / Pucker & Bloat). target 'ink' = 2D 실선만 / 'all' = goo·윤곽선까지
    spineFx: {
        target: 'ink',
        roughen: { on: true, size: 6, gap: 6, mode: 'smooth' }, // mode 'smooth' | 'corner'
        puckerBloat: { on: true, amount: 12, gap: 2 }, // amount > 0 bloat / < 0 pucker
    },

    // 실선을 타고 흐르는 원. main = 획마다 하나, 실선을 왕복하며 orb 의 flow field 방향을 끌고 다닌다
    bead: {
        on: true,
        gap: [40, 90],
        radius: [1.5, 3.5],
        speed: 30,
        fill: 'rgb(0, 0, 0)',
        stroke: null,
        // glow 가 켜지면 radius = 번짐이 끝나는 바깥 반경 (꽉 찬 가운데 = radius × core)
        main: {
            on: true,
            radius: 18,
            speed: 40,
            fill: 'rgb(130, 255, 130)',
            stroke: null,
            glow: { on: true, core: 0.45, falloff: 1.4 },
        },
    },

    // 노란 원 + 내부 hatch 형 flow field (goo 아래에 깔린다)
    orb: {
        on: true,
        gap: [90, 200],
        prob: 0.7,
        radius: [6, 22],
        spread: 26,
        fill: '#ffe83d',
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
            cfg: CFG_OVERRIDE,
            // 투명 합성(TD / output.html)에선 엔진이 종이색을 깔면 안 된다 — 캔버스가 뷰포트 전체라
            // TD 에선 흰 판이 크롬을 덮는다. 종이색은 body 배경 + 맨 아래 캔버스(underlay) CSS 배경 두 곳
            bodyBg: !this._opts.transparentOutput,
            paperBg: !this._opts.transparentOutput,
        });
        // 엔진은 오버레이(얇은 잉크·bead)를 body 끝에 붙인다 — 그러면 글자 창(#glyph-window)의 위쪽 페이드
        // mask·말풍선 clip이 안 걸린다. goo 캔버스 바로 뒤로 옮긴다(trail/은 sketch 사본이라 여기서)
        const { gl, overlay } = this._trail?.canvases ?? {};
        if (gl?.parentNode && overlay && overlay.parentNode !== gl.parentNode) gl.parentNode.insertBefore(overlay, gl.nextSibling);
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
            return { pts, plan: meta.starts.map(st => ({ px0: st.px0, seed: sylSeed(st.syl) })) };
        };
        // 획 시드는 동반 곡선 개수·bead 배열만 정한다. 단어 내용만 쓴다(wordId 를 섞으면 같은 단어도 자리마다 달라진다)
        const seedOf = g => this._trail.hashSeed('word', ...g.keys);

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
                // 엔진(trail/, sketch 사본)은 안 고치고 그 순간만 CFG를 끈다
                const anim = this._trail.CFG.outline.anim;
                const on = anim.on;
                anim.on = false;
                this._trail.addStroke(pts, seedOf(g), { plan });
                anim.on = on;
            }
            else this._trail.queueStroke(pts, seedOf(g), { hold: isLast, plan });
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
        this._groups = [];
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

    // 콘솔 튜닝용 — rm.current.cfg().goo.th = 1.4
    cfg() {
        return this._trail?.CFG;
    }
    engine() {
        return this._trail;
    }
}
