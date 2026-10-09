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

// ───────────────────────── 구간 계획(plan) ─────────────────────────
//
// 획 하나를 호길이(px) 구간으로 나누고 구간마다 자기 시드를 준다:
//     plan = [{ px0, seed }, ...]   px0 오름차순, 첫 구간 px0 = 0
//
// 동반 곡선 모양 · 루프 이벤트 · 장식 · 오브 · 선 효과 · reach 변화가 전부
// **(구간 시드, 구간 안의 국소 px)** 만으로 정해진다. 그래서
//   · 자모 입력  — 구간 = 음절, 시드 = 음절 내용. 같은 음절은 어느 단어 어느 자리에
//                  있든, 어떤 순서로 타이핑했든 같은 동반 곡선이 나온다.
//   · 마우스     — plan 이 없으면 [{px0:0, seed: 획 시드}] 한 구간. 이때는 예전의
//                  "획 전체 한 스트림" 과 **난수 소비 순서까지 똑같다** (스케치 룩 보존).
//                  장식은 비트 단위로 같고, 동반 곡선은 루프 위치만 조금(긴 획에서 ≤ ~15px) 다르다 —
//                  예전엔 실선 px 로 뽑은 루프 위치를 스무딩으로 짧아진 기준 경로 px 에 그대로 써서
//                  루프가 앞으로 밀려 있었다. 이제 toBase 로 옮긴다 (음절 경계가 앞 음절과 무관해지려면 필수)
// 구간 경계에서는 앞 구간 값과 segBlend(px) 만큼 크로스페이드해 연속을 지킨다.
//
// 구간은 orb 를 직접 지정할 수 있다 — plan[j].orbs = [{ at, r, fill?, off?, auto? }] (at = 구간 안 국소 px).
// 주면 그 구간은 난수 배치(gap/prob/spread) 대신 그 자리에만 orb 를 둔다. 빈 배열 = 그 구간엔 orb 없음.
// auto: true 면 법선 양쪽 중 실선이 덜 붐비는 쪽으로 off 를 둔다(settleSide) — 윤곽 바깥으로 나가게.
//
// 모든 것이 (plan, 머리 위치)의 순수 함수라 매 프레임 다시 계산한다 — 구 버전처럼
// 이벤트를 누적해 두면, 조합 중 음절이 바뀔 때(ㅇ→아→안) 옛 시드로 만든 이벤트가 남는다.

export function defaultPlan(seed) {
    return [{ px0: 0, seed }];
}

function segIndexAt(plan, px) {
    let j = 0;
    while (j + 1 < plan.length && plan[j + 1].px0 <= px) j++;
    return j;
}

const smooth01 = t => t * t * (3 - 2 * t);

// f(j, localPx) 를 구간 j 기준으로 평가하고, 경계 직후 blend px 동안 앞 구간과 섞는다
function blendSeg(plan, px, blend, f) {
    const j = segIndexAt(plan, px);
    const local = px - plan[j].px0;
    const v = f(j, local);
    if (j > 0 && blend > 0 && local < blend) {
        const vp = f(j - 1, px - plan[j - 1].px0);
        return vp + (v - vp) * smooth01(local / blend);
    }
    return v;
}

// 구간 j 의 [시작, 끝) — 마지막 구간은 머리까지
const segLimit = (plan, j, headPx) => Math.min(j + 1 < plan.length ? plan[j + 1].px0 : Infinity, headPx);

// 시드 → 해시 노이즈용 작은 수 (makeNoise 의 sin 해시가 큰 수에서 정밀도를 잃지 않게)
const smallSeed = seed => (seed >>> 0) % 9973;

