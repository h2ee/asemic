#version 300 es

// 스탬프 패스 — 세그먼트(캡슐) 하나당 인스턴스 1개.
// 세그먼트를 감싸는 "방향이 맞춰진 사각형"만 그린다 (커널이 compact support 라
// 반경 R 밖은 기여가 0 → 화면 전체를 칠할 필요가 없다).

precision highp float;

layout(location = 0) in vec2 a_corner;  // 단위 쿼드 [-1..1]^2
layout(location = 1) in vec4 a_seg;     // ax, ay, bx, by  (CSS px, y 아래로)
layout(location = 2) in vec4 a_meta;    // R(px), strokeId, birth, kind(0 실선 / 1 동반 곡선 → .a 채널)

uniform vec2 u_cssSize;                 // 화면 크기 (CSS px)

out vec2 v_px;                          // 이 프래그먼트의 CSS px 좌표
flat out vec4 v_seg;
flat out vec3 v_meta;                   // R, id, birth
flat out float v_w;                     // 커널 정규화 가중치
flat out float v_kind;                  // 1 이면 .a 채널로 (goo.compCap)

// 커널을 "선밀도 적분의 리만 합"으로 쓰기 위한 정규화.
// kernel q^3 (q = 1 - d/R) 를 직선에 대해 적분하면 코어에서 0.5 → 2.0 이면 딱 1.0 이 나올 것
// 같지만, 실제로는 거리를 "점"이 아니라 "세그먼트"까지 재기 때문에 리만 합이 과대평가된다.
// 실측(probe)으로 보정한 값: 이 값에서 매끈한 외톨이 선의 코어 밀도가 ≈1.0 이 된다.
// → 임계값 u_th 를 "겹쳐야 하는 선의 개수"로 읽을 수 있다. 바꾸면 th 의 의미가 함께 변한다.
const float KERNEL_NORM = 1.55;

void main() {
    vec2 a = a_seg.xy;
    vec2 b = a_seg.zw;
    float R = a_meta.x;

    vec2 ab = b - a;
    float L = length(ab);
    vec2 d = L > 1e-5 ? ab / L : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);

    // 세그먼트를 따라 [-R, L+R], 측면으로 ±R
    float along = (a_corner.x * 0.5 + 0.5) * (L + 2.0 * R) - R;
    vec2 p = a + d * along + n * a_corner.y * R;

    v_px = p;
    v_seg = a_seg;
    v_meta = a_meta.xyz;
    v_kind = a_meta.w;
    // 세그먼트 길이로 가중 → 리샘플 간격(compStep)을 바꿔도 밀도가 안 변한다
    v_w = KERNEL_NORM * (L / max(R, 1e-5));

    // y 아래로 가는 CSS px → NDC (텍스처 0행 = 화면 아래쪽, GL 관례와 일치)
    gl_Position = vec4(p.x / u_cssSize.x * 2.0 - 1.0, 1.0 - p.y / u_cssSize.y * 2.0, 0.0, 1.0);
}
