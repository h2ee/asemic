// ── sound.js ──────────────────────────────────────────────────────────────────
// 사물 공명 합성 엔진(WebAudio, 모드별 가산 합성). 무엇을 연주할지는 core.js voiceFor()가 정하고, 여기는 연주만 한다.
// main.js / output-main.js 가 같이 쓴다.
//
// AudioContext는 사용자 제스처 전엔 suspended일 수 있다 — unlock()을 keydown/pointerdown에 걸어 둔다.
// 꺼진 상태에서 play()가 오면 조용히 버린다(소리 때문에 화면 흐름이 멈추면 안 된다).

export function createSound({ enabled = true } = {}) {
    let ctx = null;
    let master = null;

    function ensure() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        // 밴드패스 여러 개가 겹쳐도 클리핑 안 나게 마지막에 컴프레서 한 단
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(comp).connect(ctx.destination);
        return ctx;
    }

    function unlock() {
        if (!enabled) return;
        const c = ensure();
        if (c && c.state !== 'running') c.resume().catch(() => {});
    }

    // 마지막으로 울린 음절 — 소리가 난 뒤에 받침이 붙으면(가 → 각) endLast로 끝맺음을 건다
    let last = null; // { h, syl }

    function play(v, syl = null) {
        if (!enabled || !v) return;
        const c = ensure();
        if (!c || c.state !== 'running') return;
        last = { h: schedule(c, master, v, c.currentTime), syl };
    }

    // late = core.lateEnding()의 결과 { jong, ending }
    function endLast(late) {
        if (!last || !late) return;
        applyEnding(last.h, late.ending);
        last.syl = { ...last.syl, jong: late.jong }; // 같은 받침으로 두 번 걸리지 않게
    }

    return {
        play,
        endLast,
        unlock,
        get lastSyl() {
            return last?.syl ?? null;
        },
        get state() {
            return ctx?.state ?? 'none';
        },
    };
}

// 음절 하나를 c 위에 t0부터 예약한다. 실시간(play)과 오프라인 렌더(renderOffline)가 같이 쓴다
// 모드 하나 = 오실레이터 하나(또는 'breath'면 노이즈 → 좁은 밴드패스) + 자기 감쇠 엔벨로프.
// 초성은 어택·접촉 노이즈·글라이드로, 종성은 울림 뒤쪽 엔벨로프(막기/이어지기/휘기)로 들어온다
function schedule(c, dest, v, t0) {
    const out = c.createGain();
    const tStop = t0 + v.length + 0.05;
    // 길이 상한(4초)에서 잘려도 딸깍 안 나게 끝을 페이드
    out.gain.setValueAtTime(v.gain, t0);
    out.gain.setValueAtTime(v.gain, tStop - 0.1);
    out.gain.linearRampToValueAtTime(0, tStop);
    out.connect(dest);
    const end = v.ending;
    const h = { c, out, v, t0, tStop, modes: [], srcs: [] };

    // ── 접촉 노이즈(치기·긁기·문지르기) + 종성 마찰의 쉿 소리
    const noises = [...(v.noise ?? [])];
    if (end?.hiss) noises.push({ ...end.hiss, at: end.at - end.hiss.dur });
    for (const n of noises) playNoise(c, out, n.center, n.q, t0 + n.at, n.dur, n.gain);

    // ── 모드
    for (const m of v.modes) {
        const voices = v.detune ? [-v.detune / 2, v.detune / 2] : [0];
        for (const dt of voices) {
            const env = c.createGain();
            const amp = m.amp / voices.length;
            const tA = t0 + v.attack;
            env.gain.setValueAtTime(0, t0);
            env.gain.linearRampToValueAtTime(amp, tA);
            if (v.gate) {
                // 삑 — 감쇠 없이 버티다 끊긴다. 종성 비음이면 길게 끈다
                const hold = end?.type === 'hum' ? 0.3 : end?.type === 'choke' ? 0.07 : 0.12;
                const tOff = t0 + Math.max(v.attack + 0.05, hold);
                env.gain.setValueAtTime(amp, tOff);
                env.gain.linearRampToValueAtTime(0, tOff + 0.01);
            } else {
                env.gain.setTargetAtTime(0, tA, m.tau);
                if (end?.type === 'choke') env.gain.setTargetAtTime(0, t0 + end.at, end.tau);
                if (end?.type === 'hum') env.gain.setTargetAtTime(0, t0 + end.at, m.tau * end.stretch);
            }
            env.connect(out);

            const freq = m.freq + dt;
            let src, fParam;
            if (v.wave === 'breath') {
                src = c.createBufferSource();
                src.buffer = noiseBuffer(c);
                src.loop = true;
                const bp = c.createBiquadFilter();
                bp.type = 'bandpass';
                bp.Q.value = v.q;
                fParam = bp.frequency;
                src.connect(bp);
                const g = c.createGain();
                g.gain.value = Math.sqrt(v.q) * 1.5; // 좁은 밴드는 에너지가 적다 — 대충 보정
                bp.connect(g).connect(env);
            } else {
                src = c.createOscillator();
                src.type = v.wave === 'square' ? 'square' : 'sine';
                fParam = src.frequency;
                if (v.wave === 'square') {
                    // 삑을 너무 날카롭지 않게
                    const lp = c.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.value = Math.min(freq * 4, 12000);
                    src.connect(lp).connect(env);
                } else src.connect(env);
            }
            fParam.setValueAtTime(v.glide ? freq * v.glide.from : freq, t0);
            if (v.glide) fParam.linearRampToValueAtTime(freq, t0 + v.glide.dur);
            if (end?.type === 'bend') {
                fParam.setValueAtTime(freq, t0 + end.at);
                fParam.linearRampToValueAtTime(freq * end.ratio, t0 + end.at + end.dur);
            }
            src.start(t0);
            src.stop(tStop);
            h.srcs.push(src);
            h.modes.push({ env, tau: m.tau, fParam, freq });
        }
    }
    h.timer = setTimeout(() => out.disconnect(), (tStop - c.currentTime + 0.2) * 1000);
    return h;
}

