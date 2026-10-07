// ── bubble.js — 화면 전체를 감싸는 말풍선 (2026-10-07) ─────────────────────────
//
// 글자 영역을 큰 말풍선 하나가 감싼다. 꼬리는 아래 가운데 — 모니터 밑(턴테이블)의
// 수신자가 말하는 것처럼 보이게. 모양 4종은 Figma 'AI브랜딩' chat bubble 프레임(483:31)의
// 시안 1~4번이고, 기본은 1번. 고르는 중이라 ?bubble=1..4 / Alt+1..4 로 바꿔 본다.
//
// Figma SVG를 그대로 늘리면 모서리·꼬리가 화면 비율대로 찌그러지므로, 경로를 화면 px로
// 직접 만든다. 숫자는 Figma 원본 좌표 — 몸체 높이(1~3번 245, 4번 387)를 기준으로
// 스케일해서 화면 크기가 바뀌어도 모서리·꼬리가 시안과 같은 비율로 남는다.
// 몸체 사각형은 output.html #bubble-box 가 정한다(좌표의 원본은 CSS).
// 꼬리 가로 위치도 거기 --tail-x (몸체 폭에 대한 비율, 0.5 = 가운데).

// Figma의 smoothed corner(코너 스무딩) 한 개 — 시작점에서 진행 방향(a)으로 u, 다음 변 방향(b)으로 v.
// 1번 모서리(반경 102.4)를 102.4로 나눈 값. 4번(38.4)도 같은 곡선이다.
const CORNER = [
    [0.35003, 0, 0.52505, 0, 0.65875, 0.06812],
    [0.77635, 0.12804, 0.87196, 0.22365, 0.93188, 0.34125],
    [1, 0.47495, 1, 0.64996, 1, 1],
];

// 1~3번 꼬리 — 아래 변 가운데(282, 245)를 원점으로 옮긴 Figma 좌표. 오른쪽 뿌리에서 끝으로 갔다가
// 왼쪽 뿌리로 돌아온다(몸체를 시계방향으로 돌 때 아래 변은 오른쪽→왼쪽).
const TAIL = {
    right: 12.856,
    left: -10.648,
    curves: [
        [13.077, 10.329, 16.329, 19.392, 20.537, 25.727],
        [21.249, 26.799, 21.605, 27.335, 21.555, 27.599],
        [21.51, 27.831, 21.355, 28.012, 21.133, 28.093],
        [20.88, 28.184, 20.325, 27.93, 19.215, 27.422],
        [5.353, 21.071, -5.55, 9.733, -10.27, 0.234],
    ],
};

const f = n => n.toFixed(2);

function corner(x, y, ax, ay, bx, by, c) {
    let d = '';
    for (const [u1, v1, u2, v2, u3, v3] of CORNER) {
        const p = (u, v) => `${f(x + (ax * u + bx * v) * c)} ${f(y + (ay * u + by * v) * c)}`;
        d += `C${p(u1, v1)} ${p(u2, v2)} ${p(u3, v3)}`;
    }
    return d;
}

function tail(cx, by, s) {
    let d = `L${f(cx + TAIL.right * s)} ${f(by)}`;
    for (const c of TAIL.curves) {
        d += `C${f(cx + c[0] * s)} ${f(by + c[1] * s)} ${f(cx + c[2] * s)} ${f(by + c[3] * s)} ${f(cx + c[4] * s)} ${f(by + c[5] * s)}`;
    }
    return d + `L${f(cx + TAIL.left * s)} ${f(by)}`;
}

// 모서리를 스무딩한 사각형. bottom(cx, by) 은 아래 변 가운데에 꼬리를 끼워 넣는 콜백.
function roundRect(x, y, w, h, c, tx, bottom) {
    c = Math.min(c, w / 2, h / 2);
    const r = x + w;
    const b = y + h;
    return (
        `M${f(x + c)} ${f(y)}H${f(r - c)}` +
        corner(r - c, y, 1, 0, 0, 1, c) +
        `V${f(b - c)}` +
        corner(r, b - c, 0, 1, -1, 0, c) +
        bottom(x + w * tx, b) +
        `H${f(x + c)}` +
        corner(x + c, b, -1, 0, 0, -1, c) +
        `V${f(y + c)}` +
        corner(x, y + c, 0, -1, 1, 0, c) +
        'Z'
    );
}

