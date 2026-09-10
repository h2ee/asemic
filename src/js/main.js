// ── main.js ───────────────────────────────────────────────────────────────────
// 순수 로직(음절 분해, 레이아웃 계산, uniform 변환, receiver dispatch)은
// core.js로 옮김 — dev 페이지(dev/translator, dev/analyzer)와 공유하기 위함.
// 이 파일엔 전시용 페이지의 DOM/UI 구성(buildUI, buildInput, buildHistory, Init)만 남음.
import { ReceiverManager } from './receivers/ReceiverManager.js';
import { MAX_SYL, decomposeSyllables, calcTextboxLayout, calcShelfLayout, dispatchToReceiver } from './core.js';

// ── 제출된 줄 히스토리 (캡처 이미지 누적) ────────────────────────────────────
function buildHistory() {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        pointerEvents: 'none',
        zIndex: '5',
        display: 'flex',
        flexDirection: 'column',
    });
    document.body.appendChild(wrap);

    let totalH = 0;
    return {
        addCapture(dataUrl, heightPx) {
            const img = document.createElement('img');
            img.src = dataUrl;
            Object.assign(img.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                display: 'block',
                pointerEvents: 'none',
                zIndex: String(6 + totalH),
            });
            wrap.appendChild(img);
            totalH += heightPx;
            return totalH;
        },
        get totalHeight() {
            return totalH;
        },
    };
}

// ── UI (수신자 선택) ──────────────────────────────────────────────────────────
function buildUI(rm, reLayout, getAllItems) {
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: '20',
        background: 'rgba(0,0,0,0.15)',
        padding: '8px 14px',
        borderRadius: '10px',
        outline: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(6px)',
    });

    for (const { id, label } of [
        { id: 'sora', label: '🐚' },
        { id: 'signal', label: '🚦' },
        { id: 'dandelion', label: '🌼' },
        { id: 'mycelium', label: '🍄' },
    ]) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.dataset.id = id;
        Object.assign(btn.style, {
            padding: '4px 10px',
            fontSize: '16px',
            background: id === rm.name ? '#d0daff' : 'transparent',
            color: '#fff',
            border: '1px solid #777',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.2s',
        });
        btn.addEventListener('click', async () => {
            await rm.setReceiver(id);
            reLayout(getAllItems());
            container.querySelectorAll('button[data-id]').forEach(b => {
                b.style.background = b.dataset.id === rm.name ? '#d0daff' : 'transparent';
            });
        });
        container.appendChild(btn);
    }

    document.body.appendChild(container);
}

