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
//
// ?receiver=sora — 클라드니 원 하나 = 음절 하나(bake-common.js makeSoraBake). 창 크기와 무관하게
// 출력 크기 캔버스에 바로 그린다(size=0이면 창 짧은 변×DPR). fill = 보이는 원 지름 비율.
// sora 선은 fwidth 기반 ~1px라 출력이 클수록 원에 비해 선이 가늘어진다(전시 원 지름은 대략 수백 px).
// 종성은 나선 잔물결만 바꾼다(2026-10-28) — 받침만 다른 음절은 본체가 같고 결만 다르다.
//
// ?receiver=signal — 음절 하나 = lattice 하나(bake-common.js makeSignalBake). ?steps=N 이면 CA를 N step
// (전시 시간으로 N×0.14초) 돌린 순간을 굽는다. ?settle=1 이면 그 뒤 셀 크기 보간이 끝날 때까지 기다린다.
// ?sylsize= 음절 기준 크기(CSS px, 기본 receiver 값) — 셀은 12px 고정이라 이게 셀 개수를 정한다.
// 파일 이름에 step이 붙는다(NNNN_가_s12.png).
//
// ?receiver=dandelion — 음절 하나 = 단어 하나 = 획 하나(bake-common.js makeDandelionBake). 전시 크기 그대로
// 그려 완성 직후(main bead가 실선 오른쪽 끝에 막 선 순간)를 찍고, 알파 범위 가운데를 중심으로 ?box=(CSS px)
// 정사각형을 잘라낸다. 원본 해상도 = box × DPR — ?dpr=2(기본)로 엔진 배율을 고정해 기기와 무관하게 맞춘다.
// 글자가 box를 넘으면 상태에 '잘림'이 뜬다. 엔진이 rAF로 도니 굽는 동안 탭을 앞에 둘 것.
// ?dandelion=invert 도 그대로 먹는다(엔진이 location을 직접 읽음).

import { decomposeSyllables, syllablesToUniforms, JAMO } from '../js/core.js';
import {
    makeBakeReceiver,
    makeSoraBake,
    makeSignalBake,
    makeDandelionBake,
    alphaBounds,
    glyphScaleFor,
    readAccum,
    listSaved,
    savePng,
} from './bake-common.js';

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

const RECEIVER = ['sora', 'signal', 'dandelion'].includes(q.get('receiver')) ? q.get('receiver') : 'mycelium';
$('receiver').value = RECEIVER;
$('receiver').onchange = () => {
    q.set('receiver', $('receiver').value);
    q.delete('dir');
    location.search = q.toString();
};
if (RECEIVER !== 'mycelium') $('instant-row').style.display = 'none'; // sora는 모프를 스냅, signal은 step으로 정한다
if (RECEIVER !== 'signal') for (const el of document.querySelectorAll('.signal-row')) el.style.display = 'none';
if (RECEIVER !== 'dandelion') for (const el of document.querySelectorAll('.dandelion-row')) el.style.display = 'none';
else $('fill-row').style.display = 'none'; // dandelion은 글자 크기가 전시 그대로 — 비율 대신 box로 자른다

$('text').value = q.get('text') ?? '';
$('size').value = q.get('size') ?? 1080;
$('fill').value = q.get('fill') ?? 0.84;
$('dir').value = q.get('dir') ?? RECEIVER;
$('instant').checked = q.get('instant') === '1';
$('steps').value = q.get('steps') ?? 0;
$('settle').checked = q.get('settle') === '1';
$('box').value = q.get('box') ?? 540;

let r, waitIdle, sora, signal, dandelion;
if (RECEIVER === 'mycelium') ({ r, waitIdle } = await makeBakeReceiver());
else if (RECEIVER === 'dandelion') dandelion = await makeDandelionBake(Number(q.get('dpr') ?? 2));
else {
    const cvs = document.createElement('canvas');
    cvs.id = `${RECEIVER}-canvas`;
    document.body.appendChild(cvs);
    if (RECEIVER === 'sora') sora = await makeSoraBake(cvs);
    else {
        signal = await makeSignalBake(cvs);
        $('sylsize').value = q.get('sylsize') ?? signal.r.sylSize;
    }
}

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

// sora: 출력 크기 캔버스에 바로 한 장
async function bakeSora(ch, fill, size) {
    const items = decomposeSyllables(ch).filter(s => !s.isSpace);
    const side = size || Math.round(Math.min(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2));
    sora.draw(items, JAMO, side, fill);
    const cvs = sora.r._canvas;
    const blob = await new Promise(res => cvs.toBlob(res, 'image/png'));
    return { blob, Q: side };
}

// signal: CA를 steps만큼 돌린 순간을 출력 크기 캔버스에 한 장
async function bakeSignal(ch, fill, size, steps, settle) {
    const items = decomposeSyllables(ch).filter(s => !s.isSpace);
    const side = size || Math.round(Math.min(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2));
    const sylSize = Math.max(24, parseFloat($('sylsize').value) || signal.r.sylSize);
    signal.draw(items, JAMO, side, fill, steps, settle, sylSize);
    await new Promise(res => setTimeout(res)); // 몇백 step이면 한 음절이 길다 — 화면·중지 버튼이 숨 쉬게
    const cvs = signal.r._canvas;
    const blob = await new Promise(res => cvs.toBlob(res, 'image/png'));
    return { blob, Q: side };
}

