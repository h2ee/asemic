// ── bake-text-others.js ───────────────────────────────────────────────────────
// bake-text.html의 mycelium 말고 나머지 수신자(2026-10-28). 셋 다 결과는 mycelium과 같은 "세로로 긴 PNG" —
// bakeEntry가 띠(strip) 목록 [{ strip, xOut, yOut }]과 종이 크기(outW, outH)를 돌려주면 bake-text.js가 붙여서 저장한다.
//
//   signal    — 줄 접기는 mycelium과 같은 breakLines(한 줄 최대 N음절). 줄 안 배치는 core.calcShelfLayout과 같은 규칙
//               (음절 크기 = calcSignalLatticeSize, 단어 사이 sylSize·0.6, 줄 높이 = 그 줄 최대, 단어는 세로 가운데).
//               페이지 하나를 통째로 한 receiver에 올리고 _animate를 가짜 60Hz로 직접 돌린다(bake.html makeSignalBake와 같은 시간축).
//                 typing — 음절을 interval ms마다 하나씩 넣는다(전시 타이핑처럼 앞 글자일수록 CA가 더 진행). 마지막 음절 뒤 after step
//                 steps  — 전부 한꺼번에 넣고 steps step(+settle). bake.html과 같다
//               페이지 가로 = 한 줄 최대 음절 × 가장 넓은 lattice(1.5·sylSize) — 어떤 줄도 넘치지 않게. 그래서 오른쪽이 보통 빈다.
//               캔버스가 너무 길면 세로로 나눠 그린다(단어 원점만 밀어서 같은 상태를 여러 번).
//               ss(슈퍼샘플)배로 그려서 띠를 뜰 때 출력 크기로 줄인다 — 셀 경계 안티에일리어싱.
//               ?flow=h — 접지 않고 텍스트 전체를 한 줄로(빈 줄 = sylSize 한 칸), 캔버스는 가로로 나눠 그린다. 출력 칸 = 세로
//               자간 ?ls — 전시 노브와 같이 음절 사이 (ls − 1)·sylSize, 띄어쓰기에도 더함. minSpacing(0.96) 아래로는 안 좁힘
//   dandelion — 전시 크기 그대로(음절 간격 wrapStep 100px, 줄 간격 sylSize × lineHeightRatio)라 창 안에서 줄 하나씩 굽는다.
//               줄마다 비우고 → 그 줄 단어들을 화면 세로 가운데 기준선에 놓고 flushQueue로 즉시 완성 → 합성 캔버스에서
//               페이지 가로 × 알파 세로 범위를 떠 온다. 해상도는 bake.html처럼 ?dpr(bake-text 기본 3). 단어가 줄을 넘으면 획도 끊긴다(전시와 같음)
//               ?flow=h — 굽기는 같고 줄(구간)을 아래 대신 오른쪽으로 이어 붙인다(같은 기준선). 구간 자리는 ctx.flowStarts,
//               띠 가로는 그 구간 알파 범위. 출력 세로(opts.outWidth)를 주면 다 붙인 뒤 한꺼번에 줄이거나 늘린다
//   sora      — 문장마다 보이지 않는 정사각 박스 하나, 박스는 읽는 순서로 한 줄 N개씩. 한 행은 캔버스 하나에 같이 그려서
//               옆 문장 원과 맞닿으면 메타볼처럼 이어진다. 원 자리는 자기 박스 안 랜덤(옆 박스 쪽으로 조금 넘어감, 아래 SORA_*),
//               반경은 전시와 같은 sylSize/550 × 0.25~1. 원 하나 = 단어 하나 = 그 단어의 마지막 음절(전시와 같음).
//               한 박스 최대 9단어(전시 한 화면) — 넘으면 다음 박스로

import { calcSignalLatticeSize } from '../js/core.js';
import { makeSignalBake, makeSoraBake, makeDandelionBake, alphaBounds } from './bake-common.js';
import { MAX_SYL as SORA_MAX_SLOTS, wordBoxSizes } from '../js/receivers/sora.js';

