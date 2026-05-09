// ── main.js ───────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadJamo } from './jamo_loader.js';
import { ReceiverManager } from './receivers/ReceiverManager.js';

const JAMO = await loadJamo();

// prettier-ignore
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// prettier-ignore
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// prettier-ignore
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// ── 음절 분해 — wordId 태깅 포함 ──────────────────────────────────────────────
// 공백으로 단어를 구분해서 각 음절에 wordId를 붙임
// 반환: [{ cho, jung, jong, wordId }, ...]
function decomposeSyllables(text) {
    const result = [];
    let wordId = 0;
    for (const ch of text) {
        if (ch === ' ') {
            wordId++;
            continue;
        }
        const code = ch.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) {
            const offset = code - 0xac00;
            result.push({
                cho:    CHO[Math.floor(offset / (21 * 28))],
                jung:   JUNG[Math.floor((offset % (21 * 28)) / 28)],
                jong:   JONG[offset % 28] || null,
                wordId,
            });
        }
    }
    return result;
}

// ── 자모 pos → 3D 좌표 ────────────────────────────────────────────────────────
function jamoToVec3(key, type, scale, offset = new THREE.Vector3()) {
    let rawPos;
    if (type === 'jong') {
        const entry = JAMO[key + '_jong'];
        rawPos = entry?.pos ??
            (entry?.cluster_front ? JAMO[entry.cluster_front + '_jong']?.pos : null)
            ?? [0.5, 0.5, 0.5];
    } else {
        rawPos = JAMO[key]?.cho?.pos ?? [0.5, 0.5, 0.5];
    }
    return new THREE.Vector3(
        (rawPos[0] - 0.5) * scale * 2,
        (rawPos[1] - 0.5) * scale * 2,
        (rawPos[2] - 0.5) * scale * 2,
    ).add(offset);
}

// ── 음절 → alien uniform 데이터 ───────────────────────────────────────────────
const MAX = 8;

function syllablesToUniforms(syllables) {
    const spacing = 0.4;
    const totalW  = (syllables.length - 1) * spacing;
    const starts = [], chos = [], ends = [], jungs = [];
    const amps = [], yangseong = [], diphthong = [];

    for (let i = 0; i < MAX; i++) {
        const syl = syllables[i];
        if (!syl) {
            starts.push(new THREE.Vector3());
            chos.push(new THREE.Vector3());
            ends.push(new THREE.Vector3());
            jungs.push(new THREE.Vector3());
            amps.push(0); yangseong.push(0); diphthong.push(0);
            continue;
        }
        const offsetX = -totalW / 2 + i * spacing;
        const offset  = new THREE.Vector3(offsetX, 0, 0);
        const scale   = 0.2;
        const start   = jamoToVec3(syl.cho,  'cho',  scale, offset);
        const end     = syl.jong ? jamoToVec3(syl.jong, 'jong', scale, offset) : start.clone();
        const jungEntry = JAMO[syl.jung];
        const jungPos   = jungEntry?.pos ?? [500, 1000, 2000];
        const yang      = jungEntry?.yang ?? 0;
        const diph      = jungEntry?.diphthong ?? 0;
        const choPos    = JAMO[syl.cho]?.cho?.pos ?? [0.5, 0.5, 0.5];
        starts.push(start);
        chos.push(new THREE.Vector3(choPos[0], choPos[1], choPos[2]));
        ends.push(end);
        jungs.push(new THREE.Vector3(jungPos[0], jungPos[1], jungPos[2]));
        amps.push(jungPos[0] * 0.001 + 0.005);
        yangseong.push(yang);
        diphthong.push(diph);
    }
    return { starts, chos, ends, jungs, amps, yangseong, diphthong,
             count: Math.min(syllables.length, MAX) };
}

// ── 수신자 선택 UI ────────────────────────────────────────────────────────────
function buildReceiverUI(rm, getSyllables) {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
        position: 'fixed', top: '65px', left: '50%',
        transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: '20',
    });
    const receivers = [{ id: 'alien', label: '👾' }, { id: 'sora', label: '🐚' }];
    for (const { id, label } of receivers) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.dataset.id  = id;
        Object.assign(btn.style, {
            padding: '6px 12px', fontSize: '14px',
            background: id === rm.name ? '#edeafe' : '#222',
            color: '#fff', border: '0.25px solid #555',
            borderRadius: '8px', cursor: 'pointer',
        });
        btn.addEventListener('click', async () => {
            await rm.setReceiver(id);
            dispatchToReceiver(rm, getSyllables());
            bar.querySelectorAll('button').forEach(b => {
                b.style.background = b.dataset.id === rm.name ? '#edeafe' : '#222';
            });
        });
        bar.appendChild(btn);
    }
    document.body.appendChild(bar);
}

// ── 수신자별 update 분기 ──────────────────────────────────────────────────────
function dispatchToReceiver(rm, syllables) {
    if (!syllables.length) return;
    if (rm.name === 'alien') {
        rm.update(syllablesToUniforms(syllables));
    } else if (rm.name === 'sora') {
        // wordId가 태깅된 syllables를 그대로 전달
        rm.update(syllables, JAMO);
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function Init() {
    const params       = new URLSearchParams(location.search);
    const initReceiver = params.get('receiver') ?? 'alien';

    const rm = new ReceiverManager();
    await rm.setReceiver(initReceiver);

    const input = document.createElement('input');
    input.type  = 'text';
    Object.assign(input.style, {
        position: 'fixed', top: '20px', left: '50%',
        transform: 'translateX(-50%)', width: '400px',
        fontSize: '18px', padding: '8px 12px',
        background: '#111', color: '#fff',
        border: '1px solid #555', borderRadius: '4px', zIndex: '10',
    });
    document.body.appendChild(input);

    let _syllables = [];
    const getSyllables = () => _syllables;
    buildReceiverUI(rm, getSyllables);

    input.addEventListener('input', () => {
        _syllables = decomposeSyllables(input.value);
        dispatchToReceiver(rm, _syllables);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Init);
} else {
    Init();
}
