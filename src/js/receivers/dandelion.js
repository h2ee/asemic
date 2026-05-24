// ── dandelion.js ──────────────────────────────────────────────────────────────
// 민들레 수신자 — L-시스템 분기 기반 한글 시각화
//
// 구조:
//   음절 하나 = 민들레 한 송이 (DandelionPlant)
//   L-시스템: 공리 'F', 규칙 F→F[+F]F[-F]F
//   Canvas 2D + requestAnimationFrame
//
// 파라미터 매핑:
//   초성 x (조음위치 0~1)  → 분기 각도: x * 40° + 10°  (10~50°)
//   초성 y (조음방법 0~1)  → 분기 횟수: round(y * 3) + 1  (1~4)
//   모음 F1 (Hz)           → 세대 수:   round(정규화 * 2) + 2  (2~4)
//   모음 F2 (Hz)           → 줄기 기본 길이 (비례)
//   이중모음 (diphthong=1) → 겹꽃 (같은 공리 두 번 전개)
// ─────────────────────────────────────────────────────────────────────────────

const GEN_DUR    = 320;   // 세대 하나 전개에 걸리는 시간 (ms)
const DISP_DUR   = 1800;  // 홀씨 날아가는 전체 시간 (ms)
const F1_MIN     = 250;
const F1_MAX     = 900;
const F2_MIN     = 580;
const F2_MAX     = 2600;

// ── L-시스템 ──────────────────────────────────────────────────────────────────
const AXIOM = 'F';
const RULES = { F: 'F[+F]F[-F]F' };

function lExpand(str) {
    return str.split('').map(c => RULES[c] ?? c).join('');
}

function lBuild(generations) {
    let s = AXIOM;
    for (let i = 0; i < generations; i++) s = lExpand(s);
    return s;
}

// L-문자열 → 선분 배열 { x1,y1,x2,y2 }
// origin은 (0,0), 위쪽(−π/2)이 성장 방향
function lToSegments(str, branchAngle, baseLen) {
    const stack = [];
    const segs  = [];
    let x = 0, y = 0;
    let dir = -Math.PI / 2;
    let len = baseLen;

    for (const c of str) {
        if (c === 'F') {
            const nx = x + Math.cos(dir) * len;
            const ny = y + Math.sin(dir) * len;
            segs.push({ x1: x, y1: y, x2: nx, y2: ny });
            x = nx; y = ny;
            len *= 0.68; // 세대 진행마다 짧아짐
        } else if (c === '+') {
            dir += branchAngle;
        } else if (c === '-') {
            dir -= branchAngle;
        } else if (c === '[') {
            stack.push({ x, y, dir, len });
        } else if (c === ']') {
            ({ x, y, dir, len } = stack.pop());
        }
    }
    return segs;
}

// 끝점(리프) 수집 — 홀씨 위치
function collectTips(str, branchAngle, baseLen) {
    const stack = [];
    const tips  = [];
    let x = 0, y = 0;
    let dir = -Math.PI / 2;
    let len = baseLen;

    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === 'F') {
            x += Math.cos(dir) * len;
            y += Math.sin(dir) * len;
            len *= 0.68;
            // 다음 문자가 없거나 ']'면 끝점
            const next = str[i + 1];
            if (!next || next === ']') tips.push({ x, y });
        } else if (c === '+') {
            dir += branchAngle;
        } else if (c === '-') {
            dir -= branchAngle;
        } else if (c === '[') {
            stack.push({ x, y, dir, len });
        } else if (c === ']') {
            ({ x, y, dir, len } = stack.pop());
        }
    }
    return tips;
}

// 피보나치 각도 배열 (홀씨 분산용)
function fibAngles(n) {
    const PHI = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: n }, (_, i) => i * PHI);
}

// ── DandelionPlant ────────────────────────────────────────────────────────────
class DandelionPlant {
    constructor({ cx, cy, branchAngle, generations, stemLen, isDiphthong, color }) {
        this.cx          = cx;
        this.cy          = cy;
        this.branchAngle = branchAngle;
        this.generations = generations;
        this.baseLen     = stemLen;
        this.isDiphthong = isDiphthong;
        this.color       = color; // { r,g,b } 0~1

        // L-시스템 세대별 선분 배열
        this.genSegs = [];
        // 겹꽃이면 두 번째 세트도
        this.genSegs2 = [];

        this._buildAll();

        this.tips = collectTips(this.genSegs[this.generations - 1]?.str ?? AXIOM, branchAngle, stemLen);
        this.fibA = fibAngles(this.tips.length);

        // 애니메이션 상태
        this.startMs    = -1;   // 첫 틱에서 초기화
        this.phase      = 'growing'; // 'growing' | 'bloomed' | 'dispersing'
        this.dispStartMs = -1;

        // 홀씨 날아가는 속도 (각 홀씨마다 살짝 다르게)
        this.dispSpeeds = this.tips.map((_, i) => 0.7 + (i % 3) * 0.15);
    }

