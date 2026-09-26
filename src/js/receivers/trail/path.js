// 04_trail_gl/path.js — 경로/곡선 생성 (CPU)
//
// 03_trail/trail.js 의 경로 로직을 분리해 온 것. 렌더링은 전혀 하지 않는다.
// 03_trail 은 기록으로 그대로 남겨두고, 여기서만 리뷰 지적사항을 고쳤다:
//
//   ① 모든 주파수/간격/폭 파라미터가 px 단위 — spacing 을 바꿔도 형태가 안 변한다.
//      (구버전은 s = "샘플 인덱스" 였고, spacing 6 이라 eventGap 35 가 실제로 210px 였다)
//   ② 무거운 스무딩(compBaseSmooth) 뒤에 리샘플을 복원 — 인덱스 1당 실제 거리가 다시 일정해져서
//      같은 weaveLen 이 직선 구간과 곡선 구간에서 같은 파장으로 보인다.
//   ③ growEvents 가 while 루프 — 빨리 그어도 eventGap 이 지켜진다. (구버전은 프레임당 최대 1개)
//   ④ drift 가 zero-mean — "실선을 넘나든다"는 전제가 뽑기 운에 관계없이 성립.
//   ⑤ headLag — 동반 곡선이 펜보다 조금 뒤에서 끝난다. 머리의 채찍질(whip)과
//      손 뗄 때의 튐(live ↔ baked 불일치)을 같이 줄인다. 라이브/최종 모두 같은 lag 적용.
//   ⑥ maxRaw 초과 시 shift() 대신 무시 — shift 는 절대 px 기준을 밀어버리는 잠재 버그였다.

export const TWO_PI = Math.PI * 2;

// Math.random() 직접 호출. 지금은 아무도 안 쓴다 — 모든 난수가 시드 기반으로 바뀜(아래).
// 임시 실험용으로 남겨둠.
export const rand = (a, b) => a + Math.random() * (b - a);

// ─────────────────────── 시드 난수 ───────────────────────
// 같은 입력 → 같은 그림이 나와야 한다. 자모 입력으로 전환하면 필수이고,
// (signal.js 가 p.originalState 로 해결한 것과 같은 요구다)
// 마우스 입력에서도 replay/undo 가 원본과 완전히 같아진다.
//
// 중요 — 스트림 분리: 하위 시스템마다 별도 난수 스트림을 준다.
//   한 스트림을 공유하면 decorGap 을 바꾸는 것만으로 루프(swirl) 위치가 따라 변한다.
//   (draw 호출 순서가 경로 길이에 따라 뒤섞이므로) 즉 파라미터 직교성이 깨진다.
//
// 중요 — 프레임 독립성: 난수 소비가 "경로 길이"에만 의존하고 프레임 수에는 의존하지 않는다.
//   growEvents/growDecor 가 while 루프로 lastPx 를 누적하기 때문. 덕분에 점진 렌더(한 점씩
//   자라며 그리기)와 일괄 생성(점을 다 넣고 한 번에)이 **완전히 같은 결과**를 낸다.

// mulberry32 — 작고 품질 좋은 32bit PRNG
export function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// FNV-1a — 아무 값들이나 받아 32bit 시드로. 자모에서 바로 시드를 뽑는 데 쓴다:
//   hashSeed(cho, jung, jong ?? '', wordId)
export function hashSeed(...parts) {
    let h = 2166136261 >>> 0;
    for (const part of parts) {
        const s = String(part);
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
        }
        h = Math.imul(h ^ 0x2c, 16777619) >>> 0; // 구분자 — ('ab','c') 와 ('a','bc') 를 구분
    }
    return h >>> 0;
}

// 스트림에서 [a,b) 뽑기
const rnd = (rng, a, b) => a + rng() * (b - a);

// 외부 의존성 없는 1D value noise.
// 인자(px/wanderLen)가 0~3 정도로 작아서 sin 해시로도 정밀도 문제가 없다 — 그대로 둔다.
export function makeNoise(seed = 1) {
    const h = i => {
        const x = Math.sin((i + seed) * 127.1) * 43758.5453;
        return x - Math.floor(x);
    };
    return x => {
        const i = Math.floor(x);
        const f = x - i;
        const u = f * f * (3 - 2 * f);
        return h(i) * (1 - u) + h(i + 1) * u;
    };
}

// ─────────────────────── 폴리라인 유틸 ───────────────────────

