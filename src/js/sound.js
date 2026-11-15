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

    // 덧소리 — 마지막 음절(endLast 대상)을 건드리지 않는다 (dandelion 비드 읽기)
    function playAux(v) {
        if (!enabled || !v) return;
        const c = ensure();
        if (!c || c.state !== 'running') return;
        for (const one of Array.isArray(v) ? v : [v]) schedule(c, master, one, c.currentTime); // 배열 = 같이 울릴 여러 voice(테이프 조각 + 스크래치)
    }

    return {
        play,
        playAux,
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
    const end = v.ending;
    // extras = 종성 막기에 같이 잡히는 덧소리(파도 등) / nodes = 끝나면 끊을 노드(되먹임 고리 포함)
    const h = { c, out, v, t0, tStop, modes: [], srcs: [], extras: [], nodes: [out], sends: {} };

    // ── 뒷단: 포화 → 좌우 자리 → 출력 + 이펙트 버스로 보내기. 전부 opt-in — 안 주면(signal) 예전처럼 out → dest
    let post = out;
    if (v.crush) {
        const ws = c.createWaveShaper();
        ws.curve = crushCurve(v.crush);
        post = post.connect(ws);
        h.nodes.push(ws);
    }
    if (v.drive) {
        const ws = c.createWaveShaper();
        ws.curve = driveCurve(v.drive);
        ws.oversample = '2x';
        post = post.connect(ws);
        h.nodes.push(ws);
    }
    if (v.pan != null || v.panLfo) {
        const p = c.createStereoPanner();
        p.pan.value = v.pan ?? 0;
        if (v.panLfo) h.srcs.push(lfo(c, p.pan, v.panLfo.rate, v.panLfo.depth, t0, tStop, h));
        post = post.connect(p);
        h.nodes.push(p);
    }
    post.connect(dest);
    if (v.fx) {
        const bus = fxBus(c, dest, v.fx);
        for (const k of ['delay', 'reverb']) {
            if (!v.send?.[k] || !bus[k]) continue;
            const g = c.createGain();
            g.gain.value = v.send[k];
            post.connect(g).connect(bus[k]);
            h.nodes.push(g);
            h.sends[k] = g;
        }
    }

    // ── 접촉 노이즈(치기·긁기·문지르기) + 종성 마찰의 쉿 소리
    const noises = [...(v.noise ?? [])];
    if (end?.hiss) noises.push({ ...end.hiss, at: end.at - end.hiss.dur });
    for (const n of noises) playNoise(c, out, n.center, n.q, t0 + n.at, n.dur, n.gain);
    // 펄스마다 딸깍 (first가 아니면 첫 펄스는 초성 접촉 노이즈가 맡는다)
    if (v.click) for (const p of v.pulses.slice(v.click.first ? 0 : 1)) playNoise(c, out, v.click.center, v.click.q ?? 1, t0 + p.at, v.click.dur, v.click.gain * p.amp);

    // 주파수 자동화 하나 — 초성 글라이드 / 전자 피치 낙하 / 종성 휘기. 반송파·변조기가 같이 쓴다
    function pitch(param, f) {
        if (v.pulses && v.drop) {
            // 펄스마다 다시 떨어진다. 휘기 받침이면 그 뒤 펄스는 휜 음높이로
            for (const p of v.pulses) {
                const ff = end?.type === 'bend' && p.at >= end.at ? f * end.ratio : f;
                param.setValueAtTime(ff * v.drop.from, t0 + p.at);
                param.exponentialRampToValueAtTime(ff, t0 + p.at + v.drop.dur);
            }
            return;
        }
        if (v.glide) {
            param.setValueAtTime(f * v.glide.from, t0);
            param.linearRampToValueAtTime(f, t0 + v.glide.dur);
        } else if (v.drop) {
            param.setValueAtTime(f * v.drop.from, t0);
            param.exponentialRampToValueAtTime(f, t0 + v.drop.dur);
        } else param.setValueAtTime(f, t0);
        if (end?.type === 'bend') {
            param.setValueAtTime(f, t0 + end.at);
            param.linearRampToValueAtTime(f * end.ratio, t0 + end.at + end.dur);
        }
    }

    // ── 모드
    for (const m of v.modes) {
        const voices = v.detune && !m.sub ? [-v.detune / 2, v.detune / 2] : [0];
        for (const dt of voices) {
            const env = c.createGain();
            const amp = m.amp / voices.length;
            const tA = t0 + Math.max(v.attack, m.sub ? 0 : v.toneAttack ?? 0); // toneAttack = 음이 천천히 차오름(sora — 파도와 녹게)
            env.gain.setValueAtTime(0, t0);
            env.gain.linearRampToValueAtTime(amp, tA);
            if (v.pulses) {
                // 스파이크 열 — 펄스마다 짧게 치고 사그라든다. 막기 받침은 voiceFor가 펄스를 끊어 두었고, 비음 받침은 그 뒤 펄스를 길게
                env.gain.setTargetAtTime(0, tA, m.tau);
                for (const p of v.pulses.slice(1)) {
                    const t = t0 + p.at;
                    const tau = m.tau * (end?.type === 'hum' && p.at >= end.at ? end.stretch : 1);
                    env.gain.setValueAtTime(0, t);
                    env.gain.linearRampToValueAtTime(amp * p.amp, t + 0.002);
                    env.gain.setTargetAtTime(0, t + 0.002, tau);
                }
            } else if (v.gate) {
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
            const fParams = [];
            const wave = m.wave ?? v.wave; // 모드마다 덮어쓸 수 있다(비드 읽기 — 휘파람 + 부채 사인)
            if (wave === 'breath' && !m.sub) {
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
                // 바람 떨림 — 밴드 중심을 LFO로 흔든다
                if (v.flutter) h.srcs.push(lfo(c, bp.frequency, v.flutter.rate, freq * v.flutter.depth, t0, tStop, h));
            } else {
                src = c.createOscillator();
                src.type = m.sub ? 'sine' : wave === 'square' ? 'square' : wave === 'saw' ? 'sawtooth' : 'sine';
                fParam = src.frequency;
                if (wave === 'square' || wave === 'saw') {
                    // 삑·톱니를 너무 날카롭지 않게
                    const lp = c.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.value = Math.min(freq * 4, 12000);
                    src.connect(lp).connect(env);
                } else src.connect(env);
                // FM — 사인 변조기가 반송파 주파수를 흔든다. 깊이는 어택 뒤 decay초에 sustain까지 줄어 '똑' 하고 맑아진다
                if (v.fm && !m.sub) {
                    const mod = c.createOscillator();
                    const mf = freq * v.fm.ratio;
                    const mg = c.createGain();
                    const idx = freq * v.fm.index;
                    mg.gain.setValueAtTime(idx, t0);
                    mg.gain.setTargetAtTime(idx * (v.fm.sustain ?? 0), t0 + v.attack, v.fm.decay);
                    mod.connect(mg).connect(src.frequency);
                    pitch(mod.frequency, mf);
                    mod.start(t0);
                    mod.stop(tStop);
                    h.srcs.push(mod);
                    fParams.push({ p: mod.frequency, f: mf });
                }
            }
            pitch(fParam, freq);
            fParams.push({ p: fParam, f: freq });
            src.start(t0);
            src.stop(tStop);
            h.srcs.push(src);
            h.modes.push({ env, tau: m.tau, fParams, freq });
        }
    }

    // ── 파도(소라) — 노이즈 → 쓸어 가는 밴드패스 → 콤 공명(되먹임 지연 = 소라 속 공기 기둥). 밀려왔다 빠진다
    if (v.wash) {
        const w = v.wash;
        const src = c.createBufferSource();
        src.buffer = noiseBuffer(c);
        src.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = w.q ?? 0.9;
        bp.frequency.setValueAtTime(w.sweep[0], t0);
        bp.frequency.exponentialRampToValueAtTime(w.sweep[1], t0 + w.dur * 0.35);
        bp.frequency.exponentialRampToValueAtTime(w.sweep[2], t0 + w.dur);
        const sum = c.createGain();
        const dl = c.createDelay(0.05);
        dl.delayTime.value = 1 / w.f0; // 되먹임 고리 안이라 최소 128샘플(≈2.9ms) — f0 ≤ 300Hz로 묶어 둔 이유
        const damp = c.createBiquadFilter();
        damp.type = 'lowpass';
        damp.frequency.value = w.damp;
        damp.Q.value = -3.01; // 버터워스(봉우리 없음). WebAudio 기본 Q(1dB)면 봉우리 × fb가 1을 넘어 고리가 폭주한다
        const fb = c.createGain();
        fb.gain.value = w.fb;
        src.connect(bp).connect(sum);
        sum.connect(dl).connect(damp).connect(fb).connect(sum);
        const env = c.createGain();
        const tPeak = t0 + w.dur * 0.35;
        env.gain.setValueAtTime(0, t0);
        env.gain.linearRampToValueAtTime(w.gain, tPeak);
        env.gain.setTargetAtTime(0, tPeak, w.dur * 0.3);
        sum.connect(env).connect(out);
        // 파도가 유리를 울린다 — 같은 파도 노이즈를 유리 배음(모드) 주파수의 좁은 공명 필터에 통과시켜 env에 더한다.
        // 음이 파도에서 배어 나와 같이 차오르고 빠진다(따로 치는 '팅'과 녹이는 자리)
        if (w.sing) {
            for (const m of v.modes) {
                if (m.sub) continue;
                const rb = c.createBiquadFilter();
                rb.type = 'bandpass';
                rb.frequency.value = m.freq;
                rb.Q.value = w.sing.q;
                const rg = c.createGain();
                rg.gain.value = m.amp * w.sing.amt * Math.sqrt(w.sing.q); // 좁은 밴드는 에너지가 적다 — breath와 같은 보정
                sum.connect(rb).connect(rg).connect(env);
                h.nodes.push(rb, rg);
            }
        }
        src.start(t0);
        src.stop(tStop);
        h.srcs.push(src);
        if (!w.keep) h.extras.push(env); // keep이면 받침 막기에도 파도는 이어진다
        h.nodes.push(sum, dl, damp, fb, env);
    }

    // ── 씨앗 알갱이(민들레) — 짧은 사인이 살짝 위로 휘며 좌우로 흩어진다. 종성 막기에도 안 잡힌다(바람이 데려간다)
    for (const g of v.grains ?? []) {
        const ts = t0 + g.at;
        const p = c.createStereoPanner();
        p.pan.value = g.pan;
        p.connect(out);
        if (g.kind === 'noise') {
            // 크래클 — 노이즈 딸깍 한 알
            playNoise(c, p, g.freq, g.q ?? 4, ts, g.dur, g.amp);
            continue;
        }
        const o = c.createOscillator();
        o.frequency.setValueAtTime(g.freq, ts);
        o.frequency.exponentialRampToValueAtTime(g.freq * g.lift, ts + g.dur * 2);
        const e = c.createGain();
        e.gain.setValueAtTime(0, ts);
        e.gain.linearRampToValueAtTime(g.amp, ts + 0.002);
        e.gain.setTargetAtTime(0, ts + 0.002, g.dur / 3);
        o.connect(e).connect(p);
        o.start(ts);
        o.stop(Math.min(ts + g.dur * 2 + 0.01, tStop));
        h.srcs.push(o);
    }

    h.timer = setTimeout(() => h.nodes.forEach(n => n.disconnect()), (tStop - c.currentTime + 0.2) * 1000);
    return h;
}

// 사인 LFO 하나를 param에 더한다(param의 자동화 값 ± depth)
function lfo(c, param, rate, depth, t0, tStop, h) {
    const o = c.createOscillator();
    o.frequency.value = rate;
    const g = c.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start(t0);
    o.stop(tStop);
    h.nodes.push(g);
    return o;
}

// 비트크러시 — 진폭을 2^bits 계단으로. 곡선 점이 많아야 계단이 선다(WaveShaper는 점 사이를 선형 보간)
function crushCurve(bits) {
    const key = 'crush' + bits;
    let cv = _curves.get(key);
    if (!cv) {
        const L = 2 ** (bits - 1);
        cv = new Float32Array(8192);
        for (let i = 0; i < cv.length; i++) cv[i] = Math.round(((i / (cv.length - 1)) * 2 - 1) * L) / L;
        _curves.set(key, cv);
    }
    return cv;
}

// tanh 포화 곡선 — 끝값이 ±1이 되게 정규화(작은 소리는 거의 그대로, 큰 소리만 둥글게 눌림)
const _curves = new Map();
function driveCurve(k) {
    let cv = _curves.get(k);
    if (!cv) {
        cv = new Float32Array(1024);
        for (let i = 0; i < cv.length; i++) {
            const x = (i / (cv.length - 1)) * 2 - 1;
            cv[i] = Math.tanh(k * x) / Math.tanh(k);
        }
        _curves.set(k, cv);
    }
    return cv;
}

// receiver마다 공유 이펙트 버스 하나 — { delay, reverb } 입력 노드. 꼬리가 음절보다 오래 가도 버스는 계속 산다.
// dest(실시간 = master, 오프라인 = destination)마다 따로 만든다
const _fx = new WeakMap();
function fxBus(c, dest, spec) {
    let byKey = _fx.get(dest);
    if (!byKey) _fx.set(dest, (byKey = new Map()));
    let bus = byKey.get(spec.key);
    if (bus) return bus;
    bus = {};
    if (spec.delay) {
        // 핑퐁 — 왼쪽 지연 → (어두워짐) → 오른쪽 지연 → (어두워짐) → 되먹임. 메아리가 좌우를 오가며 사그라든다
        const D = spec.delay;
        const input = c.createGain();
        const tone = () => {
            const f = c.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = D.tone;
            f.Q.value = -3.01; // 되먹임 고리 안 — 봉우리 없게
            return f;
        };
        const dL = c.createDelay(2);
        dL.delayTime.value = D.time;
        const lpL = tone();
        const fb = c.createGain();
        fb.gain.value = D.feedback;
        input.connect(dL).connect(lpL);
        if (D.pingpong) {
            const merge = c.createChannelMerger(2);
            const dR = c.createDelay(2);
            dR.delayTime.value = D.time;
            const lpR = tone();
            lpL.connect(merge, 0, 0);
            lpL.connect(dR).connect(lpR);
            lpR.connect(merge, 0, 1);
            lpR.connect(fb).connect(dL);
            merge.connect(dest);
        } else {
            lpL.connect(dest);
            lpL.connect(fb).connect(dL);
        }
        bus.delay = input;
    }
    if (spec.reverb) {
        const conv = c.createConvolver();
        conv.buffer = impulse(c, spec.reverb.time, spec.reverb.tone);
        conv.connect(dest);
        bus.reverb = conv;
    }
    byKey.set(spec.key, bus);
    return bus;
}

// 잔향 임펄스 — 지수 감쇠 스테레오 노이즈, 한 극 저역통과로 tone Hz 위를 깎는다
function impulse(c, time, tone) {
    const sr = c.sampleRate;
    const len = Math.ceil(time * sr);
    const b = c.createBuffer(2, len, sr);
    const a = Math.exp((-2 * Math.PI * tone) / sr);
    for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let y = 0;
        for (let i = 0; i < len; i++) {
            y = (1 - a) * (Math.random() * 2 - 1) + a * y;
            d[i] = y * Math.exp((-6.9 * i) / len);
        }
    }
    return b;
}