    _buildAll() {
        let s = AXIOM;
        for (let g = 0; g < this.generations; g++) {
            s = lExpand(s);
            this.genSegs.push({
                str:  s,
                segs: lToSegments(s, this.branchAngle, this.baseLen),
            });
        }
        if (this.isDiphthong) {
            const angle2 = this.branchAngle * 0.75;
            let s2 = AXIOM;
            for (let g = 0; g < this.generations; g++) {
                s2 = lExpand(s2);
                this.genSegs2.push({
                    str:  s2,
                    segs: lToSegments(s2, angle2, this.baseLen * 0.85),
                });
            }
        }
    }

    tick(nowMs) {
        if (this.startMs < 0) this.startMs = nowMs;
        const elapsed = nowMs - this.startMs;
        const totalGrowMs = this.generations * GEN_DUR;

        if (this.phase === 'growing' && elapsed >= totalGrowMs) {
            this.phase = 'bloomed';
        }
    }

    startDisperse(nowMs) {
        if (this.phase === 'dispersing') return;
        this.phase       = 'dispersing';
        this.dispStartMs = nowMs;
    }

    // 현재 표시할 세대 수 (0부터 시작)
    _currentGen(nowMs) {
        if (this.startMs < 0) return 0;
        const elapsed = nowMs - this.startMs;
        return Math.min(this.generations - 1, Math.floor(elapsed / GEN_DUR));
    }

    draw(ctx, nowMs) {
        const curGen = this._currentGen(nowMs);
        const { r, g, b } = this.color;

        ctx.save();
        ctx.translate(this.cx, this.cy);

        // 홀씨 날아가기
        let dispT = 0;
        if (this.phase === 'dispersing' && this.dispStartMs > 0) {
            dispT = Math.min((nowMs - this.dispStartMs) / DISP_DUR, 1.0);
        }

        // 줄기 투명도 (disperse 시 fade out)
        const stemAlpha = this.phase === 'dispersing' ? 1.0 - dispT * 0.9 : 1.0;

        // 1차 세트 그리기
        this._drawSegs(ctx, this.genSegs, curGen, stemAlpha, r, g, b);
        // 겹꽃
        if (this.isDiphthong) {
            this._drawSegs(ctx, this.genSegs2, curGen, stemAlpha * 0.6, r, g, b);
        }

        // 홀씨
        if (this.phase === 'bloomed' || this.phase === 'dispersing') {
            this._drawTips(ctx, dispT, r, g, b);
        }

        ctx.restore();
    }

    _drawSegs(ctx, genSegs, curGen, alpha, r, g, b) {
        if (!genSegs.length) return;
        const segs = genSegs[curGen]?.segs ?? [];
        ctx.strokeStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha.toFixed(2)})`;
        ctx.lineWidth   = 1.2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        for (const { x1, y1, x2, y2 } of segs) {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
    }

    _drawTips(ctx, dispT, r, g, b) {
        for (let i = 0; i < this.tips.length; i++) {
            let { x, y } = this.tips[i];
            if (dispT > 0) {
                const speed = this.dispSpeeds[i];
                const dist  = dispT * dispT * 80 * speed;
                x += Math.cos(this.fibA[i]) * dist;
                y += Math.sin(this.fibA[i]) * dist;
            }
            const a = dispT > 0 ? Math.max(0, 1.0 - dispT * 1.2) : 0.85;
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a.toFixed(2)})`;
            ctx.fill();
        }
    }

    get done() {
        return this.phase === 'dispersing' &&
               this.dispStartMs > 0 &&
               (performance.now() - this.dispStartMs) > DISP_DUR;
    }
}