// 등간격 리샘플
export function resample(pts, spacing) {
    if (pts.length < 2) return pts.map(p => ({ x: p.x, y: p.y }));
    const out = [{ x: pts[0].x, y: pts[0].y }];
    let prev = out[0],
        acc = 0;
    for (let i = 1; i < pts.length; i++) {
        let cx = pts[i].x,
            cy = pts[i].y,
            d = Math.hypot(cx - prev.x, cy - prev.y);
        while (acc + d >= spacing) {
            const t = (spacing - acc) / d;
            prev = { x: prev.x + (cx - prev.x) * t, y: prev.y + (cy - prev.y) * t };
            out.push(prev);
            d = Math.hypot(cx - prev.x, cy - prev.y);
            acc = 0;
        }
        acc += d;
        prev = { x: cx, y: cy };
    }
    return out;
}

// 3-tap 이동평균 스무딩 (양 끝 고정)
export function smooth(pts, passes) {
    let p = pts;
    for (let k = 0; k < passes; k++) {
        if (p.length < 3) break;
        const out = [p[0]];
        for (let i = 1; i < p.length - 1; i++)
            out.push({
                x: (p[i - 1].x + p[i].x + p[i + 1].x) / 3,
                y: (p[i - 1].y + p[i].y + p[i + 1].y) / 3,
            });
        out.push(p[p.length - 1]);
        p = out;
    }
    return p;
}

// 스무딩 "길이(px)" → 패스 수. 3-tap 한 패스의 영향 반경이 샘플 1개 = spacing px.
// 이렇게 두면 spacing 을 바꿔도 스무딩의 물리적 세기가 유지된다.
const passesFor = (px, spacing) => Math.max(0, Math.round(px / spacing));

// 각 점에 접선각 / 법선 부여
export function computeFrames(p) {
    for (let i = 0; i < p.length; i++) {
        const a = p[Math.max(0, i - 1)];
        const b = p[Math.min(p.length - 1, i + 1)];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        p[i].angle = ang;
        p[i].nx = Math.cos(ang + Math.PI / 2);
        p[i].ny = Math.sin(ang + Math.PI / 2);
    }
    return p;
}

// 폴리라인 위 임의 지점 (s = 0..poly.length-1 실수) → 좌표 + 방향
export function sample(s, poly) {
    if (!poly || poly.length === 0) return null;
    if (poly.length === 1) return { ...poly[0] };
    s = Math.max(0, Math.min(poly.length - 1, s));
    const i = Math.floor(s),
        f = s - i;
    const a = poly[i],
        b = poly[Math.min(poly.length - 1, i + 1)];
    let da = b.angle - a.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    const ang = a.angle + da * f;
    return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        angle: ang,
        nx: Math.cos(ang + Math.PI / 2),
        ny: Math.sin(ang + Math.PI / 2),
    };
}

// ───────────────────────── 획(stroke) ─────────────────────────
// 획 하나가 자기 상태를 다 들고 있다 (구버전의 모듈 스코프 decorLastS 같은 전역 상태 제거).

// seed: 이 획의 모든 난수를 결정하는 32bit 값.
//   마우스 입력  → hashSeed('mouse', sessionSeed, id)
//   자모 입력    → hashSeed(cho, jung, jong ?? '', wordId)  ← 같은 글자면 항상 같은 모양
export function createStroke(CFG, id, birth, seed = 0) {
    // 하위 시스템별 독립 스트림 (salt 를 섞어 서로 상관 없게)
    const rngDecor = makeRng(hashSeed(seed, 'decor'));
    return {
        id,
        birth, // 초 단위 (셰이더 field 의 .b 채널로 들어간다 — 나중에 "자람" 트리거용)
        seed,
        raw: [], // 원본 포인터 좌표
        spine: null, // 리샘플+스무딩된 실선
        comps: makeCompCfgs(CFG, seed), // 동반 곡선 파라미터 (획 시작 시 확정)
        compPolys: [], // 마지막으로 만들어진 동반 곡선 폴리라인들
        decor: [],
        decorLastPx: 0,
        rngDecor,
        decorNextGap: rnd(rngDecor, CFG.decorGap[0], CFG.decorGap[1]),
    };
}

export function pushPoint(stroke, CFG, x, y) {
    const last = stroke.raw[stroke.raw.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < CFG.minDist) return false;
    if (stroke.raw.length >= CFG.maxRaw) return false; // ⑥ shift 하지 않는다
    stroke.raw.push({ x, y });
    return true;
}

