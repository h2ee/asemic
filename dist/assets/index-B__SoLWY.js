(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function e(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=e(r);fetch(r.href,s)}})();const me=9,na=.8,Oc=2.4,ia=2,ra=7,Bc=`#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`,zc=`#version 300 es
#ifdef GL_ES
precision highp float;
#endif
#define PI      3.14159265
#define MAX_SYL ${me}

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
`;function kc(n,t=.5){const e=ia-1,i=1+(n-250)/650*e;return Math.max(1,Math.min(ia,i+(t-.5)*.6))}function Hc(n){const t=ra-1;return Math.max(1,Math.min(ra,1+(n-580)/2020*t))}function sa(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),n.getShaderParameter(i,n.COMPILE_STATUS)?i:(console.error("[sora] Shader error:",n.getShaderInfoLog(i)),n.deleteShader(i),null)}function Gc(n,t,e){const i=sa(n,n.VERTEX_SHADER,t),r=sa(n,n.FRAGMENT_SHADER,e);if(!i||!r)return null;const s=n.createProgram();return n.attachShader(s,i),n.attachShader(s,r),n.linkProgram(s),n.getProgramParameter(s,n.LINK_STATUS)?s:(console.error("[sora] Link error:",n.getProgramInfoLog(s)),null)}class Vc{constructor(){this._canvas=null,this._gl=null,this._prog=null,this._locs={},this._raf=null,this._startT=performance.now(),this._ownCanvas=!1,this._cells=Array.from({length:me},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:me},()=>[2,3,.5,.33]),this._positions=Array.from({length:me},()=>[.5,.5]),this._radii=Array(me).fill(.1),this._morphStart=Array(me).fill(-999),this._waveStart=Array(me).fill(-999),this._f3Norms=Array(me).fill(.5),this._frozen=Array(me).fill(!1),this._wordPositions=new Map,this._wordRadii=new Map,this._rect=null,this.sylSize=150,this._sylCount=0,this._sminK=.06,this.lineHeightRatio=1.5}async init(t){t?this._canvas=t:(this._canvas=document.createElement("canvas"),this._canvas.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._canvas),this._ownCanvas=!0),this._resize(),window.addEventListener("resize",this._onResize);const e=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!e){console.error("[sora] WebGL2 not supported");return}if(this._gl=e,this._prog=Gc(e,Bc,zc),!this._prog)return;e.useProgram(this._prog),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA);const i=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),e.STATIC_DRAW);const r=e.getAttribLocation(this._prog,"position");e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),this._locs={res:e.getUniformLocation(this._prog,"u_resolution"),time:e.getUniformLocation(this._prog,"u_time"),count:e.getUniformLocation(this._prog,"u_sylCount"),sminK:e.getUniformLocation(this._prog,"u_sminK")};for(let s=0;s<me;s++)this._locs[`pos_${s}`]=e.getUniformLocation(this._prog,`u_pos[${s}]`),this._locs[`cell_${s}`]=e.getUniformLocation(this._prog,`u_cells[${s}]`),this._locs[`prev_${s}`]=e.getUniformLocation(this._prog,`u_prev[${s}]`),this._locs[`morph_${s}`]=e.getUniformLocation(this._prog,`u_morphT[${s}]`),this._locs[`wave_${s}`]=e.getUniformLocation(this._prog,`u_waveT[${s}]`),this._locs[`f3_${s}`]=e.getUniformLocation(this._prog,`u_f3Norm[${s}]`),this._locs[`rad_${s}`]=e.getUniformLocation(this._prog,`u_radii[${s}]`);this._raf=requestAnimationFrame(this._animate)}setRect(t){this._rect=t??null}_toRect(t,e){const i=this._rect;return i?[(i.x+t*i.w)/window.innerWidth,(i.y+e*i.h)/window.innerHeight]:[t,e]}update(t,e,i){if(!i)return;const r=(performance.now()-this._startT)/1e3,s=new Map;(t??[]).forEach((u,h)=>{const d=u.wordId??0;s.has(d)||s.set(d,[]),s.get(d).push({syl:u,pos:e[h]??[.5,.5]})});const o=[...s.keys()].sort((u,h)=>u-h),a=Math.min(o.length,me),l=.22,c=this._rect?this._rect.h/window.innerHeight:1,f=this.sylSize/550*c;for(const u of o)this._wordPositions.has(u)||this._wordPositions.set(u,this._toRect(l+Math.random()*(1-l*2),l+Math.random()*(1-l*2))),this._wordRadii.has(u)||this._wordRadii.set(u,f*(Math.random()*.75+.25));for(const u of this._wordPositions.keys())s.has(u)||(this._wordPositions.delete(u),this._wordRadii.delete(u));for(let u=0;u<a;u++){const h=o[u],d=s.get(h),_=d[d.length-1],g=o.some(w=>w>h);if(this._frozen[u]=g,this._positions[u]=this._wordPositions.get(h),this._radii[u]=this._wordRadii.get(h),g)continue;const m=i[_.syl.jung],p=i[_.syl.cho]?.cho;if(!m?.pos)continue;const[y,E]=m.pos,v=p?.pos?.[0]??.5,C=p?.pos?.[2]??.33,R=m.pos[2]??2500,b=Math.max(0,Math.min(1,(R-2080)/1120));this._f3Norms[u]=b;const L=[kc(y,v),Hc(E),v,C],x=this._cells[u];if(L.some((w,D)=>Math.abs(w-x[D])>.01)){const w=r-this._morphStart[u],D=Math.min(w/na,1),I=D<.5?2*D*D:-1+(4-2*D)*D,O=this._prevCells[u];this._prevCells[u]=x.map((W,B)=>O[B]+(W-O[B])*I),this._cells[u]=L,this._morphStart[u]=r,this._waveStart[u]=r}}this._sylCount=a;for(let u=a;u<me;u++)this._frozen[u]=!1}async flushQueue(){for(let t=0;t<me;t++)this._prevCells[t]=[...this._cells[t]],this._morphStart[t]=-999,this._waveStart[t]=-999;await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t)))}captureFrame(){return!this._gl||!this._canvas?null:(this._render(),this._canvas.toDataURL("image/png"))}clearAccum(){this._cells=Array.from({length:me},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:me},()=>[2,3,.5,.33]),this._positions=Array.from({length:me},()=>[.5,.5]),this._radii=Array(me).fill(.1),this._morphStart=Array(me).fill(-999),this._waveStart=Array(me).fill(-999),this._f3Norms=Array(me).fill(.5),this._frozen=Array(me).fill(!1),this._wordPositions.clear(),this._wordRadii.clear(),this._sylCount=0,this._render()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._gl&&this._prog&&this._gl.deleteProgram(this._prog),this._gl=null}_animate=()=>{this._raf=requestAnimationFrame(this._animate),this._render()};_render(){const t=this._gl;if(!t)return;const e=(performance.now()-this._startT)/1e3,i=this._locs;t.viewport(0,0,this._canvas.width,this._canvas.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.uniform2f(i.res,this._canvas.width,this._canvas.height),t.uniform1f(i.time,e),t.uniform1i(i.count,this._sylCount),t.uniform1f(i.sminK,this._sminK);for(let r=0;r<me;r++){const s=this._cells[r],o=this._prevCells[r],a=this._positions[r],l=Math.min((e-this._morphStart[r])/na,1),c=Math.min((e-this._waveStart[r])/Oc,1);t.uniform2f(i[`pos_${r}`],a[0],a[1]),t.uniform4f(i[`cell_${r}`],s[0],s[1],s[2],s[3]),t.uniform4f(i[`prev_${r}`],o[0],o[1],o[2],o[3]),t.uniform1f(i[`morph_${r}`],l),t.uniform1f(i[`wave_${r}`],c),t.uniform1f(i[`f3_${r}`],this._f3Norms[r]),t.uniform1f(i[`rad_${r}`],this._radii[r])}t.drawArrays(t.TRIANGLES,0,6)}_resize(){if(!this._canvas)return;const t=Math.min(window.devicePixelRatio,2);this._canvas.width=window.innerWidth*t,this._canvas.height=window.innerHeight*t}_onResize=()=>{this._resize()}}const wn=11102230246251565e-32,we=134217729,Wc=(3+8*wn)*wn;function ps(n,t,e,i,r){let s,o,a,l,c=t[0],f=i[0],u=0,h=0;f>c==f>-c?(s=c,c=t[++u]):(s=f,f=i[++h]);let d=0;if(u<n&&h<e)for(f>c==f>-c?(o=c+s,a=s-(o-c),c=t[++u]):(o=f+s,a=s-(o-f),f=i[++h]),s=o,a!==0&&(r[d++]=a);u<n&&h<e;)f>c==f>-c?(o=s+c,l=o-s,a=s-(o-l)+(c-l),c=t[++u]):(o=s+f,l=o-s,a=s-(o-l)+(f-l),f=i[++h]),s=o,a!==0&&(r[d++]=a);for(;u<n;)o=s+c,l=o-s,a=s-(o-l)+(c-l),c=t[++u],s=o,a!==0&&(r[d++]=a);for(;h<e;)o=s+f,l=o-s,a=s-(o-l)+(f-l),f=i[++h],s=o,a!==0&&(r[d++]=a);return(s!==0||d===0)&&(r[d++]=s),d}function Xc(n,t){let e=t[0];for(let i=1;i<n;i++)e+=t[i];return e}function lr(n){return new Float64Array(n)}const qc=(3+16*wn)*wn,Yc=(2+12*wn)*wn,jc=(9+64*wn)*wn*wn,ai=lr(4),oa=lr(8),aa=lr(12),la=lr(16),Ie=lr(4);function $c(n,t,e,i,r,s,o){let a,l,c,f,u,h,d,_,g,m,p,y,E,v,C,R,b,L;const x=n-r,S=e-r,w=t-s,D=i-s;v=x*D,h=we*x,d=h-(h-x),_=x-d,h=we*D,g=h-(h-D),m=D-g,C=_*m-(v-d*g-_*g-d*m),R=w*S,h=we*w,d=h-(h-w),_=w-d,h=we*S,g=h-(h-S),m=S-g,b=_*m-(R-d*g-_*g-d*m),p=C-b,u=C-p,ai[0]=C-(p+u)+(u-b),y=v+p,u=y-v,E=v-(y-u)+(p-u),p=E-R,u=E-p,ai[1]=E-(p+u)+(u-R),L=y+p,u=L-y,ai[2]=y-(L-u)+(p-u),ai[3]=L;let I=Xc(4,ai),O=Yc*o;if(I>=O||-I>=O||(u=n-x,a=n-(x+u)+(u-r),u=e-S,c=e-(S+u)+(u-r),u=t-w,l=t-(w+u)+(u-s),u=i-D,f=i-(D+u)+(u-s),a===0&&l===0&&c===0&&f===0)||(O=jc*o+Wc*Math.abs(I),I+=x*f+D*a-(w*c+S*l),I>=O||-I>=O))return I;v=a*D,h=we*a,d=h-(h-a),_=a-d,h=we*D,g=h-(h-D),m=D-g,C=_*m-(v-d*g-_*g-d*m),R=l*S,h=we*l,d=h-(h-l),_=l-d,h=we*S,g=h-(h-S),m=S-g,b=_*m-(R-d*g-_*g-d*m),p=C-b,u=C-p,Ie[0]=C-(p+u)+(u-b),y=v+p,u=y-v,E=v-(y-u)+(p-u),p=E-R,u=E-p,Ie[1]=E-(p+u)+(u-R),L=y+p,u=L-y,Ie[2]=y-(L-u)+(p-u),Ie[3]=L;const W=ps(4,ai,4,Ie,oa);v=x*f,h=we*x,d=h-(h-x),_=x-d,h=we*f,g=h-(h-f),m=f-g,C=_*m-(v-d*g-_*g-d*m),R=w*c,h=we*w,d=h-(h-w),_=w-d,h=we*c,g=h-(h-c),m=c-g,b=_*m-(R-d*g-_*g-d*m),p=C-b,u=C-p,Ie[0]=C-(p+u)+(u-b),y=v+p,u=y-v,E=v-(y-u)+(p-u),p=E-R,u=E-p,Ie[1]=E-(p+u)+(u-R),L=y+p,u=L-y,Ie[2]=y-(L-u)+(p-u),Ie[3]=L;const B=ps(W,oa,4,Ie,aa);v=a*f,h=we*a,d=h-(h-a),_=a-d,h=we*f,g=h-(h-f),m=f-g,C=_*m-(v-d*g-_*g-d*m),R=l*c,h=we*l,d=h-(h-l),_=l-d,h=we*c,g=h-(h-c),m=c-g,b=_*m-(R-d*g-_*g-d*m),p=C-b,u=C-p,Ie[0]=C-(p+u)+(u-b),y=v+p,u=y-v,E=v-(y-u)+(p-u),p=E-R,u=E-p,Ie[1]=E-(p+u)+(u-R),L=y+p,u=L-y,Ie[2]=y-(L-u)+(p-u),Ie[3]=L;const j=ps(B,aa,4,Ie,la);return la[j-1]}function _r(n,t,e,i,r,s){const o=(t-s)*(e-r),a=(n-r)*(i-s),l=o-a,c=Math.abs(o+a);return Math.abs(l)>=qc*c?l:-$c(n,t,e,i,r,s,c)}const ca=Math.pow(2,-52),gr=new Uint32Array(512);class ts{static from(t,e=tu,i=eu){const r=t.length,s=new Float64Array(r*2);for(let o=0;o<r;o++){const a=t[o];s[2*o]=e(a),s[2*o+1]=i(a)}return new ts(s)}constructor(t){const e=t.length>>1;if(e>0&&typeof t[0]!="number")throw new Error("Expected coords to contain numbers.");this.coords=t;const i=Math.max(2*e-5,0);this._triangles=new Uint32Array(i*3),this._halfedges=new Int32Array(i*3),this._hashSize=Math.ceil(Math.sqrt(e)),this._hullPrev=new Uint32Array(e),this._hullNext=new Uint32Array(e),this._hullTri=new Uint32Array(e),this._hullHash=new Int32Array(this._hashSize),this._ids=new Uint32Array(e),this._dists=new Float64Array(e),this.trianglesLen=0,this._cx=0,this._cy=0,this._hullStart=0,this.hull=this._triangles,this.triangles=this._triangles,this.halfedges=this._halfedges,this.update()}update(){const{coords:t,_hullPrev:e,_hullNext:i,_hullTri:r,_hullHash:s}=this,o=t.length>>1;let a=1/0,l=1/0,c=-1/0,f=-1/0;for(let x=0;x<o;x++){const S=t[2*x],w=t[2*x+1];S<a&&(a=S),w<l&&(l=w),S>c&&(c=S),w>f&&(f=w),this._ids[x]=x}const u=(a+c)/2,h=(l+f)/2;let d=0,_=0,g=0;for(let x=0,S=1/0;x<o;x++){const w=ms(u,h,t[2*x],t[2*x+1]);w<S&&(d=x,S=w)}const m=t[2*d],p=t[2*d+1];for(let x=0,S=1/0;x<o;x++){if(x===d)continue;const w=ms(m,p,t[2*x],t[2*x+1]);w<S&&w>0&&(_=x,S=w)}let y=t[2*_],E=t[2*_+1],v=1/0;for(let x=0;x<o;x++){if(x===d||x===_)continue;const S=Jc(m,p,y,E,t[2*x],t[2*x+1]);S<v&&(g=x,v=S)}let C=t[2*g],R=t[2*g+1];if(v===1/0){for(let w=0;w<o;w++)this._dists[w]=t[2*w]-t[0]||t[2*w+1]-t[1];Pi(this._ids,this._dists,0,o-1);const x=new Uint32Array(o);let S=0;for(let w=0,D=-1/0;w<o;w++){const I=this._ids[w],O=this._dists[I];O>D&&(x[S++]=I,D=O)}this.hull=x.subarray(0,S),this.triangles=new Uint32Array(0),this.halfedges=new Int32Array(0);return}if(_r(m,p,y,E,C,R)<0){const x=_,S=y,w=E;_=g,y=C,E=R,g=x,C=S,R=w}const b=Qc(m,p,y,E,C,R);this._cx=b.x,this._cy=b.y;for(let x=0;x<o;x++)this._dists[x]=ms(t[2*x],t[2*x+1],b.x,b.y);Pi(this._ids,this._dists,0,o-1),this._hullStart=d;let L=3;i[d]=e[g]=_,i[_]=e[d]=g,i[g]=e[_]=d,r[d]=0,r[_]=1,r[g]=2,s.fill(-1),s[this._hashKey(m,p)]=d,s[this._hashKey(y,E)]=_,s[this._hashKey(C,R)]=g,this.trianglesLen=0,this._addTriangle(d,_,g,-1,-1,-1);for(let x=0,S=0,w=0;x<this._ids.length;x++){const D=this._ids[x],I=t[2*D],O=t[2*D+1];if(x>0&&Math.abs(I-S)<=ca&&Math.abs(O-w)<=ca||(S=I,w=O,D===d||D===_||D===g))continue;let W=0;for(let st=0,xt=this._hashKey(I,O);st<this._hashSize&&(W=s[(xt+st)%this._hashSize],!(W!==-1&&W!==i[W]));st++);W=e[W];let B=W,j;for(;j=i[B],_r(I,O,t[2*B],t[2*B+1],t[2*j],t[2*j+1])>=0;)if(B=j,B===W){B=-1;break}if(B===-1)continue;let V=this._addTriangle(B,D,i[B],-1,-1,r[B]);r[D]=this._legalize(V+2),r[B]=V,L++;let it=i[B];for(;j=i[it],_r(I,O,t[2*it],t[2*it+1],t[2*j],t[2*j+1])<0;)V=this._addTriangle(it,D,j,r[D],-1,r[it]),r[D]=this._legalize(V+2),i[it]=it,L--,it=j;if(B===W)for(;j=e[B],_r(I,O,t[2*j],t[2*j+1],t[2*B],t[2*B+1])<0;)V=this._addTriangle(j,D,B,-1,r[B],r[j]),this._legalize(V+2),r[j]=V,i[B]=B,L--,B=j;this._hullStart=e[D]=B,i[B]=e[it]=D,i[D]=it,s[this._hashKey(I,O)]=D,s[this._hashKey(t[2*B],t[2*B+1])]=B}this.hull=new Uint32Array(L);for(let x=0,S=this._hullStart;x<L;x++)this.hull[x]=S,S=i[S];this.triangles=this._triangles.subarray(0,this.trianglesLen),this.halfedges=this._halfedges.subarray(0,this.trianglesLen)}_hashKey(t,e){return Math.floor(Kc(t-this._cx,e-this._cy)*this._hashSize)%this._hashSize}_legalize(t){const{_triangles:e,_halfedges:i,coords:r}=this;let s=0,o=0;for(;;){const a=i[t],l=t-t%3;if(o=l+(t+2)%3,a===-1){if(s===0)break;t=gr[--s];continue}const c=a-a%3,f=l+(t+1)%3,u=c+(a+2)%3,h=e[o],d=e[t],_=e[f],g=e[u];if(Zc(r[2*h],r[2*h+1],r[2*d],r[2*d+1],r[2*_],r[2*_+1],r[2*g],r[2*g+1])){e[t]=g,e[a]=h;const p=i[u];if(p===-1){let E=this._hullStart;do{if(this._hullTri[E]===u){this._hullTri[E]=t;break}E=this._hullPrev[E]}while(E!==this._hullStart)}this._link(t,p),this._link(a,i[o]),this._link(o,u);const y=c+(a+1)%3;s<gr.length&&(gr[s++]=y)}else{if(s===0)break;t=gr[--s]}}return o}_link(t,e){this._halfedges[t]=e,e!==-1&&(this._halfedges[e]=t)}_addTriangle(t,e,i,r,s,o){const a=this.trianglesLen;return this._triangles[a]=t,this._triangles[a+1]=e,this._triangles[a+2]=i,this._link(a,r),this._link(a+1,s),this._link(a+2,o),this.trianglesLen+=3,a}}function Kc(n,t){const e=n/(Math.abs(n)+Math.abs(t));return(t>0?3-e:1+e)/4}function ms(n,t,e,i){const r=n-e,s=t-i;return r*r+s*s}function Zc(n,t,e,i,r,s,o,a){const l=n-o,c=t-a,f=e-o,u=i-a,h=r-o,d=s-a,_=l*l+c*c,g=f*f+u*u,m=h*h+d*d;return l*(u*m-g*d)-c*(f*m-g*h)+_*(f*d-u*h)<0}function Jc(n,t,e,i,r,s){const o=e-n,a=i-t,l=r-n,c=s-t,f=o*o+a*a,u=l*l+c*c,h=.5/(o*c-a*l),d=(c*f-a*u)*h,_=(o*u-l*f)*h;return d*d+_*_}function Qc(n,t,e,i,r,s){const o=e-n,a=i-t,l=r-n,c=s-t,f=o*o+a*a,u=l*l+c*c,h=.5/(o*c-a*l),d=n+(c*f-a*u)*h,_=t+(o*u-l*f)*h;return{x:d,y:_}}function Pi(n,t,e,i){if(i-e<=20)for(let r=e+1;r<=i;r++){const s=n[r],o=t[s];let a=r-1;for(;a>=e&&t[n[a]]>o;)n[a+1]=n[a--];n[a+1]=s}else{const r=e+i>>1;let s=e+1,o=i;Xi(n,r,s),t[n[e]]>t[n[i]]&&Xi(n,e,i),t[n[s]]>t[n[i]]&&Xi(n,s,i),t[n[e]]>t[n[s]]&&Xi(n,e,s);const a=n[s],l=t[a];for(;;){do s++;while(t[n[s]]<l);do o--;while(t[n[o]]>l);if(o<s)break;Xi(n,s,o)}n[e+1]=n[o],n[o]=a,i-s+1>=o-e?(Pi(n,t,s,i),Pi(n,t,e,o-1)):(Pi(n,t,e,o-1),Pi(n,t,s,i))}}function Xi(n,t,e){const i=n[t];n[t]=n[e],n[e]=i}function tu(n){return n[0]}function eu(n){return n[1]}const ua=1e-6;class Jn{constructor(){this._x0=this._y0=this._x1=this._y1=null,this._=""}moveTo(t,e){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+e}`}closePath(){this._x1!==null&&(this._x1=this._x0,this._y1=this._y0,this._+="Z")}lineTo(t,e){this._+=`L${this._x1=+t},${this._y1=+e}`}arc(t,e,i){t=+t,e=+e,i=+i;const r=t+i,s=e;if(i<0)throw new Error("negative radius");this._x1===null?this._+=`M${r},${s}`:(Math.abs(this._x1-r)>ua||Math.abs(this._y1-s)>ua)&&(this._+="L"+r+","+s),i&&(this._+=`A${i},${i},0,1,1,${t-i},${e}A${i},${i},0,1,1,${this._x1=r},${this._y1=s}`)}rect(t,e,i,r){this._+=`M${this._x0=this._x1=+t},${this._y0=this._y1=+e}h${+i}v${+r}h${-i}Z`}value(){return this._||null}}class Ys{constructor(){this._=[]}moveTo(t,e){this._.push([t,e])}closePath(){this._.push(this._[0].slice())}lineTo(t,e){this._.push([t,e])}value(){return this._.length?this._:null}}class nu{constructor(t,[e,i,r,s]=[0,0,960,500]){if(!((r=+r)>=(e=+e))||!((s=+s)>=(i=+i)))throw new Error("invalid bounds");this.delaunay=t,this._circumcenters=new Float64Array(t.points.length*2),this.vectors=new Float64Array(t.points.length*2),this.xmax=r,this.xmin=e,this.ymax=s,this.ymin=i,this._init()}update(){return this.delaunay.update(),this._init(),this}_init(){const{delaunay:{points:t,hull:e,triangles:i},vectors:r}=this;let s,o;const a=this.circumcenters=this._circumcenters.subarray(0,i.length/3*2);for(let g=0,m=0,p=i.length,y,E;g<p;g+=3,m+=2){const v=i[g]*2,C=i[g+1]*2,R=i[g+2]*2,b=t[v],L=t[v+1],x=t[C],S=t[C+1],w=t[R],D=t[R+1],I=x-b,O=S-L,W=w-b,B=D-L,j=(I*B-O*W)*2;if(Math.abs(j)<1e-9){if(s===void 0){s=o=0;for(const it of e)s+=t[it*2],o+=t[it*2+1];s/=e.length,o/=e.length}const V=1e9*Math.sign((s-b)*B-(o-L)*W);y=(b+w)/2-V*B,E=(L+D)/2+V*W}else{const V=1/j,it=I*I+O*O,st=W*W+B*B;y=b+(B*it-O*st)*V,E=L+(I*st-W*it)*V}a[m]=y,a[m+1]=E}let l=e[e.length-1],c,f=l*4,u,h=t[2*l],d,_=t[2*l+1];r.fill(0);for(let g=0;g<e.length;++g)l=e[g],c=f,u=h,d=_,f=l*4,h=t[2*l],_=t[2*l+1],r[c+2]=r[f]=d-_,r[c+3]=r[f+1]=h-u}render(t){const e=t==null?t=new Jn:void 0,{delaunay:{halfedges:i,inedges:r,hull:s},circumcenters:o,vectors:a}=this;if(s.length<=1)return null;for(let f=0,u=i.length;f<u;++f){const h=i[f];if(h<f)continue;const d=Math.floor(f/3)*2,_=Math.floor(h/3)*2,g=o[d],m=o[d+1],p=o[_],y=o[_+1];this._renderSegment(g,m,p,y,t)}let l,c=s[s.length-1];for(let f=0;f<s.length;++f){l=c,c=s[f];const u=Math.floor(r[c]/3)*2,h=o[u],d=o[u+1],_=l*4,g=this._project(h,d,a[_+2],a[_+3]);g&&this._renderSegment(h,d,g[0],g[1],t)}return e&&e.value()}renderBounds(t){const e=t==null?t=new Jn:void 0;return t.rect(this.xmin,this.ymin,this.xmax-this.xmin,this.ymax-this.ymin),e&&e.value()}renderCell(t,e){const i=e==null?e=new Jn:void 0,r=this._clip(t);if(r===null||!r.length)return;e.moveTo(r[0],r[1]);let s=r.length;for(;r[0]===r[s-2]&&r[1]===r[s-1]&&s>1;)s-=2;for(let o=2;o<s;o+=2)(r[o]!==r[o-2]||r[o+1]!==r[o-1])&&e.lineTo(r[o],r[o+1]);return e.closePath(),i&&i.value()}*cellPolygons(){const{delaunay:{points:t}}=this;for(let e=0,i=t.length/2;e<i;++e){const r=this.cellPolygon(e);r&&(r.index=e,yield r)}}cellPolygon(t){const e=new Ys;return this.renderCell(t,e),e.value()}_renderSegment(t,e,i,r,s){let o;const a=this._regioncode(t,e),l=this._regioncode(i,r);a===0&&l===0?(s.moveTo(t,e),s.lineTo(i,r)):(o=this._clipSegment(t,e,i,r,a,l))&&(s.moveTo(o[0],o[1]),s.lineTo(o[2],o[3]))}contains(t,e,i){return e=+e,e!==e||(i=+i,i!==i)?!1:this.delaunay._step(t,e,i)===t}*neighbors(t){const e=this._clip(t);if(e)for(const i of this.delaunay.neighbors(t)){const r=this._clip(i);if(r){t:for(let s=0,o=e.length;s<o;s+=2)for(let a=0,l=r.length;a<l;a+=2)if(e[s]===r[a]&&e[s+1]===r[a+1]&&e[(s+2)%o]===r[(a+l-2)%l]&&e[(s+3)%o]===r[(a+l-1)%l]){yield i;break t}}}}_cell(t){const{circumcenters:e,delaunay:{inedges:i,halfedges:r,triangles:s}}=this,o=i[t];if(o===-1)return null;const a=[];let l=o;do{const c=Math.floor(l/3);if(a.push(e[c*2],e[c*2+1]),l=l%3===2?l-2:l+1,s[l]!==t)break;l=r[l]}while(l!==o&&l!==-1);return a}_clip(t){if(t===0&&this.delaunay.hull.length===1)return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];const e=this._cell(t);if(e===null)return null;const{vectors:i}=this,r=t*4;return this._simplify(i[r]||i[r+1]?this._clipInfinite(t,e,i[r],i[r+1],i[r+2],i[r+3]):this._clipFinite(t,e))}_clipFinite(t,e){const i=e.length;let r=null,s,o,a=e[i-2],l=e[i-1],c,f=this._regioncode(a,l),u,h=0;for(let d=0;d<i;d+=2)if(s=a,o=l,a=e[d],l=e[d+1],c=f,f=this._regioncode(a,l),c===0&&f===0)u=h,h=0,r?r.push(a,l):r=[a,l];else{let _,g,m,p,y;if(c===0){if((_=this._clipSegment(s,o,a,l,c,f))===null)continue;[g,m,p,y]=_}else{if((_=this._clipSegment(a,l,s,o,f,c))===null)continue;[p,y,g,m]=_,u=h,h=this._edgecode(g,m),u&&h&&this._edge(t,u,h,r,r.length),r?r.push(g,m):r=[g,m]}u=h,h=this._edgecode(p,y),u&&h&&this._edge(t,u,h,r,r.length),r?r.push(p,y):r=[p,y]}if(r)u=h,h=this._edgecode(r[0],r[1]),u&&h&&this._edge(t,u,h,r,r.length);else if(this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2))return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];return r}_clipSegment(t,e,i,r,s,o){const a=s<o;for(a&&([t,e,i,r,s,o]=[i,r,t,e,o,s]);;){if(s===0&&o===0)return a?[i,r,t,e]:[t,e,i,r];if(s&o)return null;let l,c,f=s||o;f&8?(l=t+(i-t)*(this.ymax-e)/(r-e),c=this.ymax):f&4?(l=t+(i-t)*(this.ymin-e)/(r-e),c=this.ymin):f&2?(c=e+(r-e)*(this.xmax-t)/(i-t),l=this.xmax):(c=e+(r-e)*(this.xmin-t)/(i-t),l=this.xmin),s?(t=l,e=c,s=this._regioncode(t,e)):(i=l,r=c,o=this._regioncode(i,r))}}_clipInfinite(t,e,i,r,s,o){let a=Array.from(e),l;if((l=this._project(a[0],a[1],i,r))&&a.unshift(l[0],l[1]),(l=this._project(a[a.length-2],a[a.length-1],s,o))&&a.push(l[0],l[1]),a=this._clipFinite(t,a))for(let c=0,f=a.length,u,h=this._edgecode(a[f-2],a[f-1]);c<f;c+=2)u=h,h=this._edgecode(a[c],a[c+1]),u&&h&&(c=this._edge(t,u,h,a,c),f=a.length);else this.contains(t,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2)&&(a=[this.xmin,this.ymin,this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax]);return a}_edge(t,e,i,r,s){for(;e!==i;){let o,a;switch(e){case 5:e=4;continue;case 4:e=6,o=this.xmax,a=this.ymin;break;case 6:e=2;continue;case 2:e=10,o=this.xmax,a=this.ymax;break;case 10:e=8;continue;case 8:e=9,o=this.xmin,a=this.ymax;break;case 9:e=1;continue;case 1:e=5,o=this.xmin,a=this.ymin;break}(r[s]!==o||r[s+1]!==a)&&this.contains(t,o,a)&&(r.splice(s,0,o,a),s+=2)}return s}_project(t,e,i,r){let s=1/0,o,a,l;if(r<0){if(e<=this.ymin)return null;(o=(this.ymin-e)/r)<s&&(l=this.ymin,a=t+(s=o)*i)}else if(r>0){if(e>=this.ymax)return null;(o=(this.ymax-e)/r)<s&&(l=this.ymax,a=t+(s=o)*i)}if(i>0){if(t>=this.xmax)return null;(o=(this.xmax-t)/i)<s&&(a=this.xmax,l=e+(s=o)*r)}else if(i<0){if(t<=this.xmin)return null;(o=(this.xmin-t)/i)<s&&(a=this.xmin,l=e+(s=o)*r)}return[a,l]}_edgecode(t,e){return(t===this.xmin?1:t===this.xmax?2:0)|(e===this.ymin?4:e===this.ymax?8:0)}_regioncode(t,e){return(t<this.xmin?1:t>this.xmax?2:0)|(e<this.ymin?4:e>this.ymax?8:0)}_simplify(t){if(t&&t.length>4){for(let e=0;e<t.length;e+=2){const i=(e+2)%t.length,r=(e+4)%t.length;(t[e]===t[i]&&t[i]===t[r]||t[e+1]===t[i+1]&&t[i+1]===t[r+1])&&(t.splice(i,2),e-=2)}t.length||(t=null)}return t}}const iu=2*Math.PI,li=Math.pow;function ru(n){return n[0]}function su(n){return n[1]}function ou(n){const{triangles:t,coords:e}=n;for(let i=0;i<t.length;i+=3){const r=2*t[i],s=2*t[i+1],o=2*t[i+2];if((e[o]-e[r])*(e[s+1]-e[r+1])-(e[s]-e[r])*(e[o+1]-e[r+1])>1e-10)return!1}return!0}function au(n,t,e){return[n+Math.sin(n+t)*e,t+Math.cos(n-t)*e]}class Oo{static from(t,e=ru,i=su,r){return new Oo("length"in t?lu(t,e,i,r):Float64Array.from(cu(t,e,i,r)))}constructor(t){this._delaunator=new ts(t),this.inedges=new Int32Array(t.length/2),this._hullIndex=new Int32Array(t.length/2),this.points=this._delaunator.coords,this._init()}update(){return this._delaunator.update(),this._init(),this}_init(){const t=this._delaunator,e=this.points;if(t.hull&&t.hull.length>2&&ou(t)){this.collinear=Int32Array.from({length:e.length/2},(h,d)=>d).sort((h,d)=>e[2*h]-e[2*d]||e[2*h+1]-e[2*d+1]);const l=this.collinear[0],c=this.collinear[this.collinear.length-1],f=[e[2*l],e[2*l+1],e[2*c],e[2*c+1]],u=1e-8*Math.hypot(f[3]-f[1],f[2]-f[0]);for(let h=0,d=e.length/2;h<d;++h){const _=au(e[2*h],e[2*h+1],u);e[2*h]=_[0],e[2*h+1]=_[1]}this._delaunator=new ts(e)}else delete this.collinear;const i=this.halfedges=this._delaunator.halfedges,r=this.hull=this._delaunator.hull,s=this.triangles=this._delaunator.triangles,o=this.inedges.fill(-1),a=this._hullIndex.fill(-1);for(let l=0,c=i.length;l<c;++l){const f=s[l%3===2?l-2:l+1];(i[l]===-1||o[f]===-1)&&(o[f]=l)}for(let l=0,c=r.length;l<c;++l)a[r[l]]=l;r.length<=2&&r.length>0&&(this.triangles=new Int32Array(3).fill(-1),this.halfedges=new Int32Array(3).fill(-1),this.triangles[0]=r[0],o[r[0]]=1,r.length===2&&(o[r[1]]=0,this.triangles[1]=r[1],this.triangles[2]=r[1]))}voronoi(t){return new nu(this,t)}*neighbors(t){const{inedges:e,hull:i,_hullIndex:r,halfedges:s,triangles:o,collinear:a}=this;if(a){const u=a.indexOf(t);u>0&&(yield a[u-1]),u<a.length-1&&(yield a[u+1]);return}const l=e[t];if(l===-1)return;let c=l,f=-1;do{if(yield f=o[c],c=c%3===2?c-2:c+1,o[c]!==t)return;if(c=s[c],c===-1){const u=i[(r[t]+1)%i.length];u!==f&&(yield u);return}}while(c!==l)}find(t,e,i=0){if(t=+t,t!==t||(e=+e,e!==e))return-1;const r=i;let s;for(;(s=this._step(i,t,e))>=0&&s!==i&&s!==r;)i=s;return s}_step(t,e,i){const{inedges:r,hull:s,_hullIndex:o,halfedges:a,triangles:l,points:c}=this;if(r[t]===-1||!c.length)return(t+1)%(c.length>>1);let f=t,u=li(e-c[t*2],2)+li(i-c[t*2+1],2);const h=r[t];let d=h;do{let _=l[d];const g=li(e-c[_*2],2)+li(i-c[_*2+1],2);if(g<u&&(u=g,f=_),d=d%3===2?d-2:d+1,l[d]!==t)break;if(d=a[d],d===-1){if(d=s[(o[t]+1)%s.length],d!==_&&li(e-c[d*2],2)+li(i-c[d*2+1],2)<u)return d;break}}while(d!==h);return f}render(t){const e=t==null?t=new Jn:void 0,{points:i,halfedges:r,triangles:s}=this;for(let o=0,a=r.length;o<a;++o){const l=r[o];if(l<o)continue;const c=s[o]*2,f=s[l]*2;t.moveTo(i[c],i[c+1]),t.lineTo(i[f],i[f+1])}return this.renderHull(t),e&&e.value()}renderPoints(t,e){e===void 0&&(!t||typeof t.moveTo!="function")&&(e=t,t=null),e=e==null?2:+e;const i=t==null?t=new Jn:void 0,{points:r}=this;for(let s=0,o=r.length;s<o;s+=2){const a=r[s],l=r[s+1];t.moveTo(a+e,l),t.arc(a,l,e,0,iu)}return i&&i.value()}renderHull(t){const e=t==null?t=new Jn:void 0,{hull:i,points:r}=this,s=i[0]*2,o=i.length;t.moveTo(r[s],r[s+1]);for(let a=1;a<o;++a){const l=2*i[a];t.lineTo(r[l],r[l+1])}return t.closePath(),e&&e.value()}hullPolygon(){const t=new Ys;return this.renderHull(t),t.value()}renderTriangle(t,e){const i=e==null?e=new Jn:void 0,{points:r,triangles:s}=this,o=s[t*=3]*2,a=s[t+1]*2,l=s[t+2]*2;return e.moveTo(r[o],r[o+1]),e.lineTo(r[a],r[a+1]),e.lineTo(r[l],r[l+1]),e.closePath(),i&&i.value()}*trianglePolygons(){const{triangles:t}=this;for(let e=0,i=t.length/3;e<i;++e)yield this.trianglePolygon(e)}trianglePolygon(t){const e=new Ys;return this.renderTriangle(t,e),e.value()}}function lu(n,t,e,i){const r=n.length,s=new Float64Array(r*2);for(let o=0;o<r;++o){const a=n[o];s[o*2]=t.call(i,a,o,n),s[o*2+1]=e.call(i,a,o,n)}return s}function*cu(n,t,e,i){let r=0;for(const s of n)yield t.call(i,s,r,n),yield e.call(i,s,r,n),++r}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Bo="175",uu=0,ha=1,hu=2,zl=1,fu=2,Tn=3,kn=0,ke=1,bn=2,Bn=0,Di=1,fa=2,da=3,pa=4,du=5,Kn=100,pu=101,mu=102,_u=103,gu=104,vu=200,xu=201,Su=202,Mu=203,js=204,$s=205,yu=206,Eu=207,Tu=208,bu=209,Au=210,wu=211,Ru=212,Cu=213,Pu=214,Ks=0,Zs=1,Js=2,Ui=3,Qs=4,to=5,eo=6,no=7,kl=0,Lu=1,Du=2,zn=0,Iu=1,Uu=2,Fu=3,Nu=4,Ou=5,Bu=6,zu=7,Hl=300,Fi=301,Ni=302,io=303,ro=304,cs=306,so=1e3,Qn=1001,oo=1002,je=1003,ku=1004,vr=1005,en=1006,_s=1007,ti=1008,_n=1009,Gl=1010,Vl=1011,er=1012,zo=1013,ii=1014,fn=1015,cr=1016,ko=1017,Ho=1018,nr=1020,Wl=35902,Xl=1021,ql=1022,Ye=1023,Yl=1024,jl=1025,ir=1026,rr=1027,$l=1028,Go=1029,Kl=1030,Vo=1031,Wo=1033,Xr=33776,qr=33777,Yr=33778,jr=33779,ao=35840,lo=35841,co=35842,uo=35843,ho=36196,fo=37492,po=37496,mo=37808,_o=37809,go=37810,vo=37811,xo=37812,So=37813,Mo=37814,yo=37815,Eo=37816,To=37817,bo=37818,Ao=37819,wo=37820,Ro=37821,$r=36492,Co=36494,Po=36495,Zl=36283,Lo=36284,Do=36285,Io=36286,Hu=3200,Gu=3201,Vu=0,Wu=1,On="",Qe="srgb",Oi="srgb-linear",es="linear",ae="srgb",ci=7680,ma=519,Xu=512,qu=513,Yu=514,Jl=515,ju=516,$u=517,Ku=518,Zu=519,_a=35044,ga="300 es",An=2e3,ns=2001;class Hi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){const i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){const i=this._listeners;if(i===void 0)return;const r=i[t];if(r!==void 0){const s=r.indexOf(e);s!==-1&&r.splice(s,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const i=e[t.type];if(i!==void 0){t.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,t);t.target=null}}}const Re=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let va=1234567;const Qi=Math.PI/180,sr=180/Math.PI;function Gi(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Re[n&255]+Re[n>>8&255]+Re[n>>16&255]+Re[n>>24&255]+"-"+Re[t&255]+Re[t>>8&255]+"-"+Re[t>>16&15|64]+Re[t>>24&255]+"-"+Re[e&63|128]+Re[e>>8&255]+"-"+Re[e>>16&255]+Re[e>>24&255]+Re[i&255]+Re[i>>8&255]+Re[i>>16&255]+Re[i>>24&255]).toLowerCase()}function qt(n,t,e){return Math.max(t,Math.min(e,n))}function Xo(n,t){return(n%t+t)%t}function Ju(n,t,e,i,r){return i+(n-t)*(r-i)/(e-t)}function Qu(n,t,e){return n!==t?(e-n)/(t-n):0}function tr(n,t,e){return(1-e)*n+e*t}function th(n,t,e,i){return tr(n,t,1-Math.exp(-e*i))}function eh(n,t=1){return t-Math.abs(Xo(n,t*2)-t)}function nh(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*(3-2*n))}function ih(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*n*(n*(n*6-15)+10))}function rh(n,t){return n+Math.floor(Math.random()*(t-n+1))}function sh(n,t){return n+Math.random()*(t-n)}function oh(n){return n*(.5-Math.random())}function ah(n){n!==void 0&&(va=n);let t=va+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function lh(n){return n*Qi}function ch(n){return n*sr}function uh(n){return(n&n-1)===0&&n!==0}function hh(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function fh(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function dh(n,t,e,i,r){const s=Math.cos,o=Math.sin,a=s(e/2),l=o(e/2),c=s((t+i)/2),f=o((t+i)/2),u=s((t-i)/2),h=o((t-i)/2),d=s((i-t)/2),_=o((i-t)/2);switch(r){case"XYX":n.set(a*f,l*u,l*h,a*c);break;case"YZY":n.set(l*h,a*f,l*u,a*c);break;case"ZXZ":n.set(l*u,l*h,a*f,a*c);break;case"XZX":n.set(a*f,l*_,l*d,a*c);break;case"YXY":n.set(l*d,a*f,l*_,a*c);break;case"ZYZ":n.set(l*_,l*d,a*f,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Ci(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Fe(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const ph={DEG2RAD:Qi,RAD2DEG:sr,generateUUID:Gi,clamp:qt,euclideanModulo:Xo,mapLinear:Ju,inverseLerp:Qu,lerp:tr,damp:th,pingpong:eh,smoothstep:nh,smootherstep:ih,randInt:rh,randFloat:sh,randFloatSpread:oh,seededRandom:ah,degToRad:lh,radToDeg:ch,isPowerOfTwo:uh,ceilPowerOfTwo:hh,floorPowerOfTwo:fh,setQuaternionFromProperEuler:dh,normalize:Fe,denormalize:Ci};class Zt{constructor(t=0,e=0){Zt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6],this.y=r[1]*e+r[4]*i+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=qt(this.x,t.x,e.x),this.y=qt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=qt(this.x,t,e),this.y=qt(this.y,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(qt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(qt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),r=Math.sin(e),s=this.x-t.x,o=this.y-t.y;return this.x=s*i-o*r+t.x,this.y=s*r+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class zt{constructor(t,e,i,r,s,o,a,l,c){zt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,r,s,o,a,l,c)}set(t,e,i,r,s,o,a,l,c){const f=this.elements;return f[0]=t,f[1]=r,f[2]=a,f[3]=e,f[4]=s,f[5]=l,f[6]=i,f[7]=o,f[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,r=e.elements,s=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],f=i[4],u=i[7],h=i[2],d=i[5],_=i[8],g=r[0],m=r[3],p=r[6],y=r[1],E=r[4],v=r[7],C=r[2],R=r[5],b=r[8];return s[0]=o*g+a*y+l*C,s[3]=o*m+a*E+l*R,s[6]=o*p+a*v+l*b,s[1]=c*g+f*y+u*C,s[4]=c*m+f*E+u*R,s[7]=c*p+f*v+u*b,s[2]=h*g+d*y+_*C,s[5]=h*m+d*E+_*R,s[8]=h*p+d*v+_*b,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],f=t[8];return e*o*f-e*a*c-i*s*f+i*a*l+r*s*c-r*o*l}invert(){const t=this.elements,e=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],f=t[8],u=f*o-a*c,h=a*l-f*s,d=c*s-o*l,_=e*u+i*h+r*d;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/_;return t[0]=u*g,t[1]=(r*c-f*i)*g,t[2]=(a*i-r*o)*g,t[3]=h*g,t[4]=(f*e-r*l)*g,t[5]=(r*s-a*e)*g,t[6]=d*g,t[7]=(i*l-c*e)*g,t[8]=(o*e-i*s)*g,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*o+c*a)+o+t,-r*c,r*l,-r*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(gs.makeScale(t,e)),this}rotate(t){return this.premultiply(gs.makeRotation(-t)),this}translate(t,e){return this.premultiply(gs.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let r=0;r<9;r++)if(e[r]!==i[r])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const gs=new zt;function Ql(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function is(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function mh(){const n=is("canvas");return n.style.display="block",n}const xa={};function Kr(n){n in xa||(xa[n]=!0,console.warn(n))}function _h(n,t,e){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,e);break;default:i()}}setTimeout(s,e)})}function gh(n){const t=n.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function vh(n){const t=n.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const Sa=new zt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ma=new zt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function xh(){const n={enabled:!0,workingColorSpace:Oi,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===ae&&(r.r=Rn(r.r),r.g=Rn(r.g),r.b=Rn(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ae&&(r.r=Ii(r.r),r.g=Ii(r.g),r.b=Ii(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===On?es:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[Oi]:{primaries:t,whitePoint:i,transfer:es,toXYZ:Sa,fromXYZ:Ma,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Qe},outputColorSpaceConfig:{drawingBufferColorSpace:Qe}},[Qe]:{primaries:t,whitePoint:i,transfer:ae,toXYZ:Sa,fromXYZ:Ma,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Qe}}}),n}const Qt=xh();function Rn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Ii(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let ui;class Sh{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{ui===void 0&&(ui=is("canvas")),ui.width=t.width,ui.height=t.height;const r=ui.getContext("2d");t instanceof ImageData?r.putImageData(t,0,0):r.drawImage(t,0,0,t.width,t.height),i=ui}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=is("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const r=i.getImageData(0,0,t.width,t.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Rn(s[o]/255)*255;return i.putImageData(r,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(Rn(e[i]/255)*255):e[i]=Rn(e[i]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Mh=0;class qo{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Mh++}),this.uuid=Gi(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(vs(r[o].image)):s.push(vs(r[o]))}else s=vs(r);i.url=s}return e||(t.images[this.uuid]=i),i}}function vs(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Sh.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let yh=0;class He extends Hi{constructor(t=He.DEFAULT_IMAGE,e=He.DEFAULT_MAPPING,i=Qn,r=Qn,s=en,o=ti,a=Ye,l=_n,c=He.DEFAULT_ANISOTROPY,f=On){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:yh++}),this.uuid=Gi(),this.name="",this.source=new qo(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Zt(0,0),this.repeat=new Zt(1,1),this.center=new Zt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new zt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=f,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Hl)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case so:t.x=t.x-Math.floor(t.x);break;case Qn:t.x=t.x<0?0:1;break;case oo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case so:t.y=t.y-Math.floor(t.y);break;case Qn:t.y=t.y<0?0:1;break;case oo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}He.DEFAULT_IMAGE=null;He.DEFAULT_MAPPING=Hl;He.DEFAULT_ANISOTROPY=1;class _e{constructor(t=0,e=0,i=0,r=1){_e.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,r){return this.x=t,this.y=e,this.z=i,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,r=this.z,s=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*e+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*e+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*e+o[7]*i+o[11]*r+o[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,r,s;const l=t.elements,c=l[0],f=l[4],u=l[8],h=l[1],d=l[5],_=l[9],g=l[2],m=l[6],p=l[10];if(Math.abs(f-h)<.01&&Math.abs(u-g)<.01&&Math.abs(_-m)<.01){if(Math.abs(f+h)<.1&&Math.abs(u+g)<.1&&Math.abs(_+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const E=(c+1)/2,v=(d+1)/2,C=(p+1)/2,R=(f+h)/4,b=(u+g)/4,L=(_+m)/4;return E>v&&E>C?E<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(E),r=R/i,s=b/i):v>C?v<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),i=R/r,s=L/r):C<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(C),i=b/s,r=L/s),this.set(i,r,s,e),this}let y=Math.sqrt((m-_)*(m-_)+(u-g)*(u-g)+(h-f)*(h-f));return Math.abs(y)<.001&&(y=1),this.x=(m-_)/y,this.y=(u-g)/y,this.z=(h-f)/y,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=qt(this.x,t.x,e.x),this.y=qt(this.y,t.y,e.y),this.z=qt(this.z,t.z,e.z),this.w=qt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=qt(this.x,t,e),this.y=qt(this.y,t,e),this.z=qt(this.z,t,e),this.w=qt(this.w,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(qt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Eh extends Hi{constructor(t=1,e=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new _e(0,0,t,e),this.scissorTest=!1,this.viewport=new _e(0,0,t,e);const r={width:t,height:e,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:en,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new He(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=e,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const r=Object.assign({},t.textures[e].image);this.textures[e].source=new qo(r)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Xe extends Eh{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class tc extends He{constructor(t=null,e=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:r},this.magFilter=je,this.minFilter=je,this.wrapR=Qn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Th extends He{constructor(t=null,e=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:r},this.magFilter=je,this.minFilter=je,this.wrapR=Qn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ur{constructor(t=0,e=0,i=0,r=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=r}static slerpFlat(t,e,i,r,s,o,a){let l=i[r+0],c=i[r+1],f=i[r+2],u=i[r+3];const h=s[o+0],d=s[o+1],_=s[o+2],g=s[o+3];if(a===0){t[e+0]=l,t[e+1]=c,t[e+2]=f,t[e+3]=u;return}if(a===1){t[e+0]=h,t[e+1]=d,t[e+2]=_,t[e+3]=g;return}if(u!==g||l!==h||c!==d||f!==_){let m=1-a;const p=l*h+c*d+f*_+u*g,y=p>=0?1:-1,E=1-p*p;if(E>Number.EPSILON){const C=Math.sqrt(E),R=Math.atan2(C,p*y);m=Math.sin(m*R)/C,a=Math.sin(a*R)/C}const v=a*y;if(l=l*m+h*v,c=c*m+d*v,f=f*m+_*v,u=u*m+g*v,m===1-a){const C=1/Math.sqrt(l*l+c*c+f*f+u*u);l*=C,c*=C,f*=C,u*=C}}t[e]=l,t[e+1]=c,t[e+2]=f,t[e+3]=u}static multiplyQuaternionsFlat(t,e,i,r,s,o){const a=i[r],l=i[r+1],c=i[r+2],f=i[r+3],u=s[o],h=s[o+1],d=s[o+2],_=s[o+3];return t[e]=a*_+f*u+l*d-c*h,t[e+1]=l*_+f*h+c*u-a*d,t[e+2]=c*_+f*d+a*h-l*u,t[e+3]=f*_-a*u-l*h-c*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,r){return this._x=t,this._y=e,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,r=t._y,s=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(i/2),f=a(r/2),u=a(s/2),h=l(i/2),d=l(r/2),_=l(s/2);switch(o){case"XYZ":this._x=h*f*u+c*d*_,this._y=c*d*u-h*f*_,this._z=c*f*_+h*d*u,this._w=c*f*u-h*d*_;break;case"YXZ":this._x=h*f*u+c*d*_,this._y=c*d*u-h*f*_,this._z=c*f*_-h*d*u,this._w=c*f*u+h*d*_;break;case"ZXY":this._x=h*f*u-c*d*_,this._y=c*d*u+h*f*_,this._z=c*f*_+h*d*u,this._w=c*f*u-h*d*_;break;case"ZYX":this._x=h*f*u-c*d*_,this._y=c*d*u+h*f*_,this._z=c*f*_-h*d*u,this._w=c*f*u+h*d*_;break;case"YZX":this._x=h*f*u+c*d*_,this._y=c*d*u+h*f*_,this._z=c*f*_-h*d*u,this._w=c*f*u-h*d*_;break;case"XZY":this._x=h*f*u-c*d*_,this._y=c*d*u-h*f*_,this._z=c*f*_+h*d*u,this._w=c*f*u+h*d*_;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,r=Math.sin(i);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],r=e[4],s=e[8],o=e[1],a=e[5],l=e[9],c=e[2],f=e[6],u=e[10],h=i+a+u;if(h>0){const d=.5/Math.sqrt(h+1);this._w=.25/d,this._x=(f-l)*d,this._y=(s-c)*d,this._z=(o-r)*d}else if(i>a&&i>u){const d=2*Math.sqrt(1+i-a-u);this._w=(f-l)/d,this._x=.25*d,this._y=(r+o)/d,this._z=(s+c)/d}else if(a>u){const d=2*Math.sqrt(1+a-i-u);this._w=(s-c)/d,this._x=(r+o)/d,this._y=.25*d,this._z=(l+f)/d}else{const d=2*Math.sqrt(1+u-i-a);this._w=(o-r)/d,this._x=(s+c)/d,this._y=(l+f)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(qt(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const r=Math.min(1,e/i);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,r=t._y,s=t._z,o=t._w,a=e._x,l=e._y,c=e._z,f=e._w;return this._x=i*f+o*a+r*c-s*l,this._y=r*f+o*l+s*a-i*c,this._z=s*f+o*c+i*l-r*a,this._w=o*f-i*a-r*l-s*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*t._w+i*t._x+r*t._y+s*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const d=1-e;return this._w=d*o+e*this._w,this._x=d*i+e*this._x,this._y=d*r+e*this._y,this._z=d*s+e*this._z,this.normalize(),this}const c=Math.sqrt(l),f=Math.atan2(c,a),u=Math.sin((1-e)*f)/c,h=Math.sin(e*f)/c;return this._w=o*u+this._w*h,this._x=i*u+this._x*h,this._y=r*u+this._y*h,this._z=s*u+this._z*h,this._onChangeCallback(),this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(e),s*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class k{constructor(t=0,e=0,i=0){k.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(ya.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(ya.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6]*r,this.y=s[1]*e+s[4]*i+s[7]*r,this.z=s[2]*e+s[5]*i+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,r=this.z,s=t.elements,o=1/(s[3]*e+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*e+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*e+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*e+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(t){const e=this.x,i=this.y,r=this.z,s=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*r-a*i),f=2*(a*e-s*r),u=2*(s*i-o*e);return this.x=e+l*c+o*u-a*f,this.y=i+l*f+a*c-s*u,this.z=r+l*u+s*f-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[4]*i+s[8]*r,this.y=s[1]*e+s[5]*i+s[9]*r,this.z=s[2]*e+s[6]*i+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=qt(this.x,t.x,e.x),this.y=qt(this.y,t.y,e.y),this.z=qt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=qt(this.x,t,e),this.y=qt(this.y,t,e),this.z=qt(this.z,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(qt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,r=t.y,s=t.z,o=e.x,a=e.y,l=e.z;return this.x=r*l-s*a,this.y=s*o-i*l,this.z=i*a-r*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return xs.copy(this).projectOnVector(t),this.sub(xs)}reflect(t){return this.sub(xs.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(qt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,r=this.z-t.z;return e*e+i*i+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const r=Math.sin(e)*t;return this.x=r*Math.sin(i),this.y=Math.cos(e)*t,this.z=r*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=r,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const xs=new k,ya=new ur;class hr{constructor(t=new k(1/0,1/0,1/0),e=new k(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(sn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(sn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=sn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const s=i.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,sn):sn.fromBufferAttribute(s,o),sn.applyMatrix4(t.matrixWorld),this.expandByPoint(sn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),xr.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),xr.copy(i.boundingBox)),xr.applyMatrix4(t.matrixWorld),this.union(xr)}const r=t.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,sn),sn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(qi),Sr.subVectors(this.max,qi),hi.subVectors(t.a,qi),fi.subVectors(t.b,qi),di.subVectors(t.c,qi),Ln.subVectors(fi,hi),Dn.subVectors(di,fi),Gn.subVectors(hi,di);let e=[0,-Ln.z,Ln.y,0,-Dn.z,Dn.y,0,-Gn.z,Gn.y,Ln.z,0,-Ln.x,Dn.z,0,-Dn.x,Gn.z,0,-Gn.x,-Ln.y,Ln.x,0,-Dn.y,Dn.x,0,-Gn.y,Gn.x,0];return!Ss(e,hi,fi,di,Sr)||(e=[1,0,0,0,1,0,0,0,1],!Ss(e,hi,fi,di,Sr))?!1:(Mr.crossVectors(Ln,Dn),e=[Mr.x,Mr.y,Mr.z],Ss(e,hi,fi,di,Sr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,sn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(sn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(xn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const xn=[new k,new k,new k,new k,new k,new k,new k,new k],sn=new k,xr=new hr,hi=new k,fi=new k,di=new k,Ln=new k,Dn=new k,Gn=new k,qi=new k,Sr=new k,Mr=new k,Vn=new k;function Ss(n,t,e,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){Vn.fromArray(n,s);const a=r.x*Math.abs(Vn.x)+r.y*Math.abs(Vn.y)+r.z*Math.abs(Vn.z),l=t.dot(Vn),c=e.dot(Vn),f=i.dot(Vn);if(Math.max(-Math.max(l,c,f),Math.min(l,c,f))>a)return!1}return!0}const bh=new hr,Yi=new k,Ms=new k;class Yo{constructor(t=new k,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):bh.setFromPoints(t).getCenter(i);let r=0;for(let s=0,o=t.length;s<o;s++)r=Math.max(r,i.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Yi.subVectors(t,this.center);const e=Yi.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),r=(i-this.radius)*.5;this.center.addScaledVector(Yi,r/i),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Ms.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Yi.copy(t.center).add(Ms)),this.expandByPoint(Yi.copy(t.center).sub(Ms))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Sn=new k,ys=new k,yr=new k,In=new k,Es=new k,Er=new k,Ts=new k;class Ah{constructor(t=new k,e=new k(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Sn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Sn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Sn.copy(this.origin).addScaledVector(this.direction,e),Sn.distanceToSquared(t))}distanceSqToSegment(t,e,i,r){ys.copy(t).add(e).multiplyScalar(.5),yr.copy(e).sub(t).normalize(),In.copy(this.origin).sub(ys);const s=t.distanceTo(e)*.5,o=-this.direction.dot(yr),a=In.dot(this.direction),l=-In.dot(yr),c=In.lengthSq(),f=Math.abs(1-o*o);let u,h,d,_;if(f>0)if(u=o*l-a,h=o*a-l,_=s*f,u>=0)if(h>=-_)if(h<=_){const g=1/f;u*=g,h*=g,d=u*(u+o*h+2*a)+h*(o*u+h+2*l)+c}else h=s,u=Math.max(0,-(o*h+a)),d=-u*u+h*(h+2*l)+c;else h=-s,u=Math.max(0,-(o*h+a)),d=-u*u+h*(h+2*l)+c;else h<=-_?(u=Math.max(0,-(-o*s+a)),h=u>0?-s:Math.min(Math.max(-s,-l),s),d=-u*u+h*(h+2*l)+c):h<=_?(u=0,h=Math.min(Math.max(-s,-l),s),d=h*(h+2*l)+c):(u=Math.max(0,-(o*s+a)),h=u>0?s:Math.min(Math.max(-s,-l),s),d=-u*u+h*(h+2*l)+c);else h=o>0?-s:s,u=Math.max(0,-(o*h+a)),d=-u*u+h*(h+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(ys).addScaledVector(yr,h),d}intersectSphere(t,e){Sn.subVectors(t.center,this.origin);const i=Sn.dot(this.direction),r=Sn.dot(Sn)-i*i,s=t.radius*t.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,r,s,o,a,l;const c=1/this.direction.x,f=1/this.direction.y,u=1/this.direction.z,h=this.origin;return c>=0?(i=(t.min.x-h.x)*c,r=(t.max.x-h.x)*c):(i=(t.max.x-h.x)*c,r=(t.min.x-h.x)*c),f>=0?(s=(t.min.y-h.y)*f,o=(t.max.y-h.y)*f):(s=(t.max.y-h.y)*f,o=(t.min.y-h.y)*f),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),u>=0?(a=(t.min.z-h.z)*u,l=(t.max.z-h.z)*u):(a=(t.max.z-h.z)*u,l=(t.min.z-h.z)*u),i>l||a>r)||((a>i||i!==i)&&(i=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,e)}intersectsBox(t){return this.intersectBox(t,Sn)!==null}intersectTriangle(t,e,i,r,s){Es.subVectors(e,t),Er.subVectors(i,t),Ts.crossVectors(Es,Er);let o=this.direction.dot(Ts),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;In.subVectors(this.origin,t);const l=a*this.direction.dot(Er.crossVectors(In,Er));if(l<0)return null;const c=a*this.direction.dot(Es.cross(In));if(c<0||l+c>o)return null;const f=-a*In.dot(Ts);return f<0?null:this.at(f/o,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class xe{constructor(t,e,i,r,s,o,a,l,c,f,u,h,d,_,g,m){xe.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,r,s,o,a,l,c,f,u,h,d,_,g,m)}set(t,e,i,r,s,o,a,l,c,f,u,h,d,_,g,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=i,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=f,p[10]=u,p[14]=h,p[3]=d,p[7]=_,p[11]=g,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new xe().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,i=t.elements,r=1/pi.setFromMatrixColumn(t,0).length(),s=1/pi.setFromMatrixColumn(t,1).length(),o=1/pi.setFromMatrixColumn(t,2).length();return e[0]=i[0]*r,e[1]=i[1]*r,e[2]=i[2]*r,e[3]=0,e[4]=i[4]*s,e[5]=i[5]*s,e[6]=i[6]*s,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,r=t.y,s=t.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(r),c=Math.sin(r),f=Math.cos(s),u=Math.sin(s);if(t.order==="XYZ"){const h=o*f,d=o*u,_=a*f,g=a*u;e[0]=l*f,e[4]=-l*u,e[8]=c,e[1]=d+_*c,e[5]=h-g*c,e[9]=-a*l,e[2]=g-h*c,e[6]=_+d*c,e[10]=o*l}else if(t.order==="YXZ"){const h=l*f,d=l*u,_=c*f,g=c*u;e[0]=h+g*a,e[4]=_*a-d,e[8]=o*c,e[1]=o*u,e[5]=o*f,e[9]=-a,e[2]=d*a-_,e[6]=g+h*a,e[10]=o*l}else if(t.order==="ZXY"){const h=l*f,d=l*u,_=c*f,g=c*u;e[0]=h-g*a,e[4]=-o*u,e[8]=_+d*a,e[1]=d+_*a,e[5]=o*f,e[9]=g-h*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const h=o*f,d=o*u,_=a*f,g=a*u;e[0]=l*f,e[4]=_*c-d,e[8]=h*c+g,e[1]=l*u,e[5]=g*c+h,e[9]=d*c-_,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const h=o*l,d=o*c,_=a*l,g=a*c;e[0]=l*f,e[4]=g-h*u,e[8]=_*u+d,e[1]=u,e[5]=o*f,e[9]=-a*f,e[2]=-c*f,e[6]=d*u+_,e[10]=h-g*u}else if(t.order==="XZY"){const h=o*l,d=o*c,_=a*l,g=a*c;e[0]=l*f,e[4]=-u,e[8]=c*f,e[1]=h*u+g,e[5]=o*f,e[9]=d*u-_,e[2]=_*u-d,e[6]=a*f,e[10]=g*u+h}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(wh,t,Rh)}lookAt(t,e,i){const r=this.elements;return Ve.subVectors(t,e),Ve.lengthSq()===0&&(Ve.z=1),Ve.normalize(),Un.crossVectors(i,Ve),Un.lengthSq()===0&&(Math.abs(i.z)===1?Ve.x+=1e-4:Ve.z+=1e-4,Ve.normalize(),Un.crossVectors(i,Ve)),Un.normalize(),Tr.crossVectors(Ve,Un),r[0]=Un.x,r[4]=Tr.x,r[8]=Ve.x,r[1]=Un.y,r[5]=Tr.y,r[9]=Ve.y,r[2]=Un.z,r[6]=Tr.z,r[10]=Ve.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,r=e.elements,s=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],f=i[1],u=i[5],h=i[9],d=i[13],_=i[2],g=i[6],m=i[10],p=i[14],y=i[3],E=i[7],v=i[11],C=i[15],R=r[0],b=r[4],L=r[8],x=r[12],S=r[1],w=r[5],D=r[9],I=r[13],O=r[2],W=r[6],B=r[10],j=r[14],V=r[3],it=r[7],st=r[11],xt=r[15];return s[0]=o*R+a*S+l*O+c*V,s[4]=o*b+a*w+l*W+c*it,s[8]=o*L+a*D+l*B+c*st,s[12]=o*x+a*I+l*j+c*xt,s[1]=f*R+u*S+h*O+d*V,s[5]=f*b+u*w+h*W+d*it,s[9]=f*L+u*D+h*B+d*st,s[13]=f*x+u*I+h*j+d*xt,s[2]=_*R+g*S+m*O+p*V,s[6]=_*b+g*w+m*W+p*it,s[10]=_*L+g*D+m*B+p*st,s[14]=_*x+g*I+m*j+p*xt,s[3]=y*R+E*S+v*O+C*V,s[7]=y*b+E*w+v*W+C*it,s[11]=y*L+E*D+v*B+C*st,s[15]=y*x+E*I+v*j+C*xt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],r=t[8],s=t[12],o=t[1],a=t[5],l=t[9],c=t[13],f=t[2],u=t[6],h=t[10],d=t[14],_=t[3],g=t[7],m=t[11],p=t[15];return _*(+s*l*u-r*c*u-s*a*h+i*c*h+r*a*d-i*l*d)+g*(+e*l*d-e*c*h+s*o*h-r*o*d+r*c*f-s*l*f)+m*(+e*c*u-e*a*d-s*o*u+i*o*d+s*a*f-i*c*f)+p*(-r*a*f-e*l*u+e*a*h+r*o*u-i*o*h+i*l*f)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=e,r[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],r=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],f=t[8],u=t[9],h=t[10],d=t[11],_=t[12],g=t[13],m=t[14],p=t[15],y=u*m*c-g*h*c+g*l*d-a*m*d-u*l*p+a*h*p,E=_*h*c-f*m*c-_*l*d+o*m*d+f*l*p-o*h*p,v=f*g*c-_*u*c+_*a*d-o*g*d-f*a*p+o*u*p,C=_*u*l-f*g*l-_*a*h+o*g*h+f*a*m-o*u*m,R=e*y+i*E+r*v+s*C;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const b=1/R;return t[0]=y*b,t[1]=(g*h*s-u*m*s-g*r*d+i*m*d+u*r*p-i*h*p)*b,t[2]=(a*m*s-g*l*s+g*r*c-i*m*c-a*r*p+i*l*p)*b,t[3]=(u*l*s-a*h*s-u*r*c+i*h*c+a*r*d-i*l*d)*b,t[4]=E*b,t[5]=(f*m*s-_*h*s+_*r*d-e*m*d-f*r*p+e*h*p)*b,t[6]=(_*l*s-o*m*s-_*r*c+e*m*c+o*r*p-e*l*p)*b,t[7]=(o*h*s-f*l*s+f*r*c-e*h*c-o*r*d+e*l*d)*b,t[8]=v*b,t[9]=(_*u*s-f*g*s-_*i*d+e*g*d+f*i*p-e*u*p)*b,t[10]=(o*g*s-_*a*s+_*i*c-e*g*c-o*i*p+e*a*p)*b,t[11]=(f*a*s-o*u*s-f*i*c+e*u*c+o*i*d-e*a*d)*b,t[12]=C*b,t[13]=(f*g*r-_*u*r+_*i*h-e*g*h-f*i*m+e*u*m)*b,t[14]=(_*a*r-o*g*r-_*i*l+e*g*l+o*i*m-e*a*m)*b,t[15]=(o*u*r-f*a*r+f*i*l-e*u*l-o*i*h+e*a*h)*b,this}scale(t){const e=this.elements,i=t.x,r=t.y,s=t.z;return e[0]*=i,e[4]*=r,e[8]*=s,e[1]*=i,e[5]*=r,e[9]*=s,e[2]*=i,e[6]*=r,e[10]*=s,e[3]*=i,e[7]*=r,e[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,r))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),r=Math.sin(e),s=1-i,o=t.x,a=t.y,l=t.z,c=s*o,f=s*a;return this.set(c*o+i,c*a-r*l,c*l+r*a,0,c*a+r*l,f*a+i,f*l-r*o,0,c*l-r*a,f*l+r*o,s*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,r,s,o){return this.set(1,i,s,0,t,1,o,0,e,r,1,0,0,0,0,1),this}compose(t,e,i){const r=this.elements,s=e._x,o=e._y,a=e._z,l=e._w,c=s+s,f=o+o,u=a+a,h=s*c,d=s*f,_=s*u,g=o*f,m=o*u,p=a*u,y=l*c,E=l*f,v=l*u,C=i.x,R=i.y,b=i.z;return r[0]=(1-(g+p))*C,r[1]=(d+v)*C,r[2]=(_-E)*C,r[3]=0,r[4]=(d-v)*R,r[5]=(1-(h+p))*R,r[6]=(m+y)*R,r[7]=0,r[8]=(_+E)*b,r[9]=(m-y)*b,r[10]=(1-(h+g))*b,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,e,i){const r=this.elements;let s=pi.set(r[0],r[1],r[2]).length();const o=pi.set(r[4],r[5],r[6]).length(),a=pi.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),t.x=r[12],t.y=r[13],t.z=r[14],on.copy(this);const c=1/s,f=1/o,u=1/a;return on.elements[0]*=c,on.elements[1]*=c,on.elements[2]*=c,on.elements[4]*=f,on.elements[5]*=f,on.elements[6]*=f,on.elements[8]*=u,on.elements[9]*=u,on.elements[10]*=u,e.setFromRotationMatrix(on),i.x=s,i.y=o,i.z=a,this}makePerspective(t,e,i,r,s,o,a=An){const l=this.elements,c=2*s/(e-t),f=2*s/(i-r),u=(e+t)/(e-t),h=(i+r)/(i-r);let d,_;if(a===An)d=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===ns)d=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=f,l[9]=h,l[13]=0,l[2]=0,l[6]=0,l[10]=d,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,i,r,s,o,a=An){const l=this.elements,c=1/(e-t),f=1/(i-r),u=1/(o-s),h=(e+t)*c,d=(i+r)*f;let _,g;if(a===An)_=(o+s)*u,g=-2*u;else if(a===ns)_=s*u,g=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-h,l[1]=0,l[5]=2*f,l[9]=0,l[13]=-d,l[2]=0,l[6]=0,l[10]=g,l[14]=-_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let r=0;r<16;r++)if(e[r]!==i[r])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}}const pi=new k,on=new xe,wh=new k(0,0,0),Rh=new k(1,1,1),Un=new k,Tr=new k,Ve=new k,Ea=new xe,Ta=new ur;class Cn{constructor(t=0,e=0,i=0,r=Cn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,r=this._order){return this._x=t,this._y=e,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const r=t.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],f=r[9],u=r[2],h=r[6],d=r[10];switch(e){case"XYZ":this._y=Math.asin(qt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-f,d),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-qt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(qt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-qt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(h,d),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(qt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-f,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-qt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-f,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Ea.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ea,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Ta.setFromEuler(this),this.setFromQuaternion(Ta,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Cn.DEFAULT_ORDER="XYZ";class ec{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Ch=0;const ba=new k,mi=new ur,Mn=new xe,br=new k,ji=new k,Ph=new k,Lh=new ur,Aa=new k(1,0,0),wa=new k(0,1,0),Ra=new k(0,0,1),Ca={type:"added"},Dh={type:"removed"},_i={type:"childadded",child:null},bs={type:"childremoved",child:null};class $e extends Hi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ch++}),this.uuid=Gi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=$e.DEFAULT_UP.clone();const t=new k,e=new Cn,i=new ur,r=new k(1,1,1);function s(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new xe},normalMatrix:{value:new zt}}),this.matrix=new xe,this.matrixWorld=new xe,this.matrixAutoUpdate=$e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=$e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ec,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return mi.setFromAxisAngle(t,e),this.quaternion.multiply(mi),this}rotateOnWorldAxis(t,e){return mi.setFromAxisAngle(t,e),this.quaternion.premultiply(mi),this}rotateX(t){return this.rotateOnAxis(Aa,t)}rotateY(t){return this.rotateOnAxis(wa,t)}rotateZ(t){return this.rotateOnAxis(Ra,t)}translateOnAxis(t,e){return ba.copy(t).applyQuaternion(this.quaternion),this.position.add(ba.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Aa,t)}translateY(t){return this.translateOnAxis(wa,t)}translateZ(t){return this.translateOnAxis(Ra,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Mn.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?br.copy(t):br.set(t,e,i);const r=this.parent;this.updateWorldMatrix(!0,!1),ji.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Mn.lookAt(ji,br,this.up):Mn.lookAt(br,ji,this.up),this.quaternion.setFromRotationMatrix(Mn),r&&(Mn.extractRotation(r.matrixWorld),mi.setFromRotationMatrix(Mn),this.quaternion.premultiply(mi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Ca),_i.child=t,this.dispatchEvent(_i),_i.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Dh),bs.child=t,this.dispatchEvent(bs),bs.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Mn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Mn.multiply(t.parent.matrixWorld)),t.applyMatrix4(Mn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Ca),_i.child=t,this.dispatchEvent(_i),_i.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ji,t,Ph),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ji,Lh,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let i=0,r=e.length;i<r;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,r=e.length;i<r;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,r=e.length;i<r;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,f=l.length;c<f;c++){const u=l[c];s(t.shapes,u)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(t.materials,this.material[l]));r.material=a}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),f=o(t.images),u=o(t.shapes),h=o(t.skeletons),d=o(t.animations),_=o(t.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),f.length>0&&(i.images=f),u.length>0&&(i.shapes=u),h.length>0&&(i.skeletons=h),d.length>0&&(i.animations=d),_.length>0&&(i.nodes=_)}return i.object=r,i;function o(a){const l=[];for(const c in a){const f=a[c];delete f.metadata,l.push(f)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const r=t.children[i];this.add(r.clone())}return this}}$e.DEFAULT_UP=new k(0,1,0);$e.DEFAULT_MATRIX_AUTO_UPDATE=!0;$e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const an=new k,yn=new k,As=new k,En=new k,gi=new k,vi=new k,Pa=new k,ws=new k,Rs=new k,Cs=new k,Ps=new _e,Ls=new _e,Ds=new _e;class cn{constructor(t=new k,e=new k,i=new k){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,r){r.subVectors(i,e),an.subVectors(t,e),r.cross(an);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,e,i,r,s){an.subVectors(r,e),yn.subVectors(i,e),As.subVectors(t,e);const o=an.dot(an),a=an.dot(yn),l=an.dot(As),c=yn.dot(yn),f=yn.dot(As),u=o*c-a*a;if(u===0)return s.set(0,0,0),null;const h=1/u,d=(c*l-a*f)*h,_=(o*f-a*l)*h;return s.set(1-d-_,_,d)}static containsPoint(t,e,i,r){return this.getBarycoord(t,e,i,r,En)===null?!1:En.x>=0&&En.y>=0&&En.x+En.y<=1}static getInterpolation(t,e,i,r,s,o,a,l){return this.getBarycoord(t,e,i,r,En)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,En.x),l.addScaledVector(o,En.y),l.addScaledVector(a,En.z),l)}static getInterpolatedAttribute(t,e,i,r,s,o){return Ps.setScalar(0),Ls.setScalar(0),Ds.setScalar(0),Ps.fromBufferAttribute(t,e),Ls.fromBufferAttribute(t,i),Ds.fromBufferAttribute(t,r),o.setScalar(0),o.addScaledVector(Ps,s.x),o.addScaledVector(Ls,s.y),o.addScaledVector(Ds,s.z),o}static isFrontFacing(t,e,i,r){return an.subVectors(i,e),yn.subVectors(t,e),an.cross(yn).dot(r)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,r){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,e,i,r){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return an.subVectors(this.c,this.b),yn.subVectors(this.a,this.b),an.cross(yn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return cn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return cn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,r,s){return cn.getInterpolation(t,this.a,this.b,this.c,e,i,r,s)}containsPoint(t){return cn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return cn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,r=this.b,s=this.c;let o,a;gi.subVectors(r,i),vi.subVectors(s,i),ws.subVectors(t,i);const l=gi.dot(ws),c=vi.dot(ws);if(l<=0&&c<=0)return e.copy(i);Rs.subVectors(t,r);const f=gi.dot(Rs),u=vi.dot(Rs);if(f>=0&&u<=f)return e.copy(r);const h=l*u-f*c;if(h<=0&&l>=0&&f<=0)return o=l/(l-f),e.copy(i).addScaledVector(gi,o);Cs.subVectors(t,s);const d=gi.dot(Cs),_=vi.dot(Cs);if(_>=0&&d<=_)return e.copy(s);const g=d*c-l*_;if(g<=0&&c>=0&&_<=0)return a=c/(c-_),e.copy(i).addScaledVector(vi,a);const m=f*_-d*u;if(m<=0&&u-f>=0&&d-_>=0)return Pa.subVectors(s,r),a=(u-f)/(u-f+(d-_)),e.copy(r).addScaledVector(Pa,a);const p=1/(m+g+h);return o=g*p,a=h*p,e.copy(i).addScaledVector(gi,o).addScaledVector(vi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const nc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Fn={h:0,s:0,l:0},Ar={h:0,s:0,l:0};function Is(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class re{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Qe){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Qt.toWorkingColorSpace(this,e),this}setRGB(t,e,i,r=Qt.workingColorSpace){return this.r=t,this.g=e,this.b=i,Qt.toWorkingColorSpace(this,r),this}setHSL(t,e,i,r=Qt.workingColorSpace){if(t=Xo(t,1),e=qt(e,0,1),i=qt(i,0,1),e===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+e):i+e-i*e,o=2*i-s;this.r=Is(o,s,t+1/3),this.g=Is(o,s,t),this.b=Is(o,s,t-1/3)}return Qt.toWorkingColorSpace(this,r),this}setStyle(t,e=Qe){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(s,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Qe){const i=nc[t.toLowerCase()];return i!==void 0?this.setHex(i,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Rn(t.r),this.g=Rn(t.g),this.b=Rn(t.b),this}copyLinearToSRGB(t){return this.r=Ii(t.r),this.g=Ii(t.g),this.b=Ii(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Qe){return Qt.fromWorkingColorSpace(Ce.copy(this),t),Math.round(qt(Ce.r*255,0,255))*65536+Math.round(qt(Ce.g*255,0,255))*256+Math.round(qt(Ce.b*255,0,255))}getHexString(t=Qe){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Qt.workingColorSpace){Qt.fromWorkingColorSpace(Ce.copy(this),e);const i=Ce.r,r=Ce.g,s=Ce.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let l,c;const f=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=f<=.5?u/(o+a):u/(2-o-a),o){case i:l=(r-s)/u+(r<s?6:0);break;case r:l=(s-i)/u+2;break;case s:l=(i-r)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=f,t}getRGB(t,e=Qt.workingColorSpace){return Qt.fromWorkingColorSpace(Ce.copy(this),e),t.r=Ce.r,t.g=Ce.g,t.b=Ce.b,t}getStyle(t=Qe){Qt.fromWorkingColorSpace(Ce.copy(this),t);const e=Ce.r,i=Ce.g,r=Ce.b;return t!==Qe?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(t,e,i){return this.getHSL(Fn),this.setHSL(Fn.h+t,Fn.s+e,Fn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(Fn),t.getHSL(Ar);const i=tr(Fn.h,Ar.h,e),r=tr(Fn.s,Ar.s,e),s=tr(Fn.l,Ar.l,e);return this.setHSL(i,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,r=this.b,s=t.elements;return this.r=s[0]*e+s[3]*i+s[6]*r,this.g=s[1]*e+s[4]*i+s[7]*r,this.b=s[2]*e+s[5]*i+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ce=new re;re.NAMES=nc;let Ih=0;class us extends Hi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ih++}),this.uuid=Gi(),this.name="",this.type="Material",this.blending=Di,this.side=kn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=js,this.blendDst=$s,this.blendEquation=Kn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new re(0,0,0),this.blendAlpha=0,this.depthFunc=Ui,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ma,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ci,this.stencilZFail=ci,this.stencilZPass=ci,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const r=this[e];if(r===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Di&&(i.blending=this.blending),this.side!==kn&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==js&&(i.blendSrc=this.blendSrc),this.blendDst!==$s&&(i.blendDst=this.blendDst),this.blendEquation!==Kn&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Ui&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ma&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ci&&(i.stencilFail=this.stencilFail),this.stencilZFail!==ci&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==ci&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(e){const s=r(t.textures),o=r(t.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const r=e.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=e[s].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class ic extends us{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new re(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Cn,this.combine=kl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const ve=new k,wr=new Zt;let Uh=0;class pn{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Uh++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=_a,this.updateRanges=[],this.gpuType=fn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=e.array[i+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)wr.fromBufferAttribute(this,e),wr.applyMatrix3(t),this.setXY(e,wr.x,wr.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)ve.fromBufferAttribute(this,e),ve.applyMatrix3(t),this.setXYZ(e,ve.x,ve.y,ve.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)ve.fromBufferAttribute(this,e),ve.applyMatrix4(t),this.setXYZ(e,ve.x,ve.y,ve.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)ve.fromBufferAttribute(this,e),ve.applyNormalMatrix(t),this.setXYZ(e,ve.x,ve.y,ve.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)ve.fromBufferAttribute(this,e),ve.transformDirection(t),this.setXYZ(e,ve.x,ve.y,ve.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=Ci(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=Fe(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ci(e,this.array)),e}setX(t,e){return this.normalized&&(e=Fe(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ci(e,this.array)),e}setY(t,e){return this.normalized&&(e=Fe(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ci(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Fe(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ci(e,this.array)),e}setW(t,e){return this.normalized&&(e=Fe(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=Fe(e,this.array),i=Fe(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,r){return t*=this.itemSize,this.normalized&&(e=Fe(e,this.array),i=Fe(i,this.array),r=Fe(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=r,this}setXYZW(t,e,i,r,s){return t*=this.itemSize,this.normalized&&(e=Fe(e,this.array),i=Fe(i,this.array),r=Fe(r,this.array),s=Fe(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==_a&&(t.usage=this.usage),t}}class rc extends pn{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class sc extends pn{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class ei extends pn{constructor(t,e,i){super(new Float32Array(t),e,i)}}let Fh=0;const Je=new xe,Us=new $e,xi=new k,We=new hr,$i=new hr,Ee=new k;class si extends Hi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Fh++}),this.uuid=Gi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Ql(t)?sc:rc)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new zt().getNormalMatrix(t);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Je.makeRotationFromQuaternion(t),this.applyMatrix4(Je),this}rotateX(t){return Je.makeRotationX(t),this.applyMatrix4(Je),this}rotateY(t){return Je.makeRotationY(t),this.applyMatrix4(Je),this}rotateZ(t){return Je.makeRotationZ(t),this.applyMatrix4(Je),this}translate(t,e,i){return Je.makeTranslation(t,e,i),this.applyMatrix4(Je),this}scale(t,e,i){return Je.makeScale(t,e,i),this.applyMatrix4(Je),this}lookAt(t){return Us.lookAt(t),Us.updateMatrix(),this.applyMatrix4(Us.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xi).negate(),this.translate(xi.x,xi.y,xi.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const i=[];for(let r=0,s=t.length;r<s;r++){const o=t[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ei(i,3))}else{const i=Math.min(t.length,e.count);for(let r=0;r<i;r++){const s=t[r];e.setXYZ(r,s.x,s.y,s.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new hr);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new k(-1/0,-1/0,-1/0),new k(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,r=e.length;i<r;i++){const s=e[i];We.setFromBufferAttribute(s),this.morphTargetsRelative?(Ee.addVectors(this.boundingBox.min,We.min),this.boundingBox.expandByPoint(Ee),Ee.addVectors(this.boundingBox.max,We.max),this.boundingBox.expandByPoint(Ee)):(this.boundingBox.expandByPoint(We.min),this.boundingBox.expandByPoint(We.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Yo);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new k,1/0);return}if(t){const i=this.boundingSphere.center;if(We.setFromBufferAttribute(t),e)for(let s=0,o=e.length;s<o;s++){const a=e[s];$i.setFromBufferAttribute(a),this.morphTargetsRelative?(Ee.addVectors(We.min,$i.min),We.expandByPoint(Ee),Ee.addVectors(We.max,$i.max),We.expandByPoint(Ee)):(We.expandByPoint($i.min),We.expandByPoint($i.max))}We.getCenter(i);let r=0;for(let s=0,o=t.count;s<o;s++)Ee.fromBufferAttribute(t,s),r=Math.max(r,i.distanceToSquared(Ee));if(e)for(let s=0,o=e.length;s<o;s++){const a=e[s],l=this.morphTargetsRelative;for(let c=0,f=a.count;c<f;c++)Ee.fromBufferAttribute(a,c),l&&(xi.fromBufferAttribute(t,c),Ee.add(xi)),r=Math.max(r,i.distanceToSquared(Ee))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,r=e.normal,s=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new pn(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<i.count;L++)a[L]=new k,l[L]=new k;const c=new k,f=new k,u=new k,h=new Zt,d=new Zt,_=new Zt,g=new k,m=new k;function p(L,x,S){c.fromBufferAttribute(i,L),f.fromBufferAttribute(i,x),u.fromBufferAttribute(i,S),h.fromBufferAttribute(s,L),d.fromBufferAttribute(s,x),_.fromBufferAttribute(s,S),f.sub(c),u.sub(c),d.sub(h),_.sub(h);const w=1/(d.x*_.y-_.x*d.y);isFinite(w)&&(g.copy(f).multiplyScalar(_.y).addScaledVector(u,-d.y).multiplyScalar(w),m.copy(u).multiplyScalar(d.x).addScaledVector(f,-_.x).multiplyScalar(w),a[L].add(g),a[x].add(g),a[S].add(g),l[L].add(m),l[x].add(m),l[S].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let L=0,x=y.length;L<x;++L){const S=y[L],w=S.start,D=S.count;for(let I=w,O=w+D;I<O;I+=3)p(t.getX(I+0),t.getX(I+1),t.getX(I+2))}const E=new k,v=new k,C=new k,R=new k;function b(L){C.fromBufferAttribute(r,L),R.copy(C);const x=a[L];E.copy(x),E.sub(C.multiplyScalar(C.dot(x))).normalize(),v.crossVectors(R,x);const w=v.dot(l[L])<0?-1:1;o.setXYZW(L,E.x,E.y,E.z,w)}for(let L=0,x=y.length;L<x;++L){const S=y[L],w=S.start,D=S.count;for(let I=w,O=w+D;I<O;I+=3)b(t.getX(I+0)),b(t.getX(I+1)),b(t.getX(I+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new pn(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let h=0,d=i.count;h<d;h++)i.setXYZ(h,0,0,0);const r=new k,s=new k,o=new k,a=new k,l=new k,c=new k,f=new k,u=new k;if(t)for(let h=0,d=t.count;h<d;h+=3){const _=t.getX(h+0),g=t.getX(h+1),m=t.getX(h+2);r.fromBufferAttribute(e,_),s.fromBufferAttribute(e,g),o.fromBufferAttribute(e,m),f.subVectors(o,s),u.subVectors(r,s),f.cross(u),a.fromBufferAttribute(i,_),l.fromBufferAttribute(i,g),c.fromBufferAttribute(i,m),a.add(f),l.add(f),c.add(f),i.setXYZ(_,a.x,a.y,a.z),i.setXYZ(g,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let h=0,d=e.count;h<d;h+=3)r.fromBufferAttribute(e,h+0),s.fromBufferAttribute(e,h+1),o.fromBufferAttribute(e,h+2),f.subVectors(o,s),u.subVectors(r,s),f.cross(u),i.setXYZ(h+0,f.x,f.y,f.z),i.setXYZ(h+1,f.x,f.y,f.z),i.setXYZ(h+2,f.x,f.y,f.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)Ee.fromBufferAttribute(t,e),Ee.normalize(),t.setXYZ(e,Ee.x,Ee.y,Ee.z)}toNonIndexed(){function t(a,l){const c=a.array,f=a.itemSize,u=a.normalized,h=new c.constructor(l.length*f);let d=0,_=0;for(let g=0,m=l.length;g<m;g++){a.isInterleavedBufferAttribute?d=l[g]*a.data.stride+a.offset:d=l[g]*f;for(let p=0;p<f;p++)h[_++]=c[d++]}return new pn(h,f,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new si,i=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=t(l,i);e.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let f=0,u=c.length;f<u;f++){const h=c[f],d=t(h,i);l.push(d)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const l in i){const c=i[l];t.data.attributes[l]=c.toJSON(t.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],f=[];for(let u=0,h=c.length;u<h;u++){const d=c[u];f.push(d.toJSON(t.data))}f.length>0&&(r[l]=f,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone());const r=t.attributes;for(const c in r){const f=r[c];this.setAttribute(c,f.clone(e))}const s=t.morphAttributes;for(const c in s){const f=[],u=s[c];for(let h=0,d=u.length;h<d;h++)f.push(u[h].clone(e));this.morphAttributes[c]=f}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,f=o.length;c<f;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const La=new xe,Wn=new Ah,Rr=new Yo,Da=new k,Cr=new k,Pr=new k,Lr=new k,Fs=new k,Dr=new k,Ia=new k,Ir=new k;class dn extends $e{constructor(t=new si,e=new ic){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const r=e[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(t,e){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(r,t);const a=this.morphTargetInfluences;if(s&&a){Dr.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const f=a[l],u=s[l];f!==0&&(Fs.fromBufferAttribute(u,t),o?Dr.addScaledVector(Fs,f):Dr.addScaledVector(Fs.sub(e),f))}e.add(Dr)}return e}raycast(t,e){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Rr.copy(i.boundingSphere),Rr.applyMatrix4(s),Wn.copy(t.ray).recast(t.near),!(Rr.containsPoint(Wn.origin)===!1&&(Wn.intersectSphere(Rr,Da)===null||Wn.origin.distanceToSquared(Da)>(t.far-t.near)**2))&&(La.copy(s).invert(),Wn.copy(t.ray).applyMatrix4(La),!(i.boundingBox!==null&&Wn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Wn)))}_computeIntersections(t,e,i){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,f=s.attributes.uv1,u=s.attributes.normal,h=s.groups,d=s.drawRange;if(a!==null)if(Array.isArray(o))for(let _=0,g=h.length;_<g;_++){const m=h[_],p=o[m.materialIndex],y=Math.max(m.start,d.start),E=Math.min(a.count,Math.min(m.start+m.count,d.start+d.count));for(let v=y,C=E;v<C;v+=3){const R=a.getX(v),b=a.getX(v+1),L=a.getX(v+2);r=Ur(this,p,t,i,c,f,u,R,b,L),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{const _=Math.max(0,d.start),g=Math.min(a.count,d.start+d.count);for(let m=_,p=g;m<p;m+=3){const y=a.getX(m),E=a.getX(m+1),v=a.getX(m+2);r=Ur(this,o,t,i,c,f,u,y,E,v),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let _=0,g=h.length;_<g;_++){const m=h[_],p=o[m.materialIndex],y=Math.max(m.start,d.start),E=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let v=y,C=E;v<C;v+=3){const R=v,b=v+1,L=v+2;r=Ur(this,p,t,i,c,f,u,R,b,L),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{const _=Math.max(0,d.start),g=Math.min(l.count,d.start+d.count);for(let m=_,p=g;m<p;m+=3){const y=m,E=m+1,v=m+2;r=Ur(this,o,t,i,c,f,u,y,E,v),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}}}function Nh(n,t,e,i,r,s,o,a){let l;if(t.side===ke?l=i.intersectTriangle(o,s,r,!0,a):l=i.intersectTriangle(r,s,o,t.side===kn,a),l===null)return null;Ir.copy(a),Ir.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Ir);return c<e.near||c>e.far?null:{distance:c,point:Ir.clone(),object:n}}function Ur(n,t,e,i,r,s,o,a,l,c){n.getVertexPosition(a,Cr),n.getVertexPosition(l,Pr),n.getVertexPosition(c,Lr);const f=Nh(n,t,e,i,Cr,Pr,Lr,Ia);if(f){const u=new k;cn.getBarycoord(Ia,Cr,Pr,Lr,u),r&&(f.uv=cn.getInterpolatedAttribute(r,a,l,c,u,new Zt)),s&&(f.uv1=cn.getInterpolatedAttribute(s,a,l,c,u,new Zt)),o&&(f.normal=cn.getInterpolatedAttribute(o,a,l,c,u,new k),f.normal.dot(i.direction)>0&&f.normal.multiplyScalar(-1));const h={a,b:l,c,normal:new k,materialIndex:0};cn.getNormal(Cr,Pr,Lr,h.normal),f.face=h,f.barycoord=u}return f}class fr extends si{constructor(t=1,e=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],f=[],u=[];let h=0,d=0;_("z","y","x",-1,-1,i,e,t,o,s,0),_("z","y","x",1,-1,i,e,-t,o,s,1),_("x","z","y",1,1,t,i,e,r,o,2),_("x","z","y",1,-1,t,i,-e,r,o,3),_("x","y","z",1,-1,t,e,i,r,s,4),_("x","y","z",-1,-1,t,e,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new ei(c,3)),this.setAttribute("normal",new ei(f,3)),this.setAttribute("uv",new ei(u,2));function _(g,m,p,y,E,v,C,R,b,L,x){const S=v/b,w=C/L,D=v/2,I=C/2,O=R/2,W=b+1,B=L+1;let j=0,V=0;const it=new k;for(let st=0;st<B;st++){const xt=st*w-I;for(let It=0;It<W;It++){const Rt=It*S-D;it[g]=Rt*y,it[m]=xt*E,it[p]=O,c.push(it.x,it.y,it.z),it[g]=0,it[m]=0,it[p]=R>0?1:-1,f.push(it.x,it.y,it.z),u.push(It/b),u.push(1-st/L),j+=1}}for(let st=0;st<L;st++)for(let xt=0;xt<b;xt++){const It=h+xt+W*st,Rt=h+xt+W*(st+1),$=h+(xt+1)+W*(st+1),J=h+(xt+1)+W*st;l.push(It,Rt,J),l.push(Rt,$,J),V+=6}a.addGroup(d,V,x),d+=V,h+=j}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new fr(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Bi(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const r=n[e][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=r.clone():Array.isArray(r)?t[e][i]=r.slice():t[e][i]=r}}return t}function Ne(n){const t={};for(let e=0;e<n.length;e++){const i=Bi(n[e]);for(const r in i)t[r]=i[r]}return t}function Oh(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function oc(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Qt.workingColorSpace}const Bh={clone:Bi,merge:Ne};var zh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,kh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Pn extends us{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=zh,this.fragmentShader=kh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Bi(t.uniforms),this.uniformsGroups=Oh(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?e.uniforms[r]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[r]={type:"m4",value:o.toArray()}:e.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}}class ac extends $e{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new xe,this.projectionMatrix=new xe,this.projectionMatrixInverse=new xe,this.coordinateSystem=An}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Nn=new k,Ua=new Zt,Fa=new Zt;class ln extends ac{constructor(t=50,e=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=sr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Qi*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return sr*2*Math.atan(Math.tan(Qi*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){Nn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Nn.x,Nn.y).multiplyScalar(-t/Nn.z),Nn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Nn.x,Nn.y).multiplyScalar(-t/Nn.z)}getViewSize(t,e){return this.getViewBounds(t,Ua,Fa),e.subVectors(Fa,Ua)}setViewOffset(t,e,i,r,s,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Qi*.5*this.fov)/this.zoom,i=2*e,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,e-=o.offsetY*i/c,r*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(s+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,e,e-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Si=-90,Mi=1;class Hh extends $e{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new ln(Si,Mi,t,e);r.layers=this.layers,this.add(r);const s=new ln(Si,Mi,t,e);s.layers=this.layers,this.add(s);const o=new ln(Si,Mi,t,e);o.layers=this.layers,this.add(o);const a=new ln(Si,Mi,t,e);a.layers=this.layers,this.add(a);const l=new ln(Si,Mi,t,e);l.layers=this.layers,this.add(l);const c=new ln(Si,Mi,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,r,s,o,a,l]=e;for(const c of e)this.remove(c);if(t===An)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===ns)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,f]=this.children,u=t.getRenderTarget(),h=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),_=t.xr.enabled;t.xr.enabled=!1;const g=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,r),t.render(e,s),t.setRenderTarget(i,1,r),t.render(e,o),t.setRenderTarget(i,2,r),t.render(e,a),t.setRenderTarget(i,3,r),t.render(e,l),t.setRenderTarget(i,4,r),t.render(e,c),i.texture.generateMipmaps=g,t.setRenderTarget(i,5,r),t.render(e,f),t.setRenderTarget(u,h,d),t.xr.enabled=_,i.texture.needsPMREMUpdate=!0}}class lc extends He{constructor(t=[],e=Fi,i,r,s,o,a,l,c,f){super(t,e,i,r,s,o,a,l,c,f),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Gh extends Xe{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},r=[i,i,i,i,i,i];this.texture=new lc(r,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:en}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new fr(5,5,5),s=new Pn({name:"CubemapFromEquirect",uniforms:Bi(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:ke,blending:Bn});s.uniforms.tEquirect.value=e;const o=new dn(r,s),a=e.minFilter;return e.minFilter===ti&&(e.minFilter=en),new Hh(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,i=!0,r=!0){const s=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,r);t.setRenderTarget(s)}}class Fr extends $e{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Vh={type:"move"};class Ns{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new k,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new k),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new k,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new k),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const g of t.hand.values()){const m=e.getJointPose(g,i),p=this._getHandJoint(c,g);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const f=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],h=f.position.distanceTo(u.position),d=.02,_=.005;c.inputState.pinching&&h>d+_?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&h<=d-_&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=e.getPose(t.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Vh)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new Fr;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}class Wh extends $e{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Cn,this.environmentIntensity=1,this.environmentRotation=new Cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}const Os=new k,Xh=new k,qh=new zt;class jn{constructor(t=new k(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,r){return this.normal.set(t,e,i),this.constant=r,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const r=Os.subVectors(i,e).cross(Xh.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const i=t.delta(Os),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const s=-(t.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:e.copy(t.start).addScaledVector(i,s)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||qh.getNormalMatrix(t),r=this.coplanarPoint(Os).applyMatrix4(t),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Xn=new Yo,Nr=new k;class cc{constructor(t=new jn,e=new jn,i=new jn,r=new jn,s=new jn,o=new jn){this.planes=[t,e,i,r,s,o]}set(t,e,i,r,s,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=An){const i=this.planes,r=t.elements,s=r[0],o=r[1],a=r[2],l=r[3],c=r[4],f=r[5],u=r[6],h=r[7],d=r[8],_=r[9],g=r[10],m=r[11],p=r[12],y=r[13],E=r[14],v=r[15];if(i[0].setComponents(l-s,h-c,m-d,v-p).normalize(),i[1].setComponents(l+s,h+c,m+d,v+p).normalize(),i[2].setComponents(l+o,h+f,m+_,v+y).normalize(),i[3].setComponents(l-o,h-f,m-_,v-y).normalize(),i[4].setComponents(l-a,h-u,m-g,v-E).normalize(),e===An)i[5].setComponents(l+a,h+u,m+g,v+E).normalize();else if(e===ns)i[5].setComponents(a,u,g,E).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Xn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Xn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Xn)}intersectsSprite(t){return Xn.center.set(0,0,0),Xn.radius=.7071067811865476,Xn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Xn)}intersectsSphere(t){const e=this.planes,i=t.center,r=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const r=e[i];if(Nr.x=r.normal.x>0?t.max.x:t.min.x,Nr.y=r.normal.y>0?t.max.y:t.min.y,Nr.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(Nr)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class uc extends He{constructor(t,e,i=ii,r,s,o,a=je,l=je,c,f=ir){if(f!==ir&&f!==rr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");super(null,r,s,o,a,l,f,i,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new qo(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class dr extends si{constructor(t=1,e=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:r};const s=t/2,o=e/2,a=Math.floor(i),l=Math.floor(r),c=a+1,f=l+1,u=t/a,h=e/l,d=[],_=[],g=[],m=[];for(let p=0;p<f;p++){const y=p*h-o;for(let E=0;E<c;E++){const v=E*u-s;_.push(v,-y,0),g.push(0,0,1),m.push(E/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let y=0;y<a;y++){const E=y+c*p,v=y+c*(p+1),C=y+1+c*(p+1),R=y+1+c*p;d.push(E,v,R),d.push(v,C,R)}this.setIndex(d),this.setAttribute("position",new ei(_,3)),this.setAttribute("normal",new ei(g,3)),this.setAttribute("uv",new ei(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new dr(t.width,t.height,t.widthSegments,t.heightSegments)}}class Yh extends us{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Hu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class jh extends us{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class hc extends ac{constructor(t=-1,e=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-t,o=i+t,a=r+e,l=r-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,f=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=f*this.view.offsetY,l=a-f*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class $h extends ln{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t,this.index=0}}class Kh{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Na(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=Na();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}function Na(){return performance.now()}function Oa(n,t,e,i){const r=Zh(i);switch(e){case Xl:return n*t;case Yl:return n*t;case jl:return n*t*2;case $l:return n*t/r.components*r.byteLength;case Go:return n*t/r.components*r.byteLength;case Kl:return n*t*2/r.components*r.byteLength;case Vo:return n*t*2/r.components*r.byteLength;case ql:return n*t*3/r.components*r.byteLength;case Ye:return n*t*4/r.components*r.byteLength;case Wo:return n*t*4/r.components*r.byteLength;case Xr:case qr:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Yr:case jr:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case lo:case uo:return Math.max(n,16)*Math.max(t,8)/4;case ao:case co:return Math.max(n,8)*Math.max(t,8)/2;case ho:case fo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case po:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case mo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case _o:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case go:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case vo:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case xo:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case So:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case Mo:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case yo:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case Eo:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case To:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case bo:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case Ao:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case wo:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case Ro:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case $r:case Co:case Po:return Math.ceil(n/4)*Math.ceil(t/4)*16;case Zl:case Lo:return Math.ceil(n/4)*Math.ceil(t/4)*8;case Do:case Io:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Zh(n){switch(n){case _n:case Gl:return{byteLength:1,components:1};case er:case Vl:case cr:return{byteLength:2,components:1};case ko:case Ho:return{byteLength:2,components:4};case ii:case zo:case fn:return{byteLength:4,components:1};case Wl:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Bo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Bo);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function fc(){let n=null,t=!1,e=null,i=null;function r(s,o){e(s,o),i=n.requestAnimationFrame(r)}return{start:function(){t!==!0&&e!==null&&(i=n.requestAnimationFrame(r),t=!0)},stop:function(){n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){n=s}}}function Jh(n){const t=new WeakMap;function e(a,l){const c=a.array,f=a.usage,u=c.byteLength,h=n.createBuffer();n.bindBuffer(l,h),n.bufferData(l,c,f),a.onUploadCallback();let d;if(c instanceof Float32Array)d=n.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?d=n.HALF_FLOAT:d=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=n.SHORT;else if(c instanceof Uint32Array)d=n.UNSIGNED_INT;else if(c instanceof Int32Array)d=n.INT;else if(c instanceof Int8Array)d=n.BYTE;else if(c instanceof Uint8Array)d=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,l,c){const f=l.array,u=l.updateRanges;if(n.bindBuffer(c,a),u.length===0)n.bufferSubData(c,0,f);else{u.sort((d,_)=>d.start-_.start);let h=0;for(let d=1;d<u.length;d++){const _=u[h],g=u[d];g.start<=_.start+_.count+1?_.count=Math.max(_.count,g.start+g.count-_.start):(++h,u[h]=g)}u.length=h+1;for(let d=0,_=u.length;d<_;d++){const g=u[d];n.bufferSubData(c,g.start*f.BYTES_PER_ELEMENT,f,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(n.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const f=t.get(a);(!f||f.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}var Qh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,tf=`#ifdef USE_ALPHAHASH
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
#endif`,ef=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,nf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,rf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,sf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,of=`#ifdef USE_AOMAP
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
#endif`,af=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,lf=`#ifdef USE_BATCHING
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
#endif`,cf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,uf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,hf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ff=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,df=`#ifdef USE_IRIDESCENCE
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
#endif`,pf=`#ifdef USE_BUMPMAP
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
#endif`,mf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,_f=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,gf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,vf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,xf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Sf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Mf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,yf=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Ef=`#define PI 3.141592653589793
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
} // validated`,Tf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,bf=`vec3 transformedNormal = objectNormal;
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
#endif`,Af=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,wf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Rf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Cf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Pf="gl_FragColor = linearToOutputTexel( gl_FragColor );",Lf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Df=`#ifdef USE_ENVMAP
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
#endif`,If=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Uf=`#ifdef USE_ENVMAP
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
#endif`,Ff=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Nf=`#ifdef USE_ENVMAP
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
#endif`,Of=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Bf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,zf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,kf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Hf=`#ifdef USE_GRADIENTMAP
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
}`,Gf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Vf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Wf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Xf=`uniform bool receiveShadow;
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
#endif`,qf=`#ifdef USE_ENVMAP
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
#endif`,Yf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,jf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,$f=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Kf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Zf=`PhysicalMaterial material;
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
#endif`,Jf=`struct PhysicalMaterial {
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
}`,Qf=`
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
#endif`,td=`#if defined( RE_IndirectDiffuse )
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
#endif`,ed=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,nd=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,id=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,rd=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sd=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,od=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ad=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ld=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,cd=`#if defined( USE_POINTS_UV )
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
#endif`,ud=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,hd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,fd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,dd=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,pd=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,md=`#ifdef USE_MORPHTARGETS
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
#endif`,_d=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,gd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,vd=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,xd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Sd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Md=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,yd=`#ifdef USE_NORMALMAP
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
#endif`,Ed=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Td=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,bd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ad=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,wd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Rd=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Cd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Pd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ld=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Dd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Id=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ud=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Fd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Nd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Od=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Bd=`float getShadowMask() {
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
}`,zd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,kd=`#ifdef USE_SKINNING
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
#endif`,Hd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Gd=`#ifdef USE_SKINNING
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
#endif`,Vd=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Wd=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Xd=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,qd=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Yd=`#ifdef USE_TRANSMISSION
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
#endif`,jd=`#ifdef USE_TRANSMISSION
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
#endif`,$d=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Kd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Zd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Jd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Qd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,tp=`uniform sampler2D t2D;
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
}`,ep=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,np=`#ifdef ENVMAP_TYPE_CUBE
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
}`,ip=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,rp=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sp=`#include <common>
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
}`,op=`#if DEPTH_PACKING == 3200
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
}`,ap=`#define DISTANCE
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
}`,lp=`#define DISTANCE
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
}`,cp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,up=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hp=`uniform float scale;
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
}`,fp=`uniform vec3 diffuse;
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
}`,dp=`#include <common>
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
}`,pp=`uniform vec3 diffuse;
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
}`,mp=`#define LAMBERT
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
}`,_p=`#define LAMBERT
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
}`,gp=`#define MATCAP
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
}`,vp=`#define MATCAP
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
}`,xp=`#define NORMAL
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
}`,Sp=`#define NORMAL
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
}`,Mp=`#define PHONG
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
}`,yp=`#define PHONG
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
}`,Ep=`#define STANDARD
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
}`,Tp=`#define STANDARD
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
}`,bp=`#define TOON
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
}`,Ap=`#define TOON
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
}`,wp=`uniform float size;
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
}`,Rp=`uniform vec3 diffuse;
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
}`,Cp=`#include <common>
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
}`,Pp=`uniform vec3 color;
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
}`,Lp=`uniform float rotation;
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
}`,Dp=`uniform vec3 diffuse;
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
}`,kt={alphahash_fragment:Qh,alphahash_pars_fragment:tf,alphamap_fragment:ef,alphamap_pars_fragment:nf,alphatest_fragment:rf,alphatest_pars_fragment:sf,aomap_fragment:of,aomap_pars_fragment:af,batching_pars_vertex:lf,batching_vertex:cf,begin_vertex:uf,beginnormal_vertex:hf,bsdfs:ff,iridescence_fragment:df,bumpmap_pars_fragment:pf,clipping_planes_fragment:mf,clipping_planes_pars_fragment:_f,clipping_planes_pars_vertex:gf,clipping_planes_vertex:vf,color_fragment:xf,color_pars_fragment:Sf,color_pars_vertex:Mf,color_vertex:yf,common:Ef,cube_uv_reflection_fragment:Tf,defaultnormal_vertex:bf,displacementmap_pars_vertex:Af,displacementmap_vertex:wf,emissivemap_fragment:Rf,emissivemap_pars_fragment:Cf,colorspace_fragment:Pf,colorspace_pars_fragment:Lf,envmap_fragment:Df,envmap_common_pars_fragment:If,envmap_pars_fragment:Uf,envmap_pars_vertex:Ff,envmap_physical_pars_fragment:qf,envmap_vertex:Nf,fog_vertex:Of,fog_pars_vertex:Bf,fog_fragment:zf,fog_pars_fragment:kf,gradientmap_pars_fragment:Hf,lightmap_pars_fragment:Gf,lights_lambert_fragment:Vf,lights_lambert_pars_fragment:Wf,lights_pars_begin:Xf,lights_toon_fragment:Yf,lights_toon_pars_fragment:jf,lights_phong_fragment:$f,lights_phong_pars_fragment:Kf,lights_physical_fragment:Zf,lights_physical_pars_fragment:Jf,lights_fragment_begin:Qf,lights_fragment_maps:td,lights_fragment_end:ed,logdepthbuf_fragment:nd,logdepthbuf_pars_fragment:id,logdepthbuf_pars_vertex:rd,logdepthbuf_vertex:sd,map_fragment:od,map_pars_fragment:ad,map_particle_fragment:ld,map_particle_pars_fragment:cd,metalnessmap_fragment:ud,metalnessmap_pars_fragment:hd,morphinstance_vertex:fd,morphcolor_vertex:dd,morphnormal_vertex:pd,morphtarget_pars_vertex:md,morphtarget_vertex:_d,normal_fragment_begin:gd,normal_fragment_maps:vd,normal_pars_fragment:xd,normal_pars_vertex:Sd,normal_vertex:Md,normalmap_pars_fragment:yd,clearcoat_normal_fragment_begin:Ed,clearcoat_normal_fragment_maps:Td,clearcoat_pars_fragment:bd,iridescence_pars_fragment:Ad,opaque_fragment:wd,packing:Rd,premultiplied_alpha_fragment:Cd,project_vertex:Pd,dithering_fragment:Ld,dithering_pars_fragment:Dd,roughnessmap_fragment:Id,roughnessmap_pars_fragment:Ud,shadowmap_pars_fragment:Fd,shadowmap_pars_vertex:Nd,shadowmap_vertex:Od,shadowmask_pars_fragment:Bd,skinbase_vertex:zd,skinning_pars_vertex:kd,skinning_vertex:Hd,skinnormal_vertex:Gd,specularmap_fragment:Vd,specularmap_pars_fragment:Wd,tonemapping_fragment:Xd,tonemapping_pars_fragment:qd,transmission_fragment:Yd,transmission_pars_fragment:jd,uv_pars_fragment:$d,uv_pars_vertex:Kd,uv_vertex:Zd,worldpos_vertex:Jd,background_vert:Qd,background_frag:tp,backgroundCube_vert:ep,backgroundCube_frag:np,cube_vert:ip,cube_frag:rp,depth_vert:sp,depth_frag:op,distanceRGBA_vert:ap,distanceRGBA_frag:lp,equirect_vert:cp,equirect_frag:up,linedashed_vert:hp,linedashed_frag:fp,meshbasic_vert:dp,meshbasic_frag:pp,meshlambert_vert:mp,meshlambert_frag:_p,meshmatcap_vert:gp,meshmatcap_frag:vp,meshnormal_vert:xp,meshnormal_frag:Sp,meshphong_vert:Mp,meshphong_frag:yp,meshphysical_vert:Ep,meshphysical_frag:Tp,meshtoon_vert:bp,meshtoon_frag:Ap,points_vert:wp,points_frag:Rp,shadow_vert:Cp,shadow_frag:Pp,sprite_vert:Lp,sprite_frag:Dp},ct={common:{diffuse:{value:new re(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new zt},alphaMap:{value:null},alphaMapTransform:{value:new zt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new zt}},envmap:{envMap:{value:null},envMapRotation:{value:new zt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new zt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new zt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new zt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new zt},normalScale:{value:new Zt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new zt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new zt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new zt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new zt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new re(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new re(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new zt},alphaTest:{value:0},uvTransform:{value:new zt}},sprite:{diffuse:{value:new re(16777215)},opacity:{value:1},center:{value:new Zt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new zt},alphaMap:{value:null},alphaMapTransform:{value:new zt},alphaTest:{value:0}}},hn={basic:{uniforms:Ne([ct.common,ct.specularmap,ct.envmap,ct.aomap,ct.lightmap,ct.fog]),vertexShader:kt.meshbasic_vert,fragmentShader:kt.meshbasic_frag},lambert:{uniforms:Ne([ct.common,ct.specularmap,ct.envmap,ct.aomap,ct.lightmap,ct.emissivemap,ct.bumpmap,ct.normalmap,ct.displacementmap,ct.fog,ct.lights,{emissive:{value:new re(0)}}]),vertexShader:kt.meshlambert_vert,fragmentShader:kt.meshlambert_frag},phong:{uniforms:Ne([ct.common,ct.specularmap,ct.envmap,ct.aomap,ct.lightmap,ct.emissivemap,ct.bumpmap,ct.normalmap,ct.displacementmap,ct.fog,ct.lights,{emissive:{value:new re(0)},specular:{value:new re(1118481)},shininess:{value:30}}]),vertexShader:kt.meshphong_vert,fragmentShader:kt.meshphong_frag},standard:{uniforms:Ne([ct.common,ct.envmap,ct.aomap,ct.lightmap,ct.emissivemap,ct.bumpmap,ct.normalmap,ct.displacementmap,ct.roughnessmap,ct.metalnessmap,ct.fog,ct.lights,{emissive:{value:new re(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:kt.meshphysical_vert,fragmentShader:kt.meshphysical_frag},toon:{uniforms:Ne([ct.common,ct.aomap,ct.lightmap,ct.emissivemap,ct.bumpmap,ct.normalmap,ct.displacementmap,ct.gradientmap,ct.fog,ct.lights,{emissive:{value:new re(0)}}]),vertexShader:kt.meshtoon_vert,fragmentShader:kt.meshtoon_frag},matcap:{uniforms:Ne([ct.common,ct.bumpmap,ct.normalmap,ct.displacementmap,ct.fog,{matcap:{value:null}}]),vertexShader:kt.meshmatcap_vert,fragmentShader:kt.meshmatcap_frag},points:{uniforms:Ne([ct.points,ct.fog]),vertexShader:kt.points_vert,fragmentShader:kt.points_frag},dashed:{uniforms:Ne([ct.common,ct.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:kt.linedashed_vert,fragmentShader:kt.linedashed_frag},depth:{uniforms:Ne([ct.common,ct.displacementmap]),vertexShader:kt.depth_vert,fragmentShader:kt.depth_frag},normal:{uniforms:Ne([ct.common,ct.bumpmap,ct.normalmap,ct.displacementmap,{opacity:{value:1}}]),vertexShader:kt.meshnormal_vert,fragmentShader:kt.meshnormal_frag},sprite:{uniforms:Ne([ct.sprite,ct.fog]),vertexShader:kt.sprite_vert,fragmentShader:kt.sprite_frag},background:{uniforms:{uvTransform:{value:new zt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:kt.background_vert,fragmentShader:kt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new zt}},vertexShader:kt.backgroundCube_vert,fragmentShader:kt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:kt.cube_vert,fragmentShader:kt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:kt.equirect_vert,fragmentShader:kt.equirect_frag},distanceRGBA:{uniforms:Ne([ct.common,ct.displacementmap,{referencePosition:{value:new k},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:kt.distanceRGBA_vert,fragmentShader:kt.distanceRGBA_frag},shadow:{uniforms:Ne([ct.lights,ct.fog,{color:{value:new re(0)},opacity:{value:1}}]),vertexShader:kt.shadow_vert,fragmentShader:kt.shadow_frag}};hn.physical={uniforms:Ne([hn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new zt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new zt},clearcoatNormalScale:{value:new Zt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new zt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new zt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new zt},sheen:{value:0},sheenColor:{value:new re(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new zt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new zt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new zt},transmissionSamplerSize:{value:new Zt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new zt},attenuationDistance:{value:0},attenuationColor:{value:new re(0)},specularColor:{value:new re(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new zt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new zt},anisotropyVector:{value:new Zt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new zt}}]),vertexShader:kt.meshphysical_vert,fragmentShader:kt.meshphysical_frag};const Or={r:0,b:0,g:0},qn=new Cn,Ip=new xe;function Up(n,t,e,i,r,s,o){const a=new re(0);let l=s===!0?0:1,c,f,u=null,h=0,d=null;function _(E){let v=E.isScene===!0?E.background:null;return v&&v.isTexture&&(v=(E.backgroundBlurriness>0?e:t).get(v)),v}function g(E){let v=!1;const C=_(E);C===null?p(a,l):C&&C.isColor&&(p(C,1),v=!0);const R=n.xr.getEnvironmentBlendMode();R==="additive"?i.buffers.color.setClear(0,0,0,1,o):R==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||v)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(E,v){const C=_(v);C&&(C.isCubeTexture||C.mapping===cs)?(f===void 0&&(f=new dn(new fr(1,1,1),new Pn({name:"BackgroundCubeMaterial",uniforms:Bi(hn.backgroundCube.uniforms),vertexShader:hn.backgroundCube.vertexShader,fragmentShader:hn.backgroundCube.fragmentShader,side:ke,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(R,b,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),qn.copy(v.backgroundRotation),qn.x*=-1,qn.y*=-1,qn.z*=-1,C.isCubeTexture&&C.isRenderTargetTexture===!1&&(qn.y*=-1,qn.z*=-1),f.material.uniforms.envMap.value=C,f.material.uniforms.flipEnvMap.value=C.isCubeTexture&&C.isRenderTargetTexture===!1?-1:1,f.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(Ip.makeRotationFromEuler(qn)),f.material.toneMapped=Qt.getTransfer(C.colorSpace)!==ae,(u!==C||h!==C.version||d!==n.toneMapping)&&(f.material.needsUpdate=!0,u=C,h=C.version,d=n.toneMapping),f.layers.enableAll(),E.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(c===void 0&&(c=new dn(new dr(2,2),new Pn({name:"BackgroundMaterial",uniforms:Bi(hn.background.uniforms),vertexShader:hn.background.vertexShader,fragmentShader:hn.background.fragmentShader,side:kn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=C,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=Qt.getTransfer(C.colorSpace)!==ae,C.matrixAutoUpdate===!0&&C.updateMatrix(),c.material.uniforms.uvTransform.value.copy(C.matrix),(u!==C||h!==C.version||d!==n.toneMapping)&&(c.material.needsUpdate=!0,u=C,h=C.version,d=n.toneMapping),c.layers.enableAll(),E.unshift(c,c.geometry,c.material,0,0,null))}function p(E,v){E.getRGB(Or,oc(n)),i.buffers.color.setClear(Or.r,Or.g,Or.b,v,o)}function y(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(E,v=1){a.set(E),l=v,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(E){l=E,p(a,l)},render:g,addToRenderList:m,dispose:y}}function Fp(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=h(null);let s=r,o=!1;function a(S,w,D,I,O){let W=!1;const B=u(I,D,w);s!==B&&(s=B,c(s.object)),W=d(S,I,D,O),W&&_(S,I,D,O),O!==null&&t.update(O,n.ELEMENT_ARRAY_BUFFER),(W||o)&&(o=!1,v(S,w,D,I),O!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(O).buffer))}function l(){return n.createVertexArray()}function c(S){return n.bindVertexArray(S)}function f(S){return n.deleteVertexArray(S)}function u(S,w,D){const I=D.wireframe===!0;let O=i[S.id];O===void 0&&(O={},i[S.id]=O);let W=O[w.id];W===void 0&&(W={},O[w.id]=W);let B=W[I];return B===void 0&&(B=h(l()),W[I]=B),B}function h(S){const w=[],D=[],I=[];for(let O=0;O<e;O++)w[O]=0,D[O]=0,I[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:w,enabledAttributes:D,attributeDivisors:I,object:S,attributes:{},index:null}}function d(S,w,D,I){const O=s.attributes,W=w.attributes;let B=0;const j=D.getAttributes();for(const V in j)if(j[V].location>=0){const st=O[V];let xt=W[V];if(xt===void 0&&(V==="instanceMatrix"&&S.instanceMatrix&&(xt=S.instanceMatrix),V==="instanceColor"&&S.instanceColor&&(xt=S.instanceColor)),st===void 0||st.attribute!==xt||xt&&st.data!==xt.data)return!0;B++}return s.attributesNum!==B||s.index!==I}function _(S,w,D,I){const O={},W=w.attributes;let B=0;const j=D.getAttributes();for(const V in j)if(j[V].location>=0){let st=W[V];st===void 0&&(V==="instanceMatrix"&&S.instanceMatrix&&(st=S.instanceMatrix),V==="instanceColor"&&S.instanceColor&&(st=S.instanceColor));const xt={};xt.attribute=st,st&&st.data&&(xt.data=st.data),O[V]=xt,B++}s.attributes=O,s.attributesNum=B,s.index=I}function g(){const S=s.newAttributes;for(let w=0,D=S.length;w<D;w++)S[w]=0}function m(S){p(S,0)}function p(S,w){const D=s.newAttributes,I=s.enabledAttributes,O=s.attributeDivisors;D[S]=1,I[S]===0&&(n.enableVertexAttribArray(S),I[S]=1),O[S]!==w&&(n.vertexAttribDivisor(S,w),O[S]=w)}function y(){const S=s.newAttributes,w=s.enabledAttributes;for(let D=0,I=w.length;D<I;D++)w[D]!==S[D]&&(n.disableVertexAttribArray(D),w[D]=0)}function E(S,w,D,I,O,W,B){B===!0?n.vertexAttribIPointer(S,w,D,O,W):n.vertexAttribPointer(S,w,D,I,O,W)}function v(S,w,D,I){g();const O=I.attributes,W=D.getAttributes(),B=w.defaultAttributeValues;for(const j in W){const V=W[j];if(V.location>=0){let it=O[j];if(it===void 0&&(j==="instanceMatrix"&&S.instanceMatrix&&(it=S.instanceMatrix),j==="instanceColor"&&S.instanceColor&&(it=S.instanceColor)),it!==void 0){const st=it.normalized,xt=it.itemSize,It=t.get(it);if(It===void 0)continue;const Rt=It.buffer,$=It.type,J=It.bytesPerElement,gt=$===n.INT||$===n.UNSIGNED_INT||it.gpuType===zo;if(it.isInterleavedBufferAttribute){const ut=it.data,wt=ut.stride,jt=it.offset;if(ut.isInstancedInterleavedBuffer){for(let Ut=0;Ut<V.locationSize;Ut++)p(V.location+Ut,ut.meshPerAttribute);S.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=ut.meshPerAttribute*ut.count)}else for(let Ut=0;Ut<V.locationSize;Ut++)m(V.location+Ut);n.bindBuffer(n.ARRAY_BUFFER,Rt);for(let Ut=0;Ut<V.locationSize;Ut++)E(V.location+Ut,xt/V.locationSize,$,st,wt*J,(jt+xt/V.locationSize*Ut)*J,gt)}else{if(it.isInstancedBufferAttribute){for(let ut=0;ut<V.locationSize;ut++)p(V.location+ut,it.meshPerAttribute);S.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let ut=0;ut<V.locationSize;ut++)m(V.location+ut);n.bindBuffer(n.ARRAY_BUFFER,Rt);for(let ut=0;ut<V.locationSize;ut++)E(V.location+ut,xt/V.locationSize,$,st,xt*J,xt/V.locationSize*ut*J,gt)}}else if(B!==void 0){const st=B[j];if(st!==void 0)switch(st.length){case 2:n.vertexAttrib2fv(V.location,st);break;case 3:n.vertexAttrib3fv(V.location,st);break;case 4:n.vertexAttrib4fv(V.location,st);break;default:n.vertexAttrib1fv(V.location,st)}}}}y()}function C(){L();for(const S in i){const w=i[S];for(const D in w){const I=w[D];for(const O in I)f(I[O].object),delete I[O];delete w[D]}delete i[S]}}function R(S){if(i[S.id]===void 0)return;const w=i[S.id];for(const D in w){const I=w[D];for(const O in I)f(I[O].object),delete I[O];delete w[D]}delete i[S.id]}function b(S){for(const w in i){const D=i[w];if(D[S.id]===void 0)continue;const I=D[S.id];for(const O in I)f(I[O].object),delete I[O];delete D[S.id]}}function L(){x(),o=!0,s!==r&&(s=r,c(s.object))}function x(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:L,resetDefaultState:x,dispose:C,releaseStatesOfGeometry:R,releaseStatesOfProgram:b,initAttributes:g,enableAttribute:m,disableUnusedAttributes:y}}function Np(n,t,e){let i;function r(c){i=c}function s(c,f){n.drawArrays(i,c,f),e.update(f,i,1)}function o(c,f,u){u!==0&&(n.drawArraysInstanced(i,c,f,u),e.update(f,i,u))}function a(c,f,u){if(u===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,f,0,u);let d=0;for(let _=0;_<u;_++)d+=f[_];e.update(d,i,1)}function l(c,f,u,h){if(u===0)return;const d=t.get("WEBGL_multi_draw");if(d===null)for(let _=0;_<c.length;_++)o(c[_],f[_],h[_]);else{d.multiDrawArraysInstancedWEBGL(i,c,0,f,0,h,0,u);let _=0;for(let g=0;g<u;g++)_+=f[g]*h[g];e.update(_,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Op(n,t,e,i){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){const b=t.get("EXT_texture_filter_anisotropic");r=n.getParameter(b.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(b){return!(b!==Ye&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(b){const L=b===cr&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(b!==_n&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&b!==fn&&!L)}function l(b){if(b==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";b="mediump"}return b==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const f=l(c);f!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",f,"instead."),c=f);const u=e.logarithmicDepthBuffer===!0,h=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),d=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),_=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),y=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),E=n.getParameter(n.MAX_VARYING_VECTORS),v=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),C=_>0,R=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reverseDepthBuffer:h,maxTextures:d,maxVertexTextures:_,maxTextureSize:g,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:y,maxVaryings:E,maxFragmentUniforms:v,vertexTextures:C,maxSamples:R}}function Bp(n){const t=this;let e=null,i=0,r=!1,s=!1;const o=new jn,a=new zt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,h){const d=u.length!==0||h||i!==0||r;return r=h,i=u.length,d},this.beginShadows=function(){s=!0,f(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,h){e=f(u,h,0)},this.setState=function(u,h,d){const _=u.clippingPlanes,g=u.clipIntersection,m=u.clipShadows,p=n.get(u);if(!r||_===null||_.length===0||s&&!m)s?f(null):c();else{const y=s?0:i,E=y*4;let v=p.clippingState||null;l.value=v,v=f(_,h,E,d);for(let C=0;C!==E;++C)v[C]=e[C];p.clippingState=v,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function f(u,h,d,_){const g=u!==null?u.length:0;let m=null;if(g!==0){if(m=l.value,_!==!0||m===null){const p=d+g*4,y=h.matrixWorldInverse;a.getNormalMatrix(y),(m===null||m.length<p)&&(m=new Float32Array(p));for(let E=0,v=d;E!==g;++E,v+=4)o.copy(u[E]).applyMatrix4(y,a),o.normal.toArray(m,v),m[v+3]=o.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,m}}function zp(n){let t=new WeakMap;function e(o,a){return a===io?o.mapping=Fi:a===ro&&(o.mapping=Ni),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===io||a===ro)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Gh(l.height);return c.fromEquirectangularTexture(n,o),t.set(o,c),o.addEventListener("dispose",r),e(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function s(){t=new WeakMap}return{get:i,dispose:s}}const Li=4,Ba=[.125,.215,.35,.446,.526,.582],Zn=20,Bs=new hc,za=new re;let zs=null,ks=0,Hs=0,Gs=!1;const $n=(1+Math.sqrt(5))/2,yi=1/$n,ka=[new k(-$n,yi,0),new k($n,yi,0),new k(-yi,0,$n),new k(yi,0,$n),new k(0,$n,-yi),new k(0,$n,yi),new k(-1,1,-1),new k(1,1,-1),new k(-1,1,1),new k(1,1,1)],kp=new k;class Ha{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,i=.1,r=100,s={}){const{size:o=256,position:a=kp}=s;zs=this._renderer.getRenderTarget(),ks=this._renderer.getActiveCubeFace(),Hs=this._renderer.getActiveMipmapLevel(),Gs=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,i,r,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Wa(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Va(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(zs,ks,Hs),this._renderer.xr.enabled=Gs,t.scissorTest=!1,Br(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Fi||t.mapping===Ni?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),zs=this._renderer.getRenderTarget(),ks=this._renderer.getActiveCubeFace(),Hs=this._renderer.getActiveMipmapLevel(),Gs=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:en,minFilter:en,generateMipmaps:!1,type:cr,format:Ye,colorSpace:Oi,depthBuffer:!1},r=Ga(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ga(t,e,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Hp(s)),this._blurMaterial=Gp(s,t,e)}return r}_compileMaterial(t){const e=new dn(this._lodPlanes[0],t);this._renderer.compile(e,Bs)}_sceneToCubeUV(t,e,i,r,s){const l=new ln(90,1,e,i),c=[1,-1,1,1,1,1],f=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,d=u.toneMapping;u.getClearColor(za),u.toneMapping=zn,u.autoClear=!1;const _=new ic({name:"PMREM.Background",side:ke,depthWrite:!1,depthTest:!1}),g=new dn(new fr,_);let m=!1;const p=t.background;p?p.isColor&&(_.color.copy(p),t.background=null,m=!0):(_.color.copy(za),m=!0);for(let y=0;y<6;y++){const E=y%3;E===0?(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+f[y],s.y,s.z)):E===1?(l.up.set(0,0,c[y]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+f[y],s.z)):(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+f[y]));const v=this._cubeSize;Br(r,E*v,y>2?v:0,v,v),u.setRenderTarget(r),m&&u.render(g,l),u.render(t,l)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=d,u.autoClear=h,t.background=p}_textureToCubeUV(t,e){const i=this._renderer,r=t.mapping===Fi||t.mapping===Ni;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Wa()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Va());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new dn(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=t;const l=this._cubeSize;Br(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(o,Bs)}_applyPMREM(t){const e=this._renderer,i=e.autoClear;e.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=ka[(r-s-1)%ka.length];this._blur(t,s-1,s,o,a)}e.autoClear=i}_blur(t,e,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,i,r,"latitudinal",s),this._halfBlur(o,t,i,i,r,"longitudinal",s)}_halfBlur(t,e,i,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const f=3,u=new dn(this._lodPlanes[r],c),h=c.uniforms,d=this._sizeLods[i]-1,_=isFinite(s)?Math.PI/(2*d):2*Math.PI/(2*Zn-1),g=s/_,m=isFinite(s)?1+Math.floor(f*g):Zn;m>Zn&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Zn}`);const p=[];let y=0;for(let b=0;b<Zn;++b){const L=b/g,x=Math.exp(-L*L/2);p.push(x),b===0?y+=x:b<m&&(y+=2*x)}for(let b=0;b<p.length;b++)p[b]=p[b]/y;h.envMap.value=t.texture,h.samples.value=m,h.weights.value=p,h.latitudinal.value=o==="latitudinal",a&&(h.poleAxis.value=a);const{_lodMax:E}=this;h.dTheta.value=_,h.mipInt.value=E-i;const v=this._sizeLods[r],C=3*v*(r>E-Li?r-E+Li:0),R=4*(this._cubeSize-v);Br(e,C,R,3*v,2*v),l.setRenderTarget(e),l.render(u,Bs)}}function Hp(n){const t=[],e=[],i=[];let r=n;const s=n-Li+1+Ba.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);e.push(a);let l=1/a;o>n-Li?l=Ba[o-n+Li-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),f=-c,u=1+c,h=[f,f,u,f,u,u,f,f,u,u,f,u],d=6,_=6,g=3,m=2,p=1,y=new Float32Array(g*_*d),E=new Float32Array(m*_*d),v=new Float32Array(p*_*d);for(let R=0;R<d;R++){const b=R%3*2/3-1,L=R>2?0:-1,x=[b,L,0,b+2/3,L,0,b+2/3,L+1,0,b,L,0,b+2/3,L+1,0,b,L+1,0];y.set(x,g*_*R),E.set(h,m*_*R);const S=[R,R,R,R,R,R];v.set(S,p*_*R)}const C=new si;C.setAttribute("position",new pn(y,g)),C.setAttribute("uv",new pn(E,m)),C.setAttribute("faceIndex",new pn(v,p)),t.push(C),r>Li&&r--}return{lodPlanes:t,sizeLods:e,sigmas:i}}function Ga(n,t,e){const i=new Xe(n,t,e);return i.texture.mapping=cs,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Br(n,t,e,i,r){n.viewport.set(t,e,i,r),n.scissor.set(t,e,i,r)}function Gp(n,t,e){const i=new Float32Array(Zn),r=new k(0,1,0);return new Pn({name:"SphericalGaussianBlur",defines:{n:Zn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:jo(),fragmentShader:`

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
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function Va(){return new Pn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:jo(),fragmentShader:`

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
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function Wa(){return new Pn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:jo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Bn,depthTest:!1,depthWrite:!1})}function jo(){return`

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
	`}function Vp(n){let t=new WeakMap,e=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===io||l===ro,f=l===Fi||l===Ni;if(c||f){let u=t.get(a);const h=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==h)return e===null&&(e=new Ha(n)),u=c?e.fromEquirectangular(a,u):e.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),u.texture;if(u!==void 0)return u.texture;{const d=a.image;return c&&d&&d.height>0||f&&d&&r(d)?(e===null&&(e=new Ha(n)),u=c?e.fromEquirectangular(a):e.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,t.set(a,u),a.addEventListener("dispose",s),u.texture):null}}}return a}function r(a){let l=0;const c=6;for(let f=0;f<c;f++)a[f]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:o}}function Wp(n){const t={};function e(i){if(t[i]!==void 0)return t[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return t[i]=r,r}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const r=e(i);return r===null&&Kr("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function Xp(n,t,e,i){const r={},s=new WeakMap;function o(u){const h=u.target;h.index!==null&&t.remove(h.index);for(const _ in h.attributes)t.remove(h.attributes[_]);h.removeEventListener("dispose",o),delete r[h.id];const d=s.get(h);d&&(t.remove(d),s.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,e.memory.geometries--}function a(u,h){return r[h.id]===!0||(h.addEventListener("dispose",o),r[h.id]=!0,e.memory.geometries++),h}function l(u){const h=u.attributes;for(const d in h)t.update(h[d],n.ARRAY_BUFFER)}function c(u){const h=[],d=u.index,_=u.attributes.position;let g=0;if(d!==null){const y=d.array;g=d.version;for(let E=0,v=y.length;E<v;E+=3){const C=y[E+0],R=y[E+1],b=y[E+2];h.push(C,R,R,b,b,C)}}else if(_!==void 0){const y=_.array;g=_.version;for(let E=0,v=y.length/3-1;E<v;E+=3){const C=E+0,R=E+1,b=E+2;h.push(C,R,R,b,b,C)}}else return;const m=new(Ql(h)?sc:rc)(h,1);m.version=g;const p=s.get(u);p&&t.remove(p),s.set(u,m)}function f(u){const h=s.get(u);if(h){const d=u.index;d!==null&&h.version<d.version&&c(u)}else c(u);return s.get(u)}return{get:a,update:l,getWireframeAttribute:f}}function qp(n,t,e){let i;function r(h){i=h}let s,o;function a(h){s=h.type,o=h.bytesPerElement}function l(h,d){n.drawElements(i,d,s,h*o),e.update(d,i,1)}function c(h,d,_){_!==0&&(n.drawElementsInstanced(i,d,s,h*o,_),e.update(d,i,_))}function f(h,d,_){if(_===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,s,h,0,_);let m=0;for(let p=0;p<_;p++)m+=d[p];e.update(m,i,1)}function u(h,d,_,g){if(_===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<h.length;p++)c(h[p]/o,d[p],g[p]);else{m.multiDrawElementsInstancedWEBGL(i,d,0,s,h,0,g,0,_);let p=0;for(let y=0;y<_;y++)p+=d[y]*g[y];e.update(p,i,1)}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=f,this.renderMultiDrawInstances=u}function Yp(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(e.calls++,o){case n.TRIANGLES:e.triangles+=a*(s/3);break;case n.LINES:e.lines+=a*(s/2);break;case n.LINE_STRIP:e.lines+=a*(s-1);break;case n.LINE_LOOP:e.lines+=a*s;break;case n.POINTS:e.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:r,update:i}}function jp(n,t,e){const i=new WeakMap,r=new _e;function s(o,a,l){const c=o.morphTargetInfluences,f=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=f!==void 0?f.length:0;let h=i.get(a);if(h===void 0||h.count!==u){let x=function(){b.dispose(),i.delete(a),a.removeEventListener("dispose",x)};h!==void 0&&h.texture.dispose();const d=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let E=0;d===!0&&(E=1),_===!0&&(E=2),g===!0&&(E=3);let v=a.attributes.position.count*E,C=1;v>t.maxTextureSize&&(C=Math.ceil(v/t.maxTextureSize),v=t.maxTextureSize);const R=new Float32Array(v*C*4*u),b=new tc(R,v,C,u);b.type=fn,b.needsUpdate=!0;const L=E*4;for(let S=0;S<u;S++){const w=m[S],D=p[S],I=y[S],O=v*C*4*S;for(let W=0;W<w.count;W++){const B=W*L;d===!0&&(r.fromBufferAttribute(w,W),R[O+B+0]=r.x,R[O+B+1]=r.y,R[O+B+2]=r.z,R[O+B+3]=0),_===!0&&(r.fromBufferAttribute(D,W),R[O+B+4]=r.x,R[O+B+5]=r.y,R[O+B+6]=r.z,R[O+B+7]=0),g===!0&&(r.fromBufferAttribute(I,W),R[O+B+8]=r.x,R[O+B+9]=r.y,R[O+B+10]=r.z,R[O+B+11]=I.itemSize===4?r.w:1)}}h={count:u,texture:b,size:new Zt(v,C)},i.set(a,h),a.addEventListener("dispose",x)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,e);else{let d=0;for(let g=0;g<c.length;g++)d+=c[g];const _=a.morphTargetsRelative?1:1-d;l.getUniforms().setValue(n,"morphTargetBaseInfluence",_),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",h.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",h.size)}return{update:s}}function $p(n,t,e,i){let r=new WeakMap;function s(l){const c=i.render.frame,f=l.geometry,u=t.get(l,f);if(r.get(u)!==c&&(t.update(u),r.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(e.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const h=l.skeleton;r.get(h)!==c&&(h.update(),r.set(h,c))}return u}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:s,dispose:o}}const dc=new He,Xa=new uc(1,1),pc=new tc,mc=new Th,_c=new lc,qa=[],Ya=[],ja=new Float32Array(16),$a=new Float32Array(9),Ka=new Float32Array(4);function Vi(n,t,e){const i=n[0];if(i<=0||i>0)return n;const r=t*e;let s=qa[r];if(s===void 0&&(s=new Float32Array(r),qa[r]=s),t!==0){i.toArray(s,0);for(let o=1,a=0;o!==t;++o)a+=e,n[o].toArray(s,a)}return s}function Se(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function Me(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function hs(n,t){let e=Ya[t];e===void 0&&(e=new Int32Array(t),Ya[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function Kp(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function Zp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Se(e,t))return;n.uniform2fv(this.addr,t),Me(e,t)}}function Jp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Se(e,t))return;n.uniform3fv(this.addr,t),Me(e,t)}}function Qp(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Se(e,t))return;n.uniform4fv(this.addr,t),Me(e,t)}}function tm(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Se(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),Me(e,t)}else{if(Se(e,i))return;Ka.set(i),n.uniformMatrix2fv(this.addr,!1,Ka),Me(e,i)}}function em(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Se(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),Me(e,t)}else{if(Se(e,i))return;$a.set(i),n.uniformMatrix3fv(this.addr,!1,$a),Me(e,i)}}function nm(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Se(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),Me(e,t)}else{if(Se(e,i))return;ja.set(i),n.uniformMatrix4fv(this.addr,!1,ja),Me(e,i)}}function im(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function rm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Se(e,t))return;n.uniform2iv(this.addr,t),Me(e,t)}}function sm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Se(e,t))return;n.uniform3iv(this.addr,t),Me(e,t)}}function om(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Se(e,t))return;n.uniform4iv(this.addr,t),Me(e,t)}}function am(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function lm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Se(e,t))return;n.uniform2uiv(this.addr,t),Me(e,t)}}function cm(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Se(e,t))return;n.uniform3uiv(this.addr,t),Me(e,t)}}function um(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Se(e,t))return;n.uniform4uiv(this.addr,t),Me(e,t)}}function hm(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(Xa.compareFunction=Jl,s=Xa):s=dc,e.setTexture2D(t||s,r)}function fm(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),e.setTexture3D(t||mc,r)}function dm(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),e.setTextureCube(t||_c,r)}function pm(n,t,e){const i=this.cache,r=e.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),e.setTexture2DArray(t||pc,r)}function mm(n){switch(n){case 5126:return Kp;case 35664:return Zp;case 35665:return Jp;case 35666:return Qp;case 35674:return tm;case 35675:return em;case 35676:return nm;case 5124:case 35670:return im;case 35667:case 35671:return rm;case 35668:case 35672:return sm;case 35669:case 35673:return om;case 5125:return am;case 36294:return lm;case 36295:return cm;case 36296:return um;case 35678:case 36198:case 36298:case 36306:case 35682:return hm;case 35679:case 36299:case 36307:return fm;case 35680:case 36300:case 36308:case 36293:return dm;case 36289:case 36303:case 36311:case 36292:return pm}}function _m(n,t){n.uniform1fv(this.addr,t)}function gm(n,t){const e=Vi(t,this.size,2);n.uniform2fv(this.addr,e)}function vm(n,t){const e=Vi(t,this.size,3);n.uniform3fv(this.addr,e)}function xm(n,t){const e=Vi(t,this.size,4);n.uniform4fv(this.addr,e)}function Sm(n,t){const e=Vi(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function Mm(n,t){const e=Vi(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function ym(n,t){const e=Vi(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function Em(n,t){n.uniform1iv(this.addr,t)}function Tm(n,t){n.uniform2iv(this.addr,t)}function bm(n,t){n.uniform3iv(this.addr,t)}function Am(n,t){n.uniform4iv(this.addr,t)}function wm(n,t){n.uniform1uiv(this.addr,t)}function Rm(n,t){n.uniform2uiv(this.addr,t)}function Cm(n,t){n.uniform3uiv(this.addr,t)}function Pm(n,t){n.uniform4uiv(this.addr,t)}function Lm(n,t,e){const i=this.cache,r=t.length,s=hs(e,r);Se(i,s)||(n.uniform1iv(this.addr,s),Me(i,s));for(let o=0;o!==r;++o)e.setTexture2D(t[o]||dc,s[o])}function Dm(n,t,e){const i=this.cache,r=t.length,s=hs(e,r);Se(i,s)||(n.uniform1iv(this.addr,s),Me(i,s));for(let o=0;o!==r;++o)e.setTexture3D(t[o]||mc,s[o])}function Im(n,t,e){const i=this.cache,r=t.length,s=hs(e,r);Se(i,s)||(n.uniform1iv(this.addr,s),Me(i,s));for(let o=0;o!==r;++o)e.setTextureCube(t[o]||_c,s[o])}function Um(n,t,e){const i=this.cache,r=t.length,s=hs(e,r);Se(i,s)||(n.uniform1iv(this.addr,s),Me(i,s));for(let o=0;o!==r;++o)e.setTexture2DArray(t[o]||pc,s[o])}function Fm(n){switch(n){case 5126:return _m;case 35664:return gm;case 35665:return vm;case 35666:return xm;case 35674:return Sm;case 35675:return Mm;case 35676:return ym;case 5124:case 35670:return Em;case 35667:case 35671:return Tm;case 35668:case 35672:return bm;case 35669:case 35673:return Am;case 5125:return wm;case 36294:return Rm;case 36295:return Cm;case 36296:return Pm;case 35678:case 36198:case 36298:case 36306:case 35682:return Lm;case 35679:case 36299:case 36307:return Dm;case 35680:case 36300:case 36308:case 36293:return Im;case 36289:case 36303:case 36311:case 36292:return Um}}class Nm{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=mm(e.type)}}class Om{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Fm(e.type)}}class Bm{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(t,e[a.id],i)}}}const Vs=/(\w+)(\])?(\[|\.)?/g;function Za(n,t){n.seq.push(t),n.map[t.id]=t}function zm(n,t,e){const i=n.name,r=i.length;for(Vs.lastIndex=0;;){const s=Vs.exec(i),o=Vs.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){Za(e,c===void 0?new Nm(a,n,t):new Om(a,n,t));break}else{let u=e.map[a];u===void 0&&(u=new Bm(a),Za(e,u)),e=u}}}class Zr{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=t.getActiveUniform(e,r),o=t.getUniformLocation(e,s.name);zm(s,o,this)}}setValue(t,e,i,r){const s=this.map[e];s!==void 0&&s.setValue(t,i,r)}setOptional(t,e,i){const r=e[i];r!==void 0&&this.setValue(t,i,r)}static upload(t,e,i,r){for(let s=0,o=e.length;s!==o;++s){const a=e[s],l=i[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,r)}}static seqWithValue(t,e){const i=[];for(let r=0,s=t.length;r!==s;++r){const o=t[r];o.id in e&&i.push(o)}return i}}function Ja(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const km=37297;let Hm=0;function Gm(n,t){const e=n.split(`
`),i=[],r=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}const Qa=new zt;function Vm(n){Qt._getMatrix(Qa,Qt.workingColorSpace,n);const t=`mat3( ${Qa.elements.map(e=>e.toFixed(4))} )`;switch(Qt.getTransfer(n)){case es:return[t,"LinearTransferOETF"];case ae:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function tl(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),r=n.getShaderInfoLog(t).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return e.toUpperCase()+`

`+r+`

`+Gm(n.getShaderSource(t),o)}else return r}function Wm(n,t){const e=Vm(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Xm(n,t){let e;switch(t){case Iu:e="Linear";break;case Uu:e="Reinhard";break;case Fu:e="Cineon";break;case Nu:e="ACESFilmic";break;case Bu:e="AgX";break;case zu:e="Neutral";break;case Ou:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const zr=new k;function qm(){Qt.getLuminanceCoefficients(zr);const n=zr.x.toFixed(4),t=zr.y.toFixed(4),e=zr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ym(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ji).join(`
`)}function jm(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function $m(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(t,r),o=s.name;let a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),e[o]={type:s.type,location:n.getAttribLocation(t,o),locationSize:a}}return e}function Ji(n){return n!==""}function el(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function nl(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Km=/^[ \t]*#include +<([\w\d./]+)>/gm;function Uo(n){return n.replace(Km,Jm)}const Zm=new Map;function Jm(n,t){let e=kt[t];if(e===void 0){const i=Zm.get(t);if(i!==void 0)e=kt[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Uo(e)}const Qm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function il(n){return n.replace(Qm,t_)}function t_(n,t,e,i){let r="";for(let s=parseInt(t);s<parseInt(e);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function rl(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function e_(n){let t="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===zl?t="SHADOWMAP_TYPE_PCF":n.shadowMapType===fu?t="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Tn&&(t="SHADOWMAP_TYPE_VSM"),t}function n_(n){let t="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Fi:case Ni:t="ENVMAP_TYPE_CUBE";break;case cs:t="ENVMAP_TYPE_CUBE_UV";break}return t}function i_(n){let t="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Ni:t="ENVMAP_MODE_REFRACTION";break}return t}function r_(n){let t="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case kl:t="ENVMAP_BLENDING_MULTIPLY";break;case Lu:t="ENVMAP_BLENDING_MIX";break;case Du:t="ENVMAP_BLENDING_ADD";break}return t}function s_(n){const t=n.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function o_(n,t,e,i){const r=n.getContext(),s=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=e_(e),c=n_(e),f=i_(e),u=r_(e),h=s_(e),d=Ym(e),_=jm(s),g=r.createProgram();let m,p,y=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Ji).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Ji).join(`
`),p.length>0&&(p+=`
`)):(m=[rl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+f:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ji).join(`
`),p=[rl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+f:"",e.envMap?"#define "+u:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==zn?"#define TONE_MAPPING":"",e.toneMapping!==zn?kt.tonemapping_pars_fragment:"",e.toneMapping!==zn?Xm("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",kt.colorspace_pars_fragment,Wm("linearToOutputTexel",e.outputColorSpace),qm(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ji).join(`
`)),o=Uo(o),o=el(o,e),o=nl(o,e),a=Uo(a),a=el(a,e),a=nl(a,e),o=il(o),a=il(a),e.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===ga?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===ga?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const E=y+m+o,v=y+p+a,C=Ja(r,r.VERTEX_SHADER,E),R=Ja(r,r.FRAGMENT_SHADER,v);r.attachShader(g,C),r.attachShader(g,R),e.index0AttributeName!==void 0?r.bindAttribLocation(g,0,e.index0AttributeName):e.morphTargets===!0&&r.bindAttribLocation(g,0,"position"),r.linkProgram(g);function b(w){if(n.debug.checkShaderErrors){const D=r.getProgramInfoLog(g).trim(),I=r.getShaderInfoLog(C).trim(),O=r.getShaderInfoLog(R).trim();let W=!0,B=!0;if(r.getProgramParameter(g,r.LINK_STATUS)===!1)if(W=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,g,C,R);else{const j=tl(r,C,"vertex"),V=tl(r,R,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(g,r.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+D+`
`+j+`
`+V)}else D!==""?console.warn("THREE.WebGLProgram: Program Info Log:",D):(I===""||O==="")&&(B=!1);B&&(w.diagnostics={runnable:W,programLog:D,vertexShader:{log:I,prefix:m},fragmentShader:{log:O,prefix:p}})}r.deleteShader(C),r.deleteShader(R),L=new Zr(r,g),x=$m(r,g)}let L;this.getUniforms=function(){return L===void 0&&b(this),L};let x;this.getAttributes=function(){return x===void 0&&b(this),x};let S=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=r.getProgramParameter(g,km)),S},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Hm++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=C,this.fragmentShader=R,this}let a_=0;class l_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,i=t.fragmentShader,r=this._getShaderStage(e),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new c_(t),e.set(t,i)),i}}class c_{constructor(t){this.id=a_++,this.code=t,this.usedTimes=0}}function u_(n,t,e,i,r,s,o){const a=new ec,l=new l_,c=new Set,f=[],u=r.logarithmicDepthBuffer,h=r.vertexTextures;let d=r.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(x){return c.add(x),x===0?"uv":`uv${x}`}function m(x,S,w,D,I){const O=D.fog,W=I.geometry,B=x.isMeshStandardMaterial?D.environment:null,j=(x.isMeshStandardMaterial?e:t).get(x.envMap||B),V=j&&j.mapping===cs?j.image.height:null,it=_[x.type];x.precision!==null&&(d=r.getMaxPrecision(x.precision),d!==x.precision&&console.warn("THREE.WebGLProgram.getParameters:",x.precision,"not supported, using",d,"instead."));const st=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,xt=st!==void 0?st.length:0;let It=0;W.morphAttributes.position!==void 0&&(It=1),W.morphAttributes.normal!==void 0&&(It=2),W.morphAttributes.color!==void 0&&(It=3);let Rt,$,J,gt;if(it){const $t=hn[it];Rt=$t.vertexShader,$=$t.fragmentShader}else Rt=x.vertexShader,$=x.fragmentShader,l.update(x),J=l.getVertexShaderID(x),gt=l.getFragmentShaderID(x);const ut=n.getRenderTarget(),wt=n.state.buffers.depth.getReversed(),jt=I.isInstancedMesh===!0,Ut=I.isBatchedMesh===!0,ne=!!x.map,ce=!!x.matcap,Vt=!!j,U=!!x.aoMap,Le=!!x.lightMap,Yt=!!x.bumpMap,Wt=!!x.normalMap,At=!!x.displacementMap,ie=!!x.emissiveMap,Tt=!!x.metalnessMap,P=!!x.roughnessMap,M=x.anisotropy>0,G=x.clearcoat>0,tt=x.dispersion>0,rt=x.iridescence>0,Q=x.sheen>0,bt=x.transmission>0,ht=M&&!!x.anisotropyMap,vt=G&&!!x.clearcoatMap,Ht=G&&!!x.clearcoatNormalMap,at=G&&!!x.clearcoatRoughnessMap,St=rt&&!!x.iridescenceMap,Lt=rt&&!!x.iridescenceThicknessMap,Ct=Q&&!!x.sheenColorMap,Mt=Q&&!!x.sheenRoughnessMap,Xt=!!x.specularMap,Bt=!!x.specularColorMap,se=!!x.specularIntensityMap,F=bt&&!!x.transmissionMap,ft=bt&&!!x.thicknessMap,Y=!!x.gradientMap,et=!!x.alphaMap,pt=x.alphaTest>0,dt=!!x.alphaHash,Ot=!!x.extensions;let ue=zn;x.toneMapped&&(ut===null||ut.isXRRenderTarget===!0)&&(ue=n.toneMapping);const ye={shaderID:it,shaderType:x.type,shaderName:x.name,vertexShader:Rt,fragmentShader:$,defines:x.defines,customVertexShaderID:J,customFragmentShaderID:gt,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:d,batching:Ut,batchingColor:Ut&&I._colorsTexture!==null,instancing:jt,instancingColor:jt&&I.instanceColor!==null,instancingMorph:jt&&I.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:ut===null?n.outputColorSpace:ut.isXRRenderTarget===!0?ut.texture.colorSpace:Oi,alphaToCoverage:!!x.alphaToCoverage,map:ne,matcap:ce,envMap:Vt,envMapMode:Vt&&j.mapping,envMapCubeUVHeight:V,aoMap:U,lightMap:Le,bumpMap:Yt,normalMap:Wt,displacementMap:h&&At,emissiveMap:ie,normalMapObjectSpace:Wt&&x.normalMapType===Wu,normalMapTangentSpace:Wt&&x.normalMapType===Vu,metalnessMap:Tt,roughnessMap:P,anisotropy:M,anisotropyMap:ht,clearcoat:G,clearcoatMap:vt,clearcoatNormalMap:Ht,clearcoatRoughnessMap:at,dispersion:tt,iridescence:rt,iridescenceMap:St,iridescenceThicknessMap:Lt,sheen:Q,sheenColorMap:Ct,sheenRoughnessMap:Mt,specularMap:Xt,specularColorMap:Bt,specularIntensityMap:se,transmission:bt,transmissionMap:F,thicknessMap:ft,gradientMap:Y,opaque:x.transparent===!1&&x.blending===Di&&x.alphaToCoverage===!1,alphaMap:et,alphaTest:pt,alphaHash:dt,combine:x.combine,mapUv:ne&&g(x.map.channel),aoMapUv:U&&g(x.aoMap.channel),lightMapUv:Le&&g(x.lightMap.channel),bumpMapUv:Yt&&g(x.bumpMap.channel),normalMapUv:Wt&&g(x.normalMap.channel),displacementMapUv:At&&g(x.displacementMap.channel),emissiveMapUv:ie&&g(x.emissiveMap.channel),metalnessMapUv:Tt&&g(x.metalnessMap.channel),roughnessMapUv:P&&g(x.roughnessMap.channel),anisotropyMapUv:ht&&g(x.anisotropyMap.channel),clearcoatMapUv:vt&&g(x.clearcoatMap.channel),clearcoatNormalMapUv:Ht&&g(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:at&&g(x.clearcoatRoughnessMap.channel),iridescenceMapUv:St&&g(x.iridescenceMap.channel),iridescenceThicknessMapUv:Lt&&g(x.iridescenceThicknessMap.channel),sheenColorMapUv:Ct&&g(x.sheenColorMap.channel),sheenRoughnessMapUv:Mt&&g(x.sheenRoughnessMap.channel),specularMapUv:Xt&&g(x.specularMap.channel),specularColorMapUv:Bt&&g(x.specularColorMap.channel),specularIntensityMapUv:se&&g(x.specularIntensityMap.channel),transmissionMapUv:F&&g(x.transmissionMap.channel),thicknessMapUv:ft&&g(x.thicknessMap.channel),alphaMapUv:et&&g(x.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(Wt||M),vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!W.attributes.uv&&(ne||et),fog:!!O,useFog:x.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:x.flatShading===!0,sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:wt,skinning:I.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:xt,morphTextureStride:It,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:x.dithering,shadowMapEnabled:n.shadowMap.enabled&&w.length>0,shadowMapType:n.shadowMap.type,toneMapping:ue,decodeVideoTexture:ne&&x.map.isVideoTexture===!0&&Qt.getTransfer(x.map.colorSpace)===ae,decodeVideoTextureEmissive:ie&&x.emissiveMap.isVideoTexture===!0&&Qt.getTransfer(x.emissiveMap.colorSpace)===ae,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===bn,flipSided:x.side===ke,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:Ot&&x.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ot&&x.extensions.multiDraw===!0||Ut)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return ye.vertexUv1s=c.has(1),ye.vertexUv2s=c.has(2),ye.vertexUv3s=c.has(3),c.clear(),ye}function p(x){const S=[];if(x.shaderID?S.push(x.shaderID):(S.push(x.customVertexShaderID),S.push(x.customFragmentShaderID)),x.defines!==void 0)for(const w in x.defines)S.push(w),S.push(x.defines[w]);return x.isRawShaderMaterial===!1&&(y(S,x),E(S,x),S.push(n.outputColorSpace)),S.push(x.customProgramCacheKey),S.join()}function y(x,S){x.push(S.precision),x.push(S.outputColorSpace),x.push(S.envMapMode),x.push(S.envMapCubeUVHeight),x.push(S.mapUv),x.push(S.alphaMapUv),x.push(S.lightMapUv),x.push(S.aoMapUv),x.push(S.bumpMapUv),x.push(S.normalMapUv),x.push(S.displacementMapUv),x.push(S.emissiveMapUv),x.push(S.metalnessMapUv),x.push(S.roughnessMapUv),x.push(S.anisotropyMapUv),x.push(S.clearcoatMapUv),x.push(S.clearcoatNormalMapUv),x.push(S.clearcoatRoughnessMapUv),x.push(S.iridescenceMapUv),x.push(S.iridescenceThicknessMapUv),x.push(S.sheenColorMapUv),x.push(S.sheenRoughnessMapUv),x.push(S.specularMapUv),x.push(S.specularColorMapUv),x.push(S.specularIntensityMapUv),x.push(S.transmissionMapUv),x.push(S.thicknessMapUv),x.push(S.combine),x.push(S.fogExp2),x.push(S.sizeAttenuation),x.push(S.morphTargetsCount),x.push(S.morphAttributeCount),x.push(S.numDirLights),x.push(S.numPointLights),x.push(S.numSpotLights),x.push(S.numSpotLightMaps),x.push(S.numHemiLights),x.push(S.numRectAreaLights),x.push(S.numDirLightShadows),x.push(S.numPointLightShadows),x.push(S.numSpotLightShadows),x.push(S.numSpotLightShadowsWithMaps),x.push(S.numLightProbes),x.push(S.shadowMapType),x.push(S.toneMapping),x.push(S.numClippingPlanes),x.push(S.numClipIntersection),x.push(S.depthPacking)}function E(x,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),x.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reverseDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),x.push(a.mask)}function v(x){const S=_[x.type];let w;if(S){const D=hn[S];w=Bh.clone(D.uniforms)}else w=x.uniforms;return w}function C(x,S){let w;for(let D=0,I=f.length;D<I;D++){const O=f[D];if(O.cacheKey===S){w=O,++w.usedTimes;break}}return w===void 0&&(w=new o_(n,S,x,s),f.push(w)),w}function R(x){if(--x.usedTimes===0){const S=f.indexOf(x);f[S]=f[f.length-1],f.pop(),x.destroy()}}function b(x){l.remove(x)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:v,acquireProgram:C,releaseProgram:R,releaseShaderCache:b,programs:f,dispose:L}}function h_(){let n=new WeakMap;function t(o){return n.has(o)}function e(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function r(o,a,l){n.get(o)[a]=l}function s(){n=new WeakMap}return{has:t,get:e,remove:i,update:r,dispose:s}}function f_(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.z!==t.z?n.z-t.z:n.id-t.id}function sl(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function ol(){const n=[];let t=0;const e=[],i=[],r=[];function s(){t=0,e.length=0,i.length=0,r.length=0}function o(u,h,d,_,g,m){let p=n[t];return p===void 0?(p={id:u.id,object:u,geometry:h,material:d,groupOrder:_,renderOrder:u.renderOrder,z:g,group:m},n[t]=p):(p.id=u.id,p.object=u,p.geometry=h,p.material=d,p.groupOrder=_,p.renderOrder=u.renderOrder,p.z=g,p.group=m),t++,p}function a(u,h,d,_,g,m){const p=o(u,h,d,_,g,m);d.transmission>0?i.push(p):d.transparent===!0?r.push(p):e.push(p)}function l(u,h,d,_,g,m){const p=o(u,h,d,_,g,m);d.transmission>0?i.unshift(p):d.transparent===!0?r.unshift(p):e.unshift(p)}function c(u,h){e.length>1&&e.sort(u||f_),i.length>1&&i.sort(h||sl),r.length>1&&r.sort(h||sl)}function f(){for(let u=t,h=n.length;u<h;u++){const d=n[u];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:e,transmissive:i,transparent:r,init:s,push:a,unshift:l,finish:f,sort:c}}function d_(){let n=new WeakMap;function t(i,r){const s=n.get(i);let o;return s===void 0?(o=new ol,n.set(i,[o])):r>=s.length?(o=new ol,s.push(o)):o=s[r],o}function e(){n=new WeakMap}return{get:t,dispose:e}}function p_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new k,color:new re};break;case"SpotLight":e={position:new k,direction:new k,color:new re,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new k,color:new re,distance:0,decay:0};break;case"HemisphereLight":e={direction:new k,skyColor:new re,groundColor:new re};break;case"RectAreaLight":e={color:new re,position:new k,halfWidth:new k,halfHeight:new k};break}return n[t.id]=e,e}}}function m_(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Zt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Zt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Zt,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let __=0;function g_(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function v_(n){const t=new p_,e=m_(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new k);const r=new k,s=new xe,o=new xe;function a(c){let f=0,u=0,h=0;for(let x=0;x<9;x++)i.probe[x].set(0,0,0);let d=0,_=0,g=0,m=0,p=0,y=0,E=0,v=0,C=0,R=0,b=0;c.sort(g_);for(let x=0,S=c.length;x<S;x++){const w=c[x],D=w.color,I=w.intensity,O=w.distance,W=w.shadow&&w.shadow.map?w.shadow.map.texture:null;if(w.isAmbientLight)f+=D.r*I,u+=D.g*I,h+=D.b*I;else if(w.isLightProbe){for(let B=0;B<9;B++)i.probe[B].addScaledVector(w.sh.coefficients[B],I);b++}else if(w.isDirectionalLight){const B=t.get(w);if(B.color.copy(w.color).multiplyScalar(w.intensity),w.castShadow){const j=w.shadow,V=e.get(w);V.shadowIntensity=j.intensity,V.shadowBias=j.bias,V.shadowNormalBias=j.normalBias,V.shadowRadius=j.radius,V.shadowMapSize=j.mapSize,i.directionalShadow[d]=V,i.directionalShadowMap[d]=W,i.directionalShadowMatrix[d]=w.shadow.matrix,y++}i.directional[d]=B,d++}else if(w.isSpotLight){const B=t.get(w);B.position.setFromMatrixPosition(w.matrixWorld),B.color.copy(D).multiplyScalar(I),B.distance=O,B.coneCos=Math.cos(w.angle),B.penumbraCos=Math.cos(w.angle*(1-w.penumbra)),B.decay=w.decay,i.spot[g]=B;const j=w.shadow;if(w.map&&(i.spotLightMap[C]=w.map,C++,j.updateMatrices(w),w.castShadow&&R++),i.spotLightMatrix[g]=j.matrix,w.castShadow){const V=e.get(w);V.shadowIntensity=j.intensity,V.shadowBias=j.bias,V.shadowNormalBias=j.normalBias,V.shadowRadius=j.radius,V.shadowMapSize=j.mapSize,i.spotShadow[g]=V,i.spotShadowMap[g]=W,v++}g++}else if(w.isRectAreaLight){const B=t.get(w);B.color.copy(D).multiplyScalar(I),B.halfWidth.set(w.width*.5,0,0),B.halfHeight.set(0,w.height*.5,0),i.rectArea[m]=B,m++}else if(w.isPointLight){const B=t.get(w);if(B.color.copy(w.color).multiplyScalar(w.intensity),B.distance=w.distance,B.decay=w.decay,w.castShadow){const j=w.shadow,V=e.get(w);V.shadowIntensity=j.intensity,V.shadowBias=j.bias,V.shadowNormalBias=j.normalBias,V.shadowRadius=j.radius,V.shadowMapSize=j.mapSize,V.shadowCameraNear=j.camera.near,V.shadowCameraFar=j.camera.far,i.pointShadow[_]=V,i.pointShadowMap[_]=W,i.pointShadowMatrix[_]=w.shadow.matrix,E++}i.point[_]=B,_++}else if(w.isHemisphereLight){const B=t.get(w);B.skyColor.copy(w.color).multiplyScalar(I),B.groundColor.copy(w.groundColor).multiplyScalar(I),i.hemi[p]=B,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ct.LTC_FLOAT_1,i.rectAreaLTC2=ct.LTC_FLOAT_2):(i.rectAreaLTC1=ct.LTC_HALF_1,i.rectAreaLTC2=ct.LTC_HALF_2)),i.ambient[0]=f,i.ambient[1]=u,i.ambient[2]=h;const L=i.hash;(L.directionalLength!==d||L.pointLength!==_||L.spotLength!==g||L.rectAreaLength!==m||L.hemiLength!==p||L.numDirectionalShadows!==y||L.numPointShadows!==E||L.numSpotShadows!==v||L.numSpotMaps!==C||L.numLightProbes!==b)&&(i.directional.length=d,i.spot.length=g,i.rectArea.length=m,i.point.length=_,i.hemi.length=p,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=E,i.pointShadowMap.length=E,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=E,i.spotLightMatrix.length=v+C-R,i.spotLightMap.length=C,i.numSpotLightShadowsWithMaps=R,i.numLightProbes=b,L.directionalLength=d,L.pointLength=_,L.spotLength=g,L.rectAreaLength=m,L.hemiLength=p,L.numDirectionalShadows=y,L.numPointShadows=E,L.numSpotShadows=v,L.numSpotMaps=C,L.numLightProbes=b,i.version=__++)}function l(c,f){let u=0,h=0,d=0,_=0,g=0;const m=f.matrixWorldInverse;for(let p=0,y=c.length;p<y;p++){const E=c[p];if(E.isDirectionalLight){const v=i.directional[u];v.direction.setFromMatrixPosition(E.matrixWorld),r.setFromMatrixPosition(E.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(m),u++}else if(E.isSpotLight){const v=i.spot[d];v.position.setFromMatrixPosition(E.matrixWorld),v.position.applyMatrix4(m),v.direction.setFromMatrixPosition(E.matrixWorld),r.setFromMatrixPosition(E.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(m),d++}else if(E.isRectAreaLight){const v=i.rectArea[_];v.position.setFromMatrixPosition(E.matrixWorld),v.position.applyMatrix4(m),o.identity(),s.copy(E.matrixWorld),s.premultiply(m),o.extractRotation(s),v.halfWidth.set(E.width*.5,0,0),v.halfHeight.set(0,E.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),_++}else if(E.isPointLight){const v=i.point[h];v.position.setFromMatrixPosition(E.matrixWorld),v.position.applyMatrix4(m),h++}else if(E.isHemisphereLight){const v=i.hemi[g];v.direction.setFromMatrixPosition(E.matrixWorld),v.direction.transformDirection(m),g++}}}return{setup:a,setupView:l,state:i}}function al(n){const t=new v_(n),e=[],i=[];function r(f){c.camera=f,e.length=0,i.length=0}function s(f){e.push(f)}function o(f){i.push(f)}function a(){t.setup(e)}function l(f){t.setupView(e,f)}const c={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function x_(n){let t=new WeakMap;function e(r,s=0){const o=t.get(r);let a;return o===void 0?(a=new al(n),t.set(r,[a])):s>=o.length?(a=new al(n),o.push(a)):a=o[s],a}function i(){t=new WeakMap}return{get:e,dispose:i}}const S_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,M_=`uniform sampler2D shadow_pass;
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
}`;function y_(n,t,e){let i=new cc;const r=new Zt,s=new Zt,o=new _e,a=new Yh({depthPacking:Gu}),l=new jh,c={},f=e.maxTextureSize,u={[kn]:ke,[ke]:kn,[bn]:bn},h=new Pn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Zt},radius:{value:4}},vertexShader:S_,fragmentShader:M_}),d=h.clone();d.defines.HORIZONTAL_PASS=1;const _=new si;_.setAttribute("position",new pn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new dn(_,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=zl;let p=this.type;this.render=function(R,b,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||R.length===0)return;const x=n.getRenderTarget(),S=n.getActiveCubeFace(),w=n.getActiveMipmapLevel(),D=n.state;D.setBlending(Bn),D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const I=p!==Tn&&this.type===Tn,O=p===Tn&&this.type!==Tn;for(let W=0,B=R.length;W<B;W++){const j=R[W],V=j.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;r.copy(V.mapSize);const it=V.getFrameExtents();if(r.multiply(it),s.copy(V.mapSize),(r.x>f||r.y>f)&&(r.x>f&&(s.x=Math.floor(f/it.x),r.x=s.x*it.x,V.mapSize.x=s.x),r.y>f&&(s.y=Math.floor(f/it.y),r.y=s.y*it.y,V.mapSize.y=s.y)),V.map===null||I===!0||O===!0){const xt=this.type!==Tn?{minFilter:je,magFilter:je}:{};V.map!==null&&V.map.dispose(),V.map=new Xe(r.x,r.y,xt),V.map.texture.name=j.name+".shadowMap",V.camera.updateProjectionMatrix()}n.setRenderTarget(V.map),n.clear();const st=V.getViewportCount();for(let xt=0;xt<st;xt++){const It=V.getViewport(xt);o.set(s.x*It.x,s.y*It.y,s.x*It.z,s.y*It.w),D.viewport(o),V.updateMatrices(j,xt),i=V.getFrustum(),v(b,L,V.camera,j,this.type)}V.isPointLightShadow!==!0&&this.type===Tn&&y(V,L),V.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(x,S,w)};function y(R,b){const L=t.update(g);h.defines.VSM_SAMPLES!==R.blurSamples&&(h.defines.VSM_SAMPLES=R.blurSamples,d.defines.VSM_SAMPLES=R.blurSamples,h.needsUpdate=!0,d.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new Xe(r.x,r.y)),h.uniforms.shadow_pass.value=R.map.texture,h.uniforms.resolution.value=R.mapSize,h.uniforms.radius.value=R.radius,n.setRenderTarget(R.mapPass),n.clear(),n.renderBufferDirect(b,null,L,h,g,null),d.uniforms.shadow_pass.value=R.mapPass.texture,d.uniforms.resolution.value=R.mapSize,d.uniforms.radius.value=R.radius,n.setRenderTarget(R.map),n.clear(),n.renderBufferDirect(b,null,L,d,g,null)}function E(R,b,L,x){let S=null;const w=L.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(w!==void 0)S=w;else if(S=L.isPointLight===!0?l:a,n.localClippingEnabled&&b.clipShadows===!0&&Array.isArray(b.clippingPlanes)&&b.clippingPlanes.length!==0||b.displacementMap&&b.displacementScale!==0||b.alphaMap&&b.alphaTest>0||b.map&&b.alphaTest>0){const D=S.uuid,I=b.uuid;let O=c[D];O===void 0&&(O={},c[D]=O);let W=O[I];W===void 0&&(W=S.clone(),O[I]=W,b.addEventListener("dispose",C)),S=W}if(S.visible=b.visible,S.wireframe=b.wireframe,x===Tn?S.side=b.shadowSide!==null?b.shadowSide:b.side:S.side=b.shadowSide!==null?b.shadowSide:u[b.side],S.alphaMap=b.alphaMap,S.alphaTest=b.alphaTest,S.map=b.map,S.clipShadows=b.clipShadows,S.clippingPlanes=b.clippingPlanes,S.clipIntersection=b.clipIntersection,S.displacementMap=b.displacementMap,S.displacementScale=b.displacementScale,S.displacementBias=b.displacementBias,S.wireframeLinewidth=b.wireframeLinewidth,S.linewidth=b.linewidth,L.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const D=n.properties.get(S);D.light=L}return S}function v(R,b,L,x,S){if(R.visible===!1)return;if(R.layers.test(b.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&S===Tn)&&(!R.frustumCulled||i.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,R.matrixWorld);const I=t.update(R),O=R.material;if(Array.isArray(O)){const W=I.groups;for(let B=0,j=W.length;B<j;B++){const V=W[B],it=O[V.materialIndex];if(it&&it.visible){const st=E(R,it,x,S);R.onBeforeShadow(n,R,b,L,I,st,V),n.renderBufferDirect(L,null,I,st,R,V),R.onAfterShadow(n,R,b,L,I,st,V)}}}else if(O.visible){const W=E(R,O,x,S);R.onBeforeShadow(n,R,b,L,I,W,null),n.renderBufferDirect(L,null,I,W,R,null),R.onAfterShadow(n,R,b,L,I,W,null)}}const D=R.children;for(let I=0,O=D.length;I<O;I++)v(D[I],b,L,x,S)}function C(R){R.target.removeEventListener("dispose",C);for(const L in c){const x=c[L],S=R.target.uuid;S in x&&(x[S].dispose(),delete x[S])}}}const E_={[Ks]:Zs,[Js]:eo,[Qs]:no,[Ui]:to,[Zs]:Ks,[eo]:Js,[no]:Qs,[to]:Ui};function T_(n,t){function e(){let F=!1;const ft=new _e;let Y=null;const et=new _e(0,0,0,0);return{setMask:function(pt){Y!==pt&&!F&&(n.colorMask(pt,pt,pt,pt),Y=pt)},setLocked:function(pt){F=pt},setClear:function(pt,dt,Ot,ue,ye){ye===!0&&(pt*=ue,dt*=ue,Ot*=ue),ft.set(pt,dt,Ot,ue),et.equals(ft)===!1&&(n.clearColor(pt,dt,Ot,ue),et.copy(ft))},reset:function(){F=!1,Y=null,et.set(-1,0,0,0)}}}function i(){let F=!1,ft=!1,Y=null,et=null,pt=null;return{setReversed:function(dt){if(ft!==dt){const Ot=t.get("EXT_clip_control");dt?Ot.clipControlEXT(Ot.LOWER_LEFT_EXT,Ot.ZERO_TO_ONE_EXT):Ot.clipControlEXT(Ot.LOWER_LEFT_EXT,Ot.NEGATIVE_ONE_TO_ONE_EXT),ft=dt;const ue=pt;pt=null,this.setClear(ue)}},getReversed:function(){return ft},setTest:function(dt){dt?ut(n.DEPTH_TEST):wt(n.DEPTH_TEST)},setMask:function(dt){Y!==dt&&!F&&(n.depthMask(dt),Y=dt)},setFunc:function(dt){if(ft&&(dt=E_[dt]),et!==dt){switch(dt){case Ks:n.depthFunc(n.NEVER);break;case Zs:n.depthFunc(n.ALWAYS);break;case Js:n.depthFunc(n.LESS);break;case Ui:n.depthFunc(n.LEQUAL);break;case Qs:n.depthFunc(n.EQUAL);break;case to:n.depthFunc(n.GEQUAL);break;case eo:n.depthFunc(n.GREATER);break;case no:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}et=dt}},setLocked:function(dt){F=dt},setClear:function(dt){pt!==dt&&(ft&&(dt=1-dt),n.clearDepth(dt),pt=dt)},reset:function(){F=!1,Y=null,et=null,pt=null,ft=!1}}}function r(){let F=!1,ft=null,Y=null,et=null,pt=null,dt=null,Ot=null,ue=null,ye=null;return{setTest:function($t){F||($t?ut(n.STENCIL_TEST):wt(n.STENCIL_TEST))},setMask:function($t){ft!==$t&&!F&&(n.stencilMask($t),ft=$t)},setFunc:function($t,A,H){(Y!==$t||et!==A||pt!==H)&&(n.stencilFunc($t,A,H),Y=$t,et=A,pt=H)},setOp:function($t,A,H){(dt!==$t||Ot!==A||ue!==H)&&(n.stencilOp($t,A,H),dt=$t,Ot=A,ue=H)},setLocked:function($t){F=$t},setClear:function($t){ye!==$t&&(n.clearStencil($t),ye=$t)},reset:function(){F=!1,ft=null,Y=null,et=null,pt=null,dt=null,Ot=null,ue=null,ye=null}}}const s=new e,o=new i,a=new r,l=new WeakMap,c=new WeakMap;let f={},u={},h=new WeakMap,d=[],_=null,g=!1,m=null,p=null,y=null,E=null,v=null,C=null,R=null,b=new re(0,0,0),L=0,x=!1,S=null,w=null,D=null,I=null,O=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,j=0;const V=n.getParameter(n.VERSION);V.indexOf("WebGL")!==-1?(j=parseFloat(/^WebGL (\d)/.exec(V)[1]),B=j>=1):V.indexOf("OpenGL ES")!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),B=j>=2);let it=null,st={};const xt=n.getParameter(n.SCISSOR_BOX),It=n.getParameter(n.VIEWPORT),Rt=new _e().fromArray(xt),$=new _e().fromArray(It);function J(F,ft,Y,et){const pt=new Uint8Array(4),dt=n.createTexture();n.bindTexture(F,dt),n.texParameteri(F,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(F,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Ot=0;Ot<Y;Ot++)F===n.TEXTURE_3D||F===n.TEXTURE_2D_ARRAY?n.texImage3D(ft,0,n.RGBA,1,1,et,0,n.RGBA,n.UNSIGNED_BYTE,pt):n.texImage2D(ft+Ot,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,pt);return dt}const gt={};gt[n.TEXTURE_2D]=J(n.TEXTURE_2D,n.TEXTURE_2D,1),gt[n.TEXTURE_CUBE_MAP]=J(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),gt[n.TEXTURE_2D_ARRAY]=J(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),gt[n.TEXTURE_3D]=J(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ut(n.DEPTH_TEST),o.setFunc(Ui),Yt(!1),Wt(ha),ut(n.CULL_FACE),U(Bn);function ut(F){f[F]!==!0&&(n.enable(F),f[F]=!0)}function wt(F){f[F]!==!1&&(n.disable(F),f[F]=!1)}function jt(F,ft){return u[F]!==ft?(n.bindFramebuffer(F,ft),u[F]=ft,F===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=ft),F===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=ft),!0):!1}function Ut(F,ft){let Y=d,et=!1;if(F){Y=h.get(ft),Y===void 0&&(Y=[],h.set(ft,Y));const pt=F.textures;if(Y.length!==pt.length||Y[0]!==n.COLOR_ATTACHMENT0){for(let dt=0,Ot=pt.length;dt<Ot;dt++)Y[dt]=n.COLOR_ATTACHMENT0+dt;Y.length=pt.length,et=!0}}else Y[0]!==n.BACK&&(Y[0]=n.BACK,et=!0);et&&n.drawBuffers(Y)}function ne(F){return _!==F?(n.useProgram(F),_=F,!0):!1}const ce={[Kn]:n.FUNC_ADD,[pu]:n.FUNC_SUBTRACT,[mu]:n.FUNC_REVERSE_SUBTRACT};ce[_u]=n.MIN,ce[gu]=n.MAX;const Vt={[vu]:n.ZERO,[xu]:n.ONE,[Su]:n.SRC_COLOR,[js]:n.SRC_ALPHA,[Au]:n.SRC_ALPHA_SATURATE,[Tu]:n.DST_COLOR,[yu]:n.DST_ALPHA,[Mu]:n.ONE_MINUS_SRC_COLOR,[$s]:n.ONE_MINUS_SRC_ALPHA,[bu]:n.ONE_MINUS_DST_COLOR,[Eu]:n.ONE_MINUS_DST_ALPHA,[wu]:n.CONSTANT_COLOR,[Ru]:n.ONE_MINUS_CONSTANT_COLOR,[Cu]:n.CONSTANT_ALPHA,[Pu]:n.ONE_MINUS_CONSTANT_ALPHA};function U(F,ft,Y,et,pt,dt,Ot,ue,ye,$t){if(F===Bn){g===!0&&(wt(n.BLEND),g=!1);return}if(g===!1&&(ut(n.BLEND),g=!0),F!==du){if(F!==m||$t!==x){if((p!==Kn||v!==Kn)&&(n.blendEquation(n.FUNC_ADD),p=Kn,v=Kn),$t)switch(F){case Di:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case fa:n.blendFunc(n.ONE,n.ONE);break;case da:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case pa:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}else switch(F){case Di:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case fa:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case da:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case pa:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}y=null,E=null,C=null,R=null,b.set(0,0,0),L=0,m=F,x=$t}return}pt=pt||ft,dt=dt||Y,Ot=Ot||et,(ft!==p||pt!==v)&&(n.blendEquationSeparate(ce[ft],ce[pt]),p=ft,v=pt),(Y!==y||et!==E||dt!==C||Ot!==R)&&(n.blendFuncSeparate(Vt[Y],Vt[et],Vt[dt],Vt[Ot]),y=Y,E=et,C=dt,R=Ot),(ue.equals(b)===!1||ye!==L)&&(n.blendColor(ue.r,ue.g,ue.b,ye),b.copy(ue),L=ye),m=F,x=!1}function Le(F,ft){F.side===bn?wt(n.CULL_FACE):ut(n.CULL_FACE);let Y=F.side===ke;ft&&(Y=!Y),Yt(Y),F.blending===Di&&F.transparent===!1?U(Bn):U(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),o.setFunc(F.depthFunc),o.setTest(F.depthTest),o.setMask(F.depthWrite),s.setMask(F.colorWrite);const et=F.stencilWrite;a.setTest(et),et&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),ie(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?ut(n.SAMPLE_ALPHA_TO_COVERAGE):wt(n.SAMPLE_ALPHA_TO_COVERAGE)}function Yt(F){S!==F&&(F?n.frontFace(n.CW):n.frontFace(n.CCW),S=F)}function Wt(F){F!==uu?(ut(n.CULL_FACE),F!==w&&(F===ha?n.cullFace(n.BACK):F===hu?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):wt(n.CULL_FACE),w=F}function At(F){F!==D&&(B&&n.lineWidth(F),D=F)}function ie(F,ft,Y){F?(ut(n.POLYGON_OFFSET_FILL),(I!==ft||O!==Y)&&(n.polygonOffset(ft,Y),I=ft,O=Y)):wt(n.POLYGON_OFFSET_FILL)}function Tt(F){F?ut(n.SCISSOR_TEST):wt(n.SCISSOR_TEST)}function P(F){F===void 0&&(F=n.TEXTURE0+W-1),it!==F&&(n.activeTexture(F),it=F)}function M(F,ft,Y){Y===void 0&&(it===null?Y=n.TEXTURE0+W-1:Y=it);let et=st[Y];et===void 0&&(et={type:void 0,texture:void 0},st[Y]=et),(et.type!==F||et.texture!==ft)&&(it!==Y&&(n.activeTexture(Y),it=Y),n.bindTexture(F,ft||gt[F]),et.type=F,et.texture=ft)}function G(){const F=st[it];F!==void 0&&F.type!==void 0&&(n.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function tt(){try{n.compressedTexImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function rt(){try{n.compressedTexImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Q(){try{n.texSubImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function bt(){try{n.texSubImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ht(){try{n.compressedTexSubImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function vt(){try{n.compressedTexSubImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Ht(){try{n.texStorage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function at(){try{n.texStorage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function St(){try{n.texImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Lt(){try{n.texImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Ct(F){Rt.equals(F)===!1&&(n.scissor(F.x,F.y,F.z,F.w),Rt.copy(F))}function Mt(F){$.equals(F)===!1&&(n.viewport(F.x,F.y,F.z,F.w),$.copy(F))}function Xt(F,ft){let Y=c.get(ft);Y===void 0&&(Y=new WeakMap,c.set(ft,Y));let et=Y.get(F);et===void 0&&(et=n.getUniformBlockIndex(ft,F.name),Y.set(F,et))}function Bt(F,ft){const et=c.get(ft).get(F);l.get(ft)!==et&&(n.uniformBlockBinding(ft,et,F.__bindingPointIndex),l.set(ft,et))}function se(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),f={},it=null,st={},u={},h=new WeakMap,d=[],_=null,g=!1,m=null,p=null,y=null,E=null,v=null,C=null,R=null,b=new re(0,0,0),L=0,x=!1,S=null,w=null,D=null,I=null,O=null,Rt.set(0,0,n.canvas.width,n.canvas.height),$.set(0,0,n.canvas.width,n.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:ut,disable:wt,bindFramebuffer:jt,drawBuffers:Ut,useProgram:ne,setBlending:U,setMaterial:Le,setFlipSided:Yt,setCullFace:Wt,setLineWidth:At,setPolygonOffset:ie,setScissorTest:Tt,activeTexture:P,bindTexture:M,unbindTexture:G,compressedTexImage2D:tt,compressedTexImage3D:rt,texImage2D:St,texImage3D:Lt,updateUBOMapping:Xt,uniformBlockBinding:Bt,texStorage2D:Ht,texStorage3D:at,texSubImage2D:Q,texSubImage3D:bt,compressedTexSubImage2D:ht,compressedTexSubImage3D:vt,scissor:Ct,viewport:Mt,reset:se}}function b_(n,t,e,i,r,s,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Zt,f=new WeakMap;let u;const h=new WeakMap;let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(P,M){return d?new OffscreenCanvas(P,M):is("canvas")}function g(P,M,G){let tt=1;const rt=Tt(P);if((rt.width>G||rt.height>G)&&(tt=G/Math.max(rt.width,rt.height)),tt<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const Q=Math.floor(tt*rt.width),bt=Math.floor(tt*rt.height);u===void 0&&(u=_(Q,bt));const ht=M?_(Q,bt):u;return ht.width=Q,ht.height=bt,ht.getContext("2d").drawImage(P,0,0,Q,bt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+rt.width+"x"+rt.height+") to ("+Q+"x"+bt+")."),ht}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+rt.width+"x"+rt.height+")."),P;return P}function m(P){return P.generateMipmaps}function p(P){n.generateMipmap(P)}function y(P){return P.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?n.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function E(P,M,G,tt,rt=!1){if(P!==null){if(n[P]!==void 0)return n[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let Q=M;if(M===n.RED&&(G===n.FLOAT&&(Q=n.R32F),G===n.HALF_FLOAT&&(Q=n.R16F),G===n.UNSIGNED_BYTE&&(Q=n.R8)),M===n.RED_INTEGER&&(G===n.UNSIGNED_BYTE&&(Q=n.R8UI),G===n.UNSIGNED_SHORT&&(Q=n.R16UI),G===n.UNSIGNED_INT&&(Q=n.R32UI),G===n.BYTE&&(Q=n.R8I),G===n.SHORT&&(Q=n.R16I),G===n.INT&&(Q=n.R32I)),M===n.RG&&(G===n.FLOAT&&(Q=n.RG32F),G===n.HALF_FLOAT&&(Q=n.RG16F),G===n.UNSIGNED_BYTE&&(Q=n.RG8)),M===n.RG_INTEGER&&(G===n.UNSIGNED_BYTE&&(Q=n.RG8UI),G===n.UNSIGNED_SHORT&&(Q=n.RG16UI),G===n.UNSIGNED_INT&&(Q=n.RG32UI),G===n.BYTE&&(Q=n.RG8I),G===n.SHORT&&(Q=n.RG16I),G===n.INT&&(Q=n.RG32I)),M===n.RGB_INTEGER&&(G===n.UNSIGNED_BYTE&&(Q=n.RGB8UI),G===n.UNSIGNED_SHORT&&(Q=n.RGB16UI),G===n.UNSIGNED_INT&&(Q=n.RGB32UI),G===n.BYTE&&(Q=n.RGB8I),G===n.SHORT&&(Q=n.RGB16I),G===n.INT&&(Q=n.RGB32I)),M===n.RGBA_INTEGER&&(G===n.UNSIGNED_BYTE&&(Q=n.RGBA8UI),G===n.UNSIGNED_SHORT&&(Q=n.RGBA16UI),G===n.UNSIGNED_INT&&(Q=n.RGBA32UI),G===n.BYTE&&(Q=n.RGBA8I),G===n.SHORT&&(Q=n.RGBA16I),G===n.INT&&(Q=n.RGBA32I)),M===n.RGB&&G===n.UNSIGNED_INT_5_9_9_9_REV&&(Q=n.RGB9_E5),M===n.RGBA){const bt=rt?es:Qt.getTransfer(tt);G===n.FLOAT&&(Q=n.RGBA32F),G===n.HALF_FLOAT&&(Q=n.RGBA16F),G===n.UNSIGNED_BYTE&&(Q=bt===ae?n.SRGB8_ALPHA8:n.RGBA8),G===n.UNSIGNED_SHORT_4_4_4_4&&(Q=n.RGBA4),G===n.UNSIGNED_SHORT_5_5_5_1&&(Q=n.RGB5_A1)}return(Q===n.R16F||Q===n.R32F||Q===n.RG16F||Q===n.RG32F||Q===n.RGBA16F||Q===n.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function v(P,M){let G;return P?M===null||M===ii||M===nr?G=n.DEPTH24_STENCIL8:M===fn?G=n.DEPTH32F_STENCIL8:M===er&&(G=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===ii||M===nr?G=n.DEPTH_COMPONENT24:M===fn?G=n.DEPTH_COMPONENT32F:M===er&&(G=n.DEPTH_COMPONENT16),G}function C(P,M){return m(P)===!0||P.isFramebufferTexture&&P.minFilter!==je&&P.minFilter!==en?Math.log2(Math.max(M.width,M.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?M.mipmaps.length:1}function R(P){const M=P.target;M.removeEventListener("dispose",R),L(M),M.isVideoTexture&&f.delete(M)}function b(P){const M=P.target;M.removeEventListener("dispose",b),S(M)}function L(P){const M=i.get(P);if(M.__webglInit===void 0)return;const G=P.source,tt=h.get(G);if(tt){const rt=tt[M.__cacheKey];rt.usedTimes--,rt.usedTimes===0&&x(P),Object.keys(tt).length===0&&h.delete(G)}i.remove(P)}function x(P){const M=i.get(P);n.deleteTexture(M.__webglTexture);const G=P.source,tt=h.get(G);delete tt[M.__cacheKey],o.memory.textures--}function S(P){const M=i.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),i.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let tt=0;tt<6;tt++){if(Array.isArray(M.__webglFramebuffer[tt]))for(let rt=0;rt<M.__webglFramebuffer[tt].length;rt++)n.deleteFramebuffer(M.__webglFramebuffer[tt][rt]);else n.deleteFramebuffer(M.__webglFramebuffer[tt]);M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer[tt])}else{if(Array.isArray(M.__webglFramebuffer))for(let tt=0;tt<M.__webglFramebuffer.length;tt++)n.deleteFramebuffer(M.__webglFramebuffer[tt]);else n.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&n.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let tt=0;tt<M.__webglColorRenderbuffer.length;tt++)M.__webglColorRenderbuffer[tt]&&n.deleteRenderbuffer(M.__webglColorRenderbuffer[tt]);M.__webglDepthRenderbuffer&&n.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const G=P.textures;for(let tt=0,rt=G.length;tt<rt;tt++){const Q=i.get(G[tt]);Q.__webglTexture&&(n.deleteTexture(Q.__webglTexture),o.memory.textures--),i.remove(G[tt])}i.remove(P)}let w=0;function D(){w=0}function I(){const P=w;return P>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+r.maxTextures),w+=1,P}function O(P){const M=[];return M.push(P.wrapS),M.push(P.wrapT),M.push(P.wrapR||0),M.push(P.magFilter),M.push(P.minFilter),M.push(P.anisotropy),M.push(P.internalFormat),M.push(P.format),M.push(P.type),M.push(P.generateMipmaps),M.push(P.premultiplyAlpha),M.push(P.flipY),M.push(P.unpackAlignment),M.push(P.colorSpace),M.join()}function W(P,M){const G=i.get(P);if(P.isVideoTexture&&At(P),P.isRenderTargetTexture===!1&&P.version>0&&G.__version!==P.version){const tt=P.image;if(tt===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(tt.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{$(G,P,M);return}}e.bindTexture(n.TEXTURE_2D,G.__webglTexture,n.TEXTURE0+M)}function B(P,M){const G=i.get(P);if(P.version>0&&G.__version!==P.version){$(G,P,M);return}e.bindTexture(n.TEXTURE_2D_ARRAY,G.__webglTexture,n.TEXTURE0+M)}function j(P,M){const G=i.get(P);if(P.version>0&&G.__version!==P.version){$(G,P,M);return}e.bindTexture(n.TEXTURE_3D,G.__webglTexture,n.TEXTURE0+M)}function V(P,M){const G=i.get(P);if(P.version>0&&G.__version!==P.version){J(G,P,M);return}e.bindTexture(n.TEXTURE_CUBE_MAP,G.__webglTexture,n.TEXTURE0+M)}const it={[so]:n.REPEAT,[Qn]:n.CLAMP_TO_EDGE,[oo]:n.MIRRORED_REPEAT},st={[je]:n.NEAREST,[ku]:n.NEAREST_MIPMAP_NEAREST,[vr]:n.NEAREST_MIPMAP_LINEAR,[en]:n.LINEAR,[_s]:n.LINEAR_MIPMAP_NEAREST,[ti]:n.LINEAR_MIPMAP_LINEAR},xt={[Xu]:n.NEVER,[Zu]:n.ALWAYS,[qu]:n.LESS,[Jl]:n.LEQUAL,[Yu]:n.EQUAL,[Ku]:n.GEQUAL,[ju]:n.GREATER,[$u]:n.NOTEQUAL};function It(P,M){if(M.type===fn&&t.has("OES_texture_float_linear")===!1&&(M.magFilter===en||M.magFilter===_s||M.magFilter===vr||M.magFilter===ti||M.minFilter===en||M.minFilter===_s||M.minFilter===vr||M.minFilter===ti)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(P,n.TEXTURE_WRAP_S,it[M.wrapS]),n.texParameteri(P,n.TEXTURE_WRAP_T,it[M.wrapT]),(P===n.TEXTURE_3D||P===n.TEXTURE_2D_ARRAY)&&n.texParameteri(P,n.TEXTURE_WRAP_R,it[M.wrapR]),n.texParameteri(P,n.TEXTURE_MAG_FILTER,st[M.magFilter]),n.texParameteri(P,n.TEXTURE_MIN_FILTER,st[M.minFilter]),M.compareFunction&&(n.texParameteri(P,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(P,n.TEXTURE_COMPARE_FUNC,xt[M.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===je||M.minFilter!==vr&&M.minFilter!==ti||M.type===fn&&t.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||i.get(M).__currentAnisotropy){const G=t.get("EXT_texture_filter_anisotropic");n.texParameterf(P,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,r.getMaxAnisotropy())),i.get(M).__currentAnisotropy=M.anisotropy}}}function Rt(P,M){let G=!1;P.__webglInit===void 0&&(P.__webglInit=!0,M.addEventListener("dispose",R));const tt=M.source;let rt=h.get(tt);rt===void 0&&(rt={},h.set(tt,rt));const Q=O(M);if(Q!==P.__cacheKey){rt[Q]===void 0&&(rt[Q]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,G=!0),rt[Q].usedTimes++;const bt=rt[P.__cacheKey];bt!==void 0&&(rt[P.__cacheKey].usedTimes--,bt.usedTimes===0&&x(M)),P.__cacheKey=Q,P.__webglTexture=rt[Q].texture}return G}function $(P,M,G){let tt=n.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(tt=n.TEXTURE_2D_ARRAY),M.isData3DTexture&&(tt=n.TEXTURE_3D);const rt=Rt(P,M),Q=M.source;e.bindTexture(tt,P.__webglTexture,n.TEXTURE0+G);const bt=i.get(Q);if(Q.version!==bt.__version||rt===!0){e.activeTexture(n.TEXTURE0+G);const ht=Qt.getPrimaries(Qt.workingColorSpace),vt=M.colorSpace===On?null:Qt.getPrimaries(M.colorSpace),Ht=M.colorSpace===On||ht===vt?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ht);let at=g(M.image,!1,r.maxTextureSize);at=ie(M,at);const St=s.convert(M.format,M.colorSpace),Lt=s.convert(M.type);let Ct=E(M.internalFormat,St,Lt,M.colorSpace,M.isVideoTexture);It(tt,M);let Mt;const Xt=M.mipmaps,Bt=M.isVideoTexture!==!0,se=bt.__version===void 0||rt===!0,F=Q.dataReady,ft=C(M,at);if(M.isDepthTexture)Ct=v(M.format===rr,M.type),se&&(Bt?e.texStorage2D(n.TEXTURE_2D,1,Ct,at.width,at.height):e.texImage2D(n.TEXTURE_2D,0,Ct,at.width,at.height,0,St,Lt,null));else if(M.isDataTexture)if(Xt.length>0){Bt&&se&&e.texStorage2D(n.TEXTURE_2D,ft,Ct,Xt[0].width,Xt[0].height);for(let Y=0,et=Xt.length;Y<et;Y++)Mt=Xt[Y],Bt?F&&e.texSubImage2D(n.TEXTURE_2D,Y,0,0,Mt.width,Mt.height,St,Lt,Mt.data):e.texImage2D(n.TEXTURE_2D,Y,Ct,Mt.width,Mt.height,0,St,Lt,Mt.data);M.generateMipmaps=!1}else Bt?(se&&e.texStorage2D(n.TEXTURE_2D,ft,Ct,at.width,at.height),F&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,at.width,at.height,St,Lt,at.data)):e.texImage2D(n.TEXTURE_2D,0,Ct,at.width,at.height,0,St,Lt,at.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){Bt&&se&&e.texStorage3D(n.TEXTURE_2D_ARRAY,ft,Ct,Xt[0].width,Xt[0].height,at.depth);for(let Y=0,et=Xt.length;Y<et;Y++)if(Mt=Xt[Y],M.format!==Ye)if(St!==null)if(Bt){if(F)if(M.layerUpdates.size>0){const pt=Oa(Mt.width,Mt.height,M.format,M.type);for(const dt of M.layerUpdates){const Ot=Mt.data.subarray(dt*pt/Mt.data.BYTES_PER_ELEMENT,(dt+1)*pt/Mt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Y,0,0,dt,Mt.width,Mt.height,1,St,Ot)}M.clearLayerUpdates()}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Y,0,0,0,Mt.width,Mt.height,at.depth,St,Mt.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,Y,Ct,Mt.width,Mt.height,at.depth,0,Mt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Bt?F&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,Y,0,0,0,Mt.width,Mt.height,at.depth,St,Lt,Mt.data):e.texImage3D(n.TEXTURE_2D_ARRAY,Y,Ct,Mt.width,Mt.height,at.depth,0,St,Lt,Mt.data)}else{Bt&&se&&e.texStorage2D(n.TEXTURE_2D,ft,Ct,Xt[0].width,Xt[0].height);for(let Y=0,et=Xt.length;Y<et;Y++)Mt=Xt[Y],M.format!==Ye?St!==null?Bt?F&&e.compressedTexSubImage2D(n.TEXTURE_2D,Y,0,0,Mt.width,Mt.height,St,Mt.data):e.compressedTexImage2D(n.TEXTURE_2D,Y,Ct,Mt.width,Mt.height,0,Mt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Bt?F&&e.texSubImage2D(n.TEXTURE_2D,Y,0,0,Mt.width,Mt.height,St,Lt,Mt.data):e.texImage2D(n.TEXTURE_2D,Y,Ct,Mt.width,Mt.height,0,St,Lt,Mt.data)}else if(M.isDataArrayTexture)if(Bt){if(se&&e.texStorage3D(n.TEXTURE_2D_ARRAY,ft,Ct,at.width,at.height,at.depth),F)if(M.layerUpdates.size>0){const Y=Oa(at.width,at.height,M.format,M.type);for(const et of M.layerUpdates){const pt=at.data.subarray(et*Y/at.data.BYTES_PER_ELEMENT,(et+1)*Y/at.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,et,at.width,at.height,1,St,Lt,pt)}M.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,at.width,at.height,at.depth,St,Lt,at.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,Ct,at.width,at.height,at.depth,0,St,Lt,at.data);else if(M.isData3DTexture)Bt?(se&&e.texStorage3D(n.TEXTURE_3D,ft,Ct,at.width,at.height,at.depth),F&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,at.width,at.height,at.depth,St,Lt,at.data)):e.texImage3D(n.TEXTURE_3D,0,Ct,at.width,at.height,at.depth,0,St,Lt,at.data);else if(M.isFramebufferTexture){if(se)if(Bt)e.texStorage2D(n.TEXTURE_2D,ft,Ct,at.width,at.height);else{let Y=at.width,et=at.height;for(let pt=0;pt<ft;pt++)e.texImage2D(n.TEXTURE_2D,pt,Ct,Y,et,0,St,Lt,null),Y>>=1,et>>=1}}else if(Xt.length>0){if(Bt&&se){const Y=Tt(Xt[0]);e.texStorage2D(n.TEXTURE_2D,ft,Ct,Y.width,Y.height)}for(let Y=0,et=Xt.length;Y<et;Y++)Mt=Xt[Y],Bt?F&&e.texSubImage2D(n.TEXTURE_2D,Y,0,0,St,Lt,Mt):e.texImage2D(n.TEXTURE_2D,Y,Ct,St,Lt,Mt);M.generateMipmaps=!1}else if(Bt){if(se){const Y=Tt(at);e.texStorage2D(n.TEXTURE_2D,ft,Ct,Y.width,Y.height)}F&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,St,Lt,at)}else e.texImage2D(n.TEXTURE_2D,0,Ct,St,Lt,at);m(M)&&p(tt),bt.__version=Q.version,M.onUpdate&&M.onUpdate(M)}P.__version=M.version}function J(P,M,G){if(M.image.length!==6)return;const tt=Rt(P,M),rt=M.source;e.bindTexture(n.TEXTURE_CUBE_MAP,P.__webglTexture,n.TEXTURE0+G);const Q=i.get(rt);if(rt.version!==Q.__version||tt===!0){e.activeTexture(n.TEXTURE0+G);const bt=Qt.getPrimaries(Qt.workingColorSpace),ht=M.colorSpace===On?null:Qt.getPrimaries(M.colorSpace),vt=M.colorSpace===On||bt===ht?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,vt);const Ht=M.isCompressedTexture||M.image[0].isCompressedTexture,at=M.image[0]&&M.image[0].isDataTexture,St=[];for(let et=0;et<6;et++)!Ht&&!at?St[et]=g(M.image[et],!0,r.maxCubemapSize):St[et]=at?M.image[et].image:M.image[et],St[et]=ie(M,St[et]);const Lt=St[0],Ct=s.convert(M.format,M.colorSpace),Mt=s.convert(M.type),Xt=E(M.internalFormat,Ct,Mt,M.colorSpace),Bt=M.isVideoTexture!==!0,se=Q.__version===void 0||tt===!0,F=rt.dataReady;let ft=C(M,Lt);It(n.TEXTURE_CUBE_MAP,M);let Y;if(Ht){Bt&&se&&e.texStorage2D(n.TEXTURE_CUBE_MAP,ft,Xt,Lt.width,Lt.height);for(let et=0;et<6;et++){Y=St[et].mipmaps;for(let pt=0;pt<Y.length;pt++){const dt=Y[pt];M.format!==Ye?Ct!==null?Bt?F&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt,0,0,dt.width,dt.height,Ct,dt.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt,Xt,dt.width,dt.height,0,dt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Bt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt,0,0,dt.width,dt.height,Ct,Mt,dt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt,Xt,dt.width,dt.height,0,Ct,Mt,dt.data)}}}else{if(Y=M.mipmaps,Bt&&se){Y.length>0&&ft++;const et=Tt(St[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,ft,Xt,et.width,et.height)}for(let et=0;et<6;et++)if(at){Bt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,0,0,St[et].width,St[et].height,Ct,Mt,St[et].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,Xt,St[et].width,St[et].height,0,Ct,Mt,St[et].data);for(let pt=0;pt<Y.length;pt++){const Ot=Y[pt].image[et].image;Bt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt+1,0,0,Ot.width,Ot.height,Ct,Mt,Ot.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt+1,Xt,Ot.width,Ot.height,0,Ct,Mt,Ot.data)}}else{Bt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,0,0,Ct,Mt,St[et]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,0,Xt,Ct,Mt,St[et]);for(let pt=0;pt<Y.length;pt++){const dt=Y[pt];Bt?F&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt+1,0,0,Ct,Mt,dt.image[et]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+et,pt+1,Xt,Ct,Mt,dt.image[et])}}}m(M)&&p(n.TEXTURE_CUBE_MAP),Q.__version=rt.version,M.onUpdate&&M.onUpdate(M)}P.__version=M.version}function gt(P,M,G,tt,rt,Q){const bt=s.convert(G.format,G.colorSpace),ht=s.convert(G.type),vt=E(G.internalFormat,bt,ht,G.colorSpace),Ht=i.get(M),at=i.get(G);if(at.__renderTarget=M,!Ht.__hasExternalTextures){const St=Math.max(1,M.width>>Q),Lt=Math.max(1,M.height>>Q);rt===n.TEXTURE_3D||rt===n.TEXTURE_2D_ARRAY?e.texImage3D(rt,Q,vt,St,Lt,M.depth,0,bt,ht,null):e.texImage2D(rt,Q,vt,St,Lt,0,bt,ht,null)}e.bindFramebuffer(n.FRAMEBUFFER,P),Wt(M)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,tt,rt,at.__webglTexture,0,Yt(M)):(rt===n.TEXTURE_2D||rt>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&rt<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,tt,rt,at.__webglTexture,Q),e.bindFramebuffer(n.FRAMEBUFFER,null)}function ut(P,M,G){if(n.bindRenderbuffer(n.RENDERBUFFER,P),M.depthBuffer){const tt=M.depthTexture,rt=tt&&tt.isDepthTexture?tt.type:null,Q=v(M.stencilBuffer,rt),bt=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ht=Yt(M);Wt(M)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ht,Q,M.width,M.height):G?n.renderbufferStorageMultisample(n.RENDERBUFFER,ht,Q,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,Q,M.width,M.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,bt,n.RENDERBUFFER,P)}else{const tt=M.textures;for(let rt=0;rt<tt.length;rt++){const Q=tt[rt],bt=s.convert(Q.format,Q.colorSpace),ht=s.convert(Q.type),vt=E(Q.internalFormat,bt,ht,Q.colorSpace),Ht=Yt(M);G&&Wt(M)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ht,vt,M.width,M.height):Wt(M)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ht,vt,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,vt,M.width,M.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function wt(P,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(n.FRAMEBUFFER,P),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const tt=i.get(M.depthTexture);tt.__renderTarget=M,(!tt.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),W(M.depthTexture,0);const rt=tt.__webglTexture,Q=Yt(M);if(M.depthTexture.format===ir)Wt(M)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,rt,0,Q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,rt,0);else if(M.depthTexture.format===rr)Wt(M)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,rt,0,Q):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,rt,0);else throw new Error("Unknown depthTexture format")}function jt(P){const M=i.get(P),G=P.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==P.depthTexture){const tt=P.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),tt){const rt=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,tt.removeEventListener("dispose",rt)};tt.addEventListener("dispose",rt),M.__depthDisposeCallback=rt}M.__boundDepthTexture=tt}if(P.depthTexture&&!M.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");wt(M.__webglFramebuffer,P)}else if(G){M.__webglDepthbuffer=[];for(let tt=0;tt<6;tt++)if(e.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer[tt]),M.__webglDepthbuffer[tt]===void 0)M.__webglDepthbuffer[tt]=n.createRenderbuffer(),ut(M.__webglDepthbuffer[tt],P,!1);else{const rt=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Q=M.__webglDepthbuffer[tt];n.bindRenderbuffer(n.RENDERBUFFER,Q),n.framebufferRenderbuffer(n.FRAMEBUFFER,rt,n.RENDERBUFFER,Q)}}else if(e.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=n.createRenderbuffer(),ut(M.__webglDepthbuffer,P,!1);else{const tt=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,rt=M.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,rt),n.framebufferRenderbuffer(n.FRAMEBUFFER,tt,n.RENDERBUFFER,rt)}e.bindFramebuffer(n.FRAMEBUFFER,null)}function Ut(P,M,G){const tt=i.get(P);M!==void 0&&gt(tt.__webglFramebuffer,P,P.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),G!==void 0&&jt(P)}function ne(P){const M=P.texture,G=i.get(P),tt=i.get(M);P.addEventListener("dispose",b);const rt=P.textures,Q=P.isWebGLCubeRenderTarget===!0,bt=rt.length>1;if(bt||(tt.__webglTexture===void 0&&(tt.__webglTexture=n.createTexture()),tt.__version=M.version,o.memory.textures++),Q){G.__webglFramebuffer=[];for(let ht=0;ht<6;ht++)if(M.mipmaps&&M.mipmaps.length>0){G.__webglFramebuffer[ht]=[];for(let vt=0;vt<M.mipmaps.length;vt++)G.__webglFramebuffer[ht][vt]=n.createFramebuffer()}else G.__webglFramebuffer[ht]=n.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){G.__webglFramebuffer=[];for(let ht=0;ht<M.mipmaps.length;ht++)G.__webglFramebuffer[ht]=n.createFramebuffer()}else G.__webglFramebuffer=n.createFramebuffer();if(bt)for(let ht=0,vt=rt.length;ht<vt;ht++){const Ht=i.get(rt[ht]);Ht.__webglTexture===void 0&&(Ht.__webglTexture=n.createTexture(),o.memory.textures++)}if(P.samples>0&&Wt(P)===!1){G.__webglMultisampledFramebuffer=n.createFramebuffer(),G.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let ht=0;ht<rt.length;ht++){const vt=rt[ht];G.__webglColorRenderbuffer[ht]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,G.__webglColorRenderbuffer[ht]);const Ht=s.convert(vt.format,vt.colorSpace),at=s.convert(vt.type),St=E(vt.internalFormat,Ht,at,vt.colorSpace,P.isXRRenderTarget===!0),Lt=Yt(P);n.renderbufferStorageMultisample(n.RENDERBUFFER,Lt,St,P.width,P.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ht,n.RENDERBUFFER,G.__webglColorRenderbuffer[ht])}n.bindRenderbuffer(n.RENDERBUFFER,null),P.depthBuffer&&(G.__webglDepthRenderbuffer=n.createRenderbuffer(),ut(G.__webglDepthRenderbuffer,P,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Q){e.bindTexture(n.TEXTURE_CUBE_MAP,tt.__webglTexture),It(n.TEXTURE_CUBE_MAP,M);for(let ht=0;ht<6;ht++)if(M.mipmaps&&M.mipmaps.length>0)for(let vt=0;vt<M.mipmaps.length;vt++)gt(G.__webglFramebuffer[ht][vt],P,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ht,vt);else gt(G.__webglFramebuffer[ht],P,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0);m(M)&&p(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(bt){for(let ht=0,vt=rt.length;ht<vt;ht++){const Ht=rt[ht],at=i.get(Ht);e.bindTexture(n.TEXTURE_2D,at.__webglTexture),It(n.TEXTURE_2D,Ht),gt(G.__webglFramebuffer,P,Ht,n.COLOR_ATTACHMENT0+ht,n.TEXTURE_2D,0),m(Ht)&&p(n.TEXTURE_2D)}e.unbindTexture()}else{let ht=n.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ht=P.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(ht,tt.__webglTexture),It(ht,M),M.mipmaps&&M.mipmaps.length>0)for(let vt=0;vt<M.mipmaps.length;vt++)gt(G.__webglFramebuffer[vt],P,M,n.COLOR_ATTACHMENT0,ht,vt);else gt(G.__webglFramebuffer,P,M,n.COLOR_ATTACHMENT0,ht,0);m(M)&&p(ht),e.unbindTexture()}P.depthBuffer&&jt(P)}function ce(P){const M=P.textures;for(let G=0,tt=M.length;G<tt;G++){const rt=M[G];if(m(rt)){const Q=y(P),bt=i.get(rt).__webglTexture;e.bindTexture(Q,bt),p(Q),e.unbindTexture()}}}const Vt=[],U=[];function Le(P){if(P.samples>0){if(Wt(P)===!1){const M=P.textures,G=P.width,tt=P.height;let rt=n.COLOR_BUFFER_BIT;const Q=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,bt=i.get(P),ht=M.length>1;if(ht)for(let vt=0;vt<M.length;vt++)e.bindFramebuffer(n.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+vt,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,bt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+vt,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,bt.__webglMultisampledFramebuffer),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,bt.__webglFramebuffer);for(let vt=0;vt<M.length;vt++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(rt|=n.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(rt|=n.STENCIL_BUFFER_BIT)),ht){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,bt.__webglColorRenderbuffer[vt]);const Ht=i.get(M[vt]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ht,0)}n.blitFramebuffer(0,0,G,tt,0,0,G,tt,rt,n.NEAREST),l===!0&&(Vt.length=0,U.length=0,Vt.push(n.COLOR_ATTACHMENT0+vt),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Vt.push(Q),U.push(Q),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,U)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Vt))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ht)for(let vt=0;vt<M.length;vt++){e.bindFramebuffer(n.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+vt,n.RENDERBUFFER,bt.__webglColorRenderbuffer[vt]);const Ht=i.get(M[vt]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,bt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+vt,n.TEXTURE_2D,Ht,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,bt.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){const M=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[M])}}}function Yt(P){return Math.min(r.maxSamples,P.samples)}function Wt(P){const M=i.get(P);return P.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function At(P){const M=o.render.frame;f.get(P)!==M&&(f.set(P,M),P.update())}function ie(P,M){const G=P.colorSpace,tt=P.format,rt=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||G!==Oi&&G!==On&&(Qt.getTransfer(G)===ae?(tt!==Ye||rt!==_n)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",G)),M}function Tt(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=I,this.resetTextureUnits=D,this.setTexture2D=W,this.setTexture2DArray=B,this.setTexture3D=j,this.setTextureCube=V,this.rebindTextures=Ut,this.setupRenderTarget=ne,this.updateRenderTargetMipmap=ce,this.updateMultisampleRenderTarget=Le,this.setupDepthRenderbuffer=jt,this.setupFrameBufferTexture=gt,this.useMultisampledRTT=Wt}function A_(n,t){function e(i,r=On){let s;const o=Qt.getTransfer(r);if(i===_n)return n.UNSIGNED_BYTE;if(i===ko)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Ho)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Wl)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Gl)return n.BYTE;if(i===Vl)return n.SHORT;if(i===er)return n.UNSIGNED_SHORT;if(i===zo)return n.INT;if(i===ii)return n.UNSIGNED_INT;if(i===fn)return n.FLOAT;if(i===cr)return n.HALF_FLOAT;if(i===Xl)return n.ALPHA;if(i===ql)return n.RGB;if(i===Ye)return n.RGBA;if(i===Yl)return n.LUMINANCE;if(i===jl)return n.LUMINANCE_ALPHA;if(i===ir)return n.DEPTH_COMPONENT;if(i===rr)return n.DEPTH_STENCIL;if(i===$l)return n.RED;if(i===Go)return n.RED_INTEGER;if(i===Kl)return n.RG;if(i===Vo)return n.RG_INTEGER;if(i===Wo)return n.RGBA_INTEGER;if(i===Xr||i===qr||i===Yr||i===jr)if(o===ae)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===Xr)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===qr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Yr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===jr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===Xr)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===qr)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Yr)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===jr)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===ao||i===lo||i===co||i===uo)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===ao)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===lo)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===co)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===uo)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ho||i===fo||i===po)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(i===ho||i===fo)return o===ae?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===po)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===mo||i===_o||i===go||i===vo||i===xo||i===So||i===Mo||i===yo||i===Eo||i===To||i===bo||i===Ao||i===wo||i===Ro)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(i===mo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===_o)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===go)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===vo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===xo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===So)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Mo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===yo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Eo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===To)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===bo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ao)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===wo)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Ro)return o===ae?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===$r||i===Co||i===Po)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(i===$r)return o===ae?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Co)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Po)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Zl||i===Lo||i===Do||i===Io)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(i===$r)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Lo)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Do)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Io)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===nr?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}const w_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,R_=`
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

}`;class C_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,i){if(this.texture===null){const r=new He,s=t.properties.get(r);s.__webglTexture=e.texture,(e.depthNear!==i.depthNear||e.depthFar!==i.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new Pn({vertexShader:w_,fragmentShader:R_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new dn(new dr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class P_ extends Hi{constructor(t,e){super();const i=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,f=null,u=null,h=null,d=null,_=null;const g=new C_,m=e.getContextAttributes();let p=null,y=null;const E=[],v=[],C=new Zt;let R=null;const b=new ln;b.viewport=new _e;const L=new ln;L.viewport=new _e;const x=[b,L],S=new $h;let w=null,D=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let J=E[$];return J===void 0&&(J=new Ns,E[$]=J),J.getTargetRaySpace()},this.getControllerGrip=function($){let J=E[$];return J===void 0&&(J=new Ns,E[$]=J),J.getGripSpace()},this.getHand=function($){let J=E[$];return J===void 0&&(J=new Ns,E[$]=J),J.getHandSpace()};function I($){const J=v.indexOf($.inputSource);if(J===-1)return;const gt=E[J];gt!==void 0&&(gt.update($.inputSource,$.frame,c||o),gt.dispatchEvent({type:$.type,data:$.inputSource}))}function O(){r.removeEventListener("select",I),r.removeEventListener("selectstart",I),r.removeEventListener("selectend",I),r.removeEventListener("squeeze",I),r.removeEventListener("squeezestart",I),r.removeEventListener("squeezeend",I),r.removeEventListener("end",O),r.removeEventListener("inputsourceschange",W);for(let $=0;$<E.length;$++){const J=v[$];J!==null&&(v[$]=null,E[$].disconnect(J))}w=null,D=null,g.reset(),t.setRenderTarget(p),d=null,h=null,u=null,r=null,y=null,Rt.stop(),i.isPresenting=!1,t.setPixelRatio(R),t.setSize(C.width,C.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){s=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){a=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function($){c=$},this.getBaseLayer=function(){return h!==null?h:d},this.getBinding=function(){return u},this.getFrame=function(){return _},this.getSession=function(){return r},this.setSession=async function($){if(r=$,r!==null){if(p=t.getRenderTarget(),r.addEventListener("select",I),r.addEventListener("selectstart",I),r.addEventListener("selectend",I),r.addEventListener("squeeze",I),r.addEventListener("squeezestart",I),r.addEventListener("squeezeend",I),r.addEventListener("end",O),r.addEventListener("inputsourceschange",W),m.xrCompatible!==!0&&await e.makeXRCompatible(),R=t.getPixelRatio(),t.getSize(C),typeof XRWebGLBinding<"u"&&"createProjectionLayer"in XRWebGLBinding.prototype){let gt=null,ut=null,wt=null;m.depth&&(wt=m.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,gt=m.stencil?rr:ir,ut=m.stencil?nr:ii);const jt={colorFormat:e.RGBA8,depthFormat:wt,scaleFactor:s};u=new XRWebGLBinding(r,e),h=u.createProjectionLayer(jt),r.updateRenderState({layers:[h]}),t.setPixelRatio(1),t.setSize(h.textureWidth,h.textureHeight,!1),y=new Xe(h.textureWidth,h.textureHeight,{format:Ye,type:_n,depthTexture:new uc(h.textureWidth,h.textureHeight,ut,void 0,void 0,void 0,void 0,void 0,void 0,gt),stencilBuffer:m.stencil,colorSpace:t.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const gt={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,e,gt),r.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),y=new Xe(d.framebufferWidth,d.framebufferHeight,{format:Ye,type:_n,colorSpace:t.outputColorSpace,stencilBuffer:m.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),Rt.setContext(r),Rt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function W($){for(let J=0;J<$.removed.length;J++){const gt=$.removed[J],ut=v.indexOf(gt);ut>=0&&(v[ut]=null,E[ut].disconnect(gt))}for(let J=0;J<$.added.length;J++){const gt=$.added[J];let ut=v.indexOf(gt);if(ut===-1){for(let jt=0;jt<E.length;jt++)if(jt>=v.length){v.push(gt),ut=jt;break}else if(v[jt]===null){v[jt]=gt,ut=jt;break}if(ut===-1)break}const wt=E[ut];wt&&wt.connect(gt)}}const B=new k,j=new k;function V($,J,gt){B.setFromMatrixPosition(J.matrixWorld),j.setFromMatrixPosition(gt.matrixWorld);const ut=B.distanceTo(j),wt=J.projectionMatrix.elements,jt=gt.projectionMatrix.elements,Ut=wt[14]/(wt[10]-1),ne=wt[14]/(wt[10]+1),ce=(wt[9]+1)/wt[5],Vt=(wt[9]-1)/wt[5],U=(wt[8]-1)/wt[0],Le=(jt[8]+1)/jt[0],Yt=Ut*U,Wt=Ut*Le,At=ut/(-U+Le),ie=At*-U;if(J.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(ie),$.translateZ(At),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),wt[10]===-1)$.projectionMatrix.copy(J.projectionMatrix),$.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const Tt=Ut+At,P=ne+At,M=Yt-ie,G=Wt+(ut-ie),tt=ce*ne/P*Tt,rt=Vt*ne/P*Tt;$.projectionMatrix.makePerspective(M,G,tt,rt,Tt,P),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function it($,J){J===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(J.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(r===null)return;let J=$.near,gt=$.far;g.texture!==null&&(g.depthNear>0&&(J=g.depthNear),g.depthFar>0&&(gt=g.depthFar)),S.near=L.near=b.near=J,S.far=L.far=b.far=gt,(w!==S.near||D!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),w=S.near,D=S.far),b.layers.mask=$.layers.mask|2,L.layers.mask=$.layers.mask|4,S.layers.mask=b.layers.mask|L.layers.mask;const ut=$.parent,wt=S.cameras;it(S,ut);for(let jt=0;jt<wt.length;jt++)it(wt[jt],ut);wt.length===2?V(S,b,L):S.projectionMatrix.copy(b.projectionMatrix),st($,S,ut)};function st($,J,gt){gt===null?$.matrix.copy(J.matrixWorld):($.matrix.copy(gt.matrixWorld),$.matrix.invert(),$.matrix.multiply(J.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(J.projectionMatrix),$.projectionMatrixInverse.copy(J.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=sr*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(h===null&&d===null))return l},this.setFoveation=function($){l=$,h!==null&&(h.fixedFoveation=$),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=$)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(S)};let xt=null;function It($,J){if(f=J.getViewerPose(c||o),_=J,f!==null){const gt=f.views;d!==null&&(t.setRenderTargetFramebuffer(y,d.framebuffer),t.setRenderTarget(y));let ut=!1;gt.length!==S.cameras.length&&(S.cameras.length=0,ut=!0);for(let Ut=0;Ut<gt.length;Ut++){const ne=gt[Ut];let ce=null;if(d!==null)ce=d.getViewport(ne);else{const U=u.getViewSubImage(h,ne);ce=U.viewport,Ut===0&&(t.setRenderTargetTextures(y,U.colorTexture,U.depthStencilTexture),t.setRenderTarget(y))}let Vt=x[Ut];Vt===void 0&&(Vt=new ln,Vt.layers.enable(Ut),Vt.viewport=new _e,x[Ut]=Vt),Vt.matrix.fromArray(ne.transform.matrix),Vt.matrix.decompose(Vt.position,Vt.quaternion,Vt.scale),Vt.projectionMatrix.fromArray(ne.projectionMatrix),Vt.projectionMatrixInverse.copy(Vt.projectionMatrix).invert(),Vt.viewport.set(ce.x,ce.y,ce.width,ce.height),Ut===0&&(S.matrix.copy(Vt.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),ut===!0&&S.cameras.push(Vt)}const wt=r.enabledFeatures;if(wt&&wt.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&u){const Ut=u.getDepthInformation(gt[0]);Ut&&Ut.isValid&&Ut.texture&&g.init(t,Ut,r.renderState)}}for(let gt=0;gt<E.length;gt++){const ut=v[gt],wt=E[gt];ut!==null&&wt!==void 0&&wt.update(ut,J,c||o)}xt&&xt($,J),J.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:J}),_=null}const Rt=new fc;Rt.setAnimationLoop(It),this.setAnimationLoop=function($){xt=$},this.dispose=function(){}}}const Yn=new Cn,L_=new xe;function D_(n,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,oc(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,y,E,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),u(m,p)):p.isMeshPhongMaterial?(s(m,p),f(m,p)):p.isMeshStandardMaterial?(s(m,p),h(m,p),p.isMeshPhysicalMaterial&&d(m,p,v)):p.isMeshMatcapMaterial?(s(m,p),_(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),g(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,y,E):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===ke&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===ke&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const y=t.get(p),E=y.envMap,v=y.envMapRotation;E&&(m.envMap.value=E,Yn.copy(v),Yn.x*=-1,Yn.y*=-1,Yn.z*=-1,E.isCubeTexture&&E.isRenderTargetTexture===!1&&(Yn.y*=-1,Yn.z*=-1),m.envMapRotation.value.setFromMatrix4(L_.makeRotationFromEuler(Yn)),m.flipEnvMap.value=E.isCubeTexture&&E.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,y,E){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*y,m.scale.value=E*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function f(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function h(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,y){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===ke&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=y.texture,m.transmissionSamplerSize.value.set(y.width,y.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function _(m,p){p.matcap&&(m.matcap.value=p.matcap)}function g(m,p){const y=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(y.matrixWorld),m.nearDistance.value=y.shadow.camera.near,m.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function I_(n,t,e,i){let r={},s={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,E){const v=E.program;i.uniformBlockBinding(y,v)}function c(y,E){let v=r[y.id];v===void 0&&(_(y),v=f(y),r[y.id]=v,y.addEventListener("dispose",m));const C=E.program;i.updateUBOMapping(y,C);const R=t.render.frame;s[y.id]!==R&&(h(y),s[y.id]=R)}function f(y){const E=u();y.__bindingPointIndex=E;const v=n.createBuffer(),C=y.__size,R=y.usage;return n.bindBuffer(n.UNIFORM_BUFFER,v),n.bufferData(n.UNIFORM_BUFFER,C,R),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,E,v),v}function u(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(y){const E=r[y.id],v=y.uniforms,C=y.__cache;n.bindBuffer(n.UNIFORM_BUFFER,E);for(let R=0,b=v.length;R<b;R++){const L=Array.isArray(v[R])?v[R]:[v[R]];for(let x=0,S=L.length;x<S;x++){const w=L[x];if(d(w,R,x,C)===!0){const D=w.__offset,I=Array.isArray(w.value)?w.value:[w.value];let O=0;for(let W=0;W<I.length;W++){const B=I[W],j=g(B);typeof B=="number"||typeof B=="boolean"?(w.__data[0]=B,n.bufferSubData(n.UNIFORM_BUFFER,D+O,w.__data)):B.isMatrix3?(w.__data[0]=B.elements[0],w.__data[1]=B.elements[1],w.__data[2]=B.elements[2],w.__data[3]=0,w.__data[4]=B.elements[3],w.__data[5]=B.elements[4],w.__data[6]=B.elements[5],w.__data[7]=0,w.__data[8]=B.elements[6],w.__data[9]=B.elements[7],w.__data[10]=B.elements[8],w.__data[11]=0):(B.toArray(w.__data,O),O+=j.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,D,w.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function d(y,E,v,C){const R=y.value,b=E+"_"+v;if(C[b]===void 0)return typeof R=="number"||typeof R=="boolean"?C[b]=R:C[b]=R.clone(),!0;{const L=C[b];if(typeof R=="number"||typeof R=="boolean"){if(L!==R)return C[b]=R,!0}else if(L.equals(R)===!1)return L.copy(R),!0}return!1}function _(y){const E=y.uniforms;let v=0;const C=16;for(let b=0,L=E.length;b<L;b++){const x=Array.isArray(E[b])?E[b]:[E[b]];for(let S=0,w=x.length;S<w;S++){const D=x[S],I=Array.isArray(D.value)?D.value:[D.value];for(let O=0,W=I.length;O<W;O++){const B=I[O],j=g(B),V=v%C,it=V%j.boundary,st=V+it;v+=it,st!==0&&C-st<j.storage&&(v+=C-st),D.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=v,v+=j.storage}}}const R=v%C;return R>0&&(v+=C-R),y.__size=v,y.__cache={},this}function g(y){const E={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(E.boundary=4,E.storage=4):y.isVector2?(E.boundary=8,E.storage=8):y.isVector3||y.isColor?(E.boundary=16,E.storage=12):y.isVector4?(E.boundary=16,E.storage=16):y.isMatrix3?(E.boundary=48,E.storage=48):y.isMatrix4?(E.boundary=64,E.storage=64):y.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",y),E}function m(y){const E=y.target;E.removeEventListener("dispose",m);const v=o.indexOf(E.__bindingPointIndex);o.splice(v,1),n.deleteBuffer(r[E.id]),delete r[E.id],delete s[E.id]}function p(){for(const y in r)n.deleteBuffer(r[y]);o=[],r={},s={}}return{bind:l,update:c,dispose:p}}class U_{constructor(t={}){const{canvas:e=mh(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:f="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:h=!1}=t;this.isWebGLRenderer=!0;let d;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=i.getContextAttributes().alpha}else d=o;const _=new Uint32Array(4),g=new Int32Array(4);let m=null,p=null;const y=[],E=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=zn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const v=this;let C=!1;this._outputColorSpace=Qe;let R=0,b=0,L=null,x=-1,S=null;const w=new _e,D=new _e;let I=null;const O=new re(0);let W=0,B=e.width,j=e.height,V=1,it=null,st=null;const xt=new _e(0,0,B,j),It=new _e(0,0,B,j);let Rt=!1;const $=new cc;let J=!1,gt=!1;const ut=new xe,wt=new xe,jt=new k,Ut=new _e,ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ce=!1;function Vt(){return L===null?V:1}let U=i;function Le(T,N){return e.getContext(T,N)}try{const T={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:f,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Bo}`),e.addEventListener("webglcontextlost",et,!1),e.addEventListener("webglcontextrestored",pt,!1),e.addEventListener("webglcontextcreationerror",dt,!1),U===null){const N="webgl2";if(U=Le(N,T),U===null)throw Le(N)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw console.error("THREE.WebGLRenderer: "+T.message),T}let Yt,Wt,At,ie,Tt,P,M,G,tt,rt,Q,bt,ht,vt,Ht,at,St,Lt,Ct,Mt,Xt,Bt,se,F;function ft(){Yt=new Wp(U),Yt.init(),Bt=new A_(U,Yt),Wt=new Op(U,Yt,t,Bt),At=new T_(U,Yt),Wt.reverseDepthBuffer&&h&&At.buffers.depth.setReversed(!0),ie=new Yp(U),Tt=new h_,P=new b_(U,Yt,At,Tt,Wt,Bt,ie),M=new zp(v),G=new Vp(v),tt=new Jh(U),se=new Fp(U,tt),rt=new Xp(U,tt,ie,se),Q=new $p(U,rt,tt,ie),Ct=new jp(U,Wt,P),at=new Bp(Tt),bt=new u_(v,M,G,Yt,Wt,se,at),ht=new D_(v,Tt),vt=new d_,Ht=new x_(Yt),Lt=new Up(v,M,G,At,Q,d,l),St=new y_(v,Q,Wt),F=new I_(U,ie,Wt,At),Mt=new Np(U,Yt,ie),Xt=new qp(U,Yt,ie),ie.programs=bt.programs,v.capabilities=Wt,v.extensions=Yt,v.properties=Tt,v.renderLists=vt,v.shadowMap=St,v.state=At,v.info=ie}ft();const Y=new P_(v,U);this.xr=Y,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const T=Yt.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=Yt.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(T){T!==void 0&&(V=T,this.setSize(B,j,!1))},this.getSize=function(T){return T.set(B,j)},this.setSize=function(T,N,X=!0){if(Y.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=T,j=N,e.width=Math.floor(T*V),e.height=Math.floor(N*V),X===!0&&(e.style.width=T+"px",e.style.height=N+"px"),this.setViewport(0,0,T,N)},this.getDrawingBufferSize=function(T){return T.set(B*V,j*V).floor()},this.setDrawingBufferSize=function(T,N,X){B=T,j=N,V=X,e.width=Math.floor(T*X),e.height=Math.floor(N*X),this.setViewport(0,0,T,N)},this.getCurrentViewport=function(T){return T.copy(w)},this.getViewport=function(T){return T.copy(xt)},this.setViewport=function(T,N,X,q){T.isVector4?xt.set(T.x,T.y,T.z,T.w):xt.set(T,N,X,q),At.viewport(w.copy(xt).multiplyScalar(V).round())},this.getScissor=function(T){return T.copy(It)},this.setScissor=function(T,N,X,q){T.isVector4?It.set(T.x,T.y,T.z,T.w):It.set(T,N,X,q),At.scissor(D.copy(It).multiplyScalar(V).round())},this.getScissorTest=function(){return Rt},this.setScissorTest=function(T){At.setScissorTest(Rt=T)},this.setOpaqueSort=function(T){it=T},this.setTransparentSort=function(T){st=T},this.getClearColor=function(T){return T.copy(Lt.getClearColor())},this.setClearColor=function(){Lt.setClearColor(...arguments)},this.getClearAlpha=function(){return Lt.getClearAlpha()},this.setClearAlpha=function(){Lt.setClearAlpha(...arguments)},this.clear=function(T=!0,N=!0,X=!0){let q=0;if(T){let z=!1;if(L!==null){const ot=L.texture.format;z=ot===Wo||ot===Vo||ot===Go}if(z){const ot=L.texture.type,mt=ot===_n||ot===ii||ot===er||ot===nr||ot===ko||ot===Ho,yt=Lt.getClearColor(),Et=Lt.getClearAlpha(),Nt=yt.r,Ft=yt.g,Pt=yt.b;mt?(_[0]=Nt,_[1]=Ft,_[2]=Pt,_[3]=Et,U.clearBufferuiv(U.COLOR,0,_)):(g[0]=Nt,g[1]=Ft,g[2]=Pt,g[3]=Et,U.clearBufferiv(U.COLOR,0,g))}else q|=U.COLOR_BUFFER_BIT}N&&(q|=U.DEPTH_BUFFER_BIT),X&&(q|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),U.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",et,!1),e.removeEventListener("webglcontextrestored",pt,!1),e.removeEventListener("webglcontextcreationerror",dt,!1),Lt.dispose(),vt.dispose(),Ht.dispose(),Tt.dispose(),M.dispose(),G.dispose(),Q.dispose(),se.dispose(),F.dispose(),bt.dispose(),Y.dispose(),Y.removeEventListener("sessionstart",nt),Y.removeEventListener("sessionend",K),Z.stop()};function et(T){T.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),C=!0}function pt(){console.log("THREE.WebGLRenderer: Context Restored."),C=!1;const T=ie.autoReset,N=St.enabled,X=St.autoUpdate,q=St.needsUpdate,z=St.type;ft(),ie.autoReset=T,St.enabled=N,St.autoUpdate=X,St.needsUpdate=q,St.type=z}function dt(T){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function Ot(T){const N=T.target;N.removeEventListener("dispose",Ot),ue(N)}function ue(T){ye(T),Tt.remove(T)}function ye(T){const N=Tt.get(T).programs;N!==void 0&&(N.forEach(function(X){bt.releaseProgram(X)}),T.isShaderMaterial&&bt.releaseShaderCache(T))}this.renderBufferDirect=function(T,N,X,q,z,ot){N===null&&(N=ne);const mt=z.isMesh&&z.matrixWorld.determinant()<0,yt=nn(T,N,X,q,z);At.setMaterial(q,mt);let Et=X.index,Nt=1;if(q.wireframe===!0){if(Et=rt.getWireframeAttribute(X),Et===void 0)return;Nt=2}const Ft=X.drawRange,Pt=X.attributes.position;let Kt=Ft.start*Nt,te=(Ft.start+Ft.count)*Nt;ot!==null&&(Kt=Math.max(Kt,ot.start*Nt),te=Math.min(te,(ot.start+ot.count)*Nt)),Et!==null?(Kt=Math.max(Kt,0),te=Math.min(te,Et.count)):Pt!=null&&(Kt=Math.max(Kt,0),te=Math.min(te,Pt.count));const ge=te-Kt;if(ge<0||ge===1/0)return;se.setup(z,q,yt,X,Et);let pe,Jt=Mt;if(Et!==null&&(pe=tt.get(Et),Jt=Xt,Jt.setIndex(pe)),z.isMesh)q.wireframe===!0?(At.setLineWidth(q.wireframeLinewidth*Vt()),Jt.setMode(U.LINES)):Jt.setMode(U.TRIANGLES);else if(z.isLine){let Dt=q.linewidth;Dt===void 0&&(Dt=1),At.setLineWidth(Dt*Vt()),z.isLineSegments?Jt.setMode(U.LINES):z.isLineLoop?Jt.setMode(U.LINE_LOOP):Jt.setMode(U.LINE_STRIP)}else z.isPoints?Jt.setMode(U.POINTS):z.isSprite&&Jt.setMode(U.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)Kr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),Jt.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(Yt.get("WEBGL_multi_draw"))Jt.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const Dt=z._multiDrawStarts,be=z._multiDrawCounts,ee=z._multiDrawCount,rn=Et?tt.get(Et).bytesPerElement:1,oi=Tt.get(q).currentProgram.getUniforms();for(let Ge=0;Ge<ee;Ge++)oi.setValue(U,"_gl_DrawID",Ge),Jt.render(Dt[Ge]/rn,be[Ge])}else if(z.isInstancedMesh)Jt.renderInstances(Kt,ge,z.count);else if(X.isInstancedBufferGeometry){const Dt=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,be=Math.min(X.instanceCount,Dt);Jt.renderInstances(Kt,ge,be)}else Jt.render(Kt,ge)};function $t(T,N,X){T.transparent===!0&&T.side===bn&&T.forceSinglePass===!1?(T.side=ke,T.needsUpdate=!0,he(T,N,X),T.side=kn,T.needsUpdate=!0,he(T,N,X),T.side=bn):he(T,N,X)}this.compile=function(T,N,X=null){X===null&&(X=T),p=Ht.get(X),p.init(N),E.push(p),X.traverseVisible(function(z){z.isLight&&z.layers.test(N.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),T!==X&&T.traverseVisible(function(z){z.isLight&&z.layers.test(N.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),p.setupLights();const q=new Set;return T.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const ot=z.material;if(ot)if(Array.isArray(ot))for(let mt=0;mt<ot.length;mt++){const yt=ot[mt];$t(yt,X,z),q.add(yt)}else $t(ot,X,z),q.add(ot)}),p=E.pop(),q},this.compileAsync=function(T,N,X=null){const q=this.compile(T,N,X);return new Promise(z=>{function ot(){if(q.forEach(function(mt){Tt.get(mt).currentProgram.isReady()&&q.delete(mt)}),q.size===0){z(T);return}setTimeout(ot,10)}Yt.get("KHR_parallel_shader_compile")!==null?ot():setTimeout(ot,10)})};let A=null;function H(T){A&&A(T)}function nt(){Z.stop()}function K(){Z.start()}const Z=new fc;Z.setAnimationLoop(H),typeof self<"u"&&Z.setContext(self),this.setAnimationLoop=function(T){A=T,Y.setAnimationLoop(T),T===null?Z.stop():Z.start()},Y.addEventListener("sessionstart",nt),Y.addEventListener("sessionend",K),this.render=function(T,N){if(N!==void 0&&N.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),N.parent===null&&N.matrixWorldAutoUpdate===!0&&N.updateMatrixWorld(),Y.enabled===!0&&Y.isPresenting===!0&&(Y.cameraAutoUpdate===!0&&Y.updateCamera(N),N=Y.getCamera()),T.isScene===!0&&T.onBeforeRender(v,T,N,L),p=Ht.get(T,E.length),p.init(N),E.push(p),wt.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),$.setFromProjectionMatrix(wt),gt=this.localClippingEnabled,J=at.init(this.clippingPlanes,gt),m=vt.get(T,y.length),m.init(),y.push(m),Y.enabled===!0&&Y.isPresenting===!0){const ot=v.xr.getDepthSensingMesh();ot!==null&&_t(ot,N,-1/0,v.sortObjects)}_t(T,N,0,v.sortObjects),m.finish(),v.sortObjects===!0&&m.sort(it,st),ce=Y.enabled===!1||Y.isPresenting===!1||Y.hasDepthSensing()===!1,ce&&Lt.addToRenderList(m,T),this.info.render.frame++,J===!0&&at.beginShadows();const X=p.state.shadowsArray;St.render(X,T,N),J===!0&&at.endShadows(),this.info.autoReset===!0&&this.info.reset();const q=m.opaque,z=m.transmissive;if(p.setupLights(),N.isArrayCamera){const ot=N.cameras;if(z.length>0)for(let mt=0,yt=ot.length;mt<yt;mt++){const Et=ot[mt];Gt(q,z,T,Et)}ce&&Lt.render(T);for(let mt=0,yt=ot.length;mt<yt;mt++){const Et=ot[mt];lt(m,T,Et,Et.viewport)}}else z.length>0&&Gt(q,z,T,N),ce&&Lt.render(T),lt(m,T,N);L!==null&&b===0&&(P.updateMultisampleRenderTarget(L),P.updateRenderTargetMipmap(L)),T.isScene===!0&&T.onAfterRender(v,T,N),se.resetDefaultState(),x=-1,S=null,E.pop(),E.length>0?(p=E[E.length-1],J===!0&&at.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,y.pop(),y.length>0?m=y[y.length-1]:m=null};function _t(T,N,X,q){if(T.visible===!1)return;if(T.layers.test(N.layers)){if(T.isGroup)X=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(N);else if(T.isLight)p.pushLight(T),T.castShadow&&p.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||$.intersectsSprite(T)){q&&Ut.setFromMatrixPosition(T.matrixWorld).applyMatrix4(wt);const mt=Q.update(T),yt=T.material;yt.visible&&m.push(T,mt,yt,X,Ut.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||$.intersectsObject(T))){const mt=Q.update(T),yt=T.material;if(q&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),Ut.copy(T.boundingSphere.center)):(mt.boundingSphere===null&&mt.computeBoundingSphere(),Ut.copy(mt.boundingSphere.center)),Ut.applyMatrix4(T.matrixWorld).applyMatrix4(wt)),Array.isArray(yt)){const Et=mt.groups;for(let Nt=0,Ft=Et.length;Nt<Ft;Nt++){const Pt=Et[Nt],Kt=yt[Pt.materialIndex];Kt&&Kt.visible&&m.push(T,mt,Kt,X,Ut.z,Pt)}}else yt.visible&&m.push(T,mt,yt,X,Ut.z,null)}}const ot=T.children;for(let mt=0,yt=ot.length;mt<yt;mt++)_t(ot[mt],N,X,q)}function lt(T,N,X,q){const z=T.opaque,ot=T.transmissive,mt=T.transparent;p.setupLightsView(X),J===!0&&at.setGlobalState(v.clippingPlanes,X),q&&At.viewport(w.copy(q)),z.length>0&&oe(z,N,X),ot.length>0&&oe(ot,N,X),mt.length>0&&oe(mt,N,X),At.buffers.depth.setTest(!0),At.buffers.depth.setMask(!0),At.buffers.color.setMask(!0),At.setPolygonOffset(!1)}function Gt(T,N,X,q){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new Xe(1,1,{generateMipmaps:!0,type:Yt.has("EXT_color_buffer_half_float")||Yt.has("EXT_color_buffer_float")?cr:_n,minFilter:ti,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Qt.workingColorSpace}));const ot=p.state.transmissionRenderTarget[q.id],mt=q.viewport||w;ot.setSize(mt.z*v.transmissionResolutionScale,mt.w*v.transmissionResolutionScale);const yt=v.getRenderTarget();v.setRenderTarget(ot),v.getClearColor(O),W=v.getClearAlpha(),W<1&&v.setClearColor(16777215,.5),v.clear(),ce&&Lt.render(X);const Et=v.toneMapping;v.toneMapping=zn;const Nt=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),J===!0&&at.setGlobalState(v.clippingPlanes,q),oe(T,X,q),P.updateMultisampleRenderTarget(ot),P.updateRenderTargetMipmap(ot),Yt.has("WEBGL_multisampled_render_to_texture")===!1){let Ft=!1;for(let Pt=0,Kt=N.length;Pt<Kt;Pt++){const te=N[Pt],ge=te.object,pe=te.geometry,Jt=te.material,Dt=te.group;if(Jt.side===bn&&ge.layers.test(q.layers)){const be=Jt.side;Jt.side=ke,Jt.needsUpdate=!0,le(ge,X,q,pe,Jt,Dt),Jt.side=be,Jt.needsUpdate=!0,Ft=!0}}Ft===!0&&(P.updateMultisampleRenderTarget(ot),P.updateRenderTargetMipmap(ot))}v.setRenderTarget(yt),v.setClearColor(O,W),Nt!==void 0&&(q.viewport=Nt),v.toneMapping=Et}function oe(T,N,X){const q=N.isScene===!0?N.overrideMaterial:null;for(let z=0,ot=T.length;z<ot;z++){const mt=T[z],yt=mt.object,Et=mt.geometry,Nt=mt.group;let Ft=mt.material;Ft.allowOverride===!0&&q!==null&&(Ft=q),yt.layers.test(X.layers)&&le(yt,N,X,Et,Ft,Nt)}}function le(T,N,X,q,z,ot){T.onBeforeRender(v,N,X,q,z,ot),T.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),z.onBeforeRender(v,N,X,q,T,ot),z.transparent===!0&&z.side===bn&&z.forceSinglePass===!1?(z.side=ke,z.needsUpdate=!0,v.renderBufferDirect(X,N,q,z,T,ot),z.side=kn,z.needsUpdate=!0,v.renderBufferDirect(X,N,q,z,T,ot),z.side=bn):v.renderBufferDirect(X,N,q,z,T,ot),T.onAfterRender(v,N,X,q,z,ot)}function he(T,N,X){N.isScene!==!0&&(N=ne);const q=Tt.get(T),z=p.state.lights,ot=p.state.shadowsArray,mt=z.state.version,yt=bt.getParameters(T,z.state,ot,N,X),Et=bt.getProgramCacheKey(yt);let Nt=q.programs;q.environment=T.isMeshStandardMaterial?N.environment:null,q.fog=N.fog,q.envMap=(T.isMeshStandardMaterial?G:M).get(T.envMap||q.environment),q.envMapRotation=q.environment!==null&&T.envMap===null?N.environmentRotation:T.envMapRotation,Nt===void 0&&(T.addEventListener("dispose",Ot),Nt=new Map,q.programs=Nt);let Ft=Nt.get(Et);if(Ft!==void 0){if(q.currentProgram===Ft&&q.lightsStateVersion===mt)return Ae(T,yt),Ft}else yt.uniforms=bt.getUniforms(T),T.onBeforeCompile(yt,v),Ft=bt.acquireProgram(yt,Et),Nt.set(Et,Ft),q.uniforms=yt.uniforms;const Pt=q.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Pt.clippingPlanes=at.uniform),Ae(T,yt),q.needsLights=mr(T),q.lightsStateVersion=mt,q.needsLights&&(Pt.ambientLightColor.value=z.state.ambient,Pt.lightProbe.value=z.state.probe,Pt.directionalLights.value=z.state.directional,Pt.directionalLightShadows.value=z.state.directionalShadow,Pt.spotLights.value=z.state.spot,Pt.spotLightShadows.value=z.state.spotShadow,Pt.rectAreaLights.value=z.state.rectArea,Pt.ltc_1.value=z.state.rectAreaLTC1,Pt.ltc_2.value=z.state.rectAreaLTC2,Pt.pointLights.value=z.state.point,Pt.pointLightShadows.value=z.state.pointShadow,Pt.hemisphereLights.value=z.state.hemi,Pt.directionalShadowMap.value=z.state.directionalShadowMap,Pt.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Pt.spotShadowMap.value=z.state.spotShadowMap,Pt.spotLightMatrix.value=z.state.spotLightMatrix,Pt.spotLightMap.value=z.state.spotLightMap,Pt.pointShadowMap.value=z.state.pointShadowMap,Pt.pointShadowMatrix.value=z.state.pointShadowMatrix),q.currentProgram=Ft,q.uniformsList=null,Ft}function Te(T){if(T.uniformsList===null){const N=T.currentProgram.getUniforms();T.uniformsList=Zr.seqWithValue(N.seq,T.uniforms)}return T.uniformsList}function Ae(T,N){const X=Tt.get(T);X.outputColorSpace=N.outputColorSpace,X.batching=N.batching,X.batchingColor=N.batchingColor,X.instancing=N.instancing,X.instancingColor=N.instancingColor,X.instancingMorph=N.instancingMorph,X.skinning=N.skinning,X.morphTargets=N.morphTargets,X.morphNormals=N.morphNormals,X.morphColors=N.morphColors,X.morphTargetsCount=N.morphTargetsCount,X.numClippingPlanes=N.numClippingPlanes,X.numIntersection=N.numClipIntersection,X.vertexAlphas=N.vertexAlphas,X.vertexTangents=N.vertexTangents,X.toneMapping=N.toneMapping}function nn(T,N,X,q,z){N.isScene!==!0&&(N=ne),P.resetTextureUnits();const ot=N.fog,mt=q.isMeshStandardMaterial?N.environment:null,yt=L===null?v.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:Oi,Et=(q.isMeshStandardMaterial?G:M).get(q.envMap||mt),Nt=q.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Ft=!!X.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Pt=!!X.morphAttributes.position,Kt=!!X.morphAttributes.normal,te=!!X.morphAttributes.color;let ge=zn;q.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(ge=v.toneMapping);const pe=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Jt=pe!==void 0?pe.length:0,Dt=Tt.get(q),be=p.state.lights;if(J===!0&&(gt===!0||T!==S)){const De=T===S&&q.id===x;at.setState(q,T,De)}let ee=!1;q.version===Dt.__version?(Dt.needsLights&&Dt.lightsStateVersion!==be.state.version||Dt.outputColorSpace!==yt||z.isBatchedMesh&&Dt.batching===!1||!z.isBatchedMesh&&Dt.batching===!0||z.isBatchedMesh&&Dt.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&Dt.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&Dt.instancing===!1||!z.isInstancedMesh&&Dt.instancing===!0||z.isSkinnedMesh&&Dt.skinning===!1||!z.isSkinnedMesh&&Dt.skinning===!0||z.isInstancedMesh&&Dt.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Dt.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&Dt.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&Dt.instancingMorph===!1&&z.morphTexture!==null||Dt.envMap!==Et||q.fog===!0&&Dt.fog!==ot||Dt.numClippingPlanes!==void 0&&(Dt.numClippingPlanes!==at.numPlanes||Dt.numIntersection!==at.numIntersection)||Dt.vertexAlphas!==Nt||Dt.vertexTangents!==Ft||Dt.morphTargets!==Pt||Dt.morphNormals!==Kt||Dt.morphColors!==te||Dt.toneMapping!==ge||Dt.morphTargetsCount!==Jt)&&(ee=!0):(ee=!0,Dt.__version=q.version);let rn=Dt.currentProgram;ee===!0&&(rn=he(q,N,z));let oi=!1,Ge=!1,Wi=!1;const fe=rn.getUniforms(),Ke=Dt.uniforms;if(At.useProgram(rn.program)&&(oi=!0,Ge=!0,Wi=!0),q.id!==x&&(x=q.id,Ge=!0),oi||S!==T){At.buffers.depth.getReversed()?(ut.copy(T.projectionMatrix),gh(ut),vh(ut),fe.setValue(U,"projectionMatrix",ut)):fe.setValue(U,"projectionMatrix",T.projectionMatrix),fe.setValue(U,"viewMatrix",T.matrixWorldInverse);const Be=fe.map.cameraPosition;Be!==void 0&&Be.setValue(U,jt.setFromMatrixPosition(T.matrixWorld)),Wt.logarithmicDepthBuffer&&fe.setValue(U,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&fe.setValue(U,"isOrthographic",T.isOrthographicCamera===!0),S!==T&&(S=T,Ge=!0,Wi=!0)}if(z.isSkinnedMesh){fe.setOptional(U,z,"bindMatrix"),fe.setOptional(U,z,"bindMatrixInverse");const De=z.skeleton;De&&(De.boneTexture===null&&De.computeBoneTexture(),fe.setValue(U,"boneTexture",De.boneTexture,P))}z.isBatchedMesh&&(fe.setOptional(U,z,"batchingTexture"),fe.setValue(U,"batchingTexture",z._matricesTexture,P),fe.setOptional(U,z,"batchingIdTexture"),fe.setValue(U,"batchingIdTexture",z._indirectTexture,P),fe.setOptional(U,z,"batchingColorTexture"),z._colorsTexture!==null&&fe.setValue(U,"batchingColorTexture",z._colorsTexture,P));const Ze=X.morphAttributes;if((Ze.position!==void 0||Ze.normal!==void 0||Ze.color!==void 0)&&Ct.update(z,X,rn),(Ge||Dt.receiveShadow!==z.receiveShadow)&&(Dt.receiveShadow=z.receiveShadow,fe.setValue(U,"receiveShadow",z.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(Ke.envMap.value=Et,Ke.flipEnvMap.value=Et.isCubeTexture&&Et.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&N.environment!==null&&(Ke.envMapIntensity.value=N.environmentIntensity),Ge&&(fe.setValue(U,"toneMappingExposure",v.toneMappingExposure),Dt.needsLights&&pr(Ke,Wi),ot&&q.fog===!0&&ht.refreshFogUniforms(Ke,ot),ht.refreshMaterialUniforms(Ke,q,V,j,p.state.transmissionRenderTarget[T.id]),Zr.upload(U,Te(Dt),Ke,P)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Zr.upload(U,Te(Dt),Ke,P),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&fe.setValue(U,"center",z.center),fe.setValue(U,"modelViewMatrix",z.modelViewMatrix),fe.setValue(U,"normalMatrix",z.normalMatrix),fe.setValue(U,"modelMatrix",z.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){const De=q.uniformsGroups;for(let Be=0,ds=De.length;Be<ds;Be++){const Hn=De[Be];F.update(Hn,rn),F.bind(Hn,rn)}}return rn}function pr(T,N){T.ambientLightColor.needsUpdate=N,T.lightProbe.needsUpdate=N,T.directionalLights.needsUpdate=N,T.directionalLightShadows.needsUpdate=N,T.pointLights.needsUpdate=N,T.pointLightShadows.needsUpdate=N,T.spotLights.needsUpdate=N,T.spotLightShadows.needsUpdate=N,T.rectAreaLights.needsUpdate=N,T.hemisphereLights.needsUpdate=N}function mr(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return R},this.getActiveMipmapLevel=function(){return b},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(T,N,X){const q=Tt.get(T);q.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),Tt.get(T.texture).__webglTexture=N,Tt.get(T.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:X,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,N){const X=Tt.get(T);X.__webglFramebuffer=N,X.__useDefaultFramebuffer=N===void 0};const gn=U.createFramebuffer();this.setRenderTarget=function(T,N=0,X=0){L=T,R=N,b=X;let q=!0,z=null,ot=!1,mt=!1;if(T){const Et=Tt.get(T);if(Et.__useDefaultFramebuffer!==void 0)At.bindFramebuffer(U.FRAMEBUFFER,null),q=!1;else if(Et.__webglFramebuffer===void 0)P.setupRenderTarget(T);else if(Et.__hasExternalTextures)P.rebindTextures(T,Tt.get(T.texture).__webglTexture,Tt.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){const Pt=T.depthTexture;if(Et.__boundDepthTexture!==Pt){if(Pt!==null&&Tt.has(Pt)&&(T.width!==Pt.image.width||T.height!==Pt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");P.setupDepthRenderbuffer(T)}}const Nt=T.texture;(Nt.isData3DTexture||Nt.isDataArrayTexture||Nt.isCompressedArrayTexture)&&(mt=!0);const Ft=Tt.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Ft[N])?z=Ft[N][X]:z=Ft[N],ot=!0):T.samples>0&&P.useMultisampledRTT(T)===!1?z=Tt.get(T).__webglMultisampledFramebuffer:Array.isArray(Ft)?z=Ft[X]:z=Ft,w.copy(T.viewport),D.copy(T.scissor),I=T.scissorTest}else w.copy(xt).multiplyScalar(V).floor(),D.copy(It).multiplyScalar(V).floor(),I=Rt;if(X!==0&&(z=gn),At.bindFramebuffer(U.FRAMEBUFFER,z)&&q&&At.drawBuffers(T,z),At.viewport(w),At.scissor(D),At.setScissorTest(I),ot){const Et=Tt.get(T.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+N,Et.__webglTexture,X)}else if(mt){const Et=Tt.get(T.texture),Nt=N;U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,Et.__webglTexture,X,Nt)}else if(T!==null&&X!==0){const Et=Tt.get(T.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Et.__webglTexture,X)}x=-1},this.readRenderTargetPixels=function(T,N,X,q,z,ot,mt){if(!(T&&T.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let yt=Tt.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&mt!==void 0&&(yt=yt[mt]),yt){At.bindFramebuffer(U.FRAMEBUFFER,yt);try{const Et=T.texture,Nt=Et.format,Ft=Et.type;if(!Wt.textureFormatReadable(Nt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Wt.textureTypeReadable(Ft)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}N>=0&&N<=T.width-q&&X>=0&&X<=T.height-z&&U.readPixels(N,X,q,z,Bt.convert(Nt),Bt.convert(Ft),ot)}finally{const Et=L!==null?Tt.get(L).__webglFramebuffer:null;At.bindFramebuffer(U.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(T,N,X,q,z,ot,mt){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let yt=Tt.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&mt!==void 0&&(yt=yt[mt]),yt)if(N>=0&&N<=T.width-q&&X>=0&&X<=T.height-z){At.bindFramebuffer(U.FRAMEBUFFER,yt);const Et=T.texture,Nt=Et.format,Ft=Et.type;if(!Wt.textureFormatReadable(Nt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Wt.textureTypeReadable(Ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Pt=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,Pt),U.bufferData(U.PIXEL_PACK_BUFFER,ot.byteLength,U.STREAM_READ),U.readPixels(N,X,q,z,Bt.convert(Nt),Bt.convert(Ft),0);const Kt=L!==null?Tt.get(L).__webglFramebuffer:null;At.bindFramebuffer(U.FRAMEBUFFER,Kt);const te=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await _h(U,te,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,Pt),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,ot),U.deleteBuffer(Pt),U.deleteSync(te),ot}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,N=null,X=0){const q=Math.pow(2,-X),z=Math.floor(T.image.width*q),ot=Math.floor(T.image.height*q),mt=N!==null?N.x:0,yt=N!==null?N.y:0;P.setTexture2D(T,0),U.copyTexSubImage2D(U.TEXTURE_2D,X,0,0,mt,yt,z,ot),At.unbindTexture()};const fs=U.createFramebuffer(),vn=U.createFramebuffer();this.copyTextureToTexture=function(T,N,X=null,q=null,z=0,ot=null){ot===null&&(z!==0?(Kr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ot=z,z=0):ot=0);let mt,yt,Et,Nt,Ft,Pt,Kt,te,ge;const pe=T.isCompressedTexture?T.mipmaps[ot]:T.image;if(X!==null)mt=X.max.x-X.min.x,yt=X.max.y-X.min.y,Et=X.isBox3?X.max.z-X.min.z:1,Nt=X.min.x,Ft=X.min.y,Pt=X.isBox3?X.min.z:0;else{const Ze=Math.pow(2,-z);mt=Math.floor(pe.width*Ze),yt=Math.floor(pe.height*Ze),T.isDataArrayTexture?Et=pe.depth:T.isData3DTexture?Et=Math.floor(pe.depth*Ze):Et=1,Nt=0,Ft=0,Pt=0}q!==null?(Kt=q.x,te=q.y,ge=q.z):(Kt=0,te=0,ge=0);const Jt=Bt.convert(N.format),Dt=Bt.convert(N.type);let be;N.isData3DTexture?(P.setTexture3D(N,0),be=U.TEXTURE_3D):N.isDataArrayTexture||N.isCompressedArrayTexture?(P.setTexture2DArray(N,0),be=U.TEXTURE_2D_ARRAY):(P.setTexture2D(N,0),be=U.TEXTURE_2D),U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,N.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,N.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,N.unpackAlignment);const ee=U.getParameter(U.UNPACK_ROW_LENGTH),rn=U.getParameter(U.UNPACK_IMAGE_HEIGHT),oi=U.getParameter(U.UNPACK_SKIP_PIXELS),Ge=U.getParameter(U.UNPACK_SKIP_ROWS),Wi=U.getParameter(U.UNPACK_SKIP_IMAGES);U.pixelStorei(U.UNPACK_ROW_LENGTH,pe.width),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,pe.height),U.pixelStorei(U.UNPACK_SKIP_PIXELS,Nt),U.pixelStorei(U.UNPACK_SKIP_ROWS,Ft),U.pixelStorei(U.UNPACK_SKIP_IMAGES,Pt);const fe=T.isDataArrayTexture||T.isData3DTexture,Ke=N.isDataArrayTexture||N.isData3DTexture;if(T.isDepthTexture){const Ze=Tt.get(T),De=Tt.get(N),Be=Tt.get(Ze.__renderTarget),ds=Tt.get(De.__renderTarget);At.bindFramebuffer(U.READ_FRAMEBUFFER,Be.__webglFramebuffer),At.bindFramebuffer(U.DRAW_FRAMEBUFFER,ds.__webglFramebuffer);for(let Hn=0;Hn<Et;Hn++)fe&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Tt.get(T).__webglTexture,z,Pt+Hn),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Tt.get(N).__webglTexture,ot,ge+Hn)),U.blitFramebuffer(Nt,Ft,mt,yt,Kt,te,mt,yt,U.DEPTH_BUFFER_BIT,U.NEAREST);At.bindFramebuffer(U.READ_FRAMEBUFFER,null),At.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(z!==0||T.isRenderTargetTexture||Tt.has(T)){const Ze=Tt.get(T),De=Tt.get(N);At.bindFramebuffer(U.READ_FRAMEBUFFER,fs),At.bindFramebuffer(U.DRAW_FRAMEBUFFER,vn);for(let Be=0;Be<Et;Be++)fe?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Ze.__webglTexture,z,Pt+Be):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Ze.__webglTexture,z),Ke?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,De.__webglTexture,ot,ge+Be):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,De.__webglTexture,ot),z!==0?U.blitFramebuffer(Nt,Ft,mt,yt,Kt,te,mt,yt,U.COLOR_BUFFER_BIT,U.NEAREST):Ke?U.copyTexSubImage3D(be,ot,Kt,te,ge+Be,Nt,Ft,mt,yt):U.copyTexSubImage2D(be,ot,Kt,te,Nt,Ft,mt,yt);At.bindFramebuffer(U.READ_FRAMEBUFFER,null),At.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else Ke?T.isDataTexture||T.isData3DTexture?U.texSubImage3D(be,ot,Kt,te,ge,mt,yt,Et,Jt,Dt,pe.data):N.isCompressedArrayTexture?U.compressedTexSubImage3D(be,ot,Kt,te,ge,mt,yt,Et,Jt,pe.data):U.texSubImage3D(be,ot,Kt,te,ge,mt,yt,Et,Jt,Dt,pe):T.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,ot,Kt,te,mt,yt,Jt,Dt,pe.data):T.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,ot,Kt,te,pe.width,pe.height,Jt,pe.data):U.texSubImage2D(U.TEXTURE_2D,ot,Kt,te,mt,yt,Jt,Dt,pe);U.pixelStorei(U.UNPACK_ROW_LENGTH,ee),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,rn),U.pixelStorei(U.UNPACK_SKIP_PIXELS,oi),U.pixelStorei(U.UNPACK_SKIP_ROWS,Ge),U.pixelStorei(U.UNPACK_SKIP_IMAGES,Wi),ot===0&&N.generateMipmaps&&U.generateMipmap(be),At.unbindTexture()},this.copyTextureToTexture3D=function(T,N,X=null,q=null,z=0){return Kr('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(T,N,X,q,z)},this.initRenderTarget=function(T){Tt.get(T).__webglFramebuffer===void 0&&P.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?P.setTextureCube(T,0):T.isData3DTexture?P.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?P.setTexture2DArray(T,0):P.setTexture2D(T,0),At.unbindTexture()},this.resetState=function(){R=0,b=0,L=null,At.reset(),se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return An}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=Qt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Qt._getUnpackColorSpace()}}function ll(n,t,e){return!n||n.every(i=>i==null||isNaN(i))?null:n.map(i=>e[0]+(i-t[0])/(t[1]-t[0])*(e[1]-e[0]))}function F_(n){const t=n.trim().split(`
`),e=t[0].split(",").map(i=>i.trim());return t.slice(1).map(i=>{const r=i.split(",").map(o=>o.trim()),s={};return e.forEach((o,a)=>{s[o]=r[a]??""}),s})}async function N_(n={}){const{csvPath:t="/asemic/jamo_data.csv",choRange:e=[0,1]}=n,i=await fetch(t);if(!i.ok)throw new Error(`loadJamo: CSV 로드 실패 ${i.status} @ ${t}`);const r=await i.text(),s=F_(r);if(!s.length||!s[0].jamo)throw new Error(`loadJamo: CSV 파싱 실패 @ ${t} — 응답이 CSV가 아님(HTML 폴백?)`);const o={};for(const a of s){const{jamo:l,type:c}=a;if(!l)continue;const u=a.x!==""&&a.y!==""&&a.z!==""?[parseFloat(a.x),parseFloat(a.y),parseFloat(a.z)]:null;if(c==="cho")o[l]=o[l]||{},o[l].cho={type:"cho",pos:u?ll(u,[0,1],e):null,tense:parseInt(a.tense)||0,cluster:0,cluster_front:null};else if(c==="jong"){const h=l+"_jong";o[h]={type:"jong",pos:u?ll(u,[0,1],e):null,tense:parseInt(a.tense)||0,cluster:parseInt(a.cluster)||0,cluster_front:a.cluster_front||null}}else c==="jung"&&(o[l]={type:"jung",pos:u,yang:parseInt(a.yang)||0,diphthong:parseInt(a.diphthong)||0})}return o}const ze=await N_(),gc=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],vc=["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"],xc=["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],rs=50;function O_(n){const t=[];let e=0;for(const i of n){if(i===" "){t.push({isSpace:!0,wordId:e}),e++;continue}const r=i.charCodeAt(0);if(r>=44032&&r<=55203){const s=r-44032;t.push({cho:gc[Math.floor(s/588)],jung:vc[Math.floor(s%588/28)],jong:xc[s%28]||null,wordId:e,isSpace:!1})}}return t}function B_(n){const t=gc.indexOf(n.cho),e=vc.indexOf(n.jung),i=n.jong?xc.indexOf(n.jong):0;return t<0||e<0?"":String.fromCharCode(44032+(t*21+e)*28+i)}function Sc(n){const t=ze[n.cho]?.cho?.pos??[.5,.5,.5],e=ze[n.jung]??{},i=e.pos??[500,1e3,2e3],r=n.jong?ze[n.jong+"_jong"]:null,s=r?.pos??(r?.cluster_front?ze[r.cluster_front+"_jong"]?.pos:null)??null;return{char:B_(n),cho:{jamo:n.cho,x:t[0],y:t[1],z:t[2]},jung:{jamo:n.jung,f1:i[0],f2:i[1],f3:i[2],yang:e.yang??0,diph:e.diphthong??0},jong:n.jong?{jamo:n.jong,x:s?.[0]??null,y:s?.[1]??null,z:s?.[2]??null}:null}}const Ws=[900,4500,3200,1800,1500];function Mc(n){const t=Math.min(Math.max(n,0),1)*4,e=Math.min(Math.floor(t),3);return Ws[e]+(Ws[e+1]-Ws[e])*(t-e)}const yc=n=>n<.15?"stop":n<.4?"affricate":n<.6?"fric":n<.9?"nasal":"liquid",Ec=n=>n<.15?"sonorant":n<.5?"lax":n<.85?"tense":"asp",cl={mycelium:{scale:.5,ratios:[1,2.32],ratioAmp:[1,.35],tau:.22,wave:"sine",level:1},sora:{scale:1,ratios:[1,2.76,5.4],ratioAmp:[1,.4,.15],tau:.8,wave:"sine",detune:1.5,level:.9},dandelion:{scale:1.2,ratios:[1],ratioAmp:[1],tau:.45,wave:"breath",q:25,level:2},signal:{scale:2,ratios:[1],ratioAmp:[1],formantAmp:[1,.5,0],tau:.09,wave:"square",quantize:!0,gate:!0,level:.7}},ul=[1,.5,.25];function z_(n){if(n.jamo==="ㅇ")return{attack:.008,boost:.8,soft:1,glide:null,noise:[]};const t=yc(n.y),e=Ec(n.z),i=Mc(n.x),r={attack:.002,boost:1,soft:0,glide:null,noise:[]};if(e==="tense"&&(r.boost=1.3),t==="stop")r.attack=e==="tense"?5e-4:.001,r.noise.push({center:i,q:1.5,at:0,dur:.006,gain:.5*r.boost}),e==="asp"&&r.noise.push({center:i,q:.8,at:.006,dur:.08,gain:.12});else if(t==="affricate")r.attack=.002,r.noise.push({center:i,q:1.5,at:0,dur:.006,gain:.45}),r.noise.push({center:i,q:2.5,at:.006,dur:e==="asp"?.09:.04,gain:.15});else if(t==="fric"){const s=n.x>.9,o=s?.08:e==="tense"?.13:.1;r.attack=o,r.noise.push({center:i,q:s?.5:3,at:0,dur:o,gain:s?.12:.18*r.boost})}else t==="nasal"?(r.attack=.015,r.soft=1):(r.attack=.005,r.glide={from:.85,dur:.06});return r}function Tc(n){if(!n||n.x==null)return null;const t=yc(n.y),e=Ec(n.z),i=.14;return t==="nasal"?{type:"hum",at:i,stretch:2.5}:t==="liquid"?{type:"bend",at:i,ratio:.94,dur:.15}:{type:"choke",at:i,tau:e==="tense"||e==="asp"?.006:.018,hiss:t==="fric"?{center:Mc(n.x),q:3,dur:.05,gain:.12}:null}}function k_(n,t){const e=n.filter(i=>!i.isSpace);return{count:e.length,added:e.length>t?e[e.length-1]:null}}function H_(n,t){if(!n||n.jong)return null;const e=[...t].reverse().find(r=>!r.isSpace);if(!e?.jong||e.cho!==n.cho||e.jung!==n.jung)return null;const i=Tc(Sc(e).jong);return i?{jong:e.jong,ending:i}:null}function G_(n,t="mycelium"){const e=Sc(n),i=cl[t]??cl.mycelium,r=z_(e.cho),s=Tc(e.jong),o=e.jung.yang>0?1.03:1,a=[];[e.jung.f1,e.jung.f2,e.jung.f3].forEach((c,f)=>{i.ratios.forEach((u,h)=>{let d=c*i.scale*u*o;if(i.quantize&&(d=440*2**(Math.round(12*Math.log2(d/440))/12)),d>12e3||!(i.formantAmp??ul)[f])return;const _=(i.formantAmp??ul)[f]*i.ratioAmp[h]*(r.soft?1/(1+f+h):1),g=i.tau/(1+d/3e3);a.push({freq:d,amp:_,tau:g})})});let l=Math.max(...a.map(c=>c.tau))*5;return s?.type==="hum"&&(l*=s.stretch),i.gate&&(l=s?.type==="hum"?.35:.2),s?.type==="choke"&&(l=Math.min(l,s.at+.1)),{wave:i.wave,q:i.q??25,detune:i.detune??0,gate:!!i.gate,modes:a,attack:r.attack,glide:r.glide,noise:r.noise,ending:s,gain:.3*r.boost*(i.level??1),length:Math.min(r.attack+l,4)}}function V_(n,t,e,i,r=1.3,s=0,o=t*2,a=t){const l=t*.5,c=40,f=t*r;let u=l,h=c+t+s;const d=[],_=[];for(const m of n){if(m.isSpace){u+=o*.2,u>e-l&&(u=l,h+=f);continue}u+a>e-l&&(u=l,h+=f),d.push([u/e,h/i]),_.push(m),u+=o}const g=_.length>0?h:c+t+s;return{positions:d,sylItems:_,lastY:g}}function W_(n,t){const e=ze[n.jung],i=e?.pos?.[0]??500,r=Math.max(0,Math.min(1,(i-250)/600)),s=e?.yang?1:-1,o=e?.diphthong??0,a=1+s*.5*r;return{width:t*a,height:o?t:t*a}}function X_(n,t,e,i,r=1,s=0,o=t,a=0){const l=t*.5,c=40,f=t*Math.max(0,r-1),u=[],h=[],d=[],_=[],g=e-l;let m=l,p=c+s,y=0;const E=()=>{p+=y+f,m=l,y=0};for(const C of n){if(C.isSpace){m+=o*.2,m>g&&E();continue}const{width:R,height:b}=W_(C,t);m+R>g&&m>l&&E(),u.push([m/e,(p+t*.5)/i]),h.push(C),d.push(R),_.push(b),m+=R,b>y&&(y=b)}const v=h.length>0?p+y:c+s;return{positions:u,sylItems:h,widths:d,heights:_,lastY:v}}function hl(n,t,e,i=new k){let r;if(t==="jong"){const s=ze[n+"_jong"];r=s?.pos??(s?.cluster_front?ze[s.cluster_front+"_jong"]?.pos:null)??[.5,.5,.5]}else r=ze[n]?.cho?.pos??[.5,.5,.5];return new k((r[0]-.5)*e*2,(r[1]-.5)*e*2,(r[2]-.5)*e*2).add(i)}function q_(n,t,e,i={x:1,y:1},r=null,s=1){const o=window.innerWidth,a=window.innerHeight,l=2.07*2,c=l*(o/a),f=e/a*l*6,u=.35,h=n.map((C,R)=>R<n.length-1),d=[],_=[],g=[],m=[],p=[],y=[],E=[],v=[];for(let C=0;C<rs;C++){const R=n[C],b=t[C];if(!R||!b){d.push(new k),_.push(new k),g.push(new k),m.push(new k),p.push(new k),y.push(0),E.push(0),v.push(0);continue}let L;if(r)L=r(b[0],b[1]);else{let Rt=1;f>3.5?Rt=f*.32:f<3&&(Rt=f*.3);const $=(b[0]-.5)*c*i.x+Rt,J=-(b[1]-.5)*l*i.y+.5;L=new k($,J,0)}const x=f*.5,S=L.clone(),w=hl(R.cho,"cho",x,L),D=ze[R.jung],I=D?.pos??[500,1e3,2e3],O=(I[0]-250)/650,W=(I[1]-580)/2020,B=(I[2]-2080)/1120,j=R.jong?hl(R.jong,"jong",x*.5,new k):new k(O-.5,W-.5,B-.5).multiplyScalar(x*.5),V=D?.yang??0,it=D?.diphthong??0,st=ze[R.cho]?.cho?.pos??[.5,.5,.5],It=.55+(I[0]-250)/600*.4;d.push(w),_.push(S),g.push(new k(st[0],st[1],st[2])),m.push(j),p.push(new k(I[0],I[1],I[2])),y.push(f*u*It),E.push(V),v.push(it)}return{starts:d,centers:_,chos:g,ends:m,jungs:p,amps:y,yangseong:E,diphthong:v,confirmed:h,count:Math.min(n.length,rs),scale:s}}const fl=1100;function Y_(n,t,e=ze){if(!n)return"vertical";const i=e[n],r=i?.diphthong??0,s=i?.pos?.[1]??1e3;return t?r?"bed":s>=fl?"right_click":"hamburger":r?"per75":s>=fl?"vertical":"horizontal"}const j_=12,$_=1e6;function dl(n,t,e,i,r,s=null,o={}){const a=n.current,l=a?.refHeight,c=l?i/l:1,f=a?.glyphExtent,u=a?.displayScale??1,h=!!(o.line&&s&&f),d=n.name==="signal"?X_:V_,_=s?s.w:e,g=s?s.h:i,m=R=>{const b=R*u,L=(a?.sylSize??55)*b,x=a?.lineHeightRatio??1.3,S=(a?.wrapStep??(a?.sylSize??55)*2)*b,w=(a?.wrapMargin??a?.sylSize??55)*b,D={sylSize:L,lineHeightRatio:x,wrapStep:S,wrapMargin:w};if(!f){const $=d(t,L,_,g,x,r,S,w);return s&&($.positions=$.positions.map(([J,gt])=>[(s.x+J*s.w)/e,(s.y+gt*s.h)/i])),{...$,...D,bottom:0}}const I=f*L,O=I-L*.5,W=(h?g/2:I)-(40+L),B=h?$_:_-2*O,j=d(t,L,B,g,x,r,S,w),V=s?s.x:0,it=s?s.y:0,st=j.positions.length,xt=st?j.positions[st-1][0]*B+O:0,It=st?Math.max(0,xt+I-_):0;j.positions=j.positions.map(([$,J])=>[(V+$*B+O)/e,(it+J*g+W)/i]),j.lastY+=W;const Rt=j.sylItems.length?j.lastY+I-r:0;return{...j,...D,bottom:Rt,scrollX:It}},p=(a?._ctlBase?.sylSize??a?.sylSize??55)*c,y=(R,b)=>(delete R.bottom,{...R,fitLines:b,glyphScale:R.sylSize/p});if(!(s&&f))return y(m(c),0);const E=a?.lineHeightRatio??1.3,v=(a?.sylSize??55)*c*u;if(h)return y(m(c*Math.min(1,g/(v*2*f))),1);let C;for(let R=1;R<=j_;R++){const b=Math.min(1,g/(v*(2*f+(R-1)*E)));if(C=m(c*b),C.fitLines=R,C.bottom<=g+.5)break}return y(C,C.fitLines)}function K_(n){return!!(n?.flushQueue&&n?.captureFrame&&n?.clearAccum)}function Z_(n,t,e,i,r,s,o=1){if(!t.length)return;const a=n.current?.layoutScale??{x:1,y:1};if(n.name==="mycelium"){const l=n.current?.screenToWorld?(f,u)=>n.current.screenToWorld(f,u):null,c=l?o:1;n.update(q_(t,e,i/c,a,l,c),t.length,t)}else n.name==="sora"?n.update(t,e,ze):n.name==="signal"?n.update(t,e,ze,i,r,s):n.name==="dandelion"&&n.update(t,e,ze)}const Oe=0,Pe=1,qe=2,mn=3,Ki=180,ni=12,J_=.02,Ue=.6,Ei=.4,Ti=.2,Q_=1.4,t0=.8,e0=1,bc=.8,$o=.9,Ac={[Pe]:Q_,[qe]:t0,[mn]:e0,[Oe]:$o},n0=.08,i0=ni*ni,r0=.5,s0=2.2,o0=ni*2.2,wc=2048,Jr=.25,a0=.94,l0=.45,c0=1.6,u0=1,h0=10.85,f0=0,d0=1.2,p0=1.5,m0=1.25,pl=.99,_0=.01,g0=1.05,kr=.16,ml=3;function v0(n,t){const e=Math.sqrt(n*n+t*t);if(e<1e-6)return[0,0];const i=Math.min(1,e/m0),r=pl+(_0-pl)*i,o=Math.pow(e,r)*g0/e;return[n*o,t*o]}function _l(n,t){const i=.12*Math.pow(2*(n<.12?n:1-n),t);return n<.12?i:1-i}const x0=.6,S0=3,M0=1,y0=2,E0=1,T0=3,b0=1,A0=2,w0=4,R0=2,C0=5,P0=3,gl=2,L0=3,ss=5e3,Ko=1200,D0=3e3,Rc=ss+Ko+D0,I0=400,U0=1200,F0=3e4,N0=0,O0=1,Cc=2,B0=.04,z0=.04,k0=.08,tn=48;function H0(n,t,e){let i=Oe;return n==="vertical"?(e<Ue&&t>=Ti&&t<Ti+Ue&&(i=Pe),t>=Ue&&(i=qe)):n==="horizontal"?(e>=Ti&&e<Ti+Ue&&t<Ue&&(i=Pe),e>=Ue&&(i=qe)):n==="per75"?(e<Ue&&t<Ue&&(i=Pe),i!==Pe&&(i=qe)):n==="right_click"?(e<Ue&&t<Ue&&(i=Pe),e>=Ue&&(i=mn),e<Ue&&t>=Ue&&(i=qe)):n==="hamburger"?(e<Ei&&t>=Ti&&t<Ti+Ue&&(i=Pe),e>=Ei&&e<1-Ei&&(i=qe),e>=1-Ei&&(i=mn)):n==="bed"&&(e<Ei&&t<Ue&&(i=Pe),e>=1-Ei&&(i=mn),i===Oe&&(i=qe)),i}function G0(n,t){if(n===Oe)return[255,255,255];const e=t?.pos??[.5,.5,.5];let i,r,s;return t?.type==="jung"?(i=Math.round((e[0]-250)/650*200+30),r=Math.round((e[1]-580)/2020*200+30),s=Math.round((e[2]-2080)/1120*200+30)):(i=Math.round(e[0]*200+30),r=Math.round(e[1]*200+30),s=Math.round(e[2]*200+30)),n===Pe&&(r=Math.min(255,Math.round(r*1.7))),n===qe&&(i=Math.min(255,Math.round(i*1.7)),r=Math.min(255,Math.round(r*1.7))),n===mn&&(i=Math.min(255,Math.round(i*1.7))),[i,r,s]}const vl=[[255,49,30],[25,248,0],[255,242,0]],V0=[mn,Pe,qe];function W0(n,t){if(n.isSignal)return n.signalColor;const e=X0(n),[i,r,s]=G0(n.state,e),o=Math.min(n.brightness,2.5),a=n.flash;if(a===0)return[Math.min(255,Math.round(i*o)),Math.min(255,Math.round(r*o)),Math.min(255,Math.round(s*o))];if(a===1){const f=.5+.5*Math.sin(t*2);return[Math.min(255,Math.round(255+(i*o-255)*f)),Math.min(255,Math.round(255+(r*o-255)*f)),Math.min(255,Math.round(255+(s*o-255)*f))]}const l=1+3*(.5+.5*Math.sin(t*.3)),c=.5+.5*Math.sin(t*l);return[Math.min(255,Math.round(255+(i*o-255)*c)),Math.min(255,Math.round(255+(r*o-255)*c)),Math.min(255,Math.round(255+(s*o-255)*c))]}function X0(n){const t=n.sylMeta;return t?n.state===Pe?t.choEntry:n.state===qe?t.jungEntry:n.state===mn?t.jongEntry??t.choEntry:null:null}function q0(n,t,e,i){const r=Math.max(1,Math.round(n/e)),s=Math.max(1,Math.round(t/e)),o=n/r,a=t/s,l=[];for(let c=0;c<s;c++)for(let f=0;f<r;f++){const u=(f+.5)*o,h=(c+.5)*a,d=(Math.random()-.5)*i*o,_=(Math.random()-.5)*i*a;l.push([u+d,h+_])}return l}function Y0(){return{syllables:[],points:[],delaunay:null,cols:0,_glTex:null,_needsUpload:!0,_sylPhaseStart:new Float32Array(tn),_sylCount:0}}function os(n){let t=0;for(const e of n.syllables)t+=e.w;return t}function Xs(n){let t=0;for(const e of n.syllables)e.h>t&&(t=e.h);return t}function xl(n,t,e,i,r,s,o){s=s??r,o=o??r;const a=i[t.jung],l=i[t.cho]?.cho??i[t.cho],c=t.jong?i[t.jong+"_jong"]??i[t.jong]:null,f=Y_(t.jung,t.jong,i),u={choEntry:l,jungEntry:a,jongEntry:c,type:f,cho:t.cho,jung:t.jung,jong:t.jong,w:s,h:o};u.cyclePhaseStart=performance.now()+e*I0;const h=os(n);n.syllables.push(u);const d=q0(s,o,ni,J_),_=[];for(const[y,E]of d){const v=y+h,C=E;let R=!0;for(const b of n.points){const L=b.localX-v,x=b.localY-C;if(L*L+x*x<ni*ni){R=!1;break}}R&&_.push([v,C])}const g=L0-gl+1,m=Math.min(gl+Math.floor(Math.random()*g),_.length),p=new Set;for(;p.size<m;)p.add(Math.floor(Math.random()*_.length));_.forEach(([y,E],v)=>{const C=(y-h)/s,R=E/o,b=H0(f,C,R),L=b===Oe,x=p.has(v);let S=b,w=null;if(x){const Rt=Math.floor(Math.random()*vl.length);w=vl[Rt],S=V0[Rt]}const D=x?bc:Ac[S]??$o,I=C*2-1,O=R*2-1,W=Math.max(0,(Math.abs(I)-kr)/(1-kr)),B=Math.max(0,(Math.abs(O)-kr)/(1-kr)),j=1-_l(Math.min(1,W),ml),V=1-_l(Math.min(1,B),ml),[it,st]=v0(I,O),xt=h+(it+1)/2*s,It=(st+1)/2*o;n.points.push({localX:xt,localY:It,cellCx:j,cellCy:V,sylIndex:e,sylMeta:u,state:S,originalState:b,isBackground:L,blankStreak:0,changedThisStep:!1,isSignal:x,signalColor:w,brightness:1,flash:0,flashTimer:0,currentScale:D,targetScale:D,neighbors:null})})}function Sl(n,t){const e=n.points;if(e.length===0){n.delaunay=null;return}const i=os(n),r=Oo.from(e,s=>s.localX,s=>s.localY);n.delaunay=r,n.cols=i;for(let s=0;s<e.length;s++)e[s].neighbors=Array.from(r.neighbors(s));n._needsUpload=!0}function j0(n,t,e,i,r){let s=n.get(t);const o=e.length;if(s){let a=0;const l=Math.min(s.syllables.length,o);for(;a<l;a++){const c=s.syllables[a],f=e[a].syl;if(c.cho!==f.cho||c.jung!==f.jung||c.jong!==f.jong)break}if(a===s.syllables.length){if(o>a){for(let c=a;c<o;c++)xl(s,e[c].syl,c,i,r,e[c].w,e[c].h);Sl(s)}return s}}s=Y0();for(let a=0;a<o;a++)xl(s,e[a].syl,a,i,r,e[a].w,e[a].h);return Sl(s),n.set(t,s),s}function Zi(n,t,e){return e.some(i=>i==="E"?t.localX>n.localX:i==="W"?t.localX<n.localX:i==="S"?t.localY>n.localY:i==="N"?t.localY<n.localY:!1)}function $0(n,t){const i=Math.max(0,n-t)%Rc;return i<ss?N0:i<ss+Ko?O0:Cc}function Hr(n,t){return!!n&&$0(t,n.cyclePhaseStart)===Cc}function K0(n,t){const e=n.points,i=e.length;if(i===0)return;const r=new Array(i);for(let s=0;s<i;s++){const o=e[s];if(r[s]=o.state,o.changedThisStep=!1,Hr(o.sylMeta,t))continue;const a=o.neighbors??[],l=o.state;if(l!==Oe&&a.some(f=>e[f].state===Oe)&&(o.brightness=Math.min(o.brightness*1.1,2.5)),!o.isSignal){if(l===Pe){let c=0,f=0;for(const u of a){const h=e[u];h.state===qe&&(c++,Zi(o,h,["E","S"])&&f++)}(c>=S0||f>=M0)&&(r[s]=qe,o.changedThisStep=!0)}else if(l===qe){const c=!!o.sylMeta?.jongEntry;let f=0,u=0;if(c)for(const h of a){const d=e[h];d.state===mn&&(f++,Zi(o,d,["S"])&&u++)}if(c&&(f>=y0||u>=E0))r[s]=mn,o.changedThisStep=!0;else{let h=!1;for(const d of a){const _=e[d];if((_.state===Pe||_.state===Oe)&&Zi(o,_,["E"])){h=!0;break}}h&&(r[s]=Pe,o.changedThisStep=!0)}}else if(l===mn){let c=0,f=0;for(const u of a){const h=e[u];h.state===Pe&&(c++,Zi(o,h,["E","N"])&&f++)}(c>=T0||f>=b0)&&(r[s]=Pe,o.changedThisStep=!0)}else if(l===Oe&&!o.isBackground){const c=a.reduce((f,u)=>f+(e[u].state===Oe?1:0),0);o.blankStreak=c>=P0?o.blankStreak+1:0,o.blankStreak>=C0&&(r[s]=o.originalState,o.changedThisStep=!0,o.blankStreak=0)}}}for(let s=0;s<i;s++){const o=e[s];if(o.isSignal||o.isBackground||Hr(o.sylMeta,t))continue;const a=o.neighbors??[],l=o.state;if(a.reduce((_,g)=>_+(e[g].state===Oe?1:0),0)<(l===Oe?A0:w0))continue;const u=[],h=[];for(const _ of a)e[_].isSignal||Hr(e[_].sylMeta,t)||(Zi(o,e[_],["W","N"])?u.push(_):h.push(_));const d=u.concat(h).slice(0,R0);for(const _ of d)e[_].changedThisStep||(r[_]=Oe);l===Oe&&(r[s]=o.originalState)}for(let s=0;s<i;s++){const o=e[s];Hr(o.sylMeta,t)||(o.state!==r[s]&&(o.state=r[s],o.targetScale=o.isSignal?bc:Ac[o.state]??$o),o.state!==Oe&&(o.blankStreak=0),o.brightness+=(1-o.brightness)*.05)}n._needsUpload=!0}const Z0=`#version 300 es
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
`,J0=`#version 300 es
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
uniform float u_sylOffsetX[${tn}]; // 각 음절 왼쪽 경계 x (누적합)
uniform float u_sylWidth[${tn}];
uniform float u_sylHeight[${tn}];
uniform float u_cellSize; // squircle 박스 클리핑 — site 하나가 그릴 수 있는 최대 폭/높이(px, MIN_DIST 기준). 모노 도형 크기 기준으로도 씀
uniform float u_time; // 신호등 플래싱용 wall-clock(ms) — JS의 rAF timestamp(performance.now()와 같은 시계)
// 신호등 플래싱 사이클 타이밍 — 음절(=sylIdx) 단위 uniform 배열. 사이클 시작 시각은 음절
// 전체가 공유하는 값이라 점(셀) 개수만큼 중복 저장할 필요 없이 배열 인덱싱이면 충분.
// (BLINK 때 어떤 "도형"을 그릴지는 셀 단위라 이 배열이 아니라 u_data의 row2에서 읽음.)
uniform float u_sylPhaseStart[${tn}];
uniform int u_sylCount;
// 셀 바깥(배경)의 알파. 1.0 = 자기 배경(BG_GRAY)을 칠하는 원래 모드,
// 0.0 = 투명 출력(TD 합성). 1.0이면 아래 식이 전부 예전 그대로로 접힌다.
uniform float u_bgAlpha;
#define HALO_ALPHA ${u0.toFixed(4)}
out vec4 outColor;

#define MAX_PTS ${wc}
#define MAX_SYL_UNIFORM ${tn}
// 신호등 플래싱 사이클 상수 — JS 상단 CYCLE_*/MONO_* 상수와 항상 동일해야 함(단일 소스: JS)
#define CYCLE_NORMAL ${ss.toFixed(1)}
#define CYCLE_BLINK ${Ko.toFixed(1)}
#define CYCLE_TOTAL ${Rc.toFixed(1)}
#define CYCLE_BLINK_RATE ${U0.toFixed(1)}
#define MONO_LINE_RATIO ${B0.toFixed(3)}
#define MONO_DOT_RATIO ${z0.toFixed(3)}
#define MONO_BORDER_RATIO ${k0.toFixed(3)}
// 음절 센터 radial gradient — JS 상단 BG_GRAY/SYL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define BG_GRAY ${Jr.toFixed(4)}
#define SYL_GRAD_STRENGTH ${a0.toFixed(4)}
#define SYL_GRAD_RADIUS_RATIO ${l0.toFixed(4)}
#define SYL_GRAD_FALLOFF ${c0.toFixed(4)}
// 셀 내부 미세 radial gradient — JS 상단 CELL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define CELL_GRAD_SAT ${h0.toFixed(4)}
#define CELL_GRAD_DEPTH ${f0.toFixed(4)}
#define CELL_GRAD_RADIUS_RATIO ${d0.toFixed(4)}
#define CELL_GRAD_FALLOFF ${p0.toFixed(4)}

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
`;function Ml(n,t,e){const i=n.createShader(t);if(n.shaderSource(i,e),n.compileShader(i),!n.getShaderParameter(i,n.COMPILE_STATUS)){const r=n.getShaderInfoLog(i);throw n.deleteShader(i),new Error("signal shader compile error: "+r)}return i}function Q0(n){const t=Ml(n,n.VERTEX_SHADER,Z0),e=Ml(n,n.FRAGMENT_SHADER,J0),i=n.createProgram();if(n.attachShader(i,t),n.attachShader(i,e),n.linkProgram(i),!n.getProgramParameter(i,n.LINK_STATUS)){const r=n.getProgramInfoLog(i);throw new Error("signal program link error: "+r)}return n.deleteShader(t),n.deleteShader(e),i}function tg(n,t,e){const i=t.points,r=i.length;if(r===0)return;const s=new Float32Array(r*3*4);for(let a=0;a<r;a++){const l=i[a];s[a*4+0]=l.localX,s[a*4+1]=l.localY,s[a*4+2]=l.currentScale*i0,s[a*4+3]=l.cellCx??1;const[c,f,u]=W0(l,e),h=r*4+a*4;s[h+0]=c/255,s[h+1]=f/255,s[h+2]=u/255,s[h+3]=l.cellCy??1;const d=r*8+a*4;s[d+0]=l.state,s[d+1]=0,s[d+2]=0,s[d+3]=0}t._glTex||(t._glTex=n.createTexture()),n.bindTexture(n.TEXTURE_2D,t._glTex),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,r,3,0,n.RGBA,n.FLOAT,s),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),t._texCount=r;const o=Math.min(t.syllables.length,tn);t._sylPhaseStart=new Float32Array(tn);for(let a=0;a<o;a++)t._sylPhaseStart[a]=t.syllables[a].cyclePhaseStart;t._sylCount=o}class eg{constructor(t={}){this._transparent=!!t.transparentOutput,this.lineHeightRatio=1,this._canvas=null,this._gl=null,this._prog=null,this._quadBuf=null,this._uniforms=null,this._raf=null,this._rows=[],this._wordCache=new Map,this._JAMO=null,this._sylItems=[],this._positions=[],this._sylSize=Ki,this._stepCount=0,this._lastStep=0,this._STEP_INTERVAL=140,this._lastFrame=0,this._FRAME_INTERVAL=1e3/24,this._flashPhase=0,this._active=!1,this._lastActivity=0,this._paused=!1,this._pausedAt=0,this._rect=null,this.sylSize=Ki,this.wrapStep=Ki,this.wrapMargin=0}async init(t){this._canvas=t??document.createElement("canvas"),this._ownCanvas=!t,t||(Object.assign(this._canvas.style,{position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh"}),document.body.appendChild(this._canvas));const e=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!e)throw new Error("signal: WebGL2 not available");this._gl=e,this._prog=Q0(e),this._quadBuf=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this._quadBuf),e.bufferData(e.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),e.STATIC_DRAW);const i=e.getAttribLocation(this._prog,"a_pos");e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,0,0),this._uniforms={resolution:e.getUniformLocation(this._prog,"u_resolution"),origin:e.getUniformLocation(this._prog,"u_origin"),size:e.getUniformLocation(this._prog,"u_size"),data:e.getUniformLocation(this._prog,"u_data"),count:e.getUniformLocation(this._prog,"u_count"),gapPx:e.getUniformLocation(this._prog,"u_gapPx"),corner:e.getUniformLocation(this._prog,"u_corner"),cutoff:e.getUniformLocation(this._prog,"u_cutoff"),sylSize:e.getUniformLocation(this._prog,"u_sylSize"),sylOffsetX:e.getUniformLocation(this._prog,"u_sylOffsetX"),sylWidth:e.getUniformLocation(this._prog,"u_sylWidth"),sylHeight:e.getUniformLocation(this._prog,"u_sylHeight"),cellSize:e.getUniformLocation(this._prog,"u_cellSize"),time:e.getUniformLocation(this._prog,"u_time"),sylPhaseStart:e.getUniformLocation(this._prog,"u_sylPhaseStart"),sylCount:e.getUniformLocation(this._prog,"u_sylCount"),bgAlpha:e.getUniformLocation(this._prog,"u_bgAlpha")},this._resize(),this._onResize=()=>{this._wake(),this._resize()},window.addEventListener("resize",this._onResize),this._lastActivity=performance.now(),this._raf=requestAnimationFrame(this._animate)}update(t,e,i,r,s,o){if(this._wake(),this._JAMO=i,this._sylItems=t,this._positions=e,this._sylSize=r??this._estimateSylSize(e),this._widths=s??null,this._heights=o??null,!i||t.length===0){this._rows=[],this._wordCache.clear(),this._active=!1;return}this._syncRows(t,e,i),this._active=!0}setRect(t){this._rect=t??null}async flushQueue(){this._wake(),await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t)))}captureFrame(){if(!this._gl||!this._canvas)return null;const t=this._time;return this._time=0,this._draw(),this._time=t,this._canvas.toDataURL("image/png")}clearAccum(){const t=this._gl;if(t)for(const e of this._wordCache.values())e._glTex&&t.deleteTexture(e._glTex);this._wordCache.clear(),this._rows=[],this._sylItems=[],this._positions=[],this._widths=null,this._heights=null,this._stepCount=0,this._active=!1,this._draw()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize);const t=this._gl;if(t){for(const e of this._wordCache.values())e._glTex&&t.deleteTexture(e._glTex);this._quadBuf&&t.deleteBuffer(this._quadBuf),this._prog&&t.deleteProgram(this._prog)}this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._wordCache.clear()}_resize(){if(!this._canvas)return;const t=Math.min(window.devicePixelRatio||1,2);this._cssWidth=window.innerWidth,this._cssHeight=window.innerHeight,this._canvas.width=Math.round(this._cssWidth*t),this._canvas.height=Math.round(this._cssHeight*t),this._gl?.viewport(0,0,this._canvas.width,this._canvas.height)}_estimateSylSize(t){if(t.length<2)return Ki;const e=Math.abs(t[1][0]-t[0][0])*window.innerWidth;return e>10?e:Ki}_syncRows(t,e,i){const r=[];let s=[],o=-1;const a=this._sylSize*.3;for(let c=0;c<t.length;c++){const f=e[c][1]*(this._cssHeight??window.innerHeight);o>=0&&Math.abs(f-o)>a&&(r.push(s),s=[]),s.push({syl:t[c],pos:e[c],w:this._widths?.[c]??this._sylSize,h:this._heights?.[c]??this._sylSize}),o=f}s.length>0&&r.push(s);const l=new Set;this._rows=r.map(c=>{const f=[];let u=[];for(const h of c)u.length>0&&h.syl.wordId!==u[u.length-1].syl.wordId&&(f.push(u),u=[]),u.push(h);return u.length>0&&f.push(u),f.map(h=>{const d=h[0].syl.wordId;return l.add(d),j0(this._wordCache,d,h,i,this._sylSize)})});for(const[c,f]of Array.from(this._wordCache.entries()))l.has(c)||(f._glTex&&this._gl?.deleteTexture(f._glTex),this._wordCache.delete(c))}_animate=t=>{if(t-this._lastActivity>F0){this._raf=null,this._paused=!0,this._pausedAt=t;return}if(this._raf=requestAnimationFrame(this._animate),!(t-this._lastFrame<this._FRAME_INTERVAL)){if(this._lastFrame=t,this._flashPhase+=.08,this._time=t,this._active&&t-this._lastStep>=this._STEP_INTERVAL){this._lastStep=t,this._stepCount++;for(const e of this._rows)for(const i of e)K0(i,t)}for(const e of this._rows)for(const i of e){let r=i._needsUpload;for(const s of i.points){const o=s.currentScale;s.currentScale+=(s.targetScale-s.currentScale)*n0,Math.abs(s.currentScale-o)>.001&&(r=!0)}r&&(tg(this._gl,i,this._flashPhase),i._needsUpload=!1)}this._draw()}};_wake(){const t=performance.now();if(this._paused){const e=t-this._pausedAt;for(const i of this._rows)for(const r of i){for(const s of r.syllables)s.cyclePhaseStart+=e;r._needsUpload=!0}this._lastFrame=0,this._lastStep=t,this._paused=!1,this._raf=requestAnimationFrame(this._animate)}this._lastActivity=t}_draw(){const t=this._gl;if(!t)return;const e=this._transparent?0:1;t.clearColor(Jr*e,Jr*e,Jr*e,e),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(this._prog),t.bindBuffer(t.ARRAY_BUFFER,this._quadBuf),t.uniform2f(this._uniforms.resolution,this._cssWidth??this._canvas.width,this._cssHeight??this._canvas.height),t.uniform1f(this._uniforms.gapPx,r0),t.uniform1f(this._uniforms.corner,s0),t.uniform1f(this._uniforms.cutoff,o0),t.uniform1f(this._uniforms.sylSize,this._sylSize),t.uniform1f(this._uniforms.cellSize,ni),t.uniform1f(this._uniforms.time,this._time??0),t.uniform1f(this._uniforms.bgAlpha,e),t.activeTexture(t.TEXTURE0),t.uniform1i(this._uniforms.data,0);const i=this._sylSize,r=i*.5,s=40,o=i*x0,a=i*Math.max(0,this.lineHeightRatio-1),l=(this._rect?.x??0)+r;let f=(this._rect?.y??0)+s;for(let u=0;u<this._rows.length;u++){const h=this._rows[u];let d=0;for(const g of h)d=Math.max(d,Xs(g));d===0&&(d=i);let _=l;for(let g=0;g<h.length;g++){const m=h[g],p=Xs(m),y=_,E=f+(d-p)*.5;this._drawWord(t,m,y,E),_+=os(m),g<h.length-1&&(_+=o)}f+=d+a}}_drawWord(t,e,i,r){const s=e.points.length;if(s===0||!e._glTex)return;const o=os(e),a=Xs(e),l=e.syllables,c=Math.min(l.length,tn),f=new Float32Array(tn),u=new Float32Array(tn),h=new Float32Array(tn);let d=0;for(let _=0;_<c;_++)f[_]=d,u[_]=l[_].w,h[_]=l[_].h,d+=l[_].w;t.bindTexture(t.TEXTURE_2D,e._glTex),t.uniform2f(this._uniforms.origin,i,r),t.uniform2f(this._uniforms.size,o,a),t.uniform1i(this._uniforms.count,Math.min(s,wc)),t.uniform1fv(this._uniforms.sylOffsetX,f),t.uniform1fv(this._uniforms.sylWidth,u),t.uniform1fv(this._uniforms.sylHeight,h),t.uniform1fv(this._uniforms.sylPhaseStart,e._sylPhaseStart),t.uniform1i(this._uniforms.sylCount,Math.max(e._sylCount,1)),t.drawArrays(t.TRIANGLE_STRIP,0,4)}}const Zo=Math.PI*2;function ri(n){let t=n>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function un(...n){let t=2166136261;for(const e of n){const i=String(e);for(let r=0;r<i.length;r++)t=Math.imul(t^i.charCodeAt(r),16777619)>>>0;t=Math.imul(t^44,16777619)>>>0}return t>>>0}const de=(n,t,e)=>t+n()*(e-t);function Pc(n=1){const t=e=>{const i=Math.sin((e+n)*127.1)*43758.5453;return i-Math.floor(i)};return e=>{const i=Math.floor(e),r=e-i,s=r*r*(3-2*r);return t(i)*(1-s)+t(i+1)*s}}function Lc(n,t){if(n.length<2)return n.map(s=>({x:s.x,y:s.y}));const e=[{x:n[0].x,y:n[0].y}];let i=e[0],r=0;for(let s=1;s<n.length;s++){let o=n[s].x,a=n[s].y,l=Math.hypot(o-i.x,a-i.y);for(;r+l>=t;){const c=(t-r)/l;i={x:i.x+(o-i.x)*c,y:i.y+(a-i.y)*c},e.push(i),l=Math.hypot(o-i.x,a-i.y),r=0}r+=l,i={x:o,y:a}}return e}function Fo(n,t){let e=n;for(let i=0;i<t&&!(e.length<3);i++){const r=[e[0]];for(let s=1;s<e.length-1;s++)r.push({x:(e[s-1].x+e[s].x+e[s+1].x)/3,y:(e[s-1].y+e[s].y+e[s+1].y)/3});r.push(e[e.length-1]),e=r}return e}const No=(n,t)=>Math.max(0,Math.round(n/t));function Jo(n){for(let t=0;t<n.length;t++){const e=n[Math.max(0,t-1)],i=n[Math.min(n.length-1,t+1)],r=Math.atan2(i.y-e.y,i.x-e.x);n[t].angle=r,n[t].nx=Math.cos(r+Math.PI/2),n[t].ny=Math.sin(r+Math.PI/2)}return n}function as(n,t){if(!t||t.length===0)return null;if(t.length===1)return{...t[0]};n=Math.max(0,Math.min(t.length-1,n));const e=Math.floor(n),i=n-e,r=t[e],s=t[Math.min(t.length-1,e+1)];let o=s.angle-r.angle;o=Math.atan2(Math.sin(o),Math.cos(o));const a=r.angle+o*i;return{x:r.x+(s.x-r.x)*i,y:r.y+(s.y-r.y)*i,angle:a,nx:Math.cos(a+Math.PI/2),ny:Math.sin(a+Math.PI/2)}}function ng(n){return[{px0:0,seed:n}]}function ig(n,t){let e=0;for(;e+1<n.length&&n[e+1].px0<=t;)e++;return e}const rg=n=>n*n*(3-2*n);function ls(n,t,e,i){const r=ig(n,t),s=t-n[r].px0,o=i(r,s);if(r>0&&e>0&&s<e){const a=i(r-1,t-n[r-1].px0);return a+(o-a)*rg(s/e)}return o}const Qo=(n,t,e)=>Math.min(t+1<n.length?n[t+1].px0:1/0,e),Dc=n=>(n>>>0)%9973;function yl(n,t){const e=Math.sin(t*12.9898+Dc(n)*78.233)*43758.5453;return(e-Math.floor(e))*2-1}function Gr(n,t,e,i=0,r=null){const[s,o]=n.companions,a=s+Math.floor(ri(un(i,"comp"))()*(o-s+1));return{id:t,birth:e,seed:i,plan:r?.length?r:ng(i),nc:a,raw:[],spine:null,spineInk:null,compPolys:[],compPlan:null,decor:[],orbs:[],segCache:null}}function bi(n,t,e,i){const r=n.raw[n.raw.length-1];return r&&Math.hypot(e-r.x,i-r.y)<t.minDist||n.raw.length>=t.maxRaw?!1:(n.raw.push({x:e,y:i}),!0)}function sg(n,t){const e=Lc(n,t.spacing);return Jo(Fo(e,No(t.spineSmooth,t.spacing)))}function og(n,t,e){const i=ri(un(n.seed,"comp"));i();const r=[];for(let s=0;s<t;s++)r.push({amp:de(i,e.wanderAmp[0],e.wanderAmp[1]),wanderLen:de(i,e.wanderLen[0],e.wanderLen[1]),weaveAmp:de(i,e.weaveAmp[0],e.weaveAmp[1]),weaveLen:de(i,e.weaveLen[0],e.weaveLen[1]),weavePhase:de(i,0,Zo),nz:Pc(de(i,0,999)),swirly:i()>=e.noSwirlChance});return r}function ag(n,t,e,i){const{plan:r}=n,s=[];for(let o=0;o<r.length&&s.length<i.maxSwirls;o++){if(!n.segCache.comps[o][t].swirly)continue;const a=ri(un(r[o].seed,"event",t)),l=Qo(r,o,e);let c=r[o].px0,f=de(a,i.eventGap[0],i.eventGap[1]);for(;s.length<i.maxSwirls&&c+f<=l;){if(c+=f,f=de(a,i.eventGap[0],i.eventGap[1]),a()>i.eventProb)continue;const u=de(a,i.swirlSpan[0],i.swirlSpan[1]);s.push({c:c+u+de(a,0,i.spacing*6),span:u,R:de(a,i.swirlRadius[0],i.swirlRadius[1]),turns:de(a,i.swirlTurns[0],i.swirlTurns[1]),dir:a()<.5?1:-1,phase:de(a,0,Zo)})}}return s}function lg(n,t,e){if(!e.decor)return[];const{plan:i}=n,r=[];for(let s=0;s<i.length;s++){const o=ri(un(i[s].seed,"decor")),a=Qo(i,s,t);let l=i[s].px0,c=de(o,e.decorGap[0],e.decorGap[1]);for(;l+c<=a;)l+=c,c=de(o,e.decorGap[0],e.decorGap[1]),r.push({px:l,off:de(o,-e.decorSpread,e.decorSpread),jx:de(o,-4,4),jy:de(o,-4,4),r:de(o,e.decorRadius[0],e.decorRadius[1]),x:0,y:0})}return r}function cg(n,t,e){const i=e.orb;if(!i?.on)return[];const{plan:r}=n,s=[];for(let o=0;o<r.length;o++){const a=ri(un(r[o].seed,"orb")),l=Qo(r,o,t);let c=r[o].px0,f=de(a,i.gap[0],i.gap[1]),u=0;for(;c+f<=l;){c+=f,f=de(a,i.gap[0],i.gap[1]);const h=a()<=i.prob,d={px:c,off:de(a,-i.spread,i.spread),r:de(a,i.radius[0],i.radius[1]),seed:un(r[o].seed,"orb",u++),x:0,y:0};h&&s.push(d)}}return s}function El(n,t,e){const i=(t.length-1)*e.spacing;for(const r of n){const s=as(Math.min(r.px,i)/e.spacing,t);s&&(r.x=s.x+s.nx*r.off+(r.jx??0),r.y=s.y+s.ny*r.off+(r.jy??0))}}function ug(n,t,e){const i=e.spineFx,{plan:r}=n;let s=0;const o=i.roughen;o?.on&&o.size&&(s+=ls(r,t,e.segBlend,(l,c)=>{const f=c/o.gap,u=Math.floor(f),h=f-u,d=yl(r[l].seed,u),_=yl(r[l].seed,u+1),g=o.mode==="corner"?h:(1-Math.cos(h*Math.PI))*.5;return(d+(_-d)*g)*o.size}));const a=i.puckerBloat;return a?.on&&a.amount&&(s+=ls(r,t,e.segBlend,(l,c)=>{const f=c/a.gap%1,u=Math.sin(f*Math.PI);return a.amount>0?a.amount*u:-a.amount*(1-u)*(1-u)})),s}function hg(n,t,e){const i=e.spineFx;if(!i||!(i.roughen?.on||i.puckerBloat?.on))return null;const r=e.spacing,s=t.map((o,a)=>{const l=ug(n,a*r,e);return{x:o.x+o.nx*l,y:o.y+o.ny*l}});return Jo(s)}function fg(n,t,e,i){const r=i.goo.reach;if(!Array.isArray(r))return r;const s=t==="comp"&&n.compPlan?n.compPlan:n.plan,o=n.segCache?.reachNz;return o?ls(s,e,i.segBlend,(a,l)=>r[0]+(r[1]-r[0])*o[a](l/i.goo.reachLen)):(r[0]+r[1])*.5}function dg(n,t,e,i,r){const s=r.spacing,a=(n.length-1)*s-r.headLag;if(a<r.compStep*4)return[];const l=Fo(n.map(y=>({x:y.x,y:y.y})),No(r.compBaseSmooth,s)),c=[0];for(let y=1;y<l.length;y++)c.push(c[y-1]+Math.hypot(l[y].x-l[y-1].x,l[y].y-l[y-1].y));const f=y=>{const E=Math.max(0,Math.min(l.length-1,y/s)),v=Math.floor(E);return v>=l.length-1?c[l.length-1]:c[v]+(c[v+1]-c[v])*(E-v)},u=Jo(Lc(l,s)),h=(u.length-1)*s,d=t.plan.map(y=>({px0:f(y.px0),seed:y.seed}));t.compPlan=d;const _=i.map(y=>({...y,c:f(y.c)})),g=t.segCache.comps,m=[],p=Math.min(a,h);for(let y=0;y<=p;y+=r.compStep){const E=as(y/s,u),v=ls(d,y,r.segBlend,(b,L)=>{const x=g[b][e],S=L/x.wanderLen,w=x.amp*1.6*(x.nz(S)-x.nz(S+111.3)),D=x.weaveAmp*Math.sin(L/x.weaveLen*Zo+x.weavePhase);return w+D});let C=E.nx*v,R=E.ny*v;for(const b of _){const L=(y-b.c)/b.span;if(L<=-1||L>=1)continue;const x=Math.cos(L*Math.PI/2)**2,S=b.phase+b.dir*(L+1)*Math.PI*b.turns;C+=Math.cos(S)*b.R*x,R+=Math.sin(S)*b.R*x}m.push({x:E.x+C,y:E.y+R})}return Fo(m,No(r.compSmooth,r.compStep))}function Ai(n,t){if(n.raw.length<2){n.spine=null,n.spineInk=null,n.compPolys=[];return}const e=sg(n.raw,t),i=(e.length-1)*t.spacing;n.segCache={comps:n.plan.map(r=>og(r,n.nc,t)),reachNz:n.plan.map(r=>Pc(Dc(un(r.seed,"reach"))))},n.decor=lg(n,i,t),El(n.decor,e,t),n.orbs=cg(n,i,t),El(n.orbs,e,t),n.spine=e,n.spineInk=hg(n,e,t),n.compPolys=[];for(let r=0;r<n.nc;r++){const s=dg(e,n,r,ag(n,r,i,t),t);s.length>=2&&n.compPolys.push(s)}}function Tl(n,t,e,i){const r=n.createShader(t);return n.shaderSource(r,e),n.compileShader(r),n.getShaderParameter(r,n.COMPILE_STATUS)||console.error(`[${i}] ${n.getShaderInfoLog(r)}`),r}function or(n,t,e,i){const r=n.createProgram();return n.attachShader(r,Tl(n,n.VERTEX_SHADER,t,i+".vert")),n.attachShader(r,Tl(n,n.FRAGMENT_SHADER,e,i+".frag")),n.linkProgram(r),n.getProgramParameter(r,n.LINK_STATUS)||console.error(`[${i}] ${n.getProgramInfoLog(r)}`),r}function ar(n,t){const e=new Map;return i=>(e.has(i)||e.set(i,n.getUniformLocation(t,i)),e.get(i))}function zi(n,t,e,i={}){const r=i.internal??n.RGBA16F,s=i.type??n.HALF_FLOAT,o=i.filter??n.LINEAR,a=i.data??null,l=n.createTexture();n.bindTexture(n.TEXTURE_2D,l),n.texImage2D(n.TEXTURE_2D,0,r,t,e,0,n.RGBA,s,a),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,o),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,o),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE);const c=n.createFramebuffer();return n.bindFramebuffer(n.FRAMEBUFFER,c),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,l,0),n.checkFramebufferStatus(n.FRAMEBUFFER)!==n.FRAMEBUFFER_COMPLETE&&console.error(`[glutil] FBO incomplete (${t}x${e})`),n.bindFramebuffer(n.FRAMEBUFFER,null),{tex:l,fbo:c,w:t,h:e}}function ki(n,t){t&&(n.deleteTexture(t.tex),n.deleteFramebuffer(t.fbo))}const pg=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);function mg(n){const t=n.createBuffer();return n.bindBuffer(n.ARRAY_BUFFER,t),n.bufferData(n.ARRAY_BUFFER,pg,n.STATIC_DRAW),t}function ta(n,t){const e=n.createVertexArray();return n.bindVertexArray(e),n.bindBuffer(n.ARRAY_BUFFER,t),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindVertexArray(null),e}function _g(n,t,e,i){let r=zi(n,t,e,i),s=zi(n,t,e,i);return{get read(){return r},get write(){return s},swap(){const o=r;r=s,s=o},drop(){ki(n,r),ki(n,s)}}}var gg=`#version 300 es

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
}`,vg=`#version 300 es

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
}`,ea=`#version 300 es

precision highp float;

layout(location = 0) in vec2 a_position;

out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,xg=`#version 300 es

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
}`;const Qr=8;function Sg(n,t){!n.getExtension("EXT_color_buffer_half_float")&&!n.getExtension("EXT_color_buffer_float")&&console.warn("[field] float 렌더타겟 확장이 없습니다 — 밀도 누적이 8bit 로 깎입니다");const e=or(n,gg,vg,"stamp"),i=or(n,ea,xg,"composite"),r=ar(n,e),s=ar(n,i),o=n.createBuffer();let a=0;const l=n.createVertexArray();n.bindVertexArray(l),n.bindBuffer(n.ARRAY_BUFFER,t),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ARRAY_BUFFER,o);const c=Qr*4;n.enableVertexAttribArray(1),n.vertexAttribPointer(1,4,n.FLOAT,!1,c,0),n.vertexAttribDivisor(1,1),n.enableVertexAttribArray(2),n.vertexAttribPointer(2,4,n.FLOAT,!1,c,16),n.vertexAttribDivisor(2,1),n.bindVertexArray(null);const f=ta(n,t);let u=1,h=1,d=1,_=1,g=1,m=null,p=null;function y(D,I,O,W){d=D,_=I,u=Math.max(1,O),h=Math.max(1,W),g=d/u,ki(n,m),ki(n,p),m=zi(n,u,h),p=zi(n,u,h)}function E(D){const I=D==="baked"?m:p;n.bindFramebuffer(n.FRAMEBUFFER,I.fbo),n.viewport(0,0,u,h),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)}function v(D,I,O){if(!O)return;const W=D==="baked"?m:p;n.bindBuffer(n.ARRAY_BUFFER,o),I.length>a?(n.bufferData(n.ARRAY_BUFFER,I,n.DYNAMIC_DRAW),a=I.length):n.bufferSubData(n.ARRAY_BUFFER,0,I),n.bindFramebuffer(n.FRAMEBUFFER,W.fbo),n.viewport(0,0,u,h),n.useProgram(e),n.bindVertexArray(l),n.uniform2f(r("u_cssSize"),d,_),n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE),n.drawArraysInstanced(n.TRIANGLES,0,6,O),n.disable(n.BLEND),n.bindVertexArray(null),n.bindFramebuffer(n.FRAMEBUFFER,null)}function C(D,I,O){n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,I,O),n.disable(n.BLEND),n.useProgram(i),n.bindVertexArray(f),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,m.tex),n.uniform1i(s("u_baked"),0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,p.tex),n.uniform1i(s("u_live"),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,D.growthTex??m.tex),n.uniform1i(s("u_growth"),2),n.uniform2f(s("u_texel"),1/u,1/h),n.uniform1f(s("u_pxPerTexel"),g),n.uniform1f(s("u_th"),D.th),n.uniform1f(s("u_compCap"),D.compCap??0),n.uniform1f(s("u_edge"),D.edge),n.uniform3fv(s("u_paper"),D.paper),n.uniform3fv(s("u_ink"),D.ink),n.uniform1i(s("u_shade"),D.shade),n.uniform3fv(s("u_light"),D.light),n.uniform1f(s("u_normalZ"),D.normalZ),n.uniform1f(s("u_amb"),D.amb),n.uniform1f(s("u_diff"),D.diff),n.uniform1f(s("u_spec"),D.spec),n.uniform1f(s("u_specPow"),D.specPow),n.uniform1f(s("u_fres"),D.fres),n.uniform1f(s("u_bands"),D.bands),n.uniform3fv(s("u_growInk"),D.growInk),n.uniform1f(s("u_growGain"),D.growGain),n.uniform1f(s("u_growOpacity"),D.growOpacity),n.drawArrays(n.TRIANGLES,0,6),n.bindVertexArray(null)}function R(D){const I=(D&32768)>>15,O=(D&31744)>>10,W=D&1023;return O===0?(I?-1:1)*Math.pow(2,-14)*(W/1024):O===31?W?NaN:(I?-1:1)*(1/0):(I?-1:1)*Math.pow(2,O-15)*(1+W/1024)}const b=new Float32Array(4),L=new Uint16Array(4);function x(D,I,O="baked"){const W=O==="baked"?m:p,B=Math.round(D/d*u),j=Math.round((1-I/_)*h);n.bindFramebuffer(n.FRAMEBUFFER,W.fbo);const V=n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE);let it;V===n.HALF_FLOAT?(n.readPixels(B,j,1,1,n.RGBA,n.HALF_FLOAT,L),it=Array.from(L,R)):(n.readPixels(B,j,1,1,n.RGBA,n.FLOAT,b),it=Array.from(b)),n.bindFramebuffer(n.FRAMEBUFFER,null);const[st,xt,It,Rt]=it;return{density:st,comp:Rt,strokeId:st>1e-4?xt/st:0,birth:st>1e-4?It/st:0}}return{resize:y,clear:E,stamp:v,composite:C,probe:x,textures:()=>({baked:m.tex,live:p.tex}),texel:()=>[1/u,1/h]}}var Mg=`#version 300 es

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
}`;function yg(n,t){const e=or(n,ea,Mg,"growth"),i=ar(n,e),r=ta(n,t);let s=null,o=1,a=1,l=1,c=1;function f(_,g,m,p){l=_,c=g,o=Math.max(1,m),a=Math.max(1,p),s&&s.drop(),s=_g(n,o,a),u()}function u(){for(let _=0;_<2;_++)n.bindFramebuffer(n.FRAMEBUFFER,s.write.fbo),n.viewport(0,0,o,a),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),s.swap();n.bindFramebuffer(n.FRAMEBUFFER,null)}function h(_){n.bindFramebuffer(n.FRAMEBUFFER,s.write.fbo),n.viewport(0,0,o,a),n.disable(n.BLEND),n.useProgram(e),n.bindVertexArray(r),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,s.read.tex),n.uniform1i(i("u_prev"),0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,_.bakedTex),n.uniform1i(i("u_baked"),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,_.liveTex),n.uniform1i(i("u_live"),2),n.uniform2fv(i("u_fieldTexel"),_.fieldTexel),n.uniform2f(i("u_cssSize"),l,c),n.uniform1f(i("u_time"),_.time),n.uniform1f(i("u_dt"),_.dt),n.uniform1f(i("u_th"),_.th),n.uniform1f(i("u_compCap"),_.compCap??0),n.uniform1f(i("u_decay"),_.decay),n.uniform1f(i("u_outward"),_.outward),n.uniform1f(i("u_curlAmp"),_.curlAmp),n.uniform1f(i("u_curlScale"),_.curlScale),n.uniform1f(i("u_curlSpeed"),_.curlSpeed),n.uniform1f(i("u_source"),_.source),n.uniform1f(i("u_bandLo"),_.bandLo),n.uniform1f(i("u_bandHi"),_.bandHi),n.uniform1f(i("u_nowMin"),_.nowMin),n.uniform1f(i("u_ageDelay"),_.ageDelay),n.drawArrays(n.TRIANGLES,0,6),n.bindVertexArray(null),n.bindFramebuffer(n.FRAMEBUFFER,null),s.swap()}return{resize:f,clear:u,step:h,texture:()=>s.read.tex}}var Eg=`#version 300 es

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
}`,Tg=`#version 300 es

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
}`,bg=`#version 300 es

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
}`;function Ag(n,t,e=128){const i=!!n.getExtension("EXT_color_buffer_float");i||console.warn("[particles] EXT_color_buffer_float 없음 — 16F 로 대체(위치 정밀도 저하)");const r=i?{internal:n.RGBA32F,type:n.FLOAT,filter:n.NEAREST}:{internal:n.RGBA16F,type:n.HALF_FLOAT,filter:n.NEAREST},s=or(n,ea,Eg,"pupdate"),o=or(n,Tg,bg,"particle"),a=ar(n,s),l=ar(n,o),c=ta(n,t),f=n.createVertexArray(),u=e*e;let h=null,d=null,_=1,g=1,m=0;function p(){const b=new Float32Array(u*4);for(let L=0;L<u;L++)b[L*4+0]=0,b[L*4+1]=0,b[L*4+2]=0,b[L*4+3]=Math.random();return b}function y(){ki(n,h),ki(n,d),h=zi(n,e,e,{...r,data:p()}),d=zi(n,e,e,r)}function E(b,L){_=b,g=L,h||y()}function v(b){n.bindFramebuffer(n.FRAMEBUFFER,d.fbo),n.viewport(0,0,e,e),n.disable(n.BLEND),n.useProgram(s),n.bindVertexArray(c),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,h.tex),n.uniform1i(a("u_prev"),0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,b.bakedTex),n.uniform1i(a("u_baked"),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,b.liveTex),n.uniform1i(a("u_live"),2),n.uniform2fv(a("u_fieldTexel"),b.fieldTexel),n.uniform2f(a("u_cssSize"),_,g),n.uniform1f(a("u_time"),b.time),n.uniform1ui(a("u_frame"),m++>>>0),n.uniform1f(a("u_dt"),b.dt),n.uniform1f(a("u_th"),b.th),n.uniform1f(a("u_compCap"),b.compCap??0),n.uniform1f(a("u_spawnTol"),b.spawnTol),n.uniform1f(a("u_spawnRate"),b.spawnRate),n.uniform1f(a("u_lifespan"),b.lifespan),n.uniform1f(a("u_lifeVar"),b.lifeVar),n.uniform1f(a("u_curlAmp"),b.curlAmp),n.uniform1f(a("u_curlScale"),b.curlScale),n.uniform1f(a("u_curlSpeed"),b.curlSpeed),n.uniform1f(a("u_flow"),b.flow),n.uniform1f(a("u_repel"),b.repel),n.drawArrays(n.TRIANGLES,0,6),n.bindVertexArray(null),n.bindFramebuffer(n.FRAMEBUFFER,null);const L=h;h=d,d=L}function C(b,L,x,S){n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,L,x),n.enable(n.BLEND),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.useProgram(o),n.bindVertexArray(f),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,h.tex),n.uniform1i(l("u_state"),0),n.uniform2i(l("u_stateSize"),e,e),n.uniform2f(l("u_cssSize"),_,g),n.uniform1f(l("u_size"),b.size),n.uniform1f(l("u_dpr"),S),n.uniform3fv(l("u_ink"),b.ink),n.uniform1f(l("u_opacity"),b.opacity),n.drawArrays(n.POINTS,0,u),n.bindVertexArray(null),n.disable(n.BLEND)}function R(){const b=new Float32Array(u*4);n.bindFramebuffer(n.FRAMEBUFFER,h.fbo),n.readPixels(0,0,e,e,n.RGBA,n.FLOAT,b),n.bindFramebuffer(n.FRAMEBUFFER,null);let L=0,x=1/0,S=-1/0;for(let D=0;D<u;D++)b[D*4+2]>0&&(L++,x=Math.min(x,b[D*4]),S=Math.max(S,b[D*4]));const w=[];for(let D=0;D<3;D++)w.push(Array.from(b.slice(D*4,D*4+4),I=>+I.toFixed(4)));return{alive:L,count:u,xRange:L?[x,S]:null,sample:w}}return{resize:E,reset:y,step:v,draw:C,count:u,stats:R}}const wg=1.55;function Rg(n,t,e,i,r,s){const o=n-e,a=t-i,l=r-e,c=s-i,f=l*l+c*c,u=f>1e-9?Math.max(0,Math.min(1,(o*l+a*c)/f)):0,h=o-l*u,d=a-c*u;return Math.sqrt(h*h+d*d)}function Cg(n,t){if(!(t>0))return n;const e=n/t;return n/Math.pow(1+e*e*e*e,.25)}function Pg(n,{reach:t=28,th:e=.5,cell:i=4,compCap:r=0}={}){if(!n||n.length===0)return[];let s=1/0,o=1/0,a=-1/0,l=-1/0;for(const v of n)s=Math.min(s,v.ax,v.bx),a=Math.max(a,v.ax,v.bx),o=Math.min(o,v.ay,v.by),l=Math.max(l,v.ay,v.by);s-=t,o-=t,a+=t,l+=t;const c=Math.ceil((a-s)/i)+1,f=Math.ceil((l-o)/i)+1;if(c<2||f<2||c*f>4e6)return[];const u=Math.max(1,Math.ceil((a-s)/t)),h=Math.max(1,Math.ceil((l-o)/t)),d=Array.from({length:u*h},()=>[]),_=(v,C)=>C*u+v;for(let v=0;v<n.length;v++){const C=n[v],R=Math.max(0,Math.floor((Math.min(C.ax,C.bx)-t-s)/t)),b=Math.min(u-1,Math.floor((Math.max(C.ax,C.bx)+t-s)/t)),L=Math.max(0,Math.floor((Math.min(C.ay,C.by)-t-o)/t)),x=Math.min(h-1,Math.floor((Math.max(C.ay,C.by)+t-o)/t));for(let S=L;S<=x;S++)for(let w=R;w<=b;w++)d[_(w,S)].push(v)}const g=new Float32Array(c*f);for(let v=0;v<f;v++){const C=o+v*i,R=Math.max(0,Math.min(h-1,Math.floor((C-o)/t)));for(let b=0;b<c;b++){const L=s+b*i,x=Math.max(0,Math.min(u-1,Math.floor((L-s)/t)));let S=0,w=0;for(const D of d[_(x,R)]){const I=n[D],O=Rg(L,C,I.ax,I.ay,I.bx,I.by);if(O>=t)continue;const W=1-O/t,B=Math.hypot(I.bx-I.ax,I.by-I.ay),j=W*W*W*(wg*B/t);I.c&&r>0?w+=j:S+=j}g[v*c+b]=S+Cg(w,r)}}const m=(v,C)=>g[C*c+v],p=(v,C,R)=>{const b=m(v,C),L=m(R,C),x=Math.abs(L-b)<1e-9?.5:(e-b)/(L-b);return{x:s+(v+(R-v)*x)*i,y:o+C*i}},y=(v,C,R)=>{const b=m(v,C),L=m(v,R),x=Math.abs(L-b)<1e-9?.5:(e-b)/(L-b);return{x:s+v*i,y:o+(C+(R-C)*x)*i}},E=[];for(let v=0;v<f-1;v++)for(let C=0;C<c-1;C++){const R=m(C,v)>e,b=m(C+1,v)>e,L=m(C+1,v+1)>e,x=m(C,v+1)>e;let S=(R?8:0)|(b?4:0)|(L?2:0)|(x?1:0);if(S===0||S===15)continue;const w=()=>p(C,v,C+1),D=()=>p(C,v+1,C+1),I=()=>y(C,v,v+1),O=()=>y(C+1,v,v+1);if(S===5||S===10){const B=(m(C,v)+m(C+1,v)+m(C+1,v+1)+m(C,v+1))*.25>e;S===5===B?E.push({a:I(),b:w()},{a:D(),b:O()}):E.push({a:I(),b:D()},{a:w(),b:O()});continue}switch(S){case 1:case 14:E.push({a:I(),b:D()});break;case 2:case 13:E.push({a:D(),b:O()});break;case 3:case 12:E.push({a:I(),b:O()});break;case 4:case 11:E.push({a:w(),b:O()});break;case 6:case 9:E.push({a:w(),b:D()});break;case 7:case 8:E.push({a:I(),b:w()});break}}return Lg(E,i*.5)}function Lg(n,t){const e=a=>`${Math.round(a.x/t)},${Math.round(a.y/t)}`,i=new Map,r=(a,l)=>{i.has(a)||i.set(a,[]),i.get(a).push(l)};n.forEach((a,l)=>{r(e(a.a),l),r(e(a.b),l)});const s=new Uint8Array(n.length),o=[];for(let a=0;a<n.length;a++){if(s[a])continue;s[a]=1;const l=[n[a].a,n[a].b];for(let c=0;c<2;c++)for(;;){const f=c===0?l[l.length-1]:l[0],u=(i.get(e(f))||[]).find(g=>!s[g]);if(u===void 0)break;s[u]=1;const h=n[u],_=Math.hypot(h.a.x-f.x,h.a.y-f.y)<=Math.hypot(h.b.x-f.x,h.b.y-f.y)?h.b:h.a;c===0?l.push(_):l.unshift(_)}l.length>=3&&o.push(l)}return o}const Dg=60,Ig=2,Vr=n=>[parseInt(n.slice(1,3),16)/255,parseInt(n.slice(3,5),16)/255,parseInt(n.slice(5,7),16)/255];function Ug(n={}){const t={seed:Math.random()*4294967295>>>0,spacing:6,spineSmooth:12,minDist:4,maxRaw:12e3,companions:[1,1],wanderAmp:[6,18],wanderLen:[500,950],weaveAmp:[16,32],weaveLen:[340,560],noSwirlChance:.1,maxSwirls:40,eventGap:[210,450],eventProb:.8,swirlSpan:[66,78],swirlRadius:[35,45],swirlTurns:[1,1.7],compBaseSmooth:96,compStep:3.6,compSmooth:11,headLag:12,segBlend:24,spineFx:{target:"ink",roughen:{on:!1,size:2,gap:8,mode:"smooth"},puckerBloat:{on:!1,amount:4,gap:24}},bead:{on:!1,gap:[40,90],radius:[1.5,3.5],speed:30,fill:"rgb(0, 0, 0)",stroke:null,lineWidth:.75,main:{on:!1,radius:4,speed:40,fill:"rgb(0, 0, 0)",stroke:null,lineWidth:.75,glow:{on:!1,core:.45,falloff:1.4}}},orb:{on:!1,gap:[90,200],prob:.7,radius:[6,22],spread:26,fill:"#ffe83d",ring:null,ringWidth:.6,flow:{cell:2.6,dash:2.2,scale:.05,turns:1,follow:.85,falloff:220,drift:.6,style:"rgba(60, 45, 0, 0.7)",width:.5}},growPx:14,lineWidth:.5,baseStyle:"rgb(0, 0, 0)",companionStyle:"rgb(0, 0, 0)",companionDash:[3,4],arrowSize:7,decor:!0,decorGap:[20,80],decorSpread:30,decorRadius:[1.5,4],decorStyle:"rgb(0, 0, 0)",decorLineWidth:.75,outline:{on:!0,reach:30,th:.55,cell:4,style:"rgba(0,0,0,0.45)",width:.6,dash:[],anim:{on:!1,speed:450}},goo:{reach:18,reachLen:140,compCap:0,th:1.3,edge:.005,spine:!0,companion:!1,fieldScale:1.5},paper:"#ffffff",ink:"#0a0a0a",shade:2,light:[-.45,.6,.66],normalZ:34,amb:.55,diff:.75,spec:.5,specPow:28,fres:.22,bands:3,grow:{on:!1,scale:.75,decay:.965,outward:26,curlAmp:55,curlScale:.006,curlSpeed:.06,source:1,bandLo:.35,bandHi:.12,ageDelay:.02,ink:"#6e6e66",gain:1.4,opacity:.5},part:{on:!1,side:128,spawnTol:.08,spawnRate:.04,lifespan:4.5,lifeVar:.5,curlAmp:34,curlScale:.0075,curlSpeed:.09,flow:26,repel:14,size:2.6,ink:"#141414",opacity:.55}},e=A=>A&&typeof A=="object"&&!Array.isArray(A),i=(A,H)=>{for(const[nt,K]of Object.entries(H))e(K)&&e(A[nt])?i(A[nt],K):A[nt]=K};n.cfg&&i(t,n.cfg);const r=!n.canvas&&!document.getElementById("c"),s=n.canvas??document.getElementById("c")??document.createElement("canvas");r&&document.body.appendChild(s);const o=document.createElement("canvas");s.parentNode?s.parentNode.insertBefore(o,s):document.body.prepend(o);const a=document.createElement("canvas");document.body.appendChild(a);for(const A of[o,s,a])A.style.position="fixed",A.style.left="0",A.style.top="0";o.style.background=n.paperBg===!1?"transparent":t.paper,s.style.background="transparent",o.style.pointerEvents="none",a.style.touchAction="none",n.mouse&&(a.style.cursor="crosshair"),n.mouse||(a.style.pointerEvents="none");const l=document.body.style.background;n.bodyBg!==!1&&(document.body.style.background=t.paper);const c=s.getContext("webgl2",{antialias:!1,alpha:!0,premultipliedAlpha:!1,preserveDrawingBuffer:!0});if(!c){console.error("WebGL2 를 쓸 수 없습니다");return}const f=mg(c),u=Sg(c,f),h=yg(c,f),d=Ag(c,f,t.part.side),_=document.createElement("canvas"),g=_.getContext("2d"),m=a.getContext("2d"),p=o.getContext("2d");let y=0,E=0,v=1;function C(){v=Math.min(window.devicePixelRatio||1,Ig),y=Math.max(1,window.innerWidth),E=Math.max(1,window.innerHeight);for(const A of[s,a,_,o])A.width=Math.round(y*v),A.height=Math.round(E*v);for(const A of[o,s,a])A.style.width=y+"px",A.style.height=E+"px";for(const A of[g,m,p])A.setTransform(v,0,0,v,0,0);u.resize(y,E,Math.round(y*v*t.goo.fieldScale),Math.round(E*v*t.goo.fieldScale)),h.resize(y,E,Math.round(y*v*t.grow.scale),Math.round(E*v*t.grow.scale)),d.resize(y,E),Tt()}function R(A,H,nt,K,Z,_t,lt){for(let Gt=1;Gt<H.length;Gt++){const oe=H[Gt-1],le=H[Gt];A.push(oe.x,oe.y,le.x,le.y,nt((Gt-.5)*K),Z,_t,lt)}}const b=A=>t.spineFx?.target==="all"&&A.spineInk||A.spine;function L(A,H){const nt=!Array.isArray(t.goo.reach),K=lt=>nt?()=>t.goo.reach:Gt=>fg(A,lt,Gt,t),Z=t.goo.compCap>0?1:0;if(t.goo.companion)for(const lt of A.compPolys)R(H,lt,K("comp"),t.compStep,A.id,A.birth,Z);const _t=b(A);t.goo.spine&&_t&&R(H,_t,K("spine"),t.spacing,A.id,A.birth,0)}function x(A,H,nt,K,Z){if(!(H.length<2)){A.strokeStyle=nt,A.lineWidth=K,A.lineJoin="round",A.lineCap="round",A.setLineDash(Z||[]),A.beginPath(),A.moveTo(H[0].x,H[0].y);for(let _t=1;_t<H.length;_t++)A.lineTo(H[_t].x,H[_t].y);A.stroke(),A.setLineDash([])}}function S(A,H,nt,K){if(!H||!nt)return;const Z=Math.atan2(H.y-nt.y,H.x-nt.x);A.fillStyle="rgb(0, 0, 0)",A.beginPath(),A.moveTo(H.x,H.y),A.lineTo(H.x-Math.cos(Z-.4)*K,H.y-Math.sin(Z-.4)*K),A.lineTo(H.x-Math.cos(Z+.4)*K,H.y-Math.sin(Z+.4)*K),A.closePath(),A.fill()}function w(A,H,nt=!0){if(nt&&H.outline)for(const Z of H.outline)x(A,Z,t.outline.style,t.outline.width,t.outline.dash);const K=H.spineInk??H.spine;K&&x(A,K,t.baseStyle,t.lineWidth);for(const Z of H.decor)A.strokeStyle=t.decorStyle,A.lineWidth=t.decorLineWidth,A.strokeRect(Z.x-Z.r,Z.y-Z.r,Z.r*2,Z.r*2);for(const Z of H.compPolys)x(A,Z,t.companionStyle,t.lineWidth,t.companionDash),S(A,Z.at(-1),Z.at(-3)||Z.at(-2),t.arrowSize)}let D=0;function I(A,H){if(A._mainFrame===D)return A._main;A._mainFrame=D,A._main=null;const nt=t.bead.main,K=A.spineInk??A.spine;if(!nt?.on||!K||K.length<2)return null;const Z=t.spacing,_t=(K.length-1)*Z,lt=ri(un(A.seed,"main"))()*2*_t,Gt=(nt.speed*H+lt)%(2*_t),oe=Gt<_t?Gt:2*_t-Gt,le=as(oe/Z,K);return le?(A._main={x:le.x,y:le.y,ang:le.angle},A._main):null}const O=document.createElement("canvas").getContext("2d"),W=new Map;function B(A){if(W.has(A))return W.get(A);O.fillStyle="#000",O.fillStyle=A;const H=O.fillStyle,nt=H.startsWith("#")?[1,3,5].map(K=>parseInt(H.slice(K,K+2),16)):H.match(/[\d.]+/g).slice(0,3).map(Number);return W.set(A,nt),nt}function j(A,H,nt){const K=I(H,nt);if(!K)return;const Z=t.bead.main;if(Z.glow?.on&&Z.fill){const[_t,lt,Gt]=B(Z.fill),oe=Math.min(Math.max(Z.glow.core,0),.99),le=A.createRadialGradient(K.x,K.y,0,K.x,K.y,Z.radius);le.addColorStop(0,`rgba(${_t},${lt},${Gt},1)`),le.addColorStop(oe,`rgba(${_t},${lt},${Gt},1)`);const he=8;for(let Te=1;Te<=he;Te++){const Ae=Te/he,nn=Math.pow(1-Ae,Z.glow.falloff);le.addColorStop(oe+(1-oe)*Ae,`rgba(${_t},${lt},${Gt},${nn.toFixed(4)})`)}A.beginPath(),A.arc(K.x,K.y,Z.radius,0,Math.PI*2),A.fillStyle=le,A.fill();return}A.beginPath(),A.arc(K.x,K.y,Z.radius,0,Math.PI*2),Z.fill&&(A.fillStyle=Z.fill,A.fill()),Z.stroke&&(A.strokeStyle=Z.stroke,A.lineWidth=Z.lineWidth,A.stroke())}function V(A){const H=(A>>>0)%9973,nt=(K,Z)=>{const _t=Math.sin(K*127.1+Z*311.7+H*74.7)*43758.5453;return _t-Math.floor(_t)};return(K,Z)=>{const _t=Math.floor(K),lt=Math.floor(Z),Gt=K-_t,oe=Z-lt,le=Gt*Gt*(3-2*Gt),he=oe*oe*(3-2*oe),Te=nt(_t,lt)+(nt(_t+1,lt)-nt(_t,lt))*le,Ae=nt(_t,lt+1)+(nt(_t+1,lt+1)-nt(_t,lt+1))*le;return Te+(Ae-Te)*he}}const it=A=>A-Math.PI*Math.round(A/Math.PI);function st(A,H,nt){if(!t.orb.on||!H.orbs.length)return;const K=t.orb,Z=K.flow,_t=I(H,nt);for(const lt of H.orbs){lt._nz||(lt._nz=V(lt.seed));const Gt=lt._nz,oe=_t?Math.hypot(lt.x-_t.x,lt.y-_t.y):0,le=_t?Z.follow*(Z.falloff>0?Math.exp(-oe/Z.falloff):1):0,he=_t?_t.x*Z.drift:0,Te=_t?_t.y*Z.drift:0;A.save(),A.translate(lt.x,lt.y),A.beginPath(),A.arc(0,0,lt.r,0,Math.PI*2),A.fillStyle=K.fill,A.fill(),A.clip(),A.beginPath();const Ae=lt.r,nn=Z.dash*.5,pr=Ae+nn;let mr=0;for(let gn=-Ae;gn<=Ae;gn+=Z.cell,mr++){const fs=-Ae+(mr%2?Z.cell*.5:0);for(let vn=fs;vn<=Ae;vn+=Z.cell){if(vn*vn+gn*gn>pr*pr)continue;const T=Gt((vn-he)*Z.scale+17.3,(gn-Te)*Z.scale-5.1)*Math.PI*2*Z.turns,N=_t?T+le*it(_t.ang-T):T,X=Math.cos(N)*nn,q=Math.sin(N)*nn;A.moveTo(vn-X,gn-q),A.lineTo(vn+X,gn+q)}}A.strokeStyle=Z.style,A.lineWidth=Z.width,A.lineCap="butt",A.stroke(),A.restore(),K.ring&&(A.beginPath(),A.arc(lt.x,lt.y,lt.r,0,Math.PI*2),A.strokeStyle=K.ring,A.lineWidth=K.ringWidth,A.stroke())}}function xt(A,H,nt){const K=t.bead,Z=H.spineInk??H.spine;if(!Z||Z.length<2)return;const _t=t.spacing,lt=(Z.length-1)*_t,Gt=ri(un(H.seed,"bead")),oe=K.speed*nt%Math.max(lt,1);let le=It(Gt,K.gap);for(A.fillStyle=K.fill,K.stroke&&(A.strokeStyle=K.stroke,A.lineWidth=K.lineWidth);le<lt;){const he=It(Gt,K.radius),Te=(le+oe)%lt,Ae=Math.min(1,Te/(he*4),(lt-Te)/(he*4)),nn=as(Te/_t,Z);nn&&Ae>.05&&(A.beginPath(),A.arc(nn.x,nn.y,he*Ae,0,Math.PI*2),K.fill&&A.fill(),K.stroke&&A.stroke()),le+=It(Gt,K.gap)}}const It=(A,[H,nt])=>H+A()*(nt-H),Rt=[];let $=1,J=null,gt=!1;const ut=performance.now(),wt=()=>(performance.now()-ut)/1e3/Dg;function jt(A){const H=[],nt=(Z,_t)=>{for(let lt=1;lt<Z.length;lt++)H.push({ax:Z[lt-1].x,ay:Z[lt-1].y,bx:Z[lt].x,by:Z[lt].y,c:_t})},K=b(A);if(t.goo.companion)for(const Z of A.compPolys)nt(Z,!0);return t.goo.spine&&K&&nt(K,!1),!H.length&&K&&nt(K,!1),H}function Ut(A){t.outline.on&&!A.outline&&(A.outline=Pg(jt(A),{...t.outline,compCap:t.goo.compCap}))}const ne=[];function ce(A,H){const nt=lt=>Math.hypot(lt.x-H.x,lt.y-H.y),K=A.length>3&&Math.hypot(A[0].x-A.at(-1).x,A[0].y-A.at(-1).y)<=t.outline.cell;let Z;if(K){const lt=A.slice(0,-1);let Gt=0;for(let oe=1;oe<lt.length;oe++)nt(lt[oe])<nt(lt[Gt])&&(Gt=oe);Z=lt.slice(Gt).concat(lt.slice(0,Gt)),Z.push(Z[0])}else Z=nt(A.at(-1))<nt(A[0])?A.slice().reverse():A;const _t=[0];for(let lt=1;lt<Z.length;lt++)_t.push(_t[lt-1]+Math.hypot(Z[lt].x-Z[lt-1].x,Z[lt].y-Z[lt-1].y));return{pts:Z,cum:_t,total:_t.at(-1)}}function Vt(A){const H=A.spine?.[0]??A.raw[0];ne.push({polys:A.outline.map(nt=>ce(nt,H)),drawn:0})}function U(A,H,nt){if(nt<=0||H.pts.length<2)return;if(nt>=H.total)return x(A,H.pts,t.outline.style,t.outline.width,t.outline.dash);let K=1;for(;K<H.pts.length&&H.cum[K]<nt;)K++;const Z=H.pts[K-1],_t=H.pts[K],lt=(nt-H.cum[K-1])/Math.max(H.cum[K]-H.cum[K-1],1e-6),Gt=H.pts.slice(0,K);Gt.push({x:Z.x+(_t.x-Z.x)*lt,y:Z.y+(_t.y-Z.y)*lt}),x(A,Gt,t.outline.style,t.outline.width,t.outline.dash)}function Le(A){for(const H of A.polys)x(g,H.pts,t.outline.style,t.outline.width,t.outline.dash)}function Yt(A){for(let H=ne.length-1;H>=0;H--){const nt=ne[H];if(nt.drawn+=t.outline.anim.speed*A,nt.polys.every(K=>nt.drawn>=K.total))Le(nt),ne.splice(H,1);else for(const K of nt.polys)U(m,K,nt.drawn)}}function Wt(){for(const A of ne)Le(A);ne.length=0}function At(A){Ut(A);const H=t.outline.anim?.on&&A.outline?.length>0;w(g,A,!H),H&&Vt(A);const nt=[];L(A,nt),u.stamp("baked",new Float32Array(nt),nt.length/Qr)}function ie(){P.length=0,M=null,J=null,gt=!1,u.clear("live")}function Tt(){ne.length=0,g.clearRect(0,0,y,E);for(const H of Rt)H.outline=null;u.clear("baked"),u.clear("live"),h.clear();const A=[];for(const H of Rt)Ut(H),w(g,H),L(H,A);u.stamp("baked",new Float32Array(A),A.length/Qr)}const P=[];let M=null;function G(A){const H=[0];for(let nt=1;nt<A.length;nt++)H.push(H[nt-1]+Math.hypot(A[nt].x-A[nt-1].x,A[nt].y-A[nt-1].y));return H}function tt(A,H,{hold:nt=!1,plan:K=null}={}){!A||A.length<2||P.push({pts:A,cum:G(A),seed:H,hold:nt,plan:K})}function rt(A){if(!M||!A?.length)return!1;const H=M;let nt=H.pts.length?H.pts[H.pts.length-1]:null;for(const K of A){const Z=nt?Math.hypot(K.x-nt.x,K.y-nt.y):0;H.pts.push(K),H.cum.push((H.cum.length?H.cum[H.cum.length-1]:0)+Z),nt=K}return!0}function Q(){const A=P.shift();return A?(J=Gr(t,$++,wt(),A.seed,A.plan),M={pts:A.pts,cum:A.cum,i:0,walked:0,hold:!!A.hold,plan:A.plan},!0):!1}function bt(){if(!J)return;const A=J;J=null,M=null,Ai(A,t),u.clear("live"),A.spine&&(A.compPolys.length||A.decor.length)&&(Rt.push(A),At(A))}function ht(){if(!M&&!Q())return;const A=M,H=A.cum[A.cum.length-1];for(A.walked=Math.min(A.walked+t.growPx,H);A.i<A.pts.length&&A.cum[A.i]<=A.walked;)bi(J,t,A.pts[A.i].x,A.pts[A.i].y),A.i++;A.i>=A.pts.length&&A.walked>=H&&!A.hold&&bt()}function vt(A,H,nt=void 0){if(!M||!J)return;const K=M;nt!==void 0&&(K.plan=nt),A=Math.max(0,Math.min(A,K.pts.length)),K.pts.length=A,K.cum.length=A;let Z=A?K.pts[A-1]:null;for(const he of H||[]){const Te=Z?Math.hypot(he.x-Z.x,he.y-Z.y):0;K.pts.push(he),K.cum.push((K.cum.length?K.cum[K.cum.length-1]:0)+Te),Z=he}const _t=K.pts.length,lt=Math.min(K.i,_t),{id:Gt,birth:oe,seed:le}=J;J=Gr(t,Gt,oe,le,K.plan);for(let he=0;he<lt;he++)bi(J,t,K.pts[he].x,K.pts[he].y);Ai(J,t),K.i=lt,K.walked=_t?Math.min(K.walked,K.cum[_t-1]):0}function Ht(){if(!M)return;const A=M;for(A.hold=!1;A.i<A.pts.length;)bi(J,t,A.pts[A.i].x,A.pts[A.i].y),A.i++;bt()}async function at(){for(Ht();Q();)Ht();Wt()}function St(A,H,{step:nt=1/0,plan:K=null}={}){const Z=Gr(t,$++,wt(),H,K);for(let _t=0;_t<A.length;_t++)bi(Z,t,A[_t].x,A[_t].y),(_t+1)%nt===0&&Ai(Z,t);return Ai(Z,t),Z.spine&&(Z.compPolys.length||Z.decor.length)&&(Rt.push(Z),At(Z)),Z}const Lt=[],Ct=(A,H,nt,K)=>{A.addEventListener(H,nt,K),Lt.push([A,H,nt,K])},Mt=A=>{Ht(),gt=!0;const H=$++;J=Gr(t,H,wt(),un(t.seed,"mouse",H)),bi(J,t,A.clientX,A.clientY);try{a.setPointerCapture?.(A.pointerId)}catch{}A.preventDefault()},Xt=A=>{!gt||!J||bi(J,t,A.clientX,A.clientY)};function Bt(){if(!gt||!J)return;gt=!1;const A=J;J=null,Ai(A,t),u.clear("live"),A.spine&&(A.compPolys.length||A.decor.length)&&(Rt.push(A),At(A))}n.mouse&&(Ct(a,"pointerdown",Mt),Ct(window,"pointermove",Xt),Ct(window,"pointerup",Bt),Ct(window,"pointercancel",Bt));const se=A=>{const H=A.key.toLowerCase();H==="1"?t.shade=0:H==="2"?t.shade=1:H==="3"?t.shade=2:H==="4"?t.shade=3:H==="z"?(Rt.pop(),Tt()):H==="c"?(ie(),Rt.length=0,Tt(),d.reset()):H==="g"?(t.grow.on=!t.grow.on,t.grow.on||h.clear()):H==="p"?(t.part.on=!t.part.on,t.part.on&&d.reset()):H==="s"&&ft()};n.keys&&Ct(window,"keydown",se);function F(){const A=document.createElement("canvas");A.width=s.width,A.height=s.height;const H=A.getContext("2d");return H.drawImage(o,0,0),H.drawImage(s,0,0),H.drawImage(a,0,0),A}function ft(){F().toBlob(A=>{const H=document.createElement("a");H.href=URL.createObjectURL(A),H.download=`trail_${Date.now()}.png`,H.click(),URL.revokeObjectURL(H.href)})}const Y=[],et=(()=>{const[A,H,nt]=t.light,K=Math.hypot(A,H,nt)||1;return[A/K,H/K,nt/K]})();let pt=performance.now();function dt(A){requestAnimationFrame(dt);const H=Math.min((A-pt)/1e3,1/20);pt=A;const nt=(A-ut)/1e3;gt||ht(),J&&(Ai(J,t),Y.length=0,L(J,Y),u.clear("live"),u.stamp("live",new Float32Array(Y),Y.length/Qr));const K=u.textures(),Z=u.texel(),_t={bakedTex:K.baked,liveTex:K.live,fieldTexel:Z,th:t.goo.th,compCap:t.goo.compCap,time:nt,dt:H};if(t.grow.on&&h.step({..._t,nowMin:wt(),decay:t.grow.decay,outward:t.grow.outward,curlAmp:t.grow.curlAmp,curlScale:t.grow.curlScale,curlSpeed:t.grow.curlSpeed,source:t.grow.source,bandLo:t.grow.bandLo,bandHi:t.grow.bandHi,ageDelay:t.grow.ageDelay}),u.composite({th:t.goo.th,compCap:t.goo.compCap,edge:t.goo.edge,paper:Vr(t.paper),ink:Vr(t.ink),shade:t.shade,light:et,normalZ:t.normalZ,amb:t.amb,diff:t.diff,spec:t.spec,specPow:t.specPow,fres:t.fres,bands:t.bands,growthTex:h.texture(),growInk:Vr(t.grow.ink),growGain:t.grow.on?t.grow.gain:0,growOpacity:t.grow.opacity},s.width,s.height),t.part.on&&(d.step({..._t,spawnTol:t.part.spawnTol,spawnRate:t.part.spawnRate,lifespan:t.part.lifespan,lifeVar:t.part.lifeVar,curlAmp:t.part.curlAmp,curlScale:t.part.curlScale,curlSpeed:t.part.curlSpeed,flow:t.part.flow,repel:t.part.repel}),d.draw({size:t.part.size,ink:Vr(t.part.ink),opacity:t.part.opacity},s.width,s.height,v)),D++,t.orb.on||Ot){p.clearRect(0,0,y,E);for(const lt of Rt)st(p,lt,nt);J&&st(p,J,nt),Ot=t.orb.on}if(m.clearRect(0,0,y,E),m.drawImage(_,0,0,y,E),J&&w(m,J),Yt(H),t.bead.on){for(const lt of Rt)xt(m,lt,nt);J&&xt(m,J,nt)}if(t.bead.main?.on){for(const lt of Rt)j(m,lt,nt);J&&j(m,J,nt)}}let Ot=!0;Ct(window,"resize",C),C();let ue=requestAnimationFrame(dt);function ye(){cancelAnimationFrame(ue),ue=0;for(const[A,H,nt,K]of Lt)A.removeEventListener(H,nt,K);Lt.length=0,ie(),Rt.length=0,a.remove(),o.remove(),r&&s.remove(),n.bodyBg!==!1&&(document.body.style.background=l),n.global&&window.TRAIL===$t&&delete window.TRAIL}const $t={CFG:t,strokes:Rt,dispose:ye,canvases:{gl:s,overlay:a,ink2d:_,underlay:o},captureCanvas:()=>F(),replay:Tt,rebuild:C,clear:()=>(ie(),Rt.length=0,Tt(),d.reset()),save:ft,probe:(A,H)=>u.probe(A,H),pstats:()=>d.stats(),hashSeed:un,addStroke:St,queueStroke:tt,extendGrowing:rt,replaceTail:vt,finishGrowing:Ht,flushQueue:at,pending:()=>({queued:P.length,growing:M?M.i:null,points:M?M.pts.length:0,hold:M?!!M.hold:!1}),step:(A=1)=>{for(let H=0;H<A;H++)ht()}};return n.global&&(window.TRAIL=$t),$t}const bl=250,Fg=900,Al=580,Ng=2600,wl=n=>n<0?0:n>1?1:n;function Og(n,t){if(!t)return null;const e=n[t+"_jong"];return e?e.pos?e:e.cluster_front?n[e.cluster_front+"_jong"]??null:null:null}const Rl=2.2,Bg=5,Cl=[1.25,2.1],Pl=[2.5,5],Ll=[.1,.35],zg=3.5,kg=420,qs=(n,t,e)=>n+(t-n)*e,wi=(n,t,e)=>Math.exp(-(((n-t)/e)**2));function Hg(n,t){const e=n[t.cho]?.cho,i=n[t.jung];if(!e?.pos||!i?.pos)return null;const[r,s,o]=e.pos,[a,l]=i.pos,c=wl((a-bl)/(Fg-bl)),f=wl((l-Al)/(Ng-Al)),u=i.yang?1:-1,h=i.diphthong?1:0,d=Og(n,t.jong),_=d?.pos?.[1]??.5,g=d?.pos?.[2]??.33,m=Rl+c*(Bg-Rl),p=qs(Cl[0],Cl[1],o),y=qs(Pl[0],Pl[1],f),E=qs(Ll[0],Ll[1],c),v=kg,C=m/v,R=E*Math.PI*2/m,b=p*2*Math.PI*y/m,L=new Float64Array(v);for(let w=0;w<v;w++){const D=w/(v-1),I=wi(D,.34,.045)-wi(D,.68,.045),O=Math.sin(D*Math.PI*2*11)*.8,W=1,B=Math.sin(D*Math.PI*2*2.2);L[w]=wi(s,0,.3)*I+wi(s,.5,.22)*O+wi(s,.78,.26)*W+wi(s,1,.22)*B}let x=0;for(let w=0;w<v;w++)x+=Math.abs(L[w]);const S=x>1e-9?zg/(x*C):0;return{N:v,ds:C,theta0:-Math.PI*.15+(r-.5)*Math.PI*.7,k(w){const D=w/(v-1),I=h&&D>.5?Math.PI:0,O=b*Math.cos(2*Math.PI*y*D+I);let W=(R+O)*u+L[w]*S;if(d&&D>.85){const B=(D-.85)/.15;W+=(_>=.5?1:-1)*(6+g*18)*Math.sin(B*Math.PI)}return W},step(w){return C*(1+o*.35*Math.sin(w*2.399))}}}function Gg(n,t){let e=0,i=0;const r=[{x:e,y:i}];for(let s=0;s<n.N;s++){t+=n.k(s)*n.ds;const o=n.step(s);e+=Math.cos(t)*o,i+=Math.sin(t)*o,r.push({x:e,y:i})}return{pts:r,theta:t}}function Vg(n,t,e=null){const i=[];let r=null;for(let s=0;s<n.length;s++){const o=n[s];(!r||Math.hypot(o.x-r.x,o.y-r.y)>=t)&&(i.push(o),e?.push(s),r=o)}return i}const Wg=.35,Xg=1,Dl=n=>Math.atan2(Math.sin(n),Math.cos(n));function qg(n,t,e,i,r,s=5,o=null){let a=null,l=0,c=0;const f=[{x:0,y:0}],u=[];for(const _ of t){const g=Hg(n,_);if(!g)continue;u.push({walkIdx:f.length-1,syl:_}),a=a===null?g.theta0:a+Dl(g.theta0-a)*Wg;const{pts:m,theta:p}=Gg(g,a);a=p;const y=m[m.length-1],E=Math.hypot(y.x,y.y);if(E<1e-6)continue;const v=Math.atan2(y.y,y.x),C=-Dl(v)*Xg,R=Math.cos(C),b=Math.sin(C),L=1/E;for(let S=1;S<m.length;S++){const w=m[S].x*L,D=m[S].y*L;f.push({x:l+(w*R-D*b),y:c+(w*b+D*R)})}const x=f[f.length-1];l=x.x,c=x.y,a+=C}if(f.length<2)return o&&(o.starts=[]),[];const h=[],d=Vg(f.map(_=>({x:e+_.x*r,y:i+_.y*r})),s,h);if(o){const _=[0];for(let m=1;m<d.length;m++)_.push(_[m-1]+Math.hypot(d[m].x-d[m-1].x,d[m].y-d[m-1].y));let g=0;o.starts=u.map(({walkIdx:m,syl:p})=>{for(;g<h.length-1&&h[g]<m;)g++;return{px0:_[g],syl:p}})}return d}const Yg="turtle",Il=2,Ul=110,Fl=100,jg=1.8,Nl={spacing:4,spineSmooth:-8,wanderAmp:[1,100],wanderLen:[120,240],weaveAmp:[6,14],weaveLen:[80,500],eventGap:[55,60],swirlSpan:[18,26],swirlRadius:[6,24],compBaseSmooth:28,compStep:2.5,compSmooth:2,headLag:5,decorGap:[5,70],decorSpread:12,decorRadius:[2,5],decorLineWidth:.75,growPx:14,goo:{reach:[3,10],reachLen:140,th:1.8,edge:.004,spine:!0,companion:!0,fieldScale:1.5,compCap:0},grow:{on:!1},part:{on:!1},outline:{anim:{on:!0,speed:850}},spineFx:{target:"ink",roughen:{on:!0,size:6,gap:6,mode:"smooth"},puckerBloat:{on:!0,amount:12,gap:2}},bead:{on:!0,gap:[40,90],radius:[1.5,3.5],speed:30,fill:"rgb(0, 0, 0)",stroke:null,main:{on:!0,radius:18,speed:40,fill:"rgb(130, 255, 130)",stroke:null,glow:{on:!0,core:.45,falloff:1.4}}},orb:{on:!0,gap:[90,200],prob:.7,radius:[6,22],spread:26,fill:"#ffe83d",flow:{cell:8.6,dash:8.2,scale:.05,turns:1,follow:.85,falloff:220,drift:.6,style:"rgba(60, 45, 0, 0.7)",width:.75}}};class $g{constructor(t={}){this._opts=t,this._trail=null,this._canvas=null,this._ownCanvas=!1,this._JAMO=null,this._groups=[],this._holdingIdx=-1,this._sampleStep=Math.max(Nl.spacing+1,5),this._generator=Yg,this.sylSize=Ul,this.wrapStep=Fl,this.wrapMargin=Ul*.6,this.lineHeightRatio=jg}async init(t){t?this._canvas=t:(this._canvas=document.createElement("canvas"),this._ownCanvas=!0,document.body.appendChild(this._canvas)),this._trail=Ug({canvas:this._canvas,mouse:!1,keys:!1,global:!1,cfg:Nl,bodyBg:!this._opts.transparentOutput,paperBg:!this._opts.transparentOutput})}update(t,e,i){if(i&&(this._JAMO=i),!this._JAMO||!this._trail)return;if(!t?.length){this.clearAccum();return}const r=window.innerWidth,s=window.innerHeight,o=[];for(let m=0;m<t.length;m++){const p=t[m],y=e?.[m]??[.5,.5],E=o[o.length-1];E&&E.wordId===p.wordId&&Math.abs(E.anchor[1]-y[1])<1e-4?(E.syls.push(p),E.keys.push(`${p.cho}${p.jung}${p.jong??""}`)):o.push({wordId:p.wordId,anchor:[y[0],y[1]],syls:[p],keys:[`${p.cho}${p.jung}${p.jong??""}`]})}const a=m=>`${m.wordId}@${m.anchor[0].toFixed(5)},${m.anchor[1].toFixed(5)}`,l=(m,p=m.syls,y=null)=>qg(this._JAMO,p,m.anchor[0]*r,m.anchor[1]*s,Fl,this._sampleStep,y),c=m=>this._trail.hashSeed("syl",m.cho,m.jung,m.jong??""),f=(m,p=m.syls)=>{const y={};return{pts:l(m,p,y),plan:y.starts.map(v=>({px0:v.px0,seed:c(v.syl)}))}},u=m=>this._trail.hashSeed("word",...m.keys),h=this._groups;let d=0;for(;d<h.length&&d<o.length&&h[d].sig===a(o[d])+"|"+o[d].keys.join("");)d++;if(d===h.length-1&&d===o.length-1&&this._holdingIdx===d){const m=h[d],p=o[d],y=Math.max(0,p.keys.length-Il),E=p.keys.slice(0,y);if(m.anchorKey===a(p)&&E.length<=m.keys.length&&m.keys.slice(0,E.length).join("\0")===E.join("\0")){const C=y>0?l(p,p.syls.slice(0,y)):[],{pts:R,plan:b}=f(p);this._trail.replaceTail(C.length,R.slice(C.length),b),m.keys=p.keys.slice(),m.stableKeys=E,m.sig=a(p)+"|"+p.keys.join(""),m.pointCount=R.length;return}}if(d===h.length&&d===o.length)return;const _=d<h.length;_&&(this._trail.clear(),this._groups=[]);const g=_?0:d;this._holdingIdx=-1;for(let m=g;m<o.length;m++){const p=o[m],{pts:y,plan:E}=f(p);if(y.length<2)continue;const v=m===o.length-1;_&&!v?this._trail.addStroke(y,u(p),{plan:E}):this._trail.queueStroke(y,u(p),{hold:v,plan:E}),v&&(this._holdingIdx=m),this._groups.push({sig:a(p)+"|"+p.keys.join(""),anchorKey:a(p),keys:p.keys.slice(),stableKeys:p.keys.slice(0,Math.max(0,p.keys.length-Il)),pointCount:y.length})}}finishGrowing(){this._trail?.finishGrowing()}async flushQueue(){this._trail&&(await this._trail.flushQueue(),await new Promise(t=>requestAnimationFrame(()=>requestAnimationFrame(t))))}captureFrame(){return this._trail?this._trail.captureCanvas().toDataURL("image/png"):null}clearAccum(){this._trail?.clear(),this._groups=[],this._holdingIdx=-1}dispose(){this._trail?.dispose(),this._trail=null,this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._canvas=null}setGenerator(t){this._generator=t==="anchor"?"anchor":"turtle",this._trail?.clear(),this._groups=[],this._holdingIdx=-1}cfg(){return this._trail?.CFG}engine(){return this._trail}}const Kg=!0,Zg=`
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
`,Ri=`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`,Ic=`
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

${Zg}

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
`,Jg=`
#ifdef GL_ES
precision highp float;
#endif

${Ic}

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
`,Qg=`
#ifdef GL_ES
precision highp float;
#endif

${Ic}

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
`,tv=`
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
`,ev=1600,Uc=`
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
`,nv=`
#ifdef GL_ES
precision highp float;
#endif
${Uc}
void main() {
    gl_FragColor = compose(gl_FragCoord.xy / u_resolution);
}
`,iv=n=>`
#ifdef GL_ES
precision highp float;
#endif
${Uc}
void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution;
    vec4 acc = compose(uv);

    ${n?"gl_FragColor = vec4(acc.rgb, acc.a);":"gl_FragColor = vec4(mix(vec3(0.7), acc.rgb, acc.a), 1.0);// #bg color"}
}
`,rv=`
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_src;
uniform vec2      u_resolution;
uniform float     u_shift;

void main() {
    vec2 uv = (gl_FragCoord.xy + vec2(u_shift, 0.0)) / u_resolution;
    gl_FragColor = uv.x < 1.0 ? texture2D(u_src, uv) : vec4(0.0);
}
`,sv=.12;class ov{constructor(t={}){this.emitsSyllableStart=!0,this._transparent=!!t.transparentOutput,this._renderer=null,this._clock=null,this._raf=null,this._lastTime=0,this._FRAME_INTERVAL=1e3/24,this._camPos=new k(.3,.5,7),this._camTarget=new k(0,0,0),this._growTarget=null,this._accumTarget=null,this._prevTarget=null,this._growScene=null,this._accumScene=null,this._dispScene=null,this._growUniforms=null,this._accumUniforms=null,this._dispUniforms=null,this._quadCam=null,this._queue=[],this._growing=!1,this._instantBake=!1,this._growStart=0,this._isFirstGlyph=!0,this._prevSylCount=0,this._forceComplete=!1,this._forceFinish=!1,this._hubs=new Map,this._curScale=1,this._sylHubIds=[],this._bakedCenters=[],this.lineHeightRatio=2.3,this.sylSize=100,this.wrapStep=165,this.wrapMargin=0,this.glyphExtent=1.5,this.refHeight=859,this.layoutScale={x:1.28,y:1},this.displayScale=1.2,this._scrollTarget=0,this._scrollPos=0,this._scrollBase=0,this._scrollJump=!0,this._rect=null,this._ghostStart=null,this._d3Displace=Kg}async init(t){const e=window.innerWidth,i=window.innerHeight,r=Math.min(window.devicePixelRatio,2);this._renderer=new U_({antialias:!0,canvas:t??void 0,alpha:this._transparent,premultipliedAlpha:!this._transparent}),this._renderer.setSize(e,i),this._transparent&&this._renderer.setClearColor(0,0),this._renderer.setPixelRatio(r),this._ownCanvas=!t,t||(this._renderer.domElement.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._renderer.domElement)),this._clock=new Kh,this._quadCam=new hc(-1,1,1,-1,0,1);const s={minFilter:en,magFilter:en,format:Ye,type:_n},o=e*r,a=i*r;this._growTarget=new Xe(o,a,s),this._accumTarget=new Xe(o,a,s),this._prevTarget=new Xe(o,a,s),this._pathTarget=new Xe(151,3,{minFilter:je,magFilter:je,format:Ye,type:fn,depthBuffer:!1});const{ro:l,camMat:c,fov:f}=this._calcCamera();this._growUniforms={u_resolution:{value:new Zt(o,a)},u_time:{value:0},u_ro:{value:l},u_camMat:{value:c},u_fov:{value:f},u_start:{value:new k},u_center:{value:new k},u_cho:{value:new k},u_end:{value:new k},u_jung:{value:new k},u_hubCenters:{value:[new k,new k]},u_connCount:{value:0},u_amp:{value:0},u_yangseong:{value:0},u_diphthong:{value:0},u_growT:{value:0},u_d3Displace:{value:this._d3Displace?1:0},u_glyphScale:{value:1},u_pathTex:{value:this._pathTarget.texture},u_usePathTex:{value:1}},this._growScene=this._makeQuadScene(Ri,Qg,this._growUniforms);const{u_pathTex:u,...h}=this._growUniforms;this._pathScene=this._makeQuadScene(Ri,Jg,h),this._accumUniforms={u_growTex:{value:this._growTarget.texture},u_bckbuffer:{value:this._prevTarget.texture},u_resolution:{value:new Zt(o,a)},u_isFirst:{value:1}},this._accumScene=this._makeQuadScene(Ri,tv,this._accumUniforms),this._ghostTarget=new Xe(o,a,s),this._ghostTarget2=new Xe(o,a,s),this._dispUniforms={u_accumTex:{value:this._accumTarget.texture},u_ghostTex:{value:this._ghostTarget.texture},u_ghostT:{value:1},u_resolution:{value:new Zt(o,a)}},this._dispScene=this._makeQuadScene(Ri,iv(this._transparent),this._dispUniforms),this._ghostUniforms={u_accumTex:{value:null},u_ghostTex:{value:null},u_ghostT:{value:1},u_resolution:{value:new Zt(o,a)}},this._ghostScene=this._makeQuadScene(Ri,nv,this._ghostUniforms),this._shiftUniforms={u_src:{value:null},u_resolution:{value:new Zt(o,a)},u_shift:{value:0}},this._shiftScene=this._makeQuadScene(Ri,rv,this._shiftUniforms),window.addEventListener("resize",this._onResize),this._raf=requestAnimationFrame(this._animate)}forceRebake(t,e){if(!t||e===0)return;const{starts:i,centers:r,chos:s,ends:o,jungs:a,amps:l,yangseong:c,diphthong:f}=t;this._curScale=t.scale??1,this._queue=[],this._growing=!1,this._isFirstGlyph=!0;for(let u=0;u<e;u++)this._queue.push(this._makeItem(i[u],r[u],s[u],o[u],a[u],l[u],c[u],f[u],!0));this._prevSylCount=e,this._dequeue()}update(t,e=0,i=null){if(!t)return;const{starts:r,centers:s,chos:o,ends:a,jungs:l,amps:c,yangseong:f,diphthong:u,confirmed:h}=t,d=this._prevSylCount;if(this._curScale=t.scale??1,e>=d&&this._bakedCenters.some((g,m)=>m<d&&g.distanceToSquared(s[m])>1e-8)&&this._rebake(t,d),this._bakedCenters=s.slice(0,e).map(g=>g.clone()),e<d){this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._hubs=new Map,this._sylHubIds=[];for(let g=0;g<e;g++)this._queue.push(this._makeItem(r[g],s[g],o[g],a[g],l[g],c[g],f[g],u[g],!0))}else{for(let g=d;g<e;g++){g>0&&this._maybeRegisterHub(g-1,t);let m=[];if(i&&i[g]){const v=o[g].z>=.65,C=i[g-1],R=i[g],b=g>0&&!!C?.jong&&R.cho==="ㅇ",L=!!R.jong,x=[v,b,L].filter(Boolean).length,S=x>=2?2:x>=1?1:0;if(S>0){const w=this._pickHubTargets(S);m=w.map(D=>D.center),this._sylHubIds[g]=w.map(D=>D.id)}}const p=h?h[g]:!1,y=this._makeItem(r[g],s[g],o[g],a[g],l[g],c[g],f[g],u[g],p,m,m.length);y.syl=i?.[g]??null,this._queue.push(y)}e>d&&d>0&&this._growing&&(this._growUniforms.u_end.value.copy(a[d-1]),this._forceComplete=!0)}this._prevSylCount=e,this._growing||this._dequeue()}_maybeRegisterHub(t,e){const i=e.chos[t];if(i.y>=.75)return;const r=e.amps[t],s=new k((i.x-.5)*2,(i.y-.5)*2,(i.z-.5)*2).multiplyScalar(r*.6*(e.scale??1)),o=e.centers[t].clone().add(s);this._hubs.set(t,{id:t,center:o,connections:0})}_rebake(t,e){const{starts:i,centers:r,chos:s,ends:o,jungs:a,amps:l,yangseong:c,diphthong:f}=t;for(const[u,h]of this._hubs){const d=s[u],_=new k((d.x-.5)*2,(d.y-.5)*2,(d.z-.5)*2).multiplyScalar(l[u]*.6*(t.scale??1));h.center=r[u].clone().add(_)}this._queue=[],this._growing=!1,this._forceComplete=!1,this._isFirstGlyph=!0;for(let u=0;u<e;u++){const h=(this._sylHubIds[u]??[]).map(d=>this._hubs.get(d)?.center).filter(Boolean);this._queue.push(this._makeItem(i[u],r[u],s[u],o[u],a[u],l[u],c[u],f[u],!0,h,h.length))}}_pickHubTargets(t){const e=[],i=new Set;for(let r=0;r<t;r++){const s=[...this._hubs.entries()].filter(([h])=>!i.has(h));if(s.length===0)break;const o=s.map(([,h])=>h.connections+1),a=o.reduce((h,d)=>h+d,0);let l=Math.random()*a,c=s[s.length-1];for(let h=0;h<s.length;h++)if(l-=o[h],l<=0){c=s[h];break}const[f,u]=c;u.connections++,i.add(f),e.push(u)}return e}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._growTarget?.dispose(),this._accumTarget?.dispose(),this._prevTarget?.dispose(),this._pathTarget?.dispose(),this._ghostTarget?.dispose(),this._ghostTarget2?.dispose(),this._renderer?.dispose();const t=this._renderer?.domElement;this._ownCanvas&&t?.parentNode&&t.parentNode.removeChild(t)}screenToWorld(t,e){const i=window.innerWidth,r=window.innerHeight,{ro:s,camMat:o,fov:a}=this._calcCamera(),l=new k((t*2-1)*(i/r),1-e*2,-a).applyMatrix3(o).normalize();return s.clone().addScaledVector(l,-s.z/l.z)}_toScreen(t){const e=window.innerWidth,i=window.innerHeight,{ro:r,camMat:s,fov:o}=this._calcCamera(),a=t.clone().sub(r).applyMatrix3(s.clone().transpose()),l=-a.z/o;return{u:(a.x/l/(e/i)+1)/2,v:(1-a.y/l)/2,t:l}}_shiftAtDepth(t,e){const{camMat:i}=this._calcCamera(),{t:r}=this._toScreen(t),s=window.innerWidth,o=window.innerHeight;return t.clone().add(new k(-2*e*(s/o)*r,0,0).applyMatrix3(i))}scrollTo(t){const e=Math.max(0,t)*this._renderer.getPixelRatio();if(this._scrollTarget=e,this._scrollJump||e<this._scrollPos){this._scrollJump=!1,this._scrollPos=e,this._scrollBase=Math.round(e);return}const i=window.innerWidth,r=this._rect?i-(this._rect.x+this._rect.w):i*.1,s=Math.max(1,r*.8*this._renderer.getPixelRatio()),o=Math.round(e-s)-this._scrollBase;o>0&&(this._shiftAccum(o),this._scrollPos=Math.max(this._scrollPos,this._scrollBase))}disperse(){const t=this._renderer,e=this._ghostUniforms;e.u_accumTex.value=this._accumTarget.texture,e.u_ghostTex.value=this._ghostTarget.texture,e.u_ghostT.value=this._dispUniforms.u_ghostT.value,t.setRenderTarget(this._ghostTarget2),t.render(this._ghostScene,this._quadCam),t.setRenderTarget(null),[this._ghostTarget,this._ghostTarget2]=[this._ghostTarget2,this._ghostTarget],this._dispUniforms.u_ghostTex.value=this._ghostTarget.texture,this._dispUniforms.u_ghostT.value=0,this._ghostStart=performance.now()}get scrollBase(){return this._scrollBase/(this._renderer?.getPixelRatio()??1)}setRect(t){this._rect=t}setD3Displace(t){this._d3Displace=!!t,this._growUniforms&&(this._growUniforms.u_d3Displace.value=this._d3Displace?1:0)}isIdle(){return!this._growing&&this._queue.length===0}finishGrowing(){(this._growing||this._queue.length>0)&&(this._forceFinish=!0)}flushQueue(){const t=e=>requestAnimationFrame(()=>requestAnimationFrame(e));return this.finishGrowing(),!this._growing&&this._queue.length===0?new Promise(t):new Promise(e=>{const i=()=>{!this._growing&&this._queue.length===0?t(e):requestAnimationFrame(i)};requestAnimationFrame(i)})}captureFrame(){const t=this._accumTarget.width,e=this._accumTarget.height,i=new Uint8Array(t*e*4);this._renderer.readRenderTargetPixels(this._accumTarget,0,0,t,e,i);const r=document.createElement("canvas");r.width=t,r.height=e;const s=r.getContext("2d"),o=s.createImageData(t,e);for(let a=0;a<e;a++){const l=(e-1-a)*t*4,c=a*t*4;o.data.set(i.subarray(l,l+t*4),c)}return s.putImageData(o,0,0),r.toDataURL("image/png")}clearAccum(){this._queue=[],this._growing=!1,this._forceFinish=!1,this._isFirstGlyph=!0,this._prevSylCount=0,this._hubs=new Map,this._sylHubIds=[],this._bakedCenters=[],this._scrollTarget=this._scrollPos=this._scrollBase=0,this._scrollJump=!0;const t=this._renderer.getClearColor(new re),e=this._renderer.getClearAlpha();this._renderer.setClearColor(0,0),this._renderer.setRenderTarget(this._accumTarget),this._renderer.clear(),this._renderer.setRenderTarget(this._prevTarget),this._renderer.clear(),this._renderer.setRenderTarget(null),this._renderer.setClearColor(t,e)}_makeItem(t,e,i,r,s,o,a,l,c,f=[],u=0,h=this._curScale){return{scale:h,start:t.clone(),center:e.clone(),cho:i.clone(),end:r.clone(),jung:s.clone(),amp:o,yang:a,diph:l,instant:c,hubCenters:f.map(d=>d.clone()),connCount:u}}_bakePath(){const t=this._renderer.getRenderTarget();this._renderer.setRenderTarget(this._pathTarget),this._renderer.render(this._pathScene,this._quadCam),this._renderer.setRenderTarget(t)}_dequeue(){if(this._queue.length===0)return;const t=this._queue.shift(),e=this._growUniforms;e.u_start.value.copy(t.start),e.u_center.value.copy(t.center),e.u_cho.value.copy(t.cho),e.u_end.value.copy(t.end),e.u_jung.value.copy(t.jung),e.u_amp.value=t.amp,e.u_yangseong.value=t.yang,e.u_diphthong.value=t.diph,e.u_hubCenters.value[0].copy(t.hubCenters[0]??new k),e.u_hubCenters.value[1].copy(t.hubCenters[1]??new k),e.u_connCount.value=t.connCount??0,e.u_glyphScale.value=t.scale??1,this._bakePath(),e.u_growT.value=0,this._growStart=this._clock.getElapsedTime(),this._growing=!0,this._instantBake=t.instant,!t.instant&&t.syl&&this.onSyllableStart?.(t.syl)}_stepScroll(){if(this._scrollPos===this._scrollTarget)return;this._scrollPos+=(this._scrollTarget-this._scrollPos)*sv,Math.abs(this._scrollTarget-this._scrollPos)<.5&&(this._scrollPos=this._scrollTarget);const t=Math.round(this._scrollPos)-this._scrollBase;t>0&&this._shiftAccum(t)}_shiftAccum(t){const e=this._renderer,i=this._accumTarget,r=Math.floor(i.width),s=Math.floor(i.height);this._shiftUniforms.u_src.value=i.texture,this._shiftUniforms.u_resolution.value.set(r,s),this._shiftUniforms.u_shift.value=t,e.setRenderTarget(this._prevTarget),e.render(this._shiftScene,this._quadCam),e.setRenderTarget(null),this._accumTarget=this._prevTarget,this._prevTarget=i,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._scrollBase+=t;const o=t/(window.innerWidth*e.getPixelRatio()),a=c=>{const f=this._toScreen(c);return this.screenToWorld(f.u-o,f.v)},l=(c,f,u)=>{const h=a(f).sub(f);c.add(h),f.add(h);for(const d of u)d.copy(this._shiftAtDepth(d,o))};this._bakedCenters=this._bakedCenters.map(a);for(const c of this._hubs.values())c.center=this._shiftAtDepth(c.center,o);for(const c of this._queue)l(c.start,c.center,c.hubCenters);if(this._growing){const c=this._growUniforms;l(c.u_start.value,c.u_center.value,c.u_hubCenters.value.slice(0,c.u_connCount.value)),this._bakePath()}}_swapAndAccum(t){const e=this._prevTarget;this._prevTarget=this._accumTarget,this._accumTarget=e,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._accumUniforms.u_isFirst.value=t?1:0,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._renderer.setRenderTarget(this._accumTarget),this._renderer.render(this._accumScene,this._quadCam)}_animate=t=>{if(this._raf=requestAnimationFrame(this._animate),t-this._lastTime<this._FRAME_INTERVAL-4)return;if(this._lastTime=t,this._growUniforms.u_time.value=this._clock.getElapsedTime(),this._stepScroll(),this._ghostStart!==null){const i=(performance.now()-this._ghostStart)/ev;this._dispUniforms.u_ghostT.value=Math.min(1,i),i>=1&&(this._ghostStart=null)}if(!this._growing){this._renderer.setRenderTarget(null),this._renderer.render(this._dispScene,this._quadCam);return}let e;if(this._instantBake){e=1,this._growUniforms.u_growT.value=1,this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._growing=!1,requestAnimationFrame(()=>this._dequeue());return}else{const i=this._growUniforms.u_growT.value;e=this._forceComplete||this._forceFinish?1:i+(1-i)*.08,this._forceComplete=!1,this._growUniforms.u_growT.value=e>=.98?1:e}this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._renderer.setRenderTarget(null),this._renderer.render(this._dispScene,this._quadCam),e>=1&&(this._growing=!1,this._dequeue(),this._forceFinish&&this._queue.length===0&&!this._growing&&(this._forceFinish=!1))};_calcCamera(){const t=this._camPos.clone(),i=this._camTarget.clone().clone().sub(t).normalize(),r=new k(0,1,0),s=new k().crossVectors(i,r).normalize(),o=new k().crossVectors(s,i).normalize(),a=new zt().set(s.x,s.y,s.z,o.x,o.y,o.z,-i.x,-i.y,-i.z),l=1/Math.tan(ph.degToRad(45)/2);return{ro:t,camMat:a,fov:l}}_makeQuadScene(t,e,i){const r=new Wh;return r.add(new dn(new dr(2,2),new Pn({uniforms:i,vertexShader:t,fragmentShader:e}))),r}_onResize=()=>{const t=window.innerWidth,e=window.innerHeight,i=this._renderer.getPixelRatio(),r=t*i,s=e*i;this._renderer.setSize(t,e),this._growTarget.setSize(r,s),this._accumTarget.setSize(r,s),this._prevTarget.setSize(r,s),this._ghostTarget.setSize(r,s),this._ghostTarget2.setSize(r,s),this._dispUniforms.u_ghostT.value=1,this._ghostStart=null;const o=new Zt(r,s);this._growUniforms.u_resolution.value.copy(o),this._accumUniforms.u_resolution.value.copy(o),this._dispUniforms.u_resolution.value.copy(o),this._ghostUniforms.u_resolution.value.copy(o);const{ro:a,camMat:l,fov:c}=this._calcCamera();this._growUniforms.u_ro.value.copy(a),this._growUniforms.u_camMat.value.copy(l),this._growUniforms.u_fov.value=c,this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._scrollJump=!0}}const av={sora:Vc,signal:eg,dandelion:$g,mycelium:ov};class lv{constructor(t=null){this._canvas=t,this._current=null,this._name=null}async setReceiver(t,e={}){if(this._name===t)return;this._current&&(this._current.dispose(),this._current=null);const i=av[t];if(!i)throw new Error(`Unknown receiver: ${t}`);if(this._canvas?.parentNode){const r=document.createElement("canvas");r.id=this._canvas.id,r.className=this._canvas.className,r.style.cssText=this._canvas.style.cssText,this._canvas.parentNode.replaceChild(r,this._canvas),this._canvas=r}this._current=new i(e),this._name=t,this._current.onSyllableStart=r=>this.onSyllableStart?.(r,t),await this._current.init(this._canvas)}update(...t){this._current?.update(...t)}get name(){return this._name}get current(){return this._current}dispose(){this._current?.dispose(),this._current=null,this._name=null}}function cv({enabled:n=!0}={}){let t=null,e=null;function i(){if(t)return t;const l=window.AudioContext||window.webkitAudioContext;if(!l)return null;t=new l;const c=t.createDynamicsCompressor();return c.threshold.value=-18,c.ratio.value=4,e=t.createGain(),e.gain.value=.6,e.connect(c).connect(t.destination),t}function r(){if(!n)return;const l=i();l&&l.state!=="running"&&l.resume().catch(()=>{})}let s=null;function o(l,c=null){if(!n||!l)return;const f=i();!f||f.state!=="running"||(s={h:uv(f,e,l,f.currentTime),syl:c})}function a(l){!s||!l||(hv(s.h,l.ending),s.syl={...s.syl,jong:l.jong})}return{play:o,endLast:a,unlock:r,get lastSyl(){return s?.syl??null},get state(){return t?.state??"none"}}}function uv(n,t,e,i){const r=n.createGain(),s=i+e.length+.05;r.gain.setValueAtTime(e.gain,i),r.gain.setValueAtTime(e.gain,s-.1),r.gain.linearRampToValueAtTime(0,s),r.connect(t);const o=e.ending,a={c:n,out:r,v:e,t0:i,tStop:s,modes:[],srcs:[]},l=[...e.noise??[]];o?.hiss&&l.push({...o.hiss,at:o.at-o.hiss.dur});for(const c of l)Fc(n,r,c.center,c.q,i+c.at,c.dur,c.gain);for(const c of e.modes){const f=e.detune?[-e.detune/2,e.detune/2]:[0];for(const u of f){const h=n.createGain(),d=c.amp/f.length,_=i+e.attack;if(h.gain.setValueAtTime(0,i),h.gain.linearRampToValueAtTime(d,_),e.gate){const y=o?.type==="hum"?.3:o?.type==="choke"?.07:.12,E=i+Math.max(e.attack+.05,y);h.gain.setValueAtTime(d,E),h.gain.linearRampToValueAtTime(0,E+.01)}else h.gain.setTargetAtTime(0,_,c.tau),o?.type==="choke"&&h.gain.setTargetAtTime(0,i+o.at,o.tau),o?.type==="hum"&&h.gain.setTargetAtTime(0,i+o.at,c.tau*o.stretch);h.connect(r);const g=c.freq+u;let m,p;if(e.wave==="breath"){m=n.createBufferSource(),m.buffer=Nc(n),m.loop=!0;const y=n.createBiquadFilter();y.type="bandpass",y.Q.value=e.q,p=y.frequency,m.connect(y);const E=n.createGain();E.gain.value=Math.sqrt(e.q)*1.5,y.connect(E).connect(h)}else if(m=n.createOscillator(),m.type=e.wave==="square"?"square":"sine",p=m.frequency,e.wave==="square"){const y=n.createBiquadFilter();y.type="lowpass",y.frequency.value=Math.min(g*4,12e3),m.connect(y).connect(h)}else m.connect(h);p.setValueAtTime(e.glide?g*e.glide.from:g,i),e.glide&&p.linearRampToValueAtTime(g,i+e.glide.dur),o?.type==="bend"&&(p.setValueAtTime(g,i+o.at),p.linearRampToValueAtTime(g*o.ratio,i+o.at+o.dur)),m.start(i),m.stop(s),a.srcs.push(m),a.modes.push({env:h,tau:c.tau,fParam:p,freq:g})}}return a.timer=setTimeout(()=>r.disconnect(),(s-n.currentTime+.2)*1e3),a}function hv(n,t){const{c:e,v:i}=n,r=e.currentTime;if(!(!t||r>n.tStop-.05)){if(t.type==="choke"){let s=r;t.hiss&&(Fc(n.c,n.out,t.hiss.center,t.hiss.q,r,t.hiss.dur,t.hiss.gain),s=r+t.hiss.dur);for(const o of n.modes)Wr(o.env.gain,s),o.env.gain.setTargetAtTime(0,s,t.tau)}else if(t.type==="bend")for(const s of n.modes)Wr(s.fParam,r),s.fParam.linearRampToValueAtTime(s.freq*t.ratio,r+t.dur);else if(t.type==="hum"&&!i.gate){const s=Math.max(...n.modes.map(a=>a.tau)),o=Math.min(r+s*t.stretch*5,n.t0+4)+.05;for(const a of n.modes)Wr(a.env.gain,r),a.env.gain.setTargetAtTime(0,r,a.tau*t.stretch);if(o>n.tStop){Wr(n.out.gain,r),n.out.gain.setValueAtTime(i.gain,o-.1),n.out.gain.linearRampToValueAtTime(0,o);for(const a of n.srcs)a.stop(o);clearTimeout(n.timer),n.timer=setTimeout(()=>n.out.disconnect(),(o-r+.2)*1e3),n.tStop=o}}}}function Wr(n,t){n.cancelAndHoldAtTime?n.cancelAndHoldAtTime(t):(n.cancelScheduledValues(t),n.setValueAtTime(n.value,t))}function Fc(n,t,e,i,r,s,o){const a=n.createBufferSource();a.buffer=Nc(n);const l=n.createBiquadFilter();l.type="bandpass",l.frequency.value=e,l.Q.value=i;const c=n.createGain(),f=Math.min(.003,s/3);c.gain.setValueAtTime(0,r),c.gain.linearRampToValueAtTime(o,r+f),c.gain.setValueAtTime(o,r+s-f),c.gain.linearRampToValueAtTime(0,r+s),a.connect(l).connect(c).connect(t),a.start(r),a.stop(r+s+.01)}const Ol=new WeakMap;function Nc(n){let t=Ol.get(n);if(!t){t=n.createBuffer(1,n.sampleRate,n.sampleRate);const e=t.getChannelData(0);for(let i=0;i<e.length;i++)e[i]=Math.random()*2-1;Ol.set(n,t)}return t}function fv(){const n=document.createElement("div");Object.assign(n.style,{position:"fixed",top:"0",left:"0",width:"100vw",pointerEvents:"none",zIndex:"5",display:"flex",flexDirection:"column"}),document.body.appendChild(n);let t=0;return{addCapture(e,i){const r=document.createElement("img");return r.src=e,Object.assign(r.style,{position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh",display:"block",pointerEvents:"none",zIndex:String(6+t)}),n.appendChild(r),t+=i,t},get totalHeight(){return t}}}function dv(n,t,e){const i=document.createElement("div");Object.assign(i.style,{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:"10px",zIndex:"20",background:"rgba(0,0,0,0.15)",padding:"8px 14px",borderRadius:"10px",outline:"1px solid rgba(255,255,255,0.12)",backdropFilter:"blur(6px)"});for(const{id:r,label:s}of[{id:"sora",label:"🐚"},{id:"signal",label:"🚦"},{id:"dandelion",label:"🌼"},{id:"mycelium",label:"🍄"}]){const o=document.createElement("button");o.textContent=s,o.dataset.id=r,Object.assign(o.style,{padding:"4px 10px",fontSize:"16px",background:r===n.name?"#d0daff":"transparent",color:"#fff",border:"1px solid #777",borderRadius:"6px",cursor:"pointer",transition:"background 0.2s"}),o.addEventListener("click",async()=>{await n.setReceiver(r),t(e()),i.querySelectorAll("button[data-id]").forEach(a=>{a.style.background=a.dataset.id===n.name?"#d0daff":"transparent"})}),i.appendChild(o)}document.body.appendChild(i)}function pv(n,t){const e=document.createElement("div");Object.assign(e.style,{position:"fixed",bottom:"24px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"8px",zIndex:"20"});const i=document.createElement("input");i.type="text",i.placeholder="한글을 입력하세요",Object.assign(i.style,{width:"min(420px, 70vw)",fontSize:"17px",padding:"10px 14px",background:"rgba(255, 255, 255, 0.25)",color:"#000000",border:"1px solid #777",borderRadius:"8px",backdropFilter:"blur(6px)",outline:"none"});const r=document.createElement("button");r.textContent="bake",Object.assign(r.style,{padding:"10px 18px",fontSize:"15px",background:"#abcdff",color:"#456dff",border:"1px solid #8fa7ff",borderRadius:"8px",cursor:"pointer",whiteSpace:"nowrap"});const s=()=>{i.value.trim()&&(t(i.value.trim()),i.value="",n(""))};return i.addEventListener("input",()=>{let o=0,a=i.value.length;for(let l=0;l<i.value.length;l++){const c=i.value[l];if(c===" ")continue;const f=c.charCodeAt(0);if(f>=44032&&f<=55203&&o++,o>rs){a=l;break}}o>rs&&(i.value=i.value.slice(0,a)),n(i.value)}),i.addEventListener("keydown",o=>{o.key==="Enter"&&s()}),r.addEventListener("click",s),e.appendChild(i),e.appendChild(r),document.body.appendChild(e),i}async function Bl(){const t=new URLSearchParams(location.search).get("receiver")??"mycelium",e=new lv,i=cv({enabled:new URLSearchParams(location.search).get("sound")!=="0"});e.onSyllableStart=(h,d)=>i.play(G_(h,d),h);for(const h of["keydown","pointerdown"])window.addEventListener(h,i.unlock,{capture:!0});window.sound=i,await e.setReceiver(t),window.rm=e;const r=fv();let s=[],o=[],a=0,l=0,c=0;function f(h){const d=window.innerWidth,_=window.innerHeight,{positions:g,sylItems:m,widths:p,heights:y,sylSize:E,glyphScale:v}=dl(e,h,d,_,a);s=m,m.length>0&&Z_(e,m,g,E,p,y,v)}async function u(){const h=e.current;if(!s.length||!K_(h))return;const d=window.innerWidth,_=window.innerHeight,{lastY:g,sylSize:m,lineHeightRatio:p}=dl(e,o,d,_,a),y=Math.round(g+m*p*1.5);a=g+m*p*.5,await h.flushQueue();const E=h.captureFrame();r.addCapture(E,y),h.clearAccum()}pv(h=>{o=O_(h);const{count:d,added:_}=k_(o,c);c=d,_&&!e.current?.emitsSyllableStart&&e.onSyllableStart?.(_,e.name),i.endLast(H_(i.lastSyl,o));const g=o.reduce((m,p)=>m+(p.isSpace?1:0),0);g>l&&e.current?.finishGrowing?.(),l=g,f(o)},async()=>{await u()}),dv(e,f,()=>o),window.addEventListener("resize",()=>f(o))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Bl):Bl();
