// marchingSquares.js — 단어 윤곽선
//
// 밀도장(goo와 같은 커널)을 CPU에서 성긴 격자로 다시 계산하고, marching squares 로
// 등고선을 뽑아 **폴리라인**으로 만든다. 셰이더로 `abs(f-th) < w` 를 칠하면 같은 그림이
// 나오지만 그건 픽셀 효과라서 점선·두께 변화·벡터 내보내기가 안 된다. 여기선 경로가
// 필요하므로 CPU 로 계산하고 2D 잉크 레이어가 잉크처럼 긋는다.
//
// **획을 구울 때 한 번만** 돌린다 (단어당 5~10ms). 매 프레임 돌릴 물건이 아니다.
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

// segs: [{ax, ay, bx, by}] — 밀도장에 스탬프된 것과 같은 세그먼트들
export function wordOutline(segs, { reach = 28, th = 0.5, cell = 4 } = {}) {
    if (!segs || segs.length === 0) return [];

    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (const s of segs) {
        x0 = Math.min(x0, s.ax, s.bx);
        x1 = Math.max(x1, s.ax, s.bx);
        y0 = Math.min(y0, s.ay, s.by);
        y1 = Math.max(y1, s.ay, s.by);
    }
    x0 -= reach;
    y0 -= reach;
    x1 += reach;
    y1 += reach;

    const nx = Math.ceil((x1 - x0) / cell) + 1;
    const ny = Math.ceil((y1 - y0) / cell) + 1;
    if (nx < 2 || ny < 2 || nx * ny > 4e6) return [];

    // 공간 해시 — 버킷 크기 = reach. 세그먼트를 자기 reach 패딩 bbox 가 닿는 버킷에 전부 등록하면,
    // 어떤 점이든 자기 버킷만 보면 reach 안의 세그먼트를 빠짐없이 찾는다.
    const bw = Math.max(1, Math.ceil((x1 - x0) / reach));
    const bh = Math.max(1, Math.ceil((y1 - y0) / reach));
    const buckets = Array.from({ length: bw * bh }, () => []);
    const bi = (gx, gy) => gy * bw + gx;
    for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const gx0 = Math.max(0, Math.floor((Math.min(s.ax, s.bx) - reach - x0) / reach));
        const gx1 = Math.min(bw - 1, Math.floor((Math.max(s.ax, s.bx) + reach - x0) / reach));
        const gy0 = Math.max(0, Math.floor((Math.min(s.ay, s.by) - reach - y0) / reach));
        const gy1 = Math.min(bh - 1, Math.floor((Math.max(s.ay, s.by) + reach - y0) / reach));
        for (let gy = gy0; gy <= gy1; gy++)
            for (let gx = gx0; gx <= gx1; gx++) buckets[bi(gx, gy)].push(i);
    }

    // 밀도 샘플 — GPU 커널과 같은 식: q³ · (KERNEL_NORM · segLen / reach)
    const f = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
        const py = y0 + j * cell;
        const gy = Math.max(0, Math.min(bh - 1, Math.floor((py - y0) / reach)));
        for (let i = 0; i < nx; i++) {
            const px = x0 + i * cell;
            const gx = Math.max(0, Math.min(bw - 1, Math.floor((px - x0) / reach)));
            let sum = 0;
            for (const si of buckets[bi(gx, gy)]) {
                const s = segs[si];
                const d = distToSeg(px, py, s.ax, s.ay, s.bx, s.by);
                if (d >= reach) continue;
                const q = 1 - d / reach;
                const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
                sum += q * q * q * ((KERNEL_NORM * len) / reach);
            }
            f[j * nx + i] = sum;
        }
    }

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
