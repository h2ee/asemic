// jamoTrail.js — 자모 → "마우스 궤적" 변환 (제안 A: 앵커 보간)
//
// trail 엔진이 마우스에서 받던 것은 raw 점 배열 하나뿐이다. 이 파일이 그 자리를 채운다.
// 여기서 만든 점들이 그대로 리샘플 → 스무딩 → 동반 곡선 → goo 필드를 탄다.
//
// ⚠️ 이건 "파이프가 도는지" 보기 위한 1차 버전이다. 자모 좌표를 제어점 3~5개로 놓고
//    Catmull-Rom 으로 잇는 방식이라 경로가 얌전하다 — 궤적 복잡도가 부족하면
//    (a) 터틀/펜 모션(운동 자체를 자모가 지시) 또는
//    (b) 트리거 규칙(현재 점선 companion 처럼 특정 자모 조건에서 윤곽 변형)
//    으로 확장하는 것이 다음 단계.
//
// 매핑 원칙(패널 기준): 초성 = 시작 / 중성 = 형태 / 종성 = 끝나는 지점
//   cho.x 조음위치(양순0~후두1) → 시작 높이 보정
//   cho.y 조음방법(파열0~유음1) → 시작점 세로 위치
//   cho.z 긴장도(울림0~거센1)   → 진입 방향의 세기
//   F1    개구도(250~900)       → 중간점 세로 진폭 (입을 크게 벌리면 크게 휜다)
//   F2    혀 전후(580~2600)     → 중간점 가로 치우침
//   diphthong                   → 중간에 꺾임 1회 추가 (모음이 두 위치를 지남)
//   jong.y 조음방법             → 끝점 세로 위치, jong.z → 끝 후크 크기
//   종성 없음                   → 끝을 닫지 않고 상자 밖으로 흘려보냄 (열린 끝)

const F1_LO = 250,
    F1_HI = 900;
const F2_LO = 580,
    F2_HI = 2600;

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

// 종성 엔트리 — 겹받침은 cluster_front 로 대표음을 참조 (jamo_loader 규칙)
function jongEntry(JAMO, jong) {
    if (!jong) return null;
    const e = JAMO[jong + '_jong'];
    if (!e) return null;
    if (e.pos) return e;
    if (e.cluster_front) return JAMO[e.cluster_front + '_jong'] ?? null;
    return null;
}

