// ── control.js ────────────────────────────────────────────────────────────────
// 가상 컨트롤 패널. 피지컬 패널과 똑같이 {t:'control', id, value}만 보낸다 —
// 이 페이지는 "무엇을 만졌는지"만 알고, 그 의미는 output-main.js applyControl이 정한다.
// 컨트롤 목록은 src/js/controls.js 한 곳에서 온다(버튼을 추가하면 여기 UI도 자동으로 생김).

import { CONTROLS, knobToMult } from '../js/controls.js';
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

const setters = {}; // id → 값 직접 설정(노브/슬라이더/토글) — USB 패널이 화면을 따라 움직이게

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
        num.textContent = `×${knobToMult(c, v).toFixed(2)}`;
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
    setters[c.id] = set;
    return el;
}

// ── 슬라이더 (ui:'slider') ────────────────────────────────────────────────────
// 실물 페이더 모양. 값 의미는 노브와 같다(0~1, 가운데 = 기본값).
function buildSlider(c) {
    const el = document.createElement('label');
    el.className = 'slider';
    el.innerHTML = `<span class="label">${c.label}</span>
        <input type="range" min="0" max="1" step="0.001" value="0.5" />
        <span class="num"></span>`;
    const range = el.querySelector('input');
    const num = el.querySelector('.num');
    let pending = false;
    const render = () => (num.textContent = `×${knobToMult(c, +range.value).toFixed(2)}`);
    const set = nv => {
        range.value = String(Math.max(0, Math.min(1, nv)));
        render();
        if (!pending) {
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                send(c.id, +(+range.value).toFixed(3));
            });
        }
    };
    range.addEventListener('input', () => set(+range.value));
    range.addEventListener('dblclick', () => set(0.5));
    render();
    setters[c.id] = set;
    return el;
}

// ── 버튼 / 토글 ──────────────────────────────────────────────────────────────
const KEYS = { weather: '1', meal: '2', hello: '3', bye: 'b', joke: 'j', question: 'q', send: 'Enter' };
const pressers = {};

function buildButton(c) {
    const b = document.createElement('button');
    b.innerHTML = `${c.label}<span class="key">${KEYS[c.id] ?? ''}${c.text ? ` · ${c.text}` : ''}</span>`;
    if (c.kind === 'toggle') {
        if (c.id === 'bye') b.insertAdjacentHTML('afterbegin', '<i class="led"></i>'); // 실물 MTS202 옆 LED
        b.setAttribute('aria-pressed', 'false');
        const set = on => {
            if (b.getAttribute('aria-pressed') === String(!!on)) return; // 같은 값 반복(USB 잡음)은 안 보낸다
            b.setAttribute('aria-pressed', String(!!on));
            send(c.id, on ? 1 : 0);
        };
        setters[c.id] = set;
        pressers[c.id] = () => set(b.getAttribute('aria-pressed') !== 'true');
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

const ROW = { knob: 'knobs', toggle: 'toggles', preset: 'buttons', action: 'actions' };
for (const c of CONTROLS) {
    if (c.hidden) continue; // 피지컬 패널에 없는 항목 — 메시지는 output 이 여전히 먹는다
    const group = c.group ?? (c.kind === 'knob' ? 'knob' : c.kind === 'toggle' ? 'toggle' : c.text ? 'preset' : 'action');
    $(ROW[group]).append(c.kind === 'knob' ? (c.ui === 'slider' ? buildSlider(c) : buildKnob(c)) : buildButton(c));
}

// 키보드 단축키 — 1~3 프리셋, b 안녕 반전, j/q 토글, Enter 보내기
window.addEventListener('keydown', e => {
    if (e.repeat || e.target instanceof HTMLInputElement) return;
    const id = Object.keys(KEYS).find(k => KEYS[k] === e.key);
    if (id && pressers[id]) {
        e.preventDefault();
        pressers[id]();
    }
});

// ── receiver 선택 (튜닝용) ────────────────────────────────────────────────────
// 글자별 룩을 잡을 때 iPad 다이얼 없이 바꿔 보려고. 다이얼과 같은 {t:'receiver', name}을 보낸다 —
// output이 ?receiver= 로 고정돼 있으면 무시된다. 턴테이블이 붙어 있으면 같이 돈다.
// 버튼 불은 output이 실제로 바꾼 뒤 돌려보내는 {t:'receiver'}(다이얼로 바꾼 것 포함)를 따른다.
const RECEIVERS = ['mycelium', 'signal', 'dandelion', 'sora'];
const recvBtns = {};
for (const name of RECEIVERS) {
    const b = document.createElement('button');
    b.textContent = name;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
        bridge.send({ t: 'receiver', name });
        $('last').textContent = JSON.stringify({ t: 'receiver', name });
    });
    recvBtns[name] = b;
    $('receivers').append(b);
}
bridge.on('receiver', m => {
    for (const [name, b] of Object.entries(recvBtns)) b.setAttribute('aria-pressed', String(name === m.name));
});

// ── USB 패널 (Web Serial) ────────────────────────────────────────────────────
// TD 없이 피지컬 패널을 바로 시험한다. 아두이노가 한 줄씩 보내는
//   knob size 0.512 / btn send / tog bye 1
// 을 화면의 같은 컨트롤에 그대로 꽂는다 — 결국 같은 {t:'control'} 메시지가 나간다.
// 크롬(또는 엣지) + localhost 에서만 된다. 전시에서는 output.html 이 직접 연다(serial.js) —
// 한 포트는 한 탭만 열 수 있으니 여기서 시험할 땐 output 을 ?serial=0 으로 띄울 것.
const usb = $('usb');
const usbStatus = $('usb-status');

function onLine(line) {
    const [kind, id, raw] = line.trim().split(/\s+/);
    const v = Number(raw);
    if (kind === 'btn' && pressers[id]) pressers[id]();
    else if ((kind === 'knob' || kind === 'tog') && setters[id] && Number.isFinite(v)) setters[id](kind === 'tog' ? v > 0.5 : v);
}

async function connectUSB() {
    let port;
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
    } catch (e) {
        usbStatus.textContent = `연결 실패: ${e.message}`;
        return;
    }
    usb.disabled = true;
    usbStatus.textContent = 'USB 패널 연결됨';
    const writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode('?')); // 지금 노브/토글 상태를 한 번 다 받는다
    writer.releaseLock();
    const reader = port.readable.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += value;
            const lines = buf.split('\n');
            buf = lines.pop();
            lines.forEach(onLine);
        }
    } catch (e) {
        usbStatus.textContent = `끊김: ${e.message}`;
    }
    usb.disabled = false;
}

if ('serial' in navigator) usb.addEventListener('click', connectUSB);
else {
    usb.disabled = true;
    usbStatus.textContent = '이 브라우저는 Web Serial 미지원 — 크롬으로 열 것';
}
