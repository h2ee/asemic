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

/**
 * @param panel  채팅창 컨테이너 (#chat-panel)
 * @param toast  토스트 컨테이너 (#toast) — .icon / .label 자식을 가진다
 */
export function buildChat({ panel, toast }) {
    const icon = toast.querySelector('.icon');
    const label = toast.querySelector('.label');

    return {
        // 한 발화가 끝났을 때 채팅창에 남긴다.
        addTurn(speaker, items) {
            if (!items?.length) return;
            panel.appendChild(renderBubble(speaker, items));
            while (panel.children.length > MAX_TURNS) panel.removeChild(panel.firstChild);
        },

        // speaker: 'visitor' | 'receiver' | null(아무도 말하지 않는 중 → 숨김)
        // receiverName은 speaker==='receiver'일 때 아이콘을 고르는 데 쓴다.
        setTalking(speaker, receiverName) {
            if (!speaker) {
                toast.hidden = true;
                return;
            }
            toast.hidden = false;
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
        },

        clear() {
            panel.replaceChildren();
            toast.hidden = true;
        },
    };
}