// ── 자모 값 → DandelionPlant 파라미터 ────────────────────────────────────────
function mapParams(syl, JAMO, baseSize) {
    const choEntry  = JAMO[syl.cho]?.cho;
    const jungEntry = JAMO[syl.jung];

    const choX = choEntry?.pos?.[0] ?? 0.5;  // 조음위치
    const choY = choEntry?.pos?.[1] ?? 0.0;  // 조음방법
    const f1   = jungEntry?.pos?.[0] ?? 500; // F1 Hz
    const f2   = jungEntry?.pos?.[1] ?? 1200;// F2 Hz
    const diph = jungEntry?.diphthong ?? 0;

    const branchAngle  = (choX * 40 + 10) * (Math.PI / 180);
    const generations  = Math.round(((f1 - F1_MIN) / (F1_MAX - F1_MIN)) * 2) + 2; // 2~4
    const f2Norm       = (f2 - F2_MIN) / (F2_MAX - F2_MIN); // 0~1
    const stemLen      = baseSize * (0.18 + f2Norm * 0.14);   // baseSize의 18~32%
    const isDiphthong  = diph > 0.5;

    // 조음위치(choX)로 색조 결정: 0=양순(따뜻한 갈색) ~ 1=후두(차가운 청록)
    const warm = { r: 0.35, g: 0.22, b: 0.10 };
    const cool = { r: 0.12, g: 0.28, b: 0.32 };
    const color = {
        r: warm.r + (cool.r - warm.r) * choX,
        g: warm.g + (cool.g - warm.g) * choX,
        b: warm.b + (cool.b - warm.b) * choX,
    };

    return { branchAngle, generations, stemLen, isDiphthong, color };
}

// ── 레이아웃 — sora.js calcLayout 대응 ───────────────────────────────────────
// main.js의 calcTextboxLayout이 이미 x,y 위치를 계산해서 넘겨줌.
// 여기서는 baseSize(민들레 크기)만 positions로부터 추정.
function estimateBaseSize(positions, W, H) {
    if (positions.length < 2) return Math.min(W, H) * 0.18;
    const dx = Math.abs(positions[1][0] - positions[0][0]) * W;
    return Math.max(40, Math.min(dx * 1.6, Math.min(W, H) * 0.22));
}

// ── DandelionReceiver ─────────────────────────────────────────────────────────
export class DandelionReceiver {
    constructor() {
        this._canvas    = null;
        this._ctx       = null;
        this._ownCanvas = false;
        this._raf       = null;
        this._plants    = [];
        this.lineHeightRatio = 1.6;
    }

    async init(canvas) {
        if (canvas) {
            this._canvas = canvas;
        } else {
            this._canvas = document.createElement('canvas');
            this._canvas.style.cssText =
                'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#f7f4ef;';
            document.body.appendChild(this._canvas);
            this._ownCanvas = true;
        }
        this._ctx = this._canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', this._onResize);
        this._raf = requestAnimationFrame(this._animate);
    }

    // @param sylItems   isSpace 제외 음절 배열
    // @param positions  0~1 uv 위치 배열 (sylItems와 1:1)
    // @param JAMO       자모 데이터
    update(sylItems, positions, JAMO) {
        if (!JAMO || !sylItems?.length) {
            this._plants = [];
            return;
        }
        const W = this._canvas.width;
        const H = this._canvas.height;
        const baseSize = estimateBaseSize(positions, W, H);
        const count    = Math.min(sylItems.length, 20);

        this._plants = [];
        for (let i = 0; i < count; i++) {
            const syl = sylItems[i];
            const pos = positions[i] ?? [0.5, 0.5];
            const params = mapParams(syl, JAMO, baseSize);
            this._plants.push(new DandelionPlant({
                cx: pos[0] * W,
                cy: pos[1] * H,
                ...params,
            }));
        }
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        if (this._ownCanvas && this._canvas?.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }
        this._canvas = null;
        this._ctx    = null;
    }

    _animate = () => {
        this._raf = requestAnimationFrame(this._animate);
        this._render();
    };

    _render() {
        if (!this._ctx) return;
        const ctx  = this._ctx;
        const W    = this._canvas.width;
        const H    = this._canvas.height;
        const now  = performance.now();

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#f7f4ef';
        ctx.fillRect(0, 0, W, H);

        for (const plant of this._plants) {
            plant.tick(now);
            plant.draw(ctx, now);
        }
    }

    _resize() {
        if (!this._canvas) return;
        const dpr = Math.min(window.devicePixelRatio, 2);
        this._canvas.width  = window.innerWidth  * dpr;
        this._canvas.height = window.innerHeight * dpr;
        if (this._ctx) {
            this._ctx.scale(dpr, dpr);
        }
    }

    _onResize = () => { this._resize(); };
}
