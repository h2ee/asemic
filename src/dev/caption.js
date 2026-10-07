// ── caption.js — 글자 밑 작은 상자 (2026-10-07) ────────────────────────────────
//
// 노란 입력 바를 대신한다. 화자에 따라 다르다:
//   관람객  음절마다 작은 네모 하나씩, 그 음절의 가운데 아래에 붙는다(Figma Frame 139).
//           흰 바탕 검은 테두리 안에 그 음절 원문. 위치는 페이지가 매 프레임 넘긴다 — mycelium
//           테이프가 흐르면 같이 흐른다.
//   수신자  같은 네모가 음절마다 붙되, 안에 원문 대신 그 음절의 "한글 구조 배치" 블록
//           (public/imgs/<type>.svg). 원문은 끝까지 안 보인다. (2026-10-08 — 그 전엔 문장 전체를
//           블록으로 이은 상자 하나(Figma Frame 171, #caption)였다. receiver()는 그 기록으로 남겨 둠)

import { getPatternType } from '../js/core.js';
import { asset } from './assets.js';

/**
 * @param struct  수신자 구조 블록 상자 (#caption, 안에 .cap-struct)
 * @param tags    관람객 음절 네모들을 담는 화면 전체 레이어 (#syl-tags)
 */
const LATIN_MAX = 64; // 영문 상자에 보이는 최대 글자 수
// 수신자 음절 네모(구조 블록)는 뜬 지 이만큼 뒤 사라진다(2026-10-08). 네모 내용이 바뀌면(sora 단어에 음절이
// 붙으면) 다시 센다. 관람객 네모는 안 사라진다. 흐려지는 시간은 output.html #syl-tags .tag.gone
const RECEIVER_TAG_MS = 3000;

export function buildCaption({ struct, tags }) {
    const structBox = struct.querySelector('.cap-struct');
    const latinBox = struct.querySelector('.cap-latin');
    let shown = 0; // structBox에 그려 둔 항목 수 — 늘어난 만큼만 붙인다(새 블록만 등장 애니)

    function hideStruct() {
        struct.dataset.mode = '';
        structBox.replaceChildren();
        shown = 0;
    }
    function hideTags() {
        tags.replaceChildren();
    }

    return {
        hide() {
            hideStruct();
            hideTags();
        },
        // 음절 네모 — list: [{ ch | type | types, x, y }] 화면 px(네모 위쪽 가운데가 붙을 자리).
        // ch = 관람객(원문 한 음절, sora는 한 단어) / type = 수신자(구조 블록, getPatternType 값) /
        // types = 수신자 한 단어의 블록들을 한 네모에 이어서(sora)
        tags(list) {
            if (struct.dataset.mode === 'receiver') hideStruct(); // 영문 상자(latin)는 건드리지 않는다
            const els = tags.children;
            while (els.length > list.length) els[els.length - 1].remove();
            const now = performance.now();
            list.forEach(({ ch, type, types, x, y }, i) => {
                if (type) types = [type];
                let el = els[i];
                if (!el) {
                    el = document.createElement('span');
                    el.className = 'tag';
                    tags.appendChild(el);
                }
                const key = types ? `#${types.join(',')}` : ch;
                if (el.dataset.key !== key) {
                    el.dataset.key = key;
                    el.dataset.born = now;
                    if (types) {
                        el.replaceChildren(
                            ...types.map(t => {
                                const blk = document.createElement('span');
                                blk.className = 'blk';
                                blk.style.setProperty('--svg', `url('${asset(`imgs/${t}.svg`)}')`);
                                return blk;
                            }),
                        );
                    } else {
                        el.textContent = ch;
                    }
                }
                el.classList.toggle('gone', !!types && now - el.dataset.born > RECEIVER_TAG_MS);
                el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateX(-50%)`;
            });
        },
        // 영문 입력(fallback) — 친 그대로 한 상자에. busy = 한국어로 옮기는 중(테두리가 숨쉰다).
        // 빈 문자열이면 닫는다. 옮긴 한국어가 흘러들기 시작하면 페이지가 닫는다
        latin(text, { busy = false } = {}) {
            if (!text) {
                if (struct.dataset.mode === 'latin') struct.dataset.mode = '';
                latinBox.classList.remove('busy');
                return;
            }
            if (struct.dataset.mode === 'receiver') hideStruct();
            struct.dataset.mode = 'latin';
            // 길면 앞을 잘라 지금 치는 끝이 보이게
            latinBox.textContent = text.length > LATIN_MAX ? `…${text.slice(-LATIN_MAX)}` : text;
            latinBox.classList.toggle('busy', busy);
        },
        // 수신자 — items: decomposeSyllables() 결과(띄어쓰기 포함)
        receiver(items) {
            hideTags();
            if (!items.some(it => !it.isSpace)) return hideStruct();
            if (struct.dataset.mode !== 'receiver' || items.length < shown) hideStruct();
            struct.dataset.mode = 'receiver';
            for (let i = shown; i < items.length; i++) {
                const it = items[i];
                const el = document.createElement('span');
                if (it.isSpace) {
                    el.className = 'gap';
                } else {
                    el.className = 'blk';
                    el.style.setProperty('--svg', `url('${asset(`imgs/${getPatternType(it.jung, it.jong)}.svg`)}')`);
                    el.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
                        duration: 260,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    });
                }
                structBox.appendChild(el);
            }
            shown = items.length;
        },
    };
}
