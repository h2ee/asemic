import{h as el,N as An,S as tl,C as Tt,F as us,V as Ye,R as nl,i as Zt,w as Xi,j as ti,W as on,k as Lt,L as gi,H as lo,U as bn,D as pn,B as an,m as Ti,t as il,n as ol,o as co,q as al,r as rl,E as sl,u as wt,P as Yi,A as ll,x as Eo,y as rn,z as eo,G as Qo,I as Mi,J as Ai,K as ds,O as cl,Q as Jn,X as to,Y as fl,Z as ul,_ as hi,$ as dl,a0 as hl,a1 as pl,a2 as _l,a3 as ml,a4 as gl,a5 as vl,a6 as Sl,a7 as xl,a8 as El,a9 as Tl,aa as Ml,ab as Al,ac as bl,ad as Rl,ae as yl,af as wl,ag as Cl,ah as To,ai as Tn,aj as Pi,ak as Ll,al as Un,am as Il,an as Pl,ao as Dl,ap as Ul,aq as hs,ar as Nl,as as Fl,at as Ol,au as Bl,av as lt,aw as Gl,ax as Hl,ay as kl,az as Rn,aA as ps,aB as qi,aC as _n,aD as _s,aE as Nn,aF as hn,aG as no,aH as ms,aI as gs,aJ as vs,aK as ea,aL as Vl,aM as zl,aN as Wl,aO as Ss,aP as Mn,aQ as Xl,aR as Yl,aS as ql,aT as $l,aU as Kl,aV as xs,aW as jl,aX as Es,aY as Ts,aZ as Mo,a_ as Ao,a$ as bo,b0 as Ro,b1 as Et,b2 as Ma,b3 as Aa,b4 as ba,b5 as Ra,b6 as ya,b7 as wa,b8 as Ca,b9 as La,ba as Ia,bb as Pa,bc as Da,bd as Ua,be as Na,bf as Fa,bg as Oa,bh as Ba,bi as Ga,bj as Ha,bk as ka,bl as Va,bm as za,bn as yo,bo as Wa,bp as Xa,bq as Zl,br as Ya,bs as qa,bt as $a,bu as Go,bv as Ho,bw as ko,bx as Vo,by as zo,bz as Wo,bA as Xo,bB as Jl,bC as Ka,bD as Ql,bE as $i,bF as ec,bG as ja,bH as Za,bI as Ja,bJ as Yo,bK as qo,bL as tc,bM as Ms,bN as nc,bO as fo,bP as ic,bQ as oc,bR as As,bS as bs,bT as Qa,bU as Rs,bV as er,bW as ys,bX as bi,bY as ni,bZ as ws,b_ as ac,b$ as rc,c0 as sc,c1 as lc,c2 as tr,c3 as Kt,c4 as cc,c5 as fc,c6 as uc,c7 as dc,c8 as hc,c9 as pc,ca as _c,cb as mc,cc as gc,cd as vc,ce as Sc,cf as xc,cg as Ec,ch as Tc,ci as Mc,cj as Ac,ck as bc,g as Rc,cl as yc,cm as wc,cn as Cc}from"./core-Dn9-EtVy.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function n(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(a){if(a.ep)return;a.ep=!0;const o=n(a);fetch(a.href,o)}})();const nr=250,Lc=900,ir=580,Ic=2600,or=e=>e<0?0:e>1?1:e;function ta(e,t){if(!t)return null;const n=e[t+"_jong"];return n?n.pos?n:n.cluster_front?e[n.cluster_front+"_jong"]??null:null:null}const ar=2.2,Pc=5,rr=[1.25,2.1],sr=[2.5,5],lr=[.1,.35],Dc=3.5,Uc=420,wo=(e,t,n)=>e+(t-e)*n,zn=(e,t,n)=>Math.exp(-(((e-t)/n)**2));function Nc(e,t){const n=e[t.cho]?.cho,i=e[t.jung];if(!n?.pos||!i?.pos)return null;const[a,o,r]=n.pos,[s,c]=i.pos,f=or((s-nr)/(Lc-nr)),m=or((c-ir)/(Ic-ir)),l=i.yang?1:-1,h=i.diphthong?1:0,p=ta(e,t.jong),S=p?.pos?.[1]??.5,x=p?.pos?.[2]??.33,_=ar+f*(Pc-ar),u=wo(rr[0],rr[1],r),T=wo(sr[0],sr[1],m),b=wo(lr[0],lr[1],f),R=Uc,G=_/R,N=b*Math.PI*2/_,L=u*2*Math.PI*T/_,O=new Float64Array(R);for(let w=0;w<R;w++){const U=w/(R-1),k=zn(U,.34,.045)-zn(U,.68,.045),W=Math.sin(U*Math.PI*2*11)*.8,J=1,X=Math.sin(U*Math.PI*2*2.2);O[w]=zn(o,0,.3)*k+zn(o,.5,.22)*W+zn(o,.78,.26)*J+zn(o,1,.22)*X}let v=0;for(let w=0;w<R;w++)v+=Math.abs(O[w]);const g=v>1e-9?Dc/(v*G):0;return{N:R,ds:G,theta0:-Math.PI*.15+(a-.5)*Math.PI*.7,k(w){const U=w/(R-1),k=h&&U>.5?Math.PI:0,W=L*Math.cos(2*Math.PI*T*U+k);let J=(N+W)*l+O[w]*g;if(p&&U>.85){const X=(U-.85)/.15;J+=(S>=.5?1:-1)*(6+x*18)*Math.sin(X*Math.PI)}return J},step(w){return G*(1+r*.35*Math.sin(w*2.399))}}}function Fc(e,t){let n=0,i=0;const a=[{x:n,y:i}];for(let o=0;o<e.N;o++){t+=e.k(o)*e.ds;const r=e.step(o);n+=Math.cos(t)*r,i+=Math.sin(t)*r,a.push({x:n,y:i})}return{pts:a,theta:t}}function Oc(e,t,n=null){const i=[];let a=null;for(let o=0;o<e.length;o++){const r=e[o];(!a||Math.hypot(r.x-a.x,r.y-a.y)>=t)&&(i.push(r),n?.push(o),a=r)}return i}const Bc=.35,Gc=1,Hc=.4,cr=e=>Math.atan2(Math.sin(e),Math.cos(e));function kc(e,t,n,i,a,o=5,r=null){let s=null,c=0,f=0;const m=[{x:0,y:0}],l=[];for(const S of t){const x=Nc(e,S);if(!x)continue;l.push({walkIdx:m.length-1,syl:S}),s=s===null?x.theta0:s+cr(x.theta0-s)*Bc;const{pts:_,theta:u}=Fc(x,s);s=u;const T=_[_.length-1],b=Math.hypot(T.x,T.y);if(b<1e-6)continue;let R=1/0,G=-1/0,N=1/0,L=-1/0;for(const W of _)W.x<R&&(R=W.x),W.x>G&&(G=W.x),W.y<N&&(N=W.y),W.y>L&&(L=W.y);const O=Math.atan2(T.y,T.x),v=-cr(O)*Gc,g=Math.cos(v),w=Math.sin(v),U=1/Math.max(b,Math.max(G-R,L-N)*Hc);for(let W=1;W<_.length;W++){const J=_[W].x*U,X=_[W].y*U;m.push({x:c+(J*g-X*w),y:f+(J*w+X*g)})}const k=m[m.length-1];c=k.x,f=k.y,s+=v}if(m.length<2)return r&&(r.starts=[]),[];const h=[],p=Oc(m.map(S=>({x:n+S.x*a,y:i+S.y*a})),o,h);if(r){const S=[0];for(let _=1;_<p.length;_++)S.push(S[_-1]+Math.hypot(p[_].x-p[_-1].x,p[_].y-p[_-1].y));let x=0;r.starts=l.map(({walkIdx:_,syl:u})=>{for(;x<h.length-1&&h[x]<_;)x++;return{px0:S[x],syl:u}})}return p}const St=32,Vc=9,fr=.8,zc=2.4,ur=2,dr=7,vi=12,Di=[[0,8],[.33,9.5],[.5,15],[.75,17],[1,19]],Wc=1.5*Math.PI,Xc=20;function Yc(e){let t=1;for(;t<Di.length-1&&e>Di[t][0];)t++;const[n,i]=Di[t-1],[a,o]=Di[t];return i+(o-i)*Math.min(1,Math.max(0,(e-n)/(a-n)))}function qc(e,t){const n=ta(e,t);if(!n?.pos)return[vi,0];const[i,a]=n.pos;return[Yc(a),i*Wc]}const $c=`#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`,Kc=`#version 300 es
#ifdef GL_ES
precision highp float;
#endif
#define PI      3.14159265
#define MAX_SYL ${St}
#define COLOR_BLEND_K ${Xc.toFixed(1)}

uniform vec2  u_resolution;
uniform float u_time;
uniform int   u_sylCount;
uniform vec2  u_pos[MAX_SYL];
uniform vec4  u_cells[MAX_SYL];
uniform vec4  u_prev[MAX_SYL];
uniform float u_morphT[MAX_SYL];
uniform float u_waveT[MAX_SYL];
uniform float u_radii[MAX_SYL];
uniform float u_sminK;
uniform float u_f3Norm[MAX_SYL];
uniform vec2  u_ripple[MAX_SYL];     // 종성 → 잔물결 (r 주파수, 위상) — JS jongRipple()
uniform vec2  u_ripplePrev[MAX_SYL]; // 모프 시작값 (u_prev 와 같은 역할)

out vec4 fragColor;

float rand(vec3 p){
  float sd = dot(p, vec3(13.1313, 17.3535, 31.2323));
  float sv = sin(sd) * 45678.54321;
  return fract(sv);
}

float chladniVal(float m, float n, float theta, float r) {
  float A = cos(m * theta) * cos(n * PI * r);
  float B = cos(n * theta) * cos(m * PI * r);
  return abs(A - B);
}

float chladniAtUV(vec4 params, vec2 p, vec2 sylPos, float aspect, float radius) {
  vec2 delta = p - sylPos;
  delta.x   *= aspect;
  float r     = length(delta) / radius;
  float theta = atan(delta.y, delta.x);
  return chladniVal(params.x, params.y, theta, r);
}

float smin(float a, float b, float k) {
  k *= 4.0;
  float h = max(k - abs(a - b), 0.0);
  return min(a, b) - h * h * 0.25 / k;
}

float eio(float t) {
  return t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;
}

vec4 interpParams(int i) {
  float mt = eio(clamp(u_morphT[i], 0.0, 1.0));
  return mix(u_prev[i], u_cells[i], mt);
}

vec3 calcNormal(int i, vec2 uv, float aspect, float hsc) {
  vec4  params = interpParams(i);
  vec2  pos    = u_pos[i];
  float radius = u_radii[i];
  vec2  e      = vec2(0.003, 0.0);
  float h0 = chladniAtUV(params, uv,       pos, aspect, radius) * hsc;
  float h1 = chladniAtUV(params, uv+e.xy,  pos, aspect, radius) * hsc;
  float h2 = chladniAtUV(params, uv+e.yx,  pos, aspect, radius) * hsc;
  return normalize(cross(
    vec3(uv+e.xy, h1) - vec3(uv, h0),
    vec3(uv+e.yx, h2) - vec3(uv, h0)
  ));
}

float sylSDF(int i, vec2 p, float aspect) {
  float radius = u_radii[i];
  vec2  delta  = p - u_pos[i];
  delta.x     *= aspect;

  float dist  = length(delta);
  float r     = dist / radius;
  float theta = atan(delta.y, delta.x);

  vec4  params  = interpParams(i);
  float m       = params.x;
  float n       = params.y;
  float wt      = u_waveT[i];

  float waveEnv = exp(-wt * 3.2);
  float waveSin = sin(wt * 8.0 * PI);
  float waveAmp = waveEnv * waveSin * 0.5;

  float d = chladniVal(m, n, theta, r);
  d *= 1.0 + waveAmp * 0.4;

  // sine 방식 — r 주파수·위상은 종성 (받침 없으면 12, 0)
  vec2  rip  = mix(u_ripplePrev[i], u_ripple[i], eio(clamp(u_morphT[i], 0.0, 1.0)));
  float disp = sin(r * rip.x + theta * 2.0 + rip.y) * 0.9; //0.4, 1.4
  //noise 방식 (rand 활용)
  float disp2 = rand(vec3(floor(delta * 270.0), 0.0)) * 0.05;
  // 선에 필압 같은 효과
  float disp3 = cos(r * 2.0 + theta * 2.0) * 0.48;

  d += disp;
  d += disp2;
  d += disp3;

  float outside = max(0.0, r*0.9 - 1.0) * 2.0; //r*2.0, 0.8
  return d + outside + 0.2; // offset (실험 중)
}

// ── 컬러 등고선 ─────────────────────────────────────────────────────────────
vec3 hue2rgb(float h) {
  float r = abs(h * 6.0 - 3.0) - 1.0;
  float g = 2.0 - abs(h * 6.0 - 2.0);
  float b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3(r, g, b), 0.0, 1.0);
}

// 컬러 등고선 — 초성 값 기반 (고정 팔레트 없음)
// t=0: 마디선 (가장 진함)  t=1: 흰 배경
// choX (조음위치) → hue  |  choZ (긴장도) → 채도
vec3 heatmap(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 0.82);         // 조음위치 → 색상
  float vivid = 0.20 + choZ * 0.80;           // 긴장도 → 채도
  vec3  peak  = mix(vec3(0.65), hue, vivid);  // 포화 색
  vec3  dark  = peak * 0.15;                  // 마디선: 어둡게
  dark = peak * 1.5;
  if (t < 0.35) {
    return mix(dark, peak, t / 0.35);
  } else {
    return mix(peak, vec3(1.0), (t - 0.35) / 0.65);
  }
}

vec3 heatmap2(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 0.82);
  float vivid = 0.20 + choZ * 0.80;
  vec3  peak  = mix(vec3(0.65), hue, vivid);
  vec3  dark  = peak * 0.15;
  float midT = 0.15;
  if (t > midT) {
    return mix(dark, peak, t / midT);
  } else {
    return mix(peak, vec3(1.0), (t - midT) / 0.65);
  }
}

//현재 사용
vec3 heatmap3(float t, float choX, float choZ) {
  vec3  hue   = hue2rgb(choX * 0.82); // 0.82
  float vivid = 0.05 + choZ * 0.50;
  vec3  peak  = mix(vec3(0.95), hue, vivid);
  vec3  dark  = peak * 1.5; //0.15, 3.15, 1.15
  float midT = 0.1; //0.1
  if (t < midT) {
    return mix(dark, peak, t / midT);
  } else {
    return mix(peak, vec3(0.9804, 0.9882, 1.0), (t - midT) / 0.65); // #bg color (조절 1)
  }
}

void main() {
  int count = u_sylCount;
  if (count < 1) { fragColor = vec4(0.0); return; }   // premultiplied — 흰색을 남기면 배경을 칠한다

  vec2  uv     = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  // 그레인 - 현재 사용 안함
  float shk_a = rand(vec3(uv, .0)) * 2. * PI;
  float shk_r = rand(vec3(uv, 1.)) * .005;
  vec2 shk = vec2(cos(shk_a), sin(shk_a)) * shk_r;
  //uv += shk;

  // ── 색 = 단어 원마다 고유 색, 원 경계 근처만 섞기 (2026-10-28) ─────────────────────
  // 예전엔 choX/choZ를 (0.5, 0.33)에서 시작해 SDF 가중치 1/(d²) 로 평균했다. 원 하나면 그 결과가
  //   (choX + 0.5·(d²+0.001), choZ + 0.33·(d²+0.001)) — 마디선에서 멀수록 초성과 무관하게 올라가는 몫이 지금 룩의 색 띠다.
  // 원이 여럿이면 가중치 합이 커져 그 몫이 줄고 초성끼리 평균이 돼서, 문장 안 단어 원들이 단독일 때보다 바래고 비슷해졌다.
  // 이제 초성 값은 가장 가까운 원(원 중심까지 거리 / 반경)을 따르고 경계에서만 COLOR_BLEND_K 폭으로 섞으며,
  // 색 띠 몫은 합친 무늬 d로 얹는다 — 원 하나면 예전과 픽셀까지 같다
  float d       = 1e9;
  float choXAcc = 0.0;
  float choZAcc = 0.0;
  float totalW  = 0.0;

  float dnMin = 1e9; // 가장 가까운 원까지 거리 / 반경
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    vec2 dl = uv - u_pos[i];
    dl.x   *= aspect;
    dnMin   = min(dnMin, length(dl) / u_radii[i]);
  }

  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float di   = sylSDF(i, uv, aspect);
    vec4  cp   = interpParams(i);
    vec2  dl   = uv - u_pos[i];
    dl.x      *= aspect;
    float dn   = length(dl) / u_radii[i];
    float w    = exp(-(dn - dnMin) * COLOR_BLEND_K); // 가장 가까운 원 = 1 (언더플로 없음)
    choXAcc   += cp.z * w;
    choZAcc   += cp.w * w;
    totalW    += w;
    d = smin(d, di, u_sminK);
  }
  choXAcc = choXAcc / totalW + 0.5 * (d * d + 0.001);
  choZAcc = choZAcc / totalW + 0.33 * (d * d + 0.001);

  // presence: per-slot smoothstep 후 max 합산
  float presence = 0.0;
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float radius = u_radii[i];
    vec2  delta  = uv - u_pos[i];
    delta.x     *= aspect;
    presence = max(presence, smoothstep(radius * 1.2, radius * 0.6, length(delta)));
  }
  if (presence < 0.001) { fragColor = vec4(0.0); return; }

  // ── fake normal (F3 → 기복 강도) ─────────────────────────────────────────
  vec3  nrmAcc = vec3(0.0);
  float nrmW   = 0.0;
  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float di  = sylSDF(i, uv, aspect);
    float w   = 1.0 / (di * di + 0.001);
    float hsc = mix(3.0, 7.0, u_f3Norm[i]);
    nrmAcc   += calcNormal(i, uv, aspect, hsc) * w;
    nrmW     += w;
  }
  vec3 nrm = normalize(nrmAcc / max(nrmW, 0.001));

  vec3 light = vec3(0.5, 0.8, 1.0);
  vec3  lightDir = normalize(light);
  float diff     = clamp(dot(nrm, lightDir), 0.0, 1.0);
  float spec     = pow(max(dot(reflect(-lightDir, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 32.0);

  // ── 컬러 등고선 ──────────────────────────────────────────────────────────
  // d=0: 마디선, d 클수록 → 흰 배경
  // 3.0 스케일: 등온선 폭 조절 (높일수록 색 띠가 좁아짐)
  float t   = clamp(d * 3.0, 0.0, 1.0);
  vec3  col = heatmap3(t, choXAcc, choZAcc);

  // fake normal 조명 (heatmap 색조 보존, 가볍게)
  col = col * (0.82 + 0.18 * diff);
  col = clamp(col + spec * 0.12, 0.0, 1.0);

  // ── 흑백 등고선 ──────────────────────────────────────
  float fw      = fwidth(d) * 0.8;
  float lineStr = 1.0 - smoothstep(0.0, fw, abs(d));
  float band    = abs(fract(d * 1.5) - 0.5) * 2.0;
  float bandStr = (1.0 - smoothstep(0.0, fw * 2.0, band)) * 0.18;
  float dark    = clamp(lineStr + bandStr, 0.0, 1.0);
  dark = lineStr; // 등고선만
  // heatmap 위에 검은 등고선 오버레이
  col = mix(col, vec3(0.0), dark);
  // ────────────────────────────────────────────────────────────────────────

  // ⚠️ 캔버스 컨텍스트가 premultipliedAlpha:true(기본값)다 — RGB를 알파로 미리 곱해서
  //    내보내야 한다. 안 그러면 합성기가 canvasRGB + dest*(1-canvasA) 로 섞으면서
  //    presence가 작은 자리마다 col이 그대로 더해져 **배경 위에 흰 상자**가 생긴다.
  //    (배경이 흰색이던 시절엔 안 보였고, TD 투명 합성으로 오면서 드러났다)
  fragColor = vec4(col * presence, presence);
}
`;function jc(e,t=.5){const n=ur-1,i=1+(e-250)/650*n;return Math.max(1,Math.min(ur,i+(t-.5)*.6))}function Zc(e){const t=dr-1;return Math.max(1,Math.min(dr,1+(e-580)/2020*t))}function hr(e,t,n){const i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)?i:(console.error("[sora] Shader error:",e.getShaderInfoLog(i)),e.deleteShader(i),null)}function Jc(e,t,n){const i=hr(e,e.VERTEX_SHADER,t),a=hr(e,e.FRAGMENT_SHADER,n);if(!i||!a)return null;const o=e.createProgram();return e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),e.getProgramParameter(o,e.LINK_STATUS)?o:(console.error("[sora] Link error:",e.getProgramInfoLog(o)),null)}class Qc{constructor(){this._canvas=null,this._gl=null,this._prog=null,this._locs={},this._raf=null,this._startT=performance.now(),this._ownCanvas=!1,this._cells=Array.from({length:St},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:St},()=>[2,3,.5,.33]),this._positions=Array.from({length:St},()=>[.5,.5]),this._radii=Array(St).fill(.1),this._morphStart=Array(St).fill(-999),this._waveStart=Array(St).fill(-999),this._f3Norms=Array(St).fill(.5),this._ripple=Array.from({length:St},()=>[vi,0]),this._prevRipple=Array.from({length:St},()=>[vi,0]),this._frozen=Array(St).fill(!1),this._wordPositions=new Map,this._wordRadii=new Map,this._rect=null,this.sylSize=150,this._sylCount=0,this._sminK=.06,this.lineHeightRatio=1.5,this.maxWords=Vc}async init(t){t?this._canvas=t:(this._canvas=document.createElement("canvas"),this._canvas.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._canvas),this._ownCanvas=!0),this._resize(),window.addEventListener("resize",this._onResize);const n=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!n){console.error("[sora] WebGL2 not supported");return}if(this._gl=n,this._prog=Jc(n,$c,Kc),!this._prog)return;n.useProgram(this._prog),n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE_MINUS_SRC_ALPHA);const i=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,i),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),n.STATIC_DRAW);const a=n.getAttribLocation(this._prog,"position");n.enableVertexAttribArray(a),n.vertexAttribPointer(a,2,n.FLOAT,!1,0,0),this._locs={res:n.getUniformLocation(this._prog,"u_resolution"),time:n.getUniformLocation(this._prog,"u_time"),count:n.getUniformLocation(this._prog,"u_sylCount"),sminK:n.getUniformLocation(this._prog,"u_sminK")};for(let o=0;o<St;o++)this._locs[`pos_${o}`]=n.getUniformLocation(this._prog,`u_pos[${o}]`),this._locs[`cell_${o}`]=n.getUniformLocation(this._prog,`u_cells[${o}]`),this._locs[`prev_${o}`]=n.getUniformLocation(this._prog,`u_prev[${o}]`),this._locs[`morph_${o}`]=n.getUniformLocation(this._prog,`u_morphT[${o}]`),this._locs[`wave_${o}`]=n.getUniformLocation(this._prog,`u_waveT[${o}]`),this._locs[`f3_${o}`]=n.getUniformLocation(this._prog,`u_f3Norm[${o}]`),this._locs[`rad_${o}`]=n.getUniformLocation(this._prog,`u_radii[${o}]`),this._locs[`rip_${o}`]=n.getUniformLocation(this._prog,`u_ripple[${o}]`),this._locs[`ripPrev_${o}`]=n.getUniformLocation(this._prog,`u_ripplePrev[${o}]`);this._raf=requestAnimationFrame(this._animate)}setRect(t){this._rect=t??null}wordAnchors(){const t=window.innerWidth,n=window.innerHeight;return(this._slotWordIds??[]).map((i,a)=>({wordId:i,x:this._positions[a][0]*t,y:this._positions[a][1]*n,r:this._radii[a]*n}))}_toRect(t,n){const i=this._rect;return i?[(i.x+t*i.w)/window.innerWidth,(i.y+n*i.h)/window.innerHeight]:[t,n]}update(t,n,i){if(!i)return;const a=(performance.now()-this._startT)/1e3,o=new Map;(t??[]).forEach((l,h)=>{const p=l.wordId??0;o.has(p)||o.set(p,[]),o.get(p).push({syl:l,pos:n[h]??[.5,.5]})});const r=[...o.keys()].sort((l,h)=>l-h),s=Math.min(r.length,this.maxWords,St),c=.22,f=this._rect?this._rect.h/window.innerHeight:1,m=this.sylSize/550*f;for(const l of r)this._wordPositions.has(l)||this._wordPositions.set(l,this._toRect(c+Math.random()*(1-c*2),c+Math.random()*(1-c*2))),this._wordRadii.has(l)||this._wordRadii.set(l,m*(Math.random()*.75+.25));for(const l of this._wordPositions.keys())o.has(l)||(this._wordPositions.delete(l),this._wordRadii.delete(l));for(let l=0;l<s;l++){const h=r[l],p=o.get(h),S=p[p.length-1],x=r.some(k=>k>h);if(this._frozen[l]=x,this._positions[l]=this._wordPositions.get(h),this._radii[l]=this._wordRadii.get(h),x)continue;const _=i[S.syl.jung],u=i[S.syl.cho]?.cho;if(!_?.pos)continue;const[T,b]=_.pos,R=u?.pos?.[0]??.5,G=u?.pos?.[2]??.33,N=_.pos[2]??2500,L=Math.max(0,Math.min(1,(N-2080)/1120));this._f3Norms[l]=L;const O=[jc(T,R),Zc(b),R,G],v=this._cells[l],g=qc(i,S.syl.jong),w=this._ripple[l];if(O.some((k,W)=>Math.abs(k-v[W])>.01)||g.some((k,W)=>Math.abs(k-w[W])>.01)){const k=a-this._morphStart[l],W=Math.min(k/fr,1),J=W<.5?2*W*W:-1+(4-2*W)*W,X=this._prevCells[l];this._prevCells[l]=v.map((Z,he)=>X[he]+(Z-X[he])*J),this._cells[l]=O;const ie=this._prevRipple[l];this._prevRipple[l]=w.map((Z,he)=>ie[he]+(Z-ie[he])*J),this._ripple[l]=g,this._morphStart[l]=a,this._waveStart[l]=a}}this._sylCount=s,this._slotWordIds=r.slice(0,s);for(let l=s;l<St;l++)this._frozen[l]=!1}async flushQueue(){for(let t=0;t<St;t++)this._prevCells[t]=[...this._cells[t]],this._prevRipple[t]=[...this._ripple[t]],this._morphStart[t]=-999,this._waveStart[t]=-999;await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t)))}captureFrame(){return!this._gl||!this._canvas?null:(this._render(),this._canvas.toDataURL("image/png"))}clearAccum(){this._cells=Array.from({length:St},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:St},()=>[2,3,.5,.33]),this._positions=Array.from({length:St},()=>[.5,.5]),this._radii=Array(St).fill(.1),this._morphStart=Array(St).fill(-999),this._waveStart=Array(St).fill(-999),this._f3Norms=Array(St).fill(.5),this._ripple=Array.from({length:St},()=>[vi,0]),this._prevRipple=Array.from({length:St},()=>[vi,0]),this._frozen=Array(St).fill(!1),this._wordPositions.clear(),this._wordRadii.clear(),this._slotWordIds=[],this._sylCount=0,this._render()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._gl&&this._prog&&this._gl.deleteProgram(this._prog),this._gl=null}_animate=()=>{this._raf=requestAnimationFrame(this._animate),this._render()};_render(){const t=this._gl;if(!t)return;const n=(performance.now()-this._startT)/1e3,i=this._locs;t.viewport(0,0,this._canvas.width,this._canvas.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.uniform2f(i.res,this._canvas.width,this._canvas.height),t.uniform1f(i.time,n),t.uniform1i(i.count,this._sylCount),t.uniform1f(i.sminK,this._sminK);for(let a=0;a<St;a++){const o=this._cells[a],r=this._prevCells[a],s=this._positions[a],c=Math.min((n-this._morphStart[a])/fr,1),f=Math.min((n-this._waveStart[a])/zc,1);t.uniform2f(i[`pos_${a}`],s[0],s[1]),t.uniform4f(i[`cell_${a}`],o[0],o[1],o[2],o[3]),t.uniform4f(i[`prev_${a}`],r[0],r[1],r[2],r[3]),t.uniform1f(i[`morph_${a}`],c),t.uniform1f(i[`wave_${a}`],f),t.uniform1f(i[`f3_${a}`],this._f3Norms[a]),t.uniform1f(i[`rad_${a}`],this._radii[a]),t.uniform2fv(i[`rip_${a}`],this._ripple[a]),t.uniform2fv(i[`ripPrev_${a}`],this._prevRipple[a])}t.drawArrays(t.TRIANGLES,0,6)}_resize(){if(!this._canvas)return;const t=Math.min(window.devicePixelRatio,2);this._canvas.width=window.innerWidth*t,this._canvas.height=window.innerHeight*t}_onResize=()=>{this._resize()}}const mn=11102230246251565e-32,Wt=134217729,ef=(3+8*mn)*mn;function Co(e,t,n,i,a){let o,r,s,c,f=t[0],m=i[0],l=0,h=0;m>f==m>-f?(o=f,f=t[++l]):(o=m,m=i[++h]);let p=0;if(l<e&&h<n)for(m>f==m>-f?(r=f+o,s=o-(r-f),f=t[++l]):(r=m+o,s=o-(r-m),m=i[++h]),o=r,s!==0&&(a[p++]=s);l<e&&h<n;)m>f==m>-f?(r=o+f,c=r-o,s=o-(r-c)+(f-c),f=t[++l]):(r=o+m,c=r-o,s=o-(r-c)+(m-c),m=i[++h]),o=r,s!==0&&(a[p++]=s);for(;l<e;)r=o+f,c=r-o,s=o-(r-c)+(f-c),f=t[++l],o=r,s!==0&&(a[p++]=s);for(;h<n;)r=o+m,c=r-o,s=o-(r-c)+(m-c),m=i[++h],o=r,s!==0&&(a[p++]=s);return(o!==0||p===0)&&(a[p++]=o),p}function tf(e,t){let n=t[0];for(let i=1;i<e;i++)n+=t[i];return n}function wi(e){return new Float64Array(e)}const nf=(3+16*mn)*mn,of=(2+12*mn)*mn,af=(9+64*mn)*mn*mn,Wn=wi(4),pr=wi(8),_r=wi(12),mr=wi(16),Yt=wi(4);function rf(e,t,n,i,a,o,r){let s,c,f,m,l,h,p,S,x,_,u,T,b,R,G,N,L,O;const v=e-a,g=n-a,w=t-o,U=i-o;R=v*U,h=Wt*v,p=h-(h-v),S=v-p,h=Wt*U,x=h-(h-U),_=U-x,G=S*_-(R-p*x-S*x-p*_),N=w*g,h=Wt*w,p=h-(h-w),S=w-p,h=Wt*g,x=h-(h-g),_=g-x,L=S*_-(N-p*x-S*x-p*_),u=G-L,l=G-u,Wn[0]=G-(u+l)+(l-L),T=R+u,l=T-R,b=R-(T-l)+(u-l),u=b-N,l=b-u,Wn[1]=b-(u+l)+(l-N),O=T+u,l=O-T,Wn[2]=T-(O-l)+(u-l),Wn[3]=O;let k=tf(4,Wn),W=of*r;if(k>=W||-k>=W||(l=e-v,s=e-(v+l)+(l-a),l=n-g,f=n-(g+l)+(l-a),l=t-w,c=t-(w+l)+(l-o),l=i-U,m=i-(U+l)+(l-o),s===0&&c===0&&f===0&&m===0)||(W=af*r+ef*Math.abs(k),k+=v*m+U*s-(w*f+g*c),k>=W||-k>=W))return k;R=s*U,h=Wt*s,p=h-(h-s),S=s-p,h=Wt*U,x=h-(h-U),_=U-x,G=S*_-(R-p*x-S*x-p*_),N=c*g,h=Wt*c,p=h-(h-c),S=c-p,h=Wt*g,x=h-(h-g),_=g-x,L=S*_-(N-p*x-S*x-p*_),u=G-L,l=G-u,Yt[0]=G-(u+l)+(l-L),T=R+u,l=T-R,b=R-(T-l)+(u-l),u=b-N,l=b-u,Yt[1]=b-(u+l)+(l-N),O=T+u,l=O-T,Yt[2]=T-(O-l)+(u-l),Yt[3]=O;const J=Co(4,Wn,4,Yt,pr);R=v*m,h=Wt*v,p=h-(h-v),S=v-p,h=Wt*m,x=h-(h-m),_=m-x,G=S*_-(R-p*x-S*x-p*_),N=w*f,h=Wt*w,p=h-(h-w),S=w-p,h=Wt*f,x=h-(h-f),_=f-x,L=S*_-(N-p*x-S*x-p*_),u=G-L,l=G-u,Yt[0]=G-(u+l)+(l-L),T=R+u,l=T-R,b=R-(T-l)+(u-l),u=b-N,l=b-u,Yt[1]=b-(u+l)+(l-N),O=T+u,l=O-T,Yt[2]=T-(O-l)+(u-l),Yt[3]=O;const X=Co(J,pr,4,Yt,_r);R=s*m,h=Wt*s,p=h-(h-s),S=s-p,h=Wt*m,x=h-(h-m),_=m-x,G=S*_-(R-p*x-S*x-p*_),N=c*f,h=Wt*c,p=h-(h-c),S=c-p,h=Wt*f,x=h-(h-f),_=f-x,L=S*_-(N-p*x-S*x-p*_),u=G-L,l=G-u,Yt[0]=G-(u+l)+(l-L),T=R+u,l=T-R,b=R-(T-l)+(u-l),u=b-N,l=b-u,Yt[1]=b-(u+l)+(l-N),O=T+u,l=O-T,Yt[2]=T-(O-l)+(u-l),Yt[3]=O;const ie=Co(X,_r,4,Yt,mr);return mr[ie-1]}function Ui(e,t,n,i,a,o){const r=(t-o)*(n-a),s=(e-a)*(i-o),c=r-s,f=Math.abs(r+s);return Math.abs(c)>=nf*f?c:-rf(e,t,n,i,a,o,f)}const gr=Math.pow(2,-52),Ni=new Uint32Array(512);class io{static from(t,n=uf,i=df){const a=t.length,o=new Float64Array(a*2);for(let r=0;r<a;r++){const s=t[r];o[2*r]=n(s),o[2*r+1]=i(s)}return new io(o)}constructor(t){const n=t.length>>1;if(n>0&&typeof t[0]!="number")throw new Error("Expected coords to contain numbers.");this.coords=t;const i=Math.max(2*n-5,0);this._triangles=new Uint32Array(i*3),this._halfedges=new Int32Array(i*3),this._hashSize=Math.ceil(Math.sqrt(n)),this._hullPrev=new Uint32Array(n),this._hullNext=new Uint32Array(n),this._hullTri=new Uint32Array(n),this._hullHash=new Int32Array(this._hashSize),this._ids=new Uint32Array(n),this._dists=new Float64Array(n),this.trianglesLen=0,this._cx=0,this._cy=0,this._hullStart=0,this.hull=this._triangles,this.triangles=this._triangles,this.halfedges=this._halfedges,this.update()}update(){const{coords:t,_hullPrev:n,_hullNext:i,_hullTri:a,_hullHash:o}=this,r=t.length>>1;let s=1/0,c=1/0,f=-1/0,m=-1/0;for(let v=0;v<r;v++){const g=t[2*v],w=t[2*v+1];g<s&&(s=g),w<c&&(c=w),g>f&&(f=g),w>m&&(m=w),this._ids[v]=v}const l=(s+f)/2,h=(c+m)/2;let p=0,S=0,x=0;for(let v=0,g=1/0;v<r;v++){const w=Lo(l,h,t[2*v],t[2*v+1]);w<g&&(p=v,g=w)}const _=t[2*p],u=t[2*p+1];for(let v=0,g=1/0;v<r;v++){if(v===p)continue;const w=Lo(_,u,t[2*v],t[2*v+1]);w<g&&w>0&&(S=v,g=w)}let T=t[2*S],b=t[2*S+1],R=1/0;for(let v=0;v<r;v++){if(v===p||v===S)continue;const g=cf(_,u,T,b,t[2*v],t[2*v+1]);g<R&&(x=v,R=g)}let G=t[2*x],N=t[2*x+1];if(R===1/0){for(let w=0;w<r;w++)this._dists[w]=t[2*w]-t[0]||t[2*w+1]-t[1];Qn(this._ids,this._dists,0,r-1);const v=new Uint32Array(r);let g=0;for(let w=0,U=-1/0;w<r;w++){const k=this._ids[w],W=this._dists[k];W>U&&(v[g++]=k,U=W)}this.hull=v.subarray(0,g),this.triangles=new Uint32Array(0),this.halfedges=new Int32Array(0);return}if(Ui(_,u,T,b,G,N)<0){const v=S,g=T,w=b;S=x,T=G,b=N,x=v,G=g,N=w}const L=ff(_,u,T,b,G,N);this._cx=L.x,this._cy=L.y;for(let v=0;v<r;v++)this._dists[v]=Lo(t[2*v],t[2*v+1],L.x,L.y);Qn(this._ids,this._dists,0,r-1),this._hullStart=p;let O=3;i[p]=n[x]=S,i[S]=n[p]=x,i[x]=n[S]=p,a[p]=0,a[S]=1,a[x]=2,o.fill(-1),o[this._hashKey(_,u)]=p,o[this._hashKey(T,b)]=S,o[this._hashKey(G,N)]=x,this.trianglesLen=0,this._addTriangle(p,S,x,-1,-1,-1);for(let v=0,g=0,w=0;v<this._ids.length;v++){const U=this._ids[v],k=t[2*U],W=t[2*U+1];if(v>0&&Math.abs(k-g)<=gr&&Math.abs(W-w)<=gr||(g=k,w=W,U===p||U===S||U===x))continue;let J=0;for(let we=0,He=this._hashKey(k,W);we<this._hashSize&&(J=o[(He+we)%this._hashSize],!(J!==-1&&J!==i[J]));we++);J=n[J];let X=J,ie;for(;ie=i[X],Ui(k,W,t[2*X],t[2*X+1],t[2*ie],t[2*ie+1])>=0;)if(X=ie,X===J){X=-1;break}if(X===-1)continue;let Z=this._addTriangle(X,U,i[X],-1,-1,a[X]);a[U]=this._legalize(Z+2),a[X]=Z,O++;let he=i[X];for(;ie=i[he],Ui(k,W,t[2*he],t[2*he+1],t[2*ie],t[2*ie+1])<0;)Z=this._addTriangle(he,U,ie,a[U],-1,a[he]),a[U]=this._legalize(Z+2),i[he]=he,O--,he=ie;if(X===J)for(;ie=n[X],Ui(k,W,t[2*ie],t[2*ie+1],t[2*X],t[2*X+1])<0;)Z=this._addTriangle(ie,U,X,-1,a[X],a[ie]),this._legalize(Z+2),a[ie]=Z,i[X]=X,O--,X=ie;this._hullStart=n[U]=X,i[X]=n[he]=U,i[U]=he,o[this._hashKey(k,W)]=U,o[this._hashKey(t[2*X],t[2*X+1])]=X}this.hull=new Uint32Array(O);for(let v=0,g=this._hullStart;v<O;v++)this.hull[v]=g,g=i[g];this.triangles=this._triangles.subarray(0,this.trianglesLen),this.halfedges=this._halfedges.subarray(0,this.trianglesLen)}_hashKey(t,n){return Math.floor(sf(t-this._cx,n-this._cy)*this._hashSize)%this._hashSize}_legalize(t){const{_triangles:n,_halfedges:i,coords:a}=this;let o=0,r=0;for(;;){const s=i[t],c=t-t%3;if(r=c+(t+2)%3,s===-1){if(o===0)break;t=Ni[--o];continue}const f=s-s%3,m=c+(t+1)%3,l=f+(s+2)%3,h=n[r],p=n[t],S=n[m],x=n[l];if(lf(a[2*h],a[2*h+1],a[2*p],a[2*p+1],a[2*S],a[2*S+1],a[2*x],a[2*x+1])){n[t]=x,n[s]=h;const u=i[l];if(u===-1){let b=this._hullStart;do{if(this._hullTri[b]===l){this._hullTri[b]=t;break}b=this._hullPrev[b]}while(b!==this._hullStart)}this._link(t,u),this._link(s,i[r]),this._link(r,l);const T=f+(s+1)%3;o<Ni.length&&(Ni[o++]=T)}else{if(o===0)break;t=Ni[--o]}}return r}_link(t,n){this._halfedges[t]=n,n!==-1&&(this._halfedges[n]=t)}_addTriangle(t,n,i,a,o,r){const s=this.trianglesLen;return this._triangles[s]=t,this._triangles[s+1]=n,this._triangles[s+2]=i,this._link(s,a),this._link(s+1,o),this._link(s+2,r),this.trianglesLen+=3,s}}function sf(e,t){const n=e/(Math.abs(e)+Math.abs(t));return(t>0?3-n:1+n)/4}function Lo(e,t,n,i){const a=e-n,o=t-i;return a*a+o*o}function lf(e,t,n,i,a,o,r,s){const c=e-r,f=t-s,m=n-r,l=i-s,h=a-r,p=o-s,S=c*c+f*f,x=m*m+l*l,_=h*h+p*p;return c*(l*_-x*p)-f*(m*_-x*h)+S*(m*p-l*h)<0}function cf(e,t,n,i,a,o){const r=n-e,s=i-t,c=a-e,f=o-t,m=r*r+s*s,l=c*c+f*f,h=.5/(r*f-s*c),p=(f*m-s*l)*h,S=(r*l-c*m)*h;return p*p+S*S}function ff(e,t,n,i,a,o){const r=n-e,s=i-t,c=a-e,f=o-t,m=r*r+s*s,l=c*c+f*f,h=.5/(r*f-s*c),p=e+(f*m-s*l)*h,S=t+(r*l-c*m)*h;return{x:p,y:S}}function Qn(e,t,n,i){if(i-n<=20)for(let a=n+1;a<=i;a++){const o=e[a],r=t[o];let s=a-1;for(;s>=n&&t[e[s]]>r;)e[s+1]=e[s--];e[s+1]=o}else{const a=n+i>>1;let o=n+1,r=i;pi(e,a,o),t[e[n]]>t[e[i]]&&pi(e,n,i),t[e[o]]>t[e[i]]&&pi(e,o,i),t[e[n]]>t[e[o]]&&pi(e,n,o);const s=e[o],c=t[s];for(;;){do o++;while(t[e[o]]<c);do r--;while(t[e[r]]>c);if(r<o)break;pi(e,o,r)}e[n+1]=e[r],e[r]=s,i-o+1>=r-n?(Qn(e,t,o,i),Qn(e,t,n,r-1)):(Qn(e,t,n,r-1),Qn(e,t,o,i))}}function pi(e,t,n){const i=e[t];e[t]=e[n],e[n]=i}function uf(e){return e[0]}function df(e){return e[1]}const vr=1e-6;class Dn{constructor(){this._x0=this._y0=this._x1=this._y1=null,this._=""}moveTo(t,n){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+n}`}closePath(){this._x1!==null&&(this._x1=this._x0,this._y1=this._y0,this._+="Z")}lineTo(t,n){this._+=`L${this._x1=+t},${this._y1=+n}`}arc(t,n,i){t=+t,n=+n,i=+i;const a=t+i,o=n;if(i<0)throw new Error("negative radius");this._x1===null?this._+=`M${a},${o}`:(Math.abs(this._x1-a)>vr||Math.abs(this._y1-o)>vr)&&(this._+="L"+a+","+o),i&&(this._+=`A${i},${i},0,1,1,${t-i},${n}A${i},${i},0,1,1,${this._x1=a},${this._y1=o}`)}rect(t,n,i,a){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+n}h${+i}v${+a}h${-i}Z`}value(){return this._||null}}class $o{constructor(){this._=[]}moveTo(t,n){this._.push([t,n])}closePath(){this._.push(this._[0].slice())}lineTo(t,n){this._.push([t,n])}value(){return this._.length?this._:null}}class hf{constructor(t,[n,i,a,o]=[0,0,960,500]){if(!((a=+a)>=(n=+n))||!((o=+o)>=(i=+i)))throw new Error("invalid bounds");this.delaunay=t,this._circumcenters=new Float64Array(t.points.length*2),this.vectors=new Float64Array(t.points.length*2),this.xmax=a,this.xmin=n,this.ymax=o,this.ymin=i,this._init()}update(){return this.delaunay.update(),this._init(),this}_init(){const{delaunay:{points:t,hull:n,triangles:i},vectors:a}=this;let o,r;const s=this.circumcenters=this._circumcenters.subarray(0,i.length/3*2);for(let x=0,_=0,u=i.length,T,b;x<u;x+=3,_+=2){const R=i[x]*2,G=i[x+1]*2,N=i[x+2]*2,L=t[R],O=t[R+1],v=t[G],g=t[G+1],w=t[N],U=t[N+1],k=v-L,W=g-O,J=w-L,X=U-O,ie=(k*X-W*J)*2;if(Math.abs(ie)<1e-9){if(o===void 0){o=r=0;for(const he of n)o+=t[he*2],r+=t[he*2+1];o/=n.length,r/=n.length}const Z=1e9*Math.sign((o-L)*X-(r-O)*J);T=(L+w)/2-Z*X,b=(O+U)/2+Z*J}else{const Z=1/ie,he=k*k+W*W,we=J*J+X*X;T=L+(X*he-W*we)*Z,b=O+(k*we-J*he)*Z}s[_]=T,s[_+1]=b}let c=n[n.length-1],f,m=c*4,l,h=t[2*c],p,S=t[2*c+1];a.fill(0);for(let x=0;x<n.length;++x)c=n[x],f=m,l=h,p=S,m=c*4,h=t[2*c],S=t[2*c+1],a[f+2]=a[m]=p-S,a[f+3]=a[m+1]=h-l}render(t){const n=t==null?t=new Dn:void 0,{delaunay:{halfedges:i,inedges:a,hull:o},circumcenters:r,vectors:s}=this;if(o.length<=1)return null;for(let m=0,l=i.length;m<l;++m){const h=i[m];if(h<m)continue;const p=Math.floor(m/3)*2,S=Math.floor(h/3)*2,x=r[p],_=r[p+1],u=r[S],T=r[S+1];this._renderSegment(x,_,u,T,t)}let c,f=o[o.length-1];for(let m=0;m<o.length;++m){c=f,f=o[m];const l=Math.floor(a[f]/3)*2,h=r[l],p=r[l+1],S=c*4,x=this._project(h,p,s[S+2],s[S+3]);x&&this._renderSegment(h,p,x[0],x[1],t)}return n&&n.value()}renderBounds(t){const n=t==null?t=new Dn:void 0;return t.rect(this.xmin,this.ymin,this.xmax-this.xmin,this.ymax-this.ymin),n&&n.value()}renderCell(t,n){const i=n==null?n=new Dn:void 0,a=this._clip(t);if(a===null||!a.length)return;n.moveTo(a[0],a[1]);let o=a.length;for(;a[0]===a[o-2]&&a[1]===a[o-1]&&o>1;)o-=2;for(let r=2;r<o;r+=2)(a[r]!==a[r-2]||a[r+1]!==a[r-1])&&n.lineTo(a[r],a[r+1]);return n.closePath(),i&&i.value()}*cellPolygons(){const{delaunay:{points:t}}=this;for(let n=0,i=t.length/2;n<i;++n){const a=this.cellPolygon(n);a&&(a.index=n,yield a)}}cellPolygon(t){const n=new $o;return this.renderCell(t,n),n.value()}_renderSegment(t,n,i,a,o){let r;const s=this._regioncode(t,n),c=this._regioncode(i,a);s===0&&c===0?(o.moveTo(t,n),o.lineTo(i,a)):(r=this._clipSegment(t,n,i,a,s,c))&&(o.moveTo(r[0],r[1]),o.lineTo(r[2],r[3]))}contains(t,n,i){return n=+n,n!==n||(i=+i,i!==i)?!1:this.delaunay._step(t,n,i)===t}*neighbors(t){const n=this._clip(t);if(n)for(const i of this.delaunay.neighbors(t)){const a=this._clip(i);if(a){e:for(let o=0,r=n.length;o<r;o+=2)for(let s=0,c=a.length;s<c;s+=2)if(n[o]===a[s]&&n[o+1]===a[s+1]&&n[(o+2)%r]===a[(s+c-2)%c]&&n[(o+3)%r]===a[(s+c-1)%c]){yield i;break e}}}}_cell(t){const{circumcenters:n,delaunay:{inedges:i,halfedges:a,triangles:o}}=this,r=i[t];if(r===-1)return null;const s=[];let c=r;do{const f=Math.floor(c/3);if(s.push(n[f*2],n[f*2+1]),c=c%3===2?c-2:c+1,o[c]!==t)break;c=a[c]}while(c!==r&&c!==-1);return s}_clip(t){if(t===0&&this.delaunay.hull.length===1)return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];const n=this._cell(t);if(n===null)return null;const{vectors:i}=this,a=t*4;return this._simplify(i[a]||i[a+1]?this._clipInfinite(t,n,i[a],i[a+1],i[a+2],i[a+3]):this._clipFinite(t,n))}_clipFinite(t,n){const i=n.length;let a=null,o,r,s=n[i-2],c=n[i-1],f,m=this._regioncode(s,c),l,h=0;for(let p=0;p<i;p+=2)if(o=s,r=c,s=n[p],c=n[p+1],f=m,m=this._regioncode(s,c),f===0&&m===0)l=h,h=0,a?a.push(s,c):a=[s,c];else{let S,x,_,u,T;if(f===0){if((S=this._clipSegment(o,r,s,c,f,m))===null)continue;[x,_,u,T]=S}else{if((S=this._clipSegment(s,c,o,r,m,f))===null)continue;[u,T,x,_]=S,l=h,h=this._edgecode(x,_),l&&h&&this._edge(t,l,h,a,a.length),a?a.push(x,_):a=[x,_]}l=h,h=this._edgecode(u,T),l&&h&&this._edge(t,l,h,a,a.length),a?a.push(u,T):a=[u,T]}if(a)l=h,h=this._edgecode(a[0],a[1]),l&&h&&this._edge(t,l,h,a,a.length);else if(this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2))return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];return a}_clipSegment(t,n,i,a,o,r){const s=o<r;for(s&&([t,n,i,a,o,r]=[i,a,t,n,r,o]);;){if(o===0&&r===0)return s?[i,a,t,n]:[t,n,i,a];if(o&r)return null;let c,f,m=o||r;m&8?(c=t+(i-t)*(this.ymax-n)/(a-n),f=this.ymax):m&4?(c=t+(i-t)*(this.ymin-n)/(a-n),f=this.ymin):m&2?(f=n+(a-n)*(this.xmax-t)/(i-t),c=this.xmax):(f=n+(a-n)*(this.xmin-t)/(i-t),c=this.xmin),o?(t=c,n=f,o=this._regioncode(t,n)):(i=c,a=f,r=this._regioncode(i,a))}}_clipInfinite(t,n,i,a,o,r){let s=Array.from(n),c;if((c=this._project(s[0],s[1],i,a))&&s.unshift(c[0],c[1]),(c=this._project(s[s.length-2],s[s.length-1],o,r))&&s.push(c[0],c[1]),s=this._clipFinite(t,s))for(let f=0,m=s.length,l,h=this._edgecode(s[m-2],s[m-1]);f<m;f+=2)l=h,h=this._edgecode(s[f],s[f+1]),l&&h&&(f=this._edge(t,l,h,s,f),m=s.length);else this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2)&&(s=[this.xmin,this.ymin,this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax]);return s}_edge(t,n,i,a,o){for(;n!==i;){let r,s;switch(n){case 5:n=4;continue;case 4:n=6,r=this.xmax,s=this.ymin;break;case 6:n=2;continue;case 2:n=10,r=this.xmax,s=this.ymax;break;case 10:n=8;continue;case 8:n=9,r=this.xmin,s=this.ymax;break;case 9:n=1;continue;case 1:n=5,r=this.xmin,s=this.ymin;break}(a[o]!==r||a[o+1]!==s)&&this.contains(t,r,s)&&(a.splice(o,0,r,s),o+=2)}return o}_project(t,n,i,a){let o=1/0,r,s,c;if(a<0){if(n<=this.ymin)return null;(r=(this.ymin-n)/a)<o&&(c=this.ymin,s=t+(o=r)*i)}else if(a>0){if(n>=this.ymax)return null;(r=(this.ymax-n)/a)<o&&(c=this.ymax,s=t+(o=r)*i)}if(i>0){if(t>=this.xmax)return null;(r=(this.xmax-t)/i)<o&&(s=this.xmax,c=n+(o=r)*a)}else if(i<0){if(t<=this.xmin)return null;(r=(this.xmin-t)/i)<o&&(s=this.xmin,c=n+(o=r)*a)}return[s,c]}_edgecode(t,n){return(t===this.xmin?1:t===this.xmax?2:0)|(n===this.ymin?4:n===this.ymax?8:0)}_regioncode(t,n){return(t<this.xmin?1:t>this.xmax?2:0)|(n<this.ymin?4:n>this.ymax?8:0)}_simplify(t){if(t&&t.length>4){for(let n=0;n<t.length;n+=2){const i=(n+2)%t.length,a=(n+4)%t.length;(t[n]===t[i]&&t[i]===t[a]||t[n+1]===t[i+1]&&t[i+1]===t[a+1])&&(t.splice(i,2),n-=2)}t.length||(t=null)}return t}}const pf=2*Math.PI,Xn=Math.pow;function _f(e){return e[0]}function mf(e){return e[1]}function gf(e){const{triangles:t,coords:n}=e;for(let i=0;i<t.length;i+=3){const a=2*t[i],o=2*t[i+1],r=2*t[i+2];if((n[r]-n[a])*(n[o+1]-n[a+1])-(n[o]-n[a])*(n[r+1]-n[a+1])>1e-10)return!1}return!0}function vf(e,t,n){return[e+Math.sin(e+t)*n,t+Math.cos(e-t)*n]}class na{static from(t,n=_f,i=mf,a){return new na("length"in t?Sf(t,n,i,a):Float64Array.from(xf(t,n,i,a)))}constructor(t){this._delaunator=new io(t),this.inedges=new Int32Array(t.length/2),this._hullIndex=new Int32Array(t.length/2),this.points=this._delaunator.coords,this._init()}update(){return this._delaunator.update(),this._init(),this}_init(){const t=this._delaunator,n=this.points;if(t.hull&&t.hull.length>2&&gf(t)){this.collinear=Int32Array.from({length:n.length/2},(h,p)=>p).sort((h,p)=>n[2*h]-n[2*p]||n[2*h+1]-n[2*p+1]);const c=this.collinear[0],f=this.collinear[this.collinear.length-1],m=[n[2*c],n[2*c+1],n[2*f],n[2*f+1]],l=1e-8*Math.hypot(m[3]-m[1],m[2]-m[0]);for(let h=0,p=n.length/2;h<p;++h){const S=vf(n[2*h],n[2*h+1],l);n[2*h]=S[0],n[2*h+1]=S[1]}this._delaunator=new io(n)}else delete this.collinear;const i=this.halfedges=this._delaunator.halfedges,a=this.hull=this._delaunator.hull,o=this.triangles=this._delaunator.triangles,r=this.inedges.fill(-1),s=this._hullIndex.fill(-1);for(let c=0,f=i.length;c<f;++c){const m=o[c%3===2?c-2:c+1];(i[c]===-1||r[m]===-1)&&(r[m]=c)}for(let c=0,f=a.length;c<f;++c)s[a[c]]=c;a.length<=2&&a.length>0&&(this.triangles=new Int32Array(3).fill(-1),this.halfedges=new Int32Array(3).fill(-1),this.triangles[0]=a[0],r[a[0]]=1,a.length===2&&(r[a[1]]=0,this.triangles[1]=a[1],this.triangles[2]=a[1]))}voronoi(t){return new hf(this,t)}*neighbors(t){const{inedges:n,hull:i,_hullIndex:a,halfedges:o,triangles:r,collinear:s}=this;if(s){const l=s.indexOf(t);l>0&&(yield s[l-1]),l<s.length-1&&(yield s[l+1]);return}const c=n[t];if(c===-1)return;let f=c,m=-1;do{if(yield m=r[f],f=f%3===2?f-2:f+1,r[f]!==t)return;if(f=o[f],f===-1){const l=i[(a[t]+1)%i.length];l!==m&&(yield l);return}}while(f!==c)}find(t,n,i=0){if(t=+t,t!==t||(n=+n,n!==n))return-1;const a=i;let o;for(;(o=this._step(i,t,n))>=0&&o!==i&&o!==a;)i=o;return o}_step(t,n,i){const{inedges:a,hull:o,_hullIndex:r,halfedges:s,triangles:c,points:f}=this;if(a[t]===-1||!f.length)return(t+1)%(f.length>>1);let m=t,l=Xn(n-f[t*2],2)+Xn(i-f[t*2+1],2);const h=a[t];let p=h;do{let S=c[p];const x=Xn(n-f[S*2],2)+Xn(i-f[S*2+1],2);if(x<l&&(l=x,m=S),p=p%3===2?p-2:p+1,c[p]!==t)break;if(p=s[p],p===-1){if(p=o[(r[t]+1)%o.length],p!==S&&Xn(n-f[p*2],2)+Xn(i-f[p*2+1],2)<l)return p;break}}while(p!==h);return m}render(t){const n=t==null?t=new Dn:void 0,{points:i,halfedges:a,triangles:o}=this;for(let r=0,s=a.length;r<s;++r){const c=a[r];if(c<r)continue;const f=o[r]*2,m=o[c]*2;t.moveTo(i[f],i[f+1]),t.lineTo(i[m],i[m+1])}return this.renderHull(t),n&&n.value()}renderPoints(t,n){n===void 0&&(!t||typeof t.moveTo!="function")&&(n=t,t=null),n=n==null?2:+n;const i=t==null?t=new Dn:void 0,{points:a}=this;for(let o=0,r=a.length;o<r;o+=2){const s=a[o],c=a[o+1];t.moveTo(s+n,c),t.arc(s,c,n,0,pf)}return i&&i.value()}renderHull(t){const n=t==null?t=new Dn:void 0,{hull:i,points:a}=this,o=i[0]*2,r=i.length;t.moveTo(a[o],a[o+1]);for(let s=1;s<r;++s){const c=2*i[s];t.lineTo(a[c],a[c+1])}return t.closePath(),n&&n.value()}hullPolygon(){const t=new $o;return this.renderHull(t),t.value()}renderTriangle(t,n){const i=n==null?n=new Dn:void 0,{points:a,triangles:o}=this,r=o[t*=3]*2,s=o[t+1]*2,c=o[t+2]*2;return n.moveTo(a[r],a[r+1]),n.lineTo(a[s],a[s+1]),n.lineTo(a[c],a[c+1]),n.closePath(),i&&i.value()}*trianglePolygons(){const{triangles:t}=this;for(let n=0,i=t.length/3;n<i;++n)yield this.trianglePolygon(n)}trianglePolygon(t){const n=new $o;return this.renderTriangle(t,n),n.value()}}function Sf(e,t,n,i){const a=e.length,o=new Float64Array(a*2);for(let r=0;r<a;++r){const s=e[r];o[r*2]=t.call(i,s,r,e),o[r*2+1]=n.call(i,s,r,e)}return o}function*xf(e,t,n,i){let a=0;for(const o of e)yield t.call(i,o,a,e),yield n.call(i,o,a,e),++a}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Cs(){let e=null,t=!1,n=null,i=null;function a(o,r){n(o,r),i=e.requestAnimationFrame(a)}return{start:function(){t!==!0&&n!==null&&(i=e.requestAnimationFrame(a),t=!0)},stop:function(){e.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(o){n=o},setContext:function(o){e=o}}}function Ef(e){const t=new WeakMap;function n(s,c){const f=s.array,m=s.usage,l=f.byteLength,h=e.createBuffer();e.bindBuffer(c,h),e.bufferData(c,f,m),s.onUploadCallback();let p;if(f instanceof Float32Array)p=e.FLOAT;else if(f instanceof Uint16Array)s.isFloat16BufferAttribute?p=e.HALF_FLOAT:p=e.UNSIGNED_SHORT;else if(f instanceof Int16Array)p=e.SHORT;else if(f instanceof Uint32Array)p=e.UNSIGNED_INT;else if(f instanceof Int32Array)p=e.INT;else if(f instanceof Int8Array)p=e.BYTE;else if(f instanceof Uint8Array)p=e.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)p=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:h,type:p,bytesPerElement:f.BYTES_PER_ELEMENT,version:s.version,size:l}}function i(s,c,f){const m=c.array,l=c.updateRanges;if(e.bindBuffer(f,s),l.length===0)e.bufferSubData(f,0,m);else{l.sort((p,S)=>p.start-S.start);let h=0;for(let p=1;p<l.length;p++){const S=l[h],x=l[p];x.start<=S.start+S.count+1?S.count=Math.max(S.count,x.start+x.count-S.start):(++h,l[h]=x)}l.length=h+1;for(let p=0,S=l.length;p<S;p++){const x=l[p];e.bufferSubData(f,x.start*m.BYTES_PER_ELEMENT,m,x.start,x.count)}c.clearUpdateRanges()}c.onUploadCallback()}function a(s){return s.isInterleavedBufferAttribute&&(s=s.data),t.get(s)}function o(s){s.isInterleavedBufferAttribute&&(s=s.data);const c=t.get(s);c&&(e.deleteBuffer(c.buffer),t.delete(s))}function r(s,c){if(s.isInterleavedBufferAttribute&&(s=s.data),s.isGLBufferAttribute){const m=t.get(s);(!m||m.version<s.version)&&t.set(s,{buffer:s.buffer,type:s.type,bytesPerElement:s.elementSize,version:s.version});return}const f=t.get(s);if(f===void 0)t.set(s,n(s,c));else if(f.version<s.version){if(f.size!==s.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(f.buffer,s,c),f.version=s.version}}return{get:a,remove:o,update:r}}var Tf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Mf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Af=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,bf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,yf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,wf=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Cf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Lf=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,If=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Pf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Df=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Uf=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Nf=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Ff=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Of=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Bf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Gf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Hf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,kf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Vf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,zf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Wf=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Xf=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Yf=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,qf=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,$f=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Kf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,jf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Zf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Jf="gl_FragColor = linearToOutputTexel( gl_FragColor );",Qf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,eu=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,tu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,nu=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,iu=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ou=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,au=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,ru=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,su=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,lu=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,cu=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,fu=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,uu=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,du=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,hu=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,pu=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,_u=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,mu=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,gu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,vu=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Su=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,xu=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Eu=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Tu=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Mu=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Au=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,bu=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ru=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,yu=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,wu=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Cu=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Lu=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Iu=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pu=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Du=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Uu=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Nu=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Fu=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ou=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Bu=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gu=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Hu=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,ku=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Vu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,zu=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Wu=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Xu=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Yu=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,qu=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,$u=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Ku=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ju=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Zu=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ju=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Qu=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,ed=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,td=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,nd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,id=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,od=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,ad=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,rd=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,sd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ld=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,cd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,fd=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ud=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,dd=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,hd=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,pd=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,_d=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,md=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,gd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,vd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Sd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,xd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Ed=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Td=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Md=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ad=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Rd=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,yd=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,wd=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Cd=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Ld=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Id=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Pd=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dd=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ud=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Nd=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Fd=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Od=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Bd=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gd=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Hd=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kd=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Vd=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,zd=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wd=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xd=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Yd=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qd=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$d=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Kd=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,jd=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Zd=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Jd=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Qd=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,eh=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Je={alphahash_fragment:Tf,alphahash_pars_fragment:Mf,alphamap_fragment:Af,alphamap_pars_fragment:bf,alphatest_fragment:Rf,alphatest_pars_fragment:yf,aomap_fragment:wf,aomap_pars_fragment:Cf,batching_pars_vertex:Lf,batching_vertex:If,begin_vertex:Pf,beginnormal_vertex:Df,bsdfs:Uf,iridescence_fragment:Nf,bumpmap_pars_fragment:Ff,clipping_planes_fragment:Of,clipping_planes_pars_fragment:Bf,clipping_planes_pars_vertex:Gf,clipping_planes_vertex:Hf,color_fragment:kf,color_pars_fragment:Vf,color_pars_vertex:zf,color_vertex:Wf,common:Xf,cube_uv_reflection_fragment:Yf,defaultnormal_vertex:qf,displacementmap_pars_vertex:$f,displacementmap_vertex:Kf,emissivemap_fragment:jf,emissivemap_pars_fragment:Zf,colorspace_fragment:Jf,colorspace_pars_fragment:Qf,envmap_fragment:eu,envmap_common_pars_fragment:tu,envmap_pars_fragment:nu,envmap_pars_vertex:iu,envmap_physical_pars_fragment:pu,envmap_vertex:ou,fog_vertex:au,fog_pars_vertex:ru,fog_fragment:su,fog_pars_fragment:lu,gradientmap_pars_fragment:cu,lightmap_pars_fragment:fu,lights_lambert_fragment:uu,lights_lambert_pars_fragment:du,lights_pars_begin:hu,lights_toon_fragment:_u,lights_toon_pars_fragment:mu,lights_phong_fragment:gu,lights_phong_pars_fragment:vu,lights_physical_fragment:Su,lights_physical_pars_fragment:xu,lights_fragment_begin:Eu,lights_fragment_maps:Tu,lights_fragment_end:Mu,logdepthbuf_fragment:Au,logdepthbuf_pars_fragment:bu,logdepthbuf_pars_vertex:Ru,logdepthbuf_vertex:yu,map_fragment:wu,map_pars_fragment:Cu,map_particle_fragment:Lu,map_particle_pars_fragment:Iu,metalnessmap_fragment:Pu,metalnessmap_pars_fragment:Du,morphinstance_vertex:Uu,morphcolor_vertex:Nu,morphnormal_vertex:Fu,morphtarget_pars_vertex:Ou,morphtarget_vertex:Bu,normal_fragment_begin:Gu,normal_fragment_maps:Hu,normal_pars_fragment:ku,normal_pars_vertex:Vu,normal_vertex:zu,normalmap_pars_fragment:Wu,clearcoat_normal_fragment_begin:Xu,clearcoat_normal_fragment_maps:Yu,clearcoat_pars_fragment:qu,iridescence_pars_fragment:$u,opaque_fragment:Ku,packing:ju,premultiplied_alpha_fragment:Zu,project_vertex:Ju,dithering_fragment:Qu,dithering_pars_fragment:ed,roughnessmap_fragment:td,roughnessmap_pars_fragment:nd,shadowmap_pars_fragment:id,shadowmap_pars_vertex:od,shadowmap_vertex:ad,shadowmask_pars_fragment:rd,skinbase_vertex:sd,skinning_pars_vertex:ld,skinning_vertex:cd,skinnormal_vertex:fd,specularmap_fragment:ud,specularmap_pars_fragment:dd,tonemapping_fragment:hd,tonemapping_pars_fragment:pd,transmission_fragment:_d,transmission_pars_fragment:md,uv_pars_fragment:gd,uv_pars_vertex:vd,uv_vertex:Sd,worldpos_vertex:xd,background_vert:Ed,background_frag:Td,backgroundCube_vert:Md,backgroundCube_frag:Ad,cube_vert:bd,cube_frag:Rd,depth_vert:yd,depth_frag:wd,distanceRGBA_vert:Cd,distanceRGBA_frag:Ld,equirect_vert:Id,equirect_frag:Pd,linedashed_vert:Dd,linedashed_frag:Ud,meshbasic_vert:Nd,meshbasic_frag:Fd,meshlambert_vert:Od,meshlambert_frag:Bd,meshmatcap_vert:Gd,meshmatcap_frag:Hd,meshnormal_vert:kd,meshnormal_frag:Vd,meshphong_vert:zd,meshphong_frag:Wd,meshphysical_vert:Xd,meshphysical_frag:Yd,meshtoon_vert:qd,meshtoon_frag:$d,points_vert:Kd,points_frag:jd,shadow_vert:Zd,shadow_frag:Jd,sprite_vert:Qd,sprite_frag:eh},Se={common:{diffuse:{value:new Tt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new lt},alphaMap:{value:null},alphaMapTransform:{value:new lt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new lt}},envmap:{envMap:{value:null},envMapRotation:{value:new lt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new lt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new lt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new lt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new lt},normalScale:{value:new wt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new lt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new lt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new lt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new lt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Tt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Tt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new lt},alphaTest:{value:0},uvTransform:{value:new lt}},sprite:{diffuse:{value:new Tt(16777215)},opacity:{value:1},center:{value:new wt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new lt},alphaMap:{value:null},alphaMapTransform:{value:new lt},alphaTest:{value:0}}},ln={basic:{uniforms:Kt([Se.common,Se.specularmap,Se.envmap,Se.aomap,Se.lightmap,Se.fog]),vertexShader:Je.meshbasic_vert,fragmentShader:Je.meshbasic_frag},lambert:{uniforms:Kt([Se.common,Se.specularmap,Se.envmap,Se.aomap,Se.lightmap,Se.emissivemap,Se.bumpmap,Se.normalmap,Se.displacementmap,Se.fog,Se.lights,{emissive:{value:new Tt(0)}}]),vertexShader:Je.meshlambert_vert,fragmentShader:Je.meshlambert_frag},phong:{uniforms:Kt([Se.common,Se.specularmap,Se.envmap,Se.aomap,Se.lightmap,Se.emissivemap,Se.bumpmap,Se.normalmap,Se.displacementmap,Se.fog,Se.lights,{emissive:{value:new Tt(0)},specular:{value:new Tt(1118481)},shininess:{value:30}}]),vertexShader:Je.meshphong_vert,fragmentShader:Je.meshphong_frag},standard:{uniforms:Kt([Se.common,Se.envmap,Se.aomap,Se.lightmap,Se.emissivemap,Se.bumpmap,Se.normalmap,Se.displacementmap,Se.roughnessmap,Se.metalnessmap,Se.fog,Se.lights,{emissive:{value:new Tt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Je.meshphysical_vert,fragmentShader:Je.meshphysical_frag},toon:{uniforms:Kt([Se.common,Se.aomap,Se.lightmap,Se.emissivemap,Se.bumpmap,Se.normalmap,Se.displacementmap,Se.gradientmap,Se.fog,Se.lights,{emissive:{value:new Tt(0)}}]),vertexShader:Je.meshtoon_vert,fragmentShader:Je.meshtoon_frag},matcap:{uniforms:Kt([Se.common,Se.bumpmap,Se.normalmap,Se.displacementmap,Se.fog,{matcap:{value:null}}]),vertexShader:Je.meshmatcap_vert,fragmentShader:Je.meshmatcap_frag},points:{uniforms:Kt([Se.points,Se.fog]),vertexShader:Je.points_vert,fragmentShader:Je.points_frag},dashed:{uniforms:Kt([Se.common,Se.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Je.linedashed_vert,fragmentShader:Je.linedashed_frag},depth:{uniforms:Kt([Se.common,Se.displacementmap]),vertexShader:Je.depth_vert,fragmentShader:Je.depth_frag},normal:{uniforms:Kt([Se.common,Se.bumpmap,Se.normalmap,Se.displacementmap,{opacity:{value:1}}]),vertexShader:Je.meshnormal_vert,fragmentShader:Je.meshnormal_frag},sprite:{uniforms:Kt([Se.sprite,Se.fog]),vertexShader:Je.sprite_vert,fragmentShader:Je.sprite_frag},background:{uniforms:{uvTransform:{value:new lt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Je.background_vert,fragmentShader:Je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new lt}},vertexShader:Je.backgroundCube_vert,fragmentShader:Je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Je.cube_vert,fragmentShader:Je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Je.equirect_vert,fragmentShader:Je.equirect_frag},distanceRGBA:{uniforms:Kt([Se.common,Se.displacementmap,{referencePosition:{value:new Ye},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Je.distanceRGBA_vert,fragmentShader:Je.distanceRGBA_frag},shadow:{uniforms:Kt([Se.lights,Se.fog,{color:{value:new Tt(0)},opacity:{value:1}}]),vertexShader:Je.shadow_vert,fragmentShader:Je.shadow_frag}};ln.physical={uniforms:Kt([ln.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new lt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new lt},clearcoatNormalScale:{value:new wt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new lt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new lt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new lt},sheen:{value:0},sheenColor:{value:new Tt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new lt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new lt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new lt},transmissionSamplerSize:{value:new wt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new lt},attenuationDistance:{value:0},attenuationColor:{value:new Tt(0)},specularColor:{value:new Tt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new lt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new lt},anisotropyVector:{value:new wt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new lt}}]),vertexShader:Je.meshphysical_vert,fragmentShader:Je.meshphysical_frag};const Fi={r:0,b:0,g:0},Cn=new Rs,th=new ti;function nh(e,t,n,i,a,o,r){const s=new Tt(0);let c=o===!0?0:1,f,m,l=null,h=0,p=null;function S(b){let R=b.isScene===!0?b.background:null;return R&&R.isTexture&&(R=(b.backgroundBlurriness>0?n:t).get(R)),R}function x(b){let R=!1;const G=S(b);G===null?u(s,c):G&&G.isColor&&(u(G,1),R=!0);const N=e.xr.getEnvironmentBlendMode();N==="additive"?i.buffers.color.setClear(0,0,0,1,r):N==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,r),(e.autoClear||R)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function _(b,R){const G=S(R);G&&(G.isCubeTexture||G.mapping===fo)?(m===void 0&&(m=new _n(new bs(1,1,1),new Rn({name:"BackgroundCubeMaterial",uniforms:Qa(ln.backgroundCube.uniforms),vertexShader:ln.backgroundCube.vertexShader,fragmentShader:ln.backgroundCube.fragmentShader,side:an,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),m.geometry.deleteAttribute("normal"),m.geometry.deleteAttribute("uv"),m.onBeforeRender=function(N,L,O){this.matrixWorld.copyPosition(O.matrixWorld)},Object.defineProperty(m.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),a.update(m)),Cn.copy(R.backgroundRotation),Cn.x*=-1,Cn.y*=-1,Cn.z*=-1,G.isCubeTexture&&G.isRenderTargetTexture===!1&&(Cn.y*=-1,Cn.z*=-1),m.material.uniforms.envMap.value=G,m.material.uniforms.flipEnvMap.value=G.isCubeTexture&&G.isRenderTargetTexture===!1?-1:1,m.material.uniforms.backgroundBlurriness.value=R.backgroundBlurriness,m.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,m.material.uniforms.backgroundRotation.value.setFromMatrix4(th.makeRotationFromEuler(Cn)),m.material.toneMapped=Lt.getTransfer(G.colorSpace)!==Et,(l!==G||h!==G.version||p!==e.toneMapping)&&(m.material.needsUpdate=!0,l=G,h=G.version,p=e.toneMapping),m.layers.enableAll(),b.unshift(m,m.geometry,m.material,0,0,null)):G&&G.isTexture&&(f===void 0&&(f=new _n(new ea(2,2),new Rn({name:"BackgroundMaterial",uniforms:Qa(ln.background.uniforms),vertexShader:ln.background.vertexShader,fragmentShader:ln.background.fragmentShader,side:Ti,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),Object.defineProperty(f.material,"map",{get:function(){return this.uniforms.t2D.value}}),a.update(f)),f.material.uniforms.t2D.value=G,f.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,f.material.toneMapped=Lt.getTransfer(G.colorSpace)!==Et,G.matrixAutoUpdate===!0&&G.updateMatrix(),f.material.uniforms.uvTransform.value.copy(G.matrix),(l!==G||h!==G.version||p!==e.toneMapping)&&(f.material.needsUpdate=!0,l=G,h=G.version,p=e.toneMapping),f.layers.enableAll(),b.unshift(f,f.geometry,f.material,0,0,null))}function u(b,R){b.getRGB(Fi,As(e)),i.buffers.color.setClear(Fi.r,Fi.g,Fi.b,R,r)}function T(){m!==void 0&&(m.geometry.dispose(),m.material.dispose(),m=void 0),f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0)}return{getClearColor:function(){return s},setClearColor:function(b,R=1){s.set(b),c=R,u(s,c)},getClearAlpha:function(){return c},setClearAlpha:function(b){c=b,u(s,c)},render:x,addToRenderList:_,dispose:T}}function ih(e,t){const n=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},a=h(null);let o=a,r=!1;function s(g,w,U,k,W){let J=!1;const X=l(k,U,w);o!==X&&(o=X,f(o.object)),J=p(g,k,U,W),J&&S(g,k,U,W),W!==null&&t.update(W,e.ELEMENT_ARRAY_BUFFER),(J||r)&&(r=!1,R(g,w,U,k),W!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(W).buffer))}function c(){return e.createVertexArray()}function f(g){return e.bindVertexArray(g)}function m(g){return e.deleteVertexArray(g)}function l(g,w,U){const k=U.wireframe===!0;let W=i[g.id];W===void 0&&(W={},i[g.id]=W);let J=W[w.id];J===void 0&&(J={},W[w.id]=J);let X=J[k];return X===void 0&&(X=h(c()),J[k]=X),X}function h(g){const w=[],U=[],k=[];for(let W=0;W<n;W++)w[W]=0,U[W]=0,k[W]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:w,enabledAttributes:U,attributeDivisors:k,object:g,attributes:{},index:null}}function p(g,w,U,k){const W=o.attributes,J=w.attributes;let X=0;const ie=U.getAttributes();for(const Z in ie)if(ie[Z].location>=0){const we=W[Z];let He=J[Z];if(He===void 0&&(Z==="instanceMatrix"&&g.instanceMatrix&&(He=g.instanceMatrix),Z==="instanceColor"&&g.instanceColor&&(He=g.instanceColor)),we===void 0||we.attribute!==He||He&&we.data!==He.data)return!0;X++}return o.attributesNum!==X||o.index!==k}function S(g,w,U,k){const W={},J=w.attributes;let X=0;const ie=U.getAttributes();for(const Z in ie)if(ie[Z].location>=0){let we=J[Z];we===void 0&&(Z==="instanceMatrix"&&g.instanceMatrix&&(we=g.instanceMatrix),Z==="instanceColor"&&g.instanceColor&&(we=g.instanceColor));const He={};He.attribute=we,we&&we.data&&(He.data=we.data),W[Z]=He,X++}o.attributes=W,o.attributesNum=X,o.index=k}function x(){const g=o.newAttributes;for(let w=0,U=g.length;w<U;w++)g[w]=0}function _(g){u(g,0)}function u(g,w){const U=o.newAttributes,k=o.enabledAttributes,W=o.attributeDivisors;U[g]=1,k[g]===0&&(e.enableVertexAttribArray(g),k[g]=1),W[g]!==w&&(e.vertexAttribDivisor(g,w),W[g]=w)}function T(){const g=o.newAttributes,w=o.enabledAttributes;for(let U=0,k=w.length;U<k;U++)w[U]!==g[U]&&(e.disableVertexAttribArray(U),w[U]=0)}function b(g,w,U,k,W,J,X){X===!0?e.vertexAttribIPointer(g,w,U,W,J):e.vertexAttribPointer(g,w,U,k,W,J)}function R(g,w,U,k){x();const W=k.attributes,J=U.getAttributes(),X=w.defaultAttributeValues;for(const ie in J){const Z=J[ie];if(Z.location>=0){let he=W[ie];if(he===void 0&&(ie==="instanceMatrix"&&g.instanceMatrix&&(he=g.instanceMatrix),ie==="instanceColor"&&g.instanceColor&&(he=g.instanceColor)),he!==void 0){const we=he.normalized,He=he.itemSize,$e=t.get(he);if($e===void 0)continue;const ft=$e.buffer,ee=$e.type,_e=$e.bytesPerElement,Ce=ee===e.INT||ee===e.UNSIGNED_INT||he.gpuType===Ss;if(he.isInterleavedBufferAttribute){const xe=he.data,Be=xe.stride,et=he.offset;if(xe.isInstancedInterleavedBuffer){for(let Fe=0;Fe<Z.locationSize;Fe++)u(Z.location+Fe,xe.meshPerAttribute);g.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=xe.meshPerAttribute*xe.count)}else for(let Fe=0;Fe<Z.locationSize;Fe++)_(Z.location+Fe);e.bindBuffer(e.ARRAY_BUFFER,ft);for(let Fe=0;Fe<Z.locationSize;Fe++)b(Z.location+Fe,He/Z.locationSize,ee,we,Be*_e,(et+He/Z.locationSize*Fe)*_e,Ce)}else{if(he.isInstancedBufferAttribute){for(let xe=0;xe<Z.locationSize;xe++)u(Z.location+xe,he.meshPerAttribute);g.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let xe=0;xe<Z.locationSize;xe++)_(Z.location+xe);e.bindBuffer(e.ARRAY_BUFFER,ft);for(let xe=0;xe<Z.locationSize;xe++)b(Z.location+xe,He/Z.locationSize,ee,we,He*_e,He/Z.locationSize*xe*_e,Ce)}}else if(X!==void 0){const we=X[ie];if(we!==void 0)switch(we.length){case 2:e.vertexAttrib2fv(Z.location,we);break;case 3:e.vertexAttrib3fv(Z.location,we);break;case 4:e.vertexAttrib4fv(Z.location,we);break;default:e.vertexAttrib1fv(Z.location,we)}}}}T()}function G(){O();for(const g in i){const w=i[g];for(const U in w){const k=w[U];for(const W in k)m(k[W].object),delete k[W];delete w[U]}delete i[g]}}function N(g){if(i[g.id]===void 0)return;const w=i[g.id];for(const U in w){const k=w[U];for(const W in k)m(k[W].object),delete k[W];delete w[U]}delete i[g.id]}function L(g){for(const w in i){const U=i[w];if(U[g.id]===void 0)continue;const k=U[g.id];for(const W in k)m(k[W].object),delete k[W];delete U[g.id]}}function O(){v(),r=!0,o!==a&&(o=a,f(o.object))}function v(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:s,reset:O,resetDefaultState:v,dispose:G,releaseStatesOfGeometry:N,releaseStatesOfProgram:L,initAttributes:x,enableAttribute:_,disableUnusedAttributes:T}}function oh(e,t,n){let i;function a(f){i=f}function o(f,m){e.drawArrays(i,f,m),n.update(m,i,1)}function r(f,m,l){l!==0&&(e.drawArraysInstanced(i,f,m,l),n.update(m,i,l))}function s(f,m,l){if(l===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,f,0,m,0,l);let p=0;for(let S=0;S<l;S++)p+=m[S];n.update(p,i,1)}function c(f,m,l,h){if(l===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let S=0;S<f.length;S++)r(f[S],m[S],h[S]);else{p.multiDrawArraysInstancedWEBGL(i,f,0,m,0,h,0,l);let S=0;for(let x=0;x<l;x++)S+=m[x]*h[x];n.update(S,i,1)}}this.setMode=a,this.render=o,this.renderInstances=r,this.renderMultiDraw=s,this.renderMultiDrawInstances=c}function ah(e,t,n,i){let a;function o(){if(a!==void 0)return a;if(t.has("EXT_texture_filter_anisotropic")===!0){const L=t.get("EXT_texture_filter_anisotropic");a=e.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function r(L){return!(L!==rn&&i.convert(L)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function s(L){const O=L===lo&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(L!==bn&&i.convert(L)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&L!==Mn&&!O)}function c(L){if(L==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";L="mediump"}return L==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=n.precision!==void 0?n.precision:"highp";const m=c(f);m!==f&&(console.warn("THREE.WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const l=n.logarithmicDepthBuffer===!0,h=n.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),S=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=e.getParameter(e.MAX_TEXTURE_SIZE),_=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),u=e.getParameter(e.MAX_VERTEX_ATTRIBS),T=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),b=e.getParameter(e.MAX_VARYING_VECTORS),R=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),G=S>0,N=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:c,textureFormatReadable:r,textureTypeReadable:s,precision:f,logarithmicDepthBuffer:l,reverseDepthBuffer:h,maxTextures:p,maxVertexTextures:S,maxTextureSize:x,maxCubemapSize:_,maxAttributes:u,maxVertexUniforms:T,maxVaryings:b,maxFragmentUniforms:R,vertexTextures:G,maxSamples:N}}function rh(e){const t=this;let n=null,i=0,a=!1,o=!1;const r=new Bl,s=new lt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(l,h){const p=l.length!==0||h||i!==0||a;return a=h,i=l.length,p},this.beginShadows=function(){o=!0,m(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(l,h){n=m(l,h,0)},this.setState=function(l,h,p){const S=l.clippingPlanes,x=l.clipIntersection,_=l.clipShadows,u=e.get(l);if(!a||S===null||S.length===0||o&&!_)o?m(null):f();else{const T=o?0:i,b=T*4;let R=u.clippingState||null;c.value=R,R=m(S,h,b,p);for(let G=0;G!==b;++G)R[G]=n[G];u.clippingState=R,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=T}};function f(){c.value!==n&&(c.value=n,c.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function m(l,h,p,S){const x=l!==null?l.length:0;let _=null;if(x!==0){if(_=c.value,S!==!0||_===null){const u=p+x*4,T=h.matrixWorldInverse;s.getNormalMatrix(T),(_===null||_.length<u)&&(_=new Float32Array(u));for(let b=0,R=p;b!==x;++b,R+=4)r.copy(l[b]).applyMatrix4(T,s),r.normal.toArray(_,R),_[R+3]=r.constant}c.value=_,c.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,_}}function sh(e){let t=new WeakMap;function n(r,s){return s===Yo?r.mapping=bi:s===qo&&(r.mapping=ni),r}function i(r){if(r&&r.isTexture){const s=r.mapping;if(s===Yo||s===qo)if(t.has(r)){const c=t.get(r).texture;return n(c,r.mapping)}else{const c=r.image;if(c&&c.height>0){const f=new tc(c.height);return f.fromEquirectangularTexture(e,r),t.set(r,f),r.addEventListener("dispose",a),n(f.texture,r.mapping)}else return null}}return r}function a(r){const s=r.target;s.removeEventListener("dispose",a);const c=t.get(s);c!==void 0&&(t.delete(s),c.dispose())}function o(){t=new WeakMap}return{get:i,dispose:o}}const ei=4,Sr=[.125,.215,.35,.446,.526,.582],Pn=20,Io=new ws,xr=new Tt;let Po=null,Do=0,Uo=0,No=!1;const In=(1+Math.sqrt(5))/2,Yn=1/In,Er=[new Ye(-In,Yn,0),new Ye(In,Yn,0),new Ye(-Yn,0,In),new Ye(Yn,0,In),new Ye(0,In,-Yn),new Ye(0,In,Yn),new Ye(-1,1,-1),new Ye(1,1,-1),new Ye(-1,1,1),new Ye(1,1,1)],lh=new Ye;class Tr{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,n=0,i=.1,a=100,o={}){const{size:r=256,position:s=lh}=o;Po=this._renderer.getRenderTarget(),Do=this._renderer.getActiveCubeFace(),Uo=this._renderer.getActiveMipmapLevel(),No=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(r);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,i,a,c,s),n>0&&this._blur(c,0,0,n),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=br(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ar(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Po,Do,Uo),this._renderer.xr.enabled=No,t.scissorTest=!1,Oi(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===bi||t.mapping===ni?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Po=this._renderer.getRenderTarget(),Do=this._renderer.getActiveCubeFace(),Uo=this._renderer.getActiveMipmapLevel(),No=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=n||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:Tn,minFilter:Tn,generateMipmaps:!1,type:lo,format:rn,colorSpace:co,depthBuffer:!1},a=Mr(t,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Mr(t,n,i);const{_lodMax:o}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=ch(o)),this._blurMaterial=fh(o,t,n)}return a}_compileMaterial(t){const n=new _n(this._lodPlanes[0],t);this._renderer.compile(n,Io)}_sceneToCubeUV(t,n,i,a,o){const c=new Yi(90,1,n,i),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],l=this._renderer,h=l.autoClear,p=l.toneMapping;l.getClearColor(xr),l.toneMapping=An,l.autoClear=!1;const S=new ac({name:"PMREM.Background",side:an,depthWrite:!1,depthTest:!1}),x=new _n(new bs,S);let _=!1;const u=t.background;u?u.isColor&&(S.color.copy(u),t.background=null,_=!0):(S.color.copy(xr),_=!0);for(let T=0;T<6;T++){const b=T%3;b===0?(c.up.set(0,f[T],0),c.position.set(o.x,o.y,o.z),c.lookAt(o.x+m[T],o.y,o.z)):b===1?(c.up.set(0,0,f[T]),c.position.set(o.x,o.y,o.z),c.lookAt(o.x,o.y+m[T],o.z)):(c.up.set(0,f[T],0),c.position.set(o.x,o.y,o.z),c.lookAt(o.x,o.y,o.z+m[T]));const R=this._cubeSize;Oi(a,b*R,T>2?R:0,R,R),l.setRenderTarget(a),_&&l.render(x,c),l.render(t,c)}x.geometry.dispose(),x.material.dispose(),l.toneMapping=p,l.autoClear=h,t.background=u}_textureToCubeUV(t,n){const i=this._renderer,a=t.mapping===bi||t.mapping===ni;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=br()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ar());const o=a?this._cubemapMaterial:this._equirectMaterial,r=new _n(this._lodPlanes[0],o),s=o.uniforms;s.envMap.value=t;const c=this._cubeSize;Oi(n,0,0,3*c,2*c),i.setRenderTarget(n),i.render(r,Io)}_applyPMREM(t){const n=this._renderer,i=n.autoClear;n.autoClear=!1;const a=this._lodPlanes.length;for(let o=1;o<a;o++){const r=Math.sqrt(this._sigmas[o]*this._sigmas[o]-this._sigmas[o-1]*this._sigmas[o-1]),s=Er[(a-o-1)%Er.length];this._blur(t,o-1,o,r,s)}n.autoClear=i}_blur(t,n,i,a,o){const r=this._pingPongRenderTarget;this._halfBlur(t,r,n,i,a,"latitudinal",o),this._halfBlur(r,t,i,i,a,"longitudinal",o)}_halfBlur(t,n,i,a,o,r,s){const c=this._renderer,f=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const m=3,l=new _n(this._lodPlanes[a],f),h=f.uniforms,p=this._sizeLods[i]-1,S=isFinite(o)?Math.PI/(2*p):2*Math.PI/(2*Pn-1),x=o/S,_=isFinite(o)?1+Math.floor(m*x):Pn;_>Pn&&console.warn(`sigmaRadians, ${o}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${Pn}`);const u=[];let T=0;for(let L=0;L<Pn;++L){const O=L/x,v=Math.exp(-O*O/2);u.push(v),L===0?T+=v:L<_&&(T+=2*v)}for(let L=0;L<u.length;L++)u[L]=u[L]/T;h.envMap.value=t.texture,h.samples.value=_,h.weights.value=u,h.latitudinal.value=r==="latitudinal",s&&(h.poleAxis.value=s);const{_lodMax:b}=this;h.dTheta.value=S,h.mipInt.value=b-i;const R=this._sizeLods[a],G=3*R*(a>b-ei?a-b+ei:0),N=4*(this._cubeSize-R);Oi(n,G,N,3*R,2*R),c.setRenderTarget(n),c.render(l,Io)}}function ch(e){const t=[],n=[],i=[];let a=e;const o=e-ei+1+Sr.length;for(let r=0;r<o;r++){const s=Math.pow(2,a);n.push(s);let c=1/s;r>e-ei?c=Sr[r-e+ei-1]:r===0&&(c=0),i.push(c);const f=1/(s-2),m=-f,l=1+f,h=[m,m,l,m,l,l,m,m,l,l,m,l],p=6,S=6,x=3,_=2,u=1,T=new Float32Array(x*S*p),b=new Float32Array(_*S*p),R=new Float32Array(u*S*p);for(let N=0;N<p;N++){const L=N%3*2/3-1,O=N>2?0:-1,v=[L,O,0,L+2/3,O,0,L+2/3,O+1,0,L,O,0,L+2/3,O+1,0,L,O+1,0];T.set(v,x*S*N),b.set(h,_*S*N);const g=[N,N,N,N,N,N];R.set(g,u*S*N)}const G=new ps;G.setAttribute("position",new qi(T,x)),G.setAttribute("uv",new qi(b,_)),G.setAttribute("faceIndex",new qi(R,u)),t.push(G),a>ei&&a--}return{lodPlanes:t,sizeLods:n,sigmas:i}}function Mr(e,t,n){const i=new on(e,t,n);return i.texture.mapping=fo,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Oi(e,t,n,i,a){e.viewport.set(t,n,i,a),e.scissor.set(t,n,i,a)}function fh(e,t,n){const i=new Float32Array(Pn),a=new Ye(0,1,0);return new Rn({name:"SphericalGaussianBlur",defines:{n:Pn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:ia(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Nn,depthTest:!1,depthWrite:!1})}function Ar(){return new Rn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ia(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Nn,depthTest:!1,depthWrite:!1})}function br(){return new Rn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ia(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Nn,depthTest:!1,depthWrite:!1})}function ia(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function uh(e){let t=new WeakMap,n=null;function i(s){if(s&&s.isTexture){const c=s.mapping,f=c===Yo||c===qo,m=c===bi||c===ni;if(f||m){let l=t.get(s);const h=l!==void 0?l.texture.pmremVersion:0;if(s.isRenderTargetTexture&&s.pmremVersion!==h)return n===null&&(n=new Tr(e)),l=f?n.fromEquirectangular(s,l):n.fromCubemap(s,l),l.texture.pmremVersion=s.pmremVersion,t.set(s,l),l.texture;if(l!==void 0)return l.texture;{const p=s.image;return f&&p&&p.height>0||m&&p&&a(p)?(n===null&&(n=new Tr(e)),l=f?n.fromEquirectangular(s):n.fromCubemap(s),l.texture.pmremVersion=s.pmremVersion,t.set(s,l),s.addEventListener("dispose",o),l.texture):null}}}return s}function a(s){let c=0;const f=6;for(let m=0;m<f;m++)s[m]!==void 0&&c++;return c===f}function o(s){const c=s.target;c.removeEventListener("dispose",o);const f=t.get(c);f!==void 0&&(t.delete(c),f.dispose())}function r(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:r}}function dh(e){const t={};function n(i){if(t[i]!==void 0)return t[i];let a;switch(i){case"WEBGL_depth_texture":a=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":a=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":a=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":a=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:a=e.getExtension(i)}return t[i]=a,a}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){const a=n(i);return a===null&&Xi("THREE.WebGLRenderer: "+i+" extension not supported."),a}}}function hh(e,t,n,i){const a={},o=new WeakMap;function r(l){const h=l.target;h.index!==null&&t.remove(h.index);for(const S in h.attributes)t.remove(h.attributes[S]);h.removeEventListener("dispose",r),delete a[h.id];const p=o.get(h);p&&(t.remove(p),o.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,n.memory.geometries--}function s(l,h){return a[h.id]===!0||(h.addEventListener("dispose",r),a[h.id]=!0,n.memory.geometries++),h}function c(l){const h=l.attributes;for(const p in h)t.update(h[p],e.ARRAY_BUFFER)}function f(l){const h=[],p=l.index,S=l.attributes.position;let x=0;if(p!==null){const T=p.array;x=p.version;for(let b=0,R=T.length;b<R;b+=3){const G=T[b+0],N=T[b+1],L=T[b+2];h.push(G,N,N,L,L,G)}}else if(S!==void 0){const T=S.array;x=S.version;for(let b=0,R=T.length/3-1;b<R;b+=3){const G=b+0,N=b+1,L=b+2;h.push(G,N,N,L,L,G)}}else return;const _=new(lc(h)?rc:sc)(h,1);_.version=x;const u=o.get(l);u&&t.remove(u),o.set(l,_)}function m(l){const h=o.get(l);if(h){const p=l.index;p!==null&&h.version<p.version&&f(l)}else f(l);return o.get(l)}return{get:s,update:c,getWireframeAttribute:m}}function ph(e,t,n){let i;function a(h){i=h}let o,r;function s(h){o=h.type,r=h.bytesPerElement}function c(h,p){e.drawElements(i,p,o,h*r),n.update(p,i,1)}function f(h,p,S){S!==0&&(e.drawElementsInstanced(i,p,o,h*r,S),n.update(p,i,S))}function m(h,p,S){if(S===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,p,0,o,h,0,S);let _=0;for(let u=0;u<S;u++)_+=p[u];n.update(_,i,1)}function l(h,p,S,x){if(S===0)return;const _=t.get("WEBGL_multi_draw");if(_===null)for(let u=0;u<h.length;u++)f(h[u]/r,p[u],x[u]);else{_.multiDrawElementsInstancedWEBGL(i,p,0,o,h,0,x,0,S);let u=0;for(let T=0;T<S;T++)u+=p[T]*x[T];n.update(u,i,1)}}this.setMode=a,this.setIndex=s,this.render=c,this.renderInstances=f,this.renderMultiDraw=m,this.renderMultiDrawInstances=l}function _h(e){const t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(o,r,s){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=s*(o/3);break;case e.LINES:n.lines+=s*(o/2);break;case e.LINE_STRIP:n.lines+=s*(o-1);break;case e.LINE_LOOP:n.lines+=s*o;break;case e.POINTS:n.points+=s*o;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function a(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:a,update:i}}function mh(e,t,n){const i=new WeakMap,a=new Zt;function o(r,s,c){const f=r.morphTargetInfluences,m=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,l=m!==void 0?m.length:0;let h=i.get(s);if(h===void 0||h.count!==l){let v=function(){L.dispose(),i.delete(s),s.removeEventListener("dispose",v)};h!==void 0&&h.texture.dispose();const p=s.morphAttributes.position!==void 0,S=s.morphAttributes.normal!==void 0,x=s.morphAttributes.color!==void 0,_=s.morphAttributes.position||[],u=s.morphAttributes.normal||[],T=s.morphAttributes.color||[];let b=0;p===!0&&(b=1),S===!0&&(b=2),x===!0&&(b=3);let R=s.attributes.position.count*b,G=1;R>t.maxTextureSize&&(G=Math.ceil(R/t.maxTextureSize),R=t.maxTextureSize);const N=new Float32Array(R*G*4*l),L=new Ms(N,R,G,l);L.type=Mn,L.needsUpdate=!0;const O=b*4;for(let g=0;g<l;g++){const w=_[g],U=u[g],k=T[g],W=R*G*4*g;for(let J=0;J<w.count;J++){const X=J*O;p===!0&&(a.fromBufferAttribute(w,J),N[W+X+0]=a.x,N[W+X+1]=a.y,N[W+X+2]=a.z,N[W+X+3]=0),S===!0&&(a.fromBufferAttribute(U,J),N[W+X+4]=a.x,N[W+X+5]=a.y,N[W+X+6]=a.z,N[W+X+7]=0),x===!0&&(a.fromBufferAttribute(k,J),N[W+X+8]=a.x,N[W+X+9]=a.y,N[W+X+10]=a.z,N[W+X+11]=k.itemSize===4?a.w:1)}}h={count:l,texture:L,size:new wt(R,G)},i.set(s,h),s.addEventListener("dispose",v)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)c.getUniforms().setValue(e,"morphTexture",r.morphTexture,n);else{let p=0;for(let x=0;x<f.length;x++)p+=f[x];const S=s.morphTargetsRelative?1:1-p;c.getUniforms().setValue(e,"morphTargetBaseInfluence",S),c.getUniforms().setValue(e,"morphTargetInfluences",f)}c.getUniforms().setValue(e,"morphTargetsTexture",h.texture,n),c.getUniforms().setValue(e,"morphTargetsTextureSize",h.size)}return{update:o}}function gh(e,t,n,i){let a=new WeakMap;function o(c){const f=i.render.frame,m=c.geometry,l=t.get(c,m);if(a.get(l)!==f&&(t.update(l),a.set(l,f)),c.isInstancedMesh&&(c.hasEventListener("dispose",s)===!1&&c.addEventListener("dispose",s),a.get(c)!==f&&(n.update(c.instanceMatrix,e.ARRAY_BUFFER),c.instanceColor!==null&&n.update(c.instanceColor,e.ARRAY_BUFFER),a.set(c,f))),c.isSkinnedMesh){const h=c.skeleton;a.get(h)!==f&&(h.update(),a.set(h,f))}return l}function r(){a=new WeakMap}function s(c){const f=c.target;f.removeEventListener("dispose",s),n.remove(f.instanceMatrix),f.instanceColor!==null&&n.remove(f.instanceColor)}return{update:o,dispose:r}}const Ls=new vs,Rr=new ds(1,1),Is=new Ms,Ps=new Sc,Ds=new vc,yr=[],wr=[],Cr=new Float32Array(16),Lr=new Float32Array(9),Ir=new Float32Array(4);function ai(e,t,n){const i=e[0];if(i<=0||i>0)return e;const a=t*n;let o=yr[a];if(o===void 0&&(o=new Float32Array(a),yr[a]=o),t!==0){i.toArray(o,0);for(let r=1,s=0;r!==t;++r)s+=n,e[r].toArray(o,s)}return o}function Ut(e,t){if(e.length!==t.length)return!1;for(let n=0,i=e.length;n<i;n++)if(e[n]!==t[n])return!1;return!0}function Nt(e,t){for(let n=0,i=t.length;n<i;n++)e[n]=t[n]}function uo(e,t){let n=wr[t];n===void 0&&(n=new Int32Array(t),wr[t]=n);for(let i=0;i!==t;++i)n[i]=e.allocateTextureUnit();return n}function vh(e,t){const n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Sh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Ut(n,t))return;e.uniform2fv(this.addr,t),Nt(n,t)}}function xh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Ut(n,t))return;e.uniform3fv(this.addr,t),Nt(n,t)}}function Eh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Ut(n,t))return;e.uniform4fv(this.addr,t),Nt(n,t)}}function Th(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(Ut(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Nt(n,t)}else{if(Ut(n,i))return;Ir.set(i),e.uniformMatrix2fv(this.addr,!1,Ir),Nt(n,i)}}function Mh(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(Ut(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Nt(n,t)}else{if(Ut(n,i))return;Lr.set(i),e.uniformMatrix3fv(this.addr,!1,Lr),Nt(n,i)}}function Ah(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(Ut(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Nt(n,t)}else{if(Ut(n,i))return;Cr.set(i),e.uniformMatrix4fv(this.addr,!1,Cr),Nt(n,i)}}function bh(e,t){const n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Rh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Ut(n,t))return;e.uniform2iv(this.addr,t),Nt(n,t)}}function yh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Ut(n,t))return;e.uniform3iv(this.addr,t),Nt(n,t)}}function wh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Ut(n,t))return;e.uniform4iv(this.addr,t),Nt(n,t)}}function Ch(e,t){const n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Lh(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Ut(n,t))return;e.uniform2uiv(this.addr,t),Nt(n,t)}}function Ih(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Ut(n,t))return;e.uniform3uiv(this.addr,t),Nt(n,t)}}function Ph(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Ut(n,t))return;e.uniform4uiv(this.addr,t),Nt(n,t)}}function Dh(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a);let o;this.type===e.SAMPLER_2D_SHADOW?(Rr.compareFunction=hs,o=Rr):o=Ls,n.setTexture2D(t||o,a)}function Uh(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTexture3D(t||Ps,a)}function Nh(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTextureCube(t||Ds,a)}function Fh(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTexture2DArray(t||Is,a)}function Oh(e){switch(e){case 5126:return vh;case 35664:return Sh;case 35665:return xh;case 35666:return Eh;case 35674:return Th;case 35675:return Mh;case 35676:return Ah;case 5124:case 35670:return bh;case 35667:case 35671:return Rh;case 35668:case 35672:return yh;case 35669:case 35673:return wh;case 5125:return Ch;case 36294:return Lh;case 36295:return Ih;case 36296:return Ph;case 35678:case 36198:case 36298:case 36306:case 35682:return Dh;case 35679:case 36299:case 36307:return Uh;case 35680:case 36300:case 36308:case 36293:return Nh;case 36289:case 36303:case 36311:case 36292:return Fh}}function Bh(e,t){e.uniform1fv(this.addr,t)}function Gh(e,t){const n=ai(t,this.size,2);e.uniform2fv(this.addr,n)}function Hh(e,t){const n=ai(t,this.size,3);e.uniform3fv(this.addr,n)}function kh(e,t){const n=ai(t,this.size,4);e.uniform4fv(this.addr,n)}function Vh(e,t){const n=ai(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function zh(e,t){const n=ai(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Wh(e,t){const n=ai(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Xh(e,t){e.uniform1iv(this.addr,t)}function Yh(e,t){e.uniform2iv(this.addr,t)}function qh(e,t){e.uniform3iv(this.addr,t)}function $h(e,t){e.uniform4iv(this.addr,t)}function Kh(e,t){e.uniform1uiv(this.addr,t)}function jh(e,t){e.uniform2uiv(this.addr,t)}function Zh(e,t){e.uniform3uiv(this.addr,t)}function Jh(e,t){e.uniform4uiv(this.addr,t)}function Qh(e,t,n){const i=this.cache,a=t.length,o=uo(n,a);Ut(i,o)||(e.uniform1iv(this.addr,o),Nt(i,o));for(let r=0;r!==a;++r)n.setTexture2D(t[r]||Ls,o[r])}function ep(e,t,n){const i=this.cache,a=t.length,o=uo(n,a);Ut(i,o)||(e.uniform1iv(this.addr,o),Nt(i,o));for(let r=0;r!==a;++r)n.setTexture3D(t[r]||Ps,o[r])}function tp(e,t,n){const i=this.cache,a=t.length,o=uo(n,a);Ut(i,o)||(e.uniform1iv(this.addr,o),Nt(i,o));for(let r=0;r!==a;++r)n.setTextureCube(t[r]||Ds,o[r])}function np(e,t,n){const i=this.cache,a=t.length,o=uo(n,a);Ut(i,o)||(e.uniform1iv(this.addr,o),Nt(i,o));for(let r=0;r!==a;++r)n.setTexture2DArray(t[r]||Is,o[r])}function ip(e){switch(e){case 5126:return Bh;case 35664:return Gh;case 35665:return Hh;case 35666:return kh;case 35674:return Vh;case 35675:return zh;case 35676:return Wh;case 5124:case 35670:return Xh;case 35667:case 35671:return Yh;case 35668:case 35672:return qh;case 35669:case 35673:return $h;case 5125:return Kh;case 36294:return jh;case 36295:return Zh;case 36296:return Jh;case 35678:case 36198:case 36298:case 36306:case 35682:return Qh;case 35679:case 36299:case 36307:return ep;case 35680:case 36300:case 36308:case 36293:return tp;case 36289:case 36303:case 36311:case 36292:return np}}class op{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.setValue=Oh(n.type)}}class ap{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=ip(n.type)}}class rp{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,i){const a=this.seq;for(let o=0,r=a.length;o!==r;++o){const s=a[o];s.setValue(t,n[s.id],i)}}}const Fo=/(\w+)(\])?(\[|\.)?/g;function Pr(e,t){e.seq.push(t),e.map[t.id]=t}function sp(e,t,n){const i=e.name,a=i.length;for(Fo.lastIndex=0;;){const o=Fo.exec(i),r=Fo.lastIndex;let s=o[1];const c=o[2]==="]",f=o[3];if(c&&(s=s|0),f===void 0||f==="["&&r+2===a){Pr(n,f===void 0?new op(s,e,t):new ap(s,e,t));break}else{let l=n.map[s];l===void 0&&(l=new rp(s),Pr(n,l)),n=l}}}class Ki{constructor(t,n){this.seq=[],this.map={};const i=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){const o=t.getActiveUniform(n,a),r=t.getUniformLocation(n,o.name);sp(o,r,this)}}setValue(t,n,i,a){const o=this.map[n];o!==void 0&&o.setValue(t,i,a)}setOptional(t,n,i){const a=n[i];a!==void 0&&this.setValue(t,i,a)}static upload(t,n,i,a){for(let o=0,r=n.length;o!==r;++o){const s=n[o],c=i[s.id];c.needsUpdate!==!1&&s.setValue(t,c.value,a)}}static seqWithValue(t,n){const i=[];for(let a=0,o=t.length;a!==o;++a){const r=t[a];r.id in n&&i.push(r)}return i}}function Dr(e,t,n){const i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),i}const lp=37297;let cp=0;function fp(e,t){const n=e.split(`
`),i=[],a=Math.max(t-6,0),o=Math.min(t+6,n.length);for(let r=a;r<o;r++){const s=r+1;i.push(`${s===t?">":" "} ${s}: ${n[r]}`)}return i.join(`
`)}const Ur=new lt;function up(e){Lt._getMatrix(Ur,Lt.workingColorSpace,e);const t=`mat3( ${Ur.elements.map(n=>n.toFixed(4))} )`;switch(Lt.getTransfer(e)){case ys:return[t,"LinearTransferOETF"];case Et:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[t,"LinearTransferOETF"]}}function Nr(e,t,n){const i=e.getShaderParameter(t,e.COMPILE_STATUS),a=e.getShaderInfoLog(t).trim();if(i&&a==="")return"";const o=/ERROR: 0:(\d+)/.exec(a);if(o){const r=parseInt(o[1]);return n.toUpperCase()+`

`+a+`

`+fp(e.getShaderSource(t),r)}else return a}function dp(e,t){const n=up(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function hp(e,t){let n;switch(t){case gc:n="Linear";break;case mc:n="Reinhard";break;case _c:n="Cineon";break;case pc:n="ACESFilmic";break;case hc:n="AgX";break;case dc:n="Neutral";break;case uc:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+e+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}const Bi=new Ye;function pp(){Lt.getLuminanceCoefficients(Bi);const e=Bi.x.toFixed(4),t=Bi.y.toFixed(4),n=Bi.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${t}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function _p(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Si).join(`
`)}function mp(e){const t=[];for(const n in e){const i=e[n];i!==!1&&t.push("#define "+n+" "+i)}return t.join(`
`)}function gp(e,t){const n={},i=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let a=0;a<i;a++){const o=e.getActiveAttrib(t,a),r=o.name;let s=1;o.type===e.FLOAT_MAT2&&(s=2),o.type===e.FLOAT_MAT3&&(s=3),o.type===e.FLOAT_MAT4&&(s=4),n[r]={type:o.type,location:e.getAttribLocation(t,r),locationSize:s}}return n}function Si(e){return e!==""}function Fr(e,t){const n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Or(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const vp=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ko(e){return e.replace(vp,xp)}const Sp=new Map;function xp(e,t){let n=Je[t];if(n===void 0){const i=Sp.get(t);if(i!==void 0)n=Je[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Ko(n)}const Ep=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Br(e){return e.replace(Ep,Tp)}function Tp(e,t,n,i){let a="";for(let o=parseInt(t);o<parseInt(n);o++)a+=i.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return a}function Gr(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision==="highp"?t+=`
#define HIGH_PRECISION`:e.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Mp(e){let t="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===_s?t="SHADOWMAP_TYPE_PCF":e.shadowMapType===fc?t="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===hn&&(t="SHADOWMAP_TYPE_VSM"),t}function Ap(e){let t="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case bi:case ni:t="ENVMAP_TYPE_CUBE";break;case fo:t="ENVMAP_TYPE_CUBE_UV";break}return t}function bp(e){let t="ENVMAP_MODE_REFLECTION";if(e.envMap)switch(e.envMapMode){case ni:t="ENVMAP_MODE_REFRACTION";break}return t}function Rp(e){let t="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case Mc:t="ENVMAP_BLENDING_MULTIPLY";break;case Tc:t="ENVMAP_BLENDING_MIX";break;case Ec:t="ENVMAP_BLENDING_ADD";break}return t}function yp(e){const t=e.envMapCubeUVHeight;if(t===null)return null;const n=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function wp(e,t,n,i){const a=e.getContext(),o=n.defines;let r=n.vertexShader,s=n.fragmentShader;const c=Mp(n),f=Ap(n),m=bp(n),l=Rp(n),h=yp(n),p=_p(n),S=mp(o),x=a.createProgram();let _,u,T=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(_=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,S].filter(Si).join(`
`),_.length>0&&(_+=`
`),u=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,S].filter(Si).join(`
`),u.length>0&&(u+=`
`)):(_=[Gr(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,S,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+m:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",n.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Si).join(`
`),u=[Gr(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,S,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+f:"",n.envMap?"#define "+m:"",n.envMap?"#define "+l:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+c:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",n.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==An?"#define TONE_MAPPING":"",n.toneMapping!==An?Je.tonemapping_pars_fragment:"",n.toneMapping!==An?hp("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Je.colorspace_pars_fragment,dp("linearToOutputTexel",n.outputColorSpace),pp(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(Si).join(`
`)),r=Ko(r),r=Fr(r,n),r=Or(r,n),s=Ko(s),s=Fr(s,n),s=Or(s,n),r=Br(r),s=Br(s),n.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,_=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,u=["#define varying in",n.glslVersion===tr?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===tr?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+u);const b=T+_+r,R=T+u+s,G=Dr(a,a.VERTEX_SHADER,b),N=Dr(a,a.FRAGMENT_SHADER,R);a.attachShader(x,G),a.attachShader(x,N),n.index0AttributeName!==void 0?a.bindAttribLocation(x,0,n.index0AttributeName):n.morphTargets===!0&&a.bindAttribLocation(x,0,"position"),a.linkProgram(x);function L(w){if(e.debug.checkShaderErrors){const U=a.getProgramInfoLog(x).trim(),k=a.getShaderInfoLog(G).trim(),W=a.getShaderInfoLog(N).trim();let J=!0,X=!0;if(a.getProgramParameter(x,a.LINK_STATUS)===!1)if(J=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(a,x,G,N);else{const ie=Nr(a,G,"vertex"),Z=Nr(a,N,"fragment");console.error("THREE.WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(x,a.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+U+`
`+ie+`
`+Z)}else U!==""?console.warn("THREE.WebGLProgram: Program Info Log:",U):(k===""||W==="")&&(X=!1);X&&(w.diagnostics={runnable:J,programLog:U,vertexShader:{log:k,prefix:_},fragmentShader:{log:W,prefix:u}})}a.deleteShader(G),a.deleteShader(N),O=new Ki(a,x),v=gp(a,x)}let O;this.getUniforms=function(){return O===void 0&&L(this),O};let v;this.getAttributes=function(){return v===void 0&&L(this),v};let g=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return g===!1&&(g=a.getProgramParameter(x,lp)),g},this.destroy=function(){i.releaseStatesOfProgram(this),a.deleteProgram(x),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=cp++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=G,this.fragmentShader=N,this}let Cp=0;class Lp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const n=t.vertexShader,i=t.fragmentShader,a=this._getShaderStage(n),o=this._getShaderStage(i),r=this._getShaderCacheForMaterial(t);return r.has(a)===!1&&(r.add(a),a.usedTimes++),r.has(o)===!1&&(r.add(o),o.usedTimes++),this}remove(t){const n=this.materialCache.get(t);for(const i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const n=this.materialCache;let i=n.get(t);return i===void 0&&(i=new Set,n.set(t,i)),i}_getShaderStage(t){const n=this.shaderCache;let i=n.get(t);return i===void 0&&(i=new Ip(t),n.set(t,i)),i}}class Ip{constructor(t){this.id=Cp++,this.code=t,this.usedTimes=0}}function Pp(e,t,n,i,a,o,r){const s=new cc,c=new Lp,f=new Set,m=[],l=a.logarithmicDepthBuffer,h=a.vertexTextures;let p=a.precision;const S={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(v){return f.add(v),v===0?"uv":`uv${v}`}function _(v,g,w,U,k){const W=U.fog,J=k.geometry,X=v.isMeshStandardMaterial?U.environment:null,ie=(v.isMeshStandardMaterial?n:t).get(v.envMap||X),Z=ie&&ie.mapping===fo?ie.image.height:null,he=S[v.type];v.precision!==null&&(p=a.getMaxPrecision(v.precision),p!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",p,"instead."));const we=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,He=we!==void 0?we.length:0;let $e=0;J.morphAttributes.position!==void 0&&($e=1),J.morphAttributes.normal!==void 0&&($e=2),J.morphAttributes.color!==void 0&&($e=3);let ft,ee,_e,Ce;if(he){const ct=ln[he];ft=ct.vertexShader,ee=ct.fragmentShader}else ft=v.vertexShader,ee=v.fragmentShader,c.update(v),_e=c.getVertexShaderID(v),Ce=c.getFragmentShaderID(v);const xe=e.getRenderTarget(),Be=e.state.buffers.depth.getReversed(),et=k.isInstancedMesh===!0,Fe=k.isBatchedMesh===!0,xt=!!v.map,ht=!!v.matcap,Qe=!!ie,B=!!v.aoMap,Ot=!!v.lightMap,at=!!v.bumpMap,tt=!!v.normalMap,Ue=!!v.displacementMap,pt=!!v.emissiveMap,Le=!!v.metalnessMap,C=!!v.roughnessMap,E=v.anisotropy>0,Y=v.clearcoat>0,ae=v.dispersion>0,se=v.iridescence>0,te=v.sheen>0,Ie=v.transmission>0,ve=E&&!!v.anisotropyMap,Ae=Y&&!!v.clearcoatMap,it=Y&&!!v.clearcoatNormalMap,fe=Y&&!!v.clearcoatRoughnessMap,be=se&&!!v.iridescenceMap,Ge=se&&!!v.iridescenceThicknessMap,Ve=te&&!!v.sheenColorMap,Re=te&&!!v.sheenRoughnessMap,je=!!v.specularMap,qe=!!v.specularColorMap,ut=!!v.specularIntensityMap,H=Ie&&!!v.transmissionMap,pe=Ie&&!!v.thicknessMap,$=!!v.gradientMap,oe=!!v.alphaMap,Q=v.alphaTest>0,me=!!v.alphaHash,Xe=!!v.extensions;let _t=An;v.toneMapped&&(xe===null||xe.isXRRenderTarget===!0)&&(_t=e.toneMapping);const Mt={shaderID:he,shaderType:v.type,shaderName:v.name,vertexShader:ft,fragmentShader:ee,defines:v.defines,customVertexShaderID:_e,customFragmentShaderID:Ce,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:p,batching:Fe,batchingColor:Fe&&k._colorsTexture!==null,instancing:et,instancingColor:et&&k.instanceColor!==null,instancingMorph:et&&k.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:xe===null?e.outputColorSpace:xe.isXRRenderTarget===!0?xe.texture.colorSpace:co,alphaToCoverage:!!v.alphaToCoverage,map:xt,matcap:ht,envMap:Qe,envMapMode:Qe&&ie.mapping,envMapCubeUVHeight:Z,aoMap:B,lightMap:Ot,bumpMap:at,normalMap:tt,displacementMap:h&&Ue,emissiveMap:pt,normalMapObjectSpace:tt&&v.normalMapType===oc,normalMapTangentSpace:tt&&v.normalMapType===ic,metalnessMap:Le,roughnessMap:C,anisotropy:E,anisotropyMap:ve,clearcoat:Y,clearcoatMap:Ae,clearcoatNormalMap:it,clearcoatRoughnessMap:fe,dispersion:ae,iridescence:se,iridescenceMap:be,iridescenceThicknessMap:Ge,sheen:te,sheenColorMap:Ve,sheenRoughnessMap:Re,specularMap:je,specularColorMap:qe,specularIntensityMap:ut,transmission:Ie,transmissionMap:H,thicknessMap:pe,gradientMap:$,opaque:v.transparent===!1&&v.blending===$i&&v.alphaToCoverage===!1,alphaMap:oe,alphaTest:Q,alphaHash:me,combine:v.combine,mapUv:xt&&x(v.map.channel),aoMapUv:B&&x(v.aoMap.channel),lightMapUv:Ot&&x(v.lightMap.channel),bumpMapUv:at&&x(v.bumpMap.channel),normalMapUv:tt&&x(v.normalMap.channel),displacementMapUv:Ue&&x(v.displacementMap.channel),emissiveMapUv:pt&&x(v.emissiveMap.channel),metalnessMapUv:Le&&x(v.metalnessMap.channel),roughnessMapUv:C&&x(v.roughnessMap.channel),anisotropyMapUv:ve&&x(v.anisotropyMap.channel),clearcoatMapUv:Ae&&x(v.clearcoatMap.channel),clearcoatNormalMapUv:it&&x(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:fe&&x(v.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&x(v.iridescenceMap.channel),iridescenceThicknessMapUv:Ge&&x(v.iridescenceThicknessMap.channel),sheenColorMapUv:Ve&&x(v.sheenColorMap.channel),sheenRoughnessMapUv:Re&&x(v.sheenRoughnessMap.channel),specularMapUv:je&&x(v.specularMap.channel),specularColorMapUv:qe&&x(v.specularColorMap.channel),specularIntensityMapUv:ut&&x(v.specularIntensityMap.channel),transmissionMapUv:H&&x(v.transmissionMap.channel),thicknessMapUv:pe&&x(v.thicknessMap.channel),alphaMapUv:oe&&x(v.alphaMap.channel),vertexTangents:!!J.attributes.tangent&&(tt||E),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!J.attributes.uv&&(xt||oe),fog:!!W,useFog:v.fog===!0,fogExp2:!!W&&W.isFogExp2,flatShading:v.flatShading===!0,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:l,reverseDepthBuffer:Be,skinning:k.isSkinnedMesh===!0,morphTargets:J.morphAttributes.position!==void 0,morphNormals:J.morphAttributes.normal!==void 0,morphColors:J.morphAttributes.color!==void 0,morphTargetsCount:He,morphTextureStride:$e,numDirLights:g.directional.length,numPointLights:g.point.length,numSpotLights:g.spot.length,numSpotLightMaps:g.spotLightMap.length,numRectAreaLights:g.rectArea.length,numHemiLights:g.hemi.length,numDirLightShadows:g.directionalShadowMap.length,numPointLightShadows:g.pointShadowMap.length,numSpotLightShadows:g.spotShadowMap.length,numSpotLightShadowsWithMaps:g.numSpotLightShadowsWithMaps,numLightProbes:g.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:e.shadowMap.enabled&&w.length>0,shadowMapType:e.shadowMap.type,toneMapping:_t,decodeVideoTexture:xt&&v.map.isVideoTexture===!0&&Lt.getTransfer(v.map.colorSpace)===Et,decodeVideoTextureEmissive:pt&&v.emissiveMap.isVideoTexture===!0&&Lt.getTransfer(v.emissiveMap.colorSpace)===Et,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===pn,flipSided:v.side===an,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Xe&&v.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Xe&&v.extensions.multiDraw===!0||Fe)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Mt.vertexUv1s=f.has(1),Mt.vertexUv2s=f.has(2),Mt.vertexUv3s=f.has(3),f.clear(),Mt}function u(v){const g=[];if(v.shaderID?g.push(v.shaderID):(g.push(v.customVertexShaderID),g.push(v.customFragmentShaderID)),v.defines!==void 0)for(const w in v.defines)g.push(w),g.push(v.defines[w]);return v.isRawShaderMaterial===!1&&(T(g,v),b(g,v),g.push(e.outputColorSpace)),g.push(v.customProgramCacheKey),g.join()}function T(v,g){v.push(g.precision),v.push(g.outputColorSpace),v.push(g.envMapMode),v.push(g.envMapCubeUVHeight),v.push(g.mapUv),v.push(g.alphaMapUv),v.push(g.lightMapUv),v.push(g.aoMapUv),v.push(g.bumpMapUv),v.push(g.normalMapUv),v.push(g.displacementMapUv),v.push(g.emissiveMapUv),v.push(g.metalnessMapUv),v.push(g.roughnessMapUv),v.push(g.anisotropyMapUv),v.push(g.clearcoatMapUv),v.push(g.clearcoatNormalMapUv),v.push(g.clearcoatRoughnessMapUv),v.push(g.iridescenceMapUv),v.push(g.iridescenceThicknessMapUv),v.push(g.sheenColorMapUv),v.push(g.sheenRoughnessMapUv),v.push(g.specularMapUv),v.push(g.specularColorMapUv),v.push(g.specularIntensityMapUv),v.push(g.transmissionMapUv),v.push(g.thicknessMapUv),v.push(g.combine),v.push(g.fogExp2),v.push(g.sizeAttenuation),v.push(g.morphTargetsCount),v.push(g.morphAttributeCount),v.push(g.numDirLights),v.push(g.numPointLights),v.push(g.numSpotLights),v.push(g.numSpotLightMaps),v.push(g.numHemiLights),v.push(g.numRectAreaLights),v.push(g.numDirLightShadows),v.push(g.numPointLightShadows),v.push(g.numSpotLightShadows),v.push(g.numSpotLightShadowsWithMaps),v.push(g.numLightProbes),v.push(g.shadowMapType),v.push(g.toneMapping),v.push(g.numClippingPlanes),v.push(g.numClipIntersection),v.push(g.depthPacking)}function b(v,g){s.disableAll(),g.supportsVertexTextures&&s.enable(0),g.instancing&&s.enable(1),g.instancingColor&&s.enable(2),g.instancingMorph&&s.enable(3),g.matcap&&s.enable(4),g.envMap&&s.enable(5),g.normalMapObjectSpace&&s.enable(6),g.normalMapTangentSpace&&s.enable(7),g.clearcoat&&s.enable(8),g.iridescence&&s.enable(9),g.alphaTest&&s.enable(10),g.vertexColors&&s.enable(11),g.vertexAlphas&&s.enable(12),g.vertexUv1s&&s.enable(13),g.vertexUv2s&&s.enable(14),g.vertexUv3s&&s.enable(15),g.vertexTangents&&s.enable(16),g.anisotropy&&s.enable(17),g.alphaHash&&s.enable(18),g.batching&&s.enable(19),g.dispersion&&s.enable(20),g.batchingColor&&s.enable(21),v.push(s.mask),s.disableAll(),g.fog&&s.enable(0),g.useFog&&s.enable(1),g.flatShading&&s.enable(2),g.logarithmicDepthBuffer&&s.enable(3),g.reverseDepthBuffer&&s.enable(4),g.skinning&&s.enable(5),g.morphTargets&&s.enable(6),g.morphNormals&&s.enable(7),g.morphColors&&s.enable(8),g.premultipliedAlpha&&s.enable(9),g.shadowMapEnabled&&s.enable(10),g.doubleSided&&s.enable(11),g.flipSided&&s.enable(12),g.useDepthPacking&&s.enable(13),g.dithering&&s.enable(14),g.transmission&&s.enable(15),g.sheen&&s.enable(16),g.opaque&&s.enable(17),g.pointsUvs&&s.enable(18),g.decodeVideoTexture&&s.enable(19),g.decodeVideoTextureEmissive&&s.enable(20),g.alphaToCoverage&&s.enable(21),v.push(s.mask)}function R(v){const g=S[v.type];let w;if(g){const U=ln[g];w=nc.clone(U.uniforms)}else w=v.uniforms;return w}function G(v,g){let w;for(let U=0,k=m.length;U<k;U++){const W=m[U];if(W.cacheKey===g){w=W,++w.usedTimes;break}}return w===void 0&&(w=new wp(e,g,v,o),m.push(w)),w}function N(v){if(--v.usedTimes===0){const g=m.indexOf(v);m[g]=m[m.length-1],m.pop(),v.destroy()}}function L(v){c.remove(v)}function O(){c.dispose()}return{getParameters:_,getProgramCacheKey:u,getUniforms:R,acquireProgram:G,releaseProgram:N,releaseShaderCache:L,programs:m,dispose:O}}function Dp(){let e=new WeakMap;function t(r){return e.has(r)}function n(r){let s=e.get(r);return s===void 0&&(s={},e.set(r,s)),s}function i(r){e.delete(r)}function a(r,s,c){e.get(r)[s]=c}function o(){e=new WeakMap}return{has:t,get:n,remove:i,update:a,dispose:o}}function Up(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.z!==t.z?e.z-t.z:e.id-t.id}function Hr(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function kr(){const e=[];let t=0;const n=[],i=[],a=[];function o(){t=0,n.length=0,i.length=0,a.length=0}function r(l,h,p,S,x,_){let u=e[t];return u===void 0?(u={id:l.id,object:l,geometry:h,material:p,groupOrder:S,renderOrder:l.renderOrder,z:x,group:_},e[t]=u):(u.id=l.id,u.object=l,u.geometry=h,u.material=p,u.groupOrder=S,u.renderOrder=l.renderOrder,u.z=x,u.group=_),t++,u}function s(l,h,p,S,x,_){const u=r(l,h,p,S,x,_);p.transmission>0?i.push(u):p.transparent===!0?a.push(u):n.push(u)}function c(l,h,p,S,x,_){const u=r(l,h,p,S,x,_);p.transmission>0?i.unshift(u):p.transparent===!0?a.unshift(u):n.unshift(u)}function f(l,h){n.length>1&&n.sort(l||Up),i.length>1&&i.sort(h||Hr),a.length>1&&a.sort(h||Hr)}function m(){for(let l=t,h=e.length;l<h;l++){const p=e[l];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:n,transmissive:i,transparent:a,init:o,push:s,unshift:c,finish:m,sort:f}}function Np(){let e=new WeakMap;function t(i,a){const o=e.get(i);let r;return o===void 0?(r=new kr,e.set(i,[r])):a>=o.length?(r=new kr,o.push(r)):r=o[a],r}function n(){e=new WeakMap}return{get:t,dispose:n}}function Fp(){const e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new Ye,color:new Tt};break;case"SpotLight":n={position:new Ye,direction:new Ye,color:new Tt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new Ye,color:new Tt,distance:0,decay:0};break;case"HemisphereLight":n={direction:new Ye,skyColor:new Tt,groundColor:new Tt};break;case"RectAreaLight":n={color:new Tt,position:new Ye,halfWidth:new Ye,halfHeight:new Ye};break}return e[t.id]=n,n}}}function Op(){const e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new wt};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new wt};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new wt,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}let Bp=0;function Gp(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function Hp(e){const t=new Fp,n=Op(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)i.probe.push(new Ye);const a=new Ye,o=new ti,r=new ti;function s(f){let m=0,l=0,h=0;for(let v=0;v<9;v++)i.probe[v].set(0,0,0);let p=0,S=0,x=0,_=0,u=0,T=0,b=0,R=0,G=0,N=0,L=0;f.sort(Gp);for(let v=0,g=f.length;v<g;v++){const w=f[v],U=w.color,k=w.intensity,W=w.distance,J=w.shadow&&w.shadow.map?w.shadow.map.texture:null;if(w.isAmbientLight)m+=U.r*k,l+=U.g*k,h+=U.b*k;else if(w.isLightProbe){for(let X=0;X<9;X++)i.probe[X].addScaledVector(w.sh.coefficients[X],k);L++}else if(w.isDirectionalLight){const X=t.get(w);if(X.color.copy(w.color).multiplyScalar(w.intensity),w.castShadow){const ie=w.shadow,Z=n.get(w);Z.shadowIntensity=ie.intensity,Z.shadowBias=ie.bias,Z.shadowNormalBias=ie.normalBias,Z.shadowRadius=ie.radius,Z.shadowMapSize=ie.mapSize,i.directionalShadow[p]=Z,i.directionalShadowMap[p]=J,i.directionalShadowMatrix[p]=w.shadow.matrix,T++}i.directional[p]=X,p++}else if(w.isSpotLight){const X=t.get(w);X.position.setFromMatrixPosition(w.matrixWorld),X.color.copy(U).multiplyScalar(k),X.distance=W,X.coneCos=Math.cos(w.angle),X.penumbraCos=Math.cos(w.angle*(1-w.penumbra)),X.decay=w.decay,i.spot[x]=X;const ie=w.shadow;if(w.map&&(i.spotLightMap[G]=w.map,G++,ie.updateMatrices(w),w.castShadow&&N++),i.spotLightMatrix[x]=ie.matrix,w.castShadow){const Z=n.get(w);Z.shadowIntensity=ie.intensity,Z.shadowBias=ie.bias,Z.shadowNormalBias=ie.normalBias,Z.shadowRadius=ie.radius,Z.shadowMapSize=ie.mapSize,i.spotShadow[x]=Z,i.spotShadowMap[x]=J,R++}x++}else if(w.isRectAreaLight){const X=t.get(w);X.color.copy(U).multiplyScalar(k),X.halfWidth.set(w.width*.5,0,0),X.halfHeight.set(0,w.height*.5,0),i.rectArea[_]=X,_++}else if(w.isPointLight){const X=t.get(w);if(X.color.copy(w.color).multiplyScalar(w.intensity),X.distance=w.distance,X.decay=w.decay,w.castShadow){const ie=w.shadow,Z=n.get(w);Z.shadowIntensity=ie.intensity,Z.shadowBias=ie.bias,Z.shadowNormalBias=ie.normalBias,Z.shadowRadius=ie.radius,Z.shadowMapSize=ie.mapSize,Z.shadowCameraNear=ie.camera.near,Z.shadowCameraFar=ie.camera.far,i.pointShadow[S]=Z,i.pointShadowMap[S]=J,i.pointShadowMatrix[S]=w.shadow.matrix,b++}i.point[S]=X,S++}else if(w.isHemisphereLight){const X=t.get(w);X.skyColor.copy(w.color).multiplyScalar(k),X.groundColor.copy(w.groundColor).multiplyScalar(k),i.hemi[u]=X,u++}}_>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Se.LTC_FLOAT_1,i.rectAreaLTC2=Se.LTC_FLOAT_2):(i.rectAreaLTC1=Se.LTC_HALF_1,i.rectAreaLTC2=Se.LTC_HALF_2)),i.ambient[0]=m,i.ambient[1]=l,i.ambient[2]=h;const O=i.hash;(O.directionalLength!==p||O.pointLength!==S||O.spotLength!==x||O.rectAreaLength!==_||O.hemiLength!==u||O.numDirectionalShadows!==T||O.numPointShadows!==b||O.numSpotShadows!==R||O.numSpotMaps!==G||O.numLightProbes!==L)&&(i.directional.length=p,i.spot.length=x,i.rectArea.length=_,i.point.length=S,i.hemi.length=u,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=R,i.spotShadowMap.length=R,i.directionalShadowMatrix.length=T,i.pointShadowMatrix.length=b,i.spotLightMatrix.length=R+G-N,i.spotLightMap.length=G,i.numSpotLightShadowsWithMaps=N,i.numLightProbes=L,O.directionalLength=p,O.pointLength=S,O.spotLength=x,O.rectAreaLength=_,O.hemiLength=u,O.numDirectionalShadows=T,O.numPointShadows=b,O.numSpotShadows=R,O.numSpotMaps=G,O.numLightProbes=L,i.version=Bp++)}function c(f,m){let l=0,h=0,p=0,S=0,x=0;const _=m.matrixWorldInverse;for(let u=0,T=f.length;u<T;u++){const b=f[u];if(b.isDirectionalLight){const R=i.directional[l];R.direction.setFromMatrixPosition(b.matrixWorld),a.setFromMatrixPosition(b.target.matrixWorld),R.direction.sub(a),R.direction.transformDirection(_),l++}else if(b.isSpotLight){const R=i.spot[p];R.position.setFromMatrixPosition(b.matrixWorld),R.position.applyMatrix4(_),R.direction.setFromMatrixPosition(b.matrixWorld),a.setFromMatrixPosition(b.target.matrixWorld),R.direction.sub(a),R.direction.transformDirection(_),p++}else if(b.isRectAreaLight){const R=i.rectArea[S];R.position.setFromMatrixPosition(b.matrixWorld),R.position.applyMatrix4(_),r.identity(),o.copy(b.matrixWorld),o.premultiply(_),r.extractRotation(o),R.halfWidth.set(b.width*.5,0,0),R.halfHeight.set(0,b.height*.5,0),R.halfWidth.applyMatrix4(r),R.halfHeight.applyMatrix4(r),S++}else if(b.isPointLight){const R=i.point[h];R.position.setFromMatrixPosition(b.matrixWorld),R.position.applyMatrix4(_),h++}else if(b.isHemisphereLight){const R=i.hemi[x];R.direction.setFromMatrixPosition(b.matrixWorld),R.direction.transformDirection(_),x++}}}return{setup:s,setupView:c,state:i}}function Vr(e){const t=new Hp(e),n=[],i=[];function a(m){f.camera=m,n.length=0,i.length=0}function o(m){n.push(m)}function r(m){i.push(m)}function s(){t.setup(n)}function c(m){t.setupView(n,m)}const f={lightsArray:n,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:a,state:f,setupLights:s,setupLightsView:c,pushLight:o,pushShadow:r}}function kp(e){let t=new WeakMap;function n(a,o=0){const r=t.get(a);let s;return r===void 0?(s=new Vr(e),t.set(a,[s])):o>=r.length?(s=new Vr(e),r.push(s)):s=r[o],s}function i(){t=new WeakMap}return{get:n,dispose:i}}const Vp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,zp=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Wp(e,t,n){let i=new us;const a=new wt,o=new wt,r=new Zt,s=new Gl({depthPacking:Hl}),c=new kl,f={},m=n.maxTextureSize,l={[Ti]:an,[an]:Ti,[pn]:pn},h=new Rn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new wt},radius:{value:4}},vertexShader:Vp,fragmentShader:zp}),p=h.clone();p.defines.HORIZONTAL_PASS=1;const S=new ps;S.setAttribute("position",new qi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new _n(S,h),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=_s;let u=this.type;this.render=function(N,L,O){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||N.length===0)return;const v=e.getRenderTarget(),g=e.getActiveCubeFace(),w=e.getActiveMipmapLevel(),U=e.state;U.setBlending(Nn),U.buffers.color.setClear(1,1,1,1),U.buffers.depth.setTest(!0),U.setScissorTest(!1);const k=u!==hn&&this.type===hn,W=u===hn&&this.type!==hn;for(let J=0,X=N.length;J<X;J++){const ie=N[J],Z=ie.shadow;if(Z===void 0){console.warn("THREE.WebGLShadowMap:",ie,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;a.copy(Z.mapSize);const he=Z.getFrameExtents();if(a.multiply(he),o.copy(Z.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(o.x=Math.floor(m/he.x),a.x=o.x*he.x,Z.mapSize.x=o.x),a.y>m&&(o.y=Math.floor(m/he.y),a.y=o.y*he.y,Z.mapSize.y=o.y)),Z.map===null||k===!0||W===!0){const He=this.type!==hn?{minFilter:Un,magFilter:Un}:{};Z.map!==null&&Z.map.dispose(),Z.map=new on(a.x,a.y,He),Z.map.texture.name=ie.name+".shadowMap",Z.camera.updateProjectionMatrix()}e.setRenderTarget(Z.map),e.clear();const we=Z.getViewportCount();for(let He=0;He<we;He++){const $e=Z.getViewport(He);r.set(o.x*$e.x,o.y*$e.y,o.x*$e.z,o.y*$e.w),U.viewport(r),Z.updateMatrices(ie,He),i=Z.getFrustum(),R(L,O,Z.camera,ie,this.type)}Z.isPointLightShadow!==!0&&this.type===hn&&T(Z,O),Z.needsUpdate=!1}u=this.type,_.needsUpdate=!1,e.setRenderTarget(v,g,w)};function T(N,L){const O=t.update(x);h.defines.VSM_SAMPLES!==N.blurSamples&&(h.defines.VSM_SAMPLES=N.blurSamples,p.defines.VSM_SAMPLES=N.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new on(a.x,a.y)),h.uniforms.shadow_pass.value=N.map.texture,h.uniforms.resolution.value=N.mapSize,h.uniforms.radius.value=N.radius,e.setRenderTarget(N.mapPass),e.clear(),e.renderBufferDirect(L,null,O,h,x,null),p.uniforms.shadow_pass.value=N.mapPass.texture,p.uniforms.resolution.value=N.mapSize,p.uniforms.radius.value=N.radius,e.setRenderTarget(N.map),e.clear(),e.renderBufferDirect(L,null,O,p,x,null)}function b(N,L,O,v){let g=null;const w=O.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(w!==void 0)g=w;else if(g=O.isPointLight===!0?c:s,e.localClippingEnabled&&L.clipShadows===!0&&Array.isArray(L.clippingPlanes)&&L.clippingPlanes.length!==0||L.displacementMap&&L.displacementScale!==0||L.alphaMap&&L.alphaTest>0||L.map&&L.alphaTest>0){const U=g.uuid,k=L.uuid;let W=f[U];W===void 0&&(W={},f[U]=W);let J=W[k];J===void 0&&(J=g.clone(),W[k]=J,L.addEventListener("dispose",G)),g=J}if(g.visible=L.visible,g.wireframe=L.wireframe,v===hn?g.side=L.shadowSide!==null?L.shadowSide:L.side:g.side=L.shadowSide!==null?L.shadowSide:l[L.side],g.alphaMap=L.alphaMap,g.alphaTest=L.alphaTest,g.map=L.map,g.clipShadows=L.clipShadows,g.clippingPlanes=L.clippingPlanes,g.clipIntersection=L.clipIntersection,g.displacementMap=L.displacementMap,g.displacementScale=L.displacementScale,g.displacementBias=L.displacementBias,g.wireframeLinewidth=L.wireframeLinewidth,g.linewidth=L.linewidth,O.isPointLight===!0&&g.isMeshDistanceMaterial===!0){const U=e.properties.get(g);U.light=O}return g}function R(N,L,O,v,g){if(N.visible===!1)return;if(N.layers.test(L.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&g===hn)&&(!N.frustumCulled||i.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(O.matrixWorldInverse,N.matrixWorld);const k=t.update(N),W=N.material;if(Array.isArray(W)){const J=k.groups;for(let X=0,ie=J.length;X<ie;X++){const Z=J[X],he=W[Z.materialIndex];if(he&&he.visible){const we=b(N,he,v,g);N.onBeforeShadow(e,N,L,O,k,we,Z),e.renderBufferDirect(O,null,k,we,N,Z),N.onAfterShadow(e,N,L,O,k,we,Z)}}}else if(W.visible){const J=b(N,W,v,g);N.onBeforeShadow(e,N,L,O,k,J,null),e.renderBufferDirect(O,null,k,J,N,null),N.onAfterShadow(e,N,L,O,k,J,null)}}const U=N.children;for(let k=0,W=U.length;k<W;k++)R(U[k],L,O,v,g)}function G(N){N.target.removeEventListener("dispose",G);for(const O in f){const v=f[O],g=N.target.uuid;g in v&&(v[g].dispose(),delete v[g])}}}const Xp={[Xo]:Wo,[zo]:Ho,[Vo]:Go,[to]:ko,[Wo]:Xo,[Ho]:zo,[Go]:Vo,[ko]:to};function Yp(e,t){function n(){let H=!1;const pe=new Zt;let $=null;const oe=new Zt(0,0,0,0);return{setMask:function(Q){$!==Q&&!H&&(e.colorMask(Q,Q,Q,Q),$=Q)},setLocked:function(Q){H=Q},setClear:function(Q,me,Xe,_t,Mt){Mt===!0&&(Q*=_t,me*=_t,Xe*=_t),pe.set(Q,me,Xe,_t),oe.equals(pe)===!1&&(e.clearColor(Q,me,Xe,_t),oe.copy(pe))},reset:function(){H=!1,$=null,oe.set(-1,0,0,0)}}}function i(){let H=!1,pe=!1,$=null,oe=null,Q=null;return{setReversed:function(me){if(pe!==me){const Xe=t.get("EXT_clip_control");me?Xe.clipControlEXT(Xe.LOWER_LEFT_EXT,Xe.ZERO_TO_ONE_EXT):Xe.clipControlEXT(Xe.LOWER_LEFT_EXT,Xe.NEGATIVE_ONE_TO_ONE_EXT),pe=me;const _t=Q;Q=null,this.setClear(_t)}},getReversed:function(){return pe},setTest:function(me){me?xe(e.DEPTH_TEST):Be(e.DEPTH_TEST)},setMask:function(me){$!==me&&!H&&(e.depthMask(me),$=me)},setFunc:function(me){if(pe&&(me=Xp[me]),oe!==me){switch(me){case Xo:e.depthFunc(e.NEVER);break;case Wo:e.depthFunc(e.ALWAYS);break;case zo:e.depthFunc(e.LESS);break;case to:e.depthFunc(e.LEQUAL);break;case Vo:e.depthFunc(e.EQUAL);break;case ko:e.depthFunc(e.GEQUAL);break;case Ho:e.depthFunc(e.GREATER);break;case Go:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}oe=me}},setLocked:function(me){H=me},setClear:function(me){Q!==me&&(pe&&(me=1-me),e.clearDepth(me),Q=me)},reset:function(){H=!1,$=null,oe=null,Q=null,pe=!1}}}function a(){let H=!1,pe=null,$=null,oe=null,Q=null,me=null,Xe=null,_t=null,Mt=null;return{setTest:function(ct){H||(ct?xe(e.STENCIL_TEST):Be(e.STENCIL_TEST))},setMask:function(ct){pe!==ct&&!H&&(e.stencilMask(ct),pe=ct)},setFunc:function(ct,Bt,Jt){($!==ct||oe!==Bt||Q!==Jt)&&(e.stencilFunc(ct,Bt,Jt),$=ct,oe=Bt,Q=Jt)},setOp:function(ct,Bt,Jt){(me!==ct||Xe!==Bt||_t!==Jt)&&(e.stencilOp(ct,Bt,Jt),me=ct,Xe=Bt,_t=Jt)},setLocked:function(ct){H=ct},setClear:function(ct){Mt!==ct&&(e.clearStencil(ct),Mt=ct)},reset:function(){H=!1,pe=null,$=null,oe=null,Q=null,me=null,Xe=null,_t=null,Mt=null}}}const o=new n,r=new i,s=new a,c=new WeakMap,f=new WeakMap;let m={},l={},h=new WeakMap,p=[],S=null,x=!1,_=null,u=null,T=null,b=null,R=null,G=null,N=null,L=new Tt(0,0,0),O=0,v=!1,g=null,w=null,U=null,k=null,W=null;const J=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let X=!1,ie=0;const Z=e.getParameter(e.VERSION);Z.indexOf("WebGL")!==-1?(ie=parseFloat(/^WebGL (\d)/.exec(Z)[1]),X=ie>=1):Z.indexOf("OpenGL ES")!==-1&&(ie=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),X=ie>=2);let he=null,we={};const He=e.getParameter(e.SCISSOR_BOX),$e=e.getParameter(e.VIEWPORT),ft=new Zt().fromArray(He),ee=new Zt().fromArray($e);function _e(H,pe,$,oe){const Q=new Uint8Array(4),me=e.createTexture();e.bindTexture(H,me),e.texParameteri(H,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(H,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Xe=0;Xe<$;Xe++)H===e.TEXTURE_3D||H===e.TEXTURE_2D_ARRAY?e.texImage3D(pe,0,e.RGBA,1,1,oe,0,e.RGBA,e.UNSIGNED_BYTE,Q):e.texImage2D(pe+Xe,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,Q);return me}const Ce={};Ce[e.TEXTURE_2D]=_e(e.TEXTURE_2D,e.TEXTURE_2D,1),Ce[e.TEXTURE_CUBE_MAP]=_e(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),Ce[e.TEXTURE_2D_ARRAY]=_e(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),Ce[e.TEXTURE_3D]=_e(e.TEXTURE_3D,e.TEXTURE_3D,1,1),o.setClear(0,0,0,1),r.setClear(1),s.setClear(0),xe(e.DEPTH_TEST),r.setFunc(to),at(!1),tt(Ka),xe(e.CULL_FACE),B(Nn);function xe(H){m[H]!==!0&&(e.enable(H),m[H]=!0)}function Be(H){m[H]!==!1&&(e.disable(H),m[H]=!1)}function et(H,pe){return l[H]!==pe?(e.bindFramebuffer(H,pe),l[H]=pe,H===e.DRAW_FRAMEBUFFER&&(l[e.FRAMEBUFFER]=pe),H===e.FRAMEBUFFER&&(l[e.DRAW_FRAMEBUFFER]=pe),!0):!1}function Fe(H,pe){let $=p,oe=!1;if(H){$=h.get(pe),$===void 0&&($=[],h.set(pe,$));const Q=H.textures;if($.length!==Q.length||$[0]!==e.COLOR_ATTACHMENT0){for(let me=0,Xe=Q.length;me<Xe;me++)$[me]=e.COLOR_ATTACHMENT0+me;$.length=Q.length,oe=!0}}else $[0]!==e.BACK&&($[0]=e.BACK,oe=!0);oe&&e.drawBuffers($)}function xt(H){return S!==H?(e.useProgram(H),S=H,!0):!1}const ht={[hi]:e.FUNC_ADD,[ul]:e.FUNC_SUBTRACT,[fl]:e.FUNC_REVERSE_SUBTRACT};ht[Ac]=e.MIN,ht[bc]=e.MAX;const Qe={[Rl]:e.ZERO,[bl]:e.ONE,[Al]:e.SRC_COLOR,[Ml]:e.SRC_ALPHA,[Tl]:e.SRC_ALPHA_SATURATE,[El]:e.DST_COLOR,[xl]:e.DST_ALPHA,[Sl]:e.ONE_MINUS_SRC_COLOR,[vl]:e.ONE_MINUS_SRC_ALPHA,[gl]:e.ONE_MINUS_DST_COLOR,[ml]:e.ONE_MINUS_DST_ALPHA,[_l]:e.CONSTANT_COLOR,[pl]:e.ONE_MINUS_CONSTANT_COLOR,[hl]:e.CONSTANT_ALPHA,[dl]:e.ONE_MINUS_CONSTANT_ALPHA};function B(H,pe,$,oe,Q,me,Xe,_t,Mt,ct){if(H===Nn){x===!0&&(Be(e.BLEND),x=!1);return}if(x===!1&&(xe(e.BLEND),x=!0),H!==ec){if(H!==_||ct!==v){if((u!==hi||R!==hi)&&(e.blendEquation(e.FUNC_ADD),u=hi,R=hi),ct)switch(H){case $i:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ja:e.blendFunc(e.ONE,e.ONE);break;case Za:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case ja:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",H);break}else switch(H){case $i:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ja:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case Za:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case ja:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",H);break}T=null,b=null,G=null,N=null,L.set(0,0,0),O=0,_=H,v=ct}return}Q=Q||pe,me=me||$,Xe=Xe||oe,(pe!==u||Q!==R)&&(e.blendEquationSeparate(ht[pe],ht[Q]),u=pe,R=Q),($!==T||oe!==b||me!==G||Xe!==N)&&(e.blendFuncSeparate(Qe[$],Qe[oe],Qe[me],Qe[Xe]),T=$,b=oe,G=me,N=Xe),(_t.equals(L)===!1||Mt!==O)&&(e.blendColor(_t.r,_t.g,_t.b,Mt),L.copy(_t),O=Mt),_=H,v=!1}function Ot(H,pe){H.side===pn?Be(e.CULL_FACE):xe(e.CULL_FACE);let $=H.side===an;pe&&($=!$),at($),H.blending===$i&&H.transparent===!1?B(Nn):B(H.blending,H.blendEquation,H.blendSrc,H.blendDst,H.blendEquationAlpha,H.blendSrcAlpha,H.blendDstAlpha,H.blendColor,H.blendAlpha,H.premultipliedAlpha),r.setFunc(H.depthFunc),r.setTest(H.depthTest),r.setMask(H.depthWrite),o.setMask(H.colorWrite);const oe=H.stencilWrite;s.setTest(oe),oe&&(s.setMask(H.stencilWriteMask),s.setFunc(H.stencilFunc,H.stencilRef,H.stencilFuncMask),s.setOp(H.stencilFail,H.stencilZFail,H.stencilZPass)),pt(H.polygonOffset,H.polygonOffsetFactor,H.polygonOffsetUnits),H.alphaToCoverage===!0?xe(e.SAMPLE_ALPHA_TO_COVERAGE):Be(e.SAMPLE_ALPHA_TO_COVERAGE)}function at(H){g!==H&&(H?e.frontFace(e.CW):e.frontFace(e.CCW),g=H)}function tt(H){H!==Jl?(xe(e.CULL_FACE),H!==w&&(H===Ka?e.cullFace(e.BACK):H===Ql?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):Be(e.CULL_FACE),w=H}function Ue(H){H!==U&&(X&&e.lineWidth(H),U=H)}function pt(H,pe,$){H?(xe(e.POLYGON_OFFSET_FILL),(k!==pe||W!==$)&&(e.polygonOffset(pe,$),k=pe,W=$)):Be(e.POLYGON_OFFSET_FILL)}function Le(H){H?xe(e.SCISSOR_TEST):Be(e.SCISSOR_TEST)}function C(H){H===void 0&&(H=e.TEXTURE0+J-1),he!==H&&(e.activeTexture(H),he=H)}function E(H,pe,$){$===void 0&&(he===null?$=e.TEXTURE0+J-1:$=he);let oe=we[$];oe===void 0&&(oe={type:void 0,texture:void 0},we[$]=oe),(oe.type!==H||oe.texture!==pe)&&(he!==$&&(e.activeTexture($),he=$),e.bindTexture(H,pe||Ce[H]),oe.type=H,oe.texture=pe)}function Y(){const H=we[he];H!==void 0&&H.type!==void 0&&(e.bindTexture(H.type,null),H.type=void 0,H.texture=void 0)}function ae(){try{e.compressedTexImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function se(){try{e.compressedTexImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function te(){try{e.texSubImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Ie(){try{e.texSubImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function ve(){try{e.compressedTexSubImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Ae(){try{e.compressedTexSubImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function it(){try{e.texStorage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function fe(){try{e.texStorage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function be(){try{e.texImage2D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Ge(){try{e.texImage3D(...arguments)}catch(H){console.error("THREE.WebGLState:",H)}}function Ve(H){ft.equals(H)===!1&&(e.scissor(H.x,H.y,H.z,H.w),ft.copy(H))}function Re(H){ee.equals(H)===!1&&(e.viewport(H.x,H.y,H.z,H.w),ee.copy(H))}function je(H,pe){let $=f.get(pe);$===void 0&&($=new WeakMap,f.set(pe,$));let oe=$.get(H);oe===void 0&&(oe=e.getUniformBlockIndex(pe,H.name),$.set(H,oe))}function qe(H,pe){const oe=f.get(pe).get(H);c.get(pe)!==oe&&(e.uniformBlockBinding(pe,oe,H.__bindingPointIndex),c.set(pe,oe))}function ut(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),r.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),m={},he=null,we={},l={},h=new WeakMap,p=[],S=null,x=!1,_=null,u=null,T=null,b=null,R=null,G=null,N=null,L=new Tt(0,0,0),O=0,v=!1,g=null,w=null,U=null,k=null,W=null,ft.set(0,0,e.canvas.width,e.canvas.height),ee.set(0,0,e.canvas.width,e.canvas.height),o.reset(),r.reset(),s.reset()}return{buffers:{color:o,depth:r,stencil:s},enable:xe,disable:Be,bindFramebuffer:et,drawBuffers:Fe,useProgram:xt,setBlending:B,setMaterial:Ot,setFlipSided:at,setCullFace:tt,setLineWidth:Ue,setPolygonOffset:pt,setScissorTest:Le,activeTexture:C,bindTexture:E,unbindTexture:Y,compressedTexImage2D:ae,compressedTexImage3D:se,texImage2D:be,texImage3D:Ge,updateUBOMapping:je,uniformBlockBinding:qe,texStorage2D:it,texStorage3D:fe,texSubImage2D:te,texSubImage3D:Ie,compressedTexSubImage2D:ve,compressedTexSubImage3D:Ae,scissor:Ve,viewport:Re,reset:ut}}function qp(e,t,n,i,a,o,r){const s=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new wt,m=new WeakMap;let l;const h=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function S(C,E){return p?new OffscreenCanvas(C,E):xc("canvas")}function x(C,E,Y){let ae=1;const se=Le(C);if((se.width>Y||se.height>Y)&&(ae=Y/Math.max(se.width,se.height)),ae<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const te=Math.floor(ae*se.width),Ie=Math.floor(ae*se.height);l===void 0&&(l=S(te,Ie));const ve=E?S(te,Ie):l;return ve.width=te,ve.height=Ie,ve.getContext("2d").drawImage(C,0,0,te,Ie),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+se.width+"x"+se.height+") to ("+te+"x"+Ie+")."),ve}else return"data"in C&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+se.width+"x"+se.height+")."),C;return C}function _(C){return C.generateMipmaps}function u(C){e.generateMipmap(C)}function T(C){return C.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?e.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function b(C,E,Y,ae,se=!1){if(C!==null){if(e[C]!==void 0)return e[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let te=E;if(E===e.RED&&(Y===e.FLOAT&&(te=e.R32F),Y===e.HALF_FLOAT&&(te=e.R16F),Y===e.UNSIGNED_BYTE&&(te=e.R8)),E===e.RED_INTEGER&&(Y===e.UNSIGNED_BYTE&&(te=e.R8UI),Y===e.UNSIGNED_SHORT&&(te=e.R16UI),Y===e.UNSIGNED_INT&&(te=e.R32UI),Y===e.BYTE&&(te=e.R8I),Y===e.SHORT&&(te=e.R16I),Y===e.INT&&(te=e.R32I)),E===e.RG&&(Y===e.FLOAT&&(te=e.RG32F),Y===e.HALF_FLOAT&&(te=e.RG16F),Y===e.UNSIGNED_BYTE&&(te=e.RG8)),E===e.RG_INTEGER&&(Y===e.UNSIGNED_BYTE&&(te=e.RG8UI),Y===e.UNSIGNED_SHORT&&(te=e.RG16UI),Y===e.UNSIGNED_INT&&(te=e.RG32UI),Y===e.BYTE&&(te=e.RG8I),Y===e.SHORT&&(te=e.RG16I),Y===e.INT&&(te=e.RG32I)),E===e.RGB_INTEGER&&(Y===e.UNSIGNED_BYTE&&(te=e.RGB8UI),Y===e.UNSIGNED_SHORT&&(te=e.RGB16UI),Y===e.UNSIGNED_INT&&(te=e.RGB32UI),Y===e.BYTE&&(te=e.RGB8I),Y===e.SHORT&&(te=e.RGB16I),Y===e.INT&&(te=e.RGB32I)),E===e.RGBA_INTEGER&&(Y===e.UNSIGNED_BYTE&&(te=e.RGBA8UI),Y===e.UNSIGNED_SHORT&&(te=e.RGBA16UI),Y===e.UNSIGNED_INT&&(te=e.RGBA32UI),Y===e.BYTE&&(te=e.RGBA8I),Y===e.SHORT&&(te=e.RGBA16I),Y===e.INT&&(te=e.RGBA32I)),E===e.RGB&&Y===e.UNSIGNED_INT_5_9_9_9_REV&&(te=e.RGB9_E5),E===e.RGBA){const Ie=se?ys:Lt.getTransfer(ae);Y===e.FLOAT&&(te=e.RGBA32F),Y===e.HALF_FLOAT&&(te=e.RGBA16F),Y===e.UNSIGNED_BYTE&&(te=Ie===Et?e.SRGB8_ALPHA8:e.RGBA8),Y===e.UNSIGNED_SHORT_4_4_4_4&&(te=e.RGBA4),Y===e.UNSIGNED_SHORT_5_5_5_1&&(te=e.RGB5_A1)}return(te===e.R16F||te===e.R32F||te===e.RG16F||te===e.RG32F||te===e.RGBA16F||te===e.RGBA32F)&&t.get("EXT_color_buffer_float"),te}function R(C,E){let Y;return C?E===null||E===Ai||E===Mi?Y=e.DEPTH24_STENCIL8:E===Mn?Y=e.DEPTH32F_STENCIL8:E===no&&(Y=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===Ai||E===Mi?Y=e.DEPTH_COMPONENT24:E===Mn?Y=e.DEPTH_COMPONENT32F:E===no&&(Y=e.DEPTH_COMPONENT16),Y}function G(C,E){return _(C)===!0||C.isFramebufferTexture&&C.minFilter!==Un&&C.minFilter!==Tn?Math.log2(Math.max(E.width,E.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?E.mipmaps.length:1}function N(C){const E=C.target;E.removeEventListener("dispose",N),O(E),E.isVideoTexture&&m.delete(E)}function L(C){const E=C.target;E.removeEventListener("dispose",L),g(E)}function O(C){const E=i.get(C);if(E.__webglInit===void 0)return;const Y=C.source,ae=h.get(Y);if(ae){const se=ae[E.__cacheKey];se.usedTimes--,se.usedTimes===0&&v(C),Object.keys(ae).length===0&&h.delete(Y)}i.remove(C)}function v(C){const E=i.get(C);e.deleteTexture(E.__webglTexture);const Y=C.source,ae=h.get(Y);delete ae[E.__cacheKey],r.memory.textures--}function g(C){const E=i.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),i.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let ae=0;ae<6;ae++){if(Array.isArray(E.__webglFramebuffer[ae]))for(let se=0;se<E.__webglFramebuffer[ae].length;se++)e.deleteFramebuffer(E.__webglFramebuffer[ae][se]);else e.deleteFramebuffer(E.__webglFramebuffer[ae]);E.__webglDepthbuffer&&e.deleteRenderbuffer(E.__webglDepthbuffer[ae])}else{if(Array.isArray(E.__webglFramebuffer))for(let ae=0;ae<E.__webglFramebuffer.length;ae++)e.deleteFramebuffer(E.__webglFramebuffer[ae]);else e.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&e.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&e.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let ae=0;ae<E.__webglColorRenderbuffer.length;ae++)E.__webglColorRenderbuffer[ae]&&e.deleteRenderbuffer(E.__webglColorRenderbuffer[ae]);E.__webglDepthRenderbuffer&&e.deleteRenderbuffer(E.__webglDepthRenderbuffer)}const Y=C.textures;for(let ae=0,se=Y.length;ae<se;ae++){const te=i.get(Y[ae]);te.__webglTexture&&(e.deleteTexture(te.__webglTexture),r.memory.textures--),i.remove(Y[ae])}i.remove(C)}let w=0;function U(){w=0}function k(){const C=w;return C>=a.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+a.maxTextures),w+=1,C}function W(C){const E=[];return E.push(C.wrapS),E.push(C.wrapT),E.push(C.wrapR||0),E.push(C.magFilter),E.push(C.minFilter),E.push(C.anisotropy),E.push(C.internalFormat),E.push(C.format),E.push(C.type),E.push(C.generateMipmaps),E.push(C.premultiplyAlpha),E.push(C.flipY),E.push(C.unpackAlignment),E.push(C.colorSpace),E.join()}function J(C,E){const Y=i.get(C);if(C.isVideoTexture&&Ue(C),C.isRenderTargetTexture===!1&&C.version>0&&Y.__version!==C.version){const ae=C.image;if(ae===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ae.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ee(Y,C,E);return}}n.bindTexture(e.TEXTURE_2D,Y.__webglTexture,e.TEXTURE0+E)}function X(C,E){const Y=i.get(C);if(C.version>0&&Y.__version!==C.version){ee(Y,C,E);return}n.bindTexture(e.TEXTURE_2D_ARRAY,Y.__webglTexture,e.TEXTURE0+E)}function ie(C,E){const Y=i.get(C);if(C.version>0&&Y.__version!==C.version){ee(Y,C,E);return}n.bindTexture(e.TEXTURE_3D,Y.__webglTexture,e.TEXTURE0+E)}function Z(C,E){const Y=i.get(C);if(C.version>0&&Y.__version!==C.version){_e(Y,C,E);return}n.bindTexture(e.TEXTURE_CUBE_MAP,Y.__webglTexture,e.TEXTURE0+E)}const he={[Cl]:e.REPEAT,[wl]:e.CLAMP_TO_EDGE,[yl]:e.MIRRORED_REPEAT},we={[Un]:e.NEAREST,[Ll]:e.NEAREST_MIPMAP_NEAREST,[Pi]:e.NEAREST_MIPMAP_LINEAR,[Tn]:e.LINEAR,[To]:e.LINEAR_MIPMAP_NEAREST,[gi]:e.LINEAR_MIPMAP_LINEAR},He={[Ol]:e.NEVER,[Fl]:e.ALWAYS,[Nl]:e.LESS,[hs]:e.LEQUAL,[Ul]:e.EQUAL,[Dl]:e.GEQUAL,[Pl]:e.GREATER,[Il]:e.NOTEQUAL};function $e(C,E){if(E.type===Mn&&t.has("OES_texture_float_linear")===!1&&(E.magFilter===Tn||E.magFilter===To||E.magFilter===Pi||E.magFilter===gi||E.minFilter===Tn||E.minFilter===To||E.minFilter===Pi||E.minFilter===gi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(C,e.TEXTURE_WRAP_S,he[E.wrapS]),e.texParameteri(C,e.TEXTURE_WRAP_T,he[E.wrapT]),(C===e.TEXTURE_3D||C===e.TEXTURE_2D_ARRAY)&&e.texParameteri(C,e.TEXTURE_WRAP_R,he[E.wrapR]),e.texParameteri(C,e.TEXTURE_MAG_FILTER,we[E.magFilter]),e.texParameteri(C,e.TEXTURE_MIN_FILTER,we[E.minFilter]),E.compareFunction&&(e.texParameteri(C,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(C,e.TEXTURE_COMPARE_FUNC,He[E.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===Un||E.minFilter!==Pi&&E.minFilter!==gi||E.type===Mn&&t.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||i.get(E).__currentAnisotropy){const Y=t.get("EXT_texture_filter_anisotropic");e.texParameterf(C,Y.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,a.getMaxAnisotropy())),i.get(E).__currentAnisotropy=E.anisotropy}}}function ft(C,E){let Y=!1;C.__webglInit===void 0&&(C.__webglInit=!0,E.addEventListener("dispose",N));const ae=E.source;let se=h.get(ae);se===void 0&&(se={},h.set(ae,se));const te=W(E);if(te!==C.__cacheKey){se[te]===void 0&&(se[te]={texture:e.createTexture(),usedTimes:0},r.memory.textures++,Y=!0),se[te].usedTimes++;const Ie=se[C.__cacheKey];Ie!==void 0&&(se[C.__cacheKey].usedTimes--,Ie.usedTimes===0&&v(E)),C.__cacheKey=te,C.__webglTexture=se[te].texture}return Y}function ee(C,E,Y){let ae=e.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(ae=e.TEXTURE_2D_ARRAY),E.isData3DTexture&&(ae=e.TEXTURE_3D);const se=ft(C,E),te=E.source;n.bindTexture(ae,C.__webglTexture,e.TEXTURE0+Y);const Ie=i.get(te);if(te.version!==Ie.__version||se===!0){n.activeTexture(e.TEXTURE0+Y);const ve=Lt.getPrimaries(Lt.workingColorSpace),Ae=E.colorSpace===Jn?null:Lt.getPrimaries(E.colorSpace),it=E.colorSpace===Jn||ve===Ae?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,E.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,E.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,it);let fe=x(E.image,!1,a.maxTextureSize);fe=pt(E,fe);const be=o.convert(E.format,E.colorSpace),Ge=o.convert(E.type);let Ve=b(E.internalFormat,be,Ge,E.colorSpace,E.isVideoTexture);$e(ae,E);let Re;const je=E.mipmaps,qe=E.isVideoTexture!==!0,ut=Ie.__version===void 0||se===!0,H=te.dataReady,pe=G(E,fe);if(E.isDepthTexture)Ve=R(E.format===eo,E.type),ut&&(qe?n.texStorage2D(e.TEXTURE_2D,1,Ve,fe.width,fe.height):n.texImage2D(e.TEXTURE_2D,0,Ve,fe.width,fe.height,0,be,Ge,null));else if(E.isDataTexture)if(je.length>0){qe&&ut&&n.texStorage2D(e.TEXTURE_2D,pe,Ve,je[0].width,je[0].height);for(let $=0,oe=je.length;$<oe;$++)Re=je[$],qe?H&&n.texSubImage2D(e.TEXTURE_2D,$,0,0,Re.width,Re.height,be,Ge,Re.data):n.texImage2D(e.TEXTURE_2D,$,Ve,Re.width,Re.height,0,be,Ge,Re.data);E.generateMipmaps=!1}else qe?(ut&&n.texStorage2D(e.TEXTURE_2D,pe,Ve,fe.width,fe.height),H&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,fe.width,fe.height,be,Ge,fe.data)):n.texImage2D(e.TEXTURE_2D,0,Ve,fe.width,fe.height,0,be,Ge,fe.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){qe&&ut&&n.texStorage3D(e.TEXTURE_2D_ARRAY,pe,Ve,je[0].width,je[0].height,fe.depth);for(let $=0,oe=je.length;$<oe;$++)if(Re=je[$],E.format!==rn)if(be!==null)if(qe){if(H)if(E.layerUpdates.size>0){const Q=er(Re.width,Re.height,E.format,E.type);for(const me of E.layerUpdates){const Xe=Re.data.subarray(me*Q/Re.data.BYTES_PER_ELEMENT,(me+1)*Q/Re.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,$,0,0,me,Re.width,Re.height,1,be,Xe)}E.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,$,0,0,0,Re.width,Re.height,fe.depth,be,Re.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,$,Ve,Re.width,Re.height,fe.depth,0,Re.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else qe?H&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,$,0,0,0,Re.width,Re.height,fe.depth,be,Ge,Re.data):n.texImage3D(e.TEXTURE_2D_ARRAY,$,Ve,Re.width,Re.height,fe.depth,0,be,Ge,Re.data)}else{qe&&ut&&n.texStorage2D(e.TEXTURE_2D,pe,Ve,je[0].width,je[0].height);for(let $=0,oe=je.length;$<oe;$++)Re=je[$],E.format!==rn?be!==null?qe?H&&n.compressedTexSubImage2D(e.TEXTURE_2D,$,0,0,Re.width,Re.height,be,Re.data):n.compressedTexImage2D(e.TEXTURE_2D,$,Ve,Re.width,Re.height,0,Re.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):qe?H&&n.texSubImage2D(e.TEXTURE_2D,$,0,0,Re.width,Re.height,be,Ge,Re.data):n.texImage2D(e.TEXTURE_2D,$,Ve,Re.width,Re.height,0,be,Ge,Re.data)}else if(E.isDataArrayTexture)if(qe){if(ut&&n.texStorage3D(e.TEXTURE_2D_ARRAY,pe,Ve,fe.width,fe.height,fe.depth),H)if(E.layerUpdates.size>0){const $=er(fe.width,fe.height,E.format,E.type);for(const oe of E.layerUpdates){const Q=fe.data.subarray(oe*$/fe.data.BYTES_PER_ELEMENT,(oe+1)*$/fe.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,oe,fe.width,fe.height,1,be,Ge,Q)}E.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,fe.width,fe.height,fe.depth,be,Ge,fe.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,Ve,fe.width,fe.height,fe.depth,0,be,Ge,fe.data);else if(E.isData3DTexture)qe?(ut&&n.texStorage3D(e.TEXTURE_3D,pe,Ve,fe.width,fe.height,fe.depth),H&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,fe.width,fe.height,fe.depth,be,Ge,fe.data)):n.texImage3D(e.TEXTURE_3D,0,Ve,fe.width,fe.height,fe.depth,0,be,Ge,fe.data);else if(E.isFramebufferTexture){if(ut)if(qe)n.texStorage2D(e.TEXTURE_2D,pe,Ve,fe.width,fe.height);else{let $=fe.width,oe=fe.height;for(let Q=0;Q<pe;Q++)n.texImage2D(e.TEXTURE_2D,Q,Ve,$,oe,0,be,Ge,null),$>>=1,oe>>=1}}else if(je.length>0){if(qe&&ut){const $=Le(je[0]);n.texStorage2D(e.TEXTURE_2D,pe,Ve,$.width,$.height)}for(let $=0,oe=je.length;$<oe;$++)Re=je[$],qe?H&&n.texSubImage2D(e.TEXTURE_2D,$,0,0,be,Ge,Re):n.texImage2D(e.TEXTURE_2D,$,Ve,be,Ge,Re);E.generateMipmaps=!1}else if(qe){if(ut){const $=Le(fe);n.texStorage2D(e.TEXTURE_2D,pe,Ve,$.width,$.height)}H&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,be,Ge,fe)}else n.texImage2D(e.TEXTURE_2D,0,Ve,be,Ge,fe);_(E)&&u(ae),Ie.__version=te.version,E.onUpdate&&E.onUpdate(E)}C.__version=E.version}function _e(C,E,Y){if(E.image.length!==6)return;const ae=ft(C,E),se=E.source;n.bindTexture(e.TEXTURE_CUBE_MAP,C.__webglTexture,e.TEXTURE0+Y);const te=i.get(se);if(se.version!==te.__version||ae===!0){n.activeTexture(e.TEXTURE0+Y);const Ie=Lt.getPrimaries(Lt.workingColorSpace),ve=E.colorSpace===Jn?null:Lt.getPrimaries(E.colorSpace),Ae=E.colorSpace===Jn||Ie===ve?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,E.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,E.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ae);const it=E.isCompressedTexture||E.image[0].isCompressedTexture,fe=E.image[0]&&E.image[0].isDataTexture,be=[];for(let oe=0;oe<6;oe++)!it&&!fe?be[oe]=x(E.image[oe],!0,a.maxCubemapSize):be[oe]=fe?E.image[oe].image:E.image[oe],be[oe]=pt(E,be[oe]);const Ge=be[0],Ve=o.convert(E.format,E.colorSpace),Re=o.convert(E.type),je=b(E.internalFormat,Ve,Re,E.colorSpace),qe=E.isVideoTexture!==!0,ut=te.__version===void 0||ae===!0,H=se.dataReady;let pe=G(E,Ge);$e(e.TEXTURE_CUBE_MAP,E);let $;if(it){qe&&ut&&n.texStorage2D(e.TEXTURE_CUBE_MAP,pe,je,Ge.width,Ge.height);for(let oe=0;oe<6;oe++){$=be[oe].mipmaps;for(let Q=0;Q<$.length;Q++){const me=$[Q];E.format!==rn?Ve!==null?qe?H&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q,0,0,me.width,me.height,Ve,me.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q,je,me.width,me.height,0,me.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):qe?H&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q,0,0,me.width,me.height,Ve,Re,me.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q,je,me.width,me.height,0,Ve,Re,me.data)}}}else{if($=E.mipmaps,qe&&ut){$.length>0&&pe++;const oe=Le(be[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,pe,je,oe.width,oe.height)}for(let oe=0;oe<6;oe++)if(fe){qe?H&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,0,0,be[oe].width,be[oe].height,Ve,Re,be[oe].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,je,be[oe].width,be[oe].height,0,Ve,Re,be[oe].data);for(let Q=0;Q<$.length;Q++){const Xe=$[Q].image[oe].image;qe?H&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q+1,0,0,Xe.width,Xe.height,Ve,Re,Xe.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q+1,je,Xe.width,Xe.height,0,Ve,Re,Xe.data)}}else{qe?H&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,0,0,Ve,Re,be[oe]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,je,Ve,Re,be[oe]);for(let Q=0;Q<$.length;Q++){const me=$[Q];qe?H&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q+1,0,0,Ve,Re,me.image[oe]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Q+1,je,Ve,Re,me.image[oe])}}}_(E)&&u(e.TEXTURE_CUBE_MAP),te.__version=se.version,E.onUpdate&&E.onUpdate(E)}C.__version=E.version}function Ce(C,E,Y,ae,se,te){const Ie=o.convert(Y.format,Y.colorSpace),ve=o.convert(Y.type),Ae=b(Y.internalFormat,Ie,ve,Y.colorSpace),it=i.get(E),fe=i.get(Y);if(fe.__renderTarget=E,!it.__hasExternalTextures){const be=Math.max(1,E.width>>te),Ge=Math.max(1,E.height>>te);se===e.TEXTURE_3D||se===e.TEXTURE_2D_ARRAY?n.texImage3D(se,te,Ae,be,Ge,E.depth,0,Ie,ve,null):n.texImage2D(se,te,Ae,be,Ge,0,Ie,ve,null)}n.bindFramebuffer(e.FRAMEBUFFER,C),tt(E)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,ae,se,fe.__webglTexture,0,at(E)):(se===e.TEXTURE_2D||se>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&se<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,ae,se,fe.__webglTexture,te),n.bindFramebuffer(e.FRAMEBUFFER,null)}function xe(C,E,Y){if(e.bindRenderbuffer(e.RENDERBUFFER,C),E.depthBuffer){const ae=E.depthTexture,se=ae&&ae.isDepthTexture?ae.type:null,te=R(E.stencilBuffer,se),Ie=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ve=at(E);tt(E)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ve,te,E.width,E.height):Y?e.renderbufferStorageMultisample(e.RENDERBUFFER,ve,te,E.width,E.height):e.renderbufferStorage(e.RENDERBUFFER,te,E.width,E.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,Ie,e.RENDERBUFFER,C)}else{const ae=E.textures;for(let se=0;se<ae.length;se++){const te=ae[se],Ie=o.convert(te.format,te.colorSpace),ve=o.convert(te.type),Ae=b(te.internalFormat,Ie,ve,te.colorSpace),it=at(E);Y&&tt(E)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,it,Ae,E.width,E.height):tt(E)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,it,Ae,E.width,E.height):e.renderbufferStorage(e.RENDERBUFFER,Ae,E.width,E.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Be(C,E){if(E&&E.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(e.FRAMEBUFFER,C),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ae=i.get(E.depthTexture);ae.__renderTarget=E,(!ae.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)&&(E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0),J(E.depthTexture,0);const se=ae.__webglTexture,te=at(E);if(E.depthTexture.format===Qo)tt(E)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,se,0,te):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,se,0);else if(E.depthTexture.format===eo)tt(E)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,se,0,te):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,se,0);else throw new Error("Unknown depthTexture format")}function et(C){const E=i.get(C),Y=C.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==C.depthTexture){const ae=C.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),ae){const se=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,ae.removeEventListener("dispose",se)};ae.addEventListener("dispose",se),E.__depthDisposeCallback=se}E.__boundDepthTexture=ae}if(C.depthTexture&&!E.__autoAllocateDepthBuffer){if(Y)throw new Error("target.depthTexture not supported in Cube render targets");Be(E.__webglFramebuffer,C)}else if(Y){E.__webglDepthbuffer=[];for(let ae=0;ae<6;ae++)if(n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer[ae]),E.__webglDepthbuffer[ae]===void 0)E.__webglDepthbuffer[ae]=e.createRenderbuffer(),xe(E.__webglDepthbuffer[ae],C,!1);else{const se=C.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,te=E.__webglDepthbuffer[ae];e.bindRenderbuffer(e.RENDERBUFFER,te),e.framebufferRenderbuffer(e.FRAMEBUFFER,se,e.RENDERBUFFER,te)}}else if(n.bindFramebuffer(e.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=e.createRenderbuffer(),xe(E.__webglDepthbuffer,C,!1);else{const ae=C.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,se=E.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,se),e.framebufferRenderbuffer(e.FRAMEBUFFER,ae,e.RENDERBUFFER,se)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Fe(C,E,Y){const ae=i.get(C);E!==void 0&&Ce(ae.__webglFramebuffer,C,C.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),Y!==void 0&&et(C)}function xt(C){const E=C.texture,Y=i.get(C),ae=i.get(E);C.addEventListener("dispose",L);const se=C.textures,te=C.isWebGLCubeRenderTarget===!0,Ie=se.length>1;if(Ie||(ae.__webglTexture===void 0&&(ae.__webglTexture=e.createTexture()),ae.__version=E.version,r.memory.textures++),te){Y.__webglFramebuffer=[];for(let ve=0;ve<6;ve++)if(E.mipmaps&&E.mipmaps.length>0){Y.__webglFramebuffer[ve]=[];for(let Ae=0;Ae<E.mipmaps.length;Ae++)Y.__webglFramebuffer[ve][Ae]=e.createFramebuffer()}else Y.__webglFramebuffer[ve]=e.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){Y.__webglFramebuffer=[];for(let ve=0;ve<E.mipmaps.length;ve++)Y.__webglFramebuffer[ve]=e.createFramebuffer()}else Y.__webglFramebuffer=e.createFramebuffer();if(Ie)for(let ve=0,Ae=se.length;ve<Ae;ve++){const it=i.get(se[ve]);it.__webglTexture===void 0&&(it.__webglTexture=e.createTexture(),r.memory.textures++)}if(C.samples>0&&tt(C)===!1){Y.__webglMultisampledFramebuffer=e.createFramebuffer(),Y.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,Y.__webglMultisampledFramebuffer);for(let ve=0;ve<se.length;ve++){const Ae=se[ve];Y.__webglColorRenderbuffer[ve]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,Y.__webglColorRenderbuffer[ve]);const it=o.convert(Ae.format,Ae.colorSpace),fe=o.convert(Ae.type),be=b(Ae.internalFormat,it,fe,Ae.colorSpace,C.isXRRenderTarget===!0),Ge=at(C);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ge,be,C.width,C.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ve,e.RENDERBUFFER,Y.__webglColorRenderbuffer[ve])}e.bindRenderbuffer(e.RENDERBUFFER,null),C.depthBuffer&&(Y.__webglDepthRenderbuffer=e.createRenderbuffer(),xe(Y.__webglDepthRenderbuffer,C,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(te){n.bindTexture(e.TEXTURE_CUBE_MAP,ae.__webglTexture),$e(e.TEXTURE_CUBE_MAP,E);for(let ve=0;ve<6;ve++)if(E.mipmaps&&E.mipmaps.length>0)for(let Ae=0;Ae<E.mipmaps.length;Ae++)Ce(Y.__webglFramebuffer[ve][Ae],C,E,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ve,Ae);else Ce(Y.__webglFramebuffer[ve],C,E,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0);_(E)&&u(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Ie){for(let ve=0,Ae=se.length;ve<Ae;ve++){const it=se[ve],fe=i.get(it);n.bindTexture(e.TEXTURE_2D,fe.__webglTexture),$e(e.TEXTURE_2D,it),Ce(Y.__webglFramebuffer,C,it,e.COLOR_ATTACHMENT0+ve,e.TEXTURE_2D,0),_(it)&&u(e.TEXTURE_2D)}n.unbindTexture()}else{let ve=e.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ve=C.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(ve,ae.__webglTexture),$e(ve,E),E.mipmaps&&E.mipmaps.length>0)for(let Ae=0;Ae<E.mipmaps.length;Ae++)Ce(Y.__webglFramebuffer[Ae],C,E,e.COLOR_ATTACHMENT0,ve,Ae);else Ce(Y.__webglFramebuffer,C,E,e.COLOR_ATTACHMENT0,ve,0);_(E)&&u(ve),n.unbindTexture()}C.depthBuffer&&et(C)}function ht(C){const E=C.textures;for(let Y=0,ae=E.length;Y<ae;Y++){const se=E[Y];if(_(se)){const te=T(C),Ie=i.get(se).__webglTexture;n.bindTexture(te,Ie),u(te),n.unbindTexture()}}}const Qe=[],B=[];function Ot(C){if(C.samples>0){if(tt(C)===!1){const E=C.textures,Y=C.width,ae=C.height;let se=e.COLOR_BUFFER_BIT;const te=C.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Ie=i.get(C),ve=E.length>1;if(ve)for(let Ae=0;Ae<E.length;Ae++)n.bindFramebuffer(e.FRAMEBUFFER,Ie.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+Ae,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,Ie.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+Ae,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,Ie.__webglMultisampledFramebuffer),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Ie.__webglFramebuffer);for(let Ae=0;Ae<E.length;Ae++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(se|=e.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(se|=e.STENCIL_BUFFER_BIT)),ve){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,Ie.__webglColorRenderbuffer[Ae]);const it=i.get(E[Ae]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,it,0)}e.blitFramebuffer(0,0,Y,ae,0,0,Y,ae,se,e.NEAREST),c===!0&&(Qe.length=0,B.length=0,Qe.push(e.COLOR_ATTACHMENT0+Ae),C.depthBuffer&&C.resolveDepthBuffer===!1&&(Qe.push(te),B.push(te),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,B)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Qe))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),ve)for(let Ae=0;Ae<E.length;Ae++){n.bindFramebuffer(e.FRAMEBUFFER,Ie.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+Ae,e.RENDERBUFFER,Ie.__webglColorRenderbuffer[Ae]);const it=i.get(E[Ae]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,Ie.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+Ae,e.TEXTURE_2D,it,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Ie.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.resolveDepthBuffer===!1&&c){const E=C.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[E])}}}function at(C){return Math.min(a.maxSamples,C.samples)}function tt(C){const E=i.get(C);return C.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function Ue(C){const E=r.render.frame;m.get(C)!==E&&(m.set(C,E),C.update())}function pt(C,E){const Y=C.colorSpace,ae=C.format,se=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||Y!==co&&Y!==Jn&&(Lt.getTransfer(Y)===Et?(ae!==rn||se!==bn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",Y)),E}function Le(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(f.width=C.naturalWidth||C.width,f.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(f.width=C.displayWidth,f.height=C.displayHeight):(f.width=C.width,f.height=C.height),f}this.allocateTextureUnit=k,this.resetTextureUnits=U,this.setTexture2D=J,this.setTexture2DArray=X,this.setTexture3D=ie,this.setTextureCube=Z,this.rebindTextures=Fe,this.setupRenderTarget=xt,this.updateRenderTargetMipmap=ht,this.updateMultisampleRenderTarget=Ot,this.setupDepthRenderbuffer=et,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=tt}function $p(e,t){function n(i,a=Jn){let o;const r=Lt.getTransfer(a);if(i===bn)return e.UNSIGNED_BYTE;if(i===ms)return e.UNSIGNED_SHORT_4_4_4_4;if(i===gs)return e.UNSIGNED_SHORT_5_5_5_1;if(i===Vl)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===zl)return e.BYTE;if(i===Wl)return e.SHORT;if(i===no)return e.UNSIGNED_SHORT;if(i===Ss)return e.INT;if(i===Ai)return e.UNSIGNED_INT;if(i===Mn)return e.FLOAT;if(i===lo)return e.HALF_FLOAT;if(i===Xl)return e.ALPHA;if(i===Yl)return e.RGB;if(i===rn)return e.RGBA;if(i===ql)return e.LUMINANCE;if(i===$l)return e.LUMINANCE_ALPHA;if(i===Qo)return e.DEPTH_COMPONENT;if(i===eo)return e.DEPTH_STENCIL;if(i===Kl)return e.RED;if(i===xs)return e.RED_INTEGER;if(i===jl)return e.RG;if(i===Es)return e.RG_INTEGER;if(i===Ts)return e.RGBA_INTEGER;if(i===Mo||i===Ao||i===bo||i===Ro)if(r===Et)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(i===Mo)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Ao)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===bo)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ro)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(i===Mo)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Ao)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===bo)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ro)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Ma||i===Aa||i===ba||i===Ra)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(i===Ma)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Aa)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===ba)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Ra)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ya||i===wa||i===Ca)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(i===ya||i===wa)return r===Et?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(i===Ca)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===La||i===Ia||i===Pa||i===Da||i===Ua||i===Na||i===Fa||i===Oa||i===Ba||i===Ga||i===Ha||i===ka||i===Va||i===za)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(i===La)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Ia)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Pa)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Da)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ua)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Na)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Fa)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Oa)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Ba)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Ga)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Ha)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ka)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Va)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===za)return r===Et?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===yo||i===Wa||i===Xa)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(i===yo)return r===Et?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Wa)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Xa)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Zl||i===Ya||i===qa||i===$a)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(i===yo)return o.COMPRESSED_RED_RGTC1_EXT;if(i===Ya)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===qa)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===$a)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Mi?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:n}}const Kp=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,jp=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Zp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,n,i){if(this.texture===null){const a=new vs,o=t.properties.get(a);o.__webglTexture=n.texture,(n.depthNear!==i.depthNear||n.depthFar!==i.depthFar)&&(this.depthNear=n.depthNear,this.depthFar=n.depthFar),this.texture=a}}getMesh(t){if(this.texture!==null&&this.mesh===null){const n=t.cameras[0].viewport,i=new Rn({vertexShader:Kp,fragmentShader:jp,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new _n(new ea(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Jp extends sl{constructor(t,n){super();const i=this;let a=null,o=1,r=null,s="local-floor",c=1,f=null,m=null,l=null,h=null,p=null,S=null;const x=new Zp,_=n.getContextAttributes();let u=null,T=null;const b=[],R=[],G=new wt;let N=null;const L=new Yi;L.viewport=new Zt;const O=new Yi;O.viewport=new Zt;const v=[L,O],g=new ll;let w=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ee){let _e=b[ee];return _e===void 0&&(_e=new Eo,b[ee]=_e),_e.getTargetRaySpace()},this.getControllerGrip=function(ee){let _e=b[ee];return _e===void 0&&(_e=new Eo,b[ee]=_e),_e.getGripSpace()},this.getHand=function(ee){let _e=b[ee];return _e===void 0&&(_e=new Eo,b[ee]=_e),_e.getHandSpace()};function k(ee){const _e=R.indexOf(ee.inputSource);if(_e===-1)return;const Ce=b[_e];Ce!==void 0&&(Ce.update(ee.inputSource,ee.frame,f||r),Ce.dispatchEvent({type:ee.type,data:ee.inputSource}))}function W(){a.removeEventListener("select",k),a.removeEventListener("selectstart",k),a.removeEventListener("selectend",k),a.removeEventListener("squeeze",k),a.removeEventListener("squeezestart",k),a.removeEventListener("squeezeend",k),a.removeEventListener("end",W),a.removeEventListener("inputsourceschange",J);for(let ee=0;ee<b.length;ee++){const _e=R[ee];_e!==null&&(R[ee]=null,b[ee].disconnect(_e))}w=null,U=null,x.reset(),t.setRenderTarget(u),p=null,h=null,l=null,a=null,T=null,ft.stop(),i.isPresenting=!1,t.setPixelRatio(N),t.setSize(G.width,G.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ee){o=ee,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ee){s=ee,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||r},this.setReferenceSpace=function(ee){f=ee},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return l},this.getFrame=function(){return S},this.getSession=function(){return a},this.setSession=async function(ee){if(a=ee,a!==null){if(u=t.getRenderTarget(),a.addEventListener("select",k),a.addEventListener("selectstart",k),a.addEventListener("selectend",k),a.addEventListener("squeeze",k),a.addEventListener("squeezestart",k),a.addEventListener("squeezeend",k),a.addEventListener("end",W),a.addEventListener("inputsourceschange",J),_.xrCompatible!==!0&&await n.makeXRCompatible(),N=t.getPixelRatio(),t.getSize(G),typeof XRWebGLBinding<"u"&&"createProjectionLayer"in XRWebGLBinding.prototype){let Ce=null,xe=null,Be=null;_.depth&&(Be=_.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,Ce=_.stencil?eo:Qo,xe=_.stencil?Mi:Ai);const et={colorFormat:n.RGBA8,depthFormat:Be,scaleFactor:o};l=new XRWebGLBinding(a,n),h=l.createProjectionLayer(et),a.updateRenderState({layers:[h]}),t.setPixelRatio(1),t.setSize(h.textureWidth,h.textureHeight,!1),T=new on(h.textureWidth,h.textureHeight,{format:rn,type:bn,depthTexture:new ds(h.textureWidth,h.textureHeight,xe,void 0,void 0,void 0,void 0,void 0,void 0,Ce),stencilBuffer:_.stencil,colorSpace:t.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const Ce={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:o};p=new XRWebGLLayer(a,n,Ce),a.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),T=new on(p.framebufferWidth,p.framebufferHeight,{format:rn,type:bn,colorSpace:t.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(c),f=null,r=await a.requestReferenceSpace(s),ft.setContext(a),ft.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function J(ee){for(let _e=0;_e<ee.removed.length;_e++){const Ce=ee.removed[_e],xe=R.indexOf(Ce);xe>=0&&(R[xe]=null,b[xe].disconnect(Ce))}for(let _e=0;_e<ee.added.length;_e++){const Ce=ee.added[_e];let xe=R.indexOf(Ce);if(xe===-1){for(let et=0;et<b.length;et++)if(et>=R.length){R.push(Ce),xe=et;break}else if(R[et]===null){R[et]=Ce,xe=et;break}if(xe===-1)break}const Be=b[xe];Be&&Be.connect(Ce)}}const X=new Ye,ie=new Ye;function Z(ee,_e,Ce){X.setFromMatrixPosition(_e.matrixWorld),ie.setFromMatrixPosition(Ce.matrixWorld);const xe=X.distanceTo(ie),Be=_e.projectionMatrix.elements,et=Ce.projectionMatrix.elements,Fe=Be[14]/(Be[10]-1),xt=Be[14]/(Be[10]+1),ht=(Be[9]+1)/Be[5],Qe=(Be[9]-1)/Be[5],B=(Be[8]-1)/Be[0],Ot=(et[8]+1)/et[0],at=Fe*B,tt=Fe*Ot,Ue=xe/(-B+Ot),pt=Ue*-B;if(_e.matrixWorld.decompose(ee.position,ee.quaternion,ee.scale),ee.translateX(pt),ee.translateZ(Ue),ee.matrixWorld.compose(ee.position,ee.quaternion,ee.scale),ee.matrixWorldInverse.copy(ee.matrixWorld).invert(),Be[10]===-1)ee.projectionMatrix.copy(_e.projectionMatrix),ee.projectionMatrixInverse.copy(_e.projectionMatrixInverse);else{const Le=Fe+Ue,C=xt+Ue,E=at-pt,Y=tt+(xe-pt),ae=ht*xt/C*Le,se=Qe*xt/C*Le;ee.projectionMatrix.makePerspective(E,Y,ae,se,Le,C),ee.projectionMatrixInverse.copy(ee.projectionMatrix).invert()}}function he(ee,_e){_e===null?ee.matrixWorld.copy(ee.matrix):ee.matrixWorld.multiplyMatrices(_e.matrixWorld,ee.matrix),ee.matrixWorldInverse.copy(ee.matrixWorld).invert()}this.updateCamera=function(ee){if(a===null)return;let _e=ee.near,Ce=ee.far;x.texture!==null&&(x.depthNear>0&&(_e=x.depthNear),x.depthFar>0&&(Ce=x.depthFar)),g.near=O.near=L.near=_e,g.far=O.far=L.far=Ce,(w!==g.near||U!==g.far)&&(a.updateRenderState({depthNear:g.near,depthFar:g.far}),w=g.near,U=g.far),L.layers.mask=ee.layers.mask|2,O.layers.mask=ee.layers.mask|4,g.layers.mask=L.layers.mask|O.layers.mask;const xe=ee.parent,Be=g.cameras;he(g,xe);for(let et=0;et<Be.length;et++)he(Be[et],xe);Be.length===2?Z(g,L,O):g.projectionMatrix.copy(L.projectionMatrix),we(ee,g,xe)};function we(ee,_e,Ce){Ce===null?ee.matrix.copy(_e.matrixWorld):(ee.matrix.copy(Ce.matrixWorld),ee.matrix.invert(),ee.matrix.multiply(_e.matrixWorld)),ee.matrix.decompose(ee.position,ee.quaternion,ee.scale),ee.updateMatrixWorld(!0),ee.projectionMatrix.copy(_e.projectionMatrix),ee.projectionMatrixInverse.copy(_e.projectionMatrixInverse),ee.isPerspectiveCamera&&(ee.fov=cl*2*Math.atan(1/ee.projectionMatrix.elements[5]),ee.zoom=1)}this.getCamera=function(){return g},this.getFoveation=function(){if(!(h===null&&p===null))return c},this.setFoveation=function(ee){c=ee,h!==null&&(h.fixedFoveation=ee),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=ee)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(g)};let He=null;function $e(ee,_e){if(m=_e.getViewerPose(f||r),S=_e,m!==null){const Ce=m.views;p!==null&&(t.setRenderTargetFramebuffer(T,p.framebuffer),t.setRenderTarget(T));let xe=!1;Ce.length!==g.cameras.length&&(g.cameras.length=0,xe=!0);for(let Fe=0;Fe<Ce.length;Fe++){const xt=Ce[Fe];let ht=null;if(p!==null)ht=p.getViewport(xt);else{const B=l.getViewSubImage(h,xt);ht=B.viewport,Fe===0&&(t.setRenderTargetTextures(T,B.colorTexture,B.depthStencilTexture),t.setRenderTarget(T))}let Qe=v[Fe];Qe===void 0&&(Qe=new Yi,Qe.layers.enable(Fe),Qe.viewport=new Zt,v[Fe]=Qe),Qe.matrix.fromArray(xt.transform.matrix),Qe.matrix.decompose(Qe.position,Qe.quaternion,Qe.scale),Qe.projectionMatrix.fromArray(xt.projectionMatrix),Qe.projectionMatrixInverse.copy(Qe.projectionMatrix).invert(),Qe.viewport.set(ht.x,ht.y,ht.width,ht.height),Fe===0&&(g.matrix.copy(Qe.matrix),g.matrix.decompose(g.position,g.quaternion,g.scale)),xe===!0&&g.cameras.push(Qe)}const Be=a.enabledFeatures;if(Be&&Be.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&l){const Fe=l.getDepthInformation(Ce[0]);Fe&&Fe.isValid&&Fe.texture&&x.init(t,Fe,a.renderState)}}for(let Ce=0;Ce<b.length;Ce++){const xe=R[Ce],Be=b[Ce];xe!==null&&Be!==void 0&&Be.update(xe,_e,f||r)}He&&He(ee,_e),_e.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:_e}),S=null}const ft=new Cs;ft.setAnimationLoop($e),this.setAnimationLoop=function(ee){He=ee},this.dispose=function(){}}}const Ln=new Rs,Qp=new ti;function e_(e,t){function n(_,u){_.matrixAutoUpdate===!0&&_.updateMatrix(),u.value.copy(_.matrix)}function i(_,u){u.color.getRGB(_.fogColor.value,As(e)),u.isFog?(_.fogNear.value=u.near,_.fogFar.value=u.far):u.isFogExp2&&(_.fogDensity.value=u.density)}function a(_,u,T,b,R){u.isMeshBasicMaterial||u.isMeshLambertMaterial?o(_,u):u.isMeshToonMaterial?(o(_,u),l(_,u)):u.isMeshPhongMaterial?(o(_,u),m(_,u)):u.isMeshStandardMaterial?(o(_,u),h(_,u),u.isMeshPhysicalMaterial&&p(_,u,R)):u.isMeshMatcapMaterial?(o(_,u),S(_,u)):u.isMeshDepthMaterial?o(_,u):u.isMeshDistanceMaterial?(o(_,u),x(_,u)):u.isMeshNormalMaterial?o(_,u):u.isLineBasicMaterial?(r(_,u),u.isLineDashedMaterial&&s(_,u)):u.isPointsMaterial?c(_,u,T,b):u.isSpriteMaterial?f(_,u):u.isShadowMaterial?(_.color.value.copy(u.color),_.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function o(_,u){_.opacity.value=u.opacity,u.color&&_.diffuse.value.copy(u.color),u.emissive&&_.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(_.map.value=u.map,n(u.map,_.mapTransform)),u.alphaMap&&(_.alphaMap.value=u.alphaMap,n(u.alphaMap,_.alphaMapTransform)),u.bumpMap&&(_.bumpMap.value=u.bumpMap,n(u.bumpMap,_.bumpMapTransform),_.bumpScale.value=u.bumpScale,u.side===an&&(_.bumpScale.value*=-1)),u.normalMap&&(_.normalMap.value=u.normalMap,n(u.normalMap,_.normalMapTransform),_.normalScale.value.copy(u.normalScale),u.side===an&&_.normalScale.value.negate()),u.displacementMap&&(_.displacementMap.value=u.displacementMap,n(u.displacementMap,_.displacementMapTransform),_.displacementScale.value=u.displacementScale,_.displacementBias.value=u.displacementBias),u.emissiveMap&&(_.emissiveMap.value=u.emissiveMap,n(u.emissiveMap,_.emissiveMapTransform)),u.specularMap&&(_.specularMap.value=u.specularMap,n(u.specularMap,_.specularMapTransform)),u.alphaTest>0&&(_.alphaTest.value=u.alphaTest);const T=t.get(u),b=T.envMap,R=T.envMapRotation;b&&(_.envMap.value=b,Ln.copy(R),Ln.x*=-1,Ln.y*=-1,Ln.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Ln.y*=-1,Ln.z*=-1),_.envMapRotation.value.setFromMatrix4(Qp.makeRotationFromEuler(Ln)),_.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,_.reflectivity.value=u.reflectivity,_.ior.value=u.ior,_.refractionRatio.value=u.refractionRatio),u.lightMap&&(_.lightMap.value=u.lightMap,_.lightMapIntensity.value=u.lightMapIntensity,n(u.lightMap,_.lightMapTransform)),u.aoMap&&(_.aoMap.value=u.aoMap,_.aoMapIntensity.value=u.aoMapIntensity,n(u.aoMap,_.aoMapTransform))}function r(_,u){_.diffuse.value.copy(u.color),_.opacity.value=u.opacity,u.map&&(_.map.value=u.map,n(u.map,_.mapTransform))}function s(_,u){_.dashSize.value=u.dashSize,_.totalSize.value=u.dashSize+u.gapSize,_.scale.value=u.scale}function c(_,u,T,b){_.diffuse.value.copy(u.color),_.opacity.value=u.opacity,_.size.value=u.size*T,_.scale.value=b*.5,u.map&&(_.map.value=u.map,n(u.map,_.uvTransform)),u.alphaMap&&(_.alphaMap.value=u.alphaMap,n(u.alphaMap,_.alphaMapTransform)),u.alphaTest>0&&(_.alphaTest.value=u.alphaTest)}function f(_,u){_.diffuse.value.copy(u.color),_.opacity.value=u.opacity,_.rotation.value=u.rotation,u.map&&(_.map.value=u.map,n(u.map,_.mapTransform)),u.alphaMap&&(_.alphaMap.value=u.alphaMap,n(u.alphaMap,_.alphaMapTransform)),u.alphaTest>0&&(_.alphaTest.value=u.alphaTest)}function m(_,u){_.specular.value.copy(u.specular),_.shininess.value=Math.max(u.shininess,1e-4)}function l(_,u){u.gradientMap&&(_.gradientMap.value=u.gradientMap)}function h(_,u){_.metalness.value=u.metalness,u.metalnessMap&&(_.metalnessMap.value=u.metalnessMap,n(u.metalnessMap,_.metalnessMapTransform)),_.roughness.value=u.roughness,u.roughnessMap&&(_.roughnessMap.value=u.roughnessMap,n(u.roughnessMap,_.roughnessMapTransform)),u.envMap&&(_.envMapIntensity.value=u.envMapIntensity)}function p(_,u,T){_.ior.value=u.ior,u.sheen>0&&(_.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),_.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(_.sheenColorMap.value=u.sheenColorMap,n(u.sheenColorMap,_.sheenColorMapTransform)),u.sheenRoughnessMap&&(_.sheenRoughnessMap.value=u.sheenRoughnessMap,n(u.sheenRoughnessMap,_.sheenRoughnessMapTransform))),u.clearcoat>0&&(_.clearcoat.value=u.clearcoat,_.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(_.clearcoatMap.value=u.clearcoatMap,n(u.clearcoatMap,_.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(_.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,n(u.clearcoatRoughnessMap,_.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(_.clearcoatNormalMap.value=u.clearcoatNormalMap,n(u.clearcoatNormalMap,_.clearcoatNormalMapTransform),_.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===an&&_.clearcoatNormalScale.value.negate())),u.dispersion>0&&(_.dispersion.value=u.dispersion),u.iridescence>0&&(_.iridescence.value=u.iridescence,_.iridescenceIOR.value=u.iridescenceIOR,_.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],_.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(_.iridescenceMap.value=u.iridescenceMap,n(u.iridescenceMap,_.iridescenceMapTransform)),u.iridescenceThicknessMap&&(_.iridescenceThicknessMap.value=u.iridescenceThicknessMap,n(u.iridescenceThicknessMap,_.iridescenceThicknessMapTransform))),u.transmission>0&&(_.transmission.value=u.transmission,_.transmissionSamplerMap.value=T.texture,_.transmissionSamplerSize.value.set(T.width,T.height),u.transmissionMap&&(_.transmissionMap.value=u.transmissionMap,n(u.transmissionMap,_.transmissionMapTransform)),_.thickness.value=u.thickness,u.thicknessMap&&(_.thicknessMap.value=u.thicknessMap,n(u.thicknessMap,_.thicknessMapTransform)),_.attenuationDistance.value=u.attenuationDistance,_.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(_.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(_.anisotropyMap.value=u.anisotropyMap,n(u.anisotropyMap,_.anisotropyMapTransform))),_.specularIntensity.value=u.specularIntensity,_.specularColor.value.copy(u.specularColor),u.specularColorMap&&(_.specularColorMap.value=u.specularColorMap,n(u.specularColorMap,_.specularColorMapTransform)),u.specularIntensityMap&&(_.specularIntensityMap.value=u.specularIntensityMap,n(u.specularIntensityMap,_.specularIntensityMapTransform))}function S(_,u){u.matcap&&(_.matcap.value=u.matcap)}function x(_,u){const T=t.get(u).light;_.referencePosition.value.setFromMatrixPosition(T.matrixWorld),_.nearDistance.value=T.shadow.camera.near,_.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:a}}function t_(e,t,n,i){let a={},o={},r=[];const s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(T,b){const R=b.program;i.uniformBlockBinding(T,R)}function f(T,b){let R=a[T.id];R===void 0&&(S(T),R=m(T),a[T.id]=R,T.addEventListener("dispose",_));const G=b.program;i.updateUBOMapping(T,G);const N=t.render.frame;o[T.id]!==N&&(h(T),o[T.id]=N)}function m(T){const b=l();T.__bindingPointIndex=b;const R=e.createBuffer(),G=T.__size,N=T.usage;return e.bindBuffer(e.UNIFORM_BUFFER,R),e.bufferData(e.UNIFORM_BUFFER,G,N),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,b,R),R}function l(){for(let T=0;T<s;T++)if(r.indexOf(T)===-1)return r.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(T){const b=a[T.id],R=T.uniforms,G=T.__cache;e.bindBuffer(e.UNIFORM_BUFFER,b);for(let N=0,L=R.length;N<L;N++){const O=Array.isArray(R[N])?R[N]:[R[N]];for(let v=0,g=O.length;v<g;v++){const w=O[v];if(p(w,N,v,G)===!0){const U=w.__offset,k=Array.isArray(w.value)?w.value:[w.value];let W=0;for(let J=0;J<k.length;J++){const X=k[J],ie=x(X);typeof X=="number"||typeof X=="boolean"?(w.__data[0]=X,e.bufferSubData(e.UNIFORM_BUFFER,U+W,w.__data)):X.isMatrix3?(w.__data[0]=X.elements[0],w.__data[1]=X.elements[1],w.__data[2]=X.elements[2],w.__data[3]=0,w.__data[4]=X.elements[3],w.__data[5]=X.elements[4],w.__data[6]=X.elements[5],w.__data[7]=0,w.__data[8]=X.elements[6],w.__data[9]=X.elements[7],w.__data[10]=X.elements[8],w.__data[11]=0):(X.toArray(w.__data,W),W+=ie.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,U,w.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(T,b,R,G){const N=T.value,L=b+"_"+R;if(G[L]===void 0)return typeof N=="number"||typeof N=="boolean"?G[L]=N:G[L]=N.clone(),!0;{const O=G[L];if(typeof N=="number"||typeof N=="boolean"){if(O!==N)return G[L]=N,!0}else if(O.equals(N)===!1)return O.copy(N),!0}return!1}function S(T){const b=T.uniforms;let R=0;const G=16;for(let L=0,O=b.length;L<O;L++){const v=Array.isArray(b[L])?b[L]:[b[L]];for(let g=0,w=v.length;g<w;g++){const U=v[g],k=Array.isArray(U.value)?U.value:[U.value];for(let W=0,J=k.length;W<J;W++){const X=k[W],ie=x(X),Z=R%G,he=Z%ie.boundary,we=Z+he;R+=he,we!==0&&G-we<ie.storage&&(R+=G-we),U.__data=new Float32Array(ie.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=R,R+=ie.storage}}}const N=R%G;return N>0&&(R+=G-N),T.__size=R,T.__cache={},this}function x(T){const b={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(b.boundary=4,b.storage=4):T.isVector2?(b.boundary=8,b.storage=8):T.isVector3||T.isColor?(b.boundary=16,b.storage=12):T.isVector4?(b.boundary=16,b.storage=16):T.isMatrix3?(b.boundary=48,b.storage=48):T.isMatrix4?(b.boundary=64,b.storage=64):T.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T),b}function _(T){const b=T.target;b.removeEventListener("dispose",_);const R=r.indexOf(b.__bindingPointIndex);r.splice(R,1),e.deleteBuffer(a[b.id]),delete a[b.id],delete o[b.id]}function u(){for(const T in a)e.deleteBuffer(a[T]);r=[],a={},o={}}return{bind:c,update:f,dispose:u}}class n_{constructor(t={}){const{canvas:n=el(),context:i=null,depth:a=!0,stencil:o=!1,alpha:r=!1,antialias:s=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:l=!1,reverseDepthBuffer:h=!1}=t;this.isWebGLRenderer=!0;let p;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=i.getContextAttributes().alpha}else p=r;const S=new Uint32Array(4),x=new Int32Array(4);let _=null,u=null;const T=[],b=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=An,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const R=this;let G=!1;this._outputColorSpace=tl;let N=0,L=0,O=null,v=-1,g=null;const w=new Zt,U=new Zt;let k=null;const W=new Tt(0);let J=0,X=n.width,ie=n.height,Z=1,he=null,we=null;const He=new Zt(0,0,X,ie),$e=new Zt(0,0,X,ie);let ft=!1;const ee=new us;let _e=!1,Ce=!1;const xe=new ti,Be=new ti,et=new Ye,Fe=new Zt,xt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ht=!1;function Qe(){return O===null?Z:1}let B=i;function Ot(A,V){return n.getContext(A,V)}try{const A={alpha:!0,depth:a,stencil:o,antialias:s,premultipliedAlpha:c,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:l};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${nl}`),n.addEventListener("webglcontextlost",oe,!1),n.addEventListener("webglcontextrestored",Q,!1),n.addEventListener("webglcontextcreationerror",me,!1),B===null){const V="webgl2";if(B=Ot(V,A),B===null)throw Ot(V)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(A){throw console.error("THREE.WebGLRenderer: "+A.message),A}let at,tt,Ue,pt,Le,C,E,Y,ae,se,te,Ie,ve,Ae,it,fe,be,Ge,Ve,Re,je,qe,ut,H;function pe(){at=new dh(B),at.init(),qe=new $p(B,at),tt=new ah(B,at,t,qe),Ue=new Yp(B,at),tt.reverseDepthBuffer&&h&&Ue.buffers.depth.setReversed(!0),pt=new _h(B),Le=new Dp,C=new qp(B,at,Ue,Le,tt,qe,pt),E=new sh(R),Y=new uh(R),ae=new Ef(B),ut=new ih(B,ae),se=new hh(B,ae,pt,ut),te=new gh(B,se,ae,pt),Ve=new mh(B,tt,C),fe=new rh(Le),Ie=new Pp(R,E,Y,at,tt,ut,fe),ve=new e_(R,Le),Ae=new Np,it=new kp(at),Ge=new nh(R,E,Y,Ue,te,p,c),be=new Wp(R,te,tt),H=new t_(B,pt,tt,Ue),Re=new oh(B,at,pt),je=new ph(B,at,pt),pt.programs=Ie.programs,R.capabilities=tt,R.extensions=at,R.properties=Le,R.renderLists=Ae,R.shadowMap=be,R.state=Ue,R.info=pt}pe();const $=new Jp(R,B);this.xr=$,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){const A=at.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=at.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return Z},this.setPixelRatio=function(A){A!==void 0&&(Z=A,this.setSize(X,ie,!1))},this.getSize=function(A){return A.set(X,ie)},this.setSize=function(A,V,K=!0){if($.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}X=A,ie=V,n.width=Math.floor(A*Z),n.height=Math.floor(V*Z),K===!0&&(n.style.width=A+"px",n.style.height=V+"px"),this.setViewport(0,0,A,V)},this.getDrawingBufferSize=function(A){return A.set(X*Z,ie*Z).floor()},this.setDrawingBufferSize=function(A,V,K){X=A,ie=V,Z=K,n.width=Math.floor(A*K),n.height=Math.floor(V*K),this.setViewport(0,0,A,V)},this.getCurrentViewport=function(A){return A.copy(w)},this.getViewport=function(A){return A.copy(He)},this.setViewport=function(A,V,K,j){A.isVector4?He.set(A.x,A.y,A.z,A.w):He.set(A,V,K,j),Ue.viewport(w.copy(He).multiplyScalar(Z).round())},this.getScissor=function(A){return A.copy($e)},this.setScissor=function(A,V,K,j){A.isVector4?$e.set(A.x,A.y,A.z,A.w):$e.set(A,V,K,j),Ue.scissor(U.copy($e).multiplyScalar(Z).round())},this.getScissorTest=function(){return ft},this.setScissorTest=function(A){Ue.setScissorTest(ft=A)},this.setOpaqueSort=function(A){he=A},this.setTransparentSort=function(A){we=A},this.getClearColor=function(A){return A.copy(Ge.getClearColor())},this.setClearColor=function(){Ge.setClearColor(...arguments)},this.getClearAlpha=function(){return Ge.getClearAlpha()},this.setClearAlpha=function(){Ge.setClearAlpha(...arguments)},this.clear=function(A=!0,V=!0,K=!0){let j=0;if(A){let z=!1;if(O!==null){const ce=O.texture.format;z=ce===Ts||ce===Es||ce===xs}if(z){const ce=O.texture.type,ge=ce===bn||ce===Ai||ce===no||ce===Mi||ce===ms||ce===gs,de=Ge.getClearColor(),ye=Ge.getClearAlpha(),ze=de.r,ke=de.g,Ne=de.b;ge?(S[0]=ze,S[1]=ke,S[2]=Ne,S[3]=ye,B.clearBufferuiv(B.COLOR,0,S)):(x[0]=ze,x[1]=ke,x[2]=Ne,x[3]=ye,B.clearBufferiv(B.COLOR,0,x))}else j|=B.COLOR_BUFFER_BIT}V&&(j|=B.DEPTH_BUFFER_BIT),K&&(j|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),B.clear(j)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",oe,!1),n.removeEventListener("webglcontextrestored",Q,!1),n.removeEventListener("webglcontextcreationerror",me,!1),Ge.dispose(),Ae.dispose(),it.dispose(),Le.dispose(),E.dispose(),Y.dispose(),te.dispose(),ut.dispose(),H.dispose(),Ie.dispose(),$.dispose(),$.removeEventListener("sessionstart",ri),$.removeEventListener("sessionend",si),en.stop()};function oe(A){A.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),G=!0}function Q(){console.log("THREE.WebGLRenderer: Context Restored."),G=!1;const A=pt.autoReset,V=be.enabled,K=be.autoUpdate,j=be.needsUpdate,z=be.type;pe(),pt.autoReset=A,be.enabled=V,be.autoUpdate=K,be.needsUpdate=j,be.type=z}function me(A){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function Xe(A){const V=A.target;V.removeEventListener("dispose",Xe),_t(V)}function _t(A){Mt(A),Le.remove(A)}function Mt(A){const V=Le.get(A).programs;V!==void 0&&(V.forEach(function(K){Ie.releaseProgram(K)}),A.isShaderMaterial&&Ie.releaseShaderCache(A))}this.renderBufferDirect=function(A,V,K,j,z,ce){V===null&&(V=xt);const ge=z.isMesh&&z.matrixWorld.determinant()<0,de=ho(A,V,K,j,z);Ue.setMaterial(j,ge);let ye=K.index,ze=1;if(j.wireframe===!0){if(ye=se.getWireframeAttribute(K),ye===void 0)return;ze=2}const ke=K.drawRange,Ne=K.attributes.position;let ot=ke.start*ze,st=(ke.start+ke.count)*ze;ce!==null&&(ot=Math.max(ot,ce.start*ze),st=Math.min(st,(ce.start+ce.count)*ze)),ye!==null?(ot=Math.max(ot,0),st=Math.min(st,ye.count)):Ne!=null&&(ot=Math.max(ot,0),st=Math.min(st,Ne.count));const Rt=st-ot;if(Rt<0||Rt===1/0)return;ut.setup(z,j,de,K,ye);let mt,rt=Re;if(ye!==null&&(mt=ae.get(ye),rt=je,rt.setIndex(mt)),z.isMesh)j.wireframe===!0?(Ue.setLineWidth(j.wireframeLinewidth*Qe()),rt.setMode(B.LINES)):rt.setMode(B.TRIANGLES);else if(z.isLine){let Oe=j.linewidth;Oe===void 0&&(Oe=1),Ue.setLineWidth(Oe*Qe()),z.isLineSegments?rt.setMode(B.LINES):z.isLineLoop?rt.setMode(B.LINE_LOOP):rt.setMode(B.LINE_STRIP)}else z.isPoints?rt.setMode(B.POINTS):z.isSprite&&rt.setMode(B.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)Xi("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),rt.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(at.get("WEBGL_multi_draw"))rt.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const Oe=z._multiDrawStarts,yt=z._multiDrawCounts,nt=z._multiDrawCount,Qt=ye?ae.get(ye).bytesPerElement:1,gn=Le.get(j).currentProgram.getUniforms();for(let zt=0;zt<nt;zt++)gn.setValue(B,"_gl_DrawID",zt),rt.render(Oe[zt]/Qt,yt[zt])}else if(z.isInstancedMesh)rt.renderInstances(ot,Rt,z.count);else if(K.isInstancedBufferGeometry){const Oe=K._maxInstanceCount!==void 0?K._maxInstanceCount:1/0,yt=Math.min(K.instanceCount,Oe);rt.renderInstances(ot,Rt,yt)}else rt.render(ot,Rt)};function ct(A,V,K){A.transparent===!0&&A.side===pn&&A.forceSinglePass===!1?(A.side=an,A.needsUpdate=!0,yn(A,V,K),A.side=Ti,A.needsUpdate=!0,yn(A,V,K),A.side=pn):yn(A,V,K)}this.compile=function(A,V,K=null){K===null&&(K=A),u=it.get(K),u.init(V),b.push(u),K.traverseVisible(function(z){z.isLight&&z.layers.test(V.layers)&&(u.pushLight(z),z.castShadow&&u.pushShadow(z))}),A!==K&&A.traverseVisible(function(z){z.isLight&&z.layers.test(V.layers)&&(u.pushLight(z),z.castShadow&&u.pushShadow(z))}),u.setupLights();const j=new Set;return A.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const ce=z.material;if(ce)if(Array.isArray(ce))for(let ge=0;ge<ce.length;ge++){const de=ce[ge];ct(de,K,z),j.add(de)}else ct(ce,K,z),j.add(ce)}),u=b.pop(),j},this.compileAsync=function(A,V,K=null){const j=this.compile(A,V,K);return new Promise(z=>{function ce(){if(j.forEach(function(ge){Le.get(ge).currentProgram.isReady()&&j.delete(ge)}),j.size===0){z(A);return}setTimeout(ce,10)}at.get("KHR_parallel_shader_compile")!==null?ce():setTimeout(ce,10)})};let Bt=null;function Jt(A){Bt&&Bt(A)}function ri(){en.stop()}function si(){en.start()}const en=new Cs;en.setAnimationLoop(Jt),typeof self<"u"&&en.setContext(self),this.setAnimationLoop=function(A){Bt=A,$.setAnimationLoop(A),A===null?en.stop():en.start()},$.addEventListener("sessionstart",ri),$.addEventListener("sessionend",si),this.render=function(A,V){if(V!==void 0&&V.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(G===!0)return;if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),V.parent===null&&V.matrixWorldAutoUpdate===!0&&V.updateMatrixWorld(),$.enabled===!0&&$.isPresenting===!0&&($.cameraAutoUpdate===!0&&$.updateCamera(V),V=$.getCamera()),A.isScene===!0&&A.onBeforeRender(R,A,V,O),u=it.get(A,b.length),u.init(V),b.push(u),Be.multiplyMatrices(V.projectionMatrix,V.matrixWorldInverse),ee.setFromProjectionMatrix(Be),Ce=this.localClippingEnabled,_e=fe.init(this.clippingPlanes,Ce),_=Ae.get(A,T.length),_.init(),T.push(_),$.enabled===!0&&$.isPresenting===!0){const ce=R.xr.getDepthSensingMesh();ce!==null&&li(ce,V,-1/0,R.sortObjects)}li(A,V,0,R.sortObjects),_.finish(),R.sortObjects===!0&&_.sort(he,we),ht=$.enabled===!1||$.isPresenting===!1||$.hasDepthSensing()===!1,ht&&Ge.addToRenderList(_,A),this.info.render.frame++,_e===!0&&fe.beginShadows();const K=u.state.shadowsArray;be.render(K,A,V),_e===!0&&fe.endShadows(),this.info.autoReset===!0&&this.info.reset();const j=_.opaque,z=_.transmissive;if(u.setupLights(),V.isArrayCamera){const ce=V.cameras;if(z.length>0)for(let ge=0,de=ce.length;ge<de;ge++){const ye=ce[ge];fi(j,z,A,ye)}ht&&Ge.render(A);for(let ge=0,de=ce.length;ge<de;ge++){const ye=ce[ge];ci(_,A,ye,ye.viewport)}}else z.length>0&&fi(j,z,A,V),ht&&Ge.render(A),ci(_,A,V);O!==null&&L===0&&(C.updateMultisampleRenderTarget(O),C.updateRenderTargetMipmap(O)),A.isScene===!0&&A.onAfterRender(R,A,V),ut.resetDefaultState(),v=-1,g=null,b.pop(),b.length>0?(u=b[b.length-1],_e===!0&&fe.setGlobalState(R.clippingPlanes,u.state.camera)):u=null,T.pop(),T.length>0?_=T[T.length-1]:_=null};function li(A,V,K,j){if(A.visible===!1)return;if(A.layers.test(V.layers)){if(A.isGroup)K=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(V);else if(A.isLight)u.pushLight(A),A.castShadow&&u.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||ee.intersectsSprite(A)){j&&Fe.setFromMatrixPosition(A.matrixWorld).applyMatrix4(Be);const ge=te.update(A),de=A.material;de.visible&&_.push(A,ge,de,K,Fe.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||ee.intersectsObject(A))){const ge=te.update(A),de=A.material;if(j&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),Fe.copy(A.boundingSphere.center)):(ge.boundingSphere===null&&ge.computeBoundingSphere(),Fe.copy(ge.boundingSphere.center)),Fe.applyMatrix4(A.matrixWorld).applyMatrix4(Be)),Array.isArray(de)){const ye=ge.groups;for(let ze=0,ke=ye.length;ze<ke;ze++){const Ne=ye[ze],ot=de[Ne.materialIndex];ot&&ot.visible&&_.push(A,ge,ot,K,Fe.z,Ne)}}else de.visible&&_.push(A,ge,de,K,Fe.z,null)}}const ce=A.children;for(let ge=0,de=ce.length;ge<de;ge++)li(ce[ge],V,K,j)}function ci(A,V,K,j){const z=A.opaque,ce=A.transmissive,ge=A.transparent;u.setupLightsView(K),_e===!0&&fe.setGlobalState(R.clippingPlanes,K),j&&Ue.viewport(w.copy(j)),z.length>0&&On(z,V,K),ce.length>0&&On(ce,V,K),ge.length>0&&On(ge,V,K),Ue.buffers.depth.setTest(!0),Ue.buffers.depth.setMask(!0),Ue.buffers.color.setMask(!0),Ue.setPolygonOffset(!1)}function fi(A,V,K,j){if((K.isScene===!0?K.overrideMaterial:null)!==null)return;u.state.transmissionRenderTarget[j.id]===void 0&&(u.state.transmissionRenderTarget[j.id]=new on(1,1,{generateMipmaps:!0,type:at.has("EXT_color_buffer_half_float")||at.has("EXT_color_buffer_float")?lo:bn,minFilter:gi,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Lt.workingColorSpace}));const ce=u.state.transmissionRenderTarget[j.id],ge=j.viewport||w;ce.setSize(ge.z*R.transmissionResolutionScale,ge.w*R.transmissionResolutionScale);const de=R.getRenderTarget();R.setRenderTarget(ce),R.getClearColor(W),J=R.getClearAlpha(),J<1&&R.setClearColor(16777215,.5),R.clear(),ht&&Ge.render(K);const ye=R.toneMapping;R.toneMapping=An;const ze=j.viewport;if(j.viewport!==void 0&&(j.viewport=void 0),u.setupLightsView(j),_e===!0&&fe.setGlobalState(R.clippingPlanes,j),On(A,K,j),C.updateMultisampleRenderTarget(ce),C.updateRenderTargetMipmap(ce),at.has("WEBGL_multisampled_render_to_texture")===!1){let ke=!1;for(let Ne=0,ot=V.length;Ne<ot;Ne++){const st=V[Ne],Rt=st.object,mt=st.geometry,rt=st.material,Oe=st.group;if(rt.side===pn&&Rt.layers.test(j.layers)){const yt=rt.side;rt.side=an,rt.needsUpdate=!0,Ci(Rt,K,j,mt,rt,Oe),rt.side=yt,rt.needsUpdate=!0,ke=!0}}ke===!0&&(C.updateMultisampleRenderTarget(ce),C.updateRenderTargetMipmap(ce))}R.setRenderTarget(de),R.setClearColor(W,J),ze!==void 0&&(j.viewport=ze),R.toneMapping=ye}function On(A,V,K){const j=V.isScene===!0?V.overrideMaterial:null;for(let z=0,ce=A.length;z<ce;z++){const ge=A[z],de=ge.object,ye=ge.geometry,ze=ge.group;let ke=ge.material;ke.allowOverride===!0&&j!==null&&(ke=j),de.layers.test(K.layers)&&Ci(de,V,K,ye,ke,ze)}}function Ci(A,V,K,j,z,ce){A.onBeforeRender(R,V,K,j,z,ce),A.modelViewMatrix.multiplyMatrices(K.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),z.onBeforeRender(R,V,K,j,A,ce),z.transparent===!0&&z.side===pn&&z.forceSinglePass===!1?(z.side=an,z.needsUpdate=!0,R.renderBufferDirect(K,V,j,z,A,ce),z.side=Ti,z.needsUpdate=!0,R.renderBufferDirect(K,V,j,z,A,ce),z.side=pn):R.renderBufferDirect(K,V,j,z,A,ce),A.onAfterRender(R,V,K,j,z,ce)}function yn(A,V,K){V.isScene!==!0&&(V=xt);const j=Le.get(A),z=u.state.lights,ce=u.state.shadowsArray,ge=z.state.version,de=Ie.getParameters(A,z.state,ce,V,K),ye=Ie.getProgramCacheKey(de);let ze=j.programs;j.environment=A.isMeshStandardMaterial?V.environment:null,j.fog=V.fog,j.envMap=(A.isMeshStandardMaterial?Y:E).get(A.envMap||j.environment),j.envMapRotation=j.environment!==null&&A.envMap===null?V.environmentRotation:A.envMapRotation,ze===void 0&&(A.addEventListener("dispose",Xe),ze=new Map,j.programs=ze);let ke=ze.get(ye);if(ke!==void 0){if(j.currentProgram===ke&&j.lightsStateVersion===ge)return Bn(A,de),ke}else de.uniforms=Ie.getUniforms(A),A.onBeforeCompile(de,R),ke=Ie.acquireProgram(de,ye),ze.set(ye,ke),j.uniforms=de.uniforms;const Ne=j.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Ne.clippingPlanes=fe.uniform),Bn(A,de),j.needsLights=cn(A),j.lightsStateVersion=ge,j.needsLights&&(Ne.ambientLightColor.value=z.state.ambient,Ne.lightProbe.value=z.state.probe,Ne.directionalLights.value=z.state.directional,Ne.directionalLightShadows.value=z.state.directionalShadow,Ne.spotLights.value=z.state.spot,Ne.spotLightShadows.value=z.state.spotShadow,Ne.rectAreaLights.value=z.state.rectArea,Ne.ltc_1.value=z.state.rectAreaLTC1,Ne.ltc_2.value=z.state.rectAreaLTC2,Ne.pointLights.value=z.state.point,Ne.pointLightShadows.value=z.state.pointShadow,Ne.hemisphereLights.value=z.state.hemi,Ne.directionalShadowMap.value=z.state.directionalShadowMap,Ne.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Ne.spotShadowMap.value=z.state.spotShadowMap,Ne.spotLightMatrix.value=z.state.spotLightMatrix,Ne.spotLightMap.value=z.state.spotLightMap,Ne.pointShadowMap.value=z.state.pointShadowMap,Ne.pointShadowMatrix.value=z.state.pointShadowMatrix),j.currentProgram=ke,j.uniformsList=null,ke}function ui(A){if(A.uniformsList===null){const V=A.currentProgram.getUniforms();A.uniformsList=Ki.seqWithValue(V.seq,A.uniforms)}return A.uniformsList}function Bn(A,V){const K=Le.get(A);K.outputColorSpace=V.outputColorSpace,K.batching=V.batching,K.batchingColor=V.batchingColor,K.instancing=V.instancing,K.instancingColor=V.instancingColor,K.instancingMorph=V.instancingMorph,K.skinning=V.skinning,K.morphTargets=V.morphTargets,K.morphNormals=V.morphNormals,K.morphColors=V.morphColors,K.morphTargetsCount=V.morphTargetsCount,K.numClippingPlanes=V.numClippingPlanes,K.numIntersection=V.numClipIntersection,K.vertexAlphas=V.vertexAlphas,K.vertexTangents=V.vertexTangents,K.toneMapping=V.toneMapping}function ho(A,V,K,j,z){V.isScene!==!0&&(V=xt),C.resetTextureUnits();const ce=V.fog,ge=j.isMeshStandardMaterial?V.environment:null,de=O===null?R.outputColorSpace:O.isXRRenderTarget===!0?O.texture.colorSpace:co,ye=(j.isMeshStandardMaterial?Y:E).get(j.envMap||ge),ze=j.vertexColors===!0&&!!K.attributes.color&&K.attributes.color.itemSize===4,ke=!!K.attributes.tangent&&(!!j.normalMap||j.anisotropy>0),Ne=!!K.morphAttributes.position,ot=!!K.morphAttributes.normal,st=!!K.morphAttributes.color;let Rt=An;j.toneMapped&&(O===null||O.isXRRenderTarget===!0)&&(Rt=R.toneMapping);const mt=K.morphAttributes.position||K.morphAttributes.normal||K.morphAttributes.color,rt=mt!==void 0?mt.length:0,Oe=Le.get(j),yt=u.state.lights;if(_e===!0&&(Ce===!0||A!==g)){const Ht=A===g&&j.id===v;fe.setState(j,A,Ht)}let nt=!1;j.version===Oe.__version?(Oe.needsLights&&Oe.lightsStateVersion!==yt.state.version||Oe.outputColorSpace!==de||z.isBatchedMesh&&Oe.batching===!1||!z.isBatchedMesh&&Oe.batching===!0||z.isBatchedMesh&&Oe.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&Oe.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&Oe.instancing===!1||!z.isInstancedMesh&&Oe.instancing===!0||z.isSkinnedMesh&&Oe.skinning===!1||!z.isSkinnedMesh&&Oe.skinning===!0||z.isInstancedMesh&&Oe.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Oe.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&Oe.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&Oe.instancingMorph===!1&&z.morphTexture!==null||Oe.envMap!==ye||j.fog===!0&&Oe.fog!==ce||Oe.numClippingPlanes!==void 0&&(Oe.numClippingPlanes!==fe.numPlanes||Oe.numIntersection!==fe.numIntersection)||Oe.vertexAlphas!==ze||Oe.vertexTangents!==ke||Oe.morphTargets!==Ne||Oe.morphNormals!==ot||Oe.morphColors!==st||Oe.toneMapping!==Rt||Oe.morphTargetsCount!==rt)&&(nt=!0):(nt=!0,Oe.__version=j.version);let Qt=Oe.currentProgram;nt===!0&&(Qt=yn(j,V,z));let gn=!1,zt=!1,wn=!1;const gt=Qt.getUniforms(),Xt=Oe.uniforms;if(Ue.useProgram(Qt.program)&&(gn=!0,zt=!0,wn=!0),j.id!==v&&(v=j.id,zt=!0),gn||g!==A){Ue.buffers.depth.getReversed()?(xe.copy(A.projectionMatrix),il(xe),ol(xe),gt.setValue(B,"projectionMatrix",xe)):gt.setValue(B,"projectionMatrix",A.projectionMatrix),gt.setValue(B,"viewMatrix",A.matrixWorldInverse);const kt=gt.map.cameraPosition;kt!==void 0&&kt.setValue(B,et.setFromMatrixPosition(A.matrixWorld)),tt.logarithmicDepthBuffer&&gt.setValue(B,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(j.isMeshPhongMaterial||j.isMeshToonMaterial||j.isMeshLambertMaterial||j.isMeshBasicMaterial||j.isMeshStandardMaterial||j.isShaderMaterial)&&gt.setValue(B,"isOrthographic",A.isOrthographicCamera===!0),g!==A&&(g=A,zt=!0,wn=!0)}if(z.isSkinnedMesh){gt.setOptional(B,z,"bindMatrix"),gt.setOptional(B,z,"bindMatrixInverse");const Ht=z.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),gt.setValue(B,"boneTexture",Ht.boneTexture,C))}z.isBatchedMesh&&(gt.setOptional(B,z,"batchingTexture"),gt.setValue(B,"batchingTexture",z._matricesTexture,C),gt.setOptional(B,z,"batchingIdTexture"),gt.setValue(B,"batchingIdTexture",z._indirectTexture,C),gt.setOptional(B,z,"batchingColorTexture"),z._colorsTexture!==null&&gt.setValue(B,"batchingColorTexture",z._colorsTexture,C));const Gt=K.morphAttributes;if((Gt.position!==void 0||Gt.normal!==void 0||Gt.color!==void 0)&&Ve.update(z,K,Qt),(zt||Oe.receiveShadow!==z.receiveShadow)&&(Oe.receiveShadow=z.receiveShadow,gt.setValue(B,"receiveShadow",z.receiveShadow)),j.isMeshGouraudMaterial&&j.envMap!==null&&(Xt.envMap.value=ye,Xt.flipEnvMap.value=ye.isCubeTexture&&ye.isRenderTargetTexture===!1?-1:1),j.isMeshStandardMaterial&&j.envMap===null&&V.environment!==null&&(Xt.envMapIntensity.value=V.environmentIntensity),zt&&(gt.setValue(B,"toneMappingExposure",R.toneMappingExposure),Oe.needsLights&&di(Xt,wn),ce&&j.fog===!0&&ve.refreshFogUniforms(Xt,ce),ve.refreshMaterialUniforms(Xt,j,Z,ie,u.state.transmissionRenderTarget[A.id]),Ki.upload(B,ui(Oe),Xt,C)),j.isShaderMaterial&&j.uniformsNeedUpdate===!0&&(Ki.upload(B,ui(Oe),Xt,C),j.uniformsNeedUpdate=!1),j.isSpriteMaterial&&gt.setValue(B,"center",z.center),gt.setValue(B,"modelViewMatrix",z.modelViewMatrix),gt.setValue(B,"normalMatrix",z.normalMatrix),gt.setValue(B,"modelMatrix",z.matrixWorld),j.isShaderMaterial||j.isRawShaderMaterial){const Ht=j.uniformsGroups;for(let kt=0,Gn=Ht.length;kt<Gn;kt++){const sn=Ht[kt];H.update(sn,Qt),H.bind(sn,Qt)}}return Qt}function di(A,V){A.ambientLightColor.needsUpdate=V,A.lightProbe.needsUpdate=V,A.directionalLights.needsUpdate=V,A.directionalLightShadows.needsUpdate=V,A.pointLights.needsUpdate=V,A.pointLightShadows.needsUpdate=V,A.spotLights.needsUpdate=V,A.spotLightShadows.needsUpdate=V,A.rectAreaLights.needsUpdate=V,A.hemisphereLights.needsUpdate=V}function cn(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return N},this.getActiveMipmapLevel=function(){return L},this.getRenderTarget=function(){return O},this.setRenderTargetTextures=function(A,V,K){const j=Le.get(A);j.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,j.__autoAllocateDepthBuffer===!1&&(j.__useRenderToTexture=!1),Le.get(A.texture).__webglTexture=V,Le.get(A.depthTexture).__webglTexture=j.__autoAllocateDepthBuffer?void 0:K,j.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,V){const K=Le.get(A);K.__webglFramebuffer=V,K.__useDefaultFramebuffer=V===void 0};const po=B.createFramebuffer();this.setRenderTarget=function(A,V=0,K=0){O=A,N=V,L=K;let j=!0,z=null,ce=!1,ge=!1;if(A){const ye=Le.get(A);if(ye.__useDefaultFramebuffer!==void 0)Ue.bindFramebuffer(B.FRAMEBUFFER,null),j=!1;else if(ye.__webglFramebuffer===void 0)C.setupRenderTarget(A);else if(ye.__hasExternalTextures)C.rebindTextures(A,Le.get(A.texture).__webglTexture,Le.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const Ne=A.depthTexture;if(ye.__boundDepthTexture!==Ne){if(Ne!==null&&Le.has(Ne)&&(A.width!==Ne.image.width||A.height!==Ne.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");C.setupDepthRenderbuffer(A)}}const ze=A.texture;(ze.isData3DTexture||ze.isDataArrayTexture||ze.isCompressedArrayTexture)&&(ge=!0);const ke=Le.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(ke[V])?z=ke[V][K]:z=ke[V],ce=!0):A.samples>0&&C.useMultisampledRTT(A)===!1?z=Le.get(A).__webglMultisampledFramebuffer:Array.isArray(ke)?z=ke[K]:z=ke,w.copy(A.viewport),U.copy(A.scissor),k=A.scissorTest}else w.copy(He).multiplyScalar(Z).floor(),U.copy($e).multiplyScalar(Z).floor(),k=ft;if(K!==0&&(z=po),Ue.bindFramebuffer(B.FRAMEBUFFER,z)&&j&&Ue.drawBuffers(A,z),Ue.viewport(w),Ue.scissor(U),Ue.setScissorTest(k),ce){const ye=Le.get(A.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+V,ye.__webglTexture,K)}else if(ge){const ye=Le.get(A.texture),ze=V;B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,ye.__webglTexture,K,ze)}else if(A!==null&&K!==0){const ye=Le.get(A.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,ye.__webglTexture,K)}v=-1},this.readRenderTargetPixels=function(A,V,K,j,z,ce,ge){if(!(A&&A.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let de=Le.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&ge!==void 0&&(de=de[ge]),de){Ue.bindFramebuffer(B.FRAMEBUFFER,de);try{const ye=A.texture,ze=ye.format,ke=ye.type;if(!tt.textureFormatReadable(ze)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!tt.textureTypeReadable(ke)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}V>=0&&V<=A.width-j&&K>=0&&K<=A.height-z&&B.readPixels(V,K,j,z,qe.convert(ze),qe.convert(ke),ce)}finally{const ye=O!==null?Le.get(O).__webglFramebuffer:null;Ue.bindFramebuffer(B.FRAMEBUFFER,ye)}}},this.readRenderTargetPixelsAsync=async function(A,V,K,j,z,ce,ge){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let de=Le.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&ge!==void 0&&(de=de[ge]),de)if(V>=0&&V<=A.width-j&&K>=0&&K<=A.height-z){Ue.bindFramebuffer(B.FRAMEBUFFER,de);const ye=A.texture,ze=ye.format,ke=ye.type;if(!tt.textureFormatReadable(ze))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!tt.textureTypeReadable(ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ne=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,Ne),B.bufferData(B.PIXEL_PACK_BUFFER,ce.byteLength,B.STREAM_READ),B.readPixels(V,K,j,z,qe.convert(ze),qe.convert(ke),0);const ot=O!==null?Le.get(O).__webglFramebuffer:null;Ue.bindFramebuffer(B.FRAMEBUFFER,ot);const st=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await al(B,st,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,Ne),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,ce),B.deleteBuffer(Ne),B.deleteSync(st),ce}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,V=null,K=0){const j=Math.pow(2,-K),z=Math.floor(A.image.width*j),ce=Math.floor(A.image.height*j),ge=V!==null?V.x:0,de=V!==null?V.y:0;C.setTexture2D(A,0),B.copyTexSubImage2D(B.TEXTURE_2D,K,0,0,ge,de,z,ce),Ue.unbindTexture()};const _o=B.createFramebuffer(),mo=B.createFramebuffer();this.copyTextureToTexture=function(A,V,K=null,j=null,z=0,ce=null){ce===null&&(z!==0?(Xi("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ce=z,z=0):ce=0);let ge,de,ye,ze,ke,Ne,ot,st,Rt;const mt=A.isCompressedTexture?A.mipmaps[ce]:A.image;if(K!==null)ge=K.max.x-K.min.x,de=K.max.y-K.min.y,ye=K.isBox3?K.max.z-K.min.z:1,ze=K.min.x,ke=K.min.y,Ne=K.isBox3?K.min.z:0;else{const Gt=Math.pow(2,-z);ge=Math.floor(mt.width*Gt),de=Math.floor(mt.height*Gt),A.isDataArrayTexture?ye=mt.depth:A.isData3DTexture?ye=Math.floor(mt.depth*Gt):ye=1,ze=0,ke=0,Ne=0}j!==null?(ot=j.x,st=j.y,Rt=j.z):(ot=0,st=0,Rt=0);const rt=qe.convert(V.format),Oe=qe.convert(V.type);let yt;V.isData3DTexture?(C.setTexture3D(V,0),yt=B.TEXTURE_3D):V.isDataArrayTexture||V.isCompressedArrayTexture?(C.setTexture2DArray(V,0),yt=B.TEXTURE_2D_ARRAY):(C.setTexture2D(V,0),yt=B.TEXTURE_2D),B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,V.flipY),B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,V.premultiplyAlpha),B.pixelStorei(B.UNPACK_ALIGNMENT,V.unpackAlignment);const nt=B.getParameter(B.UNPACK_ROW_LENGTH),Qt=B.getParameter(B.UNPACK_IMAGE_HEIGHT),gn=B.getParameter(B.UNPACK_SKIP_PIXELS),zt=B.getParameter(B.UNPACK_SKIP_ROWS),wn=B.getParameter(B.UNPACK_SKIP_IMAGES);B.pixelStorei(B.UNPACK_ROW_LENGTH,mt.width),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,mt.height),B.pixelStorei(B.UNPACK_SKIP_PIXELS,ze),B.pixelStorei(B.UNPACK_SKIP_ROWS,ke),B.pixelStorei(B.UNPACK_SKIP_IMAGES,Ne);const gt=A.isDataArrayTexture||A.isData3DTexture,Xt=V.isDataArrayTexture||V.isData3DTexture;if(A.isDepthTexture){const Gt=Le.get(A),Ht=Le.get(V),kt=Le.get(Gt.__renderTarget),Gn=Le.get(Ht.__renderTarget);Ue.bindFramebuffer(B.READ_FRAMEBUFFER,kt.__webglFramebuffer),Ue.bindFramebuffer(B.DRAW_FRAMEBUFFER,Gn.__webglFramebuffer);for(let sn=0;sn<ye;sn++)gt&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Le.get(A).__webglTexture,z,Ne+sn),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Le.get(V).__webglTexture,ce,Rt+sn)),B.blitFramebuffer(ze,ke,ge,de,ot,st,ge,de,B.DEPTH_BUFFER_BIT,B.NEAREST);Ue.bindFramebuffer(B.READ_FRAMEBUFFER,null),Ue.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(z!==0||A.isRenderTargetTexture||Le.has(A)){const Gt=Le.get(A),Ht=Le.get(V);Ue.bindFramebuffer(B.READ_FRAMEBUFFER,_o),Ue.bindFramebuffer(B.DRAW_FRAMEBUFFER,mo);for(let kt=0;kt<ye;kt++)gt?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Gt.__webglTexture,z,Ne+kt):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Gt.__webglTexture,z),Xt?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,Ht.__webglTexture,ce,Rt+kt):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,Ht.__webglTexture,ce),z!==0?B.blitFramebuffer(ze,ke,ge,de,ot,st,ge,de,B.COLOR_BUFFER_BIT,B.NEAREST):Xt?B.copyTexSubImage3D(yt,ce,ot,st,Rt+kt,ze,ke,ge,de):B.copyTexSubImage2D(yt,ce,ot,st,ze,ke,ge,de);Ue.bindFramebuffer(B.READ_FRAMEBUFFER,null),Ue.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else Xt?A.isDataTexture||A.isData3DTexture?B.texSubImage3D(yt,ce,ot,st,Rt,ge,de,ye,rt,Oe,mt.data):V.isCompressedArrayTexture?B.compressedTexSubImage3D(yt,ce,ot,st,Rt,ge,de,ye,rt,mt.data):B.texSubImage3D(yt,ce,ot,st,Rt,ge,de,ye,rt,Oe,mt):A.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,ce,ot,st,ge,de,rt,Oe,mt.data):A.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,ce,ot,st,mt.width,mt.height,rt,mt.data):B.texSubImage2D(B.TEXTURE_2D,ce,ot,st,ge,de,rt,Oe,mt);B.pixelStorei(B.UNPACK_ROW_LENGTH,nt),B.pixelStorei(B.UNPACK_IMAGE_HEIGHT,Qt),B.pixelStorei(B.UNPACK_SKIP_PIXELS,gn),B.pixelStorei(B.UNPACK_SKIP_ROWS,zt),B.pixelStorei(B.UNPACK_SKIP_IMAGES,wn),ce===0&&V.generateMipmaps&&B.generateMipmap(yt),Ue.unbindTexture()},this.copyTextureToTexture3D=function(A,V,K=null,j=null,z=0){return Xi('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(A,V,K,j,z)},this.initRenderTarget=function(A){Le.get(A).__webglFramebuffer===void 0&&C.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?C.setTextureCube(A,0):A.isData3DTexture?C.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?C.setTexture2DArray(A,0):C.setTexture2D(A,0),Ue.unbindTexture()},this.resetState=function(){N=0,L=0,O=null,Ue.reset(),ut.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return rl}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const n=this.getContext();n.drawingBufferColorSpace=Lt._getDrawingBufferColorSpace(t),n.unpackColorSpace=Lt._getUnpackColorSpace()}}const Ft=0,Ct=1,Dt=2,$t=3,_i=180,Fn=12,i_=.02,qt=.6,qn=.4,$n=.2,o_=1.4,a_=.8,r_=1,Us=.8,oa=.9,Ns={[Ct]:o_,[Dt]:a_,[$t]:r_,[Ft]:oa},s_=.08,l_=Fn*Fn,c_=.5,f_=2.2,u_=Fn*2.2,Fs=2048,ji=.25,d_=.94,h_=.45,p_=1.6,__=1,xi=!(typeof location<"u"&&new URLSearchParams(location.search).get("signal")==="dark"),m_=240/255,g_=400/255,v_=.2,S_=.75,x_=0,E_={[Ct]:[.839,1,.49],[Dt]:[1,.984,.471],[$t]:[1,.529,.345]},T_=.35,M_="imgs/signal_cmyk_lut.png";let oo=typeof location<"u"&&new URLSearchParams(location.search).get("curve")==="cmyk"?"cmyk":"rgb";function Hg(e){return oo=e==="cmyk"?"cmyk":"rgb",oo}const kg=()=>oo,Zi=[[0,0],[21,255],[112,109],[209,191],[255,255]];function A_(e){const t=e.length,n=e.map(s=>s[0]),i=e.map(s=>s[1]),a=n.slice(1).map((s,c)=>s-n[c]),o=new Array(t).fill(0);if(t>2){const s=[],c=[],f=[],m=[];for(let l=1;l<t-1;l++)s.push(a[l-1]),c.push(2*(a[l-1]+a[l])),f.push(a[l]),m.push(6*((i[l+1]-i[l])/a[l]-(i[l]-i[l-1])/a[l-1]));for(let l=1;l<c.length;l++){const h=s[l]/c[l-1];c[l]-=h*f[l-1],m[l]-=h*m[l-1]}for(let l=c.length-1;l>=0;l--)o[l+1]=(m[l]-(l+1<c.length?f[l]*o[l+2]:0))/c[l]}const r=[];for(let s=0;s<256;s++){let c;if(s<=n[0])c=i[0];else if(s>=n[t-1])c=i[t-1];else{let f=0;for(;s>=n[f+1];)f++;const m=s-n[f],l=a[f];c=i[f]+((i[f+1]-i[f])/l-l*(2*o[f]+o[f+1])/6)*m+o[f]/2*m*m+(o[f+1]-o[f])/(6*l)*m*m*m}r.push(Math.min(255,Math.max(0,Math.floor(c+.5))))}return r}const b_=.55,R_=2.2,y_=10.85,w_=0,C_=1.2,L_=1.5,I_=1.25,zr=.99,P_=.01,D_=1.05,Gi=.16,Wr=3;function U_(e,t){const n=Math.sqrt(e*e+t*t);if(n<1e-6)return[0,0];const i=Math.min(1,n/I_),a=zr+(P_-zr)*i,r=Math.pow(n,a)*D_/n;return[e*r,t*r]}function Xr(e,t){const i=.12*Math.pow(2*(e<.12?e:1-e),t);return e<.12?i:1-i}const N_=.12,F_=3,O_=1,B_=2,G_=1,H_=3,k_=1,V_=2,z_=4,W_=2,X_=5,Y_=3,Yr=2,q_=3,ao=5e3,aa=1200,$_=3e3,Os=ao+aa+$_,K_=400,j_=1200,Z_=1e3,J_=3e4,Q_=7,em=0,tm=1,Bs=2,nm=.04,im=.04,om=.08,ro=[1,1],am=.95,rm=.2,qr=[.45,1],$r=[.9,.5],Kr=[0,.95],sm=1,Ei={[Ct]:[..."$%#&+÷-"],[Dt]:[..."8965023471"],[$t]:[..."WBRNSCXLI"],[Ft]:[..."?!:·"]},Gs=Math.max(...Object.values(Ei).map(e=>e.length)),Ji=[300,400,500,600,700],Hs="Zalando Sans Expanded",lm="fonts/ZalandoSansExpanded-VariableFont_wght.ttf",jr=`'${Hs}', sans-serif`,Zr=1.1,cm=1.4,xn={px:.2,tile:256,img:"imgs/grunge.jpg",imgScale:.5,gOffset:[.37,.61],colorPx:.3},fm=.3,um=.7,dm=64,jt=48;function hm(e,t,n){let i=Ft;return e==="vertical"?(n<qt&&t>=$n&&t<$n+qt&&(i=Ct),t>=qt&&(i=Dt)):e==="horizontal"?(n>=$n&&n<$n+qt&&t<qt&&(i=Ct),n>=qt&&(i=Dt)):e==="per75"?(n<qt&&t<qt&&(i=Ct),i!==Ct&&(i=Dt)):e==="right_click"?(n<qt&&t<qt&&(i=Ct),n>=qt&&(i=$t),n<qt&&t>=qt&&(i=Dt)):e==="hamburger"?(n<qn&&t>=$n&&t<$n+qt&&(i=Ct),n>=qn&&n<1-qn&&(i=Dt),n>=1-qn&&(i=$t)):e==="bed"&&(n<qn&&t<qt&&(i=Ct),n>=1-qn&&(i=$t),i===Ft&&(i=Dt)),i}function pm(e,t){if(e===Ft)return[255,255,255];const n=t?.pos??[.5,.5,.5];let i,a,o;return t?.type==="jung"?(i=Math.round((n[0]-250)/650*200+30),a=Math.round((n[1]-580)/2020*200+30),o=Math.round((n[2]-2080)/1120*200+30)):(i=Math.round(n[0]*200+30),a=Math.round(n[1]*200+30),o=Math.round(n[2]*200+30)),e===Ct&&(a=Math.min(255,Math.round(a*1.7))),e===Dt&&(i=Math.min(255,Math.round(i*1.7)),a=Math.min(255,Math.round(a*1.7))),e===$t&&(i=Math.min(255,Math.round(i*1.7))),[i,a,o]}const Jr=[[255,49,30],[25,248,0],[255,242,0]],_m=[$t,Ct,Dt];function mm(e,t){if(e.isSignal)return e.signalColor;const n=gm(e),[i,a,o]=pm(e.state,n),r=Math.min(e.brightness,2.5),s=e.flash;if(s===0)return[Math.min(255,Math.round(i*r)),Math.min(255,Math.round(a*r)),Math.min(255,Math.round(o*r))];if(s===1){const m=.5+.5*Math.sin(t*2);return[Math.min(255,Math.round(255+(i*r-255)*m)),Math.min(255,Math.round(255+(a*r-255)*m)),Math.min(255,Math.round(255+(o*r-255)*m))]}const c=1+3*(.5+.5*Math.sin(t*.3)),f=.5+.5*Math.sin(t*c);return[Math.min(255,Math.round(255+(i*r-255)*f)),Math.min(255,Math.round(255+(a*r-255)*f)),Math.min(255,Math.round(255+(o*r-255)*f))]}function gm(e){const t=e.sylMeta;return t?e.state===Ct?t.choEntry:e.state===Dt?t.jungEntry:e.state===$t?t.jongEntry??t.choEntry:null:null}function vm(e,t,n,i){const a=Math.max(1,Math.round(e/n)),o=Math.max(1,Math.round(t/n)),r=e/a,s=t/o,c=[];for(let f=0;f<o;f++)for(let m=0;m<a;m++){const l=(m+.5)*r,h=(f+.5)*s,p=(Math.random()-.5)*i*r,S=(Math.random()-.5)*i*s;c.push([l+p,h+S])}return c}function Sm(){return{syllables:[],points:[],delaunay:null,cols:0,_glTex:null,_needsUpload:!0,_sylPhaseStart:new Float32Array(jt),_sylCount:0}}function ra(e){let t=0;for(const n of e.syllables)t=Math.max(t,n.x+n.w);return t}function xm(e){let t=0;for(const n of e.syllables)n.h>t&&(t=n.h);return t}function Qr(e,t,n,i,a,o,r,s){o=o??a,r=r??a;const c=i[t.jung],f=i[t.cho]?.cho??i[t.cho],m=t.jong?i[t.jong+"_jong"]??i[t.jong]:null,l=Rc(t.jung,t.jong),h={choEntry:f,jungEntry:c,jongEntry:m,type:l,cho:t.cho,jung:t.jung,jong:t.jong,w:o,h:r};h.cyclePhaseStart=performance.now()+n*K_;const p=s??ra(e);h.x=p,e.syllables.push(h);const S=vm(o,r,Fn,i_),x=[];for(const[b,R]of S){const G=b+p,N=R;let L=!0;for(const O of e.points){const v=O.localX-G,g=O.localY-N;if(v*v+g*g<Fn*Fn){L=!1;break}}L&&x.push([G,N])}const _=q_-Yr+1,u=Math.min(Yr+Math.floor(Math.random()*_),x.length),T=new Set;for(;T.size<u;)T.add(Math.floor(Math.random()*x.length));x.forEach(([b,R],G)=>{const N=(b-p)/o,L=R/r,O=hm(l,N,L),v=O===Ft,g=T.has(G);let w=O,U=null;if(g){const ee=Math.floor(Math.random()*Jr.length);U=Jr[ee],w=_m[ee]}const k=g?Us:Ns[w]??oa,W=N*2-1,J=L*2-1,X=Math.max(0,(Math.abs(W)-Gi)/(1-Gi)),ie=Math.max(0,(Math.abs(J)-Gi)/(1-Gi)),Z=1-Xr(Math.min(1,X),Wr),he=1-Xr(Math.min(1,ie),Wr),[we,He]=U_(W,J),$e=p+(we+1)/2*o,ft=(He+1)/2*r;e.points.push({localX:$e,localY:ft,cellCx:Z,cellCy:he,sylIndex:n,sylMeta:h,state:w,originalState:O,isBackground:v,blankStreak:0,changedThisStep:!1,isSignal:g,signalColor:U,brightness:1,flash:0,flashTimer:0,currentScale:k,targetScale:k,neighbors:null})})}function es(e,t){const n=e.points;if(n.length===0){e.delaunay=null;return}const i=ra(e),a=na.from(n,o=>o.localX,o=>o.localY);e.delaunay=a,e.cols=i;for(let o=0;o<n.length;o++)n[o].neighbors=Array.from(a.neighbors(o));e._needsUpload=!0}const Oo=.5;function Em(e,t,n,i,a){let o=e.get(t);const r=n.length;let s=null;if(o){let f=0;const m=Math.min(o.syllables.length,r);for(;f<m;f++){const l=o.syllables[f],h=n[f].syl;if(l.cho!==h.cho||l.jung!==h.jung||l.jong!==h.jong)break}s=o.syllables.slice(0,f).map(l=>l.cyclePhaseStart);for(let l=0;l<f;l++){const h=o.syllables[l],p=n[l];if(Math.abs(h.w-p.w)>Oo||Math.abs(h.h-p.h)>Oo||Math.abs(h.x-p.x)>Oo){f=-1;break}}if(f===o.syllables.length){if(r>f){for(let l=f;l<r;l++)Qr(o,n[l].syl,l,i,a,n[l].w,n[l].h,n[l].x);es(o)}return o}}const c=o?._glTex??null;o=Sm(),o._glTex=c;for(let f=0;f<r;f++)Qr(o,n[f].syl,f,i,a,n[f].w,n[f].h,n[f].x),s?.[f]!==void 0&&(o.syllables[f].cyclePhaseStart=s[f]);return es(o),e.set(t,o),o}function mi(e,t,n){return n.some(i=>i==="E"?t.localX>e.localX:i==="W"?t.localX<e.localX:i==="S"?t.localY>e.localY:i==="N"?t.localY<e.localY:!1)}function Tm(e,t){const i=Math.max(0,e-t)%Os;return i<ao?em:i<ao+aa?tm:Bs}function Hi(e,t){return!!e&&Tm(t,e.cyclePhaseStart)===Bs}function Mm(e,t){const n=e.points,i=n.length;if(i===0)return;const a=new Array(i);for(let o=0;o<i;o++){const r=n[o];if(a[o]=r.state,r.changedThisStep=!1,Hi(r.sylMeta,t))continue;const s=r.neighbors??[],c=r.state;if(c!==Ft&&s.some(m=>n[m].state===Ft)&&(r.brightness=Math.min(r.brightness*1.1,2.5)),!r.isSignal){if(c===Ct){let f=0,m=0;for(const l of s){const h=n[l];h.state===Dt&&(f++,mi(r,h,["E","S"])&&m++)}(f>=F_||m>=O_)&&(a[o]=Dt,r.changedThisStep=!0)}else if(c===Dt){const f=!!r.sylMeta?.jongEntry;let m=0,l=0;if(f)for(const h of s){const p=n[h];p.state===$t&&(m++,mi(r,p,["S"])&&l++)}if(f&&(m>=B_||l>=G_))a[o]=$t,r.changedThisStep=!0;else{let h=!1;for(const p of s){const S=n[p];if((S.state===Ct||S.state===Ft)&&mi(r,S,["E"])){h=!0;break}}h&&(a[o]=Ct,r.changedThisStep=!0)}}else if(c===$t){let f=0,m=0;for(const l of s){const h=n[l];h.state===Ct&&(f++,mi(r,h,["E","N"])&&m++)}(f>=H_||m>=k_)&&(a[o]=Ct,r.changedThisStep=!0)}else if(c===Ft&&!r.isBackground){const f=s.reduce((m,l)=>m+(n[l].state===Ft?1:0),0);r.blankStreak=f>=Y_?r.blankStreak+1:0,r.blankStreak>=X_&&(a[o]=r.originalState,r.changedThisStep=!0,r.blankStreak=0)}}}for(let o=0;o<i;o++){const r=n[o];if(r.isSignal||r.isBackground||Hi(r.sylMeta,t))continue;const s=r.neighbors??[],c=r.state;if(s.reduce((S,x)=>S+(n[x].state===Ft?1:0),0)<(c===Ft?V_:z_))continue;const l=[],h=[];for(const S of s)n[S].isSignal||Hi(n[S].sylMeta,t)||(mi(r,n[S],["W","N"])?l.push(S):h.push(S));const p=l.concat(h).slice(0,W_);for(const S of p)n[S].changedThisStep||(a[S]=Ft);c===Ft&&(a[o]=r.originalState)}for(let o=0;o<i;o++){const r=n[o];Hi(r.sylMeta,t)||(r.state!==a[o]&&(r.state=a[o],r.targetScale=r.isSignal?Us:Ns[r.state]??oa),r.state!==Ft&&(r.blankStreak=0),r.brightness+=(1-r.brightness)*.05)}e._needsUpload=!0}const Am=`#version 300 es
in vec2 a_pos;
uniform vec2 u_resolution;
uniform vec2 u_origin; // 단어 사각형의 화면상 좌상단(px, y-down)
uniform vec2 u_size;   // 단어 사각형 크기(px)
out vec2 v_local;      // 0..u_size, point 좌표와 같은 로컬 px 공간(y-down)
void main() {
    v_local = a_pos * u_size;
    vec2 screenPx = u_origin + v_local;
    vec2 clip = (screenPx / u_resolution) * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
}
`,bm=`#version 300 es
precision highp float;
in vec2 v_local;
uniform sampler2D u_data; // width=count, height=3 (row0: x,y,weight,cellCx / row1: r,g,b,cellCy / row2: state,brightness01,-,-)
uniform sampler2D u_ascii; // ascii 모노 글자 아틀라스 — buildAsciiAtlas()
uniform sampler2D u_grunge; // ascii 모노 displacement 맵 — ASCII_DISPLACE
uniform vec2 u_grungeTile; // 맵 한 장이 덮는 화면 크기(CSS px)
uniform vec2 u_grungeMid;  // 이동 0인 값(맵 R/G 평균)
uniform vec2 u_origin; // 단어 사각형 화면 좌상단(px) — vertex와 같은 값, 그런지를 화면에 고정하려고
uniform vec2 u_size;    // 단어 사각형 크기(px) — 바깥 테두리를 가상의 변으로 취급할 때 씀
uniform int u_count;
uniform float u_gapPx;
uniform float u_corner; // 모서리 라운딩 반경(px) — smooth-min의 k
uniform float u_cutoff; // 이 거리보다 먼 site는 모서리 계산에서 제외(smin 처짐 방지)
uniform float u_sylSize;   // 음절 기준 크기(px, base) — 이웃 음절 정보가 없을 때 fallback
// 음절별 lattice 기하 — (1) 픽셀이 어느 음절에 속하는지(누적 오프셋 구간 탐색, 신호등
// 플래싱용) (2) 음절 센터 배경 radial gradient의 중심/반경 계산용. 음절마다 폭/높이가
// 달라서 나눗셈 한 번으로는 안 됨.
uniform float u_sylOffsetX[${jt}]; // 각 음절 왼쪽 경계 x (누적합)
uniform float u_sylWidth[${jt}];
uniform float u_sylHeight[${jt}];
uniform float u_cellSize; // squircle 박스 클리핑 — site 하나가 그릴 수 있는 최대 폭/높이(px, MIN_DIST 기준). 모노 도형 크기 기준으로도 씀
uniform float u_time; // 신호등 플래싱용 wall-clock(ms) — JS의 rAF timestamp(performance.now()와 같은 시계)
// 신호등 플래싱 사이클 타이밍 — 음절(=sylIdx) 단위 uniform 배열. 사이클 시작 시각은 음절
// 전체가 공유하는 값이라 점(셀) 개수만큼 중복 저장할 필요 없이 배열 인덱싱이면 충분.
// (BLINK 때 어떤 "도형"을 그릴지는 셀 단위라 이 배열이 아니라 u_data의 row2에서 읽음.)
uniform float u_sylPhaseStart[${jt}];
uniform vec3 u_sylHalo[${jt}]; // light 변형 — 음절별 halo 색(메인 컬러 계열)
uniform int u_sylCount;
// 셀 바깥(배경)의 알파. 1.0 = 자기 배경(BG_GRAY)을 칠하는 원래 모드,
// 0.0 = 투명 출력(TD 합성). 1.0이면 아래 식이 전부 예전 그대로로 접힌다.
uniform float u_bgAlpha;
uniform highp sampler3D u_cmykLut; // light CMYK 곡선 룩 3D LUT (TEXTURE3)
uniform float u_curveMode;         // 0 = RGB 곡선(LIGHT_CURVE_LUT), 1 = CMYK 곡선(u_cmykLut)
#define HALO_ALPHA ${__.toFixed(4)}
out vec4 outColor;

#define MAX_PTS ${Fs}
#define MAX_SYL_UNIFORM ${jt}
// 신호등 플래싱 사이클 상수 — JS 상단 CYCLE_*/MONO_* 상수와 항상 동일해야 함(단일 소스: JS)
#define CYCLE_NORMAL ${ao.toFixed(1)}
#define CYCLE_BLINK ${aa.toFixed(1)}
#define CYCLE_TOTAL ${Os.toFixed(1)}
#define CYCLE_BLINK_RATE ${j_.toFixed(1)}
#define CYCLE_BLINK_MONO ${Z_.toFixed(1)}
#define MONO_LINE_RATIO ${nm.toFixed(3)}
#define MONO_DOT_RATIO ${im.toFixed(3)}
#define MONO_BORDER_RATIO ${om.toFixed(3)}
#define MONO_ASCII 1
#define ASCII_PITCH vec2(${ro[0].toFixed(3)}, ${ro[1].toFixed(3)})
#define ASCII_LEVELS ${Ji.length.toFixed(1)}
#define ASCII_FILL ${am.toFixed(3)}
#define ASCII_MIN_SIZE ${rm.toFixed(3)}
#define ASCII_WEIGHT_PICK 1
#define ASCII_INK_SHARP ${fm.toFixed(3)}
#define ASCII_INK_LOD ${um.toFixed(3)}
#define ASCII_DISPLACE_ON 1
#define ASCII_DISPLACE_PX ${xn.px.toFixed(3)}
#define COLOR_DISPLACE_ON 1
#define COLOR_DISPLACE_PX ${xn.colorPx.toFixed(3)}
#define ASCII_DISPLACE_GOFF vec2(${xn.gOffset.map(e=>e.toFixed(3)).join(", ")})
#define ASCII_PICK_DIST 1
#define ASCII_DIST_LO ${Kr[0].toFixed(3)}
#define ASCII_DIST_HI ${Kr[1].toFixed(3)}
#define ASCII_DIST_CURVE ${sm.toFixed(3)}
#define ASCII_SPLIT_AT ${$r[0].toFixed(3)}
#define ASCII_SPLIT_SHARE ${$r[1].toFixed(3)}
#define ASCII_SCALE_OUT ${qr[0].toFixed(3)}
#define ASCII_SCALE_IN ${qr[1].toFixed(3)}
#define ASCII_MAX_GLYPHS ${Gs.toFixed(1)}
// state(BLANK, CHO, JUNG, JONG)별 글자 개수
#define ASCII_COUNTS vec4(${[Ft,Ct,Dt,$t].map(e=>Ei[e].length.toFixed(1)).join(", ")})
// 음절 센터 radial gradient — JS 상단 BG_GRAY/SYL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define BG_GRAY ${ji.toFixed(4)}
#define SYL_GRAD_STRENGTH ${d_.toFixed(4)}
#define SYL_GRAD_RADIUS_RATIO ${h_.toFixed(4)}
#define SYL_GRAD_FALLOFF ${p_.toFixed(4)}
#define SIGNAL_LIGHT ${xi?1:0}
#define LIGHT_BLANK_IN ${m_.toFixed(4)}
#define LIGHT_BLANK_OUT ${g_.toFixed(4)}
#define LIGHT_BORDER_PX ${v_.toFixed(4)}
#define LIGHT_BORDER_DARKEN ${S_.toFixed(4)}
#define LIGHT_WHITE_MIN ${x_.toFixed(4)}
#define LIGHT_CURVE_ON ${xi&&Zi?1:0}
#define LIGHT_ASCII_BLANK_GRAY ${T_.toFixed(4)}
${xi&&Zi?`const float LIGHT_CURVE_LUT[256] = float[256](${A_(Zi).map(e=>(e/255).toFixed(6)).join(", ")});`:""}
#if LIGHT_CURVE_ON
// light 색 곡선 — RGB: 8비트로 끊어 LUT를 읽는다(PNG에 Photoshop 곡선을 건 것과 같은 계단).
// CMYK: 3D LUT를 칸 중심 기준으로 삼선형 보간(64³라 RGB 곡선처럼 8비트 계단을 따로 끊지 않음)
vec3 lightCurve(vec3 c) {
    if (u_curveMode > 0.5) return texture(u_cmykLut, clamp(c, 0.0, 1.0) * (63.0 / 64.0) + 0.5 / 64.0).rgb;
    ivec3 ci = ivec3(clamp(floor(c * 255.0 + 0.5), 0.0, 255.0));
    return vec3(LIGHT_CURVE_LUT[ci.r], LIGHT_CURVE_LUT[ci.g], LIGHT_CURVE_LUT[ci.b]);
}
#endif
#define NAVY_RADIUS_RATIO ${b_.toFixed(4)}
#define NAVY_FALLOFF ${R_.toFixed(4)}
// 셀 내부 미세 radial gradient — JS 상단 CELL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define CELL_GRAD_SAT ${y_.toFixed(4)}
#define CELL_GRAD_DEPTH ${w_.toFixed(4)}
#define CELL_GRAD_RADIUS_RATIO ${C_.toFixed(4)}
#define CELL_GRAD_FALLOFF ${L_.toFixed(4)}
#if SIGNAL_LIGHT
// light ASCII 글자 색 — 그 셀이 화면에 내는 색(셀 내부 gradient를 중심 → 가장자리로 훑고, 곡선까지 건 뒤) 중
// 가장 어두운 것. 셀 가장자리 = 반대각선(√2/2 × 셀 크기)까지, 테두리 색은 뺌. BLANK는 LIGHT_ASCII_BLANK_GRAY.
// 곡선은 main() 끝과 같은 8비트 LUT 읽기를 여기서도 한다(컬러 경로 코드는 안 건드림)
vec3 lightCellDarkest(vec3 c, float st) {
    if (st < 0.5) return vec3(LIGHT_ASCII_BLANK_GRAY);
    float tMax = pow(min(1.0, 0.7071 / CELL_GRAD_RADIUS_RATIO), CELL_GRAD_FALLOFF);
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 best = vec3(1.0);
    float bestL = 2.0;
    for (int k = 0; k <= 12; k++) {
        float t = tMax * float(k) / 12.0;
        vec3 v = clamp(mix(vec3(luma), c, 1.0 + CELL_GRAD_SAT * t) * (1.0 - CELL_GRAD_DEPTH * t), 0.0, 1.0);
#if LIGHT_CURVE_ON
        v = lightCurve(v);
#endif
        float l = dot(v, vec3(0.2126, 0.7152, 0.0722));
        if (l < bestL) { bestL = l; best = v; }
    }
    return best;
}
#endif

// polynomial smooth-min — a,b가 비슷할수록 더 깊이 둥글게 파고듦(k=반경).
// "여러 제약을 동시에 만족해야 하는" 교집합(intersection) 용도 — 여기서는
// site 경계(bisector)들 + 단어 사각형 테두리 + 내 음절의 원, 이렇게 "전부
// 만족해야 안쪽"인 조건들을 합칠 때 씀.
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// polynomial smooth-max — smin의 반대. "여러 도형 중 하나에라도 속하면" 안쪽인
// 합집합(union) 용도. 옆 음절 원과 부드럽게 겹쳐 이어붙이려면 이게 필요함 —
// ⚠️ 처음엔 실수로 여기도 smin을 썼는데, 그러면 "내 원 밖 = 무조건 바깥"이 되는
// 교집합 조건이 되어버려서, 옆 원 중심에서 멀리 떨어진(=거의 모든) 픽셀이
// 옆 원 항 때문에 큰 음수로 끌려 내려가 화면 전체가 하얗게 사라지는 버그가 남.
float smax(float a, float b, float k) {
    return -smin(-a, -b, k);
}

// gain() 셰이핑 함수(Iñigo Quilez류 bias/gain 커브) — 사용자가 p5.js에서 검증한
// squircle 크기 축소 곡선을 그대로 포팅. x=0→0, x=1→1이면서 k가 클수록
// x=0.5 부근에서 더 급격하게 꺾이는 S자 커브.
float gain(float x, float k) {
    float p = 0.16;
    float a = p * pow(2.0 * ((x < p) ? x : 1.0 - x), k);
    return (x < p) ? a : 1.0 - a;
}

// 이 x가 속한 음절 — main() 첫머리와 같은 누적 오프셋 구간 탐색
int sylIndexAt(float x) {
    int sylI = 0;
    for (int s = 0; s < MAX_SYL_UNIFORM; s++) {
        if (s >= u_sylCount) break;
        if (x >= u_sylOffsetX[s]) sylI = s;
    }
    return sylI;
}

// 그 음절이 지금 모노를 보일 차례인지 — 아래 showMono와 같은 식
bool monoAt(int sylI) {
    int i = clamp(sylI, 0, u_sylCount - 1);
    float ph = mod(max(0.0, u_time - u_sylPhaseStart[i]), CYCLE_TOTAL);
    return ph >= CYCLE_NORMAL && ph < CYCLE_NORMAL + CYCLE_BLINK && ph - CYCLE_NORMAL < CYCLE_BLINK_MONO;
}

void main() {
    // 컬러(와 shape 모노) 그런지 displacement — 위 ASCII와 같은 맵을 컬러 렌더링 전체(음절·site·halo)를 읽는
    // 좌표에 건다. 아래 컬러 경로는 전부 v_local 대신 cL. ASCII 모노는 자기 aP를 v_local에서 따로 민다
#if COLOR_DISPLACE_ON
    vec2 cGUV = (u_origin + v_local) / u_grungeTile;
    vec2 cL = v_local + (vec2(texture(u_grunge, cGUV).r, texture(u_grunge, cGUV + ASCII_DISPLACE_GOFF).g) - u_grungeMid)
        * 2.0 * COLOR_DISPLACE_PX;
#else
    vec2 cL = v_local;
#endif
    // 이 픽셀이 속한 음절 — 음절 폭이 제각각이라 나눗셈 대신 누적 오프셋 구간 탐색.
    // (음절 수는 MAX_SYL_UNIFORM 이하로 적어서 선형 순회 비용 무시 가능.)
    int sylI = 0;
    for (int s = 0; s < MAX_SYL_UNIFORM; s++) {
        if (s >= u_sylCount) break;
        if (cL.x >= u_sylOffsetX[s]) sylI = s;
    }
    float sylIdx = float(sylI);
    float sylW_i = u_sylWidth[sylI] > 0.0 ? u_sylWidth[sylI] : u_sylSize;
    float sylH_i = u_sylHeight[sylI] > 0.0 ? u_sylHeight[sylI] : u_sylSize;
    // point 생성 시 py = ((wy+1)/2)*sylH — 음절은 단어 박스 상단 정렬. 중심 y = sylH_i*0.5.
    vec2 sylCenter = vec2(u_sylOffsetX[sylI] + sylW_i * 0.5, sylH_i * 0.5);

    // 음절 센터 radial gradient — 셀 뒤에 깔리는 배경. 중심이 BG_GRAY보다 밝고
    // 바깥으로 페이드(격자를 그리기 전 단계). 셀 색은 아래에서 이 bg 위에 mix됨.
#if SIGNAL_LIGHT
    // light 변형 — 흰 glow 대신 음절 메인 컬러 계열 색. 불투명이면 BG_GRAY → 그 색으로, 투명이면 그 색이 gradT 알파로 얹힌다
    vec3 haloCol = u_sylHalo[sylI];
    float gradR = max(min(sylW_i, sylH_i) * NAVY_RADIUS_RATIO, 1.0);
    float gradT = pow(clamp(1.0 - length(cL - sylCenter) / gradR, 0.0, 1.0), NAVY_FALLOFF);
    vec3 bg = mix(vec3(BG_GRAY), haloCol, gradT);
    vec3 bgCol = mix(haloCol, bg, u_bgAlpha);
#else
    float gradR = max(min(sylW_i, sylH_i) * SYL_GRAD_RADIUS_RATIO, 1.0);
    float gradT = pow(clamp(1.0 - length(cL - sylCenter) / gradR, 0.0, 1.0), SYL_GRAD_FALLOFF);
    vec3 bg = vec3(BG_GRAY + SYL_GRAD_STRENGTH * gradT);
    // 투명 출력에선 어두운 바탕(BG_GRAY)을 빼고 **halo만** 남긴다. 아래 alpha가 gradT라
    // "흰 glow가 뒤 배경 위에 얹히는" 합성이 되고, 멀리서는 알파가 0이라 배경이 그대로 비친다.
    // u_bgAlpha=1.0이면 bg 그대로 — 불투명 모드의 룩은 1비트도 안 바뀐다.
    vec3 bgCol = mix(vec3(1.0), bg, u_bgAlpha);
#endif

    // 1st pass — power distance가 가장 작은 site(best) 찾기
    float best = 1e12;
    int bestIdx = 0;
    vec2 bestPos = vec2(0.0);
    float bestW = 0.0;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz; // x, y, weight
        vec2 d = cL - pw.xy;
        float dist = dot(d, d) - pw.z; // power distance
        if (dist < best) {
            best = dist;
            bestIdx = i;
            bestPos = pw.xy;
            bestW = pw.z;
        }
    }

    // 2nd pass — best와 각 이웃 사이의 power-diagram 경계선(radical axis)까지
    // 실제 수직거리를 구해서 smooth-min으로 합침 (모서리 라운딩의 핵심).
    // 경계선 공식: dot(p - mid, n̂) = -(w_j - w_best) / (2*|s_j - s_best|)
    // 인 직선이 site best/j의 power-diagram bisector — 그 직선까지의
    // signed 거리(양수 = p가 best 쪽 안에 있음)를 아래 d로 계산.
    float edgeDist = 1e12;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        if (i == bestIdx) continue;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz;
        if (length(pw.xy - texelFetch(u_data, ivec2(bestIdx, 0), 0).xy) > u_cutoff) continue;
        vec2 n = pw.xy - bestPos;
        float nlen = length(n);
        if (nlen < 1e-4) continue;
        vec2 nHat = n / nlen;
        vec2 mid = 0.5 * (bestPos + pw.xy);
        float d = dot(mid - cL, nHat) - (pw.z - bestW) / (2.0 * nlen);
        edgeDist = smin(edgeDist, d, u_corner);
    }

    // 단어 사각형의 4변 — 이건 두 스타일 공통(교집합 조건, smin).
    edgeDist = smin(edgeDist, cL.x, u_corner);
    edgeDist = smin(edgeDist, u_size.x - cL.x, u_corner);
    edgeDist = smin(edgeDist, cL.y, u_corner);
    edgeDist = smin(edgeDist, u_size.y - cL.y, u_corner);

    vec4 bestRow0 = texelFetch(u_data, ivec2(bestIdx, 0), 0);
    vec4 bestRow1 = texelFetch(u_data, ivec2(bestIdx, 1), 0);
    vec3 color = bestRow1.rgb;

    // ── squircle 실루엣 (2026-08-27 최종안) — p5.js 레퍼런스의 "가로/세로 독립
    // 축소". Cx(너비 배율)/Cy(높이 배율)는 여기서 다시 계산하지 않고 CPU에서 압축
    // "전" 원본 격자 좌표로 미리 계산해 텍스처에 실어둔 값을 그대로 읽는다
    // (row0.w, row1.w — appendSyllable() 참고. 압축된 site 위치 기준으로 다시 계산하면
    // 바깥쪽 셀이 과하게 사라짐). "이 site는 최대 Cx*u_cellSize 너비 / Cy*u_cellSize
    // 높이짜리 상자 안에서만 그려질 수 있다"는 축(axis)별 박스 클리핑을 edgeDist에
    // smin으로 접어 넣음 — Voronoi 셀 모양 자체를 안 건드리고 위에 상자를 겹쳐
    // 씌우는 방식이라, |x_g|만 threshold를 넘으면 너비만, 둘 다 넘는 모서리 site는
    // 상자 자체가 작아져서 상하좌우 다 줄어든다.
    float Cx = bestRow0.w * 1.4;
    float Cy = bestRow1.w * 1.4;
    float halfW = u_cellSize * 0.5 * Cx;
    float halfH = u_cellSize * 0.5 * Cy;
    float boxClipX = halfW - abs(cL.x - bestPos.x);
    float boxClipY = halfH - abs(cL.y - bestPos.y);
    edgeDist = smin(edgeDist, boxClipX, u_corner);
    edgeDist = smin(edgeDist, boxClipY, u_corner);

    // 경계에 가까울수록(=edgeDist가 작을수록) 배경 쪽으로 섞어서 LED 픽셀 같은
    // 셀 간 gap을 만듦 (CPU 폴리곤 축소 대신 per-pixel로 처리)
    float edge = smoothstep(0.0, u_gapPx, edgeDist);
    // ── 셀 내부 미세 radial gradient (컬러 모드 전용) — site 중심은 원래 색,
    // 바깥으로 갈수록 채도↑(CELL_GRAD_SAT) 그리고/또는 명도↓(CELL_GRAD_DEPTH).
    // 낱개 셀에 볼륨감을 줌. 셀 크기는 제각각(weight)이라 기준 반경을
    // sqrt(bestW)(≈currentScale×MIN_DIST)에 맞춤. mono(BLINK) 모드는 아래에서
    // finalColor를 통째로 덮으므로 영향 없음.
    float cellRef = max(sqrt(max(bestW, 1.0)) * CELL_GRAD_RADIUS_RATIO, 1.0);
    float cellT = pow(clamp(length(cL - bestPos) / cellRef, 0.0, 1.0), CELL_GRAD_FALLOFF);
    // 채도: luma(무채색)에서 color를 밀어냄 — factor>1이면 채도↑. 명도: 곱 감쇠.
    float cellLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 cellShaded = mix(vec3(cellLuma), color, 1.0 + CELL_GRAD_SAT * cellT);
    cellShaded *= (1.0 - CELL_GRAD_DEPTH * cellT);
#if SIGNAL_LIGHT
    // light 변형 — 흰 BLANK 셀(row2.x = state 0)을 연회색 + 가장자리로 어두워지는 회색으로
    // 얇은 테두리 — gap(edge 페이드)이 끝나는 자리부터 LIGHT_BORDER_PX 안쪽까지. fwidth로 1px 안티에일리어싱
    float borderAA = max(fwidth(edgeDist), 1e-3);
    float border = 1.0 - smoothstep(u_gapPx + LIGHT_BORDER_PX - borderAA, u_gapPx + LIGHT_BORDER_PX + borderAA, edgeDist);
    // 테두리는 BLANK뿐 아니라 흰 셀 전부(밝기가 올라 하얗게 포화된 셀 등) — 판정은 site 색(셀마다 하나라 테두리가 끊기지 않게)
    if (texelFetch(u_data, ivec2(bestIdx, 2), 0).x < 0.5)
        cellShaded = vec3(mix(mix(LIGHT_BLANK_IN, LIGHT_BLANK_OUT, cellT), LIGHT_BLANK_IN * LIGHT_BORDER_DARKEN, border));
    else if (min(color.r, min(color.g, color.b)) >= LIGHT_WHITE_MIN)
        cellShaded = mix(cellShaded, color * LIGHT_BORDER_DARKEN, border);
#endif
    cellShaded = clamp(cellShaded, 0.0, 1.0);

    vec3 finalColor = mix(bgCol, cellShaded, edge); // bgCol = 음절 센터 radial gradient (NORMAL/FREEZE 구간엔 이대로)

    // ── 신호등 플래싱 — sylIdx(이 픽셀이 속한 음절)의 NORMAL/BLINK/FREEZE를
    // u_sylPhaseStart[]로 계산. FREEZE는 별도 오버레이 없음(멈춘 순간의 CA 렌더링
    // 자체가 신호이므로 위 finalColor 그대로 노출). BLINK만 아래 모노 카드와 교차
    // 노출됨. now < 시작시각이면(=아직 그 위상 순번이 안 됨) elapsed를 0에 고정 —
    // JS getCyclePhase()와 동일한 공식(다른 소스 두 곳이 어긋나지 않게 유지).
    int sylIdxI = clamp(int(sylIdx), 0, u_sylCount - 1);
    float elapsed = max(0.0, u_time - u_sylPhaseStart[sylIdxI]);
    float cyclePhase = mod(elapsed, CYCLE_TOTAL);
    bool isBlink = cyclePhase >= CYCLE_NORMAL && cyclePhase < CYCLE_NORMAL + CYCLE_BLINK;
    // bool showMono = isBlink && mod(cyclePhase, CYCLE_BLINK_RATE * 2.0) < CYCLE_BLINK_RATE; // 예전 — 기준점이 사이클 0이라 NORMAL 길이에 따라 결과가 바뀌었다
    bool showMono = isBlink && cyclePhase - CYCLE_NORMAL < CYCLE_BLINK_MONO;
#if MONO_ASCII
    // 칸 하나가 음절 경계에 걸쳐도 글자가 반쪽만 바뀌지 않게, 모노 차례는 칸 중심의 음절로 판정
    vec2 asciiPitch = u_cellSize * ASCII_PITCH;
    // 그런지 displacement — ASCII 이미지 전체를 이 밀린 좌표로 읽는다(칸·site·글자 모두). 미분(mip)은 v_local로
#if ASCII_DISPLACE_ON
    // vec2 aP = v_local + (texture(u_grunge, (u_origin + v_local) / ASCII_DISPLACE_TILE).rg - 0.5) * 2.0 * ASCII_DISPLACE_PX; // (임시 맵 시절)
    vec2 gUV = (u_origin + v_local) / u_grungeTile;
    vec2 gDisp = vec2(texture(u_grunge, gUV).r, texture(u_grunge, gUV + ASCII_DISPLACE_GOFF).g) - u_grungeMid;
    vec2 aP = v_local + gDisp * 2.0 * ASCII_DISPLACE_PX;
#else
    vec2 aP = v_local;
#endif
    vec2 asciiC = (floor(aP / asciiPitch) + 0.5) * asciiPitch;
    showMono = monoAt(sylIndexAt(asciiC.x));
#endif

    bool skipCurve = false; // light ASCII 글자는 이미 곡선을 건(또는 곡선 밖 회색) 색이라 마지막 곡선을 또 타지 않게
#if MONO_ASCII
    if (showMono) {
        // ASCII 격자 — 칸 중심에서 power distance가 가장 작은 site를 다시 찾는다(위 1st pass와 같은 식,
        // 픽셀이 아니라 칸 중심 기준이라 칸 전체가 한 글자). 모노 차례(약 1초)에만 도는 추가 루프
        float aBest = 1e12;
        int aIdx = 0;
        float aNear = 1e12; // 가장 가까운 site까지 거리² (weight 없이) — 아래 inside 판정용
        for (int i = 0; i < MAX_PTS; i++) {
            if (i >= u_count) break;
            vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz;
            vec2 d = asciiC - pw.xy;
            float d2 = dot(d, d);
            float dist = d2 - pw.z;
            if (dist < aBest) {
                aBest = dist;
                aIdx = i;
            }
            aNear = min(aNear, d2);
        }
        vec4 a0 = texelFetch(u_data, ivec2(aIdx, 0), 0);
        vec4 a1 = texelFetch(u_data, ivec2(aIdx, 1), 0);
        vec4 a2 = texelFetch(u_data, ivec2(aIdx, 2), 0);
        // (처음안) 실루엣 = 위 squircle 박스 클리핑(Cx/Cy × 1.4)을 칸 중심에서만 판정. 박스가 |g|≈0.35부터
        // 셀 간격(MIN_DIST)의 절반보다 좁아져서, 격자 줄이 site 줄과 엇박인 곳은 줄·열이 통째로 빠졌다
        // bool inside = abs(asciiC.x - a0.x) < u_cellSize * 0.5 * a0.w * 1.4
        //     && abs(asciiC.y - a0.y) < u_cellSize * 0.5 * a1.w * 1.4
        //     && asciiC.x > 0.0 && asciiC.y > 0.0 && asciiC.x < u_size.x && asciiC.y < u_size.y;
        // 지금: 가장 가까운 site가 ASCII_FILL × MIN_DIST 안이면 채움 — site가 있는 자리는 꽉 찬 글자 덩어리,
        // 크기 축소는 글자 고르기(cellM)에만 남는다
        bool inside = aNear < pow(ASCII_FILL * u_cellSize, 2.0)
            && asciiC.x > 0.0 && asciiC.y > 0.0 && asciiC.x < u_size.x && asciiC.y < u_size.y;
        float st = clamp(floor(a2.x + 0.5), 0.0, 3.0);
        float lv = clamp(floor(a2.y * ASCII_LEVELS), 0.0, ASCII_LEVELS - 1.0);
        // 셀 크기(squircle 축소, 위 inside 판정과 같은 ×1.4) → 글자 번호. 큰 셀 = 0번(왼쪽)
        float cellM = sqrt(clamp(a0.w * 1.4, 0.0, 1.0) * clamp(a1.w * 1.4, 0.0, 1.0));
        float nG = ASCII_COUNTS[int(st)];
        // float gi = clamp(floor((1.0 - cellM) * nG), 0.0, nG - 1.0); // (ASCII_MIN_SIZE 전) 0~1 전체를 나눔
        // float gi = clamp(floor((1.0 - cellM) / (1.0 - ASCII_MIN_SIZE) * nG), 0.0, nG - 1.0); // (균등 분할)
        // 비대칭 분할 — gu: 0 = 가장 큰 셀 … 1 = ASCII_MIN_SIZE. 경계 위는 앞쪽 SHARE만큼, 아래는 나머지
        float gu = cellM >= ASCII_SPLIT_AT
            ? (1.0 - cellM) / (1.0 - ASCII_SPLIT_AT) * ASCII_SPLIT_SHARE
            : ASCII_SPLIT_SHARE + (ASCII_SPLIT_AT - cellM) / (ASCII_SPLIT_AT - ASCII_MIN_SIZE) * (1.0 - ASCII_SPLIT_SHARE);
#if ASCII_PICK_DIST
        // 거리 기반 — site가 속한 음절의 중심(main 첫머리 sylCenter와 같은 식)에서 반폭/반높이로 정규화한 반경
        int dI = sylIndexAt(a0.x);
        float dW = u_sylWidth[dI] > 0.0 ? u_sylWidth[dI] : u_sylSize;
        float dH = u_sylHeight[dI] > 0.0 ? u_sylHeight[dI] : u_sylSize;
        float dR = length((a0.xy - vec2(u_sylOffsetX[dI] + dW * 0.5, dH * 0.5)) / (0.5 * vec2(dW, dH)));
        gu = pow(clamp((dR - ASCII_DIST_LO) / (ASCII_DIST_HI - ASCII_DIST_LO), 0.0, 1.0), ASCII_DIST_CURVE);
#endif
        float gi = clamp(floor(gu * nG), 0.0, nG - 1.0);
#if ASCII_WEIGHT_PICK
        lv = clamp(floor((1.0 - gu) * ASCII_LEVELS), 0.0, ASCII_LEVELS - 1.0); // 안쪽(gu 0) = 가장 굵게
#endif
        inside = inside && cellM >= ASCII_MIN_SIZE; // 너무 작은 셀(바깥 고리)은 빈칸
        vec2 atlasN = vec2(ASCII_LEVELS * ASCII_MAX_GLYPHS, 4.0);
        vec2 cellUV = aP / asciiPitch;
        vec2 cellD = v_local / asciiPitch; // mip 선택용 — 밀린 좌표는 그런지 때문에 미분이 튀어서
        // fract가 칸 경계에서 튀므로 mip 선택은 연속인 cellUV의 미분으로(textureGrad) — 안 하면 칸마다 이음선
        // float ink = textureGrad(u_ascii, (vec2(gi * ASCII_LEVELS + lv, st) + fract(cellUV)) / atlasN,
        //                         dFdx(cellUV) / atlasN, dFdy(cellUV) / atlasN).a; // (크기 차이 전) 늘 칸 꽉 채움
        // 글자 크기 — 셀이 클수록(안쪽) 크게. 칸 가운데 기준으로 칸 안 좌표를 1/gs배로 늘려 읽고,
        // 0~1을 벗어난 자리는 잉크 0(옆 글자를 읽지 않게)
        float gs = mix(ASCII_SCALE_OUT, ASCII_SCALE_IN, clamp((cellM - ASCII_MIN_SIZE) / (1.0 - ASCII_MIN_SIZE), 0.0, 1.0));
        vec2 inUV = (fract(cellUV) - 0.5) / gs + 0.5;
        float inTile = step(0.0, inUV.x) * step(inUV.x, 1.0) * step(0.0, inUV.y) * step(inUV.y, 1.0);
        float ink = inTile * textureGrad(u_ascii, (vec2(gi * ASCII_LEVELS + lv, st) + clamp(inUV, 0.0, 1.0)) / atlasN,
                                         ASCII_INK_LOD * dFdx(cellD) / (gs * atlasN), ASCII_INK_LOD * dFdy(cellD) / (gs * atlasN)).a;
        // 선명도 — 0.5 기준으로 가장자리 폭을 (1 − SHARP)배로 좁힌다
        ink = smoothstep(0.5 * ASCII_INK_SHARP, 1.0 - 0.5 * ASCII_INK_SHARP, ink);
        // edge = inside ? 1.0 : 0.0; // (처음안) 흰 칸 + 검은 글자 — 칸 안은 불투명
        // finalColor = mix(bgCol, vec3(1.0 - ink), edge);
        // 칸 바탕 없이 흰 글자만 — 잉크만큼만 불투명, 나머지는 바깥과 같은 배경(투명 모드면 halo 알파만)
        edge = inside ? ink : 0.0; // 아래 알파도 이걸 따른다
        // 모노 동안은 음절 센터 halo를 끈다 — 흰 글자가 흰 glow에 묻혀 가운데가 안 보였다.
        // 바탕 = halo 없는 bgCol(불투명이면 BG_GRAY, 투명이면 색 무관), gradT = 0이라 아래 알파도 halo 없이
        gradT = 0.0;
        finalColor = mix(mix(vec3(1.0), vec3(BG_GRAY), u_bgAlpha), vec3(1.0), edge);
#if SIGNAL_LIGHT
        // light — 흰 글자 대신 그 셀의 가장 어두운 색. 바탕은 위 그대로(투명 모드면 알파 0이라 색 무관)
        finalColor = mix(mix(vec3(1.0), vec3(BG_GRAY), u_bgAlpha), lightCellDarkest(a1.rgb, st), edge);
        skipCurve = true;
#endif
    }
#else
    if (showMono) {
        // 모노 도형 — 셀(점) 하나하나가 색 대신 흑백 도형으로 바뀜. NORMAL 모드와 정확히
        // 같은 입자 단위(bestIdx가 가리키는 그 site) 유지 — 즉 지금 컬러풀한 모자이크가
        // 나오는 자리에 그대로 겹쳐서 색만 무채색+도형으로 바뀌는 것. bestPos(이 셀의 site
        // 위치) 기준 로컬 좌표로 그리고, state는 u_data row2에서 이 site의 실제 CA 상태를
        // 읽음(u_sylPhaseStart와 달리 이건 음절 전체가 아니라 셀마다 다름).
        // 셀 사이 구분: NORMAL과 같은 edge(gap 블렌드) 위에, 참고 이미지의 "둥근 사각형
        // 타일" 느낌을 살리려고 아주 얇은 테두리(MONO_BORDER_RATIO)를 셀 경계(edgeDist≈0)에
        // 추가로 얹음. 첫 시도 때는 이 테두리가 두꺼워서(그리고 도형 자체도 두꺼워서) 수십~
        // 백여 개가 겹쳐 노이즈가 됐었는데, 지금은 도형/테두리 둘 다 셀 크기 대비 훨씬
        // 얇게 잡아서 낱개 타일처럼 또렷하게 보이는 쪽을 노림.
        vec3 stateRow = texelFetch(u_data, ivec2(bestIdx, 2), 0).xyz;
        float st = stateRow.x;
        vec2 local = cL - bestPos;
        float linePx = MONO_LINE_RATIO * u_cellSize;
        float shape;
        if (st < 0.5) {
            shape = length(local) - MONO_DOT_RATIO * u_cellSize;
        } else if (st < 1.5) {
            shape = abs(dot(local, normalize(vec2(1.0, -1.0))));
        } else if (st < 2.5) {
            shape = abs(dot(local, normalize(vec2(1.0, 1.0))));
        } else {
            float d1 = abs(dot(local, normalize(vec2(1.0, 1.0))));
            float d2 = abs(dot(local, normalize(vec2(1.0, -1.0))));
            shape = min(d1, d2);
        }
        float shapeMask = 1.0 - smoothstep(0.0, linePx, shape);
        float borderPx = MONO_BORDER_RATIO * u_cellSize;
        float borderMask = 1.0 - smoothstep(0.0, borderPx, abs(edgeDist));
        vec3 cellBG = vec3(1.0);
        vec3 cellMono = mix(cellBG, vec3(0.0), max(shapeMask, borderMask));
        finalColor = mix(bgCol, cellMono, edge); // NORMAL과 동일한 gap 블렌딩 재사용
    }
#endif

    // 셀 안(edge=1)은 늘 불투명, 바깥은 배경 알파. 투명 모드에선 halo가 알파를 만든다.
    // 캔버스가 premultipliedAlpha:true 라 RGB를 알파로 미리 곱해서 내보낸다
    // (u_bgAlpha=1.0이면 alpha=1.0이라 곱해도 그대로 — 예전 출력과 동일).
    float bgA = max(u_bgAlpha, clamp(gradT * HALO_ALPHA, 0.0, 1.0));
    float alpha = mix(bgA, 1.0, edge);
#if LIGHT_CURVE_ON
    // light 색 곡선(lightCurve — RGB / CMYK) — 프리멀티플라이 전 색에
    if (u_bgAlpha < 1.0 && !skipCurve) finalColor = lightCurve(finalColor);
#endif
    outColor = vec4(finalColor * alpha, alpha);
}
`;function ts(e,t,n){const i=e.createShader(t);if(e.shaderSource(i,n),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(i);throw e.deleteShader(i),new Error("signal shader compile error: "+a)}return i}function Rm(e){const t=ts(e,e.VERTEX_SHADER,Am),n=ts(e,e.FRAGMENT_SHADER,bm),i=e.createProgram();if(e.attachShader(i,t),e.attachShader(i,n),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS)){const a=e.getProgramInfoLog(i);throw new Error("signal program link error: "+a)}return e.deleteShader(t),e.deleteShader(n),i}function ym(e=256){const t=document.createElement("canvas");t.width=t.height=e;const n=t.getContext("2d"),i=n.createImageData(e,e),a=(s,c,f)=>{const m=Math.sin(s*127.1+c*311.7+f*74.7)*43758.5453;return m-Math.floor(m)},o=(s,c,f,m)=>{const l=s*f,h=c*f,p=Math.floor(l),S=Math.floor(h),x=l-p,_=h-S,u=x*x*(3-2*x),T=_*_*(3-2*_),b=(N,L)=>a((N%f+f)%f,(L%f+f)%f,m),R=b(p,S)+(b(p+1,S)-b(p,S))*u,G=b(p,S+1)+(b(p+1,S+1)-b(p,S+1))*u;return R+(G-R)*T},r=(s,c,f)=>.45*o(s,c,4,f)+.3*o(s,c,16,f+1)+.25*o(s,c,64,f+2);for(let s=0;s<e;s++)for(let c=0;c<e;c++){const f=c/e,m=s/e,l=a(c,s,9)>.985?(a(c,s,3)-.5)*.8:0,h=(s*e+c)*4;i.data[h]=Math.round(255*Math.min(1,Math.max(0,r(f,m,0)+l))),i.data[h+1]=Math.round(255*Math.min(1,Math.max(0,r(f,m,5)+l))),i.data[h+2]=128,i.data[h+3]=255}return n.putImageData(i,0,0),t}let ki=null;function wm(){return typeof FontFace>"u"||!document.fonts?Promise.resolve():(ki||(ki=new FontFace(Hs,`url(/asemic/${lm})`,{weight:"100 900"}),document.fonts.add(ki)),ki.load())}function Cm(){const e=dm,t=Math.round(e*ro[0]/ro[1]),n=Ji.length,i=document.createElement("canvas");i.width=t*n*Gs,i.height=e*4;const a=i.getContext("2d");let o=Math.round(e*cm);a.font=`${Math.max(...Ji)} ${o}px ${jr}`;const r=Math.max(...Object.values(Ei).flat().map(s=>a.measureText(s).width));r>t*Zr&&(o=Math.floor(o*(t*Zr/r))),a.textAlign="center",a.textBaseline="alphabetic",a.fillStyle=a.strokeStyle="#fff",a.lineJoin="round";for(const s of[Ft,Ct,Dt,$t])for(let c=0;c<n*Ei[s].length;c++){const f=c%n,m=Ei[s][Math.floor(c/n)];a.font=`${Ji[f]} ${o}px ${jr}`;const l=a.measureText(m),h=(c+.5)*t,p=(s+.5)*e+(l.actualBoundingBoxAscent-l.actualBoundingBoxDescent)/2;a.save(),a.beginPath(),a.rect(c*t,s*e,t,e),a.clip(),a.fillText(m,h,p),a.restore()}return i}function Lm(e,t,n){const i=t.points,a=i.length;if(a===0)return;const o=new Float32Array(a*3*4);for(let s=0;s<a;s++){const c=i[s];o[s*4+0]=c.localX,o[s*4+1]=c.localY,o[s*4+2]=c.currentScale*l_,o[s*4+3]=c.cellCx??1;const[f,m,l]=mm(c,n),h=a*4+s*4;o[h+0]=f/255,o[h+1]=m/255,o[h+2]=l/255,o[h+3]=c.cellCy??1;const p=a*8+s*4;o[p+0]=c.state,o[p+1]=Math.min(Math.max((c.brightness-1)/1.5,0),1),o[p+2]=0,o[p+3]=0}t._glTex||(t._glTex=e.createTexture()),e.bindTexture(e.TEXTURE_2D,t._glTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,a,3,0,e.RGBA,e.FLOAT,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),t._texCount=a;const r=Math.min(t.syllables.length,jt);t._sylPhaseStart=new Float32Array(jt);for(let s=0;s<r;s++)t._sylPhaseStart[s]=t.syllables[s].cyclePhaseStart;t._sylCount=r}function Im(e,t){const n=new Uint16Array(t*4);for(const a of e.points)a.sylIndex<t&&n[a.sylIndex*4+a.state]++;const i=new Float32Array(jt*3);for(let a=0;a<t;a++){const o=e.syllables[a];let r=o.haloState??Dt;for(const s of[Ct,Dt,$t])n[a*4+s]>n[a*4+r]&&(r=s);o.haloState=r,i.set(E_[r],a*3)}return i}class Pm{constructor(t={}){this._transparent=!!t.transparentOutput,this.lineHeightRatio=1,this._canvas=null,this._gl=null,this._prog=null,this._quadBuf=null,this._uniforms=null,this._raf=null,this._rows=[],this._wordCache=new Map,this._JAMO=null,this._sylItems=[],this._positions=[],this._sylSize=_i,this._stepCount=0,this._lastStep=0,this._STEP_INTERVAL=140,this._lastFrame=0,this._FRAME_INTERVAL=1e3/24,this._flashPhase=0,this._active=!1,this._lastActivity=0,this._paused=!1,this._pausedAt=0,this._rect=null,this._scrollAxis="y",this._scrollBase=0,this._slide=0,this._scrollJump=!0,this.sylSize=_i,this.wrapStep=_i,this.minSpacing=.96,this.wrapMargin=0}async init(t){this._canvas=t??document.createElement("canvas"),this._ownCanvas=!t,t||(Object.assign(this._canvas.style,{position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh"}),document.body.appendChild(this._canvas));const n=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!n)throw new Error("signal: WebGL2 not available");this._gl=n,this._prog=Rm(n),this._quadBuf=n.createBuffer(),n.bindBuffer(n.ARRAY_BUFFER,this._quadBuf),n.bufferData(n.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),n.STATIC_DRAW);const i=n.getAttribLocation(this._prog,"a_pos");n.enableVertexAttribArray(i),n.vertexAttribPointer(i,2,n.FLOAT,!1,0,0),this._uniforms={resolution:n.getUniformLocation(this._prog,"u_resolution"),origin:n.getUniformLocation(this._prog,"u_origin"),size:n.getUniformLocation(this._prog,"u_size"),data:n.getUniformLocation(this._prog,"u_data"),count:n.getUniformLocation(this._prog,"u_count"),gapPx:n.getUniformLocation(this._prog,"u_gapPx"),corner:n.getUniformLocation(this._prog,"u_corner"),cutoff:n.getUniformLocation(this._prog,"u_cutoff"),sylSize:n.getUniformLocation(this._prog,"u_sylSize"),sylOffsetX:n.getUniformLocation(this._prog,"u_sylOffsetX"),sylWidth:n.getUniformLocation(this._prog,"u_sylWidth"),sylHeight:n.getUniformLocation(this._prog,"u_sylHeight"),cellSize:n.getUniformLocation(this._prog,"u_cellSize"),time:n.getUniformLocation(this._prog,"u_time"),sylPhaseStart:n.getUniformLocation(this._prog,"u_sylPhaseStart"),sylHalo:n.getUniformLocation(this._prog,"u_sylHalo"),sylCount:n.getUniformLocation(this._prog,"u_sylCount"),bgAlpha:n.getUniformLocation(this._prog,"u_bgAlpha"),ascii:n.getUniformLocation(this._prog,"u_ascii"),grunge:n.getUniformLocation(this._prog,"u_grunge"),cmykLut:n.getUniformLocation(this._prog,"u_cmykLut"),curveMode:n.getUniformLocation(this._prog,"u_curveMode"),grungeTile:n.getUniformLocation(this._prog,"u_grungeTile"),grungeMid:n.getUniformLocation(this._prog,"u_grungeMid")},this._asciiTex=n.createTexture(),this._uploadAscii(),this._grungeTex=n.createTexture(),this._uploadGrunge(ym(),[xn.tile,xn.tile]);{const a=new Image;a.onload=()=>this._gl&&this._uploadGrunge(a,[a.naturalWidth*xn.imgScale,a.naturalHeight*xn.imgScale]),a.src=`/asemic/${xn.img}`}if(this._cmykLutTex=n.createTexture(),this._cmykLutReady=!1,xi&&Zi){const a=new Image;a.onload=()=>this._gl&&this._uploadCmykLut(a),a.src=`/asemic/${M_}`}wm().then(()=>this._gl&&this._uploadAscii(),()=>{}),this._resize(),this._onResize=()=>{this._wake(),this._resize()},window.addEventListener("resize",this._onResize),this._lastActivity=performance.now(),this._raf=requestAnimationFrame(this._animate)}update(t,n,i,a,o,r){if(this._wake(),this._JAMO=i,this._sylItems=t,this._positions=n,this._sylSize=a??this._estimateSylSize(n),this._widths=o??null,this._heights=r??null,!i||t.length===0){this._rows=[],this._wordCache.clear(),this._active=!1;return}this._syncRows(t,n,i),this._active=!0}setRect(t){this._rect=t??null}setScrollAxis(t){t!==this._scrollAxis&&(this._scrollAxis=t,this._scrollBase=this._slide=0,this._scrollJump=!0)}scrollTo(t){t=Math.max(0,t);const n=t-this._scrollBase;this._scrollJump||n<0?this._slide=0:this._slide+=n,this._scrollJump=!1,this._scrollBase=t,this._slide&&this._wake()}get scrollBase(){return this._scrollBase}get shownScrollBase(){return this._scrollBase-this._slide}async flushQueue(){this._wake(),await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t)))}captureFrame(){if(!this._gl||!this._canvas)return null;const t=this._time;return this._time=0,this._draw(),this._time=t,this._canvas.toDataURL("image/png")}clearAccum(){const t=this._gl;if(t)for(const n of this._wordCache.values())n._glTex&&t.deleteTexture(n._glTex);this._wordCache.clear(),this._rows=[],this._sylItems=[],this._positions=[],this._widths=null,this._heights=null,this._stepCount=0,this._active=!1,this._scrollBase=this._slide=0,this._scrollJump=!0,this._draw()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize);const t=this._gl;if(t){for(const n of this._wordCache.values())n._glTex&&t.deleteTexture(n._glTex);this._quadBuf&&t.deleteBuffer(this._quadBuf),this._asciiTex&&t.deleteTexture(this._asciiTex),this._grungeTex&&t.deleteTexture(this._grungeTex),this._cmykLutTex&&t.deleteTexture(this._cmykLutTex),this._prog&&t.deleteProgram(this._prog)}this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._wordCache.clear()}_resize(){if(!this._canvas)return;const t=Math.min(window.devicePixelRatio||1,2);this._cssWidth=window.innerWidth,this._cssHeight=window.innerHeight,this._canvas.width=Math.round(this._cssWidth*t),this._canvas.height=Math.round(this._cssHeight*t),this._gl?.viewport(0,0,this._canvas.width,this._canvas.height)}_estimateSylSize(t){if(t.length<2)return _i;const n=Math.abs(t[1][0]-t[0][0])*window.innerWidth;return n>10?n:_i}_syncRows(t,n,i){const a=[];let o=[],r=-1/0;const s=this._cssWidth??window.innerWidth,c=this._cssHeight??window.innerHeight;for(let m=0;m<t.length;m++){const l=n[m][0]*s;l<=r+.5&&(a.push(o),o=[]);const h=this._widths?.[m]??this._sylSize,p=this._heights?.[m]??this._sylSize;o.push({syl:t[m],left:l-h*.5,top:n[m][1]*c-p*.5,w:h,h:p}),r=l}o.length>0&&a.push(o);const f=new Set;this._rows=a.map((m,l)=>{const h=[];let p=[];for(const S of m)p.length>0&&S.syl.wordId!==p[p.length-1].syl.wordId&&(h.push(p),p=[]),p.push(S);return p.length>0&&h.push(p),h.map(S=>{const x=S[0].left,_=S[0].top;for(const b of S)b.x=b.left-x;const u=`${S[0].syl.wordId}:${l}`;f.add(u);const T=Em(this._wordCache,u,S,i,this._sylSize);return T._origin=[x,_],T})});for(const[m,l]of Array.from(this._wordCache.entries()))f.has(m)||(l._glTex&&this._gl?.deleteTexture(l._glTex),this._wordCache.delete(m))}_animate=t=>{this._raf=requestAnimationFrame(this._animate);const i=t-this._lastActivity>J_?1e3/Q_:this._FRAME_INTERVAL;if(!(t-this._lastFrame<i)){if(this._lastFrame=t,this._flashPhase+=.08,this._time=t,this._active&&t-this._lastStep>=this._STEP_INTERVAL){this._lastStep=t,this._stepCount++;for(const a of this._rows)for(const o of a)Mm(o,t)}for(const a of this._rows)for(const o of a){let r=o._needsUpload;for(const s of o.points){const c=s.currentScale;s.currentScale+=(s.targetScale-s.currentScale)*s_,Math.abs(s.currentScale-c)>.001&&(r=!0)}r&&(Lm(this._gl,o,this._flashPhase),o._needsUpload=!1)}this._slide&&(this._slide*=1-N_,Math.abs(this._slide)<.3&&(this._slide=0)),this._draw()}};_wake(){const t=performance.now();if(this._paused){const n=t-this._pausedAt;for(const i of this._rows)for(const a of i){for(const o of a.syllables)o.cyclePhaseStart+=n;a._needsUpload=!0}this._lastFrame=0,this._lastStep=t,this._paused=!1,this._raf=requestAnimationFrame(this._animate)}this._lastActivity=t}_uploadCmykLut(t){const n=this._gl,i=document.createElement("canvas");i.width=i.height=512;const a=i.getContext("2d",{willReadFrequently:!0});a.drawImage(t,0,0);const o=a.getImageData(0,0,512,512).data,r=64,s=new Uint8Array(r*r*r*4);for(let c=0;c<r;c++)for(let f=0;f<r;f++)for(let m=0;m<r;m++){const l=(((c>>3)*r+f)*512+(c&7)*r+m)*4;s.set(o.subarray(l,l+4),((c*r+f)*r+m)*4)}n.activeTexture(n.TEXTURE3),n.bindTexture(n.TEXTURE_3D,this._cmykLutTex),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.texImage3D(n.TEXTURE_3D,0,n.RGBA8,r,r,r,0,n.RGBA,n.UNSIGNED_BYTE,s);for(const c of[n.TEXTURE_WRAP_S,n.TEXTURE_WRAP_T,n.TEXTURE_WRAP_R])n.texParameteri(n.TEXTURE_3D,c,n.CLAMP_TO_EDGE);n.texParameteri(n.TEXTURE_3D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_3D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.activeTexture(n.TEXTURE0),this._cmykLutReady=!0}_uploadGrunge(t,n){const i=this._gl;this._grungeTile=n;const a=document.createElement("canvas");a.width=a.height=64;const o=a.getContext("2d",{willReadFrequently:!0});o.drawImage(t,0,0,64,64);const r=o.getImageData(0,0,64,64).data;let s=0,c=0;for(let f=0;f<r.length;f+=4)s+=r[f],c+=r[f+1];this._grungeMid=[s/(255*4096),c/(255*4096)],i.activeTexture(i.TEXTURE2),i.bindTexture(i.TEXTURE_2D,this._grungeTex),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,t),i.generateMipmap(i.TEXTURE_2D),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR_MIPMAP_LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.MIRRORED_REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.MIRRORED_REPEAT),i.activeTexture(i.TEXTURE0)}_uploadAscii(){const t=this._gl;t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this._asciiTex),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,Cm()),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.activeTexture(t.TEXTURE0)}_draw(){const t=this._gl;if(!t)return;const n=this._transparent?0:1;t.clearColor(ji*n,ji*n,ji*n,n),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(this._prog),t.bindBuffer(t.ARRAY_BUFFER,this._quadBuf),t.uniform2f(this._uniforms.resolution,this._cssWidth??this._canvas.width,this._cssHeight??this._canvas.height),t.uniform1f(this._uniforms.gapPx,this._gapPxOverride??c_),t.uniform1f(this._uniforms.corner,f_),t.uniform1f(this._uniforms.cutoff,u_),t.uniform1f(this._uniforms.sylSize,this._sylSize),t.uniform1f(this._uniforms.cellSize,Fn),t.uniform1f(this._uniforms.time,this._time??0),t.uniform1f(this._uniforms.bgAlpha,n),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this._asciiTex),t.uniform1i(this._uniforms.ascii,1),t.activeTexture(t.TEXTURE2),t.bindTexture(t.TEXTURE_2D,this._grungeTex),t.uniform1i(this._uniforms.grunge,2),t.uniform2f(this._uniforms.grungeTile,...this._grungeTile??[256,256]),t.uniform2f(this._uniforms.grungeMid,...this._grungeMid??[.5,.5]),t.activeTexture(t.TEXTURE3),t.bindTexture(t.TEXTURE_3D,this._cmykLutTex),t.uniform1i(this._uniforms.cmykLut,3),t.uniform1f(this._uniforms.curveMode,oo==="cmyk"&&this._cmykLutReady?1:0),t.activeTexture(t.TEXTURE0),t.uniform1i(this._uniforms.data,0);for(const i of this._rows)for(const a of i){const[o,r]=a._origin??[0,0],s=this._scrollAxis==="x"?this._slide:0,c=this._scrollAxis==="y"?this._slide:0;this._drawWord(t,a,o+s,r+c)}}_drawWord(t,n,i,a){const o=n.points.length;if(o===0||!n._glTex)return;const r=ra(n),s=xm(n),c=n.syllables,f=Math.min(c.length,jt),m=new Float32Array(jt),l=new Float32Array(jt),h=new Float32Array(jt);for(let p=0;p<f;p++)m[p]=c[p].x,l[p]=c[p].w,h[p]=c[p].h;t.bindTexture(t.TEXTURE_2D,n._glTex),t.uniform2f(this._uniforms.origin,i,a),t.uniform2f(this._uniforms.size,r,s),t.uniform1i(this._uniforms.count,Math.min(o,Fs)),t.uniform1fv(this._uniforms.sylOffsetX,m),t.uniform1fv(this._uniforms.sylWidth,l),t.uniform1fv(this._uniforms.sylHeight,h),t.uniform1fv(this._uniforms.sylPhaseStart,n._sylPhaseStart),xi&&t.uniform3fv(this._uniforms.sylHalo,Im(n,f)),t.uniform1i(this._uniforms.sylCount,Math.max(n._sylCount,1)),t.drawArrays(t.TRIANGLE_STRIP,0,4)}}const sa=Math.PI*2;function nn(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Vt(...e){let t=2166136261;for(const n of e){const i=String(n);for(let a=0;a<i.length;a++)t=Math.imul(t^i.charCodeAt(a),16777619)>>>0;t=Math.imul(t^44,16777619)>>>0}return t>>>0}const bt=(e,t,n)=>t+e()*(n-t);function ks(e=1){const t=n=>{const i=Math.sin((n+e)*127.1)*43758.5453;return i-Math.floor(i)};return n=>{const i=Math.floor(n),a=n-i,o=a*a*(3-2*a);return t(i)*(1-o)+t(i+1)*o}}function Vs(e,t){if(e.length<2)return e.map(o=>({x:o.x,y:o.y}));const n=[{x:e[0].x,y:e[0].y}];let i=n[0],a=0;for(let o=1;o<e.length;o++){let r=e[o].x,s=e[o].y,c=Math.hypot(r-i.x,s-i.y);for(;a+c>=t;){const f=(t-a)/c;i={x:i.x+(r-i.x)*f,y:i.y+(s-i.y)*f},n.push(i),c=Math.hypot(r-i.x,s-i.y),a=0}a+=c,i={x:r,y:s}}return n}function jo(e,t){let n=e;for(let i=0;i<t&&!(n.length<3);i++){const a=[n[0]];for(let o=1;o<n.length-1;o++)a.push({x:(n[o-1].x+n[o].x+n[o+1].x)/3,y:(n[o-1].y+n[o].y+n[o+1].y)/3});a.push(n[n.length-1]),n=a}return n}const Zo=(e,t)=>Math.max(0,Math.round(e/t));function la(e){for(let t=0;t<e.length;t++){const n=e[Math.max(0,t-1)],i=e[Math.min(e.length-1,t+1)],a=Math.atan2(i.y-n.y,i.x-n.x);e[t].angle=a,e[t].nx=Math.cos(a+Math.PI/2),e[t].ny=Math.sin(a+Math.PI/2)}return e}function En(e,t){if(!t||t.length===0)return null;if(t.length===1)return{...t[0]};e=Math.max(0,Math.min(t.length-1,e));const n=Math.floor(e),i=e-n,a=t[n],o=t[Math.min(t.length-1,n+1)];let r=o.angle-a.angle;r=Math.atan2(Math.sin(r),Math.cos(r));const s=a.angle+r*i;return{x:a.x+(o.x-a.x)*i,y:a.y+(o.y-a.y)*i,angle:s,nx:Math.cos(s+Math.PI/2),ny:Math.sin(s+Math.PI/2)}}function Dm(e){return[{px0:0,seed:e}]}function Um(e,t){let n=0;for(;n+1<e.length&&e[n+1].px0<=t;)n++;return n}const Nm=e=>e*e*(3-2*e);function so(e,t,n,i){const a=Um(e,t),o=t-e[a].px0,r=i(a,o);if(a>0&&n>0&&o<n){const s=i(a-1,t-e[a-1].px0);return s+(r-s)*Nm(o/n)}return r}const ca=(e,t,n)=>Math.min(t+1<e.length?e[t+1].px0:1/0,n),zs=e=>(e>>>0)%9973;function ns(e,t){const n=Math.sin(t*12.9898+zs(e)*78.233)*43758.5453;return(n-Math.floor(n))*2-1}function Vi(e,t,n,i=0,a=null){const[o,r]=e.companions,s=o+Math.floor(nn(Vt(i,"comp"))()*(r-o+1));return{id:t,birth:n,seed:i,plan:a?.length?a:Dm(i),nc:s,raw:[],spine:null,spineInk:null,compPolys:[],compPlan:null,decor:[],orbs:[],segCache:null}}function Kn(e,t,n,i){const a=e.raw[e.raw.length-1];return a&&Math.hypot(n-a.x,i-a.y)<t.minDist||e.raw.length>=t.maxRaw?!1:(e.raw.push({x:n,y:i}),!0)}function Fm(e,t){const n=Vs(e,t.spacing);return la(jo(n,Zo(t.spineSmooth,t.spacing)))}function Om(e,t,n){const i=nn(Vt(e.seed,"comp"));i();const a=[];for(let o=0;o<t;o++)a.push({amp:bt(i,n.wanderAmp[0],n.wanderAmp[1]),wanderLen:bt(i,n.wanderLen[0],n.wanderLen[1]),weaveAmp:bt(i,n.weaveAmp[0],n.weaveAmp[1]),weaveLen:bt(i,n.weaveLen[0],n.weaveLen[1]),weavePhase:bt(i,0,sa),nz:ks(bt(i,0,999)),swirly:i()>=n.noSwirlChance});return a}function Bm(e,t,n,i){const{plan:a}=e,o=[];for(let r=0;r<a.length&&o.length<i.maxSwirls;r++){if(!e.segCache.comps[r][t].swirly)continue;const s=nn(Vt(a[r].seed,"event",t)),c=ca(a,r,n);let f=a[r].px0,m=bt(s,i.eventGap[0],i.eventGap[1]);for(;o.length<i.maxSwirls&&f+m<=c;){if(f+=m,m=bt(s,i.eventGap[0],i.eventGap[1]),s()>i.eventProb)continue;const l=bt(s,i.swirlSpan[0],i.swirlSpan[1]);o.push({c:f+l+bt(s,0,i.spacing*6),span:l,R:bt(s,i.swirlRadius[0],i.swirlRadius[1]),turns:bt(s,i.swirlTurns[0],i.swirlTurns[1]),dir:s()<.5?1:-1,phase:bt(s,0,sa)})}}return o}function Gm(e,t,n){if(!n.decor)return[];const{plan:i}=e,a=[];for(let o=0;o<i.length;o++){const r=nn(Vt(i[o].seed,"decor")),s=ca(i,o,t);let c=i[o].px0,f=bt(r,n.decorGap[0],n.decorGap[1]);for(;c+f<=s;)c+=f,f=bt(r,n.decorGap[0],n.decorGap[1]),a.push({px:c,off:bt(r,-n.decorSpread,n.decorSpread),jx:bt(r,-4,4),jy:bt(r,-4,4),r:bt(r,n.decorRadius[0],n.decorRadius[1]),x:0,y:0})}return a}function Hm(e,t,n){const i=n.orb;if(!i?.on)return[];const{plan:a}=e,o=[];for(let r=0;r<a.length;r++){const s=ca(a,r,t);if(Array.isArray(a[r].orbs)){a[r].orbs.forEach((h,p)=>{const S=a[r].px0+h.at;S>s||o.push({px:S,off:h.off??0,r:h.r,fill:h.fill,auto:!!h.auto,rays:h.rays,width:h.width,spikes:h.spikes,seed:Vt(a[r].seed,"orb",p),x:0,y:0})});continue}const c=nn(Vt(a[r].seed,"orb"));let f=a[r].px0,m=bt(c,i.gap[0],i.gap[1]),l=0;for(;f+m<=s;){f+=m,m=bt(c,i.gap[0],i.gap[1]);const h=c()<=i.prob,p={px:f,off:bt(c,-i.spread,i.spread),r:bt(c,i.radius[0],i.radius[1]),seed:Vt(a[r].seed,"orb",l++),x:0,y:0};h&&o.push(p)}}return o}function is(e,t,n){const i=(t.length-1)*n.spacing;for(const a of e){const o=En(Math.min(a.px,i)/n.spacing,t);o&&(a.x=o.x+o.nx*a.off+(a.jx??0),a.y=o.y+o.ny*a.off+(a.jy??0),a.ang=o.angle)}}const km=40;function Vm(e,t,n){for(const i of e){if(!i.auto||!i.off)continue;const a=En(Math.min(i.px,(t.length-1)*n.spacing)/n.spacing,t);if(!a)continue;const o=Math.abs(i.off)+i.r,r=o*o,s=Math.min(t.length,Math.floor((i.px+km)/n.spacing)+1),c=f=>{const m=a.x+a.nx*i.off*f,l=a.y+a.ny*i.off*f;let h=0;for(let p=0;p<s;p++){const S=t[p].x-m,x=t[p].y-l;S*S+x*x<r&&h++}return h};c(-1)<c(1)&&(i.off=-i.off,i.x=a.x+a.nx*i.off+(i.jx??0),i.y=a.y+a.ny*i.off+(i.jy??0))}}function zm(e,t,n){const i=n.spineFx,{plan:a}=e;let o=0;const r=i.roughen;r?.on&&r.size&&(o+=so(a,t,n.segBlend,(c,f)=>{const m=f/r.gap,l=Math.floor(m),h=m-l,p=ns(a[c].seed,l),S=ns(a[c].seed,l+1),x=r.mode==="corner"?h:(1-Math.cos(h*Math.PI))*.5;return(p+(S-p)*x)*r.size}));const s=i.puckerBloat;return s?.on&&s.amount&&(o+=so(a,t,n.segBlend,(c,f)=>{const m=f/s.gap%1,l=Math.sin(m*Math.PI);return s.amount>0?s.amount*l:-s.amount*(1-l)*(1-l)})),o}function Wm(e,t,n){const i=n.spineFx;if(!i||!(i.roughen?.on||i.puckerBloat?.on))return null;const a=n.spacing,o=t.map((r,s)=>{const c=zm(e,s*a,n);return{x:r.x+r.nx*c,y:r.y+r.ny*c}});return la(o)}function Xm(e,t,n,i){const a=i.goo.reach;if(!Array.isArray(a))return a;const o=t==="comp"&&e.compPlan?e.compPlan:e.plan,r=e.segCache?.reachNz;return r?so(o,n,i.segBlend,(s,c)=>a[0]+(a[1]-a[0])*r[s](c/i.goo.reachLen)):(a[0]+a[1])*.5}function Ym(e,t,n,i,a){const o=a.spacing,s=(e.length-1)*o-a.headLag;if(s<a.compStep*4)return[];const c=jo(e.map(T=>({x:T.x,y:T.y})),Zo(a.compBaseSmooth,o)),f=[0];for(let T=1;T<c.length;T++)f.push(f[T-1]+Math.hypot(c[T].x-c[T-1].x,c[T].y-c[T-1].y));const m=T=>{const b=Math.max(0,Math.min(c.length-1,T/o)),R=Math.floor(b);return R>=c.length-1?f[c.length-1]:f[R]+(f[R+1]-f[R])*(b-R)},l=la(Vs(c,o)),h=(l.length-1)*o,p=t.plan.map(T=>({px0:m(T.px0),seed:T.seed}));t.compPlan=p;const S=i.map(T=>({...T,c:m(T.c)})),x=t.segCache.comps,_=[],u=Math.min(s,h);for(let T=0;T<=u;T+=a.compStep){const b=En(T/o,l),R=so(p,T,a.segBlend,(L,O)=>{const v=x[L][n],g=O/v.wanderLen,w=v.amp*1.6*(v.nz(g)-v.nz(g+111.3)),U=v.weaveAmp*Math.sin(O/v.weaveLen*sa+v.weavePhase);return w+U});let G=b.nx*R,N=b.ny*R;for(const L of S){const O=(T-L.c)/L.span;if(O<=-1||O>=1)continue;const v=Math.cos(O*Math.PI/2)**2,g=L.phase+L.dir*(O+1)*Math.PI*L.turns;G+=Math.cos(g)*L.R*v,N+=Math.sin(g)*L.R*v}_.push({x:b.x+G,y:b.y+N})}return jo(_,Zo(a.compSmooth,a.compStep))}function jn(e,t){if(e.raw.length<2){e.spine=null,e.spineInk=null,e.compPolys=[];return}const n=Fm(e.raw,t),i=(n.length-1)*t.spacing;e.segCache={comps:e.plan.map(a=>Om(a,e.nc,t)),reachNz:e.plan.map(a=>ks(zs(Vt(a.seed,"reach"))))},e.decor=Gm(e,i,t),is(e.decor,n,t),e.orbs=Hm(e,i,t),is(e.orbs,n,t),Vm(e.orbs,n,t),e.spine=n,e.spineInk=Wm(e,n,t),e.compPolys=[];for(let a=0;a<e.nc;a++){const o=Ym(n,e,a,Bm(e,a,i,t),t);o.length>=2&&e.compPolys.push(o)}}function os(e,t,n,i){const a=e.createShader(t);return e.shaderSource(a,n),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)||console.error(`[${i}] ${e.getShaderInfoLog(a)}`),a}function Ri(e,t,n,i){const a=e.createProgram();return e.attachShader(a,os(e,e.VERTEX_SHADER,t,i+".vert")),e.attachShader(a,os(e,e.FRAGMENT_SHADER,n,i+".frag")),e.linkProgram(a),e.getProgramParameter(a,e.LINK_STATUS)||console.error(`[${i}] ${e.getProgramInfoLog(a)}`),a}function yi(e,t){const n=new Map;return i=>(n.has(i)||n.set(i,e.getUniformLocation(t,i)),n.get(i))}function ii(e,t,n,i={}){const a=i.internal??e.RGBA16F,o=i.type??e.HALF_FLOAT,r=i.filter??e.LINEAR,s=i.data??null,c=e.createTexture();e.bindTexture(e.TEXTURE_2D,c),e.texImage2D(e.TEXTURE_2D,0,a,t,n,0,e.RGBA,o,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const f=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,f),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,c,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE&&console.error(`[glutil] FBO incomplete (${t}x${n})`),e.bindFramebuffer(e.FRAMEBUFFER,null),{tex:c,fbo:f,w:t,h:n}}function oi(e,t){t&&(e.deleteTexture(t.tex),e.deleteFramebuffer(t.fbo))}const qm=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);function $m(e){const t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,qm,e.STATIC_DRAW),t}function fa(e,t){const n=e.createVertexArray();return e.bindVertexArray(n),e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),n}function Km(e,t,n,i){let a=ii(e,t,n,i),o=ii(e,t,n,i);return{get read(){return a},get write(){return o},swap(){const r=a;a=o,o=r},drop(){oi(e,a),oi(e,o)}}}var jm=`#version 300 es

precision highp float;

layout(location = 0) in vec2 a_corner;  
layout(location = 1) in vec4 a_seg;     
layout(location = 2) in vec4 a_meta;    

uniform vec2 u_cssSize;                 

out vec2 v_px;                          
flat out vec4 v_seg;
flat out vec3 v_meta;                   
flat out float v_w;                     
flat out float v_kind;                  

const float KERNEL_NORM = 1.55;

void main() {
    vec2 a = a_seg.xy;
    vec2 b = a_seg.zw;
    float R = a_meta.x;

    vec2 ab = b - a;
    float L = length(ab);
    vec2 d = L > 1e-5 ? ab / L : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);

    
    float along = (a_corner.x * 0.5 + 0.5) * (L + 2.0 * R) - R;
    vec2 p = a + d * along + n * a_corner.y * R;

    v_px = p;
    v_seg = a_seg;
    v_meta = a_meta.xyz;
    v_kind = a_meta.w;
    
    v_w = KERNEL_NORM * (L / max(R, 1e-5));

    
    gl_Position = vec4(p.x / u_cssSize.x * 2.0 - 1.0, 1.0 - p.y / u_cssSize.y * 2.0, 0.0, 1.0);
}`,Zm=`#version 300 es

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
    float k = q * q * q * v_w;   
    if (k <= 0.0) discard;

    outField = v_kind > 0.5 ? vec4(0.0, 0.0, 0.0, k) : vec4(k, k * v_meta.y, k * v_meta.z, 0.0);
}`,ua=`#version 300 es

precision highp float;

layout(location = 0) in vec2 a_position;

out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,Jm=`#version 300 es

precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_baked;
uniform sampler2D u_live;
uniform sampler2D u_growth;  

uniform vec2 u_texel;       
uniform float u_pxPerTexel; 

uniform float u_th;
uniform float u_compCap;    
uniform float u_edge;

uniform vec3 u_paper;
uniform vec3 u_ink;

uniform int u_shade;
uniform vec3 u_light;       
uniform float u_normalZ;    
uniform float u_amb;
uniform float u_diff;
uniform float u_spec;
uniform float u_specPow;
uniform float u_fres;
uniform float u_bands;      

uniform vec3 u_growInk;     
uniform float u_growGain;   
uniform float u_growOpacity;

uniform vec2 u_cssSize;     
uniform float u_pixel;      
uniform float u_pixelHi;    
uniform vec2 u_pixelVar;    
uniform vec2 u_origin;      
uniform vec4 u_grain;       
uniform float u_grainWidth; 

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

vec2 curlWind(vec2 p, float t) {
    const float e = 0.09;
    
    
    
    vec2 d = 6.0 * vec2(sin(t * 0.13), cos(t * 0.11));
    float n1 = fbm(p + vec2(0.0, e) + d);
    float n2 = fbm(p - vec2(0.0, e) + d);
    float n3 = fbm(p + vec2(e, 0.0) + d);
    float n4 = fbm(p - vec2(e, 0.0) + d);
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(19.19, 7.77)));
}

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

const float GRAD = 1.5;     

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

float grainCut(float f, vec2 css) {
    if (u_grain.x <= 0.0) return 0.0;
    float b = f * u_grain.y + u_grain.z * (vnoise((css - u_origin) * u_grain.w) * 2.0 - 1.0);
    float d = abs(fract(b + 0.5) - 0.5) * 2.0;     
    return u_grain.x * (1.0 - smoothstep(u_grainWidth * 0.5, u_grainWidth, d));
}

void main() {
    
    vec2 css = vec2(v_uv.x, 1.0 - v_uv.y) * u_cssSize;
    vec2 uv = v_uv;
    float px = u_pixel;
    vec2 org = u_origin;
    if (u_pixel > 0.0 && u_pixelHi > u_pixel) {
        
        vec2 blk = floor((css - u_origin) / u_pixelVar.x);
        float n = u_pixelVar.y > 0.0 ? vnoise((blk + 0.5) * u_pixelVar.x * u_pixelVar.y) : hash21(blk);
        px = min(u_pixelHi, u_pixel + floor(clamp(n, 0.0, 0.999) * (u_pixelHi - u_pixel + 1.0)));
        org = u_origin + blk * u_pixelVar.x;
    }
    if (px > 0.0) {
        css = (floor((css - org) / px) + 0.5) * px + org;
        uv = vec2(css.x / u_cssSize.x, 1.0 - css.y / u_cssSize.y);
    }
    float f0 = fieldAt(uv);
    if (px > 0.0) {
        
        vec2 s = vec2(px / 3.0) / u_cssSize * vec2(1.0, -1.0);
        for (int j = -1; j <= 1; j++)
            for (int i = -1; i <= 1; i++)
                if (i != 0 || j != 0) f0 = max(f0, fieldAt(uv + vec2(float(i), float(j)) * s));
    }
    float f = f0 - grainCut(f0, css);

    
    
    if (u_shade == 3) {
        vec3 c = mix(u_paper, vec3(0.06, 0.06, 0.09), clamp(f / 3.0, 0.0, 1.0));
        float iso = abs(fract(f * 2.0) - 0.5) * 2.0;             
        float onField = step(0.05, f);                           
        c = mix(c, vec3(0.25, 0.55, 1.0), smoothstep(0.9, 1.0, iso) * 0.55 * onField);
        c = mix(c, vec3(1.0, 0.35, 0.1), (1.0 - smoothstep(0.0, max(u_edge, 1e-4), abs(f - u_th))) * onField);
        
        c = mix(c, vec3(0.3, 0.9, 0.4), clamp(texture(u_growth, v_uv).r * u_growGain, 0.0, 1.0) * 0.7);
        outColor = vec4(c, 1.0);
        return;
    }

    float a = smoothstep(u_th - u_edge, u_th + u_edge, f);

    vec3 col = u_ink;

    if (a > 0.0) {
        if (u_shade != 0) {
            
            
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

    
    float ag = clamp(texture(u_growth, v_uv).r * u_growGain, 0.0, 1.0) * (1.0 - a) * u_growOpacity;

    
    
    
    
    
    float alpha = clamp(a + ag, 0.0, 1.0);
    vec3 rgb = alpha > 1e-4 ? (col * a + u_growInk * ag) / alpha : col;

    outColor = vec4(rgb, alpha);
}`;const Qi=8;function Qm(e,t){!e.getExtension("EXT_color_buffer_half_float")&&!e.getExtension("EXT_color_buffer_float")&&console.warn("[field] float 렌더타겟 확장이 없습니다 — 밀도 누적이 8bit 로 깎입니다");const n=Ri(e,jm,Zm,"stamp"),i=Ri(e,ua,Jm,"composite"),a=yi(e,n),o=yi(e,i),r=e.createBuffer();let s=0;const c=e.createVertexArray();e.bindVertexArray(c),e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,r);const f=Qi*4;e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,f,0),e.vertexAttribDivisor(1,1),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,f,16),e.vertexAttribDivisor(2,1),e.bindVertexArray(null);const m=fa(e,t);let l=1,h=1,p=1,S=1,x=1,_=null,u=null;function T(U,k,W,J){p=U,S=k,l=Math.max(1,W),h=Math.max(1,J),x=p/l,oi(e,_),oi(e,u),_=ii(e,l,h),u=ii(e,l,h)}function b(U){const k=U==="baked"?_:u;e.bindFramebuffer(e.FRAMEBUFFER,k.fbo),e.viewport(0,0,l,h),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null)}function R(U,k,W){if(!W)return;const J=U==="baked"?_:u;e.bindBuffer(e.ARRAY_BUFFER,r),k.length>s?(e.bufferData(e.ARRAY_BUFFER,k,e.DYNAMIC_DRAW),s=k.length):e.bufferSubData(e.ARRAY_BUFFER,0,k),e.bindFramebuffer(e.FRAMEBUFFER,J.fbo),e.viewport(0,0,l,h),e.useProgram(n),e.bindVertexArray(c),e.uniform2f(a("u_cssSize"),p,S),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE),e.drawArraysInstanced(e.TRIANGLES,0,6,W),e.disable(e.BLEND),e.bindVertexArray(null),e.bindFramebuffer(e.FRAMEBUFFER,null)}function G(U,k,W){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,k,W),e.disable(e.BLEND),e.useProgram(i),e.bindVertexArray(m),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,_.tex),e.uniform1i(o("u_baked"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,u.tex),e.uniform1i(o("u_live"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,U.growthTex??_.tex),e.uniform1i(o("u_growth"),2),e.uniform2f(o("u_texel"),1/l,1/h),e.uniform1f(o("u_pxPerTexel"),x),e.uniform1f(o("u_th"),U.th),e.uniform1f(o("u_compCap"),U.compCap??0),e.uniform1f(o("u_edge"),U.edge),e.uniform3fv(o("u_paper"),U.paper),e.uniform3fv(o("u_ink"),U.ink),e.uniform1i(o("u_shade"),U.shade),e.uniform3fv(o("u_light"),U.light),e.uniform1f(o("u_normalZ"),U.normalZ),e.uniform1f(o("u_amb"),U.amb),e.uniform1f(o("u_diff"),U.diff),e.uniform1f(o("u_spec"),U.spec),e.uniform1f(o("u_specPow"),U.specPow),e.uniform1f(o("u_fres"),U.fres),e.uniform1f(o("u_bands"),U.bands),e.uniform3fv(o("u_growInk"),U.growInk),e.uniform1f(o("u_growGain"),U.growGain),e.uniform1f(o("u_growOpacity"),U.growOpacity),e.uniform2f(o("u_cssSize"),p,S);const J=Array.isArray(U.pixel)?U.pixel:[U.pixel??0,U.pixel??0];e.uniform1f(o("u_pixel"),J[0]),e.uniform1f(o("u_pixelHi"),J[1]),e.uniform2f(o("u_pixelVar"),U.pixelVar?.block??12,U.pixelVar?.scale??.02),e.uniform2fv(o("u_origin"),U.origin??[0,0]);const X=U.grain??{};e.uniform4f(o("u_grain"),X.amount??0,X.freq??1,X.warp??0,X.scale??.03),e.uniform1f(o("u_grainWidth"),X.width??.35),e.drawArrays(e.TRIANGLES,0,6),e.bindVertexArray(null)}function N(U){const k=(U&32768)>>15,W=(U&31744)>>10,J=U&1023;return W===0?(k?-1:1)*Math.pow(2,-14)*(J/1024):W===31?J?NaN:(k?-1:1)*(1/0):(k?-1:1)*Math.pow(2,W-15)*(1+J/1024)}const L=new Float32Array(4),O=new Uint16Array(4);function v(U,k,W="baked"){const J=W==="baked"?_:u,X=Math.round(U/p*l),ie=Math.round((1-k/S)*h);e.bindFramebuffer(e.FRAMEBUFFER,J.fbo);const Z=e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE);let he;Z===e.HALF_FLOAT?(e.readPixels(X,ie,1,1,e.RGBA,e.HALF_FLOAT,O),he=Array.from(O,N)):(e.readPixels(X,ie,1,1,e.RGBA,e.FLOAT,L),he=Array.from(L)),e.bindFramebuffer(e.FRAMEBUFFER,null);const[we,He,$e,ft]=he;return{density:we,comp:ft,strokeId:we>1e-4?He/we:0,birth:we>1e-4?$e/we:0}}return{resize:T,clear:b,stamp:R,composite:G,probe:v,textures:()=>({baked:_.tex,live:u.tex}),texel:()=>[1/l,1/h]}}var eg=`#version 300 es

precision highp float;

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

vec2 curlWind(vec2 p, float t) {
    const float e = 0.09;
    
    
    
    vec2 d = 6.0 * vec2(sin(t * 0.13), cos(t * 0.11));
    float n1 = fbm(p + vec2(0.0, e) + d);
    float n2 = fbm(p - vec2(0.0, e) + d);
    float n3 = fbm(p + vec2(e, 0.0) + d);
    float n4 = fbm(p - vec2(e, 0.0) + d);
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(19.19, 7.77)));
}

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

in vec2 v_uv;
out vec4 outGrowth;

uniform sampler2D u_prev;    
uniform sampler2D u_baked;
uniform sampler2D u_live;

uniform vec2 u_fieldTexel;   
uniform vec2 u_cssSize;      
uniform float u_time;
uniform float u_dt;

uniform float u_th;          
uniform float u_compCap;    
uniform float u_decay;       
uniform float u_outward;     
uniform float u_curlAmp;     
uniform float u_curlScale;   
uniform float u_curlSpeed;
uniform float u_source;      
uniform float u_bandLo;      
uniform float u_bandHi;
uniform float u_nowMin;      
uniform float u_ageDelay;    

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

void main() {
    vec2 px = v_uv * u_cssSize;

    
    vec2 g = vec2(
        fieldAt(v_uv + vec2(u_fieldTexel.x, 0.0)) - fieldAt(v_uv - vec2(u_fieldTexel.x, 0.0)),
        fieldAt(v_uv + vec2(0.0, u_fieldTexel.y)) - fieldAt(v_uv - vec2(0.0, u_fieldTexel.y))
    );
    vec2 outward = length(g) > 1e-6 ? -normalize(g) : vec2(0.0);

    vec2 vel = outward * u_outward + curlWind(px * u_curlScale, u_time * u_curlSpeed) * u_curlAmp;
    vec2 back = v_uv - vel * u_dt / u_cssSize;   
    float prev = texture(u_prev, back).r * pow(u_decay, u_dt * 60.0);

    
    float f = fieldAt(v_uv);
    float band = smoothstep(u_th - u_bandLo, u_th, f) * (1.0 - smoothstep(u_th, u_th + u_bandHi, f));

    
    vec4 bk = texture(u_baked, v_uv);
    float birth = bk.r > 1e-4 ? bk.b / bk.r : u_nowMin;
    float age = max(u_nowMin - birth, 0.0);
    float gate = smoothstep(u_ageDelay, u_ageDelay * 2.5, age);

    float src = band * u_source * gate;

    outGrowth = vec4(max(prev, src), 0.0, 0.0, 0.0);
}`;function tg(e,t){const n=Ri(e,ua,eg,"growth"),i=yi(e,n),a=fa(e,t);let o=null,r=1,s=1,c=1,f=1;function m(S,x,_,u){c=S,f=x,r=Math.max(1,_),s=Math.max(1,u),o&&o.drop(),o=Km(e,r,s),l()}function l(){for(let S=0;S<2;S++)e.bindFramebuffer(e.FRAMEBUFFER,o.write.fbo),e.viewport(0,0,r,s),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),o.swap();e.bindFramebuffer(e.FRAMEBUFFER,null)}function h(S){e.bindFramebuffer(e.FRAMEBUFFER,o.write.fbo),e.viewport(0,0,r,s),e.disable(e.BLEND),e.useProgram(n),e.bindVertexArray(a),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,o.read.tex),e.uniform1i(i("u_prev"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,S.bakedTex),e.uniform1i(i("u_baked"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,S.liveTex),e.uniform1i(i("u_live"),2),e.uniform2fv(i("u_fieldTexel"),S.fieldTexel),e.uniform2f(i("u_cssSize"),c,f),e.uniform1f(i("u_time"),S.time),e.uniform1f(i("u_dt"),S.dt),e.uniform1f(i("u_th"),S.th),e.uniform1f(i("u_compCap"),S.compCap??0),e.uniform1f(i("u_decay"),S.decay),e.uniform1f(i("u_outward"),S.outward),e.uniform1f(i("u_curlAmp"),S.curlAmp),e.uniform1f(i("u_curlScale"),S.curlScale),e.uniform1f(i("u_curlSpeed"),S.curlSpeed),e.uniform1f(i("u_source"),S.source),e.uniform1f(i("u_bandLo"),S.bandLo),e.uniform1f(i("u_bandHi"),S.bandHi),e.uniform1f(i("u_nowMin"),S.nowMin),e.uniform1f(i("u_ageDelay"),S.ageDelay),e.drawArrays(e.TRIANGLES,0,6),e.bindVertexArray(null),e.bindFramebuffer(e.FRAMEBUFFER,null),o.swap()}return{resize:m,clear:l,step:h,texture:()=>o.read.tex}}var ng=`#version 300 es

precision highp float;

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

vec2 curlWind(vec2 p, float t) {
    const float e = 0.09;
    
    
    
    vec2 d = 6.0 * vec2(sin(t * 0.13), cos(t * 0.11));
    float n1 = fbm(p + vec2(0.0, e) + d);
    float n2 = fbm(p - vec2(0.0, e) + d);
    float n3 = fbm(p + vec2(e, 0.0) + d);
    float n4 = fbm(p - vec2(e, 0.0) + d);
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(19.19, 7.77)));
}

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

in vec2 v_uv;
out vec4 outState;

uniform sampler2D u_prev;
uniform sampler2D u_baked;
uniform sampler2D u_live;

uniform vec2 u_fieldTexel;
uniform vec2 u_cssSize;
uniform float u_time;
uniform uint u_frame;       
uniform float u_dt;

uniform float u_th;
uniform float u_compCap;    
uniform float u_spawnTol;   
uniform float u_spawnRate;  
                            
uniform float u_lifespan;   
uniform float u_lifeVar;    
uniform float u_curlAmp;    
uniform float u_curlScale;
uniform float u_curlSpeed;
uniform float u_flow;       
uniform float u_repel;      

const int SPAWN_TRIES = 8;

vec2 fieldUV(vec2 px) {
    return vec2(px.x / u_cssSize.x, 1.0 - px.y / u_cssSize.y);
}

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
        
        
        uvec2 cell = uvec2(gl_FragCoord.xy);

        
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

    
    vec2 g = gradPx(p);
    vec2 outward = length(g) > 1e-6 ? -normalize(g) : vec2(0.0);
    vec2 tangent = length(g) > 1e-6 ? normalize(vec2(-g.y, g.x)) : vec2(0.0);

    vec2 vel = curlWind(p * u_curlScale, u_time * u_curlSpeed) * u_curlAmp
             + tangent * u_flow
             + outward * u_repel;

    p += vel * u_dt;
    
    float lifeScale = 1.0 + u_lifeVar * (seed * 2.0 - 1.0);
    life -= u_dt / max(u_lifespan * lifeScale, 1e-3);

    
    if (p.x < -20.0 || p.y < -20.0 || p.x > u_cssSize.x + 20.0 || p.y > u_cssSize.y + 20.0)
        life = 0.0;

    outState = vec4(p, max(life, 0.0), seed);
}`,ig=`#version 300 es

precision highp float;

uniform sampler2D u_state;
uniform ivec2 u_stateSize;
uniform vec2 u_cssSize;
uniform float u_size;       
uniform float u_dpr;

out float v_life;

void main() {
    int i = gl_VertexID;
    ivec2 t = ivec2(i % u_stateSize.x, i / u_stateSize.x);
    vec4 s = texelFetch(u_state, t, 0);

    v_life = s.z;

    if (s.z <= 0.0) {
        
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 1.0;
        return;
    }

    
    float fade = smoothstep(0.0, 0.15, s.z) * smoothstep(1.0, 0.85, s.z);
    gl_PointSize = max(u_size * u_dpr * (0.35 + 0.65 * fade), 1.0);
    gl_Position = vec4(s.x / u_cssSize.x * 2.0 - 1.0, 1.0 - s.y / u_cssSize.y * 2.0, 0.0, 1.0);
}`,og=`#version 300 es

precision highp float;

in float v_life;
out vec4 outColor;

uniform vec3 u_ink;
uniform float u_opacity;

void main() {
    
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.55, 1.0, d);
    if (mask <= 0.0) discard;

    
    float fade = smoothstep(0.0, 0.2, v_life) * smoothstep(1.0, 0.8, v_life);
    outColor = vec4(u_ink, mask * fade * u_opacity);
}`;function ag(e,t,n=128){const i=!!e.getExtension("EXT_color_buffer_float");i||console.warn("[particles] EXT_color_buffer_float 없음 — 16F 로 대체(위치 정밀도 저하)");const a=i?{internal:e.RGBA32F,type:e.FLOAT,filter:e.NEAREST}:{internal:e.RGBA16F,type:e.HALF_FLOAT,filter:e.NEAREST},o=Ri(e,ua,ng,"pupdate"),r=Ri(e,ig,og,"particle"),s=yi(e,o),c=yi(e,r),f=fa(e,t),m=e.createVertexArray(),l=n*n;let h=null,p=null,S=1,x=1,_=0;function u(){const L=new Float32Array(l*4);for(let O=0;O<l;O++)L[O*4+0]=0,L[O*4+1]=0,L[O*4+2]=0,L[O*4+3]=Math.random();return L}function T(){oi(e,h),oi(e,p),h=ii(e,n,n,{...a,data:u()}),p=ii(e,n,n,a)}function b(L,O){S=L,x=O,h||T()}function R(L){e.bindFramebuffer(e.FRAMEBUFFER,p.fbo),e.viewport(0,0,n,n),e.disable(e.BLEND),e.useProgram(o),e.bindVertexArray(f),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,h.tex),e.uniform1i(s("u_prev"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,L.bakedTex),e.uniform1i(s("u_baked"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,L.liveTex),e.uniform1i(s("u_live"),2),e.uniform2fv(s("u_fieldTexel"),L.fieldTexel),e.uniform2f(s("u_cssSize"),S,x),e.uniform1f(s("u_time"),L.time),e.uniform1ui(s("u_frame"),_++>>>0),e.uniform1f(s("u_dt"),L.dt),e.uniform1f(s("u_th"),L.th),e.uniform1f(s("u_compCap"),L.compCap??0),e.uniform1f(s("u_spawnTol"),L.spawnTol),e.uniform1f(s("u_spawnRate"),L.spawnRate),e.uniform1f(s("u_lifespan"),L.lifespan),e.uniform1f(s("u_lifeVar"),L.lifeVar),e.uniform1f(s("u_curlAmp"),L.curlAmp),e.uniform1f(s("u_curlScale"),L.curlScale),e.uniform1f(s("u_curlSpeed"),L.curlSpeed),e.uniform1f(s("u_flow"),L.flow),e.uniform1f(s("u_repel"),L.repel),e.drawArrays(e.TRIANGLES,0,6),e.bindVertexArray(null),e.bindFramebuffer(e.FRAMEBUFFER,null);const O=h;h=p,p=O}function G(L,O,v,g){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,O,v),e.enable(e.BLEND),e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(r),e.bindVertexArray(m),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,h.tex),e.uniform1i(c("u_state"),0),e.uniform2i(c("u_stateSize"),n,n),e.uniform2f(c("u_cssSize"),S,x),e.uniform1f(c("u_size"),L.size),e.uniform1f(c("u_dpr"),g),e.uniform3fv(c("u_ink"),L.ink),e.uniform1f(c("u_opacity"),L.opacity),e.drawArrays(e.POINTS,0,l),e.bindVertexArray(null),e.disable(e.BLEND)}function N(){const L=new Float32Array(l*4);e.bindFramebuffer(e.FRAMEBUFFER,h.fbo),e.readPixels(0,0,n,n,e.RGBA,e.FLOAT,L),e.bindFramebuffer(e.FRAMEBUFFER,null);let O=0,v=1/0,g=-1/0;for(let U=0;U<l;U++)L[U*4+2]>0&&(O++,v=Math.min(v,L[U*4]),g=Math.max(g,L[U*4]));const w=[];for(let U=0;U<3;U++)w.push(Array.from(L.slice(U*4,U*4+4),k=>+k.toFixed(4)));return{alive:O,count:l,xRange:O?[v,g]:null,sample:w}}return{resize:b,reset:T,step:R,draw:G,count:l,stats:N}}const rg=1.55;function Ws(e,t,n,i,a,o){const r=e-n,s=t-i,c=a-n,f=o-i,m=c*c+f*f,l=m>1e-9?Math.max(0,Math.min(1,(r*c+s*f)/m)):0,h=r-c*l,p=s-f*l;return Math.sqrt(h*h+p*p)}function sg(e,t){if(!(t>0))return e;const n=e/t;return e/Math.pow(1+n*n*n*n,.25)}function da(e,t,n,i,a,o,r){const s=Math.max(1,Math.ceil((o-i)/t)),c=Math.max(1,Math.ceil((r-a)/t)),f=Array.from({length:s*c},()=>[]),m=(l,h)=>h*s+l;for(let l=0;l<e.length;l++){const h=e[l],p=t+(h.r??0),S=Math.max(0,Math.floor((Math.min(h.ax,h.bx)-p-i)/t)),x=Math.min(s-1,Math.floor((Math.max(h.ax,h.bx)+p-i)/t)),_=Math.max(0,Math.floor((Math.min(h.ay,h.by)-p-a)/t)),u=Math.min(c-1,Math.floor((Math.max(h.ay,h.by)+p-a)/t));for(let T=_;T<=u;T++)for(let b=S;b<=x;b++)f[m(b,T)].push(l)}return(l,h)=>{const p=Math.max(0,Math.min(s-1,Math.floor((l-i)/t))),S=Math.max(0,Math.min(c-1,Math.floor((h-a)/t)));let x=0,_=0;for(const u of f[m(p,S)]){const T=e[u];let b=Ws(l,h,T.ax,T.ay,T.bx,T.by);if(T.r){if(b=Math.max(0,b-T.r),b>=t)continue;const L=1-b/t;x+=L*L*L*T.w;continue}if(b>=t)continue;const R=1-b/t,G=Math.hypot(T.bx-T.ax,T.by-T.ay),N=R*R*R*(rg*G/t);T.c&&n>0?_+=N:x+=N}return x+sg(_,n)}}function ha(e,t){let n=1/0,i=1/0,a=-1/0,o=-1/0;for(const r of e){const s=r.r??0;n=Math.min(n,r.ax-s,r.bx-s),a=Math.max(a,r.ax+s,r.bx+s),i=Math.min(i,r.ay-s,r.by-s),o=Math.max(o,r.ay+s,r.by+s)}return[n-t,i-t,a+t,o+t]}function as(e,{reach:t=28,th:n=.5,cell:i=10,compCap:a=0,ox:o=0,oy:r=0}={}){if(!e||e.length===0)return new Int32Array(0);const[s,c,f,m]=ha(e,t),l=da(e,t,a,s,c,f,m),h=Math.floor((s-o)/i),p=Math.floor((f-o)/i),S=Math.floor((c-r)/i),x=Math.floor((m-r)/i);if((p-h+1)*(x-S+1)>4e6)return new Int32Array(0);const _=[];for(let u=S;u<=x;u++)for(let T=h;T<=p;T++)l(o+(T+.5)*i,r+(u+.5)*i)>n&&_.push(T,u);return new Int32Array(_)}function rs(e,{reach:t=28,th:n=.5,cell:i=4,compCap:a=0}={}){const o=Xs(e,{reach:t,cell:i,compCap:a});return o?qs(o,n):[]}function lg(e,{reach:t=28,compCap:n=0}={}){if(!e||e.length===0)return()=>0;const[i,a,o,r]=ha(e,t);return da(e,t,n,i,a,o,r)}function Xs(e,{reach:t=28,cell:n=4,compCap:i=0,extra:a=null}={}){if(!e||e.length===0)return null;let[o,r,s,c]=ha(e,t);a&&(o=Math.min(o,a[0]),r=Math.min(r,a[1]),s=Math.max(s,a[2]),c=Math.max(c,a[3]));const f=Math.ceil((s-o)/n)+1,m=Math.ceil((c-r)/n)+1;if(f<2||m<2||f*m>4e6)return null;const l=new Float32Array(f*m),h=da(e,t,i,o,r,s,c);for(let p=0;p<m;p++)for(let S=0;S<f;S++)l[p*f+S]=h(o+S*n,r+p*n);return{f:l,x0:o,y0:r,nx:f,ny:m,cell:n,reach:t}}function Ys(e,t,n,i){let a=0;for(const o of e){const r=o.reach??t,s=Math.max(0,Ws(n,i,o.ax,o.ay,o.bx,o.by)-o.r);if(s>=r)continue;const c=1-s/r;a+=c*c*c*o.w}return a}function cg(e,t){const{f:n,x0:i,y0:a,nx:o,ny:r,cell:s,reach:c}=e,f=n.slice();if(!t.length)return{...e,f};let m=1/0,l=1/0,h=-1/0,p=-1/0;for(const T of t){const b=(T.reach??c)+T.r;m=Math.min(m,T.ax-b,T.bx-b),l=Math.min(l,T.ay-b,T.by-b),h=Math.max(h,T.ax+b,T.bx+b),p=Math.max(p,T.ay+b,T.by+b)}const S=Math.max(0,Math.floor((m-i)/s)),x=Math.min(o-1,Math.ceil((h-i)/s)),_=Math.max(0,Math.floor((l-a)/s)),u=Math.min(r-1,Math.ceil((p-a)/s));for(let T=_;T<=u;T++)for(let b=S;b<=x;b++)f[T*o+b]+=Ys(t,c,i+b*s,a+T*s);return{...e,f}}function qs({f:e,x0:t,y0:n,nx:i,ny:a,cell:o},r){const s=(l,h)=>e[h*i+l],c=(l,h,p)=>{const S=s(l,h),x=s(p,h),_=Math.abs(x-S)<1e-9?.5:(r-S)/(x-S);return{x:t+(l+(p-l)*_)*o,y:n+h*o}},f=(l,h,p)=>{const S=s(l,h),x=s(l,p),_=Math.abs(x-S)<1e-9?.5:(r-S)/(x-S);return{x:t+l*o,y:n+(h+(p-h)*_)*o}},m=[];for(let l=0;l<a-1;l++)for(let h=0;h<i-1;h++){const p=s(h,l)>r,S=s(h+1,l)>r,x=s(h+1,l+1)>r,_=s(h,l+1)>r;let u=(p?8:0)|(S?4:0)|(x?2:0)|(_?1:0);if(u===0||u===15)continue;const T=()=>c(h,l,h+1),b=()=>c(h,l+1,h+1),R=()=>f(h,l,l+1),G=()=>f(h+1,l,l+1);if(u===5||u===10){const L=(s(h,l)+s(h+1,l)+s(h+1,l+1)+s(h,l+1))*.25>r;u===5===L?m.push({a:R(),b:T()},{a:b(),b:G()}):m.push({a:R(),b:b()},{a:T(),b:G()});continue}switch(u){case 1:case 14:m.push({a:R(),b:b()});break;case 2:case 13:m.push({a:b(),b:G()});break;case 3:case 12:m.push({a:R(),b:G()});break;case 4:case 11:m.push({a:T(),b:G()});break;case 6:case 9:m.push({a:T(),b:b()});break;case 7:case 8:m.push({a:R(),b:T()});break}}return fg(m,o*.5)}function fg(e,t){const n=s=>`${Math.round(s.x/t)},${Math.round(s.y/t)}`,i=new Map,a=(s,c)=>{i.has(s)||i.set(s,[]),i.get(s).push(c)};e.forEach((s,c)=>{a(n(s.a),c),a(n(s.b),c)});const o=new Uint8Array(e.length),r=[];for(let s=0;s<e.length;s++){if(o[s])continue;o[s]=1;const c=[e[s].a,e[s].b];for(let f=0;f<2;f++)for(;;){const m=f===0?c[c.length-1]:c[0],l=(i.get(n(m))||[]).find(x=>!o[x]);if(l===void 0)break;o[l]=1;const h=e[l],S=Math.hypot(h.a.x-m.x,h.a.y-m.y)<=Math.hypot(h.b.x-m.x,h.b.y-m.y)?h.b:h.a;f===0?c.push(S):c.unshift(S)}c.length>=3&&r.push(c)}return r}const ug=60,dg=2,zi=e=>[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255];function hg(e={}){const t={seed:Math.random()*4294967295>>>0,spacing:6,spineSmooth:12,minDist:4,maxRaw:12e3,companions:[1,1],wanderAmp:[6,18],wanderLen:[500,950],weaveAmp:[16,32],weaveLen:[340,560],noSwirlChance:.1,maxSwirls:40,eventGap:[210,450],eventProb:.8,swirlSpan:[66,78],swirlRadius:[35,45],swirlTurns:[1,1.7],compBaseSmooth:96,compStep:3.6,compSmooth:11,headLag:12,segBlend:24,spineFx:{target:"ink",roughen:{on:!1,size:2,gap:8,mode:"smooth"},puckerBloat:{on:!1,amount:4,gap:24}},bead:{on:!1,gap:[40,90],radius:[1.5,3.5],speed:30,fill:"rgb(0, 0, 0)",stroke:null,lineWidth:.75,shape:"circle",star:{arms:6,scale:1.6,width:1,turn:0},glyph:{kinds:["sparkle","teardrop","balloon"],scale:2.4,turn:0},cluster:{on:!1,size:[2,5],gap:[6,14]},walker:{on:!1,speed:35,size:7,fill:"rgb(0, 0, 0)",morph:2.4,every:2,prob:.6,count:[2,5],gap:14,max:12,turn:0},main:{on:!1,radius:4,speed:40,fill:"rgb(0, 0, 0)",stroke:null,lineWidth:.75,glow:{on:!1,core:.45,falloff:1.4},fps:0,waitLive:!1}},orb:{on:!1,gap:[90,200],prob:.7,radius:[6,22],spread:26,fill:"#ffe83d",ring:null,ringWidth:.6,bulge:0,style:"disc",fan:{rays:13,width:2,len:2,near:40,far:320,min:.06,cap:"butt",reach:8,budget:2,heart:{on:!1,tint:"rgb(200, 40, 10)",amount:.5,extent:.8}},spike:{on:!1,spread:1.35,depth:.16,jitter:.7,fill:"rgb(255, 255, 255)",border:"rgb(0, 0, 0)",borderWidth:1},flow:{cell:2.6,dash:2.2,scale:.05,turns:1,follow:.85,falloff:220,drift:.6,style:"rgba(60, 45, 0, 0.7)",width:.5}},growPx:14,lineWidth:.5,baseStyle:"rgb(0, 0, 0)",spineCasing:{on:!1,width:2.5,borderWidth:1,fill:"rgb(255, 255, 255)",border:"rgb(0, 0, 0)"},companionStyle:"rgb(0, 0, 0)",companionDash:[3,4],arrowSize:7,decor:!0,decorGap:[20,80],decorSpread:30,decorRadius:[1.5,4],decorStyle:"rgb(0, 0, 0)",decorLineWidth:.75,decorFill:null,outline:{on:!0,reach:30,th:.55,cell:4,style:"rgba(0,0,0,0.45)",width:.6,dash:[],anim:{on:!1,speed:450},live:{on:!1,interval:60},glow:{on:!1,color:"rgb(120, 190, 180)",width:14,edge:.9,steps:8},stipple:{on:!1,color:"rgb(120, 190, 180)",width:18,gap:0,edge:1,gamma:1.6,cell:2.6,size:[.5,1.5],stretch:[1,1.9],interval:100,px:0}},base:{on:!1,fill:"rgb(255, 255, 255)",pad:null,shape:"outline",offset:[0,0],gradient:null},halo:{on:!1,cell:10,reach:null,th:null,fill:"rgb(214, 212, 208)",opacity:1,edge:{on:!1,color:"rgb(76, 159, 76)",width:1.5},ox:0,oy:0,interval:60,gradient:{on:!1,whole:!1,perSyl:!1,angle:90,stops:[[0,"rgb(214, 212, 208)"],[1,"rgb(180, 178, 172)"]]}},goo:{reach:18,reachLen:140,compCap:0,th:1.3,edge:.005,spine:!0,companion:!1,fieldScale:1.5,pixel:0,pixelVar:{block:12,scale:.02},grain:{amount:0,freq:1.2,warp:.6,scale:.035,width:.35}},paper:"#ffffff",ink:"#0a0a0a",shade:2,light:[-.45,.6,.66],normalZ:34,amb:.55,diff:.75,spec:.5,specPow:28,fres:.22,bands:3,grow:{on:!1,scale:.75,decay:.965,outward:26,curlAmp:55,curlScale:.006,curlSpeed:.06,source:1,bandLo:.35,bandHi:.12,ageDelay:.02,ink:"#6e6e66",gain:1.4,opacity:.5},part:{on:!1,side:128,spawnTol:.08,spawnRate:.04,lifespan:4.5,lifeVar:.5,curlAmp:34,curlScale:.0075,curlSpeed:.09,flow:26,repel:14,size:2.6,ink:"#141414",opacity:.55}},n=d=>d&&typeof d=="object"&&!Array.isArray(d),i=(d,M)=>{for(const[P,y]of Object.entries(M))n(y)&&n(d[P])?i(d[P],y):d[P]=y};e.cfg&&i(t,e.cfg);const a=!e.canvas&&!document.getElementById("c"),o=e.canvas??document.getElementById("c")??document.createElement("canvas");a&&document.body.appendChild(o);const r=document.createElement("canvas");o.parentNode?o.parentNode.insertBefore(r,o):document.body.prepend(r);const s=document.createElement("canvas");document.body.appendChild(s);for(const d of[r,o,s])d.style.position="fixed",d.style.left="0",d.style.top="0";r.style.background=e.paperBg===!1?"transparent":t.paper,o.style.background="transparent",r.style.pointerEvents="none",s.style.touchAction="none",e.mouse&&(s.style.cursor="crosshair"),e.mouse||(s.style.pointerEvents="none");const c=document.body.style.background;e.bodyBg!==!1&&(document.body.style.background=t.paper);const f=o.getContext("webgl2",{antialias:!1,alpha:!0,premultipliedAlpha:!1,preserveDrawingBuffer:!0});if(!f){console.error("WebGL2 를 쓸 수 없습니다");return}const m=$m(f),l=Qm(f,m),h=tg(f,m),p=ag(f,m,t.part.side),S=document.createElement("canvas"),x=S.getContext("2d"),_=document.createElement("canvas"),u=_.getContext("2d"),T=document.createElement("canvas"),b=T.getContext("2d"),R=document.createElement("canvas"),G=R.getContext("2d"),N=document.createElement("canvas"),L=N.getContext("2d"),O=s.getContext("2d"),v=r.getContext("2d");let g=0,w=0,U=1;function k(){U=Math.min(window.devicePixelRatio||1,e.dprCap??dg),g=Math.max(1,window.innerWidth),w=Math.max(1,window.innerHeight);for(const d of[o,s,S,r,T,R,_,N])d.width=Math.round(g*U),d.height=Math.round(w*U);for(const d of[r,o,s])d.style.width=g+"px",d.style.height=w+"px";for(const d of[x,O,v,b,G,u,L])d.setTransform(U,0,0,U,0,0);l.resize(g,w,Math.round(g*U*t.goo.fieldScale),Math.round(w*U*t.goo.fieldScale)),h.resize(g,w,Math.round(g*U*t.grow.scale),Math.round(w*U*t.grow.scale)),p.resize(g,w),ce()}function W(d,M,P,y,I,D,F){for(let q=1;q<M.length;q++){const ne=M[q-1],re=M[q];d.push(ne.x,ne.y,re.x,re.y,P((q-.5)*y),I,D,F)}}const J=d=>t.spineFx?.target==="all"&&d.spineInk||d.spine;function X(d,M){const P=!Array.isArray(t.goo.reach),y=F=>P?()=>t.goo.reach:q=>Xm(d,F,q,t),I=t.goo.compCap>0?1:0;if(t.goo.companion)for(const F of d.compPolys)W(M,F,y("comp"),t.compStep,d.id,d.birth,I);const D=J(d);t.goo.spine&&D&&W(M,D,y("spine"),t.spacing,d.id,d.birth,0)}function ie(d,M,P,y,I){if(!(M.length<2)){d.strokeStyle=P,d.lineWidth=y,d.lineJoin="round",d.lineCap="round",d.setLineDash(I||[]),d.beginPath(),d.moveTo(M[0].x,M[0].y);for(let D=1;D<M.length;D++)d.lineTo(M[D].x,M[D].y);d.stroke(),d.setLineDash([])}}function Z(d,M,P,y){if(!M||!P||!(y>0))return;const I=Math.atan2(M.y-P.y,M.x-P.x);d.fillStyle="rgb(0, 0, 0)",d.beginPath(),d.moveTo(M.x,M.y),d.lineTo(M.x-Math.cos(I-.4)*y,M.y-Math.sin(I-.4)*y),d.lineTo(M.x-Math.cos(I+.4)*y,M.y-Math.sin(I+.4)*y),d.closePath(),d.fill()}function he(d){if(!d?.outline?.length)return null;if(d._olSrc===d.outline)return d._olPath;const M=new Path2D;for(const P of d.outline)if(!(P.length<2)){M.moveTo(P[0].x,P[0].y);for(let y=1;y<P.length;y++)M.lineTo(P[y].x,P[y].y)}return d._olSrc=d.outline,d._olPath=M,M}function we(){const d=t.base;if(d.pad!=null)return d.pad;const M=t.outline;return M.stipple?.on?(M.stipple.gap??0)+M.stipple.width:M.glow?.on?M.glow.width:0}function He(d,M){const[P,y]=t.base.offset??[0,0];if(t.base.shape==="halo"){const D=M?.halo;if(!D?.length)return;const{cell:F,ox:q,oy:ne}=t.halo,re=t.base.gradient;d.save(),d.translate(P,y),d.fillStyle=re?.on?en(d,null,re.angle??90,null,re):t.base.fill,d.beginPath();for(let le=0;le<D.length;le+=2)d.rect(q+D[le]*F,ne+D[le+1]*F,F,F);d.fill(),d.restore();return}if(!M?.outline?.length)return;M._baseSrc!==M.outline&&(M._baseSrc=M.outline,M._basePaths=M.outline.filter(D=>D.length>2).map(D=>{const F=new Path2D;F.moveTo(D[0].x,D[0].y);for(let q=1;q<D.length;q++)F.lineTo(D[q].x,D[q].y);return F.closePath(),F}));const I=we();d.save(),d.translate(P,y),d.fillStyle=d.strokeStyle=t.base.fill,d.lineJoin="round",d.lineWidth=2*I;for(const D of M._basePaths)d.fill(D),I>0&&d.stroke(D);d.restore()}const $e=(d,M,P)=>{let y=Math.imul(d,668265261)^Math.imul(M,374761393)^Math.imul(P+1,2654435769);return y=Math.imul(y^y>>>15,2246822507),y=Math.imul(y^y>>>13,3266489909),((y^y>>>16)>>>0)/4294967296};function ft(d,M,P,y,I,D,F){const q=D.cell,ne=M+(y+$e(y,I,1+F))*q,re=P+(I+$e(y,I,2+F))*q,le=D.size[0]+(D.size[1]-D.size[0])*$e(y,I,3+F),ue=D.stretch[0]+(D.stretch[1]-D.stretch[0])*$e(y,I,4+F),Ee=$e(y,I,5+F)*Math.PI,Te=Math.cos(Ee)*(ue-1)*le*.5,Me=Math.sin(Ee)*(ue-1)*le*.5;d.moveTo(ne+Te+le,re+Me),d.arc(ne+Te,re+Me,le,0,Math.PI*2),ue>1.05&&(d.moveTo(ne-Te+le,re-Me),d.arc(ne-Te,re-Me,le,0,Math.PI*2))}function ee(d,M){const P=d.getImageData(0,0,M.width,M.height),y=P.data;for(let I=3;I<y.length;I+=4)y[I]=y[I]>=110?255:0;d.putImageData(P,0,0)}function _e(d){const M=t.outline.stipple,P=M.gap??0,y=M.cell,I=M.width+P,D=t.halo.ox??0,F=t.halo.oy??0;let q=1/0,ne=1/0,re=-1/0,le=-1/0;for(const At of d.outline)for(const dt of At)dt.x<q&&(q=dt.x),dt.x>re&&(re=dt.x),dt.y<ne&&(ne=dt.y),dt.y>le&&(le=dt.y);const ue=Math.floor((q-I-D)/y),Ee=Math.floor((ne-I-F)/y),Te=Math.floor((re+I-D)/y)-ue+1,Me=Math.floor((le+I-F)/y)-Ee+1;if(Te*Me>4e6)return;const Pe=new Float32Array(Te*Me).fill(I);for(const At of d.outline)for(let dt=1;dt<At.length;dt++){const vt=At[dt-1],Pt=At[dt],un=Math.max(0,Math.floor((Math.min(vt.x,Pt.x)-I-D)/y)-ue),vn=Math.min(Te-1,Math.floor((Math.max(vt.x,Pt.x)+I-D)/y)-ue),vo=Math.max(0,Math.floor((Math.min(vt.y,Pt.y)-I-F)/y)-Ee),So=Math.min(Me-1,Math.floor((Math.max(vt.y,Pt.y)+I-F)/y)-Ee),dn=Pt.x-vt.x,Sn=Pt.y-vt.y,Qs=dn*dn+Sn*Sn||1e-9;for(let Li=vo;Li<=So;Li++){const ga=F+(Ee+Li+.5)*y-vt.y;for(let Ii=un;Ii<=vn;Ii++){const va=D+(ue+Ii+.5)*y-vt.x,Sa=Math.max(0,Math.min(1,(va*dn+ga*Sn)/Qs)),xa=va-dn*Sa,Ea=ga-Sn*Sa,Ta=xa*xa+Ea*Ea,xo=Li*Te+Ii;Ta<Pe[xo]*Pe[xo]&&(Pe[xo]=Math.sqrt(Ta))}}}const De=new Uint8Array(Te*Me),We=Array.from({length:Me},()=>[]);for(const At of d.outline)for(let dt=1;dt<At.length;dt++){const vt=At[dt-1],Pt=At[dt];if(vt.y===Pt.y)continue;const un=Math.min(vt.y,Pt.y),vn=Math.max(vt.y,Pt.y),vo=Math.max(0,Math.ceil((un-F)/y-.5)-Ee),So=Math.min(Me-1,Math.ceil((vn-F)/y-.5)-Ee-1);for(let dn=vo;dn<=So;dn++){const Sn=F+(Ee+dn+.5)*y;Sn<un||Sn>=vn||We[dn].push(vt.x+(Sn-vt.y)/(Pt.y-vt.y)*(Pt.x-vt.x))}}for(let At=0;At<Me;At++){const dt=We[At].sort((vt,Pt)=>vt-Pt);for(let vt=0;vt+1<dt.length;vt+=2){const Pt=Math.max(0,Math.ceil((dt[vt]-D)/y-.5)-ue),un=Math.min(Te-1,Math.floor((dt[vt+1]-D)/y-.5)-ue);for(let vn=Pt;vn<=un;vn++)De[At*Te+vn]=1}}const Ze=M.size[1]*M.stretch[1]+1,Ke=M.px>0?M.px:0,It=At=>Ke?Math.floor(At/Ke)*Ke:At,tn=It(D+ue*y-Ze),fn=It(F+Ee*y-Ze),_a=Math.ceil((Te*y+Ze*2)/(Ke||1))*(Ke||1),ma=Math.ceil((Me*y+Ze*2)/(Ke||1))*(Ke||1),Hn=Ke?1/Ke:U,kn=d._st??{cv:document.createElement("canvas")};kn.cv.width=Math.max(1,Math.round(_a*Hn)),kn.cv.height=Math.max(1,Math.round(ma*Hn));const Vn=kn.cv.getContext("2d",{willReadFrequently:!!Ke});Vn.setTransform(Hn,0,0,Hn,-tn*Hn,-fn*Hn),Vn.fillStyle=M.color,Vn.beginPath();for(let At=0;At<Me;At++)for(let dt=0;dt<Te;dt++){const vt=Pe[At*Te+dt];if(vt>=I||vt<P||De[At*Te+dt])continue;const Pt=ue+dt,un=Ee+At;$e(Pt,un,0)>=M.edge*Math.pow(1-(vt-P)/M.width,M.gamma)||ft(Vn,D,F,Pt,un,M,0)}Vn.fill(),Ke&&ee(Vn,kn.cv),Object.assign(kn,{x:tn,y:fn,w:_a,h:ma,src:d.outline,t:performance.now()}),d._st=kn}function Ce(d,M){const P=t.outline.glow,y=t.outline.stipple;if(y?.on){if(!M.some(re=>re?.outline?.length))return;u.clearRect(0,0,g,w),u.save(),u.imageSmoothingEnabled=!(y.px>0);let q=1;const ne=performance.now();for(const re of M){if(!re.outline?.length)continue;const le=re._st?.src!==re.outline;(!re._st||le&&q>0&&ne-re._st.t>=(y.interval??100))&&(re._st&&q--,_e(re)),re._st&&u.drawImage(re._st.cv,re._st.x,re._st.y,re._st.w,re._st.h)}u.restore(),d.drawImage(_,0,0,g,w);return}const I=M.map(he).filter(Boolean);if(!I.length)return;if(!P?.on){d.strokeStyle=t.outline.style,d.lineWidth=t.outline.width,d.lineJoin="round",d.setLineDash(t.outline.dash||[]);for(const q of I)d.stroke(q);d.setLineDash([]);return}const D=Math.max(1,Math.round(P.steps)),F=q=>q>D?0:P.edge*(1-(q-1)/D);u.clearRect(0,0,g,w),u.save(),u.strokeStyle=P.color,u.lineJoin="round",u.lineCap="round";for(let q=D;q>=1;q--){u.globalAlpha=1-(1-F(q))/(1-F(q+1)),u.lineWidth=2*P.width*q/D;for(const ne of I)u.stroke(ne)}u.globalAlpha=1,u.globalCompositeOperation="destination-out";for(const q of I)u.fill(q,"evenodd");u.restore(),d.drawImage(_,0,0,g,w)}function xe(d,M){const P=t.orb.spike;if(!P?.on||!t.orb.on)return[];const y=[],I=t.spacing;for(const D of d.orbs){if(!D.spikes)continue;const F=En(Math.min(D.px,(M.length-1)*I)/I,M);if(!F)continue;const q=D.off>=0?-1:1,ne=Math.atan2(F.ny*q,F.nx*q),re=nn(Vt(D.seed,"spike")),le=Math.max(3,Math.round(D.spikes.n)),ue=D.spikes.len,Ee=2*P.spread/le,Te=new Path2D;Te.moveTo(F.x,F.y);for(let Pe=0;Pe<le;Pe++){const De=ne-P.spread+Ee*(Pe+.5)+(re()-.5)*Ee*P.jitter,We=ue*(1-P.jitter*.6*re())*(re()<.2?1.35:1),Ze=ne-P.spread+Ee*Pe,Ke=ue*P.depth*(.6+.8*re());Te.lineTo(F.x+Math.cos(Ze)*Ke,F.y+Math.sin(Ze)*Ke),Te.lineTo(F.x+Math.cos(De)*We,F.y+Math.sin(De)*We)}const Me=ne+P.spread;Te.lineTo(F.x+Math.cos(Me)*ue*P.depth,F.y+Math.sin(Me)*ue*P.depth),Te.closePath(),y.push(Te)}return y}function Be(d,M,P=!0){P&&Ce(d,[M]);const y=M.spineInk??M.spine;if(y){const I=t.spineCasing,D=xe(M,y),F=I?.on?I.border:t.orb.spike.border,q=I?.on?I.borderWidth:t.orb.spike.borderWidth,ne=I?.on?I.fill:t.orb.spike.fill;if(D.length){d.lineJoin="miter",d.miterLimit=30,d.fillStyle=d.strokeStyle=F,d.lineWidth=2*q;for(const re of D)d.fill(re),d.stroke(re)}if(I?.on?(ie(d,y,I.border,I.width+2*I.borderWidth),ie(d,y,I.fill,I.width)):ie(d,y,t.baseStyle,t.lineWidth),D.length){d.fillStyle=ne;for(const re of D)d.fill(re)}}for(const I of M.decor)t.decorFill&&(d.fillStyle=t.decorFill,d.fillRect(I.x-I.r,I.y-I.r,I.r*2,I.r*2)),t.decorStyle&&t.decorLineWidth>0&&(d.strokeStyle=t.decorStyle,d.lineWidth=t.decorLineWidth,d.strokeRect(I.x-I.r,I.y-I.r,I.r*2,I.r*2));for(const I of M.compPolys)ie(d,I,t.companionStyle,t.lineWidth,t.companionDash),Z(d,I.at(-1),I.at(-3)||I.at(-2),t.arrowSize)}let et=0;const Fe=new Map;function xt(d,M){if(d._mainFrame===et)return d._main;d._mainFrame=et,d._main=null;const P=t.bead.main,y=d.spineInk??d.spine;if(!P?.on||!y||y.length<2)return null;const I=t.spacing,D=(y.length-1)*I;if(P.waitLive){let ue=D;if(d!==Q){const Te=$.indexOf(d);let Me=0;for(let Ke=0;Ke<Te;Ke++)$[Ke].seed===d.seed&&Me++;const Pe=d.seed+"#"+Me+"#"+Math.round(D);let De=Fe.get(Pe);De===void 0&&(Fe.set(Pe,De=M),Fe.size>600&&Fe.delete(Fe.keys().next().value));const We=P.fps>0?Math.floor((M-De)*P.fps)/P.fps:M-De,Ze=(P.speed*We+D)%(2*D);ue=Ze<D?Ze:2*D-Ze}const Ee=En(ue/I,y);return Ee?(d._main={x:Ee.x,y:Ee.y,ang:Ee.angle},d._main):null}const F=nn(Vt(d.seed,"main"))()*2*D,q=P.fps>0?(Math.floor(M*P.fps+F)-F)/P.fps:M,ne=(P.speed*q+F)%(2*D),re=ne<D?ne:2*D-ne,le=En(re/I,y);return le?(d._main={x:le.x,y:le.y,ang:le.angle},d._main):null}const ht=document.createElement("canvas").getContext("2d"),Qe=new Map;function B(d){if(Qe.has(d))return Qe.get(d);ht.fillStyle="#000",ht.fillStyle=d;const M=ht.fillStyle,P=M.startsWith("#")?[1,3,5].map(y=>parseInt(M.slice(y,y+2),16)):M.match(/[\d.]+/g).slice(0,3).map(Number);return Qe.set(d,P),P}let Ot=null;function at(){const d=t.bead.main,M={...t.outline.stipple,...d.stipple??{}},P=JSON.stringify([d.radius,d.fill,d.glow,M,U]);if(Ot?.key===P)return Ot;const y=d.radius,I=Math.min(Math.max(d.glow?.core??.45,0),.99),D=M.px>0?M.px:0,F=M.size[1]*M.stretch[1]+1,q=Math.ceil((y+F)/(D||1))*(D||1),ne=D?1/D:U,re=Math.max(-Math.ceil(y/M.cell),-1e4),le=[];for(let ue=0;ue<Math.max(1,M.frames??1);ue++){const Ee=document.createElement("canvas");Ee.width=Ee.height=Math.max(1,Math.round(q*2*ne));const Te=Ee.getContext("2d",{willReadFrequently:!!D});Te.setTransform(ne,0,0,ne,q*ne,q*ne),Te.fillStyle=d.fill,Te.beginPath();const Me=ue*7;for(let Pe=re-1;Pe<=-re;Pe++)for(let De=re-1;De<=-re;De++){const We=Math.hypot((De+.5)*M.cell,(Pe+.5)*M.cell)/y;if(We>=1)continue;const Ze=We<=I?1:Math.pow(1-(We-I)/(1-I),d.glow?.falloff??1.4);$e(De,Pe,Me)>=(M.edge??1)*Ze||ft(Te,0,0,De,Pe,M,Me)}Te.fill(),D&&ee(Te,Ee),le.push(Ee)}return Ot={key:P,frames:le,half:q,px:D},Ot}function tt(d,M,P){const y=xt(M,P);if(!y)return;const I=t.bead.main;if(I.stipple?.on&&I.fill){const D=at(),F=I.stipple.fps??6,q=(Math.floor(P*F)+(M.seed>>>0))%D.frames.length,ne=le=>D.px?Math.round(le/D.px)*D.px:le,re=d.imageSmoothingEnabled;d.imageSmoothingEnabled=!D.px,d.drawImage(D.frames[q],ne(y.x)-D.half,ne(y.y)-D.half,D.half*2,D.half*2),d.imageSmoothingEnabled=re;return}if(I.glow?.on&&I.fill){const[D,F,q]=B(I.fill),ne=Math.min(Math.max(I.glow.core,0),.99),re=d.createRadialGradient(y.x,y.y,0,y.x,y.y,I.radius);re.addColorStop(0,`rgba(${D},${F},${q},1)`),re.addColorStop(ne,`rgba(${D},${F},${q},1)`);const le=8;for(let ue=1;ue<=le;ue++){const Ee=ue/le,Te=Math.pow(1-Ee,I.glow.falloff);re.addColorStop(ne+(1-ne)*Ee,`rgba(${D},${F},${q},${Te.toFixed(4)})`)}d.beginPath(),d.arc(y.x,y.y,I.radius,0,Math.PI*2),d.fillStyle=re,d.fill();return}d.beginPath(),d.arc(y.x,y.y,I.radius,0,Math.PI*2),I.fill&&(d.fillStyle=I.fill,d.fill()),I.stroke&&(d.strokeStyle=I.stroke,d.lineWidth=I.lineWidth,d.stroke())}function Ue(d){const M=(d>>>0)%9973,P=(y,I)=>{const D=Math.sin(y*127.1+I*311.7+M*74.7)*43758.5453;return D-Math.floor(D)};return(y,I)=>{const D=Math.floor(y),F=Math.floor(I),q=y-D,ne=I-F,re=q*q*(3-2*q),le=ne*ne*(3-2*ne),ue=P(D,F)+(P(D+1,F)-P(D,F))*re,Ee=P(D,F+1)+(P(D+1,F+1)-P(D,F+1))*re;return ue+(Ee-ue)*le}}const pt=d=>d-Math.PI*Math.round(d/Math.PI),Le=()=>t.orb.on&&t.orb.style==="fan";function C(d,M){if(d._fanFrame===et)return d._fan;d._fanFrame=et;const P=t.orb,y=P.fan,I=xt(d,M),D=[];for(const F of d.orbs){if(F.ang===void 0)continue;const q=F.off<0?-1:1,ne=Math.cos(F.ang+Math.PI/2)*q,re=Math.sin(F.ang+Math.PI/2)*q,le=F.x-ne*F.r,ue=F.y-re*F.r;let Ee=y.min;if(I){const Ze=Math.hypot(le-I.x,ue-I.y),Ke=Math.min(1,Math.max(0,(y.far-Ze)/Math.max(y.far-y.near,1e-6)));Ee=y.min+(1-y.min)*Ke*Ke*(3-2*Ke)}const Te=Math.max(2,Math.round(F.rays??y.rays)),Me=Math.PI/(Te-1),Pe=F.r*y.len,De=[];let We=-1;for(let Ze=0;Ze<Te;Ze++){const Ke=Math.min(Ze*Me,Ee*Math.PI);if(Ke===We)continue;We=Ke;const It=F.ang+Math.PI-q*Ke;De.push({x:le+Math.cos(It)*Pe,y:ue+Math.sin(It)*Pe})}D.push({px:le,py:ue,L:Pe,open:Ee,tips:De,width:F.width??y.width,fill:F.fill??P.fill})}return d._fan=D,D}function E(d,M,P){d.lineCap=t.orb.fan.cap;for(const y of C(M,P)){d.beginPath();for(const I of y.tips)d.moveTo(y.px,y.py),d.lineTo(I.x,I.y);d.strokeStyle=Y(d,y),d.lineWidth=y.width,d.stroke()}}function Y(d,M){const P=t.orb.fan.heart;if(!P?.on||!M.tips.length)return M.fill;let y=0;for(const ne of M.tips)y=Math.max(y,Math.hypot(ne.x-M.px,ne.y-M.py));if(!(y>0))return M.fill;const I=B(M.fill),D=B(P.tint),F=I.map((ne,re)=>Math.round(ne+(D[re]-ne)*P.amount)),q=d.createRadialGradient(M.px,M.py,0,M.px,M.py,y);return q.addColorStop(0,`rgb(${F[0]}, ${F[1]}, ${F[2]})`),q.addColorStop(Math.min(1,Math.max(0,P.extent)),M.fill),q}function ae(d,M){const P=[];for(const y of C(d,M))for(const I of y.tips)P.push({ax:y.px,ay:y.py,bx:I.x,by:I.y,r:y.width/2,w:t.orb.bulge,reach:t.orb.fan.reach});return P}function se(d,M){let P=null;for(const y of d.orbs){const I=y.r*t.orb.fan.len+(y.width??t.orb.fan.width)+M+y.r,D=[y.x-I,y.y-I,y.x+I,y.y+I];P=P?[Math.min(P[0],D[0]),Math.min(P[1],D[1]),Math.max(P[2],D[2]),Math.max(P[3],D[3])]:D}return P}const te=d=>(d._fan??[]).map(M=>Math.round(M.open*240)).join(",");function Ie(d,M){d._grid||(d._grid=Xs(Mt(d),{...t.outline,compCap:t.goo.compCap,extra:se(d,t.outline.reach)})),d._grid&&(C(d,M),d._fanKey=te(d),d.outline=qs(cg(d._grid,ae(d,M)),t.outline.th))}let ve=0;function Ae(d){if(!Le()||!t.outline.on)return;const M=$.filter(y=>y.orbs.length&&y._grid);Q?.orbs.length&&Q._grid&&M.push(Q);let P=0;for(let y=0;y<M.length&&P<t.orb.fan.budget;y++){const I=M[(ve+y)%M.length];C(I,d),te(I)!==I._fanKey&&(Ie(I,d),P++)}ve=M.length?(ve+1)%M.length:0}function it(d,M,P){if(!M.orbs.length)return;const y=Jt();M._haloSample||(M._haloSample=lg(Mt(M),y));const I=ae(M,P);if(!I.length)return;const{cell:D,ox:F,oy:q}=y;let ne=1/0,re=1/0,le=-1/0,ue=-1/0;for(const Me of I){const Pe=(Me.reach??y.reach)+Me.r;ne=Math.min(ne,Me.ax-Pe,Me.bx-Pe),re=Math.min(re,Me.ay-Pe,Me.by-Pe),le=Math.max(le,Me.ax+Pe,Me.bx+Pe),ue=Math.max(ue,Me.ay+Pe,Me.by+Pe)}const Ee=fi(M),Te=[];Ee||(d.fillStyle=en(d,ci(M.halo)),d.beginPath());for(let Me=Math.floor((re-q)/D);Me<=Math.floor((ue-q)/D);Me++)for(let Pe=Math.floor((ne-F)/D);Pe<=Math.floor((le-F)/D);Pe++){const De=F+(Pe+.5)*D,We=q+(Me+.5)*D;M._haloSample(De,We)+Ys(I,y.reach,De,We)>y.th&&(Ee?Te.push(F+Pe*D,q+Me*D):d.rect(F+Pe*D,q+Me*D,D,D))}Ee?ui(d,M,yn(M,Te)):d.fill()}function fe(d,M,P){if(!t.orb.on||!M.orbs.length)return;if(t.orb.style==="fan")return E(d,M,P);const y=t.orb,I=y.flow,D=xt(M,P);for(const F of M.orbs){F._nz||(F._nz=Ue(F.seed));const q=F._nz,ne=D?Math.hypot(F.x-D.x,F.y-D.y):0,re=D?I.follow*(I.falloff>0?Math.exp(-ne/I.falloff):1):0,le=D?D.x*I.drift:0,ue=D?D.y*I.drift:0;d.save(),d.translate(F.x,F.y),d.beginPath(),d.arc(0,0,F.r,0,Math.PI*2),d.fillStyle=F.fill??y.fill,d.fill(),d.clip(),d.beginPath();const Ee=F.r,Te=I.dash*.5,Me=Ee+Te;let Pe=0;for(let De=-Ee;De<=Ee;De+=I.cell,Pe++){const We=-Ee+(Pe%2?I.cell*.5:0);for(let Ze=We;Ze<=Ee;Ze+=I.cell){if(Ze*Ze+De*De>Me*Me)continue;const Ke=q((Ze-le)*I.scale+17.3,(De-ue)*I.scale-5.1)*Math.PI*2*I.turns,It=D?Ke+re*pt(D.ang-Ke):Ke,tn=Math.cos(It)*Te,fn=Math.sin(It)*Te;d.moveTo(Ze-tn,De-fn),d.lineTo(Ze+tn,De+fn)}}d.strokeStyle=I.style,d.lineWidth=I.width,d.lineCap="butt",d.stroke(),d.restore(),y.ring&&(d.beginPath(),d.arc(F.x,F.y,F.r,0,Math.PI*2),d.strokeStyle=y.ring,d.lineWidth=y.ringWidth,d.stroke())}}function be(d,M,P){const y=t.bead,I=M.spineInk??M.spine;if(!I||I.length<2)return;const D=t.spacing,F=(I.length-1)*D,q=nn(Vt(M.seed,"bead")),ne=nn(Vt(M.seed,"beadKind")),re=y.speed*P%Math.max(F,1);let le=pe(q,y.gap);const ue=y.cluster?.on?y.cluster:null;let Ee=ue?Math.round(pe(q,ue.size)):0;for(d.fillStyle=y.fill,y.stroke&&(d.strokeStyle=y.stroke,d.lineWidth=y.lineWidth);le<F;){const Te=pe(q,y.radius),Me=(le+re)%F,Pe=Math.min(1,Me/(Te*4),(F-Me)/(Te*4)),De=En(Me/D,I);if(De&&Pe>.05)if(y.shape==="star"){const We=y.star??{},Ze=Math.max(2,Math.round(We.arms??6)),Ke=Te*Pe*(We.scale??1.6);d.beginPath();for(let It=0;It<Ze;It++){const tn=De.angle+(We.turn??0)+It*Math.PI*2/Ze;d.moveTo(De.x,De.y),d.lineTo(De.x+Math.cos(tn)*Ke,De.y+Math.sin(tn)*Ke)}d.strokeStyle=y.fill,d.lineWidth=We.width??1,d.lineCap="butt",d.stroke()}else if(y.shape==="glyph"){const We=y.glyph??{},Ze=We.kinds?.length?We.kinds:["sparkle"],Ke=Ze[Math.floor(ne()*Ze.length)%Ze.length];H(d,Ke,De.x,De.y,De.angle+(We.turn??0),Te*Pe*(We.scale??2.4)),d.fillStyle=y.fill,d.fill()}else d.beginPath(),d.arc(De.x,De.y,Te*Pe,0,Math.PI*2),y.fill&&d.fill(),y.stroke&&d.stroke();ue&&--Ee>0?le+=pe(q,ue.gap):(le+=pe(q,y.gap),ue&&(Ee=Math.round(pe(q,ue.size))))}}const Ge=[.28,-.28,.45,-.12,.78,-.03,1,0],Ve=[.05,-.05,.3,-.02,1,-.8,1,0];function Re(d,M,P,y,I,D){const F=Ge.map((q,ne)=>q+(Ve[ne]-q)*D);d.beginPath();for(let q=0;q<4;q++){const ne=y+q*Math.PI/2,re=Math.cos(ne),le=Math.sin(ne),ue=(Ee,Te)=>[M+(re*Ee-le*Te)*I,P+(le*Ee+re*Te)*I];q===0&&d.moveTo(...ue(F[0],F[1])),d.bezierCurveTo(...ue(F[2],F[3]),...ue(F[4],F[5]),...ue(F[6],F[7])),d.bezierCurveTo(...ue(F[4],-F[5]),...ue(F[2],-F[3]),...ue(F[0],-F[1]))}d.closePath()}const je=new Map,qe=(d,M,P)=>{const y=nn(Vt(M,"morph"))()*Math.PI*2;return .5-.5*Math.cos(P/d.morph*Math.PI*2+y)};function ut(d,M,P,y){const I=t.bead.walker,D=M.spineInk??M.spine;if(!D||D.length<2)return;const F=t.spacing,q=(D.length-1)*F;y+="#"+Math.round(q);let ne=je.get(y);ne===void 0&&(je.set(y,ne=P),je.size>600&&je.delete(je.keys().next().value));const re=nn(Vt(M.seed,"walker"))()*2*q,{plan:le}=M,ue=De=>{const We=(I.speed*De+re)%(2*q),Ze=We<q?We:2*q-We,Ke=En(Ze/F,D);if(!Ke)return null;let It=0;for(;It+1<le.length&&le[It+1].px0<=Ze;)It++;return{x:Ke.x,y:Ke.y,angle:Ke.angle,R:le[It]?.walkerSize??I.size}},Ee=I.turn??0;d.fillStyle=I.fill;const Te=I.gap/Math.max(I.speed,.001),Me=[];for(let De=Math.floor(P/I.every),We=0;Me.length<I.max&&(De+1)*I.every>=ne&&We<4e3;De--,We++){const Ze=nn(Vt(M.seed,"stamp",De));if(Ze()>=I.prob)continue;const Ke=(De+Ze()*.6)*I.every,It=Math.round(pe(Ze,I.count));for(let tn=It-1;tn>=0&&Me.length<I.max;tn--){const fn=Ke+tn*Te;fn<=P&&fn>=ne&&Me.push(fn)}}for(const De of Me){const We=ue(De);We&&(Re(d,We.x,We.y,We.angle+Ee,We.R,qe(I,M.seed,De)),d.fill())}const Pe=ue(P);Pe&&(Re(d,Pe.x,Pe.y,Pe.angle+Ee,Pe.R,qe(I,M.seed,P)),d.fill())}function H(d,M,P,y,I,D){d.beginPath();for(let F=0;F<4;F++){const q=I+F*Math.PI/2,ne=Math.cos(q),re=Math.sin(q),le=(ue,Ee)=>[P+ne*ue*D-re*Ee*D,y+re*ue*D+ne*Ee*D];if(M==="sparkle"){const ue=q+Math.PI/2,[Ee,Te]=[P+ne*D,y+re*D],[Me,Pe]=[P+Math.cos(ue)*D,y+Math.sin(ue)*D],De=P+Math.cos(q+Math.PI/4)*D*.12,We=y+Math.sin(q+Math.PI/4)*D*.12;F===0&&d.moveTo(Ee,Te),d.quadraticCurveTo(De,We,Me,Pe)}else M==="teardrop"?(d.moveTo(P,y),d.bezierCurveTo(...le(.3,-.36),...le(1,-.32),...le(1,0)),d.bezierCurveTo(...le(1,.32),...le(.3,.36),P,y)):(d.moveTo(P,y),d.bezierCurveTo(...le(.25,-.07),...le(.4,-.34),...le(.7,-.3)),d.bezierCurveTo(...le(1.02,-.26),...le(1.02,.26),...le(.7,.3)),d.bezierCurveTo(...le(.4,.34),...le(.25,.07),P,y))}M==="sparkle"&&d.closePath()}const pe=(d,[M,P])=>M+d()*(P-M),$=[];let oe=1,Q=null,me=!1;const Xe=performance.now(),_t=()=>(performance.now()-Xe)/1e3/ug;function Mt(d){const M=[],P=(I,D)=>{for(let F=1;F<I.length;F++)M.push({ax:I[F-1].x,ay:I[F-1].y,bx:I[F].x,by:I[F].y,c:D})},y=J(d);if(t.goo.companion)for(const I of d.compPolys)P(I,!0);if(t.goo.spine&&y&&P(y,!1),!M.length&&y&&P(y,!1),t.orb.on&&t.orb.bulge>0&&t.orb.style!=="fan")for(const I of d.orbs)M.push({ax:I.x,ay:I.y,bx:I.x,by:I.y,r:I.r,w:t.orb.bulge});return M}function ct(d){if(!(!t.outline.on||d.outline)){if(Le()&&d.orbs.length)return Ie(d,(performance.now()-Xe)/1e3);d.outline=rs(Mt(d),{...t.outline,compCap:t.goo.compCap})}}const Bt=()=>!(Le()&&t.outline.on),Jt=()=>{const d=t.halo;return{...d,reach:d.reach??t.outline.reach,th:d.th??t.outline.th,compCap:t.goo.compCap}};function ri(d){t.halo.on&&!d.halo&&(d.halo=as(Mt(d),Jt()))}const si=new Map;function en(d,M,P,y=null,I=t.halo.gradient){const D=t.halo;if(!I?.on)return D.fill;if(P==null&&(P=I.angle??90),I.whole&&M){const le=(I.angle??90)*Math.PI/180,ue=(M[0]+M[2])/2,Ee=(M[1]+M[3])/2,Te=(Math.abs(Math.cos(le))*(M[2]-M[0])+Math.abs(Math.sin(le))*(M[3]-M[1]))/2,Me=d.createLinearGradient(ue-Math.cos(le)*Te,Ee-Math.sin(le)*Te,ue+Math.cos(le)*Te,Ee+Math.sin(le)*Te);for(const[Pe,De]of I.stops)Me.addColorStop(Pe,De);return Me}const F=JSON.stringify([D.cell,I,U]),q=(I===D.gradient?"":"g:"+JSON.stringify(I.stops)+"|")+(y?`${P}|${y.h??0}|${y.s??0}|${y.l??0}`:P);let ne=si.get(q);if(ne?.key!==F){const le=Math.max(1,Math.round(D.cell*U)),ue=document.createElement("canvas");ue.width=ue.height=le;const Ee=ue.getContext("2d"),Te=P*Math.PI/180,Me=(Math.abs(Math.cos(Te))+Math.abs(Math.sin(Te)))*le/2,Pe=Ee.createLinearGradient(le/2-Math.cos(Te)*Me,le/2-Math.sin(Te)*Me,le/2+Math.cos(Te)*Me,le/2+Math.sin(Te)*Me);for(const[De,We]of I.stops)Pe.addColorStop(De,y?li(We,y):We);Ee.fillStyle=Pe,Ee.fillRect(0,0,le,le),ne={key:F,tile:ue,n:le},si.set(q,ne)}const re=d.createPattern(ne.tile,"repeat");return re.setTransform(new DOMMatrix().translate(D.ox??0,D.oy??0).scale(D.cell/ne.n)),re}function li(d,{h:M=0,s:P=0,l:y=0}){const[I,D,F]=B(d).map(Me=>Me/255),q=Math.max(I,D,F),ne=Math.min(I,D,F),re=(q+ne)/2,le=q-ne;let ue=0,Ee=0;le>0&&(Ee=le/(1-Math.abs(2*re-1)),ue=q===I?(D-F)/le%6:q===D?(F-I)/le+2:(I-D)/le+4,ue*=60);const Te=Me=>Math.min(100,Math.max(0,Me));return`hsl(${((ue+M)%360+360)%360}, ${Te(Ee*100+P)}%, ${Te(re*100+y)}%)`}function ci(d){if(!d?.length)return null;const{cell:M,ox:P,oy:y}=t.halo;let I=1/0,D=1/0,F=-1/0,q=-1/0;for(let ne=0;ne<d.length;ne+=2)d[ne]<I&&(I=d[ne]),d[ne]>F&&(F=d[ne]),d[ne+1]<D&&(D=d[ne+1]),d[ne+1]>q&&(q=d[ne+1]);return[P+I*M,y+D*M,P+(F+1)*M,y+(q+1)*M]}const fi=d=>{const M=t.halo.gradient;return M?.on&&!M.whole&&M.perSyl&&d?.plan?.some(P=>P.haloAngle!=null||P.haloTone)};function On(d){const M=d.spine;if(!M?.length)return null;if(d._angPts?.n===M.length&&d._angPts.plan===d.plan)return d._angPts.pts;const{plan:P}=d,y=[];let I=0;for(let D=0;D<M.length;D+=2){const F=D*t.spacing;for(;I+1<P.length&&P[I+1].px0<=F;)I++;y.push(M[D].x,M[D].y,I)}return d._angPts={n:M.length,plan:d.plan,pts:y},y}function Ci(d,M,P){let y=1/0,I=d[2];for(let D=0;D<d.length;D+=3){const F=(d[D]-M)**2+(d[D+1]-P)**2;F<y&&(y=F,I=d[D+2])}return I}function yn(d,M){const P=new Map,y=On(d),I=t.halo.cell/2;for(let D=0;D<M.length;D+=2){const F=y?Ci(y,M[D]+I,M[D+1]+I):-1;let q=P.get(F);q||P.set(F,q=[]),q.push(M[D],M[D+1])}return P}function ui(d,M,P){const{cell:y}=t.halo;for(const[I,D]of P){const F=M.plan[I];d.fillStyle=en(d,null,F?.haloAngle??t.halo.gradient.angle??90,F?.haloTone??null),d.beginPath();for(let q=0;q<D.length;q+=2)d.rect(D[q],D[q+1],y,y);d.fill()}}function Bn(d,M,P=null){if(!M?.length)return;const{cell:y,ox:I,oy:D}=t.halo;if(fi(P)){if(P._haloGroups?.src!==M||P._haloGroups.ox!==I||P._haloGroups.oy!==D){const F=new Float32Array(M.length);for(let q=0;q<M.length;q+=2)F[q]=I+M[q]*y,F[q+1]=D+M[q+1]*y;P._haloGroups={src:M,ox:I,oy:D,groups:yn(P,F)}}return ui(d,P,P._haloGroups.groups)}d.fillStyle=en(d,ci(M)),d.beginPath();for(let F=0;F<M.length;F+=2)d.rect(I+M[F]*y,D+M[F+1]*y,y,y);d.fill()}function ho(d,M){const P=t.outline.on&&t.outline.live?.on,y=t.halo.on;!P&&!y||(P&&M-(d._outT??-1/0)>=t.outline.live.interval&&(d._outT=M,Le()&&d.orbs.length?(d._grid=null,d._haloSample=null,Ie(d,(M-Xe)/1e3)):d.outline=rs(Mt(d),{...t.outline,compCap:t.goo.compCap})),y&&M-(d._haloT??-1/0)>=t.halo.interval&&(d._haloT=M,d.halo=as(Mt(d),Jt())))}function di(d){d.outline=null,d.halo=null,d._grid=null,d._haloSample=null,d._fanKey=null}const cn=[];function po(d,M){const P=F=>Math.hypot(F.x-M.x,F.y-M.y),y=d.length>3&&Math.hypot(d[0].x-d.at(-1).x,d[0].y-d.at(-1).y)<=t.outline.cell;let I;if(y){const F=d.slice(0,-1);let q=0;for(let ne=1;ne<F.length;ne++)P(F[ne])<P(F[q])&&(q=ne);I=F.slice(q).concat(F.slice(0,q)),I.push(I[0])}else I=P(d.at(-1))<P(d[0])?d.slice().reverse():d;const D=[0];for(let F=1;F<I.length;F++)D.push(D[F-1]+Math.hypot(I[F].x-I[F-1].x,I[F].y-I[F-1].y));return{pts:I,cum:D,total:D.at(-1)}}function _o(d){const M=d.spine?.[0]??d.raw[0];cn.push({stroke:d,polys:d.outline.map(P=>po(P,M)),drawn:0})}function mo(d,M,P){if(P<=0||M.pts.length<2)return;if(P>=M.total)return ie(d,M.pts,t.outline.style,t.outline.width,t.outline.dash);let y=1;for(;y<M.pts.length&&M.cum[y]<P;)y++;const I=M.pts[y-1],D=M.pts[y],F=(P-M.cum[y-1])/Math.max(M.cum[y]-M.cum[y-1],1e-6),q=M.pts.slice(0,y);q.push({x:I.x+(D.x-I.x)*F,y:I.y+(D.y-I.y)*F}),ie(d,q,t.outline.style,t.outline.width,t.outline.dash)}function A(d){Ce(x,[d.stroke])}function V(d){for(let M=cn.length-1;M>=0;M--){const P=cn[M];if(P.drawn+=t.outline.anim.speed*d,P.polys.every(y=>P.drawn>=y.total))A(P),cn.splice(M,1);else for(const y of P.polys)mo(O,y,P.drawn)}}function K(){for(const d of cn)A(d);cn.length=0}function j(d){ct(d),ri(d),Bn(b,d.halo,d);const M=Bt()&&t.outline.anim?.on&&!t.outline.live?.on&&d.outline?.length>0;Be(x,d,!M&&Bt()),M&&_o(d);const P=[];X(d,P),l.stamp("baked",new Float32Array(P),P.length/Qi)}function z(){ge.length=0,de=null,Q=null,me=!1,l.clear("live")}function ce(){cn.length=0,x.clearRect(0,0,g,w),b.clearRect(0,0,g,w);for(const M of $)di(M);l.clear("baked"),l.clear("live"),h.clear();const d=[];for(const M of $)ct(M),ri(M),Bn(b,M.halo,M),Be(x,M,Bt()),X(M,d);l.stamp("baked",new Float32Array(d),d.length/Qi)}const ge=[];let de=null;function ye(d){const M=[0];for(let P=1;P<d.length;P++)M.push(M[P-1]+Math.hypot(d[P].x-d[P-1].x,d[P].y-d[P-1].y));return M}function ze(d,M,{hold:P=!1,plan:y=null}={}){!d||d.length<2||ge.push({pts:d,cum:ye(d),seed:M,hold:P,plan:y})}function ke(d){if(!de||!d?.length)return!1;const M=de;let P=M.pts.length?M.pts[M.pts.length-1]:null;for(const y of d){const I=P?Math.hypot(y.x-P.x,y.y-P.y):0;M.pts.push(y),M.cum.push((M.cum.length?M.cum[M.cum.length-1]:0)+I),P=y}return!0}function Ne(){const d=ge.shift();return d?(Q=Vi(t,oe++,_t(),d.seed,d.plan),de={pts:d.pts,cum:d.cum,i:0,walked:0,hold:!!d.hold,plan:d.plan},!0):!1}function ot(){if(!Q)return;const d=Q;Q=null,de=null,jn(d,t),di(d),l.clear("live"),d.spine&&(d.compPolys.length||d.decor.length)&&($.push(d),j(d))}function st(){if(!de&&!Ne())return;const d=de,M=d.cum[d.cum.length-1];for(d.walked=Math.min(d.walked+t.growPx,M);d.i<d.pts.length&&d.cum[d.i]<=d.walked;)Kn(Q,t,d.pts[d.i].x,d.pts[d.i].y),d.i++;d.i>=d.pts.length&&d.walked>=M&&!d.hold&&ot()}function Rt(d,M,P=void 0){if(!de||!Q)return;const y=de;P!==void 0&&(y.plan=P),d=Math.max(0,Math.min(d,y.pts.length)),y.pts.length=d,y.cum.length=d;let I=d?y.pts[d-1]:null;for(const ue of M||[]){const Ee=I?Math.hypot(ue.x-I.x,ue.y-I.y):0;y.pts.push(ue),y.cum.push((y.cum.length?y.cum[y.cum.length-1]:0)+Ee),I=ue}const D=y.pts.length,F=Math.min(y.i,D),q=Q,{id:ne,birth:re,seed:le}=q;Q=Vi(t,ne,re,le,y.plan),Q.outline=q.outline,Q.halo=q.halo,Q._outT=q._outT,Q._haloT=q._haloT;for(let ue=0;ue<F;ue++)Kn(Q,t,y.pts[ue].x,y.pts[ue].y);jn(Q,t),y.i=F,y.walked=D?Math.min(y.walked,y.cum[D-1]):0}function mt(){if(!de)return;const d=de;for(d.hold=!1;d.i<d.pts.length;)Kn(Q,t,d.pts[d.i].x,d.pts[d.i].y),d.i++;ot()}async function rt(){for(mt();Ne();)mt();K()}function Oe(d,M,{step:P=1/0,plan:y=null}={}){const I=Vi(t,oe++,_t(),M,y);for(let D=0;D<d.length;D++)Kn(I,t,d[D].x,d[D].y),(D+1)%P===0&&jn(I,t);return jn(I,t),I.spine&&(I.compPolys.length||I.decor.length)&&($.push(I),j(I)),I}const yt=[],nt=(d,M,P,y)=>{d.addEventListener(M,P,y),yt.push([d,M,P,y])},Qt=d=>{mt(),me=!0;const M=oe++;Q=Vi(t,M,_t(),Vt(t.seed,"mouse",M)),Kn(Q,t,d.clientX,d.clientY);try{s.setPointerCapture?.(d.pointerId)}catch{}d.preventDefault()},gn=d=>{!me||!Q||Kn(Q,t,d.clientX,d.clientY)};function zt(){if(!me||!Q)return;me=!1;const d=Q;Q=null,jn(d,t),di(d),l.clear("live"),d.spine&&(d.compPolys.length||d.decor.length)&&($.push(d),j(d))}e.mouse&&(nt(s,"pointerdown",Qt),nt(window,"pointermove",gn),nt(window,"pointerup",zt),nt(window,"pointercancel",zt));const wn=d=>{const M=d.key.toLowerCase();M==="1"?t.shade=0:M==="2"?t.shade=1:M==="3"?t.shade=2:M==="4"?t.shade=3:M==="z"?($.pop(),ce()):M==="c"?(z(),$.length=0,ce(),p.reset()):M==="g"?(t.grow.on=!t.grow.on,t.grow.on||h.clear()):M==="p"?(t.part.on=!t.part.on,t.part.on&&p.reset()):M==="s"&&Xt()};e.keys&&nt(window,"keydown",wn);function gt(){const d=document.createElement("canvas");d.width=o.width,d.height=o.height;const M=d.getContext("2d");return M.drawImage(r,0,0),M.drawImage(o,0,0),M.drawImage(s,0,0),d}function Xt(){gt().toBlob(d=>{const M=document.createElement("a");M.href=URL.createObjectURL(d),M.download=`trail_${Date.now()}.png`,M.click(),URL.revokeObjectURL(M.href)})}const Gt=[],Ht=(()=>{const[d,M,P]=t.light,y=Math.hypot(d,M,P)||1;return[d/y,M/y,P/y]})();let kt=performance.now();function Gn(d){requestAnimationFrame(Gn);const M=Math.min((d-kt)/1e3,1/20);kt=d;const P=(d-Xe)/1e3;me||st(),Q&&(jn(Q,t),Gt.length=0,X(Q,Gt),l.clear("live"),l.stamp("live",new Float32Array(Gt),Gt.length/Qi),ho(Q,d));const y=l.textures(),I=l.texel(),D={bakedTex:y.baked,liveTex:y.live,fieldTexel:I,th:t.goo.th,compCap:t.goo.compCap,time:P,dt:M};if(t.grow.on&&h.step({...D,nowMin:_t(),decay:t.grow.decay,outward:t.grow.outward,curlAmp:t.grow.curlAmp,curlScale:t.grow.curlScale,curlSpeed:t.grow.curlSpeed,source:t.grow.source,bandLo:t.grow.bandLo,bandHi:t.grow.bandHi,ageDelay:t.grow.ageDelay}),l.composite({th:t.goo.th,compCap:t.goo.compCap,edge:t.goo.edge,paper:zi(t.paper),ink:zi(t.ink),shade:t.shade,light:Ht,normalZ:t.normalZ,amb:t.amb,diff:t.diff,spec:t.spec,specPow:t.specPow,fres:t.fres,bands:t.bands,growthTex:h.texture(),growInk:zi(t.grow.ink),growGain:t.grow.on?t.grow.gain:0,growOpacity:t.grow.opacity,pixel:t.goo.pixel??0,pixelVar:t.goo.pixelVar,origin:[t.halo.ox??0,t.halo.oy??0],grain:t.goo.grain},o.width,o.height),t.part.on&&(p.step({...D,spawnTol:t.part.spawnTol,spawnRate:t.part.spawnRate,lifespan:t.part.lifespan,lifeVar:t.part.lifeVar,curlAmp:t.part.curlAmp,curlScale:t.part.curlScale,curlSpeed:t.part.curlSpeed,flow:t.part.flow,repel:t.part.repel}),p.draw({size:t.part.size,ink:zi(t.part.ink),opacity:t.part.opacity},o.width,o.height,U)),et++,Ae(P),t.orb.on||t.halo.on||t.base?.on||sn){if(v.clearRect(0,0,g,w),t.base?.on){for(const F of $)He(v,F);Q&&He(v,Q)}if(t.halo.on){let F=T;const q=Le();if(Q?.halo?.length||q){if(G.clearRect(0,0,g,w),G.drawImage(T,0,0,g,w),Q&&Bn(G,Q.halo,Q),q){for(const re of $)it(G,re,P);Q&&it(G,Q,P)}F=R}v.globalAlpha=t.halo.opacity;const ne=t.halo.edge;if(ne?.on&&ne.width>0){L.clearRect(0,0,g,w),L.drawImage(F,0,0,g,w),L.globalCompositeOperation="source-in",L.fillStyle=ne.color,L.fillRect(0,0,g,w),L.globalCompositeOperation="source-over";const re=ne.width;for(const[le,ue]of[[re,0],[-re,0],[0,re],[0,-re],[re,re],[re,-re],[-re,re],[-re,-re]])v.drawImage(N,le,ue,g,w)}v.drawImage(F,0,0,g,w),v.globalAlpha=1}for(const F of $)fe(v,F,P);Q&&fe(v,Q,P),sn=t.orb.on||t.halo.on||!!t.base?.on}if(O.clearRect(0,0,g,w),Bt()||Ce(O,Q?[...$,Q]:$),O.drawImage(S,0,0,g,w),Q&&Be(O,Q,Bt()),V(M),t.bead.on){for(const F of $)be(O,F,P);Q&&be(O,Q,P)}if(t.bead.walker?.on){const F=new Map,q=ne=>{const re=F.get(ne.seed)??0;return F.set(ne.seed,re+1),ne.seed+"#"+re};for(const ne of $)ut(O,ne,P,q(ne));Q&&(!de||de.i>=de.pts.length-1)&&ut(O,Q,P,q(Q))}if(t.bead.main?.on){for(const F of $)tt(O,F,P);Q&&tt(O,Q,P)}}let sn=!0;nt(window,"resize",k),k();let pa=requestAnimationFrame(Gn);function Js(){cancelAnimationFrame(pa),pa=0;for(const[d,M,P,y]of yt)d.removeEventListener(M,P,y);yt.length=0,z(),$.length=0,s.remove(),r.remove(),a&&o.remove(),e.bodyBg!==!1&&(document.body.style.background=c),e.global&&window.TRAIL===go&&delete window.TRAIL}const go={CFG:t,strokes:$,dispose:Js,canvases:{gl:o,overlay:s,ink2d:S,underlay:r},captureCanvas:()=>gt(),replay:ce,rebuild:k,clear:()=>(z(),$.length=0,ce(),p.reset()),resetStamps:()=>(je.clear(),Fe.clear()),save:Xt,probe:(d,M)=>l.probe(d,M),pstats:()=>p.stats(),hashSeed:Vt,addStroke:Oe,queueStroke:ze,extendGrowing:ke,replaceTail:Rt,finishGrowing:mt,flushQueue:rt,pending:()=>({queued:ge.length,growing:de?de.i:null,points:de?de.pts.length:0,hold:de?!!de.hold:!1}),step:(d=1)=>{for(let M=0;M<d;M++)st()}};return e.global&&(window.TRAIL=go),go}const pg="turtle",ss=2,ls=110,_g=100,mg=1.8,gg=.12,Bo={at:.93,off:22,f1:[250,900],radius:[7,22],hue:[44,60],sat:[78,100],light:[68,56],rays:[5,15],walkerSize:[3,7],spikeN:[12,20],spikeLen:[18,38],width:[2,7]},vg={ㅏ:0,ㅑ:0,ㅐ:0,ㅒ:0,ㅓ:180,ㅕ:180,ㅔ:180,ㅖ:180,ㅗ:270,ㅛ:270,ㅘ:270,ㅙ:270,ㅚ:270,ㅜ:90,ㅠ:90,ㅝ:90,ㅞ:90,ㅟ:90},Sg=[0,90,180,270],xg={hue:[-24,24],sat:[-6,6],light:[4,-5]},Eg=typeof location<"u"&&new URLSearchParams(location.search).get("dandelion")==="invert",Tg="#4c9f4c";function cs(){if(!Eg)return Jo;const e=Jo,t=e.halo.gradient;return{...e,ink:Tg,halo:{...e.halo,fill:"rgb(255, 255, 255)",gradient:{...t,on:!1},edge:{on:!0,color:t.stops.at(-1)[1],width:.3}},base:{...e.base,gradient:{...t,on:!0,whole:!1}}}}const Mg="#cfcfcc",Jo={ink:"#ffffff",shade:0,spacing:4,spineSmooth:-8,wanderAmp:[1,100],wanderLen:[120,240],weaveAmp:[6,14],weaveLen:[80,500],eventGap:[55,60],swirlSpan:[18,26],swirlRadius:[6,24],compBaseSmooth:28,compStep:2.5,compSmooth:2,headLag:5,decorGap:[5,70],decorSpread:12,decorRadius:[2,5],decorLineWidth:.75,decorStyle:null,decorFill:"rgb(255, 253, 222)",arrowSize:0,companionStyle:"rgb(255, 255, 255)",spineCasing:{on:!0,width:8,borderWidth:.3,fill:"rgb(255, 255, 255)",border:"rgb(0, 0, 0)"},growPx:14,goo:{reach:[3,10],reachLen:140,th:1.8,edge:.004,spine:!0,companion:!0,fieldScale:1.5,compCap:0,pixel:[1,3],pixelVar:{block:12,scale:.02},grain:{amount:8.9,freq:1.2,warp:.6,scale:.035,width:.55}},grow:{on:!1},part:{on:!1},outline:{anim:{on:!0,speed:850},live:{on:!0,interval:60},glow:{on:!0,color:"rgb(196, 140, 140)",width:14,edge:.9,steps:8},stipple:{on:!0,color:"rgb(76, 159, 76)",width:22,gap:10,edge:1,gamma:2.6,cell:2.6,size:[.3,1.2],stretch:[1,1.9],px:.5}},base:{on:!0,fill:"rgb(255, 255, 255)",pad:0,shape:"halo",offset:[7,7]},halo:{on:!0,cell:9,reach:null,th:null,fill:"rgb(211, 221, 209)",opacity:1,interval:60,gradient:{on:!0,whole:!1,perSyl:!0,angle:180,stops:[[0,"rgb(121, 211, 121)"],[1,"rgb(76, 159, 76)"]]}},spineFx:{target:"ink",roughen:{on:!0,size:6,gap:6,mode:"smooth"},puckerBloat:{on:!0,amount:12,gap:2}},bead:{on:!1,gap:[140,260],radius:[1.5,3.5],speed:30,fill:"rgb(0, 0, 0)",stroke:null,star:{arms:4,scale:1.8,width:2.5,turn:0},shape:"glyph",glyph:{kinds:["sparkle","teardrop","balloon"],scale:2.4,turn:0},cluster:{on:!0,size:[2,5],gap:[6,14]},walker:{on:!1,speed:35,size:9,morph:2.4,every:2,prob:.5,count:[2,5],gap:20,max:12},main:{on:!0,radius:32,speed:30,fill:"hsl(59, 100%, 81%)",stroke:null,glow:{on:!0,core:.15,falloff:6.4},fps:2,waitLive:!0,stipple:{on:!0,frames:4,fps:6,size:[.3,1],cell:1.2}}},orb:{on:!0,spike:{on:!0,spread:1.55,depth:.4,jitter:.7},gap:[90,200],prob:.7,radius:[10,22],spread:26,fill:"#fff07e",bulge:3,style:"fan",fan:{len:2,near:40,far:320,min:.06,cap:"butt",reach:8,heart:{on:!0,tint:"rgb(228, 102, 80)",amount:.5,extent:.3}},flow:{cell:8.6,dash:8.2,scale:.05,turns:1,follow:.85,falloff:220,drift:.6,style:"rgba(60, 45, 0, 0.7)",width:.75}}};class Ag{constructor(t={}){this._opts=t,this._trail=null,this._canvas=null,this._ownCanvas=!1,this._JAMO=null,this._groups=[],this._holdingIdx=-1,this._sampleStep=Math.max(Jo.spacing+1,5),this._generator=pg,this.sylSize=ls,this.wrapStep=_g,this.wrapMargin=ls*.6,this.lineHeightRatio=mg,this._sylDrop=[],this._scrollAxis="y",this._scrollBase=0,this._slide=0,this._slideRaf=0,this._scrollJump=!0}async init(t){t?this._canvas=t:(this._canvas=document.createElement("canvas"),this._ownCanvas=!0,document.body.appendChild(this._canvas)),this._trail=hg({canvas:this._canvas,mouse:!1,keys:!1,global:!1,cfg:this._opts.transparentOutput?cs():{...cs(),paper:Mg},bodyBg:!this._opts.transparentOutput,paperBg:!this._opts.transparentOutput,dprCap:this._opts.dprCap});const{gl:n,overlay:i}=this._trail?.canvases??{};n?.parentNode&&i&&i.parentNode!==n.parentNode&&n.parentNode.insertBefore(i,n.nextSibling)}setScrollAxis(t){t!==this._scrollAxis&&(this._scrollAxis=t,this._resetScroll())}scrollTo(t){t=Math.max(0,t);const n=t-this._scrollBase;if(this._scrollJump||n<0?this._slide=0:this._slide+=n,this._scrollJump=!1,this._scrollBase=t,this._applySlide(),this._slide&&!this._slideRaf){let i=performance.now();const a=o=>{this._slide*=Math.pow(1-gg,(o-i)*24/1e3),i=o,Math.abs(this._slide)<.3&&(this._slide=0),this._applySlide(),this._slideRaf=this._slide?requestAnimationFrame(a):0};this._slideRaf=requestAnimationFrame(a)}}get scrollBase(){return this._scrollBase}sylDrop(t){const n=this._sylDrop[t];return Number.isFinite(n)?n:null}get shownScrollBase(){return this._scrollBase-this._slide}_applySlide(){const t=this._slide?`translate${this._scrollAxis==="x"?"X":"Y"}(${this._slide.toFixed(1)}px)`:"";for(const n of Object.values(this._trail?.canvases??{}))n.parentNode&&(n.style.transform=t)}_resetScroll(){cancelAnimationFrame(this._slideRaf),this._slideRaf=0,this._scrollBase=this._slide=0,this._scrollJump=!0,this._applySlide()}update(t,n,i){if(i&&(this._JAMO=i),!this._JAMO||!this._trail)return;if(!t?.length){this.clearAccum();return}const a=window.innerWidth,o=window.innerHeight,r=this._trail.CFG.halo;r&&(r.ox=this._scrollAxis==="x"?-this._scrollBase:0,r.oy=this._scrollAxis==="y"?-this._scrollBase:0);const s=[];for(let u=0;u<t.length;u++){const T=t[u],b=n?.[u]??[.5,.5],R=s[s.length-1];R&&R.wordId===T.wordId&&Math.abs(R.anchor[1]-b[1])<1e-4?(R.syls.push(T),R.keys.push(`${T.cho}${T.jung}${T.jong??""}`)):s.push({wordId:T.wordId,i0:u,anchor:[b[0],b[1]],syls:[T],keys:[`${T.cho}${T.jung}${T.jong??""}`]})}const c=u=>`${u.wordId}@${u.anchor[0].toFixed(5)},${u.anchor[1].toFixed(5)}`,f=(u,T=u.syls,b=null)=>kc(this._JAMO,T,u.anchor[0]*a,u.anchor[1]*o,this.wrapStep,this._sampleStep,b),m=u=>this._trail.hashSeed("syl",u.cho,u.jung,u.jong??""),l=(u,T=u.syls)=>{const b={},R=f(u,T,b);let G=0;for(let L=1;L<R.length;L++)G+=Math.hypot(R[L].x-R[L-1].x,R[L].y-R[L-1].y);if(u.i0!=null){let L=0,O=0;const v=u.anchor[1]*o;for(let g=0;g<b.starts.length;g++)this._sylDrop[u.i0+g]=-1/0;for(let g=0;g<R.length;g++){for(g&&(L+=Math.hypot(R[g].x-R[g-1].x,R[g].y-R[g-1].y));O+1<b.starts.length&&L>=b.starts[O+1].px0;)O++;const w=R[g].y-v;w>this._sylDrop[u.i0+O]&&(this._sylDrop[u.i0+O]=w)}}const N=b.starts.map((L,O)=>{const v=(b.starts[O+1]?.px0??G)-L.px0;return{px0:L.px0,seed:m(L.syl),orbs:this._sylOrbs(L.syl,v),haloAngle:this._sylHaloAngle(L.syl),haloTone:this._sylHaloTone(L.syl),walkerSize:this._sylWalkerSize(L.syl)}});return{pts:R,plan:N}},h=u=>this._trail.hashSeed("word",...u.keys);this._sylDrop.length=t.length;const p=this._groups;let S=0;for(;S<p.length&&S<s.length&&p[S].sig===c(s[S])+"|"+s[S].keys.join("");)S++;if(S===p.length-1&&S===s.length-1&&this._holdingIdx===S){const u=p[S],T=s[S],b=Math.max(0,T.keys.length-ss),R=T.keys.slice(0,b);if(u.anchorKey===c(T)&&R.length<=u.keys.length&&u.keys.slice(0,R.length).join("\0")===R.join("\0")){const N=b>0?f(T,T.syls.slice(0,b)):[],{pts:L,plan:O}=l(T);this._trail.replaceTail(N.length,L.slice(N.length),O),u.keys=T.keys.slice(),u.stableKeys=R,u.sig=c(T)+"|"+T.keys.join(""),u.pointCount=L.length;return}}if(S===p.length&&S===s.length)return;const x=S<p.length;x&&(this._trail.clear(),this._groups=[]);const _=x?0:S;this._holdingIdx=-1;for(let u=_;u<s.length;u++){const T=s[u],{pts:b,plan:R}=l(T);if(b.length<2)continue;const G=u===s.length-1;if(x&&!G){const N=this._trail.CFG.outline.anim,L=N.on;N.on=!1,this._trail.addStroke(b,h(T),{plan:R}),N.on=L}else this._trail.queueStroke(b,h(T),{hold:G,plan:R});G&&(this._holdingIdx=u),this._groups.push({sig:c(T)+"|"+T.keys.join(""),anchorKey:c(T),keys:T.keys.slice(),stableKeys:T.keys.slice(0,Math.max(0,T.keys.length-ss)),pointCount:b.length})}}finishGrowing(){this._trail?.finishGrowing()}async flushQueue(){this._trail&&(await this._trail.flushQueue(),await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t))))}captureFrame(){return this._trail?this._trail.captureCanvas().toDataURL("image/png"):null}clearAccum(){this._trail?.clear(),this._trail?.resetStamps(),this._groups=[],this._sylDrop=[],this._holdingIdx=-1,this._resetScroll()}dispose(){this._resetScroll(),this._trail?.dispose(),this._trail=null,this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._canvas=null}setGenerator(t){this._generator=t==="anchor"?"anchor":"turtle",this._trail?.clear(),this._groups=[],this._holdingIdx=-1}_sylOrbs(t,n){const i=this._JAMO,a=ta(i,t.jong);if(!a)return[];const[o,r,s]=i[t.cho]?.cho?.pos??[.5,.5,.33],c=i[t.jung]?.pos?.[0]??500,f=Bo,m=Math.min(1,Math.max(0,(c-f.f1[0])/(f.f1[1]-f.f1[0]))),l=f.hue[0]+(f.hue[1]-f.hue[0])*o,h=f.sat[0]+(f.sat[1]-f.sat[0])*r,p=f.light[0]+(f.light[1]-f.light[0])*s,S=f.radius[0]+(f.radius[1]-f.radius[0])*m;return[{at:n*f.at,r:S,fill:`hsl(${l.toFixed(1)}, ${h.toFixed(1)}%, ${p.toFixed(1)}%)`,off:S+f.off,auto:!0,rays:Math.round(f.rays[0]+(f.rays[1]-f.rays[0])*r),width:f.width[0]+(f.width[1]-f.width[0])*s,spikes:this._jongSpikes(a)}]}_jongSpikes(t){const[n,,i]=t.pos;if(!(i>0))return null;const a=Bo;return{n:a.spikeN[0]+(a.spikeN[1]-a.spikeN[0])*n,len:a.spikeLen[0]+(a.spikeLen[1]-a.spikeLen[0])*i}}_sylWalkerSize(t){const n=this._JAMO[t.cho]?.cho?.pos?.[2]??.33,[i,a]=Bo.walkerSize;return i+(a-i)*n}_sylHaloTone(t){const[n,i,a]=this._JAMO[t.cho]?.cho?.pos??[.5,.5,.33],o=xg,r=([s,c],f)=>+(s+(c-s)*f).toFixed(1);return{h:r(o.hue,n),s:r(o.sat,i),l:r(o.light,a)}}_sylHaloAngle(t){const n=vg[t.jung];if(n!=null)return n;const i=this._JAMO[t.cho]?.cho?.pos?.[0]??0;return Sg[Math.round(i*4)%4]}cfg(){return this._trail?.CFG}engine(){return this._trail}}const bg=!0,Rg=`
vec3 orbitalPoint(float r, float freq, float angle, float theta, float phi, float e) {
    vec3 axis = vec3(sin(phi)*cos(theta), sin(phi)*sin(theta), cos(phi));
    vec3 up   = abs(axis.z) < 0.99 ? vec3(0,0,1) : vec3(1,0,0);
    vec3 u    = normalize(cross(axis, up));
    vec3 v    = cross(axis, u) * 1.2;  // #임의 조정
    float a   = freq * (1.0/3200.0) * angle;
    return r * cos(a)*u + r*(1.0-e) * sin(a)*v;
}

vec3 syllablePath(vec3 start, vec3 center, vec3 cho, float f1, float f2, float f3,
                float amp, float t, float yang, float diph) {
    float angle = t * TWO_PI * 5.0; // 에피사이클 회전 3.0 ~12. default 5
    float r1 = amp*(1.0/1.75), r2=r1*0.5, r3=r1*0.25;

    vec3 ep1 = orbitalPoint(r1, f1, angle, cho.x * TWO_PI,           cho.y * PI, 0.03); //0.3
    vec3 ep2 = orbitalPoint(r2, f2, angle, cho.y * TWO_PI + yang*PI, cho.z * PI, 0.25); //0.25
    vec3 ep3 = orbitalPoint(r3, f3, angle, cho.z * TWO_PI + diph*PI, yang  * PI, 0.65); //0.65

    vec3 ep4 = orbitalPoint(r3*0.4, f1*1.7, angle*1.3, cho.x*PI, cho.z*TWO_PI, 0.99);

    return center + ep1 + ep2 + ep3 - ep4*1.3; //임의 조정
}
`,Zn=`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`,$s=`
#define MAX_STEPS 20
#define MAX_DIST  20.0
#define EPS       5e-3
#define PI        3.14159
#define TWO_PI    6.28318
#define MAX_SYL   1

uniform vec2  u_resolution;
uniform float u_time;

uniform vec3  u_ro;
uniform mat3  u_camMat;
uniform float u_fov;

uniform vec3  u_start;
uniform vec3  u_center;
uniform vec3  u_cho;
uniform vec3  u_end;
uniform vec3  u_jung;
uniform vec3  u_hubCenters[2]; // mother tree 허브 center들 (연결 실 타겟, 최대 2개)
uniform float u_connCount;     // 활성 연결 개수 (0~2)
uniform float u_amp;
// 글자 전체 균일 스케일(음절 중심 기준). 모양은 늘 기준 크기(1단계)로 계산하고 여기서만
// 줄인다 → 작아져도 굵기·혹·노이즈 결이 같은 비율로 줄어 "같은 글자가 작아진 것"으로 보인다.
// map(p) = s · map_ref(center + (p-center)/s) — SDF의 정확한 균일 스케일.
uniform float u_glyphScale;
uniform float u_yangseong;
uniform float u_diphthong;
uniform float u_growT;
uniform float u_d3Displace;   // d3(고주파 노이즈) 처리 방식: 0=bump map만(가벼움), 1=거리장 displacement(디테일↑)

// 재질 ID: 0=경로(body), 1=혹(lump) — map()에서 기록, growFrag 컬러링에서 사용
float g_matID;

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * (h*1.0)) - r; //약간 끊김 0.95
}

// HSL → RGB
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0,4,2),6.0)-3.0)-1.0, 0.0, 1.0);
    return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

// 초성 좌표 → HSL 기반 컬러
// x(조음위치): hue 0=빨강(양순) → 0.7=파랑(후두)
// z(긴장도):   채도  울림=0.15 → 거센=0.9
// y(조음방법): 명도 미세조정
vec3 choToColor(vec3 cho) {
    float h = cho.x * 0.70;
    float s = 0.15 + cho.z * 0.75;
    float l = 0.45 + (cho.y - 0.5) * 0.12;
    return hsl2rgb(vec3(h, s, l));
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float opSmoothUnion(float d1, float d2, float k) {
    float h = max(k - abs(d1 - d2), 0.0);
    return min(d1, d2) - h * h * 0.25 / k;
}

vec3 opTwistPoint(vec3 p) {
    const float k = 0.5;
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * p.xz, p.y);
}

float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f); // smoothstep

    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), u.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y), u.z);
}

float displacement(vec3 p) {
    //return 0.1 * noise(p * 5.0);
    return sin(p.y * 10.0) * 0.1;
}

${Rg}

// ── 경로 사전계산 텍스처 (2026-09-26) ──────────────────────────────────────────
// 경로 점/테이퍼 노이즈/혹 위치는 음절 uniform만의 함수라 픽셀·스텝마다 다시 계산할
// 이유가 없다. 음절이 바뀔 때 pathFrag가 151×3 float 텍스처에 한 번 구워 두고 map()은
// 읽기만 한다(같은 GPU·같은 GLSL 식). u_usePathTex=0 이면 예전처럼 직접 계산.
//   row0: i=0..150 → (syllablePath(i/150), taperNoise(i/150))
//   row1: j=0..53  → (lumpPos, lumpR)      row2: j → (lt, 0, 0, 0)
uniform sampler2D u_pathTex;
uniform float     u_usePathTex;
#define PATH_TEX_W 151.0
vec4 pathTexel(float i, float row) {
  return texture2D(u_pathTex, vec2((i + 0.5) / PATH_TEX_W, (row + 0.5) / 3.0));
}

float taperNoiseAt(float t0) {
  return 0.8 + 0.6 * noise(vec3(t0 * 18.0, u_cho.x * 7.0, u_cho.z * 3.0));
}

// 혹 j 하나 — map()에 있던 식 그대로 옮김(growT 조건만 호출부에 남김)
void lumpAt(int j, out float lt, out vec3 lumpPos, out float lumpR) {
  float f1 = u_jung.x, f2 = u_jung.y, f3 = u_jung.z;
  float amp = u_amp, yang = u_yangseong, diph = u_diphthong;
  float k = 0.08, rad = 0.007;
  float seed = u_cho.x * 13.7 + u_cho.z * 5.3 + f1 * 0.01;
  float numLumps = 20.0 + u_cho.z * 34.0;
  float fj = float(j) * 91.7;

    // 문제2: 무작위 lt 대신 j마다 구간을 나눠 고르게 분산 (stratified) + 약간의 지터
    float jitter = hash(vec3(fj + seed * 3.1, seed, fj * 0.37));
    lt = (float(j) + 0.15 + jitter * 0.05) / numLumps;

    float dt = 0.01;
    vec3 pathPos = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, lt, yang, diph);

    // tangent 기반 프레임 대신, 월드 기준 랜덤 방향 + 위/아래 알터네이션
    // side: 위(+y) / 아래(-y) 절반씩 분배
    float side = hash(vec3(fj * 1.7 + seed, fj, seed * 0.9)) > 0.5 ? 1.0 : -1.0;
    vec3 perpDir = normalize(vec3(
      hash(vec3(fj * 2.3 + seed, 1.0, fj)) * 2.0 - 1.0,
      side * (0.6 + 0.4 * hash(vec3(fj * 4.1 + seed, 2.0, fj))), // 위/아래 쪽으로 치우침
      hash(vec3(fj * 5.1 + seed, 3.0, fj)) * 2.0 - 1.0
    ));

// lump 크기
    // 문제1: 본체 표면 반경 추정에 smooth-union bulge(k) 보정 추가
    // taper에 노이즈도 반영해 실제 map()의 d1 반경과 더 가깝게
    float taperBaseAtLt  = 0.1 + 0.9 * sin(lt * PI);
    float taperNoiseAtLt = 0.85 + 0.05 * noise(vec3(lt * 18.0, u_cho.x * 7.0, u_cho.z * 3.0));
    float bodyR = rad * taperBaseAtLt * taperNoiseAtLt + k * 0.75; // k*0.5: 관절 bulge 보정

    lumpR  = rad * (1.0 + hash(vec3(fj * 13.7 + seed, seed, 1.0)) * 1.8) * 2.2; // 크기 0.8배
    // lump 중심을 본체 표면 근처에 배치 → 절반은 묻히고 절반은 튀어나오는 혹 형태
    lumpPos = pathPos + perpDir * bodyR;
}

float map(vec3 p) {
  p = u_center + (p - u_center) / u_glyphScale; // 기준 크기 공간으로 (끝에서 d에 s를 곱해 되돌림)
  float f1   = u_jung.x;
  float f2   = u_jung.y;
  float f3   = u_jung.z;
  float amp  = u_amp;
  float yang = u_yangseong;
  float diph = u_diphthong;
  float num  = 150.0;
  float k    = 0.08; //0.06
  float rad  = 0.007; // 0.02
  float d    = MAX_DIST;

  for (int i = 0; i < int(num); i++) {
    float t0  = float(i)     / num;
    float t1  = float(i + 1) / num;
    if (t0 > u_growT) break;
    float t1c = min(t1, u_growT);
    vec3 a, b;
    float taperNoise;
    if (u_usePathTex > 0.5) {
      vec4 ta = pathTexel(float(i), 0.0);
      a = ta.xyz;
      taperNoise = ta.w;
      // t1 <= growT 이면 t1c == t1 → 다음 점 그대로. 자라는 끝 구간 하나만 직접 계산
      b = (t1 <= u_growT) ? pathTexel(float(i + 1), 0.0).xyz
                          : syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t1c, yang, diph);
    } else {
      a = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t0,  yang, diph);
      b = syllablePath(u_start, u_center, u_cho, f1, f2, f3, amp, t1c, yang, diph);
      taperNoise = taperNoiseAt(t0);
    }
    float pull = step(0.99, u_growT);
    b = mix(b, u_center + u_end, pull * step(u_growT - 0.001, t1));

    // 납작한 캡슐 트릭 (불안정) 지금 사용 안하는 중 - 적용 시 필기체 같은 비주얼 나옴.
    vec3 twistedP = opTwistPoint(p);
    twistedP *= 0.85;
    twistedP.y = twistedP.y + 4.0; //4
    twistedP.xz = twistedP.xz * 1.1;
    float twistedCapsule = sdCapsule(twistedP, a, b, rad);
    //d = opSmoothUnion(d, twistedCapsule, k);
    
    //thinD 얇은 점선 같은 똑같은 경로 옆에 하나 더 그리는 것 - 그냥 밀도용
    //p.x = p.x * 0.999;
    vec3 p1 = p;
    p1 = (p1 - a) * 45.0;
    float thinD = opSmoothUnion(d, sdCapsule(p1, a, b, 0.8), 0.008);
    
    // taper: 경로 중간(t=0.5)에서 가장 굵고 양 끝에서 얇아짐
    // + 노이즈로 불규칙한 굵기 변화 추가 (균사 매듭/잘록함 느낌, mycelium 전용)
    float taperBase  = 0.7 + 0.3 * sin(t0 * PI);  // 0.3~1.0 범위
    // taperNoise: 위에서 텍스처(또는 taperNoiseAt)로 — 식은 taperNoiseAt 참고
    float taper = taperBase * taperNoise;
    float d1 = sdCapsule(p, a, b, rad * taper);

    float d2 = sin(p.y * 10.0) * 0.1 * 0.175-0.0155; //for 태양 material
    // d3(고주파 노이즈): 기본은 실루엣/거리장에서 제외하고 bump map으로만 사용(가벼움).
    //   u_d3Displace > 0.5 이면 예전처럼 거리장에 직접 더해 실루엣까지 우글거리게 함(무거움, 디테일 look용).
    //   이땐 이중 적용 방지를 위해 growFrag의 applyBump를 끔.
    float displaced = d1 + d2;
    if (u_d3Displace > 0.5) displaced += 0.008 * noise(p * 95.0); //진폭(돌출), 주파수(촘촘함)

    d = opSmoothUnion(d, displaced, k);
    //d = opSmoothUnion(d, sdCapsule(p, a, b, rad), k); //displacement 없는 기본 캡슐
    
    d = min(d, thinD); //얇은 부분 추가
    
  }

  // ── lump (혹) — 경로 위 임의 위치에 작은 구를 붙여 포자/혹 같은 질감 추가 ──
  // 자모값을 시드로 사용해 음절마다 분포가 달라짐.
  // u_growT에 맞춰 점진적으로 등장(이미 그려진 경로 범위 내에서만).
  // -- connection thread (mother tree hub) --
  // trigger: tense consonant (cho.z>=0.65) / yeonum (prev jong + cur cho==ieung) / 종성 존재
  // grows together with pull, at growT>=0.99, thinner than body
  float seed = u_cho.x * 13.7 + u_cho.z * 5.3 + f1 * 0.01;
  float numLumps = 20.0 + u_cho.z * 34.0; // lump 개수
  float dLump = MAX_DIST;

  vec3 placed[54];
  int  placedCount = 0;

  for (int c = 0; c < 2; c++) {
    if (float(c) >= u_connCount) break;
    float connOn = step(0.99, u_growT);
    if (connOn > 0.5) {
        vec3 hub = u_center + (u_hubCenters[c] - u_center) / u_glyphScale; // 허브(실제 위치)도 기준 공간으로
        float cSeed = seed + float(c) * 7.0; // 두 연결선이 다르게 휘도록 시드 분리

        vec3 mid = mix(u_center, hub, 0.5);
        mid += vec3(hash(vec3(cSeed, 1.0, 2.0)) - 0.5, hash(vec3(cSeed, 3.0, 4.0)) - 0.5, 0.0) * 0.8; // 0.3 = 휘어짐 강도, 조절 포인트

        float dConn = min(
            sdCapsule(p, u_center, mid, rad * 1.8),
            sdCapsule(p, mid, hub, rad * 0.3)
        );

        // 타겟 쪽 작은 앵커 blop
        float dAnchor = sdSphere(p - hub, rad * 0.2);
        dConn = opSmoothUnion(dConn, dAnchor, k * 1.6); // 앵커 쪽 melt 강도

        d = opSmoothUnion(d, dConn, k * 1.4);
    }
  }

  for (int j = 0; j < 54; j++) {
    if (float(j) >= numLumps * u_growT) break;
    float lt, lumpR;
    vec3 lumpPos;
    if (u_usePathTex > 0.5) {
      vec4 L = pathTexel(float(j), 1.0);
      lumpPos = L.xyz;
      lumpR = L.w;
      lt = pathTexel(float(j), 2.0).x;
    } else {
      lumpAt(j, lt, lumpPos, lumpR);
    }
    if (lt > u_growT) continue; // 아직 도달 안 한 위치 — 스킵 (트레일 방지)

    placed[placedCount] = lumpPos;
    placedCount++;

    float dl = sdSphere(p - lumpPos, lumpR);
    dLump = min(dLump, dl);
  }

  // body(d)와 lump(dLump) 블렌딩 + 재질 ID(g_matID) 계산
  float lumpK = 0.012;
  float h = clamp(0.5 + 0.5 * (dLump - d) / lumpK, 0.0, 1.0);
  g_matID = 1.0 - h; // 0=경로(body), 1=혹(lump)
  d = mix(dLump, d, h) - lumpK * h * (1.0 - h);

  return d * u_glyphScale;
}


// ── 경계 판정 (2026-09-26) ─────────────────────────────────────────────────────
// 레이마칭은 전체 화면 픽셀마다 map()(캡슐 150개 + 혹 최대 54개)을 최대 20번 부른다.
// 음절은 화면의 일부만 차지하므로, 광선이 음절 경계에 아예 안 닿는 픽셀은 레이마칭 전에
// 버린다(TD 실측: growT=1 한 패스 482ms → TD fps 1~5). 닿는 픽셀은 예전과 똑같이 t=0부터
// 레이마칭하므로 룩은 그대로 — 버려지는 픽셀은 원래도 아무것도 안 맞던 픽셀이어야 한다.
//   경로 반경 ≤ 1.2·(r1+r2+r3) + ep4 ≈ 1.29·amp,  끝점 pull = u_center + u_end
//   BOUND_MARGIN: 혹(≤0.11) + d2 변형(0.033) + thinD 오프셋(|a|/45 ≈ 0.13) + smooth-union
//   부풀음 + noise — 전부 합쳐도 0.35 안쪽. 글자 끝이 잘려 보이면 이 값을 올릴 것
#define BOUND_MARGIN 0.45
// 연결 실: center→mid→hub, mid는 center-hub 중점에서 xy로 최대 ±0.4 → 선분에서 ≤0.57
#define CONN_MARGIN  0.75

bool hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b * b - (dot(oc, oc) - r * r);
  return h >= 0.0 && (-b + sqrt(h)) > 0.0;
}

// 광선과 선분(pa-pb) 사이 최단거리 < r 인가 (캡슐 판정)
bool hitCapsule(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float r) {
  vec3 ba = pb - pa, oa = ro - pa;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
  float a = baba - bard * bard;
  float b = baba * rdoa - baoa * bard;
  float c = baba * oaoa - baoa * baoa - r * r * baba;
  float h = b * b - a * c;
  if (h >= 0.0 && a > 1e-6) {
    float t = (-b - sqrt(h)) / a;
    float y = baoa + t * bard;
    if (y > 0.0 && y < baba) return true;
  }
  return hitSphere(ro, rd, pa, r) || hitSphere(ro, rd, pb, r);
}

bool hitSyllableBounds(vec3 ro, vec3 rd) {
  float R = (max(1.3 * u_amp, length(u_end)) + BOUND_MARGIN) * u_glyphScale;
  if (hitSphere(ro, rd, u_center, R)) return true;
  if (u_growT >= 0.99) {
    for (int c = 0; c < 2; c++) {
      if (float(c) >= u_connCount) break;
      if (hitCapsule(ro, rd, u_center, u_hubCenters[c], CONN_MARGIN * u_glyphScale)) return true;
    }
  }
  return false;
}

float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float d = map(ro + rd * t);
    if (d < EPS * u_glyphScale) return t; // 명중 임계도 같이 스케일 — 안 하면 작을수록 뚱뚱해짐
    t += d;
    if (t > MAX_DIST) break;
  }
  return -1.0;
}

vec3 estimateNormal(vec3 p) {
  vec2 e = vec2(0.005 * u_glyphScale, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// d3를 raymarch용 map()에서 빼고 여기서 bump map으로만 적용 (테스트)
// -- map()/raymarch 루프에서 noise(p*95.0)를 반복 호출하지 않아도 되므로 훨씬 가벼움.
float bumpMap(vec3 p) {
  return 0.05 * noise(p * 105.0); //진폭(돌출) 주파수(촘촘함 정도)
}

vec3 applyBump(vec3 p, vec3 n) {
  p = u_center + (p - u_center) / u_glyphScale; // bump 결도 기준 공간에서
  vec2 e = vec2(0.005, 0.0);
  vec3 grad = vec3(
    bumpMap(p + e.xyy) - bumpMap(p - e.xyy),
    bumpMap(p + e.yxy) - bumpMap(p - e.yxy),
    bumpMap(p + e.yyx) - bumpMap(p - e.yyx)
  );
  return normalize(n + grad * 12.0);
}

float rand(vec3 p){
  float sd  = dot(p, vec3(13.4545, 17.1717, 31.3131));
  float sd2 = dot(p, vec3(23.4545, 27.1717, 11.3131));
  return fract(sin(sd + sd2) * 45678.54321);
}
`,yg=`
#ifdef GL_ES
precision highp float;
#endif

${$s}

void main() {
    float i   = floor(gl_FragCoord.x);
    float row = floor(gl_FragCoord.y);
    if (row < 0.5) {
        float t0 = i / 150.0;
        vec3 P = syllablePath(u_start, u_center, u_cho, u_jung.x, u_jung.y, u_jung.z, u_amp, t0, u_yangseong, u_diphthong);
        gl_FragColor = vec4(P, taperNoiseAt(t0));
    } else {
        float lt, lumpR;
        vec3 lumpPos;
        lumpAt(int(i), lt, lumpPos, lumpR);
        gl_FragColor = row < 1.5 ? vec4(lumpPos, lumpR) : vec4(lt, 0.0, 0.0, 0.0);
    }
}
`,wg=`
#ifdef GL_ES
precision highp float;
#endif

${$s}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 rd = normalize(
        u_camMat[0] * uv.x +
        u_camMat[1] * uv.y -
        u_camMat[2] * u_fov
    );

    float t = hitSyllableBounds(u_ro, rd) ? raymarch(u_ro, rd) : -1.0;

    if (t < 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec3 pos = u_ro + rd * t;

    vec3 nor = estimateNormal(pos);
    // d3 처리 방식 분기: displacement 모드(u_d3Displace>0.5)면 map()이 이미 디테일을 갖고 있으므로 bump 생략
    if (u_d3Displace < 0.5) nor = applyBump(pos, nor);
    // 표면 지점에서의 재질 ID(g_matID) 확정 (estimateNormal의 마지막 호출값은 오프셋 지점이므로 재계산)
    float _surfD = map(pos);

    vec3 V      = normalize(-rd);
    vec3 choCol = u_cho;//choToColor(u_cho);
    vec3 col    = vec3(0.0);

    //vec3 L = vec3(1., 1., 0.8);

    vec3 L = vec3(1.0, -1.0, -0.2);
    float shk_a = rand(vec3(uv, .0)) * 1.2 * PI;
    float shk_r = rand(vec3(uv, 1.)) * 1.;
    vec2 shk = vec2(cos(shk_a), sin(shk_a)) * shk_r;
    L.xz += shk;

    float diff      = max(dot(nor, L), 0.0);
    float toonSteps = 4.0;
    float diffQ     = floor(diff * toonSteps) / toonSteps;
    float band      = floor(diffQ * (toonSteps - 1.0) + 1e-3);
    vec3 baseCol = vec3(0.999) * (0.85 + 0.15 * diff);
    vec3 monoCol = mix(vec3(0.48), baseCol, (toonSteps - 1.0) - band) * 1.2 + 0.3;
    baseCol = mix(choCol, baseCol, (toonSteps - 1.0) - band) * 1.2;

    // 경로(body) / 혹(lump) 색 분리 — 옵션 A: 현재는 동일색,
    // 추후 lumpCol만 따로 조정해 혹에 강조색 부여 가능
    vec3 bodyCol = monoCol;
    vec3 lumpCol = baseCol * 0.95;
    col = mix(bodyCol, lumpCol, g_matID);

    // 외곽 발광 — 검은 edge glow로 적용
    float rim = pow(1.0 - max(dot(nor, V), 0.0), 1.2);
    float flareStr = 1.4;//0.6 + choCol.z * 0.8;
    col = mix(col, vec3(0.0), rim * rim * flareStr * 1.2);

    gl_FragColor = vec4(col, 1.0);
}
`,Cg=`
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_growTex;
uniform sampler2D u_bckbuffer;
uniform vec2      u_resolution;
uniform float     u_isFirst;

void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution;
    vec4 grow = texture2D(u_growTex,   uv);
    vec4 prev = texture2D(u_bckbuffer, uv);

    vec4 col = (grow.a > 0.5)
        ? grow
        : (u_isFirst > 0.5 ? vec4(0.0) : prev);

    gl_FragColor = col;
}
`,Lg=1600,Ks=`
uniform sampler2D u_accumTex;
uniform sampler2D u_ghostTex;
uniform float     u_ghostT;
uniform vec2      u_resolution;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec4 ghostAt(vec2 uv) {
    float p = u_ghostT;
    if (p >= 1.0) return vec4(0.0);
    vec2 asp = vec2(u_resolution.x / u_resolution.y, 1.0);
    // 덩어리(저주파)마다 다른 방향으로 흘러가고 전체는 조금 떠오른다(uv.y 위 = +)
    vec2 dir = vec2(vnoise(uv * asp * 6.0 + 3.1), vnoise(uv * asp * 6.0 + 7.7)) - 0.5;
    vec2 suv = uv - (dir * 0.06 + vec2(0.0, 0.025)) * p * p; // #disperse 흩어지는 거리
    vec4 g = texture2D(u_ghostTex, suv);
    // 침식 — 고주파 알갱이 + 중간 덩어리. 문턱이 -0.1→1.05로 올라가며 전부 사라진다
    vec2 sq = suv * asp;
    float n = vnoise(sq * 160.0) * 0.55 + vnoise(sq * 22.0) * 0.45; // #disperse 알갱이 크기
    float th = mix(-0.1, 1.05, p);
    g.a *= smoothstep(th, th + 0.08, n);
    return g;
}

// accum over ghost (straight alpha)
vec4 compose(vec2 uv) {
    vec4 a = texture2D(u_accumTex, uv);
    vec4 g = ghostAt(uv);
    float outA = a.a + g.a * (1.0 - a.a);
    vec3 rgb = outA > 0.0 ? (a.rgb * a.a + g.rgb * g.a * (1.0 - a.a)) / outA : vec3(0.0);
    return vec4(rgb, outA);
}
`,Ig=`
#ifdef GL_ES
precision highp float;
#endif
${Ks}
void main() {
    gl_FragColor = compose(gl_FragCoord.xy / u_resolution);
}
`,Pg=e=>`
#ifdef GL_ES
precision highp float;
#endif
${Ks}
void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution;
    vec4 acc = compose(uv);

    ${e?"gl_FragColor = vec4(acc.rgb, acc.a);":"gl_FragColor = vec4(mix(vec3(0.7), acc.rgb, acc.a), 1.0);// #bg color"}
}
`,Dg=`
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_src;
uniform vec2      u_resolution;
uniform vec2      u_shift;

void main() {
    vec2 uv = (gl_FragCoord.xy + u_shift) / u_resolution;
    bool inside = uv.x >= 0.0 && uv.x < 1.0 && uv.y >= 0.0 && uv.y < 1.0;
    gl_FragColor = inside ? texture2D(u_src, uv) : vec4(0.0);
}
`,Ug=.12;class Ng{constructor(t={}){this.emitsSyllableStart=!0,this._transparent=!!t.transparentOutput,this._renderer=null,this._clock=null,this._raf=null,this._lastTime=0,this._FRAME_INTERVAL=1e3/24,this._camPos=new Ye(.3,.5,7),this._camTarget=new Ye(0,0,0),this._growTarget=null,this._accumTarget=null,this._prevTarget=null,this._growScene=null,this._accumScene=null,this._dispScene=null,this._growUniforms=null,this._accumUniforms=null,this._dispUniforms=null,this._quadCam=null,this._queue=[],this._growing=!1,this._instantBake=!1,this._growStart=0,this._isFirstGlyph=!0,this._prevSylCount=0,this._forceComplete=!1,this._forceFinish=!1,this._hubs=new Map,this._curScale=1,this._sylHubIds=[],this._bakedCenters=[],this._bakedScale=1,this._rebaking=!1,this.lineHeightRatio=2.3,this.sylSize=100,this.wrapStep=165,this.wrapMargin=0,this.glyphExtent=1.5,this.refHeight=859,this.layoutScale={x:1.28,y:1},this.displayScale=1.2,this._scrollTarget=0,this._scrollPos=0,this._scrollBase=0,this._shownScrollBase=0,this._scrollJump=!0,this._scrollAxis="x",this._rect=null,this._ghostStart=null,this._d3Displace=bg}async init(t){const n=window.innerWidth,i=window.innerHeight,a=Math.min(window.devicePixelRatio,2);this._renderer=new n_({antialias:!0,canvas:t??void 0,alpha:this._transparent,premultipliedAlpha:!this._transparent}),this._renderer.setSize(n,i),this._transparent&&this._renderer.setClearColor(0,0),this._renderer.setPixelRatio(a),this._ownCanvas=!t,t||(this._renderer.domElement.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._renderer.domElement)),this._clock=new yc,this._quadCam=new ws(-1,1,1,-1,0,1);const o={minFilter:Tn,magFilter:Tn,format:rn,type:bn},r=n*a,s=i*a;this._growTarget=new on(r,s,o),this._accumTarget=new on(r,s,o),this._prevTarget=new on(r,s,o),this._pathTarget=new on(151,3,{minFilter:Un,magFilter:Un,format:rn,type:Mn,depthBuffer:!1});const{ro:c,camMat:f,fov:m}=this._calcCamera();this._growUniforms={u_resolution:{value:new wt(r,s)},u_time:{value:0},u_ro:{value:c},u_camMat:{value:f},u_fov:{value:m},u_start:{value:new Ye},u_center:{value:new Ye},u_cho:{value:new Ye},u_end:{value:new Ye},u_jung:{value:new Ye},u_hubCenters:{value:[new Ye,new Ye]},u_connCount:{value:0},u_amp:{value:0},u_yangseong:{value:0},u_diphthong:{value:0},u_growT:{value:0},u_d3Displace:{value:this._d3Displace?1:0},u_glyphScale:{value:1},u_pathTex:{value:this._pathTarget.texture},u_usePathTex:{value:1}},this._growScene=this._makeQuadScene(Zn,wg,this._growUniforms);const{u_pathTex:l,...h}=this._growUniforms;this._pathScene=this._makeQuadScene(Zn,yg,h),this._accumUniforms={u_growTex:{value:this._growTarget.texture},u_bckbuffer:{value:this._prevTarget.texture},u_resolution:{value:new wt(r,s)},u_isFirst:{value:1}},this._accumScene=this._makeQuadScene(Zn,Cg,this._accumUniforms),this._ghostTarget=new on(r,s,o),this._ghostTarget2=new on(r,s,o),this._dispUniforms={u_accumTex:{value:this._accumTarget.texture},u_ghostTex:{value:this._ghostTarget.texture},u_ghostT:{value:1},u_resolution:{value:new wt(r,s)}},this._dispScene=this._makeQuadScene(Zn,Pg(this._transparent),this._dispUniforms),this._ghostUniforms={u_accumTex:{value:null},u_ghostTex:{value:null},u_ghostT:{value:1},u_resolution:{value:new wt(r,s)}},this._ghostScene=this._makeQuadScene(Zn,Ig,this._ghostUniforms),this._shiftUniforms={u_src:{value:null},u_resolution:{value:new wt(r,s)},u_shift:{value:new wt}},this._shiftScene=this._makeQuadScene(Zn,Dg,this._shiftUniforms),window.addEventListener("resize",this._onResize),this._raf=requestAnimationFrame(this._animate)}forceRebake(t,n){if(!t||n===0)return;const{starts:i,centers:a,chos:o,ends:r,jungs:s,amps:c,yangseong:f,diphthong:m}=t;this._curScale=t.scale??1,this._queue=[],this._growing=!1,this._isFirstGlyph=!0;for(let l=0;l<n;l++)this._queue.push(this._makeItem(i[l],a[l],o[l],r[l],s[l],c[l],f[l],m[l],!0));this._prevSylCount=n,this._dequeue()}update(t,n=0,i=null){if(!t)return;const{starts:a,centers:o,chos:r,ends:s,jungs:c,amps:f,yangseong:m,diphthong:l,confirmed:h}=t,p=this._prevSylCount;if(this._curScale=t.scale??1,n>=p&&(this._bakedCenters.some((x,_)=>_<p&&x.distanceToSquared(o[_])>1e-8)||p>0&&Math.abs(this._curScale-this._bakedScale)>1e-6)&&this._rebake(t,p),this._bakedCenters=o.slice(0,n).map(x=>x.clone()),this._bakedScale=this._curScale,n<p){this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._hubs=new Map,this._sylHubIds=[];for(let x=0;x<n;x++)this._queue.push(this._makeItem(a[x],o[x],r[x],s[x],c[x],f[x],m[x],l[x],!0))}else{for(let x=p;x<n;x++){x>0&&this._maybeRegisterHub(x-1,t);let _=[];if(i&&i[x]){const R=r[x].z>=.65,G=i[x-1],N=i[x],L=x>0&&!!G?.jong&&N.cho==="ㅇ",O=!!N.jong,v=[R,L,O].filter(Boolean).length,g=v>=2?2:v>=1?1:0;if(g>0){const w=this._pickHubTargets(g);_=w.map(U=>U.center),this._sylHubIds[x]=w.map(U=>U.id)}}const u=h?h[x]:!1,T=this._makeItem(a[x],o[x],r[x],s[x],c[x],f[x],m[x],l[x],u,_,_.length);T.syl=i?.[x]??null,this._queue.push(T)}n>p&&p>0&&this._growing&&(this._growUniforms.u_end.value.copy(s[p-1]),this._forceComplete=!0)}this._prevSylCount=n,this._growing||this._dequeue()}_maybeRegisterHub(t,n){const i=n.chos[t];if(i.y>=.75)return;const a=n.amps[t],o=new Ye((i.x-.5)*2,(i.y-.5)*2,(i.z-.5)*2).multiplyScalar(a*.6*(n.scale??1)),r=n.centers[t].clone().add(o);this._hubs.set(t,{id:t,center:r,connections:0})}_rebake(t,n){const{starts:i,centers:a,chos:o,ends:r,jungs:s,amps:c,yangseong:f,diphthong:m}=t;for(const[l,h]of this._hubs){const p=o[l],S=new Ye((p.x-.5)*2,(p.y-.5)*2,(p.z-.5)*2).multiplyScalar(c[l]*.6*(t.scale??1));h.center=a[l].clone().add(S)}this._queue=[],this._growing=!1,this._forceComplete=!1,this._isFirstGlyph=!0,this._rebaking=n>0;for(let l=0;l<n;l++){const h=(this._sylHubIds[l]??[]).map(p=>this._hubs.get(p)?.center).filter(Boolean);this._queue.push(this._makeItem(i[l],a[l],o[l],r[l],s[l],c[l],f[l],m[l],!0,h,h.length))}}_pickHubTargets(t){const n=[],i=new Set;for(let a=0;a<t;a++){const o=[...this._hubs.entries()].filter(([h])=>!i.has(h));if(o.length===0)break;const r=o.map(([,h])=>h.connections+1),s=r.reduce((h,p)=>h+p,0);let c=Math.random()*s,f=o[o.length-1];for(let h=0;h<o.length;h++)if(c-=r[h],c<=0){f=o[h];break}const[m,l]=f;l.connections++,i.add(m),n.push(l)}return n}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._growTarget?.dispose(),this._accumTarget?.dispose(),this._prevTarget?.dispose(),this._pathTarget?.dispose(),this._ghostTarget?.dispose(),this._ghostTarget2?.dispose(),this._renderer?.dispose();const t=this._renderer?.domElement;this._ownCanvas&&t?.parentNode&&t.parentNode.removeChild(t)}screenToWorld(t,n){const i=window.innerWidth,a=window.innerHeight,{ro:o,camMat:r,fov:s}=this._calcCamera(),c=new Ye((t*2-1)*(i/a),1-n*2,-s).applyMatrix3(r).normalize();return o.clone().addScaledVector(c,-o.z/c.z)}_toScreen(t){const n=window.innerWidth,i=window.innerHeight,{ro:a,camMat:o,fov:r}=this._calcCamera(),s=t.clone().sub(a).applyMatrix3(o.clone().transpose()),c=-s.z/r;return{u:(s.x/c/(n/i)+1)/2,v:(1-s.y/c)/2,t:c}}_shiftAtDepth(t,n,i=0){const{camMat:a}=this._calcCamera(),{t:o}=this._toScreen(t),r=window.innerWidth,s=window.innerHeight;return t.clone().add(new Ye(-2*n*(r/s)*o,2*i*o,0).applyMatrix3(a))}setScrollAxis(t){t!==this._scrollAxis&&(this._scrollAxis=t,this._scrollTarget=this._scrollPos=this._scrollBase=0,this._scrollJump=!0)}scrollTo(t){const n=Math.max(0,t)*this._renderer.getPixelRatio();if(this._scrollTarget=n,this._scrollJump||n<this._scrollPos){this._scrollJump=!1,this._scrollPos=n,this._scrollBase=Math.round(n);return}const i=window.innerWidth,a=window.innerHeight,o=this._scrollAxis==="y"?this._rect?a-(this._rect.y+this._rect.h):a*.1:this._rect?i-(this._rect.x+this._rect.w):i*.1,r=Math.max(1,o*.8*this._renderer.getPixelRatio()),s=Math.round(n-r)-this._scrollBase;s>0&&(this._shiftAccum(s),this._scrollPos=Math.max(this._scrollPos,this._scrollBase))}disperse(){const t=this._renderer,n=this._ghostUniforms;n.u_accumTex.value=this._accumTarget.texture,n.u_ghostTex.value=this._ghostTarget.texture,n.u_ghostT.value=this._dispUniforms.u_ghostT.value,t.setRenderTarget(this._ghostTarget2),t.render(this._ghostScene,this._quadCam),t.setRenderTarget(null),[this._ghostTarget,this._ghostTarget2]=[this._ghostTarget2,this._ghostTarget],this._dispUniforms.u_ghostTex.value=this._ghostTarget.texture,this._dispUniforms.u_ghostT.value=0,this._ghostStart=performance.now()}get scrollBase(){return this._scrollBase/(this._renderer?.getPixelRatio()??1)}get shownScrollBase(){return this._shownScrollBase/(this._renderer?.getPixelRatio()??1)}get rebaking(){return this._rebaking}setRect(t){this._rect=t}setD3Displace(t){this._d3Displace=!!t,this._growUniforms&&(this._growUniforms.u_d3Displace.value=this._d3Displace?1:0)}isIdle(){return!this._growing&&this._queue.length===0}finishGrowing(){(this._growing||this._queue.length>0)&&(this._forceFinish=!0)}flushQueue(){const t=n=>requestAnimationFrame(()=>requestAnimationFrame(n));return this.finishGrowing(),!this._growing&&this._queue.length===0?new Promise(t):new Promise(n=>{const i=()=>{!this._growing&&this._queue.length===0?t(n):requestAnimationFrame(i)};requestAnimationFrame(i)})}captureFrame(){const t=this._accumTarget.width,n=this._accumTarget.height,i=new Uint8Array(t*n*4);this._renderer.readRenderTargetPixels(this._accumTarget,0,0,t,n,i);const a=document.createElement("canvas");a.width=t,a.height=n;const o=a.getContext("2d"),r=o.createImageData(t,n);for(let s=0;s<n;s++){const c=(n-1-s)*t*4,f=s*t*4;r.data.set(i.subarray(c,c+t*4),f)}return o.putImageData(r,0,0),a.toDataURL("image/png")}clearAccum(){this._queue=[],this._growing=!1,this._forceFinish=!1,this._isFirstGlyph=!0,this._prevSylCount=0,this._hubs=new Map,this._sylHubIds=[],this._bakedCenters=[],this._scrollTarget=this._scrollPos=this._scrollBase=0,this._scrollJump=!0;const t=this._renderer.getClearColor(new Tt),n=this._renderer.getClearAlpha();this._renderer.setClearColor(0,0),this._renderer.setRenderTarget(this._accumTarget),this._renderer.clear(),this._renderer.setRenderTarget(this._prevTarget),this._renderer.clear(),this._renderer.setRenderTarget(null),this._renderer.setClearColor(t,n)}_makeItem(t,n,i,a,o,r,s,c,f,m=[],l=0,h=this._curScale){return{scale:h,start:t.clone(),center:n.clone(),cho:i.clone(),end:a.clone(),jung:o.clone(),amp:r,yang:s,diph:c,instant:f,hubCenters:m.map(p=>p.clone()),connCount:l}}_bakePath(){const t=this._renderer.getRenderTarget();this._renderer.setRenderTarget(this._pathTarget),this._renderer.render(this._pathScene,this._quadCam),this._renderer.setRenderTarget(t)}_dequeue(){if(this._queue.length===0)return;const t=this._queue.shift(),n=this._growUniforms;n.u_start.value.copy(t.start),n.u_center.value.copy(t.center),n.u_cho.value.copy(t.cho),n.u_end.value.copy(t.end),n.u_jung.value.copy(t.jung),n.u_amp.value=t.amp,n.u_yangseong.value=t.yang,n.u_diphthong.value=t.diph,n.u_hubCenters.value[0].copy(t.hubCenters[0]??new Ye),n.u_hubCenters.value[1].copy(t.hubCenters[1]??new Ye),n.u_connCount.value=t.connCount??0,n.u_glyphScale.value=t.scale??1,this._bakePath(),n.u_growT.value=0,this._growStart=this._clock.getElapsedTime(),this._growing=!0,this._instantBake=t.instant,!t.instant&&t.syl&&this.onSyllableStart?.(t.syl)}_stepScroll(){if(this._scrollPos===this._scrollTarget)return;this._scrollPos+=(this._scrollTarget-this._scrollPos)*Ug,Math.abs(this._scrollTarget-this._scrollPos)<.5&&(this._scrollPos=this._scrollTarget);const t=Math.round(this._scrollPos)-this._scrollBase;t>0&&this._shiftAccum(t)}_shiftAccum(t){const n=this._renderer,i=this._accumTarget,a=Math.floor(i.width),o=Math.floor(i.height);this._shiftUniforms.u_src.value=i.texture,this._shiftUniforms.u_resolution.value.set(a,o);const r=this._scrollAxis==="y";this._shiftUniforms.u_shift.value.set(r?0:t,r?-t:0),n.setRenderTarget(this._prevTarget),n.render(this._shiftScene,this._quadCam),n.setRenderTarget(null),this._accumTarget=this._prevTarget,this._prevTarget=i,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._scrollBase+=t;const s=r?0:t/(window.innerWidth*n.getPixelRatio()),c=r?t/(window.innerHeight*n.getPixelRatio()):0,f=l=>{const h=this._toScreen(l);return this.screenToWorld(h.u-s,h.v-c)},m=(l,h,p)=>{const S=f(h).sub(h);l.add(S),h.add(S);for(const x of p)x.copy(this._shiftAtDepth(x,s,c))};this._bakedCenters=this._bakedCenters.map(f);for(const l of this._hubs.values())l.center=this._shiftAtDepth(l.center,s,c);for(const l of this._queue)m(l.start,l.center,l.hubCenters);if(this._growing){const l=this._growUniforms;m(l.u_start.value,l.u_center.value,l.u_hubCenters.value.slice(0,l.u_connCount.value)),this._bakePath()}}_swapAndAccum(t){const n=this._prevTarget;this._prevTarget=this._accumTarget,this._accumTarget=n,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._accumUniforms.u_isFirst.value=t?1:0,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._renderer.setRenderTarget(this._accumTarget),this._renderer.render(this._accumScene,this._quadCam)}_animate=t=>{if(this._raf=requestAnimationFrame(this._animate),t-this._lastTime<this._FRAME_INTERVAL-4)return;if(this._lastTime=t,this._growUniforms.u_time.value=this._clock.getElapsedTime(),this._stepScroll(),this._ghostStart!==null){const i=(performance.now()-this._ghostStart)/Lg;this._dispUniforms.u_ghostT.value=Math.min(1,i),i>=1&&(this._ghostStart=null)}if(!this._growing){if(this._queue.length)return;this._renderDisplay();return}let n;if(this._instantBake){n=1,this._growUniforms.u_growT.value=1,this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._growing=!1,requestAnimationFrame(()=>{this._growing||this._dequeue()});return}else{const i=this._growUniforms.u_growT.value;n=this._forceComplete||this._forceFinish?1:i+(1-i)*.08,this._forceComplete=!1,this._growUniforms.u_growT.value=n>=.98?1:n}this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._renderDisplay(),n>=1&&(this._growing=!1,this._dequeue(),this._forceFinish&&this._queue.length===0&&!this._growing&&(this._forceFinish=!1))};_renderDisplay(){this._renderer.setRenderTarget(null),this._renderer.render(this._dispScene,this._quadCam),this._shownScrollBase=this._scrollBase,this._rebaking=!1}_calcCamera(){const t=this._camPos.clone(),i=this._camTarget.clone().clone().sub(t).normalize(),a=new Ye(0,1,0),o=new Ye().crossVectors(i,a).normalize(),r=new Ye().crossVectors(o,i).normalize(),s=new lt().set(o.x,o.y,o.z,r.x,r.y,r.z,-i.x,-i.y,-i.z),c=1/Math.tan(Cc.degToRad(45)/2);return{ro:t,camMat:s,fov:c}}_makeQuadScene(t,n,i){const a=new wc;return a.add(new _n(new ea(2,2),new Rn({uniforms:i,vertexShader:t,fragmentShader:n}))),a}_onResize=()=>{const t=window.innerWidth,n=window.innerHeight,i=this._renderer.getPixelRatio(),a=t*i,o=n*i;this._renderer.setSize(t,n),this._growTarget.setSize(a,o),this._accumTarget.setSize(a,o),this._prevTarget.setSize(a,o),this._ghostTarget.setSize(a,o),this._ghostTarget2.setSize(a,o),this._dispUniforms.u_ghostT.value=1,this._ghostStart=null;const r=new wt(a,o);this._growUniforms.u_resolution.value.copy(r),this._accumUniforms.u_resolution.value.copy(r),this._dispUniforms.u_resolution.value.copy(r),this._ghostUniforms.u_resolution.value.copy(r);const{ro:s,camMat:c,fov:f}=this._calcCamera();this._growUniforms.u_ro.value.copy(s),this._growUniforms.u_camMat.value.copy(c),this._growUniforms.u_fov.value=f,this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._scrollJump=!0}}const Fg={sora:Qc,signal:Pm,dandelion:Ag,mycelium:Ng};class Vg{constructor(t=null){this._canvas=t,this._current=null,this._name=null}async setReceiver(t,n={}){if(this._name===t)return;this._current&&(this._current.dispose(),this._current=null);const i=Fg[t];if(!i)throw new Error(`Unknown receiver: ${t}`);if(this._canvas?.parentNode){const a=document.createElement("canvas");a.id=this._canvas.id,a.className=this._canvas.className,a.style.cssText=this._canvas.style.cssText,this._canvas.parentNode.replaceChild(a,this._canvas),this._canvas=a}this._current=new i(n),this._name=t,this._current.onSyllableStart=a=>this.onSyllableStart?.(a,t),await this._current.init(this._canvas)}update(...t){this._current?.update(...t)}get name(){return this._name}get current(){return this._current}dispose(){this._current?.dispose(),this._current=null,this._name=null}}function zg({enabled:e=!0}={}){let t=null,n=null;function i(){if(t)return t;const c=window.AudioContext||window.webkitAudioContext;if(!c)return null;t=new c;const f=t.createDynamicsCompressor();return f.threshold.value=-18,f.ratio.value=4,n=t.createGain(),n.gain.value=.6,n.connect(f).connect(t.destination),t}function a(){if(!e)return;const c=i();c&&c.state!=="running"&&c.resume().catch(()=>{})}let o=null;function r(c,f=null){if(!e||!c)return;const m=i();!m||m.state!=="running"||(o={h:Og(m,n,c,m.currentTime),syl:f})}function s(c){!o||!c||(Bg(o.h,c.ending),o.syl={...o.syl,jong:c.jong})}return{play:r,endLast:s,unlock:a,get lastSyl(){return o?.syl??null},get state(){return t?.state??"none"}}}function Og(e,t,n,i){const a=e.createGain(),o=i+n.length+.05;a.gain.setValueAtTime(n.gain,i),a.gain.setValueAtTime(n.gain,o-.1),a.gain.linearRampToValueAtTime(0,o),a.connect(t);const r=n.ending,s={c:e,out:a,v:n,t0:i,tStop:o,modes:[],srcs:[]},c=[...n.noise??[]];r?.hiss&&c.push({...r.hiss,at:r.at-r.hiss.dur});for(const f of c)js(e,a,f.center,f.q,i+f.at,f.dur,f.gain);for(const f of n.modes){const m=n.detune?[-n.detune/2,n.detune/2]:[0];for(const l of m){const h=e.createGain(),p=f.amp/m.length,S=i+n.attack;if(h.gain.setValueAtTime(0,i),h.gain.linearRampToValueAtTime(p,S),n.gate){const T=r?.type==="hum"?.3:r?.type==="choke"?.07:.12,b=i+Math.max(n.attack+.05,T);h.gain.setValueAtTime(p,b),h.gain.linearRampToValueAtTime(0,b+.01)}else h.gain.setTargetAtTime(0,S,f.tau),r?.type==="choke"&&h.gain.setTargetAtTime(0,i+r.at,r.tau),r?.type==="hum"&&h.gain.setTargetAtTime(0,i+r.at,f.tau*r.stretch);h.connect(a);const x=f.freq+l;let _,u;if(n.wave==="breath"){_=e.createBufferSource(),_.buffer=Zs(e),_.loop=!0;const T=e.createBiquadFilter();T.type="bandpass",T.Q.value=n.q,u=T.frequency,_.connect(T);const b=e.createGain();b.gain.value=Math.sqrt(n.q)*1.5,T.connect(b).connect(h)}else if(_=e.createOscillator(),_.type=n.wave==="square"?"square":"sine",u=_.frequency,n.wave==="square"){const T=e.createBiquadFilter();T.type="lowpass",T.frequency.value=Math.min(x*4,12e3),_.connect(T).connect(h)}else _.connect(h);u.setValueAtTime(n.glide?x*n.glide.from:x,i),n.glide&&u.linearRampToValueAtTime(x,i+n.glide.dur),r?.type==="bend"&&(u.setValueAtTime(x,i+r.at),u.linearRampToValueAtTime(x*r.ratio,i+r.at+r.dur)),_.start(i),_.stop(o),s.srcs.push(_),s.modes.push({env:h,tau:f.tau,fParam:u,freq:x})}}return s.timer=setTimeout(()=>a.disconnect(),(o-e.currentTime+.2)*1e3),s}function Bg(e,t){const{c:n,v:i}=e,a=n.currentTime;if(!(!t||a>e.tStop-.05)){if(t.type==="choke"){let o=a;t.hiss&&(js(e.c,e.out,t.hiss.center,t.hiss.q,a,t.hiss.dur,t.hiss.gain),o=a+t.hiss.dur);for(const r of e.modes)Wi(r.env.gain,o),r.env.gain.setTargetAtTime(0,o,t.tau)}else if(t.type==="bend")for(const o of e.modes)Wi(o.fParam,a),o.fParam.linearRampToValueAtTime(o.freq*t.ratio,a+t.dur);else if(t.type==="hum"&&!i.gate){const o=Math.max(...e.modes.map(s=>s.tau)),r=Math.min(a+o*t.stretch*5,e.t0+4)+.05;for(const s of e.modes)Wi(s.env.gain,a),s.env.gain.setTargetAtTime(0,a,s.tau*t.stretch);if(r>e.tStop){Wi(e.out.gain,a),e.out.gain.setValueAtTime(i.gain,r-.1),e.out.gain.linearRampToValueAtTime(0,r);for(const s of e.srcs)s.stop(r);clearTimeout(e.timer),e.timer=setTimeout(()=>e.out.disconnect(),(r-a+.2)*1e3),e.tStop=r}}}}function Wi(e,t){e.cancelAndHoldAtTime?e.cancelAndHoldAtTime(t):(e.cancelScheduledValues(t),e.setValueAtTime(e.value,t))}function js(e,t,n,i,a,o,r){const s=e.createBufferSource();s.buffer=Zs(e);const c=e.createBiquadFilter();c.type="bandpass",c.frequency.value=n,c.Q.value=i;const f=e.createGain(),m=Math.min(.003,o/3);f.gain.setValueAtTime(0,a),f.gain.linearRampToValueAtTime(r,a+m),f.gain.setValueAtTime(r,a+o-m),f.gain.linearRampToValueAtTime(0,a+o),s.connect(c).connect(f).connect(t),s.start(a),s.stop(a+o+.01)}const fs=new WeakMap;function Zs(e){let t=fs.get(e);if(!t){t=e.createBuffer(1,e.sampleRate,e.sampleRate);const n=t.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;fs.set(e,t)}return t}export{Vg as R,zg as c,kg as g,Hg as s};
