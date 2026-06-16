// ── dandelion.js ──────────────────────────────────────────────────────────────
// 민들레 수신자 — 5개 고정 식물 + 단어별 active 순환
//
// 동작:
//   - 화면에 항상 민들레 5개 고정 (위치 고정, 바람 흔들림 상시)
//   - 음절 입력마다 active 식물의 파라미터 갱신 (부드럽게 전환)
//   - 띄어쓰기 → active 식물 freeze, 다음 식물(1→2→3→4→5→1→...)로 이동
//   - 종성 없음 → 노란 꽃 / 종성 있음 → 흰 홀씨구
//
// 파라미터 매핑 (active 식물이 받는 음절의 자모):
//   초성 x (조음위치)  → 잎 펼침 폭, 꽃 색조
//   초성 y (조음방법)  → 잎 톱니 깊이
//   모음 F1            → 줄기 높이
//   모음 F2            → 꽃머리 크기
//   종성 유무          → 꽃 ↔ 홀씨 전환
//   종성 z (긴장도)    → 홀씨 밀도
//   종성 x (조음위치)  → 홀씨 날아가는 방향
// ─────────────────────────────────────────────────────────────────────────────

const F1_MIN = 250,
    F1_MAX = 900;
const F2_MIN = 580,
    F2_MAX = 2600;
const MORPH_DUR = 550; // ms: 파라미터 전환 시간
const WIND_SPEED = 0.0007; // 바람 속도 (rad/ms)

// 5개 식물의 고정 슬롯 (화면 비율 기준)
const PLANT_SLOTS = [
    { xf: 0.12, yf: 0.88, windPhase: 0.0, hMult: 0.85 },
    { xf: 0.3, yf: 0.9, windPhase: 1.3, hMult: 1.0 },
    { xf: 0.5, yf: 0.87, windPhase: 2.5, hMult: 0.95 },
    { xf: 0.68, yf: 0.91, windPhase: 3.7, hMult: 1.1 },
    { xf: 0.84, yf: 0.88, windPhase: 0.9, hMult: 0.9 },
];

// ── 잎 ────────────────────────────────────────────────────────────────────────
function buildLeaf(angle, length, serration) {
    const segs = [];
    const spineN = 5;
    const toothA = ((22 + serration * 22) * Math.PI) / 180;
    const toothL = length * 0.16 * (0.3 + serration * 0.7);
    const segLen = length / spineN;
    let x = 0,
        y = 0;
    const dx = Math.cos(angle) * segLen;
    const dy = Math.sin(angle) * segLen;
    for (let i = 0; i < spineN; i++) {
        const nx = x + dx,
            ny = y + dy;
        segs.push({ x1: x, y1: y, x2: nx, y2: ny, tooth: false });
        if (i > 0 && i < spineN - 1) {
            const perpA = angle + Math.PI / 2;
            segs.push({
                x1: nx,
                y1: ny,
                x2: nx + Math.cos(perpA + toothA) * toothL,
                y2: ny + Math.sin(perpA + toothA) * toothL,
                tooth: true,
            });
            segs.push({
                x1: nx,
                y1: ny,
                x2: nx + Math.cos(perpA - toothA) * toothL,
                y2: ny + Math.sin(perpA - toothA) * toothL,
                tooth: true,
            });
        }
        x = nx;
        y = ny;
    }
    return segs;
}

function buildLeavesForParams(params) {
    const { leafSpread, serration, leafCount, stemHeight } = params;
    const leafLen = stemHeight * 0.55;
    const leaves = [];
    for (let i = 0; i < leafCount; i++) {
        const angle = (i / leafCount) * Math.PI * 2;
        const len = leafLen * (0.65 + 0.35 * Math.sin(i * 1.7 + 0.5));
        leaves.push(buildLeaf(angle, len * (0.5 + leafSpread * 0.5), serration));
    }
    return leaves;
}

