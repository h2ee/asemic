// ── signal.js ─────────────────────────────────────────────────────────────────
// 신호등 수신자 — 셀룰러 오토마타 기반 한글 시각화
//
// 구조:
//   - 음절 하나 = 5×5 격자 (lattice)
//   - 음절간 연결: 좌우 1열씩 Moore neighborhood 공유
//   - 띄어쓰기: yeoback (blank 2열 + block 3열)
//   - 줄간격: block 행
//
// 4 state: BLANK(0), CHO(1), JUNG(2), JONG(3), BLOCK(4)
//
// 6가지 시작 패턴 (초성/중성/종성 구조로 결정):
//   vertical    초+중 (중성이 옆에 붙는 모음: diphthong=0, F2≥1100)
//   horizontal  초+중 (중성이 아래 붙는 모음: diphthong=0, F2<1100, ≠ㅡ)
//   per75       초+중 (복합모음: diphthong=1)
//   right_click 초+중+종, vertical 계열
//   hamburger   초+중+종, horizontal 계열
//   bed         초+중+종, per75 계열
// ─────────────────────────────────────────────────────────────────────────────

const BLANK = 0,
    CHO = 1,
    JUNG = 2,
    JONG = 3,
    BLOCK = 4;
const GRID = 5; // 음절당 격자 크기
const YEOBACK_BLANK = 2; // yeoback blank 열 수
const YEOBACK_BLOCK = 3; // yeoback block 열 수
const YEOBACK_W = YEOBACK_BLANK + YEOBACK_BLOCK;

// F2 경계: vertical / horizontal 구분
const F2_BOUNDARY = 1100;

// ── 시작 패턴 정의 (5×5, [row][col]) ─────────────────────────────────────────
// 각 패턴은 state 배열 반환
function makePattern(type) {
    // 5×5 초기화
    const g = Array.from({ length: GRID }, () => Array(GRID).fill(BLANK));

    if (type === 'vertical') {
        // 초성: (0~2행, 1~3열) 9칸
        // blank: (0열, 0~2행), (4열, 0~2행) — 실제로는 그냥 blank 유지
        // jung: 우측 2열 (3~4열) 전체
        for (let r = 0; r < 3; r++) for (let c = 1; c <= 3; c++) g[r][c] = CHO;
        for (let r = 0; r < GRID; r++) for (let c = 3; c < GRID; c++) g[r][c] = JUNG;
        // cho가 jung보다 우선 — 겹치는 곳(r=0~2, c=3) jung으로 덮음은 이미 됨
        // 위 loop 순서상 jung이 나중에 적용되므로 겹치는 셀은 jung
    } else if (type === 'horizontal') {
        // 초성: (1~3행, 0~2열) 9칸
        // blank: (0~2행, 0열), (0~2행, 4열)
        // jung: 아래 2행 (3~4행) 전체
        for (let r = 1; r <= 3; r++) for (let c = 0; c < 3; c++) g[r][c] = CHO;
        for (let r = 3; r < GRID; r++) for (let c = 0; c < GRID; c++) g[r][c] = JUNG;
    } else if (type === 'per75') {
        // 초성: (0~2행, 0~2열) 9칸
        // jung: 나머지
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g[r][c] = CHO;
        for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (g[r][c] !== CHO) g[r][c] = JUNG;
    } else if (type === 'right_click') {
        // 초성: (0~2행, 0~2열) 9칸
        // jong: 아래 2행 (3~4행) 전체
        // jung: 나머지 6칸
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g[r][c] = CHO;
        for (let r = 3; r < GRID; r++) for (let c = 0; c < GRID; c++) g[r][c] = JONG;
        // jung: 우측 나머지 (0~2행, 3~4열)
        for (let r = 0; r < 3; r++) for (let c = 3; c < GRID; c++) g[r][c] = JUNG;
    } else if (type === 'hamburger') {
        // blank: (0~1행,0열),(3~4행,0열),(0~1행,4열),(3~4행,4열) 8칸
        // cho: blank 제외 0~1행
        // jung: 2행 전체 (가운데)  ← 원문 "3행 jung"을 0-index로 해석
        // jong: 3~4행 전체
        for (let r = 0; r <= 1; r++) for (let c = 1; c <= 3; c++) g[r][c] = CHO;
        for (let c = 0; c < GRID; c++) g[2][c] = JUNG;
        for (let r = 3; r < GRID; r++) for (let c = 0; c < GRID; c++) g[r][c] = JONG;
    } else if (type === 'bed') {
        // cho: (0~1행, 0~2열) 6칸
        // jong: 아래 2행 (3~4행)
        // jung: 나머지
        for (let r = 0; r <= 1; r++) for (let c = 0; c < 3; c++) g[r][c] = CHO;
        for (let r = 3; r < GRID; r++) for (let c = 0; c < GRID; c++) g[r][c] = JONG;
        for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (g[r][c] === BLANK) g[r][c] = JUNG;
    } else if (type === 'yeoback') {
        // 0~1열: blank, 2~4열: block
        for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) g[r][c] = c < YEOBACK_BLANK ? BLANK : BLOCK;
    }
    return g;
}

