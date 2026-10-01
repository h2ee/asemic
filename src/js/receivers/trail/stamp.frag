#version 300 es

// 스탬프 패스 — 캡슐 SDF → 메타볼 커널 → additive 누적.
//
// 03_trail 의 blur + brightness + contrast 를 대체한다. 차이:
//   · blur 가 없다. 거리를 직접 계산하므로 반경 R 이 정확히 "px 단위 사거리"다.
//   · 누적된 값이 진짜 밀도장이라, 임계값(th)과 사거리(R)가 서로 독립적이다.
//     (구버전은 gooWidth/blur/gooBright 가 "단위면적당 잉크량 vs 임계" 하나로 붕괴해 있었다)
//
// 채널:
//   .r  밀도 Σ k·w            — 임계 판정용
//   .g  Σ k·w·strokeId        — 합성에서 /r 하면 그 지점을 만든 획의 id (색 구분용)
//   .b  Σ k·w·birth           — 같은 방식으로 "언제 칠해졌는가" → 자람/파티클 트리거 훅
//   .a  Σ k·w  (동반 곡선만)  — goo.compCap 이 켜졌을 때. 읽는 쪽이 따로 눌러서(soft cap) 더한다
//                               → 점선이 자기 루프끼리 겹쳐 생기는 goo 를 막고, 실선과의 교차만 남긴다

precision highp float;

in vec2 v_px;
flat in vec4 v_seg;
flat in vec3 v_meta;
flat in float v_w;
flat in float v_kind;

out vec4 outField;

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
}

void main() {
    float R = v_meta.x;
    float d = sdSegment(v_px, v_seg.xy, v_seg.zw);

    float q = clamp(1.0 - d / R, 0.0, 1.0);
    float k = q * q * q * v_w;   // compact support: d >= R 이면 0
    if (k <= 0.0) discard;

    outField = v_kind > 0.5 ? vec4(0.0, 0.0, 0.0, k) : vec4(k, k * v_meta.y, k * v_meta.z, 0.0);
}