// 이미 울리고 있는 소리에 종성 끝맺음을 지금 건다 (타이핑 중엔 받침이 소리보다 늦게 온다)
function applyEnding(h, end) {
    const { c, v } = h;
    const now = c.currentTime;
    if (!end || now > h.tStop - 0.05) return;
    if (end.type === 'choke') {
        let tc = now;
        if (end.hiss) {
            playNoise(h.c, h.out, end.hiss.center, end.hiss.q, now, end.hiss.dur, end.hiss.gain);
            tc = now + end.hiss.dur;
        }
        for (const m of h.modes) {
            hold(m.env.gain, tc);
            m.env.gain.setTargetAtTime(0, tc, end.tau);
        }
    } else if (end.type === 'bend') {
        for (const m of h.modes) {
            hold(m.fParam, now);
            m.fParam.linearRampToValueAtTime(m.freq * end.ratio, now + end.dur);
        }
    } else if (end.type === 'hum' && !v.gate) {
        // 울림을 늘인다 — 소스 정지·끝 페이드도 같이 뒤로 민다
        const maxTau = Math.max(...h.modes.map(m => m.tau));
        const tStop = Math.min(now + maxTau * end.stretch * 5, h.t0 + 4) + 0.05;
        for (const m of h.modes) {
            hold(m.env.gain, now);
            m.env.gain.setTargetAtTime(0, now, m.tau * end.stretch);
        }
        if (tStop > h.tStop) {
            hold(h.out.gain, now);
            h.out.gain.setValueAtTime(v.gain, tStop - 0.1);
            h.out.gain.linearRampToValueAtTime(0, tStop);
            for (const s of h.srcs) s.stop(tStop);
            clearTimeout(h.timer);
            h.timer = setTimeout(() => h.out.disconnect(), (tStop - now + 0.2) * 1000);
            h.tStop = tStop;
        }
    }
}

// 예약된 자동화를 t에서 끊고 그 순간 값을 붙든다
function hold(param, t) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else {
        param.cancelScheduledValues(t);
        param.setValueAtTime(param.value, t);
    }
}

function playNoise(c, dest, center, q, ts, dur, gain) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = center;
    bp.Q.value = q;
    const g = c.createGain();
    const fade = Math.min(0.003, dur / 3);
    g.gain.setValueAtTime(0, ts);
    g.gain.linearRampToValueAtTime(gain, ts + fade);
    g.gain.setValueAtTime(gain, ts + dur - fade);
    g.gain.linearRampToValueAtTime(0, ts + dur);
    src.connect(bp).connect(g).connect(dest);
    src.start(ts);
    src.stop(ts + dur + 0.01);
}

// 1초짜리 백색 노이즈 — 컨텍스트마다 한 번 만든다
const _noise = new WeakMap();
function noiseBuffer(c) {
    let b = _noise.get(c);
    if (!b) {
        b = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        _noise.set(c, b);
    }
    return b;
}

// 디버깅용 — 음절 하나를 오프라인으로 렌더해 Float32Array로 돌려준다(화면/스피커 없이 파형 확인)
// late = { at, ending } 이면 at초에 늦은 종성 끝맺음을 건다(endLast 시뮬레이션)
export async function renderOffline(v, sampleRate = 44100, late = null) {
    const len = Math.ceil((Math.max(v.length, late ? 4 : 0) + 0.1) * sampleRate);
    const c = new OfflineAudioContext(1, len, sampleRate);
    const h = schedule(c, c.destination, v, 0);
    if (late) c.suspend(late.at).then(() => (applyEnding(h, late.ending), c.resume()));
    return (await c.startRendering()).getChannelData(0);
}
