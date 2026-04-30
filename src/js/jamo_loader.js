// ── jamo_loader.js ────────────────────────────────────────────────────────────
// CSV에서 자모 데이터를 로드하고, 범위 변환 옵션을 적용해 JAMO 객체를 반환합니다.
//
// 사용법:
//   import { loadJamo, YANG, YANG_NEG, TENSE, CLUSTER } from './jamo_loader.js';
//   const JAMO = await loadJamo();                        // 기본 범위
//   const JAMO = await loadJamo({ choRange: [-1, 1] });   // 자음 범위 변경
// ─────────────────────────────────────────────────────────────────────────────

/*
 * pos 배열을 원본 범위에서 목표 범위로 선형 변환
 * @param {number[]} pos   원본 값 배열
 * @param {number[]} from  원본 범위 [min, max]
 * @param {number[]} to    목표 범위 [min, max]
 */
function remapPos(pos, from, to) {
    if (!pos || pos.every(v => v === null || v === undefined || isNaN(v))) return null;
    return pos.map(v => to[0] + ((v - from[0]) / (from[1] - from[0])) * (to[1] - to[0]));
}

/**
 * CSV 텍스트를 파싱해 행 배열로 반환
 */
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, i) => {
            row[h] = values[i] ?? '';
        });
        return row;
    });
}

/*
 * 자모 데이터 로드 및 변환
 *
 * @param {object} options
 * @param {string}   options.csvPath   CSV 파일 경로 (기본값: './jamo_data.csv')
 * @param {number[]} options.choRange  자음 pos 출력 범위 (기본값: [0, 1])
 * @param {number[]} options.jungRange 모음 pos 출력 범위 — Hz값은 변환하지 않음
 *
 * @returns {Promise<object>} JAMO 객체
 *   cho/jong:  { type, pos[3], tense, cluster, cluster_front }
 *   jung:      { type, pos[3](Hz), yang, diphthong }
 */
export async function loadJamo(options = {}) {
    const {
        csvPath = './jamo_data.csv',
        choRange = [0, 1], // 자음 원본 범위는 항상 [0, 1]
    } = options;

    const text = await fetch(csvPath).then(r => r.text());
    const rows = parseCSV(text);
    const JAMO = {};

    for (const row of rows) {
        const { jamo, type } = row;
        if (!jamo) continue;

        const hasPos = row.x !== '' && row.y !== '' && row.z !== '';
        const rawPos = hasPos ? [parseFloat(row.x), parseFloat(row.y), parseFloat(row.z)] : null;

        if (type === 'cho') {
            // 초성은 jamo 키 그대로 저장
            JAMO[jamo] = JAMO[jamo] || {};
            JAMO[jamo].cho = {
                type: 'cho',
                pos: rawPos ? remapPos(rawPos, [0, 1], choRange) : null,
                tense: parseInt(row.tense) || 0,
                cluster: 0,
                cluster_front: null,
            };
        } else if (type === 'jong') {
            // 종성은 _jong 접미사로 구분 (ㄱ과 ㄱ종성이 pos가 같지만 역할이 다름)
            const key = jamo + '_jong';
            JAMO[key] = {
                type: 'jong',
                pos: rawPos ? remapPos(rawPos, [0, 1], choRange) : null,
                tense: parseInt(row.tense) || 0,
                cluster: parseInt(row.cluster) || 0,
                cluster_front: row.cluster_front || null,
            };
        } else if (type === 'jung') {
            // 모음은 Hz 원본값 유지 (셰이더에서 1/3200 스케일)
            JAMO[jamo] = {
                type: 'jung',
                pos: rawPos, // [F1_Hz, F2_Hz, F3_Hz]
                yang: parseInt(row.yang) || 0,
                diphthong: parseInt(row.diphthong) || 0,
            };
        }
    }

    return JAMO;
}

// ── 분류 집합 (import해서 바로 사용 가능) ────────────────────────────────────

/** 양성 모음 */
export const YANG = new Set(['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ']);

/** 음성 모음 */
export const YANG_NEG = new Set(['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']);

/** 이중모음 */
export const DIPHTHONG = new Set(['ㅑ', 'ㅒ', 'ㅕ', 'ㅖ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅢ']);

/** 쌍자음 */
export const TENSE = new Set(['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ']);

/** 겹받침 → 대표 발음 자음 */
export const CLUSTER = {
    ㄳ: 'ㄱ',
    ㄵ: 'ㄴ',
    ㄶ: 'ㄴ',
    ㄺ: 'ㄱ',
    ㄻ: 'ㅁ',
    ㄼ: 'ㄹ',
    ㄽ: 'ㄹ',
    ㄾ: 'ㄹ',
    ㄿ: 'ㅂ',
    ㅀ: 'ㄹ',
    ㅄ: 'ㅂ',
};