// ── 꽃 오프스크린 렌더 ────────────────────────────────────────────────────────
// p5 flower math 포팅. 매 updateParams 시 한 번만 렌더 → blit 방식
// r/theta step 조절로 밀도↔성능 트레이드오프
function renderFlowerOffscreen(radius, hue) {
    const sz = Math.ceil(radius * 3.8);
    const W = sz * 2,
        H = sz * 2;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d');
    const cx = sz,
        cy = sz;

    const rotX = (-50 * Math.PI) / 180;
    const cosR = Math.cos(rotX),
        sinR = Math.sin(rotX);

    for (let r = 0; r <= 1; r += 0.04) {
        for (let td = -540; td <= 2700; td += 5) {
            const tr = (td * Math.PI) / 180;
            const phi = 90 * Math.exp(-td / (8 * 180));
            const phiR = (phi * Math.PI) / 180;
            const pc = 1 - 0.5 * Math.pow(1.25 * Math.pow(1 - ((7.6 * td) % 360) / 360, 2) - 0.25, 2);
            const hd = 2 * r * r * Math.pow(0.9 * r - 1, 2) * Math.sin(phiR);
            const inn = r * Math.sin(phiR) + hd * Math.cos(phiR);
            if (pc * inn <= 0) continue;

            const px = radius * pc * inn * Math.sin(tr);
            const py = -radius * pc * (r * Math.cos(phiR) - hd * Math.sin(phiR)) * 0.7;
            const pz = radius * pc * inn * Math.cos(tr);
            const py2 = py * cosR - pz * sinR;

            const s = -r * 50 + 100;
            const b = r * 50 + 50;
            const l = b * (1 - s / 200);
            const sl = Math.min(100, (b * s) / (100 - Math.abs(2 * l - 100) + 0.001));
            ctx.fillStyle = `hsl(${hue},${Math.round(sl)}%,${Math.round(l)}%)`;
            ctx.fillRect(cx + px - 1, cy + py2 - 1, 2, 2);
        }
    }
    return { canvas: off, sz };
}

// ── 홀씨 포인트 계산 ──────────────────────────────────────────────────────────
function buildSeeds(radius, count) {
    const PHI = Math.PI * (3 - Math.sqrt(5));
    const rotX = (-40 * Math.PI) / 180;
    const cosR = Math.cos(rotX),
        sinR = Math.sin(rotX);
    const seeds = [];
    for (let i = 0; i < count; i++) {
        const t = i / Math.max(count - 1, 1);
        const inc = Math.acos(1 - t * 1.1);
        const az = i * PHI;
        const sinI = Math.sin(inc),
            cosI = Math.cos(inc);
        const px3 = radius * sinI * Math.cos(az);
        const py3 = -radius * cosI;
        const pz3 = radius * sinI * Math.sin(az);
        const px2 = px3;
        const py2 = py3 * cosR - pz3 * sinR;
        const d = Math.sqrt(px2 * px2 + py2 * py2);
        seeds.push({ x: px2, y: py2, sdx: d > 0 ? px2 / d : 0, sdy: d > 0 ? py2 / d : -1 });
    }
    return seeds;
}

// ── DandelionPlant ────────────────────────────────────────────────────────────
const DEFAULT_PARAMS = {
    stemHeight: 210,
    flowerRadius: 128,
    hue: 52,
    hasJong: false,
    jongZ: 0.33,
    jongX: 0.5,
    leafSpread: 0.5,
    serration: 0.3,
    leafCount: 5,
};

class DandelionPlant {
    constructor(cx, cy, windPhase, heightMult) {
        this.cx = cx;
        this.cy = cy;
        this.windPhase = windPhase;
        this.heightMult = heightMult;
        this.isActive = false;

        this._params = { ...DEFAULT_PARAMS, stemHeight: DEFAULT_PARAMS.stemHeight * heightMult };
        this._leaves = buildLeavesForParams(this._params);
        this._cache = null;
        this._prevCache = null;
        this._seeds = null;
        this._morphT = 1;
        this._morphStartMs = 0;

        this._buildCache();
    }

    updateParams(p, nowMs) {
        this._prevCache = this._cache;
        this._params = { ...p, stemHeight: p.stemHeight * this.heightMult };
        this._leaves = buildLeavesForParams(this._params);
        this._buildCache();
        this._morphT = 0;
        this._morphStartMs = nowMs;
    }