// ── 음절 구조 → 패턴 타입 결정 ───────────────────────────────────────────────
function getPatternType(jung, jong, JAMO) {
    if (!jung) return 'vertical';
    const entry = JAMO[jung];
    const diph = entry?.diphthong ?? 0;
    const f2 = entry?.pos?.[1] ?? 1000;
    const hasJong = !!jong;

    if (!hasJong) {
        if (diph) return 'per75';
        return f2 >= F2_BOUNDARY ? 'vertical' : 'horizontal';
    } else {
        if (diph) return 'bed';
        return f2 >= F2_BOUNDARY ? 'right_click' : 'hamburger';
    }
}

// ── 셀 색상 계산 ──────────────────────────────────────────────────────────────
function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const [r, g, b] = [
        [v, t, p, p, q, v],
        [q, v, v, t, p, p],
        [p, p, q, v, v, t],
    ].map(ch => ch[i % 6]);
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 자모 데이터의 x,y,z → r,g,b 변환 + 상태별 가중치
function cellColor(state, jamoEntry) {
    if (state === BLANK) return [255, 255, 255];
    if (state === BLOCK) return [255, 255, 255];

    const pos = jamoEntry?.pos ?? [0.5, 0.5, 0.5];
    // x,y,z → 0~255 (자음은 0~1, 모음은 Hz → 정규화)
    let r, g, b;
    if (jamoEntry?.type === 'jung') {
        // 모음: Hz 범위 정규화 (F1:250~900, F2:580~2600, F3:2080~3200)
        r = Math.round(((pos[0] - 250) / 650) * 200 + 30);
        g = Math.round(((pos[1] - 580) / 2020) * 200 + 30);
        b = Math.round(((pos[2] - 2080) / 1120) * 200 + 30);
    } else {
        r = Math.round(pos[0] * 200 + 30);
        g = Math.round(pos[1] * 200 + 30);
        b = Math.round(pos[2] * 200 + 30);
    }

    // 상태별 가중치
    if (state === CHO) {
        g = Math.min(255, Math.round(g * 1.5));
    }
    if (state === JUNG) {
        r = Math.min(255, Math.round(r * 1.5));
        g = Math.min(255, Math.round(g * 1.5));
    }
    if (state === JONG) {
        r = Math.min(255, Math.round(r * 1.5));
    }

    return [r, g, b];
}

