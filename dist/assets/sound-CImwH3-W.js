import{h as Po,N as Qt,S as Lo,C as lt,F as Ka,V as Ie,R as Do,i as Lt,w as ri,j as Rn,W as Ft,k as _t,L as Fn,H as vi,U as en,D as Kt,B as Bt,m as Bn,t as Uo,n as Io,o as Si,q as No,r as Fo,E as Oo,u as ht,P as ai,A as Bo,x as Ai,y as kt,z as ui,G as er,I as Hn,J as Gn,K as $a,O as Ho,Q as Mn,X as di,Y as Go,Z as ko,_ as Dn,$ as Vo,a0 as zo,a1 as Wo,a2 as Xo,a3 as qo,a4 as Yo,a5 as Ko,a6 as $o,a7 as jo,a8 as Zo,a9 as Jo,aa as Qo,ab as es,ac as ts,ad as ns,ae as is,af as rs,ag as as,ah as bi,ai as Zt,aj as Yn,ak as os,al as cn,am as ss,an as ls,ao as cs,ap as fs,aq as ja,ar as us,as as ds,at as hs,au as ps,av as $e,aw as _s,ax as ms,ay as gs,az as tn,aA as Za,aB as oi,aC as $t,aD as Ja,aE as fn,aF as Yt,aG as hi,aH as Qa,aI as eo,aJ as to,aK as tr,aL as vs,aM as Ss,aN as Es,aO as no,aP as Jt,aQ as xs,aR as Ts,aS as Ms,aT as As,aU as bs,aV as io,aW as Rs,aX as ro,aY as ao,aZ as Ri,a_ as wi,a$ as yi,b0 as Ci,b1 as st,b2 as dr,b3 as hr,b4 as pr,b5 as _r,b6 as mr,b7 as gr,b8 as vr,b9 as Sr,ba as Er,bb as xr,bc as Tr,bd as Mr,be as Ar,bf as br,bg as Rr,bh as wr,bi as yr,bj as Cr,bk as Pr,bl as Lr,bm as Dr,bn as Pi,bo as Ur,bp as Ir,bq as ws,br as Nr,bs as Fr,bt as Or,bu as ki,bv as Vi,bw as zi,bx as Wi,by as Xi,bz as qi,bA as Yi,bB as ys,bC as Br,bD as Cs,bE as si,bF as Ps,bG as Hr,bH as Gr,bI as kr,bJ as Ki,bK as $i,bL as Ls,bM as oo,bN as Ds,bO as Ei,bP as Us,bQ as Is,bR as so,bS as lo,bT as Vr,bU as co,bV as zr,bW as fo,bX as kn,bY as wn,bZ as uo,b_ as Ns,b$ as Fs,c0 as Os,c1 as Bs,c2 as Wr,c3 as Pt,c4 as Hs,c5 as Gs,c6 as ks,c7 as Vs,c8 as zs,c9 as Ws,ca as Xs,cb as qs,cc as Ys,cd as Ks,ce as $s,cf as js,cg as Zs,ch as Js,ci as Qs,cj as el,ck as tl,g as nl,cl as il,cm as rl,cn as al}from"./core-BP3r8Jkz.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function n(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(a){if(a.ep)return;a.ep=!0;const r=n(a);fetch(a.href,r)}})();const dt=9,Xr=.8,ol=2.4,qr=2,Yr=7,sl=`#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`,ll=`#version 300 es
#ifdef GL_ES
precision highp float;
#endif
#define PI      3.14159265
#define MAX_SYL ${dt}

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

  // sine 방식
  float disp = sin(r * 12.0 + theta * 2.0) * 0.9; //0.4, 1.4
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
  vec3  hue   = hue2rgb(choX * 1.82); // 1.82
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

  float d       = 1e9;
  float choXAcc = 0.5;
  float choZAcc = 0.33;
  float totalW  = 0.0;

  for (int i = 0; i < MAX_SYL; i++) {
    if (i >= count) break;
    float di   = sylSDF(i, uv, aspect);
    vec4  cp   = interpParams(i);
    float choX = cp.z;
    float choZ = cp.w;
    float w    = 1.0 / (di * di + 0.001);
    choXAcc   += choX * w;
    choZAcc   += choZ * w;
    totalW    += w;
    d = smin(d, di, u_sminK);
  }
  choXAcc /= totalW;
  choZAcc /= totalW;

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
`;function cl(e,t=.5){const n=qr-1,i=1+(e-250)/650*n;return Math.max(1,Math.min(qr,i+(t-.5)*.6))}function fl(e){const t=Yr-1;return Math.max(1,Math.min(Yr,1+(e-580)/2020*t))}function Kr(e,t,n){const i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),e.getShaderParameter(i,e.COMPILE_STATUS)?i:(console.error("[sora] Shader error:",e.getShaderInfoLog(i)),e.deleteShader(i),null)}function ul(e,t,n){const i=Kr(e,e.VERTEX_SHADER,t),a=Kr(e,e.FRAGMENT_SHADER,n);if(!i||!a)return null;const r=e.createProgram();return e.attachShader(r,i),e.attachShader(r,a),e.linkProgram(r),e.getProgramParameter(r,e.LINK_STATUS)?r:(console.error("[sora] Link error:",e.getProgramInfoLog(r)),null)}class dl{constructor(){this._canvas=null,this._gl=null,this._prog=null,this._locs={},this._raf=null,this._startT=performance.now(),this._ownCanvas=!1,this._cells=Array.from({length:dt},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:dt},()=>[2,3,.5,.33]),this._positions=Array.from({length:dt},()=>[.5,.5]),this._radii=Array(dt).fill(.1),this._morphStart=Array(dt).fill(-999),this._waveStart=Array(dt).fill(-999),this._f3Norms=Array(dt).fill(.5),this._frozen=Array(dt).fill(!1),this._wordPositions=new Map,this._wordRadii=new Map,this._rect=null,this.sylSize=150,this._sylCount=0,this._sminK=.06,this.lineHeightRatio=1.5}async init(t){t?this._canvas=t:(this._canvas=document.createElement("canvas"),this._canvas.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._canvas),this._ownCanvas=!0),this._resize(),window.addEventListener("resize",this._onResize);const n=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!n){console.error("[sora] WebGL2 not supported");return}if(this._gl=n,this._prog=ul(n,sl,ll),!this._prog)return;n.useProgram(this._prog),n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE_MINUS_SRC_ALPHA);const i=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,i),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),n.STATIC_DRAW);const a=n.getAttribLocation(this._prog,"position");n.enableVertexAttribArray(a),n.vertexAttribPointer(a,2,n.FLOAT,!1,0,0),this._locs={res:n.getUniformLocation(this._prog,"u_resolution"),time:n.getUniformLocation(this._prog,"u_time"),count:n.getUniformLocation(this._prog,"u_sylCount"),sminK:n.getUniformLocation(this._prog,"u_sminK")};for(let r=0;r<dt;r++)this._locs[`pos_${r}`]=n.getUniformLocation(this._prog,`u_pos[${r}]`),this._locs[`cell_${r}`]=n.getUniformLocation(this._prog,`u_cells[${r}]`),this._locs[`prev_${r}`]=n.getUniformLocation(this._prog,`u_prev[${r}]`),this._locs[`morph_${r}`]=n.getUniformLocation(this._prog,`u_morphT[${r}]`),this._locs[`wave_${r}`]=n.getUniformLocation(this._prog,`u_waveT[${r}]`),this._locs[`f3_${r}`]=n.getUniformLocation(this._prog,`u_f3Norm[${r}]`),this._locs[`rad_${r}`]=n.getUniformLocation(this._prog,`u_radii[${r}]`);this._raf=requestAnimationFrame(this._animate)}setRect(t){this._rect=t??null}wordAnchors(){const t=window.innerWidth,n=window.innerHeight;return(this._slotWordIds??[]).map((i,a)=>({wordId:i,x:this._positions[a][0]*t,y:this._positions[a][1]*n,r:this._radii[a]*n}))}_toRect(t,n){const i=this._rect;return i?[(i.x+t*i.w)/window.innerWidth,(i.y+n*i.h)/window.innerHeight]:[t,n]}update(t,n,i){if(!i)return;const a=(performance.now()-this._startT)/1e3,r=new Map;(t??[]).forEach((c,h)=>{const p=c.wordId??0;r.has(p)||r.set(p,[]),r.get(p).push({syl:c,pos:n[h]??[.5,.5]})});const o=[...r.keys()].sort((c,h)=>c-h),s=Math.min(o.length,dt),f=.22,d=this._rect?this._rect.h/window.innerHeight:1,m=this.sylSize/550*d;for(const c of o)this._wordPositions.has(c)||this._wordPositions.set(c,this._toRect(f+Math.random()*(1-f*2),f+Math.random()*(1-f*2))),this._wordRadii.has(c)||this._wordRadii.set(c,m*(Math.random()*.75+.25));for(const c of this._wordPositions.keys())r.has(c)||(this._wordPositions.delete(c),this._wordRadii.delete(c));for(let c=0;c<s;c++){const h=o[c],p=r.get(h),T=p[p.length-1],S=o.some(w=>w>h);if(this._frozen[c]=S,this._positions[c]=this._wordPositions.get(h),this._radii[c]=this._wordRadii.get(h),S)continue;const u=i[T.syl.jung],l=i[T.syl.cho]?.cho;if(!u?.pos)continue;const[M,b]=u.pos,x=l?.pos?.[0]??.5,L=l?.pos?.[2]??.33,C=u.pos[2]??2500,y=Math.max(0,Math.min(1,(C-2080)/1120));this._f3Norms[c]=y;const U=[cl(M,x),fl(b),x,L],v=this._cells[c];if(U.some((w,P)=>Math.abs(w-v[P])>.01)){const w=a-this._morphStart[c],P=Math.min(w/Xr,1),N=P<.5?2*P*P:-1+(4-2*P)*P,G=this._prevCells[c];this._prevCells[c]=v.map((q,B)=>G[B]+(q-G[B])*N),this._cells[c]=U,this._morphStart[c]=a,this._waveStart[c]=a}}this._sylCount=s,this._slotWordIds=o.slice(0,s);for(let c=s;c<dt;c++)this._frozen[c]=!1}async flushQueue(){for(let t=0;t<dt;t++)this._prevCells[t]=[...this._cells[t]],this._morphStart[t]=-999,this._waveStart[t]=-999;await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t)))}captureFrame(){return!this._gl||!this._canvas?null:(this._render(),this._canvas.toDataURL("image/png"))}clearAccum(){this._cells=Array.from({length:dt},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:dt},()=>[2,3,.5,.33]),this._positions=Array.from({length:dt},()=>[.5,.5]),this._radii=Array(dt).fill(.1),this._morphStart=Array(dt).fill(-999),this._waveStart=Array(dt).fill(-999),this._f3Norms=Array(dt).fill(.5),this._frozen=Array(dt).fill(!1),this._wordPositions.clear(),this._wordRadii.clear(),this._slotWordIds=[],this._sylCount=0,this._render()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._gl&&this._prog&&this._gl.deleteProgram(this._prog),this._gl=null}_animate=()=>{this._raf=requestAnimationFrame(this._animate),this._render()};_render(){const t=this._gl;if(!t)return;const n=(performance.now()-this._startT)/1e3,i=this._locs;t.viewport(0,0,this._canvas.width,this._canvas.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.uniform2f(i.res,this._canvas.width,this._canvas.height),t.uniform1f(i.time,n),t.uniform1i(i.count,this._sylCount),t.uniform1f(i.sminK,this._sminK);for(let a=0;a<dt;a++){const r=this._cells[a],o=this._prevCells[a],s=this._positions[a],f=Math.min((n-this._morphStart[a])/Xr,1),d=Math.min((n-this._waveStart[a])/ol,1);t.uniform2f(i[`pos_${a}`],s[0],s[1]),t.uniform4f(i[`cell_${a}`],r[0],r[1],r[2],r[3]),t.uniform4f(i[`prev_${a}`],o[0],o[1],o[2],o[3]),t.uniform1f(i[`morph_${a}`],f),t.uniform1f(i[`wave_${a}`],d),t.uniform1f(i[`f3_${a}`],this._f3Norms[a]),t.uniform1f(i[`rad_${a}`],this._radii[a])}t.drawArrays(t.TRIANGLES,0,6)}_resize(){if(!this._canvas)return;const t=Math.min(window.devicePixelRatio,2);this._canvas.width=window.innerWidth*t,this._canvas.height=window.innerHeight*t}_onResize=()=>{this._resize()}}const jt=11102230246251565e-32,Tt=134217729,hl=(3+8*jt)*jt;function Li(e,t,n,i,a){let r,o,s,f,d=t[0],m=i[0],c=0,h=0;m>d==m>-d?(r=d,d=t[++c]):(r=m,m=i[++h]);let p=0;if(c<e&&h<n)for(m>d==m>-d?(o=d+r,s=r-(o-d),d=t[++c]):(o=m+r,s=r-(o-m),m=i[++h]),r=o,s!==0&&(a[p++]=s);c<e&&h<n;)m>d==m>-d?(o=r+d,f=o-r,s=r-(o-f)+(d-f),d=t[++c]):(o=r+m,f=o-r,s=r-(o-f)+(m-f),m=i[++h]),r=o,s!==0&&(a[p++]=s);for(;c<e;)o=r+d,f=o-r,s=r-(o-f)+(d-f),d=t[++c],r=o,s!==0&&(a[p++]=s);for(;h<n;)o=r+m,f=o-r,s=r-(o-f)+(m-f),m=i[++h],r=o,s!==0&&(a[p++]=s);return(r!==0||p===0)&&(a[p++]=r),p}function pl(e,t){let n=t[0];for(let i=1;i<e;i++)n+=t[i];return n}function Wn(e){return new Float64Array(e)}const _l=(3+16*jt)*jt,ml=(2+12*jt)*jt,gl=(9+64*jt)*jt*jt,pn=Wn(4),$r=Wn(8),jr=Wn(12),Zr=Wn(16),Rt=Wn(4);function vl(e,t,n,i,a,r,o){let s,f,d,m,c,h,p,T,S,u,l,M,b,x,L,C,y,U;const v=e-a,_=n-a,w=t-r,P=i-r;x=v*P,h=Tt*v,p=h-(h-v),T=v-p,h=Tt*P,S=h-(h-P),u=P-S,L=T*u-(x-p*S-T*S-p*u),C=w*_,h=Tt*w,p=h-(h-w),T=w-p,h=Tt*_,S=h-(h-_),u=_-S,y=T*u-(C-p*S-T*S-p*u),l=L-y,c=L-l,pn[0]=L-(l+c)+(c-y),M=x+l,c=M-x,b=x-(M-c)+(l-c),l=b-C,c=b-l,pn[1]=b-(l+c)+(c-C),U=M+l,c=U-M,pn[2]=M-(U-c)+(l-c),pn[3]=U;let N=pl(4,pn),G=ml*o;if(N>=G||-N>=G||(c=e-v,s=e-(v+c)+(c-a),c=n-_,d=n-(_+c)+(c-a),c=t-w,f=t-(w+c)+(c-r),c=i-P,m=i-(P+c)+(c-r),s===0&&f===0&&d===0&&m===0)||(G=gl*o+hl*Math.abs(N),N+=v*m+P*s-(w*d+_*f),N>=G||-N>=G))return N;x=s*P,h=Tt*s,p=h-(h-s),T=s-p,h=Tt*P,S=h-(h-P),u=P-S,L=T*u-(x-p*S-T*S-p*u),C=f*_,h=Tt*f,p=h-(h-f),T=f-p,h=Tt*_,S=h-(h-_),u=_-S,y=T*u-(C-p*S-T*S-p*u),l=L-y,c=L-l,Rt[0]=L-(l+c)+(c-y),M=x+l,c=M-x,b=x-(M-c)+(l-c),l=b-C,c=b-l,Rt[1]=b-(l+c)+(c-C),U=M+l,c=U-M,Rt[2]=M-(U-c)+(l-c),Rt[3]=U;const q=Li(4,pn,4,Rt,$r);x=v*m,h=Tt*v,p=h-(h-v),T=v-p,h=Tt*m,S=h-(h-m),u=m-S,L=T*u-(x-p*S-T*S-p*u),C=w*d,h=Tt*w,p=h-(h-w),T=w-p,h=Tt*d,S=h-(h-d),u=d-S,y=T*u-(C-p*S-T*S-p*u),l=L-y,c=L-l,Rt[0]=L-(l+c)+(c-y),M=x+l,c=M-x,b=x-(M-c)+(l-c),l=b-C,c=b-l,Rt[1]=b-(l+c)+(c-C),U=M+l,c=U-M,Rt[2]=M-(U-c)+(l-c),Rt[3]=U;const B=Li(q,$r,4,Rt,jr);x=s*m,h=Tt*s,p=h-(h-s),T=s-p,h=Tt*m,S=h-(h-m),u=m-S,L=T*u-(x-p*S-T*S-p*u),C=f*d,h=Tt*f,p=h-(h-f),T=f-p,h=Tt*d,S=h-(h-d),u=d-S,y=T*u-(C-p*S-T*S-p*u),l=L-y,c=L-l,Rt[0]=L-(l+c)+(c-y),M=x+l,c=M-x,b=x-(M-c)+(l-c),l=b-C,c=b-l,Rt[1]=b-(l+c)+(c-C),U=M+l,c=U-M,Rt[2]=M-(U-c)+(l-c),Rt[3]=U;const Z=Li(B,jr,4,Rt,Zr);return Zr[Z-1]}function Kn(e,t,n,i,a,r){const o=(t-r)*(n-a),s=(e-a)*(i-r),f=o-s,d=Math.abs(o+s);return Math.abs(f)>=_l*d?f:-vl(e,t,n,i,a,r,d)}const Jr=Math.pow(2,-52),$n=new Uint32Array(512);class pi{static from(t,n=Ml,i=Al){const a=t.length,r=new Float64Array(a*2);for(let o=0;o<a;o++){const s=t[o];r[2*o]=n(s),r[2*o+1]=i(s)}return new pi(r)}constructor(t){const n=t.length>>1;if(n>0&&typeof t[0]!="number")throw new Error("Expected coords to contain numbers.");this.coords=t;const i=Math.max(2*n-5,0);this._triangles=new Uint32Array(i*3),this._halfedges=new Int32Array(i*3),this._hashSize=Math.ceil(Math.sqrt(n)),this._hullPrev=new Uint32Array(n),this._hullNext=new Uint32Array(n),this._hullTri=new Uint32Array(n),this._hullHash=new Int32Array(this._hashSize),this._ids=new Uint32Array(n),this._dists=new Float64Array(n),this.trianglesLen=0,this._cx=0,this._cy=0,this._hullStart=0,this.hull=this._triangles,this.triangles=this._triangles,this.halfedges=this._halfedges,this.update()}update(){const{coords:t,_hullPrev:n,_hullNext:i,_hullTri:a,_hullHash:r}=this,o=t.length>>1;let s=1/0,f=1/0,d=-1/0,m=-1/0;for(let v=0;v<o;v++){const _=t[2*v],w=t[2*v+1];_<s&&(s=_),w<f&&(f=w),_>d&&(d=_),w>m&&(m=w),this._ids[v]=v}const c=(s+d)/2,h=(f+m)/2;let p=0,T=0,S=0;for(let v=0,_=1/0;v<o;v++){const w=Di(c,h,t[2*v],t[2*v+1]);w<_&&(p=v,_=w)}const u=t[2*p],l=t[2*p+1];for(let v=0,_=1/0;v<o;v++){if(v===p)continue;const w=Di(u,l,t[2*v],t[2*v+1]);w<_&&w>0&&(T=v,_=w)}let M=t[2*T],b=t[2*T+1],x=1/0;for(let v=0;v<o;v++){if(v===p||v===T)continue;const _=xl(u,l,M,b,t[2*v],t[2*v+1]);_<x&&(S=v,x=_)}let L=t[2*S],C=t[2*S+1];if(x===1/0){for(let w=0;w<o;w++)this._dists[w]=t[2*w]-t[0]||t[2*w+1]-t[1];An(this._ids,this._dists,0,o-1);const v=new Uint32Array(o);let _=0;for(let w=0,P=-1/0;w<o;w++){const N=this._ids[w],G=this._dists[N];G>P&&(v[_++]=N,P=G)}this.hull=v.subarray(0,_),this.triangles=new Uint32Array(0),this.halfedges=new Int32Array(0);return}if(Kn(u,l,M,b,L,C)<0){const v=T,_=M,w=b;T=S,M=L,b=C,S=v,L=_,C=w}const y=Tl(u,l,M,b,L,C);this._cx=y.x,this._cy=y.y;for(let v=0;v<o;v++)this._dists[v]=Di(t[2*v],t[2*v+1],y.x,y.y);An(this._ids,this._dists,0,o-1),this._hullStart=p;let U=3;i[p]=n[S]=T,i[T]=n[p]=S,i[S]=n[T]=p,a[p]=0,a[T]=1,a[S]=2,r.fill(-1),r[this._hashKey(u,l)]=p,r[this._hashKey(M,b)]=T,r[this._hashKey(L,C)]=S,this.trianglesLen=0,this._addTriangle(p,T,S,-1,-1,-1);for(let v=0,_=0,w=0;v<this._ids.length;v++){const P=this._ids[v],N=t[2*P],G=t[2*P+1];if(v>0&&Math.abs(N-_)<=Jr&&Math.abs(G-w)<=Jr||(_=N,w=G,P===p||P===T||P===S))continue;let q=0;for(let ge=0,Le=this._hashKey(N,G);ge<this._hashSize&&(q=r[(Le+ge)%this._hashSize],!(q!==-1&&q!==i[q]));ge++);q=n[q];let B=q,Z;for(;Z=i[B],Kn(N,G,t[2*B],t[2*B+1],t[2*Z],t[2*Z+1])>=0;)if(B=Z,B===q){B=-1;break}if(B===-1)continue;let W=this._addTriangle(B,P,i[B],-1,-1,a[B]);a[P]=this._legalize(W+2),a[B]=W,U++;let ae=i[B];for(;Z=i[ae],Kn(N,G,t[2*ae],t[2*ae+1],t[2*Z],t[2*Z+1])<0;)W=this._addTriangle(ae,P,Z,a[P],-1,a[ae]),a[P]=this._legalize(W+2),i[ae]=ae,U--,ae=Z;if(B===q)for(;Z=n[B],Kn(N,G,t[2*Z],t[2*Z+1],t[2*B],t[2*B+1])<0;)W=this._addTriangle(Z,P,B,-1,a[B],a[Z]),this._legalize(W+2),a[Z]=W,i[B]=B,U--,B=Z;this._hullStart=n[P]=B,i[B]=n[ae]=P,i[P]=ae,r[this._hashKey(N,G)]=P,r[this._hashKey(t[2*B],t[2*B+1])]=B}this.hull=new Uint32Array(U);for(let v=0,_=this._hullStart;v<U;v++)this.hull[v]=_,_=i[_];this.triangles=this._triangles.subarray(0,this.trianglesLen),this.halfedges=this._halfedges.subarray(0,this.trianglesLen)}_hashKey(t,n){return Math.floor(Sl(t-this._cx,n-this._cy)*this._hashSize)%this._hashSize}_legalize(t){const{_triangles:n,_halfedges:i,coords:a}=this;let r=0,o=0;for(;;){const s=i[t],f=t-t%3;if(o=f+(t+2)%3,s===-1){if(r===0)break;t=$n[--r];continue}const d=s-s%3,m=f+(t+1)%3,c=d+(s+2)%3,h=n[o],p=n[t],T=n[m],S=n[c];if(El(a[2*h],a[2*h+1],a[2*p],a[2*p+1],a[2*T],a[2*T+1],a[2*S],a[2*S+1])){n[t]=S,n[s]=h;const l=i[c];if(l===-1){let b=this._hullStart;do{if(this._hullTri[b]===c){this._hullTri[b]=t;break}b=this._hullPrev[b]}while(b!==this._hullStart)}this._link(t,l),this._link(s,i[o]),this._link(o,c);const M=d+(s+1)%3;r<$n.length&&($n[r++]=M)}else{if(r===0)break;t=$n[--r]}}return o}_link(t,n){this._halfedges[t]=n,n!==-1&&(this._halfedges[n]=t)}_addTriangle(t,n,i,a,r,o){const s=this.trianglesLen;return this._triangles[s]=t,this._triangles[s+1]=n,this._triangles[s+2]=i,this._link(s,a),this._link(s+1,r),this._link(s+2,o),this.trianglesLen+=3,s}}function Sl(e,t){const n=e/(Math.abs(e)+Math.abs(t));return(t>0?3-n:1+n)/4}function Di(e,t,n,i){const a=e-n,r=t-i;return a*a+r*r}function El(e,t,n,i,a,r,o,s){const f=e-o,d=t-s,m=n-o,c=i-s,h=a-o,p=r-s,T=f*f+d*d,S=m*m+c*c,u=h*h+p*p;return f*(c*u-S*p)-d*(m*u-S*h)+T*(m*p-c*h)<0}function xl(e,t,n,i,a,r){const o=n-e,s=i-t,f=a-e,d=r-t,m=o*o+s*s,c=f*f+d*d,h=.5/(o*d-s*f),p=(d*m-s*c)*h,T=(o*c-f*m)*h;return p*p+T*T}function Tl(e,t,n,i,a,r){const o=n-e,s=i-t,f=a-e,d=r-t,m=o*o+s*s,c=f*f+d*d,h=.5/(o*d-s*f),p=e+(d*m-s*c)*h,T=t+(o*c-f*m)*h;return{x:p,y:T}}function An(e,t,n,i){if(i-n<=20)for(let a=n+1;a<=i;a++){const r=e[a],o=t[r];let s=a-1;for(;s>=n&&t[e[s]]>o;)e[s+1]=e[s--];e[s+1]=r}else{const a=n+i>>1;let r=n+1,o=i;Un(e,a,r),t[e[n]]>t[e[i]]&&Un(e,n,i),t[e[r]]>t[e[i]]&&Un(e,r,i),t[e[n]]>t[e[r]]&&Un(e,n,r);const s=e[r],f=t[s];for(;;){do r++;while(t[e[r]]<f);do o--;while(t[e[o]]>f);if(o<r)break;Un(e,r,o)}e[n+1]=e[o],e[o]=s,i-r+1>=o-n?(An(e,t,r,i),An(e,t,n,o-1)):(An(e,t,n,o-1),An(e,t,r,i))}}function Un(e,t,n){const i=e[t];e[t]=e[n],e[n]=i}function Ml(e){return e[0]}function Al(e){return e[1]}const Qr=1e-6;class ln{constructor(){this._x0=this._y0=this._x1=this._y1=null,this._=""}moveTo(t,n){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+n}`}closePath(){this._x1!==null&&(this._x1=this._x0,this._y1=this._y0,this._+="Z")}lineTo(t,n){this._+=`L${this._x1=+t},${this._y1=+n}`}arc(t,n,i){t=+t,n=+n,i=+i;const a=t+i,r=n;if(i<0)throw new Error("negative radius");this._x1===null?this._+=`M${a},${r}`:(Math.abs(this._x1-a)>Qr||Math.abs(this._y1-r)>Qr)&&(this._+="L"+a+","+r),i&&(this._+=`A${i},${i},0,1,1,${t-i},${n}A${i},${i},0,1,1,${this._x1=a},${this._y1=r}`)}rect(t,n,i,a){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+n}h${+i}v${+a}h${-i}Z`}value(){return this._||null}}class ji{constructor(){this._=[]}moveTo(t,n){this._.push([t,n])}closePath(){this._.push(this._[0].slice())}lineTo(t,n){this._.push([t,n])}value(){return this._.length?this._:null}}class bl{constructor(t,[n,i,a,r]=[0,0,960,500]){if(!((a=+a)>=(n=+n))||!((r=+r)>=(i=+i)))throw new Error("invalid bounds");this.delaunay=t,this._circumcenters=new Float64Array(t.points.length*2),this.vectors=new Float64Array(t.points.length*2),this.xmax=a,this.xmin=n,this.ymax=r,this.ymin=i,this._init()}update(){return this.delaunay.update(),this._init(),this}_init(){const{delaunay:{points:t,hull:n,triangles:i},vectors:a}=this;let r,o;const s=this.circumcenters=this._circumcenters.subarray(0,i.length/3*2);for(let S=0,u=0,l=i.length,M,b;S<l;S+=3,u+=2){const x=i[S]*2,L=i[S+1]*2,C=i[S+2]*2,y=t[x],U=t[x+1],v=t[L],_=t[L+1],w=t[C],P=t[C+1],N=v-y,G=_-U,q=w-y,B=P-U,Z=(N*B-G*q)*2;if(Math.abs(Z)<1e-9){if(r===void 0){r=o=0;for(const ae of n)r+=t[ae*2],o+=t[ae*2+1];r/=n.length,o/=n.length}const W=1e9*Math.sign((r-y)*B-(o-U)*q);M=(y+w)/2-W*B,b=(U+P)/2+W*q}else{const W=1/Z,ae=N*N+G*G,ge=q*q+B*B;M=y+(B*ae-G*ge)*W,b=U+(N*ge-q*ae)*W}s[u]=M,s[u+1]=b}let f=n[n.length-1],d,m=f*4,c,h=t[2*f],p,T=t[2*f+1];a.fill(0);for(let S=0;S<n.length;++S)f=n[S],d=m,c=h,p=T,m=f*4,h=t[2*f],T=t[2*f+1],a[d+2]=a[m]=p-T,a[d+3]=a[m+1]=h-c}render(t){const n=t==null?t=new ln:void 0,{delaunay:{halfedges:i,inedges:a,hull:r},circumcenters:o,vectors:s}=this;if(r.length<=1)return null;for(let m=0,c=i.length;m<c;++m){const h=i[m];if(h<m)continue;const p=Math.floor(m/3)*2,T=Math.floor(h/3)*2,S=o[p],u=o[p+1],l=o[T],M=o[T+1];this._renderSegment(S,u,l,M,t)}let f,d=r[r.length-1];for(let m=0;m<r.length;++m){f=d,d=r[m];const c=Math.floor(a[d]/3)*2,h=o[c],p=o[c+1],T=f*4,S=this._project(h,p,s[T+2],s[T+3]);S&&this._renderSegment(h,p,S[0],S[1],t)}return n&&n.value()}renderBounds(t){const n=t==null?t=new ln:void 0;return t.rect(this.xmin,this.ymin,this.xmax-this.xmin,this.ymax-this.ymin),n&&n.value()}renderCell(t,n){const i=n==null?n=new ln:void 0,a=this._clip(t);if(a===null||!a.length)return;n.moveTo(a[0],a[1]);let r=a.length;for(;a[0]===a[r-2]&&a[1]===a[r-1]&&r>1;)r-=2;for(let o=2;o<r;o+=2)(a[o]!==a[o-2]||a[o+1]!==a[o-1])&&n.lineTo(a[o],a[o+1]);return n.closePath(),i&&i.value()}*cellPolygons(){const{delaunay:{points:t}}=this;for(let n=0,i=t.length/2;n<i;++n){const a=this.cellPolygon(n);a&&(a.index=n,yield a)}}cellPolygon(t){const n=new ji;return this.renderCell(t,n),n.value()}_renderSegment(t,n,i,a,r){let o;const s=this._regioncode(t,n),f=this._regioncode(i,a);s===0&&f===0?(r.moveTo(t,n),r.lineTo(i,a)):(o=this._clipSegment(t,n,i,a,s,f))&&(r.moveTo(o[0],o[1]),r.lineTo(o[2],o[3]))}contains(t,n,i){return n=+n,n!==n||(i=+i,i!==i)?!1:this.delaunay._step(t,n,i)===t}*neighbors(t){const n=this._clip(t);if(n)for(const i of this.delaunay.neighbors(t)){const a=this._clip(i);if(a){e:for(let r=0,o=n.length;r<o;r+=2)for(let s=0,f=a.length;s<f;s+=2)if(n[r]===a[s]&&n[r+1]===a[s+1]&&n[(r+2)%o]===a[(s+f-2)%f]&&n[(r+3)%o]===a[(s+f-1)%f]){yield i;break e}}}}_cell(t){const{circumcenters:n,delaunay:{inedges:i,halfedges:a,triangles:r}}=this,o=i[t];if(o===-1)return null;const s=[];let f=o;do{const d=Math.floor(f/3);if(s.push(n[d*2],n[d*2+1]),f=f%3===2?f-2:f+1,r[f]!==t)break;f=a[f]}while(f!==o&&f!==-1);return s}_clip(t){if(t===0&&this.delaunay.hull.length===1)return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];const n=this._cell(t);if(n===null)return null;const{vectors:i}=this,a=t*4;return this._simplify(i[a]||i[a+1]?this._clipInfinite(t,n,i[a],i[a+1],i[a+2],i[a+3]):this._clipFinite(t,n))}_clipFinite(t,n){const i=n.length;let a=null,r,o,s=n[i-2],f=n[i-1],d,m=this._regioncode(s,f),c,h=0;for(let p=0;p<i;p+=2)if(r=s,o=f,s=n[p],f=n[p+1],d=m,m=this._regioncode(s,f),d===0&&m===0)c=h,h=0,a?a.push(s,f):a=[s,f];else{let T,S,u,l,M;if(d===0){if((T=this._clipSegment(r,o,s,f,d,m))===null)continue;[S,u,l,M]=T}else{if((T=this._clipSegment(s,f,r,o,m,d))===null)continue;[l,M,S,u]=T,c=h,h=this._edgecode(S,u),c&&h&&this._edge(t,c,h,a,a.length),a?a.push(S,u):a=[S,u]}c=h,h=this._edgecode(l,M),c&&h&&this._edge(t,c,h,a,a.length),a?a.push(l,M):a=[l,M]}if(a)c=h,h=this._edgecode(a[0],a[1]),c&&h&&this._edge(t,c,h,a,a.length);else if(this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2))return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];return a}_clipSegment(t,n,i,a,r,o){const s=r<o;for(s&&([t,n,i,a,r,o]=[i,a,t,n,o,r]);;){if(r===0&&o===0)return s?[i,a,t,n]:[t,n,i,a];if(r&o)return null;let f,d,m=r||o;m&8?(f=t+(i-t)*(this.ymax-n)/(a-n),d=this.ymax):m&4?(f=t+(i-t)*(this.ymin-n)/(a-n),d=this.ymin):m&2?(d=n+(a-n)*(this.xmax-t)/(i-t),f=this.xmax):(d=n+(a-n)*(this.xmin-t)/(i-t),f=this.xmin),r?(t=f,n=d,r=this._regioncode(t,n)):(i=f,a=d,o=this._regioncode(i,a))}}_clipInfinite(t,n,i,a,r,o){let s=Array.from(n),f;if((f=this._project(s[0],s[1],i,a))&&s.unshift(f[0],f[1]),(f=this._project(s[s.length-2],s[s.length-1],r,o))&&s.push(f[0],f[1]),s=this._clipFinite(t,s))for(let d=0,m=s.length,c,h=this._edgecode(s[m-2],s[m-1]);d<m;d+=2)c=h,h=this._edgecode(s[d],s[d+1]),c&&h&&(d=this._edge(t,c,h,s,d),m=s.length);else this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2)&&(s=[this.xmin,this.ymin,this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax]);return s}_edge(t,n,i,a,r){for(;n!==i;){let o,s;switch(n){case 5:n=4;continue;case 4:n=6,o=this.xmax,s=this.ymin;break;case 6:n=2;continue;case 2:n=10,o=this.xmax,s=this.ymax;break;case 10:n=8;continue;case 8:n=9,o=this.xmin,s=this.ymax;break;case 9:n=1;continue;case 1:n=5,o=this.xmin,s=this.ymin;break}(a[r]!==o||a[r+1]!==s)&&this.contains(t,o,s)&&(a.splice(r,0,o,s),r+=2)}return r}_project(t,n,i,a){let r=1/0,o,s,f;if(a<0){if(n<=this.ymin)return null;(o=(this.ymin-n)/a)<r&&(f=this.ymin,s=t+(r=o)*i)}else if(a>0){if(n>=this.ymax)return null;(o=(this.ymax-n)/a)<r&&(f=this.ymax,s=t+(r=o)*i)}if(i>0){if(t>=this.xmax)return null;(o=(this.xmax-t)/i)<r&&(s=this.xmax,f=n+(r=o)*a)}else if(i<0){if(t<=this.xmin)return null;(o=(this.xmin-t)/i)<r&&(s=this.xmin,f=n+(r=o)*a)}return[s,f]}_edgecode(t,n){return(t===this.xmin?1:t===this.xmax?2:0)|(n===this.ymin?4:n===this.ymax?8:0)}_regioncode(t,n){return(t<this.xmin?1:t>this.xmax?2:0)|(n<this.ymin?4:n>this.ymax?8:0)}_simplify(t){if(t&&t.length>4){for(let n=0;n<t.length;n+=2){const i=(n+2)%t.length,a=(n+4)%t.length;(t[n]===t[i]&&t[i]===t[a]||t[n+1]===t[i+1]&&t[i+1]===t[a+1])&&(t.splice(i,2),n-=2)}t.length||(t=null)}return t}}const Rl=2*Math.PI,_n=Math.pow;function wl(e){return e[0]}function yl(e){return e[1]}function Cl(e){const{triangles:t,coords:n}=e;for(let i=0;i<t.length;i+=3){const a=2*t[i],r=2*t[i+1],o=2*t[i+2];if((n[o]-n[a])*(n[r+1]-n[a+1])-(n[r]-n[a])*(n[o+1]-n[a+1])>1e-10)return!1}return!0}function Pl(e,t,n){return[e+Math.sin(e+t)*n,t+Math.cos(e-t)*n]}class nr{static from(t,n=wl,i=yl,a){return new nr("length"in t?Ll(t,n,i,a):Float64Array.from(Dl(t,n,i,a)))}constructor(t){this._delaunator=new pi(t),this.inedges=new Int32Array(t.length/2),this._hullIndex=new Int32Array(t.length/2),this.points=this._delaunator.coords,this._init()}update(){return this._delaunator.update(),this._init(),this}_init(){const t=this._delaunator,n=this.points;if(t.hull&&t.hull.length>2&&Cl(t)){this.collinear=Int32Array.from({length:n.length/2},(h,p)=>p).sort((h,p)=>n[2*h]-n[2*p]||n[2*h+1]-n[2*p+1]);const f=this.collinear[0],d=this.collinear[this.collinear.length-1],m=[n[2*f],n[2*f+1],n[2*d],n[2*d+1]],c=1e-8*Math.hypot(m[3]-m[1],m[2]-m[0]);for(let h=0,p=n.length/2;h<p;++h){const T=Pl(n[2*h],n[2*h+1],c);n[2*h]=T[0],n[2*h+1]=T[1]}this._delaunator=new pi(n)}else delete this.collinear;const i=this.halfedges=this._delaunator.halfedges,a=this.hull=this._delaunator.hull,r=this.triangles=this._delaunator.triangles,o=this.inedges.fill(-1),s=this._hullIndex.fill(-1);for(let f=0,d=i.length;f<d;++f){const m=r[f%3===2?f-2:f+1];(i[f]===-1||o[m]===-1)&&(o[m]=f)}for(let f=0,d=a.length;f<d;++f)s[a[f]]=f;a.length<=2&&a.length>0&&(this.triangles=new Int32Array(3).fill(-1),this.halfedges=new Int32Array(3).fill(-1),this.triangles[0]=a[0],o[a[0]]=1,a.length===2&&(o[a[1]]=0,this.triangles[1]=a[1],this.triangles[2]=a[1]))}voronoi(t){return new bl(this,t)}*neighbors(t){const{inedges:n,hull:i,_hullIndex:a,halfedges:r,triangles:o,collinear:s}=this;if(s){const c=s.indexOf(t);c>0&&(yield s[c-1]),c<s.length-1&&(yield s[c+1]);return}const f=n[t];if(f===-1)return;let d=f,m=-1;do{if(yield m=o[d],d=d%3===2?d-2:d+1,o[d]!==t)return;if(d=r[d],d===-1){const c=i[(a[t]+1)%i.length];c!==m&&(yield c);return}}while(d!==f)}find(t,n,i=0){if(t=+t,t!==t||(n=+n,n!==n))return-1;const a=i;let r;for(;(r=this._step(i,t,n))>=0&&r!==i&&r!==a;)i=r;return r}_step(t,n,i){const{inedges:a,hull:r,_hullIndex:o,halfedges:s,triangles:f,points:d}=this;if(a[t]===-1||!d.length)return(t+1)%(d.length>>1);let m=t,c=_n(n-d[t*2],2)+_n(i-d[t*2+1],2);const h=a[t];let p=h;do{let T=f[p];const S=_n(n-d[T*2],2)+_n(i-d[T*2+1],2);if(S<c&&(c=S,m=T),p=p%3===2?p-2:p+1,f[p]!==t)break;if(p=s[p],p===-1){if(p=r[(o[t]+1)%r.length],p!==T&&_n(n-d[p*2],2)+_n(i-d[p*2+1],2)<c)return p;break}}while(p!==h);return m}render(t){const n=t==null?t=new ln:void 0,{points:i,halfedges:a,triangles:r}=this;for(let o=0,s=a.length;o<s;++o){const f=a[o];if(f<o)continue;const d=r[o]*2,m=r[f]*2;t.moveTo(i[d],i[d+1]),t.lineTo(i[m],i[m+1])}return this.renderHull(t),n&&n.value()}renderPoints(t,n){n===void 0&&(!t||typeof t.moveTo!="function")&&(n=t,t=null),n=n==null?2:+n;const i=t==null?t=new ln:void 0,{points:a}=this;for(let r=0,o=a.length;r<o;r+=2){const s=a[r],f=a[r+1];t.moveTo(s+n,f),t.arc(s,f,n,0,Rl)}return i&&i.value()}renderHull(t){const n=t==null?t=new ln:void 0,{hull:i,points:a}=this,r=i[0]*2,o=i.length;t.moveTo(a[r],a[r+1]);for(let s=1;s<o;++s){const f=2*i[s];t.lineTo(a[f],a[f+1])}return t.closePath(),n&&n.value()}hullPolygon(){const t=new ji;return this.renderHull(t),t.value()}renderTriangle(t,n){const i=n==null?n=new ln:void 0,{points:a,triangles:r}=this,o=r[t*=3]*2,s=r[t+1]*2,f=r[t+2]*2;return n.moveTo(a[o],a[o+1]),n.lineTo(a[s],a[s+1]),n.lineTo(a[f],a[f+1]),n.closePath(),i&&i.value()}*trianglePolygons(){const{triangles:t}=this;for(let n=0,i=t.length/3;n<i;++n)yield this.trianglePolygon(n)}trianglePolygon(t){const n=new ji;return this.renderTriangle(t,n),n.value()}}function Ll(e,t,n,i){const a=e.length,r=new Float64Array(a*2);for(let o=0;o<a;++o){const s=e[o];r[o*2]=t.call(i,s,o,e),r[o*2+1]=n.call(i,s,o,e)}return r}function*Dl(e,t,n,i){let a=0;for(const r of e)yield t.call(i,r,a,e),yield n.call(i,r,a,e),++a}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ho(){let e=null,t=!1,n=null,i=null;function a(r,o){n(r,o),i=e.requestAnimationFrame(a)}return{start:function(){t!==!0&&n!==null&&(i=e.requestAnimationFrame(a),t=!0)},stop:function(){e.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){n=r},setContext:function(r){e=r}}}function Ul(e){const t=new WeakMap;function n(s,f){const d=s.array,m=s.usage,c=d.byteLength,h=e.createBuffer();e.bindBuffer(f,h),e.bufferData(f,d,m),s.onUploadCallback();let p;if(d instanceof Float32Array)p=e.FLOAT;else if(d instanceof Uint16Array)s.isFloat16BufferAttribute?p=e.HALF_FLOAT:p=e.UNSIGNED_SHORT;else if(d instanceof Int16Array)p=e.SHORT;else if(d instanceof Uint32Array)p=e.UNSIGNED_INT;else if(d instanceof Int32Array)p=e.INT;else if(d instanceof Int8Array)p=e.BYTE;else if(d instanceof Uint8Array)p=e.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)p=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:h,type:p,bytesPerElement:d.BYTES_PER_ELEMENT,version:s.version,size:c}}function i(s,f,d){const m=f.array,c=f.updateRanges;if(e.bindBuffer(d,s),c.length===0)e.bufferSubData(d,0,m);else{c.sort((p,T)=>p.start-T.start);let h=0;for(let p=1;p<c.length;p++){const T=c[h],S=c[p];S.start<=T.start+T.count+1?T.count=Math.max(T.count,S.start+S.count-T.start):(++h,c[h]=S)}c.length=h+1;for(let p=0,T=c.length;p<T;p++){const S=c[p];e.bufferSubData(d,S.start*m.BYTES_PER_ELEMENT,m,S.start,S.count)}f.clearUpdateRanges()}f.onUploadCallback()}function a(s){return s.isInterleavedBufferAttribute&&(s=s.data),t.get(s)}function r(s){s.isInterleavedBufferAttribute&&(s=s.data);const f=t.get(s);f&&(e.deleteBuffer(f.buffer),t.delete(s))}function o(s,f){if(s.isInterleavedBufferAttribute&&(s=s.data),s.isGLBufferAttribute){const m=t.get(s);(!m||m.version<s.version)&&t.set(s,{buffer:s.buffer,type:s.type,bytesPerElement:s.elementSize,version:s.version});return}const d=t.get(s);if(d===void 0)t.set(s,n(s,f));else if(d.version<s.version){if(d.size!==s.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(d.buffer,s,f),d.version=s.version}}return{get:a,remove:r,update:o}}var Il=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Nl=`#ifdef USE_ALPHAHASH
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
#endif`,Fl=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ol=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Bl=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Hl=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Gl=`#ifdef USE_AOMAP
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
#endif`,kl=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Vl=`#ifdef USE_BATCHING
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
#endif`,zl=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Wl=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xl=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ql=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Yl=`#ifdef USE_IRIDESCENCE
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
#endif`,Kl=`#ifdef USE_BUMPMAP
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
#endif`,$l=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,jl=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Zl=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Jl=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ql=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,ec=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,tc=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,nc=`#if defined( USE_COLOR_ALPHA )
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
#endif`,ic=`#define PI 3.141592653589793
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
} // validated`,rc=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,ac=`vec3 transformedNormal = objectNormal;
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
#endif`,oc=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,sc=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,lc=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,cc=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,fc="gl_FragColor = linearToOutputTexel( gl_FragColor );",uc=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,dc=`#ifdef USE_ENVMAP
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
#endif`,hc=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,pc=`#ifdef USE_ENVMAP
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
#endif`,_c=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,mc=`#ifdef USE_ENVMAP
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
#endif`,gc=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,vc=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Sc=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ec=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,xc=`#ifdef USE_GRADIENTMAP
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
}`,Tc=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Mc=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ac=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,bc=`uniform bool receiveShadow;
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
#endif`,Rc=`#ifdef USE_ENVMAP
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
#endif`,wc=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,yc=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Cc=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Pc=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Lc=`PhysicalMaterial material;
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
#endif`,Dc=`struct PhysicalMaterial {
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
}`,Uc=`
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
#endif`,Ic=`#if defined( RE_IndirectDiffuse )
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
#endif`,Nc=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Fc=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Oc=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Bc=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Hc=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Gc=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,kc=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Vc=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,zc=`#if defined( USE_POINTS_UV )
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
#endif`,Wc=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Xc=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,qc=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Yc=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Kc=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,$c=`#ifdef USE_MORPHTARGETS
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
#endif`,jc=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Zc=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Jc=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Qc=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ef=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,tf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,nf=`#ifdef USE_NORMALMAP
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
#endif`,rf=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,af=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,of=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,lf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,cf=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,ff=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,uf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,df=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,pf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,_f=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,mf=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,gf=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,vf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Sf=`float getShadowMask() {
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
}`,Ef=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,xf=`#ifdef USE_SKINNING
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
#endif`,Tf=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Mf=`#ifdef USE_SKINNING
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
#endif`,Af=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,bf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Rf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wf=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,yf=`#ifdef USE_TRANSMISSION
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
#endif`,Cf=`#ifdef USE_TRANSMISSION
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
#endif`,Pf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Lf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Df=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Uf=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const If=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Nf=`uniform sampler2D t2D;
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
}`,Ff=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Of=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Bf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Hf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Gf=`#include <common>
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
}`,kf=`#if DEPTH_PACKING == 3200
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
}`,Vf=`#define DISTANCE
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
}`,zf=`#define DISTANCE
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
}`,Wf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Xf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qf=`uniform float scale;
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
}`,Yf=`uniform vec3 diffuse;
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
}`,Kf=`#include <common>
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
}`,$f=`uniform vec3 diffuse;
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
}`,jf=`#define LAMBERT
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
}`,Zf=`#define LAMBERT
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
}`,Jf=`#define MATCAP
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
}`,Qf=`#define MATCAP
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
}`,eu=`#define NORMAL
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
}`,tu=`#define NORMAL
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
}`,nu=`#define PHONG
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
}`,iu=`#define PHONG
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
}`,ru=`#define STANDARD
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
}`,au=`#define STANDARD
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
}`,ou=`#define TOON
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
}`,su=`#define TOON
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
}`,lu=`uniform float size;
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
}`,cu=`uniform vec3 diffuse;
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
}`,fu=`#include <common>
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
}`,uu=`uniform vec3 color;
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
}`,du=`uniform float rotation;
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
}`,hu=`uniform vec3 diffuse;
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
}`,Be={alphahash_fragment:Il,alphahash_pars_fragment:Nl,alphamap_fragment:Fl,alphamap_pars_fragment:Ol,alphatest_fragment:Bl,alphatest_pars_fragment:Hl,aomap_fragment:Gl,aomap_pars_fragment:kl,batching_pars_vertex:Vl,batching_vertex:zl,begin_vertex:Wl,beginnormal_vertex:Xl,bsdfs:ql,iridescence_fragment:Yl,bumpmap_pars_fragment:Kl,clipping_planes_fragment:$l,clipping_planes_pars_fragment:jl,clipping_planes_pars_vertex:Zl,clipping_planes_vertex:Jl,color_fragment:Ql,color_pars_fragment:ec,color_pars_vertex:tc,color_vertex:nc,common:ic,cube_uv_reflection_fragment:rc,defaultnormal_vertex:ac,displacementmap_pars_vertex:oc,displacementmap_vertex:sc,emissivemap_fragment:lc,emissivemap_pars_fragment:cc,colorspace_fragment:fc,colorspace_pars_fragment:uc,envmap_fragment:dc,envmap_common_pars_fragment:hc,envmap_pars_fragment:pc,envmap_pars_vertex:_c,envmap_physical_pars_fragment:Rc,envmap_vertex:mc,fog_vertex:gc,fog_pars_vertex:vc,fog_fragment:Sc,fog_pars_fragment:Ec,gradientmap_pars_fragment:xc,lightmap_pars_fragment:Tc,lights_lambert_fragment:Mc,lights_lambert_pars_fragment:Ac,lights_pars_begin:bc,lights_toon_fragment:wc,lights_toon_pars_fragment:yc,lights_phong_fragment:Cc,lights_phong_pars_fragment:Pc,lights_physical_fragment:Lc,lights_physical_pars_fragment:Dc,lights_fragment_begin:Uc,lights_fragment_maps:Ic,lights_fragment_end:Nc,logdepthbuf_fragment:Fc,logdepthbuf_pars_fragment:Oc,logdepthbuf_pars_vertex:Bc,logdepthbuf_vertex:Hc,map_fragment:Gc,map_pars_fragment:kc,map_particle_fragment:Vc,map_particle_pars_fragment:zc,metalnessmap_fragment:Wc,metalnessmap_pars_fragment:Xc,morphinstance_vertex:qc,morphcolor_vertex:Yc,morphnormal_vertex:Kc,morphtarget_pars_vertex:$c,morphtarget_vertex:jc,normal_fragment_begin:Zc,normal_fragment_maps:Jc,normal_pars_fragment:Qc,normal_pars_vertex:ef,normal_vertex:tf,normalmap_pars_fragment:nf,clearcoat_normal_fragment_begin:rf,clearcoat_normal_fragment_maps:af,clearcoat_pars_fragment:of,iridescence_pars_fragment:sf,opaque_fragment:lf,packing:cf,premultiplied_alpha_fragment:ff,project_vertex:uf,dithering_fragment:df,dithering_pars_fragment:hf,roughnessmap_fragment:pf,roughnessmap_pars_fragment:_f,shadowmap_pars_fragment:mf,shadowmap_pars_vertex:gf,shadowmap_vertex:vf,shadowmask_pars_fragment:Sf,skinbase_vertex:Ef,skinning_pars_vertex:xf,skinning_vertex:Tf,skinnormal_vertex:Mf,specularmap_fragment:Af,specularmap_pars_fragment:bf,tonemapping_fragment:Rf,tonemapping_pars_fragment:wf,transmission_fragment:yf,transmission_pars_fragment:Cf,uv_pars_fragment:Pf,uv_pars_vertex:Lf,uv_vertex:Df,worldpos_vertex:Uf,background_vert:If,background_frag:Nf,backgroundCube_vert:Ff,backgroundCube_frag:Of,cube_vert:Bf,cube_frag:Hf,depth_vert:Gf,depth_frag:kf,distanceRGBA_vert:Vf,distanceRGBA_frag:zf,equirect_vert:Wf,equirect_frag:Xf,linedashed_vert:qf,linedashed_frag:Yf,meshbasic_vert:Kf,meshbasic_frag:$f,meshlambert_vert:jf,meshlambert_frag:Zf,meshmatcap_vert:Jf,meshmatcap_frag:Qf,meshnormal_vert:eu,meshnormal_frag:tu,meshphong_vert:nu,meshphong_frag:iu,meshphysical_vert:ru,meshphysical_frag:au,meshtoon_vert:ou,meshtoon_frag:su,points_vert:lu,points_frag:cu,shadow_vert:fu,shadow_frag:uu,sprite_vert:du,sprite_frag:hu},se={common:{diffuse:{value:new lt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new $e}},envmap:{envMap:{value:null},envMapRotation:{value:new $e},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new $e}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new $e}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new $e},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new $e},normalScale:{value:new ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new $e},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new $e}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new $e}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new $e}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new lt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new lt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0},uvTransform:{value:new $e}},sprite:{diffuse:{value:new lt(16777215)},opacity:{value:1},center:{value:new ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}}},zt={basic:{uniforms:Pt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.fog]),vertexShader:Be.meshbasic_vert,fragmentShader:Be.meshbasic_frag},lambert:{uniforms:Pt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.fog,se.lights,{emissive:{value:new lt(0)}}]),vertexShader:Be.meshlambert_vert,fragmentShader:Be.meshlambert_frag},phong:{uniforms:Pt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.fog,se.lights,{emissive:{value:new lt(0)},specular:{value:new lt(1118481)},shininess:{value:30}}]),vertexShader:Be.meshphong_vert,fragmentShader:Be.meshphong_frag},standard:{uniforms:Pt([se.common,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.roughnessmap,se.metalnessmap,se.fog,se.lights,{emissive:{value:new lt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Be.meshphysical_vert,fragmentShader:Be.meshphysical_frag},toon:{uniforms:Pt([se.common,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.gradientmap,se.fog,se.lights,{emissive:{value:new lt(0)}}]),vertexShader:Be.meshtoon_vert,fragmentShader:Be.meshtoon_frag},matcap:{uniforms:Pt([se.common,se.bumpmap,se.normalmap,se.displacementmap,se.fog,{matcap:{value:null}}]),vertexShader:Be.meshmatcap_vert,fragmentShader:Be.meshmatcap_frag},points:{uniforms:Pt([se.points,se.fog]),vertexShader:Be.points_vert,fragmentShader:Be.points_frag},dashed:{uniforms:Pt([se.common,se.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Be.linedashed_vert,fragmentShader:Be.linedashed_frag},depth:{uniforms:Pt([se.common,se.displacementmap]),vertexShader:Be.depth_vert,fragmentShader:Be.depth_frag},normal:{uniforms:Pt([se.common,se.bumpmap,se.normalmap,se.displacementmap,{opacity:{value:1}}]),vertexShader:Be.meshnormal_vert,fragmentShader:Be.meshnormal_frag},sprite:{uniforms:Pt([se.sprite,se.fog]),vertexShader:Be.sprite_vert,fragmentShader:Be.sprite_frag},background:{uniforms:{uvTransform:{value:new $e},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Be.background_vert,fragmentShader:Be.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new $e}},vertexShader:Be.backgroundCube_vert,fragmentShader:Be.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Be.cube_vert,fragmentShader:Be.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Be.equirect_vert,fragmentShader:Be.equirect_frag},distanceRGBA:{uniforms:Pt([se.common,se.displacementmap,{referencePosition:{value:new Ie},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Be.distanceRGBA_vert,fragmentShader:Be.distanceRGBA_frag},shadow:{uniforms:Pt([se.lights,se.fog,{color:{value:new lt(0)},opacity:{value:1}}]),vertexShader:Be.shadow_vert,fragmentShader:Be.shadow_frag}};zt.physical={uniforms:Pt([zt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new $e},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new $e},clearcoatNormalScale:{value:new ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new $e},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new $e},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new $e},sheen:{value:0},sheenColor:{value:new lt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new $e},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new $e},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new $e},transmissionSamplerSize:{value:new ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new $e},attenuationDistance:{value:0},attenuationColor:{value:new lt(0)},specularColor:{value:new lt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new $e},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new $e},anisotropyVector:{value:new ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new $e}}]),vertexShader:Be.meshphysical_vert,fragmentShader:Be.meshphysical_frag};const jn={r:0,b:0,g:0},rn=new co,pu=new Rn;function _u(e,t,n,i,a,r,o){const s=new lt(0);let f=r===!0?0:1,d,m,c=null,h=0,p=null;function T(b){let x=b.isScene===!0?b.background:null;return x&&x.isTexture&&(x=(b.backgroundBlurriness>0?n:t).get(x)),x}function S(b){let x=!1;const L=T(b);L===null?l(s,f):L&&L.isColor&&(l(L,1),x=!0);const C=e.xr.getEnvironmentBlendMode();C==="additive"?i.buffers.color.setClear(0,0,0,1,o):C==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(e.autoClear||x)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function u(b,x){const L=T(x);L&&(L.isCubeTexture||L.mapping===Ei)?(m===void 0&&(m=new $t(new lo(1,1,1),new tn({name:"BackgroundCubeMaterial",uniforms:Vr(zt.backgroundCube.uniforms),vertexShader:zt.backgroundCube.vertexShader,fragmentShader:zt.backgroundCube.fragmentShader,side:Bt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),m.geometry.deleteAttribute("normal"),m.geometry.deleteAttribute("uv"),m.onBeforeRender=function(C,y,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(m.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),a.update(m)),rn.copy(x.backgroundRotation),rn.x*=-1,rn.y*=-1,rn.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1&&(rn.y*=-1,rn.z*=-1),m.material.uniforms.envMap.value=L,m.material.uniforms.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,m.material.uniforms.backgroundBlurriness.value=x.backgroundBlurriness,m.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,m.material.uniforms.backgroundRotation.value.setFromMatrix4(pu.makeRotationFromEuler(rn)),m.material.toneMapped=_t.getTransfer(L.colorSpace)!==st,(c!==L||h!==L.version||p!==e.toneMapping)&&(m.material.needsUpdate=!0,c=L,h=L.version,p=e.toneMapping),m.layers.enableAll(),b.unshift(m,m.geometry,m.material,0,0,null)):L&&L.isTexture&&(d===void 0&&(d=new $t(new tr(2,2),new tn({name:"BackgroundMaterial",uniforms:Vr(zt.background.uniforms),vertexShader:zt.background.vertexShader,fragmentShader:zt.background.fragmentShader,side:Bn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),Object.defineProperty(d.material,"map",{get:function(){return this.uniforms.t2D.value}}),a.update(d)),d.material.uniforms.t2D.value=L,d.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,d.material.toneMapped=_t.getTransfer(L.colorSpace)!==st,L.matrixAutoUpdate===!0&&L.updateMatrix(),d.material.uniforms.uvTransform.value.copy(L.matrix),(c!==L||h!==L.version||p!==e.toneMapping)&&(d.material.needsUpdate=!0,c=L,h=L.version,p=e.toneMapping),d.layers.enableAll(),b.unshift(d,d.geometry,d.material,0,0,null))}function l(b,x){b.getRGB(jn,so(e)),i.buffers.color.setClear(jn.r,jn.g,jn.b,x,o)}function M(){m!==void 0&&(m.geometry.dispose(),m.material.dispose(),m=void 0),d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0)}return{getClearColor:function(){return s},setClearColor:function(b,x=1){s.set(b),f=x,l(s,f)},getClearAlpha:function(){return f},setClearAlpha:function(b){f=b,l(s,f)},render:S,addToRenderList:u,dispose:M}}function mu(e,t){const n=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},a=h(null);let r=a,o=!1;function s(_,w,P,N,G){let q=!1;const B=c(N,P,w);r!==B&&(r=B,d(r.object)),q=p(_,N,P,G),q&&T(_,N,P,G),G!==null&&t.update(G,e.ELEMENT_ARRAY_BUFFER),(q||o)&&(o=!1,x(_,w,P,N),G!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(G).buffer))}function f(){return e.createVertexArray()}function d(_){return e.bindVertexArray(_)}function m(_){return e.deleteVertexArray(_)}function c(_,w,P){const N=P.wireframe===!0;let G=i[_.id];G===void 0&&(G={},i[_.id]=G);let q=G[w.id];q===void 0&&(q={},G[w.id]=q);let B=q[N];return B===void 0&&(B=h(f()),q[N]=B),B}function h(_){const w=[],P=[],N=[];for(let G=0;G<n;G++)w[G]=0,P[G]=0,N[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:w,enabledAttributes:P,attributeDivisors:N,object:_,attributes:{},index:null}}function p(_,w,P,N){const G=r.attributes,q=w.attributes;let B=0;const Z=P.getAttributes();for(const W in Z)if(Z[W].location>=0){const ge=G[W];let Le=q[W];if(Le===void 0&&(W==="instanceMatrix"&&_.instanceMatrix&&(Le=_.instanceMatrix),W==="instanceColor"&&_.instanceColor&&(Le=_.instanceColor)),ge===void 0||ge.attribute!==Le||Le&&ge.data!==Le.data)return!0;B++}return r.attributesNum!==B||r.index!==N}function T(_,w,P,N){const G={},q=w.attributes;let B=0;const Z=P.getAttributes();for(const W in Z)if(Z[W].location>=0){let ge=q[W];ge===void 0&&(W==="instanceMatrix"&&_.instanceMatrix&&(ge=_.instanceMatrix),W==="instanceColor"&&_.instanceColor&&(ge=_.instanceColor));const Le={};Le.attribute=ge,ge&&ge.data&&(Le.data=ge.data),G[W]=Le,B++}r.attributes=G,r.attributesNum=B,r.index=N}function S(){const _=r.newAttributes;for(let w=0,P=_.length;w<P;w++)_[w]=0}function u(_){l(_,0)}function l(_,w){const P=r.newAttributes,N=r.enabledAttributes,G=r.attributeDivisors;P[_]=1,N[_]===0&&(e.enableVertexAttribArray(_),N[_]=1),G[_]!==w&&(e.vertexAttribDivisor(_,w),G[_]=w)}function M(){const _=r.newAttributes,w=r.enabledAttributes;for(let P=0,N=w.length;P<N;P++)w[P]!==_[P]&&(e.disableVertexAttribArray(P),w[P]=0)}function b(_,w,P,N,G,q,B){B===!0?e.vertexAttribIPointer(_,w,P,G,q):e.vertexAttribPointer(_,w,P,N,G,q)}function x(_,w,P,N){S();const G=N.attributes,q=P.getAttributes(),B=w.defaultAttributeValues;for(const Z in q){const W=q[Z];if(W.location>=0){let ae=G[Z];if(ae===void 0&&(Z==="instanceMatrix"&&_.instanceMatrix&&(ae=_.instanceMatrix),Z==="instanceColor"&&_.instanceColor&&(ae=_.instanceColor)),ae!==void 0){const ge=ae.normalized,Le=ae.itemSize,He=t.get(ae);if(He===void 0)continue;const Oe=He.buffer,$=He.type,ee=He.bytesPerElement,_e=$===e.INT||$===e.UNSIGNED_INT||ae.gpuType===no;if(ae.isInterleavedBufferAttribute){const le=ae.data,be=le.stride,qe=ae.offset;if(le.isInstancedInterleavedBuffer){for(let Pe=0;Pe<W.locationSize;Pe++)l(W.location+Pe,le.meshPerAttribute);_.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=le.meshPerAttribute*le.count)}else for(let Pe=0;Pe<W.locationSize;Pe++)u(W.location+Pe);e.bindBuffer(e.ARRAY_BUFFER,Oe);for(let Pe=0;Pe<W.locationSize;Pe++)b(W.location+Pe,Le/W.locationSize,$,ge,be*ee,(qe+Le/W.locationSize*Pe)*ee,_e)}else{if(ae.isInstancedBufferAttribute){for(let le=0;le<W.locationSize;le++)l(W.location+le,ae.meshPerAttribute);_.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let le=0;le<W.locationSize;le++)u(W.location+le);e.bindBuffer(e.ARRAY_BUFFER,Oe);for(let le=0;le<W.locationSize;le++)b(W.location+le,Le/W.locationSize,$,ge,Le*ee,Le/W.locationSize*le*ee,_e)}}else if(B!==void 0){const ge=B[Z];if(ge!==void 0)switch(ge.length){case 2:e.vertexAttrib2fv(W.location,ge);break;case 3:e.vertexAttrib3fv(W.location,ge);break;case 4:e.vertexAttrib4fv(W.location,ge);break;default:e.vertexAttrib1fv(W.location,ge)}}}}M()}function L(){U();for(const _ in i){const w=i[_];for(const P in w){const N=w[P];for(const G in N)m(N[G].object),delete N[G];delete w[P]}delete i[_]}}function C(_){if(i[_.id]===void 0)return;const w=i[_.id];for(const P in w){const N=w[P];for(const G in N)m(N[G].object),delete N[G];delete w[P]}delete i[_.id]}function y(_){for(const w in i){const P=i[w];if(P[_.id]===void 0)continue;const N=P[_.id];for(const G in N)m(N[G].object),delete N[G];delete P[_.id]}}function U(){v(),o=!0,r!==a&&(r=a,d(r.object))}function v(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:s,reset:U,resetDefaultState:v,dispose:L,releaseStatesOfGeometry:C,releaseStatesOfProgram:y,initAttributes:S,enableAttribute:u,disableUnusedAttributes:M}}function gu(e,t,n){let i;function a(d){i=d}function r(d,m){e.drawArrays(i,d,m),n.update(m,i,1)}function o(d,m,c){c!==0&&(e.drawArraysInstanced(i,d,m,c),n.update(m,i,c))}function s(d,m,c){if(c===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,d,0,m,0,c);let p=0;for(let T=0;T<c;T++)p+=m[T];n.update(p,i,1)}function f(d,m,c,h){if(c===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let T=0;T<d.length;T++)o(d[T],m[T],h[T]);else{p.multiDrawArraysInstancedWEBGL(i,d,0,m,0,h,0,c);let T=0;for(let S=0;S<c;S++)T+=m[S]*h[S];n.update(T,i,1)}}this.setMode=a,this.render=r,this.renderInstances=o,this.renderMultiDraw=s,this.renderMultiDrawInstances=f}function vu(e,t,n,i){let a;function r(){if(a!==void 0)return a;if(t.has("EXT_texture_filter_anisotropic")===!0){const y=t.get("EXT_texture_filter_anisotropic");a=e.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function o(y){return!(y!==kt&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function s(y){const U=y===vi&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(y!==en&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==Jt&&!U)}function f(y){if(y==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let d=n.precision!==void 0?n.precision:"highp";const m=f(d);m!==d&&(console.warn("THREE.WebGLRenderer:",d,"not supported, using",m,"instead."),d=m);const c=n.logarithmicDepthBuffer===!0,h=n.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),T=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),S=e.getParameter(e.MAX_TEXTURE_SIZE),u=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),l=e.getParameter(e.MAX_VERTEX_ATTRIBS),M=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),b=e.getParameter(e.MAX_VARYING_VECTORS),x=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),L=T>0,C=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:f,textureFormatReadable:o,textureTypeReadable:s,precision:d,logarithmicDepthBuffer:c,reverseDepthBuffer:h,maxTextures:p,maxVertexTextures:T,maxTextureSize:S,maxCubemapSize:u,maxAttributes:l,maxVertexUniforms:M,maxVaryings:b,maxFragmentUniforms:x,vertexTextures:L,maxSamples:C}}function Su(e){const t=this;let n=null,i=0,a=!1,r=!1;const o=new ps,s=new $e,f={value:null,needsUpdate:!1};this.uniform=f,this.numPlanes=0,this.numIntersection=0,this.init=function(c,h){const p=c.length!==0||h||i!==0||a;return a=h,i=c.length,p},this.beginShadows=function(){r=!0,m(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(c,h){n=m(c,h,0)},this.setState=function(c,h,p){const T=c.clippingPlanes,S=c.clipIntersection,u=c.clipShadows,l=e.get(c);if(!a||T===null||T.length===0||r&&!u)r?m(null):d();else{const M=r?0:i,b=M*4;let x=l.clippingState||null;f.value=x,x=m(T,h,b,p);for(let L=0;L!==b;++L)x[L]=n[L];l.clippingState=x,this.numIntersection=S?this.numPlanes:0,this.numPlanes+=M}};function d(){f.value!==n&&(f.value=n,f.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function m(c,h,p,T){const S=c!==null?c.length:0;let u=null;if(S!==0){if(u=f.value,T!==!0||u===null){const l=p+S*4,M=h.matrixWorldInverse;s.getNormalMatrix(M),(u===null||u.length<l)&&(u=new Float32Array(l));for(let b=0,x=p;b!==S;++b,x+=4)o.copy(c[b]).applyMatrix4(M,s),o.normal.toArray(u,x),u[x+3]=o.constant}f.value=u,f.needsUpdate=!0}return t.numPlanes=S,t.numIntersection=0,u}}function Eu(e){let t=new WeakMap;function n(o,s){return s===Ki?o.mapping=kn:s===$i&&(o.mapping=wn),o}function i(o){if(o&&o.isTexture){const s=o.mapping;if(s===Ki||s===$i)if(t.has(o)){const f=t.get(o).texture;return n(f,o.mapping)}else{const f=o.image;if(f&&f.height>0){const d=new Ls(f.height);return d.fromEquirectangularTexture(e,o),t.set(o,d),o.addEventListener("dispose",a),n(d.texture,o.mapping)}else return null}}return o}function a(o){const s=o.target;s.removeEventListener("dispose",a);const f=t.get(s);f!==void 0&&(t.delete(s),f.dispose())}function r(){t=new WeakMap}return{get:i,dispose:r}}const bn=4,ea=[.125,.215,.35,.446,.526,.582],sn=20,Ui=new uo,ta=new lt;let Ii=null,Ni=0,Fi=0,Oi=!1;const on=(1+Math.sqrt(5))/2,mn=1/on,na=[new Ie(-on,mn,0),new Ie(on,mn,0),new Ie(-mn,0,on),new Ie(mn,0,on),new Ie(0,on,-mn),new Ie(0,on,mn),new Ie(-1,1,-1),new Ie(1,1,-1),new Ie(-1,1,1),new Ie(1,1,1)],xu=new Ie;class ia{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,n=0,i=.1,a=100,r={}){const{size:o=256,position:s=xu}=r;Ii=this._renderer.getRenderTarget(),Ni=this._renderer.getActiveCubeFace(),Fi=this._renderer.getActiveMipmapLevel(),Oi=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const f=this._allocateTargets();return f.depthBuffer=!0,this._sceneToCubeUV(t,i,a,f,s),n>0&&this._blur(f,0,0,n),this._applyPMREM(f),this._cleanup(f),f}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=oa(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=aa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Ii,Ni,Fi),this._renderer.xr.enabled=Oi,t.scissorTest=!1,Zn(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===kn||t.mapping===wn?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Ii=this._renderer.getRenderTarget(),Ni=this._renderer.getActiveCubeFace(),Fi=this._renderer.getActiveMipmapLevel(),Oi=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=n||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:Zt,minFilter:Zt,generateMipmaps:!1,type:vi,format:kt,colorSpace:Si,depthBuffer:!1},a=ra(t,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ra(t,n,i);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Tu(r)),this._blurMaterial=Mu(r,t,n)}return a}_compileMaterial(t){const n=new $t(this._lodPlanes[0],t);this._renderer.compile(n,Ui)}_sceneToCubeUV(t,n,i,a,r){const f=new ai(90,1,n,i),d=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],c=this._renderer,h=c.autoClear,p=c.toneMapping;c.getClearColor(ta),c.toneMapping=Qt,c.autoClear=!1;const T=new Ns({name:"PMREM.Background",side:Bt,depthWrite:!1,depthTest:!1}),S=new $t(new lo,T);let u=!1;const l=t.background;l?l.isColor&&(T.color.copy(l),t.background=null,u=!0):(T.color.copy(ta),u=!0);for(let M=0;M<6;M++){const b=M%3;b===0?(f.up.set(0,d[M],0),f.position.set(r.x,r.y,r.z),f.lookAt(r.x+m[M],r.y,r.z)):b===1?(f.up.set(0,0,d[M]),f.position.set(r.x,r.y,r.z),f.lookAt(r.x,r.y+m[M],r.z)):(f.up.set(0,d[M],0),f.position.set(r.x,r.y,r.z),f.lookAt(r.x,r.y,r.z+m[M]));const x=this._cubeSize;Zn(a,b*x,M>2?x:0,x,x),c.setRenderTarget(a),u&&c.render(S,f),c.render(t,f)}S.geometry.dispose(),S.material.dispose(),c.toneMapping=p,c.autoClear=h,t.background=l}_textureToCubeUV(t,n){const i=this._renderer,a=t.mapping===kn||t.mapping===wn;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=oa()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=aa());const r=a?this._cubemapMaterial:this._equirectMaterial,o=new $t(this._lodPlanes[0],r),s=r.uniforms;s.envMap.value=t;const f=this._cubeSize;Zn(n,0,0,3*f,2*f),i.setRenderTarget(n),i.render(o,Ui)}_applyPMREM(t){const n=this._renderer,i=n.autoClear;n.autoClear=!1;const a=this._lodPlanes.length;for(let r=1;r<a;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),s=na[(a-r-1)%na.length];this._blur(t,r-1,r,o,s)}n.autoClear=i}_blur(t,n,i,a,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,n,i,a,"latitudinal",r),this._halfBlur(o,t,i,i,a,"longitudinal",r)}_halfBlur(t,n,i,a,r,o,s){const f=this._renderer,d=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const m=3,c=new $t(this._lodPlanes[a],d),h=d.uniforms,p=this._sizeLods[i]-1,T=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*sn-1),S=r/T,u=isFinite(r)?1+Math.floor(m*S):sn;u>sn&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${u} samples when the maximum is set to ${sn}`);const l=[];let M=0;for(let y=0;y<sn;++y){const U=y/S,v=Math.exp(-U*U/2);l.push(v),y===0?M+=v:y<u&&(M+=2*v)}for(let y=0;y<l.length;y++)l[y]=l[y]/M;h.envMap.value=t.texture,h.samples.value=u,h.weights.value=l,h.latitudinal.value=o==="latitudinal",s&&(h.poleAxis.value=s);const{_lodMax:b}=this;h.dTheta.value=T,h.mipInt.value=b-i;const x=this._sizeLods[a],L=3*x*(a>b-bn?a-b+bn:0),C=4*(this._cubeSize-x);Zn(n,L,C,3*x,2*x),f.setRenderTarget(n),f.render(c,Ui)}}function Tu(e){const t=[],n=[],i=[];let a=e;const r=e-bn+1+ea.length;for(let o=0;o<r;o++){const s=Math.pow(2,a);n.push(s);let f=1/s;o>e-bn?f=ea[o-e+bn-1]:o===0&&(f=0),i.push(f);const d=1/(s-2),m=-d,c=1+d,h=[m,m,c,m,c,c,m,m,c,c,m,c],p=6,T=6,S=3,u=2,l=1,M=new Float32Array(S*T*p),b=new Float32Array(u*T*p),x=new Float32Array(l*T*p);for(let C=0;C<p;C++){const y=C%3*2/3-1,U=C>2?0:-1,v=[y,U,0,y+2/3,U,0,y+2/3,U+1,0,y,U,0,y+2/3,U+1,0,y,U+1,0];M.set(v,S*T*C),b.set(h,u*T*C);const _=[C,C,C,C,C,C];x.set(_,l*T*C)}const L=new Za;L.setAttribute("position",new oi(M,S)),L.setAttribute("uv",new oi(b,u)),L.setAttribute("faceIndex",new oi(x,l)),t.push(L),a>bn&&a--}return{lodPlanes:t,sizeLods:n,sigmas:i}}function ra(e,t,n){const i=new Ft(e,t,n);return i.texture.mapping=Ei,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Zn(e,t,n,i,a){e.viewport.set(t,n,i,a),e.scissor.set(t,n,i,a)}function Mu(e,t,n){const i=new Float32Array(sn),a=new Ie(0,1,0);return new tn({name:"SphericalGaussianBlur",defines:{n:sn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:ir(),fragmentShader:`

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
		`,blending:fn,depthTest:!1,depthWrite:!1})}function aa(){return new tn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ir(),fragmentShader:`

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
		`,blending:fn,depthTest:!1,depthWrite:!1})}function oa(){return new tn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ir(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function ir(){return`

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
	`}function Au(e){let t=new WeakMap,n=null;function i(s){if(s&&s.isTexture){const f=s.mapping,d=f===Ki||f===$i,m=f===kn||f===wn;if(d||m){let c=t.get(s);const h=c!==void 0?c.texture.pmremVersion:0;if(s.isRenderTargetTexture&&s.pmremVersion!==h)return n===null&&(n=new ia(e)),c=d?n.fromEquirectangular(s,c):n.fromCubemap(s,c),c.texture.pmremVersion=s.pmremVersion,t.set(s,c),c.texture;if(c!==void 0)return c.texture;{const p=s.image;return d&&p&&p.height>0||m&&p&&a(p)?(n===null&&(n=new ia(e)),c=d?n.fromEquirectangular(s):n.fromCubemap(s),c.texture.pmremVersion=s.pmremVersion,t.set(s,c),s.addEventListener("dispose",r),c.texture):null}}}return s}function a(s){let f=0;const d=6;for(let m=0;m<d;m++)s[m]!==void 0&&f++;return f===d}function r(s){const f=s.target;f.removeEventListener("dispose",r);const d=t.get(f);d!==void 0&&(t.delete(f),d.dispose())}function o(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:o}}function bu(e){const t={};function n(i){if(t[i]!==void 0)return t[i];let a;switch(i){case"WEBGL_depth_texture":a=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":a=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":a=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":a=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:a=e.getExtension(i)}return t[i]=a,a}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){const a=n(i);return a===null&&ri("THREE.WebGLRenderer: "+i+" extension not supported."),a}}}function Ru(e,t,n,i){const a={},r=new WeakMap;function o(c){const h=c.target;h.index!==null&&t.remove(h.index);for(const T in h.attributes)t.remove(h.attributes[T]);h.removeEventListener("dispose",o),delete a[h.id];const p=r.get(h);p&&(t.remove(p),r.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,n.memory.geometries--}function s(c,h){return a[h.id]===!0||(h.addEventListener("dispose",o),a[h.id]=!0,n.memory.geometries++),h}function f(c){const h=c.attributes;for(const p in h)t.update(h[p],e.ARRAY_BUFFER)}function d(c){const h=[],p=c.index,T=c.attributes.position;let S=0;if(p!==null){const M=p.array;S=p.version;for(let b=0,x=M.length;b<x;b+=3){const L=M[b+0],C=M[b+1],y=M[b+2];h.push(L,C,C,y,y,L)}}else if(T!==void 0){const M=T.array;S=T.version;for(let b=0,x=M.length/3-1;b<x;b+=3){const L=b+0,C=b+1,y=b+2;h.push(L,C,C,y,y,L)}}else return;const u=new(Bs(h)?Fs:Os)(h,1);u.version=S;const l=r.get(c);l&&t.remove(l),r.set(c,u)}function m(c){const h=r.get(c);if(h){const p=c.index;p!==null&&h.version<p.version&&d(c)}else d(c);return r.get(c)}return{get:s,update:f,getWireframeAttribute:m}}function wu(e,t,n){let i;function a(h){i=h}let r,o;function s(h){r=h.type,o=h.bytesPerElement}function f(h,p){e.drawElements(i,p,r,h*o),n.update(p,i,1)}function d(h,p,T){T!==0&&(e.drawElementsInstanced(i,p,r,h*o,T),n.update(p,i,T))}function m(h,p,T){if(T===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,p,0,r,h,0,T);let u=0;for(let l=0;l<T;l++)u+=p[l];n.update(u,i,1)}function c(h,p,T,S){if(T===0)return;const u=t.get("WEBGL_multi_draw");if(u===null)for(let l=0;l<h.length;l++)d(h[l]/o,p[l],S[l]);else{u.multiDrawElementsInstancedWEBGL(i,p,0,r,h,0,S,0,T);let l=0;for(let M=0;M<T;M++)l+=p[M]*S[M];n.update(l,i,1)}}this.setMode=a,this.setIndex=s,this.render=f,this.renderInstances=d,this.renderMultiDraw=m,this.renderMultiDrawInstances=c}function yu(e){const t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,s){switch(n.calls++,o){case e.TRIANGLES:n.triangles+=s*(r/3);break;case e.LINES:n.lines+=s*(r/2);break;case e.LINE_STRIP:n.lines+=s*(r-1);break;case e.LINE_LOOP:n.lines+=s*r;break;case e.POINTS:n.points+=s*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function a(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:a,update:i}}function Cu(e,t,n){const i=new WeakMap,a=new Lt;function r(o,s,f){const d=o.morphTargetInfluences,m=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,c=m!==void 0?m.length:0;let h=i.get(s);if(h===void 0||h.count!==c){let v=function(){y.dispose(),i.delete(s),s.removeEventListener("dispose",v)};h!==void 0&&h.texture.dispose();const p=s.morphAttributes.position!==void 0,T=s.morphAttributes.normal!==void 0,S=s.morphAttributes.color!==void 0,u=s.morphAttributes.position||[],l=s.morphAttributes.normal||[],M=s.morphAttributes.color||[];let b=0;p===!0&&(b=1),T===!0&&(b=2),S===!0&&(b=3);let x=s.attributes.position.count*b,L=1;x>t.maxTextureSize&&(L=Math.ceil(x/t.maxTextureSize),x=t.maxTextureSize);const C=new Float32Array(x*L*4*c),y=new oo(C,x,L,c);y.type=Jt,y.needsUpdate=!0;const U=b*4;for(let _=0;_<c;_++){const w=u[_],P=l[_],N=M[_],G=x*L*4*_;for(let q=0;q<w.count;q++){const B=q*U;p===!0&&(a.fromBufferAttribute(w,q),C[G+B+0]=a.x,C[G+B+1]=a.y,C[G+B+2]=a.z,C[G+B+3]=0),T===!0&&(a.fromBufferAttribute(P,q),C[G+B+4]=a.x,C[G+B+5]=a.y,C[G+B+6]=a.z,C[G+B+7]=0),S===!0&&(a.fromBufferAttribute(N,q),C[G+B+8]=a.x,C[G+B+9]=a.y,C[G+B+10]=a.z,C[G+B+11]=N.itemSize===4?a.w:1)}}h={count:c,texture:y,size:new ht(x,L)},i.set(s,h),s.addEventListener("dispose",v)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)f.getUniforms().setValue(e,"morphTexture",o.morphTexture,n);else{let p=0;for(let S=0;S<d.length;S++)p+=d[S];const T=s.morphTargetsRelative?1:1-p;f.getUniforms().setValue(e,"morphTargetBaseInfluence",T),f.getUniforms().setValue(e,"morphTargetInfluences",d)}f.getUniforms().setValue(e,"morphTargetsTexture",h.texture,n),f.getUniforms().setValue(e,"morphTargetsTextureSize",h.size)}return{update:r}}function Pu(e,t,n,i){let a=new WeakMap;function r(f){const d=i.render.frame,m=f.geometry,c=t.get(f,m);if(a.get(c)!==d&&(t.update(c),a.set(c,d)),f.isInstancedMesh&&(f.hasEventListener("dispose",s)===!1&&f.addEventListener("dispose",s),a.get(f)!==d&&(n.update(f.instanceMatrix,e.ARRAY_BUFFER),f.instanceColor!==null&&n.update(f.instanceColor,e.ARRAY_BUFFER),a.set(f,d))),f.isSkinnedMesh){const h=f.skeleton;a.get(h)!==d&&(h.update(),a.set(h,d))}return c}function o(){a=new WeakMap}function s(f){const d=f.target;d.removeEventListener("dispose",s),n.remove(d.instanceMatrix),d.instanceColor!==null&&n.remove(d.instanceColor)}return{update:r,dispose:o}}const po=new to,sa=new $a(1,1),_o=new oo,mo=new $s,go=new Ks,la=[],ca=[],fa=new Float32Array(16),ua=new Float32Array(9),da=new Float32Array(4);function Pn(e,t,n){const i=e[0];if(i<=0||i>0)return e;const a=t*n;let r=la[a];if(r===void 0&&(r=new Float32Array(a),la[a]=r),t!==0){i.toArray(r,0);for(let o=1,s=0;o!==t;++o)s+=n,e[o].toArray(r,s)}return r}function mt(e,t){if(e.length!==t.length)return!1;for(let n=0,i=e.length;n<i;n++)if(e[n]!==t[n])return!1;return!0}function gt(e,t){for(let n=0,i=t.length;n<i;n++)e[n]=t[n]}function xi(e,t){let n=ca[t];n===void 0&&(n=new Int32Array(t),ca[t]=n);for(let i=0;i!==t;++i)n[i]=e.allocateTextureUnit();return n}function Lu(e,t){const n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Du(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(mt(n,t))return;e.uniform2fv(this.addr,t),gt(n,t)}}function Uu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(mt(n,t))return;e.uniform3fv(this.addr,t),gt(n,t)}}function Iu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(mt(n,t))return;e.uniform4fv(this.addr,t),gt(n,t)}}function Nu(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(mt(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),gt(n,t)}else{if(mt(n,i))return;da.set(i),e.uniformMatrix2fv(this.addr,!1,da),gt(n,i)}}function Fu(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(mt(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),gt(n,t)}else{if(mt(n,i))return;ua.set(i),e.uniformMatrix3fv(this.addr,!1,ua),gt(n,i)}}function Ou(e,t){const n=this.cache,i=t.elements;if(i===void 0){if(mt(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),gt(n,t)}else{if(mt(n,i))return;fa.set(i),e.uniformMatrix4fv(this.addr,!1,fa),gt(n,i)}}function Bu(e,t){const n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Hu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(mt(n,t))return;e.uniform2iv(this.addr,t),gt(n,t)}}function Gu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(mt(n,t))return;e.uniform3iv(this.addr,t),gt(n,t)}}function ku(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(mt(n,t))return;e.uniform4iv(this.addr,t),gt(n,t)}}function Vu(e,t){const n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function zu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(mt(n,t))return;e.uniform2uiv(this.addr,t),gt(n,t)}}function Wu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(mt(n,t))return;e.uniform3uiv(this.addr,t),gt(n,t)}}function Xu(e,t){const n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(mt(n,t))return;e.uniform4uiv(this.addr,t),gt(n,t)}}function qu(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a);let r;this.type===e.SAMPLER_2D_SHADOW?(sa.compareFunction=ja,r=sa):r=po,n.setTexture2D(t||r,a)}function Yu(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTexture3D(t||mo,a)}function Ku(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTextureCube(t||go,a)}function $u(e,t,n){const i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTexture2DArray(t||_o,a)}function ju(e){switch(e){case 5126:return Lu;case 35664:return Du;case 35665:return Uu;case 35666:return Iu;case 35674:return Nu;case 35675:return Fu;case 35676:return Ou;case 5124:case 35670:return Bu;case 35667:case 35671:return Hu;case 35668:case 35672:return Gu;case 35669:case 35673:return ku;case 5125:return Vu;case 36294:return zu;case 36295:return Wu;case 36296:return Xu;case 35678:case 36198:case 36298:case 36306:case 35682:return qu;case 35679:case 36299:case 36307:return Yu;case 35680:case 36300:case 36308:case 36293:return Ku;case 36289:case 36303:case 36311:case 36292:return $u}}function Zu(e,t){e.uniform1fv(this.addr,t)}function Ju(e,t){const n=Pn(t,this.size,2);e.uniform2fv(this.addr,n)}function Qu(e,t){const n=Pn(t,this.size,3);e.uniform3fv(this.addr,n)}function ed(e,t){const n=Pn(t,this.size,4);e.uniform4fv(this.addr,n)}function td(e,t){const n=Pn(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function nd(e,t){const n=Pn(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function id(e,t){const n=Pn(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function rd(e,t){e.uniform1iv(this.addr,t)}function ad(e,t){e.uniform2iv(this.addr,t)}function od(e,t){e.uniform3iv(this.addr,t)}function sd(e,t){e.uniform4iv(this.addr,t)}function ld(e,t){e.uniform1uiv(this.addr,t)}function cd(e,t){e.uniform2uiv(this.addr,t)}function fd(e,t){e.uniform3uiv(this.addr,t)}function ud(e,t){e.uniform4uiv(this.addr,t)}function dd(e,t,n){const i=this.cache,a=t.length,r=xi(n,a);mt(i,r)||(e.uniform1iv(this.addr,r),gt(i,r));for(let o=0;o!==a;++o)n.setTexture2D(t[o]||po,r[o])}function hd(e,t,n){const i=this.cache,a=t.length,r=xi(n,a);mt(i,r)||(e.uniform1iv(this.addr,r),gt(i,r));for(let o=0;o!==a;++o)n.setTexture3D(t[o]||mo,r[o])}function pd(e,t,n){const i=this.cache,a=t.length,r=xi(n,a);mt(i,r)||(e.uniform1iv(this.addr,r),gt(i,r));for(let o=0;o!==a;++o)n.setTextureCube(t[o]||go,r[o])}function _d(e,t,n){const i=this.cache,a=t.length,r=xi(n,a);mt(i,r)||(e.uniform1iv(this.addr,r),gt(i,r));for(let o=0;o!==a;++o)n.setTexture2DArray(t[o]||_o,r[o])}function md(e){switch(e){case 5126:return Zu;case 35664:return Ju;case 35665:return Qu;case 35666:return ed;case 35674:return td;case 35675:return nd;case 35676:return id;case 5124:case 35670:return rd;case 35667:case 35671:return ad;case 35668:case 35672:return od;case 35669:case 35673:return sd;case 5125:return ld;case 36294:return cd;case 36295:return fd;case 36296:return ud;case 35678:case 36198:case 36298:case 36306:case 35682:return dd;case 35679:case 36299:case 36307:return hd;case 35680:case 36300:case 36308:case 36293:return pd;case 36289:case 36303:case 36311:case 36292:return _d}}class gd{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.setValue=ju(n.type)}}class vd{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=md(n.type)}}class Sd{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,i){const a=this.seq;for(let r=0,o=a.length;r!==o;++r){const s=a[r];s.setValue(t,n[s.id],i)}}}const Bi=/(\w+)(\])?(\[|\.)?/g;function ha(e,t){e.seq.push(t),e.map[t.id]=t}function Ed(e,t,n){const i=e.name,a=i.length;for(Bi.lastIndex=0;;){const r=Bi.exec(i),o=Bi.lastIndex;let s=r[1];const f=r[2]==="]",d=r[3];if(f&&(s=s|0),d===void 0||d==="["&&o+2===a){ha(n,d===void 0?new gd(s,e,t):new vd(s,e,t));break}else{let c=n.map[s];c===void 0&&(c=new Sd(s),ha(n,c)),n=c}}}class li{constructor(t,n){this.seq=[],this.map={};const i=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){const r=t.getActiveUniform(n,a),o=t.getUniformLocation(n,r.name);Ed(r,o,this)}}setValue(t,n,i,a){const r=this.map[n];r!==void 0&&r.setValue(t,i,a)}setOptional(t,n,i){const a=n[i];a!==void 0&&this.setValue(t,i,a)}static upload(t,n,i,a){for(let r=0,o=n.length;r!==o;++r){const s=n[r],f=i[s.id];f.needsUpdate!==!1&&s.setValue(t,f.value,a)}}static seqWithValue(t,n){const i=[];for(let a=0,r=t.length;a!==r;++a){const o=t[a];o.id in n&&i.push(o)}return i}}function pa(e,t,n){const i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),i}const xd=37297;let Td=0;function Md(e,t){const n=e.split(`
`),i=[],a=Math.max(t-6,0),r=Math.min(t+6,n.length);for(let o=a;o<r;o++){const s=o+1;i.push(`${s===t?">":" "} ${s}: ${n[o]}`)}return i.join(`
`)}const _a=new $e;function Ad(e){_t._getMatrix(_a,_t.workingColorSpace,e);const t=`mat3( ${_a.elements.map(n=>n.toFixed(4))} )`;switch(_t.getTransfer(e)){case fo:return[t,"LinearTransferOETF"];case st:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[t,"LinearTransferOETF"]}}function ma(e,t,n){const i=e.getShaderParameter(t,e.COMPILE_STATUS),a=e.getShaderInfoLog(t).trim();if(i&&a==="")return"";const r=/ERROR: 0:(\d+)/.exec(a);if(r){const o=parseInt(r[1]);return n.toUpperCase()+`

`+a+`

`+Md(e.getShaderSource(t),o)}else return a}function bd(e,t){const n=Ad(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}function Rd(e,t){let n;switch(t){case Ys:n="Linear";break;case qs:n="Reinhard";break;case Xs:n="Cineon";break;case Ws:n="ACESFilmic";break;case zs:n="AgX";break;case Vs:n="Neutral";break;case ks:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+e+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}const Jn=new Ie;function wd(){_t.getLuminanceCoefficients(Jn);const e=Jn.x.toFixed(4),t=Jn.y.toFixed(4),n=Jn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${t}, ${n} );`,"	return dot( weights, rgb );","}"].join(`
`)}function yd(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(On).join(`
`)}function Cd(e){const t=[];for(const n in e){const i=e[n];i!==!1&&t.push("#define "+n+" "+i)}return t.join(`
`)}function Pd(e,t){const n={},i=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let a=0;a<i;a++){const r=e.getActiveAttrib(t,a),o=r.name;let s=1;r.type===e.FLOAT_MAT2&&(s=2),r.type===e.FLOAT_MAT3&&(s=3),r.type===e.FLOAT_MAT4&&(s=4),n[o]={type:r.type,location:e.getAttribLocation(t,o),locationSize:s}}return n}function On(e){return e!==""}function ga(e,t){const n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function va(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Ld=/^[ \t]*#include +<([\w\d./]+)>/gm;function Zi(e){return e.replace(Ld,Ud)}const Dd=new Map;function Ud(e,t){let n=Be[t];if(n===void 0){const i=Dd.get(t);if(i!==void 0)n=Be[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Zi(n)}const Id=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Sa(e){return e.replace(Id,Nd)}function Nd(e,t,n,i){let a="";for(let r=parseInt(t);r<parseInt(n);r++)a+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return a}function Ea(e){let t=`precision ${e.precision} float;
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
#define LOW_PRECISION`),t}function Fd(e){let t="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===Ja?t="SHADOWMAP_TYPE_PCF":e.shadowMapType===Gs?t="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===Yt&&(t="SHADOWMAP_TYPE_VSM"),t}function Od(e){let t="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case kn:case wn:t="ENVMAP_TYPE_CUBE";break;case Ei:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Bd(e){let t="ENVMAP_MODE_REFLECTION";if(e.envMap)switch(e.envMapMode){case wn:t="ENVMAP_MODE_REFRACTION";break}return t}function Hd(e){let t="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case Qs:t="ENVMAP_BLENDING_MULTIPLY";break;case Js:t="ENVMAP_BLENDING_MIX";break;case Zs:t="ENVMAP_BLENDING_ADD";break}return t}function Gd(e){const t=e.envMapCubeUVHeight;if(t===null)return null;const n=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function kd(e,t,n,i){const a=e.getContext(),r=n.defines;let o=n.vertexShader,s=n.fragmentShader;const f=Fd(n),d=Od(n),m=Bd(n),c=Hd(n),h=Gd(n),p=yd(n),T=Cd(r),S=a.createProgram();let u,l,M=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(u=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,T].filter(On).join(`
`),u.length>0&&(u+=`
`),l=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,T].filter(On).join(`
`),l.length>0&&(l+=`
`)):(u=[Ea(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,T,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+m:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+f:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",n.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(On).join(`
`),l=[Ea(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,T,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+d:"",n.envMap?"#define "+m:"",n.envMap?"#define "+c:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor||n.batchingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+f:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",n.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==Qt?"#define TONE_MAPPING":"",n.toneMapping!==Qt?Be.tonemapping_pars_fragment:"",n.toneMapping!==Qt?Rd("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Be.colorspace_pars_fragment,bd("linearToOutputTexel",n.outputColorSpace),wd(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(On).join(`
`)),o=Zi(o),o=ga(o,n),o=va(o,n),s=Zi(s),s=ga(s,n),s=va(s,n),o=Sa(o),s=Sa(s),n.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,u=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+u,l=["#define varying in",n.glslVersion===Wr?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===Wr?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+l);const b=M+u+o,x=M+l+s,L=pa(a,a.VERTEX_SHADER,b),C=pa(a,a.FRAGMENT_SHADER,x);a.attachShader(S,L),a.attachShader(S,C),n.index0AttributeName!==void 0?a.bindAttribLocation(S,0,n.index0AttributeName):n.morphTargets===!0&&a.bindAttribLocation(S,0,"position"),a.linkProgram(S);function y(w){if(e.debug.checkShaderErrors){const P=a.getProgramInfoLog(S).trim(),N=a.getShaderInfoLog(L).trim(),G=a.getShaderInfoLog(C).trim();let q=!0,B=!0;if(a.getProgramParameter(S,a.LINK_STATUS)===!1)if(q=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(a,S,L,C);else{const Z=ma(a,L,"vertex"),W=ma(a,C,"fragment");console.error("THREE.WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(S,a.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+P+`
`+Z+`
`+W)}else P!==""?console.warn("THREE.WebGLProgram: Program Info Log:",P):(N===""||G==="")&&(B=!1);B&&(w.diagnostics={runnable:q,programLog:P,vertexShader:{log:N,prefix:u},fragmentShader:{log:G,prefix:l}})}a.deleteShader(L),a.deleteShader(C),U=new li(a,S),v=Pd(a,S)}let U;this.getUniforms=function(){return U===void 0&&y(this),U};let v;this.getAttributes=function(){return v===void 0&&y(this),v};let _=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return _===!1&&(_=a.getProgramParameter(S,xd)),_},this.destroy=function(){i.releaseStatesOfProgram(this),a.deleteProgram(S),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Td++,this.cacheKey=t,this.usedTimes=1,this.program=S,this.vertexShader=L,this.fragmentShader=C,this}let Vd=0;class zd{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const n=t.vertexShader,i=t.fragmentShader,a=this._getShaderStage(n),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(a)===!1&&(o.add(a),a.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const n=this.materialCache.get(t);for(const i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const n=this.materialCache;let i=n.get(t);return i===void 0&&(i=new Set,n.set(t,i)),i}_getShaderStage(t){const n=this.shaderCache;let i=n.get(t);return i===void 0&&(i=new Wd(t),n.set(t,i)),i}}class Wd{constructor(t){this.id=Vd++,this.code=t,this.usedTimes=0}}function Xd(e,t,n,i,a,r,o){const s=new Hs,f=new zd,d=new Set,m=[],c=a.logarithmicDepthBuffer,h=a.vertexTextures;let p=a.precision;const T={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function S(v){return d.add(v),v===0?"uv":`uv${v}`}function u(v,_,w,P,N){const G=P.fog,q=N.geometry,B=v.isMeshStandardMaterial?P.environment:null,Z=(v.isMeshStandardMaterial?n:t).get(v.envMap||B),W=Z&&Z.mapping===Ei?Z.image.height:null,ae=T[v.type];v.precision!==null&&(p=a.getMaxPrecision(v.precision),p!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",p,"instead."));const ge=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,Le=ge!==void 0?ge.length:0;let He=0;q.morphAttributes.position!==void 0&&(He=1),q.morphAttributes.normal!==void 0&&(He=2),q.morphAttributes.color!==void 0&&(He=3);let Oe,$,ee,_e;if(ae){const Ye=zt[ae];Oe=Ye.vertexShader,$=Ye.fragmentShader}else Oe=v.vertexShader,$=v.fragmentShader,f.update(v),ee=f.getVertexShaderID(v),_e=f.getFragmentShaderID(v);const le=e.getRenderTarget(),be=e.state.buffers.depth.getReversed(),qe=N.isInstancedMesh===!0,Pe=N.isBatchedMesh===!0,Qe=!!v.map,rt=!!v.matcap,Ve=!!Z,D=!!v.aoMap,At=!!v.lightMap,Xe=!!v.bumpMap,ze=!!v.normalMap,Ae=!!v.displacementMap,et=!!v.emissiveMap,Te=!!v.metalnessMap,R=!!v.roughnessMap,g=v.anisotropy>0,k=v.clearcoat>0,J=v.dispersion>0,ne=v.iridescence>0,j=v.sheen>0,Me=v.transmission>0,ce=g&&!!v.anisotropyMap,me=k&&!!v.clearcoatMap,Ge=k&&!!v.clearcoatNormalMap,re=k&&!!v.clearcoatRoughnessMap,ve=ne&&!!v.iridescenceMap,ye=ne&&!!v.iridescenceThicknessMap,Re=j&&!!v.sheenColorMap,Se=j&&!!v.sheenRoughnessMap,We=!!v.specularMap,Fe=!!v.specularColorMap,tt=!!v.specularIntensityMap,I=Me&&!!v.transmissionMap,fe=Me&&!!v.thicknessMap,X=!!v.gradientMap,Q=!!v.alphaMap,de=v.alphaTest>0,ue=!!v.alphaHash,Ne=!!v.extensions;let at=Qt;v.toneMapped&&(le===null||le.isXRRenderTarget===!0)&&(at=e.toneMapping);const vt={shaderID:ae,shaderType:v.type,shaderName:v.name,vertexShader:Oe,fragmentShader:$,defines:v.defines,customVertexShaderID:ee,customFragmentShaderID:_e,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:p,batching:Pe,batchingColor:Pe&&N._colorsTexture!==null,instancing:qe,instancingColor:qe&&N.instanceColor!==null,instancingMorph:qe&&N.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:le===null?e.outputColorSpace:le.isXRRenderTarget===!0?le.texture.colorSpace:Si,alphaToCoverage:!!v.alphaToCoverage,map:Qe,matcap:rt,envMap:Ve,envMapMode:Ve&&Z.mapping,envMapCubeUVHeight:W,aoMap:D,lightMap:At,bumpMap:Xe,normalMap:ze,displacementMap:h&&Ae,emissiveMap:et,normalMapObjectSpace:ze&&v.normalMapType===Is,normalMapTangentSpace:ze&&v.normalMapType===Us,metalnessMap:Te,roughnessMap:R,anisotropy:g,anisotropyMap:ce,clearcoat:k,clearcoatMap:me,clearcoatNormalMap:Ge,clearcoatRoughnessMap:re,dispersion:J,iridescence:ne,iridescenceMap:ve,iridescenceThicknessMap:ye,sheen:j,sheenColorMap:Re,sheenRoughnessMap:Se,specularMap:We,specularColorMap:Fe,specularIntensityMap:tt,transmission:Me,transmissionMap:I,thicknessMap:fe,gradientMap:X,opaque:v.transparent===!1&&v.blending===si&&v.alphaToCoverage===!1,alphaMap:Q,alphaTest:de,alphaHash:ue,combine:v.combine,mapUv:Qe&&S(v.map.channel),aoMapUv:D&&S(v.aoMap.channel),lightMapUv:At&&S(v.lightMap.channel),bumpMapUv:Xe&&S(v.bumpMap.channel),normalMapUv:ze&&S(v.normalMap.channel),displacementMapUv:Ae&&S(v.displacementMap.channel),emissiveMapUv:et&&S(v.emissiveMap.channel),metalnessMapUv:Te&&S(v.metalnessMap.channel),roughnessMapUv:R&&S(v.roughnessMap.channel),anisotropyMapUv:ce&&S(v.anisotropyMap.channel),clearcoatMapUv:me&&S(v.clearcoatMap.channel),clearcoatNormalMapUv:Ge&&S(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:re&&S(v.clearcoatRoughnessMap.channel),iridescenceMapUv:ve&&S(v.iridescenceMap.channel),iridescenceThicknessMapUv:ye&&S(v.iridescenceThicknessMap.channel),sheenColorMapUv:Re&&S(v.sheenColorMap.channel),sheenRoughnessMapUv:Se&&S(v.sheenRoughnessMap.channel),specularMapUv:We&&S(v.specularMap.channel),specularColorMapUv:Fe&&S(v.specularColorMap.channel),specularIntensityMapUv:tt&&S(v.specularIntensityMap.channel),transmissionMapUv:I&&S(v.transmissionMap.channel),thicknessMapUv:fe&&S(v.thicknessMap.channel),alphaMapUv:Q&&S(v.alphaMap.channel),vertexTangents:!!q.attributes.tangent&&(ze||g),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!q.attributes.uv&&(Qe||Q),fog:!!G,useFog:v.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:v.flatShading===!0,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:c,reverseDepthBuffer:be,skinning:N.isSkinnedMesh===!0,morphTargets:q.morphAttributes.position!==void 0,morphNormals:q.morphAttributes.normal!==void 0,morphColors:q.morphAttributes.color!==void 0,morphTargetsCount:Le,morphTextureStride:He,numDirLights:_.directional.length,numPointLights:_.point.length,numSpotLights:_.spot.length,numSpotLightMaps:_.spotLightMap.length,numRectAreaLights:_.rectArea.length,numHemiLights:_.hemi.length,numDirLightShadows:_.directionalShadowMap.length,numPointLightShadows:_.pointShadowMap.length,numSpotLightShadows:_.spotShadowMap.length,numSpotLightShadowsWithMaps:_.numSpotLightShadowsWithMaps,numLightProbes:_.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:v.dithering,shadowMapEnabled:e.shadowMap.enabled&&w.length>0,shadowMapType:e.shadowMap.type,toneMapping:at,decodeVideoTexture:Qe&&v.map.isVideoTexture===!0&&_t.getTransfer(v.map.colorSpace)===st,decodeVideoTextureEmissive:et&&v.emissiveMap.isVideoTexture===!0&&_t.getTransfer(v.emissiveMap.colorSpace)===st,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===Kt,flipSided:v.side===Bt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Ne&&v.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ne&&v.extensions.multiDraw===!0||Pe)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return vt.vertexUv1s=d.has(1),vt.vertexUv2s=d.has(2),vt.vertexUv3s=d.has(3),d.clear(),vt}function l(v){const _=[];if(v.shaderID?_.push(v.shaderID):(_.push(v.customVertexShaderID),_.push(v.customFragmentShaderID)),v.defines!==void 0)for(const w in v.defines)_.push(w),_.push(v.defines[w]);return v.isRawShaderMaterial===!1&&(M(_,v),b(_,v),_.push(e.outputColorSpace)),_.push(v.customProgramCacheKey),_.join()}function M(v,_){v.push(_.precision),v.push(_.outputColorSpace),v.push(_.envMapMode),v.push(_.envMapCubeUVHeight),v.push(_.mapUv),v.push(_.alphaMapUv),v.push(_.lightMapUv),v.push(_.aoMapUv),v.push(_.bumpMapUv),v.push(_.normalMapUv),v.push(_.displacementMapUv),v.push(_.emissiveMapUv),v.push(_.metalnessMapUv),v.push(_.roughnessMapUv),v.push(_.anisotropyMapUv),v.push(_.clearcoatMapUv),v.push(_.clearcoatNormalMapUv),v.push(_.clearcoatRoughnessMapUv),v.push(_.iridescenceMapUv),v.push(_.iridescenceThicknessMapUv),v.push(_.sheenColorMapUv),v.push(_.sheenRoughnessMapUv),v.push(_.specularMapUv),v.push(_.specularColorMapUv),v.push(_.specularIntensityMapUv),v.push(_.transmissionMapUv),v.push(_.thicknessMapUv),v.push(_.combine),v.push(_.fogExp2),v.push(_.sizeAttenuation),v.push(_.morphTargetsCount),v.push(_.morphAttributeCount),v.push(_.numDirLights),v.push(_.numPointLights),v.push(_.numSpotLights),v.push(_.numSpotLightMaps),v.push(_.numHemiLights),v.push(_.numRectAreaLights),v.push(_.numDirLightShadows),v.push(_.numPointLightShadows),v.push(_.numSpotLightShadows),v.push(_.numSpotLightShadowsWithMaps),v.push(_.numLightProbes),v.push(_.shadowMapType),v.push(_.toneMapping),v.push(_.numClippingPlanes),v.push(_.numClipIntersection),v.push(_.depthPacking)}function b(v,_){s.disableAll(),_.supportsVertexTextures&&s.enable(0),_.instancing&&s.enable(1),_.instancingColor&&s.enable(2),_.instancingMorph&&s.enable(3),_.matcap&&s.enable(4),_.envMap&&s.enable(5),_.normalMapObjectSpace&&s.enable(6),_.normalMapTangentSpace&&s.enable(7),_.clearcoat&&s.enable(8),_.iridescence&&s.enable(9),_.alphaTest&&s.enable(10),_.vertexColors&&s.enable(11),_.vertexAlphas&&s.enable(12),_.vertexUv1s&&s.enable(13),_.vertexUv2s&&s.enable(14),_.vertexUv3s&&s.enable(15),_.vertexTangents&&s.enable(16),_.anisotropy&&s.enable(17),_.alphaHash&&s.enable(18),_.batching&&s.enable(19),_.dispersion&&s.enable(20),_.batchingColor&&s.enable(21),v.push(s.mask),s.disableAll(),_.fog&&s.enable(0),_.useFog&&s.enable(1),_.flatShading&&s.enable(2),_.logarithmicDepthBuffer&&s.enable(3),_.reverseDepthBuffer&&s.enable(4),_.skinning&&s.enable(5),_.morphTargets&&s.enable(6),_.morphNormals&&s.enable(7),_.morphColors&&s.enable(8),_.premultipliedAlpha&&s.enable(9),_.shadowMapEnabled&&s.enable(10),_.doubleSided&&s.enable(11),_.flipSided&&s.enable(12),_.useDepthPacking&&s.enable(13),_.dithering&&s.enable(14),_.transmission&&s.enable(15),_.sheen&&s.enable(16),_.opaque&&s.enable(17),_.pointsUvs&&s.enable(18),_.decodeVideoTexture&&s.enable(19),_.decodeVideoTextureEmissive&&s.enable(20),_.alphaToCoverage&&s.enable(21),v.push(s.mask)}function x(v){const _=T[v.type];let w;if(_){const P=zt[_];w=Ds.clone(P.uniforms)}else w=v.uniforms;return w}function L(v,_){let w;for(let P=0,N=m.length;P<N;P++){const G=m[P];if(G.cacheKey===_){w=G,++w.usedTimes;break}}return w===void 0&&(w=new kd(e,_,v,r),m.push(w)),w}function C(v){if(--v.usedTimes===0){const _=m.indexOf(v);m[_]=m[m.length-1],m.pop(),v.destroy()}}function y(v){f.remove(v)}function U(){f.dispose()}return{getParameters:u,getProgramCacheKey:l,getUniforms:x,acquireProgram:L,releaseProgram:C,releaseShaderCache:y,programs:m,dispose:U}}function qd(){let e=new WeakMap;function t(o){return e.has(o)}function n(o){let s=e.get(o);return s===void 0&&(s={},e.set(o,s)),s}function i(o){e.delete(o)}function a(o,s,f){e.get(o)[s]=f}function r(){e=new WeakMap}return{has:t,get:n,remove:i,update:a,dispose:r}}function Yd(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.z!==t.z?e.z-t.z:e.id-t.id}function xa(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function Ta(){const e=[];let t=0;const n=[],i=[],a=[];function r(){t=0,n.length=0,i.length=0,a.length=0}function o(c,h,p,T,S,u){let l=e[t];return l===void 0?(l={id:c.id,object:c,geometry:h,material:p,groupOrder:T,renderOrder:c.renderOrder,z:S,group:u},e[t]=l):(l.id=c.id,l.object=c,l.geometry=h,l.material=p,l.groupOrder=T,l.renderOrder=c.renderOrder,l.z=S,l.group=u),t++,l}function s(c,h,p,T,S,u){const l=o(c,h,p,T,S,u);p.transmission>0?i.push(l):p.transparent===!0?a.push(l):n.push(l)}function f(c,h,p,T,S,u){const l=o(c,h,p,T,S,u);p.transmission>0?i.unshift(l):p.transparent===!0?a.unshift(l):n.unshift(l)}function d(c,h){n.length>1&&n.sort(c||Yd),i.length>1&&i.sort(h||xa),a.length>1&&a.sort(h||xa)}function m(){for(let c=t,h=e.length;c<h;c++){const p=e[c];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:n,transmissive:i,transparent:a,init:r,push:s,unshift:f,finish:m,sort:d}}function Kd(){let e=new WeakMap;function t(i,a){const r=e.get(i);let o;return r===void 0?(o=new Ta,e.set(i,[o])):a>=r.length?(o=new Ta,r.push(o)):o=r[a],o}function n(){e=new WeakMap}return{get:t,dispose:n}}function $d(){const e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new Ie,color:new lt};break;case"SpotLight":n={position:new Ie,direction:new Ie,color:new lt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new Ie,color:new lt,distance:0,decay:0};break;case"HemisphereLight":n={direction:new Ie,skyColor:new lt,groundColor:new lt};break;case"RectAreaLight":n={color:new lt,position:new Ie,halfWidth:new Ie,halfHeight:new Ie};break}return e[t.id]=n,n}}}function jd(){const e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}let Zd=0;function Jd(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function Qd(e){const t=new $d,n=jd(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let d=0;d<9;d++)i.probe.push(new Ie);const a=new Ie,r=new Rn,o=new Rn;function s(d){let m=0,c=0,h=0;for(let v=0;v<9;v++)i.probe[v].set(0,0,0);let p=0,T=0,S=0,u=0,l=0,M=0,b=0,x=0,L=0,C=0,y=0;d.sort(Jd);for(let v=0,_=d.length;v<_;v++){const w=d[v],P=w.color,N=w.intensity,G=w.distance,q=w.shadow&&w.shadow.map?w.shadow.map.texture:null;if(w.isAmbientLight)m+=P.r*N,c+=P.g*N,h+=P.b*N;else if(w.isLightProbe){for(let B=0;B<9;B++)i.probe[B].addScaledVector(w.sh.coefficients[B],N);y++}else if(w.isDirectionalLight){const B=t.get(w);if(B.color.copy(w.color).multiplyScalar(w.intensity),w.castShadow){const Z=w.shadow,W=n.get(w);W.shadowIntensity=Z.intensity,W.shadowBias=Z.bias,W.shadowNormalBias=Z.normalBias,W.shadowRadius=Z.radius,W.shadowMapSize=Z.mapSize,i.directionalShadow[p]=W,i.directionalShadowMap[p]=q,i.directionalShadowMatrix[p]=w.shadow.matrix,M++}i.directional[p]=B,p++}else if(w.isSpotLight){const B=t.get(w);B.position.setFromMatrixPosition(w.matrixWorld),B.color.copy(P).multiplyScalar(N),B.distance=G,B.coneCos=Math.cos(w.angle),B.penumbraCos=Math.cos(w.angle*(1-w.penumbra)),B.decay=w.decay,i.spot[S]=B;const Z=w.shadow;if(w.map&&(i.spotLightMap[L]=w.map,L++,Z.updateMatrices(w),w.castShadow&&C++),i.spotLightMatrix[S]=Z.matrix,w.castShadow){const W=n.get(w);W.shadowIntensity=Z.intensity,W.shadowBias=Z.bias,W.shadowNormalBias=Z.normalBias,W.shadowRadius=Z.radius,W.shadowMapSize=Z.mapSize,i.spotShadow[S]=W,i.spotShadowMap[S]=q,x++}S++}else if(w.isRectAreaLight){const B=t.get(w);B.color.copy(P).multiplyScalar(N),B.halfWidth.set(w.width*.5,0,0),B.halfHeight.set(0,w.height*.5,0),i.rectArea[u]=B,u++}else if(w.isPointLight){const B=t.get(w);if(B.color.copy(w.color).multiplyScalar(w.intensity),B.distance=w.distance,B.decay=w.decay,w.castShadow){const Z=w.shadow,W=n.get(w);W.shadowIntensity=Z.intensity,W.shadowBias=Z.bias,W.shadowNormalBias=Z.normalBias,W.shadowRadius=Z.radius,W.shadowMapSize=Z.mapSize,W.shadowCameraNear=Z.camera.near,W.shadowCameraFar=Z.camera.far,i.pointShadow[T]=W,i.pointShadowMap[T]=q,i.pointShadowMatrix[T]=w.shadow.matrix,b++}i.point[T]=B,T++}else if(w.isHemisphereLight){const B=t.get(w);B.skyColor.copy(w.color).multiplyScalar(N),B.groundColor.copy(w.groundColor).multiplyScalar(N),i.hemi[l]=B,l++}}u>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=se.LTC_FLOAT_1,i.rectAreaLTC2=se.LTC_FLOAT_2):(i.rectAreaLTC1=se.LTC_HALF_1,i.rectAreaLTC2=se.LTC_HALF_2)),i.ambient[0]=m,i.ambient[1]=c,i.ambient[2]=h;const U=i.hash;(U.directionalLength!==p||U.pointLength!==T||U.spotLength!==S||U.rectAreaLength!==u||U.hemiLength!==l||U.numDirectionalShadows!==M||U.numPointShadows!==b||U.numSpotShadows!==x||U.numSpotMaps!==L||U.numLightProbes!==y)&&(i.directional.length=p,i.spot.length=S,i.rectArea.length=u,i.point.length=T,i.hemi.length=l,i.directionalShadow.length=M,i.directionalShadowMap.length=M,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=x,i.spotShadowMap.length=x,i.directionalShadowMatrix.length=M,i.pointShadowMatrix.length=b,i.spotLightMatrix.length=x+L-C,i.spotLightMap.length=L,i.numSpotLightShadowsWithMaps=C,i.numLightProbes=y,U.directionalLength=p,U.pointLength=T,U.spotLength=S,U.rectAreaLength=u,U.hemiLength=l,U.numDirectionalShadows=M,U.numPointShadows=b,U.numSpotShadows=x,U.numSpotMaps=L,U.numLightProbes=y,i.version=Zd++)}function f(d,m){let c=0,h=0,p=0,T=0,S=0;const u=m.matrixWorldInverse;for(let l=0,M=d.length;l<M;l++){const b=d[l];if(b.isDirectionalLight){const x=i.directional[c];x.direction.setFromMatrixPosition(b.matrixWorld),a.setFromMatrixPosition(b.target.matrixWorld),x.direction.sub(a),x.direction.transformDirection(u),c++}else if(b.isSpotLight){const x=i.spot[p];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(u),x.direction.setFromMatrixPosition(b.matrixWorld),a.setFromMatrixPosition(b.target.matrixWorld),x.direction.sub(a),x.direction.transformDirection(u),p++}else if(b.isRectAreaLight){const x=i.rectArea[T];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(u),o.identity(),r.copy(b.matrixWorld),r.premultiply(u),o.extractRotation(r),x.halfWidth.set(b.width*.5,0,0),x.halfHeight.set(0,b.height*.5,0),x.halfWidth.applyMatrix4(o),x.halfHeight.applyMatrix4(o),T++}else if(b.isPointLight){const x=i.point[h];x.position.setFromMatrixPosition(b.matrixWorld),x.position.applyMatrix4(u),h++}else if(b.isHemisphereLight){const x=i.hemi[S];x.direction.setFromMatrixPosition(b.matrixWorld),x.direction.transformDirection(u),S++}}}return{setup:s,setupView:f,state:i}}function Ma(e){const t=new Qd(e),n=[],i=[];function a(m){d.camera=m,n.length=0,i.length=0}function r(m){n.push(m)}function o(m){i.push(m)}function s(){t.setup(n)}function f(m){t.setupView(n,m)}const d={lightsArray:n,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:a,state:d,setupLights:s,setupLightsView:f,pushLight:r,pushShadow:o}}function eh(e){let t=new WeakMap;function n(a,r=0){const o=t.get(a);let s;return o===void 0?(s=new Ma(e),t.set(a,[s])):r>=o.length?(s=new Ma(e),o.push(s)):s=o[r],s}function i(){t=new WeakMap}return{get:n,dispose:i}}const th=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,nh=`uniform sampler2D shadow_pass;
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
}`;function ih(e,t,n){let i=new Ka;const a=new ht,r=new ht,o=new Lt,s=new _s({depthPacking:ms}),f=new gs,d={},m=n.maxTextureSize,c={[Bn]:Bt,[Bt]:Bn,[Kt]:Kt},h=new tn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ht},radius:{value:4}},vertexShader:th,fragmentShader:nh}),p=h.clone();p.defines.HORIZONTAL_PASS=1;const T=new Za;T.setAttribute("position",new oi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const S=new $t(T,h),u=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ja;let l=this.type;this.render=function(C,y,U){if(u.enabled===!1||u.autoUpdate===!1&&u.needsUpdate===!1||C.length===0)return;const v=e.getRenderTarget(),_=e.getActiveCubeFace(),w=e.getActiveMipmapLevel(),P=e.state;P.setBlending(fn),P.buffers.color.setClear(1,1,1,1),P.buffers.depth.setTest(!0),P.setScissorTest(!1);const N=l!==Yt&&this.type===Yt,G=l===Yt&&this.type!==Yt;for(let q=0,B=C.length;q<B;q++){const Z=C[q],W=Z.shadow;if(W===void 0){console.warn("THREE.WebGLShadowMap:",Z,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;a.copy(W.mapSize);const ae=W.getFrameExtents();if(a.multiply(ae),r.copy(W.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(r.x=Math.floor(m/ae.x),a.x=r.x*ae.x,W.mapSize.x=r.x),a.y>m&&(r.y=Math.floor(m/ae.y),a.y=r.y*ae.y,W.mapSize.y=r.y)),W.map===null||N===!0||G===!0){const Le=this.type!==Yt?{minFilter:cn,magFilter:cn}:{};W.map!==null&&W.map.dispose(),W.map=new Ft(a.x,a.y,Le),W.map.texture.name=Z.name+".shadowMap",W.camera.updateProjectionMatrix()}e.setRenderTarget(W.map),e.clear();const ge=W.getViewportCount();for(let Le=0;Le<ge;Le++){const He=W.getViewport(Le);o.set(r.x*He.x,r.y*He.y,r.x*He.z,r.y*He.w),P.viewport(o),W.updateMatrices(Z,Le),i=W.getFrustum(),x(y,U,W.camera,Z,this.type)}W.isPointLightShadow!==!0&&this.type===Yt&&M(W,U),W.needsUpdate=!1}l=this.type,u.needsUpdate=!1,e.setRenderTarget(v,_,w)};function M(C,y){const U=t.update(S);h.defines.VSM_SAMPLES!==C.blurSamples&&(h.defines.VSM_SAMPLES=C.blurSamples,p.defines.VSM_SAMPLES=C.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),C.mapPass===null&&(C.mapPass=new Ft(a.x,a.y)),h.uniforms.shadow_pass.value=C.map.texture,h.uniforms.resolution.value=C.mapSize,h.uniforms.radius.value=C.radius,e.setRenderTarget(C.mapPass),e.clear(),e.renderBufferDirect(y,null,U,h,S,null),p.uniforms.shadow_pass.value=C.mapPass.texture,p.uniforms.resolution.value=C.mapSize,p.uniforms.radius.value=C.radius,e.setRenderTarget(C.map),e.clear(),e.renderBufferDirect(y,null,U,p,S,null)}function b(C,y,U,v){let _=null;const w=U.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(w!==void 0)_=w;else if(_=U.isPointLight===!0?f:s,e.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0){const P=_.uuid,N=y.uuid;let G=d[P];G===void 0&&(G={},d[P]=G);let q=G[N];q===void 0&&(q=_.clone(),G[N]=q,y.addEventListener("dispose",L)),_=q}if(_.visible=y.visible,_.wireframe=y.wireframe,v===Yt?_.side=y.shadowSide!==null?y.shadowSide:y.side:_.side=y.shadowSide!==null?y.shadowSide:c[y.side],_.alphaMap=y.alphaMap,_.alphaTest=y.alphaTest,_.map=y.map,_.clipShadows=y.clipShadows,_.clippingPlanes=y.clippingPlanes,_.clipIntersection=y.clipIntersection,_.displacementMap=y.displacementMap,_.displacementScale=y.displacementScale,_.displacementBias=y.displacementBias,_.wireframeLinewidth=y.wireframeLinewidth,_.linewidth=y.linewidth,U.isPointLight===!0&&_.isMeshDistanceMaterial===!0){const P=e.properties.get(_);P.light=U}return _}function x(C,y,U,v,_){if(C.visible===!1)return;if(C.layers.test(y.layers)&&(C.isMesh||C.isLine||C.isPoints)&&(C.castShadow||C.receiveShadow&&_===Yt)&&(!C.frustumCulled||i.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(U.matrixWorldInverse,C.matrixWorld);const N=t.update(C),G=C.material;if(Array.isArray(G)){const q=N.groups;for(let B=0,Z=q.length;B<Z;B++){const W=q[B],ae=G[W.materialIndex];if(ae&&ae.visible){const ge=b(C,ae,v,_);C.onBeforeShadow(e,C,y,U,N,ge,W),e.renderBufferDirect(U,null,N,ge,C,W),C.onAfterShadow(e,C,y,U,N,ge,W)}}}else if(G.visible){const q=b(C,G,v,_);C.onBeforeShadow(e,C,y,U,N,q,null),e.renderBufferDirect(U,null,N,q,C,null),C.onAfterShadow(e,C,y,U,N,q,null)}}const P=C.children;for(let N=0,G=P.length;N<G;N++)x(P[N],y,U,v,_)}function L(C){C.target.removeEventListener("dispose",L);for(const U in d){const v=d[U],_=C.target.uuid;_ in v&&(v[_].dispose(),delete v[_])}}}const rh={[Yi]:qi,[Xi]:Vi,[Wi]:ki,[di]:zi,[qi]:Yi,[Vi]:Xi,[ki]:Wi,[zi]:di};function ah(e,t){function n(){let I=!1;const fe=new Lt;let X=null;const Q=new Lt(0,0,0,0);return{setMask:function(de){X!==de&&!I&&(e.colorMask(de,de,de,de),X=de)},setLocked:function(de){I=de},setClear:function(de,ue,Ne,at,vt){vt===!0&&(de*=at,ue*=at,Ne*=at),fe.set(de,ue,Ne,at),Q.equals(fe)===!1&&(e.clearColor(de,ue,Ne,at),Q.copy(fe))},reset:function(){I=!1,X=null,Q.set(-1,0,0,0)}}}function i(){let I=!1,fe=!1,X=null,Q=null,de=null;return{setReversed:function(ue){if(fe!==ue){const Ne=t.get("EXT_clip_control");ue?Ne.clipControlEXT(Ne.LOWER_LEFT_EXT,Ne.ZERO_TO_ONE_EXT):Ne.clipControlEXT(Ne.LOWER_LEFT_EXT,Ne.NEGATIVE_ONE_TO_ONE_EXT),fe=ue;const at=de;de=null,this.setClear(at)}},getReversed:function(){return fe},setTest:function(ue){ue?le(e.DEPTH_TEST):be(e.DEPTH_TEST)},setMask:function(ue){X!==ue&&!I&&(e.depthMask(ue),X=ue)},setFunc:function(ue){if(fe&&(ue=rh[ue]),Q!==ue){switch(ue){case Yi:e.depthFunc(e.NEVER);break;case qi:e.depthFunc(e.ALWAYS);break;case Xi:e.depthFunc(e.LESS);break;case di:e.depthFunc(e.LEQUAL);break;case Wi:e.depthFunc(e.EQUAL);break;case zi:e.depthFunc(e.GEQUAL);break;case Vi:e.depthFunc(e.GREATER);break;case ki:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}Q=ue}},setLocked:function(ue){I=ue},setClear:function(ue){de!==ue&&(fe&&(ue=1-ue),e.clearDepth(ue),de=ue)},reset:function(){I=!1,X=null,Q=null,de=null,fe=!1}}}function a(){let I=!1,fe=null,X=null,Q=null,de=null,ue=null,Ne=null,at=null,vt=null;return{setTest:function(Ye){I||(Ye?le(e.STENCIL_TEST):be(e.STENCIL_TEST))},setMask:function(Ye){fe!==Ye&&!I&&(e.stencilMask(Ye),fe=Ye)},setFunc:function(Ye,A,H){(X!==Ye||Q!==A||de!==H)&&(e.stencilFunc(Ye,A,H),X=Ye,Q=A,de=H)},setOp:function(Ye,A,H){(ue!==Ye||Ne!==A||at!==H)&&(e.stencilOp(Ye,A,H),ue=Ye,Ne=A,at=H)},setLocked:function(Ye){I=Ye},setClear:function(Ye){vt!==Ye&&(e.clearStencil(Ye),vt=Ye)},reset:function(){I=!1,fe=null,X=null,Q=null,de=null,ue=null,Ne=null,at=null,vt=null}}}const r=new n,o=new i,s=new a,f=new WeakMap,d=new WeakMap;let m={},c={},h=new WeakMap,p=[],T=null,S=!1,u=null,l=null,M=null,b=null,x=null,L=null,C=null,y=new lt(0,0,0),U=0,v=!1,_=null,w=null,P=null,N=null,G=null;const q=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,Z=0;const W=e.getParameter(e.VERSION);W.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(W)[1]),B=Z>=1):W.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(W)[1]),B=Z>=2);let ae=null,ge={};const Le=e.getParameter(e.SCISSOR_BOX),He=e.getParameter(e.VIEWPORT),Oe=new Lt().fromArray(Le),$=new Lt().fromArray(He);function ee(I,fe,X,Q){const de=new Uint8Array(4),ue=e.createTexture();e.bindTexture(I,ue),e.texParameteri(I,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(I,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Ne=0;Ne<X;Ne++)I===e.TEXTURE_3D||I===e.TEXTURE_2D_ARRAY?e.texImage3D(fe,0,e.RGBA,1,1,Q,0,e.RGBA,e.UNSIGNED_BYTE,de):e.texImage2D(fe+Ne,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,de);return ue}const _e={};_e[e.TEXTURE_2D]=ee(e.TEXTURE_2D,e.TEXTURE_2D,1),_e[e.TEXTURE_CUBE_MAP]=ee(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),_e[e.TEXTURE_2D_ARRAY]=ee(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),_e[e.TEXTURE_3D]=ee(e.TEXTURE_3D,e.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),s.setClear(0),le(e.DEPTH_TEST),o.setFunc(di),Xe(!1),ze(Br),le(e.CULL_FACE),D(fn);function le(I){m[I]!==!0&&(e.enable(I),m[I]=!0)}function be(I){m[I]!==!1&&(e.disable(I),m[I]=!1)}function qe(I,fe){return c[I]!==fe?(e.bindFramebuffer(I,fe),c[I]=fe,I===e.DRAW_FRAMEBUFFER&&(c[e.FRAMEBUFFER]=fe),I===e.FRAMEBUFFER&&(c[e.DRAW_FRAMEBUFFER]=fe),!0):!1}function Pe(I,fe){let X=p,Q=!1;if(I){X=h.get(fe),X===void 0&&(X=[],h.set(fe,X));const de=I.textures;if(X.length!==de.length||X[0]!==e.COLOR_ATTACHMENT0){for(let ue=0,Ne=de.length;ue<Ne;ue++)X[ue]=e.COLOR_ATTACHMENT0+ue;X.length=de.length,Q=!0}}else X[0]!==e.BACK&&(X[0]=e.BACK,Q=!0);Q&&e.drawBuffers(X)}function Qe(I){return T!==I?(e.useProgram(I),T=I,!0):!1}const rt={[Dn]:e.FUNC_ADD,[ko]:e.FUNC_SUBTRACT,[Go]:e.FUNC_REVERSE_SUBTRACT};rt[el]=e.MIN,rt[tl]=e.MAX;const Ve={[ns]:e.ZERO,[ts]:e.ONE,[es]:e.SRC_COLOR,[Qo]:e.SRC_ALPHA,[Jo]:e.SRC_ALPHA_SATURATE,[Zo]:e.DST_COLOR,[jo]:e.DST_ALPHA,[$o]:e.ONE_MINUS_SRC_COLOR,[Ko]:e.ONE_MINUS_SRC_ALPHA,[Yo]:e.ONE_MINUS_DST_COLOR,[qo]:e.ONE_MINUS_DST_ALPHA,[Xo]:e.CONSTANT_COLOR,[Wo]:e.ONE_MINUS_CONSTANT_COLOR,[zo]:e.CONSTANT_ALPHA,[Vo]:e.ONE_MINUS_CONSTANT_ALPHA};function D(I,fe,X,Q,de,ue,Ne,at,vt,Ye){if(I===fn){S===!0&&(be(e.BLEND),S=!1);return}if(S===!1&&(le(e.BLEND),S=!0),I!==Ps){if(I!==u||Ye!==v){if((l!==Dn||x!==Dn)&&(e.blendEquation(e.FUNC_ADD),l=Dn,x=Dn),Ye)switch(I){case si:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case kr:e.blendFunc(e.ONE,e.ONE);break;case Gr:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Hr:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case si:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case kr:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case Gr:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Hr:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}M=null,b=null,L=null,C=null,y.set(0,0,0),U=0,u=I,v=Ye}return}de=de||fe,ue=ue||X,Ne=Ne||Q,(fe!==l||de!==x)&&(e.blendEquationSeparate(rt[fe],rt[de]),l=fe,x=de),(X!==M||Q!==b||ue!==L||Ne!==C)&&(e.blendFuncSeparate(Ve[X],Ve[Q],Ve[ue],Ve[Ne]),M=X,b=Q,L=ue,C=Ne),(at.equals(y)===!1||vt!==U)&&(e.blendColor(at.r,at.g,at.b,vt),y.copy(at),U=vt),u=I,v=!1}function At(I,fe){I.side===Kt?be(e.CULL_FACE):le(e.CULL_FACE);let X=I.side===Bt;fe&&(X=!X),Xe(X),I.blending===si&&I.transparent===!1?D(fn):D(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),o.setFunc(I.depthFunc),o.setTest(I.depthTest),o.setMask(I.depthWrite),r.setMask(I.colorWrite);const Q=I.stencilWrite;s.setTest(Q),Q&&(s.setMask(I.stencilWriteMask),s.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),s.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),et(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?le(e.SAMPLE_ALPHA_TO_COVERAGE):be(e.SAMPLE_ALPHA_TO_COVERAGE)}function Xe(I){_!==I&&(I?e.frontFace(e.CW):e.frontFace(e.CCW),_=I)}function ze(I){I!==ys?(le(e.CULL_FACE),I!==w&&(I===Br?e.cullFace(e.BACK):I===Cs?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):be(e.CULL_FACE),w=I}function Ae(I){I!==P&&(B&&e.lineWidth(I),P=I)}function et(I,fe,X){I?(le(e.POLYGON_OFFSET_FILL),(N!==fe||G!==X)&&(e.polygonOffset(fe,X),N=fe,G=X)):be(e.POLYGON_OFFSET_FILL)}function Te(I){I?le(e.SCISSOR_TEST):be(e.SCISSOR_TEST)}function R(I){I===void 0&&(I=e.TEXTURE0+q-1),ae!==I&&(e.activeTexture(I),ae=I)}function g(I,fe,X){X===void 0&&(ae===null?X=e.TEXTURE0+q-1:X=ae);let Q=ge[X];Q===void 0&&(Q={type:void 0,texture:void 0},ge[X]=Q),(Q.type!==I||Q.texture!==fe)&&(ae!==X&&(e.activeTexture(X),ae=X),e.bindTexture(I,fe||_e[I]),Q.type=I,Q.texture=fe)}function k(){const I=ge[ae];I!==void 0&&I.type!==void 0&&(e.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function J(){try{e.compressedTexImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ne(){try{e.compressedTexImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function j(){try{e.texSubImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Me(){try{e.texSubImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ce(){try{e.compressedTexSubImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function me(){try{e.compressedTexSubImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Ge(){try{e.texStorage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function re(){try{e.texStorage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ve(){try{e.texImage2D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ye(){try{e.texImage3D(...arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Re(I){Oe.equals(I)===!1&&(e.scissor(I.x,I.y,I.z,I.w),Oe.copy(I))}function Se(I){$.equals(I)===!1&&(e.viewport(I.x,I.y,I.z,I.w),$.copy(I))}function We(I,fe){let X=d.get(fe);X===void 0&&(X=new WeakMap,d.set(fe,X));let Q=X.get(I);Q===void 0&&(Q=e.getUniformBlockIndex(fe,I.name),X.set(I,Q))}function Fe(I,fe){const Q=d.get(fe).get(I);f.get(fe)!==Q&&(e.uniformBlockBinding(fe,Q,I.__bindingPointIndex),f.set(fe,Q))}function tt(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),m={},ae=null,ge={},c={},h=new WeakMap,p=[],T=null,S=!1,u=null,l=null,M=null,b=null,x=null,L=null,C=null,y=new lt(0,0,0),U=0,v=!1,_=null,w=null,P=null,N=null,G=null,Oe.set(0,0,e.canvas.width,e.canvas.height),$.set(0,0,e.canvas.width,e.canvas.height),r.reset(),o.reset(),s.reset()}return{buffers:{color:r,depth:o,stencil:s},enable:le,disable:be,bindFramebuffer:qe,drawBuffers:Pe,useProgram:Qe,setBlending:D,setMaterial:At,setFlipSided:Xe,setCullFace:ze,setLineWidth:Ae,setPolygonOffset:et,setScissorTest:Te,activeTexture:R,bindTexture:g,unbindTexture:k,compressedTexImage2D:J,compressedTexImage3D:ne,texImage2D:ve,texImage3D:ye,updateUBOMapping:We,uniformBlockBinding:Fe,texStorage2D:Ge,texStorage3D:re,texSubImage2D:j,texSubImage3D:Me,compressedTexSubImage2D:ce,compressedTexSubImage3D:me,scissor:Re,viewport:Se,reset:tt}}function oh(e,t,n,i,a,r,o){const s=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,f=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),d=new ht,m=new WeakMap;let c;const h=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function T(R,g){return p?new OffscreenCanvas(R,g):js("canvas")}function S(R,g,k){let J=1;const ne=Te(R);if((ne.width>k||ne.height>k)&&(J=k/Math.max(ne.width,ne.height)),J<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){const j=Math.floor(J*ne.width),Me=Math.floor(J*ne.height);c===void 0&&(c=T(j,Me));const ce=g?T(j,Me):c;return ce.width=j,ce.height=Me,ce.getContext("2d").drawImage(R,0,0,j,Me),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ne.width+"x"+ne.height+") to ("+j+"x"+Me+")."),ce}else return"data"in R&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ne.width+"x"+ne.height+")."),R;return R}function u(R){return R.generateMipmaps}function l(R){e.generateMipmap(R)}function M(R){return R.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?e.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function b(R,g,k,J,ne=!1){if(R!==null){if(e[R]!==void 0)return e[R];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let j=g;if(g===e.RED&&(k===e.FLOAT&&(j=e.R32F),k===e.HALF_FLOAT&&(j=e.R16F),k===e.UNSIGNED_BYTE&&(j=e.R8)),g===e.RED_INTEGER&&(k===e.UNSIGNED_BYTE&&(j=e.R8UI),k===e.UNSIGNED_SHORT&&(j=e.R16UI),k===e.UNSIGNED_INT&&(j=e.R32UI),k===e.BYTE&&(j=e.R8I),k===e.SHORT&&(j=e.R16I),k===e.INT&&(j=e.R32I)),g===e.RG&&(k===e.FLOAT&&(j=e.RG32F),k===e.HALF_FLOAT&&(j=e.RG16F),k===e.UNSIGNED_BYTE&&(j=e.RG8)),g===e.RG_INTEGER&&(k===e.UNSIGNED_BYTE&&(j=e.RG8UI),k===e.UNSIGNED_SHORT&&(j=e.RG16UI),k===e.UNSIGNED_INT&&(j=e.RG32UI),k===e.BYTE&&(j=e.RG8I),k===e.SHORT&&(j=e.RG16I),k===e.INT&&(j=e.RG32I)),g===e.RGB_INTEGER&&(k===e.UNSIGNED_BYTE&&(j=e.RGB8UI),k===e.UNSIGNED_SHORT&&(j=e.RGB16UI),k===e.UNSIGNED_INT&&(j=e.RGB32UI),k===e.BYTE&&(j=e.RGB8I),k===e.SHORT&&(j=e.RGB16I),k===e.INT&&(j=e.RGB32I)),g===e.RGBA_INTEGER&&(k===e.UNSIGNED_BYTE&&(j=e.RGBA8UI),k===e.UNSIGNED_SHORT&&(j=e.RGBA16UI),k===e.UNSIGNED_INT&&(j=e.RGBA32UI),k===e.BYTE&&(j=e.RGBA8I),k===e.SHORT&&(j=e.RGBA16I),k===e.INT&&(j=e.RGBA32I)),g===e.RGB&&k===e.UNSIGNED_INT_5_9_9_9_REV&&(j=e.RGB9_E5),g===e.RGBA){const Me=ne?fo:_t.getTransfer(J);k===e.FLOAT&&(j=e.RGBA32F),k===e.HALF_FLOAT&&(j=e.RGBA16F),k===e.UNSIGNED_BYTE&&(j=Me===st?e.SRGB8_ALPHA8:e.RGBA8),k===e.UNSIGNED_SHORT_4_4_4_4&&(j=e.RGBA4),k===e.UNSIGNED_SHORT_5_5_5_1&&(j=e.RGB5_A1)}return(j===e.R16F||j===e.R32F||j===e.RG16F||j===e.RG32F||j===e.RGBA16F||j===e.RGBA32F)&&t.get("EXT_color_buffer_float"),j}function x(R,g){let k;return R?g===null||g===Gn||g===Hn?k=e.DEPTH24_STENCIL8:g===Jt?k=e.DEPTH32F_STENCIL8:g===hi&&(k=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):g===null||g===Gn||g===Hn?k=e.DEPTH_COMPONENT24:g===Jt?k=e.DEPTH_COMPONENT32F:g===hi&&(k=e.DEPTH_COMPONENT16),k}function L(R,g){return u(R)===!0||R.isFramebufferTexture&&R.minFilter!==cn&&R.minFilter!==Zt?Math.log2(Math.max(g.width,g.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?g.mipmaps.length:1}function C(R){const g=R.target;g.removeEventListener("dispose",C),U(g),g.isVideoTexture&&m.delete(g)}function y(R){const g=R.target;g.removeEventListener("dispose",y),_(g)}function U(R){const g=i.get(R);if(g.__webglInit===void 0)return;const k=R.source,J=h.get(k);if(J){const ne=J[g.__cacheKey];ne.usedTimes--,ne.usedTimes===0&&v(R),Object.keys(J).length===0&&h.delete(k)}i.remove(R)}function v(R){const g=i.get(R);e.deleteTexture(g.__webglTexture);const k=R.source,J=h.get(k);delete J[g.__cacheKey],o.memory.textures--}function _(R){const g=i.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),i.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(g.__webglFramebuffer[J]))for(let ne=0;ne<g.__webglFramebuffer[J].length;ne++)e.deleteFramebuffer(g.__webglFramebuffer[J][ne]);else e.deleteFramebuffer(g.__webglFramebuffer[J]);g.__webglDepthbuffer&&e.deleteRenderbuffer(g.__webglDepthbuffer[J])}else{if(Array.isArray(g.__webglFramebuffer))for(let J=0;J<g.__webglFramebuffer.length;J++)e.deleteFramebuffer(g.__webglFramebuffer[J]);else e.deleteFramebuffer(g.__webglFramebuffer);if(g.__webglDepthbuffer&&e.deleteRenderbuffer(g.__webglDepthbuffer),g.__webglMultisampledFramebuffer&&e.deleteFramebuffer(g.__webglMultisampledFramebuffer),g.__webglColorRenderbuffer)for(let J=0;J<g.__webglColorRenderbuffer.length;J++)g.__webglColorRenderbuffer[J]&&e.deleteRenderbuffer(g.__webglColorRenderbuffer[J]);g.__webglDepthRenderbuffer&&e.deleteRenderbuffer(g.__webglDepthRenderbuffer)}const k=R.textures;for(let J=0,ne=k.length;J<ne;J++){const j=i.get(k[J]);j.__webglTexture&&(e.deleteTexture(j.__webglTexture),o.memory.textures--),i.remove(k[J])}i.remove(R)}let w=0;function P(){w=0}function N(){const R=w;return R>=a.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+a.maxTextures),w+=1,R}function G(R){const g=[];return g.push(R.wrapS),g.push(R.wrapT),g.push(R.wrapR||0),g.push(R.magFilter),g.push(R.minFilter),g.push(R.anisotropy),g.push(R.internalFormat),g.push(R.format),g.push(R.type),g.push(R.generateMipmaps),g.push(R.premultiplyAlpha),g.push(R.flipY),g.push(R.unpackAlignment),g.push(R.colorSpace),g.join()}function q(R,g){const k=i.get(R);if(R.isVideoTexture&&Ae(R),R.isRenderTargetTexture===!1&&R.version>0&&k.__version!==R.version){const J=R.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{$(k,R,g);return}}n.bindTexture(e.TEXTURE_2D,k.__webglTexture,e.TEXTURE0+g)}function B(R,g){const k=i.get(R);if(R.version>0&&k.__version!==R.version){$(k,R,g);return}n.bindTexture(e.TEXTURE_2D_ARRAY,k.__webglTexture,e.TEXTURE0+g)}function Z(R,g){const k=i.get(R);if(R.version>0&&k.__version!==R.version){$(k,R,g);return}n.bindTexture(e.TEXTURE_3D,k.__webglTexture,e.TEXTURE0+g)}function W(R,g){const k=i.get(R);if(R.version>0&&k.__version!==R.version){ee(k,R,g);return}n.bindTexture(e.TEXTURE_CUBE_MAP,k.__webglTexture,e.TEXTURE0+g)}const ae={[as]:e.REPEAT,[rs]:e.CLAMP_TO_EDGE,[is]:e.MIRRORED_REPEAT},ge={[cn]:e.NEAREST,[os]:e.NEAREST_MIPMAP_NEAREST,[Yn]:e.NEAREST_MIPMAP_LINEAR,[Zt]:e.LINEAR,[bi]:e.LINEAR_MIPMAP_NEAREST,[Fn]:e.LINEAR_MIPMAP_LINEAR},Le={[hs]:e.NEVER,[ds]:e.ALWAYS,[us]:e.LESS,[ja]:e.LEQUAL,[fs]:e.EQUAL,[cs]:e.GEQUAL,[ls]:e.GREATER,[ss]:e.NOTEQUAL};function He(R,g){if(g.type===Jt&&t.has("OES_texture_float_linear")===!1&&(g.magFilter===Zt||g.magFilter===bi||g.magFilter===Yn||g.magFilter===Fn||g.minFilter===Zt||g.minFilter===bi||g.minFilter===Yn||g.minFilter===Fn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(R,e.TEXTURE_WRAP_S,ae[g.wrapS]),e.texParameteri(R,e.TEXTURE_WRAP_T,ae[g.wrapT]),(R===e.TEXTURE_3D||R===e.TEXTURE_2D_ARRAY)&&e.texParameteri(R,e.TEXTURE_WRAP_R,ae[g.wrapR]),e.texParameteri(R,e.TEXTURE_MAG_FILTER,ge[g.magFilter]),e.texParameteri(R,e.TEXTURE_MIN_FILTER,ge[g.minFilter]),g.compareFunction&&(e.texParameteri(R,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(R,e.TEXTURE_COMPARE_FUNC,Le[g.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(g.magFilter===cn||g.minFilter!==Yn&&g.minFilter!==Fn||g.type===Jt&&t.has("OES_texture_float_linear")===!1)return;if(g.anisotropy>1||i.get(g).__currentAnisotropy){const k=t.get("EXT_texture_filter_anisotropic");e.texParameterf(R,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(g.anisotropy,a.getMaxAnisotropy())),i.get(g).__currentAnisotropy=g.anisotropy}}}function Oe(R,g){let k=!1;R.__webglInit===void 0&&(R.__webglInit=!0,g.addEventListener("dispose",C));const J=g.source;let ne=h.get(J);ne===void 0&&(ne={},h.set(J,ne));const j=G(g);if(j!==R.__cacheKey){ne[j]===void 0&&(ne[j]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,k=!0),ne[j].usedTimes++;const Me=ne[R.__cacheKey];Me!==void 0&&(ne[R.__cacheKey].usedTimes--,Me.usedTimes===0&&v(g)),R.__cacheKey=j,R.__webglTexture=ne[j].texture}return k}function $(R,g,k){let J=e.TEXTURE_2D;(g.isDataArrayTexture||g.isCompressedArrayTexture)&&(J=e.TEXTURE_2D_ARRAY),g.isData3DTexture&&(J=e.TEXTURE_3D);const ne=Oe(R,g),j=g.source;n.bindTexture(J,R.__webglTexture,e.TEXTURE0+k);const Me=i.get(j);if(j.version!==Me.__version||ne===!0){n.activeTexture(e.TEXTURE0+k);const ce=_t.getPrimaries(_t.workingColorSpace),me=g.colorSpace===Mn?null:_t.getPrimaries(g.colorSpace),Ge=g.colorSpace===Mn||ce===me?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,g.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,g.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ge);let re=S(g.image,!1,a.maxTextureSize);re=et(g,re);const ve=r.convert(g.format,g.colorSpace),ye=r.convert(g.type);let Re=b(g.internalFormat,ve,ye,g.colorSpace,g.isVideoTexture);He(J,g);let Se;const We=g.mipmaps,Fe=g.isVideoTexture!==!0,tt=Me.__version===void 0||ne===!0,I=j.dataReady,fe=L(g,re);if(g.isDepthTexture)Re=x(g.format===ui,g.type),tt&&(Fe?n.texStorage2D(e.TEXTURE_2D,1,Re,re.width,re.height):n.texImage2D(e.TEXTURE_2D,0,Re,re.width,re.height,0,ve,ye,null));else if(g.isDataTexture)if(We.length>0){Fe&&tt&&n.texStorage2D(e.TEXTURE_2D,fe,Re,We[0].width,We[0].height);for(let X=0,Q=We.length;X<Q;X++)Se=We[X],Fe?I&&n.texSubImage2D(e.TEXTURE_2D,X,0,0,Se.width,Se.height,ve,ye,Se.data):n.texImage2D(e.TEXTURE_2D,X,Re,Se.width,Se.height,0,ve,ye,Se.data);g.generateMipmaps=!1}else Fe?(tt&&n.texStorage2D(e.TEXTURE_2D,fe,Re,re.width,re.height),I&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,re.width,re.height,ve,ye,re.data)):n.texImage2D(e.TEXTURE_2D,0,Re,re.width,re.height,0,ve,ye,re.data);else if(g.isCompressedTexture)if(g.isCompressedArrayTexture){Fe&&tt&&n.texStorage3D(e.TEXTURE_2D_ARRAY,fe,Re,We[0].width,We[0].height,re.depth);for(let X=0,Q=We.length;X<Q;X++)if(Se=We[X],g.format!==kt)if(ve!==null)if(Fe){if(I)if(g.layerUpdates.size>0){const de=zr(Se.width,Se.height,g.format,g.type);for(const ue of g.layerUpdates){const Ne=Se.data.subarray(ue*de/Se.data.BYTES_PER_ELEMENT,(ue+1)*de/Se.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,X,0,0,ue,Se.width,Se.height,1,ve,Ne)}g.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,X,0,0,0,Se.width,Se.height,re.depth,ve,Se.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,X,Re,Se.width,Se.height,re.depth,0,Se.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Fe?I&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,X,0,0,0,Se.width,Se.height,re.depth,ve,ye,Se.data):n.texImage3D(e.TEXTURE_2D_ARRAY,X,Re,Se.width,Se.height,re.depth,0,ve,ye,Se.data)}else{Fe&&tt&&n.texStorage2D(e.TEXTURE_2D,fe,Re,We[0].width,We[0].height);for(let X=0,Q=We.length;X<Q;X++)Se=We[X],g.format!==kt?ve!==null?Fe?I&&n.compressedTexSubImage2D(e.TEXTURE_2D,X,0,0,Se.width,Se.height,ve,Se.data):n.compressedTexImage2D(e.TEXTURE_2D,X,Re,Se.width,Se.height,0,Se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Fe?I&&n.texSubImage2D(e.TEXTURE_2D,X,0,0,Se.width,Se.height,ve,ye,Se.data):n.texImage2D(e.TEXTURE_2D,X,Re,Se.width,Se.height,0,ve,ye,Se.data)}else if(g.isDataArrayTexture)if(Fe){if(tt&&n.texStorage3D(e.TEXTURE_2D_ARRAY,fe,Re,re.width,re.height,re.depth),I)if(g.layerUpdates.size>0){const X=zr(re.width,re.height,g.format,g.type);for(const Q of g.layerUpdates){const de=re.data.subarray(Q*X/re.data.BYTES_PER_ELEMENT,(Q+1)*X/re.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,Q,re.width,re.height,1,ve,ye,de)}g.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,re.width,re.height,re.depth,ve,ye,re.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,Re,re.width,re.height,re.depth,0,ve,ye,re.data);else if(g.isData3DTexture)Fe?(tt&&n.texStorage3D(e.TEXTURE_3D,fe,Re,re.width,re.height,re.depth),I&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,re.width,re.height,re.depth,ve,ye,re.data)):n.texImage3D(e.TEXTURE_3D,0,Re,re.width,re.height,re.depth,0,ve,ye,re.data);else if(g.isFramebufferTexture){if(tt)if(Fe)n.texStorage2D(e.TEXTURE_2D,fe,Re,re.width,re.height);else{let X=re.width,Q=re.height;for(let de=0;de<fe;de++)n.texImage2D(e.TEXTURE_2D,de,Re,X,Q,0,ve,ye,null),X>>=1,Q>>=1}}else if(We.length>0){if(Fe&&tt){const X=Te(We[0]);n.texStorage2D(e.TEXTURE_2D,fe,Re,X.width,X.height)}for(let X=0,Q=We.length;X<Q;X++)Se=We[X],Fe?I&&n.texSubImage2D(e.TEXTURE_2D,X,0,0,ve,ye,Se):n.texImage2D(e.TEXTURE_2D,X,Re,ve,ye,Se);g.generateMipmaps=!1}else if(Fe){if(tt){const X=Te(re);n.texStorage2D(e.TEXTURE_2D,fe,Re,X.width,X.height)}I&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,ve,ye,re)}else n.texImage2D(e.TEXTURE_2D,0,Re,ve,ye,re);u(g)&&l(J),Me.__version=j.version,g.onUpdate&&g.onUpdate(g)}R.__version=g.version}function ee(R,g,k){if(g.image.length!==6)return;const J=Oe(R,g),ne=g.source;n.bindTexture(e.TEXTURE_CUBE_MAP,R.__webglTexture,e.TEXTURE0+k);const j=i.get(ne);if(ne.version!==j.__version||J===!0){n.activeTexture(e.TEXTURE0+k);const Me=_t.getPrimaries(_t.workingColorSpace),ce=g.colorSpace===Mn?null:_t.getPrimaries(g.colorSpace),me=g.colorSpace===Mn||Me===ce?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,g.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,g.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,me);const Ge=g.isCompressedTexture||g.image[0].isCompressedTexture,re=g.image[0]&&g.image[0].isDataTexture,ve=[];for(let Q=0;Q<6;Q++)!Ge&&!re?ve[Q]=S(g.image[Q],!0,a.maxCubemapSize):ve[Q]=re?g.image[Q].image:g.image[Q],ve[Q]=et(g,ve[Q]);const ye=ve[0],Re=r.convert(g.format,g.colorSpace),Se=r.convert(g.type),We=b(g.internalFormat,Re,Se,g.colorSpace),Fe=g.isVideoTexture!==!0,tt=j.__version===void 0||J===!0,I=ne.dataReady;let fe=L(g,ye);He(e.TEXTURE_CUBE_MAP,g);let X;if(Ge){Fe&&tt&&n.texStorage2D(e.TEXTURE_CUBE_MAP,fe,We,ye.width,ye.height);for(let Q=0;Q<6;Q++){X=ve[Q].mipmaps;for(let de=0;de<X.length;de++){const ue=X[de];g.format!==kt?Re!==null?Fe?I&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de,0,0,ue.width,ue.height,Re,ue.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de,We,ue.width,ue.height,0,ue.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Fe?I&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de,0,0,ue.width,ue.height,Re,Se,ue.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de,We,ue.width,ue.height,0,Re,Se,ue.data)}}}else{if(X=g.mipmaps,Fe&&tt){X.length>0&&fe++;const Q=Te(ve[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,fe,We,Q.width,Q.height)}for(let Q=0;Q<6;Q++)if(re){Fe?I&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,ve[Q].width,ve[Q].height,Re,Se,ve[Q].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,We,ve[Q].width,ve[Q].height,0,Re,Se,ve[Q].data);for(let de=0;de<X.length;de++){const Ne=X[de].image[Q].image;Fe?I&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de+1,0,0,Ne.width,Ne.height,Re,Se,Ne.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de+1,We,Ne.width,Ne.height,0,Re,Se,Ne.data)}}else{Fe?I&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,Re,Se,ve[Q]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,We,Re,Se,ve[Q]);for(let de=0;de<X.length;de++){const ue=X[de];Fe?I&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de+1,0,0,Re,Se,ue.image[Q]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+Q,de+1,We,Re,Se,ue.image[Q])}}}u(g)&&l(e.TEXTURE_CUBE_MAP),j.__version=ne.version,g.onUpdate&&g.onUpdate(g)}R.__version=g.version}function _e(R,g,k,J,ne,j){const Me=r.convert(k.format,k.colorSpace),ce=r.convert(k.type),me=b(k.internalFormat,Me,ce,k.colorSpace),Ge=i.get(g),re=i.get(k);if(re.__renderTarget=g,!Ge.__hasExternalTextures){const ve=Math.max(1,g.width>>j),ye=Math.max(1,g.height>>j);ne===e.TEXTURE_3D||ne===e.TEXTURE_2D_ARRAY?n.texImage3D(ne,j,me,ve,ye,g.depth,0,Me,ce,null):n.texImage2D(ne,j,me,ve,ye,0,Me,ce,null)}n.bindFramebuffer(e.FRAMEBUFFER,R),ze(g)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,J,ne,re.__webglTexture,0,Xe(g)):(ne===e.TEXTURE_2D||ne>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&ne<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,J,ne,re.__webglTexture,j),n.bindFramebuffer(e.FRAMEBUFFER,null)}function le(R,g,k){if(e.bindRenderbuffer(e.RENDERBUFFER,R),g.depthBuffer){const J=g.depthTexture,ne=J&&J.isDepthTexture?J.type:null,j=x(g.stencilBuffer,ne),Me=g.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ce=Xe(g);ze(g)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ce,j,g.width,g.height):k?e.renderbufferStorageMultisample(e.RENDERBUFFER,ce,j,g.width,g.height):e.renderbufferStorage(e.RENDERBUFFER,j,g.width,g.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,Me,e.RENDERBUFFER,R)}else{const J=g.textures;for(let ne=0;ne<J.length;ne++){const j=J[ne],Me=r.convert(j.format,j.colorSpace),ce=r.convert(j.type),me=b(j.internalFormat,Me,ce,j.colorSpace),Ge=Xe(g);k&&ze(g)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ge,me,g.width,g.height):ze(g)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ge,me,g.width,g.height):e.renderbufferStorage(e.RENDERBUFFER,me,g.width,g.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function be(R,g){if(g&&g.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(e.FRAMEBUFFER,R),!(g.depthTexture&&g.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=i.get(g.depthTexture);J.__renderTarget=g,(!J.__webglTexture||g.depthTexture.image.width!==g.width||g.depthTexture.image.height!==g.height)&&(g.depthTexture.image.width=g.width,g.depthTexture.image.height=g.height,g.depthTexture.needsUpdate=!0),q(g.depthTexture,0);const ne=J.__webglTexture,j=Xe(g);if(g.depthTexture.format===er)ze(g)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,ne,0,j):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,ne,0);else if(g.depthTexture.format===ui)ze(g)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,ne,0,j):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,ne,0);else throw new Error("Unknown depthTexture format")}function qe(R){const g=i.get(R),k=R.isWebGLCubeRenderTarget===!0;if(g.__boundDepthTexture!==R.depthTexture){const J=R.depthTexture;if(g.__depthDisposeCallback&&g.__depthDisposeCallback(),J){const ne=()=>{delete g.__boundDepthTexture,delete g.__depthDisposeCallback,J.removeEventListener("dispose",ne)};J.addEventListener("dispose",ne),g.__depthDisposeCallback=ne}g.__boundDepthTexture=J}if(R.depthTexture&&!g.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");be(g.__webglFramebuffer,R)}else if(k){g.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(n.bindFramebuffer(e.FRAMEBUFFER,g.__webglFramebuffer[J]),g.__webglDepthbuffer[J]===void 0)g.__webglDepthbuffer[J]=e.createRenderbuffer(),le(g.__webglDepthbuffer[J],R,!1);else{const ne=R.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,j=g.__webglDepthbuffer[J];e.bindRenderbuffer(e.RENDERBUFFER,j),e.framebufferRenderbuffer(e.FRAMEBUFFER,ne,e.RENDERBUFFER,j)}}else if(n.bindFramebuffer(e.FRAMEBUFFER,g.__webglFramebuffer),g.__webglDepthbuffer===void 0)g.__webglDepthbuffer=e.createRenderbuffer(),le(g.__webglDepthbuffer,R,!1);else{const J=R.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ne=g.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,ne),e.framebufferRenderbuffer(e.FRAMEBUFFER,J,e.RENDERBUFFER,ne)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Pe(R,g,k){const J=i.get(R);g!==void 0&&_e(J.__webglFramebuffer,R,R.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),k!==void 0&&qe(R)}function Qe(R){const g=R.texture,k=i.get(R),J=i.get(g);R.addEventListener("dispose",y);const ne=R.textures,j=R.isWebGLCubeRenderTarget===!0,Me=ne.length>1;if(Me||(J.__webglTexture===void 0&&(J.__webglTexture=e.createTexture()),J.__version=g.version,o.memory.textures++),j){k.__webglFramebuffer=[];for(let ce=0;ce<6;ce++)if(g.mipmaps&&g.mipmaps.length>0){k.__webglFramebuffer[ce]=[];for(let me=0;me<g.mipmaps.length;me++)k.__webglFramebuffer[ce][me]=e.createFramebuffer()}else k.__webglFramebuffer[ce]=e.createFramebuffer()}else{if(g.mipmaps&&g.mipmaps.length>0){k.__webglFramebuffer=[];for(let ce=0;ce<g.mipmaps.length;ce++)k.__webglFramebuffer[ce]=e.createFramebuffer()}else k.__webglFramebuffer=e.createFramebuffer();if(Me)for(let ce=0,me=ne.length;ce<me;ce++){const Ge=i.get(ne[ce]);Ge.__webglTexture===void 0&&(Ge.__webglTexture=e.createTexture(),o.memory.textures++)}if(R.samples>0&&ze(R)===!1){k.__webglMultisampledFramebuffer=e.createFramebuffer(),k.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let ce=0;ce<ne.length;ce++){const me=ne[ce];k.__webglColorRenderbuffer[ce]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,k.__webglColorRenderbuffer[ce]);const Ge=r.convert(me.format,me.colorSpace),re=r.convert(me.type),ve=b(me.internalFormat,Ge,re,me.colorSpace,R.isXRRenderTarget===!0),ye=Xe(R);e.renderbufferStorageMultisample(e.RENDERBUFFER,ye,ve,R.width,R.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.RENDERBUFFER,k.__webglColorRenderbuffer[ce])}e.bindRenderbuffer(e.RENDERBUFFER,null),R.depthBuffer&&(k.__webglDepthRenderbuffer=e.createRenderbuffer(),le(k.__webglDepthRenderbuffer,R,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(j){n.bindTexture(e.TEXTURE_CUBE_MAP,J.__webglTexture),He(e.TEXTURE_CUBE_MAP,g);for(let ce=0;ce<6;ce++)if(g.mipmaps&&g.mipmaps.length>0)for(let me=0;me<g.mipmaps.length;me++)_e(k.__webglFramebuffer[ce][me],R,g,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ce,me);else _e(k.__webglFramebuffer[ce],R,g,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0);u(g)&&l(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Me){for(let ce=0,me=ne.length;ce<me;ce++){const Ge=ne[ce],re=i.get(Ge);n.bindTexture(e.TEXTURE_2D,re.__webglTexture),He(e.TEXTURE_2D,Ge),_e(k.__webglFramebuffer,R,Ge,e.COLOR_ATTACHMENT0+ce,e.TEXTURE_2D,0),u(Ge)&&l(e.TEXTURE_2D)}n.unbindTexture()}else{let ce=e.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(ce=R.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(ce,J.__webglTexture),He(ce,g),g.mipmaps&&g.mipmaps.length>0)for(let me=0;me<g.mipmaps.length;me++)_e(k.__webglFramebuffer[me],R,g,e.COLOR_ATTACHMENT0,ce,me);else _e(k.__webglFramebuffer,R,g,e.COLOR_ATTACHMENT0,ce,0);u(g)&&l(ce),n.unbindTexture()}R.depthBuffer&&qe(R)}function rt(R){const g=R.textures;for(let k=0,J=g.length;k<J;k++){const ne=g[k];if(u(ne)){const j=M(R),Me=i.get(ne).__webglTexture;n.bindTexture(j,Me),l(j),n.unbindTexture()}}}const Ve=[],D=[];function At(R){if(R.samples>0){if(ze(R)===!1){const g=R.textures,k=R.width,J=R.height;let ne=e.COLOR_BUFFER_BIT;const j=R.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Me=i.get(R),ce=g.length>1;if(ce)for(let me=0;me<g.length;me++)n.bindFramebuffer(e.FRAMEBUFFER,Me.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+me,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,Me.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+me,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,Me.__webglMultisampledFramebuffer),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Me.__webglFramebuffer);for(let me=0;me<g.length;me++){if(R.resolveDepthBuffer&&(R.depthBuffer&&(ne|=e.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&(ne|=e.STENCIL_BUFFER_BIT)),ce){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,Me.__webglColorRenderbuffer[me]);const Ge=i.get(g[me]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Ge,0)}e.blitFramebuffer(0,0,k,J,0,0,k,J,ne,e.NEAREST),f===!0&&(Ve.length=0,D.length=0,Ve.push(e.COLOR_ATTACHMENT0+me),R.depthBuffer&&R.resolveDepthBuffer===!1&&(Ve.push(j),D.push(j),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,D)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Ve))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),ce)for(let me=0;me<g.length;me++){n.bindFramebuffer(e.FRAMEBUFFER,Me.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+me,e.RENDERBUFFER,Me.__webglColorRenderbuffer[me]);const Ge=i.get(g[me]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,Me.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+me,e.TEXTURE_2D,Ge,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,Me.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&f){const g=R.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[g])}}}function Xe(R){return Math.min(a.maxSamples,R.samples)}function ze(R){const g=i.get(R);return R.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&g.__useRenderToTexture!==!1}function Ae(R){const g=o.render.frame;m.get(R)!==g&&(m.set(R,g),R.update())}function et(R,g){const k=R.colorSpace,J=R.format,ne=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||k!==Si&&k!==Mn&&(_t.getTransfer(k)===st?(J!==kt||ne!==en)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),g}function Te(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(d.width=R.naturalWidth||R.width,d.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(d.width=R.displayWidth,d.height=R.displayHeight):(d.width=R.width,d.height=R.height),d}this.allocateTextureUnit=N,this.resetTextureUnits=P,this.setTexture2D=q,this.setTexture2DArray=B,this.setTexture3D=Z,this.setTextureCube=W,this.rebindTextures=Pe,this.setupRenderTarget=Qe,this.updateRenderTargetMipmap=rt,this.updateMultisampleRenderTarget=At,this.setupDepthRenderbuffer=qe,this.setupFrameBufferTexture=_e,this.useMultisampledRTT=ze}function sh(e,t){function n(i,a=Mn){let r;const o=_t.getTransfer(a);if(i===en)return e.UNSIGNED_BYTE;if(i===Qa)return e.UNSIGNED_SHORT_4_4_4_4;if(i===eo)return e.UNSIGNED_SHORT_5_5_5_1;if(i===vs)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===Ss)return e.BYTE;if(i===Es)return e.SHORT;if(i===hi)return e.UNSIGNED_SHORT;if(i===no)return e.INT;if(i===Gn)return e.UNSIGNED_INT;if(i===Jt)return e.FLOAT;if(i===vi)return e.HALF_FLOAT;if(i===xs)return e.ALPHA;if(i===Ts)return e.RGB;if(i===kt)return e.RGBA;if(i===Ms)return e.LUMINANCE;if(i===As)return e.LUMINANCE_ALPHA;if(i===er)return e.DEPTH_COMPONENT;if(i===ui)return e.DEPTH_STENCIL;if(i===bs)return e.RED;if(i===io)return e.RED_INTEGER;if(i===Rs)return e.RG;if(i===ro)return e.RG_INTEGER;if(i===ao)return e.RGBA_INTEGER;if(i===Ri||i===wi||i===yi||i===Ci)if(o===st)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Ri)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===wi)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===yi)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ci)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Ri)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===wi)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===yi)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ci)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===dr||i===hr||i===pr||i===_r)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===dr)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===hr)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===pr)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===_r)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===mr||i===gr||i===vr)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===mr||i===gr)return o===st?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===vr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Sr||i===Er||i===xr||i===Tr||i===Mr||i===Ar||i===br||i===Rr||i===wr||i===yr||i===Cr||i===Pr||i===Lr||i===Dr)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Sr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Er)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===xr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Tr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Mr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Ar)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===br)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Rr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===wr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===yr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Cr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Pr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Lr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Dr)return o===st?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Pi||i===Ur||i===Ir)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===Pi)return o===st?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Ur)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Ir)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ws||i===Nr||i===Fr||i===Or)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===Pi)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Nr)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Fr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Or)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Hn?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:n}}const lh=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ch=`
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

}`;class fh{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,n,i){if(this.texture===null){const a=new to,r=t.properties.get(a);r.__webglTexture=n.texture,(n.depthNear!==i.depthNear||n.depthFar!==i.depthFar)&&(this.depthNear=n.depthNear,this.depthFar=n.depthFar),this.texture=a}}getMesh(t){if(this.texture!==null&&this.mesh===null){const n=t.cameras[0].viewport,i=new tn({vertexShader:lh,fragmentShader:ch,uniforms:{depthColor:{value:this.texture},depthWidth:{value:n.z},depthHeight:{value:n.w}}});this.mesh=new $t(new tr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class uh extends Oo{constructor(t,n){super();const i=this;let a=null,r=1,o=null,s="local-floor",f=1,d=null,m=null,c=null,h=null,p=null,T=null;const S=new fh,u=n.getContextAttributes();let l=null,M=null;const b=[],x=[],L=new ht;let C=null;const y=new ai;y.viewport=new Lt;const U=new ai;U.viewport=new Lt;const v=[y,U],_=new Bo;let w=null,P=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let ee=b[$];return ee===void 0&&(ee=new Ai,b[$]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function($){let ee=b[$];return ee===void 0&&(ee=new Ai,b[$]=ee),ee.getGripSpace()},this.getHand=function($){let ee=b[$];return ee===void 0&&(ee=new Ai,b[$]=ee),ee.getHandSpace()};function N($){const ee=x.indexOf($.inputSource);if(ee===-1)return;const _e=b[ee];_e!==void 0&&(_e.update($.inputSource,$.frame,d||o),_e.dispatchEvent({type:$.type,data:$.inputSource}))}function G(){a.removeEventListener("select",N),a.removeEventListener("selectstart",N),a.removeEventListener("selectend",N),a.removeEventListener("squeeze",N),a.removeEventListener("squeezestart",N),a.removeEventListener("squeezeend",N),a.removeEventListener("end",G),a.removeEventListener("inputsourceschange",q);for(let $=0;$<b.length;$++){const ee=x[$];ee!==null&&(x[$]=null,b[$].disconnect(ee))}w=null,P=null,S.reset(),t.setRenderTarget(l),p=null,h=null,c=null,a=null,M=null,Oe.stop(),i.isPresenting=!1,t.setPixelRatio(C),t.setSize(L.width,L.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){s=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return d||o},this.setReferenceSpace=function($){d=$},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return c},this.getFrame=function(){return T},this.getSession=function(){return a},this.setSession=async function($){if(a=$,a!==null){if(l=t.getRenderTarget(),a.addEventListener("select",N),a.addEventListener("selectstart",N),a.addEventListener("selectend",N),a.addEventListener("squeeze",N),a.addEventListener("squeezestart",N),a.addEventListener("squeezeend",N),a.addEventListener("end",G),a.addEventListener("inputsourceschange",q),u.xrCompatible!==!0&&await n.makeXRCompatible(),C=t.getPixelRatio(),t.getSize(L),typeof XRWebGLBinding<"u"&&"createProjectionLayer"in XRWebGLBinding.prototype){let _e=null,le=null,be=null;u.depth&&(be=u.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,_e=u.stencil?ui:er,le=u.stencil?Hn:Gn);const qe={colorFormat:n.RGBA8,depthFormat:be,scaleFactor:r};c=new XRWebGLBinding(a,n),h=c.createProjectionLayer(qe),a.updateRenderState({layers:[h]}),t.setPixelRatio(1),t.setSize(h.textureWidth,h.textureHeight,!1),M=new Ft(h.textureWidth,h.textureHeight,{format:kt,type:en,depthTexture:new $a(h.textureWidth,h.textureHeight,le,void 0,void 0,void 0,void 0,void 0,void 0,_e),stencilBuffer:u.stencil,colorSpace:t.outputColorSpace,samples:u.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const _e={antialias:u.antialias,alpha:!0,depth:u.depth,stencil:u.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(a,n,_e),a.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),M=new Ft(p.framebufferWidth,p.framebufferHeight,{format:kt,type:en,colorSpace:t.outputColorSpace,stencilBuffer:u.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(f),d=null,o=await a.requestReferenceSpace(s),Oe.setContext(a),Oe.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return S.getDepthTexture()};function q($){for(let ee=0;ee<$.removed.length;ee++){const _e=$.removed[ee],le=x.indexOf(_e);le>=0&&(x[le]=null,b[le].disconnect(_e))}for(let ee=0;ee<$.added.length;ee++){const _e=$.added[ee];let le=x.indexOf(_e);if(le===-1){for(let qe=0;qe<b.length;qe++)if(qe>=x.length){x.push(_e),le=qe;break}else if(x[qe]===null){x[qe]=_e,le=qe;break}if(le===-1)break}const be=b[le];be&&be.connect(_e)}}const B=new Ie,Z=new Ie;function W($,ee,_e){B.setFromMatrixPosition(ee.matrixWorld),Z.setFromMatrixPosition(_e.matrixWorld);const le=B.distanceTo(Z),be=ee.projectionMatrix.elements,qe=_e.projectionMatrix.elements,Pe=be[14]/(be[10]-1),Qe=be[14]/(be[10]+1),rt=(be[9]+1)/be[5],Ve=(be[9]-1)/be[5],D=(be[8]-1)/be[0],At=(qe[8]+1)/qe[0],Xe=Pe*D,ze=Pe*At,Ae=le/(-D+At),et=Ae*-D;if(ee.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(et),$.translateZ(Ae),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),be[10]===-1)$.projectionMatrix.copy(ee.projectionMatrix),$.projectionMatrixInverse.copy(ee.projectionMatrixInverse);else{const Te=Pe+Ae,R=Qe+Ae,g=Xe-et,k=ze+(le-et),J=rt*Qe/R*Te,ne=Ve*Qe/R*Te;$.projectionMatrix.makePerspective(g,k,J,ne,Te,R),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function ae($,ee){ee===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(ee.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(a===null)return;let ee=$.near,_e=$.far;S.texture!==null&&(S.depthNear>0&&(ee=S.depthNear),S.depthFar>0&&(_e=S.depthFar)),_.near=U.near=y.near=ee,_.far=U.far=y.far=_e,(w!==_.near||P!==_.far)&&(a.updateRenderState({depthNear:_.near,depthFar:_.far}),w=_.near,P=_.far),y.layers.mask=$.layers.mask|2,U.layers.mask=$.layers.mask|4,_.layers.mask=y.layers.mask|U.layers.mask;const le=$.parent,be=_.cameras;ae(_,le);for(let qe=0;qe<be.length;qe++)ae(be[qe],le);be.length===2?W(_,y,U):_.projectionMatrix.copy(y.projectionMatrix),ge($,_,le)};function ge($,ee,_e){_e===null?$.matrix.copy(ee.matrixWorld):($.matrix.copy(_e.matrixWorld),$.matrix.invert(),$.matrix.multiply(ee.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(ee.projectionMatrix),$.projectionMatrixInverse.copy(ee.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=Ho*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return _},this.getFoveation=function(){if(!(h===null&&p===null))return f},this.setFoveation=function($){f=$,h!==null&&(h.fixedFoveation=$),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=$)},this.hasDepthSensing=function(){return S.texture!==null},this.getDepthSensingMesh=function(){return S.getMesh(_)};let Le=null;function He($,ee){if(m=ee.getViewerPose(d||o),T=ee,m!==null){const _e=m.views;p!==null&&(t.setRenderTargetFramebuffer(M,p.framebuffer),t.setRenderTarget(M));let le=!1;_e.length!==_.cameras.length&&(_.cameras.length=0,le=!0);for(let Pe=0;Pe<_e.length;Pe++){const Qe=_e[Pe];let rt=null;if(p!==null)rt=p.getViewport(Qe);else{const D=c.getViewSubImage(h,Qe);rt=D.viewport,Pe===0&&(t.setRenderTargetTextures(M,D.colorTexture,D.depthStencilTexture),t.setRenderTarget(M))}let Ve=v[Pe];Ve===void 0&&(Ve=new ai,Ve.layers.enable(Pe),Ve.viewport=new Lt,v[Pe]=Ve),Ve.matrix.fromArray(Qe.transform.matrix),Ve.matrix.decompose(Ve.position,Ve.quaternion,Ve.scale),Ve.projectionMatrix.fromArray(Qe.projectionMatrix),Ve.projectionMatrixInverse.copy(Ve.projectionMatrix).invert(),Ve.viewport.set(rt.x,rt.y,rt.width,rt.height),Pe===0&&(_.matrix.copy(Ve.matrix),_.matrix.decompose(_.position,_.quaternion,_.scale)),le===!0&&_.cameras.push(Ve)}const be=a.enabledFeatures;if(be&&be.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&c){const Pe=c.getDepthInformation(_e[0]);Pe&&Pe.isValid&&Pe.texture&&S.init(t,Pe,a.renderState)}}for(let _e=0;_e<b.length;_e++){const le=x[_e],be=b[_e];le!==null&&be!==void 0&&be.update(le,ee,d||o)}Le&&Le($,ee),ee.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ee}),T=null}const Oe=new ho;Oe.setAnimationLoop(He),this.setAnimationLoop=function($){Le=$},this.dispose=function(){}}}const an=new co,dh=new Rn;function hh(e,t){function n(u,l){u.matrixAutoUpdate===!0&&u.updateMatrix(),l.value.copy(u.matrix)}function i(u,l){l.color.getRGB(u.fogColor.value,so(e)),l.isFog?(u.fogNear.value=l.near,u.fogFar.value=l.far):l.isFogExp2&&(u.fogDensity.value=l.density)}function a(u,l,M,b,x){l.isMeshBasicMaterial||l.isMeshLambertMaterial?r(u,l):l.isMeshToonMaterial?(r(u,l),c(u,l)):l.isMeshPhongMaterial?(r(u,l),m(u,l)):l.isMeshStandardMaterial?(r(u,l),h(u,l),l.isMeshPhysicalMaterial&&p(u,l,x)):l.isMeshMatcapMaterial?(r(u,l),T(u,l)):l.isMeshDepthMaterial?r(u,l):l.isMeshDistanceMaterial?(r(u,l),S(u,l)):l.isMeshNormalMaterial?r(u,l):l.isLineBasicMaterial?(o(u,l),l.isLineDashedMaterial&&s(u,l)):l.isPointsMaterial?f(u,l,M,b):l.isSpriteMaterial?d(u,l):l.isShadowMaterial?(u.color.value.copy(l.color),u.opacity.value=l.opacity):l.isShaderMaterial&&(l.uniformsNeedUpdate=!1)}function r(u,l){u.opacity.value=l.opacity,l.color&&u.diffuse.value.copy(l.color),l.emissive&&u.emissive.value.copy(l.emissive).multiplyScalar(l.emissiveIntensity),l.map&&(u.map.value=l.map,n(l.map,u.mapTransform)),l.alphaMap&&(u.alphaMap.value=l.alphaMap,n(l.alphaMap,u.alphaMapTransform)),l.bumpMap&&(u.bumpMap.value=l.bumpMap,n(l.bumpMap,u.bumpMapTransform),u.bumpScale.value=l.bumpScale,l.side===Bt&&(u.bumpScale.value*=-1)),l.normalMap&&(u.normalMap.value=l.normalMap,n(l.normalMap,u.normalMapTransform),u.normalScale.value.copy(l.normalScale),l.side===Bt&&u.normalScale.value.negate()),l.displacementMap&&(u.displacementMap.value=l.displacementMap,n(l.displacementMap,u.displacementMapTransform),u.displacementScale.value=l.displacementScale,u.displacementBias.value=l.displacementBias),l.emissiveMap&&(u.emissiveMap.value=l.emissiveMap,n(l.emissiveMap,u.emissiveMapTransform)),l.specularMap&&(u.specularMap.value=l.specularMap,n(l.specularMap,u.specularMapTransform)),l.alphaTest>0&&(u.alphaTest.value=l.alphaTest);const M=t.get(l),b=M.envMap,x=M.envMapRotation;b&&(u.envMap.value=b,an.copy(x),an.x*=-1,an.y*=-1,an.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(an.y*=-1,an.z*=-1),u.envMapRotation.value.setFromMatrix4(dh.makeRotationFromEuler(an)),u.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,u.reflectivity.value=l.reflectivity,u.ior.value=l.ior,u.refractionRatio.value=l.refractionRatio),l.lightMap&&(u.lightMap.value=l.lightMap,u.lightMapIntensity.value=l.lightMapIntensity,n(l.lightMap,u.lightMapTransform)),l.aoMap&&(u.aoMap.value=l.aoMap,u.aoMapIntensity.value=l.aoMapIntensity,n(l.aoMap,u.aoMapTransform))}function o(u,l){u.diffuse.value.copy(l.color),u.opacity.value=l.opacity,l.map&&(u.map.value=l.map,n(l.map,u.mapTransform))}function s(u,l){u.dashSize.value=l.dashSize,u.totalSize.value=l.dashSize+l.gapSize,u.scale.value=l.scale}function f(u,l,M,b){u.diffuse.value.copy(l.color),u.opacity.value=l.opacity,u.size.value=l.size*M,u.scale.value=b*.5,l.map&&(u.map.value=l.map,n(l.map,u.uvTransform)),l.alphaMap&&(u.alphaMap.value=l.alphaMap,n(l.alphaMap,u.alphaMapTransform)),l.alphaTest>0&&(u.alphaTest.value=l.alphaTest)}function d(u,l){u.diffuse.value.copy(l.color),u.opacity.value=l.opacity,u.rotation.value=l.rotation,l.map&&(u.map.value=l.map,n(l.map,u.mapTransform)),l.alphaMap&&(u.alphaMap.value=l.alphaMap,n(l.alphaMap,u.alphaMapTransform)),l.alphaTest>0&&(u.alphaTest.value=l.alphaTest)}function m(u,l){u.specular.value.copy(l.specular),u.shininess.value=Math.max(l.shininess,1e-4)}function c(u,l){l.gradientMap&&(u.gradientMap.value=l.gradientMap)}function h(u,l){u.metalness.value=l.metalness,l.metalnessMap&&(u.metalnessMap.value=l.metalnessMap,n(l.metalnessMap,u.metalnessMapTransform)),u.roughness.value=l.roughness,l.roughnessMap&&(u.roughnessMap.value=l.roughnessMap,n(l.roughnessMap,u.roughnessMapTransform)),l.envMap&&(u.envMapIntensity.value=l.envMapIntensity)}function p(u,l,M){u.ior.value=l.ior,l.sheen>0&&(u.sheenColor.value.copy(l.sheenColor).multiplyScalar(l.sheen),u.sheenRoughness.value=l.sheenRoughness,l.sheenColorMap&&(u.sheenColorMap.value=l.sheenColorMap,n(l.sheenColorMap,u.sheenColorMapTransform)),l.sheenRoughnessMap&&(u.sheenRoughnessMap.value=l.sheenRoughnessMap,n(l.sheenRoughnessMap,u.sheenRoughnessMapTransform))),l.clearcoat>0&&(u.clearcoat.value=l.clearcoat,u.clearcoatRoughness.value=l.clearcoatRoughness,l.clearcoatMap&&(u.clearcoatMap.value=l.clearcoatMap,n(l.clearcoatMap,u.clearcoatMapTransform)),l.clearcoatRoughnessMap&&(u.clearcoatRoughnessMap.value=l.clearcoatRoughnessMap,n(l.clearcoatRoughnessMap,u.clearcoatRoughnessMapTransform)),l.clearcoatNormalMap&&(u.clearcoatNormalMap.value=l.clearcoatNormalMap,n(l.clearcoatNormalMap,u.clearcoatNormalMapTransform),u.clearcoatNormalScale.value.copy(l.clearcoatNormalScale),l.side===Bt&&u.clearcoatNormalScale.value.negate())),l.dispersion>0&&(u.dispersion.value=l.dispersion),l.iridescence>0&&(u.iridescence.value=l.iridescence,u.iridescenceIOR.value=l.iridescenceIOR,u.iridescenceThicknessMinimum.value=l.iridescenceThicknessRange[0],u.iridescenceThicknessMaximum.value=l.iridescenceThicknessRange[1],l.iridescenceMap&&(u.iridescenceMap.value=l.iridescenceMap,n(l.iridescenceMap,u.iridescenceMapTransform)),l.iridescenceThicknessMap&&(u.iridescenceThicknessMap.value=l.iridescenceThicknessMap,n(l.iridescenceThicknessMap,u.iridescenceThicknessMapTransform))),l.transmission>0&&(u.transmission.value=l.transmission,u.transmissionSamplerMap.value=M.texture,u.transmissionSamplerSize.value.set(M.width,M.height),l.transmissionMap&&(u.transmissionMap.value=l.transmissionMap,n(l.transmissionMap,u.transmissionMapTransform)),u.thickness.value=l.thickness,l.thicknessMap&&(u.thicknessMap.value=l.thicknessMap,n(l.thicknessMap,u.thicknessMapTransform)),u.attenuationDistance.value=l.attenuationDistance,u.attenuationColor.value.copy(l.attenuationColor)),l.anisotropy>0&&(u.anisotropyVector.value.set(l.anisotropy*Math.cos(l.anisotropyRotation),l.anisotropy*Math.sin(l.anisotropyRotation)),l.anisotropyMap&&(u.anisotropyMap.value=l.anisotropyMap,n(l.anisotropyMap,u.anisotropyMapTransform))),u.specularIntensity.value=l.specularIntensity,u.specularColor.value.copy(l.specularColor),l.specularColorMap&&(u.specularColorMap.value=l.specularColorMap,n(l.specularColorMap,u.specularColorMapTransform)),l.specularIntensityMap&&(u.specularIntensityMap.value=l.specularIntensityMap,n(l.specularIntensityMap,u.specularIntensityMapTransform))}function T(u,l){l.matcap&&(u.matcap.value=l.matcap)}function S(u,l){const M=t.get(l).light;u.referencePosition.value.setFromMatrixPosition(M.matrixWorld),u.nearDistance.value=M.shadow.camera.near,u.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:a}}function ph(e,t,n,i){let a={},r={},o=[];const s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function f(M,b){const x=b.program;i.uniformBlockBinding(M,x)}function d(M,b){let x=a[M.id];x===void 0&&(T(M),x=m(M),a[M.id]=x,M.addEventListener("dispose",u));const L=b.program;i.updateUBOMapping(M,L);const C=t.render.frame;r[M.id]!==C&&(h(M),r[M.id]=C)}function m(M){const b=c();M.__bindingPointIndex=b;const x=e.createBuffer(),L=M.__size,C=M.usage;return e.bindBuffer(e.UNIFORM_BUFFER,x),e.bufferData(e.UNIFORM_BUFFER,L,C),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,b,x),x}function c(){for(let M=0;M<s;M++)if(o.indexOf(M)===-1)return o.push(M),M;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(M){const b=a[M.id],x=M.uniforms,L=M.__cache;e.bindBuffer(e.UNIFORM_BUFFER,b);for(let C=0,y=x.length;C<y;C++){const U=Array.isArray(x[C])?x[C]:[x[C]];for(let v=0,_=U.length;v<_;v++){const w=U[v];if(p(w,C,v,L)===!0){const P=w.__offset,N=Array.isArray(w.value)?w.value:[w.value];let G=0;for(let q=0;q<N.length;q++){const B=N[q],Z=S(B);typeof B=="number"||typeof B=="boolean"?(w.__data[0]=B,e.bufferSubData(e.UNIFORM_BUFFER,P+G,w.__data)):B.isMatrix3?(w.__data[0]=B.elements[0],w.__data[1]=B.elements[1],w.__data[2]=B.elements[2],w.__data[3]=0,w.__data[4]=B.elements[3],w.__data[5]=B.elements[4],w.__data[6]=B.elements[5],w.__data[7]=0,w.__data[8]=B.elements[6],w.__data[9]=B.elements[7],w.__data[10]=B.elements[8],w.__data[11]=0):(B.toArray(w.__data,G),G+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,P,w.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(M,b,x,L){const C=M.value,y=b+"_"+x;if(L[y]===void 0)return typeof C=="number"||typeof C=="boolean"?L[y]=C:L[y]=C.clone(),!0;{const U=L[y];if(typeof C=="number"||typeof C=="boolean"){if(U!==C)return L[y]=C,!0}else if(U.equals(C)===!1)return U.copy(C),!0}return!1}function T(M){const b=M.uniforms;let x=0;const L=16;for(let y=0,U=b.length;y<U;y++){const v=Array.isArray(b[y])?b[y]:[b[y]];for(let _=0,w=v.length;_<w;_++){const P=v[_],N=Array.isArray(P.value)?P.value:[P.value];for(let G=0,q=N.length;G<q;G++){const B=N[G],Z=S(B),W=x%L,ae=W%Z.boundary,ge=W+ae;x+=ae,ge!==0&&L-ge<Z.storage&&(x+=L-ge),P.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),P.__offset=x,x+=Z.storage}}}const C=x%L;return C>0&&(x+=L-C),M.__size=x,M.__cache={},this}function S(M){const b={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(b.boundary=4,b.storage=4):M.isVector2?(b.boundary=8,b.storage=8):M.isVector3||M.isColor?(b.boundary=16,b.storage=12):M.isVector4?(b.boundary=16,b.storage=16):M.isMatrix3?(b.boundary=48,b.storage=48):M.isMatrix4?(b.boundary=64,b.storage=64):M.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",M),b}function u(M){const b=M.target;b.removeEventListener("dispose",u);const x=o.indexOf(b.__bindingPointIndex);o.splice(x,1),e.deleteBuffer(a[b.id]),delete a[b.id],delete r[b.id]}function l(){for(const M in a)e.deleteBuffer(a[M]);o=[],a={},r={}}return{bind:f,update:d,dispose:l}}class _h{constructor(t={}){const{canvas:n=Po(),context:i=null,depth:a=!0,stencil:r=!1,alpha:o=!1,antialias:s=!1,premultipliedAlpha:f=!0,preserveDrawingBuffer:d=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:c=!1,reverseDepthBuffer:h=!1}=t;this.isWebGLRenderer=!0;let p;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=i.getContextAttributes().alpha}else p=o;const T=new Uint32Array(4),S=new Int32Array(4);let u=null,l=null;const M=[],b=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Qt,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const x=this;let L=!1;this._outputColorSpace=Lo;let C=0,y=0,U=null,v=-1,_=null;const w=new Lt,P=new Lt;let N=null;const G=new lt(0);let q=0,B=n.width,Z=n.height,W=1,ae=null,ge=null;const Le=new Lt(0,0,B,Z),He=new Lt(0,0,B,Z);let Oe=!1;const $=new Ka;let ee=!1,_e=!1;const le=new Rn,be=new Rn,qe=new Ie,Pe=new Lt,Qe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let rt=!1;function Ve(){return U===null?W:1}let D=i;function At(E,F){return n.getContext(E,F)}try{const E={alpha:!0,depth:a,stencil:r,antialias:s,premultipliedAlpha:f,preserveDrawingBuffer:d,powerPreference:m,failIfMajorPerformanceCaveat:c};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${Do}`),n.addEventListener("webglcontextlost",Q,!1),n.addEventListener("webglcontextrestored",de,!1),n.addEventListener("webglcontextcreationerror",ue,!1),D===null){const F="webgl2";if(D=At(F,E),D===null)throw At(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let Xe,ze,Ae,et,Te,R,g,k,J,ne,j,Me,ce,me,Ge,re,ve,ye,Re,Se,We,Fe,tt,I;function fe(){Xe=new bu(D),Xe.init(),Fe=new sh(D,Xe),ze=new vu(D,Xe,t,Fe),Ae=new ah(D,Xe),ze.reverseDepthBuffer&&h&&Ae.buffers.depth.setReversed(!0),et=new yu(D),Te=new qd,R=new oh(D,Xe,Ae,Te,ze,Fe,et),g=new Eu(x),k=new Au(x),J=new Ul(D),tt=new mu(D,J),ne=new Ru(D,J,et,tt),j=new Pu(D,ne,J,et),Re=new Cu(D,ze,R),re=new Su(Te),Me=new Xd(x,g,k,Xe,ze,tt,re),ce=new hh(x,Te),me=new Kd,Ge=new eh(Xe),ye=new _u(x,g,k,Ae,j,p,f),ve=new ih(x,j,ze),I=new ph(D,et,ze,Ae),Se=new gu(D,Xe,et),We=new wu(D,Xe,et),et.programs=Me.programs,x.capabilities=ze,x.extensions=Xe,x.properties=Te,x.renderLists=me,x.shadowMap=ve,x.state=Ae,x.info=et}fe();const X=new uh(x,D);this.xr=X,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const E=Xe.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Xe.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return W},this.setPixelRatio=function(E){E!==void 0&&(W=E,this.setSize(B,Z,!1))},this.getSize=function(E){return E.set(B,Z)},this.setSize=function(E,F,V=!0){if(X.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=E,Z=F,n.width=Math.floor(E*W),n.height=Math.floor(F*W),V===!0&&(n.style.width=E+"px",n.style.height=F+"px"),this.setViewport(0,0,E,F)},this.getDrawingBufferSize=function(E){return E.set(B*W,Z*W).floor()},this.setDrawingBufferSize=function(E,F,V){B=E,Z=F,W=V,n.width=Math.floor(E*V),n.height=Math.floor(F*V),this.setViewport(0,0,E,F)},this.getCurrentViewport=function(E){return E.copy(w)},this.getViewport=function(E){return E.copy(Le)},this.setViewport=function(E,F,V,z){E.isVector4?Le.set(E.x,E.y,E.z,E.w):Le.set(E,F,V,z),Ae.viewport(w.copy(Le).multiplyScalar(W).round())},this.getScissor=function(E){return E.copy(He)},this.setScissor=function(E,F,V,z){E.isVector4?He.set(E.x,E.y,E.z,E.w):He.set(E,F,V,z),Ae.scissor(P.copy(He).multiplyScalar(W).round())},this.getScissorTest=function(){return Oe},this.setScissorTest=function(E){Ae.setScissorTest(Oe=E)},this.setOpaqueSort=function(E){ae=E},this.setTransparentSort=function(E){ge=E},this.getClearColor=function(E){return E.copy(ye.getClearColor())},this.setClearColor=function(){ye.setClearColor(...arguments)},this.getClearAlpha=function(){return ye.getClearAlpha()},this.setClearAlpha=function(){ye.setClearAlpha(...arguments)},this.clear=function(E=!0,F=!0,V=!0){let z=0;if(E){let O=!1;if(U!==null){const ie=U.texture.format;O=ie===ao||ie===ro||ie===io}if(O){const ie=U.texture.type,he=ie===en||ie===Gn||ie===hi||ie===Hn||ie===Qa||ie===eo,Ee=ye.getClearColor(),xe=ye.getClearAlpha(),Ue=Ee.r,De=Ee.g,we=Ee.b;he?(T[0]=Ue,T[1]=De,T[2]=we,T[3]=xe,D.clearBufferuiv(D.COLOR,0,T)):(S[0]=Ue,S[1]=De,S[2]=we,S[3]=xe,D.clearBufferiv(D.COLOR,0,S))}else z|=D.COLOR_BUFFER_BIT}F&&(z|=D.DEPTH_BUFFER_BIT),V&&(z|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",Q,!1),n.removeEventListener("webglcontextrestored",de,!1),n.removeEventListener("webglcontextcreationerror",ue,!1),ye.dispose(),me.dispose(),Ge.dispose(),Te.dispose(),g.dispose(),k.dispose(),j.dispose(),tt.dispose(),I.dispose(),Me.dispose(),X.dispose(),X.removeEventListener("sessionstart",te),X.removeEventListener("sessionend",Y),K.stop()};function Q(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),L=!0}function de(){console.log("THREE.WebGLRenderer: Context Restored."),L=!1;const E=et.autoReset,F=ve.enabled,V=ve.autoUpdate,z=ve.needsUpdate,O=ve.type;fe(),et.autoReset=E,ve.enabled=F,ve.autoUpdate=V,ve.needsUpdate=z,ve.type=O}function ue(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function Ne(E){const F=E.target;F.removeEventListener("dispose",Ne),at(F)}function at(E){vt(E),Te.remove(E)}function vt(E){const F=Te.get(E).programs;F!==void 0&&(F.forEach(function(V){Me.releaseProgram(V)}),E.isShaderMaterial&&Me.releaseShaderCache(E))}this.renderBufferDirect=function(E,F,V,z,O,ie){F===null&&(F=Qe);const he=O.isMesh&&O.matrixWorld.determinant()<0,Ee=Ht(E,F,V,z,O);Ae.setMaterial(z,he);let xe=V.index,Ue=1;if(z.wireframe===!0){if(xe=ne.getWireframeAttribute(V),xe===void 0)return;Ue=2}const De=V.drawRange,we=V.attributes.position;let Ke=De.start*Ue,Ze=(De.start+De.count)*Ue;ie!==null&&(Ke=Math.max(Ke,ie.start*Ue),Ze=Math.min(Ze,(ie.start+ie.count)*Ue)),xe!==null?(Ke=Math.max(Ke,0),Ze=Math.min(Ze,xe.count)):we!=null&&(Ke=Math.max(Ke,0),Ze=Math.min(Ze,we.count));const pt=Ze-Ke;if(pt<0||pt===1/0)return;tt.setup(O,z,Ee,V,xe);let ut,je=Se;if(xe!==null&&(ut=J.get(xe),je=We,je.setIndex(ut)),O.isMesh)z.wireframe===!0?(Ae.setLineWidth(z.wireframeLinewidth*Ve()),je.setMode(D.LINES)):je.setMode(D.TRIANGLES);else if(O.isLine){let Ce=z.linewidth;Ce===void 0&&(Ce=1),Ae.setLineWidth(Ce*Ve()),O.isLineSegments?je.setMode(D.LINES):O.isLineLoop?je.setMode(D.LINE_LOOP):je.setMode(D.LINE_STRIP)}else O.isPoints?je.setMode(D.POINTS):O.isSprite&&je.setMode(D.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)ri("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),je.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(Xe.get("WEBGL_multi_draw"))je.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{const Ce=O._multiDrawStarts,Et=O._multiDrawCounts,Je=O._multiDrawCount,Gt=xe?J.get(xe).bytesPerElement:1,hn=Te.get(z).currentProgram.getUniforms();for(let Dt=0;Dt<Je;Dt++)hn.setValue(D,"_gl_DrawID",Dt),je.render(Ce[Dt]/Gt,Et[Dt])}else if(O.isInstancedMesh)je.renderInstances(Ke,pt,O.count);else if(V.isInstancedBufferGeometry){const Ce=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,Et=Math.min(V.instanceCount,Ce);je.renderInstances(Ke,pt,Et)}else je.render(Ke,pt)};function Ye(E,F,V){E.transparent===!0&&E.side===Kt&&E.forceSinglePass===!1?(E.side=Bt,E.needsUpdate=!0,ot(E,F,V),E.side=Bn,E.needsUpdate=!0,ot(E,F,V),E.side=Kt):ot(E,F,V)}this.compile=function(E,F,V=null){V===null&&(V=E),l=Ge.get(V),l.init(F),b.push(l),V.traverseVisible(function(O){O.isLight&&O.layers.test(F.layers)&&(l.pushLight(O),O.castShadow&&l.pushShadow(O))}),E!==V&&E.traverseVisible(function(O){O.isLight&&O.layers.test(F.layers)&&(l.pushLight(O),O.castShadow&&l.pushShadow(O))}),l.setupLights();const z=new Set;return E.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;const ie=O.material;if(ie)if(Array.isArray(ie))for(let he=0;he<ie.length;he++){const Ee=ie[he];Ye(Ee,V,O),z.add(Ee)}else Ye(ie,V,O),z.add(ie)}),l=b.pop(),z},this.compileAsync=function(E,F,V=null){const z=this.compile(E,F,V);return new Promise(O=>{function ie(){if(z.forEach(function(he){Te.get(he).currentProgram.isReady()&&z.delete(he)}),z.size===0){O(E);return}setTimeout(ie,10)}Xe.get("KHR_parallel_shader_compile")!==null?ie():setTimeout(ie,10)})};let A=null;function H(E){A&&A(E)}function te(){K.stop()}function Y(){K.start()}const K=new ho;K.setAnimationLoop(H),typeof self<"u"&&K.setContext(self),this.setAnimationLoop=function(E){A=E,X.setAnimationLoop(E),E===null?K.stop():K.start()},X.addEventListener("sessionstart",te),X.addEventListener("sessionend",Y),this.render=function(E,F){if(F!==void 0&&F.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),X.enabled===!0&&X.isPresenting===!0&&(X.cameraAutoUpdate===!0&&X.updateCamera(F),F=X.getCamera()),E.isScene===!0&&E.onBeforeRender(x,E,F,U),l=Ge.get(E,b.length),l.init(F),b.push(l),be.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),$.setFromProjectionMatrix(be),_e=this.localClippingEnabled,ee=re.init(this.clippingPlanes,_e),u=me.get(E,M.length),u.init(),M.push(u),X.enabled===!0&&X.isPresenting===!0){const ie=x.xr.getDepthSensingMesh();ie!==null&&pe(ie,F,-1/0,x.sortObjects)}pe(E,F,0,x.sortObjects),u.finish(),x.sortObjects===!0&&u.sort(ae,ge),rt=X.enabled===!1||X.isPresenting===!1||X.hasDepthSensing()===!1,rt&&ye.addToRenderList(u,E),this.info.render.frame++,ee===!0&&re.beginShadows();const V=l.state.shadowsArray;ve.render(V,E,F),ee===!0&&re.endShadows(),this.info.autoReset===!0&&this.info.reset();const z=u.opaque,O=u.transmissive;if(l.setupLights(),F.isArrayCamera){const ie=F.cameras;if(O.length>0)for(let he=0,Ee=ie.length;he<Ee;he++){const xe=ie[he];ke(z,O,E,xe)}rt&&ye.render(E);for(let he=0,Ee=ie.length;he<Ee;he++){const xe=ie[he];oe(u,E,xe,xe.viewport)}}else O.length>0&&ke(z,O,E,F),rt&&ye.render(E),oe(u,E,F);U!==null&&y===0&&(R.updateMultisampleRenderTarget(U),R.updateRenderTargetMipmap(U)),E.isScene===!0&&E.onAfterRender(x,E,F),tt.resetDefaultState(),v=-1,_=null,b.pop(),b.length>0?(l=b[b.length-1],ee===!0&&re.setGlobalState(x.clippingPlanes,l.state.camera)):l=null,M.pop(),M.length>0?u=M[M.length-1]:u=null};function pe(E,F,V,z){if(E.visible===!1)return;if(E.layers.test(F.layers)){if(E.isGroup)V=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(F);else if(E.isLight)l.pushLight(E),E.castShadow&&l.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||$.intersectsSprite(E)){z&&Pe.setFromMatrixPosition(E.matrixWorld).applyMatrix4(be);const he=j.update(E),Ee=E.material;Ee.visible&&u.push(E,he,Ee,V,Pe.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||$.intersectsObject(E))){const he=j.update(E),Ee=E.material;if(z&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Pe.copy(E.boundingSphere.center)):(he.boundingSphere===null&&he.computeBoundingSphere(),Pe.copy(he.boundingSphere.center)),Pe.applyMatrix4(E.matrixWorld).applyMatrix4(be)),Array.isArray(Ee)){const xe=he.groups;for(let Ue=0,De=xe.length;Ue<De;Ue++){const we=xe[Ue],Ke=Ee[we.materialIndex];Ke&&Ke.visible&&u.push(E,he,Ke,V,Pe.z,we)}}else Ee.visible&&u.push(E,he,Ee,V,Pe.z,null)}}const ie=E.children;for(let he=0,Ee=ie.length;he<Ee;he++)pe(ie[he],F,V,z)}function oe(E,F,V,z){const O=E.opaque,ie=E.transmissive,he=E.transparent;l.setupLightsView(V),ee===!0&&re.setGlobalState(x.clippingPlanes,V),z&&Ae.viewport(w.copy(z)),O.length>0&&nt(O,F,V),ie.length>0&&nt(ie,F,V),he.length>0&&nt(he,F,V),Ae.buffers.depth.setTest(!0),Ae.buffers.depth.setMask(!0),Ae.buffers.color.setMask(!0),Ae.setPolygonOffset(!1)}function ke(E,F,V,z){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;l.state.transmissionRenderTarget[z.id]===void 0&&(l.state.transmissionRenderTarget[z.id]=new Ft(1,1,{generateMipmaps:!0,type:Xe.has("EXT_color_buffer_half_float")||Xe.has("EXT_color_buffer_float")?vi:en,minFilter:Fn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:_t.workingColorSpace}));const ie=l.state.transmissionRenderTarget[z.id],he=z.viewport||w;ie.setSize(he.z*x.transmissionResolutionScale,he.w*x.transmissionResolutionScale);const Ee=x.getRenderTarget();x.setRenderTarget(ie),x.getClearColor(G),q=x.getClearAlpha(),q<1&&x.setClearColor(16777215,.5),x.clear(),rt&&ye.render(V);const xe=x.toneMapping;x.toneMapping=Qt;const Ue=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),l.setupLightsView(z),ee===!0&&re.setGlobalState(x.clippingPlanes,z),nt(E,V,z),R.updateMultisampleRenderTarget(ie),R.updateRenderTargetMipmap(ie),Xe.has("WEBGL_multisampled_render_to_texture")===!1){let De=!1;for(let we=0,Ke=F.length;we<Ke;we++){const Ze=F[we],pt=Ze.object,ut=Ze.geometry,je=Ze.material,Ce=Ze.group;if(je.side===Kt&&pt.layers.test(z.layers)){const Et=je.side;je.side=Bt,je.needsUpdate=!0,it(pt,V,z,ut,je,Ce),je.side=Et,je.needsUpdate=!0,De=!0}}De===!0&&(R.updateMultisampleRenderTarget(ie),R.updateRenderTargetMipmap(ie))}x.setRenderTarget(Ee),x.setClearColor(G,q),Ue!==void 0&&(z.viewport=Ue),x.toneMapping=xe}function nt(E,F,V){const z=F.isScene===!0?F.overrideMaterial:null;for(let O=0,ie=E.length;O<ie;O++){const he=E[O],Ee=he.object,xe=he.geometry,Ue=he.group;let De=he.material;De.allowOverride===!0&&z!==null&&(De=z),Ee.layers.test(V.layers)&&it(Ee,F,V,xe,De,Ue)}}function it(E,F,V,z,O,ie){E.onBeforeRender(x,F,V,z,O,ie),E.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),O.onBeforeRender(x,F,V,z,E,ie),O.transparent===!0&&O.side===Kt&&O.forceSinglePass===!1?(O.side=Bt,O.needsUpdate=!0,x.renderBufferDirect(V,F,z,O,E,ie),O.side=Bn,O.needsUpdate=!0,x.renderBufferDirect(V,F,z,O,E,ie),O.side=Kt):x.renderBufferDirect(V,F,z,O,E,ie),E.onAfterRender(x,F,V,z,O,ie)}function ot(E,F,V){F.isScene!==!0&&(F=Qe);const z=Te.get(E),O=l.state.lights,ie=l.state.shadowsArray,he=O.state.version,Ee=Me.getParameters(E,O.state,ie,F,V),xe=Me.getProgramCacheKey(Ee);let Ue=z.programs;z.environment=E.isMeshStandardMaterial?F.environment:null,z.fog=F.fog,z.envMap=(E.isMeshStandardMaterial?k:g).get(E.envMap||z.environment),z.envMapRotation=z.environment!==null&&E.envMap===null?F.environmentRotation:E.envMapRotation,Ue===void 0&&(E.addEventListener("dispose",Ne),Ue=new Map,z.programs=Ue);let De=Ue.get(xe);if(De!==void 0){if(z.currentProgram===De&&z.lightsStateVersion===he)return xt(E,Ee),De}else Ee.uniforms=Me.getUniforms(E),E.onBeforeCompile(Ee,x),De=Me.acquireProgram(Ee,xe),Ue.set(xe,De),z.uniforms=Ee.uniforms;const we=z.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(we.clippingPlanes=re.uniform),xt(E,Ee),z.needsLights=qn(E),z.lightsStateVersion=he,z.needsLights&&(we.ambientLightColor.value=O.state.ambient,we.lightProbe.value=O.state.probe,we.directionalLights.value=O.state.directional,we.directionalLightShadows.value=O.state.directionalShadow,we.spotLights.value=O.state.spot,we.spotLightShadows.value=O.state.spotShadow,we.rectAreaLights.value=O.state.rectArea,we.ltc_1.value=O.state.rectAreaLTC1,we.ltc_2.value=O.state.rectAreaLTC2,we.pointLights.value=O.state.point,we.pointLightShadows.value=O.state.pointShadow,we.hemisphereLights.value=O.state.hemi,we.directionalShadowMap.value=O.state.directionalShadowMap,we.directionalShadowMatrix.value=O.state.directionalShadowMatrix,we.spotShadowMap.value=O.state.spotShadowMap,we.spotLightMatrix.value=O.state.spotLightMatrix,we.spotLightMap.value=O.state.spotLightMap,we.pointShadowMap.value=O.state.pointShadowMap,we.pointShadowMatrix.value=O.state.pointShadowMatrix),z.currentProgram=De,z.uniformsList=null,De}function St(E){if(E.uniformsList===null){const F=E.currentProgram.getUniforms();E.uniformsList=li.seqWithValue(F.seq,E.uniforms)}return E.uniformsList}function xt(E,F){const V=Te.get(E);V.outputColorSpace=F.outputColorSpace,V.batching=F.batching,V.batchingColor=F.batchingColor,V.instancing=F.instancing,V.instancingColor=F.instancingColor,V.instancingMorph=F.instancingMorph,V.skinning=F.skinning,V.morphTargets=F.morphTargets,V.morphNormals=F.morphNormals,V.morphColors=F.morphColors,V.morphTargetsCount=F.morphTargetsCount,V.numClippingPlanes=F.numClippingPlanes,V.numIntersection=F.numClipIntersection,V.vertexAlphas=F.vertexAlphas,V.vertexTangents=F.vertexTangents,V.toneMapping=F.toneMapping}function Ht(E,F,V,z,O){F.isScene!==!0&&(F=Qe),R.resetTextureUnits();const ie=F.fog,he=z.isMeshStandardMaterial?F.environment:null,Ee=U===null?x.outputColorSpace:U.isXRRenderTarget===!0?U.texture.colorSpace:Si,xe=(z.isMeshStandardMaterial?k:g).get(z.envMap||he),Ue=z.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,De=!!V.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),we=!!V.morphAttributes.position,Ke=!!V.morphAttributes.normal,Ze=!!V.morphAttributes.color;let pt=Qt;z.toneMapped&&(U===null||U.isXRRenderTarget===!0)&&(pt=x.toneMapping);const ut=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,je=ut!==void 0?ut.length:0,Ce=Te.get(z),Et=l.state.lights;if(ee===!0&&(_e===!0||E!==_)){const bt=E===_&&z.id===v;re.setState(z,E,bt)}let Je=!1;z.version===Ce.__version?(Ce.needsLights&&Ce.lightsStateVersion!==Et.state.version||Ce.outputColorSpace!==Ee||O.isBatchedMesh&&Ce.batching===!1||!O.isBatchedMesh&&Ce.batching===!0||O.isBatchedMesh&&Ce.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Ce.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Ce.instancing===!1||!O.isInstancedMesh&&Ce.instancing===!0||O.isSkinnedMesh&&Ce.skinning===!1||!O.isSkinnedMesh&&Ce.skinning===!0||O.isInstancedMesh&&Ce.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Ce.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Ce.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Ce.instancingMorph===!1&&O.morphTexture!==null||Ce.envMap!==xe||z.fog===!0&&Ce.fog!==ie||Ce.numClippingPlanes!==void 0&&(Ce.numClippingPlanes!==re.numPlanes||Ce.numIntersection!==re.numIntersection)||Ce.vertexAlphas!==Ue||Ce.vertexTangents!==De||Ce.morphTargets!==we||Ce.morphNormals!==Ke||Ce.morphColors!==Ze||Ce.toneMapping!==pt||Ce.morphTargetsCount!==je)&&(Je=!0):(Je=!0,Ce.__version=z.version);let Gt=Ce.currentProgram;Je===!0&&(Gt=ot(z,F,O));let hn=!1,Dt=!1,Ln=!1;const ct=Gt.getUniforms(),It=Ce.uniforms;if(Ae.useProgram(Gt.program)&&(hn=!0,Dt=!0,Ln=!0),z.id!==v&&(v=z.id,Dt=!0),hn||_!==E){Ae.buffers.depth.getReversed()?(le.copy(E.projectionMatrix),Uo(le),Io(le),ct.setValue(D,"projectionMatrix",le)):ct.setValue(D,"projectionMatrix",E.projectionMatrix),ct.setValue(D,"viewMatrix",E.matrixWorldInverse);const Ct=ct.map.cameraPosition;Ct!==void 0&&Ct.setValue(D,qe.setFromMatrixPosition(E.matrixWorld)),ze.logarithmicDepthBuffer&&ct.setValue(D,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&ct.setValue(D,"isOrthographic",E.isOrthographicCamera===!0),_!==E&&(_=E,Dt=!0,Ln=!0)}if(O.isSkinnedMesh){ct.setOptional(D,O,"bindMatrix"),ct.setOptional(D,O,"bindMatrixInverse");const bt=O.skeleton;bt&&(bt.boneTexture===null&&bt.computeBoneTexture(),ct.setValue(D,"boneTexture",bt.boneTexture,R))}O.isBatchedMesh&&(ct.setOptional(D,O,"batchingTexture"),ct.setValue(D,"batchingTexture",O._matricesTexture,R),ct.setOptional(D,O,"batchingIdTexture"),ct.setValue(D,"batchingIdTexture",O._indirectTexture,R),ct.setOptional(D,O,"batchingColorTexture"),O._colorsTexture!==null&&ct.setValue(D,"batchingColorTexture",O._colorsTexture,R));const Nt=V.morphAttributes;if((Nt.position!==void 0||Nt.normal!==void 0||Nt.color!==void 0)&&Re.update(O,V,Gt),(Dt||Ce.receiveShadow!==O.receiveShadow)&&(Ce.receiveShadow=O.receiveShadow,ct.setValue(D,"receiveShadow",O.receiveShadow)),z.isMeshGouraudMaterial&&z.envMap!==null&&(It.envMap.value=xe,It.flipEnvMap.value=xe.isCubeTexture&&xe.isRenderTargetTexture===!1?-1:1),z.isMeshStandardMaterial&&z.envMap===null&&F.environment!==null&&(It.envMapIntensity.value=F.environmentIntensity),Dt&&(ct.setValue(D,"toneMappingExposure",x.toneMappingExposure),Ce.needsLights&&Xn(It,Ln),ie&&z.fog===!0&&ce.refreshFogUniforms(It,ie),ce.refreshMaterialUniforms(It,z,W,Z,l.state.transmissionRenderTarget[E.id]),li.upload(D,St(Ce),It,R)),z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(li.upload(D,St(Ce),It,R),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&ct.setValue(D,"center",O.center),ct.setValue(D,"modelViewMatrix",O.modelViewMatrix),ct.setValue(D,"normalMatrix",O.normalMatrix),ct.setValue(D,"modelMatrix",O.matrixWorld),z.isShaderMaterial||z.isRawShaderMaterial){const bt=z.uniformsGroups;for(let Ct=0,Mi=bt.length;Ct<Mi;Ct++){const nn=bt[Ct];I.update(nn,Gt),I.bind(nn,Gt)}}return Gt}function Xn(E,F){E.ambientLightColor.needsUpdate=F,E.lightProbe.needsUpdate=F,E.directionalLights.needsUpdate=F,E.directionalLightShadows.needsUpdate=F,E.pointLights.needsUpdate=F,E.pointLightShadows.needsUpdate=F,E.spotLights.needsUpdate=F,E.spotLightShadows.needsUpdate=F,E.rectAreaLights.needsUpdate=F,E.hemisphereLights.needsUpdate=F}function qn(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return y},this.getRenderTarget=function(){return U},this.setRenderTargetTextures=function(E,F,V){const z=Te.get(E);z.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),Te.get(E.texture).__webglTexture=F,Te.get(E.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:V,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,F){const V=Te.get(E);V.__webglFramebuffer=F,V.__useDefaultFramebuffer=F===void 0};const Xt=D.createFramebuffer();this.setRenderTarget=function(E,F=0,V=0){U=E,C=F,y=V;let z=!0,O=null,ie=!1,he=!1;if(E){const xe=Te.get(E);if(xe.__useDefaultFramebuffer!==void 0)Ae.bindFramebuffer(D.FRAMEBUFFER,null),z=!1;else if(xe.__webglFramebuffer===void 0)R.setupRenderTarget(E);else if(xe.__hasExternalTextures)R.rebindTextures(E,Te.get(E.texture).__webglTexture,Te.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const we=E.depthTexture;if(xe.__boundDepthTexture!==we){if(we!==null&&Te.has(we)&&(E.width!==we.image.width||E.height!==we.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");R.setupDepthRenderbuffer(E)}}const Ue=E.texture;(Ue.isData3DTexture||Ue.isDataArrayTexture||Ue.isCompressedArrayTexture)&&(he=!0);const De=Te.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(De[F])?O=De[F][V]:O=De[F],ie=!0):E.samples>0&&R.useMultisampledRTT(E)===!1?O=Te.get(E).__webglMultisampledFramebuffer:Array.isArray(De)?O=De[V]:O=De,w.copy(E.viewport),P.copy(E.scissor),N=E.scissorTest}else w.copy(Le).multiplyScalar(W).floor(),P.copy(He).multiplyScalar(W).floor(),N=Oe;if(V!==0&&(O=Xt),Ae.bindFramebuffer(D.FRAMEBUFFER,O)&&z&&Ae.drawBuffers(E,O),Ae.viewport(w),Ae.scissor(P),Ae.setScissorTest(N),ie){const xe=Te.get(E.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+F,xe.__webglTexture,V)}else if(he){const xe=Te.get(E.texture),Ue=F;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,xe.__webglTexture,V,Ue)}else if(E!==null&&V!==0){const xe=Te.get(E.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,xe.__webglTexture,V)}v=-1},this.readRenderTargetPixels=function(E,F,V,z,O,ie,he){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ee=Te.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&he!==void 0&&(Ee=Ee[he]),Ee){Ae.bindFramebuffer(D.FRAMEBUFFER,Ee);try{const xe=E.texture,Ue=xe.format,De=xe.type;if(!ze.textureFormatReadable(Ue)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ze.textureTypeReadable(De)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=E.width-z&&V>=0&&V<=E.height-O&&D.readPixels(F,V,z,O,Fe.convert(Ue),Fe.convert(De),ie)}finally{const xe=U!==null?Te.get(U).__webglFramebuffer:null;Ae.bindFramebuffer(D.FRAMEBUFFER,xe)}}},this.readRenderTargetPixelsAsync=async function(E,F,V,z,O,ie,he){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ee=Te.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&he!==void 0&&(Ee=Ee[he]),Ee)if(F>=0&&F<=E.width-z&&V>=0&&V<=E.height-O){Ae.bindFramebuffer(D.FRAMEBUFFER,Ee);const xe=E.texture,Ue=xe.format,De=xe.type;if(!ze.textureFormatReadable(Ue))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ze.textureTypeReadable(De))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const we=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,we),D.bufferData(D.PIXEL_PACK_BUFFER,ie.byteLength,D.STREAM_READ),D.readPixels(F,V,z,O,Fe.convert(Ue),Fe.convert(De),0);const Ke=U!==null?Te.get(U).__webglFramebuffer:null;Ae.bindFramebuffer(D.FRAMEBUFFER,Ke);const Ze=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await No(D,Ze,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,we),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ie),D.deleteBuffer(we),D.deleteSync(Ze),ie}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,F=null,V=0){const z=Math.pow(2,-V),O=Math.floor(E.image.width*z),ie=Math.floor(E.image.height*z),he=F!==null?F.x:0,Ee=F!==null?F.y:0;R.setTexture2D(E,0),D.copyTexSubImage2D(D.TEXTURE_2D,V,0,0,he,Ee,O,ie),Ae.unbindTexture()};const Ti=D.createFramebuffer(),qt=D.createFramebuffer();this.copyTextureToTexture=function(E,F,V=null,z=null,O=0,ie=null){ie===null&&(O!==0?(ri("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ie=O,O=0):ie=0);let he,Ee,xe,Ue,De,we,Ke,Ze,pt;const ut=E.isCompressedTexture?E.mipmaps[ie]:E.image;if(V!==null)he=V.max.x-V.min.x,Ee=V.max.y-V.min.y,xe=V.isBox3?V.max.z-V.min.z:1,Ue=V.min.x,De=V.min.y,we=V.isBox3?V.min.z:0;else{const Nt=Math.pow(2,-O);he=Math.floor(ut.width*Nt),Ee=Math.floor(ut.height*Nt),E.isDataArrayTexture?xe=ut.depth:E.isData3DTexture?xe=Math.floor(ut.depth*Nt):xe=1,Ue=0,De=0,we=0}z!==null?(Ke=z.x,Ze=z.y,pt=z.z):(Ke=0,Ze=0,pt=0);const je=Fe.convert(F.format),Ce=Fe.convert(F.type);let Et;F.isData3DTexture?(R.setTexture3D(F,0),Et=D.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(R.setTexture2DArray(F,0),Et=D.TEXTURE_2D_ARRAY):(R.setTexture2D(F,0),Et=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,F.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,F.unpackAlignment);const Je=D.getParameter(D.UNPACK_ROW_LENGTH),Gt=D.getParameter(D.UNPACK_IMAGE_HEIGHT),hn=D.getParameter(D.UNPACK_SKIP_PIXELS),Dt=D.getParameter(D.UNPACK_SKIP_ROWS),Ln=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,ut.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,ut.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Ue),D.pixelStorei(D.UNPACK_SKIP_ROWS,De),D.pixelStorei(D.UNPACK_SKIP_IMAGES,we);const ct=E.isDataArrayTexture||E.isData3DTexture,It=F.isDataArrayTexture||F.isData3DTexture;if(E.isDepthTexture){const Nt=Te.get(E),bt=Te.get(F),Ct=Te.get(Nt.__renderTarget),Mi=Te.get(bt.__renderTarget);Ae.bindFramebuffer(D.READ_FRAMEBUFFER,Ct.__webglFramebuffer),Ae.bindFramebuffer(D.DRAW_FRAMEBUFFER,Mi.__webglFramebuffer);for(let nn=0;nn<xe;nn++)ct&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Te.get(E).__webglTexture,O,we+nn),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Te.get(F).__webglTexture,ie,pt+nn)),D.blitFramebuffer(Ue,De,he,Ee,Ke,Ze,he,Ee,D.DEPTH_BUFFER_BIT,D.NEAREST);Ae.bindFramebuffer(D.READ_FRAMEBUFFER,null),Ae.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(O!==0||E.isRenderTargetTexture||Te.has(E)){const Nt=Te.get(E),bt=Te.get(F);Ae.bindFramebuffer(D.READ_FRAMEBUFFER,Ti),Ae.bindFramebuffer(D.DRAW_FRAMEBUFFER,qt);for(let Ct=0;Ct<xe;Ct++)ct?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Nt.__webglTexture,O,we+Ct):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Nt.__webglTexture,O),It?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,bt.__webglTexture,ie,pt+Ct):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,bt.__webglTexture,ie),O!==0?D.blitFramebuffer(Ue,De,he,Ee,Ke,Ze,he,Ee,D.COLOR_BUFFER_BIT,D.NEAREST):It?D.copyTexSubImage3D(Et,ie,Ke,Ze,pt+Ct,Ue,De,he,Ee):D.copyTexSubImage2D(Et,ie,Ke,Ze,Ue,De,he,Ee);Ae.bindFramebuffer(D.READ_FRAMEBUFFER,null),Ae.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else It?E.isDataTexture||E.isData3DTexture?D.texSubImage3D(Et,ie,Ke,Ze,pt,he,Ee,xe,je,Ce,ut.data):F.isCompressedArrayTexture?D.compressedTexSubImage3D(Et,ie,Ke,Ze,pt,he,Ee,xe,je,ut.data):D.texSubImage3D(Et,ie,Ke,Ze,pt,he,Ee,xe,je,Ce,ut):E.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ie,Ke,Ze,he,Ee,je,Ce,ut.data):E.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ie,Ke,Ze,ut.width,ut.height,je,ut.data):D.texSubImage2D(D.TEXTURE_2D,ie,Ke,Ze,he,Ee,je,Ce,ut);D.pixelStorei(D.UNPACK_ROW_LENGTH,Je),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Gt),D.pixelStorei(D.UNPACK_SKIP_PIXELS,hn),D.pixelStorei(D.UNPACK_SKIP_ROWS,Dt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ln),ie===0&&F.generateMipmaps&&D.generateMipmap(Et),Ae.unbindTexture()},this.copyTextureToTexture3D=function(E,F,V=null,z=null,O=0){return ri('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(E,F,V,z,O)},this.initRenderTarget=function(E){Te.get(E).__webglFramebuffer===void 0&&R.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?R.setTextureCube(E,0):E.isData3DTexture?R.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?R.setTexture2DArray(E,0):R.setTexture2D(E,0),Ae.unbindTexture()},this.resetState=function(){C=0,y=0,U=null,Ae.reset(),tt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Fo}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const n=this.getContext();n.drawingBufferColorSpace=_t._getDrawingBufferColorSpace(t),n.unpackColorSpace=_t._getUnpackColorSpace()}}const yt=0,Mt=1,Ut=2,Wt=3,In=180,un=12,mh=.02,wt=.6,gn=.4,vn=.2,gh=1.4,vh=.8,Sh=1,vo=.8,rr=.9,So={[Mt]:gh,[Ut]:vh,[Wt]:Sh,[yt]:rr},Eh=.08,xh=un*un,Th=.5,Mh=2.2,Ah=un*2.2,Eo=2048,ci=.25,bh=.94,Rh=.45,wh=1.6,yh=1,Ch=10.85,Ph=0,Lh=1.2,Dh=1.5,Uh=1.25,Aa=.99,Ih=.01,Nh=1.05,Qn=.16,ba=3;function Fh(e,t){const n=Math.sqrt(e*e+t*t);if(n<1e-6)return[0,0];const i=Math.min(1,n/Uh),a=Aa+(Ih-Aa)*i,o=Math.pow(n,a)*Nh/n;return[e*o,t*o]}function Ra(e,t){const i=.12*Math.pow(2*(e<.12?e:1-e),t);return e<.12?i:1-i}const Oh=.12,Bh=3,Hh=1,Gh=2,kh=1,Vh=3,zh=1,Wh=2,Xh=4,qh=2,Yh=5,Kh=3,wa=2,$h=3,_i=5e3,ar=1200,jh=3e3,xo=_i+ar+jh,Zh=400,Jh=1200,Qh=3e4,ep=0,tp=1,To=2,np=.04,ip=.04,rp=.08,Ot=48;function ap(e,t,n){let i=yt;return e==="vertical"?(n<wt&&t>=vn&&t<vn+wt&&(i=Mt),t>=wt&&(i=Ut)):e==="horizontal"?(n>=vn&&n<vn+wt&&t<wt&&(i=Mt),n>=wt&&(i=Ut)):e==="per75"?(n<wt&&t<wt&&(i=Mt),i!==Mt&&(i=Ut)):e==="right_click"?(n<wt&&t<wt&&(i=Mt),n>=wt&&(i=Wt),n<wt&&t>=wt&&(i=Ut)):e==="hamburger"?(n<gn&&t>=vn&&t<vn+wt&&(i=Mt),n>=gn&&n<1-gn&&(i=Ut),n>=1-gn&&(i=Wt)):e==="bed"&&(n<gn&&t<wt&&(i=Mt),n>=1-gn&&(i=Wt),i===yt&&(i=Ut)),i}function op(e,t){if(e===yt)return[255,255,255];const n=t?.pos??[.5,.5,.5];let i,a,r;return t?.type==="jung"?(i=Math.round((n[0]-250)/650*200+30),a=Math.round((n[1]-580)/2020*200+30),r=Math.round((n[2]-2080)/1120*200+30)):(i=Math.round(n[0]*200+30),a=Math.round(n[1]*200+30),r=Math.round(n[2]*200+30)),e===Mt&&(a=Math.min(255,Math.round(a*1.7))),e===Ut&&(i=Math.min(255,Math.round(i*1.7)),a=Math.min(255,Math.round(a*1.7))),e===Wt&&(i=Math.min(255,Math.round(i*1.7))),[i,a,r]}const ya=[[255,49,30],[25,248,0],[255,242,0]],sp=[Wt,Mt,Ut];function lp(e,t){if(e.isSignal)return e.signalColor;const n=cp(e),[i,a,r]=op(e.state,n),o=Math.min(e.brightness,2.5),s=e.flash;if(s===0)return[Math.min(255,Math.round(i*o)),Math.min(255,Math.round(a*o)),Math.min(255,Math.round(r*o))];if(s===1){const m=.5+.5*Math.sin(t*2);return[Math.min(255,Math.round(255+(i*o-255)*m)),Math.min(255,Math.round(255+(a*o-255)*m)),Math.min(255,Math.round(255+(r*o-255)*m))]}const f=1+3*(.5+.5*Math.sin(t*.3)),d=.5+.5*Math.sin(t*f);return[Math.min(255,Math.round(255+(i*o-255)*d)),Math.min(255,Math.round(255+(a*o-255)*d)),Math.min(255,Math.round(255+(r*o-255)*d))]}function cp(e){const t=e.sylMeta;return t?e.state===Mt?t.choEntry:e.state===Ut?t.jungEntry:e.state===Wt?t.jongEntry??t.choEntry:null:null}function fp(e,t,n,i){const a=Math.max(1,Math.round(e/n)),r=Math.max(1,Math.round(t/n)),o=e/a,s=t/r,f=[];for(let d=0;d<r;d++)for(let m=0;m<a;m++){const c=(m+.5)*o,h=(d+.5)*s,p=(Math.random()-.5)*i*o,T=(Math.random()-.5)*i*s;f.push([c+p,h+T])}return f}function up(){return{syllables:[],points:[],delaunay:null,cols:0,_glTex:null,_needsUpload:!0,_sylPhaseStart:new Float32Array(Ot),_sylCount:0}}function or(e){let t=0;for(const n of e.syllables)t=Math.max(t,n.x+n.w);return t}function dp(e){let t=0;for(const n of e.syllables)n.h>t&&(t=n.h);return t}function Ca(e,t,n,i,a,r,o,s){r=r??a,o=o??a;const f=i[t.jung],d=i[t.cho]?.cho??i[t.cho],m=t.jong?i[t.jong+"_jong"]??i[t.jong]:null,c=nl(t.jung,t.jong,i),h={choEntry:d,jungEntry:f,jongEntry:m,type:c,cho:t.cho,jung:t.jung,jong:t.jong,w:r,h:o};h.cyclePhaseStart=performance.now()+n*Zh;const p=s??or(e);h.x=p,e.syllables.push(h);const T=fp(r,o,un,mh),S=[];for(const[b,x]of T){const L=b+p,C=x;let y=!0;for(const U of e.points){const v=U.localX-L,_=U.localY-C;if(v*v+_*_<un*un){y=!1;break}}y&&S.push([L,C])}const u=$h-wa+1,l=Math.min(wa+Math.floor(Math.random()*u),S.length),M=new Set;for(;M.size<l;)M.add(Math.floor(Math.random()*S.length));S.forEach(([b,x],L)=>{const C=(b-p)/r,y=x/o,U=ap(c,C,y),v=U===yt,_=M.has(L);let w=U,P=null;if(_){const $=Math.floor(Math.random()*ya.length);P=ya[$],w=sp[$]}const N=_?vo:So[w]??rr,G=C*2-1,q=y*2-1,B=Math.max(0,(Math.abs(G)-Qn)/(1-Qn)),Z=Math.max(0,(Math.abs(q)-Qn)/(1-Qn)),W=1-Ra(Math.min(1,B),ba),ae=1-Ra(Math.min(1,Z),ba),[ge,Le]=Fh(G,q),He=p+(ge+1)/2*r,Oe=(Le+1)/2*o;e.points.push({localX:He,localY:Oe,cellCx:W,cellCy:ae,sylIndex:n,sylMeta:h,state:w,originalState:U,isBackground:v,blankStreak:0,changedThisStep:!1,isSignal:_,signalColor:P,brightness:1,flash:0,flashTimer:0,currentScale:N,targetScale:N,neighbors:null})})}function Pa(e,t){const n=e.points;if(n.length===0){e.delaunay=null;return}const i=or(e),a=nr.from(n,r=>r.localX,r=>r.localY);e.delaunay=a,e.cols=i;for(let r=0;r<n.length;r++)n[r].neighbors=Array.from(a.neighbors(r));e._needsUpload=!0}const Hi=.5;function hp(e,t,n,i,a){let r=e.get(t);const o=n.length;let s=null;if(r){let d=0;const m=Math.min(r.syllables.length,o);for(;d<m;d++){const c=r.syllables[d],h=n[d].syl;if(c.cho!==h.cho||c.jung!==h.jung||c.jong!==h.jong)break}s=r.syllables.slice(0,d).map(c=>c.cyclePhaseStart);for(let c=0;c<d;c++){const h=r.syllables[c],p=n[c];if(Math.abs(h.w-p.w)>Hi||Math.abs(h.h-p.h)>Hi||Math.abs(h.x-p.x)>Hi){d=-1;break}}if(d===r.syllables.length){if(o>d){for(let c=d;c<o;c++)Ca(r,n[c].syl,c,i,a,n[c].w,n[c].h,n[c].x);Pa(r)}return r}}const f=r?._glTex??null;r=up(),r._glTex=f;for(let d=0;d<o;d++)Ca(r,n[d].syl,d,i,a,n[d].w,n[d].h,n[d].x),s?.[d]!==void 0&&(r.syllables[d].cyclePhaseStart=s[d]);return Pa(r),e.set(t,r),r}function Nn(e,t,n){return n.some(i=>i==="E"?t.localX>e.localX:i==="W"?t.localX<e.localX:i==="S"?t.localY>e.localY:i==="N"?t.localY<e.localY:!1)}function pp(e,t){const i=Math.max(0,e-t)%xo;return i<_i?ep:i<_i+ar?tp:To}function ei(e,t){return!!e&&pp(t,e.cyclePhaseStart)===To}function _p(e,t){const n=e.points,i=n.length;if(i===0)return;const a=new Array(i);for(let r=0;r<i;r++){const o=n[r];if(a[r]=o.state,o.changedThisStep=!1,ei(o.sylMeta,t))continue;const s=o.neighbors??[],f=o.state;if(f!==yt&&s.some(m=>n[m].state===yt)&&(o.brightness=Math.min(o.brightness*1.1,2.5)),!o.isSignal){if(f===Mt){let d=0,m=0;for(const c of s){const h=n[c];h.state===Ut&&(d++,Nn(o,h,["E","S"])&&m++)}(d>=Bh||m>=Hh)&&(a[r]=Ut,o.changedThisStep=!0)}else if(f===Ut){const d=!!o.sylMeta?.jongEntry;let m=0,c=0;if(d)for(const h of s){const p=n[h];p.state===Wt&&(m++,Nn(o,p,["S"])&&c++)}if(d&&(m>=Gh||c>=kh))a[r]=Wt,o.changedThisStep=!0;else{let h=!1;for(const p of s){const T=n[p];if((T.state===Mt||T.state===yt)&&Nn(o,T,["E"])){h=!0;break}}h&&(a[r]=Mt,o.changedThisStep=!0)}}else if(f===Wt){let d=0,m=0;for(const c of s){const h=n[c];h.state===Mt&&(d++,Nn(o,h,["E","N"])&&m++)}(d>=Vh||m>=zh)&&(a[r]=Mt,o.changedThisStep=!0)}else if(f===yt&&!o.isBackground){const d=s.reduce((m,c)=>m+(n[c].state===yt?1:0),0);o.blankStreak=d>=Kh?o.blankStreak+1:0,o.blankStreak>=Yh&&(a[r]=o.originalState,o.changedThisStep=!0,o.blankStreak=0)}}}for(let r=0;r<i;r++){const o=n[r];if(o.isSignal||o.isBackground||ei(o.sylMeta,t))continue;const s=o.neighbors??[],f=o.state;if(s.reduce((T,S)=>T+(n[S].state===yt?1:0),0)<(f===yt?Wh:Xh))continue;const c=[],h=[];for(const T of s)n[T].isSignal||ei(n[T].sylMeta,t)||(Nn(o,n[T],["W","N"])?c.push(T):h.push(T));const p=c.concat(h).slice(0,qh);for(const T of p)n[T].changedThisStep||(a[T]=yt);f===yt&&(a[r]=o.originalState)}for(let r=0;r<i;r++){const o=n[r];ei(o.sylMeta,t)||(o.state!==a[r]&&(o.state=a[r],o.targetScale=o.isSignal?vo:So[o.state]??rr),o.state!==yt&&(o.blankStreak=0),o.brightness+=(1-o.brightness)*.05)}e._needsUpload=!0}const mp=`#version 300 es
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
`,gp=`#version 300 es
precision highp float;
in vec2 v_local;
uniform sampler2D u_data; // width=count, height=3 (row0: x,y,weight,cellCx / row1: r,g,b,cellCy / row2: state,-,-,-)
uniform vec2 u_size;    // 단어 사각형 크기(px) — 바깥 테두리를 가상의 변으로 취급할 때 씀
uniform int u_count;
uniform float u_gapPx;
uniform float u_corner; // 모서리 라운딩 반경(px) — smooth-min의 k
uniform float u_cutoff; // 이 거리보다 먼 site는 모서리 계산에서 제외(smin 처짐 방지)
uniform float u_sylSize;   // 음절 기준 크기(px, base) — 이웃 음절 정보가 없을 때 fallback
// 음절별 lattice 기하 — (1) 픽셀이 어느 음절에 속하는지(누적 오프셋 구간 탐색, 신호등
// 플래싱용) (2) 음절 센터 배경 radial gradient의 중심/반경 계산용. 음절마다 폭/높이가
// 달라서 나눗셈 한 번으로는 안 됨.
uniform float u_sylOffsetX[${Ot}]; // 각 음절 왼쪽 경계 x (누적합)
uniform float u_sylWidth[${Ot}];
uniform float u_sylHeight[${Ot}];
uniform float u_cellSize; // squircle 박스 클리핑 — site 하나가 그릴 수 있는 최대 폭/높이(px, MIN_DIST 기준). 모노 도형 크기 기준으로도 씀
uniform float u_time; // 신호등 플래싱용 wall-clock(ms) — JS의 rAF timestamp(performance.now()와 같은 시계)
// 신호등 플래싱 사이클 타이밍 — 음절(=sylIdx) 단위 uniform 배열. 사이클 시작 시각은 음절
// 전체가 공유하는 값이라 점(셀) 개수만큼 중복 저장할 필요 없이 배열 인덱싱이면 충분.
// (BLINK 때 어떤 "도형"을 그릴지는 셀 단위라 이 배열이 아니라 u_data의 row2에서 읽음.)
uniform float u_sylPhaseStart[${Ot}];
uniform int u_sylCount;
// 셀 바깥(배경)의 알파. 1.0 = 자기 배경(BG_GRAY)을 칠하는 원래 모드,
// 0.0 = 투명 출력(TD 합성). 1.0이면 아래 식이 전부 예전 그대로로 접힌다.
uniform float u_bgAlpha;
#define HALO_ALPHA ${yh.toFixed(4)}
out vec4 outColor;

#define MAX_PTS ${Eo}
#define MAX_SYL_UNIFORM ${Ot}
// 신호등 플래싱 사이클 상수 — JS 상단 CYCLE_*/MONO_* 상수와 항상 동일해야 함(단일 소스: JS)
#define CYCLE_NORMAL ${_i.toFixed(1)}
#define CYCLE_BLINK ${ar.toFixed(1)}
#define CYCLE_TOTAL ${xo.toFixed(1)}
#define CYCLE_BLINK_RATE ${Jh.toFixed(1)}
#define MONO_LINE_RATIO ${np.toFixed(3)}
#define MONO_DOT_RATIO ${ip.toFixed(3)}
#define MONO_BORDER_RATIO ${rp.toFixed(3)}
// 음절 센터 radial gradient — JS 상단 BG_GRAY/SYL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define BG_GRAY ${ci.toFixed(4)}
#define SYL_GRAD_STRENGTH ${bh.toFixed(4)}
#define SYL_GRAD_RADIUS_RATIO ${Rh.toFixed(4)}
#define SYL_GRAD_FALLOFF ${wh.toFixed(4)}
// 셀 내부 미세 radial gradient — JS 상단 CELL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define CELL_GRAD_SAT ${Ch.toFixed(4)}
#define CELL_GRAD_DEPTH ${Ph.toFixed(4)}
#define CELL_GRAD_RADIUS_RATIO ${Lh.toFixed(4)}
#define CELL_GRAD_FALLOFF ${Dh.toFixed(4)}

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

void main() {
    // 이 픽셀이 속한 음절 — 음절 폭이 제각각이라 나눗셈 대신 누적 오프셋 구간 탐색.
    // (음절 수는 MAX_SYL_UNIFORM 이하로 적어서 선형 순회 비용 무시 가능.)
    int sylI = 0;
    for (int s = 0; s < MAX_SYL_UNIFORM; s++) {
        if (s >= u_sylCount) break;
        if (v_local.x >= u_sylOffsetX[s]) sylI = s;
    }
    float sylIdx = float(sylI);
    float sylW_i = u_sylWidth[sylI] > 0.0 ? u_sylWidth[sylI] : u_sylSize;
    float sylH_i = u_sylHeight[sylI] > 0.0 ? u_sylHeight[sylI] : u_sylSize;
    // point 생성 시 py = ((wy+1)/2)*sylH — 음절은 단어 박스 상단 정렬. 중심 y = sylH_i*0.5.
    vec2 sylCenter = vec2(u_sylOffsetX[sylI] + sylW_i * 0.5, sylH_i * 0.5);

    // 음절 센터 radial gradient — 셀 뒤에 깔리는 배경. 중심이 BG_GRAY보다 밝고
    // 바깥으로 페이드(격자를 그리기 전 단계). 셀 색은 아래에서 이 bg 위에 mix됨.
    float gradR = max(min(sylW_i, sylH_i) * SYL_GRAD_RADIUS_RATIO, 1.0);
    float gradT = pow(clamp(1.0 - length(v_local - sylCenter) / gradR, 0.0, 1.0), SYL_GRAD_FALLOFF);
    vec3 bg = vec3(BG_GRAY + SYL_GRAD_STRENGTH * gradT);
    // 투명 출력에선 어두운 바탕(BG_GRAY)을 빼고 **halo만** 남긴다. 아래 alpha가 gradT라
    // "흰 glow가 뒤 배경 위에 얹히는" 합성이 되고, 멀리서는 알파가 0이라 배경이 그대로 비친다.
    // u_bgAlpha=1.0이면 bg 그대로 — 불투명 모드의 룩은 1비트도 안 바뀐다.
    vec3 bgCol = mix(vec3(1.0), bg, u_bgAlpha);

    // 1st pass — power distance가 가장 작은 site(best) 찾기
    float best = 1e12;
    int bestIdx = 0;
    vec2 bestPos = vec2(0.0);
    float bestW = 0.0;
    for (int i = 0; i < MAX_PTS; i++) {
        if (i >= u_count) break;
        vec3 pw = texelFetch(u_data, ivec2(i, 0), 0).xyz; // x, y, weight
        vec2 d = v_local - pw.xy;
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
        float d = dot(mid - v_local, nHat) - (pw.z - bestW) / (2.0 * nlen);
        edgeDist = smin(edgeDist, d, u_corner);
    }

    // 단어 사각형의 4변 — 이건 두 스타일 공통(교집합 조건, smin).
    edgeDist = smin(edgeDist, v_local.x, u_corner);
    edgeDist = smin(edgeDist, u_size.x - v_local.x, u_corner);
    edgeDist = smin(edgeDist, v_local.y, u_corner);
    edgeDist = smin(edgeDist, u_size.y - v_local.y, u_corner);

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
    float boxClipX = halfW - abs(v_local.x - bestPos.x);
    float boxClipY = halfH - abs(v_local.y - bestPos.y);
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
    float cellT = pow(clamp(length(v_local - bestPos) / cellRef, 0.0, 1.0), CELL_GRAD_FALLOFF);
    // 채도: luma(무채색)에서 color를 밀어냄 — factor>1이면 채도↑. 명도: 곱 감쇠.
    float cellLuma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 cellShaded = mix(vec3(cellLuma), color, 1.0 + CELL_GRAD_SAT * cellT);
    cellShaded *= (1.0 - CELL_GRAD_DEPTH * cellT);
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
    bool showMono = isBlink && mod(cyclePhase, CYCLE_BLINK_RATE * 2.0) < CYCLE_BLINK_RATE;

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
        vec2 local = v_local - bestPos;
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

    // 셀 안(edge=1)은 늘 불투명, 바깥은 배경 알파. 투명 모드에선 halo가 알파를 만든다.
    // 캔버스가 premultipliedAlpha:true 라 RGB를 알파로 미리 곱해서 내보낸다
    // (u_bgAlpha=1.0이면 alpha=1.0이라 곱해도 그대로 — 예전 출력과 동일).
    float bgA = max(u_bgAlpha, clamp(gradT * HALO_ALPHA, 0.0, 1.0));
    float alpha = mix(bgA, 1.0, edge);
    outColor = vec4(finalColor * alpha, alpha);
}
`;function La(e,t,n){const i=e.createShader(t);if(e.shaderSource(i,n),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(i);throw e.deleteShader(i),new Error("signal shader compile error: "+a)}return i}function vp(e){const t=La(e,e.VERTEX_SHADER,mp),n=La(e,e.FRAGMENT_SHADER,gp),i=e.createProgram();if(e.attachShader(i,t),e.attachShader(i,n),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS)){const a=e.getProgramInfoLog(i);throw new Error("signal program link error: "+a)}return e.deleteShader(t),e.deleteShader(n),i}function Sp(e,t,n){const i=t.points,a=i.length;if(a===0)return;const r=new Float32Array(a*3*4);for(let s=0;s<a;s++){const f=i[s];r[s*4+0]=f.localX,r[s*4+1]=f.localY,r[s*4+2]=f.currentScale*xh,r[s*4+3]=f.cellCx??1;const[d,m,c]=lp(f,n),h=a*4+s*4;r[h+0]=d/255,r[h+1]=m/255,r[h+2]=c/255,r[h+3]=f.cellCy??1;const p=a*8+s*4;r[p+0]=f.state,r[p+1]=0,r[p+2]=0,r[p+3]=0}t._glTex||(t._glTex=e.createTexture()),e.bindTexture(e.TEXTURE_2D,t._glTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,a,3,0,e.RGBA,e.FLOAT,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),t._texCount=a;const o=Math.min(t.syllables.length,Ot);t._sylPhaseStart=new Float32Array(Ot);for(let s=0;s<o;s++)t._sylPhaseStart[s]=t.syllables[s].cyclePhaseStart;t._sylCount=o}class Ep{constructor(t={}){this._transparent=!!t.transparentOutput,this.lineHeightRatio=1,this._canvas=null,this._gl=null,this._prog=null,this._quadBuf=null,this._uniforms=null,this._raf=null,this._rows=[],this._wordCache=new Map,this._JAMO=null,this._sylItems=[],this._positions=[],this._sylSize=In,this._stepCount=0,this._lastStep=0,this._STEP_INTERVAL=140,this._lastFrame=0,this._FRAME_INTERVAL=1e3/24,this._flashPhase=0,this._active=!1,this._lastActivity=0,this._paused=!1,this._pausedAt=0,this._rect=null,this._scrollAxis="y",this._scrollBase=0,this._slide=0,this._scrollJump=!0,this.sylSize=In,this.wrapStep=In,this.minSpacing=.96,this.wrapMargin=0}async init(t){this._canvas=t??document.createElement("canvas"),this._ownCanvas=!t,t||(Object.assign(this._canvas.style,{position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh"}),document.body.appendChild(this._canvas));const n=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!n)throw new Error("signal: WebGL2 not available");this._gl=n,this._prog=vp(n),this._quadBuf=n.createBuffer(),n.bindBuffer(n.ARRAY_BUFFER,this._quadBuf),n.bufferData(n.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),n.STATIC_DRAW);const i=n.getAttribLocation(this._prog,"a_pos");n.enableVertexAttribArray(i),n.vertexAttribPointer(i,2,n.FLOAT,!1,0,0),this._uniforms={resolution:n.getUniformLocation(this._prog,"u_resolution"),origin:n.getUniformLocation(this._prog,"u_origin"),size:n.getUniformLocation(this._prog,"u_size"),data:n.getUniformLocation(this._prog,"u_data"),count:n.getUniformLocation(this._prog,"u_count"),gapPx:n.getUniformLocation(this._prog,"u_gapPx"),corner:n.getUniformLocation(this._prog,"u_corner"),cutoff:n.getUniformLocation(this._prog,"u_cutoff"),sylSize:n.getUniformLocation(this._prog,"u_sylSize"),sylOffsetX:n.getUniformLocation(this._prog,"u_sylOffsetX"),sylWidth:n.getUniformLocation(this._prog,"u_sylWidth"),sylHeight:n.getUniformLocation(this._prog,"u_sylHeight"),cellSize:n.getUniformLocation(this._prog,"u_cellSize"),time:n.getUniformLocation(this._prog,"u_time"),sylPhaseStart:n.getUniformLocation(this._prog,"u_sylPhaseStart"),sylCount:n.getUniformLocation(this._prog,"u_sylCount"),bgAlpha:n.getUniformLocation(this._prog,"u_bgAlpha")},this._resize(),this._onResize=()=>{this._wake(),this._resize()},window.addEventListener("resize",this._onResize),this._lastActivity=performance.now(),this._raf=requestAnimationFrame(this._animate)}update(t,n,i,a,r,o){if(this._wake(),this._JAMO=i,this._sylItems=t,this._positions=n,this._sylSize=a??this._estimateSylSize(n),this._widths=r??null,this._heights=o??null,!i||t.length===0){this._rows=[],this._wordCache.clear(),this._active=!1;return}this._syncRows(t,n,i),this._active=!0}setRect(t){this._rect=t??null}setScrollAxis(t){t!==this._scrollAxis&&(this._scrollAxis=t,this._scrollBase=this._slide=0,this._scrollJump=!0)}scrollTo(t){t=Math.max(0,t);const n=t-this._scrollBase;this._scrollJump||n<0?this._slide=0:this._slide+=n,this._scrollJump=!1,this._scrollBase=t,this._slide&&this._wake()}get scrollBase(){return this._scrollBase}get shownScrollBase(){return this._scrollBase-this._slide}async flushQueue(){this._wake(),await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t)))}captureFrame(){if(!this._gl||!this._canvas)return null;const t=this._time;return this._time=0,this._draw(),this._time=t,this._canvas.toDataURL("image/png")}clearAccum(){const t=this._gl;if(t)for(const n of this._wordCache.values())n._glTex&&t.deleteTexture(n._glTex);this._wordCache.clear(),this._rows=[],this._sylItems=[],this._positions=[],this._widths=null,this._heights=null,this._stepCount=0,this._active=!1,this._scrollBase=this._slide=0,this._scrollJump=!0,this._draw()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize);const t=this._gl;if(t){for(const n of this._wordCache.values())n._glTex&&t.deleteTexture(n._glTex);this._quadBuf&&t.deleteBuffer(this._quadBuf),this._prog&&t.deleteProgram(this._prog)}this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._wordCache.clear()}_resize(){if(!this._canvas)return;const t=Math.min(window.devicePixelRatio||1,2);this._cssWidth=window.innerWidth,this._cssHeight=window.innerHeight,this._canvas.width=Math.round(this._cssWidth*t),this._canvas.height=Math.round(this._cssHeight*t),this._gl?.viewport(0,0,this._canvas.width,this._canvas.height)}_estimateSylSize(t){if(t.length<2)return In;const n=Math.abs(t[1][0]-t[0][0])*window.innerWidth;return n>10?n:In}_syncRows(t,n,i){const a=[];let r=[],o=-1/0;const s=this._cssWidth??window.innerWidth,f=this._cssHeight??window.innerHeight;for(let m=0;m<t.length;m++){const c=n[m][0]*s;c<=o+.5&&(a.push(r),r=[]);const h=this._widths?.[m]??this._sylSize,p=this._heights?.[m]??this._sylSize;r.push({syl:t[m],left:c-h*.5,top:n[m][1]*f-p*.5,w:h,h:p}),o=c}r.length>0&&a.push(r);const d=new Set;this._rows=a.map((m,c)=>{const h=[];let p=[];for(const T of m)p.length>0&&T.syl.wordId!==p[p.length-1].syl.wordId&&(h.push(p),p=[]),p.push(T);return p.length>0&&h.push(p),h.map(T=>{const S=T[0].left,u=T[0].top;for(const b of T)b.x=b.left-S;const l=`${T[0].syl.wordId}:${c}`;d.add(l);const M=hp(this._wordCache,l,T,i,this._sylSize);return M._origin=[S,u],M})});for(const[m,c]of Array.from(this._wordCache.entries()))d.has(m)||(c._glTex&&this._gl?.deleteTexture(c._glTex),this._wordCache.delete(m))}_animate=t=>{if(t-this._lastActivity>Qh){this._raf=null,this._paused=!0,this._pausedAt=t;return}if(this._raf=requestAnimationFrame(this._animate),!(t-this._lastFrame<this._FRAME_INTERVAL)){if(this._lastFrame=t,this._flashPhase+=.08,this._time=t,this._active&&t-this._lastStep>=this._STEP_INTERVAL){this._lastStep=t,this._stepCount++;for(const n of this._rows)for(const i of n)_p(i,t)}for(const n of this._rows)for(const i of n){let a=i._needsUpload;for(const r of i.points){const o=r.currentScale;r.currentScale+=(r.targetScale-r.currentScale)*Eh,Math.abs(r.currentScale-o)>.001&&(a=!0)}a&&(Sp(this._gl,i,this._flashPhase),i._needsUpload=!1)}this._slide&&(this._slide*=1-Oh,Math.abs(this._slide)<.3&&(this._slide=0)),this._draw()}};_wake(){const t=performance.now();if(this._paused){const n=t-this._pausedAt;for(const i of this._rows)for(const a of i){for(const r of a.syllables)r.cyclePhaseStart+=n;a._needsUpload=!0}this._lastFrame=0,this._lastStep=t,this._paused=!1,this._raf=requestAnimationFrame(this._animate)}this._lastActivity=t}_draw(){const t=this._gl;if(!t)return;const n=this._transparent?0:1;t.clearColor(ci*n,ci*n,ci*n,n),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(this._prog),t.bindBuffer(t.ARRAY_BUFFER,this._quadBuf),t.uniform2f(this._uniforms.resolution,this._cssWidth??this._canvas.width,this._cssHeight??this._canvas.height),t.uniform1f(this._uniforms.gapPx,Th),t.uniform1f(this._uniforms.corner,Mh),t.uniform1f(this._uniforms.cutoff,Ah),t.uniform1f(this._uniforms.sylSize,this._sylSize),t.uniform1f(this._uniforms.cellSize,un),t.uniform1f(this._uniforms.time,this._time??0),t.uniform1f(this._uniforms.bgAlpha,n),t.activeTexture(t.TEXTURE0),t.uniform1i(this._uniforms.data,0);for(const i of this._rows)for(const a of i){const[r,o]=a._origin??[0,0],s=this._scrollAxis==="x"?this._slide:0,f=this._scrollAxis==="y"?this._slide:0;this._drawWord(t,a,r+s,o+f)}}_drawWord(t,n,i,a){const r=n.points.length;if(r===0||!n._glTex)return;const o=or(n),s=dp(n),f=n.syllables,d=Math.min(f.length,Ot),m=new Float32Array(Ot),c=new Float32Array(Ot),h=new Float32Array(Ot);for(let p=0;p<d;p++)m[p]=f[p].x,c[p]=f[p].w,h[p]=f[p].h;t.bindTexture(t.TEXTURE_2D,n._glTex),t.uniform2f(this._uniforms.origin,i,a),t.uniform2f(this._uniforms.size,o,s),t.uniform1i(this._uniforms.count,Math.min(r,Eo)),t.uniform1fv(this._uniforms.sylOffsetX,m),t.uniform1fv(this._uniforms.sylWidth,c),t.uniform1fv(this._uniforms.sylHeight,h),t.uniform1fv(this._uniforms.sylPhaseStart,n._sylPhaseStart),t.uniform1i(this._uniforms.sylCount,Math.max(n._sylCount,1)),t.drawArrays(t.TRIANGLE_STRIP,0,4)}}const sr=Math.PI*2;function dn(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Vt(...e){let t=2166136261;for(const n of e){const i=String(n);for(let a=0;a<i.length;a++)t=Math.imul(t^i.charCodeAt(a),16777619)>>>0;t=Math.imul(t^44,16777619)>>>0}return t>>>0}const ft=(e,t,n)=>t+e()*(n-t);function Mo(e=1){const t=n=>{const i=Math.sin((n+e)*127.1)*43758.5453;return i-Math.floor(i)};return n=>{const i=Math.floor(n),a=n-i,r=a*a*(3-2*a);return t(i)*(1-r)+t(i+1)*r}}function Ao(e,t){if(e.length<2)return e.map(r=>({x:r.x,y:r.y}));const n=[{x:e[0].x,y:e[0].y}];let i=n[0],a=0;for(let r=1;r<e.length;r++){let o=e[r].x,s=e[r].y,f=Math.hypot(o-i.x,s-i.y);for(;a+f>=t;){const d=(t-a)/f;i={x:i.x+(o-i.x)*d,y:i.y+(s-i.y)*d},n.push(i),f=Math.hypot(o-i.x,s-i.y),a=0}a+=f,i={x:o,y:s}}return n}function Ji(e,t){let n=e;for(let i=0;i<t&&!(n.length<3);i++){const a=[n[0]];for(let r=1;r<n.length-1;r++)a.push({x:(n[r-1].x+n[r].x+n[r+1].x)/3,y:(n[r-1].y+n[r].y+n[r+1].y)/3});a.push(n[n.length-1]),n=a}return n}const Qi=(e,t)=>Math.max(0,Math.round(e/t));function lr(e){for(let t=0;t<e.length;t++){const n=e[Math.max(0,t-1)],i=e[Math.min(e.length-1,t+1)],a=Math.atan2(i.y-n.y,i.x-n.x);e[t].angle=a,e[t].nx=Math.cos(a+Math.PI/2),e[t].ny=Math.sin(a+Math.PI/2)}return e}function mi(e,t){if(!t||t.length===0)return null;if(t.length===1)return{...t[0]};e=Math.max(0,Math.min(t.length-1,e));const n=Math.floor(e),i=e-n,a=t[n],r=t[Math.min(t.length-1,n+1)];let o=r.angle-a.angle;o=Math.atan2(Math.sin(o),Math.cos(o));const s=a.angle+o*i;return{x:a.x+(r.x-a.x)*i,y:a.y+(r.y-a.y)*i,angle:s,nx:Math.cos(s+Math.PI/2),ny:Math.sin(s+Math.PI/2)}}function xp(e){return[{px0:0,seed:e}]}function Tp(e,t){let n=0;for(;n+1<e.length&&e[n+1].px0<=t;)n++;return n}const Mp=e=>e*e*(3-2*e);function gi(e,t,n,i){const a=Tp(e,t),r=t-e[a].px0,o=i(a,r);if(a>0&&n>0&&r<n){const s=i(a-1,t-e[a-1].px0);return s+(o-s)*Mp(r/n)}return o}const cr=(e,t,n)=>Math.min(t+1<e.length?e[t+1].px0:1/0,n),bo=e=>(e>>>0)%9973;function Da(e,t){const n=Math.sin(t*12.9898+bo(e)*78.233)*43758.5453;return(n-Math.floor(n))*2-1}function ti(e,t,n,i=0,a=null){const[r,o]=e.companions,s=r+Math.floor(dn(Vt(i,"comp"))()*(o-r+1));return{id:t,birth:n,seed:i,plan:a?.length?a:xp(i),nc:s,raw:[],spine:null,spineInk:null,compPolys:[],compPlan:null,decor:[],orbs:[],segCache:null}}function Sn(e,t,n,i){const a=e.raw[e.raw.length-1];return a&&Math.hypot(n-a.x,i-a.y)<t.minDist||e.raw.length>=t.maxRaw?!1:(e.raw.push({x:n,y:i}),!0)}function Ap(e,t){const n=Ao(e,t.spacing);return lr(Ji(n,Qi(t.spineSmooth,t.spacing)))}function bp(e,t,n){const i=dn(Vt(e.seed,"comp"));i();const a=[];for(let r=0;r<t;r++)a.push({amp:ft(i,n.wanderAmp[0],n.wanderAmp[1]),wanderLen:ft(i,n.wanderLen[0],n.wanderLen[1]),weaveAmp:ft(i,n.weaveAmp[0],n.weaveAmp[1]),weaveLen:ft(i,n.weaveLen[0],n.weaveLen[1]),weavePhase:ft(i,0,sr),nz:Mo(ft(i,0,999)),swirly:i()>=n.noSwirlChance});return a}function Rp(e,t,n,i){const{plan:a}=e,r=[];for(let o=0;o<a.length&&r.length<i.maxSwirls;o++){if(!e.segCache.comps[o][t].swirly)continue;const s=dn(Vt(a[o].seed,"event",t)),f=cr(a,o,n);let d=a[o].px0,m=ft(s,i.eventGap[0],i.eventGap[1]);for(;r.length<i.maxSwirls&&d+m<=f;){if(d+=m,m=ft(s,i.eventGap[0],i.eventGap[1]),s()>i.eventProb)continue;const c=ft(s,i.swirlSpan[0],i.swirlSpan[1]);r.push({c:d+c+ft(s,0,i.spacing*6),span:c,R:ft(s,i.swirlRadius[0],i.swirlRadius[1]),turns:ft(s,i.swirlTurns[0],i.swirlTurns[1]),dir:s()<.5?1:-1,phase:ft(s,0,sr)})}}return r}function wp(e,t,n){if(!n.decor)return[];const{plan:i}=e,a=[];for(let r=0;r<i.length;r++){const o=dn(Vt(i[r].seed,"decor")),s=cr(i,r,t);let f=i[r].px0,d=ft(o,n.decorGap[0],n.decorGap[1]);for(;f+d<=s;)f+=d,d=ft(o,n.decorGap[0],n.decorGap[1]),a.push({px:f,off:ft(o,-n.decorSpread,n.decorSpread),jx:ft(o,-4,4),jy:ft(o,-4,4),r:ft(o,n.decorRadius[0],n.decorRadius[1]),x:0,y:0})}return a}function yp(e,t,n){const i=n.orb;if(!i?.on)return[];const{plan:a}=e,r=[];for(let o=0;o<a.length;o++){const s=dn(Vt(a[o].seed,"orb")),f=cr(a,o,t);let d=a[o].px0,m=ft(s,i.gap[0],i.gap[1]),c=0;for(;d+m<=f;){d+=m,m=ft(s,i.gap[0],i.gap[1]);const h=s()<=i.prob,p={px:d,off:ft(s,-i.spread,i.spread),r:ft(s,i.radius[0],i.radius[1]),seed:Vt(a[o].seed,"orb",c++),x:0,y:0};h&&r.push(p)}}return r}function Ua(e,t,n){const i=(t.length-1)*n.spacing;for(const a of e){const r=mi(Math.min(a.px,i)/n.spacing,t);r&&(a.x=r.x+r.nx*a.off+(a.jx??0),a.y=r.y+r.ny*a.off+(a.jy??0))}}function Cp(e,t,n){const i=n.spineFx,{plan:a}=e;let r=0;const o=i.roughen;o?.on&&o.size&&(r+=gi(a,t,n.segBlend,(f,d)=>{const m=d/o.gap,c=Math.floor(m),h=m-c,p=Da(a[f].seed,c),T=Da(a[f].seed,c+1),S=o.mode==="corner"?h:(1-Math.cos(h*Math.PI))*.5;return(p+(T-p)*S)*o.size}));const s=i.puckerBloat;return s?.on&&s.amount&&(r+=gi(a,t,n.segBlend,(f,d)=>{const m=d/s.gap%1,c=Math.sin(m*Math.PI);return s.amount>0?s.amount*c:-s.amount*(1-c)*(1-c)})),r}function Pp(e,t,n){const i=n.spineFx;if(!i||!(i.roughen?.on||i.puckerBloat?.on))return null;const a=n.spacing,r=t.map((o,s)=>{const f=Cp(e,s*a,n);return{x:o.x+o.nx*f,y:o.y+o.ny*f}});return lr(r)}function Lp(e,t,n,i){const a=i.goo.reach;if(!Array.isArray(a))return a;const r=t==="comp"&&e.compPlan?e.compPlan:e.plan,o=e.segCache?.reachNz;return o?gi(r,n,i.segBlend,(s,f)=>a[0]+(a[1]-a[0])*o[s](f/i.goo.reachLen)):(a[0]+a[1])*.5}function Dp(e,t,n,i,a){const r=a.spacing,s=(e.length-1)*r-a.headLag;if(s<a.compStep*4)return[];const f=Ji(e.map(M=>({x:M.x,y:M.y})),Qi(a.compBaseSmooth,r)),d=[0];for(let M=1;M<f.length;M++)d.push(d[M-1]+Math.hypot(f[M].x-f[M-1].x,f[M].y-f[M-1].y));const m=M=>{const b=Math.max(0,Math.min(f.length-1,M/r)),x=Math.floor(b);return x>=f.length-1?d[f.length-1]:d[x]+(d[x+1]-d[x])*(b-x)},c=lr(Ao(f,r)),h=(c.length-1)*r,p=t.plan.map(M=>({px0:m(M.px0),seed:M.seed}));t.compPlan=p;const T=i.map(M=>({...M,c:m(M.c)})),S=t.segCache.comps,u=[],l=Math.min(s,h);for(let M=0;M<=l;M+=a.compStep){const b=mi(M/r,c),x=gi(p,M,a.segBlend,(y,U)=>{const v=S[y][n],_=U/v.wanderLen,w=v.amp*1.6*(v.nz(_)-v.nz(_+111.3)),P=v.weaveAmp*Math.sin(U/v.weaveLen*sr+v.weavePhase);return w+P});let L=b.nx*x,C=b.ny*x;for(const y of T){const U=(M-y.c)/y.span;if(U<=-1||U>=1)continue;const v=Math.cos(U*Math.PI/2)**2,_=y.phase+y.dir*(U+1)*Math.PI*y.turns;L+=Math.cos(_)*y.R*v,C+=Math.sin(_)*y.R*v}u.push({x:b.x+L,y:b.y+C})}return Ji(u,Qi(a.compSmooth,a.compStep))}function En(e,t){if(e.raw.length<2){e.spine=null,e.spineInk=null,e.compPolys=[];return}const n=Ap(e.raw,t),i=(n.length-1)*t.spacing;e.segCache={comps:e.plan.map(a=>bp(a,e.nc,t)),reachNz:e.plan.map(a=>Mo(bo(Vt(a.seed,"reach"))))},e.decor=wp(e,i,t),Ua(e.decor,n,t),e.orbs=yp(e,i,t),Ua(e.orbs,n,t),e.spine=n,e.spineInk=Pp(e,n,t),e.compPolys=[];for(let a=0;a<e.nc;a++){const r=Dp(n,e,a,Rp(e,a,i,t),t);r.length>=2&&e.compPolys.push(r)}}function Ia(e,t,n,i){const a=e.createShader(t);return e.shaderSource(a,n),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)||console.error(`[${i}] ${e.getShaderInfoLog(a)}`),a}function Vn(e,t,n,i){const a=e.createProgram();return e.attachShader(a,Ia(e,e.VERTEX_SHADER,t,i+".vert")),e.attachShader(a,Ia(e,e.FRAGMENT_SHADER,n,i+".frag")),e.linkProgram(a),e.getProgramParameter(a,e.LINK_STATUS)||console.error(`[${i}] ${e.getProgramInfoLog(a)}`),a}function zn(e,t){const n=new Map;return i=>(n.has(i)||n.set(i,e.getUniformLocation(t,i)),n.get(i))}function yn(e,t,n,i={}){const a=i.internal??e.RGBA16F,r=i.type??e.HALF_FLOAT,o=i.filter??e.LINEAR,s=i.data??null,f=e.createTexture();e.bindTexture(e.TEXTURE_2D,f),e.texImage2D(e.TEXTURE_2D,0,a,t,n,0,e.RGBA,r,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const d=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,d),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,f,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE&&console.error(`[glutil] FBO incomplete (${t}x${n})`),e.bindFramebuffer(e.FRAMEBUFFER,null),{tex:f,fbo:d,w:t,h:n}}function Cn(e,t){t&&(e.deleteTexture(t.tex),e.deleteFramebuffer(t.fbo))}const Up=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);function Ip(e){const t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,Up,e.STATIC_DRAW),t}function fr(e,t){const n=e.createVertexArray();return e.bindVertexArray(n),e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),n}function Np(e,t,n,i){let a=yn(e,t,n,i),r=yn(e,t,n,i);return{get read(){return a},get write(){return r},swap(){const o=a;a=r,r=o},drop(){Cn(e,a),Cn(e,r)}}}var Fp=`#version 300 es

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
}`,Op=`#version 300 es

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
}`,ur=`#version 300 es

precision highp float;

layout(location = 0) in vec2 a_position;

out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,Bp=`#version 300 es

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

void main() {
    float f = fieldAt(v_uv);

    
    
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
                fieldAt(v_uv + vec2(t.x, 0.0)) - fieldAt(v_uv - vec2(t.x, 0.0)),
                fieldAt(v_uv + vec2(0.0, t.y)) - fieldAt(v_uv - vec2(0.0, t.y))
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
}`;const fi=8;function Hp(e,t){!e.getExtension("EXT_color_buffer_half_float")&&!e.getExtension("EXT_color_buffer_float")&&console.warn("[field] float 렌더타겟 확장이 없습니다 — 밀도 누적이 8bit 로 깎입니다");const n=Vn(e,Fp,Op,"stamp"),i=Vn(e,ur,Bp,"composite"),a=zn(e,n),r=zn(e,i),o=e.createBuffer();let s=0;const f=e.createVertexArray();e.bindVertexArray(f),e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ARRAY_BUFFER,o);const d=fi*4;e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,d,0),e.vertexAttribDivisor(1,1),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,d,16),e.vertexAttribDivisor(2,1),e.bindVertexArray(null);const m=fr(e,t);let c=1,h=1,p=1,T=1,S=1,u=null,l=null;function M(P,N,G,q){p=P,T=N,c=Math.max(1,G),h=Math.max(1,q),S=p/c,Cn(e,u),Cn(e,l),u=yn(e,c,h),l=yn(e,c,h)}function b(P){const N=P==="baked"?u:l;e.bindFramebuffer(e.FRAMEBUFFER,N.fbo),e.viewport(0,0,c,h),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.bindFramebuffer(e.FRAMEBUFFER,null)}function x(P,N,G){if(!G)return;const q=P==="baked"?u:l;e.bindBuffer(e.ARRAY_BUFFER,o),N.length>s?(e.bufferData(e.ARRAY_BUFFER,N,e.DYNAMIC_DRAW),s=N.length):e.bufferSubData(e.ARRAY_BUFFER,0,N),e.bindFramebuffer(e.FRAMEBUFFER,q.fbo),e.viewport(0,0,c,h),e.useProgram(n),e.bindVertexArray(f),e.uniform2f(a("u_cssSize"),p,T),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE),e.drawArraysInstanced(e.TRIANGLES,0,6,G),e.disable(e.BLEND),e.bindVertexArray(null),e.bindFramebuffer(e.FRAMEBUFFER,null)}function L(P,N,G){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,N,G),e.disable(e.BLEND),e.useProgram(i),e.bindVertexArray(m),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,u.tex),e.uniform1i(r("u_baked"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,l.tex),e.uniform1i(r("u_live"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,P.growthTex??u.tex),e.uniform1i(r("u_growth"),2),e.uniform2f(r("u_texel"),1/c,1/h),e.uniform1f(r("u_pxPerTexel"),S),e.uniform1f(r("u_th"),P.th),e.uniform1f(r("u_compCap"),P.compCap??0),e.uniform1f(r("u_edge"),P.edge),e.uniform3fv(r("u_paper"),P.paper),e.uniform3fv(r("u_ink"),P.ink),e.uniform1i(r("u_shade"),P.shade),e.uniform3fv(r("u_light"),P.light),e.uniform1f(r("u_normalZ"),P.normalZ),e.uniform1f(r("u_amb"),P.amb),e.uniform1f(r("u_diff"),P.diff),e.uniform1f(r("u_spec"),P.spec),e.uniform1f(r("u_specPow"),P.specPow),e.uniform1f(r("u_fres"),P.fres),e.uniform1f(r("u_bands"),P.bands),e.uniform3fv(r("u_growInk"),P.growInk),e.uniform1f(r("u_growGain"),P.growGain),e.uniform1f(r("u_growOpacity"),P.growOpacity),e.drawArrays(e.TRIANGLES,0,6),e.bindVertexArray(null)}function C(P){const N=(P&32768)>>15,G=(P&31744)>>10,q=P&1023;return G===0?(N?-1:1)*Math.pow(2,-14)*(q/1024):G===31?q?NaN:(N?-1:1)*(1/0):(N?-1:1)*Math.pow(2,G-15)*(1+q/1024)}const y=new Float32Array(4),U=new Uint16Array(4);function v(P,N,G="baked"){const q=G==="baked"?u:l,B=Math.round(P/p*c),Z=Math.round((1-N/T)*h);e.bindFramebuffer(e.FRAMEBUFFER,q.fbo);const W=e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE);let ae;W===e.HALF_FLOAT?(e.readPixels(B,Z,1,1,e.RGBA,e.HALF_FLOAT,U),ae=Array.from(U,C)):(e.readPixels(B,Z,1,1,e.RGBA,e.FLOAT,y),ae=Array.from(y)),e.bindFramebuffer(e.FRAMEBUFFER,null);const[ge,Le,He,Oe]=ae;return{density:ge,comp:Oe,strokeId:ge>1e-4?Le/ge:0,birth:ge>1e-4?He/ge:0}}return{resize:M,clear:b,stamp:x,composite:L,probe:v,textures:()=>({baked:u.tex,live:l.tex}),texel:()=>[1/c,1/h]}}var Gp=`#version 300 es

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
}`;function kp(e,t){const n=Vn(e,ur,Gp,"growth"),i=zn(e,n),a=fr(e,t);let r=null,o=1,s=1,f=1,d=1;function m(T,S,u,l){f=T,d=S,o=Math.max(1,u),s=Math.max(1,l),r&&r.drop(),r=Np(e,o,s),c()}function c(){for(let T=0;T<2;T++)e.bindFramebuffer(e.FRAMEBUFFER,r.write.fbo),e.viewport(0,0,o,s),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),r.swap();e.bindFramebuffer(e.FRAMEBUFFER,null)}function h(T){e.bindFramebuffer(e.FRAMEBUFFER,r.write.fbo),e.viewport(0,0,o,s),e.disable(e.BLEND),e.useProgram(n),e.bindVertexArray(a),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,r.read.tex),e.uniform1i(i("u_prev"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,T.bakedTex),e.uniform1i(i("u_baked"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,T.liveTex),e.uniform1i(i("u_live"),2),e.uniform2fv(i("u_fieldTexel"),T.fieldTexel),e.uniform2f(i("u_cssSize"),f,d),e.uniform1f(i("u_time"),T.time),e.uniform1f(i("u_dt"),T.dt),e.uniform1f(i("u_th"),T.th),e.uniform1f(i("u_compCap"),T.compCap??0),e.uniform1f(i("u_decay"),T.decay),e.uniform1f(i("u_outward"),T.outward),e.uniform1f(i("u_curlAmp"),T.curlAmp),e.uniform1f(i("u_curlScale"),T.curlScale),e.uniform1f(i("u_curlSpeed"),T.curlSpeed),e.uniform1f(i("u_source"),T.source),e.uniform1f(i("u_bandLo"),T.bandLo),e.uniform1f(i("u_bandHi"),T.bandHi),e.uniform1f(i("u_nowMin"),T.nowMin),e.uniform1f(i("u_ageDelay"),T.ageDelay),e.drawArrays(e.TRIANGLES,0,6),e.bindVertexArray(null),e.bindFramebuffer(e.FRAMEBUFFER,null),r.swap()}return{resize:m,clear:c,step:h,texture:()=>r.read.tex}}var Vp=`#version 300 es

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
}`,zp=`#version 300 es

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
}`,Wp=`#version 300 es

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
}`;function Xp(e,t,n=128){const i=!!e.getExtension("EXT_color_buffer_float");i||console.warn("[particles] EXT_color_buffer_float 없음 — 16F 로 대체(위치 정밀도 저하)");const a=i?{internal:e.RGBA32F,type:e.FLOAT,filter:e.NEAREST}:{internal:e.RGBA16F,type:e.HALF_FLOAT,filter:e.NEAREST},r=Vn(e,ur,Vp,"pupdate"),o=Vn(e,zp,Wp,"particle"),s=zn(e,r),f=zn(e,o),d=fr(e,t),m=e.createVertexArray(),c=n*n;let h=null,p=null,T=1,S=1,u=0;function l(){const y=new Float32Array(c*4);for(let U=0;U<c;U++)y[U*4+0]=0,y[U*4+1]=0,y[U*4+2]=0,y[U*4+3]=Math.random();return y}function M(){Cn(e,h),Cn(e,p),h=yn(e,n,n,{...a,data:l()}),p=yn(e,n,n,a)}function b(y,U){T=y,S=U,h||M()}function x(y){e.bindFramebuffer(e.FRAMEBUFFER,p.fbo),e.viewport(0,0,n,n),e.disable(e.BLEND),e.useProgram(r),e.bindVertexArray(d),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,h.tex),e.uniform1i(s("u_prev"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,y.bakedTex),e.uniform1i(s("u_baked"),1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,y.liveTex),e.uniform1i(s("u_live"),2),e.uniform2fv(s("u_fieldTexel"),y.fieldTexel),e.uniform2f(s("u_cssSize"),T,S),e.uniform1f(s("u_time"),y.time),e.uniform1ui(s("u_frame"),u++>>>0),e.uniform1f(s("u_dt"),y.dt),e.uniform1f(s("u_th"),y.th),e.uniform1f(s("u_compCap"),y.compCap??0),e.uniform1f(s("u_spawnTol"),y.spawnTol),e.uniform1f(s("u_spawnRate"),y.spawnRate),e.uniform1f(s("u_lifespan"),y.lifespan),e.uniform1f(s("u_lifeVar"),y.lifeVar),e.uniform1f(s("u_curlAmp"),y.curlAmp),e.uniform1f(s("u_curlScale"),y.curlScale),e.uniform1f(s("u_curlSpeed"),y.curlSpeed),e.uniform1f(s("u_flow"),y.flow),e.uniform1f(s("u_repel"),y.repel),e.drawArrays(e.TRIANGLES,0,6),e.bindVertexArray(null),e.bindFramebuffer(e.FRAMEBUFFER,null);const U=h;h=p,p=U}function L(y,U,v,_){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,U,v),e.enable(e.BLEND),e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(o),e.bindVertexArray(m),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,h.tex),e.uniform1i(f("u_state"),0),e.uniform2i(f("u_stateSize"),n,n),e.uniform2f(f("u_cssSize"),T,S),e.uniform1f(f("u_size"),y.size),e.uniform1f(f("u_dpr"),_),e.uniform3fv(f("u_ink"),y.ink),e.uniform1f(f("u_opacity"),y.opacity),e.drawArrays(e.POINTS,0,c),e.bindVertexArray(null),e.disable(e.BLEND)}function C(){const y=new Float32Array(c*4);e.bindFramebuffer(e.FRAMEBUFFER,h.fbo),e.readPixels(0,0,n,n,e.RGBA,e.FLOAT,y),e.bindFramebuffer(e.FRAMEBUFFER,null);let U=0,v=1/0,_=-1/0;for(let P=0;P<c;P++)y[P*4+2]>0&&(U++,v=Math.min(v,y[P*4]),_=Math.max(_,y[P*4]));const w=[];for(let P=0;P<3;P++)w.push(Array.from(y.slice(P*4,P*4+4),N=>+N.toFixed(4)));return{alive:U,count:c,xRange:U?[v,_]:null,sample:w}}return{resize:b,reset:M,step:x,draw:L,count:c,stats:C}}const qp=1.55;function Yp(e,t,n,i,a,r){const o=e-n,s=t-i,f=a-n,d=r-i,m=f*f+d*d,c=m>1e-9?Math.max(0,Math.min(1,(o*f+s*d)/m)):0,h=o-f*c,p=s-d*c;return Math.sqrt(h*h+p*p)}function Kp(e,t){if(!(t>0))return e;const n=e/t;return e/Math.pow(1+n*n*n*n,.25)}function $p(e,{reach:t=28,th:n=.5,cell:i=4,compCap:a=0}={}){if(!e||e.length===0)return[];let r=1/0,o=1/0,s=-1/0,f=-1/0;for(const x of e)r=Math.min(r,x.ax,x.bx),s=Math.max(s,x.ax,x.bx),o=Math.min(o,x.ay,x.by),f=Math.max(f,x.ay,x.by);r-=t,o-=t,s+=t,f+=t;const d=Math.ceil((s-r)/i)+1,m=Math.ceil((f-o)/i)+1;if(d<2||m<2||d*m>4e6)return[];const c=Math.max(1,Math.ceil((s-r)/t)),h=Math.max(1,Math.ceil((f-o)/t)),p=Array.from({length:c*h},()=>[]),T=(x,L)=>L*c+x;for(let x=0;x<e.length;x++){const L=e[x],C=Math.max(0,Math.floor((Math.min(L.ax,L.bx)-t-r)/t)),y=Math.min(c-1,Math.floor((Math.max(L.ax,L.bx)+t-r)/t)),U=Math.max(0,Math.floor((Math.min(L.ay,L.by)-t-o)/t)),v=Math.min(h-1,Math.floor((Math.max(L.ay,L.by)+t-o)/t));for(let _=U;_<=v;_++)for(let w=C;w<=y;w++)p[T(w,_)].push(x)}const S=new Float32Array(d*m);for(let x=0;x<m;x++){const L=o+x*i,C=Math.max(0,Math.min(h-1,Math.floor((L-o)/t)));for(let y=0;y<d;y++){const U=r+y*i,v=Math.max(0,Math.min(c-1,Math.floor((U-r)/t)));let _=0,w=0;for(const P of p[T(v,C)]){const N=e[P],G=Yp(U,L,N.ax,N.ay,N.bx,N.by);if(G>=t)continue;const q=1-G/t,B=Math.hypot(N.bx-N.ax,N.by-N.ay),Z=q*q*q*(qp*B/t);N.c&&a>0?w+=Z:_+=Z}S[x*d+y]=_+Kp(w,a)}}const u=(x,L)=>S[L*d+x],l=(x,L,C)=>{const y=u(x,L),U=u(C,L),v=Math.abs(U-y)<1e-9?.5:(n-y)/(U-y);return{x:r+(x+(C-x)*v)*i,y:o+L*i}},M=(x,L,C)=>{const y=u(x,L),U=u(x,C),v=Math.abs(U-y)<1e-9?.5:(n-y)/(U-y);return{x:r+x*i,y:o+(L+(C-L)*v)*i}},b=[];for(let x=0;x<m-1;x++)for(let L=0;L<d-1;L++){const C=u(L,x)>n,y=u(L+1,x)>n,U=u(L+1,x+1)>n,v=u(L,x+1)>n;let _=(C?8:0)|(y?4:0)|(U?2:0)|(v?1:0);if(_===0||_===15)continue;const w=()=>l(L,x,L+1),P=()=>l(L,x+1,L+1),N=()=>M(L,x,x+1),G=()=>M(L+1,x,x+1);if(_===5||_===10){const B=(u(L,x)+u(L+1,x)+u(L+1,x+1)+u(L,x+1))*.25>n;_===5===B?b.push({a:N(),b:w()},{a:P(),b:G()}):b.push({a:N(),b:P()},{a:w(),b:G()});continue}switch(_){case 1:case 14:b.push({a:N(),b:P()});break;case 2:case 13:b.push({a:P(),b:G()});break;case 3:case 12:b.push({a:N(),b:G()});break;case 4:case 11:b.push({a:w(),b:G()});break;case 6:case 9:b.push({a:w(),b:P()});break;case 7:case 8:b.push({a:N(),b:w()});break}}return jp(b,i*.5)}function jp(e,t){const n=s=>`${Math.round(s.x/t)},${Math.round(s.y/t)}`,i=new Map,a=(s,f)=>{i.has(s)||i.set(s,[]),i.get(s).push(f)};e.forEach((s,f)=>{a(n(s.a),f),a(n(s.b),f)});const r=new Uint8Array(e.length),o=[];for(let s=0;s<e.length;s++){if(r[s])continue;r[s]=1;const f=[e[s].a,e[s].b];for(let d=0;d<2;d++)for(;;){const m=d===0?f[f.length-1]:f[0],c=(i.get(n(m))||[]).find(S=>!r[S]);if(c===void 0)break;r[c]=1;const h=e[c],T=Math.hypot(h.a.x-m.x,h.a.y-m.y)<=Math.hypot(h.b.x-m.x,h.b.y-m.y)?h.b:h.a;d===0?f.push(T):f.unshift(T)}f.length>=3&&o.push(f)}return o}const Zp=60,Jp=2,ni=e=>[parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255];function Qp(e={}){const t={seed:Math.random()*4294967295>>>0,spacing:6,spineSmooth:12,minDist:4,maxRaw:12e3,companions:[1,1],wanderAmp:[6,18],wanderLen:[500,950],weaveAmp:[16,32],weaveLen:[340,560],noSwirlChance:.1,maxSwirls:40,eventGap:[210,450],eventProb:.8,swirlSpan:[66,78],swirlRadius:[35,45],swirlTurns:[1,1.7],compBaseSmooth:96,compStep:3.6,compSmooth:11,headLag:12,segBlend:24,spineFx:{target:"ink",roughen:{on:!1,size:2,gap:8,mode:"smooth"},puckerBloat:{on:!1,amount:4,gap:24}},bead:{on:!1,gap:[40,90],radius:[1.5,3.5],speed:30,fill:"rgb(0, 0, 0)",stroke:null,lineWidth:.75,main:{on:!1,radius:4,speed:40,fill:"rgb(0, 0, 0)",stroke:null,lineWidth:.75,glow:{on:!1,core:.45,falloff:1.4}}},orb:{on:!1,gap:[90,200],prob:.7,radius:[6,22],spread:26,fill:"#ffe83d",ring:null,ringWidth:.6,flow:{cell:2.6,dash:2.2,scale:.05,turns:1,follow:.85,falloff:220,drift:.6,style:"rgba(60, 45, 0, 0.7)",width:.5}},growPx:14,lineWidth:.5,baseStyle:"rgb(0, 0, 0)",companionStyle:"rgb(0, 0, 0)",companionDash:[3,4],arrowSize:7,decor:!0,decorGap:[20,80],decorSpread:30,decorRadius:[1.5,4],decorStyle:"rgb(0, 0, 0)",decorLineWidth:.75,outline:{on:!0,reach:30,th:.55,cell:4,style:"rgba(0,0,0,0.45)",width:.6,dash:[],anim:{on:!1,speed:450}},goo:{reach:18,reachLen:140,compCap:0,th:1.3,edge:.005,spine:!0,companion:!1,fieldScale:1.5},paper:"#ffffff",ink:"#0a0a0a",shade:2,light:[-.45,.6,.66],normalZ:34,amb:.55,diff:.75,spec:.5,specPow:28,fres:.22,bands:3,grow:{on:!1,scale:.75,decay:.965,outward:26,curlAmp:55,curlScale:.006,curlSpeed:.06,source:1,bandLo:.35,bandHi:.12,ageDelay:.02,ink:"#6e6e66",gain:1.4,opacity:.5},part:{on:!1,side:128,spawnTol:.08,spawnRate:.04,lifespan:4.5,lifeVar:.5,curlAmp:34,curlScale:.0075,curlSpeed:.09,flow:26,repel:14,size:2.6,ink:"#141414",opacity:.55}},n=A=>A&&typeof A=="object"&&!Array.isArray(A),i=(A,H)=>{for(const[te,Y]of Object.entries(H))n(Y)&&n(A[te])?i(A[te],Y):A[te]=Y};e.cfg&&i(t,e.cfg);const a=!e.canvas&&!document.getElementById("c"),r=e.canvas??document.getElementById("c")??document.createElement("canvas");a&&document.body.appendChild(r);const o=document.createElement("canvas");r.parentNode?r.parentNode.insertBefore(o,r):document.body.prepend(o);const s=document.createElement("canvas");document.body.appendChild(s);for(const A of[o,r,s])A.style.position="fixed",A.style.left="0",A.style.top="0";o.style.background=e.paperBg===!1?"transparent":t.paper,r.style.background="transparent",o.style.pointerEvents="none",s.style.touchAction="none",e.mouse&&(s.style.cursor="crosshair"),e.mouse||(s.style.pointerEvents="none");const f=document.body.style.background;e.bodyBg!==!1&&(document.body.style.background=t.paper);const d=r.getContext("webgl2",{antialias:!1,alpha:!0,premultipliedAlpha:!1,preserveDrawingBuffer:!0});if(!d){console.error("WebGL2 를 쓸 수 없습니다");return}const m=Ip(d),c=Hp(d,m),h=kp(d,m),p=Xp(d,m,t.part.side),T=document.createElement("canvas"),S=T.getContext("2d"),u=s.getContext("2d"),l=o.getContext("2d");let M=0,b=0,x=1;function L(){x=Math.min(window.devicePixelRatio||1,Jp),M=Math.max(1,window.innerWidth),b=Math.max(1,window.innerHeight);for(const A of[r,s,T,o])A.width=Math.round(M*x),A.height=Math.round(b*x);for(const A of[o,r,s])A.style.width=M+"px",A.style.height=b+"px";for(const A of[S,u,l])A.setTransform(x,0,0,x,0,0);c.resize(M,b,Math.round(M*x*t.goo.fieldScale),Math.round(b*x*t.goo.fieldScale)),h.resize(M,b,Math.round(M*x*t.grow.scale),Math.round(b*x*t.grow.scale)),p.resize(M,b),Te()}function C(A,H,te,Y,K,pe,oe){for(let ke=1;ke<H.length;ke++){const nt=H[ke-1],it=H[ke];A.push(nt.x,nt.y,it.x,it.y,te((ke-.5)*Y),K,pe,oe)}}const y=A=>t.spineFx?.target==="all"&&A.spineInk||A.spine;function U(A,H){const te=!Array.isArray(t.goo.reach),Y=oe=>te?()=>t.goo.reach:ke=>Lp(A,oe,ke,t),K=t.goo.compCap>0?1:0;if(t.goo.companion)for(const oe of A.compPolys)C(H,oe,Y("comp"),t.compStep,A.id,A.birth,K);const pe=y(A);t.goo.spine&&pe&&C(H,pe,Y("spine"),t.spacing,A.id,A.birth,0)}function v(A,H,te,Y,K){if(!(H.length<2)){A.strokeStyle=te,A.lineWidth=Y,A.lineJoin="round",A.lineCap="round",A.setLineDash(K||[]),A.beginPath(),A.moveTo(H[0].x,H[0].y);for(let pe=1;pe<H.length;pe++)A.lineTo(H[pe].x,H[pe].y);A.stroke(),A.setLineDash([])}}function _(A,H,te,Y){if(!H||!te)return;const K=Math.atan2(H.y-te.y,H.x-te.x);A.fillStyle="rgb(0, 0, 0)",A.beginPath(),A.moveTo(H.x,H.y),A.lineTo(H.x-Math.cos(K-.4)*Y,H.y-Math.sin(K-.4)*Y),A.lineTo(H.x-Math.cos(K+.4)*Y,H.y-Math.sin(K+.4)*Y),A.closePath(),A.fill()}function w(A,H,te=!0){if(te&&H.outline)for(const K of H.outline)v(A,K,t.outline.style,t.outline.width,t.outline.dash);const Y=H.spineInk??H.spine;Y&&v(A,Y,t.baseStyle,t.lineWidth);for(const K of H.decor)A.strokeStyle=t.decorStyle,A.lineWidth=t.decorLineWidth,A.strokeRect(K.x-K.r,K.y-K.r,K.r*2,K.r*2);for(const K of H.compPolys)v(A,K,t.companionStyle,t.lineWidth,t.companionDash),_(A,K.at(-1),K.at(-3)||K.at(-2),t.arrowSize)}let P=0;function N(A,H){if(A._mainFrame===P)return A._main;A._mainFrame=P,A._main=null;const te=t.bead.main,Y=A.spineInk??A.spine;if(!te?.on||!Y||Y.length<2)return null;const K=t.spacing,pe=(Y.length-1)*K,oe=dn(Vt(A.seed,"main"))()*2*pe,ke=(te.speed*H+oe)%(2*pe),nt=ke<pe?ke:2*pe-ke,it=mi(nt/K,Y);return it?(A._main={x:it.x,y:it.y,ang:it.angle},A._main):null}const G=document.createElement("canvas").getContext("2d"),q=new Map;function B(A){if(q.has(A))return q.get(A);G.fillStyle="#000",G.fillStyle=A;const H=G.fillStyle,te=H.startsWith("#")?[1,3,5].map(Y=>parseInt(H.slice(Y,Y+2),16)):H.match(/[\d.]+/g).slice(0,3).map(Number);return q.set(A,te),te}function Z(A,H,te){const Y=N(H,te);if(!Y)return;const K=t.bead.main;if(K.glow?.on&&K.fill){const[pe,oe,ke]=B(K.fill),nt=Math.min(Math.max(K.glow.core,0),.99),it=A.createRadialGradient(Y.x,Y.y,0,Y.x,Y.y,K.radius);it.addColorStop(0,`rgba(${pe},${oe},${ke},1)`),it.addColorStop(nt,`rgba(${pe},${oe},${ke},1)`);const ot=8;for(let St=1;St<=ot;St++){const xt=St/ot,Ht=Math.pow(1-xt,K.glow.falloff);it.addColorStop(nt+(1-nt)*xt,`rgba(${pe},${oe},${ke},${Ht.toFixed(4)})`)}A.beginPath(),A.arc(Y.x,Y.y,K.radius,0,Math.PI*2),A.fillStyle=it,A.fill();return}A.beginPath(),A.arc(Y.x,Y.y,K.radius,0,Math.PI*2),K.fill&&(A.fillStyle=K.fill,A.fill()),K.stroke&&(A.strokeStyle=K.stroke,A.lineWidth=K.lineWidth,A.stroke())}function W(A){const H=(A>>>0)%9973,te=(Y,K)=>{const pe=Math.sin(Y*127.1+K*311.7+H*74.7)*43758.5453;return pe-Math.floor(pe)};return(Y,K)=>{const pe=Math.floor(Y),oe=Math.floor(K),ke=Y-pe,nt=K-oe,it=ke*ke*(3-2*ke),ot=nt*nt*(3-2*nt),St=te(pe,oe)+(te(pe+1,oe)-te(pe,oe))*it,xt=te(pe,oe+1)+(te(pe+1,oe+1)-te(pe,oe+1))*it;return St+(xt-St)*ot}}const ae=A=>A-Math.PI*Math.round(A/Math.PI);function ge(A,H,te){if(!t.orb.on||!H.orbs.length)return;const Y=t.orb,K=Y.flow,pe=N(H,te);for(const oe of H.orbs){oe._nz||(oe._nz=W(oe.seed));const ke=oe._nz,nt=pe?Math.hypot(oe.x-pe.x,oe.y-pe.y):0,it=pe?K.follow*(K.falloff>0?Math.exp(-nt/K.falloff):1):0,ot=pe?pe.x*K.drift:0,St=pe?pe.y*K.drift:0;A.save(),A.translate(oe.x,oe.y),A.beginPath(),A.arc(0,0,oe.r,0,Math.PI*2),A.fillStyle=Y.fill,A.fill(),A.clip(),A.beginPath();const xt=oe.r,Ht=K.dash*.5,Xn=xt+Ht;let qn=0;for(let Xt=-xt;Xt<=xt;Xt+=K.cell,qn++){const Ti=-xt+(qn%2?K.cell*.5:0);for(let qt=Ti;qt<=xt;qt+=K.cell){if(qt*qt+Xt*Xt>Xn*Xn)continue;const E=ke((qt-ot)*K.scale+17.3,(Xt-St)*K.scale-5.1)*Math.PI*2*K.turns,F=pe?E+it*ae(pe.ang-E):E,V=Math.cos(F)*Ht,z=Math.sin(F)*Ht;A.moveTo(qt-V,Xt-z),A.lineTo(qt+V,Xt+z)}}A.strokeStyle=K.style,A.lineWidth=K.width,A.lineCap="butt",A.stroke(),A.restore(),Y.ring&&(A.beginPath(),A.arc(oe.x,oe.y,oe.r,0,Math.PI*2),A.strokeStyle=Y.ring,A.lineWidth=Y.ringWidth,A.stroke())}}function Le(A,H,te){const Y=t.bead,K=H.spineInk??H.spine;if(!K||K.length<2)return;const pe=t.spacing,oe=(K.length-1)*pe,ke=dn(Vt(H.seed,"bead")),nt=Y.speed*te%Math.max(oe,1);let it=He(ke,Y.gap);for(A.fillStyle=Y.fill,Y.stroke&&(A.strokeStyle=Y.stroke,A.lineWidth=Y.lineWidth);it<oe;){const ot=He(ke,Y.radius),St=(it+nt)%oe,xt=Math.min(1,St/(ot*4),(oe-St)/(ot*4)),Ht=mi(St/pe,K);Ht&&xt>.05&&(A.beginPath(),A.arc(Ht.x,Ht.y,ot*xt,0,Math.PI*2),Y.fill&&A.fill(),Y.stroke&&A.stroke()),it+=He(ke,Y.gap)}}const He=(A,[H,te])=>H+A()*(te-H),Oe=[];let $=1,ee=null,_e=!1;const le=performance.now(),be=()=>(performance.now()-le)/1e3/Zp;function qe(A){const H=[],te=(K,pe)=>{for(let oe=1;oe<K.length;oe++)H.push({ax:K[oe-1].x,ay:K[oe-1].y,bx:K[oe].x,by:K[oe].y,c:pe})},Y=y(A);if(t.goo.companion)for(const K of A.compPolys)te(K,!0);return t.goo.spine&&Y&&te(Y,!1),!H.length&&Y&&te(Y,!1),H}function Pe(A){t.outline.on&&!A.outline&&(A.outline=$p(qe(A),{...t.outline,compCap:t.goo.compCap}))}const Qe=[];function rt(A,H){const te=oe=>Math.hypot(oe.x-H.x,oe.y-H.y),Y=A.length>3&&Math.hypot(A[0].x-A.at(-1).x,A[0].y-A.at(-1).y)<=t.outline.cell;let K;if(Y){const oe=A.slice(0,-1);let ke=0;for(let nt=1;nt<oe.length;nt++)te(oe[nt])<te(oe[ke])&&(ke=nt);K=oe.slice(ke).concat(oe.slice(0,ke)),K.push(K[0])}else K=te(A.at(-1))<te(A[0])?A.slice().reverse():A;const pe=[0];for(let oe=1;oe<K.length;oe++)pe.push(pe[oe-1]+Math.hypot(K[oe].x-K[oe-1].x,K[oe].y-K[oe-1].y));return{pts:K,cum:pe,total:pe.at(-1)}}function Ve(A){const H=A.spine?.[0]??A.raw[0];Qe.push({polys:A.outline.map(te=>rt(te,H)),drawn:0})}function D(A,H,te){if(te<=0||H.pts.length<2)return;if(te>=H.total)return v(A,H.pts,t.outline.style,t.outline.width,t.outline.dash);let Y=1;for(;Y<H.pts.length&&H.cum[Y]<te;)Y++;const K=H.pts[Y-1],pe=H.pts[Y],oe=(te-H.cum[Y-1])/Math.max(H.cum[Y]-H.cum[Y-1],1e-6),ke=H.pts.slice(0,Y);ke.push({x:K.x+(pe.x-K.x)*oe,y:K.y+(pe.y-K.y)*oe}),v(A,ke,t.outline.style,t.outline.width,t.outline.dash)}function At(A){for(const H of A.polys)v(S,H.pts,t.outline.style,t.outline.width,t.outline.dash)}function Xe(A){for(let H=Qe.length-1;H>=0;H--){const te=Qe[H];if(te.drawn+=t.outline.anim.speed*A,te.polys.every(Y=>te.drawn>=Y.total))At(te),Qe.splice(H,1);else for(const Y of te.polys)D(u,Y,te.drawn)}}function ze(){for(const A of Qe)At(A);Qe.length=0}function Ae(A){Pe(A);const H=t.outline.anim?.on&&A.outline?.length>0;w(S,A,!H),H&&Ve(A);const te=[];U(A,te),c.stamp("baked",new Float32Array(te),te.length/fi)}function et(){R.length=0,g=null,ee=null,_e=!1,c.clear("live")}function Te(){Qe.length=0,S.clearRect(0,0,M,b);for(const H of Oe)H.outline=null;c.clear("baked"),c.clear("live"),h.clear();const A=[];for(const H of Oe)Pe(H),w(S,H),U(H,A);c.stamp("baked",new Float32Array(A),A.length/fi)}const R=[];let g=null;function k(A){const H=[0];for(let te=1;te<A.length;te++)H.push(H[te-1]+Math.hypot(A[te].x-A[te-1].x,A[te].y-A[te-1].y));return H}function J(A,H,{hold:te=!1,plan:Y=null}={}){!A||A.length<2||R.push({pts:A,cum:k(A),seed:H,hold:te,plan:Y})}function ne(A){if(!g||!A?.length)return!1;const H=g;let te=H.pts.length?H.pts[H.pts.length-1]:null;for(const Y of A){const K=te?Math.hypot(Y.x-te.x,Y.y-te.y):0;H.pts.push(Y),H.cum.push((H.cum.length?H.cum[H.cum.length-1]:0)+K),te=Y}return!0}function j(){const A=R.shift();return A?(ee=ti(t,$++,be(),A.seed,A.plan),g={pts:A.pts,cum:A.cum,i:0,walked:0,hold:!!A.hold,plan:A.plan},!0):!1}function Me(){if(!ee)return;const A=ee;ee=null,g=null,En(A,t),c.clear("live"),A.spine&&(A.compPolys.length||A.decor.length)&&(Oe.push(A),Ae(A))}function ce(){if(!g&&!j())return;const A=g,H=A.cum[A.cum.length-1];for(A.walked=Math.min(A.walked+t.growPx,H);A.i<A.pts.length&&A.cum[A.i]<=A.walked;)Sn(ee,t,A.pts[A.i].x,A.pts[A.i].y),A.i++;A.i>=A.pts.length&&A.walked>=H&&!A.hold&&Me()}function me(A,H,te=void 0){if(!g||!ee)return;const Y=g;te!==void 0&&(Y.plan=te),A=Math.max(0,Math.min(A,Y.pts.length)),Y.pts.length=A,Y.cum.length=A;let K=A?Y.pts[A-1]:null;for(const ot of H||[]){const St=K?Math.hypot(ot.x-K.x,ot.y-K.y):0;Y.pts.push(ot),Y.cum.push((Y.cum.length?Y.cum[Y.cum.length-1]:0)+St),K=ot}const pe=Y.pts.length,oe=Math.min(Y.i,pe),{id:ke,birth:nt,seed:it}=ee;ee=ti(t,ke,nt,it,Y.plan);for(let ot=0;ot<oe;ot++)Sn(ee,t,Y.pts[ot].x,Y.pts[ot].y);En(ee,t),Y.i=oe,Y.walked=pe?Math.min(Y.walked,Y.cum[pe-1]):0}function Ge(){if(!g)return;const A=g;for(A.hold=!1;A.i<A.pts.length;)Sn(ee,t,A.pts[A.i].x,A.pts[A.i].y),A.i++;Me()}async function re(){for(Ge();j();)Ge();ze()}function ve(A,H,{step:te=1/0,plan:Y=null}={}){const K=ti(t,$++,be(),H,Y);for(let pe=0;pe<A.length;pe++)Sn(K,t,A[pe].x,A[pe].y),(pe+1)%te===0&&En(K,t);return En(K,t),K.spine&&(K.compPolys.length||K.decor.length)&&(Oe.push(K),Ae(K)),K}const ye=[],Re=(A,H,te,Y)=>{A.addEventListener(H,te,Y),ye.push([A,H,te,Y])},Se=A=>{Ge(),_e=!0;const H=$++;ee=ti(t,H,be(),Vt(t.seed,"mouse",H)),Sn(ee,t,A.clientX,A.clientY);try{s.setPointerCapture?.(A.pointerId)}catch{}A.preventDefault()},We=A=>{!_e||!ee||Sn(ee,t,A.clientX,A.clientY)};function Fe(){if(!_e||!ee)return;_e=!1;const A=ee;ee=null,En(A,t),c.clear("live"),A.spine&&(A.compPolys.length||A.decor.length)&&(Oe.push(A),Ae(A))}e.mouse&&(Re(s,"pointerdown",Se),Re(window,"pointermove",We),Re(window,"pointerup",Fe),Re(window,"pointercancel",Fe));const tt=A=>{const H=A.key.toLowerCase();H==="1"?t.shade=0:H==="2"?t.shade=1:H==="3"?t.shade=2:H==="4"?t.shade=3:H==="z"?(Oe.pop(),Te()):H==="c"?(et(),Oe.length=0,Te(),p.reset()):H==="g"?(t.grow.on=!t.grow.on,t.grow.on||h.clear()):H==="p"?(t.part.on=!t.part.on,t.part.on&&p.reset()):H==="s"&&fe()};e.keys&&Re(window,"keydown",tt);function I(){const A=document.createElement("canvas");A.width=r.width,A.height=r.height;const H=A.getContext("2d");return H.drawImage(o,0,0),H.drawImage(r,0,0),H.drawImage(s,0,0),A}function fe(){I().toBlob(A=>{const H=document.createElement("a");H.href=URL.createObjectURL(A),H.download=`trail_${Date.now()}.png`,H.click(),URL.revokeObjectURL(H.href)})}const X=[],Q=(()=>{const[A,H,te]=t.light,Y=Math.hypot(A,H,te)||1;return[A/Y,H/Y,te/Y]})();let de=performance.now();function ue(A){requestAnimationFrame(ue);const H=Math.min((A-de)/1e3,1/20);de=A;const te=(A-le)/1e3;_e||ce(),ee&&(En(ee,t),X.length=0,U(ee,X),c.clear("live"),c.stamp("live",new Float32Array(X),X.length/fi));const Y=c.textures(),K=c.texel(),pe={bakedTex:Y.baked,liveTex:Y.live,fieldTexel:K,th:t.goo.th,compCap:t.goo.compCap,time:te,dt:H};if(t.grow.on&&h.step({...pe,nowMin:be(),decay:t.grow.decay,outward:t.grow.outward,curlAmp:t.grow.curlAmp,curlScale:t.grow.curlScale,curlSpeed:t.grow.curlSpeed,source:t.grow.source,bandLo:t.grow.bandLo,bandHi:t.grow.bandHi,ageDelay:t.grow.ageDelay}),c.composite({th:t.goo.th,compCap:t.goo.compCap,edge:t.goo.edge,paper:ni(t.paper),ink:ni(t.ink),shade:t.shade,light:Q,normalZ:t.normalZ,amb:t.amb,diff:t.diff,spec:t.spec,specPow:t.specPow,fres:t.fres,bands:t.bands,growthTex:h.texture(),growInk:ni(t.grow.ink),growGain:t.grow.on?t.grow.gain:0,growOpacity:t.grow.opacity},r.width,r.height),t.part.on&&(p.step({...pe,spawnTol:t.part.spawnTol,spawnRate:t.part.spawnRate,lifespan:t.part.lifespan,lifeVar:t.part.lifeVar,curlAmp:t.part.curlAmp,curlScale:t.part.curlScale,curlSpeed:t.part.curlSpeed,flow:t.part.flow,repel:t.part.repel}),p.draw({size:t.part.size,ink:ni(t.part.ink),opacity:t.part.opacity},r.width,r.height,x)),P++,t.orb.on||Ne){l.clearRect(0,0,M,b);for(const oe of Oe)ge(l,oe,te);ee&&ge(l,ee,te),Ne=t.orb.on}if(u.clearRect(0,0,M,b),u.drawImage(T,0,0,M,b),ee&&w(u,ee),Xe(H),t.bead.on){for(const oe of Oe)Le(u,oe,te);ee&&Le(u,ee,te)}if(t.bead.main?.on){for(const oe of Oe)Z(u,oe,te);ee&&Z(u,ee,te)}}let Ne=!0;Re(window,"resize",L),L();let at=requestAnimationFrame(ue);function vt(){cancelAnimationFrame(at),at=0;for(const[A,H,te,Y]of ye)A.removeEventListener(H,te,Y);ye.length=0,et(),Oe.length=0,s.remove(),o.remove(),a&&r.remove(),e.bodyBg!==!1&&(document.body.style.background=f),e.global&&window.TRAIL===Ye&&delete window.TRAIL}const Ye={CFG:t,strokes:Oe,dispose:vt,canvases:{gl:r,overlay:s,ink2d:T,underlay:o},captureCanvas:()=>I(),replay:Te,rebuild:L,clear:()=>(et(),Oe.length=0,Te(),p.reset()),save:fe,probe:(A,H)=>c.probe(A,H),pstats:()=>p.stats(),hashSeed:Vt,addStroke:ve,queueStroke:J,extendGrowing:ne,replaceTail:me,finishGrowing:Ge,flushQueue:re,pending:()=>({queued:R.length,growing:g?g.i:null,points:g?g.pts.length:0,hold:g?!!g.hold:!1}),step:(A=1)=>{for(let H=0;H<A;H++)ce()}};return e.global&&(window.TRAIL=Ye),Ye}const Na=250,e_=900,Fa=580,t_=2600,Oa=e=>e<0?0:e>1?1:e;function n_(e,t){if(!t)return null;const n=e[t+"_jong"];return n?n.pos?n:n.cluster_front?e[n.cluster_front+"_jong"]??null:null:null}const Ba=2.2,i_=5,Ha=[1.25,2.1],Ga=[2.5,5],ka=[.1,.35],r_=3.5,a_=420,Gi=(e,t,n)=>e+(t-e)*n,xn=(e,t,n)=>Math.exp(-(((e-t)/n)**2));function o_(e,t){const n=e[t.cho]?.cho,i=e[t.jung];if(!n?.pos||!i?.pos)return null;const[a,r,o]=n.pos,[s,f]=i.pos,d=Oa((s-Na)/(e_-Na)),m=Oa((f-Fa)/(t_-Fa)),c=i.yang?1:-1,h=i.diphthong?1:0,p=n_(e,t.jong),T=p?.pos?.[1]??.5,S=p?.pos?.[2]??.33,u=Ba+d*(i_-Ba),l=Gi(Ha[0],Ha[1],o),M=Gi(Ga[0],Ga[1],m),b=Gi(ka[0],ka[1],d),x=a_,L=u/x,C=b*Math.PI*2/u,y=l*2*Math.PI*M/u,U=new Float64Array(x);for(let w=0;w<x;w++){const P=w/(x-1),N=xn(P,.34,.045)-xn(P,.68,.045),G=Math.sin(P*Math.PI*2*11)*.8,q=1,B=Math.sin(P*Math.PI*2*2.2);U[w]=xn(r,0,.3)*N+xn(r,.5,.22)*G+xn(r,.78,.26)*q+xn(r,1,.22)*B}let v=0;for(let w=0;w<x;w++)v+=Math.abs(U[w]);const _=v>1e-9?r_/(v*L):0;return{N:x,ds:L,theta0:-Math.PI*.15+(a-.5)*Math.PI*.7,k(w){const P=w/(x-1),N=h&&P>.5?Math.PI:0,G=y*Math.cos(2*Math.PI*M*P+N);let q=(C+G)*c+U[w]*_;if(p&&P>.85){const B=(P-.85)/.15;q+=(T>=.5?1:-1)*(6+S*18)*Math.sin(B*Math.PI)}return q},step(w){return L*(1+o*.35*Math.sin(w*2.399))}}}function s_(e,t){let n=0,i=0;const a=[{x:n,y:i}];for(let r=0;r<e.N;r++){t+=e.k(r)*e.ds;const o=e.step(r);n+=Math.cos(t)*o,i+=Math.sin(t)*o,a.push({x:n,y:i})}return{pts:a,theta:t}}function l_(e,t,n=null){const i=[];let a=null;for(let r=0;r<e.length;r++){const o=e[r];(!a||Math.hypot(o.x-a.x,o.y-a.y)>=t)&&(i.push(o),n?.push(r),a=o)}return i}const c_=.35,f_=1,Va=e=>Math.atan2(Math.sin(e),Math.cos(e));function u_(e,t,n,i,a,r=5,o=null){let s=null,f=0,d=0;const m=[{x:0,y:0}],c=[];for(const T of t){const S=o_(e,T);if(!S)continue;c.push({walkIdx:m.length-1,syl:T}),s=s===null?S.theta0:s+Va(S.theta0-s)*c_;const{pts:u,theta:l}=s_(S,s);s=l;const M=u[u.length-1],b=Math.hypot(M.x,M.y);if(b<1e-6)continue;const x=Math.atan2(M.y,M.x),L=-Va(x)*f_,C=Math.cos(L),y=Math.sin(L),U=1/b;for(let _=1;_<u.length;_++){const w=u[_].x*U,P=u[_].y*U;m.push({x:f+(w*C-P*y),y:d+(w*y+P*C)})}const v=m[m.length-1];f=v.x,d=v.y,s+=L}if(m.length<2)return o&&(o.starts=[]),[];const h=[],p=l_(m.map(T=>({x:n+T.x*a,y:i+T.y*a})),r,h);if(o){const T=[0];for(let u=1;u<p.length;u++)T.push(T[u-1]+Math.hypot(p[u].x-p[u-1].x,p[u].y-p[u-1].y));let S=0;o.starts=c.map(({walkIdx:u,syl:l})=>{for(;S<h.length-1&&h[S]<u;)S++;return{px0:T[S],syl:l}})}return p}const d_="turtle",za=2,Wa=110,Xa=100,h_=1.8,p_=.12,qa={spacing:4,spineSmooth:-8,wanderAmp:[1,100],wanderLen:[120,240],weaveAmp:[6,14],weaveLen:[80,500],eventGap:[55,60],swirlSpan:[18,26],swirlRadius:[6,24],compBaseSmooth:28,compStep:2.5,compSmooth:2,headLag:5,decorGap:[5,70],decorSpread:12,decorRadius:[2,5],decorLineWidth:.75,growPx:14,goo:{reach:[3,10],reachLen:140,th:1.8,edge:.004,spine:!0,companion:!0,fieldScale:1.5,compCap:0},grow:{on:!1},part:{on:!1},outline:{anim:{on:!0,speed:850}},spineFx:{target:"ink",roughen:{on:!0,size:6,gap:6,mode:"smooth"},puckerBloat:{on:!0,amount:12,gap:2}},bead:{on:!0,gap:[40,90],radius:[1.5,3.5],speed:30,fill:"rgb(0, 0, 0)",stroke:null,main:{on:!0,radius:18,speed:40,fill:"rgb(130, 255, 130)",stroke:null,glow:{on:!0,core:.45,falloff:1.4}}},orb:{on:!0,gap:[90,200],prob:.7,radius:[6,22],spread:26,fill:"#ffe83d",flow:{cell:8.6,dash:8.2,scale:.05,turns:1,follow:.85,falloff:220,drift:.6,style:"rgba(60, 45, 0, 0.7)",width:.75}}};class __{constructor(t={}){this._opts=t,this._trail=null,this._canvas=null,this._ownCanvas=!1,this._JAMO=null,this._groups=[],this._holdingIdx=-1,this._sampleStep=Math.max(qa.spacing+1,5),this._generator=d_,this.sylSize=Wa,this.wrapStep=Xa,this.wrapMargin=Wa*.6,this.lineHeightRatio=h_,this._scrollAxis="y",this._scrollBase=0,this._slide=0,this._slideRaf=0,this._scrollJump=!0}async init(t){t?this._canvas=t:(this._canvas=document.createElement("canvas"),this._ownCanvas=!0,document.body.appendChild(this._canvas)),this._trail=Qp({canvas:this._canvas,mouse:!1,keys:!1,global:!1,cfg:qa,bodyBg:!this._opts.transparentOutput,paperBg:!this._opts.transparentOutput});const{gl:n,overlay:i}=this._trail?.canvases??{};n?.parentNode&&i&&i.parentNode!==n.parentNode&&n.parentNode.insertBefore(i,n.nextSibling)}setScrollAxis(t){t!==this._scrollAxis&&(this._scrollAxis=t,this._resetScroll())}scrollTo(t){t=Math.max(0,t);const n=t-this._scrollBase;if(this._scrollJump||n<0?this._slide=0:this._slide+=n,this._scrollJump=!1,this._scrollBase=t,this._applySlide(),this._slide&&!this._slideRaf){let i=performance.now();const a=r=>{this._slide*=Math.pow(1-p_,(r-i)*24/1e3),i=r,Math.abs(this._slide)<.3&&(this._slide=0),this._applySlide(),this._slideRaf=this._slide?requestAnimationFrame(a):0};this._slideRaf=requestAnimationFrame(a)}}get scrollBase(){return this._scrollBase}get shownScrollBase(){return this._scrollBase-this._slide}_applySlide(){const t=this._slide?`translate${this._scrollAxis==="x"?"X":"Y"}(${this._slide.toFixed(1)}px)`:"";for(const n of Object.values(this._trail?.canvases??{}))n.parentNode&&(n.style.transform=t)}_resetScroll(){cancelAnimationFrame(this._slideRaf),this._slideRaf=0,this._scrollBase=this._slide=0,this._scrollJump=!0,this._applySlide()}update(t,n,i){if(i&&(this._JAMO=i),!this._JAMO||!this._trail)return;if(!t?.length){this.clearAccum();return}const a=window.innerWidth,r=window.innerHeight,o=[];for(let u=0;u<t.length;u++){const l=t[u],M=n?.[u]??[.5,.5],b=o[o.length-1];b&&b.wordId===l.wordId&&Math.abs(b.anchor[1]-M[1])<1e-4?(b.syls.push(l),b.keys.push(`${l.cho}${l.jung}${l.jong??""}`)):o.push({wordId:l.wordId,anchor:[M[0],M[1]],syls:[l],keys:[`${l.cho}${l.jung}${l.jong??""}`]})}const s=u=>`${u.wordId}@${u.anchor[0].toFixed(5)},${u.anchor[1].toFixed(5)}`,f=(u,l=u.syls,M=null)=>u_(this._JAMO,l,u.anchor[0]*a,u.anchor[1]*r,Xa,this._sampleStep,M),d=u=>this._trail.hashSeed("syl",u.cho,u.jung,u.jong??""),m=(u,l=u.syls)=>{const M={};return{pts:f(u,l,M),plan:M.starts.map(x=>({px0:x.px0,seed:d(x.syl)}))}},c=u=>this._trail.hashSeed("word",...u.keys),h=this._groups;let p=0;for(;p<h.length&&p<o.length&&h[p].sig===s(o[p])+"|"+o[p].keys.join("");)p++;if(p===h.length-1&&p===o.length-1&&this._holdingIdx===p){const u=h[p],l=o[p],M=Math.max(0,l.keys.length-za),b=l.keys.slice(0,M);if(u.anchorKey===s(l)&&b.length<=u.keys.length&&u.keys.slice(0,b.length).join("\0")===b.join("\0")){const L=M>0?f(l,l.syls.slice(0,M)):[],{pts:C,plan:y}=m(l);this._trail.replaceTail(L.length,C.slice(L.length),y),u.keys=l.keys.slice(),u.stableKeys=b,u.sig=s(l)+"|"+l.keys.join(""),u.pointCount=C.length;return}}if(p===h.length&&p===o.length)return;const T=p<h.length;T&&(this._trail.clear(),this._groups=[]);const S=T?0:p;this._holdingIdx=-1;for(let u=S;u<o.length;u++){const l=o[u],{pts:M,plan:b}=m(l);if(M.length<2)continue;const x=u===o.length-1;if(T&&!x){const L=this._trail.CFG.outline.anim,C=L.on;L.on=!1,this._trail.addStroke(M,c(l),{plan:b}),L.on=C}else this._trail.queueStroke(M,c(l),{hold:x,plan:b});x&&(this._holdingIdx=u),this._groups.push({sig:s(l)+"|"+l.keys.join(""),anchorKey:s(l),keys:l.keys.slice(),stableKeys:l.keys.slice(0,Math.max(0,l.keys.length-za)),pointCount:M.length})}}finishGrowing(){this._trail?.finishGrowing()}async flushQueue(){this._trail&&(await this._trail.flushQueue(),await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t))))}captureFrame(){return this._trail?this._trail.captureCanvas().toDataURL("image/png"):null}clearAccum(){this._trail?.clear(),this._groups=[],this._holdingIdx=-1,this._resetScroll()}dispose(){this._resetScroll(),this._trail?.dispose(),this._trail=null,this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._canvas=null}setGenerator(t){this._generator=t==="anchor"?"anchor":"turtle",this._trail?.clear(),this._groups=[],this._holdingIdx=-1}cfg(){return this._trail?.CFG}engine(){return this._trail}}const m_=!0,g_=`
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
`,Tn=`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`,Ro=`
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

${g_}

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
`,v_=`
#ifdef GL_ES
precision highp float;
#endif

${Ro}

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
`,S_=`
#ifdef GL_ES
precision highp float;
#endif

${Ro}

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
`,E_=`
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
`,x_=1600,wo=`
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
`,T_=`
#ifdef GL_ES
precision highp float;
#endif
${wo}
void main() {
    gl_FragColor = compose(gl_FragCoord.xy / u_resolution);
}
`,M_=e=>`
#ifdef GL_ES
precision highp float;
#endif
${wo}
void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution;
    vec4 acc = compose(uv);

    ${e?"gl_FragColor = vec4(acc.rgb, acc.a);":"gl_FragColor = vec4(mix(vec3(0.7), acc.rgb, acc.a), 1.0);// #bg color"}
}
`,A_=`
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
`,b_=.12;class R_{constructor(t={}){this.emitsSyllableStart=!0,this._transparent=!!t.transparentOutput,this._renderer=null,this._clock=null,this._raf=null,this._lastTime=0,this._FRAME_INTERVAL=1e3/24,this._camPos=new Ie(.3,.5,7),this._camTarget=new Ie(0,0,0),this._growTarget=null,this._accumTarget=null,this._prevTarget=null,this._growScene=null,this._accumScene=null,this._dispScene=null,this._growUniforms=null,this._accumUniforms=null,this._dispUniforms=null,this._quadCam=null,this._queue=[],this._growing=!1,this._instantBake=!1,this._growStart=0,this._isFirstGlyph=!0,this._prevSylCount=0,this._forceComplete=!1,this._forceFinish=!1,this._hubs=new Map,this._curScale=1,this._sylHubIds=[],this._bakedCenters=[],this._bakedScale=1,this._rebaking=!1,this.lineHeightRatio=2.3,this.sylSize=100,this.wrapStep=165,this.wrapMargin=0,this.glyphExtent=1.5,this.refHeight=859,this.layoutScale={x:1.28,y:1},this.displayScale=1.2,this._scrollTarget=0,this._scrollPos=0,this._scrollBase=0,this._shownScrollBase=0,this._scrollJump=!0,this._scrollAxis="x",this._rect=null,this._ghostStart=null,this._d3Displace=m_}async init(t){const n=window.innerWidth,i=window.innerHeight,a=Math.min(window.devicePixelRatio,2);this._renderer=new _h({antialias:!0,canvas:t??void 0,alpha:this._transparent,premultipliedAlpha:!this._transparent}),this._renderer.setSize(n,i),this._transparent&&this._renderer.setClearColor(0,0),this._renderer.setPixelRatio(a),this._ownCanvas=!t,t||(this._renderer.domElement.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._renderer.domElement)),this._clock=new il,this._quadCam=new uo(-1,1,1,-1,0,1);const r={minFilter:Zt,magFilter:Zt,format:kt,type:en},o=n*a,s=i*a;this._growTarget=new Ft(o,s,r),this._accumTarget=new Ft(o,s,r),this._prevTarget=new Ft(o,s,r),this._pathTarget=new Ft(151,3,{minFilter:cn,magFilter:cn,format:kt,type:Jt,depthBuffer:!1});const{ro:f,camMat:d,fov:m}=this._calcCamera();this._growUniforms={u_resolution:{value:new ht(o,s)},u_time:{value:0},u_ro:{value:f},u_camMat:{value:d},u_fov:{value:m},u_start:{value:new Ie},u_center:{value:new Ie},u_cho:{value:new Ie},u_end:{value:new Ie},u_jung:{value:new Ie},u_hubCenters:{value:[new Ie,new Ie]},u_connCount:{value:0},u_amp:{value:0},u_yangseong:{value:0},u_diphthong:{value:0},u_growT:{value:0},u_d3Displace:{value:this._d3Displace?1:0},u_glyphScale:{value:1},u_pathTex:{value:this._pathTarget.texture},u_usePathTex:{value:1}},this._growScene=this._makeQuadScene(Tn,S_,this._growUniforms);const{u_pathTex:c,...h}=this._growUniforms;this._pathScene=this._makeQuadScene(Tn,v_,h),this._accumUniforms={u_growTex:{value:this._growTarget.texture},u_bckbuffer:{value:this._prevTarget.texture},u_resolution:{value:new ht(o,s)},u_isFirst:{value:1}},this._accumScene=this._makeQuadScene(Tn,E_,this._accumUniforms),this._ghostTarget=new Ft(o,s,r),this._ghostTarget2=new Ft(o,s,r),this._dispUniforms={u_accumTex:{value:this._accumTarget.texture},u_ghostTex:{value:this._ghostTarget.texture},u_ghostT:{value:1},u_resolution:{value:new ht(o,s)}},this._dispScene=this._makeQuadScene(Tn,M_(this._transparent),this._dispUniforms),this._ghostUniforms={u_accumTex:{value:null},u_ghostTex:{value:null},u_ghostT:{value:1},u_resolution:{value:new ht(o,s)}},this._ghostScene=this._makeQuadScene(Tn,T_,this._ghostUniforms),this._shiftUniforms={u_src:{value:null},u_resolution:{value:new ht(o,s)},u_shift:{value:new ht}},this._shiftScene=this._makeQuadScene(Tn,A_,this._shiftUniforms),window.addEventListener("resize",this._onResize),this._raf=requestAnimationFrame(this._animate)}forceRebake(t,n){if(!t||n===0)return;const{starts:i,centers:a,chos:r,ends:o,jungs:s,amps:f,yangseong:d,diphthong:m}=t;this._curScale=t.scale??1,this._queue=[],this._growing=!1,this._isFirstGlyph=!0;for(let c=0;c<n;c++)this._queue.push(this._makeItem(i[c],a[c],r[c],o[c],s[c],f[c],d[c],m[c],!0));this._prevSylCount=n,this._dequeue()}update(t,n=0,i=null){if(!t)return;const{starts:a,centers:r,chos:o,ends:s,jungs:f,amps:d,yangseong:m,diphthong:c,confirmed:h}=t,p=this._prevSylCount;if(this._curScale=t.scale??1,n>=p&&(this._bakedCenters.some((S,u)=>u<p&&S.distanceToSquared(r[u])>1e-8)||p>0&&Math.abs(this._curScale-this._bakedScale)>1e-6)&&this._rebake(t,p),this._bakedCenters=r.slice(0,n).map(S=>S.clone()),this._bakedScale=this._curScale,n<p){this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._hubs=new Map,this._sylHubIds=[];for(let S=0;S<n;S++)this._queue.push(this._makeItem(a[S],r[S],o[S],s[S],f[S],d[S],m[S],c[S],!0))}else{for(let S=p;S<n;S++){S>0&&this._maybeRegisterHub(S-1,t);let u=[];if(i&&i[S]){const x=o[S].z>=.65,L=i[S-1],C=i[S],y=S>0&&!!L?.jong&&C.cho==="ㅇ",U=!!C.jong,v=[x,y,U].filter(Boolean).length,_=v>=2?2:v>=1?1:0;if(_>0){const w=this._pickHubTargets(_);u=w.map(P=>P.center),this._sylHubIds[S]=w.map(P=>P.id)}}const l=h?h[S]:!1,M=this._makeItem(a[S],r[S],o[S],s[S],f[S],d[S],m[S],c[S],l,u,u.length);M.syl=i?.[S]??null,this._queue.push(M)}n>p&&p>0&&this._growing&&(this._growUniforms.u_end.value.copy(s[p-1]),this._forceComplete=!0)}this._prevSylCount=n,this._growing||this._dequeue()}_maybeRegisterHub(t,n){const i=n.chos[t];if(i.y>=.75)return;const a=n.amps[t],r=new Ie((i.x-.5)*2,(i.y-.5)*2,(i.z-.5)*2).multiplyScalar(a*.6*(n.scale??1)),o=n.centers[t].clone().add(r);this._hubs.set(t,{id:t,center:o,connections:0})}_rebake(t,n){const{starts:i,centers:a,chos:r,ends:o,jungs:s,amps:f,yangseong:d,diphthong:m}=t;for(const[c,h]of this._hubs){const p=r[c],T=new Ie((p.x-.5)*2,(p.y-.5)*2,(p.z-.5)*2).multiplyScalar(f[c]*.6*(t.scale??1));h.center=a[c].clone().add(T)}this._queue=[],this._growing=!1,this._forceComplete=!1,this._isFirstGlyph=!0,this._rebaking=n>0;for(let c=0;c<n;c++){const h=(this._sylHubIds[c]??[]).map(p=>this._hubs.get(p)?.center).filter(Boolean);this._queue.push(this._makeItem(i[c],a[c],r[c],o[c],s[c],f[c],d[c],m[c],!0,h,h.length))}}_pickHubTargets(t){const n=[],i=new Set;for(let a=0;a<t;a++){const r=[...this._hubs.entries()].filter(([h])=>!i.has(h));if(r.length===0)break;const o=r.map(([,h])=>h.connections+1),s=o.reduce((h,p)=>h+p,0);let f=Math.random()*s,d=r[r.length-1];for(let h=0;h<r.length;h++)if(f-=o[h],f<=0){d=r[h];break}const[m,c]=d;c.connections++,i.add(m),n.push(c)}return n}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._growTarget?.dispose(),this._accumTarget?.dispose(),this._prevTarget?.dispose(),this._pathTarget?.dispose(),this._ghostTarget?.dispose(),this._ghostTarget2?.dispose(),this._renderer?.dispose();const t=this._renderer?.domElement;this._ownCanvas&&t?.parentNode&&t.parentNode.removeChild(t)}screenToWorld(t,n){const i=window.innerWidth,a=window.innerHeight,{ro:r,camMat:o,fov:s}=this._calcCamera(),f=new Ie((t*2-1)*(i/a),1-n*2,-s).applyMatrix3(o).normalize();return r.clone().addScaledVector(f,-r.z/f.z)}_toScreen(t){const n=window.innerWidth,i=window.innerHeight,{ro:a,camMat:r,fov:o}=this._calcCamera(),s=t.clone().sub(a).applyMatrix3(r.clone().transpose()),f=-s.z/o;return{u:(s.x/f/(n/i)+1)/2,v:(1-s.y/f)/2,t:f}}_shiftAtDepth(t,n,i=0){const{camMat:a}=this._calcCamera(),{t:r}=this._toScreen(t),o=window.innerWidth,s=window.innerHeight;return t.clone().add(new Ie(-2*n*(o/s)*r,2*i*r,0).applyMatrix3(a))}setScrollAxis(t){t!==this._scrollAxis&&(this._scrollAxis=t,this._scrollTarget=this._scrollPos=this._scrollBase=0,this._scrollJump=!0)}scrollTo(t){const n=Math.max(0,t)*this._renderer.getPixelRatio();if(this._scrollTarget=n,this._scrollJump||n<this._scrollPos){this._scrollJump=!1,this._scrollPos=n,this._scrollBase=Math.round(n);return}const i=window.innerWidth,a=window.innerHeight,r=this._scrollAxis==="y"?this._rect?a-(this._rect.y+this._rect.h):a*.1:this._rect?i-(this._rect.x+this._rect.w):i*.1,o=Math.max(1,r*.8*this._renderer.getPixelRatio()),s=Math.round(n-o)-this._scrollBase;s>0&&(this._shiftAccum(s),this._scrollPos=Math.max(this._scrollPos,this._scrollBase))}disperse(){const t=this._renderer,n=this._ghostUniforms;n.u_accumTex.value=this._accumTarget.texture,n.u_ghostTex.value=this._ghostTarget.texture,n.u_ghostT.value=this._dispUniforms.u_ghostT.value,t.setRenderTarget(this._ghostTarget2),t.render(this._ghostScene,this._quadCam),t.setRenderTarget(null),[this._ghostTarget,this._ghostTarget2]=[this._ghostTarget2,this._ghostTarget],this._dispUniforms.u_ghostTex.value=this._ghostTarget.texture,this._dispUniforms.u_ghostT.value=0,this._ghostStart=performance.now()}get scrollBase(){return this._scrollBase/(this._renderer?.getPixelRatio()??1)}get shownScrollBase(){return this._shownScrollBase/(this._renderer?.getPixelRatio()??1)}get rebaking(){return this._rebaking}setRect(t){this._rect=t}setD3Displace(t){this._d3Displace=!!t,this._growUniforms&&(this._growUniforms.u_d3Displace.value=this._d3Displace?1:0)}isIdle(){return!this._growing&&this._queue.length===0}finishGrowing(){(this._growing||this._queue.length>0)&&(this._forceFinish=!0)}flushQueue(){const t=n=>requestAnimationFrame(()=>requestAnimationFrame(n));return this.finishGrowing(),!this._growing&&this._queue.length===0?new Promise(t):new Promise(n=>{const i=()=>{!this._growing&&this._queue.length===0?t(n):requestAnimationFrame(i)};requestAnimationFrame(i)})}captureFrame(){const t=this._accumTarget.width,n=this._accumTarget.height,i=new Uint8Array(t*n*4);this._renderer.readRenderTargetPixels(this._accumTarget,0,0,t,n,i);const a=document.createElement("canvas");a.width=t,a.height=n;const r=a.getContext("2d"),o=r.createImageData(t,n);for(let s=0;s<n;s++){const f=(n-1-s)*t*4,d=s*t*4;o.data.set(i.subarray(f,f+t*4),d)}return r.putImageData(o,0,0),a.toDataURL("image/png")}clearAccum(){this._queue=[],this._growing=!1,this._forceFinish=!1,this._isFirstGlyph=!0,this._prevSylCount=0,this._hubs=new Map,this._sylHubIds=[],this._bakedCenters=[],this._scrollTarget=this._scrollPos=this._scrollBase=0,this._scrollJump=!0;const t=this._renderer.getClearColor(new lt),n=this._renderer.getClearAlpha();this._renderer.setClearColor(0,0),this._renderer.setRenderTarget(this._accumTarget),this._renderer.clear(),this._renderer.setRenderTarget(this._prevTarget),this._renderer.clear(),this._renderer.setRenderTarget(null),this._renderer.setClearColor(t,n)}_makeItem(t,n,i,a,r,o,s,f,d,m=[],c=0,h=this._curScale){return{scale:h,start:t.clone(),center:n.clone(),cho:i.clone(),end:a.clone(),jung:r.clone(),amp:o,yang:s,diph:f,instant:d,hubCenters:m.map(p=>p.clone()),connCount:c}}_bakePath(){const t=this._renderer.getRenderTarget();this._renderer.setRenderTarget(this._pathTarget),this._renderer.render(this._pathScene,this._quadCam),this._renderer.setRenderTarget(t)}_dequeue(){if(this._queue.length===0)return;const t=this._queue.shift(),n=this._growUniforms;n.u_start.value.copy(t.start),n.u_center.value.copy(t.center),n.u_cho.value.copy(t.cho),n.u_end.value.copy(t.end),n.u_jung.value.copy(t.jung),n.u_amp.value=t.amp,n.u_yangseong.value=t.yang,n.u_diphthong.value=t.diph,n.u_hubCenters.value[0].copy(t.hubCenters[0]??new Ie),n.u_hubCenters.value[1].copy(t.hubCenters[1]??new Ie),n.u_connCount.value=t.connCount??0,n.u_glyphScale.value=t.scale??1,this._bakePath(),n.u_growT.value=0,this._growStart=this._clock.getElapsedTime(),this._growing=!0,this._instantBake=t.instant,!t.instant&&t.syl&&this.onSyllableStart?.(t.syl)}_stepScroll(){if(this._scrollPos===this._scrollTarget)return;this._scrollPos+=(this._scrollTarget-this._scrollPos)*b_,Math.abs(this._scrollTarget-this._scrollPos)<.5&&(this._scrollPos=this._scrollTarget);const t=Math.round(this._scrollPos)-this._scrollBase;t>0&&this._shiftAccum(t)}_shiftAccum(t){const n=this._renderer,i=this._accumTarget,a=Math.floor(i.width),r=Math.floor(i.height);this._shiftUniforms.u_src.value=i.texture,this._shiftUniforms.u_resolution.value.set(a,r);const o=this._scrollAxis==="y";this._shiftUniforms.u_shift.value.set(o?0:t,o?-t:0),n.setRenderTarget(this._prevTarget),n.render(this._shiftScene,this._quadCam),n.setRenderTarget(null),this._accumTarget=this._prevTarget,this._prevTarget=i,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._scrollBase+=t;const s=o?0:t/(window.innerWidth*n.getPixelRatio()),f=o?t/(window.innerHeight*n.getPixelRatio()):0,d=c=>{const h=this._toScreen(c);return this.screenToWorld(h.u-s,h.v-f)},m=(c,h,p)=>{const T=d(h).sub(h);c.add(T),h.add(T);for(const S of p)S.copy(this._shiftAtDepth(S,s,f))};this._bakedCenters=this._bakedCenters.map(d);for(const c of this._hubs.values())c.center=this._shiftAtDepth(c.center,s,f);for(const c of this._queue)m(c.start,c.center,c.hubCenters);if(this._growing){const c=this._growUniforms;m(c.u_start.value,c.u_center.value,c.u_hubCenters.value.slice(0,c.u_connCount.value)),this._bakePath()}}_swapAndAccum(t){const n=this._prevTarget;this._prevTarget=this._accumTarget,this._accumTarget=n,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._accumUniforms.u_isFirst.value=t?1:0,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._renderer.setRenderTarget(this._accumTarget),this._renderer.render(this._accumScene,this._quadCam)}_animate=t=>{if(this._raf=requestAnimationFrame(this._animate),t-this._lastTime<this._FRAME_INTERVAL-4)return;if(this._lastTime=t,this._growUniforms.u_time.value=this._clock.getElapsedTime(),this._stepScroll(),this._ghostStart!==null){const i=(performance.now()-this._ghostStart)/x_;this._dispUniforms.u_ghostT.value=Math.min(1,i),i>=1&&(this._ghostStart=null)}if(!this._growing){if(this._queue.length)return;this._renderDisplay();return}let n;if(this._instantBake){n=1,this._growUniforms.u_growT.value=1,this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._growing=!1,requestAnimationFrame(()=>{this._growing||this._dequeue()});return}else{const i=this._growUniforms.u_growT.value;n=this._forceComplete||this._forceFinish?1:i+(1-i)*.08,this._forceComplete=!1,this._growUniforms.u_growT.value=n>=.98?1:n}this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._renderDisplay(),n>=1&&(this._growing=!1,this._dequeue(),this._forceFinish&&this._queue.length===0&&!this._growing&&(this._forceFinish=!1))};_renderDisplay(){this._renderer.setRenderTarget(null),this._renderer.render(this._dispScene,this._quadCam),this._shownScrollBase=this._scrollBase,this._rebaking=!1}_calcCamera(){const t=this._camPos.clone(),i=this._camTarget.clone().clone().sub(t).normalize(),a=new Ie(0,1,0),r=new Ie().crossVectors(i,a).normalize(),o=new Ie().crossVectors(r,i).normalize(),s=new $e().set(r.x,r.y,r.z,o.x,o.y,o.z,-i.x,-i.y,-i.z),f=1/Math.tan(al.degToRad(45)/2);return{ro:t,camMat:s,fov:f}}_makeQuadScene(t,n,i){const a=new rl;return a.add(new $t(new tr(2,2),new tn({uniforms:i,vertexShader:t,fragmentShader:n}))),a}_onResize=()=>{const t=window.innerWidth,n=window.innerHeight,i=this._renderer.getPixelRatio(),a=t*i,r=n*i;this._renderer.setSize(t,n),this._growTarget.setSize(a,r),this._accumTarget.setSize(a,r),this._prevTarget.setSize(a,r),this._ghostTarget.setSize(a,r),this._ghostTarget2.setSize(a,r),this._dispUniforms.u_ghostT.value=1,this._ghostStart=null;const o=new ht(a,r);this._growUniforms.u_resolution.value.copy(o),this._accumUniforms.u_resolution.value.copy(o),this._dispUniforms.u_resolution.value.copy(o),this._ghostUniforms.u_resolution.value.copy(o);const{ro:s,camMat:f,fov:d}=this._calcCamera();this._growUniforms.u_ro.value.copy(s),this._growUniforms.u_camMat.value.copy(f),this._growUniforms.u_fov.value=d,this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._scrollJump=!0}}const w_={sora:dl,signal:Ep,dandelion:__,mycelium:R_};class L_{constructor(t=null){this._canvas=t,this._current=null,this._name=null}async setReceiver(t,n={}){if(this._name===t)return;this._current&&(this._current.dispose(),this._current=null);const i=w_[t];if(!i)throw new Error(`Unknown receiver: ${t}`);if(this._canvas?.parentNode){const a=document.createElement("canvas");a.id=this._canvas.id,a.className=this._canvas.className,a.style.cssText=this._canvas.style.cssText,this._canvas.parentNode.replaceChild(a,this._canvas),this._canvas=a}this._current=new i(n),this._name=t,this._current.onSyllableStart=a=>this.onSyllableStart?.(a,t),await this._current.init(this._canvas)}update(...t){this._current?.update(...t)}get name(){return this._name}get current(){return this._current}dispose(){this._current?.dispose(),this._current=null,this._name=null}}function D_({enabled:e=!0}={}){let t=null,n=null;function i(){if(t)return t;const f=window.AudioContext||window.webkitAudioContext;if(!f)return null;t=new f;const d=t.createDynamicsCompressor();return d.threshold.value=-18,d.ratio.value=4,n=t.createGain(),n.gain.value=.6,n.connect(d).connect(t.destination),t}function a(){if(!e)return;const f=i();f&&f.state!=="running"&&f.resume().catch(()=>{})}let r=null;function o(f,d=null){if(!e||!f)return;const m=i();!m||m.state!=="running"||(r={h:y_(m,n,f,m.currentTime),syl:d})}function s(f){!r||!f||(C_(r.h,f.ending),r.syl={...r.syl,jong:f.jong})}return{play:o,endLast:s,unlock:a,get lastSyl(){return r?.syl??null},get state(){return t?.state??"none"}}}function y_(e,t,n,i){const a=e.createGain(),r=i+n.length+.05;a.gain.setValueAtTime(n.gain,i),a.gain.setValueAtTime(n.gain,r-.1),a.gain.linearRampToValueAtTime(0,r),a.connect(t);const o=n.ending,s={c:e,out:a,v:n,t0:i,tStop:r,modes:[],srcs:[]},f=[...n.noise??[]];o?.hiss&&f.push({...o.hiss,at:o.at-o.hiss.dur});for(const d of f)yo(e,a,d.center,d.q,i+d.at,d.dur,d.gain);for(const d of n.modes){const m=n.detune?[-n.detune/2,n.detune/2]:[0];for(const c of m){const h=e.createGain(),p=d.amp/m.length,T=i+n.attack;if(h.gain.setValueAtTime(0,i),h.gain.linearRampToValueAtTime(p,T),n.gate){const M=o?.type==="hum"?.3:o?.type==="choke"?.07:.12,b=i+Math.max(n.attack+.05,M);h.gain.setValueAtTime(p,b),h.gain.linearRampToValueAtTime(0,b+.01)}else h.gain.setTargetAtTime(0,T,d.tau),o?.type==="choke"&&h.gain.setTargetAtTime(0,i+o.at,o.tau),o?.type==="hum"&&h.gain.setTargetAtTime(0,i+o.at,d.tau*o.stretch);h.connect(a);const S=d.freq+c;let u,l;if(n.wave==="breath"){u=e.createBufferSource(),u.buffer=Co(e),u.loop=!0;const M=e.createBiquadFilter();M.type="bandpass",M.Q.value=n.q,l=M.frequency,u.connect(M);const b=e.createGain();b.gain.value=Math.sqrt(n.q)*1.5,M.connect(b).connect(h)}else if(u=e.createOscillator(),u.type=n.wave==="square"?"square":"sine",l=u.frequency,n.wave==="square"){const M=e.createBiquadFilter();M.type="lowpass",M.frequency.value=Math.min(S*4,12e3),u.connect(M).connect(h)}else u.connect(h);l.setValueAtTime(n.glide?S*n.glide.from:S,i),n.glide&&l.linearRampToValueAtTime(S,i+n.glide.dur),o?.type==="bend"&&(l.setValueAtTime(S,i+o.at),l.linearRampToValueAtTime(S*o.ratio,i+o.at+o.dur)),u.start(i),u.stop(r),s.srcs.push(u),s.modes.push({env:h,tau:d.tau,fParam:l,freq:S})}}return s.timer=setTimeout(()=>a.disconnect(),(r-e.currentTime+.2)*1e3),s}function C_(e,t){const{c:n,v:i}=e,a=n.currentTime;if(!(!t||a>e.tStop-.05)){if(t.type==="choke"){let r=a;t.hiss&&(yo(e.c,e.out,t.hiss.center,t.hiss.q,a,t.hiss.dur,t.hiss.gain),r=a+t.hiss.dur);for(const o of e.modes)ii(o.env.gain,r),o.env.gain.setTargetAtTime(0,r,t.tau)}else if(t.type==="bend")for(const r of e.modes)ii(r.fParam,a),r.fParam.linearRampToValueAtTime(r.freq*t.ratio,a+t.dur);else if(t.type==="hum"&&!i.gate){const r=Math.max(...e.modes.map(s=>s.tau)),o=Math.min(a+r*t.stretch*5,e.t0+4)+.05;for(const s of e.modes)ii(s.env.gain,a),s.env.gain.setTargetAtTime(0,a,s.tau*t.stretch);if(o>e.tStop){ii(e.out.gain,a),e.out.gain.setValueAtTime(i.gain,o-.1),e.out.gain.linearRampToValueAtTime(0,o);for(const s of e.srcs)s.stop(o);clearTimeout(e.timer),e.timer=setTimeout(()=>e.out.disconnect(),(o-a+.2)*1e3),e.tStop=o}}}}function ii(e,t){e.cancelAndHoldAtTime?e.cancelAndHoldAtTime(t):(e.cancelScheduledValues(t),e.setValueAtTime(e.value,t))}function yo(e,t,n,i,a,r,o){const s=e.createBufferSource();s.buffer=Co(e);const f=e.createBiquadFilter();f.type="bandpass",f.frequency.value=n,f.Q.value=i;const d=e.createGain(),m=Math.min(.003,r/3);d.gain.setValueAtTime(0,a),d.gain.linearRampToValueAtTime(o,a+m),d.gain.setValueAtTime(o,a+r-m),d.gain.linearRampToValueAtTime(0,a+r),s.connect(f).connect(d).connect(t),s.start(a),s.stop(a+r+.01)}const Ya=new WeakMap;function Co(e){let t=Ya.get(e);if(!t){t=e.createBuffer(1,e.sampleRate,e.sampleRate);const n=t.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;Ya.set(e,t)}return t}export{L_ as R,D_ as c};
