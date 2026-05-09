// ── ReceiverManager.js ────────────────────────────────────────────────────────

import { AlienReceiver }  from './alien.js';
import { SoraReceiver }   from './sora.js';

const REGISTRY = {
  alien: AlienReceiver,
  sora:  SoraReceiver,
};

export class ReceiverManager {
  constructor(canvas = null) {
    this._canvas   = canvas;
    this._current  = null;
    this._name     = null;
  }

  async setReceiver(name) {
    if (this._name === name) return;
    if (this._current) {
      this._current.dispose();
      this._current = null;
    }
    const Cls = REGISTRY[name];
    if (!Cls) throw new Error(`Unknown receiver: ${name}`);
    this._current = new Cls();
    this._name    = name;
    await this._current.init(this._canvas);
  }

  // ...args로 수신자마다 다른 시그니처를 그대로 통과시킴
  // alien: update(uniformData)
  // sora:  update(syllables, JAMO)
  update(...args) {
    this._current?.update(...args);
  }

  get name() { return this._name; }

  dispose() {
    this._current?.dispose();
    this._current = null;
    this._name    = null;
  }
}