// ── 입력창 + 제출 버튼 ────────────────────────────────────────────────────────
function buildInput(onInput, onSubmit) {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: '20',
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '한글을 입력하세요';
    Object.assign(input.style, {
        width: 'min(420px, 70vw)',
        fontSize: '17px',
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.25)',
        color: '#000000',
        border: '1px solid #777',
        borderRadius: '8px',
        backdropFilter: 'blur(6px)', // #background blur
        outline: 'none',
    });

    const btn = document.createElement('button');
    btn.textContent = 'bake';
    Object.assign(btn.style, {
        padding: '10px 18px',
        fontSize: '15px',
        background: '#abcdff',
        color: '#456dff',
        border: '1px solid #8fa7ff',
        borderRadius: '8px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    });

    const doSubmit = () => {
        if (!input.value.trim()) return;
        onSubmit(input.value.trim());
        input.value = '';
        onInput('');
    };

    input.addEventListener('input', () => {
        let sylCount = 0,
            cutIdx = input.value.length;
        for (let i = 0; i < input.value.length; i++) {
            const ch = input.value[i];
            if (ch === ' ') continue;
            const code = ch.charCodeAt(0);
            if (code >= 0xac00 && code <= 0xd7a3) sylCount++;
            if (sylCount > MAX_SYL) {
                cutIdx = i;
                break;
            }
        }
        if (sylCount > MAX_SYL) input.value = input.value.slice(0, cutIdx);
        onInput(input.value);
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSubmit();
    });
    btn.addEventListener('click', doSubmit);

    wrap.appendChild(input);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    return input;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function Init() {
    const params = new URLSearchParams(location.search);
    const initReceiver = params.get('receiver') ?? 'mycelium';

    const rm = new ReceiverManager();
    await rm.setReceiver(initReceiver);
    window.rm = rm; // 콘솔 디버깅용 — 예: rm.current.setD3Displace(true)

    const history = buildHistory();

    // sylSize: 수신자별로 receiver.sylSize 에서 읽음 (기본값 55)
    let _sylItems = [];
    let _positions = [];
    let _allItems = [];
    let _submitOffsetY = 0; // 제출된 줄 누적 높이(px) — 새 줄 기준선
    let _prevSpaceCount = 0; // 띄어쓰기 개수 — 늘어나면 현재 자라는 음절을 즉시 완성

    function reLayout(items) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const sylSize = rm.current?.sylSize ?? 55;
        const lineHeightRatio = rm.current?.lineHeightRatio ?? 1.3;
        const wrapStep = rm.current?.wrapStep ?? sylSize * 2;
        const wrapMargin = rm.current?.wrapMargin ?? sylSize;
        const layoutFn = rm.name === 'signal' ? calcShelfLayout : calcTextboxLayout;
        const { positions, sylItems, widths, heights } = layoutFn(
            items,
            sylSize,
            W,
            H,
            lineHeightRatio,
            _submitOffsetY,
            wrapStep,
            wrapMargin,
        );
        _sylItems = sylItems;
        _positions = positions;
        if (sylItems.length > 0) {
            dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights);
        }
    }

    async function handleSubmit() {
        // mycelium + dandelion: 둘 다 flushQueue/captureFrame/clearAccum 계약을 구현함
        if (!_sylItems.length || (rm.name !== 'mycelium' && rm.name !== 'dandelion')) return;
        const receiver = rm.current;

        // await 이전(동기 구간)에 먼저 계산. flushQueue가 await로 제어권을 넘기는 순간
        // doSubmit()의 다음 줄(onInput(''))이 먼저 실행되며 _allItems가 비워지기 때문에,
        // 그 뒤에 읽으면 lastY가 항상 "1줄" 기본값이 되는 버그가 있었음 (fix: snapshot before await)
        const W = window.innerWidth;
        const H = window.innerHeight;
        const sylSize = rm.current?.sylSize ?? 55;
        const lineHeightRatio = rm.current?.lineHeightRatio ?? 1.3;
        const wrapStep = rm.current?.wrapStep ?? sylSize * 2;
        const wrapMargin = rm.current?.wrapMargin ?? sylSize;
        const { lastY } = calcTextboxLayout(
            _allItems,
            sylSize,
            W,
            H,
            lineHeightRatio,
            _submitOffsetY,
            wrapStep,
            wrapMargin,
        );
        const capHeight = Math.round(lastY + sylSize * lineHeightRatio * 1.5);
        // _submitOffsetY도 await 이전에 갱신 — flushQueue 대기 중 사용자가 타이핑을 시작해도
        // 항상 최신 기준선으로 레이아웃되어 위치가 어긋나지 않음. (_allItems 등은 doSubmit()의
        // onInput('') 호출이 이미 동기적으로 비웠으므로 여기서 다시 비우지 않음 — 뒤늦게 비우면
        // 대기 중 입력된 내용을 지워버리는 부작용이 있음)
        _submitOffsetY = lastY + sylSize * lineHeightRatio * 0.5;

        await receiver.flushQueue();

        const dataUrl = receiver.captureFrame();
        history.addCapture(dataUrl, capHeight);

        receiver.clearAccum();
    }

    buildInput(
        text => {
            _allItems = decomposeSyllables(text);
            // 띄어쓰기(단어 경계)가 새로 생기면 다음 음절 입력과 동일하게
            // 현재 자라는 중인 음절을 즉시 완성시킴
            const spaceCount = _allItems.reduce((n, it) => n + (it.isSpace ? 1 : 0), 0);
            if (spaceCount > _prevSpaceCount) rm.current?.finishGrowing?.();
            _prevSpaceCount = spaceCount;
            reLayout(_allItems);
        },
        async () => {
            await handleSubmit();
        },
    );

    buildUI(rm, reLayout, () => _allItems);

    window.addEventListener('resize', () => reLayout(_allItems));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Init);
} else {
    Init();
}
