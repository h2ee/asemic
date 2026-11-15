// ── core.js ──────────────────────────────────────────────────────────────────
// main.js / dev 페이지(dev/translator, dev/analyzer)가 공유하는 순수 로직 모음.
// main.js에서 그대로 옮겨온 것 — 로직 변경 없음, export만 추가함.
// DOM을 직접 건드리는 코드(buildUI, buildInput, buildHistory, Init)는 여기 없음 —
// 그건 main.js처럼 각 페이지가 자기 레이아웃에 맞게 따로 짬.

import * as THREE from 'three';
import { loadJamo } from './jamo_loader.js';

export const JAMO = await loadJamo();

// 컨트롤 패널 매핑 표 — 의존성 없는 별도 파일(가상 패널 페이지가 three/CSV 없이 쓰도록)
export * from './controls.js';

// prettier-ignore
export const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// prettier-ignore
export const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// prettier-ignore
export const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

export const MAX_SYL = 50;

// ── 음절 분해 ─────────────────────────────────────────────────────────────────
export function decomposeSyllables(text) {
    const result = [];
    let wordId = 0;
    for (const ch of text) {
        if (ch === ' ') {
            result.push({ isSpace: true, wordId });
            wordId++;
            continue;
        }
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) {
            const offset = code - 0xac00;
            result.push({
                cho: CHO[Math.floor(offset / (21 * 28))],
                jung: JUNG[Math.floor((offset % (21 * 28)) / 28)],
                jong: JONG[offset % 28] || null,
                wordId,
                isSpace: false,
            });
        }
    }
    return result;
}

// 음절 item({cho,jung,jong}) → 완성형 한글 1자 (없으면 '')
export function composeChar(syl) {
    const c = CHO.indexOf(syl.cho);
    const v = JUNG.indexOf(syl.jung);
    const t = syl.jong ? JONG.indexOf(syl.jong) : 0;
    if (c < 0 || v < 0) return '';
    return String.fromCharCode(0xac00 + (c * 21 + v) * 28 + t);
}

// 음절 item → analyzer(모니터 2 / TD)용 페이로드.
// receiver로 실제 들어가는 자모 좌표 수치(초성 xyz, 중성 F1/F2/F3, 종성 xyz)를 담는다.
// TD가 이 값으로 blob-tracking 스타일 오버레이(추적 박스 + 수치 라벨)를 그림.
export function syllableData(syl) {
    const choPos = JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.5];
    const jungE = JAMO[syl.jung] ?? {};
    const jungPos = jungE.pos ?? [500, 1000, 2000];
    const jongE = syl.jong ? JAMO[syl.jong + '_jong'] : null;
    const jongPos =
        jongE?.pos ?? (jongE?.cluster_front ? JAMO[jongE.cluster_front + '_jong']?.pos : null) ?? null;
    return {
        char: composeChar(syl),
        cho: { jamo: syl.cho, x: choPos[0], y: choPos[1], z: choPos[2] },
        jung: {
            jamo: syl.jung,
            f1: jungPos[0],
            f2: jungPos[1],
            f3: jungPos[2],
            yang: jungE.yang ?? 0,
            diph: jungE.diphthong ?? 0,
        },
        jong: syl.jong
            ? { jamo: syl.jong, x: jongPos?.[0] ?? null, y: jongPos?.[1] ?? null, z: jongPos?.[2] ?? null }
            : null,
    };
}

// ── 사운드 — 음절 → 사물 공명 (src/js/sound.js가 그대로 연주한다). PRD 3-A ─────────────
// 말소리처럼 들리지 않게 숫자를 "목소리"가 아니라 "사물"로 해석한다(2026-10-01):
//   중성 F1/F2/F3 → 사물의 공명 주파수(모드). 필터가 아니라 울리는 음 자체라 모음으로 안 들린다
//   초성          → 그 사물을 건드리는 방식. 조음방법(y)=치기/긁기/문지르기/누르기/휘기,
//                   긴장도(z)=세기·어택, 조음위치(x)=접촉 소리의 색(노이즈 중심 주파수)
//   종성          → 울림을 끝맺는 방식. 막기(파열·마찰) / 웅웅 이어지기(비음) / 휘어 내려가기(유음)
//   receiver      → 사물의 재질(TIMBRE). 모드 비율·감쇠·파형이 다르다
// 같은 음절은 언제나 같은 소리. 숫자 규칙은 그대로고 해석만 바뀐다.
const ONSET_CENTER = [900, 4500, 3200, 1800, 1500]; // 조음위치 x = 0/0.25/0.5/0.75/1.0 → 노이즈 중심 Hz
function onsetCenter(x) {
    const t = Math.min(Math.max(x, 0), 1) * 4;
    const i = Math.min(Math.floor(t), 3);
    return ONSET_CENTER[i] + (ONSET_CENTER[i + 1] - ONSET_CENTER[i]) * (t - i);
}
const mannerOf = y => (y < 0.15 ? 'stop' : y < 0.4 ? 'affricate' : y < 0.6 ? 'fric' : y < 0.9 ? 'nasal' : 'liquid');
const tensionOf = z => (z < 0.15 ? 'sonorant' : z < 0.5 ? 'lax' : z < 0.85 ? 'tense' : 'asp');