// 몸체 {x, y, w, h, tx(꼬리 위치 비율), ref(기준 높이 px), ts(꼬리 배율)} → { d }
// 모서리·꼬리는 지금 높이 h가 아니라 ref로 잰다 — 줄 수에 따라 말풍선이 늘어나도 모서리·꼬리 크기는 그대로.
// (모서리는 h/2를 넘지 못하므로 아주 낮을 땐 알약형이 된다)
const SHAPES = {
    // 1 — 큰 스무딩 모서리 (Figma 564×245, 반경 102.4)
    1({ x, y, w, h, tx, ref, ts }) {
        const s = ref / 245;
        return { d: roundRect(x, y, w, h, 102.4 * s, tx, (cx, by) => tail(cx, by, s * ts)) };
    },
    // 2 — 알약형 (양끝 반원)
    2({ x, y, w, h, tx, ref, ts }) {
        const s = ref / 245;
        const r = Math.min(h / 2, w / 2);
        const b = y + h;
        const d =
            `M${f(x + r)} ${f(y)}H${f(x + w - r)}` +
            `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(b)}` +
            tail(x + w * tx, b, s * ts) +
            `H${f(x + r)}` +
            `A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
        return { d };
    },
    // 3 — 타원. 꼬리 뿌리 두 점을 타원 위로 올려 붙인다(1번 꼬리와 같은 모양)
    3({ x, y, w, h, tx, ref, ts }) {
        const s = (ref / 298) * ts;
        const rx = w / 2;
        const ry = h / 2;
        const cy = y + ry;
        const yAt = px => cy + ry * Math.sqrt(Math.max(0, 1 - ((px - x - rx) / rx) ** 2));
        const cx = x + w * tx; // 꼬리 기준점(타원 중심 아님)
        const xr = cx + TAIL.right * s;
        const xl = cx + TAIL.left * s;
        const yr = yAt(xr);
        const yl = yAt(xl);
        let t = '';
        for (const c of TAIL.curves) {
            t += `C${f(cx + c[0] * s)} ${f(yr + c[1] * s)} ${f(cx + c[2] * s)} ${f(yr + c[3] * s)} ${f(cx + c[4] * s)} ${f(yr + c[5] * s)}`;
        }
        const d =
            `M${f(xl)} ${f(yl)}` +
            `A${f(rx)} ${f(ry)} 0 1 1 ${f(xr)} ${f(yr)}` +
            t +
            `L${f(xl)} ${f(yl)}Z`;
        return { d };
    },
    // 4 — 작은 스무딩 모서리 + 생각 풍선 꼬리(반쯤 걸친 원 + 떨어진 작은 원)
    // (Figma 579×387, 반경 38.4. 걸친 원 r16 중심 (가운데-8.4, 아래+1), 작은 원 r6.2 중심 (가운데+8.6, 아래+22))
    // 시안의 초록빛 그림자 drop-shadow(2 2 4, rgba(0,194,93,.1))는 공통 그림자(--shadow-*)로 대체됐다
    4({ x, y, w, h, tx, ref, ts }) {
        const s = ref / 387;
        const k = s * ts;
        const bump = 16 * k;
        const dot = 6.2 * k;
        const d =
            roundRect(x, y, w, h, 38.4 * s, tx, (cx, by) => {
                const bx = cx - 8.4 * k;
                return `L${f(bx + bump)} ${f(by)}A${f(bump)} ${f(bump)} 0 1 1 ${f(bx - bump)} ${f(by)}`;
            }) +
            (() => {
                const dx = x + w * tx + 8.6 * k;
                const dy = y + h + 22 * k;
                return `M${f(dx + dot)} ${f(dy)}A${f(dot)} ${f(dot)} 0 1 1 ${f(dx - dot)} ${f(dy)}A${f(dot)} ${f(dot)} 0 1 1 ${f(dx + dot)} ${f(dy)}Z`;
            })();
        return { d };
    },
};

export const BUBBLE_TYPES = Object.keys(SHAPES).map(Number);

const NS = 'http://www.w3.org/2000/svg';
// 줄이 늘 때 높이 — 트윈 대신 스프링이 목표를 따라간다. 도중에 목표가 또 바뀌어도(줄이 연달아 늘어도)
// 끊기지 않고 이어서 휜다. 값은 초당 단위(프레임레이트 무관). 감쇠비 ≈ DAMP / (2√STIFF) ≈ 0.85 — 아주 살짝만 넘침
const H_STIFF = 70;
const H_DAMP = 14;
// 등장 — 꼬리 끝(가운데 아래, 모니터 밑의 수신자)을 축으로 아래에서 떠오르며 크기는 스프링으로 튀어 오른다.
// 퇴장은 그 반대로 짧게
const SHOW_MS = 900;
const HIDE_MS = 260;
const RISE_VH = 6; // 얼마나 아래에서 올라오나
const RISE_SCALE = 0.55; // 처음 크기 — 여기서 스프링으로 1까지(넘쳤다 돌아옴)
const SPRING_FREQ = 2.2; // 스프링 진동 수(초당) — 클수록 빠르게 출렁
const SPRING_ZETA = 0.42; // 감쇠비 — 작을수록 더 통통 튄다(1 = 안 넘침)

// 감쇠 스프링 0 → 1 (t: 초) — WAAPI 키프레임으로 굽는다
function springAt(t) {
    const w = 2 * Math.PI * SPRING_FREQ;
    const z = SPRING_ZETA;
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

// 꼬리 끝이 몸체 밑변에서 얼마나 내려가나(시안 좌표 ≈ 28) — 모양별 기준 높이(245/298/387)로 스케일
const TAIL_DEPTH = { 1: 28.2 / 245, 2: 28.2 / 245, 3: 28.2 / 298, 4: 28.2 / 387 };

/**
 * @param svg  화면 전체를 덮는 <svg> (#bubble) — 그림자 + 유리 + 말풍선 면 + 테 경로를 만든다
 * @param box  몸체 사각형을 정하는 요소 (#bubble-box, CSS가 좌표 원본)
 * @param opts.glass  유리(glassmorphism)로 비칠 배경 이미지 URL. 없으면 유리 없음(TD 투명 모드 —
 *                    뒤가 TD 레이어라 이 페이지에선 비칠 배경을 모른다)
 * @param opts.glassAlt  receiver별 두 번째 배경(signal = BG_n). glass 위에 겹쳐 두고 setGlassAlt(on)로
 *                    투명도만 바꾼다 — body 배경 크로스페이드(output.html body::before)와 같은 시간
 */
export function mountBubble(svg, box, type = 1, { glass = null, glassAlt = null, clip = [] } = {}) {
    // clip — 말풍선이 떠 있는 동안 이 요소들을 말풍선 모양으로 잘라 글자가 말풍선 밖(둥근 모서리 바깥)에
    // 안 비치게 한다. 위쪽 페이드(mask)는 그대로 겹쳐 걸린다
    // 그림자 — 같은 모양을 불투명하게 한 벌 더 그려 흐리고 옮긴 뒤, 원래 모양 자리는 파낸다(바깥에만).
    // 말풍선 면이 반투명이어도 그림자가 안쪽까지 비쳐 탁해지지 않는다.
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = `<filter id="bubble-shadow" x="-10%" y="-10%" width="120%" height="130%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" result="b"/>
        <feOffset in="b" result="o"/>
        <feFlood/>
        <feComposite in2="o" operator="in" result="s"/>
        <feComposite in="s" in2="SourceAlpha" operator="out"/>
    </filter>`;
    const shadow = document.createElementNS(NS, 'path');
    shadow.setAttribute('class', 'shadow');
    // 인라인 style — output.html 의 `#bubble path { fill }`(말풍선 면 색)가 이 경로까지 덮지 않게
    shadow.style.fill = '#000';
    shadow.style.stroke = 'none';
    shadow.setAttribute('filter', 'url(#bubble-shadow)');
    // 유리 — 배경 이미지 사본을 말풍선 모양으로 오려 강하게 일렁이게(난류 변위) + 살짝 흐리게.
    // backdrop-filter 는 Chrome에서 SVG 변위 필터를 못 받으므로, 배경이 정지 이미지인 걸 이용해 직접 그린다.
    // body 배경과 같은 '화면에 100%로 늘린' 배치라 말풍선이 없을 때와 같은 자리를 굴절시킨다
    defs.insertAdjacentHTML(
        'beforeend',
        `<clipPath id="bubble-clip"><path/></clipPath>
        <filter id="bubble-glass" filterUnits="userSpaceOnUse" x="0" y="0" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" numOctaves="2" seed="7" result="n"/>
            <feDisplacementMap in="SourceGraphic" in2="n" xChannelSelector="R" yChannelSelector="G" result="d"/>
            <feGaussianBlur in="d" result="b"/>
            <feComponentTransfer in="b"><feFuncR type="linear"/><feFuncG type="linear"/><feFuncB type="linear"/></feComponentTransfer>
        </filter>`,
    );
    const clipPath = defs.querySelector('#bubble-clip path');
    const gFilter = defs.querySelector('#bubble-glass');
    const gTurb = gFilter.querySelector('feTurbulence');
    const gDisp = gFilter.querySelector('feDisplacementMap');
    const gBlur = gFilter.querySelector('feGaussianBlur');
    const gFuncs = gFilter.querySelectorAll('feComponentTransfer > *');
    const makeGlass = href => {
        const img = document.createElementNS(NS, 'image');
        img.setAttribute('href', href);
        img.setAttribute('preserveAspectRatio', 'none');
        img.setAttribute('clip-path', 'url(#bubble-clip)');
        img.setAttribute('filter', 'url(#bubble-glass)');
        return img;
    };
    const glassImg = glass ? makeGlass(glass) : null;
    const glassAltImg = glass && glassAlt ? makeGlass(glassAlt) : null;
    glassAltImg?.setAttribute('class', 'glass-alt'); // 투명도·전환은 output.html CSS
    const path = document.createElementNS(NS, 'path');
    // 유리 테 — 가장자리 빛 (output.html #bubble path.rim)
    const rim = document.createElementNS(NS, 'path');
    rim.setAttribute('class', 'rim');
    svg.replaceChildren(...[defs, shadow, glassImg, glassAltImg, path, rim].filter(Boolean));
    const fBlur = defs.querySelector('feGaussianBlur');
    const fOff = defs.querySelector('feOffset');
    const fFlood = defs.querySelector('feFlood');

    function draw() {
        const r = box.getBoundingClientRect();
        const cs = getComputedStyle(box);
        const num = (name, dflt) => {
            const v = parseFloat(cs.getPropertyValue(name));
            return Number.isFinite(v) ? v : dflt;
        };
        const H = window.innerHeight;
        const P = {
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
            tx: num('--tail-x', 0.5),
            ref: num('--bubble-ref', 0.665) * H,
            ts: num('--tail-scale', 1),
        };
        const { d } = SHAPES[type](P);
        // 등장 애니메이션의 축 = 꼬리 끝
        tip = { x: P.x + P.w * P.tx, y: P.y + P.h + TAIL_DEPTH[type] * P.ref * P.ts };
        applyClip(P);
        const W = window.innerWidth;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        path.setAttribute('d', d);
        shadow.setAttribute('d', d);
        rim.setAttribute('d', d);
        clipPath.setAttribute('d', d);
        const vh = H / 100;
        if (glassImg) {
            for (const img of [glassImg, glassAltImg].filter(Boolean)) {
                img.setAttribute('width', W);
                img.setAttribute('height', H);
            }
            gFilter.setAttribute('width', W);
            gFilter.setAttribute('height', H);
            // 무늬 크기·세기는 화면 높이에 비례 — 어느 해상도에서든 같은 일렁임
            gTurb.setAttribute('baseFrequency', String(num('--glass-freq', 0.0025) * (1440 / H)));
            gDisp.setAttribute('scale', f(num('--glass-distort', 7) * vh));
            gBlur.setAttribute('stdDeviation', f(num('--glass-blur', 0.5) * vh));
            const lift = num('--glass-lift', 0.06); // 유리를 살짝 밝게(뿌옇게)
            for (const fn of gFuncs) {
                fn.setAttribute('slope', f(1 - lift));
                fn.setAttribute('intercept', f(lift));
            }
        }
        fBlur.setAttribute('stdDeviation', f(num('--shadow-blur', 1.6) * vh));
        fOff.setAttribute('dx', f(num('--shadow-x', 0) * vh));
        fOff.setAttribute('dy', f(num('--shadow-y', 0.5) * vh));
        fFlood.setAttribute('flood-color', cs.getPropertyValue('--shadow-color').trim() || 'rgba(0,0,0,0.2)');
        svg.dataset.type = type;
    }

    let tip = { x: 0, y: 0 };
    let visible = true;
    let visAnim = null;
    // 잘라 낼 요소마다 자기 왼쪽 위를 원점으로 한 같은 모양 — CSS clip-path: path()는 요소 좌표계라서
    function applyClip(P) {
        for (const el of clip) {
            if (!visible) {
                el.style.clipPath = '';
                continue;
            }
            const er = el.getBoundingClientRect();
            el.style.clipPath = `path('${SHAPES[type]({ ...P, x: P.x - er.left, y: P.y - er.top }).d}')`;
        }
    }

    new ResizeObserver(draw).observe(box);
    window.addEventListener('resize', draw);
    draw();

    // 세로 길이 — px를 주면 그 높이로 자란다(밑면 고정, CSS가 --bubble-top-min 에서 자른다). null = 최대.
    // 스프링이 목표를 따라가므로 줄이 연달아 늘어도 매끄럽게 이어진다
    let hNow = null;
    let hVel = 0;
    let hTarget = null;
    let hRaf = 0;
    let hLast = 0;
    const putH = px => box.style.setProperty('--bubble-h', `${px}px`);
    function stepH(now) {
        const dt = Math.min(0.05, (now - hLast) / 1000);
        hLast = now;
        const a = H_STIFF * (hTarget - hNow) - H_DAMP * hVel;
        hVel += a * dt;
        hNow += hVel * dt;
        if (Math.abs(hTarget - hNow) < 0.3 && Math.abs(hVel) < 3) {
            hNow = hTarget;
            hVel = 0;
            hRaf = 0;
        } else {
            hRaf = requestAnimationFrame(stepH);
        }
        putH(hNow);
    }
    function snapH() {
        cancelAnimationFrame(hRaf);
        hRaf = 0;
        hVel = 0;
        hNow = hTarget;
        if (hTarget == null) box.style.removeProperty('--bubble-h');
        else putH(hTarget);
    }
    function setHeight(px) {
        hTarget = px;
        // 최대(null)로 돌아가거나 처음 정할 때, 또는 숨어 있을 땐(보이는 게 없으니) 바로
        if (px == null || hNow == null || !visible) return snapH();
        if (!hRaf) {
            hLast = performance.now();
            hRaf = requestAnimationFrame(stepH);
        }
    }

    // 보이기/숨기기 — 관람객 차례엔 말풍선이 없다(output-main.js syncBubble). 등장은 꼬리 끝을 축으로
    // 아래에서 떠오르며 크기가 스프링으로 튀고, 높이는 그 전에 목표로 맞춰 둔다(빈 말풍선이 자라 보이지 않게)
    function setVisible(on, { instant = false } = {}) {
        if (on === visible) return;
        visible = on;
        if (on) snapH();
        draw(); // 꼬리 끝·clip 갱신
        if (instant) {
            visAnim?.cancel();
            svg.style.visibility = on ? '' : 'hidden';
            return;
        }
        svg.style.transformOrigin = `${tip.x}px ${tip.y}px`;
        visAnim?.cancel();
        if (on) {
            svg.style.visibility = '';
            // 크기 = 감쇠 스프링(넘쳤다 돌아옴), 떠오름 = 부드러운 감속, 투명도는 앞쪽에서 금방
            const N = 40;
            const frames = [];
            for (let i = 0; i <= N; i++) {
                const t = i / N;
                const sc = RISE_SCALE + (1 - RISE_SCALE) * springAt((t * SHOW_MS) / 1000);
                const up = 1 - (1 - t) ** 3;
                frames.push({
                    offset: t,
                    opacity: Math.min(1, t * 4),
                    transform: `translateY(${(RISE_VH * (1 - up)).toFixed(3)}vh) scale(${sc.toFixed(4)})`,
                });
            }
            frames[N].transform = 'translateY(0) scale(1)';
            visAnim = svg.animate(frames, { duration: SHOW_MS, easing: 'linear' });
        } else {
            const from = { opacity: 0, transform: `translateY(${RISE_VH}vh) scale(0.85)` };
            const to = { opacity: 1, transform: 'translateY(0) scale(1)' };
            const a = (visAnim = svg.animate([to, from], { duration: HIDE_MS, easing: 'ease-in', fill: 'forwards' }));
            a.onfinish = () => {
                if (visAnim !== a) return;
                svg.style.visibility = 'hidden';
                a.cancel();
            };
        }
    }

    return {
        get type() {
            return type;
        },
        get visible() {
            return visible;
        },
        setVisible,
        setType(t) {
            if (!SHAPES[t]) return;
            type = t;
            draw();
        },
        setHeight,
        setGlassAlt(on) {
            glassAltImg?.classList.toggle('on', !!on);
        },
    };
}
