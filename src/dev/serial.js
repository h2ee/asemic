// ── serial.js — 피지컬 패널 + 턴테이블 USB 직결 (Web Serial, 2026-10-08) ─────────
//
// 전시 화면(output.html)이 아두이노 둘을 직접 연다. TD serialDAT/허브 없이 끝난다.
//   패널(Uno R4)     → 한 줄씩  knob size 0.512 / btn send / tog bye 1   (arduino/control_panel)
//   턴테이블(Uno R3) ← receiver 이름 + \n,  → arrived <이름> / homed / ...  (arduino/turntable)
//
// 어느 포트가 무엇인지는 **처음 오는 줄로** 가린다(knob/btn/tog = 패널, 그 밖 = 턴테이블).
// 그 전까지는 패널로 확정되지 않은 포트 전부에 명령을 보낸다 — 패널은 '?' 말고는 받은 바이트를
// 버리므로 잘못 가도 해가 없다. 턴테이블은 포트를 열면 리셋돼 호밍부터 하고(homed), 그때
// 지금 receiver를 다시 보내 제자리로 돌린다.
//
// 권한: 처음 한 번은 사용자 제스처로 requestPort()를 불러 포트를 골라야 한다(두 보드면 두 번).
// 크롬이 출처별로 기억하므로 그 뒤로는 getPorts()로 새로고침·재부팅·USB 재연결 때 저절로 붙는다.
// 크롬/엣지 + localhost(또는 https)에서만 된다. 한 포트는 한 탭만 열 수 있다 —
// control.html의 "USB 패널 연결"과 동시에 못 쓴다.

const BAUD = 115200;
const PANEL_RE = /^(knob|btn|tog)\s/;

/**
 * @param onControl     패널 → { id, value } (applyControl 에 그대로)
 * @param onTurntable   턴테이블 → 받은 한 줄(arrived <name> 등)
 * @param onStatus      연결 상태가 바뀔 때 → { panel:bool, turntable:bool, ports:number }
 */
export function createSerial({ onControl, onTurntable, onStatus } = {}) {
    const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
    const ports = new Map(); // SerialPort → { role:'panel'|'turntable'|null, writer }
    let target = null; // 턴테이블이 앞으로 보내야 할 receiver 이름

    const status = () => {
        const roles = [...ports.values()].map(p => p.role);
        return { panel: roles.includes('panel'), turntable: roles.includes('turntable'), ports: ports.size };
    };
    const changed = () => onStatus?.(status());

    function write(entry, text) {
        entry.writer?.write(new TextEncoder().encode(text)).catch(() => {});
    }

    function onLine(entry, line) {
        line = line.trim();
        if (!line) return;
        if (!entry.role) {
            entry.role = PANEL_RE.test(line) ? 'panel' : 'turntable';
            console.log('[serial] 포트 확인:', entry.role);
            changed();
        }
        if (entry.role === 'panel') {
            const [kind, id, raw] = line.split(/\s+/);
            if (kind === 'btn') onControl?.({ id, value: 1 });
            else if (kind === 'knob' || kind === 'tog') {
                const value = Number(raw);
                if (Number.isFinite(value)) onControl?.({ id, value });
            }
            return;
        }
        // 턴테이블 — 호밍이 끝나면(전원·리셋 직후) 지금 receiver 자리로 보낸다
        if (line === 'homed' && target) write(entry, `${target}\n`);
        onTurntable?.(line);
    }

    async function open(port) {
        if (ports.has(port)) return;
        const entry = { role: null, writer: null };
        ports.set(port, entry);
        try {
            await port.open({ baudRate: BAUD });
        } catch (e) {
            // 다른 탭(control.html, 두 번째 output)이 이미 열었거나 장치가 막 빠졌다
            console.warn('[serial] 열기 실패:', e.message);
            ports.delete(port);
            return;
        }
        entry.writer = port.writable.getWriter();
        changed();
        write(entry, '?'); // 패널: 지금 노브·토글 상태를 한 번 다 보낸다. 턴테이블은 무시한다
        const reader = port.readable.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '';
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += value;
                const lines = buf.split('\n');
                buf = lines.pop();
                lines.forEach(l => onLine(entry, l));
            }
        } catch (e) {
            console.warn('[serial] 끊김:', e.message);
        }
        ports.delete(port);
        try {
            entry.writer.releaseLock();
            await port.close();
        } catch {}
        changed();
    }

    // 사용자 제스처 안에서 불러야 한다(클릭·키 입력)
    async function request() {
        if (!supported) return;
        try {
            await open(await navigator.serial.requestPort());
        } catch {
            // 선택 창을 그냥 닫음
        }
    }

    // 턴테이블에 receiver 이름을 보낸다. 패널로 확정된 포트 말고 전부 — 아직 첫 줄을 못 받은 턴테이블도 받게
    function turntable(name) {
        target = name;
        for (const entry of ports.values()) if (entry.role !== 'panel') write(entry, `${name}\n`);
    }

    if (supported) {
        navigator.serial.getPorts().then(list => list.forEach(open));
        navigator.serial.addEventListener('connect', e => open(e.target)); // USB 다시 꽂으면 저절로
    }

    return { supported, request, turntable, status };
}
