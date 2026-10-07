// ── controls.js ───────────────────────────────────────────────────────────────
// 컨트롤 패널 계약 — 의존성 없음(가상 패널 src/dev/control.html 도 이 표로 UI를 그린다).
//
// 패널은 "무엇을 만졌는지"만 보낸다:  { t:'control', id, value }  (또는 id 대신 cc)
//   knob   value 0~1   (0.5 = receiver 기본값)
//   button value 1     (누른 순간만)
//   toggle value 0|1
// "그래서 뭘 할지"는 이 표 + output-main.js applyControl 한 곳에서만 정한다.
// 가상 패널이든 피지컬 패널이든 같은 메시지를 보내므로 매핑이 두 곳에 생기지 않는다.
//
// 피지컬 패널 연결: Uno R4 USB 시리얼 → output.html 이 Web Serial로 직접 읽는다(src/dev/serial.js).
//   cc 필드는 예전 MIDI 안(Pro Micro → TD midiinCHOP)의 흔적 — { t:'control', cc, value } 도 여전히 먹는다.
//
// 피지컬 패널(2026-10-01 확정): 크기 노브 1 · 자간/행간 슬라이더 2 · 농담/질문 토글 2 ·
// 날씨/밥/안녕 프리셋 3 · 안녕 반전(MTS202 + LED) 1 · 보내기 1.
// 아두이노는 시리얼로 `knob size 0.512` / `btn send` / `tog bye 1` 처럼 id를 그대로 보낸다.
//
// hidden: 피지컬 패널에 없는 항목 — 가상 패널(control.html)에 안 그린다. 메시지는 여전히 먹는다.
// ui: 'slider' — 가상 패널에서 노브 대신 가로 슬라이더로 그린다(실물 페이더와 맞춤). 값 의미는 knob과 같다.
// group: 가상 패널에서 놓일 줄(없으면 kind로 정함).
// hints / flip: 프리셋을 보낼 때 LLM에 덧붙이는 상황 설명. flip 토글이 켜져 있으면 hints[1].
//   "안녕"은 hi든 bye든 글자(자모)가 같아 화면은 같고, 수신자의 대답만 갈린다.

export const CONTROLS = [
    { id: 'size', kind: 'knob', label: '크기', min: 0.6, max: 1.4, cc: null },
    { id: 'spacing', kind: 'knob', ui: 'slider', label: '자간', min: 0.6, max: 1.6, cc: null },
    { id: 'leading', kind: 'knob', ui: 'slider', label: '행간', min: 0.7, max: 1.5, cc: null },

    { id: 'weather', kind: 'button', label: '날씨', text: '오늘 날씨 어때요?', cc: null },
    { id: 'meal', kind: 'button', label: '밥', text: '밥 먹었어?', cc: null },
    {
        id: 'hello',
        kind: 'button',
        label: '안녕',
        text: '안녕',
        flip: 'bye',
        hints: [
            '상대는 방금 너를 만나 "안녕"이라고 인사했다. 만남의 인사로 받아들이고 대답한다.',
            '상대는 지금 떠나면서 "안녕"이라고 작별 인사를 했다. 떠나는 사람에게 하는 말로 대답한다.',
        ],
        cc: null,
    },
    { id: 'bye', kind: 'toggle', group: 'preset', label: 'hi ↔ bye', cc: null }, // MTS202 — hello 의 뜻을 뒤집는다

    { id: 'joke', kind: 'toggle', label: '농담', cc: null },
    { id: 'question', kind: 'toggle', label: '질문', cc: null },

    { id: 'send', kind: 'button', label: '보내기', cc: null },

    { id: 'paging', kind: 'toggle', label: '5자씩', hidden: true, cc: null }, // glyphmode step ↔ page
    { id: 'glyphmode', kind: 'button', label: '표시 모드', hidden: true, cc: null }, // glyphmode step → page → scroll → disperse 순환
    { id: 'clear', kind: 'button', label: '지우기', hidden: true, cc: null },
];

// { id } 또는 { cc } → 컨트롤 정의
export function resolveControl(m) {
    if (m.id != null) return CONTROLS.find(c => c.id === m.id) ?? null;
    if (m.cc != null) return CONTROLS.find(c => c.cc === m.cc) ?? null;
    return null;
}

// 노브 0~1 → 배율. 가운데(0.5)가 정확히 1.0 이 되도록 양쪽을 따로 편다.
export function knobToMult(c, v) {
    v = Math.max(0, Math.min(1, v));
    return v < 0.5 ? c.min + (1 - c.min) * (v / 0.5) : 1 + (c.max - 1) * ((v - 0.5) / 0.5);
}

// 노브가 건드리는 receiver 필드. 기본값은 처음 만질 때 receiver에 붙잡아 두고(_ctlBase)
// 거기에 배율을 곱한다 — 노브를 가운데로 돌리면 정확히 원래 값으로 돌아온다.
const KNOB_FIELD = { size: 'sylSize', spacing: 'wrapStep', leading: 'lineHeightRatio' };

export function applyKnob(receiver, c, v) {
    const field = KNOB_FIELD[c.id];
    if (!receiver || !field || typeof receiver[field] !== 'number') return false;
    receiver._ctlBase ??= {};
    receiver._ctlBase[field] ??= receiver[field];
    receiver[field] = receiver._ctlBase[field] * knobToMult(c, v);
    return true;
}