// 정수 격자 해시 → [-1, 1)
function hash1(seed, k) {
    const x = Math.sin(k * 12.9898 + smallSeed(seed) * 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
}

// ───────────────────────── 획(stroke) ─────────────────────────
// 획 하나가 자기 상태를 다 들고 있다 (구버전의 모듈 스코프 decorLastS 같은 전역 상태 제거).

// seed: 이 획의 모든 난수를 결정하는 32bit 값.
//   마우스 입력  → hashSeed('mouse', sessionSeed, id)
//   자모 입력    → 단어 시드. 모양은 plan(음절 시드)이 정하고 이건 동반 곡선 개수·bead 정도만
// plan: 위 "구간 계획". 없으면 획 시드 한 구간
export function createStroke(CFG, id, birth, seed = 0, plan = null) {
    const [lo, hi] = CFG.companions;
    const nc = lo + Math.floor(makeRng(hashSeed(seed, 'comp'))() * (hi - lo + 1));
    return {
        id,
        birth, // 초 단위 (셰이더 field 의 .b 채널로 들어간다 — 나중에 "자람" 트리거용)
        seed,
        plan: plan?.length ? plan : defaultPlan(seed),
        nc,
        raw: [], // 원본 포인터 좌표
        spine: null, // 리샘플+스무딩된 실선
        spineInk: null, // spineFx 를 먹인 실선 (효과가 꺼져 있으면 null)
        compPolys: [], // 마지막으로 만들어진 동반 곡선 폴리라인들
        compPlan: null, // 동반 곡선 기준 경로(px) 좌표로 옮긴 plan — 동반 곡선 reach 계산용
        decor: [],
        orbs: [],
        segCache: null, // growStroke 가 채운다 (구간별 파라미터)
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

// 구간 하나의 동반 곡선 파라미터. 난수 순서는 구버전 makeCompCfgs 와 같다
// (첫 값 = 곡선 개수 자리 → 곡선마다 amp, wanderLen, weaveAmp, weaveLen, phase, noise, swirly)
function segComps(seg, nc, CFG) {
    const rng = makeRng(hashSeed(seg.seed, 'comp'));
    rng(); // 곡선 개수 자리 — 개수는 획 시드가 정한다 (createStroke)
    const out = [];
    for (let i = 0; i < nc; i++) {
        out.push({
            amp: rnd(rng, CFG.wanderAmp[0], CFG.wanderAmp[1]),
            wanderLen: rnd(rng, CFG.wanderLen[0], CFG.wanderLen[1]),
            weaveAmp: rnd(rng, CFG.weaveAmp[0], CFG.weaveAmp[1]),
            weaveLen: rnd(rng, CFG.weaveLen[0], CFG.weaveLen[1]),
            weavePhase: rnd(rng, 0, TWO_PI),
            nz: makeNoise(rnd(rng, 0, 999)),
            swirly: rng() >= CFG.noSwirlChance,
        });
    }
    return out;
}

// ③ 루프 이벤트 — 구간마다 자기 스트림. 머리(headPx)까지 들어온 것만.
// 구버전 growEvents 의 while 루프와 같은 순서로 난수를 쓴다 (다음 간격을 먼저 뽑고 확률 판정).
function planEvents(stroke, i, headPx, CFG) {
    const { plan } = stroke;
    const events = [];
    for (let j = 0; j < plan.length && events.length < CFG.maxSwirls; j++) {
        if (!stroke.segCache.comps[j][i].swirly) continue;
        const rng = makeRng(hashSeed(plan[j].seed, 'event', i));
        const limit = segLimit(plan, j, headPx);
        let cursor = plan[j].px0;
        let gap = rnd(rng, CFG.eventGap[0], CFG.eventGap[1]);
        while (events.length < CFG.maxSwirls && cursor + gap <= limit) {
            cursor += gap;
            gap = rnd(rng, CFG.eventGap[0], CFG.eventGap[1]);
            if (rng() > CFG.eventProb) continue;
            const span = rnd(rng, CFG.swirlSpan[0], CFG.swirlSpan[1]);
            events.push({
                // 루프 구간을 머리보다 앞에 둔다 → 머리가 이 구간을 지나는 동안에만
                // 조금씩 그려져서 메인 곡선의 진행 속도와 맞물린다.
                c: cursor + span + rnd(rng, 0, CFG.spacing * 6),
                span,
                R: rnd(rng, CFG.swirlRadius[0], CFG.swirlRadius[1]),
                turns: rnd(rng, CFG.swirlTurns[0], CFG.swirlTurns[1]),
                dir: rng() < 0.5 ? 1 : -1,
                phase: rnd(rng, 0, TWO_PI),
            });
        }
    }
    return events;
}

// 장식 사각형 — 구간마다 자기 스트림 (구버전 growDecor 와 같은 순서)
// 좌표는 "경로 위 위치 + 오프셋"만 정하고 실제 x/y 는 resolveOnSpine 이 현재 spine 으로 푼다.
// 생성 순간의 미완성 spine 으로 굳히면 몇 점씩 자랐는지에 따라 위치가 달라진다.
function planDecor(stroke, headPx, CFG) {
    if (!CFG.decor) return [];
    const { plan } = stroke;
    const out = [];
    for (let j = 0; j < plan.length; j++) {
        const rng = makeRng(hashSeed(plan[j].seed, 'decor'));
        const limit = segLimit(plan, j, headPx);
        let cursor = plan[j].px0;
        let gap = rnd(rng, CFG.decorGap[0], CFG.decorGap[1]);
        while (cursor + gap <= limit) {
            cursor += gap;
            gap = rnd(rng, CFG.decorGap[0], CFG.decorGap[1]);
            out.push({
                px: cursor, // 경로 위 호 위치
                off: rnd(rng, -CFG.decorSpread, CFG.decorSpread), // 법선 방향 오프셋
                jx: rnd(rng, -4, 4),
                jy: rnd(rng, -4, 4),
                r: rnd(rng, CFG.decorRadius[0], CFG.decorRadius[1]),
                x: 0,
                y: 0,
            });
        }
    }
    return out;
}

// 오브(노란 원 + 내부 flow field) — 장식과 같은 방식, 별도 스트림
function planOrbs(stroke, headPx, CFG) {
    const O = CFG.orb;
    if (!O?.on) return [];
    const { plan } = stroke;
    const out = [];
    for (let j = 0; j < plan.length; j++) {
        const limit = segLimit(plan, j, headPx);
        if (Array.isArray(plan[j].orbs)) {
            // 지정 배치 — 머리가 그 자리를 지나야 나타난다
            plan[j].orbs.forEach((o, k) => {
                const px = plan[j].px0 + o.at;
                if (px > limit) return;
                out.push({ px, off: o.off ?? 0, r: o.r, fill: o.fill, auto: !!o.auto, seed: hashSeed(plan[j].seed, 'orb', k), x: 0, y: 0 });
            });
            continue;
        }
        const rng = makeRng(hashSeed(plan[j].seed, 'orb'));
        let cursor = plan[j].px0;
        let gap = rnd(rng, O.gap[0], O.gap[1]);
        let k = 0;
        while (cursor + gap <= limit) {
            cursor += gap;
            gap = rnd(rng, O.gap[0], O.gap[1]);
            const keep = rng() <= O.prob;
            const orb = {
                px: cursor,
                off: rnd(rng, -O.spread, O.spread),
                r: rnd(rng, O.radius[0], O.radius[1]),
                seed: hashSeed(plan[j].seed, 'orb', k++),
                x: 0,
                y: 0,
            };
            if (keep) out.push(orb);
        }
    }
    return out;
}

// 경로 위 위치(px) + 법선 오프셋 → 현재 spine 의 x/y
function resolveOnSpine(items, spine, CFG) {
    const lenPx = (spine.length - 1) * CFG.spacing;
    for (const d of items) {
        const p = sample(Math.min(d.px, lenPx) / CFG.spacing, spine);
        if (!p) continue;
        d.x = p.x + p.nx * d.off + (d.jx ?? 0);
        d.y = p.y + p.ny * d.off + (d.jy ?? 0);
    }
}

// auto orb — 법선 ±off 두 후보 중 반경 (|off|+r) 안에 실선 점이 적은 쪽. 같으면 준 부호.
// orb 자리 + SETTLE_AHEAD px 까지의 실선만 센다 — 그 뒤로 자라는 경로가 나중에 쪽을 뒤집지 않게(그 순간 이미 다 있다)
const SETTLE_AHEAD = 40;
function settleSide(items, spine, CFG) {
    for (const d of items) {
        if (!d.auto || !d.off) continue;
        const p = sample(Math.min(d.px, (spine.length - 1) * CFG.spacing) / CFG.spacing, spine);
        if (!p) continue;
        const R = Math.abs(d.off) + d.r;
        const R2 = R * R;
        const n = Math.min(spine.length, Math.floor((d.px + SETTLE_AHEAD) / CFG.spacing) + 1);
        const crowd = sgn => {
            const cx = p.x + p.nx * d.off * sgn,
                cy = p.y + p.ny * d.off * sgn;
            let c = 0;
            for (let i = 0; i < n; i++) {
                const dx = spine[i].x - cx,
                    dy = spine[i].y - cy;
                if (dx * dx + dy * dy < R2) c++;
            }
            return c;
        };
        if (crowd(-1) < crowd(1)) {
            d.off = -d.off;
            d.x = p.x + p.nx * d.off + (d.jx ?? 0);
            d.y = p.y + p.ny * d.off + (d.jy ?? 0);
        }
    }
}

// ───────────────────────── 선 효과 (spineFx) ─────────────────────────
// 일러스트레이터의 Roughen / Pucker & Bloat 에 해당. 실선을 법선 방향으로 민다.
// 오프셋이 (구간 시드, 국소 px)의 함수라 자라는 중에도 앞부분이 안 흔들린다.
//
//   roughen      gap px 마다 앵커, 앵커마다 ±size 무작위 오프셋. mode 'smooth' 는 앵커
//                사이를 코사인으로, 'corner' 는 직선으로 (지그재그)
//   puckerBloat  gap px 마다 앵커. amount > 0 = bloat(앵커 사이가 둥글게 부푼다),
//                amount < 0 = pucker(앵커가 가시처럼 튀어나오고 사이는 오목)
function fxOffset(stroke, px, CFG) {
    const F = CFG.spineFx;
    const { plan } = stroke;
    let d = 0;
    const R = F.roughen;
    if (R?.on && R.size) {
        d += blendSeg(plan, px, CFG.segBlend, (j, local) => {
            const u = local / R.gap;
            const k = Math.floor(u);
            const t = u - k;
            const a = hash1(plan[j].seed, k),
                b = hash1(plan[j].seed, k + 1);
            const w = R.mode === 'corner' ? t : (1 - Math.cos(t * Math.PI)) * 0.5;
            return (a + (b - a) * w) * R.size;
        });
    }
    const P = F.puckerBloat;
    if (P?.on && P.amount) {
        d += blendSeg(plan, px, CFG.segBlend, (j, local) => {
            const t = (local / P.gap) % 1;
            const s = Math.sin(t * Math.PI);
            return P.amount > 0 ? P.amount * s : -P.amount * (1 - s) * (1 - s);
        });
    }
    return d;
}

function applySpineFx(stroke, spine, CFG) {
    const F = CFG.spineFx;
    if (!F || !(F.roughen?.on || F.puckerBloat?.on)) return null;
    const sp = CFG.spacing;
    const out = spine.map((p, i) => {
        const d = fxOffset(stroke, i * sp, CFG);
        return { x: p.x + p.nx * d, y: p.y + p.ny * d };
    });
    return computeFrames(out);
}

// ───────────────────────── reach 변화 ─────────────────────────
// CFG.goo.reach 가 숫자면 고정, [lo, hi] 면 구간마다 노이즈로 lo~hi 를 오간다
// (파장 goo.reachLen px). 커널이 길이로 정규화돼 있어 선 코어 밀도는 R 과 무관하게 ≈1 —
// R 은 "얼마나 멀리서 이웃 선과 붙는가"(= 두께감)만 바꾼다.
// which: 'spine' 이면 plan(실선 px), 'comp' 면 compPlan(동반 곡선 기준 경로 px)
export function reachAt(stroke, which, px, CFG) {
    const r = CFG.goo.reach;
    if (!Array.isArray(r)) return r;
    const plan = which === 'comp' && stroke.compPlan ? stroke.compPlan : stroke.plan;
    const nz = stroke.segCache?.reachNz;
    if (!nz) return (r[0] + r[1]) * 0.5;
    return blendSeg(plan, px, CFG.segBlend, (j, local) => r[0] + (r[1] - r[0]) * nz[j](local / CFG.goo.reachLen));
}

// spine 위를 걸으며 동반 곡선 점들을 만든다. 모든 위치 인자가 px.
// 시작도 끝도 실선에 붙이지 않는다 — 자기가 방황하던 자리에서 그대로 시작하고 끝난다.
function buildCompanion(spine, stroke, i, events, CFG) {
    const sp = CFG.spacing;
    const lenPx = (spine.length - 1) * sp;
    const endPx = lenPx - CFG.headLag; // ⑤ 펜보다 조금 뒤에서 끝낸다
    if (endPx < CFG.compStep * 4) return [];

    // 기준 경로: 넉넉히 스무딩 → ② 리샘플 복원 (안 하면 곡률 큰 구간에서 점이 뭉쳐
    // 인덱스 1당 거리가 달라지고, 같은 weaveLen 이 다른 파장으로 보인다)
    const sm = smooth(
        spine.map(p => ({ x: p.x, y: p.y })),
        passesFor(CFG.compBaseSmooth, sp),
    );
    // 스무딩은 경로를 줄인다 — 실선 px(= 인덱스×spacing) 를 기준 경로 px 로 옮기는 표.
    // plan 경계·이벤트 위치를 이걸로 옮겨야 앞 음절 모양과 무관하게 음절 경계가 맞는다.
    const cum = [0];
    for (let k = 1; k < sm.length; k++) cum.push(cum[k - 1] + Math.hypot(sm[k].x - sm[k - 1].x, sm[k].y - sm[k - 1].y));
    const toBase = px => {
        const f = Math.max(0, Math.min(sm.length - 1, px / sp));
        const k = Math.floor(f);
        return k >= sm.length - 1 ? cum[sm.length - 1] : cum[k] + (cum[k + 1] - cum[k]) * (f - k);
    };
    const base = computeFrames(resample(sm, sp));
    const baseLenPx = (base.length - 1) * sp;

    const plan = stroke.plan.map(s => ({ px0: toBase(s.px0), seed: s.seed }));
    stroke.compPlan = plan;
    const evs = events.map(e => ({ ...e, c: toBase(e.c) }));
    const comps = stroke.segCache.comps;

    const pts = [];
    const stop = Math.min(endPx, baseLenPx);
    for (let px = 0; px <= stop; px += CFG.compStep) {
        const p = sample(px / sp, base);

        // ① 완만한 드리프트(큰 굽이) + ② main 곡선을 넘나드는 저진폭 진동.
        // ④ 노이즈 두 샘플의 차 → 평균 0 이 보장된다. 구버전 (nz-0.5) 은 곡선마다
        //    DC 바이어스가 남아서 "한쪽으로만 도는" 곡선이 나오곤 했다.
        // 위치는 구간 국소 px — 같은 음절이면 같은 굽이
        const lateral = blendSeg(plan, px, CFG.segBlend, (j, local) => {
            const cc = comps[j][i];
            const u = local / cc.wanderLen;
            const drift = cc.amp * 1.6 * (cc.nz(u) - cc.nz(u + 111.3));
            const weave = cc.weaveAmp * Math.sin((local / cc.weaveLen) * TWO_PI + cc.weavePhase);
            return drift + weave;
        });
        let ox = p.nx * lateral,
            oy = p.ny * lateral;

        // ③ 루프 이벤트: 지나갈 때만 원을 그림
        for (const e of evs) {
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

// 매 프레임 호출: spine 갱신 + 이벤트/장식 + 동반 곡선 재생성.
// 결과는 stroke.spine / spineInk / compPolys / decor / orbs 에 들어간다.
export function growStroke(stroke, CFG) {
    if (stroke.raw.length < 2) {
        stroke.spine = null;
        stroke.spineInk = null;
        stroke.compPolys = [];
        return;
    }
    const spine = buildSpine(stroke.raw, CFG);
    const headPx = (spine.length - 1) * CFG.spacing;

    // 구간별 파라미터 — plan 이 바뀌어도(replaceTail) 그대로 따라오도록 매번 만든다 (구간 수개라 싸다)
    stroke.segCache = {
        comps: stroke.plan.map(seg => segComps(seg, stroke.nc, CFG)),
        reachNz: stroke.plan.map(seg => makeNoise(smallSeed(hashSeed(seg.seed, 'reach')))),
    };

    stroke.decor = planDecor(stroke, headPx, CFG);
    resolveOnSpine(stroke.decor, spine, CFG);
    stroke.orbs = planOrbs(stroke, headPx, CFG);
    resolveOnSpine(stroke.orbs, spine, CFG);
    settleSide(stroke.orbs, spine, CFG);

    stroke.spine = spine;
    stroke.spineInk = applySpineFx(stroke, spine, CFG);
    stroke.compPolys = [];
    for (let i = 0; i < stroke.nc; i++) {
        const poly = buildCompanion(spine, stroke, i, planEvents(stroke, i, headPx, CFG), CFG);
        if (poly.length >= 2) stroke.compPolys.push(poly);
    }
}
