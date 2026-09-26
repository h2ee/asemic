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
// 피지컬 패널 연결(PRD: Pro Micro USB-MIDI → TD midiinCHOP):
//   TD는 CC 번호와 값(0~127 → 0~1)만 { t:'control', cc, value } 로 넘기면 된다.
//   cc → id 변환은 아래 cc 필드로 페이지가 한다. 배선이 정해지면 cc만 채울 것.
//   ⚠️ midiinCHOP par.onebased 기본 True — 채널 이름 c1 = CC 0.
//
// 프리셋 문구는 가안(PRD "프리셋 문장 버튼 문구 확정" 미결).

export const CONTROLS = [
    { id: 'size', kind: 'knob', label: '크기', min: 0.6, max: 1.4, cc: null },
    { id: 'spacing', kind: 'knob', label: '자간', min: 0.6, max: 1.6, cc: null },
    { id: 'leading', kind: 'knob', label: '행간', min: 0.7, max: 1.5, cc: null },

    { id: 'preset1', kind: 'button', label: '인사', text: '안녕하세요', cc: null },
    { id: 'preset2', kind: 'button', label: '날씨', text: '오늘 날씨 어때요?', cc: null },
    { id: 'preset3', kind: 'button', label: '안부', text: '잘 지냈어?', cc: null },
    { id: 'preset4', kind: 'button', label: '이름', text: '이름이 뭐야?', cc: null },

    { id: 'joke', kind: 'toggle', label: '농담', cc: null },
    { id: 'question', kind: 'toggle', label: '질문', cc: null },

    { id: 'send', kind: 'button', label: '보내기', cc: null },
    { id: 'clear', kind: 'button', label: '지우기', cc: null },
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
