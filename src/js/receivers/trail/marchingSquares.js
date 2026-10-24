// marchingSquares.js — 단어 윤곽선
//
// 밀도장(goo와 같은 커널)을 CPU에서 성긴 격자로 다시 계산하고, marching squares 로
// 등고선을 뽑아 **폴리라인**으로 만든다. 셰이더로 `abs(f-th) < w` 를 칠하면 같은 그림이
// 나오지만 그건 픽셀 효과라서 점선·두께 변화·벡터 내보내기가 안 된다. 여기선 경로가
// 필요하므로 CPU 로 계산하고 2D 잉크 레이어가 잉크처럼 긋는다.
//
// 단어당 5~10ms. 자라는 획은 `outline.live.interval` 마다 다시 돌린다(trailgl.js) — 매 프레임은 무겁다.
// 같은 밀도장으로 `wordCells` 가 윤곽선 뒤에 깔 픽셀 블록(halo)도 뽑는다.
//
// 윤곽선용 reach 는 goo 의 reach 와 따로 둔다 — 크게 잡을수록 이웃 획들의 장이 합쳐져
// 획 하나하나가 아니라 **단어 전체를 감싸는** 외곽선이 된다.

const KERNEL_NORM = 1.55; // stamp.vert 의 값과 동일해야 th 의 의미가 같다

function distToSeg(px, py, ax, ay, bx, by) {
    const pax = px - ax,
        pay = py - ay,
        bax = bx - ax,
        bay = by - ay;
    const bb = bax * bax + bay * bay;
    const h = bb > 1e-9 ? Math.max(0, Math.min(1, (pax * bax + pay * bay) / bb)) : 0;
    const dx = pax - bax * h,
        dy = pay - bay * h;
    return Math.sqrt(dx * dx + dy * dy);
}

// GPU 쪽 capComp(composite.frag)와 같은 식 — 동반 곡선 밀도의 soft cap
function capComp(c, cap) {
    if (!(cap > 0)) return c;
    const r = c / cap;
    return c / Math.pow(1 + r * r * r * r, 0.25);
}

// 밀도 샘플러 — GPU 커널과 같은 식: q³ · (KERNEL_NORM · segLen / reach). (x0,y0)-(x1,y1) = reach 패딩된 bbox
// 원(disc): seg 에 r 을 주면(ax=bx, ay=by) 반지름 r 안은 w, 밖은 reach 에 걸쳐 q³·w 로 떨어진다 — orb 가 윤곽을 부풀린다
function makeDensity(segs, reach, compCap, x0, y0, x1, y1) {
    // 공간 해시 — 버킷 크기 = reach. 세그먼트를 자기 reach 패딩 bbox 가 닿는 버킷에 전부 등록하면,
    // 어떤 점이든 자기 버킷만 보면 reach 안의 세그먼트를 빠짐없이 찾는다.
    const bw = Math.max(1, Math.ceil((x1 - x0) / reach));
    const bh = Math.max(1, Math.ceil((y1 - y0) / reach));
    const buckets = Array.from({ length: bw * bh }, () => []);
    const bi = (gx, gy) => gy * bw + gx;
    for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const pad = reach + (s.r ?? 0);
        const gx0 = Math.max(0, Math.floor((Math.min(s.ax, s.bx) - pad - x0) / reach));
        const gx1 = Math.min(bw - 1, Math.floor((Math.max(s.ax, s.bx) + pad - x0) / reach));
        const gy0 = Math.max(0, Math.floor((Math.min(s.ay, s.by) - pad - y0) / reach));
        const gy1 = Math.min(bh - 1, Math.floor((Math.max(s.ay, s.by) + pad - y0) / reach));
        for (let gy = gy0; gy <= gy1; gy++)
            for (let gx = gx0; gx <= gx1; gx++) buckets[bi(gx, gy)].push(i);
    }
    return (px, py) => {
        const gx = Math.max(0, Math.min(bw - 1, Math.floor((px - x0) / reach)));
        const gy = Math.max(0, Math.min(bh - 1, Math.floor((py - y0) / reach)));
        let sum = 0,
            comp = 0;
        for (const si of buckets[bi(gx, gy)]) {
            const s = segs[si];
            let d = distToSeg(px, py, s.ax, s.ay, s.bx, s.by);
            if (s.r) {
                d = Math.max(0, d - s.r);
                if (d >= reach) continue;
                const q = 1 - d / reach;
                sum += q * q * q * s.w;
                continue;
            }
            if (d >= reach) continue;
            const q = 1 - d / reach;
            const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
            const k = q * q * q * ((KERNEL_NORM * len) / reach);
            if (s.c && compCap > 0) comp += k;
            else sum += k;
        }
        return sum + capComp(comp, compCap);
    };
}

