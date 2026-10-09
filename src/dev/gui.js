// ── gui.js — 시연용 lil-gui 패널 (output.html?gui=1, demo.html) ─────────────────
//
// 가상 패널(control.html)과 iPad 다이얼은 브릿지 허브가 있어야 붙는다 — gh-pages에선 못 쓴다.
// 그래서 같은 일을 화면 옆 lil-gui 한 장이 페이지 함수(applyControl, switchReceiver)를 직접 불러서 한다.
// 컨트롤 목록은 controls.js 표를 그대로 읽는다(hidden 포함).

import GUI from 'lil-gui';
import { CONTROLS } from '../js/core.js';

const RECEIVERS = ['mycelium', 'sora', 'signal', 'dandelion']; // ReceiverManager REGISTRY와 같은 4종

export function mountGui({ rm, llm, applyControl, switchReceiver, setGlyphMode, glyphModes, glyphMode, input }) {
    const gui = new GUI({ title: 'asemic' });
    // body 클릭 = 입력창 포커스(output-main.js) — 패널 안 클릭은 패널이 쥐게 막는다. 손 떼면 입력창으로 돌려준다
    for (const ev of ['click', 'pointerdown']) gui.domElement.addEventListener(ev, e => e.stopPropagation());
    gui.domElement.addEventListener('pointerup', () => setTimeout(() => {
        if (!gui.domElement.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') input.focus();
    }));
    gui.domElement.style.zIndex = 30;

    const state = {
        receiver: rm.name,
        glyphmode: glyphMode(),
        loremMin: llm?.config.loremMin ?? 10,
        loremMax: llm?.config.loremMax ?? 20,
    };

    gui.add(state, 'receiver', RECEIVERS).name('수신자').onChange(name => switchReceiver(name));
    gui.add(state, 'glyphmode', glyphModes).name('표시 모드').onChange(m => setGlyphMode(m));
    if (llm?.config.lorem) {
        gui.add(state, 'loremMin', 5, 50, 1).name('답변 음절 최소').onChange(v => (llm.config.loremMin = v));
        gui.add(state, 'loremMax', 5, 50, 1).name('답변 음절 최대').onChange(v => (llm.config.loremMax = v));
    }

    const knobs = gui.addFolder('노브');
    const toggles = gui.addFolder('토글');
    const buttons = gui.addFolder('버튼');
    for (const c of CONTROLS) {
        if (c.id === 'paging' || c.id === 'glyphmode') continue; // 표시 모드 드롭다운이 맡는다
        if (c.kind === 'knob') {
            state[c.id] = 0.5; // 0.5 = receiver 기본값
            knobs.add(state, c.id, 0, 1, 0.01).name(c.label).onChange(v => applyControl({ id: c.id, value: v }));
        } else if (c.kind === 'toggle') {
            state[c.id] = false;
            toggles.add(state, c.id).name(c.label).onChange(v => applyControl({ id: c.id, value: v ? 1 : 0 }));
        } else {
            state[c.id] = () => applyControl({ id: c.id, value: 1 });
            buttons.add(state, c.id).name(c.text ? `${c.label} — ${c.text}` : c.label);
        }
    }

    // 다른 경로(콘솔 등)로 receiver가 바뀌어도 드롭다운이 따라가게
    setInterval(() => {
        if (state.receiver !== rm.name) {
            state.receiver = rm.name;
            gui.controllersRecursive().forEach(ct => ct.updateDisplay());
        }
    }, 500);

    window.gui = gui;
    return gui;
}