export function buildSpine(rawPts, CFG) {
    const rs = resample(rawPts, CFG.spacing);
    return computeFrames(smooth(rs, passesFor(CFG.spineSmooth, CFG.spacing)));
}

// 획 시작 시 동반 곡선 파라미터 뽑기 (그리는 내내 고정 → 앞부분이 안 흔들림)
function makeCompCfgs(CFG, seed) {
    const rngShape = makeRng(hashSeed(seed, 'comp'));
    const [lo, hi] = CFG.companions;
    const nc = lo + Math.floor(rngShape() * (hi - lo + 1));
    const out = [];
    for (let i = 0; i < nc; i++) {
        // 곡선마다 자기 루프 이벤트 스트림을 갖는다 — 곡선끼리도 서로 안 섞이게
        const rngEvent = makeRng(hashSeed(seed, 'event', i));
        out.push({
            amp: rnd(rngShape, CFG.wanderAmp[0], CFG.wanderAmp[1]),
            wanderLen: rnd(rngShape, CFG.wanderLen[0], CFG.wanderLen[1]),
            weaveAmp: rnd(rngShape, CFG.weaveAmp[0], CFG.weaveAmp[1]),
            weaveLen: rnd(rngShape, CFG.weaveLen[0], CFG.weaveLen[1]),
            weavePhase: rnd(rngShape, 0, TWO_PI),
            nz: makeNoise(rnd(rngShape, 0, 999)),
            swirly: rngShape() >= CFG.noSwirlChance,
            events: [],
            lastEventPx: 0,
            rngEvent,
            nextGap: rnd(rngEvent, CFG.eventGap[0], CFG.eventGap[1]),
        });
    }
    return out;
}

// ③ 머리가 자란 만큼 루프 이벤트를 채운다. while 이라 프레임 드랍/빠른 획에도 간격이 유지된다.
function growEvents(cc, headPx, CFG) {
    while (
        cc.swirly &&
        cc.events.length < CFG.maxSwirls &&
        headPx - cc.lastEventPx >= cc.nextGap
    ) {
        const rng = cc.rngEvent;
        cc.lastEventPx += cc.nextGap; // headPx 가 아니라 누적 — 간격이 설정대로 유지된다
        cc.nextGap = rnd(rng, CFG.eventGap[0], CFG.eventGap[1]);
        if (rng() > CFG.eventProb) continue;
        const span = rnd(rng, CFG.swirlSpan[0], CFG.swirlSpan[1]);
        cc.events.push({
            // 루프 구간을 머리보다 앞에 둔다 → 머리가 이 구간을 지나는 동안에만
            // 조금씩 그려져서 메인 곡선의 진행 속도와 맞물린다.
            c: cc.lastEventPx + span + rnd(rng, 0, CFG.spacing * 6),
            span,
            R: rnd(rng, CFG.swirlRadius[0], CFG.swirlRadius[1]),
            turns: rnd(rng, CFG.swirlTurns[0], CFG.swirlTurns[1]),
            dir: rng() < 0.5 ? 1 : -1,
            phase: rnd(rng, 0, TWO_PI),
        });
    }
}

function growDecor(stroke, spine, headPx, CFG) {
    if (!CFG.decor) return;
    const rng = stroke.rngDecor;
    while (headPx - stroke.decorLastPx >= stroke.decorNextGap) {
        stroke.decorLastPx += stroke.decorNextGap;
        stroke.decorNextGap = rnd(rng, CFG.decorGap[0], CFG.decorGap[1]);
        // 좌표를 지금 확정하지 않는다 — "경로 위 위치 + 오프셋"만 저장하고
        // 실제 x/y 는 resolveDecor 가 매번 현재 spine 으로 다시 푼다.
        // 생성 순간의 미완성 spine 으로 좌표를 굳히면, 같은 획이라도 몇 점씩 자랐는지에
        // 따라 장식 위치가 달라진다 (smooth 가 끝점을 고정하므로 머리 근처가 최종본과 다름).
        stroke.decor.push({
            px: stroke.decorLastPx, // 경로 위 호 위치
            off: rnd(rng, -CFG.decorSpread, CFG.decorSpread), // 법선 방향 오프셋
            jx: rnd(rng, -4, 4),
            jy: rnd(rng, -4, 4),
            r: rnd(rng, CFG.decorRadius[0], CFG.decorRadius[1]),
            x: 0,
            y: 0, // resolveDecor 가 채움
        });
    }
}

