#version 300 es

// 성장 패스 — 텍스처 공간 피드백(ping-pong)으로 goo 경계에서 뭔가가 자라 나온다.
//
// 이게 "픽셀 색을 CPU 로 되읽어서 트리거" 보다 나은 이유:
//   · readPixels 가 없다 → 파이프라인 스톨 없음.
//   · 성장이 "상태"로 텍스처에 남으므로 프레임마다 이어서 자란다. 한 프레임짜리 이벤트가 아니다.
//   · 이류(advection)가 semi-Lagrangian 이라 공짜로 매끄럽다.
//
// 규칙 (매 프레임):
//   1. 이전 성장장을 바람 + "바깥 방향"으로 역샘플해 이동시키고 decay 를 곱한다
//   2. goo 경계 밴드(밀도가 th 근처인 띠)에서 새 성장을 발아시킨다
//   3. 발아는 획의 나이(field .b 채널의 birth)로 게이팅 — 그린 직후가 아니라 조금 뒤부터 자란다
//
// 바깥 방향 = -normalize(∇field). 밀도장의 기울기는 코어를 향하므로 그 반대가 바깥이다.

precision highp float;

#include './noise.glsl';

in vec2 v_uv;
out vec4 outGrowth;

uniform sampler2D u_prev;    // 이전 성장장
uniform sampler2D u_baked;
uniform sampler2D u_live;

uniform vec2 u_fieldTexel;   // 1/fieldResolution — 밀도장 기울기용
uniform vec2 u_cssSize;      // px ↔ uv 변환
uniform float u_time;
uniform float u_dt;

uniform float u_th;          // goo 임계 (경계 위치의 기준)
uniform float u_decay;       // 프레임당 감쇠 (0.90~0.99). 작을수록 짧게 자람
uniform float u_outward;     // 바깥으로 밀려나는 속도 (px/s)
uniform float u_curlAmp;     // 바람 세기 (px/s)
uniform float u_curlScale;   // 바람 공간 주파수 (1/px). 작을수록 큰 소용돌이
uniform float u_curlSpeed;
uniform float u_source;      // 발아 세기
uniform float u_bandLo;      // 발아 밴드: th - bandLo .. th + bandHi
uniform float u_bandHi;
uniform float u_nowMin;      // 현재 시각 (분)
uniform float u_ageDelay;    // 이 시간(분)이 지난 획부터 자란다

float fieldAt(vec2 uv) {
    return texture(u_baked, uv).r + texture(u_live, uv).r;
}

void main() {
    vec2 px = v_uv * u_cssSize;

    // ── 1. 이류 + 감쇠
    vec2 g = vec2(
        fieldAt(v_uv + vec2(u_fieldTexel.x, 0.0)) - fieldAt(v_uv - vec2(u_fieldTexel.x, 0.0)),
        fieldAt(v_uv + vec2(0.0, u_fieldTexel.y)) - fieldAt(v_uv - vec2(0.0, u_fieldTexel.y))
    );
    vec2 outward = length(g) > 1e-6 ? -normalize(g) : vec2(0.0);

    vec2 vel = outward * u_outward + curlWind(px * u_curlScale, u_time * u_curlSpeed) * u_curlAmp;
    vec2 back = v_uv - vel * u_dt / u_cssSize;   // semi-Lagrangian: 역방향에서 끌어온다
    float prev = texture(u_prev, back).r * pow(u_decay, u_dt * 60.0);

    // ── 2. goo 경계 밴드에서 발아
    float f = fieldAt(v_uv);
    float band = smoothstep(u_th - u_bandLo, u_th, f) * (1.0 - smoothstep(u_th, u_th + u_bandHi, f));

    // ── 3. 나이 게이팅 — field .b 에 누적된 birth 를 밀도로 나눠 되꺼낸다
    vec4 bk = texture(u_baked, v_uv);
    float birth = bk.r > 1e-4 ? bk.b / bk.r : u_nowMin;
    float age = max(u_nowMin - birth, 0.0);
    float gate = smoothstep(u_ageDelay, u_ageDelay * 2.5, age);

    float src = band * u_source * gate;

    outGrowth = vec4(max(prev, src), 0.0, 0.0, 0.0);
}
