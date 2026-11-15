// ── ReceiverManager.js ────────────────────────────────────────────────────────

import { SoraReceiver } from './sora.js';
import { SignalReceiver } from './signal.js';
import { DandelionReceiver } from './dandelion.js';
import { MyceliumReceiver } from './mycelium.js';

const REGISTRY = {
    sora:            SoraReceiver,
    signal:          SignalReceiver,
    dandelion:       DandelionReceiver,
    mycelium:        MyceliumReceiver,
};

export class ReceiverManager {
    constructor(canvas = null) {
        this._canvas = canvas;
        this._current = null;
        this._name = null;
    }

    // opts는 receiver 생성자로 그대로 전달됨. 현재 mycelium만 사용:
    //   { transparentOutput: true } → 크롬 PNG/TD 합성용 straight-alpha 출력
    async setReceiver(name, opts = {}) {
        if (this._name === name) return;
        if (this._current) {
            this._current.dispose();
            this._current = null;
        }
        const Cls = REGISTRY[name];
        if (!Cls) throw new Error(`Unknown receiver: ${name}`);
        // 캔버스는 컨텍스트를 한 번만 가질 수 있다(three WebGLRenderer vs 생 WebGL2).
        // 전환할 때마다 같은 자리·같은 id/클래스/스타일로 새 캔버스를 끼워 넣어
        // 이전 receiver 의 GL 상태가 다음 receiver 로 새지 않게 한다.
        if (this._canvas?.parentNode) {
            // 빼낸 캔버스의 WebGL 컨텍스트를 바로 돌려준다 (2026-11-13). 안 돌려주면 GC 전까지 살아 있어서, 전환이 쌓이면
            // 크롬 한도(약 16개)를 넘는 순간 가장 오래된 컨텍스트 — 말풍선 유리·웹캠 — 를 강제로 버렸다(전시 진단 기록:
            // 끊김 4번이 전부 전환 0.1초 뒤, 유리 2880×1620·웹캠). 버려진 유리는 새로고침 전까지 안 돌아왔다.
            // 4종 다 이 캔버스에 webgl2를 쓴다 — 이미 있는 컨텍스트면 getContext가 그걸 돌려주고, 2d면 null
            try {
                this._canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
            } catch {
                /* 없어도 전환은 된다 */
            }
            const fresh = document.createElement('canvas');
            fresh.id = this._canvas.id;
            fresh.className = this._canvas.className;
            fresh.style.cssText = this._canvas.style.cssText;
            this._canvas.parentNode.replaceChild(fresh, this._canvas);
            this._canvas = fresh;
        }
        this._current = new Cls(opts);
        this._name = name;
        // 음절이 화면에서 자라기 시작하는 순간 → 페이지(사운드). receiver를 바꿔도 핸들러는 유지된다.
        // 지금은 mycelium만 부른다 — 나머지는 receiver 쪽에 같은 훅을 달면 된다
        this._current.onSyllableStart = syl => this.onSyllableStart?.(syl, name);
        this._current.onBeadStep = step => this.onBeadStep?.(step, name); // dandelion 비드 읽기 소리 (2026-11-10)
        await this._current.init(this._canvas);
    }

    // ...args로 수신자마다 다른 시그니처를 그대로 통과시킴
    // mycelium: update(uniformData, sylCount, sylItems)
    // sora:  update(syllables, positions, JAMO)
    // dandelion: update(syllables, positions, JAMO)
    // signal: update(syllables, positions, JAMO, sylSize)
    update(...args) {
        this._current?.update(...args);
    }

    get name() {
        return this._name;
    }
    get current() {
        return this._current;
    }

    dispose() {
        this._current?.dispose();
        this._current = null;
        this._name = null;
    }
}