// 장식 원의 실제 좌표를 현재 spine 으로 푼다. growStroke 가 매번 호출 →
// 최종 렌더는 항상 최종 spine 기준이 되어 프레임 독립성이 보장된다.
function resolveDecor(stroke, spine, CFG) {
    const lenPx = (spine.length - 1) * CFG.spacing;
    for (const d of stroke.decor) {
        const p = sample(Math.min(d.px, lenPx) / CFG.spacing, spine);
        if (!p) continue;
        d.x = p.x + p.nx * d.off + d.jx;
        d.y = p.y + p.ny * d.off + d.jy;
    }
}

// spine 위를 걸으며 동반 곡선 점들을 만든다. 모든 위치 인자가 px.
// 시작도 끝도 실선에 붙이지 않는다 — 자기가 방황하던 자리에서 그대로 시작하고 끝난다.
export function buildCompanion(spine, cc, CFG) {
    const sp = CFG.spacing;
    const lenPx = (spine.length - 1) * sp;
    const endPx = lenPx - CFG.headLag; // ⑤ 펜보다 조금 뒤에서 끝낸다
    if (endPx < CFG.compStep * 4) return [];

    // 기준 경로: 넉넉히 스무딩 → ② 리샘플 복원 (안 하면 곡률 큰 구간에서 점이 뭉쳐
    // 인덱스 1당 거리가 달라지고, 같은 weaveLen 이 다른 파장으로 보인다)
    let base = smooth(
        spine.map(p => ({ x: p.x, y: p.y })),
        passesFor(CFG.compBaseSmooth, sp),
    );
    base = computeFrames(resample(base, sp));
    const baseLenPx = (base.length - 1) * sp; // 스무딩은 경로를 줄인다 → 최종본 기준

    const pts = [];
    const stop = Math.min(endPx, baseLenPx);
    for (let px = 0; px <= stop; px += CFG.compStep) {
        const p = sample(px / sp, base);

        // ① 완만한 드리프트(큰 굽이) + ② main 곡선을 넘나드는 저진폭 진동.
        // ④ 노이즈 두 샘플의 차 → 평균 0 이 보장된다. 구버전 (nz-0.5) 은 곡선마다
        //    DC 바이어스가 남아서 "한쪽으로만 도는" 곡선이 나오곤 했다.
        const u = px / cc.wanderLen;
        const drift = cc.amp * 1.6 * (cc.nz(u) - cc.nz(u + 111.3));
        const weave = cc.weaveAmp * Math.sin((px / cc.weaveLen) * TWO_PI + cc.weavePhase);
        const lateral = drift + weave;
        let ox = p.nx * lateral,
            oy = p.ny * lateral;

        // ③ 루프 이벤트: 지나갈 때만 원을 그림
        for (const e of cc.events) {
            const d = (px - e.c) / e.span; // -1..1
            if (d <= -1 || d >= 1) continue;
            const env = Math.cos((d * Math.PI) / 2) ** 2; // 가장자리 0, 중앙 1
            const ang = e.phase + e.dir * (d + 1) * Math.PI * e.turns;
            ox += Math.cos(ang) * e.R * env;
            oy += Math.sin(ang) * e.R * env;
        }
        pts.push({ x: p.x + ox, y: p.y + oy });
    }
    return smooth(pts, passesFor(CFG.compSmooth, CFG.compStep));
}

// 매 프레임 호출: spine 갱신 + 이벤트/장식 성장 + 동반 곡선 재생성.
// 결과는 stroke.spine / stroke.compPolys 에 들어간다.
export function growStroke(stroke, CFG) {
    if (stroke.raw.length < 2) {
        stroke.spine = null;
        stroke.compPolys = [];
        return;
    }
    const spine = buildSpine(stroke.raw, CFG);
    const headPx = (spine.length - 1) * CFG.spacing;
    for (const cc of stroke.comps) growEvents(cc, headPx, CFG);
    growDecor(stroke, spine, headPx, CFG);
    resolveDecor(stroke, spine, CFG); // 좌표는 항상 "지금의 spine" 기준으로 다시 푼다

    stroke.spine = spine;
    stroke.compPolys = [];
    for (const cc of stroke.comps) {
        const poly = buildCompanion(spine, cc, CFG);
        if (poly.length >= 2) stroke.compPolys.push(poly);
    }
}
