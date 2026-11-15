// 문장 시드 (2026-11-13) — receiver의 "매번 다른" 요소(sora 원 자리·반경, signal 격자 흔들림·신호등 셀,
// mycelium 연결 실이 닿는 허브)를 문장마다 하나의 32bit 시드에서 뽑는다. 그 시드를 대화 기록
// (src/dev/chatlog.js → logs/chat-<날짜>.jsonl)에 같이 남겨, 나중에 같은 문장을 같은 모습으로 다시 그릴 수 있게.
//
// 난수는 순서가 아니라 **이름으로** 뽑는다 — seededRng('sora-pos', wordId)처럼. 순서대로 꺼내 쓰면 관람객이 치는
// 박자(지웠다 다시 치기, 받침이 늦게 오기)에 따라 같은 시드에서도 결과가 달라진다.
// 시드는 페이지가 새 문장이 시작될 때 nextSeed()로 바꾼다. 아무도 안 바꾸면 페이지를 연 때 뽑은 값 그대로다.
// dandelion은 원래 자모에서 시드를 뽑아서(같은 글자 = 같은 획) 이걸 안 쓴다.
import { makeRng, hashSeed } from './receivers/trail/path.js';

const fresh = () => (Math.random() * 0x100000000) >>> 0;
let _seed = fresh();

export const turnSeed = () => _seed;
// seed를 주면 그 값으로(다시 그리기), 안 주면 새로 뽑는다
export function nextSeed(seed = null) {
    _seed = seed == null || !Number.isFinite(seed) ? fresh() : seed >>> 0;
    return _seed;
}
// 지금 문장 시드 + 이름 → [0,1) 난수열 (mulberry32)
export const seededRng = (...keys) => makeRng(hashSeed(_seed, ...keys));
