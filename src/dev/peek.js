// ── peek.js — 지난 수신자 말풍선 조각 (2026-11-09) ─────────────────────────────
//
// 관람객이 치기 시작하면 수신자 말풍선이 그냥 사라지는 대신, 꼬리를 접고 위로 올라가 프로필 뒤로
// 숨으며 밑단만 남는다 — 채팅에서 지난 메시지가 위로 밀려 올라간 것처럼. 그 안엔 수신자 글자가 흐리게
// 비친다. 다음 수신자 말풍선이 떠오르면 조각은 위로 마저 밀려 사라진다. 조각은 늘 하나.
//
// 말풍선은 bubble.js를 한 벌 더 띄운 것(#peek-bubble, 유리도 따로)이고, 위치·mask·흐림 값은
// output.html #peek / #peek-box CSS. 움직이는 동안은 #peek-move 를 transform 으로만 옮기고
// (유리를 매 프레임 다시 굽지 않게), 다 올라간 뒤에 몸체 자리를 옮겨 한 번 다시 그린다.
//
// 글자는 화면 캔버스(#glyph-window 안)를 떠 둔 것 — snap()은 수신자 문장이 끝났을 때(제출) 부른다.
// mycelium 캔버스는 preserveDrawingBuffer가 없어서 그 receiver가 그린 프레임에서만 읽힌다(24fps 표시 패스)
// → 몇 프레임 rAF로 다시 읽어 글자가 잡힌 장을 쓴다.

import { mountBubble } from './bubble.js';
import { renderDpr } from '../js/renderRes.js';

const TAIL_MS = 220; // 꼬리 접기
const RISE_MS = 750; // 위로 올라가기
const RISE_EASE = 'cubic-bezier(0.25, 0.8, 0.25, 1)';
const OUT_MS = 450; // 다음 말풍선이 오면 마저 밀려 사라지기
const SNAP_TRIES = 12; // 글자가 잡힐 때까지 rAF로 다시 읽는 최대 프레임

// source(#glyph-window) 안의 캔버스를 화면에 보이는 자리(CSS 슬라이드 포함) 그대로 한 장(화면 크기)에 겹친다.
// 글자 맨 아래(화면 px)를 돌려준다 — 글자가 없으면 null. sent.js도 쓴다
let _probe = null;
export function grabGlyphs(source, into) {
    const k = renderDpr(Infinity); // 전시 4K 픽셀 상한 — renderRes.js (예전엔 devicePixelRatio 그대로)
    into.width = Math.round(window.innerWidth * k);
    into.height = Math.round(window.innerHeight * k);
    const c = into.getContext('2d');
    c.clearRect(0, 0, into.width, into.height);
    for (const cv of source.querySelectorAll('canvas')) {
        const r = cv.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(cv).display === 'none') continue;
        c.drawImage(cv, r.left * k, r.top * k, r.width * k, r.height * k);
    }
    // 비었는지는 작게 줄여서 본다(전체 getImageData는 비싸다)
    _probe ??= document.createElement('canvas');
    _probe.width = 160;
    _probe.height = 90;
    const pc = _probe.getContext('2d', { willReadFrequently: true });
    pc.clearRect(0, 0, 160, 90);
    pc.drawImage(into, 0, 0, 160, 90);
    const d = pc.getImageData(0, 0, 160, 90).data;
    for (let y = 89; y >= 0; y--) {
        for (let x = 0; x < 160; x++) if (d[(y * 160 + x) * 4 + 3] > 4) return ((y + 1) / 90) * window.innerHeight;
    }
    return null;
}

// 글자가 잡힐 때까지 rAF로 다시 떠 본다(mycelium) → { canvas, bottom } 또는 null(끝내 빈 화면)
export function snapGlyphs(source, tries = SNAP_TRIES) {
    const canvas = document.createElement('canvas');
    return new Promise(resolve => {
        let n = 0;
        const tryGrab = () => {
            const bottom = grabGlyphs(source, canvas);
            if (bottom != null) resolve({ canvas, bottom });
            else if (++n < tries) requestAnimationFrame(tryGrab);
            else resolve(null);
        };
        requestAnimationFrame(tryGrab);
    });
}

