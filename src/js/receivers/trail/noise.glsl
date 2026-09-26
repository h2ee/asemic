// 04_trail_gl/noise.glsl — growth / particles 가 공유하는 바람(curl noise).
// vite-plugin-glsl 의 #include 로 주입된다. #version 은 넣지 않는다 (호스트 셰이더가 갖고 있음).

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    return vnoise(p) * 0.6 + vnoise(p * 2.03) * 0.3 + vnoise(p * 4.01) * 0.1;
}

// 스칼라 포텐셜의 curl → 발산이 0 인 속도장. 소용돌이치는 바람이 되고,
// 발산이 없어서 성장장이 한 점에 뭉치거나 구멍나지 않는다.
vec2 curlWind(vec2 p, float t) {
    const float e = 0.09;
    // 시간에 따라 노이즈를 흘려보내되, 오프셋을 sin/cos 으로 "묶어" 둔다.
    // d = vec2(t*0.37, -t*0.21) 처럼 무한히 커지게 두면 전시처럼 몇 시간 돌렸을 때
    // hash21 의 fract(p * 123.34) 가 float 정밀도를 잃고 바람이 뭉개진다.
    vec2 d = 6.0 * vec2(sin(t * 0.13), cos(t * 0.11));
    float n1 = fbm(p + vec2(0.0, e) + d);
    float n2 = fbm(p - vec2(0.0, e) + d);
    float n3 = fbm(p + vec2(e, 0.0) + d);
    float n4 = fbm(p - vec2(e, 0.0) + d);
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

// 2개의 [0,1) 난수
vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(19.19, 7.77)));
}

// ── 정수 해시 (PCG). 위의 hash21 은 vnoise 처럼 입력이 작을 때만 쓸 수 있다:
// fract(p * 456.21) 은 p 가 300쯤만 되도 float32 에서 구분값이 100여 개로 줄어든다.
// 파티클 리스폰처럼 "픽셀 좌표 + 프레임 번호"로 난수를 뽑는 데엔 이걸 쓴다 — 정확하고
// 입력 크기에 무관하다.
uint pcg(uint v) {
    v = v * 747796405u + 2891336453u;
    uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
    return (w >> 22u) ^ w;
}

vec2 randUint2(uvec3 s) {
    uint h = pcg(s.x ^ pcg(s.y ^ pcg(s.z)));
    uint k = pcg(h);
    return vec2(float(h), float(k)) / 4294967296.0;
}