// 이미 울리고 있는 소리에 종성 끝맺음을 지금 건다 (타이핑 중엔 받침이 소리보다 늦게 온다)
function applyEnding(h, end) {
    const { c, v } = h;
    const now = c.currentTime;
    if (!end || now > h.tStop - 0.05) return;
    // 받침이 붙으면 메아리가 더 멀리 (mycelium link — 연결 실이 생기는 조건)
    if (v.sendLinked && h.sends.delay) {
        hold(h.sends.delay.gain, now);
        h.sends.delay.gain.setTargetAtTime(v.sendLinked.delay, now, 0.01);
    }
    if (end.type === 'choke') {
        let tc = now;
        if (end.hiss) {
            playNoise(h.c, h.out, end.hiss.center, end.hiss.q, now, end.hiss.dur, end.hiss.gain);
            tc = now + end.hiss.dur;
        }
        for (const env of [...h.modes.map(m => m.env), ...h.extras]) {
            hold(env.gain, tc);
            env.gain.setTargetAtTime(0, tc, end.tau);
        }
    } else if (end.type === 'bend') {
        for (const m of h.modes) {
            for (const { p, f } of m.fParams) {
                hold(p, now);
                p.linearRampToValueAtTime(f * end.ratio, now + end.dur);
            }
        }
    } else if (end.type === 'hum' && !v.gate && !v.pulses) { // 펄스 열은 그대로 둔다(늘이면 남은 펄스가 지워진다)
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