const VSYNC = 1000 / 60;
const CHUNK_PX = 8192; // signal 캔버스 한 번에 그릴 최대 세로(px)
const MAX_DRAW_AREA = 32e6; // signal 캔버스 최대 면적(px) — Chrome WebGL drawingBuffer 한도(≈ 3317만) 아래로
// 이벤트 루프에 한 번 양보(중지 버튼·상태 표시가 숨 쉬게). setTimeout은 백그라운드 탭에서 1초(오래 숨기면 1분)로
// 늘어나지만 MessageChannel은 안 늘어난다 — bake-common makeBakeReceiver와 같은 방식
const mc = new MessageChannel();
const yieldUI = () => new Promise(res => ((mc.port1.onmessage = res), mc.port2.postMessage(0)));

// 줄의 음절에 단어 번호를 wordId로 — signal·dandelion·sora는 wordId로 단어(= 획 / lattice 묶음 / 원)를 가른다
const withWordId = line => line.map(x => ({ ...x.syl, wordId: x.word }));

// 캔버스 영역 → 새 캔버스(outW×outH로 줄이거나 늘려서). bake-text.js mycelium도 쓴다
export function crop(src, x, y, w, h, outW = w, outH = h) {
    const out = new OffscreenCanvas(Math.max(1, outW), Math.max(1, outH));
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
    return out;
}

