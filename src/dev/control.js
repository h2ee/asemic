// ── control.js ────────────────────────────────────────────────────────────────
// 가상 컨트롤 패널. 피지컬 패널과 똑같이 {t:'control', id, value}만 보낸다 —
// 이 페이지는 "무엇을 만졌는지"만 알고, 그 의미는 output-main.js applyControl이 정한다.
// 컨트롤 목록은 src/js/controls.js 한 곳에서 온다(버튼을 추가하면 여기 UI도 자동으로 생김).

import { CONTROLS } from '../js/controls.js';
import { createBridge } from './bridge.js';

const bridge = createBridge({ role: 'control' });
const $ = id => document.getElementById(id);

const status = $('status');
bridge.on('_open', () => {
    status.className = 'ok';
    status.textContent = '연결됨';
});
bridge.on('_close', () => {
    status.className = 'off';
    status.textContent = '연결 안 됨';
});

function send(id, value) {
    const msg = { t: 'control', id, value };
    bridge.send(msg);
    $('last').textContent = JSON.stringify(msg);
}

// ── 노브 ─────────────────────────────────────────────────────────────────────
// 270° 호. 세로 드래그 200px = 전 구간. 값 전송은 rAF당 한 번으로 묶는다.
const ARC = 270;
const R = 30;
const polar = deg => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [38 + R * Math.cos(a), 38 + R * Math.sin(a)];
};
const arcPath = (from, to) => {
    const [x0, y0] = polar(from);
    const [x1, y1] = polar(to);
    return `M${x0} ${y0} A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

function buildKnob(c) {
    const el = document.createElement('div');
    el.className = 'knob';
    el.innerHTML = `
        <svg viewBox="0 0 76 76">
            <path class="track" d="${arcPath(-ARC / 2, ARC / 2)}"/>
            <path class="val"/>
            <circle class="cap" cx="38" cy="38" r="21"/>
            <line class="tick" x1="38" y1="38" x2="38" y2="22"/>
        </svg>
        <span class="label">${c.label}</span><span class="num"></span>`;
    const val = el.querySelector('.val');
    const tick = el.querySelector('.tick');
    const num = el.querySelector('.num');

    let v = 0.5;
    let pending = false;
    const render = () => {
        const deg = -ARC / 2 + v * ARC;
        // 가운데(기본값)에서 현재 값까지 호를 칠한다
        val.setAttribute('d', v >= 0.5 ? arcPath(0, Math.max(deg, 0.01)) : arcPath(deg, 0));
        tick.setAttribute('transform', `rotate(${deg} 38 38)`);
        const mult = v < 0.5 ? c.min + (1 - c.min) * (v / 0.5) : 1 + (c.max - 1) * ((v - 0.5) / 0.5);
        num.textContent = `×${mult.toFixed(2)}`;
    };
    const set = nv => {
        v = Math.max(0, Math.min(1, nv));
        render();
        if (!pending) {
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                send(c.id, +v.toFixed(3));
            });
        }
    };

    const svg = el.querySelector('svg');
    svg.addEventListener('pointerdown', e => {
        svg.setPointerCapture(e.pointerId);
        const y0 = e.clientY;
        const v0 = v;
        const move = ev => set(v0 + (y0 - ev.clientY) / 200);
        const up = () => {
            svg.removeEventListener('pointermove', move);
            svg.removeEventListener('pointerup', up);
        };
        svg.addEventListener('pointermove', move);
        svg.addEventListener('pointerup', up);
    });
    svg.addEventListener('dblclick', () => set(0.5));
    svg.addEventListener('wheel', e => {
        e.preventDefault();
        set(v - Math.sign(e.deltaY) * 0.02);
    });
    render();
    return el;
}

// ── 버튼 / 토글 ──────────────────────────────────────────────────────────────
const KEYS = { preset1: '1', preset2: '2', preset3: '3', preset4: '4', joke: 'j', question: 'q', send: 'Enter', clear: 'Esc' };
const pressers = {};

function buildButton(c) {
    const b = document.createElement('button');
    b.innerHTML = `${c.label}<span class="key">${KEYS[c.id] ?? ''}${c.text ? ` · ${c.text}` : ''}</span>`;
    if (c.kind === 'toggle') {
        b.setAttribute('aria-pressed', 'false');
        pressers[c.id] = () => {
            const on = b.getAttribute('aria-pressed') !== 'true';
            b.setAttribute('aria-pressed', String(on));
            send(c.id, on ? 1 : 0);
        };
    } else {
        pressers[c.id] = () => {
            b.classList.add('flash');
            setTimeout(() => b.classList.remove('flash'), 120);
            send(c.id, 1);
        };
    }
    b.addEventListener('click', pressers[c.id]);
    return b;
}

for (const c of CONTROLS) {
    if (c.kind === 'knob') $('knobs').append(buildKnob(c));
    else if (c.kind === 'toggle') $('toggles').append(buildButton(c));
    else if (c.text) $('buttons').append(buildButton(c));
    else $('actions').append(buildButton(c));
}

// 키보드 단축키 — 1~4 프리셋, j/q 토글, Enter 보내기, Esc 지우기
window.addEventListener('keydown', e => {
    if (e.repeat) return;
    const key = e.key === 'Escape' ? 'Esc' : e.key;
    const id = Object.keys(KEYS).find(k => KEYS[k] === key);
    if (id && pressers[id]) {
        e.preventDefault();
        pressers[id]();
    }
});