function segBounds(segs, pad) {
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (const s of segs) {
        const r = s.r ?? 0;
        x0 = Math.min(x0, s.ax - r, s.bx - r);
        x1 = Math.max(x1, s.ax + r, s.bx + r);
        y0 = Math.min(y0, s.ay - r, s.by - r);
        y1 = Math.max(y1, s.ay + r, s.by + r);
    }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

// 픽셀 블록 — 같은 밀도장을 **화면 고정 격자**(원점 ox, oy · 간격 cell)의 칸 중심에서 재서 th 를 넘는 칸을 돌려준다.
// 윤곽선 뒤에 까는 회색 네모들. 격자가 단어마다가 아니라 화면에 고정이라 이웃 단어의 블록이 같은 칸에 맞물린다.
// 반환: Int32Array [gx0, gy0, gx1, gy1, …] (칸 번호. 칸 = ox + gx·cell ~ +cell)
export function wordCells(segs, { reach = 28, th = 0.5, cell = 10, compCap = 0, ox = 0, oy = 0 } = {}) {
    if (!segs || segs.length === 0) return new Int32Array(0);
    const [x0, y0, x1, y1] = segBounds(segs, reach);
    const density = makeDensity(segs, reach, compCap, x0, y0, x1, y1);
    const gx0 = Math.floor((x0 - ox) / cell),
        gx1 = Math.floor((x1 - ox) / cell),
        gy0 = Math.floor((y0 - oy) / cell),
        gy1 = Math.floor((y1 - oy) / cell);
    if ((gx1 - gx0 + 1) * (gy1 - gy0 + 1) > 4e6) return new Int32Array(0);
    const out = [];
    for (let gy = gy0; gy <= gy1; gy++)
        for (let gx = gx0; gx <= gx1; gx++)
            if (density(ox + (gx + 0.5) * cell, oy + (gy + 0.5) * cell) > th) out.push(gx, gy);
    return new Int32Array(out);
}

// segs: [{ax, ay, bx, by, c?, r?, w?}] — 밀도장에 스탬프된 것과 같은 세그먼트들. c = 동반 곡선, r/w = 원(makeDensity)
// compCap: goo.compCap 과 같은 값을 넘기면 동반 곡선 밀도를 같은 식으로 눌러서 더한다
export function wordOutline(segs, { reach = 28, th = 0.5, cell = 4, compCap = 0 } = {}) {
    const grid = densityGrid(segs, { reach, cell, compCap });
    return grid ? contourGrid(grid, th) : [];
}

// 밀도장 샘플러만 — (x, y) → 밀도. 매 프레임 몇 칸만 다시 잴 때(움직이는 부채 아래 halo 칸)
export function densitySampler(segs, { reach = 28, compCap = 0 } = {}) {
    if (!segs || segs.length === 0) return () => 0;
    const [x0, y0, x1, y1] = segBounds(segs, reach);
    return makeDensity(segs, reach, compCap, x0, y0, x1, y1);
}

// 밀도 격자 — 비싼 샘플링을 한 번만 해 두고, 움직이는 것(부채)은 addCapsules 로 사본에 더해 contourGrid 로 다시 뽑는다.
// extra: [x0, y0, x1, y1] — 세그먼트 밖이라도 격자가 덮어야 하는 영역(부채가 펼쳐질 자리)
export function densityGrid(segs, { reach = 28, cell = 4, compCap = 0, extra = null } = {}) {
    if (!segs || segs.length === 0) return null;
    let [x0, y0, x1, y1] = segBounds(segs, reach);
    if (extra) {
        x0 = Math.min(x0, extra[0]);
        y0 = Math.min(y0, extra[1]);
        x1 = Math.max(x1, extra[2]);
        y1 = Math.max(y1, extra[3]);
    }
    const nx = Math.ceil((x1 - x0) / cell) + 1;
    const ny = Math.ceil((y1 - y0) / cell) + 1;
    if (nx < 2 || ny < 2 || nx * ny > 4e6) return null;

    const f = new Float32Array(nx * ny);
    const density = makeDensity(segs, reach, compCap, x0, y0, x1, y1);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = density(x0 + i * cell, y0 + j * cell);
    return { f, x0, y0, nx, ny, cell, reach };
}

// 캡슐 [{ax, ay, bx, by, r, w, reach?}] 의 밀도 — 캡슐 가장자리(중심선에서 r)부터 reach 에 걸쳐 q³·w 로 떨어진다.
// 캡슐마다 reach 를 따로 주면 그걸 쓴다 — 짧게 주면 등고선이 캡슐 모양에 바싹 붙는다(이웃 캡슐 꼬리끼리 안 뭉친다)
export function capsuleDensity(caps, reach, px, py) {
    let sum = 0;
    for (const c of caps) {
        const R = c.reach ?? reach;
        const d = Math.max(0, distToSeg(px, py, c.ax, c.ay, c.bx, c.by) - c.r);
        if (d >= R) continue;
        const q = 1 - d / R;
        sum += q * q * q * c.w;
    }
    return sum;
}

// 격자 사본에 캡슐을 더한다 (캡슐 bbox 안 칸만)
export function addCapsules(grid, caps) {
    const { f, x0, y0, nx, ny, cell, reach } = grid;
    const out = f.slice();
    if (!caps.length) return { ...grid, f: out };
    let bx0 = Infinity,
        by0 = Infinity,
        bx1 = -Infinity,
        by1 = -Infinity;
    for (const c of caps) {
        const pad = (c.reach ?? reach) + c.r;
        bx0 = Math.min(bx0, c.ax - pad, c.bx - pad);
        by0 = Math.min(by0, c.ay - pad, c.by - pad);
        bx1 = Math.max(bx1, c.ax + pad, c.bx + pad);
        by1 = Math.max(by1, c.ay + pad, c.by + pad);
    }
    const i0 = Math.max(0, Math.floor((bx0 - x0) / cell)),
        i1 = Math.min(nx - 1, Math.ceil((bx1 - x0) / cell)),
        j0 = Math.max(0, Math.floor((by0 - y0) / cell)),
        j1 = Math.min(ny - 1, Math.ceil((by1 - y0) / cell));
    for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) out[j * nx + i] += capsuleDensity(caps, reach, x0 + i * cell, y0 + j * cell);
    return { ...grid, f: out };
}