// 재질 — 조절 포인트. scale: 포먼트 Hz에 곱함 / ratios: 모드마다 붙는 비정수배 배음 /
// tau: 기본 감쇠 시간(초, 높은 모드일수록 짧아진다) / wave: 'sine' | 'square'(삑) | 'breath'(노이즈 휘파람)
// level: receiver끼리 체감 음량 맞춤(오프라인 렌더 rms 기준 — 2026-11-10 전자음 층을 넣고 예전 rms에 다시 맞춤) / formantAmp: F1/F2/F3 비중 덮어쓰기
//
// 전자음 층 (2026-11-10) — 아래 필드는 전부 opt-in이라 안 주면(signal) 예전 소리 그대로. `?soundfx=0`이면 전부 끈다(A/B용)
//   fm      { ratio, index, decay, sustain } — 모드마다 사인 변조기(주파수 변조). index = 변조 깊이(반송파 Hz 배수), decay초에 sustain까지
//   drop    { from, dur } — 피치가 from배에서 제자리로 떨어진다(전자 톰·킥). 휘기 초성(글라이드)이면 글라이드가 우선
//   sub     { ratio, amp, tau } — F1 아래 사인 하나(바닥 울림)
//   drive   tanh 포화 세기(0 = 끔)
//   pan     음절마다 좌우 자리 ±pan (음절 내용으로 시드 — 같은 음절은 같은 자리)
//   panLfo  { rate, depth } — 자리가 천천히 좌우로 흔들림
//   flutter { rate:[lo,hi], depth } — breath 밴드 중심이 떨림. rate는 F2로 고른다
//   wash    { gain, fb, div, sweep:[a,b,c], peakFrom, dur, damp } — 노이즈 → 쓸어 가는 밴드 → 콤 공명(F1/div Hz). 소라에 귀 댄 소리. peakFrom 'f2'면 sweep 꼭대기 = F2
//   detuneRange [lo,hi] — 맥놀이(detune Hz)를 F3로 고른다
//   toneAttack 음(모드)만 이 초에 걸쳐 차오른다(접촉 노이즈는 그대로)
//   wash.sing { q, amt } — 파도 노이즈가 모드 주파수 공명 필터를 울린다(파도와 음 녹이기)
//   wash 추가: q(쓸기 밴드 폭, 기본 0.9) · peakMul(꼭대기 = F2×scale×peakMul) · keep(받침 막기에 안 잡힘) · chokeDur(막기 받침이면 dur에 곱해 짧은 파도)
//   grains 추가: band:[lo,hi](중심을 대역 안에서 고름) · delay(첫 알갱이까지 초)
//   grains  { n:[lo,hi], spread, dur:[lo,hi], amp, lift, pan, harm[] } — 짧은 사인 알갱이를 흩뿌림. 개수는 초성 z
//   fx      { delay:{time,feedback,tone,pingpong}, reverb:{time,tone} } — receiver마다 공유 버스 하나. send = 보내는 양
//   link    된/거센 초성·받침이면 delay send에 곱함 (mycelium 연결 실 조건과 같다 — 메아리가 이웃 마디까지 간다)
//   train   { n:[lo,hi], gap:[lo,hi], accel, jitter, decay } — 한 번 울리는 대신 짧은 펄스를 여러 번(스파이크 열). 개수 = 초성 z, 간격 = F2(앞모음일수록 빠름)
//   click   { gain, dur, q, first } — 펄스마다 딸깍(접촉 노이즈 색). first면 첫 펄스에도(아니면 초성 접촉 노이즈가 맡음)
//   crush   비트 수 — 진폭 계단화(비트크러시). 작을수록 거칠다
//   grains.kind 'noise'면 사인 대신 노이즈 딸깍(크래클), grains.shape 0이면 시간에 고르게 흩뿌림,
//   grains.src 'formants'면 알갱이 중심을 울리는 모드가 아니라 F1·F2·F3(×scale) 중에서 고른다 — 몸통에서 뺀 F2·F3를 시간에 흩어 쓰는 자리
//
// 변형 — `TIMBRE['<receiver>:<이름>']`을 `SOUND_FX.variant[receiver]`(페이지 `?myc=`)로 고른다. 없으면 기본
export const TIMBRE = {
    // 균사 (2026-11-10, crackle 중심 + pulse 섞음) — 썩은 나무의 둔한 FM '툭'이 2~5번 몰아치고(전기 스파이크), 비트크러시로 깎이고,
    // 포자가 터지듯 노이즈 딸깍이 흩어진다. **모음처럼 안 들리게**: 귀는 F1·F2(·F3) 봉우리가 *동시에* 울릴 때 그 비율로 모음을 알아듣는다 —
    // 몸통은 F1만 울리고(formantAmp [1,0,0], F1은 음높이로만 들린다), F2는 펄스 간격, F1~F3는 짧은 알갱이 색으로 시간에 흩는다(grains.src)
    mycelium: {
        scale: 0.5, ratios: [1, 1.73], ratioAmp: [1, 0.3], formantAmp: [0.35, 0, 0], tau: 0.09, wave: 'sine', level: 0.93, // 노이즈 > 음 (2026-11-10): 몸통 F1 1 → 0.35
        fm: { ratio: 0.71, index: 3, decay: 0.025, sustain: 0.05 },
        drop: { from: 1.3, dur: 0.03 },
        train: { n: [2, 5], gap: [0.06, 0.14], accel: 0.85, jitter: 0.3, decay: 0.6 },
        click: { gain: 2, dur: 0.01, q: 0.7, first: true }, // 펄스마다 넓은 노이즈 '칙' — 첫 펄스부터
        crush: 5,
        drive: 2.5,
        grains: { kind: 'noise', shape: 0, src: 'formants', n: [16, 40], spread: 0.6, dur: [0.003, 0.012], amp: 4, q: 1.2, pan: 0.7, harm: [1, 1.5, 2, 3] },
        pan: 0.4,
        fx: { delay: { time: 0.17, feedback: 0.3, tone: 1200, pingpong: true }, reverb: { time: 0.9, tone: 1500 } },
        send: { delay: 0.18, reverb: 0.2 },
        link: 2,
    },
    // 균사 예전 기본(2026-11-10 오전) — 젖은 나무 FM 통나무 북 + 바닥 울림, 어두워지며 좌우로 번져 가는 메아리. 종처럼 울려서 바꿈. `?myc=bell`
    'mycelium:bell': {
        scale: 0.5, ratios: [1, 2.32], ratioAmp: [1, 0.35], tau: 0.22, wave: 'sine', level: 0.78,
        fm: { ratio: 1.41, index: 1.4, decay: 0.045, sustain: 0.08 },
        drop: { from: 1.5, dur: 0.04 },
        sub: { ratio: 0.5, amp: 0.5, tau: 0.14 },
        drive: 1.6,
        pan: 0.35,
        fx: { delay: { time: 0.21, feedback: 0.45, tone: 1500, pingpong: true }, reverb: { time: 1.4, tone: 2500 } },
        send: { delay: 0.28, reverb: 0.12 },
        link: 2.2,
    },
    // 균사 변형 1 — 생체 전기 펄스: 균사가 주고받는 전기 스파이크. 울림 없이 짧은 '톡'이 따다닥 이어지고, 메아리로 이웃까지 번진다
    'mycelium:pulse': {
        scale: 0.5, ratios: [1, 2], ratioAmp: [1, 0.25], tau: 0.035, wave: 'sine', level: 1.6,
        drop: { from: 2.2, dur: 0.012 },
        sub: { ratio: 0.5, amp: 0.6, tau: 0.03 },
        train: { n: [3, 7], gap: [0.05, 0.13], accel: 0.82, jitter: 0.25, decay: 0.75 },
        click: { gain: 0.25, dur: 0.003 },
        pan: 0.5,
        fx: { delay: { time: 0.09, feedback: 0.5, tone: 2800, pingpong: true }, reverb: { time: 1.0, tone: 2500 } },
        send: { delay: 0.3, reverb: 0.08 },
        link: 2.2,
    },
    // 균사 변형 2 — 부패·크래클: 썩어 가는 나무의 둔한 '툭' + 비트크러시 + 포자가 터지는 탁탁 노이즈 알갱이
    'mycelium:crackle': {
        scale: 0.5, ratios: [1, 1.73], ratioAmp: [1, 0.3], tau: 0.09, wave: 'sine', level: 0.7,
        fm: { ratio: 0.71, index: 3, decay: 0.025, sustain: 0.05 },
        drop: { from: 1.3, dur: 0.03 },
        crush: 5,
        drive: 2.5,
        grains: { kind: 'noise', shape: 0, n: [8, 24], spread: 0.6, dur: [0.002, 0.008], amp: 0.5, q: 4, pan: 0.7, harm: [1, 2, 3, 4] },
        fx: { delay: { time: 0.17, feedback: 0.25, tone: 1200, pingpong: true }, reverb: { time: 0.9, tone: 1500 } },
        send: { delay: 0.15, reverb: 0.2 },
        link: 2,
    },
    // 소라 — 맥놀이 FM 종 + 소라에 귀 댄 파도 소리(콤 공명 노이즈가 밀려왔다 빠짐), 좌우로 오가는 물결, 긴 동굴 잔향
    // 모음 연상 줄이기(2026-11-10, mycelium과 같은 원리): 종은 F1만(고정 배율 2.76·5.4는 음절마다 같아서 모음 정보가 없다).
    // F2 = 파도가 쓸고 올라가는 꼭대기(wash.peakFrom), F3 = 맥놀이 빠르기(detuneRange)
    // 파도·시원함 (2026-11-10) — 주인공은 파도 노이즈(밀려와 부서지고 빠짐) + 부서질 때 흩어지는 고역 포말. 종은 한 옥타브 위 유리 반짝임으로 작게.
    // 예전(종 + 소라 공명이 주인공, 따뜻하게 울림)은 `?sora=shell`
    sora: {
        scale: 2.0, ratios: [1, 2.76, 5.4], ratioAmp: [1, 0.4, 0.15], formantAmp: [0.3, 0, 0], tau: 0.6, wave: 'sine', detune: 1.5, detuneRange: [0.8, 3], level: 1.8,
        toneAttack: 0.55, // 유리가 '팅' 대신 파도와 같이 차오른다(녹이기) — 파도 꼭대기(dur×0.35 ≈ 0.77초) 조금 앞
        fm: { ratio: 3.01, index: 0.3, decay: 0.25, sustain: 0.05 },
        wash: { gain: 0.5, fb: 0.55, div: 8, q: 0.5, sweep: [500, 2400, 700], peakFrom: 'f2', peakMul: 2.2, dur: 2.2, damp: 7000, keep: true, chokeDur: 0.6, sing: { q: 40, amt: 3 } },
        grains: { kind: 'noise', shape: 0, band: [3500, 9000], delay: 0.45, n: [24, 50], spread: 1.3, dur: [0.004, 0.02], amp: 0.6, q: 1.5, pan: 0.9 },
        pan: 0.2,
        panLfo: { rate: 0.18, depth: 0.7 },
        fx: { delay: { time: 0.42, feedback: 0.25, tone: 6000, pingpong: true }, reverb: { time: 3.5, tone: 9000 } },
        send: { delay: 0.08, reverb: 0.45 },
    },
    // 소라 예전(2026-11-10 오후) — 맥놀이 종 + 소라 공명. `?sora=shell`
    'sora:shell': {
        scale: 1.0, ratios: [1, 2.76, 5.4], ratioAmp: [1, 0.4, 0.15], formantAmp: [1, 0, 0], tau: 0.8, wave: 'sine', detune: 1.5, detuneRange: [0.8, 3], level: 1.44,
        fm: { ratio: 3.01, index: 0.5, decay: 0.35, sustain: 0.1 },
        wash: { gain: 0.05, fb: 0.92, div: 4, sweep: [350, 2400, 450], peakFrom: 'f2', dur: 1.8, damp: 3500 },
        pan: 0.25,
        panLfo: { rate: 0.22, depth: 0.6 },
        fx: { delay: { time: 0.42, feedback: 0.3, tone: 2500, pingpong: true }, reverb: { time: 3.5, tone: 5000 } },
        send: { delay: 0.12, reverb: 0.5 },
    },
    // 민들레 — 화분·바람. 2026-11-10 오늘 판(아래 'dandelion:wind')을 쓰다가 그 전 소리로 되돌림 — 입력 순간 바람 소리 하나, 비드 읽기 없음
    dandelion: { scale: 1.2, ratios: [1], ratioAmp: [1], tau: 0.45, wave: 'breath', q: 25, level: 2.0 },
    // 민들레 2026-11-10 판 — 떨리는 바람 휘파람 + 씨앗 알갱이가 흩날려 좌우로 멀어짐, 가벼운 공기 메아리 + 비드 읽기. `?dand=wind`
    // 모음 연상 줄이기(2026-11-10): F1·F2·F3에 좁은 노이즈 밴드를 동시에 걸면 그대로 속삭이는 모음이었다 → 휘파람은 F1 + 고정 배율 1.37 하나,
    // F2·F3는 짧은 씨앗 알갱이 음높이로 흩는다(grains.src). 떨림 빠르기는 원래 F2
    'dandelion:wind': {
        scale: 1.2, ratios: [1, 1.37], ratioAmp: [1, 0.5], formantAmp: [1, 0, 0], tau: 0.45, wave: 'breath', q: 25, level: 1.2, // 2026-11-10 2.33 → 1.2 — 비드 읽기 소리가 들리게 입력 소리를 뒤로
        flutter: { rate: [5, 11], depth: 0.025 },
        grains: { src: 'formants', n: [6, 16], spread: 0.75, dur: [0.012, 0.04], amp: 0.12, lift: 1.08, pan: 0.85, harm: [1, 1.5, 2] },
        fx: { delay: { time: 0.13, feedback: 0.38, tone: 6000, pingpong: true }, reverb: { time: 2.2, tone: 7000 } },
        send: { delay: 0.3, reverb: 0.3 },
        // 비드 읽기 = 테이프 재생 헤드 (2026-11-10) — 메인 비드가 완결된 단어를 왕복하며 한 걸음(0.5초, bead.main.fps 2)마다 그 자리를 읽는다.
        // 테이프에 든 건 입력 때 그 휘파람(F1)이고, 다른 건 다루는 방식: 앞으로 = 짧게 끊겨 빨라지며 올라감 / 뒤로 = 역재생(차올랐다 툭) 처짐 /
        // 부채 가까이 = 늘어짐(처짐) + 살 수만큼 스터터 / 되돌기·크게 꺾임 = 스크래치 / 가시 = 지글 딸깍 / 늘 히스·와우·포화
        read: {
            style: 'tape',
            gain: 2.6,
            snip: 0.2, // 한 걸음에 재생되는 조각 길이(초) — 걸음(0.5초) 사이는 비어서 끊겨 들린다
            q: 30,
            glide: 0.03, // 앞 음절 음높이에서 넘어오는 시간
            fwd: { rise: 1.12, attack: 0.004 }, // 앞으로 — 조각 동안 rise배로 빨라짐, 바로 시작해 사그라듦
            rev: { from: 1.06, fall: 0.92, cut: 0.015 }, // 뒤로 — from배에서 fall배로 처짐, 조각 내내 차올랐다 cut초에 끊김
            bend: 2, // 꺾인 1rad당 반음(속도 흔들림)
            bendMax: 3,
            drag: 3, // 부채 바로 옆에서 테이프가 늘어지는 정도(반음 아래)
            dragNear: [25, 110], // 늘어짐 거리(px) — 이 안쪽 다 늘어짐 ~ 바깥 없음. 화면 부채 펼침(near~far)은 너무 넓어 거의 늘 '다 펼침'이라 따로 잰다
            stutter: { per: 3, gap: 0.045 }, // 이번 걸음에 부채(orb)를 지나면 1 + 살수/per 번 다시 친다(gap초 간격)
            scratch: { turn: 2.4, len: 0.16, from: 0.45, peak: 0.05, to: 0.55, amp: 0.6, noise: 0.25 }, // 되돌기·꺾임 turn rad 이상 → 톱니파가 아래→위→아래
            hiss: { center: 5500, q: 0.4, gain: 0.05 },
            wow: { rate: 1.3, depth: 0.012 },
            drive: 2,
            spike: { window: 0.15, band: [2500, 8000], dur: [0.002, 0.008], amp: 0.9, q: 2 },
            pan: 0.9,
            maxReaders: 4,
            send: { delay: 0.15, reverb: 0.3 },
        },
        // 비드 읽기 첫 판(2026-11-10) — 같은 휘파람을 0.5초씩 이어 부르고 부채 = 사인 화음 다발. 입력 소리와 너무 닮아서 바꿈. `?read=soft`
        readSoft: {
            gain: 2.6, // 읽기 소리 전체 — level(입력 소리)과 따로. 2026-11-10 0.45×level 2.33 ≈ 1.05 → 2.6(입력보다 앞으로)
            dur: 0.5, // 한 걸음 소리 길이
            attack: 0.05,
            tau: 0.16,
            q: 30, // 휘파람 밴드 폭 (클수록 음이 또렷)
            glide: 0.12, // 한 걸음 전 음절 음높이에서 미끄러져 오는 시간 — 걸음이 이어져 선율이 된다
            bend: 3, // 획이 1rad 꺾일 때마다 반음 — 굽이가 휘어 오르내림으로 들린다(부호 = 도는 쪽)
            bendMax: 4, // 반음 상한 — 15px 걸음 사이 꺾임이 3rad까지 나와서(굽이 많은 획) 안 묶으면 옥타브씩 튄다
            fan: { spread: 1.5, amp: 0.5, tau: 0.35, octave: 2 }, // 부채 살 개수 = 사인 개수, 펼침만큼 ±spread 반음 벌어진다
            spike: { window: 0.15, band: [3000, 9000], dur: [0.003, 0.012], amp: 0.8, q: 3 }, // 가시를 지날 때 — 개수 = 가시 수
            turn: { center: 2500, q: 2, dur: 0.006, gain: 0.5 }, // 왕복 끝에서 되돌 때 톡
            pan: 0.9, // 화면 가로 위치 → 좌우
            maxReaders: 4, // 최근 단어 몇 개의 비드만 읽나 — 단어가 많으면 걸음이 빽빽해진다
            send: { delay: 0.2, reverb: 0.45 },
        },
    },
    signal: { scale: 2.0, ratios: [1], ratioAmp: [1], formantAmp: [1, 0.5, 0], tau: 0.09, wave: 'square', quantize: true, gate: true, level: 0.7 }, // 신호등 장난감 삑
};
// 페이지가 `?soundfx=0`이면 false로 — 전자음 층(위 opt-in 필드)을 빼고 예전 재질만
export const SOUND_FX = { on: true, variant: {}, read: false }; // read: dandelion 비드 읽기 소리 — `?dand=wind`일 때만 켜진다(기본 dandelion엔 읽기가 없다). 그때 `?read=0`이면 끔, `?read=soft`면 첫 판 // variant: { mycelium: 'bell' | 'pulse' | 'crackle' } — 페이지 `?myc=`

