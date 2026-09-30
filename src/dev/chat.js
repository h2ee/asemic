// ── chat.js — 오른쪽 채팅 기록 + 하단 토스트 ──────────────────────────────────
//
// 화면에서 이 둘이 맡는 역할 (PRD 2장):
//   채팅창  지나간 발화가 쌓이는 곳. 들어가는 건 아세믹 그래픽도 원문도 아니고,
//           음절마다 "한글 구조 배치" 6종(core.js getPatternType) 중 하나의 SVG다.
//           읽을 수는 없지만 무슨 구조의 글자였는지는 남는 — 판독과 비판독 사이의 기록.
//   토스트  지금 누가 말하는 중인지. 글자 영역엔 한 화자·한 문장만 뜨고 화자 표시가
//           전혀 없으므로, 이게 유일한 단서다.
//
// 화자: **흰 말풍선 = 수신자(receiver) / 남색 = 관람객(visitor)**.
//
// 6종 이름이 그대로 SVG 파일명이다(public/imgs/<type>.svg) — 매핑 테이블이 없다.
// core.js에 타입을 추가하면 SVG도 같이 만들어야 한다.
//
// SVG는 단색(#A2DDFF)이라 <img>로 얹으면 색을 못 바꾼다. 말풍선마다 블록 색이
// 다르므로(흰 말풍선 위 #A2DDFF / 남색 말풍선 위 #E8FAFF) CSS mask로 실루엣만
// 가져오고 색은 background-color(--blk)로 칠한다.

import { getPatternType } from '../js/core.js';
import { asset } from './assets.js';

// 넘으면 오래된 것부터 버린다. 패널은 아래 정렬이라 넘친 것은 위로 밀려 잘리는데,
// 안 보이는 DOM이 무한히 쌓이는 것만 막는 값이라 눈에 보이는 개수보다 넉넉하면 된다.
const MAX_TURNS = 24;

// 수신자 아이콘(흰색+알파 PNG). 토스트에서 mask로 써서 남색으로 칠한다.
// 명시적 import — vite가 빌드에서도 해시 URL로 바꿔준다.
import soraIcon from './chrome/img/sora.png';
import signalIcon from './chrome/img/signal.png';
import dandelionIcon from './chrome/img/dandelion.png';
import myceliumIcon from './chrome/img/mycelium.png';

const ICONS = {
    sora: soraIcon,
    signal: signalIcon,
    dandelion: dandelionIcon,
    mycelium: myceliumIcon,
};
// dandelion의 궤적 엔진을 떼어낸 실험용 receiver — 아이콘은 dandelion 것을 같이 쓴다.
ICONS.trail = dandelionIcon;