// Catmull-Rom 스플라인을 stepPx 간격에 가깝게 샘플.
// 양 끝은 팬텀 포인트(첫/끝 복제)로 처리 — 곡선이 제어점에서 시작/끝나게 된다.
function catmullRom(ctrl, stepPx) {
    if (ctrl.length < 2) return ctrl.slice();
    const p = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
    const out = [];
    for (let i = 1; i < p.length - 2; i++) {
        const p0 = p[i - 1],
            p1 = p[i],
            p2 = p[i + 1],
            p3 = p[i + 2];
        const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const n = Math.max(2, Math.ceil(chord / stepPx));
        for (let k = 0; k < n; k++) {
            const t = k / n,
                t2 = t * t,
                t3 = t2 * t;
            out.push({
                x:
                    0.5 *
                    (2 * p1.x +
                        (-p0.x + p2.x) * t +
                        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                y:
                    0.5 *
                    (2 * p1.y +
                        (-p0.y + p2.y) * t +
                        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
            });
        }
    }
    out.push({ x: p[p.length - 2].x, y: p[p.length - 2].y });
    return out;
}

// syl   : { cho, jung, jong }
// ax,ay : 음절 셀의 기준점(px) — calcTextboxLayout 의 positions(uv) × 화면 크기.
//         curX 가 셀 왼쪽, curY 가 세로 기준선이므로 오른쪽으로 뻗어나가게 만든다.
// boxW/H: 음절이 차지할 크기(px)
// stepPx: 샘플 간격 — 엔진의 CFG.minDist(4px) 보다 커야 점이 걸러지지 않는다
export function jamoToTrail(JAMO, syl, ax, ay, boxW, boxH = boxW, stepPx = 5) {
    const choE = JAMO[syl.cho]?.cho;
    const jungE = JAMO[syl.jung];
    if (!choE?.pos || !jungE?.pos) return [];

    const [choX, choY, choZ] = choE.pos;
    const [f1, f2] = jungE.pos;
    const f1n = clamp01((f1 - F1_LO) / (F1_HI - F1_LO)); // 개구도
    const f2n = clamp01((f2 - F2_LO) / (F2_HI - F2_LO)); // 혀 전후
    const diph = jungE.diphthong ? 1 : 0;

    const jE = jongEntry(JAMO, syl.jong);
    const [, jongY = 0.5, jongZ = 0.33] = jE?.pos ?? [];

    // 제어점 — 로컬 좌표. x 는 0..1(셀 폭 비율), y 는 -0.5..0.5(셀 높이 비율)
    const ctrl = [];
    const choYy = (choY - 0.5) * 0.7;

    // 진입 — 상자 왼쪽 밖에서 들어온다. 긴장도가 높으면 더 멀리서 세게.
    ctrl.push({ x: -0.10 - choZ * 0.10, y: choYy - (choX - 0.5) * 0.25 });
    // 초성
    ctrl.push({ x: 0.08, y: choYy });
    // 중성 — 개구도가 세로 진폭, 혀 전후가 가로 치우침
    ctrl.push({ x: 0.46 + (f2n - 0.5) * 0.22, y: (0.5 - f1n) * 0.85 });
    // 이중모음이면 중간에 한 번 꺾인다
    if (diph) ctrl.push({ x: 0.70, y: -(0.5 - f1n) * 0.55 });

    if (jE) {
        // 종성 — 끝점을 확정하고 작은 후크로 닫는다
        ctrl.push({ x: 0.92, y: (jongY - 0.5) * 0.7 });
        ctrl.push({ x: 1.00 + jongZ * 0.10, y: (jongY - 0.5) * 0.7 + 0.14 + jongZ * 0.16 });
    } else {
        // 종성 없음 — 닫지 않고 중성 방향으로 흘려보낸다
        const dir = (0.5 - f1n) * 0.85;
        ctrl.push({ x: 1.06, y: dir * 1.25 });
    }

    const pts = catmullRom(ctrl, stepPx / Math.max(boxW, 1));
    // 로컬 → 절대 px
    return pts.map(p => ({ x: ax + p.x * boxW, y: ay + p.y * boxH }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 제안 B: 터틀/펜 모션 — 자모가 "어디를 지날지"가 아니라 "어떻게 움직일지"를 지시
// ─────────────────────────────────────────────────────────────────────────────
//
// 상태는 위치와 heading(θ) 두 개뿐. 매 스텝:
//     θ   += κ(s) · ds        κ = 곡률, s = 진행도 0~1
//     pos += (cos θ, sin θ) · ds
//
// A(앵커 보간)와의 차이: A는 제어점 3~5개 사이를 잇는 게 전부라 경로 길이가
// 제어점 배치에 갇힌다. B는 걷는 동안 계속 생성되므로 **경로가 스스로를 접는다** —
// 같은 크기 박스 안에서 호길이가 2~3배 나오고, 그만큼 동반 곡선 생성기(방황/루프)의
// 기회도 늘어난다.
//
// 매핑
//   cho.x 조음위치 → 출발 heading
//   cho.y 조음방법 → **곡률 함수의 종류** (아래 4밴드). B의 핵심.
//   cho.z 긴장도   → 총 회전량 배율 + 스텝 길이 불규칙
//   F1 개구도      → 총 이동 거리(= 획 길이)
//   F2 혀 전후     → 곡률 DC 바이어스 (감기는 방향과 세기)
//   yang           → 회전 부호
//   diphthong      → 진행 중간에 바이어스 부호 반전 → S자
//   jong           → 마지막 구간의 종결 동작(후크/루프). 없으면 종결 없이 흘러나감

// 곡률을 세 성분으로 나눈다. 어떤 성분이 "접힘"을 만드는지가 이 설계의 전부다.
// (접힐수록 같은 크기 박스 안에 긴 호길이가 들어가고, 그게 곧 복잡도다 —
//  박스에 맞춰 축소하므로 화면상 호길이 ≈ boxW × FILL × L/bbox)
//
//   MEANDER  큰 진폭으로 좌우로 휘감는 사행. **접힘의 주역이자 "글씨처럼 보이는" 이유.**
//   DC       완만한 전체 curl. 획이 한쪽으로 쓸리게 하는 정도로만 약하게.
//   AC       조음방법의 질감(꺾임/떨림/물결). 세밀한 서명이지 접힘에는 기여하지 않는다.
//
// 두 번의 실패를 거쳐 여기 왔다 —
//   1차: |회전량| 총합만 정규화 → 진동 곡률은 순회전이 0이라 경로가 직진(A와 호길이 동일)
//   2차: 순회전(DC)을 1~2바퀴로 키움 → 접히긴 했는데 음절마다 **큰 원**이 돼서 글씨가 아님
//   3차(현재): 접힘을 사행이 맡고 DC 는 약하게 — 원이 아니라 휘감기는 획이 된다
const ARC_MIN = 2.2; // 총 이동 거리(걷기 단위) — F1 최소
const ARC_MAX = 5.0; // F1 최대
const MEANDER_AMP = [1.25, 2.1]; // 사행의 heading 진폭(rad) — 긴장도가 고른다. 클수록 깊게 휜다
const MEANDER_N = [2.5, 5.0]; // 사행 파장 수 — 혀 전후(F2)가 고른다
const DC_TURNS = [0.1, 0.35]; // 전체 curl(바퀴 수) — 약하게. 개구도가 고른다
const AC_TURN = 3.5; // 질감(AC) 총 |회전량|(rad)
const STEPS = 420; // 걷기 스텝 수 (생성 해상도. 뒤에서 stepPx 로 솎아낸다)
const FILL = 0.95; // 박스 대비 채움 비율

const lerp = (a, b, t) => a + (b - a) * t;

const bell = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

// 음절 하나의 "곡률 프로그램". 자모에서 뽑은 운동 지시를 한 덩어리로 묶는다.
// 음절 단위 획(jamoToTrailTurtle)과 단어 단위 획(jamoWordTrail)이 이걸 공유한다.
function curvatureProgram(JAMO, syl) {
    const choE = JAMO[syl.cho]?.cho;
    const jungE = JAMO[syl.jung];
    if (!choE?.pos || !jungE?.pos) return null;

    const [choX, choY, choZ] = choE.pos;
    const [f1, f2] = jungE.pos;
    const f1n = clamp01((f1 - F1_LO) / (F1_HI - F1_LO));
    const f2n = clamp01((f2 - F2_LO) / (F2_HI - F2_LO));
    const yang = jungE.yang ? 1 : -1;
    const diph = jungE.diphthong ? 1 : 0;

    const jE = jongEntry(JAMO, syl.jong);
    const jongY = jE?.pos?.[1] ?? 0.5;
    const jongZ = jE?.pos?.[2] ?? 0.33;

    const L = ARC_MIN + f1n * (ARC_MAX - ARC_MIN); // 개구도 → 획 길이
    const mAmp = lerp(MEANDER_AMP[0], MEANDER_AMP[1], choZ); // 긴장도 → 사행 깊이
    const mN = lerp(MEANDER_N[0], MEANDER_N[1], f2n); // 혀 전후 → 사행 파장 수
    const dcTurns = lerp(DC_TURNS[0], DC_TURNS[1], f1n); // 개구도 → 전체 curl
    const N = STEPS;
    const ds = L / N;
    const kDC = (dcTurns * Math.PI * 2) / L; // 이 곡률을 L 만큼 유지하면 dcTurns 바퀴
    // 사행: θ(s) = mAmp·sin(2π·mN·s) 가 되도록 하는 곡률. heading 이 ±mAmp 로 흔들린다
    const kMeanderGain = (mAmp * 2 * Math.PI * mN) / L;

    // 곡률 프로파일(AC). 조음방법 4밴드를 종 모양 가중치로 섞는다 —
    // 이산 분기가 아니라 연속이라 조음방법 축이 그대로 읽힌다.
    const shape = new Float64Array(N);
    for (let i = 0; i < N; i++) {
        const s = i / (N - 1);
        const imp = bell(s, 0.34, 0.045) - bell(s, 0.68, 0.045); // 파열 — 날카로운 꺾임
        const jit = Math.sin(s * Math.PI * 2 * 11) * 0.8; //          마찰 — 고주파 떨림
        const arc = 1.0; //                                          비음 — 완만한 일정 곡률
        const wav = Math.sin(s * Math.PI * 2 * 2.2); //              유음 — 저주파 물결
        shape[i] =
            bell(choY, 0.0, 0.3) * imp +
            bell(choY, 0.5, 0.22) * jit +
            bell(choY, 0.78, 0.26) * arc +
            bell(choY, 1.0, 0.22) * wav;
    }
    // AC 질감의 총 |회전량|을 AC_TURN 에 맞춘다.
    // (파열처럼 좁은 임펄스만 있으면 정규화가 그 지점에 회전을 몰아줘서 자연히
    //  각진 꺾임이 된다 — 밴드마다 진폭을 손으로 맞출 필요가 없다)
    let absSum = 0;
    for (let i = 0; i < N; i++) absSum += Math.abs(shape[i]);
    const normAC = absSum > 1e-9 ? AC_TURN / (absSum * ds) : 0;

    return {
        N,
        ds,
        theta0: -Math.PI * 0.15 + (choX - 0.5) * Math.PI * 0.7, // 조음위치 → 출발 방향
        // i 번째 스텝의 곡률
        k(i) {
            const s = i / (N - 1);
            // 이중모음 — 사행의 위상을 중간에 반 파장 밀어 리듬을 끊는다.
            // (DC 를 뒤집는 방식은 접힘을 상쇄시켜 폐기 — 파일 상단 주석의 2차 실패)
            const phase = diph && s > 0.5 ? Math.PI : 0;
            const meander = kMeanderGain * Math.cos(2 * Math.PI * mN * s + phase);
            let k = (kDC + meander) * yang + shape[i] * normAC;
            if (jE && s > 0.85) {
                // 종성 — 마지막 15% 구간에서 후크/루프로 닫는다
                const t = (s - 0.85) / 0.15;
                k += (jongY >= 0.5 ? 1 : -1) * (6 + jongZ * 18) * Math.sin(t * Math.PI);
            }
            return k;
        },
        // 긴장도 → 스텝 길이 불규칙(거센소리는 손이 떨린다). 결정적 수열이라 난수 아님.
        step(i) {
            return ds * (1 + choZ * 0.35 * Math.sin(i * 2.399));
        },
    };
}

// 프로그램 하나를 걸어 점 배열을 만든다 (원점 시작, theta 는 in/out).
function walkProgram(prog, theta) {
    let x = 0,
        y = 0;
    const pts = [{ x, y }];
    for (let i = 0; i < prog.N; i++) {
        theta += prog.k(i) * prog.ds;
        const st = prog.step(i);
        x += Math.cos(theta) * st;
        y += Math.sin(theta) * st;
        pts.push({ x, y });
    }
    return { pts, theta };
}

// stepPx 간격으로 솎아낸다 (엔진 pushPoint 의 minDist 필터와 중복이지만,
// 여기서 줄여두면 배열 크기와 성장 예산 계산이 정직해진다)
function decimate(pts, stepPx) {
    const out = [];
    let last = null;
    for (const p of pts) {
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= stepPx) {
            out.push(p);
            last = p;
        }
    }
    // 마지막 점을 억지로 밀어 넣지 않는다 — 넣으면 뒤에 점이 더 붙었을 때
    // 앞부분 결과가 달라져서 "단어 = 획"의 append-only 전제가 깨진다.
    // (경로 끝이 최대 stepPx 만큼 짧아지는 건 무시할 수준)
    return out;
}

export function jamoToTrailTurtle(JAMO, syl, ax, ay, boxW, boxH = boxW, stepPx = 5) {
    const prog = curvatureProgram(JAMO, syl);
    if (!prog) return [];
    const { pts: walk } = walkProgram(prog, prog.theta0);

    // 박스에 맞춰 정규화. 터틀은 방황하므로 반드시 필요하다.
    // 형태(굽이)는 보존되고 크기만 맞춰지므로, 음절마다 실제 크기가 조금씩 달라진다
    // — signal 의 포먼트 기반 가변 음절 크기와 같은 성격이라 특징으로 쓸 수 있다.
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (const p of walk) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    const bw = maxX - minX,
        bh = maxY - minY;
    if (!(bw > 1e-6 || bh > 1e-6)) return [];
    const scale = Math.min((boxW * FILL) / Math.max(bw, 1e-6), (boxH * FILL) / Math.max(bh, 1e-6));
    const cx = (minX + maxX) * 0.5,
        cy = (minY + maxY) * 0.5;
    const tx = ax + boxW * 0.5,
        ty = ay;

    return decimate(
        walk.map(p => ({ x: tx + (p.x - cx) * scale, y: ty + (p.y - cy) * scale })),
        stepPx,
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 단어 = 획 — 한 단어의 음절들을 **하나의 연속된 펜 운동**으로 잇는다
// ─────────────────────────────────────────────────────────────────────────────
//
// 음절마다 획을 끊으면 경로가 200px 안팎이라 동반 곡선 생성기(방황/루프)가
// 놀 공간이 없다. 단어로 묶으면 4~5배가 되고, 접지 않아도(= 낙서 뭉치가 되지 않아도)
// 길이가 나온다. 음절 사이에서 heading 이 이어지므로 진짜 한 획으로 보인다.
//
// ⚠️ **append-only 가 이 함수의 핵심 제약이다.**
//    타이핑 중 음절이 하나 붙을 때마다 단어 전체를 bbox 에 다시 맞추면 앞부분 좌표가
//    전부 움직인다 → 점진 렌더가 매 글자마다 처음부터 다시 그려지고, 엔진이 필드
//    텍스처에 구워둔 것과도 어긋난다. 그래서 **전역 refit 을 하지 않는다**:
//    음절마다 "순 전진 = 1 walk unit" 으로 국소 정규화하고, 그 단위를 advancePx 로
//    환산한다. 음절 i 의 좌표는 0..i 에만 의존 → 뒤에 붙여도 앞이 안 움직인다.

const JOIN_STEER = 0.35; // 음절 경계에서 새 초성의 출발 방향을 얼마나 따라갈지 (0=완전 연속)
// 각 음절의 순 전진 방향을 가로(+x)로 얼마나 당길지. 1 = 정확히 가로.
// 1 보다 낮추면 음절마다 남는 각도 오차가 **누적**돼서 단어가 몇 음절 만에 줄 밖으로
// 흘러나간다(0.55 로 뒀다가 두 번째 단어가 화면 위로 빠져나갔다). 의도적인 baseline
// 흔들림이 필요하면 여기가 아니라 음절마다 독립적인 각도를 주는 식이어야 한다.
const LINE_PULL = 1.0;

const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));

// syls      : 한 단어의 음절 배열 (순서대로)
// ax, ay    : 첫 음절 앵커(px)
// advancePx : 음절 하나가 가로로 전진하는 거리 — 레이아웃의 wrapStep 을 그대로 넣는다
export function jamoWordTrail(JAMO, syls, ax, ay, advancePx, stepPx = 5) {
    let theta = null;
    let penX = 0,
        penY = 0; // walk 단위. 음절마다 순 전진 1
    const walk = [{ x: 0, y: 0 }];

    for (const syl of syls) {
        const prog = curvatureProgram(JAMO, syl);
        if (!prog) continue;

        // 첫 음절은 자기 출발 방향으로, 이후는 heading 을 이어받되 새 초성 쪽으로 조금 튼다
        theta = theta === null ? prog.theta0 : theta + wrapPi(prog.theta0 - theta) * JOIN_STEER;

        const { pts, theta: endTheta } = walkProgram(prog, theta);
        theta = endTheta;

        // 이 음절의 순 전진(시작→끝)을 1 로 맞추고, 그 방향을 가로로 LINE_PULL 만큼 당긴다.
        // 당기지 않으면 단어가 몇 음절 만에 줄 밖으로 흘러나간다.
        const end = pts[pts.length - 1];
        const netLen = Math.hypot(end.x, end.y);
        if (netLen < 1e-6) continue;
        const netDir = Math.atan2(end.y, end.x);
        const rot = -wrapPi(netDir) * LINE_PULL;
        const cs = Math.cos(rot),
            sn = Math.sin(rot),
            sc = 1 / netLen;

        for (let i = 1; i < pts.length; i++) {
            const px = pts[i].x * sc,
                py = pts[i].y * sc;
            walk.push({ x: penX + (px * cs - py * sn), y: penY + (px * sn + py * cs) });
        }
        const last = walk[walk.length - 1];
        penX = last.x;
        penY = last.y;
        theta += rot; // 회전 보정만큼 heading 도 같이 돌려야 다음 음절이 이어진다
    }

    if (walk.length < 2) return [];
    // walk 단위 → px. 첫 점이 첫 음절 앵커에 오도록 평행이동만 한다 (refit 없음)
    return decimate(
        walk.map(p => ({ x: ax + p.x * advancePx, y: ay + p.y * advancePx })),
        stepPx,
    );
}