export function mountPeek({ root, mover, svg, box, ghost, source, type, glass, glassAlt }) {
    const bubble = mountBubble(svg, box, type, { glass, glassAlt, clip: [ghost], id: 'peek' });
    bubble.setVisible(false, { instant: true });
    const ctx = ghost.getContext('2d');
    let snap = null; // 떠 둔 수신자 글자(화면 크기 캔버스)
    let snapBottom = null; // 그 글자 맨 아래(화면 px)
    let snapGen = 0;
    let anims = [];
    let tailRaf = 0;
    let shown = false;
    let restBottom = 0; // 다 올라갔을 때 조각 밑변(화면 px)
    let lift = 0; // 관람객 글자를 피해 더 올린 양(px) — mover의 translate(transform과 따로 겹친다)

    const cssNum = name => parseFloat(getComputedStyle(root).getPropertyValue(name));
    const vh = () => window.innerHeight / 100;

    function stop() {
        for (const a of anims) a.cancel();
        anims = [];
        cancelAnimationFrame(tailRaf);
        tailRaf = 0;
    }

    // 수신자 문장이 끝났을 때 — 화면 글자를 떠 둔다
    function takeSnap() {
        const my = ++snapGen;
        snap = null;
        snapBottom = null;
        snapGlyphs(source).then(got => {
            if (my !== snapGen || !got) return;
            snap = got.canvas;
            snapBottom = got.bottom;
        });
    }

    function forget() {
        snapGen++;
        snap = null;
    }

    // 말풍선 몸체 rect(지금 화면에 떠 있는 자리) → 조각으로 넘겨받아 위로 올린다
    function handoff(rect, tailScale) {
        stop();
        root.hidden = false;
        mover.style.transform = '';
        mover.style.opacity = '';
        mover.style.translate = '';
        lift = 0;
        // 글자 — 떠 둔 게 없으면 빈 말풍선만
        const k = renderDpr(Infinity);
        ghost.width = Math.round(window.innerWidth * k);
        ghost.height = Math.round(window.innerHeight * k);
        ctx.clearRect(0, 0, ghost.width, ghost.height);
        if (snap) ctx.drawImage(snap, 0, 0, ghost.width, ghost.height);
        const glyphBottom = snap ? snapBottom : null;
        ghost.style.transform = '';
        ghost.style.opacity = '1';
        ghost.style.filter = '';
        snapGen++;
        snap = null;

        box.style.top = `${rect.top}px`;
        box.style.height = `${rect.height}px`;
        box.style.setProperty('--tail-scale', String(tailScale));
        bubble.redraw();
        bubble.setVisible(true, { instant: true });
        shown = true;

        // 꼬리 접기 — CSS 변수라 ResizeObserver가 못 본다. 접히는 동안만 다시 그린다.
        // 다 접은 뒤에 올라간다 — 다시 그리면 글자 clip을 화면 좌표로 재는데, 그사이 #peek-move가
        // transform으로 움직이고 있으면 clip이 글자보다 밀린다
        const t0 = performance.now();
        const fold = now => {
            const t = Math.min(1, (now - t0) / TAIL_MS);
            box.style.setProperty('--tail-scale', String(tailScale * (1 - t) ** 2));
            bubble.redraw();
            tailRaf = t < 1 ? requestAnimationFrame(fold) : 0;
        };
        tailRaf = requestAnimationFrame(fold);

        // 위로 — 밑변이 --peek-bottom 에 오도록. 단 글자가 있으면 마지막 줄 아랫부분(--peek-ghost-show)이
        // 보이는 띠(--peek-fade-to 아래)에 걸릴 만큼만 — 말풍선 밑 여백이 커서 밑변 기준이면 글자가 다 숨는다
        // 그래도 밑변은 --peek-bottom-max 보다 내려오지 않는다(조각이 너무 커지지 않게)
        let dy = rect.bottom - cssNum('--peek-bottom') * vh();
        if (glyphBottom != null) dy = Math.min(dy, glyphBottom - (cssNum('--peek-fade-to') + cssNum('--peek-ghost-show')) * vh());
        dy = Math.max(0, dy, rect.bottom - cssNum('--peek-bottom-max') * vh());
        restBottom = rect.bottom - dy;
        const opacity = cssNum('--peek-ghost-opacity');
        const blur = getComputedStyle(root).getPropertyValue('--peek-ghost-blur').trim() || '0px';
        const rise = mover.animate([{ transform: 'none' }, { transform: `translateY(${-dy}px)` }], {
            duration: RISE_MS,
            delay: TAIL_MS,
            easing: RISE_EASE,
            fill: 'forwards',
        });
        const fade = ghost.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity, filter: `blur(${blur})` }], {
            duration: RISE_MS,
            delay: TAIL_MS,
            easing: 'ease-out',
            fill: 'forwards',
        });
        anims = [rise, fade];
        rise.onfinish = () => {
            if (!anims.includes(rise)) return;
            // 다 올라갔으면 transform 대신 몸체를 그 자리로 옮겨 한 번 다시 그린다 —
            // 유리가 비추는 배경도 새 자리에 맞고, 글자 clip도 새 모양으로
            cancelAnimationFrame(tailRaf);
            tailRaf = 0;
            box.style.setProperty('--tail-scale', '0');
            box.style.top = `${rect.top - dy}px`;
            ghost.style.transform = `translateY(${-dy}px)`;
            ghost.style.opacity = String(opacity);
            ghost.style.filter = `blur(${blur})`;
            stop();
            bubble.redraw();
        };
    }

    // 다음 수신자 말풍선이 떠오를 때 — 위로 마저 밀려 사라진다. instant = 바로 치움(전체 지우기·receiver 교체)
    function dismiss({ instant = false } = {}) {
        if (!shown) return;
        shown = false;
        // 올라가던 도중이면 그 자리에서 이어서 — stop()이 transform을 지우기 전에 읽어 둔다
        const from = getComputedStyle(mover).transform;
        const at = from && from !== 'none' ? from : '';
        stop();
        const done = () => {
            bubble.setVisible(false, { instant: true });
            root.hidden = true;
            mover.style.transform = '';
            mover.style.opacity = '';
            mover.style.translate = '';
            lift = 0;
        };
        if (instant) return done();
        const out = mover.animate(
            [
                { transform: `${at} translateY(0px)`, opacity: 1 },
                { transform: `${at} translateY(${-6 * vh()}px)`, opacity: 0 },
            ],
            { duration: OUT_MS, easing: 'ease-in', fill: 'forwards' },
        );
        anims = [out];
        out.onfinish = () => {
            if (!anims.includes(out)) return;
            anims = [];
            done();
            out.cancel();
        };
    }

    // 관람객 글자 위끝(화면 px, 없으면 null) — 매 프레임 받는다. 조각 밑변이 그보다 --peek-gap 위에
    // 오도록 더 올라간다(글자가 위로 쌓여 오면 조각이 밀려 프로필 뒤로 숨는다). 글자가 줄면 다시 내려온다
    function setFloor(top) {
        if (!shown) return;
        // 많아야 밑변이 프로필 뒤(--peek-fade-from)로 다 숨을 만큼만 — 글자가 줄면 거기서 바로 내려온다
        const most = Math.max(0, restBottom - cssNum('--peek-fade-from') * vh());
        const want = top == null ? 0 : Math.min(most, Math.max(0, restBottom - (top - cssNum('--peek-gap') * vh())));
        if (Math.abs(want - lift) < 0.5) return;
        lift += (want - lift) * 0.18;
        mover.style.translate = `0 ${(-lift).toFixed(1)}px`;
    }

    return {
        takeSnap,
        setFloor,
        forget,
        handoff,
        dismiss,
        get shown() {
            return shown;
        },
        setType: t => bubble.setType(t),
        setGlassAlt: (on, opts) => bubble.setGlassAlt(on, opts),
    };
}