// ── Lattice 클래스 — 음절 하나의 5×5 격자 ────────────────────────────────────
class Lattice {
    // @param type      패턴 타입
    // @param choEntry  초성 JAMO 엔트리
    // @param jungEntry 중성 JAMO 엔트리
    // @param jongEntry 종성 JAMO 엔트리 (없으면 null)
    constructor(type, choEntry, jungEntry, jongEntry) {
        this.type = type;
        this.choEntry = choEntry;
        this.jungEntry = jungEntry;
        this.jongEntry = jongEntry;
        this.isBlock = type === 'yeoback';

        // state: 5×5
        this.state = makePattern(type);
        // flashing: 5×5, 0=없음, 1=느린 깜박, 2=느림→빠름 반복
        this.flash = Array.from({ length: GRID }, () => Array(GRID).fill(0));
        // flashTimer: flashing 1,2 지속 step 카운터
        this.flashTimer = Array.from({ length: GRID }, () => Array(GRID).fill(0));
        // stepTimer: 5step마다 전이용
        this.stepCount = 0;
        // brightness: 5×5, blank 이웃 조건 충족 시 누적 (규칙 6)
        this.brightness = Array.from({ length: GRID }, () => Array(GRID).fill(1.0));

        // 신호등 랜덤 셀: 음절당 2~3칸, 위치와 색 고정
        const SIGNAL_COLORS = [
            [0xff, 0x31, 0x1e],
            [0x19, 0xf8, 0x00],
            [0xff, 0xf2, 0x00],
        ];
        const count = 2 + Math.floor(Math.random() * 2); // 2 또는 3
        this.signalCells = new Map();
        while (this.signalCells.size < count) {
            const r = Math.floor(Math.random() * GRID);
            const c = Math.floor(Math.random() * GRID);
            const key = r * GRID + c;
            if (!this.signalCells.has(key)) {
                const color = SIGNAL_COLORS[Math.floor(Math.random() * 3)];
                this.signalCells.set(key, color);
            }
        }
        // 나중에 추가할 overlay 레이어 (현재는 미사용)
        // this.overlay = Array.from({ length: GRID + 1 }, () =>
        //     Array(GRID + 1).fill(null)
        // );
        // 각 셀: null 또는 { color, size, shape: 'circle'|'star'|'rect' }
    }

    // 셀 상태에 맞는 JAMO 엔트리 반환
    _jamoEntry(state) {
        if (state === CHO) return this.choEntry;
        if (state === JUNG) return this.jungEntry;
        if (state === JONG) return this.jongEntry ?? this.choEntry;
        return null;
    }

    // RGB 값 배열 반환 (flash 반영)
    getColor(r, c, flashPhase) {
        const st = this.state[r][c];
        if (st === BLOCK) return [255, 255, 255]; // block = 하얀색이지만 영향 안받음
        // 신호등 셀 우선 반환
        if (this.signalCells.has(r * GRID + c)) {
            return this.signalCells.get(r * GRID + c);
        }
        const [rv, gv, bv] = cellColor(st, this._jamoEntry(st));
        const br = Math.min(this.brightness[r][c], 2.5); // 최대 2.5배 밝기
        //const br = Math.min(this.brightness[r][c], 1.5);
        const fv = this.flash[r][c];
        if (fv === 0)
            return [
                Math.min(255, Math.round(rv * br)),
                Math.min(255, Math.round(gv * br)),
                Math.min(255, Math.round(bv * br)),
            ];
        if (fv === 1) {
            const alpha = 0.5 + 0.5 * Math.sin(flashPhase * 2.0);
            return [
                Math.min(255, Math.round(255 + (rv * br - 255) * alpha)),
                Math.min(255, Math.round(255 + (gv * br - 255) * alpha)),
                Math.min(255, Math.round(255 + (bv * br - 255) * alpha)),
            ];
        }
        // flashing 2: 느림↔빠름 반복
        const speed = 1.0 + 3.0 * (0.5 + 0.5 * Math.sin(flashPhase * 0.3));
        const alpha2 = 0.5 + 0.5 * Math.sin(flashPhase * speed);
        return [
            Math.min(255, Math.round(255 + (rv * br - 255) * alpha2)),
            Math.min(255, Math.round(255 + (gv * br - 255) * alpha2)),
            Math.min(255, Math.round(255 + (bv * br - 255) * alpha2)),
        ];
    }
}

