#version 300 es

// 파티클 렌더 — 정점 속성이 없다. gl_VertexID 로 상태 텍스처를 texelFetch 한다.
// (drawArrays(POINTS, 0, N) 한 방. 파티클마다 버퍼를 갱신할 필요가 없다)

precision highp float;

uniform sampler2D u_state;
uniform ivec2 u_stateSize;
uniform vec2 u_cssSize;
uniform float u_size;       // px
uniform float u_dpr;

out float v_life;

void main() {
    int i = gl_VertexID;
    ivec2 t = ivec2(i % u_stateSize.x, i / u_stateSize.x);
    vec4 s = texelFetch(u_state, t, 0);

    v_life = s.z;

    if (s.z <= 0.0) {
        // 죽은 파티클은 클립 공간 밖으로 치워서 버린다
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 1.0;
        return;
    }

    // 태어날 때 / 죽을 때 작아진다
    float fade = smoothstep(0.0, 0.15, s.z) * smoothstep(1.0, 0.85, s.z);
    gl_PointSize = max(u_size * u_dpr * (0.35 + 0.65 * fade), 1.0);
    gl_Position = vec4(s.x / u_cssSize.x * 2.0 - 1.0, 1.0 - s.y / u_cssSize.y * 2.0, 0.0, 1.0);
}