// ── signal ────────────────────────────────────────────────────────────────────
export async function makeSignalText() {
    const canvas = document.createElement('canvas');
    const { r } = await makeSignalBake(canvas);

    async function bakeEntry(text, opts, ctx) {
        const { perLine, outWidth, lh, sylSize: s, mode, interval, after, steps, settle, ss, edgePx } = opts;
        const H_FLOW = opts.flow === 'h';
        // 가로 굽기는 접지 않는다 — 문단마다 한 줄(breakLines 무한 폭)을 아래에서 전부 한 줄로 잇는다
        const lines = ctx.breakLines(text, H_FLOW ? Infinity : perLine);
        const PAD = s * 0.5;
        const WORD_GAP = s * 0.6; // core.js SHELF_WORD_GAP
        // 자간 — 전시 노브와 같은 규칙(core.layoutFor): 음절 사이 = (ls − 1)·sylSize(signal wrapStep = sylSize),
        // 띄어쓰기에도 더한다. receiver minSpacing 아래로는 안 좁힌다(더 겹치면 형태가 무너짐)
        const letterGap = (Math.max(opts.ls ?? 1, r.minSpacing ?? 0) - 1) * s;
        const lineGap = s * Math.max(0, lh - 1);

        // 배치(CSS px) — calcShelfLayout과 같은 규칙, 줄 구성만 breakLines
        const items = [];
        const centers = [];
        const widths = [];
        const heights = [];
        let rowTop = PAD;
        let x = PAD;
        let prevWord = null;
        let row = [];
        const placeRow = () => {
            if (!row.length) return;
            const wordH = new Map();
            for (const c of row) wordH.set(c.syl.wordId, Math.max(wordH.get(c.syl.wordId) ?? 0, c.height));
            const rowH = Math.max(...wordH.values());
            for (const c of row) {
                const top = rowTop + (rowH - wordH.get(c.syl.wordId)) * 0.5;
                items.push(c.syl);
                centers.push([c.x + c.width * 0.5, top + c.height * 0.5]);
                widths.push(c.width);
                heights.push(c.height);
            }
            rowTop += rowH + lineGap;
            row = [];
        };
        for (const line of lines) {
            if (!H_FLOW) {
                x = PAD;
                prevWord = null;
            }
            if (!line.length) {
                if (H_FLOW) x += s; // 빈 줄 = 한 칸 더
                else rowTop += s + lineGap; // 빈 줄 = 기본 크기 한 줄
                continue;
            }
            for (const it of line) {
                if (prevWord !== null) x += (it.word !== prevWord ? WORD_GAP : 0) + letterGap;
                const { width, height } = calcSignalLatticeSize(it.syl, s);
                row.push({ syl: { ...it.syl, wordId: it.word }, x, width, height });
                x += width;
                prevWord = it.word;
            }
            if (!H_FLOW) placeRow();
        }
        placeRow();
        // 세로 굽기 페이지 가로 = 한 줄 최대 음절 × 가장 넓은 lattice(1.5·sylSize) + 자간 — 어떤 줄도 넘치지 않게
        const Wc = H_FLOW ? x + PAD : 2 * PAD + perLine * 1.5 * s + Math.max(0, perLine - 1) * letterGap;
        const Hc = rowTop - lineGap + PAD;
        const pos = centers.map(([cx, cy]) => [cx / Wc, cy / Hc]);

        // 출력 배율 — 세로 굽기는 출력 가로, 가로 굽기는 출력 세로에 맞춘다. 0이면 CSS px × 2(전시 DPR 상한과 같은 선명도)
        const k = outWidth ? outWidth / (H_FLOW ? Hc : Wc) : 2;
        const outW = Math.round(Wc * k);
        const outH = Math.round(Hc * k);
        // 그리는 배율 = 출력 × ss(슈퍼샘플) — 띠를 뜰 때 출력 크기로 줄인다. 안 나누는 축이 GPU 한계를 넘으면 ss를 깎는다
        const gl = r._gl;
        if (gl.isContextLost()) throw new Error('WebGL 컨텍스트 손실 — 페이지를 새로고침할 것 (안 되면 크롬 재시작)');
        const maxPx = Math.min(gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0], gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
        const kr = k * Math.max(1, Math.min(ss ?? 1, maxPx / (H_FLOW ? outH : outW)));
        // 캔버스가 너무 길면 나눠 그린다 — 세로 굽기는 세로로, 가로 굽기는 가로로
        const along = H_FLOW ? Wc : Hc; // 나누는 축 길이(CSS px)
        const cross = Math.round((H_FLOW ? Hc : Wc) * kr); // 안 나누는 축(캔버스 px)
        const setChunk = a => {
            canvas.width = H_FLOW ? a : cross;
            canvas.height = H_FLOW ? cross : a;
        };
        // 청크 길이는 면적 한도 안에서 — 브라우저가 drawingBuffer를 말없이 줄이면(Chrome ≈ 3300만 px) 셰이더 좌표가
        // 어긋나 빈 PNG가 나온다(2026-10-28, 7음절 아닌 2음절 × 4320 × ss 2 = 8640×4320). 그래도 줄었으면 더 줄인다
        let chunkPx = Math.min(CHUNK_PX, Math.floor(MAX_DRAW_AREA / cross));
        for (;;) {
            setChunk(Math.min(Math.round(along * kr), chunkPx));
            if (gl.drawingBufferWidth === canvas.width && gl.drawingBufferHeight === canvas.height) break;
            if ((H_FLOW ? gl.drawingBufferHeight : gl.drawingBufferWidth) !== cross || chunkPx < 64)
                throw new Error(`캔버스 ${cross}px가 GPU 버퍼 한계를 넘음 — 출력 ${H_FLOW ? '세로' : '가로'}나 슈퍼샘플을 줄일 것`);
            chunkPx = Math.floor(chunkPx * 0.8);
        }
        const alongPx = H_FLOW ? canvas.width : canvas.height;
        const chunkCss = alongPx >= Math.round(along * kr) ? along : alongPx / kr;
        // 셀 가장자리 섞는 폭 — 전시값 GAP_PX 0.5 CSS px는 DPR 2에서 1 디바이스 px인데, 출력 배율 k면 0.5k px로
        // 번진다(k≈6이면 3px 흐림). edgePx > 0이면 출력 px로 고정(1 = 전시 DPR 2와 같은 픽셀 선명도)
        r._gapPxOverride = edgePx > 0 ? edgePx / k : null;

        r.clearAccum();
        // 시뮬레이션 동안은 페이지 전체 좌표로(_syncRows가 positions를 이 크기로 px로 바꾼다)
        r._cssWidth = Wc;
        r._cssHeight = Hc;
        // CA를 돌리는 동안엔 작은 캔버스로 — _animate가 프레임마다 그리기까지 하는데, 큰 캔버스(가로 굽기 청크 8192px)를
        // vsync 없이 연달아 그리면 명령이 쌓여 GPU 워치독에 걸려 컨텍스트를 잃는다(2026-11-01). CA·셀 보간은 CPU라
        // 캔버스 크기와 무관하다. 다 돌면 청크 크기로 되돌려 그린다
        const drawW = canvas.width;
        const drawH = canvas.height;
        canvas.width = canvas.height = 16;
        gl.viewport(0, 0, 16, 16);

        let t = performance.now(); // 신호등 cyclePhaseStart가 performance.now() 시계라 가짜 시간도 거기서
        r._lastStep = r._lastFrame = 0;
        const tick = () => {
            r._lastActivity = t; // 유휴 감속을 늘 피한다
            r._animate(t);
            cancelAnimationFrame(r._raf);
            t += VSYNC;
        };
        const feed = n => r.update(items.slice(0, n), pos.slice(0, n), ctx.JAMO, s, widths.slice(0, n), heights.slice(0, n));

        if (mode === 'typing') {
            const perSyl = Math.max(1, Math.round(interval / VSYNC));
            for (let n = 1; n <= items.length; n++) {
                if (!ctx.running()) return null;
                feed(n);
                if (n < items.length) for (let i = 0; i < perSyl; i++) tick();
                ctx.setStatus(`음절 ${n}/${items.length}`);
                if (n % 4 === 0) await yieldUI();
            }
            const target = r._stepCount + after;
            for (let g = 0; r._stepCount < target && g < 1e6; g++) tick();
        } else {
            feed(items.length);
            for (let g = 0; r._stepCount < steps && g < 1e6; g++) tick();
        }
        r._active = false; // 여기부터 CA는 안 돈다 — 텍스처 업로드·셀 크기 보간만
        if (settle) for (let i = 0; i < 600; i++) tick();
        else for (let i = 0; i < 3; i++) tick(); // 마지막 상태 업로드(24fps 스로틀 한 번 통과)
        if (!ctx.running()) return null;
        canvas.width = drawW;
        canvas.height = drawH;
        gl.viewport(0, 0, drawW, drawH);
        if (gl.isContextLost()) throw new Error('WebGL 컨텍스트 손실 — 페이지를 새로고침할 것 (안 되면 크롬 재시작)');

        // 나눠 그린다 — 단어 원점만 chunk 시작만큼 당기고, 해상도 기준을 chunk 크기로
        const strips = [];
        const words = r._rows.flat();
        const origins = words.map(w => [...w._origin]);
        for (let a = 0; a < along; a += chunkCss) {
            const n = Math.min(chunkCss, along - a);
            if (H_FLOW) r._cssWidth = chunkCss;
            else r._cssHeight = chunkCss;
            words.forEach((w, i) => (w._origin = H_FLOW ? [origins[i][0] - a, origins[i][1]] : [origins[i][0], origins[i][1] - a]));
            r._time = 0; // 신호등 NORMAL (captureFrame과 같음)
            r._draw();
            const strip = H_FLOW
                ? crop(canvas, 0, 0, Math.round(n * kr), canvas.height, Math.round(n * k), outH)
                : crop(canvas, 0, 0, canvas.width, Math.round(n * kr), outW, Math.round(n * k));
            strips.push({ strip, xOut: H_FLOW ? Math.round(a * k) : 0, yOut: H_FLOW ? 0 : Math.round(a * k) });
        }
        words.forEach((w, i) => (w._origin = origins[i]));
        r._cssWidth = Wc;
        r._cssHeight = Hc;
        r._gapPxOverride = null;
        r.clearAccum();
        return { strips, outW, outH, axis: H_FLOW ? 'x' : 'y', lines: lines.length };
    }
    return { r, bakeEntry };
}

