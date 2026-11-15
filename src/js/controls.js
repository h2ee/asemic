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
    { id: 'size', kind: 'knob', label: '크기', min: 0.8, max: 1.2, cc: null }, // 2026-11-09 실물 패널에서 변화가 커서 좁힘 (전: 0.6~1.4)
    { id: 'spacing', kind: 'knob', ui: 'slider', label: '자간', min: 0.8, max: 1.3, cc: null }, // (전: 0.6~1.6)
    { id: 'leading', kind: 'knob', ui: 'slider', label: '행간', min: 0.85, max: 1.8, cc: null }, // 2026-11-09 최대 1.25 → 1.8 (전: 0.7~1.5)

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

// 노브 0~1 → 배율. 기준점(anchor, 기본 0.5)이 정확히 1.0 이 되도록 양쪽을 따로 편다 — 왼쪽 끝 = min, 오른쪽 끝 = max.
// range = [min, max]를 주면 표의 c.min/c.max 대신(receiver.knobRange)
export function knobToMult(c, v, range = null, anchor = 0.5) {
    v = Math.max(0, Math.min(1, v));
    const [min, max] = range ?? [c.min, c.max];
    const a = Math.max(0, Math.min(1, anchor));
    if (v <= a) return a > 0 ? min + (1 - min) * (v / a) : 1;
    return 1 + (max - 1) * ((v - a) / (1 - a));
}

// ── 상대 노브 (2026-11-09) ─────────────────────────────────────────────────────
// 실물 슬라이더는 관람객이 가운데(기본값)에 돌려놓고 떠나지 않는다. 그래서 새 문장이 시작될 때마다
// 지금 슬라이더 자리를 기준점(anchor)으로 다시 잡아 거기를 기본값으로 친다(rebaseKnob) — 손대지 않은 글자는
// 전부 기본 크기·자간·행간. 양 끝은 그대로 receiver의 최소·최대라 기준점 양쪽 눈금 간격이 서로 다르다.
// 움직일수록 기준점이 가운데(0.5)로 돌아가 눈금이 원래 간격에 가까워진다(moveKnob) — 한 번에 옮기지 않고
// 움직인 거리만큼만 조금씩이라 값이 튀지 않는다. KNOB_CONVERGE < 2면 값이 슬라이더와 반대로 가는 일도 없다
// (기준점 이동이 값에 주는 영향 ≤ 슬라이더 이동 몫 × KNOB_CONVERGE/2). 1.5 = 끝에서 끝 한 번에 남은 어긋남 ~22%
const KNOB_CONVERGE = 1.5;
// st = { v: 지금 위치, a: 기준점 }. 처음 들어온 값은 그 자리가 기준점(첫 연결 때 값이 튀지 않게)
export function moveKnob(st, v) {
    if (!st) return { v, a: v };
    st.a += (0.5 - st.a) * Math.min(1, KNOB_CONVERGE * Math.abs(v - st.v));
    st.v = v;
    return st;
}
export function rebaseKnob(st) {
    st.a = st.v;
}

// 노브가 건드리는 receiver 필드. 기본값은 처음 만질 때 receiver에 붙잡아 두고(_ctlBase)
// 거기에 배율을 곱한다 — 노브를 가운데로 돌리면 정확히 원래 값으로 돌아온다.
const KNOB_FIELD = { size: 'sylSize', spacing: 'wrapStep', leading: 'lineHeightRatio' };

// receiver.knobRange = { [노브 id]: [min, max] } — 그 receiver만 노브 양 끝을 이 배율로(위 표 대신).
// 더 줄이면 형태가 무너지는 receiver(signal)가 하한에서 막혀 슬라이더 일부가 안 먹던 걸 없앤다(2026-11-09)
// receiver.knobFields = { [노브 id]: 필드 이름 } — 그 receiver만 위 표 대신 이 필드에 곱한다(dandelion 자간 → _step, 2026-11-10)
// 지금 receiver에 실제로 걸려 있는 노브 값 — 대화 기록용(src/dev/chatlog.js, 2026-11-13).
// { size: { field: 'sylSize', value, base } } — base = 노브 안 댄 값(한 번도 안 돌렸으면 value와 같다)
export function knobSnapshot(receiver) {
    const out = {};
    for (const id of Object.keys(KNOB_FIELD)) {
        const field = receiver?.knobFields?.[id] ?? KNOB_FIELD[id];
        const value = receiver?.[field];
        if (typeof value !== 'number') continue;
        out[id] = { field, value: +value.toFixed(4), base: +(receiver._ctlBase?.[field] ?? value).toFixed(4) };
    }
    return out;
}

export function applyKnob(receiver, c, v, anchor = 0.5) {
    const field = receiver?.knobFields?.[c.id] ?? KNOB_FIELD[c.id];
    if (!receiver || !field || typeof receiver[field] !== 'number') return false;
    receiver._ctlBase ??= {};
    receiver._ctlBase[field] ??= receiver[field];
    receiver[field] = receiver._ctlBase[field] * knobToMult(c, v, receiver.knobRange?.[c.id], anchor);
    return true;
}
