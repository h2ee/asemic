// ── speakers.js — 맨 위 두 화자 프로필 + LED (2026-10-07) ───────────────────────
//
// 왼쪽 = 수신자 아이콘 / 오른쪽 = 관람객 웹캠(fisheye, 거울). 지금 글자 영역에 떠 있는
// 문장이 누구 것인지는 프로필 밑 LED가 켜지는 것으로만 알린다 — 토스트("is talking")를
// 대신한다. 예전엔 둘 다 TD /chat 크롬 스트립이 그렸다(icons, videodevin→fisheye→mirror).
//
// 웹캠: ?cam=0 이면 끔. ?campx=N 은 모자이크 칸 수(0 = 끔) — TD 프로필처럼 얼굴을 뭉갠다.
// 카메라를 못 열면(권한 거부, CEF 등) 빈 원으로 남는다.

import soraIcon from './chrome/img/sora.png';
import signalIcon from './chrome/img/signal.png';
import dandelionIcon from './chrome/img/dandelion.png';
import myceliumIcon from './chrome/img/mycelium.png';

const ICONS = { sora: soraIcon, signal: signalIcon, dandelion: dandelionIcon, mycelium: myceliumIcon };
ICONS.trail = dandelionIcon;
// 수신자 아이콘 URL (흰색+알파 PNG — mask로 써서 색을 입힌다). 빈 화면 안내 토스트도 쓴다
export const iconFor = name => ICONS[name] ?? null;

const FISHEYE = 1.0; // 0 = 그대로, 1 = 가운데가 가장 크게 부푼다
const SPECULAR = 0.95; // 오른쪽 위 반사광 세기 (0 = 끔)
const RIM = 0.55; // 가장자리 흰 테 세기 (0 = 끔)

const VERT = `attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const FRAG = `precision mediump float;
varying vec2 v;
uniform sampler2D u_tex;
uniform float u_aspect; // 영상 가로/세로
uniform float u_k;
uniform float u_px;
uniform float u_spec;
uniform float u_rim;
void main(){
    vec2 p = v * 2. - 1.;
    float r = length(p);
    vec2 q = p * mix(1., sqrt(r), u_k);    // 가운데를 부풀린다(fisheye)
    // 모자이크는 원본 영상 쪽 격자로 — 칸이 fisheye를 따라 구면처럼 휜다(가운데 크고 가장자리 작게)
    if (u_px > 0.) q = ((floor((q * .5 + .5) * u_px) + .5) / u_px) * 2. - 1.;
    q.x = -q.x;                            // 거울
    vec2 t = .5 + q * .5 * vec2(1. / max(u_aspect, 1.), min(u_aspect, 1.)); // 정사각형으로 cover
    vec3 col = texture2D(u_tex, vec2(t.x, 1. - t.y)).rgb;
    // 유리구슬 — 반사광·테는 모자이크 없이 매끈하게
    vec2 hp = (p - vec2(.42, .52)) * mat2(.8, -.6, .6, .8);   // 오른쪽 위, 비스듬한 타원
    float spec = smoothstep(.22, .08, length(hp * vec2(1., 1.9)));
    float rim = smoothstep(.78, 1., r);
    col = mix(col, vec3(1.), clamp(spec * u_spec + rim * u_rim, 0., 1.));
    gl_FragColor = vec4(col, 1.);
}`;

// → { open(), close() } — 셰이더는 한 번만 만들고, 카메라 스트림만 열고 닫는다(임시 끄기 버튼용)
function startCam(canvas, px) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
    if (!gl || !navigator.mediaDevices?.getUserMedia) return null;
    const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const [k, v] of [
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
        gl.texParameteri(gl.TEXTURE_2D, k, v);
    const U = n => gl.getUniformLocation(prog, n);
    gl.uniform1f(U('u_k'), FISHEYE);
    gl.uniform1f(U('u_px'), px);
    gl.uniform1f(U('u_spec'), SPECULAR);
    gl.uniform1f(U('u_rim'), RIM);

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    let stream = null;
    let raf = 0;
    let gen = 0; // 여는 중에 닫히면 늦게 온 스트림은 버린다

    function close() {
        gen++;
        cancelAnimationFrame(raf);
        stream?.getTracks().forEach(t => t.stop()); // 카메라 표시등까지 꺼진다
        stream = null;
        video.srcObject = null;
        canvas.classList.remove('live');
    }

    function open() {
        if (stream) return;
        const my = ++gen;
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
            .then(s => {
                if (my !== gen) return s.getTracks().forEach(t => t.stop());
                stream = s;
                video.srcObject = s;
                return video.play().then(() => my === gen && run());
            })
            .catch(err => console.warn('[cam]', err?.message ?? err));
    }

    function run() {
        canvas.classList.add('live');
        const frame = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.round(canvas.clientWidth * dpr);
            if (canvas.width !== w) canvas.width = canvas.height = w;
            if (video.readyState >= 2) {
                gl.viewport(0, 0, w, w);
                gl.uniform1f(U('u_aspect'), video.videoWidth / video.videoHeight);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
            raf = requestAnimationFrame(frame);
        };
        frame();
    }

    return { open, close };
}

/**
 * @param root  #speakers — .speaker[data-who=receiver|visitor] 두 개를 가진다
 */
export function buildSpeakers(root, { receiver, cam = true, camPx = 11, camToggle = null } = {}) {
    const icon = root.querySelector('[data-who="receiver"] .icon');
    const leds = {
        receiver: root.querySelector('[data-who="receiver"]'),
        visitor: root.querySelector('[data-who="visitor"]'),
    };
    const camera = cam ? startCam(root.querySelector('#cam'), camPx) : null;

    // 임시 카메라 끄기 버튼(#cam-toggle) — 고른 상태는 이 브라우저에 기억한다(새로고침해도 유지)
    const KEY = 'asemic.camOff';
    let camOff = false;
    try {
        camOff = localStorage.getItem(KEY) === '1';
    } catch {
        /* 저장소 막힘 — 기본(켬) */
    }
    function applyCam() {
        if (!camera) return;
        if (camOff) camera.close();
        else camera.open();
        if (camToggle) {
            camToggle.textContent = camOff ? 'cam off' : 'cam on';
            camToggle.classList.toggle('off', camOff);
        }
    }
    if (camToggle) {
        camToggle.hidden = !camera;
        camToggle.addEventListener('click', e => {
            e.stopPropagation();
            camOff = !camOff;
            try {
                localStorage.setItem(KEY, camOff ? '1' : '0');
            } catch {
                /* noop */
            }
            applyCam();
            document.getElementById('user-input')?.focus(); // 입력 포커스 돌려주기
        });
    }
    applyCam();

    function setReceiver(name) {
        const url = ICONS[name];
        icon.style.setProperty('--svg', url ? `url('${url}')` : 'none');
    }
    setReceiver(receiver);

    return {
        setReceiver,
        // speaker: 'visitor' | 'receiver' | null — 그 화자의 LED만 켠다
        setTalking(speaker) {
            for (const [who, el] of Object.entries(leds)) el.classList.toggle('talking', who === speaker);
        },
    };
}