// ── dandelion ─────────────────────────────────────────────────────────────────
export async function makeDandelionText(dpr) {
    const { r } = await makeDandelionBake(dpr);
    const WRAP = r.wrapStep; // 전시 음절 간격
    let M; // 페이지 좌우 여백(CSS px) — 획이 셀 밖으로 뻗는 만큼

    // 자간 opts.ls — 굽는 동안만 r.wrapStep(획 안 음절 간격, dandelion buildPts가 읽는다)을 바꾼다
    async function bakeEntry(text, opts, ctx) {
        r.wrapStep = WRAP * (opts.ls ?? 1);
        M = 1.5 * r.wrapStep;
        try {
            return await (opts.flow === 'h' ? bakeEntryH : bakeEntryV)(text, opts, ctx);
        } finally {
            r.wrapStep = WRAP;
        }
    }

    async function bakeEntryV(text, opts, ctx) {
        const { perLine, outWidth, lh } = opts;
        const lines = ctx.breakLines(text, perLine);
        const W = window.innerWidth;
        const H = window.innerHeight;
        const pitch = r.wrapStep;
        const Wp = 2 * M + perLine * pitch; // 페이지 가로(CSS px)
        if (Wp > W) throw new Error(`창 가로 ${W}px < 페이지 ${Math.ceil(Wp)}px — 창을 넓히거나 한 줄 음절 수를 줄일 것`);
        const lineH = r.sylSize * lh;
        const left = (W - Wp) / 2; // 창 안에서 페이지 왼쪽
        const strips = [];
        let clipped = 0;
        let d = 0; // 디바이스 px / CSS px (엔진 캔버스 배율)
        let kOut = 0; // 출력 px / 디바이스 px
        let nSyl = 0;
        for (let li = 0; li < lines.length; li++) {
            if (!ctx.running()) return null;
            const line = lines[li];
            if (!line.length) continue;
            r.clearAccum();
            // 앵커 = 음절 셀 왼쪽, 기준선 = 화면 세로 가운데. dandelion은 단어 첫 음절 앵커만 쓴다(나머지는 wrapStep씩)
            r.update(
                withWordId(line),
                line.map(x => [(left + M + x.u * pitch) / W, 0.5]),
                ctx.JAMO,
            );
            await r.flushQueue();
            const cvs = r._trail.captureCanvas();
            d = cvs.width / W;
            kOut ||= outWidth ? outWidth / Math.round(Wp * d) : 1;
            const b = alphaBounds(cvs);
            if (b) {
                const x0 = Math.round(left * d);
                const w = Math.round(Wp * d);
                if (b[0] < x0 || b[2] > x0 + w || b[1] === 0 || b[3] === cvs.height) clipped++;
                const yCss = li * lineH + b[1] / d - H / 2; // 이 줄 기준선 = 페이지 li·lineH
                strips.push({ strip: crop(cvs, x0, b[1], w, b[3] - b[1], Math.round(w * kOut), Math.round((b[3] - b[1]) * kOut)), yCss });
            }
            cvs.width = cvs.height = 0;
            nSyl += line.length;
            ctx.setStatus(`줄 ${li + 1}/${lines.length} · 음절 ${nSyl}`);
        }
        r.clearAccum();
        if (!strips.length) return { strips: [], outW: 1, outH: 1, lines: lines.length };
        // 종이 = 맨 윗 획 ~ 맨 아랫 획 + 위아래 여백 반 줄
        const pad = lineH * 0.25;
        const top = Math.min(...strips.map(s => s.yCss)) - pad;
        const kc = kOut * d; // CSS px → 출력 px
        const bottom = Math.max(...strips.map(s => s.yCss + s.strip.height / kc)) + pad;
        return {
            strips: strips.map(s => ({ strip: s.strip, xOut: 0, yOut: Math.round((s.yCss - top) * kc) })),
            outW: strips[0].strip.width,
            outH: Math.round((bottom - top) * kc),
            lines: lines.length,
            warn: [
                clipped ? `⚠️ ${clipped}줄이 페이지(또는 창) 밖으로 잘림` : '',
                kOut > 1 ? `⚠️ 원본 ${Math.round(Wp * d)}px < 출력 ${outWidth}px — 확대 저장됨. ?dpr= 를 올릴 것` : '',
            ]
                .filter(Boolean)
                .join('\n'),
        };
    }

    // 가로로 긴 PNG — 구간마다 같은 자리(창 가운데 페이지)에서 굽고, 종이 위 구간 자리만큼 오른쪽으로 옮겨 붙인다
    async function bakeEntryH(text, opts, ctx) {
        const { perLine, outWidth: outHeight } = opts;
        const lines = ctx.breakLines(text, perLine);
        const { starts } = ctx.flowStarts(lines);
        const W = window.innerWidth;
        const H = window.innerHeight;
        const pitch = r.wrapStep;
        const Wp = 2 * M + perLine * pitch;
        if (Wp > W) throw new Error(`창 가로 ${W}px < 페이지 ${Math.ceil(Wp)}px — 창을 넓히거나 한 구간 음절 수를 줄일 것`);
        const left = (W - Wp) / 2;
        const raw = []; // { strip(디바이스 px), xCss, yCss } — 종이 위 CSS px
        let clipped = 0;
        let d = 0;
        let nSyl = 0;
        for (let li = 0; li < lines.length; li++) {
            if (!ctx.running()) return null;
            const line = lines[li];
            if (!line.length) continue;
            r.clearAccum();
            r.update(
                withWordId(line),
                line.map(x => [(left + M + x.u * pitch) / W, 0.5]),
                ctx.JAMO,
            );
            await r.flushQueue();
            const cvs = r._trail.captureCanvas();
            d = cvs.width / W;
            const b = alphaBounds(cvs);
            if (b) {
                if (b[0] === 0 || b[2] === cvs.width || b[1] === 0 || b[3] === cvs.height) clipped++;
                // 종이 x = 구간 자리 + 창 안에서 첫 음절 셀 왼쪽(left + M) 기준 상대 위치. 기준선(창 가운데) = 종이 y 0
                raw.push({
                    strip: crop(cvs, b[0], b[1], b[2] - b[0], b[3] - b[1]),
                    xCss: starts[li] * pitch + b[0] / d - (left + M),
                    yCss: b[1] / d - H / 2,
                });
            }
            cvs.width = cvs.height = 0;
            nSyl += line.length;
            ctx.setStatus(`구간 ${li + 1}/${lines.length} · 음절 ${nSyl}`);
        }
        r.clearAccum();
        const unit = '구간';
        if (!raw.length) return { strips: [], outW: 1, outH: 1, axis: 'x', lines: lines.length, unit };
        // 종이 = 맨 왼쪽 ~ 맨 오른쪽 획, 맨 위 ~ 맨 아래 획 + 둘레 여백(줄 간격 1/4)
        const pad = r.sylSize * opts.lh * 0.25;
        const x0 = Math.min(...raw.map(s => s.xCss)) - pad;
        const x1 = Math.max(...raw.map(s => s.xCss + s.strip.width / d)) + pad;
        const y0 = Math.min(...raw.map(s => s.yCss)) - pad;
        const y1 = Math.max(...raw.map(s => s.yCss + s.strip.height / d)) + pad;
        const native = (y1 - y0) * d; // 원본 세로(디바이스 px)
        const kOut = outHeight ? outHeight / native : 1; // 출력 px / 디바이스 px
        const kc = kOut * d; // CSS px → 출력 px
        const fit = s => (kOut === 1 ? s : crop(s, 0, 0, s.width, s.height, Math.round(s.width * kOut), Math.round(s.height * kOut)));
        return {
            strips: raw.map(s => ({ strip: fit(s.strip), xOut: Math.round((s.xCss - x0) * kc), yOut: Math.round((s.yCss - y0) * kc) })),
            outW: Math.round((x1 - x0) * kc),
            outH: Math.round((y1 - y0) * kc),
            axis: 'x',
            lines: lines.length,
            unit,
            warn: [
                clipped ? `⚠️ ${clipped}구간이 창 밖으로 잘림` : '',
                kOut > 1 ? `⚠️ 원본 세로 ${Math.round(native)}px < 출력 ${outHeight}px — 확대 저장됨. ?dpr= 를 올릴 것` : '',
            ]
                .filter(Boolean)
                .join('\n'),
        };
    }
    return { r, bakeEntry };
}