// dandelion: 완성 직후 합성 캔버스에서 알파 범위 가운데를 중심으로 box(CSS px) 정사각형
async function bakeDandelion(ch, size, box) {
    const items = decomposeSyllables(ch).filter(s => !s.isSpace);
    const cvs = await dandelion.draw(items, JAMO);
    const dpr = cvs.width / window.innerWidth;
    const b = alphaBounds(cvs);
    const Q = Math.round(box * dpr);
    const out = new OffscreenCanvas(size || Q, size || Q);
    if (!b) return { blob: await out.convertToBlob({ type: 'image/png' }), Q, ext: [0, 0], clipped: false };
    const x0 = Math.round((b[0] + b[2] - Q) / 2);
    const y0 = Math.round((b[1] + b[3] - Q) / 2);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cvs, x0, y0, Q, Q, 0, 0, out.width, out.height);
    const ext = [(b[2] - b[0]) / dpr, (b[3] - b[1]) / dpr]; // 글자 범위(CSS px)
    // 화면 가장자리에 닿았으면 창 밖으로도 잘린 것
    const clipped = Math.max(...ext) > box || b[0] === 0 || b[1] === 0 || b[2] === cvs.width || b[3] === cvs.height;
    return { blob: await out.convertToBlob({ type: 'image/png' }), Q, ext, clipped };
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
    const dir = $('dir').value.trim() || RECEIVER;
    const instant = $('instant').checked;
    const steps = Math.max(0, parseInt($('steps').value, 10) || 0);
    const settle = $('settle').checked;
    const box = Math.max(16, parseFloat($('box').value) || 540);
    const pad = String(chars.length).length < 4 ? 4 : String(chars.length).length;
    const tag = signal ? `_s${steps}${settle ? 'z' : ''}` : '';
    const names = chars.map((c, i) => `${String(i + 1).padStart(pad, '0')}_${c}${tag}.png`);

    const existing = $('skip').checked ? await listSaved(dir) : new Set();

    const t0 = performance.now();
    let done = 0;
    let warned = '';
    const maxExt = [0, 0]; // dandelion — 이번에 구운 글자 중 가장 큰 범위(CSS px), box 정하는 기준
    const clippedChars = [];
    for (let i = 0; i < chars.length && running; i++) {
        if (existing.has(names[i])) continue;
        let blob, Q;
        if (sora) ({ blob, Q } = await bakeSora(chars[i], fill, size));
        else if (signal) ({ blob, Q } = await bakeSignal(chars[i], fill, size, steps, settle));
        else if (dandelion) for (;;) {
            const rz = resizes;
            let ext, clipped;
            ({ blob, Q, ext, clipped } = await bakeDandelion(chars[i], size, box));
            if (rz !== resizes) continue; // 굽는 도중 창 크기가 바뀌었다 — 다시
            maxExt[0] = Math.max(maxExt[0], Math.ceil(ext[0]));
            maxExt[1] = Math.max(maxExt[1], Math.ceil(ext[1]));
            if (clipped) clippedChars.push(chars[i]);
            break;
        }
        else for (;;) {
            const rz = resizes;
            await grow(chars[i], fill, instant);
            if (rz !== resizes) continue; // 굽는 도중 창 크기가 바뀌었다 — 다시
            ({ blob, Q } = await capture(size));
            break;
        }
        if (!dandelion && size > Q) warned = `\n⚠️ 창 짧은 변×DPR=${Q}px < ${size}px — 확대 저장됨. 창을 키울 것`;
        if (dandelion)
            warned =
                `\n가장 큰 글자 ${maxExt[0]}×${maxExt[1]}px (box ${box})` +
                (clippedChars.length
                    ? `\n⚠️ 잘림 ${clippedChars.length}자: ${clippedChars.slice(-20).join('')} — box(또는 창)를 키울 것`
                    : '') +
                (size > Q ? `\n⚠️ box×DPR=${Q}px < ${size}px — 확대 저장됨` : '');
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
    (sora?.r ?? signal?.r ?? dandelion?.r ?? r).clearAccum();
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
if (dandelion)
    setStatus(
        `준비됨 (dandelion) — DPR ${window.devicePixelRatio}, 원본 box×DPR px 정사각\n굽는 동안 탭을 앞에 둘 것 (엔진이 rAF로 돈다)`,
    );
else if (sora || signal) setStatus(`준비됨 (${RECEIVER}) — 출력 ${$('size').value || '창 짧은 변×DPR'}px 정사각`);
else setStatus(`준비됨 — 창 짧은 변×DPR = ${Math.round(Math.min(innerWidth, innerHeight) * dpr)}px`);
if (q.get('auto') === '1') $('go').click();
