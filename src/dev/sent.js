// ── sent.js — 보낸 관람객 문장 (2026-11-09) ──────────────────────────────────
//
// 관람객이 제출하면 글자가 바로 지워지는 대신, 화면 그대로 떠서(글자 + 음절 네모) 위로 살짝 밀려
// 올라가며 흐려진다. 그사이 수신자 말풍선이 아래에서 떠오른다 — 관람객 문장이 올라가고 대답이 올라오는
// 주고받는 리듬. 위쪽 흐림 띠·올라가는 양은 output.html #sent-glyphs / #sent-tags CSS.
//
// 떠 두는 건 peek.js snapGlyphs — mycelium은 그리는 프레임에서만 읽혀서 몇 프레임 걸릴 수 있다.
// send()는 다 뜬 뒤에 끝나므로, 부르는 쪽은 그다음에 진짜 글자를 지운다(그래야 빈 화면이 안 끼인다).

import { snapGlyphs } from './peek.js';

const RISE_MS = 1100;
const RISE_EASE = 'cubic-bezier(0.3, 0.6, 0.35, 1)';

export function mountSent({ glyphLayer, tagLayer, source, tags }) {
    const canvas = glyphLayer.querySelector('canvas');
    const tagBox = tagLayer.firstElementChild;
    let anims = [];
    let gen = 0;

    function stop() {
        for (const a of anims) a.cancel();
        anims = [];
        glyphLayer.hidden = true;
        tagLayer.hidden = true;
    }

    async function send() {
        const my = ++gen;
        const got = await snapGlyphs(source);
        if (my !== gen) return;
        stop();
        if (got) {
            canvas.width = got.canvas.width;
            canvas.height = got.canvas.height;
            canvas.getContext('2d').drawImage(got.canvas, 0, 0);
        } else {
            canvas.width = canvas.height = 0;
        }
        // 음절 네모 — 지금 떠 있는 그대로 복사(caption.js가 매 프레임 자리를 다시 잡으므로 지우기 직전 모습)
        tagBox.replaceChildren(...[...tags.children].map(el => el.cloneNode(true)));
        glyphLayer.hidden = false;
        tagLayer.hidden = false;
        const rise = parseFloat(getComputedStyle(glyphLayer).getPropertyValue('--sent-rise')) * (window.innerHeight / 100);
        const frames = [
            { transform: 'translateY(0px)', opacity: 1 },
            { transform: `translateY(${-rise}px)`, opacity: 0 },
        ];
        const opts = { duration: RISE_MS, easing: RISE_EASE, fill: 'forwards' };
        const a = canvas.animate(frames, opts);
        anims = [a, tagBox.animate(frames, opts)];
        a.onfinish = () => {
            if (anims.includes(a)) stop();
        };
    }

    // 전체 지우기·receiver 교체 — 올라가던 것도 바로 치운다
    function clear() {
        gen++;
        stop();
    }

    return { send, clear };
}