// 같은 음절 = 같은 소리 — 흩어짐(팬·알갱이)도 음절 내용으로 시드한다 (FNV-1a → mulberry32)
function sylRand(d) {
    let h = 2166136261;
    for (const ch of `${d.cho.jamo}|${d.jung.jamo}|${d.jong?.jamo ?? ''}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => {
        h = (h + 0x6d2b79f5) | 0;
        let t = Math.imul(h ^ (h >>> 15), h | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const lerp = (a, b, t) => a + (b - a) * Math.min(Math.max(t, 0), 1);
const FORMANT_AMP = [1.0, 0.5, 0.25];

// 초성 → 건드리는 방식 { attack, boost, soft, glide, noise[] }
function onsetFor(cho) {
    // ㅇ 초성은 살짝 누르기만 — 좌표상 연구개 비음이지만 첫소리 ㅇ은 소리가 없다
    if (cho.jamo === 'ㅇ') return { attack: 0.008, boost: 0.8, soft: 1, glide: null, noise: [] };
    const manner = mannerOf(cho.y);
    const tense = tensionOf(cho.z);
    const center = onsetCenter(cho.x);
    const o = { attack: 0.002, boost: 1, soft: 0, glide: null, noise: [] };
    if (tense === 'tense') o.boost = 1.3; // 된소리 — 세게, 더 짧게
    if (manner === 'stop') {
        // 치기 — 딱 한 번. 거센소리는 치고 나서 숨이 샌다
        o.attack = tense === 'tense' ? 0.0005 : 0.001;
        o.noise.push({ center, q: 1.5, at: 0, dur: 0.006, gain: 0.5 * o.boost });
        if (tense === 'asp') o.noise.push({ center, q: 0.8, at: 0.006, dur: 0.08, gain: 0.12 });
    } else if (manner === 'affricate') {
        // 치고 긁기
        o.attack = 0.002;
        o.noise.push({ center, q: 1.5, at: 0, dur: 0.006, gain: 0.45 });
        o.noise.push({ center, q: 2.5, at: 0.006, dur: tense === 'asp' ? 0.09 : 0.04, gain: 0.15 });
    } else if (manner === 'fric') {
        // 문지르기 — 울림이 천천히 차오른다. ㅎ(후두)은 넓게
        const glottal = cho.x > 0.9;
        const dur = glottal ? 0.08 : tense === 'tense' ? 0.13 : 0.1;
        o.attack = dur;
        o.noise.push({ center, q: glottal ? 0.5 : 3, at: 0, dur, gain: glottal ? 0.12 : 0.18 * o.boost });
    } else if (manner === 'nasal') {
        // 말랑한 채로 누르기 — 높은 모드가 덜 울린다
        o.attack = 0.015;
        o.soft = 1;
    } else {
        // 휘기 — 모드가 아래에서 제자리로 미끄러진다
        o.attack = 0.005;
        o.glide = { from: 0.85, dur: 0.06 };
    }
    return o;
}

// 종성 → 끝맺는 방식 { type, at, tau?, ratio? }. 겹받침은 대표음(cluster_front)
function endingFor(jong) {
    if (!jong || jong.x == null) return null;
    const manner = mannerOf(jong.y);
    const tense = tensionOf(jong.z);
    const at = 0.14; // 울리기 시작해서 끝맺기까지 — 조절 포인트
    if (manner === 'nasal') return { type: 'hum', at, stretch: 2.5 };
    if (manner === 'liquid') return { type: 'bend', at, ratio: 0.94, dur: 0.15 };
    // 파열·파찰·마찰 — 손으로 잡아 막는다. 된·거센일수록 빨리
    return {
        type: 'choke',
        at,
        tau: tense === 'tense' || tense === 'asp' ? 0.006 : 0.018,
        hiss: manner === 'fric' ? { center: onsetCenter(jong.x), q: 3, dur: 0.05, gain: 0.12 } : null,
    };
}

// 사운드 대체 트리거 — 음절 수가 늘었으면 새 마지막 음절을 돌려준다. 성장 시작을 직접 알리지 않는
// receiver(emitsSyllableStart 없음)는 페이지가 입력 순간에 이걸로 울린다. 한 번에 여러 개가 늘면 마지막만
export function addedSyllable(items, prevCount) {
    const syls = items.filter(it => !it.isSpace);
    return { count: syls.length, added: syls.length > prevCount ? syls[syls.length - 1] : null };
}

// 소리가 난 뒤에 받침이 붙었나 — 타이핑 중엔 '가'로 울리고 나서 '각'이 된다. 그러면 울리고 있는
// 소리에 종성 끝맺음을 건다(sound.endLast). played = 마지막으로 울린 음절, 맞으면 { jong, ending }
export function lateEnding(played, items) {
    if (!played || played.jong) return null;
    const last = [...items].reverse().find(it => !it.isSpace);
    if (!last?.jong || last.cho !== played.cho || last.jung !== played.jung) return null;
    const ending = endingFor(syllableData(last).jong);
    return ending ? { jong: last.jong, ending } : null;
}

// 비드 읽기 소리 — dandelion 메인 비드의 한 걸음(dandelion.js _readStep) → sound.js가 연주할 voice. 없으면 null
// step = { syl, prevSyl, turn, fan:{open, rays}|null, crossed:[{rays, spikes}], turned, x(0~1), rank, walking }
export function beadStepVoice(step, receiverName = 'dandelion') {
    const variant = SOUND_FX.on && SOUND_FX.variant[receiverName];
    const tb = (variant && TIMBRE[`${receiverName}:${variant}`]) || TIMBRE[receiverName];
    const R = SOUND_FX.read === 'soft' ? tb?.readSoft : tb?.read;
    if (!R || !SOUND_FX.on || SOUND_FX.read === false || !step?.syl || step.rank >= R.maxReaders) return null;
    if (R.style === 'tape') return tapeStepVoice(step, tb, R, receiverName);
    const d = syllableData(step.syl);
    const rnd = sylRand(d);
    const f = d.jung.f1 * tb.scale; // F1만 — 모음 연상 안 나게(voiceFor와 같은 원리)
    const prevF = step.prevSyl ? syllableData(step.prevSyl).jung.f1 * tb.scale : f;
    const modes = tb.ratios.map((r, j) => ({ freq: f * r, amp: tb.ratioAmp[j], tau: R.tau }));
    // 부채 — 살마다 사인 하나(F1 위 octave배 자리), 펼친 만큼 ±spread 반음으로 부챗살처럼 벌어진다
    const fan = step.fan;
    if (fan && fan.open > 0.1 && fan.rays) {
        const n = fan.rays;
        for (let k = 0; k < n; k++) {
            const t = n > 1 ? k / (n - 1) - 0.5 : 0; // -0.5..0.5
            const semi = t * 2 * R.fan.spread * fan.open;
            modes.push({ freq: f * R.fan.octave * 2 ** (semi / 12), amp: (R.fan.amp * fan.open) / Math.sqrt(n), tau: R.fan.tau, wave: 'sine' });
        }
    }
    // 가시 — 이번 걸음에 지난 orb에 가시가 있으면 그 개수만큼 뾰족한 딸깍
    const grains = [];
    for (const o of step.crossed ?? []) {
        if (!o.spikes) continue;
        const S = R.spike;
        const n = Math.round(o.spikes.n);
        const len = Math.min(Math.max((o.spikes.len - 18) / 20, 0), 1); // 가시 길이 18~38px → 0~1
        for (let i = 0; i < n; i++) {
            grains.push({
                kind: 'noise', q: S.q, at: rnd() * S.window,
                freq: S.band[0] * (S.band[1] / S.band[0]) ** rnd(),
                dur: lerp(...S.dur, len), amp: S.amp * (0.5 + 0.5 * rnd()) / Math.sqrt(n),
                pan: (step.x * 2 - 1) * R.pan + (rnd() * 2 - 1) * 0.3,
            });
        }
    }
    const noise = step.turned ? [{ ...R.turn, at: 0 }] : [];
    const semi = Math.max(-R.bendMax, Math.min(R.bendMax, step.turn * R.bend));
    const bendRatio = 2 ** (semi / 12);
    return {
        wave: 'breath',
        q: R.q,
        detune: 0,
        gate: false,
        modes,
        attack: R.attack,
        glide: prevF !== f ? { from: Math.min(Math.max(prevF / f, 0.5), 2), dur: R.glide } : null,
        noise,
        grains,
        ending: Math.abs(step.turn) > 0.05 ? { type: 'bend', at: R.glide, ratio: bendRatio, dur: R.dur - R.glide } : null,
        gain: (0.3 * R.gain) / Math.sqrt(Math.max(1, Math.min(step.walking, R.maxReaders))),
        length: R.dur,
        pan: (step.x * 2 - 1) * R.pan,
        fx: tb.fx ? { key: receiverName, ...tb.fx } : null,
        send: R.send,
    };
}

// 비드 = 테이프 재생 헤드. voice 하나 또는 [조각, 스크래치] 배열(sound.playAux가 둘 다 받는다)
function tapeStepVoice(step, tb, R, receiverName) {
    const d = syllableData(step.syl);
    const rnd = sylRand(d);
    const dist = step.fan?.dist ?? Infinity;
    const pull = Math.min(1, Math.max(0, (R.dragNear[1] - dist) / (R.dragNear[1] - R.dragNear[0])));
    const f = d.jung.f1 * tb.scale * 2 ** (-(R.drag * pull) / 12); // 부채 가까이 = 늘어져 처진다
    const prevF = step.prevSyl ? syllableData(step.prevSyl).jung.f1 * tb.scale : f;
    const fwd = step.dir !== -1;
    const curve = 2 ** (Math.max(-R.bendMax, Math.min(R.bendMax, step.turn * R.bend)) / 12);
    const pan = (step.x * 2 - 1) * R.pan;
    const gain = (0.3 * R.gain) / Math.sqrt(Math.max(1, Math.min(step.walking, R.maxReaders)));
    const fx = tb.fx ? { key: receiverName, ...tb.fx } : null;
    const modes = tb.ratios.map((r, j) => ({ freq: f * r, amp: tb.ratioAmp[j], tau: fwd ? R.snip / 3 : R.rev.cut }));

    // 스터터 — 부채 살 수만큼 다시 친다(앞으로 치는 모양으로)
    let pulses = null;
    const passed = (step.crossed ?? []).find(o => o.rays);
    if (passed) {
        const n = 1 + Math.round(passed.rays / R.stutter.per);
        pulses = Array.from({ length: n }, (_, i) => ({ at: i * R.stutter.gap, amp: 0.85 ** i }));
    }
    const rev = !fwd && !pulses;
    const startRatio = rev ? R.rev.from : 1;
    const endRatio = (rev ? R.rev.fall : R.fwd.rise) * curve;

    // 가시 — 지글 딸깍
    const grains = [];
    for (const o of step.crossed ?? []) {
        if (!o.spikes) continue;
        const S = R.spike;
        const n = Math.round(o.spikes.n);
        const len = Math.min(Math.max((o.spikes.len - 18) / 20, 0), 1);
        for (let i = 0; i < n; i++)
            grains.push({ kind: 'noise', q: S.q, at: rnd() * S.window, freq: S.band[0] * (S.band[1] / S.band[0]) ** rnd(), dur: lerp(...S.dur, len), amp: (S.amp * (0.5 + 0.5 * rnd())) / Math.sqrt(n), pan: pan + (rnd() * 2 - 1) * 0.3 });
    }
    const len = pulses ? pulses[pulses.length - 1].at + R.snip : R.snip;
    const snipV = {
        wave: 'breath',
        q: R.q,
        detune: 0,
        gate: false,
        modes,
        attack: rev ? R.snip * 0.85 : R.fwd.attack, // 역재생 = 끝까지 차올랐다 끊김
        glide: { from: (Math.min(Math.max(prevF / f, 0.5), 2) * startRatio), dur: R.glide },
        noise: [{ ...R.hiss, at: 0, dur: len }],
        grains,
        pulses,
        ending: { type: 'bend', at: R.glide, ratio: endRatio, dur: Math.max(len - R.glide, 0.02) },
        flutter: R.wow,
        drive: R.drive,
        gain,
        length: len + 0.03,
        pan,
        fx,
        send: R.send,
    };
    if (!step.turned && Math.abs(step.turn) < R.scratch.turn) return snipV;

    // 스크래치 — 톱니파가 아래 → 위 → 아래로 문질러진다 + 긁는 노이즈
    const S = R.scratch;
    const sf = d.jung.f1 * tb.scale * 1.5;
    return [
        snipV,
        {
            wave: 'saw',
            detune: 0,
            gate: false,
            modes: [{ freq: sf, amp: S.amp, tau: S.len / 2 }],
            attack: 0.003,
            glide: { from: S.from, dur: S.peak },
            noise: [{ center: 1800, q: 0.8, at: 0, dur: S.len * 0.8, gain: S.noise }],
            ending: { type: 'bend', at: S.peak, ratio: S.to, dur: S.len - S.peak },
            drive: R.drive,
            gain,
            length: S.len + 0.03,
            pan,
            fx,
            send: R.send,
        },
    ];
}

export function voiceFor(syl, receiverName = 'mycelium') {
    const d = syllableData(syl);
    const variant = SOUND_FX.on && SOUND_FX.variant[receiverName];
    const tbKey = variant && TIMBRE[`${receiverName}:${variant}`] ? `${receiverName}:${variant}` : TIMBRE[receiverName] ? receiverName : 'mycelium';
    const tb = TIMBRE[tbKey];
    const onset = onsetFor(d.cho);
    const ending = endingFor(d.jong);
    const brighten = d.jung.yang > 0 ? 1.03 : 1; // 양성모음은 살짝 밝게

    const modes = [];
    [d.jung.f1, d.jung.f2, d.jung.f3].forEach((F, k) => {
        tb.ratios.forEach((r, j) => {
            let freq = F * tb.scale * r * brighten;
            if (tb.quantize) freq = 440 * 2 ** (Math.round(12 * Math.log2(freq / 440)) / 12); // 반음 격자
            if (freq > 12000 || !(tb.formantAmp ?? FORMANT_AMP)[k]) return;
            // 말랑한 접촉(비음)은 높은 모드를 덜 울린다
            const amp = (tb.formantAmp ?? FORMANT_AMP)[k] * tb.ratioAmp[j] * (onset.soft ? 1 / (1 + k + j) : 1);
            // 높은 모드일수록 빨리 사그라든다
            const tau = tb.tau / (1 + freq / 3000);
            modes.push({ freq, amp, tau });
        });
    });
    const fx = SOUND_FX.on;
    if (fx && tb.sub) modes.push({ freq: d.jung.f1 * tb.scale * tb.sub.ratio, amp: tb.sub.amp, tau: tb.sub.tau, sub: true });

    let ring = Math.max(...modes.map(m => m.tau)) * 5;
    if (ending?.type === 'hum') ring *= ending.stretch;
    if (tb.gate) ring = ending?.type === 'hum' ? 0.35 : 0.2;
    if (ending?.type === 'choke') ring = Math.min(ring, ending.at + 0.1);
    const v = {
        wave: tb.wave,
        q: tb.q ?? 25,
        // detuneRange 있으면 맥놀이 빠르기를 F3로 (2080~3200Hz → lo~hi Hz)
        detune: tb.detuneRange && fx ? lerp(...tb.detuneRange, (d.jung.f3 - 2080) / 1120) : tb.detune ?? 0,
        gate: !!tb.gate,
        modes,
        attack: onset.attack,
        toneAttack: fx ? tb.toneAttack : undefined,
        glide: onset.glide,
        noise: onset.noise,
        ending,
        gain: 0.3 * onset.boost * (tb.level ?? 1),
        length: Math.min(onset.attack + ring, 4),
    };
    if (!fx) return v;

    // ── 전자음 층 (TIMBRE 위 주석). 난수는 음절 시드 — 같은 음절은 같은 자리·같은 알갱이
    const rnd = sylRand(d);
    if (tb.fm) v.fm = tb.fm;
    if (tb.drop && !onset.glide) v.drop = tb.drop;
    if (tb.drive) v.drive = tb.drive;
    if (tb.pan) v.pan = (rnd() * 2 - 1) * tb.pan;
    if (tb.panLfo) v.panLfo = tb.panLfo;
    if (tb.flutter) v.flutter = { rate: lerp(...tb.flutter.rate, (d.jung.f2 - 580) / 2020), depth: tb.flutter.depth };
    // 막기 받침이면 파도가 없거나(chokeDur 없음 — 예전) 짧은 파도(chokeDur배)
    if (tb.wash && (ending?.type !== 'choke' || tb.wash.chokeDur)) {
        const dur = tb.wash.dur * (ending?.type === 'choke' ? tb.wash.chokeDur : 1);
        v.wash = { ...tb.wash, dur, f0: Math.min((d.jung.f1 * tb.scale) / tb.wash.div, 300) };
        if (tb.wash.peakFrom === 'f2') v.wash.sweep = [tb.wash.sweep[0], Math.min(d.jung.f2 * tb.scale * (tb.wash.peakMul ?? 1), 10000), tb.wash.sweep[2]]; // 파도 꼭대기 = F2
        v.length = Math.min(Math.max(v.length, dur * 1.8), 4);
    }
    if (tb.grains) {
        const G = tb.grains;
        const n = Math.round(lerp(...G.n, d.cho.z));
        const base = G.src === 'formants' ? [d.jung.f1, d.jung.f2, d.jung.f3].map(F => ({ freq: F * tb.scale })) : modes.filter(m => !m.sub);
        v.grains = [];
        for (let i = 0; i < n; i++) {
            // 처음엔 빽빽하게, 갈수록 성기게 — 바람에 한꺼번에 떨어져 나간 씨앗이 흩어진다
            const at = onset.attack + (G.delay ?? 0) + G.spread * (G.shape === 0 ? rnd() : ((i + rnd() * 0.6) / n) ** (G.shape ?? 1.6));
            const m = base[Math.floor(rnd() * base.length)];
            const harm = G.harm ? G.harm[Math.floor(rnd() * G.harm.length)] : 1;
            // band 있으면 중심 = 그 대역 안 로그 균등(포말), 없으면 모드 × 배음
            const freq = G.band ? G.band[0] * (G.band[1] / G.band[0]) ** rnd() : Math.min(m.freq * harm, 9000);
            const dur = lerp(...G.dur, rnd());
            const amp = G.amp * (1 - i / n) ** 1.2 * (0.6 + 0.4 * rnd());
            v.grains.push({ at, freq, dur, amp, lift: G.lift ?? 1, pan: (rnd() * 2 - 1) * G.pan, kind: G.kind, q: G.q });
        }
        const lastG = Math.max(...v.grains.map(g => g.at + g.dur * 3));
        v.length = Math.min(Math.max(v.length, lastG), 4);
    }
    if (tb.crush) v.crush = tb.crush;
    if (tb.train) {
        // 스파이크 열 — 첫 펄스는 0초, 그 뒤 간격이 accel배씩 줄며(몰아치기) 흔들린다. 받침 막기면 거기서 끊긴다
        const T = tb.train;
        const n = Math.round(lerp(...T.n, d.cho.z));
        let gap = lerp(T.gap[1], T.gap[0], (d.jung.f2 - 580) / 2020);
        let at = 0;
        v.pulses = [];
        for (let i = 0; i < n; i++) {
            if (ending?.type === 'choke' && at > ending.at) break;
            v.pulses.push({ at, amp: T.decay ** i * (0.7 + 0.3 * rnd()) });
            at += gap * (1 + (rnd() * 2 - 1) * T.jitter);
            gap *= T.accel;
        }
        if (tb.click) v.click = { ...tb.click, center: onsetCenter(d.cho.x) };
        const maxTau = Math.max(...modes.map(m => m.tau));
        const last = v.pulses[v.pulses.length - 1].at;
        v.length = Math.min(v.attack + last + maxTau * 5 * (ending?.type === 'hum' ? ending.stretch : 1) + 0.05, 4);
    }
    if (tb.fx) {
        v.fx = { key: tbKey, ...tb.fx };
        v.send = { ...tb.send };
        if (tb.link) {
            v.sendLinked = { ...v.send, delay: v.send.delay * tb.link };
            if (d.cho.z >= 0.65 || d.jong) v.send = v.sendLinked;
        }
    }
    return v;
}

// ── 텍스트박스 레이아웃 엔진 ──────────────────────────────────────────────────
// offsetY: 이전 제출 줄 누적 높이(px) — 새 줄 시작 기준선
export function calcTextboxLayout(
    items,
    sylSize,
    W,
    H,
    lineHeightRatio = 1.3,
    offsetY = 0,
    wrapStep = sylSize * 2,
    wrapMargin = sylSize,
) {
    const PAD_X = sylSize * 0.5;
    const PAD_Y = 40;
    const lineH = sylSize * lineHeightRatio;

    let curX = PAD_X;
    let curY = PAD_Y + sylSize + offsetY;

    const positions = [];
    const sylItems = [];

    for (const item of items) {
        if (item.isSpace) {
            curX += wrapStep * 0.2; // #띄어쓰기 공백 길이
            if (curX > W - PAD_X) {
                curX = PAD_X;
                curY += lineH;
            }
            continue;
        }
        if (curX + wrapMargin > W - PAD_X) {
            curX = PAD_X;
            curY += lineH;
        }
        positions.push([curX / W, curY / H]);
        sylItems.push(item);
        curX += wrapStep;
    }

    const lastY = sylItems.length > 0 ? curY : PAD_Y + sylSize + offsetY;
    // firstY/topY/padBottom — layoutFor stack(ext 없는 receiver = dandelion)용: 첫 줄 기준선, 첫 줄 위끝, 기준선 아래 여백.
    // dandelion 획은 기준선 위로 자라고 음절 네모는 기준선 바로 밑에 붙어서, 아래 여백은 반 칸이면 된다
    return { positions, sylItems, lastY, firstY: PAD_Y + sylSize + offsetY, topY: PAD_Y + offsetY, padBottom: sylSize * 0.5 };
}

// ── signal 전용 Shelf 레이아웃 ────────────────────────────────────────────────
// 기존 calcTextboxLayout(고정 sylSize, 균일 grid)은 그대로 두고, signal(🚦)에서만
// 쓰는 별도 레이아웃. 음절마다 포먼트(F1) + yang + 이중모음 여부로 lattice 크기를
// 다르게 계산하고(calcSignalLatticeSize), 왼쪽부터 순서대로 쌓는다(shelf packing).
// 줄 높이 = 그 줄에 들어간 음절 height 중 최댓값. 이미 배치된 음절은 재배치하지
// 않음(실시간 타이핑 대응 — MaxRects류 빈틈 최소화는 포기).

// w = 정규화된 F1 = (F1-250)/600 — main.js의 f1Norm 계산과 동일 기준을 재사용.
export function calcSignalLatticeSize(syl, sylSizeBase) {
    const jungEntry = JAMO[syl.jung];
    const F1 = jungEntry?.pos?.[0] ?? 500;
    const w = Math.max(0, Math.min(1, (F1 - 250) / 600));
    const yang = jungEntry?.yang ? 1 : -1;
    const diph = jungEntry?.diphthong ?? 0;
    const scaleX = 1 + yang * 0.5 * w; // # signal scale diversity
    // 비이중모음: 등방(가로=세로). 이중모음: 가로축에만 스케일, 세로는 baseline 유지.
    //   양성(scaleX>1) → 가로로 긴 lattice / 음성(scaleX<1) → 세로가 상대적으로 큰 lattice
    return {
        width: sylSizeBase * scaleX,
        height: diph ? sylSizeBase : sylSizeBase * scaleX,
    };
}

// 반환: { positions(uv 0~1), sylItems, widths[], heights[], lastY }
// positions = 음절 **중심** — signal._draw()가 이 값으로 그대로 그리고(2026-10-08), 페이지의 음절 네모도
// 같은 값을 쓴다. 예전엔 signal이 positions를 줄 구분에만 쓰고 자기 규칙(단어 사이 sylSize·0.6, 줄 안 세로
// 가운데 정렬)으로 따로 깔아서, 네모(positions = 음절 왼쪽 끝)와 글자가 어긋나고 자간(wrapStep)은 안 먹었다.
// letterGap — 음절 사이 추가 간격(px). 자간 노브를 안 대면 0(음절이 붙어 "구슬이 이어진" 룩 그대로).
// 띄어쓰기는 sylSize·SHELF_WORD_GAP(= signal.js WORD_GAP_RATIO) + letterGap.
const SHELF_WORD_GAP = 0.6;
export function calcShelfLayout(items, sylSize, W, H, lineHeightRatio = 1.0, offsetY = 0, wrapStep = sylSize, wrapMargin = 0, letterGap = 0) {
    const PAD_X = sylSize * 0.5;
    const PAD_Y = 40;
    const LINE_GAP = sylSize * Math.max(0, lineHeightRatio - 1); // 줄 사이 추가 여백

    // 1차: 줄 나누기 + 가로 위치(음절 왼쪽 끝)
    const rows = [];
    let row = [];
    const rightLimit = W - PAD_X;
    let curX = PAD_X;
    const newRow = () => {
        rows.push(row);
        row = [];
        curX = PAD_X;
    };

    for (const item of items) {
        if (item.isSpace) {
            curX += sylSize * SHELF_WORD_GAP; // #띄어쓰기 — 음절 뒤 letterGap은 이미 붙어 있다
            if (curX > rightLimit) newRow();
            continue;
        }
        const { width, height } = calcSignalLatticeSize(item, sylSize);
        if (curX + width > rightLimit && curX > PAD_X) newRow();
        row.push({ item, x: curX, width, height });
        curX += width + letterGap;
    }
    if (row.length) rows.push(row);

    // 2차: 세로 위치 — 줄 높이 = 그 줄 음절 height 최댓값, 단어(wordId)는 줄 안에서 세로 가운데,
    // 음절은 단어 박스 위쪽 정렬(signal의 점이 단어 상단 기준으로 생성된다)
    const positions = [];
    const sylItems = [];
    const widths = [];
    const heights = [];
    let rowTop = PAD_Y + offsetY;
    let lastY = rowTop;
    let firstY = null;
    for (const r of rows) {
        const wordH = new Map();
        for (const s of r) wordH.set(s.item.wordId, Math.max(wordH.get(s.item.wordId) ?? 0, s.height));
        const rowMaxH = Math.max(...wordH.values());
        for (const s of r) {
            const top = rowTop + (rowMaxH - wordH.get(s.item.wordId)) * 0.5;
            positions.push([(s.x + s.width * 0.5) / W, (top + s.height * 0.5) / H]);
            sylItems.push(s.item);
            widths.push(s.width);
            heights.push(s.height);
        }
        lastY = rowTop + rowMaxH;
        firstY ??= lastY;
        rowTop += rowMaxH + LINE_GAP;
    }

    // firstY/topY/padBottom — layoutFor stack용: 첫 줄 아래끝, 첫 줄 위끝, 아래 여백(위 PAD_Y와 대칭)
    return { positions, sylItems, widths, heights, lastY, firstY: firstY ?? lastY, topY: PAD_Y + offsetY, padBottom: PAD_Y };
}

// ── 자모 pos → 3D 좌표 ────────────────────────────────────────────────────────
export function jamoToVec3(key, type, scale, offset = new THREE.Vector3()) {
    let rawPos;
    if (type === 'jong') {
        const entry = JAMO[key + '_jong'];
        rawPos = entry?.pos ??
            (entry?.cluster_front ? JAMO[entry.cluster_front + '_jong']?.pos : null) ?? [0.5, 0.5, 0.5];
    } else {
        rawPos = JAMO[key]?.cho?.pos ?? [0.5, 0.5, 0.5];
    }
    return new THREE.Vector3(
        (rawPos[0] - 0.5) * scale * 2,
        (rawPos[1] - 0.5) * scale * 2,
        (rawPos[2] - 0.5) * scale * 2,
    ).add(offset);
}

// ── 음절 → mycelium uniform 데이터 ─────────────────────────────────────────────
// project(u, v) → THREE.Vector3 — 주면 positions를 "음절 중심의 화면 uv"로 보고 receiver
// 카메라로 역투영한다(mycelium.screenToWorld). 안 주면 예전 근사식(sceneH·layoutScale·
// startOffsetX)을 쓴다.
// glyphScale — 결과에 scale로 실어 보낸다(모양은 sylSize=기준 크기로 계산, 실제 크기 = ×scale).
export function syllablesToUniforms(sylItems, positions, sylSize, layoutScale = { x: 1, y: 1 }, project = null, glyphScale = 1) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const sceneH = 2.07 * 2;
    const sceneW = sceneH * (W / H);
    const sylSize3D = (sylSize / H) * sceneH * 6.0;
    const AMP_RATIO = 0.35;

    // i < length-1 이면 종성 확정 (뒤에 다음 음절이 있으므로)
    const confirmed = sylItems.map((_, i) => i < sylItems.length - 1);

    const starts = [],
        centers = [],
        chos = [],
        ends = [],
        jungs = [];
    const amps = [],
        yangseong = [],
        diphthong = [];

    for (let i = 0; i < MAX_SYL; i++) {
        const syl = sylItems[i];
        const pos = positions[i];

        if (!syl || !pos) {
            starts.push(new THREE.Vector3());
            centers.push(new THREE.Vector3());
            chos.push(new THREE.Vector3());
            ends.push(new THREE.Vector3());
            jungs.push(new THREE.Vector3());
            amps.push(0);
            yangseong.push(0);
            diphthong.push(0);
            continue;
        }

        let offset;
        if (project) {
            // pos = 음절 중심의 화면 uv. receiver가 자기 카메라로 정확히 역투영한다
            offset = project(pos[0], pos[1]);
        } else {
            let startOffsetX = 1.0;
            if (sylSize3D > 3.5) startOffsetX = sylSize3D * 0.32;
            else if (sylSize3D < 3.0) startOffsetX = sylSize3D * 0.3;

            const wx = (pos[0] - 0.5) * sceneW * layoutScale.x + startOffsetX;
            const wy = -(pos[1] - 0.5) * sceneH * layoutScale.y + 0.5;
            offset = new THREE.Vector3(wx, wy, 0);
        }
        const scale = sylSize3D * 0.5;

        const cellCenter = offset.clone();
        const start = jamoToVec3(syl.cho, 'cho', scale, offset);
        const jungEntry = JAMO[syl.jung];
        const jungPos = jungEntry?.pos ?? [500, 1000, 2000];

        const f1Normpos = (jungPos[0] - 250) / (900 - 250);
        const f2Normpos = (jungPos[1] - 580) / (2600 - 580);
        const f3Normpos = (jungPos[2] - 2080) / (3200 - 2080);
        const end = syl.jong
            ? jamoToVec3(syl.jong, 'jong', scale * 0.5, new THREE.Vector3())
            : new THREE.Vector3(f1Normpos - 0.5, f2Normpos - 0.5, f3Normpos - 0.5).multiplyScalar(scale * 0.5);

        const yang = jungEntry?.yang ?? 0;
        const diph = jungEntry?.diphthong ?? 0;
        const choPos = JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.5];
        const f1Norm = (jungPos[0] - 250) / 600;
        const f1Boost = 0.55 + f1Norm * 0.4;

        starts.push(start);
        centers.push(cellCenter);
        chos.push(new THREE.Vector3(choPos[0], choPos[1], choPos[2]));
        ends.push(end);
        jungs.push(new THREE.Vector3(jungPos[0], jungPos[1], jungPos[2]));
        amps.push(sylSize3D * AMP_RATIO * f1Boost);
        yangseong.push(yang);
        diphthong.push(diph);
    }
    return {
        starts,
        centers,
        chos,
        ends,
        jungs,
        amps,
        yangseong,
        diphthong,
        confirmed,
        count: Math.min(sylItems.length, MAX_SYL),
        scale: glyphScale,
    };
}

// ── 음절의 한글 구조 배치 (6종) ───────────────────────────────────────────────
// 초성/중성/종성이 음절 네모 안에서 어떻게 나뉘는지의 6가지 꼴. signal이 셀 색을
// 칠할 영역을 나눌 때 쓰고(patternState), 채팅창이 음절마다 같은 이름의 SVG
// (public/imgs/<type>.svg)를 얹을 때도 쓴다 — **6종 이름 = SVG 파일명**이라
// 매핑 테이블이 없다. 새 이름을 추가하면 SVG도 같이 만들어야 한다.
//
//   vertical     종성✗ · 좌우결합(가 거 기)   초성 좌 + 중성 우(세로 모음)
//   horizontal   종성✗ · 상하결합(고 구 그)   초성 위 + 중성 아래(가로 모음)
//   per75        종성✗ · 섞임 모음(과 귀 긔)  초성 좌상 + 중성이 나머지를 감쌈
//   right_click  종성○ · 좌우결합(간)         초성/중성 상단 2칸 + 종성 하단
//   hamburger    종성○ · 상하결합(곤)         초성/중성/종성 3단
//   bed          종성○ · 섞임 모음(관)        초성 좌상 + 중성 우상·중단 + 종성 하단
//
// 2026-09-26: signal.js 안에 private이던 것을 여기로 옮김(채팅창이 같이 쓴다).
// 2026-10-28: 모음 F2(소리)·이중모음 여부로 가르던 것을 글자 모양 기준으로 바꿈 —
//   ㅓ가 상하결합, ㅡ가 좌우결합, ㅑㅕㅛㅠ가 섞임으로 잘못 나왔다.
export const PATTERN_TYPES = ['vertical', 'horizontal', 'per75', 'right_click', 'hamburger', 'bed'];

const VERTICAL_JUNG = new Set(['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅣ']);
const HORIZONTAL_JUNG = new Set(['ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ']);
// 나머지(ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ) = 섞임

export function getPatternType(jung, jong) {
    if (!jung) return 'vertical';
    const shape = VERTICAL_JUNG.has(jung) ? 0 : HORIZONTAL_JUNG.has(jung) ? 1 : 2;
    return (jong ? ['right_click', 'hamburger', 'bed'] : ['vertical', 'horizontal', 'per75'])[shape];
}

// ── 레이아웃 분기 ─────────────────────────────────────────────────────────────
// signal만 Shelf, 나머지는 Textbox. 수신자가 들고 있는 크기 값(sylSize 등)의
// fallback도 여기서 한 번에 정한다.
//
// main.js / output-main.js 의 reLayout 과 handleSubmit 이 **넷 다** 이걸 부른다.
// 예전에는 네 곳이 각자 분기를 들고 있었고, handleSubmit 두 곳만 분기를 빠뜨려
// 늘 calcTextboxLayout을 썼다 — signal에서 제출하면 lastY(=다음 줄 기준선,
// 캡처 높이)가 Shelf 실제 배치와 어긋나는 원인이었다.
// rect = {x, y, w, h} (뷰포트 px). 주면 글자를 그 사각형 안에만 배치한다 —
// 줄바꿈을 rect.w 기준으로 하고, 나온 uv를 다시 "뷰포트 기준 uv"로 되돌린다.
// **캔버스는 뷰포트 전체를 유지**하므로 receiver 내부(전부 window.innerWidth 기준으로
// 픽셀을 계산한다)를 하나도 안 건드리고 영역을 좁힐 수 있다.
//
// ⚠️ positions를 실제 배치에 쓰는 receiver에만 먹는다 — mycelium / dandelion / trail.
//    sora는 positions를 무시하고 내부 랜덤 위치를 쓰고, signal은 _draw()가 자기
//    PAD_X/PAD_Y로 뷰포트에 직접 shelf를 깐다. 그 둘은 별도 작업(PRD 3-A).
//
// refHeight — receiver가 들고 있으면 px 값(sylSize/wrapStep/wrapMargin)을 "뷰포트 높이가
//    refHeight일 때의 값"으로 보고 H/refHeight 배로 스케일한다. mycelium처럼 월드 상수
//    (캡슐 반경·혹·노이즈)가 셰이더에 박혀 있는 receiver는 sylSize/H 비율이 같아야
//    글자 모양이 같다 — 안 그러면 큰 화면(TD 1440)에서 글자가 작고 뭉툭해진다.
//    없으면 예전처럼 고정 px.
//
// glyphExtent — 음절 중심에서 글자 끝까지의 거리(sylSize 배수). receiver가 들고 있으면
//    ① positions를 "슬롯 왼쪽"이 아니라 "음절 중심"으로 돌려준다(글자가 박스 가장자리에서
//       ext만큼 안쪽에 오도록 밀어 넣음 — 가로 줄바꿈도 그 폭 기준).
//    ② rect가 있으면 줄 수 단계(FIT_LINES)로 맞춘다(번역기 입력창처럼). 단계 N의 크기 =
//       "rect.h에 딱 N줄이 들어가는 크기"(단 기본 크기보다 커지진 않음). 1줄 크기에 안 들어가면
//       2줄 크기로, 그래도 넘치면 3줄 크기로. 연속값이 아니라 단계인 건, 크기가 바뀔 때마다
//       receiver가 문장 전체를 다시 구워야 해서다.
//       3줄로도 넘치면 안전망으로 4줄, 5줄… 크기까지 내려간다(잘리지 않게). LLM 문장 길이를
//       제한해 두면 실제로는 3단계 안에서 끝난다.
//    lastY는 rect 로컬 px 그대로 — 호출부가 다음 줄 기준선으로만 쓴다.
//
// displayScale — receiver가 들고 있으면 sylSize/wrapStep/wrapMargin에 곱하되 glyphScale의
//    기준(refSyl)에는 안 곱한다. 그래서 모양은 기준 크기로 계산되고 셰이더가 통째로 키운다 —
//    굵기·혹·결까지 같은 비율로 커져 "같은 글자가 커진 것"이 된다(sylSize를 직접 올리면
//    월드 상수인 굵기는 그대로라 글자가 가늘어진다).
//
// opts.line — 한 줄 테이프(glyphmode scroll). 줄바꿈 없이 가로로 끝없이 늘어놓고 rect 세로
//    가운데에 둔다. 단계 축소는 안 한다(한 줄이 rect.h에 안 들어갈 때만 줄임). 결과의 scrollX =
//    마지막 음절 오른쪽 끝이 rect 오른쪽 끝에 오도록 테이프를 왼쪽으로 밀어야 하는 양(px, ≥0).
//    positions는 밀기 **전** 테이프 좌표 — 미는 건 receiver(scrollTo/scrollBase)가 한다.
//    rect와 glyphExtent가 둘 다 있어야 먹는다.
const FIT_LINES = 3;
const FIT_LINES_SAFETY = 12;
const LINE_TAPE_W = 1e6; // 한 줄 모드에서 "줄바꿈 안 함"을 대신하는 충분히 넓은 폭(px)

// 광학 배치용 음절 끝(동서남북) — receiver.pathBox가 잰 값을 기준 크기(refSyl)로 나눈 비율.
// 모양은 자모와 refSyl/H 비율로만 정해지므로 그걸로 캐시한다(타이핑마다 문장 전체를 다시 재지 않게).
// **치는 도중에 바뀌는 자모는 뺀다** — 받침(아→안, 안→아녀)과 겹모음 조합(오→와)으로 끝이 바뀌면 그 음절 중심이
// 움직이고, mycelium은 이미 놓인 글자가 움직이면 문장 전체를 다시 굽는다(관람객 입력이 수백 ms씩 멈췄다, 2026-11-09).
// 그래서 받침 없이, 겹모음은 조합의 첫 모음으로 잰다. 어차피 mycelium은 IME로 친 음절을 처음 모양(ㅗ)으로 키운다
const BOX_JUNG = { ㅘ: 'ㅗ', ㅙ: 'ㅗ', ㅚ: 'ㅗ', ㅝ: 'ㅜ', ㅞ: 'ㅜ', ㅟ: 'ㅜ', ㅢ: 'ㅡ' };
const _boxCache = new WeakMap(); // receiver → Map(key → {l, r, t, b})
function glyphBoxRatio(r, syl, refSyl) {
    let cache = _boxCache.get(r);
    if (!cache) _boxCache.set(r, (cache = new Map()));
    const H = window.innerHeight;
    const item = { ...syl, jung: BOX_JUNG[syl.jung] ?? syl.jung, jong: null };
    const key = `${item.cho}${item.jung}|${(refSyl / H).toFixed(5)}`;
    let box = cache.get(key);
    if (!box) {
        const project = r.screenToWorld ? (u, v) => r.screenToWorld(u, v) : null;
        const U = syllablesToUniforms([item], [[0.5, 0.5]], refSyl, r.layoutScale, project, 1);
        const px = r.pathBox({
            center: U.centers[0],
            cho: U.chos[0],
            jung: U.jungs[0],
            amp: U.amps[0],
            yang: U.yangseong[0],
            diph: U.diphthong[0],
            end: U.ends[0],
        });
        box = { l: px.l / refSyl, r: px.r / refSyl, t: px.t / refSyl, b: px.b / refSyl };
        cache.set(key, box);
    }
    return box;
}

export function layoutFor(rm, items, W, H, offsetY, rect = null, opts = {}) {
    const r = rm.current;
    const refH = r?.refHeight;
    const k = refH ? H / refH : 1;
    const ext = r?.glyphExtent;
    const ds = r?.displayScale ?? 1;
    const line = !!(opts.line && rect && ext);
    // stack(2026-10-07, glyphmode scroll) — 줄바꿈은 하되 크기는 줄이지 않고, 마지막 줄이 늘 rect 아래에
    // 오도록 위로 민다(채팅처럼 아래에서 쌓여 올라감). 테이프 좌표에서 0번 줄이 rect 맨 아랫줄이고
    // scrollY = (마지막 줄 번호) × 줄 높이 — receiver가 그만큼 위로 밀면 마지막 줄이 맨 아래에 온다.
    // ext 없는 receiver(signal/dandelion, 2026-10-08)도 scrollTo가 있으면 stack을 탄다 — 아래 !ext 분기
    const stack = !line && !!(opts.stack && rect && (ext || typeof r?.scrollTo === 'function'));
    const layoutFn = rm.name === 'signal' ? calcShelfLayout : calcTextboxLayout;
    const boxW = rect ? rect.w : W;
    const boxH = rect ? rect.h : H;

    // 크기 노브(applyKnob이 sylSize에 곱한 배율)는 ext가 있는 receiver(mycelium)에선 배치에 안 쓴다 —
    // 음절 중심은 노브 안 댄 크기로 놓고, 노브는 glyphScale로만 곱해 글자마다 **제자리(중심 기준)**에서
    // 커지고 작아지게 한다(2026-10-08). 예전엔 줄 간격·여백까지 같이 바뀌어 글자들이 rect 모서리 쪽으로 쏠렸다.
    const rawSyl = r?.sylSize ?? 55;
    const baseSize = ext ? (r?._ctlBase?.sylSize ?? rawSyl) : rawSyl;
    const knob = rawSyl / baseSize;

    // 광학 배치(mycelium, 2026-11-09) — 음절 중심 사이 고정 간격(wrapStep·lineHeightRatio) 대신 음절마다
    // 동서남북 끝(receiver.pathBox — 글자가 자라기 전에 경로로 잰다)으로 놓는다.
    //   가로: 다음 음절 중심 = 앞 음절 오른쪽 끝 + 간격 + 이 음절 왼쪽 끝. 줄 첫 음절은 왼쪽 끝이 rect 왼쪽에 붙는다
    //   세로: 다음 줄 중심 = 윗줄에서 가장 아래 끝 + 간격 + 정해 둔 위 끝(opticalTop). 다음 줄 글자들의 실제 위 끝을
    //         쓰지 않는 건 이미 놓인 글자를 안 움직이려고 — 움직이면 mycelium이 문장 전체를 다시 굽는다(깜박임)
    //   간격 = receiver.opticalGap / opticalLineGap(sylSize 배수) + 자간·행간 노브가 기본값에서 늘린 만큼
    // opts.optical === false(output ?optical=0)이면 예전 고정 간격
    const optical = !!(ext && r?.pathBox && opts.optical !== false);
    const opticalAt = (sylSize, z, wrapStep) => {
        const refSyl = baseSize * k; // pathBox를 잴 기준 크기(glyphScale 1)
        const sylList = items.filter(it => !it.isSpace);
        const boxes = sylList.map(it => {
            const b = glyphBoxRatio(r, it, refSyl);
            return { l: b.l * sylSize, r: b.r * sylSize, t: b.t * sylSize, b: b.b * sylSize };
        });
        const baseStep = (r._ctlBase?.wrapStep ?? r.wrapStep) * z;
        const baseLhr = r._ctlBase?.lineHeightRatio ?? r.lineHeightRatio;
        const gapX = (r.opticalGap ?? 0) * sylSize + (wrapStep - baseStep);
        const gapY = (r.opticalLineGap ?? 0) * sylSize + (r.lineHeightRatio - baseLhr) * sylSize;
        const nomTop = (r.opticalTop ?? 1) * sylSize;
        const spaceW = wrapStep * 0.2; // #띄어쓰기 — calcTextboxLayout과 같은 몫
        const innerW = line ? LINE_TAPE_W : boxW;
        const e = ext * sylSize;
        // 0번 줄 중심 — 고정 간격 때와 같은 자리(한 줄 = rect 가운데, stack = rect 아래에서 e 위, 그 외 = 위에서 e 아래)
        const y0 = line ? boxH / 2 : stack ? boxH - e : e + offsetY;
        const positions = [];
        const sylOut = [];
        let cur = { y: y0, t: 0, b: 0 };
        const lines = [cur];
        let x = null; // 지금 줄 마지막 음절의 오른쪽 끝(rect 로컬 px), null = 줄 처음
        let pend = 0; // 쌓인 띄어쓰기
        let j = 0;
        for (const it of items) {
            if (it.isSpace) {
                if (x !== null) pend += spaceW;
                continue;
            }
            const bx = boxes[j++];
            let cx = x === null ? bx.l : x + gapX + pend + bx.l;
            if (x !== null && cx + bx.r > innerW) {
                // 크기 노브는 글자를 중심에서 키우므로 세로 끝에만 곱한다(가로는 겹쳐도 그대로 — 고정 간격 때와 같다)
                cur = { y: cur.y + (cur.b + nomTop) * knob + gapY, t: 0, b: 0 };
                lines.push(cur);
                cx = bx.l;
            }
            pend = 0;
            positions.push([cx, cur.y]);
            sylOut.push(it);
            x = cx + bx.r;
            cur.t = Math.max(cur.t, bx.t);
            cur.b = Math.max(cur.b, bx.b);
        }
        const ox = rect ? rect.x : 0;
        const oy = rect ? rect.y : 0;
        const n = positions.length;
        const last = lines[lines.length - 1];
        const out = {
            positions: positions.map(([px, py]) => [(ox + px) / W, (oy + py) / H]),
            sylItems: sylOut,
            lastY: last.y,
        };
        const meta = { sylSize, lineHeightRatio: r.lineHeightRatio * knob, wrapStep };
        const bottom = n ? last.y + last.b * knob - offsetY : 0;
        if (stack) {
            const scrollY = n ? last.y - y0 : 0;
            // top: 다 민 뒤 화면에서 0번 줄 위 끝(말풍선 높이 fitBubble용) — 아직 글자가 없으면 기준 크기 e
            const top0 = (lines[0].t || e) * knob;
            const lineH = lines.length > 1 ? (last.y - y0) / (lines.length - 1) : sylSize * r.lineHeightRatio;
            return { ...out, ...meta, bottom, scrollY, lines: lines.length, lineH, extent: (e * (1 + knob)) / 2, top: oy + y0 - top0 - scrollY };
        }
        return { ...out, ...meta, bottom, scrollX: n ? Math.max(0, x - boxW) : 0 };
    };

    // 행간만은 예전처럼 노브를 따른다 — 글자가 작아지면 줄도 같이 붙는다. 가로(자간·왼쪽 여백)는 그대로라
    // 줄마다 왼쪽 정렬이 유지되고, 글자는 각자 중심에서 커지고 작아진다
    const layoutAt = scale => {
        const z = scale * ds;
        const sylSize = baseSize * z;
        const lineHeightRatio = (r?.lineHeightRatio ?? 1.3) * knob;
        const wrapStep = (r?.wrapStep ?? baseSize * 2) * z;
        const wrapMargin = (r?.wrapMargin ?? baseSize) * z;
        const meta = { sylSize, lineHeightRatio, wrapStep, wrapMargin };
        // signal(calcShelfLayout)은 음절이 붙어 있는 게 기본이라 wrapStep을 보폭으로 못 쓴다 —
        // 자간 노브가 기본값에서 늘린/줄인 만큼만 음절 사이 간격으로 준다(노브 가운데 = 0)
        // receiver.minSpacing(배율)이 있으면 그 아래로는 안 좁힌다(signal 0.96 — 더 겹치면 형태가 무너짐)
        const baseStep = r?._ctlBase?.wrapStep ?? r?.wrapStep ?? 0;
        const step = Math.max(r?.wrapStep ?? 0, baseStep * (r?.minSpacing ?? 0));
        const letterGap = (step - baseStep) * z;

        if (!ext) {
            const out = layoutFn(items, sylSize, boxW, boxH, lineHeightRatio, offsetY, wrapStep, wrapMargin, letterGap);
            // stack — 크기는 그대로, 첫 줄을 rect 맨 아래(padBottom 여백)로 내리고 scrollY = 첫 줄 → 마지막 줄 거리.
            // 줄 높이가 음절마다 다른 signal도 되도록 줄 번호가 아니라 실제 위치 차로 잰다
            const dy = stack ? boxH - out.padBottom - out.firstY : 0;
            if (rect) {
                out.positions = out.positions.map(([u, v]) => [
                    (rect.x + u * rect.w) / W,
                    (rect.y + v * rect.h + dy) / H,
                ]);
            }
            if (stack) {
                const scrollY = out.sylItems.length ? Math.max(0, out.lastY - out.firstY) : 0;
                // top: 다 민 뒤 화면에서 첫 줄 위끝(말풍선 높이 fitBubble용)
                return { ...out, ...meta, bottom: 0, scrollY, top: rect.y + dy + out.topY - scrollY };
            }
            return { ...out, ...meta, bottom: 0 };
        }

        if (optical) return opticalAt(sylSize, z, wrapStep);

        // calcTextboxLayout의 첫 슬롯(PAD_X, PAD_Y+sylSize)을 (e, e)로 옮기는 이동량.
        // 폭을 boxW-2dx로 줘야 오른쪽 끝 음절도 boxW-e 안에 들어온다.
        const e = ext * sylSize;
        const dx = e - sylSize * 0.5;
        // 한 줄 모드는 줄 중심을 rect 세로 가운데로, stack은 0번 줄을 rect 맨 아래로
        const dy = (line ? boxH / 2 : stack ? boxH - e : e) - (40 + sylSize);
        const innerW = line ? LINE_TAPE_W : boxW - 2 * dx;
        const out = layoutFn(items, sylSize, innerW, boxH, lineHeightRatio, offsetY, wrapStep, wrapMargin);
        const ox = rect ? rect.x : 0;
        const oy = rect ? rect.y : 0;
        const n = out.positions.length;
        const lastX = n ? out.positions[n - 1][0] * innerW + dx : 0; // 마지막 음절 중심(rect 로컬 px)
        const scrollX = n ? Math.max(0, lastX + e - boxW) : 0;
        out.positions = out.positions.map(([u, v]) => [(ox + u * innerW + dx) / W, (oy + v * boxH + dy) / H]);
        const lineH = sylSize * lineHeightRatio;
        // stack: 마지막 줄 번호(0부터). 빈 문장이면 0 — lastY는 비어도 첫 줄 자리를 준다
        const lastLine = stack && n ? Math.round((out.lastY - (40 + sylSize + offsetY)) / lineH) : 0;
        out.lastY += dy;
        const bottom = out.sylItems.length ? out.lastY + e - offsetY : 0;
        // extent: 말풍선 높이(fitBubble)용 — 맨 아랫줄 중심은 기준 크기 e 자리, 맨 윗줄 글자 위끝은 노브만큼 커진 e
        if (stack)
            return { ...out, ...meta, bottom, scrollY: lastLine * lineH, lines: lastLine + 1, lineH, extent: (e * (1 + knob)) / 2 };
        return { ...out, ...meta, bottom, scrollX };
    };

    // glyphScale — 이 배치의 sylSize가 "기준 크기"(노브 안 댄 receiver 기본값 × H/refHeight)의
    // 몇 배인가. mycelium은 모양을 기준 크기로 계산하고 셰이더에서 이 배율로 통째로 줄인다 —
    // 단계 축소·크기 노브로 작아져도 굵기가 같은 비율로 줄어 "같은 글자가 작아진 것"으로 보인다.
    const refSyl = (r?._ctlBase?.sylSize ?? r?.sylSize ?? 55) * k;
    const finish = (res, fitLines) => {
        delete res.bottom;
        // sylSize도 노브를 곱해 돌려준다 — 페이지의 음절 네모가 커진 글자 아래 끝을 따라가게
        return { ...res, fitLines, sylSize: res.sylSize * knob, glyphScale: (res.sylSize / refSyl) * knob };
    };

    if (!(rect && ext)) return finish(layoutAt(k), 0);
    // N줄 높이 = 2e + (N-1)·lineH = sylSize·(2·ext + (N-1)·lineHeightRatio)
    const lhr = (r?.lineHeightRatio ?? 1.3) * knob;
    const baseSyl = baseSize * k * ds;
    if (line || stack) return finish(layoutAt(k * Math.min(1, boxH / (baseSyl * 2 * ext))), 1);
    let res;
    for (let n = 1; n <= FIT_LINES_SAFETY; n++) {
        const s = Math.min(1, boxH / (baseSyl * (2 * ext + (n - 1) * lhr)));
        res = layoutAt(k * s);
        res.fitLines = n;
        if (res.bottom <= boxH + 0.5) break;
    }
    return finish(res, res.fitLines);
}

// ── page 모드: 음절 size개씩 끊기 ─────────────────────────────────────────────
// output 페이지의 글자 표시 모드는 둘이다(glyphmode):
//   step — 문장 전체를 한 화면에, 넘치면 layoutFor가 1~3줄 단계로 축소(기본)
//   page — 음절 size개씩 끊어서 한 페이지씩(12자면 5·5·2). 채팅창엔 문장 그대로 이어짐
//   scroll — 한 줄 테이프, 넘치면 왼쪽으로 흘러감(layoutFor opts.line + receiver.scrollTo)
// 페이지 경계는 (size+1)번째 음절이 들어오는 순간. 페이지 첫머리의 공백은 버린다.
export function paginate(items, size) {
    const pages = [[]];
    let n = 0;
    for (const it of items) {
        if (!it.isSpace && n === size) {
            pages.push([]);
            n = 0;
        }
        const page = pages[pages.length - 1];
        if (it.isSpace && page.length === 0) continue;
        page.push(it);
        if (!it.isSpace) n++;
    }
    return pages;
}

// 제출(submit) 3단 계약(flushQueue/captureFrame/clearAccum)을 구현한 수신자인가.
// 이름 목록 대신 계약으로 판단한다 — 수신자를 추가/교체할 때 이 분기를 같이
// 고쳐야 하는 걸 잊어서 제출이 조용히 안 되는 사고가 반복됐다.
// (2026-09-26 현재: 4종 전부 ○)
export function canSubmit(receiver) {
    return !!(receiver?.flushQueue && receiver?.captureFrame && receiver?.clearAccum);
}

// ── 수신자별 update 분기 ──────────────────────────────────────────────────────
// glyphScale: layoutFor 결과. mycelium만 쓴다 — 모양은 sylSize/glyphScale(기준 크기)로 만들고
// 셰이더가 glyphScale로 균일 축소. 다른 receiver는 예전처럼 sylSize 그대로.
export function dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights, glyphScale = 1) {
    if (!sylItems.length) return;
    const layoutScale = rm.current?.layoutScale ?? { x: 1, y: 1 };
    if (rm.name === 'mycelium') {
        const project = rm.current?.screenToWorld ? (u, v) => rm.current.screenToWorld(u, v) : null;
        const gs = project ? glyphScale : 1; // 역투영(project) 없는 예전 경로는 균일 스케일 안 씀
        rm.update(
            syllablesToUniforms(sylItems, positions, sylSize / gs, layoutScale, project, gs),
            sylItems.length,
            sylItems,
        );
    } else if (rm.name === 'sora') {
        rm.update(sylItems, positions, JAMO);
    } else if (rm.name === 'signal') {
        rm.update(sylItems, positions, JAMO, sylSize, widths, heights);
    } else if (rm.name === 'dandelion') {
        rm.update(sylItems, positions, JAMO);
    }
}
