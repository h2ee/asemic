#version 300 es

// 합성 패스 — 밀도장(baked + live) → 임계 → 셰이딩 → 종이 위에 합성.
//
// 파라미터가 직교한다:
//   u_th     밀도 임계. 1.0 = "매끈한 외톨이 선 한 줄의 코어 밀도"(stamp.vert 의 KERNEL_NORM 기준).
//            사실상 "겹쳐야 하는 선의 개수". <1.0 모든 선이 두툼 / 1.1~1.5 루프·근접 구간만 / >1.6 교차점만
//   u_edge   임계 전이 폭 (안티에일리어싱 · 물렁함). u_th 와 무관하게 움직인다.
//   반경 R   스탬프 시점에 결정 (px 단위 사거리) — u_th 와 무관.
//
// u_shade: 0 = flat(03_trail 의 검은 metaball), 1 = lit(크롬/구슬), 2 = toon, 3 = 밀도장 디버그

precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_baked;
uniform sampler2D u_live;
uniform sampler2D u_growth;  // growth.js 의 성장장 (.r)

uniform vec2 u_texel;       // 1.0 / fieldResolution
uniform float u_pxPerTexel; // field 텍셀 1개가 몇 CSS px 인가

uniform float u_th;
uniform float u_compCap;    // 동반 곡선 밀도 상한 (0 = 끔)
uniform float u_edge;

uniform vec3 u_paper;
uniform vec3 u_ink;

uniform int u_shade;
uniform vec3 u_light;       // 정규화된 광원 방향 (y 위로)
uniform float u_normalZ;    // 노멀 기울기 스케일 (클수록 납작)
uniform float u_amb;
uniform float u_diff;
uniform float u_spec;
uniform float u_specPow;
uniform float u_fres;
uniform float u_bands;      // toon 계단 수

uniform vec3 u_growInk;     // 성장 잉크 색
uniform float u_growGain;   // 성장장 → 불투명도 게인 (0 이면 성장 레이어 꺼짐)
uniform float u_growOpacity;

uniform vec2 u_cssSize;     // 화면 크기 (CSS px)
uniform float u_pixel;      // 픽셀화 칸(CSS px). 0 = 끔
uniform vec2 u_origin;      // 칸·결 노이즈의 원점 (CSS px) — halo 격자와 같다
uniform vec4 u_grain;       // 결: amount, freq(밀도 1 당 띠), warp(띠 단위), scale(노이즈 1/px). amount 0 = 끔
uniform float u_grainWidth; // 띠에서 깎이는 폭 0~1

#include './noise.glsl';

const float GRAD = 1.5;     // 중심차분 간격 (field 텍셀)

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

// 결 — 밀도 등고선은 획과 나란하므로, 밀도값 자체를 띠 좌표로 쓰면 띠가 늘 획을 따라간다.
// 그 띠마다 밀도를 깎아 덩어리를 여러 가닥으로 가르고, 노이즈로 띠를 흔들어 나뭇결처럼 끊는다.
float grainCut(float f, vec2 css) {
    if (u_grain.x <= 0.0) return 0.0;
    float b = f * u_grain.y + u_grain.z * (vnoise((css - u_origin) * u_grain.w) * 2.0 - 1.0);
    float d = abs(fract(b + 0.5) - 0.5) * 2.0;     // 띠 한가운데 0 → 띠 사이 1
    return u_grain.x * (1.0 - smoothstep(u_grainWidth * 0.5, u_grainWidth, d));
}