// items: decomposeSyllables() 결과 그대로(띄어쓰기 항목 포함).
// 띄어쓰기를 살리려면 sylItems(공백 제외)가 아니라 이쪽을 넘겨야 한다.
function renderBubble(speaker, items) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${speaker === 'receiver' ? 'from-receiver' : 'from-visitor'}`;

    for (const item of items) {
        if (item.isSpace) {
            const gap = document.createElement('span');
            gap.className = 'word-gap';
            bubble.appendChild(gap);
            continue;
        }
        const syl = document.createElement('span');
        syl.className = 'syl';
        const type = getPatternType(item.jung, item.jong);
        syl.style.setProperty('--svg', `url('${asset(`imgs/${type}.svg`)}')`);
        bubble.appendChild(syl);
    }
    return bubble;
}

// ── 애니메이션 ──────────────────────────────────────────────────────────────
// Figma에서 받은 키프레임(toast-reveal / toast-slide)을 WAAPI로 옮긴 것.
// CSS @keyframes 대신 JS인 이유: 퇴장 애니가 끝난 뒤 hidden을 걸어야 하고,
// 퇴장 도중 다시 말하기 시작하면 끊고 되돌려야 해서.
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const TOAST_REVEAL = [
    { opacity: 0.4, clipPath: 'inset(0 100% 0 0 round 999px)', transform: 'translateX(-24px)' },
    { opacity: 1, clipPath: 'inset(0 0 0 0 round 999px)', transform: 'translateX(0)' },
];
const TOAST_IN_MS = 520;
const TOAST_OUT_MS = 280;

const BUBBLE_IN_MS = 480;
const BUBBLE_OUT_MS = 360;

/**
 * @param panel  채팅창 컨테이너 (#chat-panel)
 * @param toast  토스트 컨테이너 (#toast) — .icon / .label 자식을 가진다
 */
export function buildChat({ panel, toast }) {
    const icon = toast.querySelector('.icon');
    const label = toast.querySelector('.label');

    // 말풍선은 .chat-stack 안에 쌓는다. clear 때는 묶음째 퇴장시키고 새 묶음으로 갈아끼운다.
    let stack = document.createElement('div');
    stack.className = 'chat-stack';
    panel.replaceChildren(stack);

    // 토스트 상태 — 매 키 입력마다 setTalking이 불리므로 "바뀔 때"만 애니메이션한다.
    let shownKey = null; // 지금 보이는 화자('visitor' | 'receiver:<name>'), 숨김이면 null
    let toastAnim = null;

    function showToast(key) {
        if (key === shownKey) return;
        shownKey = key;
        toastAnim?.cancel();
        toast.hidden = false;
        // 화자가 바뀌어도 새로 등장한다 — 누가 말하는지 바뀐 게 유일한 단서라서.
        toastAnim = toast.animate(TOAST_REVEAL, { duration: TOAST_IN_MS, easing: EASE_OUT });
    }

    function hideToast() {
        if (shownKey === null) return;
        shownKey = null;
        toastAnim?.cancel();
        // reveal을 거꾸로 — 오른쪽에서 왼쪽으로 접히며 사라진다.
        toastAnim = toast.animate(TOAST_REVEAL, {
            duration: TOAST_OUT_MS,
            easing: 'ease-in',
            direction: 'reverse',
            fill: 'forwards',
        });
        const a = toastAnim;
        a.onfinish = () => {
            if (toastAnim !== a) return; // 그 사이 다시 등장했으면 건드리지 않는다
            toast.hidden = true;
            a.cancel(); // fill:forwards 풀기 — 다음 등장이 깨끗한 상태에서 시작하도록
            toastAnim = null;
        };
    }

    return {
        // 한 발화가 끝났을 때 채팅창에 남긴다.
        // 새 말풍선이 아래에 붙으며 묶음 전체가 그 높이만큼 위로 미끄러진다(FLIP) —
        // 새 말풍선은 패널 아래 경계 밖에서 올라오며 나타난다.
        addTurn(speaker, items) {
            if (!items?.length) return;
            const before = stack.offsetHeight;
            const bubble = renderBubble(speaker, items);
            stack.appendChild(bubble);
            while (stack.children.length > MAX_TURNS) stack.removeChild(stack.firstChild);
            const dy = stack.offsetHeight - before;

            stack.getAnimations().forEach(a => a.finish());
            stack.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
                duration: BUBBLE_IN_MS,
                easing: EASE_OUT,
            });
            bubble.animate([{ opacity: 0 }, { opacity: 1 }], { duration: BUBBLE_IN_MS, easing: EASE_OUT });
        },

        // speaker: 'visitor' | 'receiver' | null(아무도 말하지 않는 중 → 숨김)
        // receiverName은 speaker==='receiver'일 때 아이콘을 고르는 데 쓴다.
        setTalking(speaker, receiverName) {
            if (!speaker) {
                hideToast();
                return;
            }
            if (speaker === 'receiver') {
                const url = ICONS[receiverName];
                icon.hidden = !url;
                if (url) icon.style.setProperty('--svg', `url('${url}')`);
                label.textContent = 'is talking ...';
            } else {
                // 관람객에겐 프로필 아이콘이 없다(웹캠은 TD가 크롬 안에 그린다).
                // 아이콘 자리를 비우고 문구로만 구분한다.
                icon.hidden = true;
                label.textContent = 'you are talking ...';
            }
            showToast(speaker === 'receiver' ? `receiver:${receiverName}` : 'visitor');
        },

        // 기록 전체 퇴장 — 묶음째 위로 밀리며 흐려진다. 도중에 새 발화가 와도 새 묶음에 붙는다.
        clear() {
            hideToast();
            const old = stack;
            stack = document.createElement('div');
            stack.className = 'chat-stack';
            panel.appendChild(stack);
            if (!old.children.length) {
                old.remove();
                return;
            }
            old.getAnimations().forEach(a => a.finish());
            old.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-48px)' }], {
                duration: BUBBLE_OUT_MS,
                easing: 'ease-in',
                fill: 'forwards',
            }).onfinish = () => old.remove();
        },
    };
}
