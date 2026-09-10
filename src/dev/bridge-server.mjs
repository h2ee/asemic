// ── bridge-server.mjs ────────────────────────────────────────────────────────
// 개발용 WebSocket 허브 — 전시에선 TouchDesigner의 WebSocket DAT 가 이 역할을 함.
//
//   node src/dev/bridge-server.mjs      (또는  npm run bridge)
//
//  - output.html 이 ws://localhost:9980 로 접속
//  - 페이지가 보내는 메시지를 콘솔에 로그  (page → ...)
//  - stdin 에 JSON 한 줄 입력 → 접속된 모든 페이지로 전송 (TD → page 시뮬레이션)
//       {"t":"param","size":150}
//       {"t":"text","value":"안녕하세요"}
//       {"t":"submit"}
//       {"t":"clear"}
//
// 의존성 없음 — Node 내장 http/crypto 로 RFC6455 최소 구현(작은 텍스트 프레임 전용).
// ─────────────────────────────────────────────────────────────────────────────

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

const PORT = Number(process.env.BRIDGE_PORT ?? 9980);
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();

const server = createServer((_req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' });
    res.end('Upgrade required — WebSocket only\n');
});

server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) return socket.destroy();
    const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    clients.add(socket);
    log(`+ client (${clients.size} connected)`);

    let buf = Buffer.alloc(0);
    socket.on('data', chunk => {
        buf = Buffer.concat([buf, chunk]);
        let f;
        while ((f = decodeFrame(buf))) {
            buf = buf.subarray(f.total);
            if (f.opcode === 0x8) return socket.end(); // close
            if (f.opcode === 0x9) {
                socket.write(encodeFrame(f.payload, 0xa)); // ping → pong
                continue;
            }
            if (f.opcode === 0x1 || f.opcode === 0x0) {
                const text = f.payload.toString('utf8');
                let pretty = text;
                try {
                    const o = JSON.parse(text);
                    if (o.t === 'turn' && o.png) o.png = `<dataURL ${o.png.length}b>`;
                    pretty = JSON.stringify(o);
                } catch {
                    /* raw */
                }
                log(`client → ${pretty}`);
                // 허브: 받은 메시지를 다른 클라이언트로도 릴레이 (TD WebSocket DAT server 모드처럼).
                // page → page 루프가 걱정되면 각 페이지가 자기 t 를 무시하도록 짜여 있어야 함.
                relay(f.payload, socket);
            }
        }
    });
    const drop = () => {
        clients.delete(socket);
        log(`- client (${clients.size} connected)`);
    };
    socket.on('close', drop);
    socket.on('error', drop);
});

function decodeFrame(buf) {
    if (buf.length < 2) return null;
    const b1 = buf[1];
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let offset = 2;
    if (len === 126) {
        if (buf.length < 4) return null;
        len = buf.readUInt16BE(2);
        offset = 4;
    } else if (len === 127) {
        if (buf.length < 10) return null;
        len = Number(buf.readBigUInt64BE(2));
        offset = 10;
    }
    const maskLen = masked ? 4 : 0;
    if (buf.length < offset + maskLen + len) return null;
    const mask = masked ? buf.subarray(offset, offset + 4) : null;
    const data = Buffer.from(buf.subarray(offset + maskLen, offset + maskLen + len));
    if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
    return { opcode: buf[0] & 0x0f, payload: data, total: offset + maskLen + len };
}

function encodeFrame(payload, opcode = 0x1) {
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x80 | opcode;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x80 | opcode;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

function broadcast(obj) {
    const frame = encodeFrame(Buffer.from(JSON.stringify(obj), 'utf8'));
    for (const c of clients) {
        try {
            c.write(frame);
        } catch {
            /* noop */
        }
    }
}

// 이미 인코딩된 payload 를 sender 제외 전 클라이언트로 릴레이
function relay(payload, exclude) {
    const frame = encodeFrame(payload, 0x1);
    for (const c of clients) {
        if (c === exclude) continue;
        try {
            c.write(frame);
        } catch {
            /* noop */
        }
    }
}

const log = m => console.log(`[bridge ${new Date().toISOString().slice(11, 19)}] ${m}`);

server.listen(PORT, () => {
    log(`listening  ws://localhost:${PORT}`);
    log('stdin: JSON 한 줄 → 접속된 모든 페이지로 전송  (예: {"t":"param","size":150})');
});

createInterface({ input: process.stdin }).on('line', line => {
    line = line.trim();
    if (!line) return;
    try {
        const obj = JSON.parse(line);
        broadcast(obj);
        log(`→ page  ${line}  (${clients.size} client)`);
    } catch {
        log('(무시 — 유효한 JSON 한 줄이 아님)');
    }
});