// ── Word — 한 단어의 음절 격자 집합 (periodic boundary) ──────────────────────
class Word {
    constructor(lattices) {
        this.lattices = lattices; // Lattice[]
        // 전체 격자를 하나의 넓은 배열로 합침 (rows=5, cols=N*5)
        this.cols = lattices.length * GRID;
    }

    // 전체 state 배열 (5 × cols)
    _getWide() {
        const wide = Array.from({ length: GRID }, () => []);
        for (const lat of this.lattices) for (let r = 0; r < GRID; r++) wide[r].push(...lat.state[r]);
        return wide;
    }

    // periodic boundary: col을 0~cols-1 범위로 wrap
    _wrap(c) {
        return ((c % this.cols) + this.cols) % this.cols;
    }

    // 이웃 state 목록 (Moore, 8방향)
    _neighbors(wide, r, c) {
        const dirs = [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1],
        ];
        return dirs
            .map(([dr, dc]) => {
                const nr = r + dr;
                if (nr < 0 || nr >= GRID) return null;
                return wide[nr][this._wrap(c + dc)];
            })
            .filter(s => s !== null && s !== BLOCK);
    }

    // 방향별 이웃 (E=동, NE, SE, S, SW, SE, N, S, W, NW, SW)
    _neighborDir(wide, r, c, dirs) {
        return dirs
            .map(([dr, dc]) => {
                const nr = r + dr;
                if (nr < 0 || nr >= GRID) return null;
                return wide[nr][this._wrap(c + dc)];
            })
            .filter(s => s !== null && s !== BLOCK);
    }

    step(stepCount) {
        if (this.lattices.length === 0) return;
        const wide = this._getWide();
        const next = Array.from({ length: GRID }, (_, r) => wide[r].map(s => s)); // 복사

        const E_dirs = [
            [0, 1],
            [-1, 1],
            [1, 1],
        ]; // E, NE, SE
        const S_dirs = [
            [1, 0],
            [1, -1],
            [1, 1],
        ]; // S, SW, SE
        const ES_dirs = [
            [0, 1],
            [-1, 1],
            [1, 1],
            [1, 0],
            [1, -1],
            [1, 1],
        ]; // E+S

        for (let r = 0; r < GRID; r++) {
            for (let c = 0; c < this.cols; c++) {
                const st = wide[r][c];
                if (st === BLOCK) continue;

                // 규칙 1 대체: CHO → JUNG (이웃에 JUNG 1개↑이면 확률 전이)
                if (st === CHO) {
                    const nb = this._neighbors(wide, r, c);
                    const jungCount = nb.filter(s => s === JUNG).length;
                    if (jungCount >= 1 && Math.random() < 0.15) {
                        next[r][c] = JUNG;
                        continue;
                    }
                }
                // ── 규칙 2: 삭제
                // ── 규칙 3: cho + 동/남에서 jung 2개↑ → jung
                if (st === CHO) {
                    const nb = this._neighborDir(wide, r, c, ES_dirs);
                    if (nb.filter(s => s === JUNG).length >= 1) {
                        next[r][c] = JUNG;
                        continue;
                    }
                }
                // 규칙 4: JUNG → JONG
                if (st === JUNG) {
                    const nb = this._neighbors(wide, r, c);
                    const jongCount = nb.filter(s => s === JONG).length;
                    if (jongCount >= 1 && Math.random() < 0.15) {
                        next[r][c] = JONG;
                        continue;
                    }
                }
                // 규칙 5: JONG → CHO
                if (st === JONG) {
                    const nb = this._neighbors(wide, r, c);
                    const choCount = nb.filter(s => s === CHO).length;
                    if (choCount >= 1 && Math.random() < 0.15) {
                        next[r][c] = CHO;
                        continue;
                    }
                }
                // ── 규칙 6: blank 이웃 1개↑ → RGB×1.1
                if (st !== BLANK) {
                    const nb = this._neighbors(wide, r, c);
                    if (nb.includes(BLANK)) {
                        // brightness 누적
                        const lat = this.lattices[Math.floor(c / GRID)];
                        const lc = c % GRID;
                        lat.brightness[r][lc] = Math.min(lat.brightness[r][lc] * 1.1, 2.5);
                    }
                }
            }
        }

        // next → lattice state에 다시 분배
        for (let i = 0; i < this.lattices.length; i++) {
            const lat = this.lattices[i];
            for (let r = 0; r < GRID; r++) lat.state[r] = next[r].slice(i * GRID, (i + 1) * GRID);
        }
        // brightness 감쇠 — blank 이웃 없으면 서서히 1.0으로 복귀
        for (const lat of this.lattices) {
            for (let r = 0; r < GRID; r++)
                for (let c = 0; c < GRID; c++) lat.brightness[r][c] += (1.0 - lat.brightness[r][c]) * 0.05;
        }
    }
}