// ── sora ──────────────────────────────────────────────────────────────────────
// 한 행(박스 N개)을 캔버스 하나에 같이 그린다 — 옆 문장 원과 맞닿으면 smin으로 이어진다.
// 원 자리는 자기 박스 안이되 여백을 전시(MARGIN 0.22 — 화면 밖으로 안 잘리게)보다 좁게, 옆 박스 쪽으로도
// 조금 넘어가게 둬서 박스 가운데로 뭉치지 않게 한다. 행 양 끝·위아래는 넘어가지 않는다(종이 밖)
const SORA_MARGIN = 0.12; // 박스 가장자리 여백(박스 한 변 배수)
const SORA_SPILL = 0.25; // 옆 박스 쪽으로 넘어갈 수 있는 폭(박스 한 변 배수)
const BOX_PAD = 0.2; // 행 둘레에 더 그리는 폭(박스 한 변 배수) — 반경 최대 0.27×1.2 - 여백 0.12 ≈ 0.2

export async function makeSoraText() {
    const canvas = document.createElement('canvas');
    const { r } = await makeSoraBake(canvas);
    r.maxWords = SORA_MAX_SLOTS; // 한 행의 단어를 한 번에 — 전시는 9

    async function bakeEntry(text, opts, ctx) {
        const { boxesPerRow, outWidth } = opts;
        // 문장 → 단어 9개(전시 한 화면)씩 박스 → 행(마지막 박스가 3개 이하면 앞 박스에 — sora wordBoxSizes).
        // 행의 단어가 셰이더 상한(32)을 넘으면 그 박스부터 다음 행
        const boxes = [];
        for (const words of ctx.splitSentences(text)) {
            let i = 0;
            for (const k of wordBoxSizes(words.length)) boxes.push(words.slice(i, (i += k)));
        }
        const rows = [];
        for (const b of boxes) {
            const row = rows[rows.length - 1];
            const n = row ? row.reduce((s, x) => s + x.length, 0) : 0;
            if (!row || row.length === boxesPerRow || n + b.length > SORA_MAX_SLOTS) rows.push([b]);
            else row.push(b);
        }

        const B = outWidth ? outWidth / boxesPerRow : 1080; // 박스 한 변(출력 px)
        const P = Math.round(B * BOX_PAD);
        const cw = Math.round(boxesPerRow * B + 2 * P); // 행 캔버스
        const ch = Math.round(B + 2 * P);
        const strips = [];
        let done = 0;
        for (let ri = 0; ri < rows.length; ri++) {
            if (!ctx.running()) return null;
            canvas.width = cw;
            canvas.height = ch;
            r.clearAccum();
            const items = [];
            let wid = 0;
            rows[ri].forEach((words, col) => {
                // x: 자기 박스 [MARGIN, 1-MARGIN]를 양옆 SPILL만큼 넓힌 범위(행 양 끝은 넘지 않게), y: [MARGIN, 1-MARGIN]
                const x0 = Math.max(SORA_MARGIN, col + SORA_MARGIN - SORA_SPILL);
                const x1 = Math.min(boxesPerRow - SORA_MARGIN, col + 1 - SORA_MARGIN + SORA_SPILL);
                for (const w of words) {
                    const bx = x0 + Math.random() * (x1 - x0);
                    const by = SORA_MARGIN + Math.random() * (1 - 2 * SORA_MARGIN);
                    r._wordPositions.set(wid, [(P + bx * B) / cw, (P + by * B) / ch]);
                    // 반경은 세로 uv 단위 — 전시와 같이 sylSize/550 × 0.25~1 (박스 한 변 기준)
                    r._wordRadii.set(wid, (r.sylSize / 550) * (Math.random() * 0.75 + 0.25) * (B / ch));
                    for (const syl of w) items.push({ ...syl, wordId: wid });
                    // 단어마다 따로 넣는다 — update()는 뒤에 단어가 있는 슬롯을 "완성"으로 보고 안 바꾼다(전시 타이핑 순서).
                    // 한꺼번에 넣으면 마지막 단어만 제 모양이 되고 나머지는 초기값(m 2, n 3, 중간 색) 그대로다
                    r.update(items.slice(), [], ctx.JAMO);
                    wid++;
                }
            });
            // makeSoraBake.draw와 같은 스냅 — 모프·파동 끝
            for (let i = 0; i < r._cells.length; i++) {
                r._prevCells[i] = [...r._cells[i]];
                r._prevRipple[i] = [...r._ripple[i]];
                r._morphStart[i] = -999;
                r._waveStart[i] = -999;
            }
            r._render();
            strips.push({ strip: crop(canvas, 0, 0, cw, ch), xOut: 0, yOut: Math.round(ri * B) });
            done += rows[ri].length;
            ctx.setStatus(`박스 ${done}/${boxes.length}`);
            await yieldUI();
        }
        r.clearAccum();
        return { strips, outW: cw, outH: Math.round(rows.length * B + 2 * P), lines: boxes.length, unit: '박스' };
    }
    return { r, bakeEntry };
}
