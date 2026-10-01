#version 300 es

// 파티클 상태 갱신 — 상태 텍스처 한 장의 픽셀 하나 = 파티클 하나.
//   .xy  위치 (CSS px, y 아래로)
//   .z   수명 1 → 0
//   .w   시드 (리스폰마다 갱신)
//
// 방출(emission)을 CPU 가 하지 않는다. 죽은 파티클이 스스로 밀도장을 몇 번 무작위로
// 찔러보고(rejection sampling) goo 경계에 걸리는 지점에서 되살아난다.
// → "픽셀 값에서 트리거해서 파티클을 뿌린다"를 readPixels 없이 성립시키는 방법.
//   화면이 비어 있으면 아무도 되살아나지 않고 조용히 대기한다.

precision highp float;

#include './noise.glsl';

in vec2 v_uv;
out vec4 outState;

uniform sampler2D u_prev;
uniform sampler2D u_baked;
uniform sampler2D u_live;

uniform vec2 u_fieldTexel;
uniform vec2 u_cssSize;
uniform float u_time;
uniform uint u_frame;       // 프레임 카운터 — 정수 해시의 시간축
uniform float u_dt;

uniform float u_th;
uniform float u_compCap;    // 동반 곡선 밀도 상한 (0 = 끔)
uniform float u_spawnTol;   // |밀도 - th| 가 이보다 작으면 경계로 인정
uniform float u_spawnRate;  // 죽은 파티클이 한 프레임에 부활을 "시도"할 확률.
                            // 이게 없으면 전원이 첫 프레임에 동시 탄생 → 동시 사망 → 개체수가 맥동한다.
uniform float u_lifespan;   // 초
uniform float u_lifeVar;    // 수명 개체차 (0 = 전원 동일 → 맥동, 0.5 = 0.5~1.5배)
uniform float u_curlAmp;    // 바람 (px/s)
uniform float u_curlScale;
uniform float u_curlSpeed;
uniform float u_flow;       // goo 경계를 따라 도는 속도 (px/s)
uniform float u_repel;      // 밀도장 바깥으로 밀려나는 속도 (px/s)

const int SPAWN_TRIES = 8;

// 파티클 px(y 아래로) → 밀도장 uv(y 위로)
vec2 fieldUV(vec2 px) {
    return vec2(px.x / u_cssSize.x, 1.0 - px.y / u_cssSize.y);
}

// 동반 곡선 밀도(.a)의 soft cap — u_compCap 근처에서 포화. 0 이하면 그대로 더한다(.a 는 0).
// 점선 자기 겹침은 cap 을 못 넘고, 실선(.r)과 만나는 곳만 임계를 넘는다.
float capComp(float c) {
    if (u_compCap <= 0.0) return c;
    float r = c / u_compCap;
    return c / pow(1.0 + r * r * r * r, 0.25);
}

float fieldAt(vec2 uv) {
    vec4 b = texture(u_baked, uv);
    vec4 l = texture(u_live, uv);
    return b.r + l.r + capComp(b.a + l.a);
}

// px 공간 기울기 (uv.y 는 위로, px.y 는 아래로 → y 부호 반전)
vec2 gradPx(vec2 px) {
    vec2 uv = fieldUV(px);
    float fx = fieldAt(uv + vec2(u_fieldTexel.x, 0.0)) - fieldAt(uv - vec2(u_fieldTexel.x, 0.0));
    float fy = fieldAt(uv + vec2(0.0, u_fieldTexel.y)) - fieldAt(uv - vec2(0.0, u_fieldTexel.y));
    return vec2(fx, -fy);
}

void main() {
    vec4 s = texture(u_prev, v_uv);
    vec2 p = s.xy;
    float life = s.z;
    float seed = s.w;

    if (life <= 0.0) {
        // ── 리스폰: 경계를 무작위로 찾아본다.
        // 난수는 (픽셀좌표, 프레임, 시도번호) 에서 정수 해시로 뽑는다 — float 정밀도 문제 없음.
        uvec2 cell = uvec2(gl_FragCoord.xy);

        // 부활 시도를 확률로 늦춘다 → 탄생이 시간축으로 흩어지고, 개체수도 이 값으로 정해진다
        if (randUint2(uvec3(cell, u_frame + 77777u)).x > u_spawnRate) {
            outState = vec4(p, 0.0, seed);
            return;
        }

        float bestErr = 1e9;
        vec2 best = vec2(0.0);
        for (int i = 0; i < SPAWN_TRIES; i++) {
            vec2 r = randUint2(uvec3(cell, u_frame * uint(SPAWN_TRIES) + uint(i)));
            float err = abs(fieldAt(r) - u_th);
            if (err < bestErr) {
                bestErr = err;
                best = r;
            }
        }
        seed = randUint2(uvec3(cell, u_frame)).x;
        if (bestErr < u_spawnTol) {
            p = vec2(best.x * u_cssSize.x, (1.0 - best.y) * u_cssSize.y);
            life = 1.0;
        }
        outState = vec4(p, life, seed);
        return;
    }

    // ── 이동: 바람 + 경계 접선 흐름 + 바깥으로 밀려남
    vec2 g = gradPx(p);
    vec2 outward = length(g) > 1e-6 ? -normalize(g) : vec2(0.0);
    vec2 tangent = length(g) > 1e-6 ? normalize(vec2(-g.y, g.x)) : vec2(0.0);

    vec2 vel = curlWind(p * u_curlScale, u_time * u_curlSpeed) * u_curlAmp
             + tangent * u_flow
             + outward * u_repel;

    p += vel * u_dt;
    // 수명에 개체차를 준다 (seed 는 살아있는 동안 안 바뀌므로 한 생애 내내 일정)
    float lifeScale = 1.0 + u_lifeVar * (seed * 2.0 - 1.0);
    life -= u_dt / max(u_lifespan * lifeScale, 1e-3);

    // 화면을 벗어나면 죽는다
    if (p.x < -20.0 || p.y < -20.0 || p.x > u_cssSize.x + 20.0 || p.y > u_cssSize.y + 20.0)
        life = 0.0;

    outState = vec4(p, max(life, 0.0), seed);
}