void main() {
    // 픽셀화 — 칸 중심의 밀도 하나로 칸 전체를 칠한다(노멀도 칸마다 하나 → 면이 납작한 블록)
    vec2 css = vec2(v_uv.x, 1.0 - v_uv.y) * u_cssSize;
    vec2 uv = v_uv;
    if (u_pixel > 0.0) {
        css = (floor((css - u_origin) / u_pixel) + 0.5) * u_pixel + u_origin;
        uv = vec2(css.x / u_cssSize.x, 1.0 - css.y / u_cssSize.y);
    }
    float f0 = fieldAt(uv);
    if (u_pixel > 0.0) {
        // 칸 중심 하나만 읽으면 칸보다 가는 선이 칸 사이로 빠져 점선이 된다 — 칸 안 3×3 의 최댓값
        vec2 s = vec2(u_pixel / 3.0) / u_cssSize * vec2(1.0, -1.0);
        for (int j = -1; j <= 1; j++)
            for (int i = -1; i <= 1; i++)
                if (i != 0 || j != 0) f0 = max(f0, fieldAt(uv + vec2(float(i), float(j)) * s));
    }
    float f = f0 - grainCut(f0, css);

    // ── 밀도장 디버그: th 를 어디에 둬야 하는지 눈으로 보기 위한 모드.
    // 실제 렌더와 같은 극성(종이 위에 어두운 잉크)으로 보여야 감이 맞는다.
    if (u_shade == 3) {
        vec3 c = mix(u_paper, vec3(0.06, 0.06, 0.09), clamp(f / 3.0, 0.0, 1.0));
        float iso = abs(fract(f * 2.0) - 0.5) * 2.0;             // 밀도 0.5 마다 등고선
        float onField = step(0.05, f);                           // 빈 배경(f=0)은 등고선에서 제외
        c = mix(c, vec3(0.25, 0.55, 1.0), smoothstep(0.9, 1.0, iso) * 0.55 * onField);
        c = mix(c, vec3(1.0, 0.35, 0.1), (1.0 - smoothstep(0.0, max(u_edge, 1e-4), abs(f - u_th))) * onField);
        // 성장장은 초록으로 겹쳐 보여준다
        c = mix(c, vec3(0.3, 0.9, 0.4), clamp(texture(u_growth, v_uv).r * u_growGain, 0.0, 1.0) * 0.7);
        outColor = vec4(c, 1.0);
        return;
    }

    float a = smoothstep(u_th - u_edge, u_th + u_edge, f);

    vec3 col = u_ink;

    if (a > 0.0) {
        if (u_shade != 0) {
            // 밀도장의 기울기로 노멀을 만든다 — 레이마칭 없이 3D 볼륨감.
            // (임계된 값이 아니라 밀도장 자체의 미분이라 매끄럽다)
            vec2 t = u_texel * GRAD;
            vec2 g = vec2(
                fieldAt(uv + vec2(t.x, 0.0)) - fieldAt(uv - vec2(t.x, 0.0)),
                fieldAt(uv + vec2(0.0, t.y)) - fieldAt(uv - vec2(0.0, t.y))
            ) / (2.0 * GRAD * u_pxPerTexel);

            vec3 n = normalize(vec3(-g * u_normalZ, 1.0));
            vec3 L = normalize(u_light);

            float diff = max(dot(n, L), 0.0);
            if (u_shade == 2) diff = floor(diff * u_bands) / max(u_bands - 1.0, 1.0);

            vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
            float spec = pow(max(dot(n, H), 0.0), u_specPow);
            if (u_shade == 2) spec = step(0.5, spec);

            float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);

            col = u_ink * (u_amb + u_diff * diff) + vec3(spec * u_spec) + vec3(fres * u_fres);
        }
    }
    col = clamp(col, 0.0, 1.0);

    // ── 성장 레이어 — goo 바깥에서만 보인다 (안쪽은 어차피 잉크로 덮여 있다)
    float ag = clamp(texture(u_growth, v_uv).r * u_growGain, 0.0, 1.0) * (1.0 - a) * u_growOpacity;

    // ── straight(non-premultiplied) alpha 출력.
    // 종이색을 여기서 깔지 않는다 — 캔버스 CSS 배경이 화면용으로 깔아주고,
    // 캡처(readPixels/drawImage)는 배경 없이 잉크만 투명 PNG 로 나온다.
    // asemic 히스토리가 턴마다 이미지를 쌓으므로 불투명하면 앞 턴을 덮어버린다.
    // goo 와 성장은 (1-a) 마스크 때문에 겹치지 않으므로 커버리지를 그냥 더한다.
    float alpha = clamp(a + ag, 0.0, 1.0);
    vec3 rgb = alpha > 1e-4 ? (col * a + u_growInk * ag) / alpha : col;

    outColor = vec4(rgb, alpha);
}