    _buildCache() {
        if (!this._params.hasJong) {
            this._cache = renderFlowerOffscreen(this._params.flowerRadius, this._params.hue);
            this._seeds = null;
        } else {
            this._cache = null;
            this._seeds = buildSeeds(this._params.flowerRadius, Math.round(20 + this._params.jongZ * 30));
        }
    }

    draw(ctx, nowMs) {
        if (this._morphT < 1) {
            const raw = (nowMs - this._morphStartMs) / MORPH_DUR;
            const t = Math.max(0, Math.min(1, raw));
            this._morphT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        const windAmp = this.isActive ? 0.055 : 0.028;
        const sway = Math.sin(nowMs * WIND_SPEED + this.windPhase) * windAmp;
        const { stemHeight } = this._params;

        // 잎 — 흔들림 작게
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(sway * 0.35);
        this._drawLeaves(ctx);
        ctx.restore();

        // 줄기 + 꽃머리
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(sway);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -stemHeight);
        ctx.strokeStyle = `rgba(80,125,60,${this.isActive ? 1 : 0.82})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.translate(0, -stemHeight);
        if (!this._params.hasJong) {
            this._drawFlower(ctx);
        } else {
            this._drawSeedHead(ctx);
        }

        ctx.restore();

        // active 식물 아래 점 표시
        if (this.isActive) {
            ctx.beginPath();
            ctx.arc(this.cx, this.cy + 9, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(255, 61, 61)';
            ctx.fill();
        }
    }

    _drawLeaves(ctx) {
        ctx.lineCap = 'round';
        for (const leaf of this._leaves) {
            for (const seg of leaf) {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.strokeStyle = seg.tooth ? 'rgba(68,108,48,0.70)' : 'rgba(78,122,58,0.90)';
                ctx.lineWidth = seg.tooth ? 0.8 : 1.5;
                ctx.stroke();
            }
        }
    }

    _drawFlower(ctx) {
        if (!this._cache) {
            ctx.beginPath();
            ctx.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${this._params.hue - 10},58%,32%)`;
            ctx.fill();
            return;
        }
        const { canvas, sz } = this._cache;
        if (this._morphT < 1 && this._prevCache?.canvas) {
            const { canvas: pc, sz: psz } = this._prevCache;
            ctx.globalAlpha = 1 - this._morphT;
            ctx.drawImage(pc, -psz, -psz);
            ctx.globalAlpha = this._morphT;
        }
        ctx.drawImage(canvas, -sz, -sz);
        ctx.globalAlpha = 1;
    }

    _drawSeedHead(ctx) {
        if (!this._seeds) return;
        const { flowerRadius } = this._params;

        if (this._morphT < 1 && this._prevCache?.canvas) {
            const { canvas: pc, sz: psz } = this._prevCache;
            ctx.globalAlpha = 1 - this._morphT;
            ctx.drawImage(pc, -psz, -psz);
            ctx.globalAlpha = 1;
        }

        const a = this._morphT;
        const stalkLen = flowerRadius * 0.28;

        for (const { x, y, sdx, sdy } of this._seeds) {
            ctx.strokeStyle = `rgba(200,196,175,${(a * 0.52).toFixed(2)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x - sdx * stalkLen * 0.6, y - sdy * stalkLen * 0.6);
            ctx.lineTo(x, y);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(226,223,208,${a.toFixed(2)})`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, flowerRadius * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(172,167,145,${(a * 0.7).toFixed(2)})`;
        ctx.fill();
    }
}

// ── 자모 → 파라미터 ───────────────────────────────────────────────────────────
function mapParams(syl, JAMO, baseSize) {
    const choEntry = JAMO[syl.cho]?.cho ?? JAMO[syl.cho];
    const jungEntry = JAMO[syl.jung];
    const jongEntry = syl.jong ? (JAMO[syl.jong]?.jong ?? JAMO[syl.jong]) : null;

    const choX = choEntry?.pos?.[0] ?? 0.5;
    const choY = choEntry?.pos?.[1] ?? 0.0;
    const f1 = jungEntry?.pos?.[0] ?? 500;
    const f2 = jungEntry?.pos?.[1] ?? 1200;
    const f1N = Math.max(0, Math.min(1, (f1 - F1_MIN) / (F1_MAX - F1_MIN)));
    const f2N = Math.max(0, Math.min(1, (f2 - F2_MIN) / (F2_MAX - F2_MIN)));

    return {
        stemHeight: baseSize * (0.45 + f1N * 0.45),
        flowerRadius: baseSize * (0.13 + (1 - f2N) * 1.0),
        leafSpread: 0.35 + choX * 0.65,
        serration: choY,
        leafCount: 4 + Math.round(choX * 2),
        hue: 45 + choX * 18,
        hasJong: !!syl.jong,
        jongZ: jongEntry?.pos?.[2] ?? 0.33,
        jongX: jongEntry?.pos?.[0] ?? 0.5,
    };
}

// ── DandelionReceiver ─────────────────────────────────────────────────────────
export class DandelionReceiver {
    constructor() {
        this._canvas = null;
        this._ctx = null;
        this._ownCanvas = false;
        this._raf = null;
        this._plants = [];
        this._activeIdx = 0;
        this._prevCompletedCount = 0;
        this._baseSize = 120;
        this.lineHeightRatio = 1.8;
        this.sylSize = 130;
    }

    async init(canvas) {
        if (canvas) {
            this._canvas = canvas;
        } else {
            this._canvas = document.createElement('canvas');
            this._canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#ffffff;';
            document.body.appendChild(this._canvas);
            this._ownCanvas = true;
        }
        this._ctx = this._canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', this._onResize);
        this._initPlants();
        this._raf = requestAnimationFrame(this._animate);
    }

    _initPlants() {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const W = this._canvas.width / dpr;
        const H = this._canvas.height / dpr;
        this._baseSize = Math.min(W * 0.13, H * 0.2, 150);

        this._plants = PLANT_SLOTS.map(
            slot => new DandelionPlant(slot.xf * W, slot.yf * H, slot.windPhase, slot.heightMult),
        );
        this._plants[this._activeIdx].isActive = true;
    }

    // sylItems : { cho, jung, jong, wordId } 배열 (공백 제외)
    // positions: main.js 레이아웃 결과 — 이 receiver에서는 무시
    // JAMO     : 자모 데이터
    update(sylItems, positions, JAMO) {
        if (!JAMO) return;

        if (!sylItems?.length) {
            this._activeIdx = 0;
            this._prevCompletedCount = 0;
            this._plants.forEach((p, i) => {
                p.isActive = i === 0;
            });
            return;
        }

        const wordIds = [...new Set(sylItems.map(s => s.wordId))].sort((a, b) => a - b);
        const completedCount = wordIds.length - 1; // 공백 수

        if (completedCount !== this._prevCompletedCount) {
            this._prevCompletedCount = completedCount;
            const newIdx = completedCount % 5;
            if (newIdx !== this._activeIdx) {
                this._plants[this._activeIdx].isActive = false;
                this._activeIdx = newIdx;
                this._plants[this._activeIdx].isActive = true;
            }
        }

        const curWordId = wordIds[wordIds.length - 1];
        const curWordSyls = sylItems.filter(s => s.wordId === curWordId);
        const lastSyl = curWordSyls[curWordSyls.length - 1];
        if (lastSyl) {
            const params = mapParams(lastSyl, JAMO, this._baseSize);
            this._plants[this._activeIdx].updateParams(params, performance.now());
        }
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        if (this._ownCanvas && this._canvas?.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }
        this._canvas = null;
        this._ctx = null;
    }

    _animate = () => {
        this._raf = requestAnimationFrame(this._animate);
        this._render();
    };

    _render() {
        if (!this._ctx) return;
        const ctx = this._ctx;
        const dpr = Math.min(window.devicePixelRatio, 2);
        const W = this._canvas.width / dpr;
        const H = this._canvas.height / dpr;
        const now = performance.now();

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        for (const plant of this._plants) {
            plant.draw(ctx, now);
        }
    }

    _resize() {
        if (!this._canvas) return;
        const dpr = Math.min(window.devicePixelRatio, 2);
        this._canvas.width = window.innerWidth * dpr;
        this._canvas.height = window.innerHeight * dpr;
        if (this._ctx) this._ctx.scale(dpr, dpr);
        if (this._plants.length) this._initPlants();
    }

    _onResize = () => {
        this._resize();
    };
}
