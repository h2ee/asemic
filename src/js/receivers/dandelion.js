// ── DandelionReceiver (🌼) ───────────────────────────────────────────────────
//
// 2026-09-25: 구버전 dandelion(3단 궤적 + WebGL2 SDF, 2026-08-31 재설계본)을 폐기하고
// sketch 프로젝트 `04_trail_gl` 의 "마우스 궤적 + GPU 밀도장 goo" 엔진으로 교체했다.
// 구버전이 필요하면 git 이력에서 꺼낼 것.
//
// 엔진 파일들은 `trail/` 에 있고 sketch 쪽과 **바이트 단위로 동일**하다 — 스케치에서
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

// 스케치 기본값은 "화면을 가로지르는 긴 마우스 획"(1000px+) 기준이다.
// 음절 하나 = 획 하나면 경로가 200~260px 밖에 안 되므로 길이 계열 파라미터를 줄여야
// 동반 곡선 생성기(루프/방황)가 작동한다. **h2ee 가 튜닝할 자리.**
const CFG_OVERRIDE = {
    spacing: 4,
    spineSmooth: 8,

    wanderAmp: [3, 8],
    wanderLen: [120, 240],
    weaveAmp: [6, 14],
    weaveLen: [80, 150],
    eventGap: [55, 110], // 음절당 루프 2~4개
    swirlSpan: [18, 26],
    swirlRadius: [9, 15],
    compBaseSmooth: 28,
    compStep: 2.5,
    compSmooth: 6,
    headLag: 5,

    decorGap: [30, 70],
    decorSpread: 12,
    decorRadius: [2, 5], // 사각형 반변 길이(px) — 2배로
    decorLineWidth: 0.75, // 윤곽선 굵기

    growPx: 8, // 경로가 짧으니 프레임당 전진도 줄인다 (음절당 약 0.5초)

    // th: B(터틀)로 오면서 경로가 접혀 밀도가 올라갔다 — 실측 p10(외톨이 선) 1.23 /
    // median 2.29 / p90 3.86. 1.15 로 두면 거의 전 구간이 임계를 넘어 검은 덩어리가 된다.
    goo: { reach: 10, th: 1.7, edge: 0.04, spine: true, companion: true, fieldScale: 1.0 },
    grow: { on: false },
    part: { on: false },
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
        });
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
        const buildPts = (g, syls = g.syls) =>
            jamoWordTrail(
                this._JAMO,
                syls,
                g.anchor[0] * W,
                g.anchor[1] * H,
                WRAP_STEP,
                this._sampleStep,
            );
        const seedOf = g => this._trail.hashSeed('word', g.wordId, ...g.keys);

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
        if (
            match === prev.length - 1 &&
            match === groups.length - 1 &&
            this._holdingIdx === match
        ) {
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
                const full = buildPts(b);
                this._trail.replaceTail(stablePts.length, full.slice(stablePts.length));
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
            const pts = buildPts(g);
            if (pts.length < 2) continue;
            const isLast = gi === groups.length - 1;
            // 마지막 단어는 아직 타이핑 중일 수 있으므로 hold — 음절이 더 붙기를 기다린다.
            if (rebuild && !isLast) this._trail.addStroke(pts, seedOf(g));
            else this._trail.queueStroke(pts, seedOf(g), { hold: isLast });
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
    }

    dispose() {
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
