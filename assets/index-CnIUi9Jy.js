(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const it=9,Wo=.8,_l=2.4,Xo=2,qo=7,gl=`#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`,vl=`#version 300 es
#ifdef GL_ES
precision highp float;
#endif
#define PI      3.14159265
#define MAX_SYL ${it}

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
`;function xl(n,e=.5){const t=Xo-1,i=1+(n-250)/650*t;return Math.max(1,Math.min(Xo,i+(e-.5)*.6))}function Sl(n){const e=qo-1;return Math.max(1,Math.min(qo,1+(n-580)/2020*e))}function Yo(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),n.getShaderParameter(i,n.COMPILE_STATUS)?i:(console.error("[sora] Shader error:",n.getShaderInfoLog(i)),n.deleteShader(i),null)}function Ml(n,e,t){const i=Yo(n,n.VERTEX_SHADER,e),r=Yo(n,n.FRAGMENT_SHADER,t);if(!i||!r)return null;const s=n.createProgram();return n.attachShader(s,i),n.attachShader(s,r),n.linkProgram(s),n.getProgramParameter(s,n.LINK_STATUS)?s:(console.error("[sora] Link error:",n.getProgramInfoLog(s)),null)}class yl{constructor(){this._canvas=null,this._gl=null,this._prog=null,this._locs={},this._raf=null,this._startT=performance.now(),this._ownCanvas=!1,this._cells=Array.from({length:it},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:it},()=>[2,3,.5,.33]),this._positions=Array.from({length:it},()=>[.5,.5]),this._radii=Array(it).fill(.1),this._morphStart=Array(it).fill(-999),this._waveStart=Array(it).fill(-999),this._f3Norms=Array(it).fill(.5),this._frozen=Array(it).fill(!1),this._wordPositions=new Map,this._wordRadii=new Map,this._rect=null,this.sylSize=150,this._sylCount=0,this._sminK=.06,this.lineHeightRatio=1.5}async init(e){e?this._canvas=e:(this._canvas=document.createElement("canvas"),this._canvas.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._canvas),this._ownCanvas=!0),this._resize(),window.addEventListener("resize",this._onResize);const t=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!t){console.error("[sora] WebGL2 not supported");return}if(this._gl=t,this._prog=Ml(t,gl,vl),!this._prog)return;t.useProgram(this._prog),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA);const i=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,i),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),t.STATIC_DRAW);const r=t.getAttribLocation(this._prog,"position");t.enableVertexAttribArray(r),t.vertexAttribPointer(r,2,t.FLOAT,!1,0,0),this._locs={res:t.getUniformLocation(this._prog,"u_resolution"),time:t.getUniformLocation(this._prog,"u_time"),count:t.getUniformLocation(this._prog,"u_sylCount"),sminK:t.getUniformLocation(this._prog,"u_sminK")};for(let s=0;s<it;s++)this._locs[`pos_${s}`]=t.getUniformLocation(this._prog,`u_pos[${s}]`),this._locs[`cell_${s}`]=t.getUniformLocation(this._prog,`u_cells[${s}]`),this._locs[`prev_${s}`]=t.getUniformLocation(this._prog,`u_prev[${s}]`),this._locs[`morph_${s}`]=t.getUniformLocation(this._prog,`u_morphT[${s}]`),this._locs[`wave_${s}`]=t.getUniformLocation(this._prog,`u_waveT[${s}]`),this._locs[`f3_${s}`]=t.getUniformLocation(this._prog,`u_f3Norm[${s}]`),this._locs[`rad_${s}`]=t.getUniformLocation(this._prog,`u_radii[${s}]`);this._raf=requestAnimationFrame(this._animate)}setRect(e){this._rect=e??null}_toRect(e,t){const i=this._rect;return i?[(i.x+e*i.w)/window.innerWidth,(i.y+t*i.h)/window.innerHeight]:[e,t]}update(e,t,i){if(!i)return;const r=(performance.now()-this._startT)/1e3,s=new Map;(e??[]).forEach((u,f)=>{const d=u.wordId??0;s.has(d)||s.set(d,[]),s.get(d).push({syl:u,pos:t[f]??[.5,.5]})});const o=[...s.keys()].sort((u,f)=>u-f),a=Math.min(o.length,it),c=.22,l=this._rect?this._rect.h/window.innerHeight:1,h=this.sylSize/550*l;for(const u of o)this._wordPositions.has(u)||this._wordPositions.set(u,this._toRect(c+Math.random()*(1-c*2),c+Math.random()*(1-c*2))),this._wordRadii.has(u)||this._wordRadii.set(u,h*(Math.random()*.75+.25));for(const u of this._wordPositions.keys())s.has(u)||(this._wordPositions.delete(u),this._wordRadii.delete(u));for(let u=0;u<a;u++){const f=o[u],d=s.get(f),_=d[d.length-1],g=o.some(A=>A>f);if(this._frozen[u]=g,this._positions[u]=this._wordPositions.get(f),this._radii[u]=this._wordRadii.get(f),g)continue;const m=i[_.syl.jung],p=i[_.syl.cho]?.cho;if(!m?.pos)continue;const[T,y]=m.pos,S=p?.pos?.[0]??.5,L=p?.pos?.[2]??.33,w=m.pos[2]??2500,b=Math.max(0,Math.min(1,(w-2080)/1120));this._f3Norms[u]=b;const P=[xl(T,S),Sl(y),S,L],v=this._cells[u];if(P.some((A,D)=>Math.abs(A-v[D])>.01)){const A=r-this._morphStart[u],D=Math.min(A/Wo,1),I=D<.5?2*D*D:-1+(4-2*D)*D,k=this._prevCells[u];this._prevCells[u]=v.map((W,B)=>k[B]+(W-k[B])*I),this._cells[u]=P,this._morphStart[u]=r,this._waveStart[u]=r}}this._sylCount=a;for(let u=a;u<it;u++)this._frozen[u]=!1}async flushQueue(){for(let e=0;e<it;e++)this._prevCells[e]=[...this._cells[e]],this._morphStart[e]=-999,this._waveStart[e]=-999;await new Promise(e=>requestAnimationFrame(()=>requestAnimationFrame(e)))}captureFrame(){return!this._gl||!this._canvas?null:(this._render(),this._canvas.toDataURL("image/png"))}clearAccum(){this._cells=Array.from({length:it},()=>[2,3,.5,.33]),this._prevCells=Array.from({length:it},()=>[2,3,.5,.33]),this._positions=Array.from({length:it},()=>[.5,.5]),this._radii=Array(it).fill(.1),this._morphStart=Array(it).fill(-999),this._waveStart=Array(it).fill(-999),this._f3Norms=Array(it).fill(.5),this._frozen=Array(it).fill(!1),this._wordPositions.clear(),this._wordRadii.clear(),this._sylCount=0,this._render()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._gl&&this._prog&&this._gl.deleteProgram(this._prog),this._gl=null}_animate=()=>{this._raf=requestAnimationFrame(this._animate),this._render()};_render(){const e=this._gl;if(!e)return;const t=(performance.now()-this._startT)/1e3,i=this._locs;e.viewport(0,0,this._canvas.width,this._canvas.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.uniform2f(i.res,this._canvas.width,this._canvas.height),e.uniform1f(i.time,t),e.uniform1i(i.count,this._sylCount),e.uniform1f(i.sminK,this._sminK);for(let r=0;r<it;r++){const s=this._cells[r],o=this._prevCells[r],a=this._positions[r],c=Math.min((t-this._morphStart[r])/Wo,1),l=Math.min((t-this._waveStart[r])/_l,1);e.uniform2f(i[`pos_${r}`],a[0],a[1]),e.uniform4f(i[`cell_${r}`],s[0],s[1],s[2],s[3]),e.uniform4f(i[`prev_${r}`],o[0],o[1],o[2],o[3]),e.uniform1f(i[`morph_${r}`],c),e.uniform1f(i[`wave_${r}`],l),e.uniform1f(i[`f3_${r}`],this._f3Norms[r]),e.uniform1f(i[`rad_${r}`],this._radii[r])}e.drawArrays(e.TRIANGLES,0,6)}_resize(){if(!this._canvas)return;const e=Math.min(window.devicePixelRatio,2);this._canvas.width=window.innerWidth*e,this._canvas.height=window.innerHeight*e}_onResize=()=>{this._resize()}}const fn=11102230246251565e-32,pt=134217729,El=(3+8*fn)*fn;function Zr(n,e,t,i,r){let s,o,a,c,l=e[0],h=i[0],u=0,f=0;h>l==h>-l?(s=l,l=e[++u]):(s=h,h=i[++f]);let d=0;if(u<n&&f<t)for(h>l==h>-l?(o=l+s,a=s-(o-l),l=e[++u]):(o=h+s,a=s-(o-h),h=i[++f]),s=o,a!==0&&(r[d++]=a);u<n&&f<t;)h>l==h>-l?(o=s+l,c=o-s,a=s-(o-c)+(l-c),l=e[++u]):(o=s+h,c=o-s,a=s-(o-c)+(h-c),h=i[++f]),s=o,a!==0&&(r[d++]=a);for(;u<n;)o=s+l,c=o-s,a=s-(o-c)+(l-c),l=e[++u],s=o,a!==0&&(r[d++]=a);for(;f<t;)o=s+h,c=o-s,a=s-(o-c)+(h-c),h=i[++f],s=o,a!==0&&(r[d++]=a);return(s!==0||d===0)&&(r[d++]=s),d}function Tl(n,e){let t=e[0];for(let i=1;i<n;i++)t+=e[i];return t}function ji(n){return new Float64Array(n)}const bl=(3+16*fn)*fn,Al=(2+12*fn)*fn,wl=(9+64*fn)*fn*fn,qn=ji(4),jo=ji(8),$o=ji(12),Ko=ji(16),xt=ji(4);function Rl(n,e,t,i,r,s,o){let a,c,l,h,u,f,d,_,g,m,p,T,y,S,L,w,b,P;const v=n-r,x=t-r,A=e-s,D=i-s;S=v*D,f=pt*v,d=f-(f-v),_=v-d,f=pt*D,g=f-(f-D),m=D-g,L=_*m-(S-d*g-_*g-d*m),w=A*x,f=pt*A,d=f-(f-A),_=A-d,f=pt*x,g=f-(f-x),m=x-g,b=_*m-(w-d*g-_*g-d*m),p=L-b,u=L-p,qn[0]=L-(p+u)+(u-b),T=S+p,u=T-S,y=S-(T-u)+(p-u),p=y-w,u=y-p,qn[1]=y-(p+u)+(u-w),P=T+p,u=P-T,qn[2]=T-(P-u)+(p-u),qn[3]=P;let I=Tl(4,qn),k=Al*o;if(I>=k||-I>=k||(u=n-v,a=n-(v+u)+(u-r),u=t-x,l=t-(x+u)+(u-r),u=e-A,c=e-(A+u)+(u-s),u=i-D,h=i-(D+u)+(u-s),a===0&&c===0&&l===0&&h===0)||(k=wl*o+El*Math.abs(I),I+=v*h+D*a-(A*l+x*c),I>=k||-I>=k))return I;S=a*D,f=pt*a,d=f-(f-a),_=a-d,f=pt*D,g=f-(f-D),m=D-g,L=_*m-(S-d*g-_*g-d*m),w=c*x,f=pt*c,d=f-(f-c),_=c-d,f=pt*x,g=f-(f-x),m=x-g,b=_*m-(w-d*g-_*g-d*m),p=L-b,u=L-p,xt[0]=L-(p+u)+(u-b),T=S+p,u=T-S,y=S-(T-u)+(p-u),p=y-w,u=y-p,xt[1]=y-(p+u)+(u-w),P=T+p,u=P-T,xt[2]=T-(P-u)+(p-u),xt[3]=P;const W=Zr(4,qn,4,xt,jo);S=v*h,f=pt*v,d=f-(f-v),_=v-d,f=pt*h,g=f-(f-h),m=h-g,L=_*m-(S-d*g-_*g-d*m),w=A*l,f=pt*A,d=f-(f-A),_=A-d,f=pt*l,g=f-(f-l),m=l-g,b=_*m-(w-d*g-_*g-d*m),p=L-b,u=L-p,xt[0]=L-(p+u)+(u-b),T=S+p,u=T-S,y=S-(T-u)+(p-u),p=y-w,u=y-p,xt[1]=y-(p+u)+(u-w),P=T+p,u=P-T,xt[2]=T-(P-u)+(p-u),xt[3]=P;const B=Zr(W,jo,4,xt,$o);S=a*h,f=pt*a,d=f-(f-a),_=a-d,f=pt*h,g=f-(f-h),m=h-g,L=_*m-(S-d*g-_*g-d*m),w=c*l,f=pt*c,d=f-(f-c),_=c-d,f=pt*l,g=f-(f-l),m=l-g,b=_*m-(w-d*g-_*g-d*m),p=L-b,u=L-p,xt[0]=L-(p+u)+(u-b),T=S+p,u=T-S,y=S-(T-u)+(p-u),p=y-w,u=y-p,xt[1]=y-(p+u)+(u-w),P=T+p,u=P-T,xt[2]=T-(P-u)+(p-u),xt[3]=P;const j=Zr(B,$o,4,xt,Ko);return Ko[j-1]}function nr(n,e,t,i,r,s){const o=(e-s)*(t-r),a=(n-r)*(i-s),c=o-a,l=Math.abs(o+a);return Math.abs(c)>=bl*l?c:-Rl(n,e,t,i,r,s,l)}const Zo=Math.pow(2,-52),ir=new Uint32Array(512);class zr{static from(e,t=Ul,i=Il){const r=e.length,s=new Float64Array(r*2);for(let o=0;o<r;o++){const a=e[o];s[2*o]=t(a),s[2*o+1]=i(a)}return new zr(s)}constructor(e){const t=e.length>>1;if(t>0&&typeof e[0]!="number")throw new Error("Expected coords to contain numbers.");this.coords=e;const i=Math.max(2*t-5,0);this._triangles=new Uint32Array(i*3),this._halfedges=new Int32Array(i*3),this._hashSize=Math.ceil(Math.sqrt(t)),this._hullPrev=new Uint32Array(t),this._hullNext=new Uint32Array(t),this._hullTri=new Uint32Array(t),this._hullHash=new Int32Array(this._hashSize),this._ids=new Uint32Array(t),this._dists=new Float64Array(t),this.trianglesLen=0,this._cx=0,this._cy=0,this._hullStart=0,this.hull=this._triangles,this.triangles=this._triangles,this.halfedges=this._halfedges,this.update()}update(){const{coords:e,_hullPrev:t,_hullNext:i,_hullTri:r,_hullHash:s}=this,o=e.length>>1;let a=1/0,c=1/0,l=-1/0,h=-1/0;for(let v=0;v<o;v++){const x=e[2*v],A=e[2*v+1];x<a&&(a=x),A<c&&(c=A),x>l&&(l=x),A>h&&(h=A),this._ids[v]=v}const u=(a+l)/2,f=(c+h)/2;let d=0,_=0,g=0;for(let v=0,x=1/0;v<o;v++){const A=Jr(u,f,e[2*v],e[2*v+1]);A<x&&(d=v,x=A)}const m=e[2*d],p=e[2*d+1];for(let v=0,x=1/0;v<o;v++){if(v===d)continue;const A=Jr(m,p,e[2*v],e[2*v+1]);A<x&&A>0&&(_=v,x=A)}let T=e[2*_],y=e[2*_+1],S=1/0;for(let v=0;v<o;v++){if(v===d||v===_)continue;const x=Ll(m,p,T,y,e[2*v],e[2*v+1]);x<S&&(g=v,S=x)}let L=e[2*g],w=e[2*g+1];if(S===1/0){for(let A=0;A<o;A++)this._dists[A]=e[2*A]-e[0]||e[2*A+1]-e[1];mi(this._ids,this._dists,0,o-1);const v=new Uint32Array(o);let x=0;for(let A=0,D=-1/0;A<o;A++){const I=this._ids[A],k=this._dists[I];k>D&&(v[x++]=I,D=k)}this.hull=v.subarray(0,x),this.triangles=new Uint32Array(0),this.halfedges=new Int32Array(0);return}if(nr(m,p,T,y,L,w)<0){const v=_,x=T,A=y;_=g,T=L,y=w,g=v,L=x,w=A}const b=Dl(m,p,T,y,L,w);this._cx=b.x,this._cy=b.y;for(let v=0;v<o;v++)this._dists[v]=Jr(e[2*v],e[2*v+1],b.x,b.y);mi(this._ids,this._dists,0,o-1),this._hullStart=d;let P=3;i[d]=t[g]=_,i[_]=t[d]=g,i[g]=t[_]=d,r[d]=0,r[_]=1,r[g]=2,s.fill(-1),s[this._hashKey(m,p)]=d,s[this._hashKey(T,y)]=_,s[this._hashKey(L,w)]=g,this.trianglesLen=0,this._addTriangle(d,_,g,-1,-1,-1);for(let v=0,x=0,A=0;v<this._ids.length;v++){const D=this._ids[v],I=e[2*D],k=e[2*D+1];if(v>0&&Math.abs(I-x)<=Zo&&Math.abs(k-A)<=Zo||(x=I,A=k,D===d||D===_||D===g))continue;let W=0;for(let re=0,me=this._hashKey(I,k);re<this._hashSize&&(W=s[(me+re)%this._hashSize],!(W!==-1&&W!==i[W]));re++);W=t[W];let B=W,j;for(;j=i[B],nr(I,k,e[2*B],e[2*B+1],e[2*j],e[2*j+1])>=0;)if(B=j,B===W){B=-1;break}if(B===-1)continue;let G=this._addTriangle(B,D,i[B],-1,-1,r[B]);r[D]=this._legalize(G+2),r[B]=G,P++;let J=i[B];for(;j=i[J],nr(I,k,e[2*J],e[2*J+1],e[2*j],e[2*j+1])<0;)G=this._addTriangle(J,D,j,r[D],-1,r[J]),r[D]=this._legalize(G+2),i[J]=J,P--,J=j;if(B===W)for(;j=t[B],nr(I,k,e[2*j],e[2*j+1],e[2*B],e[2*B+1])<0;)G=this._addTriangle(j,D,B,-1,r[B],r[j]),this._legalize(G+2),r[j]=G,i[B]=B,P--,B=j;this._hullStart=t[D]=B,i[B]=t[J]=D,i[D]=J,s[this._hashKey(I,k)]=D,s[this._hashKey(e[2*B],e[2*B+1])]=B}this.hull=new Uint32Array(P);for(let v=0,x=this._hullStart;v<P;v++)this.hull[v]=x,x=i[x];this.triangles=this._triangles.subarray(0,this.trianglesLen),this.halfedges=this._halfedges.subarray(0,this.trianglesLen)}_hashKey(e,t){return Math.floor(Cl(e-this._cx,t-this._cy)*this._hashSize)%this._hashSize}_legalize(e){const{_triangles:t,_halfedges:i,coords:r}=this;let s=0,o=0;for(;;){const a=i[e],c=e-e%3;if(o=c+(e+2)%3,a===-1){if(s===0)break;e=ir[--s];continue}const l=a-a%3,h=c+(e+1)%3,u=l+(a+2)%3,f=t[o],d=t[e],_=t[h],g=t[u];if(Pl(r[2*f],r[2*f+1],r[2*d],r[2*d+1],r[2*_],r[2*_+1],r[2*g],r[2*g+1])){t[e]=g,t[a]=f;const p=i[u];if(p===-1){let y=this._hullStart;do{if(this._hullTri[y]===u){this._hullTri[y]=e;break}y=this._hullPrev[y]}while(y!==this._hullStart)}this._link(e,p),this._link(a,i[o]),this._link(o,u);const T=l+(a+1)%3;s<ir.length&&(ir[s++]=T)}else{if(s===0)break;e=ir[--s]}}return o}_link(e,t){this._halfedges[e]=t,t!==-1&&(this._halfedges[t]=e)}_addTriangle(e,t,i,r,s,o){const a=this.trianglesLen;return this._triangles[a]=e,this._triangles[a+1]=t,this._triangles[a+2]=i,this._link(a,r),this._link(a+1,s),this._link(a+2,o),this.trianglesLen+=3,a}}function Cl(n,e){const t=n/(Math.abs(n)+Math.abs(e));return(e>0?3-t:1+t)/4}function Jr(n,e,t,i){const r=n-t,s=e-i;return r*r+s*s}function Pl(n,e,t,i,r,s,o,a){const c=n-o,l=e-a,h=t-o,u=i-a,f=r-o,d=s-a,_=c*c+l*l,g=h*h+u*u,m=f*f+d*d;return c*(u*m-g*d)-l*(h*m-g*f)+_*(h*d-u*f)<0}function Ll(n,e,t,i,r,s){const o=t-n,a=i-e,c=r-n,l=s-e,h=o*o+a*a,u=c*c+l*l,f=.5/(o*l-a*c),d=(l*h-a*u)*f,_=(o*u-c*h)*f;return d*d+_*_}function Dl(n,e,t,i,r,s){const o=t-n,a=i-e,c=r-n,l=s-e,h=o*o+a*a,u=c*c+l*l,f=.5/(o*l-a*c),d=n+(l*h-a*u)*f,_=e+(o*u-c*h)*f;return{x:d,y:_}}function mi(n,e,t,i){if(i-t<=20)for(let r=t+1;r<=i;r++){const s=n[r],o=e[s];let a=r-1;for(;a>=t&&e[n[a]]>o;)n[a+1]=n[a--];n[a+1]=s}else{const r=t+i>>1;let s=t+1,o=i;Pi(n,r,s),e[n[t]]>e[n[i]]&&Pi(n,t,i),e[n[s]]>e[n[i]]&&Pi(n,s,i),e[n[t]]>e[n[s]]&&Pi(n,t,s);const a=n[s],c=e[a];for(;;){do s++;while(e[n[s]]<c);do o--;while(e[n[o]]>c);if(o<s)break;Pi(n,s,o)}n[t+1]=n[o],n[o]=a,i-s+1>=o-t?(mi(n,e,s,i),mi(n,e,t,o-1)):(mi(n,e,t,o-1),mi(n,e,s,i))}}function Pi(n,e,t){const i=n[e];n[e]=n[t],n[t]=i}function Ul(n){return n[0]}function Il(n){return n[1]}const Jo=1e-6;class Bn{constructor(){this._x0=this._y0=this._x1=this._y1=null,this._=""}moveTo(e,t){this._+=`M${this._x0=this._x1=+e},${this._y0=this._y1=+t}`}closePath(){this._x1!==null&&(this._x1=this._x0,this._y1=this._y0,this._+="Z")}lineTo(e,t){this._+=`L${this._x1=+e},${this._y1=+t}`}arc(e,t,i){e=+e,t=+t,i=+i;const r=e+i,s=t;if(i<0)throw new Error("negative radius");this._x1===null?this._+=`M${r},${s}`:(Math.abs(this._x1-r)>Jo||Math.abs(this._y1-s)>Jo)&&(this._+="L"+r+","+s),i&&(this._+=`A${i},${i},0,1,1,${e-i},${t}A${i},${i},0,1,1,${this._x1=r},${this._y1=s}`)}rect(e,t,i,r){this._+=`M${this._x0=this._x1=+e},${this._y0=this._y1=+t}h${+i}v${+r}h${-i}Z`}value(){return this._||null}}class Cs{constructor(){this._=[]}moveTo(e,t){this._.push([e,t])}closePath(){this._.push(this._[0].slice())}lineTo(e,t){this._.push([e,t])}value(){return this._.length?this._:null}}class Fl{constructor(e,[t,i,r,s]=[0,0,960,500]){if(!((r=+r)>=(t=+t))||!((s=+s)>=(i=+i)))throw new Error("invalid bounds");this.delaunay=e,this._circumcenters=new Float64Array(e.points.length*2),this.vectors=new Float64Array(e.points.length*2),this.xmax=r,this.xmin=t,this.ymax=s,this.ymin=i,this._init()}update(){return this.delaunay.update(),this._init(),this}_init(){const{delaunay:{points:e,hull:t,triangles:i},vectors:r}=this;let s,o;const a=this.circumcenters=this._circumcenters.subarray(0,i.length/3*2);for(let g=0,m=0,p=i.length,T,y;g<p;g+=3,m+=2){const S=i[g]*2,L=i[g+1]*2,w=i[g+2]*2,b=e[S],P=e[S+1],v=e[L],x=e[L+1],A=e[w],D=e[w+1],I=v-b,k=x-P,W=A-b,B=D-P,j=(I*B-k*W)*2;if(Math.abs(j)<1e-9){if(s===void 0){s=o=0;for(const J of t)s+=e[J*2],o+=e[J*2+1];s/=t.length,o/=t.length}const G=1e9*Math.sign((s-b)*B-(o-P)*W);T=(b+A)/2-G*B,y=(P+D)/2+G*W}else{const G=1/j,J=I*I+k*k,re=W*W+B*B;T=b+(B*J-k*re)*G,y=P+(I*re-W*J)*G}a[m]=T,a[m+1]=y}let c=t[t.length-1],l,h=c*4,u,f=e[2*c],d,_=e[2*c+1];r.fill(0);for(let g=0;g<t.length;++g)c=t[g],l=h,u=f,d=_,h=c*4,f=e[2*c],_=e[2*c+1],r[l+2]=r[h]=d-_,r[l+3]=r[h+1]=f-u}render(e){const t=e==null?e=new Bn:void 0,{delaunay:{halfedges:i,inedges:r,hull:s},circumcenters:o,vectors:a}=this;if(s.length<=1)return null;for(let h=0,u=i.length;h<u;++h){const f=i[h];if(f<h)continue;const d=Math.floor(h/3)*2,_=Math.floor(f/3)*2,g=o[d],m=o[d+1],p=o[_],T=o[_+1];this._renderSegment(g,m,p,T,e)}let c,l=s[s.length-1];for(let h=0;h<s.length;++h){c=l,l=s[h];const u=Math.floor(r[l]/3)*2,f=o[u],d=o[u+1],_=c*4,g=this._project(f,d,a[_+2],a[_+3]);g&&this._renderSegment(f,d,g[0],g[1],e)}return t&&t.value()}renderBounds(e){const t=e==null?e=new Bn:void 0;return e.rect(this.xmin,this.ymin,this.xmax-this.xmin,this.ymax-this.ymin),t&&t.value()}renderCell(e,t){const i=t==null?t=new Bn:void 0,r=this._clip(e);if(r===null||!r.length)return;t.moveTo(r[0],r[1]);let s=r.length;for(;r[0]===r[s-2]&&r[1]===r[s-1]&&s>1;)s-=2;for(let o=2;o<s;o+=2)(r[o]!==r[o-2]||r[o+1]!==r[o-1])&&t.lineTo(r[o],r[o+1]);return t.closePath(),i&&i.value()}*cellPolygons(){const{delaunay:{points:e}}=this;for(let t=0,i=e.length/2;t<i;++t){const r=this.cellPolygon(t);r&&(r.index=t,yield r)}}cellPolygon(e){const t=new Cs;return this.renderCell(e,t),t.value()}_renderSegment(e,t,i,r,s){let o;const a=this._regioncode(e,t),c=this._regioncode(i,r);a===0&&c===0?(s.moveTo(e,t),s.lineTo(i,r)):(o=this._clipSegment(e,t,i,r,a,c))&&(s.moveTo(o[0],o[1]),s.lineTo(o[2],o[3]))}contains(e,t,i){return t=+t,t!==t||(i=+i,i!==i)?!1:this.delaunay._step(e,t,i)===e}*neighbors(e){const t=this._clip(e);if(t)for(const i of this.delaunay.neighbors(e)){const r=this._clip(i);if(r){e:for(let s=0,o=t.length;s<o;s+=2)for(let a=0,c=r.length;a<c;a+=2)if(t[s]===r[a]&&t[s+1]===r[a+1]&&t[(s+2)%o]===r[(a+c-2)%c]&&t[(s+3)%o]===r[(a+c-1)%c]){yield i;break e}}}}_cell(e){const{circumcenters:t,delaunay:{inedges:i,halfedges:r,triangles:s}}=this,o=i[e];if(o===-1)return null;const a=[];let c=o;do{const l=Math.floor(c/3);if(a.push(t[l*2],t[l*2+1]),c=c%3===2?c-2:c+1,s[c]!==e)break;c=r[c]}while(c!==o&&c!==-1);return a}_clip(e){if(e===0&&this.delaunay.hull.length===1)return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];const t=this._cell(e);if(t===null)return null;const{vectors:i}=this,r=e*4;return this._simplify(i[r]||i[r+1]?this._clipInfinite(e,t,i[r],i[r+1],i[r+2],i[r+3]):this._clipFinite(e,t))}_clipFinite(e,t){const i=t.length;let r=null,s,o,a=t[i-2],c=t[i-1],l,h=this._regioncode(a,c),u,f=0;for(let d=0;d<i;d+=2)if(s=a,o=c,a=t[d],c=t[d+1],l=h,h=this._regioncode(a,c),l===0&&h===0)u=f,f=0,r?r.push(a,c):r=[a,c];else{let _,g,m,p,T;if(l===0){if((_=this._clipSegment(s,o,a,c,l,h))===null)continue;[g,m,p,T]=_}else{if((_=this._clipSegment(a,c,s,o,h,l))===null)continue;[p,T,g,m]=_,u=f,f=this._edgecode(g,m),u&&f&&this._edge(e,u,f,r,r.length),r?r.push(g,m):r=[g,m]}u=f,f=this._edgecode(p,T),u&&f&&this._edge(e,u,f,r,r.length),r?r.push(p,T):r=[p,T]}if(r)u=f,f=this._edgecode(r[0],r[1]),u&&f&&this._edge(e,u,f,r,r.length);else if(this.contains(e,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2))return[this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax,this.xmin,this.ymin];return r}_clipSegment(e,t,i,r,s,o){const a=s<o;for(a&&([e,t,i,r,s,o]=[i,r,e,t,o,s]);;){if(s===0&&o===0)return a?[i,r,e,t]:[e,t,i,r];if(s&o)return null;let c,l,h=s||o;h&8?(c=e+(i-e)*(this.ymax-t)/(r-t),l=this.ymax):h&4?(c=e+(i-e)*(this.ymin-t)/(r-t),l=this.ymin):h&2?(l=t+(r-t)*(this.xmax-e)/(i-e),c=this.xmax):(l=t+(r-t)*(this.xmin-e)/(i-e),c=this.xmin),s?(e=c,t=l,s=this._regioncode(e,t)):(i=c,r=l,o=this._regioncode(i,r))}}_clipInfinite(e,t,i,r,s,o){let a=Array.from(t),c;if((c=this._project(a[0],a[1],i,r))&&a.unshift(c[0],c[1]),(c=this._project(a[a.length-2],a[a.length-1],s,o))&&a.push(c[0],c[1]),a=this._clipFinite(e,a))for(let l=0,h=a.length,u,f=this._edgecode(a[h-2],a[h-1]);l<h;l+=2)u=f,f=this._edgecode(a[l],a[l+1]),u&&f&&(l=this._edge(e,u,f,a,l),h=a.length);else this.contains(e,(this.xmin+this.xmax)/2,(this.ymin+this.ymax)/2)&&(a=[this.xmin,this.ymin,this.xmax,this.ymin,this.xmax,this.ymax,this.xmin,this.ymax]);return a}_edge(e,t,i,r,s){for(;t!==i;){let o,a;switch(t){case 5:t=4;continue;case 4:t=6,o=this.xmax,a=this.ymin;break;case 6:t=2;continue;case 2:t=10,o=this.xmax,a=this.ymax;break;case 10:t=8;continue;case 8:t=9,o=this.xmin,a=this.ymax;break;case 9:t=1;continue;case 1:t=5,o=this.xmin,a=this.ymin;break}(r[s]!==o||r[s+1]!==a)&&this.contains(e,o,a)&&(r.splice(s,0,o,a),s+=2)}return s}_project(e,t,i,r){let s=1/0,o,a,c;if(r<0){if(t<=this.ymin)return null;(o=(this.ymin-t)/r)<s&&(c=this.ymin,a=e+(s=o)*i)}else if(r>0){if(t>=this.ymax)return null;(o=(this.ymax-t)/r)<s&&(c=this.ymax,a=e+(s=o)*i)}if(i>0){if(e>=this.xmax)return null;(o=(this.xmax-e)/i)<s&&(a=this.xmax,c=t+(s=o)*r)}else if(i<0){if(e<=this.xmin)return null;(o=(this.xmin-e)/i)<s&&(a=this.xmin,c=t+(s=o)*r)}return[a,c]}_edgecode(e,t){return(e===this.xmin?1:e===this.xmax?2:0)|(t===this.ymin?4:t===this.ymax?8:0)}_regioncode(e,t){return(e<this.xmin?1:e>this.xmax?2:0)|(t<this.ymin?4:t>this.ymax?8:0)}_simplify(e){if(e&&e.length>4){for(let t=0;t<e.length;t+=2){const i=(t+2)%e.length,r=(t+4)%e.length;(e[t]===e[i]&&e[i]===e[r]||e[t+1]===e[i+1]&&e[i+1]===e[r+1])&&(e.splice(i,2),t-=2)}e.length||(e=null)}return e}}const Nl=2*Math.PI,Yn=Math.pow;function Ol(n){return n[0]}function Bl(n){return n[1]}function zl(n){const{triangles:e,coords:t}=n;for(let i=0;i<e.length;i+=3){const r=2*e[i],s=2*e[i+1],o=2*e[i+2];if((t[o]-t[r])*(t[s+1]-t[r+1])-(t[s]-t[r])*(t[o+1]-t[r+1])>1e-10)return!1}return!0}function kl(n,e,t){return[n+Math.sin(n+e)*t,e+Math.cos(n-e)*t]}class So{static from(e,t=Ol,i=Bl,r){return new So("length"in e?Hl(e,t,i,r):Float64Array.from(Gl(e,t,i,r)))}constructor(e){this._delaunator=new zr(e),this.inedges=new Int32Array(e.length/2),this._hullIndex=new Int32Array(e.length/2),this.points=this._delaunator.coords,this._init()}update(){return this._delaunator.update(),this._init(),this}_init(){const e=this._delaunator,t=this.points;if(e.hull&&e.hull.length>2&&zl(e)){this.collinear=Int32Array.from({length:t.length/2},(f,d)=>d).sort((f,d)=>t[2*f]-t[2*d]||t[2*f+1]-t[2*d+1]);const c=this.collinear[0],l=this.collinear[this.collinear.length-1],h=[t[2*c],t[2*c+1],t[2*l],t[2*l+1]],u=1e-8*Math.hypot(h[3]-h[1],h[2]-h[0]);for(let f=0,d=t.length/2;f<d;++f){const _=kl(t[2*f],t[2*f+1],u);t[2*f]=_[0],t[2*f+1]=_[1]}this._delaunator=new zr(t)}else delete this.collinear;const i=this.halfedges=this._delaunator.halfedges,r=this.hull=this._delaunator.hull,s=this.triangles=this._delaunator.triangles,o=this.inedges.fill(-1),a=this._hullIndex.fill(-1);for(let c=0,l=i.length;c<l;++c){const h=s[c%3===2?c-2:c+1];(i[c]===-1||o[h]===-1)&&(o[h]=c)}for(let c=0,l=r.length;c<l;++c)a[r[c]]=c;r.length<=2&&r.length>0&&(this.triangles=new Int32Array(3).fill(-1),this.halfedges=new Int32Array(3).fill(-1),this.triangles[0]=r[0],o[r[0]]=1,r.length===2&&(o[r[1]]=0,this.triangles[1]=r[1],this.triangles[2]=r[1]))}voronoi(e){return new Fl(this,e)}*neighbors(e){const{inedges:t,hull:i,_hullIndex:r,halfedges:s,triangles:o,collinear:a}=this;if(a){const u=a.indexOf(e);u>0&&(yield a[u-1]),u<a.length-1&&(yield a[u+1]);return}const c=t[e];if(c===-1)return;let l=c,h=-1;do{if(yield h=o[l],l=l%3===2?l-2:l+1,o[l]!==e)return;if(l=s[l],l===-1){const u=i[(r[e]+1)%i.length];u!==h&&(yield u);return}}while(l!==c)}find(e,t,i=0){if(e=+e,e!==e||(t=+t,t!==t))return-1;const r=i;let s;for(;(s=this._step(i,e,t))>=0&&s!==i&&s!==r;)i=s;return s}_step(e,t,i){const{inedges:r,hull:s,_hullIndex:o,halfedges:a,triangles:c,points:l}=this;if(r[e]===-1||!l.length)return(e+1)%(l.length>>1);let h=e,u=Yn(t-l[e*2],2)+Yn(i-l[e*2+1],2);const f=r[e];let d=f;do{let _=c[d];const g=Yn(t-l[_*2],2)+Yn(i-l[_*2+1],2);if(g<u&&(u=g,h=_),d=d%3===2?d-2:d+1,c[d]!==e)break;if(d=a[d],d===-1){if(d=s[(o[e]+1)%s.length],d!==_&&Yn(t-l[d*2],2)+Yn(i-l[d*2+1],2)<u)return d;break}}while(d!==f);return h}render(e){const t=e==null?e=new Bn:void 0,{points:i,halfedges:r,triangles:s}=this;for(let o=0,a=r.length;o<a;++o){const c=r[o];if(c<o)continue;const l=s[o]*2,h=s[c]*2;e.moveTo(i[l],i[l+1]),e.lineTo(i[h],i[h+1])}return this.renderHull(e),t&&t.value()}renderPoints(e,t){t===void 0&&(!e||typeof e.moveTo!="function")&&(t=e,e=null),t=t==null?2:+t;const i=e==null?e=new Bn:void 0,{points:r}=this;for(let s=0,o=r.length;s<o;s+=2){const a=r[s],c=r[s+1];e.moveTo(a+t,c),e.arc(a,c,t,0,Nl)}return i&&i.value()}renderHull(e){const t=e==null?e=new Bn:void 0,{hull:i,points:r}=this,s=i[0]*2,o=i.length;e.moveTo(r[s],r[s+1]);for(let a=1;a<o;++a){const c=2*i[a];e.lineTo(r[c],r[c+1])}return e.closePath(),t&&t.value()}hullPolygon(){const e=new Cs;return this.renderHull(e),e.value()}renderTriangle(e,t){const i=t==null?t=new Bn:void 0,{points:r,triangles:s}=this,o=s[e*=3]*2,a=s[e+1]*2,c=s[e+2]*2;return t.moveTo(r[o],r[o+1]),t.lineTo(r[a],r[a+1]),t.lineTo(r[c],r[c+1]),t.closePath(),i&&i.value()}*trianglePolygons(){const{triangles:e}=this;for(let t=0,i=e.length/3;t<i;++t)yield this.trianglePolygon(t)}trianglePolygon(e){const t=new Cs;return this.renderTriangle(e,t),t.value()}}function Hl(n,e,t,i){const r=n.length,s=new Float64Array(r*2);for(let o=0;o<r;++o){const a=n[o];s[o*2]=e.call(i,a,o,n),s[o*2+1]=t.call(i,a,o,n)}return s}function*Gl(n,e,t,i){let r=0;for(const s of n)yield e.call(i,s,r,n),yield t.call(i,s,r,n),++r}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Mo="175",Vl=0,Qo=1,Wl=2,yc=1,Xl=2,ln=3,bn=0,At=1,un=2,En=0,gi=1,ea=2,ta=3,na=4,ql=5,Nn=100,Yl=101,jl=102,$l=103,Kl=104,Zl=200,Jl=201,Ql=202,eu=203,Ps=204,Ls=205,tu=206,nu=207,iu=208,ru=209,su=210,ou=211,au=212,cu=213,lu=214,Ds=0,Us=1,Is=2,xi=3,Fs=4,Ns=5,Os=6,Bs=7,Ec=0,uu=1,hu=2,Tn=0,fu=1,du=2,pu=3,mu=4,_u=5,gu=6,vu=7,Tc=300,Si=301,Mi=302,zs=303,ks=304,qr=306,Hs=1e3,zn=1001,Gs=1002,It=1003,xu=1004,rr=1005,Ht=1006,Qr=1007,kn=1008,tn=1009,bc=1010,Ac=1011,ki=1012,yo=1013,Vn=1014,Kt=1015,$i=1016,Eo=1017,To=1018,Hi=1020,wc=35902,Rc=1021,Cc=1022,Ut=1023,Pc=1024,Lc=1025,Gi=1026,Vi=1027,Dc=1028,bo=1029,Uc=1030,Ao=1031,wo=1033,Pr=33776,Lr=33777,Dr=33778,Ur=33779,Vs=35840,Ws=35841,Xs=35842,qs=35843,Ys=36196,js=37492,$s=37496,Ks=37808,Zs=37809,Js=37810,Qs=37811,eo=37812,to=37813,no=37814,io=37815,ro=37816,so=37817,oo=37818,ao=37819,co=37820,lo=37821,Ir=36492,uo=36494,ho=36495,Ic=36283,fo=36284,po=36285,mo=36286,Su=3200,Mu=3201,yu=0,Eu=1,yn="",zt="srgb",yi="srgb-linear",kr="linear",Ke="srgb",jn=7680,ia=519,Tu=512,bu=513,Au=514,Fc=515,wu=516,Ru=517,Cu=518,Pu=519,ra=35044,sa="300 es",hn=2e3,Hr=2001;class Ai{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const r=i[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const mt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let oa=1234567;const Bi=Math.PI/180,Wi=180/Math.PI;function wi(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(mt[n&255]+mt[n>>8&255]+mt[n>>16&255]+mt[n>>24&255]+"-"+mt[e&255]+mt[e>>8&255]+"-"+mt[e>>16&15|64]+mt[e>>24&255]+"-"+mt[t&63|128]+mt[t>>8&255]+"-"+mt[t>>16&255]+mt[t>>24&255]+mt[i&255]+mt[i>>8&255]+mt[i>>16&255]+mt[i>>24&255]).toLowerCase()}function Be(n,e,t){return Math.max(e,Math.min(t,n))}function Ro(n,e){return(n%e+e)%e}function Lu(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)}function Du(n,e,t){return n!==e?(t-n)/(e-n):0}function zi(n,e,t){return(1-t)*n+t*e}function Uu(n,e,t,i){return zi(n,e,1-Math.exp(-t*i))}function Iu(n,e=1){return e-Math.abs(Ro(n,e*2)-e)}function Fu(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function Nu(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function Ou(n,e){return n+Math.floor(Math.random()*(e-n+1))}function Bu(n,e){return n+Math.random()*(e-n)}function zu(n){return n*(.5-Math.random())}function ku(n){n!==void 0&&(oa=n);let e=oa+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Hu(n){return n*Bi}function Gu(n){return n*Wi}function Vu(n){return(n&n-1)===0&&n!==0}function Wu(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Xu(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function qu(n,e,t,i,r){const s=Math.cos,o=Math.sin,a=s(t/2),c=o(t/2),l=s((e+i)/2),h=o((e+i)/2),u=s((e-i)/2),f=o((e-i)/2),d=s((i-e)/2),_=o((i-e)/2);switch(r){case"XYX":n.set(a*h,c*u,c*f,a*l);break;case"YZY":n.set(c*f,a*h,c*u,a*l);break;case"ZXZ":n.set(c*u,c*f,a*h,a*l);break;case"XZX":n.set(a*h,c*_,c*d,a*l);break;case"YXY":n.set(c*d,a*h,c*_,a*l);break;case"ZYZ":n.set(c*_,c*d,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function pi(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Mt(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Yu={DEG2RAD:Bi,RAD2DEG:Wi,generateUUID:wi,clamp:Be,euclideanModulo:Ro,mapLinear:Lu,inverseLerp:Du,lerp:zi,damp:Uu,pingpong:Iu,smoothstep:Fu,smootherstep:Nu,randInt:Ou,randFloat:Bu,randFloatSpread:zu,seededRandom:ku,degToRad:Hu,radToDeg:Gu,isPowerOfTwo:Vu,ceilPowerOfTwo:Wu,floorPowerOfTwo:Xu,setQuaternionFromProperEuler:qu,normalize:Mt,denormalize:pi};class Ge{constructor(e=0,t=0){Ge.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Be(this.x,e.x,t.x),this.y=Be(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Be(this.x,e,t),this.y=Be(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Be(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Be(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Pe{constructor(e,t,i,r,s,o,a,c,l){Pe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,c,l)}set(e,t,i,r,s,o,a,c,l){const h=this.elements;return h[0]=e,h[1]=r,h[2]=a,h[3]=t,h[4]=s,h[5]=c,h[6]=i,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],h=i[4],u=i[7],f=i[2],d=i[5],_=i[8],g=r[0],m=r[3],p=r[6],T=r[1],y=r[4],S=r[7],L=r[2],w=r[5],b=r[8];return s[0]=o*g+a*T+c*L,s[3]=o*m+a*y+c*w,s[6]=o*p+a*S+c*b,s[1]=l*g+h*T+u*L,s[4]=l*m+h*y+u*w,s[7]=l*p+h*S+u*b,s[2]=f*g+d*T+_*L,s[5]=f*m+d*y+_*w,s[8]=f*p+d*S+_*b,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8];return t*o*h-t*a*l-i*s*h+i*a*c+r*s*l-r*o*c}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=h*o-a*l,f=a*c-h*s,d=l*s-o*c,_=t*u+i*f+r*d;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/_;return e[0]=u*g,e[1]=(r*l-h*i)*g,e[2]=(a*i-r*o)*g,e[3]=f*g,e[4]=(h*t-r*c)*g,e[5]=(r*s-a*t)*g,e[6]=d*g,e[7]=(i*c-l*t)*g,e[8]=(o*t-i*s)*g,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,o,a){const c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*o+l*a)+o+e,-r*l,r*c,-r*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(es.makeScale(e,t)),this}rotate(e){return this.premultiply(es.makeRotation(-e)),this}translate(e,t){return this.premultiply(es.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const es=new Pe;function Nc(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Gr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function ju(){const n=Gr("canvas");return n.style.display="block",n}const aa={};function Fr(n){n in aa||(aa[n]=!0,console.warn(n))}function $u(n,e,t){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:i()}}setTimeout(s,t)})}function Ku(n){const e=n.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function Zu(n){const e=n.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}const ca=new Pe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),la=new Pe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ju(){const n={enabled:!0,workingColorSpace:yi,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===Ke&&(r.r=dn(r.r),r.g=dn(r.g),r.b=dn(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===Ke&&(r.r=vi(r.r),r.g=vi(r.g),r.b=vi(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===yn?kr:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[yi]:{primaries:e,whitePoint:i,transfer:kr,toXYZ:ca,fromXYZ:la,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:zt},outputColorSpaceConfig:{drawingBufferColorSpace:zt}},[zt]:{primaries:e,whitePoint:i,transfer:Ke,toXYZ:ca,fromXYZ:la,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:zt}}}),n}const We=Ju();function dn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function vi(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let $n;class Qu{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{$n===void 0&&($n=Gr("canvas")),$n.width=e.width,$n.height=e.height;const r=$n.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=$n}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Gr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=dn(s[o]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(dn(t[i]/255)*255):t[i]=dn(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let eh=0;class Co{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:eh++}),this.uuid=wi(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(ts(r[o].image)):s.push(ts(r[o]))}else s=ts(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function ts(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Qu.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let th=0;class wt extends Ai{constructor(e=wt.DEFAULT_IMAGE,t=wt.DEFAULT_MAPPING,i=zn,r=zn,s=Ht,o=kn,a=Ut,c=tn,l=wt.DEFAULT_ANISOTROPY,h=yn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:th++}),this.uuid=wi(),this.name="",this.source=new Co(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new Ge(0,0),this.repeat=new Ge(1,1),this.center=new Ge(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Pe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Tc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Hs:e.x=e.x-Math.floor(e.x);break;case zn:e.x=e.x<0?0:1;break;case Gs:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Hs:e.y=e.y-Math.floor(e.y);break;case zn:e.y=e.y<0?0:1;break;case Gs:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}wt.DEFAULT_IMAGE=null;wt.DEFAULT_MAPPING=Tc;wt.DEFAULT_ANISOTROPY=1;class rt{constructor(e=0,t=0,i=0,r=1){rt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*i+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const c=e.elements,l=c[0],h=c[4],u=c[8],f=c[1],d=c[5],_=c[9],g=c[2],m=c[6],p=c[10];if(Math.abs(h-f)<.01&&Math.abs(u-g)<.01&&Math.abs(_-m)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+g)<.1&&Math.abs(_+m)<.1&&Math.abs(l+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(l+1)/2,S=(d+1)/2,L=(p+1)/2,w=(h+f)/4,b=(u+g)/4,P=(_+m)/4;return y>S&&y>L?y<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(y),r=w/i,s=b/i):S>L?S<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(S),i=w/r,s=P/r):L<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(L),i=b/s,r=P/s),this.set(i,r,s,t),this}let T=Math.sqrt((m-_)*(m-_)+(u-g)*(u-g)+(f-h)*(f-h));return Math.abs(T)<.001&&(T=1),this.x=(m-_)/T,this.y=(u-g)/T,this.z=(f-h)/T,this.w=Math.acos((l+d+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Be(this.x,e.x,t.x),this.y=Be(this.y,e.y,t.y),this.z=Be(this.z,e.z,t.z),this.w=Be(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Be(this.x,e,t),this.y=Be(this.y,e,t),this.z=Be(this.z,e,t),this.w=Be(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Be(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class nh extends Ai{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new rt(0,0,e,t),this.scissorTest=!1,this.viewport=new rt(0,0,e,t);const r={width:e,height:t,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ht,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new wt(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new Co(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Lt extends nh{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Oc extends wt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=It,this.minFilter=It,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class ih extends wt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=It,this.minFilter=It,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ki{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,o,a){let c=i[r+0],l=i[r+1],h=i[r+2],u=i[r+3];const f=s[o+0],d=s[o+1],_=s[o+2],g=s[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(a===1){e[t+0]=f,e[t+1]=d,e[t+2]=_,e[t+3]=g;return}if(u!==g||c!==f||l!==d||h!==_){let m=1-a;const p=c*f+l*d+h*_+u*g,T=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){const L=Math.sqrt(y),w=Math.atan2(L,p*T);m=Math.sin(m*w)/L,a=Math.sin(a*w)/L}const S=a*T;if(c=c*m+f*S,l=l*m+d*S,h=h*m+_*S,u=u*m+g*S,m===1-a){const L=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=L,l*=L,h*=L,u*=L}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,i,r,s,o){const a=i[r],c=i[r+1],l=i[r+2],h=i[r+3],u=s[o],f=s[o+1],d=s[o+2],_=s[o+3];return e[t]=a*_+h*u+c*d-l*f,e[t+1]=c*_+h*f+l*u-a*d,e[t+2]=l*_+h*d+a*f-c*u,e[t+3]=h*_-a*u-c*f-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(i/2),h=a(r/2),u=a(s/2),f=c(i/2),d=c(r/2),_=c(s/2);switch(o){case"XYZ":this._x=f*h*u+l*d*_,this._y=l*d*u-f*h*_,this._z=l*h*_+f*d*u,this._w=l*h*u-f*d*_;break;case"YXZ":this._x=f*h*u+l*d*_,this._y=l*d*u-f*h*_,this._z=l*h*_-f*d*u,this._w=l*h*u+f*d*_;break;case"ZXY":this._x=f*h*u-l*d*_,this._y=l*d*u+f*h*_,this._z=l*h*_+f*d*u,this._w=l*h*u-f*d*_;break;case"ZYX":this._x=f*h*u-l*d*_,this._y=l*d*u+f*h*_,this._z=l*h*_-f*d*u,this._w=l*h*u+f*d*_;break;case"YZX":this._x=f*h*u+l*d*_,this._y=l*d*u+f*h*_,this._z=l*h*_-f*d*u,this._w=l*h*u-f*d*_;break;case"XZY":this._x=f*h*u-l*d*_,this._y=l*d*u-f*h*_,this._z=l*h*_+f*d*u,this._w=l*h*u+f*d*_;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],o=t[1],a=t[5],c=t[9],l=t[2],h=t[6],u=t[10],f=i+a+u;if(f>0){const d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(h-c)*d,this._y=(s-l)*d,this._z=(o-r)*d}else if(i>a&&i>u){const d=2*Math.sqrt(1+i-a-u);this._w=(h-c)/d,this._x=.25*d,this._y=(r+o)/d,this._z=(s+l)/d}else if(a>u){const d=2*Math.sqrt(1+a-i-u);this._w=(s-l)/d,this._x=(r+o)/d,this._y=.25*d,this._z=(c+h)/d}else{const d=2*Math.sqrt(1+u-i-a);this._w=(o-r)/d,this._x=(s+l)/d,this._y=(c+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Be(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,o=e._w,a=t._x,c=t._y,l=t._z,h=t._w;return this._x=i*h+o*a+r*l-s*c,this._y=r*h+o*c+s*a-i*l,this._z=s*h+o*l+i*c-r*a,this._w=o*h-i*a-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const c=1-a*a;if(c<=Number.EPSILON){const d=1-t;return this._w=d*o+t*this._w,this._x=d*i+t*this._x,this._y=d*r+t*this._y,this._z=d*s+t*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-t)*h)/l,f=Math.sin(t*h)/l;return this._w=o*u+this._w*f,this._x=i*u+this._x*f,this._y=r*u+this._y*f,this._z=s*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class H{constructor(e=0,t=0,i=0){H.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ua.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ua.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*r-a*i),h=2*(a*t-s*r),u=2*(s*i-o*t);return this.x=t+c*l+o*u-a*h,this.y=i+c*h+a*l-s*u,this.z=r+c*u+s*h-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Be(this.x,e.x,t.x),this.y=Be(this.y,e.y,t.y),this.z=Be(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Be(this.x,e,t),this.y=Be(this.y,e,t),this.z=Be(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Be(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,o=t.x,a=t.y,c=t.z;return this.x=r*c-s*a,this.y=s*o-i*c,this.z=i*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return ns.copy(this).projectOnVector(e),this.sub(ns)}reflect(e){return this.sub(ns.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Be(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ns=new H,ua=new Ki;class Zi{constructor(e=new H(1/0,1/0,1/0),t=new H(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Wt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Wt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Wt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Wt):Wt.fromBufferAttribute(s,o),Wt.applyMatrix4(e.matrixWorld),this.expandByPoint(Wt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),sr.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),sr.copy(i.boundingBox)),sr.applyMatrix4(e.matrixWorld),this.union(sr)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Wt),Wt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Li),or.subVectors(this.max,Li),Kn.subVectors(e.a,Li),Zn.subVectors(e.b,Li),Jn.subVectors(e.c,Li),_n.subVectors(Zn,Kn),gn.subVectors(Jn,Zn),Rn.subVectors(Kn,Jn);let t=[0,-_n.z,_n.y,0,-gn.z,gn.y,0,-Rn.z,Rn.y,_n.z,0,-_n.x,gn.z,0,-gn.x,Rn.z,0,-Rn.x,-_n.y,_n.x,0,-gn.y,gn.x,0,-Rn.y,Rn.x,0];return!is(t,Kn,Zn,Jn,or)||(t=[1,0,0,0,1,0,0,0,1],!is(t,Kn,Zn,Jn,or))?!1:(ar.crossVectors(_n,gn),t=[ar.x,ar.y,ar.z],is(t,Kn,Zn,Jn,or))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Wt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Wt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(rn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),rn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),rn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),rn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),rn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),rn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),rn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),rn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(rn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const rn=[new H,new H,new H,new H,new H,new H,new H,new H],Wt=new H,sr=new Zi,Kn=new H,Zn=new H,Jn=new H,_n=new H,gn=new H,Rn=new H,Li=new H,or=new H,ar=new H,Cn=new H;function is(n,e,t,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){Cn.fromArray(n,s);const a=r.x*Math.abs(Cn.x)+r.y*Math.abs(Cn.y)+r.z*Math.abs(Cn.z),c=e.dot(Cn),l=t.dot(Cn),h=i.dot(Cn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const rh=new Zi,Di=new H,rs=new H;class Po{constructor(e=new H,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):rh.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Di.subVectors(e,this.center);const t=Di.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Di,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(rs.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Di.copy(e.center).add(rs)),this.expandByPoint(Di.copy(e.center).sub(rs))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const sn=new H,ss=new H,cr=new H,vn=new H,os=new H,lr=new H,as=new H;class sh{constructor(e=new H,t=new H(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,sn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=sn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(sn.copy(this.origin).addScaledVector(this.direction,t),sn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){ss.copy(e).add(t).multiplyScalar(.5),cr.copy(t).sub(e).normalize(),vn.copy(this.origin).sub(ss);const s=e.distanceTo(t)*.5,o=-this.direction.dot(cr),a=vn.dot(this.direction),c=-vn.dot(cr),l=vn.lengthSq(),h=Math.abs(1-o*o);let u,f,d,_;if(h>0)if(u=o*c-a,f=o*a-c,_=s*h,u>=0)if(f>=-_)if(f<=_){const g=1/h;u*=g,f*=g,d=u*(u+o*f+2*a)+f*(o*u+f+2*c)+l}else f=s,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*c)+l;else f=-s,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*c)+l;else f<=-_?(u=Math.max(0,-(-o*s+a)),f=u>0?-s:Math.min(Math.max(-s,-c),s),d=-u*u+f*(f+2*c)+l):f<=_?(u=0,f=Math.min(Math.max(-s,-c),s),d=f*(f+2*c)+l):(u=Math.max(0,-(o*s+a)),f=u>0?s:Math.min(Math.max(-s,-c),s),d=-u*u+f*(f+2*c)+l);else f=o>0?-s:s,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(ss).addScaledVector(cr,f),d}intersectSphere(e,t){sn.subVectors(e.center,this.origin);const i=sn.dot(this.direction),r=sn.dot(sn)-i*i,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return l>=0?(i=(e.min.x-f.x)*l,r=(e.max.x-f.x)*l):(i=(e.max.x-f.x)*l,r=(e.min.x-f.x)*l),h>=0?(s=(e.min.y-f.y)*h,o=(e.max.y-f.y)*h):(s=(e.max.y-f.y)*h,o=(e.min.y-f.y)*h),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),u>=0?(a=(e.min.z-f.z)*u,c=(e.max.z-f.z)*u):(a=(e.max.z-f.z)*u,c=(e.min.z-f.z)*u),i>c||a>r)||((a>i||i!==i)&&(i=a),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,sn)!==null}intersectTriangle(e,t,i,r,s){os.subVectors(t,e),lr.subVectors(i,e),as.crossVectors(os,lr);let o=this.direction.dot(as),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;vn.subVectors(this.origin,e);const c=a*this.direction.dot(lr.crossVectors(vn,lr));if(c<0)return null;const l=a*this.direction.dot(os.cross(vn));if(l<0||c+l>o)return null;const h=-a*vn.dot(as);return h<0?null:this.at(h/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class at{constructor(e,t,i,r,s,o,a,c,l,h,u,f,d,_,g,m){at.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,c,l,h,u,f,d,_,g,m)}set(e,t,i,r,s,o,a,c,l,h,u,f,d,_,g,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=r,p[1]=s,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=h,p[10]=u,p[14]=f,p[3]=d,p[7]=_,p[11]=g,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new at().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/Qn.setFromMatrixColumn(e,0).length(),s=1/Qn.setFromMatrixColumn(e,1).length(),o=1/Qn.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(r),l=Math.sin(r),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){const f=o*h,d=o*u,_=a*h,g=a*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=d+_*l,t[5]=f-g*l,t[9]=-a*c,t[2]=g-f*l,t[6]=_+d*l,t[10]=o*c}else if(e.order==="YXZ"){const f=c*h,d=c*u,_=l*h,g=l*u;t[0]=f+g*a,t[4]=_*a-d,t[8]=o*l,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=d*a-_,t[6]=g+f*a,t[10]=o*c}else if(e.order==="ZXY"){const f=c*h,d=c*u,_=l*h,g=l*u;t[0]=f-g*a,t[4]=-o*u,t[8]=_+d*a,t[1]=d+_*a,t[5]=o*h,t[9]=g-f*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){const f=o*h,d=o*u,_=a*h,g=a*u;t[0]=c*h,t[4]=_*l-d,t[8]=f*l+g,t[1]=c*u,t[5]=g*l+f,t[9]=d*l-_,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){const f=o*c,d=o*l,_=a*c,g=a*l;t[0]=c*h,t[4]=g-f*u,t[8]=_*u+d,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-l*h,t[6]=d*u+_,t[10]=f-g*u}else if(e.order==="XZY"){const f=o*c,d=o*l,_=a*c,g=a*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=f*u+g,t[5]=o*h,t[9]=d*u-_,t[2]=_*u-d,t[6]=a*h,t[10]=g*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(oh,e,ah)}lookAt(e,t,i){const r=this.elements;return Ct.subVectors(e,t),Ct.lengthSq()===0&&(Ct.z=1),Ct.normalize(),xn.crossVectors(i,Ct),xn.lengthSq()===0&&(Math.abs(i.z)===1?Ct.x+=1e-4:Ct.z+=1e-4,Ct.normalize(),xn.crossVectors(i,Ct)),xn.normalize(),ur.crossVectors(Ct,xn),r[0]=xn.x,r[4]=ur.x,r[8]=Ct.x,r[1]=xn.y,r[5]=ur.y,r[9]=Ct.y,r[2]=xn.z,r[6]=ur.z,r[10]=Ct.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],h=i[1],u=i[5],f=i[9],d=i[13],_=i[2],g=i[6],m=i[10],p=i[14],T=i[3],y=i[7],S=i[11],L=i[15],w=r[0],b=r[4],P=r[8],v=r[12],x=r[1],A=r[5],D=r[9],I=r[13],k=r[2],W=r[6],B=r[10],j=r[14],G=r[3],J=r[7],re=r[11],me=r[15];return s[0]=o*w+a*x+c*k+l*G,s[4]=o*b+a*A+c*W+l*J,s[8]=o*P+a*D+c*B+l*re,s[12]=o*v+a*I+c*j+l*me,s[1]=h*w+u*x+f*k+d*G,s[5]=h*b+u*A+f*W+d*J,s[9]=h*P+u*D+f*B+d*re,s[13]=h*v+u*I+f*j+d*me,s[2]=_*w+g*x+m*k+p*G,s[6]=_*b+g*A+m*W+p*J,s[10]=_*P+g*D+m*B+p*re,s[14]=_*v+g*I+m*j+p*me,s[3]=T*w+y*x+S*k+L*G,s[7]=T*b+y*A+S*W+L*J,s[11]=T*P+y*D+S*B+L*re,s[15]=T*v+y*I+S*j+L*me,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],c=e[9],l=e[13],h=e[2],u=e[6],f=e[10],d=e[14],_=e[3],g=e[7],m=e[11],p=e[15];return _*(+s*c*u-r*l*u-s*a*f+i*l*f+r*a*d-i*c*d)+g*(+t*c*d-t*l*f+s*o*f-r*o*d+r*l*h-s*c*h)+m*(+t*l*u-t*a*d-s*o*u+i*o*d+s*a*h-i*l*h)+p*(-r*a*h-t*c*u+t*a*f+r*o*u-i*o*f+i*c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=e[9],f=e[10],d=e[11],_=e[12],g=e[13],m=e[14],p=e[15],T=u*m*l-g*f*l+g*c*d-a*m*d-u*c*p+a*f*p,y=_*f*l-h*m*l-_*c*d+o*m*d+h*c*p-o*f*p,S=h*g*l-_*u*l+_*a*d-o*g*d-h*a*p+o*u*p,L=_*u*c-h*g*c-_*a*f+o*g*f+h*a*m-o*u*m,w=t*T+i*y+r*S+s*L;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const b=1/w;return e[0]=T*b,e[1]=(g*f*s-u*m*s-g*r*d+i*m*d+u*r*p-i*f*p)*b,e[2]=(a*m*s-g*c*s+g*r*l-i*m*l-a*r*p+i*c*p)*b,e[3]=(u*c*s-a*f*s-u*r*l+i*f*l+a*r*d-i*c*d)*b,e[4]=y*b,e[5]=(h*m*s-_*f*s+_*r*d-t*m*d-h*r*p+t*f*p)*b,e[6]=(_*c*s-o*m*s-_*r*l+t*m*l+o*r*p-t*c*p)*b,e[7]=(o*f*s-h*c*s+h*r*l-t*f*l-o*r*d+t*c*d)*b,e[8]=S*b,e[9]=(_*u*s-h*g*s-_*i*d+t*g*d+h*i*p-t*u*p)*b,e[10]=(o*g*s-_*a*s+_*i*l-t*g*l-o*i*p+t*a*p)*b,e[11]=(h*a*s-o*u*s-h*i*l+t*u*l+o*i*d-t*a*d)*b,e[12]=L*b,e[13]=(h*g*r-_*u*r+_*i*f-t*g*f-h*i*m+t*u*m)*b,e[14]=(_*a*r-o*g*r-_*i*c+t*g*c+o*i*m-t*a*m)*b,e[15]=(o*u*r-h*a*r+h*i*c-t*u*c-o*i*f+t*a*f)*b,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,o=e.x,a=e.y,c=e.z,l=s*o,h=s*a;return this.set(l*o+i,l*a-r*c,l*c+r*a,0,l*a+r*c,h*a+i,h*c-r*o,0,l*c-r*a,h*c+r*o,s*c*c+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,o=t._y,a=t._z,c=t._w,l=s+s,h=o+o,u=a+a,f=s*l,d=s*h,_=s*u,g=o*h,m=o*u,p=a*u,T=c*l,y=c*h,S=c*u,L=i.x,w=i.y,b=i.z;return r[0]=(1-(g+p))*L,r[1]=(d+S)*L,r[2]=(_-y)*L,r[3]=0,r[4]=(d-S)*w,r[5]=(1-(f+p))*w,r[6]=(m+T)*w,r[7]=0,r[8]=(_+y)*b,r[9]=(m-T)*b,r[10]=(1-(f+g))*b,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=Qn.set(r[0],r[1],r[2]).length();const o=Qn.set(r[4],r[5],r[6]).length(),a=Qn.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Xt.copy(this);const l=1/s,h=1/o,u=1/a;return Xt.elements[0]*=l,Xt.elements[1]*=l,Xt.elements[2]*=l,Xt.elements[4]*=h,Xt.elements[5]*=h,Xt.elements[6]*=h,Xt.elements[8]*=u,Xt.elements[9]*=u,Xt.elements[10]*=u,t.setFromRotationMatrix(Xt),i.x=s,i.y=o,i.z=a,this}makePerspective(e,t,i,r,s,o,a=hn){const c=this.elements,l=2*s/(t-e),h=2*s/(i-r),u=(t+e)/(t-e),f=(i+r)/(i-r);let d,_;if(a===hn)d=-(o+s)/(o-s),_=-2*o*s/(o-s);else if(a===Hr)d=-o/(o-s),_=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=d,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,r,s,o,a=hn){const c=this.elements,l=1/(t-e),h=1/(i-r),u=1/(o-s),f=(t+e)*l,d=(i+r)*h;let _,g;if(a===hn)_=(o+s)*u,g=-2*u;else if(a===Hr)_=s*u,g=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-f,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-d,c[2]=0,c[6]=0,c[10]=g,c[14]=-_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Qn=new H,Xt=new at,oh=new H(0,0,0),ah=new H(1,1,1),xn=new H,ur=new H,Ct=new H,ha=new at,fa=new Ki;class pn{constructor(e=0,t=0,i=0,r=pn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],c=r[1],l=r[5],h=r[9],u=r[2],f=r[6],d=r[10];switch(t){case"XYZ":this._y=Math.asin(Be(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Be(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(Be(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Be(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Be(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-Be(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-h,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return ha.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ha,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return fa.setFromEuler(this),this.setFromQuaternion(fa,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}pn.DEFAULT_ORDER="XYZ";class Bc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let ch=0;const da=new H,ei=new Ki,on=new at,hr=new H,Ui=new H,lh=new H,uh=new Ki,pa=new H(1,0,0),ma=new H(0,1,0),_a=new H(0,0,1),ga={type:"added"},hh={type:"removed"},ti={type:"childadded",child:null},cs={type:"childremoved",child:null};class Ft extends Ai{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ch++}),this.uuid=wi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ft.DEFAULT_UP.clone();const e=new H,t=new pn,i=new Ki,r=new H(1,1,1);function s(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new at},normalMatrix:{value:new Pe}}),this.matrix=new at,this.matrixWorld=new at,this.matrixAutoUpdate=Ft.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ft.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Bc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ei.setFromAxisAngle(e,t),this.quaternion.multiply(ei),this}rotateOnWorldAxis(e,t){return ei.setFromAxisAngle(e,t),this.quaternion.premultiply(ei),this}rotateX(e){return this.rotateOnAxis(pa,e)}rotateY(e){return this.rotateOnAxis(ma,e)}rotateZ(e){return this.rotateOnAxis(_a,e)}translateOnAxis(e,t){return da.copy(e).applyQuaternion(this.quaternion),this.position.add(da.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(pa,e)}translateY(e){return this.translateOnAxis(ma,e)}translateZ(e){return this.translateOnAxis(_a,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(on.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?hr.copy(e):hr.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),Ui.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?on.lookAt(Ui,hr,this.up):on.lookAt(hr,Ui,this.up),this.quaternion.setFromRotationMatrix(on),r&&(on.extractRotation(r.matrixWorld),ei.setFromRotationMatrix(on),this.quaternion.premultiply(ei.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ga),ti.child=e,this.dispatchEvent(ti),ti.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(hh),cs.child=e,this.dispatchEvent(cs),cs.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),on.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),on.multiply(e.parent.matrixWorld)),e.applyMatrix4(on),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ga),ti.child=e,this.dispatchEvent(ti),ti.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ui,e,lh),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ui,uh,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const u=c[l];s(e.shapes,u)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(s(e.materials,this.material[c]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];r.animations.push(s(e.animations,c))}}if(t){const a=o(e.geometries),c=o(e.materials),l=o(e.textures),h=o(e.images),u=o(e.shapes),f=o(e.skeletons),d=o(e.animations),_=o(e.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),f.length>0&&(i.skeletons=f),d.length>0&&(i.animations=d),_.length>0&&(i.nodes=_)}return i.object=r,i;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}Ft.DEFAULT_UP=new H(0,1,0);Ft.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ft.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const qt=new H,an=new H,ls=new H,cn=new H,ni=new H,ii=new H,va=new H,us=new H,hs=new H,fs=new H,ds=new rt,ps=new rt,ms=new rt;class jt{constructor(e=new H,t=new H,i=new H){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),qt.subVectors(e,t),r.cross(qt);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){qt.subVectors(r,t),an.subVectors(i,t),ls.subVectors(e,t);const o=qt.dot(qt),a=qt.dot(an),c=qt.dot(ls),l=an.dot(an),h=an.dot(ls),u=o*l-a*a;if(u===0)return s.set(0,0,0),null;const f=1/u,d=(l*c-a*h)*f,_=(o*h-a*c)*f;return s.set(1-d-_,_,d)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,cn)===null?!1:cn.x>=0&&cn.y>=0&&cn.x+cn.y<=1}static getInterpolation(e,t,i,r,s,o,a,c){return this.getBarycoord(e,t,i,r,cn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,cn.x),c.addScaledVector(o,cn.y),c.addScaledVector(a,cn.z),c)}static getInterpolatedAttribute(e,t,i,r,s,o){return ds.setScalar(0),ps.setScalar(0),ms.setScalar(0),ds.fromBufferAttribute(e,t),ps.fromBufferAttribute(e,i),ms.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(ds,s.x),o.addScaledVector(ps,s.y),o.addScaledVector(ms,s.z),o}static isFrontFacing(e,t,i,r){return qt.subVectors(i,t),an.subVectors(e,t),qt.cross(an).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return qt.subVectors(this.c,this.b),an.subVectors(this.a,this.b),qt.cross(an).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return jt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return jt.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return jt.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return jt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return jt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let o,a;ni.subVectors(r,i),ii.subVectors(s,i),us.subVectors(e,i);const c=ni.dot(us),l=ii.dot(us);if(c<=0&&l<=0)return t.copy(i);hs.subVectors(e,r);const h=ni.dot(hs),u=ii.dot(hs);if(h>=0&&u<=h)return t.copy(r);const f=c*u-h*l;if(f<=0&&c>=0&&h<=0)return o=c/(c-h),t.copy(i).addScaledVector(ni,o);fs.subVectors(e,s);const d=ni.dot(fs),_=ii.dot(fs);if(_>=0&&d<=_)return t.copy(s);const g=d*l-c*_;if(g<=0&&l>=0&&_<=0)return a=l/(l-_),t.copy(i).addScaledVector(ii,a);const m=h*_-d*u;if(m<=0&&u-h>=0&&d-_>=0)return va.subVectors(s,r),a=(u-h)/(u-h+(d-_)),t.copy(r).addScaledVector(va,a);const p=1/(m+g+f);return o=g*p,a=f*p,t.copy(i).addScaledVector(ni,o).addScaledVector(ii,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const zc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Sn={h:0,s:0,l:0},fr={h:0,s:0,l:0};function _s(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class je{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,We.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=We.workingColorSpace){return this.r=e,this.g=t,this.b=i,We.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=We.workingColorSpace){if(e=Ro(e,1),t=Be(t,0,1),i=Be(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,o=2*i-s;this.r=_s(o,s,e+1/3),this.g=_s(o,s,e),this.b=_s(o,s,e-1/3)}return We.toWorkingColorSpace(this,r),this}setStyle(e,t=zt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=zt){const i=zc[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=dn(e.r),this.g=dn(e.g),this.b=dn(e.b),this}copyLinearToSRGB(e){return this.r=vi(e.r),this.g=vi(e.g),this.b=vi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=zt){return We.fromWorkingColorSpace(_t.copy(this),e),Math.round(Be(_t.r*255,0,255))*65536+Math.round(Be(_t.g*255,0,255))*256+Math.round(Be(_t.b*255,0,255))}getHexString(e=zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=We.workingColorSpace){We.fromWorkingColorSpace(_t.copy(this),t);const i=_t.r,r=_t.g,s=_t.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case i:c=(r-s)/u+(r<s?6:0);break;case r:c=(s-i)/u+2;break;case s:c=(i-r)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=We.workingColorSpace){return We.fromWorkingColorSpace(_t.copy(this),t),e.r=_t.r,e.g=_t.g,e.b=_t.b,e}getStyle(e=zt){We.fromWorkingColorSpace(_t.copy(this),e);const t=_t.r,i=_t.g,r=_t.b;return e!==zt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(Sn),this.setHSL(Sn.h+e,Sn.s+t,Sn.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Sn),e.getHSL(fr);const i=zi(Sn.h,fr.h,t),r=zi(Sn.s,fr.s,t),s=zi(Sn.l,fr.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const _t=new je;je.NAMES=zc;let fh=0;class Yr extends Ai{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:fh++}),this.uuid=wi(),this.name="",this.type="Material",this.blending=gi,this.side=bn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ps,this.blendDst=Ls,this.blendEquation=Nn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=xi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ia,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=jn,this.stencilZFail=jn,this.stencilZPass=jn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==gi&&(i.blending=this.blending),this.side!==bn&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Ps&&(i.blendSrc=this.blendSrc),this.blendDst!==Ls&&(i.blendDst=this.blendDst),this.blendEquation!==Nn&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==xi&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ia&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==jn&&(i.stencilFail=this.stencilFail),this.stencilZFail!==jn&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==jn&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const c=s[a];delete c.metadata,o.push(c)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class kc extends Yr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new pn,this.combine=Ec,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const ot=new H,dr=new Ge;let dh=0;class Jt{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:dh++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=ra,this.updateRanges=[],this.gpuType=Kt,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)dr.fromBufferAttribute(this,t),dr.applyMatrix3(e),this.setXY(t,dr.x,dr.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)ot.fromBufferAttribute(this,t),ot.applyMatrix3(e),this.setXYZ(t,ot.x,ot.y,ot.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)ot.fromBufferAttribute(this,t),ot.applyMatrix4(e),this.setXYZ(t,ot.x,ot.y,ot.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)ot.fromBufferAttribute(this,t),ot.applyNormalMatrix(e),this.setXYZ(t,ot.x,ot.y,ot.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)ot.fromBufferAttribute(this,t),ot.transformDirection(e),this.setXYZ(t,ot.x,ot.y,ot.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=pi(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Mt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=pi(t,this.array)),t}setX(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=pi(t,this.array)),t}setY(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=pi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=pi(t,this.array)),t}setW(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),i=Mt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),i=Mt(i,this.array),r=Mt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),i=Mt(i,this.array),r=Mt(r,this.array),s=Mt(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ra&&(e.usage=this.usage),e}}class Hc extends Jt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Gc extends Jt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Hn extends Jt{constructor(e,t,i){super(new Float32Array(e),t,i)}}let ph=0;const Bt=new at,gs=new Ft,ri=new H,Pt=new Zi,Ii=new Zi,ht=new H;class Wn extends Ai{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:ph++}),this.uuid=wi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Nc(e)?Gc:Hc)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Pe().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Bt.makeRotationFromQuaternion(e),this.applyMatrix4(Bt),this}rotateX(e){return Bt.makeRotationX(e),this.applyMatrix4(Bt),this}rotateY(e){return Bt.makeRotationY(e),this.applyMatrix4(Bt),this}rotateZ(e){return Bt.makeRotationZ(e),this.applyMatrix4(Bt),this}translate(e,t,i){return Bt.makeTranslation(e,t,i),this.applyMatrix4(Bt),this}scale(e,t,i){return Bt.makeScale(e,t,i),this.applyMatrix4(Bt),this}lookAt(e){return gs.lookAt(e),gs.updateMatrix(),this.applyMatrix4(gs.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ri).negate(),this.translate(ri.x,ri.y,ri.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,s=e.length;r<s;r++){const o=e[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Hn(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Zi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new H(-1/0,-1/0,-1/0),new H(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];Pt.setFromBufferAttribute(s),this.morphTargetsRelative?(ht.addVectors(this.boundingBox.min,Pt.min),this.boundingBox.expandByPoint(ht),ht.addVectors(this.boundingBox.max,Pt.max),this.boundingBox.expandByPoint(ht)):(this.boundingBox.expandByPoint(Pt.min),this.boundingBox.expandByPoint(Pt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Po);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new H,1/0);return}if(e){const i=this.boundingSphere.center;if(Pt.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Ii.setFromBufferAttribute(a),this.morphTargetsRelative?(ht.addVectors(Pt.min,Ii.min),Pt.expandByPoint(ht),ht.addVectors(Pt.max,Ii.max),Pt.expandByPoint(ht)):(Pt.expandByPoint(Ii.min),Pt.expandByPoint(Ii.max))}Pt.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)ht.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(ht));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)ht.fromBufferAttribute(a,l),c&&(ri.fromBufferAttribute(e,l),ht.add(ri)),r=Math.max(r,i.distanceToSquared(ht))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Jt(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let P=0;P<i.count;P++)a[P]=new H,c[P]=new H;const l=new H,h=new H,u=new H,f=new Ge,d=new Ge,_=new Ge,g=new H,m=new H;function p(P,v,x){l.fromBufferAttribute(i,P),h.fromBufferAttribute(i,v),u.fromBufferAttribute(i,x),f.fromBufferAttribute(s,P),d.fromBufferAttribute(s,v),_.fromBufferAttribute(s,x),h.sub(l),u.sub(l),d.sub(f),_.sub(f);const A=1/(d.x*_.y-_.x*d.y);isFinite(A)&&(g.copy(h).multiplyScalar(_.y).addScaledVector(u,-d.y).multiplyScalar(A),m.copy(u).multiplyScalar(d.x).addScaledVector(h,-_.x).multiplyScalar(A),a[P].add(g),a[v].add(g),a[x].add(g),c[P].add(m),c[v].add(m),c[x].add(m))}let T=this.groups;T.length===0&&(T=[{start:0,count:e.count}]);for(let P=0,v=T.length;P<v;++P){const x=T[P],A=x.start,D=x.count;for(let I=A,k=A+D;I<k;I+=3)p(e.getX(I+0),e.getX(I+1),e.getX(I+2))}const y=new H,S=new H,L=new H,w=new H;function b(P){L.fromBufferAttribute(r,P),w.copy(L);const v=a[P];y.copy(v),y.sub(L.multiplyScalar(L.dot(v))).normalize(),S.crossVectors(w,v);const A=S.dot(c[P])<0?-1:1;o.setXYZW(P,y.x,y.y,y.z,A)}for(let P=0,v=T.length;P<v;++P){const x=T[P],A=x.start,D=x.count;for(let I=A,k=A+D;I<k;I+=3)b(e.getX(I+0)),b(e.getX(I+1)),b(e.getX(I+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Jt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,d=i.count;f<d;f++)i.setXYZ(f,0,0,0);const r=new H,s=new H,o=new H,a=new H,c=new H,l=new H,h=new H,u=new H;if(e)for(let f=0,d=e.count;f<d;f+=3){const _=e.getX(f+0),g=e.getX(f+1),m=e.getX(f+2);r.fromBufferAttribute(t,_),s.fromBufferAttribute(t,g),o.fromBufferAttribute(t,m),h.subVectors(o,s),u.subVectors(r,s),h.cross(u),a.fromBufferAttribute(i,_),c.fromBufferAttribute(i,g),l.fromBufferAttribute(i,m),a.add(h),c.add(h),l.add(h),i.setXYZ(_,a.x,a.y,a.z),i.setXYZ(g,c.x,c.y,c.z),i.setXYZ(m,l.x,l.y,l.z)}else for(let f=0,d=t.count;f<d;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),h.subVectors(o,s),u.subVectors(r,s),h.cross(u),i.setXYZ(f+0,h.x,h.y,h.z),i.setXYZ(f+1,h.x,h.y,h.z),i.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)ht.fromBufferAttribute(e,t),ht.normalize(),e.setXYZ(t,ht.x,ht.y,ht.z)}toNonIndexed(){function e(a,c){const l=a.array,h=a.itemSize,u=a.normalized,f=new l.constructor(c.length*h);let d=0,_=0;for(let g=0,m=c.length;g<m;g++){a.isInterleavedBufferAttribute?d=c[g]*a.data.stride+a.offset:d=c[g]*h;for(let p=0;p<h;p++)f[_++]=l[d++]}return new Jt(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Wn,i=this.index.array,r=this.attributes;for(const a in r){const c=r[a],l=e(c,i);t.setAttribute(a,l)}const s=this.morphAttributes;for(const a in s){const c=[],l=s[a];for(let h=0,u=l.length;h<u;h++){const f=l[h],d=e(f,i);c.push(d)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const c in i){const l=i[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let u=0,f=l.length;u<f;u++){const d=l[u];h.push(d.toJSON(e.data))}h.length>0&&(r[c]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const r=e.attributes;for(const l in r){const h=r[l];this.setAttribute(l,h.clone(t))}const s=e.morphAttributes;for(const l in s){const h=[],u=s[l];for(let f=0,d=u.length;f<d;f++)h.push(u[f].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let l=0,h=o.length;l<h;l++){const u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const xa=new at,Pn=new sh,pr=new Po,Sa=new H,mr=new H,_r=new H,gr=new H,vs=new H,vr=new H,Ma=new H,xr=new H;class Zt extends Ft{constructor(e=new Wn,t=new kc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){vr.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const h=a[c],u=s[c];h!==0&&(vs.fromBufferAttribute(u,e),o?vr.addScaledVector(vs,h):vr.addScaledVector(vs.sub(t),h))}t.add(vr)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),pr.copy(i.boundingSphere),pr.applyMatrix4(s),Pn.copy(e.ray).recast(e.near),!(pr.containsPoint(Pn.origin)===!1&&(Pn.intersectSphere(pr,Sa)===null||Pn.origin.distanceToSquared(Sa)>(e.far-e.near)**2))&&(xa.copy(s).invert(),Pn.copy(e.ray).applyMatrix4(xa),!(i.boundingBox!==null&&Pn.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Pn)))}_computeIntersections(e,t,i){let r;const s=this.geometry,o=this.material,a=s.index,c=s.attributes.position,l=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,f=s.groups,d=s.drawRange;if(a!==null)if(Array.isArray(o))for(let _=0,g=f.length;_<g;_++){const m=f[_],p=o[m.materialIndex],T=Math.max(m.start,d.start),y=Math.min(a.count,Math.min(m.start+m.count,d.start+d.count));for(let S=T,L=y;S<L;S+=3){const w=a.getX(S),b=a.getX(S+1),P=a.getX(S+2);r=Sr(this,p,e,i,l,h,u,w,b,P),r&&(r.faceIndex=Math.floor(S/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const _=Math.max(0,d.start),g=Math.min(a.count,d.start+d.count);for(let m=_,p=g;m<p;m+=3){const T=a.getX(m),y=a.getX(m+1),S=a.getX(m+2);r=Sr(this,o,e,i,l,h,u,T,y,S),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(o))for(let _=0,g=f.length;_<g;_++){const m=f[_],p=o[m.materialIndex],T=Math.max(m.start,d.start),y=Math.min(c.count,Math.min(m.start+m.count,d.start+d.count));for(let S=T,L=y;S<L;S+=3){const w=S,b=S+1,P=S+2;r=Sr(this,p,e,i,l,h,u,w,b,P),r&&(r.faceIndex=Math.floor(S/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const _=Math.max(0,d.start),g=Math.min(c.count,d.start+d.count);for(let m=_,p=g;m<p;m+=3){const T=m,y=m+1,S=m+2;r=Sr(this,o,e,i,l,h,u,T,y,S),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function mh(n,e,t,i,r,s,o,a){let c;if(e.side===At?c=i.intersectTriangle(o,s,r,!0,a):c=i.intersectTriangle(r,s,o,e.side===bn,a),c===null)return null;xr.copy(a),xr.applyMatrix4(n.matrixWorld);const l=t.ray.origin.distanceTo(xr);return l<t.near||l>t.far?null:{distance:l,point:xr.clone(),object:n}}function Sr(n,e,t,i,r,s,o,a,c,l){n.getVertexPosition(a,mr),n.getVertexPosition(c,_r),n.getVertexPosition(l,gr);const h=mh(n,e,t,i,mr,_r,gr,Ma);if(h){const u=new H;jt.getBarycoord(Ma,mr,_r,gr,u),r&&(h.uv=jt.getInterpolatedAttribute(r,a,c,l,u,new Ge)),s&&(h.uv1=jt.getInterpolatedAttribute(s,a,c,l,u,new Ge)),o&&(h.normal=jt.getInterpolatedAttribute(o,a,c,l,u,new H),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));const f={a,b:c,c:l,normal:new H,materialIndex:0};jt.getNormal(mr,_r,gr,f.normal),h.face=f,h.barycoord=u}return h}class Ji extends Wn{constructor(e=1,t=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const c=[],l=[],h=[],u=[];let f=0,d=0;_("z","y","x",-1,-1,i,t,e,o,s,0),_("z","y","x",1,-1,i,t,-e,o,s,1),_("x","z","y",1,1,e,i,t,r,o,2),_("x","z","y",1,-1,e,i,-t,r,o,3),_("x","y","z",1,-1,e,t,i,r,s,4),_("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new Hn(l,3)),this.setAttribute("normal",new Hn(h,3)),this.setAttribute("uv",new Hn(u,2));function _(g,m,p,T,y,S,L,w,b,P,v){const x=S/b,A=L/P,D=S/2,I=L/2,k=w/2,W=b+1,B=P+1;let j=0,G=0;const J=new H;for(let re=0;re<B;re++){const me=re*A-I;for(let we=0;we<W;we++){const Ie=we*x-D;J[g]=Ie*T,J[m]=me*y,J[p]=k,l.push(J.x,J.y,J.z),J[g]=0,J[m]=0,J[p]=w>0?1:-1,h.push(J.x,J.y,J.z),u.push(we/b),u.push(1-re/P),j+=1}}for(let re=0;re<P;re++)for(let me=0;me<b;me++){const we=f+me+W*re,Ie=f+me+W*(re+1),K=f+(me+1)+W*(re+1),se=f+(me+1)+W*re;c.push(we,Ie,se),c.push(Ie,K,se),G+=6}a.addGroup(d,G,v),d+=G,f+=j}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ji(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ei(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function yt(n){const e={};for(let t=0;t<n.length;t++){const i=Ei(n[t]);for(const r in i)e[r]=i[r]}return e}function _h(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Vc(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:We.workingColorSpace}const gh={clone:Ei,merge:yt};var vh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,xh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class mn extends Yr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=vh,this.fragmentShader=xh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ei(e.uniforms),this.uniformsGroups=_h(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Wc extends Ft{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new at,this.projectionMatrix=new at,this.projectionMatrixInverse=new at,this.coordinateSystem=hn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Mn=new H,ya=new Ge,Ea=new Ge;class Yt extends Wc{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Wi*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Bi*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Wi*2*Math.atan(Math.tan(Bi*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){Mn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Mn.x,Mn.y).multiplyScalar(-e/Mn.z),Mn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Mn.x,Mn.y).multiplyScalar(-e/Mn.z)}getViewSize(e,t){return this.getViewBounds(e,ya,Ea),t.subVectors(Ea,ya)}setViewOffset(e,t,i,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Bi*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;s+=o.offsetX*r/c,t-=o.offsetY*i/l,r*=o.width/c,i*=o.height/l}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const si=-90,oi=1;class Sh extends Ft{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Yt(si,oi,e,t);r.layers=this.layers,this.add(r);const s=new Yt(si,oi,e,t);s.layers=this.layers,this.add(s);const o=new Yt(si,oi,e,t);o.layers=this.layers,this.add(o);const a=new Yt(si,oi,e,t);a.layers=this.layers,this.add(a);const c=new Yt(si,oi,e,t);c.layers=this.layers,this.add(c);const l=new Yt(si,oi,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,o,a,c]=t;for(const l of t)this.remove(l);if(e===hn)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Hr)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,c,l,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),_=e.xr.enabled;e.xr.enabled=!1;const g=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,o),e.setRenderTarget(i,2,r),e.render(t,a),e.setRenderTarget(i,3,r),e.render(t,c),e.setRenderTarget(i,4,r),e.render(t,l),i.texture.generateMipmaps=g,e.setRenderTarget(i,5,r),e.render(t,h),e.setRenderTarget(u,f,d),e.xr.enabled=_,i.texture.needsPMREMUpdate=!0}}class Xc extends wt{constructor(e=[],t=Si,i,r,s,o,a,c,l,h){super(e,t,i,r,s,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Mh extends Lt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new Xc(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Ht}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new Ji(5,5,5),s=new mn({name:"CubemapFromEquirect",uniforms:Ei(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:At,blending:En});s.uniforms.tEquirect.value=t;const o=new Zt(r,s),a=t.minFilter;return t.minFilter===kn&&(t.minFilter=Ht),new Sh(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,r);e.setRenderTarget(s)}}class Mr extends Ft{constructor(){super(),this.isGroup=!0,this.type="Group"}}const yh={type:"move"};class xs{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Mr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Mr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new H,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new H),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Mr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new H,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new H),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(const g of e.hand.values()){const m=t.getJointPose(g,i),p=this._getHandJoint(l,g);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],f=h.position.distanceTo(u.position),d=.02,_=.005;l.inputState.pinching&&f>d+_?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=d-_&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(yh)))}return a!==null&&(a.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Mr;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class Eh extends Ft{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new pn,this.environmentIntensity=1,this.environmentRotation=new pn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Ss=new H,Th=new H,bh=new Pe;class In{constructor(e=new H(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Ss.subVectors(i,t).cross(Th.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Ss),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||bh.getNormalMatrix(e),r=this.coplanarPoint(Ss).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ln=new Po,yr=new H;class qc{constructor(e=new In,t=new In,i=new In,r=new In,s=new In,o=new In){this.planes=[e,t,i,r,s,o]}set(e,t,i,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=hn){const i=this.planes,r=e.elements,s=r[0],o=r[1],a=r[2],c=r[3],l=r[4],h=r[5],u=r[6],f=r[7],d=r[8],_=r[9],g=r[10],m=r[11],p=r[12],T=r[13],y=r[14],S=r[15];if(i[0].setComponents(c-s,f-l,m-d,S-p).normalize(),i[1].setComponents(c+s,f+l,m+d,S+p).normalize(),i[2].setComponents(c+o,f+h,m+_,S+T).normalize(),i[3].setComponents(c-o,f-h,m-_,S-T).normalize(),i[4].setComponents(c-a,f-u,m-g,S-y).normalize(),t===hn)i[5].setComponents(c+a,f+u,m+g,S+y).normalize();else if(t===Hr)i[5].setComponents(a,u,g,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ln.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ln.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ln)}intersectsSprite(e){return Ln.center.set(0,0,0),Ln.radius=.7071067811865476,Ln.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ln)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(yr.x=r.normal.x>0?e.max.x:e.min.x,yr.y=r.normal.y>0?e.max.y:e.min.y,yr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(yr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Yc extends wt{constructor(e,t,i=Vn,r,s,o,a=It,c=It,l,h=Gi){if(h!==Gi&&h!==Vi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");super(null,r,s,o,a,c,h,i,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Co(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Qi extends Wn{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(i),c=Math.floor(r),l=a+1,h=c+1,u=e/a,f=t/c,d=[],_=[],g=[],m=[];for(let p=0;p<h;p++){const T=p*f-o;for(let y=0;y<l;y++){const S=y*u-s;_.push(S,-T,0),g.push(0,0,1),m.push(y/a),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let T=0;T<a;T++){const y=T+l*p,S=T+l*(p+1),L=T+1+l*(p+1),w=T+1+l*p;d.push(y,S,w),d.push(S,L,w)}this.setIndex(d),this.setAttribute("position",new Hn(_,3)),this.setAttribute("normal",new Hn(g,3)),this.setAttribute("uv",new Hn(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Qi(e.width,e.height,e.widthSegments,e.heightSegments)}}class Ah extends Yr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Su,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class wh extends Yr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class jc extends Wc{constructor(e=-1,t=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,o=i+e,a=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,o=s+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Rh extends Yt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e,this.index=0}}class Ch{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Ta(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=Ta();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function Ta(){return performance.now()}function ba(n,e,t,i){const r=Ph(i);switch(t){case Rc:return n*e;case Pc:return n*e;case Lc:return n*e*2;case Dc:return n*e/r.components*r.byteLength;case bo:return n*e/r.components*r.byteLength;case Uc:return n*e*2/r.components*r.byteLength;case Ao:return n*e*2/r.components*r.byteLength;case Cc:return n*e*3/r.components*r.byteLength;case Ut:return n*e*4/r.components*r.byteLength;case wo:return n*e*4/r.components*r.byteLength;case Pr:case Lr:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Dr:case Ur:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Ws:case qs:return Math.max(n,16)*Math.max(e,8)/4;case Vs:case Xs:return Math.max(n,8)*Math.max(e,8)/2;case Ys:case js:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case $s:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Ks:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Zs:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Js:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Qs:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case eo:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case to:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case no:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case io:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case ro:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case so:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case oo:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case ao:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case co:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case lo:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Ir:case uo:case ho:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Ic:case fo:return Math.ceil(n/4)*Math.ceil(e/4)*8;case po:case mo:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ph(n){switch(n){case tn:case bc:return{byteLength:1,components:1};case ki:case Ac:case $i:return{byteLength:2,components:1};case Eo:case To:return{byteLength:2,components:4};case Vn:case yo:case Kt:return{byteLength:4,components:1};case wc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Mo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Mo);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function $c(){let n=null,e=!1,t=null,i=null;function r(s,o){t(s,o),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function Lh(n){const e=new WeakMap;function t(a,c){const l=a.array,h=a.usage,u=l.byteLength,f=n.createBuffer();n.bindBuffer(c,f),n.bufferData(c,l,h),a.onUploadCallback();let d;if(l instanceof Float32Array)d=n.FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?d=n.HALF_FLOAT:d=n.UNSIGNED_SHORT;else if(l instanceof Int16Array)d=n.SHORT;else if(l instanceof Uint32Array)d=n.UNSIGNED_INT;else if(l instanceof Int32Array)d=n.INT;else if(l instanceof Int8Array)d=n.BYTE;else if(l instanceof Uint8Array)d=n.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)d=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:d,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,c,l){const h=c.array,u=c.updateRanges;if(n.bindBuffer(l,a),u.length===0)n.bufferSubData(l,0,h);else{u.sort((d,_)=>d.start-_.start);let f=0;for(let d=1;d<u.length;d++){const _=u[f],g=u[d];g.start<=_.start+_.count+1?_.count=Math.max(_.count,g.start+g.count-_.start):(++f,u[f]=g)}u.length=f+1;for(let d=0,_=u.length;d<_;d++){const g=u[d];n.bufferSubData(l,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);c&&(n.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=e.get(a);if(l===void 0)e.set(a,t(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,a,c),l.version=a.version}}return{get:r,remove:s,update:o}}var Dh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Uh=`#ifdef USE_ALPHAHASH
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
#endif`,Ih=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Fh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Nh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Oh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Bh=`#ifdef USE_AOMAP
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
#endif`,zh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,kh=`#ifdef USE_BATCHING
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
#endif`,Hh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Gh=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Vh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Wh=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Xh=`#ifdef USE_IRIDESCENCE
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
#endif`,qh=`#ifdef USE_BUMPMAP
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
#endif`,Yh=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,jh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,$h=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Kh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Zh=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Jh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Qh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,ef=`#if defined( USE_COLOR_ALPHA )
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
#endif`,tf=`#define PI 3.141592653589793
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
} // validated`,nf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,rf=`vec3 transformedNormal = objectNormal;
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
#endif`,sf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,of=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,af=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,cf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,lf="gl_FragColor = linearToOutputTexel( gl_FragColor );",uf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,hf=`#ifdef USE_ENVMAP
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
#endif`,ff=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,df=`#ifdef USE_ENVMAP
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
#endif`,pf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,mf=`#ifdef USE_ENVMAP
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
#endif`,_f=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,gf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,vf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,xf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Sf=`#ifdef USE_GRADIENTMAP
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
}`,Mf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,yf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ef=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Tf=`uniform bool receiveShadow;
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
#endif`,bf=`#ifdef USE_ENVMAP
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
#endif`,Af=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,wf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Rf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Cf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Pf=`PhysicalMaterial material;
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
#endif`,Lf=`struct PhysicalMaterial {
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
}`,Df=`
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
#endif`,Uf=`#if defined( RE_IndirectDiffuse )
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
#endif`,If=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ff=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Nf=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Of=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Bf=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,zf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,kf=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Hf=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Gf=`#if defined( USE_POINTS_UV )
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
#endif`,Vf=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Wf=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Xf=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,qf=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Yf=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,jf=`#ifdef USE_MORPHTARGETS
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
#endif`,$f=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Kf=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Zf=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Jf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Qf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ed=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,td=`#ifdef USE_NORMALMAP
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
#endif`,nd=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,id=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,rd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,od=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ad=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,cd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ld=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ud=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,fd=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,dd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,pd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,md=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,_d=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,gd=`float getShadowMask() {
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
}`,vd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,xd=`#ifdef USE_SKINNING
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
#endif`,Sd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Md=`#ifdef USE_SKINNING
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
#endif`,yd=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Ed=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Td=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,bd=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Ad=`#ifdef USE_TRANSMISSION
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
#endif`,wd=`#ifdef USE_TRANSMISSION
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
#endif`,Rd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Cd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Pd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Ld=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Dd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Ud=`uniform sampler2D t2D;
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
}`,Id=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Fd=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Nd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Od=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Bd=`#include <common>
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
}`,zd=`#if DEPTH_PACKING == 3200
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
}`,kd=`#define DISTANCE
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
}`,Hd=`#define DISTANCE
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
}`,Gd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Vd=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wd=`uniform float scale;
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
}`,Xd=`uniform vec3 diffuse;
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
}`,qd=`#include <common>
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
}`,Yd=`uniform vec3 diffuse;
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
}`,jd=`#define LAMBERT
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
}`,$d=`#define LAMBERT
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
}`,Kd=`#define MATCAP
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
}`,Zd=`#define MATCAP
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
}`,Jd=`#define NORMAL
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
}`,Qd=`#define NORMAL
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
}`,ep=`#define PHONG
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
}`,tp=`#define PHONG
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
}`,np=`#define STANDARD
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
}`,ip=`#define STANDARD
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
}`,rp=`#define TOON
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
}`,sp=`#define TOON
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
}`,op=`uniform float size;
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
}`,ap=`uniform vec3 diffuse;
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
}`,cp=`#include <common>
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
}`,lp=`uniform vec3 color;
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
}`,up=`uniform float rotation;
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
}`,hp=`uniform vec3 diffuse;
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
}`,Ue={alphahash_fragment:Dh,alphahash_pars_fragment:Uh,alphamap_fragment:Ih,alphamap_pars_fragment:Fh,alphatest_fragment:Nh,alphatest_pars_fragment:Oh,aomap_fragment:Bh,aomap_pars_fragment:zh,batching_pars_vertex:kh,batching_vertex:Hh,begin_vertex:Gh,beginnormal_vertex:Vh,bsdfs:Wh,iridescence_fragment:Xh,bumpmap_pars_fragment:qh,clipping_planes_fragment:Yh,clipping_planes_pars_fragment:jh,clipping_planes_pars_vertex:$h,clipping_planes_vertex:Kh,color_fragment:Zh,color_pars_fragment:Jh,color_pars_vertex:Qh,color_vertex:ef,common:tf,cube_uv_reflection_fragment:nf,defaultnormal_vertex:rf,displacementmap_pars_vertex:sf,displacementmap_vertex:of,emissivemap_fragment:af,emissivemap_pars_fragment:cf,colorspace_fragment:lf,colorspace_pars_fragment:uf,envmap_fragment:hf,envmap_common_pars_fragment:ff,envmap_pars_fragment:df,envmap_pars_vertex:pf,envmap_physical_pars_fragment:bf,envmap_vertex:mf,fog_vertex:_f,fog_pars_vertex:gf,fog_fragment:vf,fog_pars_fragment:xf,gradientmap_pars_fragment:Sf,lightmap_pars_fragment:Mf,lights_lambert_fragment:yf,lights_lambert_pars_fragment:Ef,lights_pars_begin:Tf,lights_toon_fragment:Af,lights_toon_pars_fragment:wf,lights_phong_fragment:Rf,lights_phong_pars_fragment:Cf,lights_physical_fragment:Pf,lights_physical_pars_fragment:Lf,lights_fragment_begin:Df,lights_fragment_maps:Uf,lights_fragment_end:If,logdepthbuf_fragment:Ff,logdepthbuf_pars_fragment:Nf,logdepthbuf_pars_vertex:Of,logdepthbuf_vertex:Bf,map_fragment:zf,map_pars_fragment:kf,map_particle_fragment:Hf,map_particle_pars_fragment:Gf,metalnessmap_fragment:Vf,metalnessmap_pars_fragment:Wf,morphinstance_vertex:Xf,morphcolor_vertex:qf,morphnormal_vertex:Yf,morphtarget_pars_vertex:jf,morphtarget_vertex:$f,normal_fragment_begin:Kf,normal_fragment_maps:Zf,normal_pars_fragment:Jf,normal_pars_vertex:Qf,normal_vertex:ed,normalmap_pars_fragment:td,clearcoat_normal_fragment_begin:nd,clearcoat_normal_fragment_maps:id,clearcoat_pars_fragment:rd,iridescence_pars_fragment:sd,opaque_fragment:od,packing:ad,premultiplied_alpha_fragment:cd,project_vertex:ld,dithering_fragment:ud,dithering_pars_fragment:hd,roughnessmap_fragment:fd,roughnessmap_pars_fragment:dd,shadowmap_pars_fragment:pd,shadowmap_pars_vertex:md,shadowmap_vertex:_d,shadowmask_pars_fragment:gd,skinbase_vertex:vd,skinning_pars_vertex:xd,skinning_vertex:Sd,skinnormal_vertex:Md,specularmap_fragment:yd,specularmap_pars_fragment:Ed,tonemapping_fragment:Td,tonemapping_pars_fragment:bd,transmission_fragment:Ad,transmission_pars_fragment:wd,uv_pars_fragment:Rd,uv_pars_vertex:Cd,uv_vertex:Pd,worldpos_vertex:Ld,background_vert:Dd,background_frag:Ud,backgroundCube_vert:Id,backgroundCube_frag:Fd,cube_vert:Nd,cube_frag:Od,depth_vert:Bd,depth_frag:zd,distanceRGBA_vert:kd,distanceRGBA_frag:Hd,equirect_vert:Gd,equirect_frag:Vd,linedashed_vert:Wd,linedashed_frag:Xd,meshbasic_vert:qd,meshbasic_frag:Yd,meshlambert_vert:jd,meshlambert_frag:$d,meshmatcap_vert:Kd,meshmatcap_frag:Zd,meshnormal_vert:Jd,meshnormal_frag:Qd,meshphong_vert:ep,meshphong_frag:tp,meshphysical_vert:np,meshphysical_frag:ip,meshtoon_vert:rp,meshtoon_frag:sp,points_vert:op,points_frag:ap,shadow_vert:cp,shadow_frag:lp,sprite_vert:up,sprite_frag:hp},ae={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Pe},alphaMap:{value:null},alphaMapTransform:{value:new Pe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Pe}},envmap:{envMap:{value:null},envMapRotation:{value:new Pe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Pe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Pe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Pe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Pe},normalScale:{value:new Ge(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Pe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Pe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Pe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Pe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Pe},alphaTest:{value:0},uvTransform:{value:new Pe}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new Ge(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Pe},alphaMap:{value:null},alphaMapTransform:{value:new Pe},alphaTest:{value:0}}},$t={basic:{uniforms:yt([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.fog]),vertexShader:Ue.meshbasic_vert,fragmentShader:Ue.meshbasic_frag},lambert:{uniforms:yt([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,ae.lights,{emissive:{value:new je(0)}}]),vertexShader:Ue.meshlambert_vert,fragmentShader:Ue.meshlambert_frag},phong:{uniforms:yt([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,ae.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30}}]),vertexShader:Ue.meshphong_vert,fragmentShader:Ue.meshphong_frag},standard:{uniforms:yt([ae.common,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.roughnessmap,ae.metalnessmap,ae.fog,ae.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ue.meshphysical_vert,fragmentShader:Ue.meshphysical_frag},toon:{uniforms:yt([ae.common,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.gradientmap,ae.fog,ae.lights,{emissive:{value:new je(0)}}]),vertexShader:Ue.meshtoon_vert,fragmentShader:Ue.meshtoon_frag},matcap:{uniforms:yt([ae.common,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,{matcap:{value:null}}]),vertexShader:Ue.meshmatcap_vert,fragmentShader:Ue.meshmatcap_frag},points:{uniforms:yt([ae.points,ae.fog]),vertexShader:Ue.points_vert,fragmentShader:Ue.points_frag},dashed:{uniforms:yt([ae.common,ae.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ue.linedashed_vert,fragmentShader:Ue.linedashed_frag},depth:{uniforms:yt([ae.common,ae.displacementmap]),vertexShader:Ue.depth_vert,fragmentShader:Ue.depth_frag},normal:{uniforms:yt([ae.common,ae.bumpmap,ae.normalmap,ae.displacementmap,{opacity:{value:1}}]),vertexShader:Ue.meshnormal_vert,fragmentShader:Ue.meshnormal_frag},sprite:{uniforms:yt([ae.sprite,ae.fog]),vertexShader:Ue.sprite_vert,fragmentShader:Ue.sprite_frag},background:{uniforms:{uvTransform:{value:new Pe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ue.background_vert,fragmentShader:Ue.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Pe}},vertexShader:Ue.backgroundCube_vert,fragmentShader:Ue.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ue.cube_vert,fragmentShader:Ue.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ue.equirect_vert,fragmentShader:Ue.equirect_frag},distanceRGBA:{uniforms:yt([ae.common,ae.displacementmap,{referencePosition:{value:new H},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ue.distanceRGBA_vert,fragmentShader:Ue.distanceRGBA_frag},shadow:{uniforms:yt([ae.lights,ae.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:Ue.shadow_vert,fragmentShader:Ue.shadow_frag}};$t.physical={uniforms:yt([$t.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Pe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Pe},clearcoatNormalScale:{value:new Ge(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Pe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Pe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Pe},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Pe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Pe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Pe},transmissionSamplerSize:{value:new Ge},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Pe},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Pe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Pe},anisotropyVector:{value:new Ge},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Pe}}]),vertexShader:Ue.meshphysical_vert,fragmentShader:Ue.meshphysical_frag};const Er={r:0,b:0,g:0},Dn=new pn,fp=new at;function dp(n,e,t,i,r,s,o){const a=new je(0);let c=s===!0?0:1,l,h,u=null,f=0,d=null;function _(y){let S=y.isScene===!0?y.background:null;return S&&S.isTexture&&(S=(y.backgroundBlurriness>0?t:e).get(S)),S}function g(y){let S=!1;const L=_(y);L===null?p(a,c):L&&L.isColor&&(p(L,1),S=!0);const w=n.xr.getEnvironmentBlendMode();w==="additive"?i.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||S)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(y,S){const L=_(S);L&&(L.isCubeTexture||L.mapping===qr)?(h===void 0&&(h=new Zt(new Ji(1,1,1),new mn({name:"BackgroundCubeMaterial",uniforms:Ei($t.backgroundCube.uniforms),vertexShader:$t.backgroundCube.vertexShader,fragmentShader:$t.backgroundCube.fragmentShader,side:At,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(w,b,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),Dn.copy(S.backgroundRotation),Dn.x*=-1,Dn.y*=-1,Dn.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1&&(Dn.y*=-1,Dn.z*=-1),h.material.uniforms.envMap.value=L,h.material.uniforms.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(fp.makeRotationFromEuler(Dn)),h.material.toneMapped=We.getTransfer(L.colorSpace)!==Ke,(u!==L||f!==L.version||d!==n.toneMapping)&&(h.material.needsUpdate=!0,u=L,f=L.version,d=n.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):L&&L.isTexture&&(l===void 0&&(l=new Zt(new Qi(2,2),new mn({name:"BackgroundMaterial",uniforms:Ei($t.background.uniforms),vertexShader:$t.background.vertexShader,fragmentShader:$t.background.fragmentShader,side:bn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=L,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.toneMapped=We.getTransfer(L.colorSpace)!==Ke,L.matrixAutoUpdate===!0&&L.updateMatrix(),l.material.uniforms.uvTransform.value.copy(L.matrix),(u!==L||f!==L.version||d!==n.toneMapping)&&(l.material.needsUpdate=!0,u=L,f=L.version,d=n.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,S){y.getRGB(Er,Vc(n)),i.buffers.color.setClear(Er.r,Er.g,Er.b,S,o)}function T(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,S=1){a.set(y),c=S,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,p(a,c)},render:g,addToRenderList:m,dispose:T}}function pp(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=f(null);let s=r,o=!1;function a(x,A,D,I,k){let W=!1;const B=u(I,D,A);s!==B&&(s=B,l(s.object)),W=d(x,I,D,k),W&&_(x,I,D,k),k!==null&&e.update(k,n.ELEMENT_ARRAY_BUFFER),(W||o)&&(o=!1,S(x,A,D,I),k!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(k).buffer))}function c(){return n.createVertexArray()}function l(x){return n.bindVertexArray(x)}function h(x){return n.deleteVertexArray(x)}function u(x,A,D){const I=D.wireframe===!0;let k=i[x.id];k===void 0&&(k={},i[x.id]=k);let W=k[A.id];W===void 0&&(W={},k[A.id]=W);let B=W[I];return B===void 0&&(B=f(c()),W[I]=B),B}function f(x){const A=[],D=[],I=[];for(let k=0;k<t;k++)A[k]=0,D[k]=0,I[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:D,attributeDivisors:I,object:x,attributes:{},index:null}}function d(x,A,D,I){const k=s.attributes,W=A.attributes;let B=0;const j=D.getAttributes();for(const G in j)if(j[G].location>=0){const re=k[G];let me=W[G];if(me===void 0&&(G==="instanceMatrix"&&x.instanceMatrix&&(me=x.instanceMatrix),G==="instanceColor"&&x.instanceColor&&(me=x.instanceColor)),re===void 0||re.attribute!==me||me&&re.data!==me.data)return!0;B++}return s.attributesNum!==B||s.index!==I}function _(x,A,D,I){const k={},W=A.attributes;let B=0;const j=D.getAttributes();for(const G in j)if(j[G].location>=0){let re=W[G];re===void 0&&(G==="instanceMatrix"&&x.instanceMatrix&&(re=x.instanceMatrix),G==="instanceColor"&&x.instanceColor&&(re=x.instanceColor));const me={};me.attribute=re,re&&re.data&&(me.data=re.data),k[G]=me,B++}s.attributes=k,s.attributesNum=B,s.index=I}function g(){const x=s.newAttributes;for(let A=0,D=x.length;A<D;A++)x[A]=0}function m(x){p(x,0)}function p(x,A){const D=s.newAttributes,I=s.enabledAttributes,k=s.attributeDivisors;D[x]=1,I[x]===0&&(n.enableVertexAttribArray(x),I[x]=1),k[x]!==A&&(n.vertexAttribDivisor(x,A),k[x]=A)}function T(){const x=s.newAttributes,A=s.enabledAttributes;for(let D=0,I=A.length;D<I;D++)A[D]!==x[D]&&(n.disableVertexAttribArray(D),A[D]=0)}function y(x,A,D,I,k,W,B){B===!0?n.vertexAttribIPointer(x,A,D,k,W):n.vertexAttribPointer(x,A,D,I,k,W)}function S(x,A,D,I){g();const k=I.attributes,W=D.getAttributes(),B=A.defaultAttributeValues;for(const j in W){const G=W[j];if(G.location>=0){let J=k[j];if(J===void 0&&(j==="instanceMatrix"&&x.instanceMatrix&&(J=x.instanceMatrix),j==="instanceColor"&&x.instanceColor&&(J=x.instanceColor)),J!==void 0){const re=J.normalized,me=J.itemSize,we=e.get(J);if(we===void 0)continue;const Ie=we.buffer,K=we.type,se=we.bytesPerElement,_e=K===n.INT||K===n.UNSIGNED_INT||J.gpuType===yo;if(J.isInterleavedBufferAttribute){const oe=J.data,Ee=oe.stride,ke=J.offset;if(oe.isInstancedInterleavedBuffer){for(let Te=0;Te<G.locationSize;Te++)p(G.location+Te,oe.meshPerAttribute);x.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=oe.meshPerAttribute*oe.count)}else for(let Te=0;Te<G.locationSize;Te++)m(G.location+Te);n.bindBuffer(n.ARRAY_BUFFER,Ie);for(let Te=0;Te<G.locationSize;Te++)y(G.location+Te,me/G.locationSize,K,re,Ee*se,(ke+me/G.locationSize*Te)*se,_e)}else{if(J.isInstancedBufferAttribute){for(let oe=0;oe<G.locationSize;oe++)p(G.location+oe,J.meshPerAttribute);x.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let oe=0;oe<G.locationSize;oe++)m(G.location+oe);n.bindBuffer(n.ARRAY_BUFFER,Ie);for(let oe=0;oe<G.locationSize;oe++)y(G.location+oe,me/G.locationSize,K,re,me*se,me/G.locationSize*oe*se,_e)}}else if(B!==void 0){const re=B[j];if(re!==void 0)switch(re.length){case 2:n.vertexAttrib2fv(G.location,re);break;case 3:n.vertexAttrib3fv(G.location,re);break;case 4:n.vertexAttrib4fv(G.location,re);break;default:n.vertexAttrib1fv(G.location,re)}}}}T()}function L(){P();for(const x in i){const A=i[x];for(const D in A){const I=A[D];for(const k in I)h(I[k].object),delete I[k];delete A[D]}delete i[x]}}function w(x){if(i[x.id]===void 0)return;const A=i[x.id];for(const D in A){const I=A[D];for(const k in I)h(I[k].object),delete I[k];delete A[D]}delete i[x.id]}function b(x){for(const A in i){const D=i[A];if(D[x.id]===void 0)continue;const I=D[x.id];for(const k in I)h(I[k].object),delete I[k];delete D[x.id]}}function P(){v(),o=!0,s!==r&&(s=r,l(s.object))}function v(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:P,resetDefaultState:v,dispose:L,releaseStatesOfGeometry:w,releaseStatesOfProgram:b,initAttributes:g,enableAttribute:m,disableUnusedAttributes:T}}function mp(n,e,t){let i;function r(l){i=l}function s(l,h){n.drawArrays(i,l,h),t.update(h,i,1)}function o(l,h,u){u!==0&&(n.drawArraysInstanced(i,l,h,u),t.update(h,i,u))}function a(l,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,h,0,u);let d=0;for(let _=0;_<u;_++)d+=h[_];t.update(d,i,1)}function c(l,h,u,f){if(u===0)return;const d=e.get("WEBGL_multi_draw");if(d===null)for(let _=0;_<l.length;_++)o(l[_],h[_],f[_]);else{d.multiDrawArraysInstancedWEBGL(i,l,0,h,0,f,0,u);let _=0;for(let g=0;g<u;g++)_+=h[g]*f[g];t.update(_,i,1)}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function _p(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const b=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(b.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(b){return!(b!==Ut&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(b){const P=b===$i&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(b!==tn&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&b!==Kt&&!P)}function c(b){if(b==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";b="mediump"}return b==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const u=t.logarithmicDepthBuffer===!0,f=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),d=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),_=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),p=n.getParameter(n.MAX_VERTEX_ATTRIBS),T=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),y=n.getParameter(n.MAX_VARYING_VECTORS),S=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),L=_>0,w=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:u,reverseDepthBuffer:f,maxTextures:d,maxVertexTextures:_,maxTextureSize:g,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:T,maxVaryings:y,maxFragmentUniforms:S,vertexTextures:L,maxSamples:w}}function gp(n){const e=this;let t=null,i=0,r=!1,s=!1;const o=new In,a=new Pe,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const d=u.length!==0||f||i!==0||r;return r=f,i=u.length,d},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,d){const _=u.clippingPlanes,g=u.clipIntersection,m=u.clipShadows,p=n.get(u);if(!r||_===null||_.length===0||s&&!m)s?h(null):l();else{const T=s?0:i,y=T*4;let S=p.clippingState||null;c.value=S,S=h(_,f,y,d);for(let L=0;L!==y;++L)S[L]=t[L];p.clippingState=S,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=T}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(u,f,d,_){const g=u!==null?u.length:0;let m=null;if(g!==0){if(m=c.value,_!==!0||m===null){const p=d+g*4,T=f.matrixWorldInverse;a.getNormalMatrix(T),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,S=d;y!==g;++y,S+=4)o.copy(u[y]).applyMatrix4(T,a),o.normal.toArray(m,S),m[S+3]=o.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=g,e.numIntersection=0,m}}function vp(n){let e=new WeakMap;function t(o,a){return a===zs?o.mapping=Si:a===ks&&(o.mapping=Mi),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===zs||a===ks)if(e.has(o)){const c=e.get(o).texture;return t(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new Mh(c.height);return l.fromEquirectangularTexture(n,o),e.set(o,l),o.addEventListener("dispose",r),t(l.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}const _i=4,Aa=[.125,.215,.35,.446,.526,.582],On=20,Ms=new jc,wa=new je;let ys=null,Es=0,Ts=0,bs=!1;const Fn=(1+Math.sqrt(5))/2,ai=1/Fn,Ra=[new H(-Fn,ai,0),new H(Fn,ai,0),new H(-ai,0,Fn),new H(ai,0,Fn),new H(0,Fn,-ai),new H(0,Fn,ai),new H(-1,1,-1),new H(1,1,-1),new H(-1,1,1),new H(1,1,1)],xp=new H;class Ca{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100,s={}){const{size:o=256,position:a=xp}=s;ys=this._renderer.getRenderTarget(),Es=this._renderer.getActiveCubeFace(),Ts=this._renderer.getActiveMipmapLevel(),bs=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,i,r,c,a),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Da(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=La(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(ys,Es,Ts),this._renderer.xr.enabled=bs,e.scissorTest=!1,Tr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Si||e.mapping===Mi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ys=this._renderer.getRenderTarget(),Es=this._renderer.getActiveCubeFace(),Ts=this._renderer.getActiveMipmapLevel(),bs=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Ht,minFilter:Ht,generateMipmaps:!1,type:$i,format:Ut,colorSpace:yi,depthBuffer:!1},r=Pa(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Pa(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Sp(s)),this._blurMaterial=Mp(s,e,t)}return r}_compileMaterial(e){const t=new Zt(this._lodPlanes[0],e);this._renderer.compile(t,Ms)}_sceneToCubeUV(e,t,i,r,s){const c=new Yt(90,1,t,i),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,d=u.toneMapping;u.getClearColor(wa),u.toneMapping=Tn,u.autoClear=!1;const _=new kc({name:"PMREM.Background",side:At,depthWrite:!1,depthTest:!1}),g=new Zt(new Ji,_);let m=!1;const p=e.background;p?p.isColor&&(_.color.copy(p),e.background=null,m=!0):(_.color.copy(wa),m=!0);for(let T=0;T<6;T++){const y=T%3;y===0?(c.up.set(0,l[T],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+h[T],s.y,s.z)):y===1?(c.up.set(0,0,l[T]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+h[T],s.z)):(c.up.set(0,l[T],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+h[T]));const S=this._cubeSize;Tr(r,y*S,T>2?S:0,S,S),u.setRenderTarget(r),m&&u.render(g,c),u.render(e,c)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=d,u.autoClear=f,e.background=p}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===Si||e.mapping===Mi;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Da()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=La());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new Zt(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const c=this._cubeSize;Tr(t,0,0,3*c,2*c),i.setRenderTarget(t),i.render(o,Ms)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=Ra[(r-s-1)%Ra.length];this._blur(e,s-1,s,o,a)}t.autoClear=i}_blur(e,t,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new Zt(this._lodPlanes[r],l),f=l.uniforms,d=this._sizeLods[i]-1,_=isFinite(s)?Math.PI/(2*d):2*Math.PI/(2*On-1),g=s/_,m=isFinite(s)?1+Math.floor(h*g):On;m>On&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${On}`);const p=[];let T=0;for(let b=0;b<On;++b){const P=b/g,v=Math.exp(-P*P/2);p.push(v),b===0?T+=v:b<m&&(T+=2*v)}for(let b=0;b<p.length;b++)p[b]=p[b]/T;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=p,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);const{_lodMax:y}=this;f.dTheta.value=_,f.mipInt.value=y-i;const S=this._sizeLods[r],L=3*S*(r>y-_i?r-y+_i:0),w=4*(this._cubeSize-S);Tr(t,L,w,3*S,2*S),c.setRenderTarget(t),c.render(u,Ms)}}function Sp(n){const e=[],t=[],i=[];let r=n;const s=n-_i+1+Aa.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);t.push(a);let c=1/a;o>n-_i?c=Aa[o-n+_i-1]:o===0&&(c=0),i.push(c);const l=1/(a-2),h=-l,u=1+l,f=[h,h,u,h,u,u,h,h,u,u,h,u],d=6,_=6,g=3,m=2,p=1,T=new Float32Array(g*_*d),y=new Float32Array(m*_*d),S=new Float32Array(p*_*d);for(let w=0;w<d;w++){const b=w%3*2/3-1,P=w>2?0:-1,v=[b,P,0,b+2/3,P,0,b+2/3,P+1,0,b,P,0,b+2/3,P+1,0,b,P+1,0];T.set(v,g*_*w),y.set(f,m*_*w);const x=[w,w,w,w,w,w];S.set(x,p*_*w)}const L=new Wn;L.setAttribute("position",new Jt(T,g)),L.setAttribute("uv",new Jt(y,m)),L.setAttribute("faceIndex",new Jt(S,p)),e.push(L),r>_i&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function Pa(n,e,t){const i=new Lt(n,e,t);return i.texture.mapping=qr,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Tr(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Mp(n,e,t){const i=new Float32Array(On),r=new H(0,1,0);return new mn({name:"SphericalGaussianBlur",defines:{n:On,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Lo(),fragmentShader:`

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
		`,blending:En,depthTest:!1,depthWrite:!1})}function La(){return new mn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Lo(),fragmentShader:`

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
		`,blending:En,depthTest:!1,depthWrite:!1})}function Da(){return new mn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Lo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function Lo(){return`

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
	`}function yp(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const c=a.mapping,l=c===zs||c===ks,h=c===Si||c===Mi;if(l||h){let u=e.get(a);const f=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==f)return t===null&&(t=new Ca(n)),u=l?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const d=a.image;return l&&d&&d.height>0||h&&d&&r(d)?(t===null&&(t=new Ca(n)),u=l?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",s),u.texture):null}}}return a}function r(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function s(a){const c=a.target;c.removeEventListener("dispose",s);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function Ep(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&Fr("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function Tp(n,e,t,i){const r={},s=new WeakMap;function o(u){const f=u.target;f.index!==null&&e.remove(f.index);for(const _ in f.attributes)e.remove(f.attributes[_]);f.removeEventListener("dispose",o),delete r[f.id];const d=s.get(f);d&&(e.remove(d),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function a(u,f){return r[f.id]===!0||(f.addEventListener("dispose",o),r[f.id]=!0,t.memory.geometries++),f}function c(u){const f=u.attributes;for(const d in f)e.update(f[d],n.ARRAY_BUFFER)}function l(u){const f=[],d=u.index,_=u.attributes.position;let g=0;if(d!==null){const T=d.array;g=d.version;for(let y=0,S=T.length;y<S;y+=3){const L=T[y+0],w=T[y+1],b=T[y+2];f.push(L,w,w,b,b,L)}}else if(_!==void 0){const T=_.array;g=_.version;for(let y=0,S=T.length/3-1;y<S;y+=3){const L=y+0,w=y+1,b=y+2;f.push(L,w,w,b,b,L)}}else return;const m=new(Nc(f)?Gc:Hc)(f,1);m.version=g;const p=s.get(u);p&&e.remove(p),s.set(u,m)}function h(u){const f=s.get(u);if(f){const d=u.index;d!==null&&f.version<d.version&&l(u)}else l(u);return s.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function bp(n,e,t){let i;function r(f){i=f}let s,o;function a(f){s=f.type,o=f.bytesPerElement}function c(f,d){n.drawElements(i,d,s,f*o),t.update(d,i,1)}function l(f,d,_){_!==0&&(n.drawElementsInstanced(i,d,s,f*o,_),t.update(d,i,_))}function h(f,d,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,s,f,0,_);let m=0;for(let p=0;p<_;p++)m+=d[p];t.update(m,i,1)}function u(f,d,_,g){if(_===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<f.length;p++)l(f[p]/o,d[p],g[p]);else{m.multiDrawElementsInstancedWEBGL(i,d,0,s,f,0,g,0,_);let p=0;for(let T=0;T<_;T++)p+=d[T]*g[T];t.update(p,i,1)}}this.setMode=r,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Ap(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(s/3);break;case n.LINES:t.lines+=a*(s/2);break;case n.LINE_STRIP:t.lines+=a*(s-1);break;case n.LINE_LOOP:t.lines+=a*s;break;case n.POINTS:t.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function wp(n,e,t){const i=new WeakMap,r=new rt;function s(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let f=i.get(a);if(f===void 0||f.count!==u){let v=function(){b.dispose(),i.delete(a),a.removeEventListener("dispose",v)};f!==void 0&&f.texture.dispose();const d=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],T=a.morphAttributes.color||[];let y=0;d===!0&&(y=1),_===!0&&(y=2),g===!0&&(y=3);let S=a.attributes.position.count*y,L=1;S>e.maxTextureSize&&(L=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);const w=new Float32Array(S*L*4*u),b=new Oc(w,S,L,u);b.type=Kt,b.needsUpdate=!0;const P=y*4;for(let x=0;x<u;x++){const A=m[x],D=p[x],I=T[x],k=S*L*4*x;for(let W=0;W<A.count;W++){const B=W*P;d===!0&&(r.fromBufferAttribute(A,W),w[k+B+0]=r.x,w[k+B+1]=r.y,w[k+B+2]=r.z,w[k+B+3]=0),_===!0&&(r.fromBufferAttribute(D,W),w[k+B+4]=r.x,w[k+B+5]=r.y,w[k+B+6]=r.z,w[k+B+7]=0),g===!0&&(r.fromBufferAttribute(I,W),w[k+B+8]=r.x,w[k+B+9]=r.y,w[k+B+10]=r.z,w[k+B+11]=I.itemSize===4?r.w:1)}}f={count:u,texture:b,size:new Ge(S,L)},i.set(a,f),a.addEventListener("dispose",v)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let d=0;for(let g=0;g<l.length;g++)d+=l[g];const _=a.morphTargetsRelative?1:1-d;c.getUniforms().setValue(n,"morphTargetBaseInfluence",_),c.getUniforms().setValue(n,"morphTargetInfluences",l)}c.getUniforms().setValue(n,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(n,"morphTargetsTextureSize",f.size)}return{update:s}}function Rp(n,e,t,i){let r=new WeakMap;function s(c){const l=i.render.frame,h=c.geometry,u=e.get(c,h);if(r.get(u)!==l&&(e.update(u),r.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),r.get(c)!==l&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==l&&(f.update(),r.set(f,l))}return u}function o(){r=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:o}}const Kc=new wt,Ua=new Yc(1,1),Zc=new Oc,Jc=new ih,Qc=new Xc,Ia=[],Fa=[],Na=new Float32Array(16),Oa=new Float32Array(9),Ba=new Float32Array(4);function Ri(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=Ia[r];if(s===void 0&&(s=new Float32Array(r),Ia[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(s,a)}return s}function lt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function ut(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function jr(n,e){let t=Fa[e];t===void 0&&(t=new Int32Array(e),Fa[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Cp(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Pp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(lt(t,e))return;n.uniform2fv(this.addr,e),ut(t,e)}}function Lp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(lt(t,e))return;n.uniform3fv(this.addr,e),ut(t,e)}}function Dp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(lt(t,e))return;n.uniform4fv(this.addr,e),ut(t,e)}}function Up(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(lt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),ut(t,e)}else{if(lt(t,i))return;Ba.set(i),n.uniformMatrix2fv(this.addr,!1,Ba),ut(t,i)}}function Ip(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(lt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),ut(t,e)}else{if(lt(t,i))return;Oa.set(i),n.uniformMatrix3fv(this.addr,!1,Oa),ut(t,i)}}function Fp(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(lt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),ut(t,e)}else{if(lt(t,i))return;Na.set(i),n.uniformMatrix4fv(this.addr,!1,Na),ut(t,i)}}function Np(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function Op(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(lt(t,e))return;n.uniform2iv(this.addr,e),ut(t,e)}}function Bp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(lt(t,e))return;n.uniform3iv(this.addr,e),ut(t,e)}}function zp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(lt(t,e))return;n.uniform4iv(this.addr,e),ut(t,e)}}function kp(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function Hp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(lt(t,e))return;n.uniform2uiv(this.addr,e),ut(t,e)}}function Gp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(lt(t,e))return;n.uniform3uiv(this.addr,e),ut(t,e)}}function Vp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(lt(t,e))return;n.uniform4uiv(this.addr,e),ut(t,e)}}function Wp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(Ua.compareFunction=Fc,s=Ua):s=Kc,t.setTexture2D(e||s,r)}function Xp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||Jc,r)}function qp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||Qc,r)}function Yp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||Zc,r)}function jp(n){switch(n){case 5126:return Cp;case 35664:return Pp;case 35665:return Lp;case 35666:return Dp;case 35674:return Up;case 35675:return Ip;case 35676:return Fp;case 5124:case 35670:return Np;case 35667:case 35671:return Op;case 35668:case 35672:return Bp;case 35669:case 35673:return zp;case 5125:return kp;case 36294:return Hp;case 36295:return Gp;case 36296:return Vp;case 35678:case 36198:case 36298:case 36306:case 35682:return Wp;case 35679:case 36299:case 36307:return Xp;case 35680:case 36300:case 36308:case 36293:return qp;case 36289:case 36303:case 36311:case 36292:return Yp}}function $p(n,e){n.uniform1fv(this.addr,e)}function Kp(n,e){const t=Ri(e,this.size,2);n.uniform2fv(this.addr,t)}function Zp(n,e){const t=Ri(e,this.size,3);n.uniform3fv(this.addr,t)}function Jp(n,e){const t=Ri(e,this.size,4);n.uniform4fv(this.addr,t)}function Qp(n,e){const t=Ri(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function em(n,e){const t=Ri(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function tm(n,e){const t=Ri(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function nm(n,e){n.uniform1iv(this.addr,e)}function im(n,e){n.uniform2iv(this.addr,e)}function rm(n,e){n.uniform3iv(this.addr,e)}function sm(n,e){n.uniform4iv(this.addr,e)}function om(n,e){n.uniform1uiv(this.addr,e)}function am(n,e){n.uniform2uiv(this.addr,e)}function cm(n,e){n.uniform3uiv(this.addr,e)}function lm(n,e){n.uniform4uiv(this.addr,e)}function um(n,e,t){const i=this.cache,r=e.length,s=jr(t,r);lt(i,s)||(n.uniform1iv(this.addr,s),ut(i,s));for(let o=0;o!==r;++o)t.setTexture2D(e[o]||Kc,s[o])}function hm(n,e,t){const i=this.cache,r=e.length,s=jr(t,r);lt(i,s)||(n.uniform1iv(this.addr,s),ut(i,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||Jc,s[o])}function fm(n,e,t){const i=this.cache,r=e.length,s=jr(t,r);lt(i,s)||(n.uniform1iv(this.addr,s),ut(i,s));for(let o=0;o!==r;++o)t.setTextureCube(e[o]||Qc,s[o])}function dm(n,e,t){const i=this.cache,r=e.length,s=jr(t,r);lt(i,s)||(n.uniform1iv(this.addr,s),ut(i,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||Zc,s[o])}function pm(n){switch(n){case 5126:return $p;case 35664:return Kp;case 35665:return Zp;case 35666:return Jp;case 35674:return Qp;case 35675:return em;case 35676:return tm;case 5124:case 35670:return nm;case 35667:case 35671:return im;case 35668:case 35672:return rm;case 35669:case 35673:return sm;case 5125:return om;case 36294:return am;case 36295:return cm;case 36296:return lm;case 35678:case 36198:case 36298:case 36306:case 35682:return um;case 35679:case 36299:case 36307:return hm;case 35680:case 36300:case 36308:case 36293:return fm;case 36289:case 36303:case 36311:case 36292:return dm}}class mm{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=jp(t.type)}}class _m{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=pm(t.type)}}class gm{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],i)}}}const As=/(\w+)(\])?(\[|\.)?/g;function za(n,e){n.seq.push(e),n.map[e.id]=e}function vm(n,e,t){const i=n.name,r=i.length;for(As.lastIndex=0;;){const s=As.exec(i),o=As.lastIndex;let a=s[1];const c=s[2]==="]",l=s[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===r){za(t,l===void 0?new mm(a,n,e):new _m(a,n,e));break}else{let u=t.map[a];u===void 0&&(u=new gm(a),za(t,u)),t=u}}}class Nr{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),o=e.getUniformLocation(t,s.name);vm(s,o,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],c=i[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&i.push(o)}return i}}function ka(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const xm=37297;let Sm=0;function Mm(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}const Ha=new Pe;function ym(n){We._getMatrix(Ha,We.workingColorSpace,n);const e=`mat3( ${Ha.elements.map(t=>t.toFixed(4))} )`;switch(We.getTransfer(n)){case kr:return[e,"LinearTransferOETF"];case Ke:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function Ga(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+Mm(n.getShaderSource(e),o)}else return r}function Em(n,e){const t=ym(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Tm(n,e){let t;switch(e){case fu:t="Linear";break;case du:t="Reinhard";break;case pu:t="Cineon";break;case mu:t="ACESFilmic";break;case gu:t="AgX";break;case vu:t="Neutral";break;case _u:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const br=new H;function bm(){We.getLuminanceCoefficients(br);const n=br.x.toFixed(4),e=br.y.toFixed(4),t=br.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Am(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Oi).join(`
`)}function wm(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Rm(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),o=s.name;let a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function Oi(n){return n!==""}function Va(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Wa(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Cm=/^[ \t]*#include +<([\w\d./]+)>/gm;function _o(n){return n.replace(Cm,Lm)}const Pm=new Map;function Lm(n,e){let t=Ue[e];if(t===void 0){const i=Pm.get(e);if(i!==void 0)t=Ue[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return _o(t)}const Dm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Xa(n){return n.replace(Dm,Um)}function Um(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function qa(n){let e=`precision ${n.precision} float;
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
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Im(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===yc?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===Xl?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===ln&&(e="SHADOWMAP_TYPE_VSM"),e}function Fm(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Si:case Mi:e="ENVMAP_TYPE_CUBE";break;case qr:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Nm(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Mi:e="ENVMAP_MODE_REFRACTION";break}return e}function Om(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Ec:e="ENVMAP_BLENDING_MULTIPLY";break;case uu:e="ENVMAP_BLENDING_MIX";break;case hu:e="ENVMAP_BLENDING_ADD";break}return e}function Bm(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function zm(n,e,t,i){const r=n.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const c=Im(t),l=Fm(t),h=Nm(t),u=Om(t),f=Bm(t),d=Am(t),_=wm(s),g=r.createProgram();let m,p,T=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(Oi).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(Oi).join(`
`),p.length>0&&(p+=`
`)):(m=[qa(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Oi).join(`
`),p=[qa(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Tn?"#define TONE_MAPPING":"",t.toneMapping!==Tn?Ue.tonemapping_pars_fragment:"",t.toneMapping!==Tn?Tm("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ue.colorspace_pars_fragment,Em("linearToOutputTexel",t.outputColorSpace),bm(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Oi).join(`
`)),o=_o(o),o=Va(o,t),o=Wa(o,t),a=_o(a),a=Va(a,t),a=Wa(a,t),o=Xa(o),a=Xa(a),t.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===sa?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===sa?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=T+m+o,S=T+p+a,L=ka(r,r.VERTEX_SHADER,y),w=ka(r,r.FRAGMENT_SHADER,S);r.attachShader(g,L),r.attachShader(g,w),t.index0AttributeName!==void 0?r.bindAttribLocation(g,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(g,0,"position"),r.linkProgram(g);function b(A){if(n.debug.checkShaderErrors){const D=r.getProgramInfoLog(g).trim(),I=r.getShaderInfoLog(L).trim(),k=r.getShaderInfoLog(w).trim();let W=!0,B=!0;if(r.getProgramParameter(g,r.LINK_STATUS)===!1)if(W=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,g,L,w);else{const j=Ga(r,L,"vertex"),G=Ga(r,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(g,r.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+D+`
`+j+`
`+G)}else D!==""?console.warn("THREE.WebGLProgram: Program Info Log:",D):(I===""||k==="")&&(B=!1);B&&(A.diagnostics={runnable:W,programLog:D,vertexShader:{log:I,prefix:m},fragmentShader:{log:k,prefix:p}})}r.deleteShader(L),r.deleteShader(w),P=new Nr(r,g),v=Rm(r,g)}let P;this.getUniforms=function(){return P===void 0&&b(this),P};let v;this.getAttributes=function(){return v===void 0&&b(this),v};let x=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return x===!1&&(x=r.getProgramParameter(g,xm)),x},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Sm++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=L,this.fragmentShader=w,this}let km=0;class Hm{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Gm(e),t.set(e,i)),i}}class Gm{constructor(e){this.id=km++,this.code=e,this.usedTimes=0}}function Vm(n,e,t,i,r,s,o){const a=new Bc,c=new Hm,l=new Set,h=[],u=r.logarithmicDepthBuffer,f=r.vertexTextures;let d=r.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(v){return l.add(v),v===0?"uv":`uv${v}`}function m(v,x,A,D,I){const k=D.fog,W=I.geometry,B=v.isMeshStandardMaterial?D.environment:null,j=(v.isMeshStandardMaterial?t:e).get(v.envMap||B),G=j&&j.mapping===qr?j.image.height:null,J=_[v.type];v.precision!==null&&(d=r.getMaxPrecision(v.precision),d!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));const re=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,me=re!==void 0?re.length:0;let we=0;W.morphAttributes.position!==void 0&&(we=1),W.morphAttributes.normal!==void 0&&(we=2),W.morphAttributes.color!==void 0&&(we=3);let Ie,K,se,_e;if(J){const Ye=$t[J];Ie=Ye.vertexShader,K=Ye.fragmentShader}else Ie=v.vertexShader,K=v.fragmentShader,c.update(v),se=c.getVertexShaderID(v),_e=c.getFragmentShaderID(v);const oe=n.getRenderTarget(),Ee=n.state.buffers.depth.getReversed(),ke=I.isInstancedMesh===!0,Te=I.isBatchedMesh===!0,$e=!!v.map,Qe=!!v.matcap,Ne=!!j,F=!!v.aoMap,Tt=!!v.lightMap,Oe=!!v.bumpMap,Fe=!!v.normalMap,ve=!!v.displacementMap,Ze=!!v.emissiveMap,xe=!!v.metalnessMap,C=!!v.roughnessMap,M=v.anisotropy>0,V=v.clearcoat>0,Q=v.dispersion>0,R=v.iridescence>0,U=v.sheen>0,Y=v.transmission>0,Z=M&&!!v.anisotropyMap,te=V&&!!v.clearcoatMap,be=V&&!!v.clearcoatNormalMap,ne=V&&!!v.clearcoatRoughnessMap,fe=R&&!!v.iridescenceMap,Ae=R&&!!v.iridescenceThicknessMap,Se=U&&!!v.sheenColorMap,de=U&&!!v.sheenRoughnessMap,ze=!!v.specularMap,De=!!v.specularColorMap,Je=!!v.specularIntensityMap,N=Y&&!!v.transmissionMap,le=Y&&!!v.thicknessMap,$=!!v.gradientMap,ee=!!v.alphaMap,he=v.alphaTest>0,ue=!!v.alphaHash,Le=!!v.extensions;let tt=Tn;v.toneMapped&&(oe===null||oe.isXRRenderTarget===!0)&&(tt=n.toneMapping);const dt={shaderID:J,shaderType:v.type,shaderName:v.name,vertexShader:Ie,fragmentShader:K,defines:v.defines,customVertexShaderID:se,customFragmentShaderID:_e,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:Te,batchingColor:Te&&I._colorsTexture!==null,instancing:ke,instancingColor:ke&&I.instanceColor!==null,instancingMorph:ke&&I.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:oe===null?n.outputColorSpace:oe.isXRRenderTarget===!0?oe.texture.colorSpace:yi,alphaToCoverage:!!v.alphaToCoverage,map:$e,matcap:Qe,envMap:Ne,envMapMode:Ne&&j.mapping,envMapCubeUVHeight:G,aoMap:F,lightMap:Tt,bumpMap:Oe,normalMap:Fe,displacementMap:f&&ve,emissiveMap:Ze,normalMapObjectSpace:Fe&&v.normalMapType===Eu,normalMapTangentSpace:Fe&&v.normalMapType===yu,metalnessMap:xe,roughnessMap:C,anisotropy:M,anisotropyMap:Z,clearcoat:V,clearcoatMap:te,clearcoatNormalMap:be,clearcoatRoughnessMap:ne,dispersion:Q,iridescence:R,iridescenceMap:fe,iridescenceThicknessMap:Ae,sheen:U,sheenColorMap:Se,sheenRoughnessMap:de,specularMap:ze,specularColorMap:De,specularIntensityMap:Je,transmission:Y,transmissionMap:N,thicknessMap:le,gradientMap:$,opaque:v.transparent===!1&&v.blending===gi&&v.alphaToCoverage===!1,alphaMap:ee,alphaTest:he,alphaHash:ue,combine:v.combine,mapUv:$e&&g(v.map.channel),aoMapUv:F&&g(v.aoMap.channel),lightMapUv:Tt&&g(v.lightMap.channel),bumpMapUv:Oe&&g(v.bumpMap.channel),normalMapUv:Fe&&g(v.normalMap.channel),displacementMapUv:ve&&g(v.displacementMap.channel),emissiveMapUv:Ze&&g(v.emissiveMap.channel),metalnessMapUv:xe&&g(v.metalnessMap.channel),roughnessMapUv:C&&g(v.roughnessMap.channel),anisotropyMapUv:Z&&g(v.anisotropyMap.channel),clearcoatMapUv:te&&g(v.clearcoatMap.channel),clearcoatNormalMapUv:be&&g(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ne&&g(v.clearcoatRoughnessMap.channel),iridescenceMapUv:fe&&g(v.iridescenceMap.channel),iridescenceThicknessMapUv:Ae&&g(v.iridescenceThicknessMap.channel),sheenColorMapUv:Se&&g(v.sheenColorMap.channel),sheenRoughnessMapUv:de&&g(v.sheenRoughnessMap.channel),specularMapUv:ze&&g(v.specularMap.channel),specularColorMapUv:De&&g(v.specularColorMap.channel),specularIntensityMapUv:Je&&g(v.specularIntensityMap.channel),transmissionMapUv:N&&g(v.transmissionMap.channel),thicknessMapUv:le&&g(v.thicknessMap.channel),alphaMapUv:ee&&g(v.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(Fe||M),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!W.attributes.uv&&($e||ee),fog:!!k,useFog:v.fog===!0,fogExp2:!!k&&k.isFogExp2,flatShading:v.flatShading===!0,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:Ee,skinning:I.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:me,morphTextureStride:we,numDirLights:x.directional.length,numPointLights:x.point.length,numSpotLights:x.spot.length,numSpotLightMaps:x.spotLightMap.length,numRectAreaLights:x.rectArea.length,numHemiLights:x.hemi.length,numDirLightShadows:x.directionalShadowMap.length,numPointLightShadows:x.pointShadowMap.length,numSpotLightShadows:x.spotShadowMap.length,numSpotLightShadowsWithMaps:x.numSpotLightShadowsWithMaps,numLightProbes:x.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:v.dithering,shadowMapEnabled:n.shadowMap.enabled&&A.length>0,shadowMapType:n.shadowMap.type,toneMapping:tt,decodeVideoTexture:$e&&v.map.isVideoTexture===!0&&We.getTransfer(v.map.colorSpace)===Ke,decodeVideoTextureEmissive:Ze&&v.emissiveMap.isVideoTexture===!0&&We.getTransfer(v.emissiveMap.colorSpace)===Ke,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===un,flipSided:v.side===At,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Le&&v.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Le&&v.extensions.multiDraw===!0||Te)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return dt.vertexUv1s=l.has(1),dt.vertexUv2s=l.has(2),dt.vertexUv3s=l.has(3),l.clear(),dt}function p(v){const x=[];if(v.shaderID?x.push(v.shaderID):(x.push(v.customVertexShaderID),x.push(v.customFragmentShaderID)),v.defines!==void 0)for(const A in v.defines)x.push(A),x.push(v.defines[A]);return v.isRawShaderMaterial===!1&&(T(x,v),y(x,v),x.push(n.outputColorSpace)),x.push(v.customProgramCacheKey),x.join()}function T(v,x){v.push(x.precision),v.push(x.outputColorSpace),v.push(x.envMapMode),v.push(x.envMapCubeUVHeight),v.push(x.mapUv),v.push(x.alphaMapUv),v.push(x.lightMapUv),v.push(x.aoMapUv),v.push(x.bumpMapUv),v.push(x.normalMapUv),v.push(x.displacementMapUv),v.push(x.emissiveMapUv),v.push(x.metalnessMapUv),v.push(x.roughnessMapUv),v.push(x.anisotropyMapUv),v.push(x.clearcoatMapUv),v.push(x.clearcoatNormalMapUv),v.push(x.clearcoatRoughnessMapUv),v.push(x.iridescenceMapUv),v.push(x.iridescenceThicknessMapUv),v.push(x.sheenColorMapUv),v.push(x.sheenRoughnessMapUv),v.push(x.specularMapUv),v.push(x.specularColorMapUv),v.push(x.specularIntensityMapUv),v.push(x.transmissionMapUv),v.push(x.thicknessMapUv),v.push(x.combine),v.push(x.fogExp2),v.push(x.sizeAttenuation),v.push(x.morphTargetsCount),v.push(x.morphAttributeCount),v.push(x.numDirLights),v.push(x.numPointLights),v.push(x.numSpotLights),v.push(x.numSpotLightMaps),v.push(x.numHemiLights),v.push(x.numRectAreaLights),v.push(x.numDirLightShadows),v.push(x.numPointLightShadows),v.push(x.numSpotLightShadows),v.push(x.numSpotLightShadowsWithMaps),v.push(x.numLightProbes),v.push(x.shadowMapType),v.push(x.toneMapping),v.push(x.numClippingPlanes),v.push(x.numClipIntersection),v.push(x.depthPacking)}function y(v,x){a.disableAll(),x.supportsVertexTextures&&a.enable(0),x.instancing&&a.enable(1),x.instancingColor&&a.enable(2),x.instancingMorph&&a.enable(3),x.matcap&&a.enable(4),x.envMap&&a.enable(5),x.normalMapObjectSpace&&a.enable(6),x.normalMapTangentSpace&&a.enable(7),x.clearcoat&&a.enable(8),x.iridescence&&a.enable(9),x.alphaTest&&a.enable(10),x.vertexColors&&a.enable(11),x.vertexAlphas&&a.enable(12),x.vertexUv1s&&a.enable(13),x.vertexUv2s&&a.enable(14),x.vertexUv3s&&a.enable(15),x.vertexTangents&&a.enable(16),x.anisotropy&&a.enable(17),x.alphaHash&&a.enable(18),x.batching&&a.enable(19),x.dispersion&&a.enable(20),x.batchingColor&&a.enable(21),v.push(a.mask),a.disableAll(),x.fog&&a.enable(0),x.useFog&&a.enable(1),x.flatShading&&a.enable(2),x.logarithmicDepthBuffer&&a.enable(3),x.reverseDepthBuffer&&a.enable(4),x.skinning&&a.enable(5),x.morphTargets&&a.enable(6),x.morphNormals&&a.enable(7),x.morphColors&&a.enable(8),x.premultipliedAlpha&&a.enable(9),x.shadowMapEnabled&&a.enable(10),x.doubleSided&&a.enable(11),x.flipSided&&a.enable(12),x.useDepthPacking&&a.enable(13),x.dithering&&a.enable(14),x.transmission&&a.enable(15),x.sheen&&a.enable(16),x.opaque&&a.enable(17),x.pointsUvs&&a.enable(18),x.decodeVideoTexture&&a.enable(19),x.decodeVideoTextureEmissive&&a.enable(20),x.alphaToCoverage&&a.enable(21),v.push(a.mask)}function S(v){const x=_[v.type];let A;if(x){const D=$t[x];A=gh.clone(D.uniforms)}else A=v.uniforms;return A}function L(v,x){let A;for(let D=0,I=h.length;D<I;D++){const k=h[D];if(k.cacheKey===x){A=k,++A.usedTimes;break}}return A===void 0&&(A=new zm(n,x,v,s),h.push(A)),A}function w(v){if(--v.usedTimes===0){const x=h.indexOf(v);h[x]=h[h.length-1],h.pop(),v.destroy()}}function b(v){c.remove(v)}function P(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:S,acquireProgram:L,releaseProgram:w,releaseShaderCache:b,programs:h,dispose:P}}function Wm(){let n=new WeakMap;function e(o){return n.has(o)}function t(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function r(o,a,c){n.get(o)[a]=c}function s(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:s}}function Xm(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Ya(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function ja(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function o(u,f,d,_,g,m){let p=n[e];return p===void 0?(p={id:u.id,object:u,geometry:f,material:d,groupOrder:_,renderOrder:u.renderOrder,z:g,group:m},n[e]=p):(p.id=u.id,p.object=u,p.geometry=f,p.material=d,p.groupOrder=_,p.renderOrder=u.renderOrder,p.z=g,p.group=m),e++,p}function a(u,f,d,_,g,m){const p=o(u,f,d,_,g,m);d.transmission>0?i.push(p):d.transparent===!0?r.push(p):t.push(p)}function c(u,f,d,_,g,m){const p=o(u,f,d,_,g,m);d.transmission>0?i.unshift(p):d.transparent===!0?r.unshift(p):t.unshift(p)}function l(u,f){t.length>1&&t.sort(u||Xm),i.length>1&&i.sort(f||Ya),r.length>1&&r.sort(f||Ya)}function h(){for(let u=e,f=n.length;u<f;u++){const d=n[u];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:a,unshift:c,finish:h,sort:l}}function qm(){let n=new WeakMap;function e(i,r){const s=n.get(i);let o;return s===void 0?(o=new ja,n.set(i,[o])):r>=s.length?(o=new ja,s.push(o)):o=s[r],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function Ym(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new H,color:new je};break;case"SpotLight":t={position:new H,direction:new H,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new H,color:new je,distance:0,decay:0};break;case"HemisphereLight":t={direction:new H,skyColor:new je,groundColor:new je};break;case"RectAreaLight":t={color:new je,position:new H,halfWidth:new H,halfHeight:new H};break}return n[e.id]=t,t}}}function jm(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ge};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ge};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ge,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let $m=0;function Km(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function Zm(n){const e=new Ym,t=jm(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new H);const r=new H,s=new at,o=new at;function a(l){let h=0,u=0,f=0;for(let v=0;v<9;v++)i.probe[v].set(0,0,0);let d=0,_=0,g=0,m=0,p=0,T=0,y=0,S=0,L=0,w=0,b=0;l.sort(Km);for(let v=0,x=l.length;v<x;v++){const A=l[v],D=A.color,I=A.intensity,k=A.distance,W=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)h+=D.r*I,u+=D.g*I,f+=D.b*I;else if(A.isLightProbe){for(let B=0;B<9;B++)i.probe[B].addScaledVector(A.sh.coefficients[B],I);b++}else if(A.isDirectionalLight){const B=e.get(A);if(B.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){const j=A.shadow,G=t.get(A);G.shadowIntensity=j.intensity,G.shadowBias=j.bias,G.shadowNormalBias=j.normalBias,G.shadowRadius=j.radius,G.shadowMapSize=j.mapSize,i.directionalShadow[d]=G,i.directionalShadowMap[d]=W,i.directionalShadowMatrix[d]=A.shadow.matrix,T++}i.directional[d]=B,d++}else if(A.isSpotLight){const B=e.get(A);B.position.setFromMatrixPosition(A.matrixWorld),B.color.copy(D).multiplyScalar(I),B.distance=k,B.coneCos=Math.cos(A.angle),B.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),B.decay=A.decay,i.spot[g]=B;const j=A.shadow;if(A.map&&(i.spotLightMap[L]=A.map,L++,j.updateMatrices(A),A.castShadow&&w++),i.spotLightMatrix[g]=j.matrix,A.castShadow){const G=t.get(A);G.shadowIntensity=j.intensity,G.shadowBias=j.bias,G.shadowNormalBias=j.normalBias,G.shadowRadius=j.radius,G.shadowMapSize=j.mapSize,i.spotShadow[g]=G,i.spotShadowMap[g]=W,S++}g++}else if(A.isRectAreaLight){const B=e.get(A);B.color.copy(D).multiplyScalar(I),B.halfWidth.set(A.width*.5,0,0),B.halfHeight.set(0,A.height*.5,0),i.rectArea[m]=B,m++}else if(A.isPointLight){const B=e.get(A);if(B.color.copy(A.color).multiplyScalar(A.intensity),B.distance=A.distance,B.decay=A.decay,A.castShadow){const j=A.shadow,G=t.get(A);G.shadowIntensity=j.intensity,G.shadowBias=j.bias,G.shadowNormalBias=j.normalBias,G.shadowRadius=j.radius,G.shadowMapSize=j.mapSize,G.shadowCameraNear=j.camera.near,G.shadowCameraFar=j.camera.far,i.pointShadow[_]=G,i.pointShadowMap[_]=W,i.pointShadowMatrix[_]=A.shadow.matrix,y++}i.point[_]=B,_++}else if(A.isHemisphereLight){const B=e.get(A);B.skyColor.copy(A.color).multiplyScalar(I),B.groundColor.copy(A.groundColor).multiplyScalar(I),i.hemi[p]=B,p++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ae.LTC_FLOAT_1,i.rectAreaLTC2=ae.LTC_FLOAT_2):(i.rectAreaLTC1=ae.LTC_HALF_1,i.rectAreaLTC2=ae.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=f;const P=i.hash;(P.directionalLength!==d||P.pointLength!==_||P.spotLength!==g||P.rectAreaLength!==m||P.hemiLength!==p||P.numDirectionalShadows!==T||P.numPointShadows!==y||P.numSpotShadows!==S||P.numSpotMaps!==L||P.numLightProbes!==b)&&(i.directional.length=d,i.spot.length=g,i.rectArea.length=m,i.point.length=_,i.hemi.length=p,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.pointShadow.length=y,i.pointShadowMap.length=y,i.spotShadow.length=S,i.spotShadowMap.length=S,i.directionalShadowMatrix.length=T,i.pointShadowMatrix.length=y,i.spotLightMatrix.length=S+L-w,i.spotLightMap.length=L,i.numSpotLightShadowsWithMaps=w,i.numLightProbes=b,P.directionalLength=d,P.pointLength=_,P.spotLength=g,P.rectAreaLength=m,P.hemiLength=p,P.numDirectionalShadows=T,P.numPointShadows=y,P.numSpotShadows=S,P.numSpotMaps=L,P.numLightProbes=b,i.version=$m++)}function c(l,h){let u=0,f=0,d=0,_=0,g=0;const m=h.matrixWorldInverse;for(let p=0,T=l.length;p<T;p++){const y=l[p];if(y.isDirectionalLight){const S=i.directional[u];S.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),S.direction.sub(r),S.direction.transformDirection(m),u++}else if(y.isSpotLight){const S=i.spot[d];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),S.direction.sub(r),S.direction.transformDirection(m),d++}else if(y.isRectAreaLight){const S=i.rectArea[_];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),o.identity(),s.copy(y.matrixWorld),s.premultiply(m),o.extractRotation(s),S.halfWidth.set(y.width*.5,0,0),S.halfHeight.set(0,y.height*.5,0),S.halfWidth.applyMatrix4(o),S.halfHeight.applyMatrix4(o),_++}else if(y.isPointLight){const S=i.point[f];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),f++}else if(y.isHemisphereLight){const S=i.hemi[g];S.direction.setFromMatrixPosition(y.matrixWorld),S.direction.transformDirection(m),g++}}}return{setup:a,setupView:c,state:i}}function $a(n){const e=new Zm(n),t=[],i=[];function r(h){l.camera=h,t.length=0,i.length=0}function s(h){t.push(h)}function o(h){i.push(h)}function a(){e.setup(t)}function c(h){e.setupView(t,h)}const l={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:a,setupLightsView:c,pushLight:s,pushShadow:o}}function Jm(n){let e=new WeakMap;function t(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new $a(n),e.set(r,[a])):s>=o.length?(a=new $a(n),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:t,dispose:i}}const Qm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,e_=`uniform sampler2D shadow_pass;
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
}`;function t_(n,e,t){let i=new qc;const r=new Ge,s=new Ge,o=new rt,a=new Ah({depthPacking:Mu}),c=new wh,l={},h=t.maxTextureSize,u={[bn]:At,[At]:bn,[un]:un},f=new mn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ge},radius:{value:4}},vertexShader:Qm,fragmentShader:e_}),d=f.clone();d.defines.HORIZONTAL_PASS=1;const _=new Wn;_.setAttribute("position",new Jt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new Zt(_,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=yc;let p=this.type;this.render=function(w,b,P){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const v=n.getRenderTarget(),x=n.getActiveCubeFace(),A=n.getActiveMipmapLevel(),D=n.state;D.setBlending(En),D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const I=p!==ln&&this.type===ln,k=p===ln&&this.type!==ln;for(let W=0,B=w.length;W<B;W++){const j=w[W],G=j.shadow;if(G===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;r.copy(G.mapSize);const J=G.getFrameExtents();if(r.multiply(J),s.copy(G.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/J.x),r.x=s.x*J.x,G.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/J.y),r.y=s.y*J.y,G.mapSize.y=s.y)),G.map===null||I===!0||k===!0){const me=this.type!==ln?{minFilter:It,magFilter:It}:{};G.map!==null&&G.map.dispose(),G.map=new Lt(r.x,r.y,me),G.map.texture.name=j.name+".shadowMap",G.camera.updateProjectionMatrix()}n.setRenderTarget(G.map),n.clear();const re=G.getViewportCount();for(let me=0;me<re;me++){const we=G.getViewport(me);o.set(s.x*we.x,s.y*we.y,s.x*we.z,s.y*we.w),D.viewport(o),G.updateMatrices(j,me),i=G.getFrustum(),S(b,P,G.camera,j,this.type)}G.isPointLightShadow!==!0&&this.type===ln&&T(G,P),G.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(v,x,A)};function T(w,b){const P=e.update(g);f.defines.VSM_SAMPLES!==w.blurSamples&&(f.defines.VSM_SAMPLES=w.blurSamples,d.defines.VSM_SAMPLES=w.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new Lt(r.x,r.y)),f.uniforms.shadow_pass.value=w.map.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(b,null,P,f,g,null),d.uniforms.shadow_pass.value=w.mapPass.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(b,null,P,d,g,null)}function y(w,b,P,v){let x=null;const A=P.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(A!==void 0)x=A;else if(x=P.isPointLight===!0?c:a,n.localClippingEnabled&&b.clipShadows===!0&&Array.isArray(b.clippingPlanes)&&b.clippingPlanes.length!==0||b.displacementMap&&b.displacementScale!==0||b.alphaMap&&b.alphaTest>0||b.map&&b.alphaTest>0){const D=x.uuid,I=b.uuid;let k=l[D];k===void 0&&(k={},l[D]=k);let W=k[I];W===void 0&&(W=x.clone(),k[I]=W,b.addEventListener("dispose",L)),x=W}if(x.visible=b.visible,x.wireframe=b.wireframe,v===ln?x.side=b.shadowSide!==null?b.shadowSide:b.side:x.side=b.shadowSide!==null?b.shadowSide:u[b.side],x.alphaMap=b.alphaMap,x.alphaTest=b.alphaTest,x.map=b.map,x.clipShadows=b.clipShadows,x.clippingPlanes=b.clippingPlanes,x.clipIntersection=b.clipIntersection,x.displacementMap=b.displacementMap,x.displacementScale=b.displacementScale,x.displacementBias=b.displacementBias,x.wireframeLinewidth=b.wireframeLinewidth,x.linewidth=b.linewidth,P.isPointLight===!0&&x.isMeshDistanceMaterial===!0){const D=n.properties.get(x);D.light=P}return x}function S(w,b,P,v,x){if(w.visible===!1)return;if(w.layers.test(b.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&x===ln)&&(!w.frustumCulled||i.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,w.matrixWorld);const I=e.update(w),k=w.material;if(Array.isArray(k)){const W=I.groups;for(let B=0,j=W.length;B<j;B++){const G=W[B],J=k[G.materialIndex];if(J&&J.visible){const re=y(w,J,v,x);w.onBeforeShadow(n,w,b,P,I,re,G),n.renderBufferDirect(P,null,I,re,w,G),w.onAfterShadow(n,w,b,P,I,re,G)}}}else if(k.visible){const W=y(w,k,v,x);w.onBeforeShadow(n,w,b,P,I,W,null),n.renderBufferDirect(P,null,I,W,w,null),w.onAfterShadow(n,w,b,P,I,W,null)}}const D=w.children;for(let I=0,k=D.length;I<k;I++)S(D[I],b,P,v,x)}function L(w){w.target.removeEventListener("dispose",L);for(const P in l){const v=l[P],x=w.target.uuid;x in v&&(v[x].dispose(),delete v[x])}}}const n_={[Ds]:Us,[Is]:Os,[Fs]:Bs,[xi]:Ns,[Us]:Ds,[Os]:Is,[Bs]:Fs,[Ns]:xi};function i_(n,e){function t(){let N=!1;const le=new rt;let $=null;const ee=new rt(0,0,0,0);return{setMask:function(he){$!==he&&!N&&(n.colorMask(he,he,he,he),$=he)},setLocked:function(he){N=he},setClear:function(he,ue,Le,tt,dt){dt===!0&&(he*=tt,ue*=tt,Le*=tt),le.set(he,ue,Le,tt),ee.equals(le)===!1&&(n.clearColor(he,ue,Le,tt),ee.copy(le))},reset:function(){N=!1,$=null,ee.set(-1,0,0,0)}}}function i(){let N=!1,le=!1,$=null,ee=null,he=null;return{setReversed:function(ue){if(le!==ue){const Le=e.get("EXT_clip_control");ue?Le.clipControlEXT(Le.LOWER_LEFT_EXT,Le.ZERO_TO_ONE_EXT):Le.clipControlEXT(Le.LOWER_LEFT_EXT,Le.NEGATIVE_ONE_TO_ONE_EXT),le=ue;const tt=he;he=null,this.setClear(tt)}},getReversed:function(){return le},setTest:function(ue){ue?oe(n.DEPTH_TEST):Ee(n.DEPTH_TEST)},setMask:function(ue){$!==ue&&!N&&(n.depthMask(ue),$=ue)},setFunc:function(ue){if(le&&(ue=n_[ue]),ee!==ue){switch(ue){case Ds:n.depthFunc(n.NEVER);break;case Us:n.depthFunc(n.ALWAYS);break;case Is:n.depthFunc(n.LESS);break;case xi:n.depthFunc(n.LEQUAL);break;case Fs:n.depthFunc(n.EQUAL);break;case Ns:n.depthFunc(n.GEQUAL);break;case Os:n.depthFunc(n.GREATER);break;case Bs:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}ee=ue}},setLocked:function(ue){N=ue},setClear:function(ue){he!==ue&&(le&&(ue=1-ue),n.clearDepth(ue),he=ue)},reset:function(){N=!1,$=null,ee=null,he=null,le=!1}}}function r(){let N=!1,le=null,$=null,ee=null,he=null,ue=null,Le=null,tt=null,dt=null;return{setTest:function(Ye){N||(Ye?oe(n.STENCIL_TEST):Ee(n.STENCIL_TEST))},setMask:function(Ye){le!==Ye&&!N&&(n.stencilMask(Ye),le=Ye)},setFunc:function(Ye,Gt,nn){($!==Ye||ee!==Gt||he!==nn)&&(n.stencilFunc(Ye,Gt,nn),$=Ye,ee=Gt,he=nn)},setOp:function(Ye,Gt,nn){(ue!==Ye||Le!==Gt||tt!==nn)&&(n.stencilOp(Ye,Gt,nn),ue=Ye,Le=Gt,tt=nn)},setLocked:function(Ye){N=Ye},setClear:function(Ye){dt!==Ye&&(n.clearStencil(Ye),dt=Ye)},reset:function(){N=!1,le=null,$=null,ee=null,he=null,ue=null,Le=null,tt=null,dt=null}}}const s=new t,o=new i,a=new r,c=new WeakMap,l=new WeakMap;let h={},u={},f=new WeakMap,d=[],_=null,g=!1,m=null,p=null,T=null,y=null,S=null,L=null,w=null,b=new je(0,0,0),P=0,v=!1,x=null,A=null,D=null,I=null,k=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,j=0;const G=n.getParameter(n.VERSION);G.indexOf("WebGL")!==-1?(j=parseFloat(/^WebGL (\d)/.exec(G)[1]),B=j>=1):G.indexOf("OpenGL ES")!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),B=j>=2);let J=null,re={};const me=n.getParameter(n.SCISSOR_BOX),we=n.getParameter(n.VIEWPORT),Ie=new rt().fromArray(me),K=new rt().fromArray(we);function se(N,le,$,ee){const he=new Uint8Array(4),ue=n.createTexture();n.bindTexture(N,ue),n.texParameteri(N,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(N,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Le=0;Le<$;Le++)N===n.TEXTURE_3D||N===n.TEXTURE_2D_ARRAY?n.texImage3D(le,0,n.RGBA,1,1,ee,0,n.RGBA,n.UNSIGNED_BYTE,he):n.texImage2D(le+Le,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,he);return ue}const _e={};_e[n.TEXTURE_2D]=se(n.TEXTURE_2D,n.TEXTURE_2D,1),_e[n.TEXTURE_CUBE_MAP]=se(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),_e[n.TEXTURE_2D_ARRAY]=se(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),_e[n.TEXTURE_3D]=se(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),oe(n.DEPTH_TEST),o.setFunc(xi),Oe(!1),Fe(Qo),oe(n.CULL_FACE),F(En);function oe(N){h[N]!==!0&&(n.enable(N),h[N]=!0)}function Ee(N){h[N]!==!1&&(n.disable(N),h[N]=!1)}function ke(N,le){return u[N]!==le?(n.bindFramebuffer(N,le),u[N]=le,N===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=le),N===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=le),!0):!1}function Te(N,le){let $=d,ee=!1;if(N){$=f.get(le),$===void 0&&($=[],f.set(le,$));const he=N.textures;if($.length!==he.length||$[0]!==n.COLOR_ATTACHMENT0){for(let ue=0,Le=he.length;ue<Le;ue++)$[ue]=n.COLOR_ATTACHMENT0+ue;$.length=he.length,ee=!0}}else $[0]!==n.BACK&&($[0]=n.BACK,ee=!0);ee&&n.drawBuffers($)}function $e(N){return _!==N?(n.useProgram(N),_=N,!0):!1}const Qe={[Nn]:n.FUNC_ADD,[Yl]:n.FUNC_SUBTRACT,[jl]:n.FUNC_REVERSE_SUBTRACT};Qe[$l]=n.MIN,Qe[Kl]=n.MAX;const Ne={[Zl]:n.ZERO,[Jl]:n.ONE,[Ql]:n.SRC_COLOR,[Ps]:n.SRC_ALPHA,[su]:n.SRC_ALPHA_SATURATE,[iu]:n.DST_COLOR,[tu]:n.DST_ALPHA,[eu]:n.ONE_MINUS_SRC_COLOR,[Ls]:n.ONE_MINUS_SRC_ALPHA,[ru]:n.ONE_MINUS_DST_COLOR,[nu]:n.ONE_MINUS_DST_ALPHA,[ou]:n.CONSTANT_COLOR,[au]:n.ONE_MINUS_CONSTANT_COLOR,[cu]:n.CONSTANT_ALPHA,[lu]:n.ONE_MINUS_CONSTANT_ALPHA};function F(N,le,$,ee,he,ue,Le,tt,dt,Ye){if(N===En){g===!0&&(Ee(n.BLEND),g=!1);return}if(g===!1&&(oe(n.BLEND),g=!0),N!==ql){if(N!==m||Ye!==v){if((p!==Nn||S!==Nn)&&(n.blendEquation(n.FUNC_ADD),p=Nn,S=Nn),Ye)switch(N){case gi:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case ea:n.blendFunc(n.ONE,n.ONE);break;case ta:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case na:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case gi:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case ea:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case ta:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case na:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}T=null,y=null,L=null,w=null,b.set(0,0,0),P=0,m=N,v=Ye}return}he=he||le,ue=ue||$,Le=Le||ee,(le!==p||he!==S)&&(n.blendEquationSeparate(Qe[le],Qe[he]),p=le,S=he),($!==T||ee!==y||ue!==L||Le!==w)&&(n.blendFuncSeparate(Ne[$],Ne[ee],Ne[ue],Ne[Le]),T=$,y=ee,L=ue,w=Le),(tt.equals(b)===!1||dt!==P)&&(n.blendColor(tt.r,tt.g,tt.b,dt),b.copy(tt),P=dt),m=N,v=!1}function Tt(N,le){N.side===un?Ee(n.CULL_FACE):oe(n.CULL_FACE);let $=N.side===At;le&&($=!$),Oe($),N.blending===gi&&N.transparent===!1?F(En):F(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),s.setMask(N.colorWrite);const ee=N.stencilWrite;a.setTest(ee),ee&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),Ze(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?oe(n.SAMPLE_ALPHA_TO_COVERAGE):Ee(n.SAMPLE_ALPHA_TO_COVERAGE)}function Oe(N){x!==N&&(N?n.frontFace(n.CW):n.frontFace(n.CCW),x=N)}function Fe(N){N!==Vl?(oe(n.CULL_FACE),N!==A&&(N===Qo?n.cullFace(n.BACK):N===Wl?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Ee(n.CULL_FACE),A=N}function ve(N){N!==D&&(B&&n.lineWidth(N),D=N)}function Ze(N,le,$){N?(oe(n.POLYGON_OFFSET_FILL),(I!==le||k!==$)&&(n.polygonOffset(le,$),I=le,k=$)):Ee(n.POLYGON_OFFSET_FILL)}function xe(N){N?oe(n.SCISSOR_TEST):Ee(n.SCISSOR_TEST)}function C(N){N===void 0&&(N=n.TEXTURE0+W-1),J!==N&&(n.activeTexture(N),J=N)}function M(N,le,$){$===void 0&&(J===null?$=n.TEXTURE0+W-1:$=J);let ee=re[$];ee===void 0&&(ee={type:void 0,texture:void 0},re[$]=ee),(ee.type!==N||ee.texture!==le)&&(J!==$&&(n.activeTexture($),J=$),n.bindTexture(N,le||_e[N]),ee.type=N,ee.texture=le)}function V(){const N=re[J];N!==void 0&&N.type!==void 0&&(n.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function Q(){try{n.compressedTexImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function R(){try{n.compressedTexImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function U(){try{n.texSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Y(){try{n.texSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Z(){try{n.compressedTexSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function te(){try{n.compressedTexSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function be(){try{n.texStorage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ne(){try{n.texStorage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function fe(){try{n.texImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Ae(){try{n.texImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Se(N){Ie.equals(N)===!1&&(n.scissor(N.x,N.y,N.z,N.w),Ie.copy(N))}function de(N){K.equals(N)===!1&&(n.viewport(N.x,N.y,N.z,N.w),K.copy(N))}function ze(N,le){let $=l.get(le);$===void 0&&($=new WeakMap,l.set(le,$));let ee=$.get(N);ee===void 0&&(ee=n.getUniformBlockIndex(le,N.name),$.set(N,ee))}function De(N,le){const ee=l.get(le).get(N);c.get(le)!==ee&&(n.uniformBlockBinding(le,ee,N.__bindingPointIndex),c.set(le,ee))}function Je(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),h={},J=null,re={},u={},f=new WeakMap,d=[],_=null,g=!1,m=null,p=null,T=null,y=null,S=null,L=null,w=null,b=new je(0,0,0),P=0,v=!1,x=null,A=null,D=null,I=null,k=null,Ie.set(0,0,n.canvas.width,n.canvas.height),K.set(0,0,n.canvas.width,n.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:oe,disable:Ee,bindFramebuffer:ke,drawBuffers:Te,useProgram:$e,setBlending:F,setMaterial:Tt,setFlipSided:Oe,setCullFace:Fe,setLineWidth:ve,setPolygonOffset:Ze,setScissorTest:xe,activeTexture:C,bindTexture:M,unbindTexture:V,compressedTexImage2D:Q,compressedTexImage3D:R,texImage2D:fe,texImage3D:Ae,updateUBOMapping:ze,uniformBlockBinding:De,texStorage2D:be,texStorage3D:ne,texSubImage2D:U,texSubImage3D:Y,compressedTexSubImage2D:Z,compressedTexSubImage3D:te,scissor:Se,viewport:de,reset:Je}}function r_(n,e,t,i,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ge,h=new WeakMap;let u;const f=new WeakMap;let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(C,M){return d?new OffscreenCanvas(C,M):Gr("canvas")}function g(C,M,V){let Q=1;const R=xe(C);if((R.width>V||R.height>V)&&(Q=V/Math.max(R.width,R.height)),Q<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const U=Math.floor(Q*R.width),Y=Math.floor(Q*R.height);u===void 0&&(u=_(U,Y));const Z=M?_(U,Y):u;return Z.width=U,Z.height=Y,Z.getContext("2d").drawImage(C,0,0,U,Y),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+R.width+"x"+R.height+") to ("+U+"x"+Y+")."),Z}else return"data"in C&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+R.width+"x"+R.height+")."),C;return C}function m(C){return C.generateMipmaps}function p(C){n.generateMipmap(C)}function T(C){return C.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?n.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function y(C,M,V,Q,R=!1){if(C!==null){if(n[C]!==void 0)return n[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let U=M;if(M===n.RED&&(V===n.FLOAT&&(U=n.R32F),V===n.HALF_FLOAT&&(U=n.R16F),V===n.UNSIGNED_BYTE&&(U=n.R8)),M===n.RED_INTEGER&&(V===n.UNSIGNED_BYTE&&(U=n.R8UI),V===n.UNSIGNED_SHORT&&(U=n.R16UI),V===n.UNSIGNED_INT&&(U=n.R32UI),V===n.BYTE&&(U=n.R8I),V===n.SHORT&&(U=n.R16I),V===n.INT&&(U=n.R32I)),M===n.RG&&(V===n.FLOAT&&(U=n.RG32F),V===n.HALF_FLOAT&&(U=n.RG16F),V===n.UNSIGNED_BYTE&&(U=n.RG8)),M===n.RG_INTEGER&&(V===n.UNSIGNED_BYTE&&(U=n.RG8UI),V===n.UNSIGNED_SHORT&&(U=n.RG16UI),V===n.UNSIGNED_INT&&(U=n.RG32UI),V===n.BYTE&&(U=n.RG8I),V===n.SHORT&&(U=n.RG16I),V===n.INT&&(U=n.RG32I)),M===n.RGB_INTEGER&&(V===n.UNSIGNED_BYTE&&(U=n.RGB8UI),V===n.UNSIGNED_SHORT&&(U=n.RGB16UI),V===n.UNSIGNED_INT&&(U=n.RGB32UI),V===n.BYTE&&(U=n.RGB8I),V===n.SHORT&&(U=n.RGB16I),V===n.INT&&(U=n.RGB32I)),M===n.RGBA_INTEGER&&(V===n.UNSIGNED_BYTE&&(U=n.RGBA8UI),V===n.UNSIGNED_SHORT&&(U=n.RGBA16UI),V===n.UNSIGNED_INT&&(U=n.RGBA32UI),V===n.BYTE&&(U=n.RGBA8I),V===n.SHORT&&(U=n.RGBA16I),V===n.INT&&(U=n.RGBA32I)),M===n.RGB&&V===n.UNSIGNED_INT_5_9_9_9_REV&&(U=n.RGB9_E5),M===n.RGBA){const Y=R?kr:We.getTransfer(Q);V===n.FLOAT&&(U=n.RGBA32F),V===n.HALF_FLOAT&&(U=n.RGBA16F),V===n.UNSIGNED_BYTE&&(U=Y===Ke?n.SRGB8_ALPHA8:n.RGBA8),V===n.UNSIGNED_SHORT_4_4_4_4&&(U=n.RGBA4),V===n.UNSIGNED_SHORT_5_5_5_1&&(U=n.RGB5_A1)}return(U===n.R16F||U===n.R32F||U===n.RG16F||U===n.RG32F||U===n.RGBA16F||U===n.RGBA32F)&&e.get("EXT_color_buffer_float"),U}function S(C,M){let V;return C?M===null||M===Vn||M===Hi?V=n.DEPTH24_STENCIL8:M===Kt?V=n.DEPTH32F_STENCIL8:M===ki&&(V=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Vn||M===Hi?V=n.DEPTH_COMPONENT24:M===Kt?V=n.DEPTH_COMPONENT32F:M===ki&&(V=n.DEPTH_COMPONENT16),V}function L(C,M){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==It&&C.minFilter!==Ht?Math.log2(Math.max(M.width,M.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?M.mipmaps.length:1}function w(C){const M=C.target;M.removeEventListener("dispose",w),P(M),M.isVideoTexture&&h.delete(M)}function b(C){const M=C.target;M.removeEventListener("dispose",b),x(M)}function P(C){const M=i.get(C);if(M.__webglInit===void 0)return;const V=C.source,Q=f.get(V);if(Q){const R=Q[M.__cacheKey];R.usedTimes--,R.usedTimes===0&&v(C),Object.keys(Q).length===0&&f.delete(V)}i.remove(C)}function v(C){const M=i.get(C);n.deleteTexture(M.__webglTexture);const V=C.source,Q=f.get(V);delete Q[M.__cacheKey],o.memory.textures--}function x(C){const M=i.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),i.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(M.__webglFramebuffer[Q]))for(let R=0;R<M.__webglFramebuffer[Q].length;R++)n.deleteFramebuffer(M.__webglFramebuffer[Q][R]);else n.deleteFramebuffer(M.__webglFramebuffer[Q]);M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer[Q])}else{if(Array.isArray(M.__webglFramebuffer))for(let Q=0;Q<M.__webglFramebuffer.length;Q++)n.deleteFramebuffer(M.__webglFramebuffer[Q]);else n.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&n.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&n.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let Q=0;Q<M.__webglColorRenderbuffer.length;Q++)M.__webglColorRenderbuffer[Q]&&n.deleteRenderbuffer(M.__webglColorRenderbuffer[Q]);M.__webglDepthRenderbuffer&&n.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const V=C.textures;for(let Q=0,R=V.length;Q<R;Q++){const U=i.get(V[Q]);U.__webglTexture&&(n.deleteTexture(U.__webglTexture),o.memory.textures--),i.remove(V[Q])}i.remove(C)}let A=0;function D(){A=0}function I(){const C=A;return C>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+r.maxTextures),A+=1,C}function k(C){const M=[];return M.push(C.wrapS),M.push(C.wrapT),M.push(C.wrapR||0),M.push(C.magFilter),M.push(C.minFilter),M.push(C.anisotropy),M.push(C.internalFormat),M.push(C.format),M.push(C.type),M.push(C.generateMipmaps),M.push(C.premultiplyAlpha),M.push(C.flipY),M.push(C.unpackAlignment),M.push(C.colorSpace),M.join()}function W(C,M){const V=i.get(C);if(C.isVideoTexture&&ve(C),C.isRenderTargetTexture===!1&&C.version>0&&V.__version!==C.version){const Q=C.image;if(Q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{K(V,C,M);return}}t.bindTexture(n.TEXTURE_2D,V.__webglTexture,n.TEXTURE0+M)}function B(C,M){const V=i.get(C);if(C.version>0&&V.__version!==C.version){K(V,C,M);return}t.bindTexture(n.TEXTURE_2D_ARRAY,V.__webglTexture,n.TEXTURE0+M)}function j(C,M){const V=i.get(C);if(C.version>0&&V.__version!==C.version){K(V,C,M);return}t.bindTexture(n.TEXTURE_3D,V.__webglTexture,n.TEXTURE0+M)}function G(C,M){const V=i.get(C);if(C.version>0&&V.__version!==C.version){se(V,C,M);return}t.bindTexture(n.TEXTURE_CUBE_MAP,V.__webglTexture,n.TEXTURE0+M)}const J={[Hs]:n.REPEAT,[zn]:n.CLAMP_TO_EDGE,[Gs]:n.MIRRORED_REPEAT},re={[It]:n.NEAREST,[xu]:n.NEAREST_MIPMAP_NEAREST,[rr]:n.NEAREST_MIPMAP_LINEAR,[Ht]:n.LINEAR,[Qr]:n.LINEAR_MIPMAP_NEAREST,[kn]:n.LINEAR_MIPMAP_LINEAR},me={[Tu]:n.NEVER,[Pu]:n.ALWAYS,[bu]:n.LESS,[Fc]:n.LEQUAL,[Au]:n.EQUAL,[Cu]:n.GEQUAL,[wu]:n.GREATER,[Ru]:n.NOTEQUAL};function we(C,M){if(M.type===Kt&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===Ht||M.magFilter===Qr||M.magFilter===rr||M.magFilter===kn||M.minFilter===Ht||M.minFilter===Qr||M.minFilter===rr||M.minFilter===kn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(C,n.TEXTURE_WRAP_S,J[M.wrapS]),n.texParameteri(C,n.TEXTURE_WRAP_T,J[M.wrapT]),(C===n.TEXTURE_3D||C===n.TEXTURE_2D_ARRAY)&&n.texParameteri(C,n.TEXTURE_WRAP_R,J[M.wrapR]),n.texParameteri(C,n.TEXTURE_MAG_FILTER,re[M.magFilter]),n.texParameteri(C,n.TEXTURE_MIN_FILTER,re[M.minFilter]),M.compareFunction&&(n.texParameteri(C,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(C,n.TEXTURE_COMPARE_FUNC,me[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===It||M.minFilter!==rr&&M.minFilter!==kn||M.type===Kt&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||i.get(M).__currentAnisotropy){const V=e.get("EXT_texture_filter_anisotropic");n.texParameterf(C,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,r.getMaxAnisotropy())),i.get(M).__currentAnisotropy=M.anisotropy}}}function Ie(C,M){let V=!1;C.__webglInit===void 0&&(C.__webglInit=!0,M.addEventListener("dispose",w));const Q=M.source;let R=f.get(Q);R===void 0&&(R={},f.set(Q,R));const U=k(M);if(U!==C.__cacheKey){R[U]===void 0&&(R[U]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,V=!0),R[U].usedTimes++;const Y=R[C.__cacheKey];Y!==void 0&&(R[C.__cacheKey].usedTimes--,Y.usedTimes===0&&v(M)),C.__cacheKey=U,C.__webglTexture=R[U].texture}return V}function K(C,M,V){let Q=n.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(Q=n.TEXTURE_2D_ARRAY),M.isData3DTexture&&(Q=n.TEXTURE_3D);const R=Ie(C,M),U=M.source;t.bindTexture(Q,C.__webglTexture,n.TEXTURE0+V);const Y=i.get(U);if(U.version!==Y.__version||R===!0){t.activeTexture(n.TEXTURE0+V);const Z=We.getPrimaries(We.workingColorSpace),te=M.colorSpace===yn?null:We.getPrimaries(M.colorSpace),be=M.colorSpace===yn||Z===te?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);let ne=g(M.image,!1,r.maxTextureSize);ne=Ze(M,ne);const fe=s.convert(M.format,M.colorSpace),Ae=s.convert(M.type);let Se=y(M.internalFormat,fe,Ae,M.colorSpace,M.isVideoTexture);we(Q,M);let de;const ze=M.mipmaps,De=M.isVideoTexture!==!0,Je=Y.__version===void 0||R===!0,N=U.dataReady,le=L(M,ne);if(M.isDepthTexture)Se=S(M.format===Vi,M.type),Je&&(De?t.texStorage2D(n.TEXTURE_2D,1,Se,ne.width,ne.height):t.texImage2D(n.TEXTURE_2D,0,Se,ne.width,ne.height,0,fe,Ae,null));else if(M.isDataTexture)if(ze.length>0){De&&Je&&t.texStorage2D(n.TEXTURE_2D,le,Se,ze[0].width,ze[0].height);for(let $=0,ee=ze.length;$<ee;$++)de=ze[$],De?N&&t.texSubImage2D(n.TEXTURE_2D,$,0,0,de.width,de.height,fe,Ae,de.data):t.texImage2D(n.TEXTURE_2D,$,Se,de.width,de.height,0,fe,Ae,de.data);M.generateMipmaps=!1}else De?(Je&&t.texStorage2D(n.TEXTURE_2D,le,Se,ne.width,ne.height),N&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ne.width,ne.height,fe,Ae,ne.data)):t.texImage2D(n.TEXTURE_2D,0,Se,ne.width,ne.height,0,fe,Ae,ne.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){De&&Je&&t.texStorage3D(n.TEXTURE_2D_ARRAY,le,Se,ze[0].width,ze[0].height,ne.depth);for(let $=0,ee=ze.length;$<ee;$++)if(de=ze[$],M.format!==Ut)if(fe!==null)if(De){if(N)if(M.layerUpdates.size>0){const he=ba(de.width,de.height,M.format,M.type);for(const ue of M.layerUpdates){const Le=de.data.subarray(ue*he/de.data.BYTES_PER_ELEMENT,(ue+1)*he/de.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,$,0,0,ue,de.width,de.height,1,fe,Le)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,$,0,0,0,de.width,de.height,ne.depth,fe,de.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,$,Se,de.width,de.height,ne.depth,0,de.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else De?N&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,$,0,0,0,de.width,de.height,ne.depth,fe,Ae,de.data):t.texImage3D(n.TEXTURE_2D_ARRAY,$,Se,de.width,de.height,ne.depth,0,fe,Ae,de.data)}else{De&&Je&&t.texStorage2D(n.TEXTURE_2D,le,Se,ze[0].width,ze[0].height);for(let $=0,ee=ze.length;$<ee;$++)de=ze[$],M.format!==Ut?fe!==null?De?N&&t.compressedTexSubImage2D(n.TEXTURE_2D,$,0,0,de.width,de.height,fe,de.data):t.compressedTexImage2D(n.TEXTURE_2D,$,Se,de.width,de.height,0,de.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):De?N&&t.texSubImage2D(n.TEXTURE_2D,$,0,0,de.width,de.height,fe,Ae,de.data):t.texImage2D(n.TEXTURE_2D,$,Se,de.width,de.height,0,fe,Ae,de.data)}else if(M.isDataArrayTexture)if(De){if(Je&&t.texStorage3D(n.TEXTURE_2D_ARRAY,le,Se,ne.width,ne.height,ne.depth),N)if(M.layerUpdates.size>0){const $=ba(ne.width,ne.height,M.format,M.type);for(const ee of M.layerUpdates){const he=ne.data.subarray(ee*$/ne.data.BYTES_PER_ELEMENT,(ee+1)*$/ne.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,ee,ne.width,ne.height,1,fe,Ae,he)}M.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,ne.width,ne.height,ne.depth,fe,Ae,ne.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Se,ne.width,ne.height,ne.depth,0,fe,Ae,ne.data);else if(M.isData3DTexture)De?(Je&&t.texStorage3D(n.TEXTURE_3D,le,Se,ne.width,ne.height,ne.depth),N&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,ne.width,ne.height,ne.depth,fe,Ae,ne.data)):t.texImage3D(n.TEXTURE_3D,0,Se,ne.width,ne.height,ne.depth,0,fe,Ae,ne.data);else if(M.isFramebufferTexture){if(Je)if(De)t.texStorage2D(n.TEXTURE_2D,le,Se,ne.width,ne.height);else{let $=ne.width,ee=ne.height;for(let he=0;he<le;he++)t.texImage2D(n.TEXTURE_2D,he,Se,$,ee,0,fe,Ae,null),$>>=1,ee>>=1}}else if(ze.length>0){if(De&&Je){const $=xe(ze[0]);t.texStorage2D(n.TEXTURE_2D,le,Se,$.width,$.height)}for(let $=0,ee=ze.length;$<ee;$++)de=ze[$],De?N&&t.texSubImage2D(n.TEXTURE_2D,$,0,0,fe,Ae,de):t.texImage2D(n.TEXTURE_2D,$,Se,fe,Ae,de);M.generateMipmaps=!1}else if(De){if(Je){const $=xe(ne);t.texStorage2D(n.TEXTURE_2D,le,Se,$.width,$.height)}N&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,fe,Ae,ne)}else t.texImage2D(n.TEXTURE_2D,0,Se,fe,Ae,ne);m(M)&&p(Q),Y.__version=U.version,M.onUpdate&&M.onUpdate(M)}C.__version=M.version}function se(C,M,V){if(M.image.length!==6)return;const Q=Ie(C,M),R=M.source;t.bindTexture(n.TEXTURE_CUBE_MAP,C.__webglTexture,n.TEXTURE0+V);const U=i.get(R);if(R.version!==U.__version||Q===!0){t.activeTexture(n.TEXTURE0+V);const Y=We.getPrimaries(We.workingColorSpace),Z=M.colorSpace===yn?null:We.getPrimaries(M.colorSpace),te=M.colorSpace===yn||Y===Z?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,M.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,M.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,te);const be=M.isCompressedTexture||M.image[0].isCompressedTexture,ne=M.image[0]&&M.image[0].isDataTexture,fe=[];for(let ee=0;ee<6;ee++)!be&&!ne?fe[ee]=g(M.image[ee],!0,r.maxCubemapSize):fe[ee]=ne?M.image[ee].image:M.image[ee],fe[ee]=Ze(M,fe[ee]);const Ae=fe[0],Se=s.convert(M.format,M.colorSpace),de=s.convert(M.type),ze=y(M.internalFormat,Se,de,M.colorSpace),De=M.isVideoTexture!==!0,Je=U.__version===void 0||Q===!0,N=R.dataReady;let le=L(M,Ae);we(n.TEXTURE_CUBE_MAP,M);let $;if(be){De&&Je&&t.texStorage2D(n.TEXTURE_CUBE_MAP,le,ze,Ae.width,Ae.height);for(let ee=0;ee<6;ee++){$=fe[ee].mipmaps;for(let he=0;he<$.length;he++){const ue=$[he];M.format!==Ut?Se!==null?De?N&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he,0,0,ue.width,ue.height,Se,ue.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he,ze,ue.width,ue.height,0,ue.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):De?N&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he,0,0,ue.width,ue.height,Se,de,ue.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he,ze,ue.width,ue.height,0,Se,de,ue.data)}}}else{if($=M.mipmaps,De&&Je){$.length>0&&le++;const ee=xe(fe[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,le,ze,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(ne){De?N&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,fe[ee].width,fe[ee].height,Se,de,fe[ee].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,ze,fe[ee].width,fe[ee].height,0,Se,de,fe[ee].data);for(let he=0;he<$.length;he++){const Le=$[he].image[ee].image;De?N&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he+1,0,0,Le.width,Le.height,Se,de,Le.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he+1,ze,Le.width,Le.height,0,Se,de,Le.data)}}else{De?N&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Se,de,fe[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,ze,Se,de,fe[ee]);for(let he=0;he<$.length;he++){const ue=$[he];De?N&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he+1,0,0,Se,de,ue.image[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,he+1,ze,Se,de,ue.image[ee])}}}m(M)&&p(n.TEXTURE_CUBE_MAP),U.__version=R.version,M.onUpdate&&M.onUpdate(M)}C.__version=M.version}function _e(C,M,V,Q,R,U){const Y=s.convert(V.format,V.colorSpace),Z=s.convert(V.type),te=y(V.internalFormat,Y,Z,V.colorSpace),be=i.get(M),ne=i.get(V);if(ne.__renderTarget=M,!be.__hasExternalTextures){const fe=Math.max(1,M.width>>U),Ae=Math.max(1,M.height>>U);R===n.TEXTURE_3D||R===n.TEXTURE_2D_ARRAY?t.texImage3D(R,U,te,fe,Ae,M.depth,0,Y,Z,null):t.texImage2D(R,U,te,fe,Ae,0,Y,Z,null)}t.bindFramebuffer(n.FRAMEBUFFER,C),Fe(M)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Q,R,ne.__webglTexture,0,Oe(M)):(R===n.TEXTURE_2D||R>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&R<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,Q,R,ne.__webglTexture,U),t.bindFramebuffer(n.FRAMEBUFFER,null)}function oe(C,M,V){if(n.bindRenderbuffer(n.RENDERBUFFER,C),M.depthBuffer){const Q=M.depthTexture,R=Q&&Q.isDepthTexture?Q.type:null,U=S(M.stencilBuffer,R),Y=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Z=Oe(M);Fe(M)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Z,U,M.width,M.height):V?n.renderbufferStorageMultisample(n.RENDERBUFFER,Z,U,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,U,M.width,M.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Y,n.RENDERBUFFER,C)}else{const Q=M.textures;for(let R=0;R<Q.length;R++){const U=Q[R],Y=s.convert(U.format,U.colorSpace),Z=s.convert(U.type),te=y(U.internalFormat,Y,Z,U.colorSpace),be=Oe(M);V&&Fe(M)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,be,te,M.width,M.height):Fe(M)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,be,te,M.width,M.height):n.renderbufferStorage(n.RENDERBUFFER,te,M.width,M.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Ee(C,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,C),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Q=i.get(M.depthTexture);Q.__renderTarget=M,(!Q.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),W(M.depthTexture,0);const R=Q.__webglTexture,U=Oe(M);if(M.depthTexture.format===Gi)Fe(M)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,R,0,U):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,R,0);else if(M.depthTexture.format===Vi)Fe(M)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,R,0,U):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,R,0);else throw new Error("Unknown depthTexture format")}function ke(C){const M=i.get(C),V=C.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==C.depthTexture){const Q=C.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),Q){const R=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,Q.removeEventListener("dispose",R)};Q.addEventListener("dispose",R),M.__depthDisposeCallback=R}M.__boundDepthTexture=Q}if(C.depthTexture&&!M.__autoAllocateDepthBuffer){if(V)throw new Error("target.depthTexture not supported in Cube render targets");Ee(M.__webglFramebuffer,C)}else if(V){M.__webglDepthbuffer=[];for(let Q=0;Q<6;Q++)if(t.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer[Q]),M.__webglDepthbuffer[Q]===void 0)M.__webglDepthbuffer[Q]=n.createRenderbuffer(),oe(M.__webglDepthbuffer[Q],C,!1);else{const R=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,U=M.__webglDepthbuffer[Q];n.bindRenderbuffer(n.RENDERBUFFER,U),n.framebufferRenderbuffer(n.FRAMEBUFFER,R,n.RENDERBUFFER,U)}}else if(t.bindFramebuffer(n.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=n.createRenderbuffer(),oe(M.__webglDepthbuffer,C,!1);else{const Q=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,R=M.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,R),n.framebufferRenderbuffer(n.FRAMEBUFFER,Q,n.RENDERBUFFER,R)}t.bindFramebuffer(n.FRAMEBUFFER,null)}function Te(C,M,V){const Q=i.get(C);M!==void 0&&_e(Q.__webglFramebuffer,C,C.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),V!==void 0&&ke(C)}function $e(C){const M=C.texture,V=i.get(C),Q=i.get(M);C.addEventListener("dispose",b);const R=C.textures,U=C.isWebGLCubeRenderTarget===!0,Y=R.length>1;if(Y||(Q.__webglTexture===void 0&&(Q.__webglTexture=n.createTexture()),Q.__version=M.version,o.memory.textures++),U){V.__webglFramebuffer=[];for(let Z=0;Z<6;Z++)if(M.mipmaps&&M.mipmaps.length>0){V.__webglFramebuffer[Z]=[];for(let te=0;te<M.mipmaps.length;te++)V.__webglFramebuffer[Z][te]=n.createFramebuffer()}else V.__webglFramebuffer[Z]=n.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){V.__webglFramebuffer=[];for(let Z=0;Z<M.mipmaps.length;Z++)V.__webglFramebuffer[Z]=n.createFramebuffer()}else V.__webglFramebuffer=n.createFramebuffer();if(Y)for(let Z=0,te=R.length;Z<te;Z++){const be=i.get(R[Z]);be.__webglTexture===void 0&&(be.__webglTexture=n.createTexture(),o.memory.textures++)}if(C.samples>0&&Fe(C)===!1){V.__webglMultisampledFramebuffer=n.createFramebuffer(),V.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let Z=0;Z<R.length;Z++){const te=R[Z];V.__webglColorRenderbuffer[Z]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,V.__webglColorRenderbuffer[Z]);const be=s.convert(te.format,te.colorSpace),ne=s.convert(te.type),fe=y(te.internalFormat,be,ne,te.colorSpace,C.isXRRenderTarget===!0),Ae=Oe(C);n.renderbufferStorageMultisample(n.RENDERBUFFER,Ae,fe,C.width,C.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Z,n.RENDERBUFFER,V.__webglColorRenderbuffer[Z])}n.bindRenderbuffer(n.RENDERBUFFER,null),C.depthBuffer&&(V.__webglDepthRenderbuffer=n.createRenderbuffer(),oe(V.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(U){t.bindTexture(n.TEXTURE_CUBE_MAP,Q.__webglTexture),we(n.TEXTURE_CUBE_MAP,M);for(let Z=0;Z<6;Z++)if(M.mipmaps&&M.mipmaps.length>0)for(let te=0;te<M.mipmaps.length;te++)_e(V.__webglFramebuffer[Z][te],C,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,te);else _e(V.__webglFramebuffer[Z],C,M,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0);m(M)&&p(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Y){for(let Z=0,te=R.length;Z<te;Z++){const be=R[Z],ne=i.get(be);t.bindTexture(n.TEXTURE_2D,ne.__webglTexture),we(n.TEXTURE_2D,be),_e(V.__webglFramebuffer,C,be,n.COLOR_ATTACHMENT0+Z,n.TEXTURE_2D,0),m(be)&&p(n.TEXTURE_2D)}t.unbindTexture()}else{let Z=n.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(Z=C.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(Z,Q.__webglTexture),we(Z,M),M.mipmaps&&M.mipmaps.length>0)for(let te=0;te<M.mipmaps.length;te++)_e(V.__webglFramebuffer[te],C,M,n.COLOR_ATTACHMENT0,Z,te);else _e(V.__webglFramebuffer,C,M,n.COLOR_ATTACHMENT0,Z,0);m(M)&&p(Z),t.unbindTexture()}C.depthBuffer&&ke(C)}function Qe(C){const M=C.textures;for(let V=0,Q=M.length;V<Q;V++){const R=M[V];if(m(R)){const U=T(C),Y=i.get(R).__webglTexture;t.bindTexture(U,Y),p(U),t.unbindTexture()}}}const Ne=[],F=[];function Tt(C){if(C.samples>0){if(Fe(C)===!1){const M=C.textures,V=C.width,Q=C.height;let R=n.COLOR_BUFFER_BIT;const U=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Y=i.get(C),Z=M.length>1;if(Z)for(let te=0;te<M.length;te++)t.bindFramebuffer(n.FRAMEBUFFER,Y.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+te,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Y.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+te,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Y.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Y.__webglFramebuffer);for(let te=0;te<M.length;te++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(R|=n.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(R|=n.STENCIL_BUFFER_BIT)),Z){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Y.__webglColorRenderbuffer[te]);const be=i.get(M[te]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,be,0)}n.blitFramebuffer(0,0,V,Q,0,0,V,Q,R,n.NEAREST),c===!0&&(Ne.length=0,F.length=0,Ne.push(n.COLOR_ATTACHMENT0+te),C.depthBuffer&&C.resolveDepthBuffer===!1&&(Ne.push(U),F.push(U),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,F)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Ne))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Z)for(let te=0;te<M.length;te++){t.bindFramebuffer(n.FRAMEBUFFER,Y.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+te,n.RENDERBUFFER,Y.__webglColorRenderbuffer[te]);const be=i.get(M[te]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Y.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+te,n.TEXTURE_2D,be,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Y.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.resolveDepthBuffer===!1&&c){const M=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[M])}}}function Oe(C){return Math.min(r.maxSamples,C.samples)}function Fe(C){const M=i.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function ve(C){const M=o.render.frame;h.get(C)!==M&&(h.set(C,M),C.update())}function Ze(C,M){const V=C.colorSpace,Q=C.format,R=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||V!==yi&&V!==yn&&(We.getTransfer(V)===Ke?(Q!==Ut||R!==tn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",V)),M}function xe(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(l.width=C.naturalWidth||C.width,l.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(l.width=C.displayWidth,l.height=C.displayHeight):(l.width=C.width,l.height=C.height),l}this.allocateTextureUnit=I,this.resetTextureUnits=D,this.setTexture2D=W,this.setTexture2DArray=B,this.setTexture3D=j,this.setTextureCube=G,this.rebindTextures=Te,this.setupRenderTarget=$e,this.updateRenderTargetMipmap=Qe,this.updateMultisampleRenderTarget=Tt,this.setupDepthRenderbuffer=ke,this.setupFrameBufferTexture=_e,this.useMultisampledRTT=Fe}function s_(n,e){function t(i,r=yn){let s;const o=We.getTransfer(r);if(i===tn)return n.UNSIGNED_BYTE;if(i===Eo)return n.UNSIGNED_SHORT_4_4_4_4;if(i===To)return n.UNSIGNED_SHORT_5_5_5_1;if(i===wc)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===bc)return n.BYTE;if(i===Ac)return n.SHORT;if(i===ki)return n.UNSIGNED_SHORT;if(i===yo)return n.INT;if(i===Vn)return n.UNSIGNED_INT;if(i===Kt)return n.FLOAT;if(i===$i)return n.HALF_FLOAT;if(i===Rc)return n.ALPHA;if(i===Cc)return n.RGB;if(i===Ut)return n.RGBA;if(i===Pc)return n.LUMINANCE;if(i===Lc)return n.LUMINANCE_ALPHA;if(i===Gi)return n.DEPTH_COMPONENT;if(i===Vi)return n.DEPTH_STENCIL;if(i===Dc)return n.RED;if(i===bo)return n.RED_INTEGER;if(i===Uc)return n.RG;if(i===Ao)return n.RG_INTEGER;if(i===wo)return n.RGBA_INTEGER;if(i===Pr||i===Lr||i===Dr||i===Ur)if(o===Ke)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===Pr)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Lr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Dr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ur)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===Pr)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Lr)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Dr)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ur)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Vs||i===Ws||i===Xs||i===qs)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Vs)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Ws)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Xs)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===qs)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Ys||i===js||i===$s)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Ys||i===js)return o===Ke?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===$s)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Ks||i===Zs||i===Js||i===Qs||i===eo||i===to||i===no||i===io||i===ro||i===so||i===oo||i===ao||i===co||i===lo)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Ks)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Zs)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Js)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Qs)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===eo)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===to)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===no)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===io)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===ro)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===so)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===oo)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ao)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===co)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===lo)return o===Ke?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ir||i===uo||i===ho)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===Ir)return o===Ke?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===uo)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===ho)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Ic||i===fo||i===po||i===mo)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===Ir)return s.COMPRESSED_RED_RGTC1_EXT;if(i===fo)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===po)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===mo)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Hi?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const o_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,a_=`
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

}`;class c_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,i){if(this.texture===null){const r=new wt,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!==i.depthNear||t.depthFar!==i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new mn({vertexShader:o_,fragmentShader:a_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zt(new Qi(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class l_ extends Ai{constructor(e,t){super();const i=this;let r=null,s=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,f=null,d=null,_=null;const g=new c_,m=t.getContextAttributes();let p=null,T=null;const y=[],S=[],L=new Ge;let w=null;const b=new Yt;b.viewport=new rt;const P=new Yt;P.viewport=new rt;const v=[b,P],x=new Rh;let A=null,D=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let se=y[K];return se===void 0&&(se=new xs,y[K]=se),se.getTargetRaySpace()},this.getControllerGrip=function(K){let se=y[K];return se===void 0&&(se=new xs,y[K]=se),se.getGripSpace()},this.getHand=function(K){let se=y[K];return se===void 0&&(se=new xs,y[K]=se),se.getHandSpace()};function I(K){const se=S.indexOf(K.inputSource);if(se===-1)return;const _e=y[se];_e!==void 0&&(_e.update(K.inputSource,K.frame,l||o),_e.dispatchEvent({type:K.type,data:K.inputSource}))}function k(){r.removeEventListener("select",I),r.removeEventListener("selectstart",I),r.removeEventListener("selectend",I),r.removeEventListener("squeeze",I),r.removeEventListener("squeezestart",I),r.removeEventListener("squeezeend",I),r.removeEventListener("end",k),r.removeEventListener("inputsourceschange",W);for(let K=0;K<y.length;K++){const se=S[K];se!==null&&(S[K]=null,y[K].disconnect(se))}A=null,D=null,g.reset(),e.setRenderTarget(p),d=null,f=null,u=null,r=null,T=null,Ie.stop(),i.isPresenting=!1,e.setPixelRatio(w),e.setSize(L.width,L.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){s=K,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){a=K,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(K){l=K},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return u},this.getFrame=function(){return _},this.getSession=function(){return r},this.setSession=async function(K){if(r=K,r!==null){if(p=e.getRenderTarget(),r.addEventListener("select",I),r.addEventListener("selectstart",I),r.addEventListener("selectend",I),r.addEventListener("squeeze",I),r.addEventListener("squeezestart",I),r.addEventListener("squeezeend",I),r.addEventListener("end",k),r.addEventListener("inputsourceschange",W),m.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(L),typeof XRWebGLBinding<"u"&&"createProjectionLayer"in XRWebGLBinding.prototype){let _e=null,oe=null,Ee=null;m.depth&&(Ee=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,_e=m.stencil?Vi:Gi,oe=m.stencil?Hi:Vn);const ke={colorFormat:t.RGBA8,depthFormat:Ee,scaleFactor:s};u=new XRWebGLBinding(r,t),f=u.createProjectionLayer(ke),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),T=new Lt(f.textureWidth,f.textureHeight,{format:Ut,type:tn,depthTexture:new Yc(f.textureWidth,f.textureHeight,oe,void 0,void 0,void 0,void 0,void 0,void 0,_e),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const _e={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,t,_e),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),T=new Lt(d.framebufferWidth,d.framebufferHeight,{format:Ut,type:tn,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(a),Ie.setContext(r),Ie.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function W(K){for(let se=0;se<K.removed.length;se++){const _e=K.removed[se],oe=S.indexOf(_e);oe>=0&&(S[oe]=null,y[oe].disconnect(_e))}for(let se=0;se<K.added.length;se++){const _e=K.added[se];let oe=S.indexOf(_e);if(oe===-1){for(let ke=0;ke<y.length;ke++)if(ke>=S.length){S.push(_e),oe=ke;break}else if(S[ke]===null){S[ke]=_e,oe=ke;break}if(oe===-1)break}const Ee=y[oe];Ee&&Ee.connect(_e)}}const B=new H,j=new H;function G(K,se,_e){B.setFromMatrixPosition(se.matrixWorld),j.setFromMatrixPosition(_e.matrixWorld);const oe=B.distanceTo(j),Ee=se.projectionMatrix.elements,ke=_e.projectionMatrix.elements,Te=Ee[14]/(Ee[10]-1),$e=Ee[14]/(Ee[10]+1),Qe=(Ee[9]+1)/Ee[5],Ne=(Ee[9]-1)/Ee[5],F=(Ee[8]-1)/Ee[0],Tt=(ke[8]+1)/ke[0],Oe=Te*F,Fe=Te*Tt,ve=oe/(-F+Tt),Ze=ve*-F;if(se.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(Ze),K.translateZ(ve),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),Ee[10]===-1)K.projectionMatrix.copy(se.projectionMatrix),K.projectionMatrixInverse.copy(se.projectionMatrixInverse);else{const xe=Te+ve,C=$e+ve,M=Oe-Ze,V=Fe+(oe-Ze),Q=Qe*$e/C*xe,R=Ne*$e/C*xe;K.projectionMatrix.makePerspective(M,V,Q,R,xe,C),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function J(K,se){se===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(se.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(r===null)return;let se=K.near,_e=K.far;g.texture!==null&&(g.depthNear>0&&(se=g.depthNear),g.depthFar>0&&(_e=g.depthFar)),x.near=P.near=b.near=se,x.far=P.far=b.far=_e,(A!==x.near||D!==x.far)&&(r.updateRenderState({depthNear:x.near,depthFar:x.far}),A=x.near,D=x.far),b.layers.mask=K.layers.mask|2,P.layers.mask=K.layers.mask|4,x.layers.mask=b.layers.mask|P.layers.mask;const oe=K.parent,Ee=x.cameras;J(x,oe);for(let ke=0;ke<Ee.length;ke++)J(Ee[ke],oe);Ee.length===2?G(x,b,P):x.projectionMatrix.copy(b.projectionMatrix),re(K,x,oe)};function re(K,se,_e){_e===null?K.matrix.copy(se.matrixWorld):(K.matrix.copy(_e.matrixWorld),K.matrix.invert(),K.matrix.multiply(se.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(se.projectionMatrix),K.projectionMatrixInverse.copy(se.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Wi*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return x},this.getFoveation=function(){if(!(f===null&&d===null))return c},this.setFoveation=function(K){c=K,f!==null&&(f.fixedFoveation=K),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=K)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(x)};let me=null;function we(K,se){if(h=se.getViewerPose(l||o),_=se,h!==null){const _e=h.views;d!==null&&(e.setRenderTargetFramebuffer(T,d.framebuffer),e.setRenderTarget(T));let oe=!1;_e.length!==x.cameras.length&&(x.cameras.length=0,oe=!0);for(let Te=0;Te<_e.length;Te++){const $e=_e[Te];let Qe=null;if(d!==null)Qe=d.getViewport($e);else{const F=u.getViewSubImage(f,$e);Qe=F.viewport,Te===0&&(e.setRenderTargetTextures(T,F.colorTexture,F.depthStencilTexture),e.setRenderTarget(T))}let Ne=v[Te];Ne===void 0&&(Ne=new Yt,Ne.layers.enable(Te),Ne.viewport=new rt,v[Te]=Ne),Ne.matrix.fromArray($e.transform.matrix),Ne.matrix.decompose(Ne.position,Ne.quaternion,Ne.scale),Ne.projectionMatrix.fromArray($e.projectionMatrix),Ne.projectionMatrixInverse.copy(Ne.projectionMatrix).invert(),Ne.viewport.set(Qe.x,Qe.y,Qe.width,Qe.height),Te===0&&(x.matrix.copy(Ne.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale)),oe===!0&&x.cameras.push(Ne)}const Ee=r.enabledFeatures;if(Ee&&Ee.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&u){const Te=u.getDepthInformation(_e[0]);Te&&Te.isValid&&Te.texture&&g.init(e,Te,r.renderState)}}for(let _e=0;_e<y.length;_e++){const oe=S[_e],Ee=y[_e];oe!==null&&Ee!==void 0&&Ee.update(oe,se,l||o)}me&&me(K,se),se.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:se}),_=null}const Ie=new $c;Ie.setAnimationLoop(we),this.setAnimationLoop=function(K){me=K},this.dispose=function(){}}}const Un=new pn,u_=new at;function h_(n,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,Vc(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,T,y,S){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),u(m,p)):p.isMeshPhongMaterial?(s(m,p),h(m,p)):p.isMeshStandardMaterial?(s(m,p),f(m,p),p.isMeshPhysicalMaterial&&d(m,p,S)):p.isMeshMatcapMaterial?(s(m,p),_(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),g(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?c(m,p,T,y):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===At&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===At&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const T=e.get(p),y=T.envMap,S=T.envMapRotation;y&&(m.envMap.value=y,Un.copy(S),Un.x*=-1,Un.y*=-1,Un.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Un.y*=-1,Un.z*=-1),m.envMapRotation.value.setFromMatrix4(u_.makeRotationFromEuler(Un)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,T,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*T,m.scale.value=y*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function f(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,T){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===At&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=T.texture,m.transmissionSamplerSize.value.set(T.width,T.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function _(m,p){p.matcap&&(m.matcap.value=p.matcap)}function g(m,p){const T=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(T.matrixWorld),m.nearDistance.value=T.shadow.camera.near,m.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function f_(n,e,t,i){let r={},s={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function c(T,y){const S=y.program;i.uniformBlockBinding(T,S)}function l(T,y){let S=r[T.id];S===void 0&&(_(T),S=h(T),r[T.id]=S,T.addEventListener("dispose",m));const L=y.program;i.updateUBOMapping(T,L);const w=e.render.frame;s[T.id]!==w&&(f(T),s[T.id]=w)}function h(T){const y=u();T.__bindingPointIndex=y;const S=n.createBuffer(),L=T.__size,w=T.usage;return n.bindBuffer(n.UNIFORM_BUFFER,S),n.bufferData(n.UNIFORM_BUFFER,L,w),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,y,S),S}function u(){for(let T=0;T<a;T++)if(o.indexOf(T)===-1)return o.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(T){const y=r[T.id],S=T.uniforms,L=T.__cache;n.bindBuffer(n.UNIFORM_BUFFER,y);for(let w=0,b=S.length;w<b;w++){const P=Array.isArray(S[w])?S[w]:[S[w]];for(let v=0,x=P.length;v<x;v++){const A=P[v];if(d(A,w,v,L)===!0){const D=A.__offset,I=Array.isArray(A.value)?A.value:[A.value];let k=0;for(let W=0;W<I.length;W++){const B=I[W],j=g(B);typeof B=="number"||typeof B=="boolean"?(A.__data[0]=B,n.bufferSubData(n.UNIFORM_BUFFER,D+k,A.__data)):B.isMatrix3?(A.__data[0]=B.elements[0],A.__data[1]=B.elements[1],A.__data[2]=B.elements[2],A.__data[3]=0,A.__data[4]=B.elements[3],A.__data[5]=B.elements[4],A.__data[6]=B.elements[5],A.__data[7]=0,A.__data[8]=B.elements[6],A.__data[9]=B.elements[7],A.__data[10]=B.elements[8],A.__data[11]=0):(B.toArray(A.__data,k),k+=j.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,D,A.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function d(T,y,S,L){const w=T.value,b=y+"_"+S;if(L[b]===void 0)return typeof w=="number"||typeof w=="boolean"?L[b]=w:L[b]=w.clone(),!0;{const P=L[b];if(typeof w=="number"||typeof w=="boolean"){if(P!==w)return L[b]=w,!0}else if(P.equals(w)===!1)return P.copy(w),!0}return!1}function _(T){const y=T.uniforms;let S=0;const L=16;for(let b=0,P=y.length;b<P;b++){const v=Array.isArray(y[b])?y[b]:[y[b]];for(let x=0,A=v.length;x<A;x++){const D=v[x],I=Array.isArray(D.value)?D.value:[D.value];for(let k=0,W=I.length;k<W;k++){const B=I[k],j=g(B),G=S%L,J=G%j.boundary,re=G+J;S+=J,re!==0&&L-re<j.storage&&(S+=L-re),D.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=S,S+=j.storage}}}const w=S%L;return w>0&&(S+=L-w),T.__size=S,T.__cache={},this}function g(T){const y={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(y.boundary=4,y.storage=4):T.isVector2?(y.boundary=8,y.storage=8):T.isVector3||T.isColor?(y.boundary=16,y.storage=12):T.isVector4?(y.boundary=16,y.storage=16):T.isMatrix3?(y.boundary=48,y.storage=48):T.isMatrix4?(y.boundary=64,y.storage=64):T.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T),y}function m(T){const y=T.target;y.removeEventListener("dispose",m);const S=o.indexOf(y.__bindingPointIndex);o.splice(S,1),n.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function p(){for(const T in r)n.deleteBuffer(r[T]);o=[],r={},s={}}return{bind:c,update:l,dispose:p}}class d_{constructor(e={}){const{canvas:t=ju(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let d;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=i.getContextAttributes().alpha}else d=o;const _=new Uint32Array(4),g=new Int32Array(4);let m=null,p=null;const T=[],y=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Tn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const S=this;let L=!1;this._outputColorSpace=zt;let w=0,b=0,P=null,v=-1,x=null;const A=new rt,D=new rt;let I=null;const k=new je(0);let W=0,B=t.width,j=t.height,G=1,J=null,re=null;const me=new rt(0,0,B,j),we=new rt(0,0,B,j);let Ie=!1;const K=new qc;let se=!1,_e=!1;const oe=new at,Ee=new at,ke=new H,Te=new rt,$e={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Qe=!1;function Ne(){return P===null?G:1}let F=i;function Tt(E,O){return t.getContext(E,O)}try{const E={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Mo}`),t.addEventListener("webglcontextlost",ee,!1),t.addEventListener("webglcontextrestored",he,!1),t.addEventListener("webglcontextcreationerror",ue,!1),F===null){const O="webgl2";if(F=Tt(O,E),F===null)throw Tt(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let Oe,Fe,ve,Ze,xe,C,M,V,Q,R,U,Y,Z,te,be,ne,fe,Ae,Se,de,ze,De,Je,N;function le(){Oe=new Ep(F),Oe.init(),De=new s_(F,Oe),Fe=new _p(F,Oe,e,De),ve=new i_(F,Oe),Fe.reverseDepthBuffer&&f&&ve.buffers.depth.setReversed(!0),Ze=new Ap(F),xe=new Wm,C=new r_(F,Oe,ve,xe,Fe,De,Ze),M=new vp(S),V=new yp(S),Q=new Lh(F),Je=new pp(F,Q),R=new Tp(F,Q,Ze,Je),U=new Rp(F,R,Q,Ze),Se=new wp(F,Fe,C),ne=new gp(xe),Y=new Vm(S,M,V,Oe,Fe,Je,ne),Z=new h_(S,xe),te=new qm,be=new Jm(Oe),Ae=new dp(S,M,V,ve,U,d,c),fe=new t_(S,U,Fe),N=new f_(F,Ze,Fe,ve),de=new mp(F,Oe,Ze),ze=new bp(F,Oe,Ze),Ze.programs=Y.programs,S.capabilities=Fe,S.extensions=Oe,S.properties=xe,S.renderLists=te,S.shadowMap=fe,S.state=ve,S.info=Ze}le();const $=new l_(S,F);this.xr=$,this.getContext=function(){return F},this.getContextAttributes=function(){return F.getContextAttributes()},this.forceContextLoss=function(){const E=Oe.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Oe.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return G},this.setPixelRatio=function(E){E!==void 0&&(G=E,this.setSize(B,j,!1))},this.getSize=function(E){return E.set(B,j)},this.setSize=function(E,O,X=!0){if($.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=E,j=O,t.width=Math.floor(E*G),t.height=Math.floor(O*G),X===!0&&(t.style.width=E+"px",t.style.height=O+"px"),this.setViewport(0,0,E,O)},this.getDrawingBufferSize=function(E){return E.set(B*G,j*G).floor()},this.setDrawingBufferSize=function(E,O,X){B=E,j=O,G=X,t.width=Math.floor(E*X),t.height=Math.floor(O*X),this.setViewport(0,0,E,O)},this.getCurrentViewport=function(E){return E.copy(A)},this.getViewport=function(E){return E.copy(me)},this.setViewport=function(E,O,X,q){E.isVector4?me.set(E.x,E.y,E.z,E.w):me.set(E,O,X,q),ve.viewport(A.copy(me).multiplyScalar(G).round())},this.getScissor=function(E){return E.copy(we)},this.setScissor=function(E,O,X,q){E.isVector4?we.set(E.x,E.y,E.z,E.w):we.set(E,O,X,q),ve.scissor(D.copy(we).multiplyScalar(G).round())},this.getScissorTest=function(){return Ie},this.setScissorTest=function(E){ve.setScissorTest(Ie=E)},this.setOpaqueSort=function(E){J=E},this.setTransparentSort=function(E){re=E},this.getClearColor=function(E){return E.copy(Ae.getClearColor())},this.setClearColor=function(){Ae.setClearColor(...arguments)},this.getClearAlpha=function(){return Ae.getClearAlpha()},this.setClearAlpha=function(){Ae.setClearAlpha(...arguments)},this.clear=function(E=!0,O=!0,X=!0){let q=0;if(E){let z=!1;if(P!==null){const ie=P.texture.format;z=ie===wo||ie===Ao||ie===bo}if(z){const ie=P.texture.type,ce=ie===tn||ie===Vn||ie===ki||ie===Hi||ie===Eo||ie===To,pe=Ae.getClearColor(),ge=Ae.getClearAlpha(),Ce=pe.r,Re=pe.g,Me=pe.b;ce?(_[0]=Ce,_[1]=Re,_[2]=Me,_[3]=ge,F.clearBufferuiv(F.COLOR,0,_)):(g[0]=Ce,g[1]=Re,g[2]=Me,g[3]=ge,F.clearBufferiv(F.COLOR,0,g))}else q|=F.COLOR_BUFFER_BIT}O&&(q|=F.DEPTH_BUFFER_BIT),X&&(q|=F.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),F.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ee,!1),t.removeEventListener("webglcontextrestored",he,!1),t.removeEventListener("webglcontextcreationerror",ue,!1),Ae.dispose(),te.dispose(),be.dispose(),xe.dispose(),M.dispose(),V.dispose(),U.dispose(),Je.dispose(),N.dispose(),Y.dispose(),$.dispose(),$.removeEventListener("sessionstart",Oo),$.removeEventListener("sessionend",Bo),An.stop()};function ee(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),L=!0}function he(){console.log("THREE.WebGLRenderer: Context Restored."),L=!1;const E=Ze.autoReset,O=fe.enabled,X=fe.autoUpdate,q=fe.needsUpdate,z=fe.type;le(),Ze.autoReset=E,fe.enabled=O,fe.autoUpdate=X,fe.needsUpdate=q,fe.type=z}function ue(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function Le(E){const O=E.target;O.removeEventListener("dispose",Le),tt(O)}function tt(E){dt(E),xe.remove(E)}function dt(E){const O=xe.get(E).programs;O!==void 0&&(O.forEach(function(X){Y.releaseProgram(X)}),E.isShaderMaterial&&Y.releaseShaderCache(E))}this.renderBufferDirect=function(E,O,X,q,z,ie){O===null&&(O=$e);const ce=z.isMesh&&z.matrixWorld.determinant()<0,pe=ul(E,O,X,q,z);ve.setMaterial(q,ce);let ge=X.index,Ce=1;if(q.wireframe===!0){if(ge=R.getWireframeAttribute(X),ge===void 0)return;Ce=2}const Re=X.drawRange,Me=X.attributes.position;let He=Re.start*Ce,Xe=(Re.start+Re.count)*Ce;ie!==null&&(He=Math.max(He,ie.start*Ce),Xe=Math.min(Xe,(ie.start+ie.count)*Ce)),ge!==null?(He=Math.max(He,0),Xe=Math.min(Xe,ge.count)):Me!=null&&(He=Math.max(He,0),Xe=Math.min(Xe,Me.count));const st=Xe-He;if(st<0||st===1/0)return;Je.setup(z,q,pe,X,ge);let nt,Ve=de;if(ge!==null&&(nt=Q.get(ge),Ve=ze,Ve.setIndex(nt)),z.isMesh)q.wireframe===!0?(ve.setLineWidth(q.wireframeLinewidth*Ne()),Ve.setMode(F.LINES)):Ve.setMode(F.TRIANGLES);else if(z.isLine){let ye=q.linewidth;ye===void 0&&(ye=1),ve.setLineWidth(ye*Ne()),z.isLineSegments?Ve.setMode(F.LINES):z.isLineLoop?Ve.setMode(F.LINE_LOOP):Ve.setMode(F.LINE_STRIP)}else z.isPoints?Ve.setMode(F.POINTS):z.isSprite&&Ve.setMode(F.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)Fr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),Ve.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(Oe.get("WEBGL_multi_draw"))Ve.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const ye=z._multiDrawStarts,ft=z._multiDrawCounts,qe=z._multiDrawCount,Vt=ge?Q.get(ge).bytesPerElement:1,Xn=xe.get(q).currentProgram.getUniforms();for(let Rt=0;Rt<qe;Rt++)Xn.setValue(F,"_gl_DrawID",Rt),Ve.render(ye[Rt]/Vt,ft[Rt])}else if(z.isInstancedMesh)Ve.renderInstances(He,st,z.count);else if(X.isInstancedBufferGeometry){const ye=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,ft=Math.min(X.instanceCount,ye);Ve.renderInstances(He,st,ft)}else Ve.render(He,st)};function Ye(E,O,X){E.transparent===!0&&E.side===un&&E.forceSinglePass===!1?(E.side=At,E.needsUpdate=!0,tr(E,O,X),E.side=bn,E.needsUpdate=!0,tr(E,O,X),E.side=un):tr(E,O,X)}this.compile=function(E,O,X=null){X===null&&(X=E),p=be.get(X),p.init(O),y.push(p),X.traverseVisible(function(z){z.isLight&&z.layers.test(O.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),E!==X&&E.traverseVisible(function(z){z.isLight&&z.layers.test(O.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),p.setupLights();const q=new Set;return E.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const ie=z.material;if(ie)if(Array.isArray(ie))for(let ce=0;ce<ie.length;ce++){const pe=ie[ce];Ye(pe,X,z),q.add(pe)}else Ye(ie,X,z),q.add(ie)}),p=y.pop(),q},this.compileAsync=function(E,O,X=null){const q=this.compile(E,O,X);return new Promise(z=>{function ie(){if(q.forEach(function(ce){xe.get(ce).currentProgram.isReady()&&q.delete(ce)}),q.size===0){z(E);return}setTimeout(ie,10)}Oe.get("KHR_parallel_shader_compile")!==null?ie():setTimeout(ie,10)})};let Gt=null;function nn(E){Gt&&Gt(E)}function Oo(){An.stop()}function Bo(){An.start()}const An=new $c;An.setAnimationLoop(nn),typeof self<"u"&&An.setContext(self),this.setAnimationLoop=function(E){Gt=E,$.setAnimationLoop(E),E===null?An.stop():An.start()},$.addEventListener("sessionstart",Oo),$.addEventListener("sessionend",Bo),this.render=function(E,O){if(O!==void 0&&O.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),$.enabled===!0&&$.isPresenting===!0&&($.cameraAutoUpdate===!0&&$.updateCamera(O),O=$.getCamera()),E.isScene===!0&&E.onBeforeRender(S,E,O,P),p=be.get(E,y.length),p.init(O),y.push(p),Ee.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),K.setFromProjectionMatrix(Ee),_e=this.localClippingEnabled,se=ne.init(this.clippingPlanes,_e),m=te.get(E,T.length),m.init(),T.push(m),$.enabled===!0&&$.isPresenting===!0){const ie=S.xr.getDepthSensingMesh();ie!==null&&$r(ie,O,-1/0,S.sortObjects)}$r(E,O,0,S.sortObjects),m.finish(),S.sortObjects===!0&&m.sort(J,re),Qe=$.enabled===!1||$.isPresenting===!1||$.hasDepthSensing()===!1,Qe&&Ae.addToRenderList(m,E),this.info.render.frame++,se===!0&&ne.beginShadows();const X=p.state.shadowsArray;fe.render(X,E,O),se===!0&&ne.endShadows(),this.info.autoReset===!0&&this.info.reset();const q=m.opaque,z=m.transmissive;if(p.setupLights(),O.isArrayCamera){const ie=O.cameras;if(z.length>0)for(let ce=0,pe=ie.length;ce<pe;ce++){const ge=ie[ce];ko(q,z,E,ge)}Qe&&Ae.render(E);for(let ce=0,pe=ie.length;ce<pe;ce++){const ge=ie[ce];zo(m,E,ge,ge.viewport)}}else z.length>0&&ko(q,z,E,O),Qe&&Ae.render(E),zo(m,E,O);P!==null&&b===0&&(C.updateMultisampleRenderTarget(P),C.updateRenderTargetMipmap(P)),E.isScene===!0&&E.onAfterRender(S,E,O),Je.resetDefaultState(),v=-1,x=null,y.pop(),y.length>0?(p=y[y.length-1],se===!0&&ne.setGlobalState(S.clippingPlanes,p.state.camera)):p=null,T.pop(),T.length>0?m=T[T.length-1]:m=null};function $r(E,O,X,q){if(E.visible===!1)return;if(E.layers.test(O.layers)){if(E.isGroup)X=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(O);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||K.intersectsSprite(E)){q&&Te.setFromMatrixPosition(E.matrixWorld).applyMatrix4(Ee);const ce=U.update(E),pe=E.material;pe.visible&&m.push(E,ce,pe,X,Te.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||K.intersectsObject(E))){const ce=U.update(E),pe=E.material;if(q&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Te.copy(E.boundingSphere.center)):(ce.boundingSphere===null&&ce.computeBoundingSphere(),Te.copy(ce.boundingSphere.center)),Te.applyMatrix4(E.matrixWorld).applyMatrix4(Ee)),Array.isArray(pe)){const ge=ce.groups;for(let Ce=0,Re=ge.length;Ce<Re;Ce++){const Me=ge[Ce],He=pe[Me.materialIndex];He&&He.visible&&m.push(E,ce,He,X,Te.z,Me)}}else pe.visible&&m.push(E,ce,pe,X,Te.z,null)}}const ie=E.children;for(let ce=0,pe=ie.length;ce<pe;ce++)$r(ie[ce],O,X,q)}function zo(E,O,X,q){const z=E.opaque,ie=E.transmissive,ce=E.transparent;p.setupLightsView(X),se===!0&&ne.setGlobalState(S.clippingPlanes,X),q&&ve.viewport(A.copy(q)),z.length>0&&er(z,O,X),ie.length>0&&er(ie,O,X),ce.length>0&&er(ce,O,X),ve.buffers.depth.setTest(!0),ve.buffers.depth.setMask(!0),ve.buffers.color.setMask(!0),ve.setPolygonOffset(!1)}function ko(E,O,X,q){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new Lt(1,1,{generateMipmaps:!0,type:Oe.has("EXT_color_buffer_half_float")||Oe.has("EXT_color_buffer_float")?$i:tn,minFilter:kn,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:We.workingColorSpace}));const ie=p.state.transmissionRenderTarget[q.id],ce=q.viewport||A;ie.setSize(ce.z*S.transmissionResolutionScale,ce.w*S.transmissionResolutionScale);const pe=S.getRenderTarget();S.setRenderTarget(ie),S.getClearColor(k),W=S.getClearAlpha(),W<1&&S.setClearColor(16777215,.5),S.clear(),Qe&&Ae.render(X);const ge=S.toneMapping;S.toneMapping=Tn;const Ce=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),se===!0&&ne.setGlobalState(S.clippingPlanes,q),er(E,X,q),C.updateMultisampleRenderTarget(ie),C.updateRenderTargetMipmap(ie),Oe.has("WEBGL_multisampled_render_to_texture")===!1){let Re=!1;for(let Me=0,He=O.length;Me<He;Me++){const Xe=O[Me],st=Xe.object,nt=Xe.geometry,Ve=Xe.material,ye=Xe.group;if(Ve.side===un&&st.layers.test(q.layers)){const ft=Ve.side;Ve.side=At,Ve.needsUpdate=!0,Ho(st,X,q,nt,Ve,ye),Ve.side=ft,Ve.needsUpdate=!0,Re=!0}}Re===!0&&(C.updateMultisampleRenderTarget(ie),C.updateRenderTargetMipmap(ie))}S.setRenderTarget(pe),S.setClearColor(k,W),Ce!==void 0&&(q.viewport=Ce),S.toneMapping=ge}function er(E,O,X){const q=O.isScene===!0?O.overrideMaterial:null;for(let z=0,ie=E.length;z<ie;z++){const ce=E[z],pe=ce.object,ge=ce.geometry,Ce=ce.group;let Re=ce.material;Re.allowOverride===!0&&q!==null&&(Re=q),pe.layers.test(X.layers)&&Ho(pe,O,X,ge,Re,Ce)}}function Ho(E,O,X,q,z,ie){E.onBeforeRender(S,O,X,q,z,ie),E.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),z.onBeforeRender(S,O,X,q,E,ie),z.transparent===!0&&z.side===un&&z.forceSinglePass===!1?(z.side=At,z.needsUpdate=!0,S.renderBufferDirect(X,O,q,z,E,ie),z.side=bn,z.needsUpdate=!0,S.renderBufferDirect(X,O,q,z,E,ie),z.side=un):S.renderBufferDirect(X,O,q,z,E,ie),E.onAfterRender(S,O,X,q,z,ie)}function tr(E,O,X){O.isScene!==!0&&(O=$e);const q=xe.get(E),z=p.state.lights,ie=p.state.shadowsArray,ce=z.state.version,pe=Y.getParameters(E,z.state,ie,O,X),ge=Y.getProgramCacheKey(pe);let Ce=q.programs;q.environment=E.isMeshStandardMaterial?O.environment:null,q.fog=O.fog,q.envMap=(E.isMeshStandardMaterial?V:M).get(E.envMap||q.environment),q.envMapRotation=q.environment!==null&&E.envMap===null?O.environmentRotation:E.envMapRotation,Ce===void 0&&(E.addEventListener("dispose",Le),Ce=new Map,q.programs=Ce);let Re=Ce.get(ge);if(Re!==void 0){if(q.currentProgram===Re&&q.lightsStateVersion===ce)return Vo(E,pe),Re}else pe.uniforms=Y.getUniforms(E),E.onBeforeCompile(pe,S),Re=Y.acquireProgram(pe,ge),Ce.set(ge,Re),q.uniforms=pe.uniforms;const Me=q.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Me.clippingPlanes=ne.uniform),Vo(E,pe),q.needsLights=fl(E),q.lightsStateVersion=ce,q.needsLights&&(Me.ambientLightColor.value=z.state.ambient,Me.lightProbe.value=z.state.probe,Me.directionalLights.value=z.state.directional,Me.directionalLightShadows.value=z.state.directionalShadow,Me.spotLights.value=z.state.spot,Me.spotLightShadows.value=z.state.spotShadow,Me.rectAreaLights.value=z.state.rectArea,Me.ltc_1.value=z.state.rectAreaLTC1,Me.ltc_2.value=z.state.rectAreaLTC2,Me.pointLights.value=z.state.point,Me.pointLightShadows.value=z.state.pointShadow,Me.hemisphereLights.value=z.state.hemi,Me.directionalShadowMap.value=z.state.directionalShadowMap,Me.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Me.spotShadowMap.value=z.state.spotShadowMap,Me.spotLightMatrix.value=z.state.spotLightMatrix,Me.spotLightMap.value=z.state.spotLightMap,Me.pointShadowMap.value=z.state.pointShadowMap,Me.pointShadowMatrix.value=z.state.pointShadowMatrix),q.currentProgram=Re,q.uniformsList=null,Re}function Go(E){if(E.uniformsList===null){const O=E.currentProgram.getUniforms();E.uniformsList=Nr.seqWithValue(O.seq,E.uniforms)}return E.uniformsList}function Vo(E,O){const X=xe.get(E);X.outputColorSpace=O.outputColorSpace,X.batching=O.batching,X.batchingColor=O.batchingColor,X.instancing=O.instancing,X.instancingColor=O.instancingColor,X.instancingMorph=O.instancingMorph,X.skinning=O.skinning,X.morphTargets=O.morphTargets,X.morphNormals=O.morphNormals,X.morphColors=O.morphColors,X.morphTargetsCount=O.morphTargetsCount,X.numClippingPlanes=O.numClippingPlanes,X.numIntersection=O.numClipIntersection,X.vertexAlphas=O.vertexAlphas,X.vertexTangents=O.vertexTangents,X.toneMapping=O.toneMapping}function ul(E,O,X,q,z){O.isScene!==!0&&(O=$e),C.resetTextureUnits();const ie=O.fog,ce=q.isMeshStandardMaterial?O.environment:null,pe=P===null?S.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:yi,ge=(q.isMeshStandardMaterial?V:M).get(q.envMap||ce),Ce=q.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Re=!!X.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Me=!!X.morphAttributes.position,He=!!X.morphAttributes.normal,Xe=!!X.morphAttributes.color;let st=Tn;q.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(st=S.toneMapping);const nt=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Ve=nt!==void 0?nt.length:0,ye=xe.get(q),ft=p.state.lights;if(se===!0&&(_e===!0||E!==x)){const vt=E===x&&q.id===v;ne.setState(q,E,vt)}let qe=!1;q.version===ye.__version?(ye.needsLights&&ye.lightsStateVersion!==ft.state.version||ye.outputColorSpace!==pe||z.isBatchedMesh&&ye.batching===!1||!z.isBatchedMesh&&ye.batching===!0||z.isBatchedMesh&&ye.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&ye.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&ye.instancing===!1||!z.isInstancedMesh&&ye.instancing===!0||z.isSkinnedMesh&&ye.skinning===!1||!z.isSkinnedMesh&&ye.skinning===!0||z.isInstancedMesh&&ye.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&ye.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&ye.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&ye.instancingMorph===!1&&z.morphTexture!==null||ye.envMap!==ge||q.fog===!0&&ye.fog!==ie||ye.numClippingPlanes!==void 0&&(ye.numClippingPlanes!==ne.numPlanes||ye.numIntersection!==ne.numIntersection)||ye.vertexAlphas!==Ce||ye.vertexTangents!==Re||ye.morphTargets!==Me||ye.morphNormals!==He||ye.morphColors!==Xe||ye.toneMapping!==st||ye.morphTargetsCount!==Ve)&&(qe=!0):(qe=!0,ye.__version=q.version);let Vt=ye.currentProgram;qe===!0&&(Vt=tr(q,O,z));let Xn=!1,Rt=!1,Ci=!1;const et=Vt.getUniforms(),Nt=ye.uniforms;if(ve.useProgram(Vt.program)&&(Xn=!0,Rt=!0,Ci=!0),q.id!==v&&(v=q.id,Rt=!0),Xn||x!==E){ve.buffers.depth.getReversed()?(oe.copy(E.projectionMatrix),Ku(oe),Zu(oe),et.setValue(F,"projectionMatrix",oe)):et.setValue(F,"projectionMatrix",E.projectionMatrix),et.setValue(F,"viewMatrix",E.matrixWorldInverse);const bt=et.map.cameraPosition;bt!==void 0&&bt.setValue(F,ke.setFromMatrixPosition(E.matrixWorld)),Fe.logarithmicDepthBuffer&&et.setValue(F,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&et.setValue(F,"isOrthographic",E.isOrthographicCamera===!0),x!==E&&(x=E,Rt=!0,Ci=!0)}if(z.isSkinnedMesh){et.setOptional(F,z,"bindMatrix"),et.setOptional(F,z,"bindMatrixInverse");const vt=z.skeleton;vt&&(vt.boneTexture===null&&vt.computeBoneTexture(),et.setValue(F,"boneTexture",vt.boneTexture,C))}z.isBatchedMesh&&(et.setOptional(F,z,"batchingTexture"),et.setValue(F,"batchingTexture",z._matricesTexture,C),et.setOptional(F,z,"batchingIdTexture"),et.setValue(F,"batchingIdTexture",z._indirectTexture,C),et.setOptional(F,z,"batchingColorTexture"),z._colorsTexture!==null&&et.setValue(F,"batchingColorTexture",z._colorsTexture,C));const Ot=X.morphAttributes;if((Ot.position!==void 0||Ot.normal!==void 0||Ot.color!==void 0)&&Se.update(z,X,Vt),(Rt||ye.receiveShadow!==z.receiveShadow)&&(ye.receiveShadow=z.receiveShadow,et.setValue(F,"receiveShadow",z.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(Nt.envMap.value=ge,Nt.flipEnvMap.value=ge.isCubeTexture&&ge.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&O.environment!==null&&(Nt.envMapIntensity.value=O.environmentIntensity),Rt&&(et.setValue(F,"toneMappingExposure",S.toneMappingExposure),ye.needsLights&&hl(Nt,Ci),ie&&q.fog===!0&&Z.refreshFogUniforms(Nt,ie),Z.refreshMaterialUniforms(Nt,q,G,j,p.state.transmissionRenderTarget[E.id]),Nr.upload(F,Go(ye),Nt,C)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Nr.upload(F,Go(ye),Nt,C),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&et.setValue(F,"center",z.center),et.setValue(F,"modelViewMatrix",z.modelViewMatrix),et.setValue(F,"normalMatrix",z.normalMatrix),et.setValue(F,"modelMatrix",z.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){const vt=q.uniformsGroups;for(let bt=0,Kr=vt.length;bt<Kr;bt++){const wn=vt[bt];N.update(wn,Vt),N.bind(wn,Vt)}}return Vt}function hl(E,O){E.ambientLightColor.needsUpdate=O,E.lightProbe.needsUpdate=O,E.directionalLights.needsUpdate=O,E.directionalLightShadows.needsUpdate=O,E.pointLights.needsUpdate=O,E.pointLightShadows.needsUpdate=O,E.spotLights.needsUpdate=O,E.spotLightShadows.needsUpdate=O,E.rectAreaLights.needsUpdate=O,E.hemisphereLights.needsUpdate=O}function fl(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return b},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(E,O,X){const q=xe.get(E);q.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),xe.get(E.texture).__webglTexture=O,xe.get(E.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:X,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,O){const X=xe.get(E);X.__webglFramebuffer=O,X.__useDefaultFramebuffer=O===void 0};const dl=F.createFramebuffer();this.setRenderTarget=function(E,O=0,X=0){P=E,w=O,b=X;let q=!0,z=null,ie=!1,ce=!1;if(E){const ge=xe.get(E);if(ge.__useDefaultFramebuffer!==void 0)ve.bindFramebuffer(F.FRAMEBUFFER,null),q=!1;else if(ge.__webglFramebuffer===void 0)C.setupRenderTarget(E);else if(ge.__hasExternalTextures)C.rebindTextures(E,xe.get(E.texture).__webglTexture,xe.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Me=E.depthTexture;if(ge.__boundDepthTexture!==Me){if(Me!==null&&xe.has(Me)&&(E.width!==Me.image.width||E.height!==Me.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");C.setupDepthRenderbuffer(E)}}const Ce=E.texture;(Ce.isData3DTexture||Ce.isDataArrayTexture||Ce.isCompressedArrayTexture)&&(ce=!0);const Re=xe.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Re[O])?z=Re[O][X]:z=Re[O],ie=!0):E.samples>0&&C.useMultisampledRTT(E)===!1?z=xe.get(E).__webglMultisampledFramebuffer:Array.isArray(Re)?z=Re[X]:z=Re,A.copy(E.viewport),D.copy(E.scissor),I=E.scissorTest}else A.copy(me).multiplyScalar(G).floor(),D.copy(we).multiplyScalar(G).floor(),I=Ie;if(X!==0&&(z=dl),ve.bindFramebuffer(F.FRAMEBUFFER,z)&&q&&ve.drawBuffers(E,z),ve.viewport(A),ve.scissor(D),ve.setScissorTest(I),ie){const ge=xe.get(E.texture);F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_CUBE_MAP_POSITIVE_X+O,ge.__webglTexture,X)}else if(ce){const ge=xe.get(E.texture),Ce=O;F.framebufferTextureLayer(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,ge.__webglTexture,X,Ce)}else if(E!==null&&X!==0){const ge=xe.get(E.texture);F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,ge.__webglTexture,X)}v=-1},this.readRenderTargetPixels=function(E,O,X,q,z,ie,ce){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let pe=xe.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&ce!==void 0&&(pe=pe[ce]),pe){ve.bindFramebuffer(F.FRAMEBUFFER,pe);try{const ge=E.texture,Ce=ge.format,Re=ge.type;if(!Fe.textureFormatReadable(Ce)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Fe.textureTypeReadable(Re)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=E.width-q&&X>=0&&X<=E.height-z&&F.readPixels(O,X,q,z,De.convert(Ce),De.convert(Re),ie)}finally{const ge=P!==null?xe.get(P).__webglFramebuffer:null;ve.bindFramebuffer(F.FRAMEBUFFER,ge)}}},this.readRenderTargetPixelsAsync=async function(E,O,X,q,z,ie,ce){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let pe=xe.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&ce!==void 0&&(pe=pe[ce]),pe)if(O>=0&&O<=E.width-q&&X>=0&&X<=E.height-z){ve.bindFramebuffer(F.FRAMEBUFFER,pe);const ge=E.texture,Ce=ge.format,Re=ge.type;if(!Fe.textureFormatReadable(Ce))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Fe.textureTypeReadable(Re))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Me=F.createBuffer();F.bindBuffer(F.PIXEL_PACK_BUFFER,Me),F.bufferData(F.PIXEL_PACK_BUFFER,ie.byteLength,F.STREAM_READ),F.readPixels(O,X,q,z,De.convert(Ce),De.convert(Re),0);const He=P!==null?xe.get(P).__webglFramebuffer:null;ve.bindFramebuffer(F.FRAMEBUFFER,He);const Xe=F.fenceSync(F.SYNC_GPU_COMMANDS_COMPLETE,0);return F.flush(),await $u(F,Xe,4),F.bindBuffer(F.PIXEL_PACK_BUFFER,Me),F.getBufferSubData(F.PIXEL_PACK_BUFFER,0,ie),F.deleteBuffer(Me),F.deleteSync(Xe),ie}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,O=null,X=0){const q=Math.pow(2,-X),z=Math.floor(E.image.width*q),ie=Math.floor(E.image.height*q),ce=O!==null?O.x:0,pe=O!==null?O.y:0;C.setTexture2D(E,0),F.copyTexSubImage2D(F.TEXTURE_2D,X,0,0,ce,pe,z,ie),ve.unbindTexture()};const pl=F.createFramebuffer(),ml=F.createFramebuffer();this.copyTextureToTexture=function(E,O,X=null,q=null,z=0,ie=null){ie===null&&(z!==0?(Fr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ie=z,z=0):ie=0);let ce,pe,ge,Ce,Re,Me,He,Xe,st;const nt=E.isCompressedTexture?E.mipmaps[ie]:E.image;if(X!==null)ce=X.max.x-X.min.x,pe=X.max.y-X.min.y,ge=X.isBox3?X.max.z-X.min.z:1,Ce=X.min.x,Re=X.min.y,Me=X.isBox3?X.min.z:0;else{const Ot=Math.pow(2,-z);ce=Math.floor(nt.width*Ot),pe=Math.floor(nt.height*Ot),E.isDataArrayTexture?ge=nt.depth:E.isData3DTexture?ge=Math.floor(nt.depth*Ot):ge=1,Ce=0,Re=0,Me=0}q!==null?(He=q.x,Xe=q.y,st=q.z):(He=0,Xe=0,st=0);const Ve=De.convert(O.format),ye=De.convert(O.type);let ft;O.isData3DTexture?(C.setTexture3D(O,0),ft=F.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(C.setTexture2DArray(O,0),ft=F.TEXTURE_2D_ARRAY):(C.setTexture2D(O,0),ft=F.TEXTURE_2D),F.pixelStorei(F.UNPACK_FLIP_Y_WEBGL,O.flipY),F.pixelStorei(F.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),F.pixelStorei(F.UNPACK_ALIGNMENT,O.unpackAlignment);const qe=F.getParameter(F.UNPACK_ROW_LENGTH),Vt=F.getParameter(F.UNPACK_IMAGE_HEIGHT),Xn=F.getParameter(F.UNPACK_SKIP_PIXELS),Rt=F.getParameter(F.UNPACK_SKIP_ROWS),Ci=F.getParameter(F.UNPACK_SKIP_IMAGES);F.pixelStorei(F.UNPACK_ROW_LENGTH,nt.width),F.pixelStorei(F.UNPACK_IMAGE_HEIGHT,nt.height),F.pixelStorei(F.UNPACK_SKIP_PIXELS,Ce),F.pixelStorei(F.UNPACK_SKIP_ROWS,Re),F.pixelStorei(F.UNPACK_SKIP_IMAGES,Me);const et=E.isDataArrayTexture||E.isData3DTexture,Nt=O.isDataArrayTexture||O.isData3DTexture;if(E.isDepthTexture){const Ot=xe.get(E),vt=xe.get(O),bt=xe.get(Ot.__renderTarget),Kr=xe.get(vt.__renderTarget);ve.bindFramebuffer(F.READ_FRAMEBUFFER,bt.__webglFramebuffer),ve.bindFramebuffer(F.DRAW_FRAMEBUFFER,Kr.__webglFramebuffer);for(let wn=0;wn<ge;wn++)et&&(F.framebufferTextureLayer(F.READ_FRAMEBUFFER,F.COLOR_ATTACHMENT0,xe.get(E).__webglTexture,z,Me+wn),F.framebufferTextureLayer(F.DRAW_FRAMEBUFFER,F.COLOR_ATTACHMENT0,xe.get(O).__webglTexture,ie,st+wn)),F.blitFramebuffer(Ce,Re,ce,pe,He,Xe,ce,pe,F.DEPTH_BUFFER_BIT,F.NEAREST);ve.bindFramebuffer(F.READ_FRAMEBUFFER,null),ve.bindFramebuffer(F.DRAW_FRAMEBUFFER,null)}else if(z!==0||E.isRenderTargetTexture||xe.has(E)){const Ot=xe.get(E),vt=xe.get(O);ve.bindFramebuffer(F.READ_FRAMEBUFFER,pl),ve.bindFramebuffer(F.DRAW_FRAMEBUFFER,ml);for(let bt=0;bt<ge;bt++)et?F.framebufferTextureLayer(F.READ_FRAMEBUFFER,F.COLOR_ATTACHMENT0,Ot.__webglTexture,z,Me+bt):F.framebufferTexture2D(F.READ_FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,Ot.__webglTexture,z),Nt?F.framebufferTextureLayer(F.DRAW_FRAMEBUFFER,F.COLOR_ATTACHMENT0,vt.__webglTexture,ie,st+bt):F.framebufferTexture2D(F.DRAW_FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,vt.__webglTexture,ie),z!==0?F.blitFramebuffer(Ce,Re,ce,pe,He,Xe,ce,pe,F.COLOR_BUFFER_BIT,F.NEAREST):Nt?F.copyTexSubImage3D(ft,ie,He,Xe,st+bt,Ce,Re,ce,pe):F.copyTexSubImage2D(ft,ie,He,Xe,Ce,Re,ce,pe);ve.bindFramebuffer(F.READ_FRAMEBUFFER,null),ve.bindFramebuffer(F.DRAW_FRAMEBUFFER,null)}else Nt?E.isDataTexture||E.isData3DTexture?F.texSubImage3D(ft,ie,He,Xe,st,ce,pe,ge,Ve,ye,nt.data):O.isCompressedArrayTexture?F.compressedTexSubImage3D(ft,ie,He,Xe,st,ce,pe,ge,Ve,nt.data):F.texSubImage3D(ft,ie,He,Xe,st,ce,pe,ge,Ve,ye,nt):E.isDataTexture?F.texSubImage2D(F.TEXTURE_2D,ie,He,Xe,ce,pe,Ve,ye,nt.data):E.isCompressedTexture?F.compressedTexSubImage2D(F.TEXTURE_2D,ie,He,Xe,nt.width,nt.height,Ve,nt.data):F.texSubImage2D(F.TEXTURE_2D,ie,He,Xe,ce,pe,Ve,ye,nt);F.pixelStorei(F.UNPACK_ROW_LENGTH,qe),F.pixelStorei(F.UNPACK_IMAGE_HEIGHT,Vt),F.pixelStorei(F.UNPACK_SKIP_PIXELS,Xn),F.pixelStorei(F.UNPACK_SKIP_ROWS,Rt),F.pixelStorei(F.UNPACK_SKIP_IMAGES,Ci),ie===0&&O.generateMipmaps&&F.generateMipmap(ft),ve.unbindTexture()},this.copyTextureToTexture3D=function(E,O,X=null,q=null,z=0){return Fr('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(E,O,X,q,z)},this.initRenderTarget=function(E){xe.get(E).__webglFramebuffer===void 0&&C.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?C.setTextureCube(E,0):E.isData3DTexture?C.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?C.setTexture2DArray(E,0):C.setTexture2D(E,0),ve.unbindTexture()},this.resetState=function(){w=0,b=0,P=null,ve.reset(),Je.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return hn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=We._getDrawingBufferColorSpace(e),t.unpackColorSpace=We._getUnpackColorSpace()}}function Ka(n,e,t){return!n||n.every(i=>i==null||isNaN(i))?null:n.map(i=>t[0]+(i-e[0])/(e[1]-e[0])*(t[1]-t[0]))}function p_(n){const e=n.trim().split(`
`),t=e[0].split(",").map(i=>i.trim());return e.slice(1).map(i=>{const r=i.split(",").map(o=>o.trim()),s={};return t.forEach((o,a)=>{s[o]=r[a]??""}),s})}async function m_(n={}){const{csvPath:e="/asemic/jamo_data.csv",choRange:t=[0,1]}=n,i=await fetch(e);if(!i.ok)throw new Error(`loadJamo: CSV 로드 실패 ${i.status} @ ${e}`);const r=await i.text(),s=p_(r);if(!s.length||!s[0].jamo)throw new Error(`loadJamo: CSV 파싱 실패 @ ${e} — 응답이 CSV가 아님(HTML 폴백?)`);const o={};for(const a of s){const{jamo:c,type:l}=a;if(!c)continue;const u=a.x!==""&&a.y!==""&&a.z!==""?[parseFloat(a.x),parseFloat(a.y),parseFloat(a.z)]:null;if(l==="cho")o[c]=o[c]||{},o[c].cho={type:"cho",pos:u?Ka(u,[0,1],t):null,tense:parseInt(a.tense)||0,cluster:0,cluster_front:null};else if(l==="jong"){const f=c+"_jong";o[f]={type:"jong",pos:u?Ka(u,[0,1],t):null,tense:parseInt(a.tense)||0,cluster:parseInt(a.cluster)||0,cluster_front:a.cluster_front||null}}else l==="jung"&&(o[c]={type:"jung",pos:u,yang:parseInt(a.yang)||0,diphthong:parseInt(a.diphthong)||0})}return o}const Qt=await m_(),__=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],g_=["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"],v_=["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],Vr=50;function x_(n){const e=[];let t=0;for(const i of n){if(i===" "){e.push({isSpace:!0,wordId:t}),t++;continue}const r=i.charCodeAt(0);if(r>=44032&&r<=55203){const s=r-44032;e.push({cho:__[Math.floor(s/588)],jung:g_[Math.floor(s%588/28)],jong:v_[s%28]||null,wordId:t,isSpace:!1})}}return e}function S_(n,e,t,i,r=1.3,s=0,o=e*2,a=e){const c=e*.5,l=40,h=e*r;let u=c,f=l+e+s;const d=[],_=[];for(const m of n){if(m.isSpace){u+=o*.2,u>t-c&&(u=c,f+=h);continue}u+a>t-c&&(u=c,f+=h),d.push([u/t,f/i]),_.push(m),u+=o}const g=_.length>0?f:l+e+s;return{positions:d,sylItems:_,lastY:g}}function M_(n,e){const t=Qt[n.jung],i=t?.pos?.[0]??500,r=Math.max(0,Math.min(1,(i-250)/600)),s=t?.yang?1:-1,o=t?.diphthong??0,a=1+s*.5*r;return{width:e*a,height:o?e:e*a}}function y_(n,e,t,i,r=1,s=0,o=e,a=0){const c=e*.5,l=40,h=e*Math.max(0,r-1),u=[],f=[],d=[],_=[],g=t-c;let m=c,p=l+s,T=0;const y=()=>{p+=T+h,m=c,T=0};for(const L of n){if(L.isSpace){m+=o*.2,m>g&&y();continue}const{width:w,height:b}=M_(L,e);m+w>g&&m>c&&y(),u.push([m/t,(p+e*.5)/i]),f.push(L),d.push(w),_.push(b),m+=w,b>T&&(T=b)}const S=f.length>0?p+T:l+s;return{positions:u,sylItems:f,widths:d,heights:_,lastY:S}}function Za(n,e,t,i=new H){let r;if(e==="jong"){const s=Qt[n+"_jong"];r=s?.pos??(s?.cluster_front?Qt[s.cluster_front+"_jong"]?.pos:null)??[.5,.5,.5]}else r=Qt[n]?.cho?.pos??[.5,.5,.5];return new H((r[0]-.5)*t*2,(r[1]-.5)*t*2,(r[2]-.5)*t*2).add(i)}function E_(n,e,t,i={x:1,y:1},r=null,s=1){const o=window.innerWidth,a=window.innerHeight,c=2.07*2,l=c*(o/a),h=t/a*c*6,u=.35,f=n.map((L,w)=>w<n.length-1),d=[],_=[],g=[],m=[],p=[],T=[],y=[],S=[];for(let L=0;L<Vr;L++){const w=n[L],b=e[L];if(!w||!b){d.push(new H),_.push(new H),g.push(new H),m.push(new H),p.push(new H),T.push(0),y.push(0),S.push(0);continue}let P;if(r)P=r(b[0],b[1]);else{let Ie=1;h>3.5?Ie=h*.32:h<3&&(Ie=h*.3);const K=(b[0]-.5)*l*i.x+Ie,se=-(b[1]-.5)*c*i.y+.5;P=new H(K,se,0)}const v=h*.5,x=P.clone(),A=Za(w.cho,"cho",v,P),D=Qt[w.jung],I=D?.pos??[500,1e3,2e3],k=(I[0]-250)/650,W=(I[1]-580)/2020,B=(I[2]-2080)/1120,j=w.jong?Za(w.jong,"jong",v*.5,new H):new H(k-.5,W-.5,B-.5).multiplyScalar(v*.5),G=D?.yang??0,J=D?.diphthong??0,re=Qt[w.cho]?.cho?.pos??[.5,.5,.5],we=.55+(I[0]-250)/600*.4;d.push(A),_.push(x),g.push(new H(re[0],re[1],re[2])),m.push(j),p.push(new H(I[0],I[1],I[2])),T.push(h*u*we),y.push(G),S.push(J)}return{starts:d,centers:_,chos:g,ends:m,jungs:p,amps:T,yangseong:y,diphthong:S,confirmed:f,count:Math.min(n.length,Vr),scale:s}}const Ja=1100;function T_(n,e,t=Qt){if(!n)return"vertical";const i=t[n],r=i?.diphthong??0,s=i?.pos?.[1]??1e3;return e?r?"bed":s>=Ja?"right_click":"hamburger":r?"per75":s>=Ja?"vertical":"horizontal"}const b_=12,A_=1e6;function Qa(n,e,t,i,r,s=null,o={}){const a=n.current,c=a?.refHeight,l=c?i/c:1,h=a?.glyphExtent,u=a?.displayScale??1,f=!!(o.line&&s&&h),d=n.name==="signal"?y_:S_,_=s?s.w:t,g=s?s.h:i,m=w=>{const b=w*u,P=(a?.sylSize??55)*b,v=a?.lineHeightRatio??1.3,x=(a?.wrapStep??(a?.sylSize??55)*2)*b,A=(a?.wrapMargin??a?.sylSize??55)*b,D={sylSize:P,lineHeightRatio:v,wrapStep:x,wrapMargin:A};if(!h){const K=d(e,P,_,g,v,r,x,A);return s&&(K.positions=K.positions.map(([se,_e])=>[(s.x+se*s.w)/t,(s.y+_e*s.h)/i])),{...K,...D,bottom:0}}const I=h*P,k=I-P*.5,W=(f?g/2:I)-(40+P),B=f?A_:_-2*k,j=d(e,P,B,g,v,r,x,A),G=s?s.x:0,J=s?s.y:0,re=j.positions.length,me=re?j.positions[re-1][0]*B+k:0,we=re?Math.max(0,me+I-_):0;j.positions=j.positions.map(([K,se])=>[(G+K*B+k)/t,(J+se*g+W)/i]),j.lastY+=W;const Ie=j.sylItems.length?j.lastY+I-r:0;return{...j,...D,bottom:Ie,scrollX:we}},p=(a?._ctlBase?.sylSize??a?.sylSize??55)*l,T=(w,b)=>(delete w.bottom,{...w,fitLines:b,glyphScale:w.sylSize/p});if(!(s&&h))return T(m(l),0);const y=a?.lineHeightRatio??1.3,S=(a?.sylSize??55)*l*u;if(f)return T(m(l*Math.min(1,g/(S*2*h))),1);let L;for(let w=1;w<=b_;w++){const b=Math.min(1,g/(S*(2*h+(w-1)*y)));if(L=m(l*b),L.fitLines=w,L.bottom<=g+.5)break}return T(L,L.fitLines)}function w_(n){return!!(n?.flushQueue&&n?.captureFrame&&n?.clearAccum)}function R_(n,e,t,i,r,s,o=1){if(!e.length)return;const a=n.current?.layoutScale??{x:1,y:1};if(n.name==="mycelium"){const c=n.current?.screenToWorld?(h,u)=>n.current.screenToWorld(h,u):null,l=c?o:1;n.update(E_(e,t,i/l,a,c,l),e.length,e)}else n.name==="sora"?n.update(e,t,Qt):n.name==="signal"?n.update(e,t,Qt,i,r,s):n.name==="dandelion"&&n.update(e,t,Qt)}const Et=0,gt=1,Dt=2,en=3,Fi=180,Gn=12,C_=.02,St=.6,ci=.4,li=.2,P_=1.4,L_=.8,D_=1,el=.8,Do=.9,tl={[gt]:P_,[Dt]:L_,[en]:D_,[Et]:Do},U_=.08,I_=Gn*Gn,F_=.5,N_=2.2,O_=Gn*2.2,nl=2048,Or=.25,B_=.94,z_=.45,k_=1.6,H_=1,G_=10.85,V_=0,W_=1.2,X_=1.5,q_=1.25,ec=.99,Y_=.01,j_=1.05,Ar=.16,tc=3;function $_(n,e){const t=Math.sqrt(n*n+e*e);if(t<1e-6)return[0,0];const i=Math.min(1,t/q_),r=ec+(Y_-ec)*i,o=Math.pow(t,r)*j_/t;return[n*o,e*o]}function nc(n,e){const i=.12*Math.pow(2*(n<.12?n:1-n),e);return n<.12?i:1-i}const K_=.6,Z_=3,J_=1,Q_=2,e0=1,t0=3,n0=1,i0=2,r0=4,s0=2,o0=5,a0=3,ic=2,c0=3,Wr=5e3,Uo=1200,l0=3e3,il=Wr+Uo+l0,u0=400,h0=1200,f0=3e4,d0=0,p0=1,rl=2,m0=.04,_0=.04,g0=.08,kt=48;function v0(n,e,t){let i=Et;return n==="vertical"?(t<St&&e>=li&&e<li+St&&(i=gt),e>=St&&(i=Dt)):n==="horizontal"?(t>=li&&t<li+St&&e<St&&(i=gt),t>=St&&(i=Dt)):n==="per75"?(t<St&&e<St&&(i=gt),i!==gt&&(i=Dt)):n==="right_click"?(t<St&&e<St&&(i=gt),t>=St&&(i=en),t<St&&e>=St&&(i=Dt)):n==="hamburger"?(t<ci&&e>=li&&e<li+St&&(i=gt),t>=ci&&t<1-ci&&(i=Dt),t>=1-ci&&(i=en)):n==="bed"&&(t<ci&&e<St&&(i=gt),t>=1-ci&&(i=en),i===Et&&(i=Dt)),i}function x0(n,e){if(n===Et)return[255,255,255];const t=e?.pos??[.5,.5,.5];let i,r,s;return e?.type==="jung"?(i=Math.round((t[0]-250)/650*200+30),r=Math.round((t[1]-580)/2020*200+30),s=Math.round((t[2]-2080)/1120*200+30)):(i=Math.round(t[0]*200+30),r=Math.round(t[1]*200+30),s=Math.round(t[2]*200+30)),n===gt&&(r=Math.min(255,Math.round(r*1.7))),n===Dt&&(i=Math.min(255,Math.round(i*1.7)),r=Math.min(255,Math.round(r*1.7))),n===en&&(i=Math.min(255,Math.round(i*1.7))),[i,r,s]}const rc=[[255,49,30],[25,248,0],[255,242,0]],S0=[en,gt,Dt];function M0(n,e){if(n.isSignal)return n.signalColor;const t=y0(n),[i,r,s]=x0(n.state,t),o=Math.min(n.brightness,2.5),a=n.flash;if(a===0)return[Math.min(255,Math.round(i*o)),Math.min(255,Math.round(r*o)),Math.min(255,Math.round(s*o))];if(a===1){const h=.5+.5*Math.sin(e*2);return[Math.min(255,Math.round(255+(i*o-255)*h)),Math.min(255,Math.round(255+(r*o-255)*h)),Math.min(255,Math.round(255+(s*o-255)*h))]}const c=1+3*(.5+.5*Math.sin(e*.3)),l=.5+.5*Math.sin(e*c);return[Math.min(255,Math.round(255+(i*o-255)*l)),Math.min(255,Math.round(255+(r*o-255)*l)),Math.min(255,Math.round(255+(s*o-255)*l))]}function y0(n){const e=n.sylMeta;return e?n.state===gt?e.choEntry:n.state===Dt?e.jungEntry:n.state===en?e.jongEntry??e.choEntry:null:null}function E0(n,e,t,i){const r=Math.max(1,Math.round(n/t)),s=Math.max(1,Math.round(e/t)),o=n/r,a=e/s,c=[];for(let l=0;l<s;l++)for(let h=0;h<r;h++){const u=(h+.5)*o,f=(l+.5)*a,d=(Math.random()-.5)*i*o,_=(Math.random()-.5)*i*a;c.push([u+d,f+_])}return c}function T0(){return{syllables:[],points:[],delaunay:null,cols:0,_glTex:null,_needsUpload:!0,_sylPhaseStart:new Float32Array(kt),_sylCount:0}}function Xr(n){let e=0;for(const t of n.syllables)e+=t.w;return e}function ws(n){let e=0;for(const t of n.syllables)t.h>e&&(e=t.h);return e}function sc(n,e,t,i,r,s,o){s=s??r,o=o??r;const a=i[e.jung],c=i[e.cho]?.cho??i[e.cho],l=e.jong?i[e.jong+"_jong"]??i[e.jong]:null,h=T_(e.jung,e.jong,i),u={choEntry:c,jungEntry:a,jongEntry:l,type:h,cho:e.cho,jung:e.jung,jong:e.jong,w:s,h:o};u.cyclePhaseStart=performance.now()+t*u0;const f=Xr(n);n.syllables.push(u);const d=E0(s,o,Gn,C_),_=[];for(const[T,y]of d){const S=T+f,L=y;let w=!0;for(const b of n.points){const P=b.localX-S,v=b.localY-L;if(P*P+v*v<Gn*Gn){w=!1;break}}w&&_.push([S,L])}const g=c0-ic+1,m=Math.min(ic+Math.floor(Math.random()*g),_.length),p=new Set;for(;p.size<m;)p.add(Math.floor(Math.random()*_.length));_.forEach(([T,y],S)=>{const L=(T-f)/s,w=y/o,b=v0(h,L,w),P=b===Et,v=p.has(S);let x=b,A=null;if(v){const Ie=Math.floor(Math.random()*rc.length);A=rc[Ie],x=S0[Ie]}const D=v?el:tl[x]??Do,I=L*2-1,k=w*2-1,W=Math.max(0,(Math.abs(I)-Ar)/(1-Ar)),B=Math.max(0,(Math.abs(k)-Ar)/(1-Ar)),j=1-nc(Math.min(1,W),tc),G=1-nc(Math.min(1,B),tc),[J,re]=$_(I,k),me=f+(J+1)/2*s,we=(re+1)/2*o;n.points.push({localX:me,localY:we,cellCx:j,cellCy:G,sylIndex:t,sylMeta:u,state:x,originalState:b,isBackground:P,blankStreak:0,changedThisStep:!1,isSignal:v,signalColor:A,brightness:1,flash:0,flashTimer:0,currentScale:D,targetScale:D,neighbors:null})})}function oc(n,e){const t=n.points;if(t.length===0){n.delaunay=null;return}const i=Xr(n),r=So.from(t,s=>s.localX,s=>s.localY);n.delaunay=r,n.cols=i;for(let s=0;s<t.length;s++)t[s].neighbors=Array.from(r.neighbors(s));n._needsUpload=!0}function b0(n,e,t,i,r){let s=n.get(e);const o=t.length;if(s){let a=0;const c=Math.min(s.syllables.length,o);for(;a<c;a++){const l=s.syllables[a],h=t[a].syl;if(l.cho!==h.cho||l.jung!==h.jung||l.jong!==h.jong)break}if(a===s.syllables.length){if(o>a){for(let l=a;l<o;l++)sc(s,t[l].syl,l,i,r,t[l].w,t[l].h);oc(s)}return s}}s=T0();for(let a=0;a<o;a++)sc(s,t[a].syl,a,i,r,t[a].w,t[a].h);return oc(s),n.set(e,s),s}function Ni(n,e,t){return t.some(i=>i==="E"?e.localX>n.localX:i==="W"?e.localX<n.localX:i==="S"?e.localY>n.localY:i==="N"?e.localY<n.localY:!1)}function A0(n,e){const i=Math.max(0,n-e)%il;return i<Wr?d0:i<Wr+Uo?p0:rl}function wr(n,e){return!!n&&A0(e,n.cyclePhaseStart)===rl}function w0(n,e){const t=n.points,i=t.length;if(i===0)return;const r=new Array(i);for(let s=0;s<i;s++){const o=t[s];if(r[s]=o.state,o.changedThisStep=!1,wr(o.sylMeta,e))continue;const a=o.neighbors??[],c=o.state;if(c!==Et&&a.some(h=>t[h].state===Et)&&(o.brightness=Math.min(o.brightness*1.1,2.5)),!o.isSignal){if(c===gt){let l=0,h=0;for(const u of a){const f=t[u];f.state===Dt&&(l++,Ni(o,f,["E","S"])&&h++)}(l>=Z_||h>=J_)&&(r[s]=Dt,o.changedThisStep=!0)}else if(c===Dt){const l=!!o.sylMeta?.jongEntry;let h=0,u=0;if(l)for(const f of a){const d=t[f];d.state===en&&(h++,Ni(o,d,["S"])&&u++)}if(l&&(h>=Q_||u>=e0))r[s]=en,o.changedThisStep=!0;else{let f=!1;for(const d of a){const _=t[d];if((_.state===gt||_.state===Et)&&Ni(o,_,["E"])){f=!0;break}}f&&(r[s]=gt,o.changedThisStep=!0)}}else if(c===en){let l=0,h=0;for(const u of a){const f=t[u];f.state===gt&&(l++,Ni(o,f,["E","N"])&&h++)}(l>=t0||h>=n0)&&(r[s]=gt,o.changedThisStep=!0)}else if(c===Et&&!o.isBackground){const l=a.reduce((h,u)=>h+(t[u].state===Et?1:0),0);o.blankStreak=l>=a0?o.blankStreak+1:0,o.blankStreak>=o0&&(r[s]=o.originalState,o.changedThisStep=!0,o.blankStreak=0)}}}for(let s=0;s<i;s++){const o=t[s];if(o.isSignal||o.isBackground||wr(o.sylMeta,e))continue;const a=o.neighbors??[],c=o.state;if(a.reduce((_,g)=>_+(t[g].state===Et?1:0),0)<(c===Et?i0:r0))continue;const u=[],f=[];for(const _ of a)t[_].isSignal||wr(t[_].sylMeta,e)||(Ni(o,t[_],["W","N"])?u.push(_):f.push(_));const d=u.concat(f).slice(0,s0);for(const _ of d)t[_].changedThisStep||(r[_]=Et);c===Et&&(r[s]=o.originalState)}for(let s=0;s<i;s++){const o=t[s];wr(o.sylMeta,e)||(o.state!==r[s]&&(o.state=r[s],o.targetScale=o.isSignal?el:tl[o.state]??Do),o.state!==Et&&(o.blankStreak=0),o.brightness+=(1-o.brightness)*.05)}n._needsUpload=!0}const R0=`#version 300 es
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
`,C0=`#version 300 es
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
uniform float u_sylOffsetX[${kt}]; // 각 음절 왼쪽 경계 x (누적합)
uniform float u_sylWidth[${kt}];
uniform float u_sylHeight[${kt}];
uniform float u_cellSize; // squircle 박스 클리핑 — site 하나가 그릴 수 있는 최대 폭/높이(px, MIN_DIST 기준). 모노 도형 크기 기준으로도 씀
uniform float u_time; // 신호등 플래싱용 wall-clock(ms) — JS의 rAF timestamp(performance.now()와 같은 시계)
// 신호등 플래싱 사이클 타이밍 — 음절(=sylIdx) 단위 uniform 배열. 사이클 시작 시각은 음절
// 전체가 공유하는 값이라 점(셀) 개수만큼 중복 저장할 필요 없이 배열 인덱싱이면 충분.
// (BLINK 때 어떤 "도형"을 그릴지는 셀 단위라 이 배열이 아니라 u_data의 row2에서 읽음.)
uniform float u_sylPhaseStart[${kt}];
uniform int u_sylCount;
// 셀 바깥(배경)의 알파. 1.0 = 자기 배경(BG_GRAY)을 칠하는 원래 모드,
// 0.0 = 투명 출력(TD 합성). 1.0이면 아래 식이 전부 예전 그대로로 접힌다.
uniform float u_bgAlpha;
#define HALO_ALPHA ${H_.toFixed(4)}
out vec4 outColor;

#define MAX_PTS ${nl}
#define MAX_SYL_UNIFORM ${kt}
// 신호등 플래싱 사이클 상수 — JS 상단 CYCLE_*/MONO_* 상수와 항상 동일해야 함(단일 소스: JS)
#define CYCLE_NORMAL ${Wr.toFixed(1)}
#define CYCLE_BLINK ${Uo.toFixed(1)}
#define CYCLE_TOTAL ${il.toFixed(1)}
#define CYCLE_BLINK_RATE ${h0.toFixed(1)}
#define MONO_LINE_RATIO ${m0.toFixed(3)}
#define MONO_DOT_RATIO ${_0.toFixed(3)}
#define MONO_BORDER_RATIO ${g0.toFixed(3)}
// 음절 센터 radial gradient — JS 상단 BG_GRAY/SYL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define BG_GRAY ${Or.toFixed(4)}
#define SYL_GRAD_STRENGTH ${B_.toFixed(4)}
#define SYL_GRAD_RADIUS_RATIO ${z_.toFixed(4)}
#define SYL_GRAD_FALLOFF ${k_.toFixed(4)}
// 셀 내부 미세 radial gradient — JS 상단 CELL_GRADIENT_* 상수와 동일(단일 소스: JS)
#define CELL_GRAD_SAT ${G_.toFixed(4)}
#define CELL_GRAD_DEPTH ${V_.toFixed(4)}
#define CELL_GRAD_RADIUS_RATIO ${W_.toFixed(4)}
#define CELL_GRAD_FALLOFF ${X_.toFixed(4)}

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
`;function ac(n,e,t){const i=n.createShader(e);if(n.shaderSource(i,t),n.compileShader(i),!n.getShaderParameter(i,n.COMPILE_STATUS)){const r=n.getShaderInfoLog(i);throw n.deleteShader(i),new Error("signal shader compile error: "+r)}return i}function P0(n){const e=ac(n,n.VERTEX_SHADER,R0),t=ac(n,n.FRAGMENT_SHADER,C0),i=n.createProgram();if(n.attachShader(i,e),n.attachShader(i,t),n.linkProgram(i),!n.getProgramParameter(i,n.LINK_STATUS)){const r=n.getProgramInfoLog(i);throw new Error("signal program link error: "+r)}return n.deleteShader(e),n.deleteShader(t),i}function L0(n,e,t){const i=e.points,r=i.length;if(r===0)return;const s=new Float32Array(r*3*4);for(let a=0;a<r;a++){const c=i[a];s[a*4+0]=c.localX,s[a*4+1]=c.localY,s[a*4+2]=c.currentScale*I_,s[a*4+3]=c.cellCx??1;const[l,h,u]=M0(c,t),f=r*4+a*4;s[f+0]=l/255,s[f+1]=h/255,s[f+2]=u/255,s[f+3]=c.cellCy??1;const d=r*8+a*4;s[d+0]=c.state,s[d+1]=0,s[d+2]=0,s[d+3]=0}e._glTex||(e._glTex=n.createTexture()),n.bindTexture(n.TEXTURE_2D,e._glTex),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,r,3,0,n.RGBA,n.FLOAT,s),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),e._texCount=r;const o=Math.min(e.syllables.length,kt);e._sylPhaseStart=new Float32Array(kt);for(let a=0;a<o;a++)e._sylPhaseStart[a]=e.syllables[a].cyclePhaseStart;e._sylCount=o}class D0{constructor(e={}){this._transparent=!!e.transparentOutput,this.lineHeightRatio=1,this._canvas=null,this._gl=null,this._prog=null,this._quadBuf=null,this._uniforms=null,this._raf=null,this._rows=[],this._wordCache=new Map,this._JAMO=null,this._sylItems=[],this._positions=[],this._sylSize=Fi,this._stepCount=0,this._lastStep=0,this._STEP_INTERVAL=140,this._lastFrame=0,this._FRAME_INTERVAL=1e3/24,this._flashPhase=0,this._active=!1,this._lastActivity=0,this._paused=!1,this._pausedAt=0,this._rect=null,this.sylSize=Fi,this.wrapStep=Fi,this.wrapMargin=0}async init(e){this._canvas=e??document.createElement("canvas"),this._ownCanvas=!e,e||(Object.assign(this._canvas.style,{position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh"}),document.body.appendChild(this._canvas));const t=this._canvas.getContext("webgl2",{preserveDrawingBuffer:!0});if(!t)throw new Error("signal: WebGL2 not available");this._gl=t,this._prog=P0(t),this._quadBuf=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this._quadBuf),t.bufferData(t.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),t.STATIC_DRAW);const i=t.getAttribLocation(this._prog,"a_pos");t.enableVertexAttribArray(i),t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0),this._uniforms={resolution:t.getUniformLocation(this._prog,"u_resolution"),origin:t.getUniformLocation(this._prog,"u_origin"),size:t.getUniformLocation(this._prog,"u_size"),data:t.getUniformLocation(this._prog,"u_data"),count:t.getUniformLocation(this._prog,"u_count"),gapPx:t.getUniformLocation(this._prog,"u_gapPx"),corner:t.getUniformLocation(this._prog,"u_corner"),cutoff:t.getUniformLocation(this._prog,"u_cutoff"),sylSize:t.getUniformLocation(this._prog,"u_sylSize"),sylOffsetX:t.getUniformLocation(this._prog,"u_sylOffsetX"),sylWidth:t.getUniformLocation(this._prog,"u_sylWidth"),sylHeight:t.getUniformLocation(this._prog,"u_sylHeight"),cellSize:t.getUniformLocation(this._prog,"u_cellSize"),time:t.getUniformLocation(this._prog,"u_time"),sylPhaseStart:t.getUniformLocation(this._prog,"u_sylPhaseStart"),sylCount:t.getUniformLocation(this._prog,"u_sylCount"),bgAlpha:t.getUniformLocation(this._prog,"u_bgAlpha")},this._resize(),this._onResize=()=>{this._wake(),this._resize()},window.addEventListener("resize",this._onResize),this._lastActivity=performance.now(),this._raf=requestAnimationFrame(this._animate)}update(e,t,i,r,s,o){if(this._wake(),this._JAMO=i,this._sylItems=e,this._positions=t,this._sylSize=r??this._estimateSylSize(t),this._widths=s??null,this._heights=o??null,!i||e.length===0){this._rows=[],this._wordCache.clear(),this._active=!1;return}this._syncRows(e,t,i),this._active=!0}setRect(e){this._rect=e??null}async flushQueue(){this._wake(),await new Promise(e=>requestAnimationFrame(()=>requestAnimationFrame(e)))}captureFrame(){if(!this._gl||!this._canvas)return null;const e=this._time;return this._time=0,this._draw(),this._time=e,this._canvas.toDataURL("image/png")}clearAccum(){const e=this._gl;if(e)for(const t of this._wordCache.values())t._glTex&&e.deleteTexture(t._glTex);this._wordCache.clear(),this._rows=[],this._sylItems=[],this._positions=[],this._widths=null,this._heights=null,this._stepCount=0,this._active=!1,this._draw()}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize);const e=this._gl;if(e){for(const t of this._wordCache.values())t._glTex&&e.deleteTexture(t._glTex);this._quadBuf&&e.deleteBuffer(this._quadBuf),this._prog&&e.deleteProgram(this._prog)}this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._wordCache.clear()}_resize(){if(!this._canvas)return;const e=Math.min(window.devicePixelRatio||1,2);this._cssWidth=window.innerWidth,this._cssHeight=window.innerHeight,this._canvas.width=Math.round(this._cssWidth*e),this._canvas.height=Math.round(this._cssHeight*e),this._gl?.viewport(0,0,this._canvas.width,this._canvas.height)}_estimateSylSize(e){if(e.length<2)return Fi;const t=Math.abs(e[1][0]-e[0][0])*window.innerWidth;return t>10?t:Fi}_syncRows(e,t,i){const r=[];let s=[],o=-1;const a=this._sylSize*.3;for(let l=0;l<e.length;l++){const h=t[l][1]*(this._cssHeight??window.innerHeight);o>=0&&Math.abs(h-o)>a&&(r.push(s),s=[]),s.push({syl:e[l],pos:t[l],w:this._widths?.[l]??this._sylSize,h:this._heights?.[l]??this._sylSize}),o=h}s.length>0&&r.push(s);const c=new Set;this._rows=r.map(l=>{const h=[];let u=[];for(const f of l)u.length>0&&f.syl.wordId!==u[u.length-1].syl.wordId&&(h.push(u),u=[]),u.push(f);return u.length>0&&h.push(u),h.map(f=>{const d=f[0].syl.wordId;return c.add(d),b0(this._wordCache,d,f,i,this._sylSize)})});for(const[l,h]of Array.from(this._wordCache.entries()))c.has(l)||(h._glTex&&this._gl?.deleteTexture(h._glTex),this._wordCache.delete(l))}_animate=e=>{if(e-this._lastActivity>f0){this._raf=null,this._paused=!0,this._pausedAt=e;return}if(this._raf=requestAnimationFrame(this._animate),!(e-this._lastFrame<this._FRAME_INTERVAL)){if(this._lastFrame=e,this._flashPhase+=.08,this._time=e,this._active&&e-this._lastStep>=this._STEP_INTERVAL){this._lastStep=e,this._stepCount++;for(const t of this._rows)for(const i of t)w0(i,e)}for(const t of this._rows)for(const i of t){let r=i._needsUpload;for(const s of i.points){const o=s.currentScale;s.currentScale+=(s.targetScale-s.currentScale)*U_,Math.abs(s.currentScale-o)>.001&&(r=!0)}r&&(L0(this._gl,i,this._flashPhase),i._needsUpload=!1)}this._draw()}};_wake(){const e=performance.now();if(this._paused){const t=e-this._pausedAt;for(const i of this._rows)for(const r of i){for(const s of r.syllables)s.cyclePhaseStart+=t;r._needsUpload=!0}this._lastFrame=0,this._lastStep=e,this._paused=!1,this._raf=requestAnimationFrame(this._animate)}this._lastActivity=e}_draw(){const e=this._gl;if(!e)return;const t=this._transparent?0:1;e.clearColor(Or*t,Or*t,Or*t,t),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this._prog),e.bindBuffer(e.ARRAY_BUFFER,this._quadBuf),e.uniform2f(this._uniforms.resolution,this._cssWidth??this._canvas.width,this._cssHeight??this._canvas.height),e.uniform1f(this._uniforms.gapPx,F_),e.uniform1f(this._uniforms.corner,N_),e.uniform1f(this._uniforms.cutoff,O_),e.uniform1f(this._uniforms.sylSize,this._sylSize),e.uniform1f(this._uniforms.cellSize,Gn),e.uniform1f(this._uniforms.time,this._time??0),e.uniform1f(this._uniforms.bgAlpha,t),e.activeTexture(e.TEXTURE0),e.uniform1i(this._uniforms.data,0);const i=this._sylSize,r=i*.5,s=40,o=i*K_,a=i*Math.max(0,this.lineHeightRatio-1),c=(this._rect?.x??0)+r;let h=(this._rect?.y??0)+s;for(let u=0;u<this._rows.length;u++){const f=this._rows[u];let d=0;for(const g of f)d=Math.max(d,ws(g));d===0&&(d=i);let _=c;for(let g=0;g<f.length;g++){const m=f[g],p=ws(m),T=_,y=h+(d-p)*.5;this._drawWord(e,m,T,y),_+=Xr(m),g<f.length-1&&(_+=o)}h+=d+a}}_drawWord(e,t,i,r){const s=t.points.length;if(s===0||!t._glTex)return;const o=Xr(t),a=ws(t),c=t.syllables,l=Math.min(c.length,kt),h=new Float32Array(kt),u=new Float32Array(kt),f=new Float32Array(kt);let d=0;for(let _=0;_<l;_++)h[_]=d,u[_]=c[_].w,f[_]=c[_].h,d+=c[_].w;e.bindTexture(e.TEXTURE_2D,t._glTex),e.uniform2f(this._uniforms.origin,i,r),e.uniform2f(this._uniforms.size,o,a),e.uniform1i(this._uniforms.count,Math.min(s,nl)),e.uniform1fv(this._uniforms.sylOffsetX,h),e.uniform1fv(this._uniforms.sylWidth,u),e.uniform1fv(this._uniforms.sylHeight,f),e.uniform1fv(this._uniforms.sylPhaseStart,t._sylPhaseStart),e.uniform1i(this._uniforms.sylCount,Math.max(t._sylCount,1)),e.drawArrays(e.TRIANGLE_STRIP,0,4)}}const Io=Math.PI*2;function go(n){let e=n>>>0;return()=>{e=e+1831565813>>>0;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function Xi(...n){let e=2166136261;for(const t of n){const i=String(t);for(let r=0;r<i.length;r++)e=Math.imul(e^i.charCodeAt(r),16777619)>>>0;e=Math.imul(e^44,16777619)>>>0}return e>>>0}const ct=(n,e,t)=>e+n()*(t-e);function U0(n=1){const e=t=>{const i=Math.sin((t+n)*127.1)*43758.5453;return i-Math.floor(i)};return t=>{const i=Math.floor(t),r=t-i,s=r*r*(3-2*r);return e(i)*(1-s)+e(i+1)*s}}function sl(n,e){if(n.length<2)return n.map(s=>({x:s.x,y:s.y}));const t=[{x:n[0].x,y:n[0].y}];let i=t[0],r=0;for(let s=1;s<n.length;s++){let o=n[s].x,a=n[s].y,c=Math.hypot(o-i.x,a-i.y);for(;r+c>=e;){const l=(e-r)/c;i={x:i.x+(o-i.x)*l,y:i.y+(a-i.y)*l},t.push(i),c=Math.hypot(o-i.x,a-i.y),r=0}r+=c,i={x:o,y:a}}return t}function vo(n,e){let t=n;for(let i=0;i<e&&!(t.length<3);i++){const r=[t[0]];for(let s=1;s<t.length-1;s++)r.push({x:(t[s-1].x+t[s].x+t[s+1].x)/3,y:(t[s-1].y+t[s].y+t[s+1].y)/3});r.push(t[t.length-1]),t=r}return t}const xo=(n,e)=>Math.max(0,Math.round(n/e));function ol(n){for(let e=0;e<n.length;e++){const t=n[Math.max(0,e-1)],i=n[Math.min(n.length-1,e+1)],r=Math.atan2(i.y-t.y,i.x-t.x);n[e].angle=r,n[e].nx=Math.cos(r+Math.PI/2),n[e].ny=Math.sin(r+Math.PI/2)}return n}function al(n,e){if(!e||e.length===0)return null;if(e.length===1)return{...e[0]};n=Math.max(0,Math.min(e.length-1,n));const t=Math.floor(n),i=n-t,r=e[t],s=e[Math.min(e.length-1,t+1)];let o=s.angle-r.angle;o=Math.atan2(Math.sin(o),Math.cos(o));const a=r.angle+o*i;return{x:r.x+(s.x-r.x)*i,y:r.y+(s.y-r.y)*i,angle:a,nx:Math.cos(a+Math.PI/2),ny:Math.sin(a+Math.PI/2)}}function Rr(n,e,t,i=0){const r=go(Xi(i,"decor"));return{id:e,birth:t,seed:i,raw:[],spine:null,comps:F0(n,i),compPolys:[],decor:[],decorLastPx:0,rngDecor:r,decorNextGap:ct(r,n.decorGap[0],n.decorGap[1])}}function ui(n,e,t,i){const r=n.raw[n.raw.length-1];return r&&Math.hypot(t-r.x,i-r.y)<e.minDist||n.raw.length>=e.maxRaw?!1:(n.raw.push({x:t,y:i}),!0)}function I0(n,e){const t=sl(n,e.spacing);return ol(vo(t,xo(e.spineSmooth,e.spacing)))}function F0(n,e){const t=go(Xi(e,"comp")),[i,r]=n.companions,s=i+Math.floor(t()*(r-i+1)),o=[];for(let a=0;a<s;a++){const c=go(Xi(e,"event",a));o.push({amp:ct(t,n.wanderAmp[0],n.wanderAmp[1]),wanderLen:ct(t,n.wanderLen[0],n.wanderLen[1]),weaveAmp:ct(t,n.weaveAmp[0],n.weaveAmp[1]),weaveLen:ct(t,n.weaveLen[0],n.weaveLen[1]),weavePhase:ct(t,0,Io),nz:U0(ct(t,0,999)),swirly:t()>=n.noSwirlChance,events:[],lastEventPx:0,rngEvent:c,nextGap:ct(c,n.eventGap[0],n.eventGap[1])})}return o}function N0(n,e,t){for(;n.swirly&&n.events.length<t.maxSwirls&&e-n.lastEventPx>=n.nextGap;){const i=n.rngEvent;if(n.lastEventPx+=n.nextGap,n.nextGap=ct(i,t.eventGap[0],t.eventGap[1]),i()>t.eventProb)continue;const r=ct(i,t.swirlSpan[0],t.swirlSpan[1]);n.events.push({c:n.lastEventPx+r+ct(i,0,t.spacing*6),span:r,R:ct(i,t.swirlRadius[0],t.swirlRadius[1]),turns:ct(i,t.swirlTurns[0],t.swirlTurns[1]),dir:i()<.5?1:-1,phase:ct(i,0,Io)})}}function O0(n,e,t,i){if(!i.decor)return;const r=n.rngDecor;for(;t-n.decorLastPx>=n.decorNextGap;)n.decorLastPx+=n.decorNextGap,n.decorNextGap=ct(r,i.decorGap[0],i.decorGap[1]),n.decor.push({px:n.decorLastPx,off:ct(r,-i.decorSpread,i.decorSpread),jx:ct(r,-4,4),jy:ct(r,-4,4),r:ct(r,i.decorRadius[0],i.decorRadius[1]),x:0,y:0})}function B0(n,e,t){const i=(e.length-1)*t.spacing;for(const r of n.decor){const s=al(Math.min(r.px,i)/t.spacing,e);s&&(r.x=s.x+s.nx*r.off+r.jx,r.y=s.y+s.ny*r.off+r.jy)}}function z0(n,e,t){const i=t.spacing,s=(n.length-1)*i-t.headLag;if(s<t.compStep*4)return[];let o=vo(n.map(h=>({x:h.x,y:h.y})),xo(t.compBaseSmooth,i));o=ol(sl(o,i));const a=(o.length-1)*i,c=[],l=Math.min(s,a);for(let h=0;h<=l;h+=t.compStep){const u=al(h/i,o),f=h/e.wanderLen,d=e.amp*1.6*(e.nz(f)-e.nz(f+111.3)),_=e.weaveAmp*Math.sin(h/e.weaveLen*Io+e.weavePhase),g=d+_;let m=u.nx*g,p=u.ny*g;for(const T of e.events){const y=(h-T.c)/T.span;if(y<=-1||y>=1)continue;const S=Math.cos(y*Math.PI/2)**2,L=T.phase+T.dir*(y+1)*Math.PI*T.turns;m+=Math.cos(L)*T.R*S,p+=Math.sin(L)*T.R*S}c.push({x:u.x+m,y:u.y+p})}return vo(c,xo(t.compSmooth,t.compStep))}function hi(n,e){if(n.raw.length<2){n.spine=null,n.compPolys=[];return}const t=I0(n.raw,e),i=(t.length-1)*e.spacing;for(const r of n.comps)N0(r,i,e);O0(n,t,i,e),B0(n,t,e),n.spine=t,n.compPolys=[];for(const r of n.comps){const s=z0(t,r,e);s.length>=2&&n.compPolys.push(s)}}function cc(n,e,t,i){const r=n.createShader(e);return n.shaderSource(r,t),n.compileShader(r),n.getShaderParameter(r,n.COMPILE_STATUS)||console.error(`[${i}] ${n.getShaderInfoLog(r)}`),r}function qi(n,e,t,i){const r=n.createProgram();return n.attachShader(r,cc(n,n.VERTEX_SHADER,e,i+".vert")),n.attachShader(r,cc(n,n.FRAGMENT_SHADER,t,i+".frag")),n.linkProgram(r),n.getProgramParameter(r,n.LINK_STATUS)||console.error(`[${i}] ${n.getProgramInfoLog(r)}`),r}function Yi(n,e){const t=new Map;return i=>(t.has(i)||t.set(i,n.getUniformLocation(e,i)),t.get(i))}function Ti(n,e,t,i={}){const r=i.internal??n.RGBA16F,s=i.type??n.HALF_FLOAT,o=i.filter??n.LINEAR,a=i.data??null,c=n.createTexture();n.bindTexture(n.TEXTURE_2D,c),n.texImage2D(n.TEXTURE_2D,0,r,e,t,0,n.RGBA,s,a),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,o),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,o),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE);const l=n.createFramebuffer();return n.bindFramebuffer(n.FRAMEBUFFER,l),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,c,0),n.checkFramebufferStatus(n.FRAMEBUFFER)!==n.FRAMEBUFFER_COMPLETE&&console.error(`[glutil] FBO incomplete (${e}x${t})`),n.bindFramebuffer(n.FRAMEBUFFER,null),{tex:c,fbo:l,w:e,h:t}}function bi(n,e){e&&(n.deleteTexture(e.tex),n.deleteFramebuffer(e.fbo))}const k0=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);function H0(n){const e=n.createBuffer();return n.bindBuffer(n.ARRAY_BUFFER,e),n.bufferData(n.ARRAY_BUFFER,k0,n.STATIC_DRAW),e}function Fo(n,e){const t=n.createVertexArray();return n.bindVertexArray(t),n.bindBuffer(n.ARRAY_BUFFER,e),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindVertexArray(null),t}function G0(n,e,t,i){let r=Ti(n,e,t,i),s=Ti(n,e,t,i);return{get read(){return r},get write(){return s},swap(){const o=r;r=s,s=o},drop(){bi(n,r),bi(n,s)}}}var V0=`#version 300 es

precision highp float;

layout(location = 0) in vec2 a_corner;  
layout(location = 1) in vec4 a_seg;     
layout(location = 2) in vec4 a_meta;    

uniform vec2 u_cssSize;                 

out vec2 v_px;                          
flat out vec4 v_seg;
flat out vec3 v_meta;                   
flat out float v_w;                     

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
    
    v_w = KERNEL_NORM * (L / max(R, 1e-5));

    
    gl_Position = vec4(p.x / u_cssSize.x * 2.0 - 1.0, 1.0 - p.y / u_cssSize.y * 2.0, 0.0, 1.0);
}`,W0=`#version 300 es

precision highp float;

in vec2 v_px;
flat in vec4 v_seg;
flat in vec3 v_meta;
flat in float v_w;

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

    outField = vec4(k, k * v_meta.y, k * v_meta.z, 0.0);
}`,No=`#version 300 es

precision highp float;

layout(location = 0) in vec2 a_position;

out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,X0=`#version 300 es

precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_baked;
uniform sampler2D u_live;
uniform sampler2D u_growth;  

uniform vec2 u_texel;       
uniform float u_pxPerTexel; 

uniform float u_th;
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

float fieldAt(vec2 uv) {
    return texture(u_baked, uv).r + texture(u_live, uv).r;
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
}`;const Br=8;function q0(n,e){!n.getExtension("EXT_color_buffer_half_float")&&!n.getExtension("EXT_color_buffer_float")&&console.warn("[field] float 렌더타겟 확장이 없습니다 — 밀도 누적이 8bit 로 깎입니다");const t=qi(n,V0,W0,"stamp"),i=qi(n,No,X0,"composite"),r=Yi(n,t),s=Yi(n,i),o=n.createBuffer();let a=0;const c=n.createVertexArray();n.bindVertexArray(c),n.bindBuffer(n.ARRAY_BUFFER,e),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ARRAY_BUFFER,o);const l=Br*4;n.enableVertexAttribArray(1),n.vertexAttribPointer(1,4,n.FLOAT,!1,l,0),n.vertexAttribDivisor(1,1),n.enableVertexAttribArray(2),n.vertexAttribPointer(2,4,n.FLOAT,!1,l,16),n.vertexAttribDivisor(2,1),n.bindVertexArray(null);const h=Fo(n,e);let u=1,f=1,d=1,_=1,g=1,m=null,p=null;function T(D,I,k,W){d=D,_=I,u=Math.max(1,k),f=Math.max(1,W),g=d/u,bi(n,m),bi(n,p),m=Ti(n,u,f),p=Ti(n,u,f)}function y(D){const I=D==="baked"?m:p;n.bindFramebuffer(n.FRAMEBUFFER,I.fbo),n.viewport(0,0,u,f),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)}function S(D,I,k){if(!k)return;const W=D==="baked"?m:p;n.bindBuffer(n.ARRAY_BUFFER,o),I.length>a?(n.bufferData(n.ARRAY_BUFFER,I,n.DYNAMIC_DRAW),a=I.length):n.bufferSubData(n.ARRAY_BUFFER,0,I),n.bindFramebuffer(n.FRAMEBUFFER,W.fbo),n.viewport(0,0,u,f),n.useProgram(t),n.bindVertexArray(c),n.uniform2f(r("u_cssSize"),d,_),n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE),n.drawArraysInstanced(n.TRIANGLES,0,6,k),n.disable(n.BLEND),n.bindVertexArray(null),n.bindFramebuffer(n.FRAMEBUFFER,null)}function L(D,I,k){n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,I,k),n.disable(n.BLEND),n.useProgram(i),n.bindVertexArray(h),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,m.tex),n.uniform1i(s("u_baked"),0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,p.tex),n.uniform1i(s("u_live"),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,D.growthTex??m.tex),n.uniform1i(s("u_growth"),2),n.uniform2f(s("u_texel"),1/u,1/f),n.uniform1f(s("u_pxPerTexel"),g),n.uniform1f(s("u_th"),D.th),n.uniform1f(s("u_edge"),D.edge),n.uniform3fv(s("u_paper"),D.paper),n.uniform3fv(s("u_ink"),D.ink),n.uniform1i(s("u_shade"),D.shade),n.uniform3fv(s("u_light"),D.light),n.uniform1f(s("u_normalZ"),D.normalZ),n.uniform1f(s("u_amb"),D.amb),n.uniform1f(s("u_diff"),D.diff),n.uniform1f(s("u_spec"),D.spec),n.uniform1f(s("u_specPow"),D.specPow),n.uniform1f(s("u_fres"),D.fres),n.uniform1f(s("u_bands"),D.bands),n.uniform3fv(s("u_growInk"),D.growInk),n.uniform1f(s("u_growGain"),D.growGain),n.uniform1f(s("u_growOpacity"),D.growOpacity),n.drawArrays(n.TRIANGLES,0,6),n.bindVertexArray(null)}function w(D){const I=(D&32768)>>15,k=(D&31744)>>10,W=D&1023;return k===0?(I?-1:1)*Math.pow(2,-14)*(W/1024):k===31?W?NaN:(I?-1:1)*(1/0):(I?-1:1)*Math.pow(2,k-15)*(1+W/1024)}const b=new Float32Array(4),P=new Uint16Array(4);function v(D,I,k="baked"){const W=k==="baked"?m:p,B=Math.round(D/d*u),j=Math.round((1-I/_)*f);n.bindFramebuffer(n.FRAMEBUFFER,W.fbo);const G=n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE);let J;G===n.HALF_FLOAT?(n.readPixels(B,j,1,1,n.RGBA,n.HALF_FLOAT,P),J=Array.from(P,w)):(n.readPixels(B,j,1,1,n.RGBA,n.FLOAT,b),J=Array.from(b)),n.bindFramebuffer(n.FRAMEBUFFER,null);const[re,me,we]=J;return{density:re,strokeId:re>1e-4?me/re:0,birth:re>1e-4?we/re:0}}return{resize:T,clear:y,stamp:S,composite:L,probe:v,textures:()=>({baked:m.tex,live:p.tex}),texel:()=>[1/u,1/f]}}var Y0=`#version 300 es

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

float fieldAt(vec2 uv) {
    return texture(u_baked, uv).r + texture(u_live, uv).r;
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
}`;function j0(n,e){const t=qi(n,No,Y0,"growth"),i=Yi(n,t),r=Fo(n,e);let s=null,o=1,a=1,c=1,l=1;function h(_,g,m,p){c=_,l=g,o=Math.max(1,m),a=Math.max(1,p),s&&s.drop(),s=G0(n,o,a),u()}function u(){for(let _=0;_<2;_++)n.bindFramebuffer(n.FRAMEBUFFER,s.write.fbo),n.viewport(0,0,o,a),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),s.swap();n.bindFramebuffer(n.FRAMEBUFFER,null)}function f(_){n.bindFramebuffer(n.FRAMEBUFFER,s.write.fbo),n.viewport(0,0,o,a),n.disable(n.BLEND),n.useProgram(t),n.bindVertexArray(r),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,s.read.tex),n.uniform1i(i("u_prev"),0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,_.bakedTex),n.uniform1i(i("u_baked"),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,_.liveTex),n.uniform1i(i("u_live"),2),n.uniform2fv(i("u_fieldTexel"),_.fieldTexel),n.uniform2f(i("u_cssSize"),c,l),n.uniform1f(i("u_time"),_.time),n.uniform1f(i("u_dt"),_.dt),n.uniform1f(i("u_th"),_.th),n.uniform1f(i("u_decay"),_.decay),n.uniform1f(i("u_outward"),_.outward),n.uniform1f(i("u_curlAmp"),_.curlAmp),n.uniform1f(i("u_curlScale"),_.curlScale),n.uniform1f(i("u_curlSpeed"),_.curlSpeed),n.uniform1f(i("u_source"),_.source),n.uniform1f(i("u_bandLo"),_.bandLo),n.uniform1f(i("u_bandHi"),_.bandHi),n.uniform1f(i("u_nowMin"),_.nowMin),n.uniform1f(i("u_ageDelay"),_.ageDelay),n.drawArrays(n.TRIANGLES,0,6),n.bindVertexArray(null),n.bindFramebuffer(n.FRAMEBUFFER,null),s.swap()}return{resize:h,clear:u,step:f,texture:()=>s.read.tex}}var $0=`#version 300 es

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

float fieldAt(vec2 uv) {
    return texture(u_baked, uv).r + texture(u_live, uv).r;
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
}`,K0=`#version 300 es

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
}`,Z0=`#version 300 es

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
}`;function J0(n,e,t=128){const i=!!n.getExtension("EXT_color_buffer_float");i||console.warn("[particles] EXT_color_buffer_float 없음 — 16F 로 대체(위치 정밀도 저하)");const r=i?{internal:n.RGBA32F,type:n.FLOAT,filter:n.NEAREST}:{internal:n.RGBA16F,type:n.HALF_FLOAT,filter:n.NEAREST},s=qi(n,No,$0,"pupdate"),o=qi(n,K0,Z0,"particle"),a=Yi(n,s),c=Yi(n,o),l=Fo(n,e),h=n.createVertexArray(),u=t*t;let f=null,d=null,_=1,g=1,m=0;function p(){const b=new Float32Array(u*4);for(let P=0;P<u;P++)b[P*4+0]=0,b[P*4+1]=0,b[P*4+2]=0,b[P*4+3]=Math.random();return b}function T(){bi(n,f),bi(n,d),f=Ti(n,t,t,{...r,data:p()}),d=Ti(n,t,t,r)}function y(b,P){_=b,g=P,f||T()}function S(b){n.bindFramebuffer(n.FRAMEBUFFER,d.fbo),n.viewport(0,0,t,t),n.disable(n.BLEND),n.useProgram(s),n.bindVertexArray(l),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,f.tex),n.uniform1i(a("u_prev"),0),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,b.bakedTex),n.uniform1i(a("u_baked"),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,b.liveTex),n.uniform1i(a("u_live"),2),n.uniform2fv(a("u_fieldTexel"),b.fieldTexel),n.uniform2f(a("u_cssSize"),_,g),n.uniform1f(a("u_time"),b.time),n.uniform1ui(a("u_frame"),m++>>>0),n.uniform1f(a("u_dt"),b.dt),n.uniform1f(a("u_th"),b.th),n.uniform1f(a("u_spawnTol"),b.spawnTol),n.uniform1f(a("u_spawnRate"),b.spawnRate),n.uniform1f(a("u_lifespan"),b.lifespan),n.uniform1f(a("u_lifeVar"),b.lifeVar),n.uniform1f(a("u_curlAmp"),b.curlAmp),n.uniform1f(a("u_curlScale"),b.curlScale),n.uniform1f(a("u_curlSpeed"),b.curlSpeed),n.uniform1f(a("u_flow"),b.flow),n.uniform1f(a("u_repel"),b.repel),n.drawArrays(n.TRIANGLES,0,6),n.bindVertexArray(null),n.bindFramebuffer(n.FRAMEBUFFER,null);const P=f;f=d,d=P}function L(b,P,v,x){n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,P,v),n.enable(n.BLEND),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.useProgram(o),n.bindVertexArray(h),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,f.tex),n.uniform1i(c("u_state"),0),n.uniform2i(c("u_stateSize"),t,t),n.uniform2f(c("u_cssSize"),_,g),n.uniform1f(c("u_size"),b.size),n.uniform1f(c("u_dpr"),x),n.uniform3fv(c("u_ink"),b.ink),n.uniform1f(c("u_opacity"),b.opacity),n.drawArrays(n.POINTS,0,u),n.bindVertexArray(null),n.disable(n.BLEND)}function w(){const b=new Float32Array(u*4);n.bindFramebuffer(n.FRAMEBUFFER,f.fbo),n.readPixels(0,0,t,t,n.RGBA,n.FLOAT,b),n.bindFramebuffer(n.FRAMEBUFFER,null);let P=0,v=1/0,x=-1/0;for(let D=0;D<u;D++)b[D*4+2]>0&&(P++,v=Math.min(v,b[D*4]),x=Math.max(x,b[D*4]));const A=[];for(let D=0;D<3;D++)A.push(Array.from(b.slice(D*4,D*4+4),I=>+I.toFixed(4)));return{alive:P,count:u,xRange:P?[v,x]:null,sample:A}}return{resize:y,reset:T,step:S,draw:L,count:u,stats:w}}const Q0=1.55;function eg(n,e,t,i,r,s){const o=n-t,a=e-i,c=r-t,l=s-i,h=c*c+l*l,u=h>1e-9?Math.max(0,Math.min(1,(o*c+a*l)/h)):0,f=o-c*u,d=a-l*u;return Math.sqrt(f*f+d*d)}function tg(n,{reach:e=28,th:t=.5,cell:i=4}={}){if(!n||n.length===0)return[];let r=1/0,s=1/0,o=-1/0,a=-1/0;for(const y of n)r=Math.min(r,y.ax,y.bx),o=Math.max(o,y.ax,y.bx),s=Math.min(s,y.ay,y.by),a=Math.max(a,y.ay,y.by);r-=e,s-=e,o+=e,a+=e;const c=Math.ceil((o-r)/i)+1,l=Math.ceil((a-s)/i)+1;if(c<2||l<2||c*l>4e6)return[];const h=Math.max(1,Math.ceil((o-r)/e)),u=Math.max(1,Math.ceil((a-s)/e)),f=Array.from({length:h*u},()=>[]),d=(y,S)=>S*h+y;for(let y=0;y<n.length;y++){const S=n[y],L=Math.max(0,Math.floor((Math.min(S.ax,S.bx)-e-r)/e)),w=Math.min(h-1,Math.floor((Math.max(S.ax,S.bx)+e-r)/e)),b=Math.max(0,Math.floor((Math.min(S.ay,S.by)-e-s)/e)),P=Math.min(u-1,Math.floor((Math.max(S.ay,S.by)+e-s)/e));for(let v=b;v<=P;v++)for(let x=L;x<=w;x++)f[d(x,v)].push(y)}const _=new Float32Array(c*l);for(let y=0;y<l;y++){const S=s+y*i,L=Math.max(0,Math.min(u-1,Math.floor((S-s)/e)));for(let w=0;w<c;w++){const b=r+w*i,P=Math.max(0,Math.min(h-1,Math.floor((b-r)/e)));let v=0;for(const x of f[d(P,L)]){const A=n[x],D=eg(b,S,A.ax,A.ay,A.bx,A.by);if(D>=e)continue;const I=1-D/e,k=Math.hypot(A.bx-A.ax,A.by-A.ay);v+=I*I*I*(Q0*k/e)}_[y*c+w]=v}}const g=(y,S)=>_[S*c+y],m=(y,S,L)=>{const w=g(y,S),b=g(L,S),P=Math.abs(b-w)<1e-9?.5:(t-w)/(b-w);return{x:r+(y+(L-y)*P)*i,y:s+S*i}},p=(y,S,L)=>{const w=g(y,S),b=g(y,L),P=Math.abs(b-w)<1e-9?.5:(t-w)/(b-w);return{x:r+y*i,y:s+(S+(L-S)*P)*i}},T=[];for(let y=0;y<l-1;y++)for(let S=0;S<c-1;S++){const L=g(S,y)>t,w=g(S+1,y)>t,b=g(S+1,y+1)>t,P=g(S,y+1)>t;let v=(L?8:0)|(w?4:0)|(b?2:0)|(P?1:0);if(v===0||v===15)continue;const x=()=>m(S,y,S+1),A=()=>m(S,y+1,S+1),D=()=>p(S,y,y+1),I=()=>p(S+1,y,y+1);if(v===5||v===10){const W=(g(S,y)+g(S+1,y)+g(S+1,y+1)+g(S,y+1))*.25>t;v===5===W?T.push({a:D(),b:x()},{a:A(),b:I()}):T.push({a:D(),b:A()},{a:x(),b:I()});continue}switch(v){case 1:case 14:T.push({a:D(),b:A()});break;case 2:case 13:T.push({a:A(),b:I()});break;case 3:case 12:T.push({a:D(),b:I()});break;case 4:case 11:T.push({a:x(),b:I()});break;case 6:case 9:T.push({a:x(),b:A()});break;case 7:case 8:T.push({a:D(),b:x()});break}}return ng(T,i*.5)}function ng(n,e){const t=a=>`${Math.round(a.x/e)},${Math.round(a.y/e)}`,i=new Map,r=(a,c)=>{i.has(a)||i.set(a,[]),i.get(a).push(c)};n.forEach((a,c)=>{r(t(a.a),c),r(t(a.b),c)});const s=new Uint8Array(n.length),o=[];for(let a=0;a<n.length;a++){if(s[a])continue;s[a]=1;const c=[n[a].a,n[a].b];for(let l=0;l<2;l++)for(;;){const h=l===0?c[c.length-1]:c[0],u=(i.get(t(h))||[]).find(g=>!s[g]);if(u===void 0)break;s[u]=1;const f=n[u],_=Math.hypot(f.a.x-h.x,f.a.y-h.y)<=Math.hypot(f.b.x-h.x,f.b.y-h.y)?f.b:f.a;l===0?c.push(_):c.unshift(_)}c.length>=3&&o.push(c)}return o}const ig=60,rg=2,Cr=n=>[parseInt(n.slice(1,3),16)/255,parseInt(n.slice(3,5),16)/255,parseInt(n.slice(5,7),16)/255];function sg(n={}){const e={seed:Math.random()*4294967295>>>0,spacing:6,spineSmooth:12,minDist:4,maxRaw:12e3,companions:[1,1],wanderAmp:[6,18],wanderLen:[500,950],weaveAmp:[16,32],weaveLen:[340,560],noSwirlChance:.1,maxSwirls:40,eventGap:[210,450],eventProb:.8,swirlSpan:[66,78],swirlRadius:[35,45],swirlTurns:[1,1.7],compBaseSmooth:96,compStep:3.6,compSmooth:11,headLag:12,growPx:14,lineWidth:.5,baseStyle:"rgb(0, 0, 0)",companionStyle:"rgb(0, 0, 0)",companionDash:[3,4],arrowSize:7,decor:!0,decorGap:[20,80],decorSpread:30,decorRadius:[1.5,4],decorStyle:"rgb(0, 0, 0)",decorLineWidth:.75,outline:{on:!0,reach:30,th:.55,cell:4,style:"rgba(0,0,0,0.45)",width:.6,dash:[]},goo:{reach:18,th:1.3,edge:.005,spine:!0,companion:!1,fieldScale:1.5},paper:"#ffffff",ink:"#0a0a0a",shade:2,light:[-.45,.6,.66],normalZ:34,amb:.55,diff:.75,spec:.5,specPow:28,fres:.22,bands:3,grow:{on:!1,scale:.75,decay:.965,outward:26,curlAmp:55,curlScale:.006,curlSpeed:.06,source:1,bandLo:.35,bandHi:.12,ageDelay:.02,ink:"#6e6e66",gain:1.4,opacity:.5},part:{on:!1,side:128,spawnTol:.08,spawnRate:.04,lifespan:4.5,lifeVar:.5,curlAmp:34,curlScale:.0075,curlSpeed:.09,flow:26,repel:14,size:2.6,ink:"#141414",opacity:.55}};if(n.cfg)for(const[R,U]of Object.entries(n.cfg))U&&typeof U=="object"&&!Array.isArray(U)&&e[R]?Object.assign(e[R],U):e[R]=U;const t=!n.canvas&&!document.getElementById("c"),i=n.canvas??document.getElementById("c")??document.createElement("canvas");t&&document.body.appendChild(i);const r=document.createElement("canvas");document.body.appendChild(r);for(const R of[i,r])R.style.position="fixed",R.style.left="0",R.style.top="0";i.style.background=e.paper,r.style.touchAction="none",n.mouse&&(r.style.cursor="crosshair"),n.mouse||(r.style.pointerEvents="none");const s=document.body.style.background;n.bodyBg!==!1&&(document.body.style.background=e.paper);const o=i.getContext("webgl2",{antialias:!1,alpha:!0,premultipliedAlpha:!1,preserveDrawingBuffer:!0});if(!o){console.error("WebGL2 를 쓸 수 없습니다");return}const a=H0(o),c=q0(o,a),l=j0(o,a),h=J0(o,a,e.part.side),u=document.createElement("canvas"),f=u.getContext("2d"),d=r.getContext("2d");let _=0,g=0,m=1;function p(){m=Math.min(window.devicePixelRatio||1,rg),_=Math.max(1,window.innerWidth),g=Math.max(1,window.innerHeight);for(const R of[i,r,u])R.width=Math.round(_*m),R.height=Math.round(g*m);for(const R of[i,r])R.style.width=_+"px",R.style.height=g+"px";for(const R of[f,d])R.setTransform(m,0,0,m,0,0);c.resize(_,g,Math.round(_*m*e.goo.fieldScale),Math.round(g*m*e.goo.fieldScale)),l.resize(_,g,Math.round(_*m*e.grow.scale),Math.round(g*m*e.grow.scale)),h.resize(_,g),j()}function T(R,U,Y,Z,te){for(let be=1;be<U.length;be++){const ne=U[be-1],fe=U[be];R.push(ne.x,ne.y,fe.x,fe.y,Y,Z,te,0)}}function y(R,U){const Y=e.goo.reach;if(e.goo.companion)for(const Z of R.compPolys)T(U,Z,Y,R.id,R.birth);e.goo.spine&&R.spine&&T(U,R.spine,Y,R.id,R.birth)}function S(R,U,Y,Z,te){if(!(U.length<2)){R.strokeStyle=Y,R.lineWidth=Z,R.lineJoin="round",R.lineCap="round",R.setLineDash(te||[]),R.beginPath(),R.moveTo(U[0].x,U[0].y);for(let be=1;be<U.length;be++)R.lineTo(U[be].x,U[be].y);R.stroke(),R.setLineDash([])}}function L(R,U,Y,Z){if(!U||!Y)return;const te=Math.atan2(U.y-Y.y,U.x-Y.x);R.fillStyle="rgb(0, 0, 0)",R.beginPath(),R.moveTo(U.x,U.y),R.lineTo(U.x-Math.cos(te-.4)*Z,U.y-Math.sin(te-.4)*Z),R.lineTo(U.x-Math.cos(te+.4)*Z,U.y-Math.sin(te+.4)*Z),R.closePath(),R.fill()}function w(R,U){if(U.outline)for(const Y of U.outline)S(R,Y,e.outline.style,e.outline.width,e.outline.dash);U.spine&&S(R,U.spine,e.baseStyle,e.lineWidth);for(const Y of U.decor)R.strokeStyle=e.decorStyle,R.lineWidth=e.decorLineWidth,R.strokeRect(Y.x-Y.r,Y.y-Y.r,Y.r*2,Y.r*2);for(const Y of U.compPolys)S(R,Y,e.companionStyle,e.lineWidth,e.companionDash),L(R,Y.at(-1),Y.at(-3)||Y.at(-2),e.arrowSize)}const b=[];let P=1,v=null,x=!1;const A=performance.now(),D=()=>(performance.now()-A)/1e3/ig;function I(R){const U=[],Y=Z=>{for(let te=1;te<Z.length;te++)U.push({ax:Z[te-1].x,ay:Z[te-1].y,bx:Z[te].x,by:Z[te].y})};if(e.goo.companion)for(const Z of R.compPolys)Y(Z);return e.goo.spine&&R.spine&&Y(R.spine),!U.length&&R.spine&&Y(R.spine),U}function k(R){e.outline.on&&!R.outline&&(R.outline=tg(I(R),e.outline))}function W(R){k(R),w(f,R);const U=[];y(R,U),c.stamp("baked",new Float32Array(U),U.length/Br)}function B(){G.length=0,J=null,v=null,x=!1,c.clear("live")}function j(){f.clearRect(0,0,_,g);for(const U of b)U.outline=null;c.clear("baked"),c.clear("live"),l.clear();const R=[];for(const U of b)k(U),w(f,U),y(U,R);c.stamp("baked",new Float32Array(R),R.length/Br)}const G=[];let J=null;function re(R){const U=[0];for(let Y=1;Y<R.length;Y++)U.push(U[Y-1]+Math.hypot(R[Y].x-R[Y-1].x,R[Y].y-R[Y-1].y));return U}function me(R,U,{hold:Y=!1}={}){!R||R.length<2||G.push({pts:R,cum:re(R),seed:U,hold:Y})}function we(R){if(!J||!R?.length)return!1;const U=J;let Y=U.pts.length?U.pts[U.pts.length-1]:null;for(const Z of R){const te=Y?Math.hypot(Z.x-Y.x,Z.y-Y.y):0;U.pts.push(Z),U.cum.push((U.cum.length?U.cum[U.cum.length-1]:0)+te),Y=Z}return!0}function Ie(){const R=G.shift();return R?(v=Rr(e,P++,D(),R.seed),J={pts:R.pts,cum:R.cum,i:0,walked:0,hold:!!R.hold},!0):!1}function K(){if(!v)return;const R=v;v=null,J=null,hi(R,e),c.clear("live"),R.spine&&(R.compPolys.length||R.decor.length)&&(b.push(R),W(R))}function se(){if(!J&&!Ie())return;const R=J,U=R.cum[R.cum.length-1];for(R.walked=Math.min(R.walked+e.growPx,U);R.i<R.pts.length&&R.cum[R.i]<=R.walked;)ui(v,e,R.pts[R.i].x,R.pts[R.i].y),R.i++;R.i>=R.pts.length&&R.walked>=U&&!R.hold&&K()}function _e(R,U){if(!J||!v)return;const Y=J;R=Math.max(0,Math.min(R,Y.pts.length)),Y.pts.length=R,Y.cum.length=R;let Z=R?Y.pts[R-1]:null;for(const Se of U||[]){const de=Z?Math.hypot(Se.x-Z.x,Se.y-Z.y):0;Y.pts.push(Se),Y.cum.push((Y.cum.length?Y.cum[Y.cum.length-1]:0)+de),Z=Se}const te=Y.pts.length,be=Math.min(Y.i,te),{id:ne,birth:fe,seed:Ae}=v;v=Rr(e,ne,fe,Ae);for(let Se=0;Se<be;Se++)ui(v,e,Y.pts[Se].x,Y.pts[Se].y);hi(v,e),Y.i=be,Y.walked=te?Math.min(Y.walked,Y.cum[te-1]):0}function oe(){if(!J)return;const R=J;for(R.hold=!1;R.i<R.pts.length;)ui(v,e,R.pts[R.i].x,R.pts[R.i].y),R.i++;K()}async function Ee(){for(oe();Ie();)oe()}function ke(R,U,{step:Y=1/0}={}){const Z=Rr(e,P++,D(),U);for(let te=0;te<R.length;te++)ui(Z,e,R[te].x,R[te].y),(te+1)%Y===0&&hi(Z,e);return hi(Z,e),Z.spine&&(Z.compPolys.length||Z.decor.length)&&(b.push(Z),W(Z)),Z}const Te=[],$e=(R,U,Y,Z)=>{R.addEventListener(U,Y,Z),Te.push([R,U,Y,Z])},Qe=R=>{oe(),x=!0;const U=P++;v=Rr(e,U,D(),Xi(e.seed,"mouse",U)),ui(v,e,R.clientX,R.clientY);try{r.setPointerCapture?.(R.pointerId)}catch{}R.preventDefault()},Ne=R=>{!x||!v||ui(v,e,R.clientX,R.clientY)};function F(){if(!x||!v)return;x=!1;const R=v;v=null,hi(R,e),c.clear("live"),R.spine&&(R.compPolys.length||R.decor.length)&&(b.push(R),W(R))}n.mouse&&($e(r,"pointerdown",Qe),$e(window,"pointermove",Ne),$e(window,"pointerup",F),$e(window,"pointercancel",F));const Tt=R=>{const U=R.key.toLowerCase();U==="1"?e.shade=0:U==="2"?e.shade=1:U==="3"?e.shade=2:U==="4"?e.shade=3:U==="z"?(b.pop(),j()):U==="c"?(B(),b.length=0,j(),h.reset()):U==="g"?(e.grow.on=!e.grow.on,e.grow.on||l.clear()):U==="p"?(e.part.on=!e.part.on,e.part.on&&h.reset()):U==="s"&&Fe()};n.keys&&$e(window,"keydown",Tt);function Oe(){const R=document.createElement("canvas");R.width=i.width,R.height=i.height;const U=R.getContext("2d");return U.drawImage(i,0,0),U.drawImage(r,0,0),R}function Fe(){Oe().toBlob(R=>{const U=document.createElement("a");U.href=URL.createObjectURL(R),U.download=`trail_${Date.now()}.png`,U.click(),URL.revokeObjectURL(U.href)})}const ve=[],Ze=(()=>{const[R,U,Y]=e.light,Z=Math.hypot(R,U,Y)||1;return[R/Z,U/Z,Y/Z]})();let xe=performance.now();function C(R){requestAnimationFrame(C);const U=Math.min((R-xe)/1e3,1/20);xe=R;const Y=(R-A)/1e3;x||se(),v&&(hi(v,e),ve.length=0,y(v,ve),c.clear("live"),c.stamp("live",new Float32Array(ve),ve.length/Br));const Z=c.textures(),te=c.texel(),be={bakedTex:Z.baked,liveTex:Z.live,fieldTexel:te,th:e.goo.th,time:Y,dt:U};e.grow.on&&l.step({...be,nowMin:D(),decay:e.grow.decay,outward:e.grow.outward,curlAmp:e.grow.curlAmp,curlScale:e.grow.curlScale,curlSpeed:e.grow.curlSpeed,source:e.grow.source,bandLo:e.grow.bandLo,bandHi:e.grow.bandHi,ageDelay:e.grow.ageDelay}),c.composite({th:e.goo.th,edge:e.goo.edge,paper:Cr(e.paper),ink:Cr(e.ink),shade:e.shade,light:Ze,normalZ:e.normalZ,amb:e.amb,diff:e.diff,spec:e.spec,specPow:e.specPow,fres:e.fres,bands:e.bands,growthTex:l.texture(),growInk:Cr(e.grow.ink),growGain:e.grow.on?e.grow.gain:0,growOpacity:e.grow.opacity},i.width,i.height),e.part.on&&(h.step({...be,spawnTol:e.part.spawnTol,spawnRate:e.part.spawnRate,lifespan:e.part.lifespan,lifeVar:e.part.lifeVar,curlAmp:e.part.curlAmp,curlScale:e.part.curlScale,curlSpeed:e.part.curlSpeed,flow:e.part.flow,repel:e.part.repel}),h.draw({size:e.part.size,ink:Cr(e.part.ink),opacity:e.part.opacity},i.width,i.height,m)),d.clearRect(0,0,_,g),d.drawImage(u,0,0,_,g),v&&w(d,v)}$e(window,"resize",p),p();let M=requestAnimationFrame(C);function V(){cancelAnimationFrame(M),M=0;for(const[R,U,Y,Z]of Te)R.removeEventListener(U,Y,Z);Te.length=0,B(),b.length=0,r.remove(),t&&i.remove(),n.bodyBg!==!1&&(document.body.style.background=s),n.global&&window.TRAIL===Q&&delete window.TRAIL}const Q={CFG:e,strokes:b,dispose:V,canvases:{gl:i,overlay:r,ink2d:u},captureCanvas:()=>Oe(),replay:j,rebuild:p,clear:()=>(B(),b.length=0,j(),h.reset()),save:Fe,probe:(R,U)=>c.probe(R,U),pstats:()=>h.stats(),hashSeed:Xi,addStroke:ke,queueStroke:me,extendGrowing:we,replaceTail:_e,finishGrowing:oe,flushQueue:Ee,pending:()=>({queued:G.length,growing:J?J.i:null,points:J?J.pts.length:0,hold:J?!!J.hold:!1}),step:(R=1)=>{for(let U=0;U<R;U++)se()}};return n.global&&(window.TRAIL=Q),Q}const lc=250,og=900,uc=580,ag=2600,hc=n=>n<0?0:n>1?1:n;function cg(n,e){if(!e)return null;const t=n[e+"_jong"];return t?t.pos?t:t.cluster_front?n[t.cluster_front+"_jong"]??null:null:null}const fc=2.2,lg=5,dc=[1.25,2.1],pc=[2.5,5],mc=[.1,.35],ug=3.5,hg=420,Rs=(n,e,t)=>n+(e-n)*t,fi=(n,e,t)=>Math.exp(-(((n-e)/t)**2));function fg(n,e){const t=n[e.cho]?.cho,i=n[e.jung];if(!t?.pos||!i?.pos)return null;const[r,s,o]=t.pos,[a,c]=i.pos,l=hc((a-lc)/(og-lc)),h=hc((c-uc)/(ag-uc)),u=i.yang?1:-1,f=i.diphthong?1:0,d=cg(n,e.jong),_=d?.pos?.[1]??.5,g=d?.pos?.[2]??.33,m=fc+l*(lg-fc),p=Rs(dc[0],dc[1],o),T=Rs(pc[0],pc[1],h),y=Rs(mc[0],mc[1],l),S=hg,L=m/S,w=y*Math.PI*2/m,b=p*2*Math.PI*T/m,P=new Float64Array(S);for(let A=0;A<S;A++){const D=A/(S-1),I=fi(D,.34,.045)-fi(D,.68,.045),k=Math.sin(D*Math.PI*2*11)*.8,W=1,B=Math.sin(D*Math.PI*2*2.2);P[A]=fi(s,0,.3)*I+fi(s,.5,.22)*k+fi(s,.78,.26)*W+fi(s,1,.22)*B}let v=0;for(let A=0;A<S;A++)v+=Math.abs(P[A]);const x=v>1e-9?ug/(v*L):0;return{N:S,ds:L,theta0:-Math.PI*.15+(r-.5)*Math.PI*.7,k(A){const D=A/(S-1),I=f&&D>.5?Math.PI:0,k=b*Math.cos(2*Math.PI*T*D+I);let W=(w+k)*u+P[A]*x;if(d&&D>.85){const B=(D-.85)/.15;W+=(_>=.5?1:-1)*(6+g*18)*Math.sin(B*Math.PI)}return W},step(A){return L*(1+o*.35*Math.sin(A*2.399))}}}function dg(n,e){let t=0,i=0;const r=[{x:t,y:i}];for(let s=0;s<n.N;s++){e+=n.k(s)*n.ds;const o=n.step(s);t+=Math.cos(e)*o,i+=Math.sin(e)*o,r.push({x:t,y:i})}return{pts:r,theta:e}}function pg(n,e){const t=[];let i=null;for(const r of n)(!i||Math.hypot(r.x-i.x,r.y-i.y)>=e)&&(t.push(r),i=r);return t}const mg=.35,_g=1,_c=n=>Math.atan2(Math.sin(n),Math.cos(n));function gg(n,e,t,i,r,s=5){let o=null,a=0,c=0;const l=[{x:0,y:0}];for(const h of e){const u=fg(n,h);if(!u)continue;o=o===null?u.theta0:o+_c(u.theta0-o)*mg;const{pts:f,theta:d}=dg(u,o);o=d;const _=f[f.length-1],g=Math.hypot(_.x,_.y);if(g<1e-6)continue;const m=Math.atan2(_.y,_.x),p=-_c(m)*_g,T=Math.cos(p),y=Math.sin(p),S=1/g;for(let w=1;w<f.length;w++){const b=f[w].x*S,P=f[w].y*S;l.push({x:a+(b*T-P*y),y:c+(b*y+P*T)})}const L=l[l.length-1];a=L.x,c=L.y,o+=p}return l.length<2?[]:pg(l.map(h=>({x:t+h.x*r,y:i+h.y*r})),s)}const vg="turtle",gc=2,vc=110,xc=100,xg=1.8,Sc={spacing:4,spineSmooth:8,wanderAmp:[3,8],wanderLen:[120,240],weaveAmp:[6,14],weaveLen:[80,150],eventGap:[55,110],swirlSpan:[18,26],swirlRadius:[9,15],compBaseSmooth:28,compStep:2.5,compSmooth:6,headLag:5,decorGap:[30,70],decorSpread:12,decorRadius:[2,5],decorLineWidth:.75,growPx:8,goo:{reach:10,th:1.7,edge:.04,spine:!0,companion:!0,fieldScale:1},grow:{on:!1},part:{on:!1}};class Sg{constructor(e={}){this._opts=e,this._trail=null,this._canvas=null,this._ownCanvas=!1,this._JAMO=null,this._groups=[],this._holdingIdx=-1,this._sampleStep=Math.max(Sc.spacing+1,5),this._generator=vg,this.sylSize=vc,this.wrapStep=xc,this.wrapMargin=vc*.6,this.lineHeightRatio=xg}async init(e){e?this._canvas=e:(this._canvas=document.createElement("canvas"),this._ownCanvas=!0,document.body.appendChild(this._canvas)),this._trail=sg({canvas:this._canvas,mouse:!1,keys:!1,global:!1,cfg:Sc})}update(e,t,i){if(i&&(this._JAMO=i),!this._JAMO||!this._trail)return;if(!e?.length){this.clearAccum();return}const r=window.innerWidth,s=window.innerHeight,o=[];for(let _=0;_<e.length;_++){const g=e[_],m=t?.[_]??[.5,.5],p=o[o.length-1];p&&p.wordId===g.wordId&&Math.abs(p.anchor[1]-m[1])<1e-4?(p.syls.push(g),p.keys.push(`${g.cho}${g.jung}${g.jong??""}`)):o.push({wordId:g.wordId,anchor:[m[0],m[1]],syls:[g],keys:[`${g.cho}${g.jung}${g.jong??""}`]})}const a=_=>`${_.wordId}@${_.anchor[0].toFixed(5)},${_.anchor[1].toFixed(5)}`,c=(_,g=_.syls)=>gg(this._JAMO,g,_.anchor[0]*r,_.anchor[1]*s,xc,this._sampleStep),l=_=>this._trail.hashSeed("word",_.wordId,..._.keys),h=this._groups;let u=0;for(;u<h.length&&u<o.length&&h[u].sig===a(o[u])+"|"+o[u].keys.join("");)u++;if(u===h.length-1&&u===o.length-1&&this._holdingIdx===u){const _=h[u],g=o[u],m=Math.max(0,g.keys.length-gc),p=g.keys.slice(0,m);if(_.anchorKey===a(g)&&p.length<=_.keys.length&&_.keys.slice(0,p.length).join("\0")===p.join("\0")){const y=m>0?c(g,g.syls.slice(0,m)):[],S=c(g);this._trail.replaceTail(y.length,S.slice(y.length)),_.keys=g.keys.slice(),_.stableKeys=p,_.sig=a(g)+"|"+g.keys.join(""),_.pointCount=S.length;return}}if(u===h.length&&u===o.length)return;const f=u<h.length;f&&(this._trail.clear(),this._groups=[]);const d=f?0:u;this._holdingIdx=-1;for(let _=d;_<o.length;_++){const g=o[_],m=c(g);if(m.length<2)continue;const p=_===o.length-1;f&&!p?this._trail.addStroke(m,l(g)):this._trail.queueStroke(m,l(g),{hold:p}),p&&(this._holdingIdx=_),this._groups.push({sig:a(g)+"|"+g.keys.join(""),anchorKey:a(g),keys:g.keys.slice(),stableKeys:g.keys.slice(0,Math.max(0,g.keys.length-gc)),pointCount:m.length})}}finishGrowing(){this._trail?.finishGrowing()}async flushQueue(){this._trail&&(await this._trail.flushQueue(),await new Promise(e=>requestAnimationFrame(()=>requestAnimationFrame(e))))}captureFrame(){return this._trail?this._trail.captureCanvas().toDataURL("image/png"):null}clearAccum(){this._trail?.clear(),this._groups=[],this._holdingIdx=-1}dispose(){this._trail?.dispose(),this._trail=null,this._ownCanvas&&this._canvas?.parentNode&&this._canvas.parentNode.removeChild(this._canvas),this._canvas=null}setGenerator(e){this._generator=e==="anchor"?"anchor":"turtle",this._trail?.clear(),this._groups=[],this._holdingIdx=-1}cfg(){return this._trail?.CFG}engine(){return this._trail}}const Mg=!0,yg=`
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
`,di=`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`,cl=`
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

${yg}

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
`,Eg=`
#ifdef GL_ES
precision highp float;
#endif

${cl}

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
`,Tg=`
#ifdef GL_ES
precision highp float;
#endif

${cl}

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
`,bg=`
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
`,Ag=1600,ll=`
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
`,wg=`
#ifdef GL_ES
precision highp float;
#endif
${ll}
void main() {
    gl_FragColor = compose(gl_FragCoord.xy / u_resolution);
}
`,Rg=n=>`
#ifdef GL_ES
precision highp float;
#endif
${ll}
void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution;
    vec4 acc = compose(uv);

    ${n?"gl_FragColor = vec4(acc.rgb, acc.a);":"gl_FragColor = vec4(mix(vec3(0.7), acc.rgb, acc.a), 1.0);// #bg color"}
}
`,Cg=`
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
`,Pg=.12;class Lg{constructor(e={}){this._transparent=!!e.transparentOutput,this._renderer=null,this._clock=null,this._raf=null,this._lastTime=0,this._FRAME_INTERVAL=1e3/24,this._camPos=new H(.3,.5,7),this._camTarget=new H(0,0,0),this._growTarget=null,this._accumTarget=null,this._prevTarget=null,this._growScene=null,this._accumScene=null,this._dispScene=null,this._growUniforms=null,this._accumUniforms=null,this._dispUniforms=null,this._quadCam=null,this._queue=[],this._growing=!1,this._instantBake=!1,this._growStart=0,this._isFirstGlyph=!0,this._prevSylCount=0,this._forceComplete=!1,this._forceFinish=!1,this._hubs=new Map,this._curScale=1,this._sylHubIds=[],this._bakedCenters=[],this.lineHeightRatio=2.3,this.sylSize=100,this.wrapStep=165,this.wrapMargin=0,this.glyphExtent=1.5,this.refHeight=859,this.layoutScale={x:1.28,y:1},this.displayScale=1.2,this._scrollTarget=0,this._scrollPos=0,this._scrollBase=0,this._scrollJump=!0,this._rect=null,this._ghostStart=null,this._d3Displace=Mg}async init(e){const t=window.innerWidth,i=window.innerHeight,r=Math.min(window.devicePixelRatio,2);this._renderer=new d_({antialias:!0,canvas:e??void 0,alpha:this._transparent,premultipliedAlpha:!this._transparent}),this._renderer.setSize(t,i),this._transparent&&this._renderer.setClearColor(0,0),this._renderer.setPixelRatio(r),this._ownCanvas=!e,e||(this._renderer.domElement.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;",document.body.appendChild(this._renderer.domElement)),this._clock=new Ch,this._quadCam=new jc(-1,1,1,-1,0,1);const s={minFilter:Ht,magFilter:Ht,format:Ut,type:tn},o=t*r,a=i*r;this._growTarget=new Lt(o,a,s),this._accumTarget=new Lt(o,a,s),this._prevTarget=new Lt(o,a,s),this._pathTarget=new Lt(151,3,{minFilter:It,magFilter:It,format:Ut,type:Kt,depthBuffer:!1});const{ro:c,camMat:l,fov:h}=this._calcCamera();this._growUniforms={u_resolution:{value:new Ge(o,a)},u_time:{value:0},u_ro:{value:c},u_camMat:{value:l},u_fov:{value:h},u_start:{value:new H},u_center:{value:new H},u_cho:{value:new H},u_end:{value:new H},u_jung:{value:new H},u_hubCenters:{value:[new H,new H]},u_connCount:{value:0},u_amp:{value:0},u_yangseong:{value:0},u_diphthong:{value:0},u_growT:{value:0},u_d3Displace:{value:this._d3Displace?1:0},u_glyphScale:{value:1},u_pathTex:{value:this._pathTarget.texture},u_usePathTex:{value:1}},this._growScene=this._makeQuadScene(di,Tg,this._growUniforms);const{u_pathTex:u,...f}=this._growUniforms;this._pathScene=this._makeQuadScene(di,Eg,f),this._accumUniforms={u_growTex:{value:this._growTarget.texture},u_bckbuffer:{value:this._prevTarget.texture},u_resolution:{value:new Ge(o,a)},u_isFirst:{value:1}},this._accumScene=this._makeQuadScene(di,bg,this._accumUniforms),this._ghostTarget=new Lt(o,a,s),this._ghostTarget2=new Lt(o,a,s),this._dispUniforms={u_accumTex:{value:this._accumTarget.texture},u_ghostTex:{value:this._ghostTarget.texture},u_ghostT:{value:1},u_resolution:{value:new Ge(o,a)}},this._dispScene=this._makeQuadScene(di,Rg(this._transparent),this._dispUniforms),this._ghostUniforms={u_accumTex:{value:null},u_ghostTex:{value:null},u_ghostT:{value:1},u_resolution:{value:new Ge(o,a)}},this._ghostScene=this._makeQuadScene(di,wg,this._ghostUniforms),this._shiftUniforms={u_src:{value:null},u_resolution:{value:new Ge(o,a)},u_shift:{value:0}},this._shiftScene=this._makeQuadScene(di,Cg,this._shiftUniforms),window.addEventListener("resize",this._onResize),this._raf=requestAnimationFrame(this._animate)}forceRebake(e,t){if(!e||t===0)return;const{starts:i,centers:r,chos:s,ends:o,jungs:a,amps:c,yangseong:l,diphthong:h}=e;this._curScale=e.scale??1,this._queue=[],this._growing=!1,this._isFirstGlyph=!0;for(let u=0;u<t;u++)this._queue.push(this._makeItem(i[u],r[u],s[u],o[u],a[u],c[u],l[u],h[u],!0));this._prevSylCount=t,this._dequeue()}update(e,t=0,i=null){if(!e)return;const{starts:r,centers:s,chos:o,ends:a,jungs:c,amps:l,yangseong:h,diphthong:u,confirmed:f}=e,d=this._prevSylCount;if(this._curScale=e.scale??1,t>=d&&this._bakedCenters.some((g,m)=>m<d&&g.distanceToSquared(s[m])>1e-8)&&this._rebake(e,d),this._bakedCenters=s.slice(0,t).map(g=>g.clone()),t<d){this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._hubs=new Map,this._sylHubIds=[];for(let g=0;g<t;g++)this._queue.push(this._makeItem(r[g],s[g],o[g],a[g],c[g],l[g],h[g],u[g],!0))}else{for(let g=d;g<t;g++){g>0&&this._maybeRegisterHub(g-1,e);let m=[];if(i&&i[g]){const y=o[g].z>=.65,S=i[g-1],L=i[g],w=g>0&&!!S?.jong&&L.cho==="ㅇ",b=!!L.jong,P=[y,w,b].filter(Boolean).length,v=P>=2?2:P>=1?1:0;if(v>0){const x=this._pickHubTargets(v);m=x.map(A=>A.center),this._sylHubIds[g]=x.map(A=>A.id)}}const p=f?f[g]:!1;this._queue.push(this._makeItem(r[g],s[g],o[g],a[g],c[g],l[g],h[g],u[g],p,m,m.length))}t>d&&d>0&&this._growing&&(this._growUniforms.u_end.value.copy(a[d-1]),this._forceComplete=!0)}this._prevSylCount=t,this._growing||this._dequeue()}_maybeRegisterHub(e,t){const i=t.chos[e];if(i.y>=.75)return;const r=t.amps[e],s=new H((i.x-.5)*2,(i.y-.5)*2,(i.z-.5)*2).multiplyScalar(r*.6*(t.scale??1)),o=t.centers[e].clone().add(s);this._hubs.set(e,{id:e,center:o,connections:0})}_rebake(e,t){const{starts:i,centers:r,chos:s,ends:o,jungs:a,amps:c,yangseong:l,diphthong:h}=e;for(const[u,f]of this._hubs){const d=s[u],_=new H((d.x-.5)*2,(d.y-.5)*2,(d.z-.5)*2).multiplyScalar(c[u]*.6*(e.scale??1));f.center=r[u].clone().add(_)}this._queue=[],this._growing=!1,this._forceComplete=!1,this._isFirstGlyph=!0;for(let u=0;u<t;u++){const f=(this._sylHubIds[u]??[]).map(d=>this._hubs.get(d)?.center).filter(Boolean);this._queue.push(this._makeItem(i[u],r[u],s[u],o[u],a[u],c[u],l[u],h[u],!0,f,f.length))}}_pickHubTargets(e){const t=[],i=new Set;for(let r=0;r<e;r++){const s=[...this._hubs.entries()].filter(([f])=>!i.has(f));if(s.length===0)break;const o=s.map(([,f])=>f.connections+1),a=o.reduce((f,d)=>f+d,0);let c=Math.random()*a,l=s[s.length-1];for(let f=0;f<s.length;f++)if(c-=o[f],c<=0){l=s[f];break}const[h,u]=l;u.connections++,i.add(h),t.push(u)}return t}dispose(){cancelAnimationFrame(this._raf),window.removeEventListener("resize",this._onResize),this._growTarget?.dispose(),this._accumTarget?.dispose(),this._prevTarget?.dispose(),this._pathTarget?.dispose(),this._ghostTarget?.dispose(),this._ghostTarget2?.dispose(),this._renderer?.dispose();const e=this._renderer?.domElement;this._ownCanvas&&e?.parentNode&&e.parentNode.removeChild(e)}screenToWorld(e,t){const i=window.innerWidth,r=window.innerHeight,{ro:s,camMat:o,fov:a}=this._calcCamera(),c=new H((e*2-1)*(i/r),1-t*2,-a).applyMatrix3(o).normalize();return s.clone().addScaledVector(c,-s.z/c.z)}_toScreen(e){const t=window.innerWidth,i=window.innerHeight,{ro:r,camMat:s,fov:o}=this._calcCamera(),a=e.clone().sub(r).applyMatrix3(s.clone().transpose()),c=-a.z/o;return{u:(a.x/c/(t/i)+1)/2,v:(1-a.y/c)/2,t:c}}_shiftAtDepth(e,t){const{camMat:i}=this._calcCamera(),{t:r}=this._toScreen(e),s=window.innerWidth,o=window.innerHeight;return e.clone().add(new H(-2*t*(s/o)*r,0,0).applyMatrix3(i))}scrollTo(e){const t=Math.max(0,e)*this._renderer.getPixelRatio();if(this._scrollTarget=t,this._scrollJump||t<this._scrollPos){this._scrollJump=!1,this._scrollPos=t,this._scrollBase=Math.round(t);return}const i=window.innerWidth,r=this._rect?i-(this._rect.x+this._rect.w):i*.1,s=Math.max(1,r*.8*this._renderer.getPixelRatio()),o=Math.round(t-s)-this._scrollBase;o>0&&(this._shiftAccum(o),this._scrollPos=Math.max(this._scrollPos,this._scrollBase))}disperse(){const e=this._renderer,t=this._ghostUniforms;t.u_accumTex.value=this._accumTarget.texture,t.u_ghostTex.value=this._ghostTarget.texture,t.u_ghostT.value=this._dispUniforms.u_ghostT.value,e.setRenderTarget(this._ghostTarget2),e.render(this._ghostScene,this._quadCam),e.setRenderTarget(null),[this._ghostTarget,this._ghostTarget2]=[this._ghostTarget2,this._ghostTarget],this._dispUniforms.u_ghostTex.value=this._ghostTarget.texture,this._dispUniforms.u_ghostT.value=0,this._ghostStart=performance.now()}get scrollBase(){return this._scrollBase/(this._renderer?.getPixelRatio()??1)}setRect(e){this._rect=e}setD3Displace(e){this._d3Displace=!!e,this._growUniforms&&(this._growUniforms.u_d3Displace.value=this._d3Displace?1:0)}isIdle(){return!this._growing&&this._queue.length===0}finishGrowing(){(this._growing||this._queue.length>0)&&(this._forceFinish=!0)}flushQueue(){const e=t=>requestAnimationFrame(()=>requestAnimationFrame(t));return this.finishGrowing(),!this._growing&&this._queue.length===0?new Promise(e):new Promise(t=>{const i=()=>{!this._growing&&this._queue.length===0?e(t):requestAnimationFrame(i)};requestAnimationFrame(i)})}captureFrame(){const e=this._accumTarget.width,t=this._accumTarget.height,i=new Uint8Array(e*t*4);this._renderer.readRenderTargetPixels(this._accumTarget,0,0,e,t,i);const r=document.createElement("canvas");r.width=e,r.height=t;const s=r.getContext("2d"),o=s.createImageData(e,t);for(let a=0;a<t;a++){const c=(t-1-a)*e*4,l=a*e*4;o.data.set(i.subarray(c,c+e*4),l)}return s.putImageData(o,0,0),r.toDataURL("image/png")}clearAccum(){this._queue=[],this._growing=!1,this._forceFinish=!1,this._isFirstGlyph=!0,this._prevSylCount=0,this._hubs=new Map,this._sylHubIds=[],this._bakedCenters=[],this._scrollTarget=this._scrollPos=this._scrollBase=0,this._scrollJump=!0;const e=this._renderer.getClearColor(new je),t=this._renderer.getClearAlpha();this._renderer.setClearColor(0,0),this._renderer.setRenderTarget(this._accumTarget),this._renderer.clear(),this._renderer.setRenderTarget(this._prevTarget),this._renderer.clear(),this._renderer.setRenderTarget(null),this._renderer.setClearColor(e,t)}_makeItem(e,t,i,r,s,o,a,c,l,h=[],u=0,f=this._curScale){return{scale:f,start:e.clone(),center:t.clone(),cho:i.clone(),end:r.clone(),jung:s.clone(),amp:o,yang:a,diph:c,instant:l,hubCenters:h.map(d=>d.clone()),connCount:u}}_bakePath(){const e=this._renderer.getRenderTarget();this._renderer.setRenderTarget(this._pathTarget),this._renderer.render(this._pathScene,this._quadCam),this._renderer.setRenderTarget(e)}_dequeue(){if(this._queue.length===0)return;const e=this._queue.shift(),t=this._growUniforms;t.u_start.value.copy(e.start),t.u_center.value.copy(e.center),t.u_cho.value.copy(e.cho),t.u_end.value.copy(e.end),t.u_jung.value.copy(e.jung),t.u_amp.value=e.amp,t.u_yangseong.value=e.yang,t.u_diphthong.value=e.diph,t.u_hubCenters.value[0].copy(e.hubCenters[0]??new H),t.u_hubCenters.value[1].copy(e.hubCenters[1]??new H),t.u_connCount.value=e.connCount??0,t.u_glyphScale.value=e.scale??1,this._bakePath(),t.u_growT.value=0,this._growStart=this._clock.getElapsedTime(),this._growing=!0,this._instantBake=e.instant}_stepScroll(){if(this._scrollPos===this._scrollTarget)return;this._scrollPos+=(this._scrollTarget-this._scrollPos)*Pg,Math.abs(this._scrollTarget-this._scrollPos)<.5&&(this._scrollPos=this._scrollTarget);const e=Math.round(this._scrollPos)-this._scrollBase;e>0&&this._shiftAccum(e)}_shiftAccum(e){const t=this._renderer,i=this._accumTarget,r=Math.floor(i.width),s=Math.floor(i.height);this._shiftUniforms.u_src.value=i.texture,this._shiftUniforms.u_resolution.value.set(r,s),this._shiftUniforms.u_shift.value=e,t.setRenderTarget(this._prevTarget),t.render(this._shiftScene,this._quadCam),t.setRenderTarget(null),this._accumTarget=this._prevTarget,this._prevTarget=i,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._scrollBase+=e;const o=e/(window.innerWidth*t.getPixelRatio()),a=l=>{const h=this._toScreen(l);return this.screenToWorld(h.u-o,h.v)},c=(l,h,u)=>{const f=a(h).sub(h);l.add(f),h.add(f);for(const d of u)d.copy(this._shiftAtDepth(d,o))};this._bakedCenters=this._bakedCenters.map(a);for(const l of this._hubs.values())l.center=this._shiftAtDepth(l.center,o);for(const l of this._queue)c(l.start,l.center,l.hubCenters);if(this._growing){const l=this._growUniforms;c(l.u_start.value,l.u_center.value,l.u_hubCenters.value.slice(0,l.u_connCount.value)),this._bakePath()}}_swapAndAccum(e){const t=this._prevTarget;this._prevTarget=this._accumTarget,this._accumTarget=t,this._accumUniforms.u_bckbuffer.value=this._prevTarget.texture,this._accumUniforms.u_isFirst.value=e?1:0,this._dispUniforms.u_accumTex.value=this._accumTarget.texture,this._renderer.setRenderTarget(this._accumTarget),this._renderer.render(this._accumScene,this._quadCam)}_animate=e=>{if(this._raf=requestAnimationFrame(this._animate),e-this._lastTime<this._FRAME_INTERVAL-4)return;if(this._lastTime=e,this._growUniforms.u_time.value=this._clock.getElapsedTime(),this._stepScroll(),this._ghostStart!==null){const i=(performance.now()-this._ghostStart)/Ag;this._dispUniforms.u_ghostT.value=Math.min(1,i),i>=1&&(this._ghostStart=null)}if(!this._growing){this._renderer.setRenderTarget(null),this._renderer.render(this._dispScene,this._quadCam);return}let t;if(this._instantBake){t=1,this._growUniforms.u_growT.value=1,this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._growing=!1,requestAnimationFrame(()=>this._dequeue());return}else{const i=this._growUniforms.u_growT.value;t=this._forceComplete||this._forceFinish?1:i+(1-i)*.08,this._forceComplete=!1,this._growUniforms.u_growT.value=t>=.98?1:t}this._renderer.setRenderTarget(this._growTarget),this._renderer.render(this._growScene,this._quadCam),this._swapAndAccum(this._isFirstGlyph),this._isFirstGlyph=!1,this._renderer.setRenderTarget(null),this._renderer.render(this._dispScene,this._quadCam),t>=1&&(this._growing=!1,this._dequeue(),this._forceFinish&&this._queue.length===0&&!this._growing&&(this._forceFinish=!1))};_calcCamera(){const e=this._camPos.clone(),i=this._camTarget.clone().clone().sub(e).normalize(),r=new H(0,1,0),s=new H().crossVectors(i,r).normalize(),o=new H().crossVectors(s,i).normalize(),a=new Pe().set(s.x,s.y,s.z,o.x,o.y,o.z,-i.x,-i.y,-i.z),c=1/Math.tan(Yu.degToRad(45)/2);return{ro:e,camMat:a,fov:c}}_makeQuadScene(e,t,i){const r=new Eh;return r.add(new Zt(new Qi(2,2),new mn({uniforms:i,vertexShader:e,fragmentShader:t}))),r}_onResize=()=>{const e=window.innerWidth,t=window.innerHeight,i=this._renderer.getPixelRatio(),r=e*i,s=t*i;this._renderer.setSize(e,t),this._growTarget.setSize(r,s),this._accumTarget.setSize(r,s),this._prevTarget.setSize(r,s),this._ghostTarget.setSize(r,s),this._ghostTarget2.setSize(r,s),this._dispUniforms.u_ghostT.value=1,this._ghostStart=null;const o=new Ge(r,s);this._growUniforms.u_resolution.value.copy(o),this._accumUniforms.u_resolution.value.copy(o),this._dispUniforms.u_resolution.value.copy(o),this._ghostUniforms.u_resolution.value.copy(o);const{ro:a,camMat:c,fov:l}=this._calcCamera();this._growUniforms.u_ro.value.copy(a),this._growUniforms.u_camMat.value.copy(c),this._growUniforms.u_fov.value=l,this._queue=[],this._growing=!1,this._isFirstGlyph=!0,this._scrollJump=!0}}const Dg={sora:yl,signal:D0,dandelion:Sg,mycelium:Lg};class Ug{constructor(e=null){this._canvas=e,this._current=null,this._name=null}async setReceiver(e,t={}){if(this._name===e)return;this._current&&(this._current.dispose(),this._current=null);const i=Dg[e];if(!i)throw new Error(`Unknown receiver: ${e}`);if(this._canvas?.parentNode){const r=document.createElement("canvas");r.id=this._canvas.id,r.className=this._canvas.className,r.style.cssText=this._canvas.style.cssText,this._canvas.parentNode.replaceChild(r,this._canvas),this._canvas=r}this._current=new i(t),this._name=e,await this._current.init(this._canvas)}update(...e){this._current?.update(...e)}get name(){return this._name}get current(){return this._current}dispose(){this._current?.dispose(),this._current=null,this._name=null}}function Ig(){const n=document.createElement("div");Object.assign(n.style,{position:"fixed",top:"0",left:"0",width:"100vw",pointerEvents:"none",zIndex:"5",display:"flex",flexDirection:"column"}),document.body.appendChild(n);let e=0;return{addCapture(t,i){const r=document.createElement("img");return r.src=t,Object.assign(r.style,{position:"fixed",top:"0",left:"0",width:"100vw",height:"100vh",display:"block",pointerEvents:"none",zIndex:String(6+e)}),n.appendChild(r),e+=i,e},get totalHeight(){return e}}}function Fg(n,e,t){const i=document.createElement("div");Object.assign(i.style,{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:"10px",zIndex:"20",background:"rgba(0,0,0,0.15)",padding:"8px 14px",borderRadius:"10px",outline:"1px solid rgba(255,255,255,0.12)",backdropFilter:"blur(6px)"});for(const{id:r,label:s}of[{id:"sora",label:"🐚"},{id:"signal",label:"🚦"},{id:"dandelion",label:"🌼"},{id:"mycelium",label:"🍄"}]){const o=document.createElement("button");o.textContent=s,o.dataset.id=r,Object.assign(o.style,{padding:"4px 10px",fontSize:"16px",background:r===n.name?"#d0daff":"transparent",color:"#fff",border:"1px solid #777",borderRadius:"6px",cursor:"pointer",transition:"background 0.2s"}),o.addEventListener("click",async()=>{await n.setReceiver(r),e(t()),i.querySelectorAll("button[data-id]").forEach(a=>{a.style.background=a.dataset.id===n.name?"#d0daff":"transparent"})}),i.appendChild(o)}document.body.appendChild(i)}function Ng(n,e){const t=document.createElement("div");Object.assign(t.style,{position:"fixed",bottom:"24px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"8px",zIndex:"20"});const i=document.createElement("input");i.type="text",i.placeholder="한글을 입력하세요",Object.assign(i.style,{width:"min(420px, 70vw)",fontSize:"17px",padding:"10px 14px",background:"rgba(255, 255, 255, 0.25)",color:"#000000",border:"1px solid #777",borderRadius:"8px",backdropFilter:"blur(6px)",outline:"none"});const r=document.createElement("button");r.textContent="bake",Object.assign(r.style,{padding:"10px 18px",fontSize:"15px",background:"#abcdff",color:"#456dff",border:"1px solid #8fa7ff",borderRadius:"8px",cursor:"pointer",whiteSpace:"nowrap"});const s=()=>{i.value.trim()&&(e(i.value.trim()),i.value="",n(""))};return i.addEventListener("input",()=>{let o=0,a=i.value.length;for(let c=0;c<i.value.length;c++){const l=i.value[c];if(l===" ")continue;const h=l.charCodeAt(0);if(h>=44032&&h<=55203&&o++,o>Vr){a=c;break}}o>Vr&&(i.value=i.value.slice(0,a)),n(i.value)}),i.addEventListener("keydown",o=>{o.key==="Enter"&&s()}),r.addEventListener("click",s),t.appendChild(i),t.appendChild(r),document.body.appendChild(t),i}async function Mc(){const e=new URLSearchParams(location.search).get("receiver")??"mycelium",t=new Ug;await t.setReceiver(e),window.rm=t;const i=Ig();let r=[],s=[],o=0,a=0;function c(h){const u=window.innerWidth,f=window.innerHeight,{positions:d,sylItems:_,widths:g,heights:m,sylSize:p,glyphScale:T}=Qa(t,h,u,f,o);r=_,_.length>0&&R_(t,_,d,p,g,m,T)}async function l(){const h=t.current;if(!r.length||!w_(h))return;const u=window.innerWidth,f=window.innerHeight,{lastY:d,sylSize:_,lineHeightRatio:g}=Qa(t,s,u,f,o),m=Math.round(d+_*g*1.5);o=d+_*g*.5,await h.flushQueue();const p=h.captureFrame();i.addCapture(p,m),h.clearAccum()}Ng(h=>{s=x_(h);const u=s.reduce((f,d)=>f+(d.isSpace?1:0),0);u>a&&t.current?.finishGrowing?.(),a=u,c(s)},async()=>{await l()}),Fg(t,c,()=>s),window.addEventListener("resize",()=>c(s))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Mc):Mc();