// ── SignalReceiver ─────────────────────────────────────────────────────────────
export class SignalReceiver {
    constructor() {
        this.lineHeightRatio = 1.4;
        this._canvas = null;
        this._ctx = null;
        this._raf = null;
        this._words = []; // Word[][]  — [줄][단어]
        this._yeobacks = []; // 단어 간 yeoback lattice
        this._JAMO = null;
        this._sylItems = [];
        this._positions = [];
        this._sylSize = 80;
        this._cellPx = 0; // 셀 한 칸 픽셀 크기
        this._stepCount = 0;
        this._lastStep = 0;
        this._STEP_INTERVAL = 120; // ms
        this._lastFrame = 0;
        this._FRAME_INTERVAL = 1000 / 24;
        this._flashPhase = 0;
        this._active = false; // 글자 있을 때만 진화
        this._decaying = false; // 입력 후 감쇠 중
    }

    async init(canvas) {
        this._canvas = canvas ?? document.createElement('canvas');
        if (!canvas) {
            Object.assign(this._canvas.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
            });
            document.body.appendChild(this._canvas);
        }
        this._resize();
        this._ctx = this._canvas.getContext('2d');
        window.addEventListener('resize', () => this._resize());
        this._raf = requestAnimationFrame(this._animate);
    }

    // @param sylItems   isSpace 제외 음절 배열
    // @param positions  0~1 uv 위치 배열
    // @param JAMO       자모 데이터
    update(sylItems, positions, JAMO, sylSize) {
        this._JAMO = JAMO;
        this._sylItems = sylItems;
        this._positions = positions;
        this._sylSize = sylSize ?? this._estimateSylSize(positions);
        this._buildLattices(sylItems, positions, JAMO);
        this._active = sylItems.length > 0;
        this._decaying = false;
        this._stepCount = 0;
    }

    dispose() {
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._resize);
        if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    }

    // ── 내부 ──────────────────────────────────────────────────────────────────

    _resize() {
        if (!this._canvas) return;
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
    }

    // positions로부터 sylSize 추정 (px)
    _estimateSylSize(positions) {
        if (positions.length < 2) return 60;
        const dx = Math.abs(positions[1][0] - positions[0][0]) * window.innerWidth;
        return dx > 10 ? dx : 60;
    }

    // 음절 배열 → Word/Lattice 구조 구축
    _buildLattices(sylItems, positions, JAMO) {
        if (!JAMO || sylItems.length === 0) {
            this._rows = [];
            return;
        }
        // 위치로 줄 구분 (y 좌표가 크게 달라지면 새 줄)
        const lines = [];
        let curLine = [],
            prevY = -1;
        for (let i = 0; i < sylItems.length; i++) {
            const py = positions[i][1];
            if (prevY >= 0 && Math.abs(py - prevY) > 0.05) {
                lines.push(curLine);
                curLine = [];
            }
            curLine.push({ syl: sylItems[i], pos: positions[i] });
            prevY = py;
        }
        if (curLine.length > 0) lines.push(curLine);

        // 줄마다 단어별 Word 생성
        this._rows = lines.map(line => {
            // 단어 분리
            const words = [];
            let cur = [];
            for (const item of line) {
                if (cur.length > 0 && item.syl.wordId !== cur[cur.length - 1].syl.wordId) {
                    words.push(cur);
                    cur = [];
                }
                cur.push(item);
            }
            if (cur.length > 0) words.push(cur);

            return words.map(wordItems => {
                const lattices = wordItems.map(({ syl }) => {
                    const jungEntry = JAMO[syl.jung];
                    const choEntry = JAMO[syl.cho]?.cho ?? JAMO[syl.cho];
                    const jongEntry = syl.jong ? (JAMO[syl.jong + '_jong'] ?? JAMO[syl.jong]) : null;
                    const type = getPatternType(syl.jung, syl.jong, JAMO);
                    return new Lattice(type, choEntry, jungEntry, jongEntry);
                });
                return new Word(lattices);
            });
        });
    }

    // 셀 한 칸의 픽셀 크기 (sylSize / GRID)
    _cellPxFromSylSize() {
        return Math.max(4, Math.round(this._sylSize / GRID));
    }

    _animate = timestamp => {
        this._raf = requestAnimationFrame(this._animate);
        if (timestamp - this._lastFrame < this._FRAME_INTERVAL) return;
        this._lastFrame = timestamp;
        this._flashPhase += 0.08;

        // step 진행
        if (this._active && timestamp - this._lastStep >= this._STEP_INTERVAL) {
            this._lastStep = timestamp;
            this._stepCount++;
            for (const row of this._rows ?? []) for (const word of row) word.step(this._stepCount);
        }

        this._draw();
    };

    _draw() {
        if (!this._ctx || !this._rows) return;
        const ctx = this._ctx;
        const W = this._canvas.width;
        const H = this._canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        const cp = this._cellPxFromSylSize();
        const sylW = cp * GRID;

        // 줄 높이: sylSize * lineHeightRatio
        const lineH = sylW * this.lineHeightRatio;

        // 좌상단 여백
        const PAD_X = sylW * 0.5;
        const PAD_Y = 40;

        for (let li = 0; li < (this._rows?.length ?? 0); li++) {
            const row = this._rows[li];
            const baseY = PAD_Y + sylW + li * lineH; // baseline
            let curX = PAD_X;

            for (let wi = 0; wi < row.length; wi++) {
                const word = row[wi];

                for (let si = 0; si < word.lattices.length; si++) {
                    const lat = word.lattices[si];
                    const ox = curX;
                    const oy = baseY - sylW; // 셀 상단 = baseline - sylW

                    for (let r = 0; r < GRID; r++) {
                        for (let c = 0; c < GRID; c++) {
                            const st = lat.state[r][c];
                            if (st === BLOCK) {
                                ctx.fillStyle = '#ffffff';
                            } else {
                                const [rv, gv, bv] = lat.getColor(r, c, this._flashPhase);
                                ctx.fillStyle = `rgb(${rv},${gv},${bv})`;
                            }
                            ctx.fillRect(
                                ox + c * cp,
                                oy + r * cp,
                                cp - 1,
                                cp - 1, // -1 = 셀 간격 (LED 픽셀 느낌)
                            );
                        }
                    }
                    // 나중에 추가
                    // for (let r = 0; r <= GRID; r++)
                    //     for (let c = 0; c <= GRID; c++)
                    //         if (lat.overlay[r][c]) drawShape(ctx, ox + c*cp, oy + r*cp, lat.overlay[r][c]);
                    curX += sylW;
                }

                // 단어 사이 yeoback
                if (wi < row.length - 1) {
                    // blank 2열
                    curX += cp * YEOBACK_BLANK;
                    // block 3열 (검정)
                    const oy = baseY - sylW;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(curX, oy, cp * YEOBACK_BLOCK, sylW);
                    curX += cp * YEOBACK_BLOCK;
                }
            }
        }
    }
}
