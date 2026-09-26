#version 300 es

precision highp float;

in float v_life;
out vec4 outColor;

uniform vec3 u_ink;
uniform float u_opacity;

void main() {
    // gl_PointCoord 로 원형 마스크 — 사각형 점이 아니게
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.55, 1.0, d);
    if (mask <= 0.0) discard;

    // 태어날 때 / 죽을 때 흐려진다
    float fade = smoothstep(0.0, 0.2, v_life) * smoothstep(1.0, 0.8, v_life);
    outColor = vec4(u_ink, mask * fade * u_opacity);
}