// 격자 → 등고선 폴리라인
export function contourGrid({ f, x0, y0, nx, ny, cell }, th) {
    // ── marching squares. 셀마다 4 꼭짓점의 th 초과 여부로 16 케이스.
    // 모서리 교점은 선형보간(정확한 등고선 위치), 애매한 케이스(5/10)는 중앙값으로 푼다.
    const at = (i, j) => f[j * nx + i];
    const lerpX = (i, j, i2) => {
        const a = at(i, j),
            b = at(i2, j);
        const t = Math.abs(b - a) < 1e-9 ? 0.5 : (th - a) / (b - a);
        return { x: x0 + (i + (i2 - i) * t) * cell, y: y0 + j * cell };
    };
    const lerpY = (i, j, j2) => {
        const a = at(i, j),
            b = at(i, j2);
        const t = Math.abs(b - a) < 1e-9 ? 0.5 : (th - a) / (b - a);
        return { x: x0 + i * cell, y: y0 + (j + (j2 - j) * t) * cell };
    };

    const out = []; // [{a, b}] 조각들
    for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
            const tl = at(i, j) > th,
                tr = at(i + 1, j) > th,
                br = at(i + 1, j + 1) > th,
                bl = at(i, j + 1) > th;
            let code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
            if (code === 0 || code === 15) continue;

            const T = () => lerpX(i, j, i + 1); // 위 모서리
            const B = () => lerpX(i, j + 1, i + 1); // 아래 모서리
            const Lf = () => lerpY(i, j, j + 1); // 왼 모서리
            const R = () => lerpY(i + 1, j, j + 1); // 오른 모서리

            if (code === 5 || code === 10) {
                // 안장점 — 중앙 평균으로 어느 쪽으로 이을지 정한다
                const c = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) * 0.25;
                const flip = c > th;
                if ((code === 5) === flip) {
                    out.push({ a: Lf(), b: T() }, { a: B(), b: R() });
                } else {
                    out.push({ a: Lf(), b: B() }, { a: T(), b: R() });
                }
                continue;
            }
            switch (code) {
                case 1: case 14: out.push({ a: Lf(), b: B() }); break;
                case 2: case 13: out.push({ a: B(), b: R() }); break;
                case 3: case 12: out.push({ a: Lf(), b: R() }); break;
                case 4: case 11: out.push({ a: T(), b: R() }); break;
                case 6: case 9:  out.push({ a: T(), b: B() }); break;
                case 7: case 8:  out.push({ a: Lf(), b: T() }); break;
            }
        }
    }

    return stitch(out, cell * 0.5);
}

// 흩어진 조각들을 폴리라인으로 잇는다 (점선을 긋거나 벡터로 내보내려면 경로여야 한다)
function stitch(pieces, tol) {
    const key = p => `${Math.round(p.x / tol)},${Math.round(p.y / tol)}`;
    const ends = new Map();
    const add = (k, idx) => {
        if (!ends.has(k)) ends.set(k, []);
        ends.get(k).push(idx);
    };
    pieces.forEach((s, i) => {
        add(key(s.a), i);
        add(key(s.b), i);
    });

    const used = new Uint8Array(pieces.length);
    const polys = [];
    for (let i = 0; i < pieces.length; i++) {
        if (used[i]) continue;
        used[i] = 1;
        const poly = [pieces[i].a, pieces[i].b];
        // 양쪽 끝으로 계속 붙인다
        for (let dir = 0; dir < 2; dir++) {
            for (;;) {
                const tip = dir === 0 ? poly[poly.length - 1] : poly[0];
                const cand = (ends.get(key(tip)) || []).find(j => !used[j]);
                if (cand === undefined) break;
                used[cand] = 1;
                const s = pieces[cand];
                const near = Math.hypot(s.a.x - tip.x, s.a.y - tip.y) <= Math.hypot(s.b.x - tip.x, s.b.y - tip.y);
                const next = near ? s.b : s.a;
                if (dir === 0) poly.push(next);
                else poly.unshift(next);
            }
        }
        if (poly.length >= 3) polys.push(poly);
    }
    return polys;
}
