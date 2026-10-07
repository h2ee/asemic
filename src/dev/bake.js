// ── bake.js ───────────────────────────────────────────────────────────────────
// 음절 하나 = PNG 하나. mycelium을 투명 출력으로 띄우고 음절을 화면 정중앙에 하나씩
// 실제 성장 애니메이션 그대로 끝까지 키운 뒤(누적 버퍼의 성장 자취까지 전시와 동일),
// 누적 버퍼에서 가운데 정사각형을 잘라 bake/<dir>/NNNN_<음절>.png 로 저장한다.
//
//   http://localhost:5173/asemic/src/dev/bake.html   (npm run dev — 저장은 vite.config.js /__bake)
//   ?size=1080  출력 한 변(px). 0이면 잘라낸 원본 해상도(= 창 짧은 변 × DPR)
//   ?fill=0.84  정사각형 한 변 대비 글자 지름(2·glyphExtent·sylSize) 비율. 글자가 잘리면 내릴 것
//   ?dir=mycelium  ?instant=1(성장 생략, 빠르지만 성장 자취가 없는 모양)  ?text=가나다
//
// 프레임은 이 페이지가 직접 돌린다(rAF 아님) — 탭이 뒤로 가거나 창이 가려져도 계속 굽는다.
// ⚠️ 창 크기를 바꾸면 그 음절은 처음부터 다시 굽는다(mycelium _onResize가 큐를 비운다).
//
// 글자 모양은 화면 크기와 무관하다 — layoutFor와 같은 방식으로 기준 크기(sylSize × H/refHeight)
// 모양을 만들고 셰이더 균일 스케일(glyphScale)로 키운다. 즉 전시 화면의 그 글자를 확대한 것.
// 음절 하나씩이라 허브·연결 실은 없다(연결 실은 이전 음절이 있어야 생긴다).

import { decomposeSyllables, syllablesToUniforms } from '../js/core.js';
import { makeBakeReceiver, glyphScaleFor, readAccum, listSaved, savePng } from './bake-common.js';

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);

// KS X 1001 완성형 한글 2350자 = EUC-KR 0xB0A1~0xC8FE
function ks2350() {
    const dec = new TextDecoder('euc-kr');
    let s = '';
    for (let a = 0xb0; a <= 0xc8; a++)
        for (let b = 0xa1; b <= 0xfe; b++) s += dec.decode(new Uint8Array([a, b]));
    return s;
}

$('text').value = q.get('text') ?? '';
$('size').value = q.get('size') ?? 1080;
$('fill').value = q.get('fill') ?? 0.84;
$('dir').value = q.get('dir') ?? 'mycelium';
$('instant').checked = q.get('instant') === '1';

const { r, waitIdle } = await makeBakeReceiver();

let resizes = 0;
window.addEventListener('resize', () => resizes++);

// 음절 하나를 비운 화면 정중앙에 끝까지 키운다
async function grow(ch, fill, instant) {
    const items = decomposeSyllables(ch).filter(s => !s.isSpace);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const side = Math.min(W, H);
    const sylSize = (side * fill) / (2 * r.glyphExtent); // 화면에 보일 크기(CSS px)
    const gs = glyphScaleFor(r, sylSize);
    const u = syllablesToUniforms(items, [[0.5, 0.5]], sylSize / gs, r.layoutScale, (a, b) => r.screenToWorld(a, b), gs);
    r.clearAccum();
    if (instant) r.forceRebake(u, 1);
    else r.update(u, 1, items);
    await waitIdle();
}

// 누적 버퍼 가운데 정사각형 → PNG Blob
async function capture(size) {
    const tgt = r._accumTarget;
    const Q = Math.min(tgt.width, tgt.height);
    const out = size || Q;
    const cvs = readAccum(r, Math.floor((tgt.width - Q) / 2), Math.floor((tgt.height - Q) / 2), Q, Q, out, out);
    return { blob: await cvs.convertToBlob({ type: 'image/png' }), Q };
}

let running = false;
function setStatus(s) {
    $('status').textContent = s;
}

async function run() {
    const chars = [...new Set([...($('text').value.trim() || ks2350())].filter(c => c >= '가' && c <= '힣'))];
    const size = Math.max(0, parseInt($('size').value, 10) || 0);
    const fill = parseFloat($('fill').value) || 0.84;
    const dir = $('dir').value.trim() || 'mycelium';
    const instant = $('instant').checked;
    const pad = String(chars.length).length < 4 ? 4 : String(chars.length).length;
    const names = chars.map((c, i) => `${String(i + 1).padStart(pad, '0')}_${c}.png`);

    const existing = $('skip').checked ? await listSaved(dir) : new Set();

    const t0 = performance.now();
    let done = 0;
    let warned = '';
    for (let i = 0; i < chars.length && running; i++) {
        if (existing.has(names[i])) continue;
        let blob, Q;
        for (;;) {
            const rz = resizes;
            await grow(chars[i], fill, instant);
            if (rz !== resizes) continue; // 굽는 도중 창 크기가 바뀌었다 — 다시
            ({ blob, Q } = await capture(size));
            break;
        }
        if (size > Q) warned = `\n⚠️ 창 짧은 변×DPR=${Q}px < ${size}px — 확대 저장됨. 창을 키울 것`;
        await savePng(dir, names[i], blob);
        const prev = $('last').src;
        $('last').src = URL.createObjectURL(blob);
        if (prev) URL.revokeObjectURL(prev);

        done++;
        const per = (performance.now() - t0) / done;
        const left = chars.slice(i + 1).filter((_, k) => !existing.has(names[i + 1 + k])).length;
        setStatus(
            `${i + 1}/${chars.length}  ${chars[i]}  → bake/${dir}/${names[i]}\n` +
                `${(per / 1000).toFixed(2)}s/음절 · 남은 시간 ~${Math.ceil((per * left) / 60000)}분${warned}`,
        );
    }
    setStatus(`${running ? '완료' : '중지'} — 이번에 ${done}장 저장 (bake/${dir}/)${warned}`);
    r.clearAccum();
}

$('go').onclick = async () => {
    if (running) {
        running = false;
        $('go').textContent = '시작';
        return;
    }
    running = true;
    $('go').textContent = '중지';
    try {
        await run();
    } catch (e) {
        setStatus(`오류: ${e.message}`);
        console.error(e);
    }
    running = false;
    $('go').textContent = '시작';
};

const dpr = Math.min(window.devicePixelRatio, 2);
setStatus(`준비됨 — 창 짧은 변×DPR = ${Math.round(Math.min(innerWidth, innerHeight) * dpr)}px`);
if (q.get('auto') === '1') $('go').click();
