// vite.config.js
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import fs from 'node:fs';
import path from 'node:path';
import { isAllowed, describe as describeAllow } from './src/dev/allow-ip.mjs';

// src/dev/bake.html 이 구운 음절 PNG를 디스크에 쓰는 통로 (npm run dev 전용, 빌드엔 안 들어감).
//   GET  /__bake/list?dir=mycelium            → 이미 있는 파일명 JSON (이어 굽기용)
//   POST /__bake/save?dir=mycelium&name=x.png → body(PNG 바이트)를 bake/<dir>/<name> 에 저장
function bakeSink() {
    const root = path.resolve('bake');
    const safe = s => path.basename(String(s ?? '')).replace(/[\/\\]/g, '');
    return {
        name: 'asemic-bake-sink',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/__bake', (req, res) => {
                const url = new URL(req.url, 'http://x');
                const dir = path.join(root, safe(url.searchParams.get('dir')) || 'out');
                const send = (code, body) => {
                    res.statusCode = code;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(body));
                };
                if (url.pathname === '/list') {
                    return send(200, fs.existsSync(dir) ? fs.readdirSync(dir) : []);
                }
                if (url.pathname === '/save' && req.method === 'POST') {
                    const name = safe(url.searchParams.get('name'));
                    if (!name.endsWith('.png')) return send(400, { error: 'name' });
                    const chunks = [];
                    req.on('data', c => chunks.push(c));
                    req.on('end', () => {
                        fs.mkdirSync(dir, { recursive: true });
                        fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
                        send(200, { ok: true, path: path.relative(process.cwd(), path.join(dir, name)) });
                    });
                    return;
                }
                send(404, { error: 'not found' });
            });
        },
    };
}

// 전시 진단 기록(src/dev/diag.js)을 logs/diag-<날짜>.jsonl 에 이어 쓴다 (npm run dev 전용, 2026-11-12).
//   POST /__diag  body = JSON 줄들(ndjson). 한 번에 1MB까지
// 대화 기록(src/dev/chatlog.js)도 같은 길로 — POST /__chat → logs/chat-<날짜>.jsonl (2026-11-13)
function diagSink(route = '/__diag', prefix = 'diag') {
    const root = path.resolve('logs');
    return {
        name: `asemic-${prefix}-sink`,
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use(route, (req, res) => {
                // 읽기 (2026-11-13, src/dev/chatview.html) — GET /list → 날짜 목록, GET /<YYYY-MM-DD> → 그날 jsonl 그대로
                if (req.method === 'GET') {
                    const p = new URL(req.url, 'http://x').pathname.replace(/^\//, '');
                    const re = new RegExp(`^${prefix}-(\\d{4}-\\d{2}-\\d{2})\\.jsonl$`);
                    if (p === 'list') {
                        const days = fs.existsSync(root)
                            ? fs.readdirSync(root).map(f => f.match(re)?.[1]).filter(Boolean).sort().reverse()
                            : [];
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify(days));
                    }
                    const file = path.join(root, `${prefix}-${p}.jsonl`);
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(p) || !fs.existsSync(file)) {
                        res.statusCode = 404;
                        return res.end();
                    }
                    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store');
                    return res.end(fs.readFileSync(file));
                }
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    return res.end();
                }
                const chunks = [];
                let size = 0;
                req.on('data', c => {
                    size += c.length;
                    if (size <= 1e6) chunks.push(c);
                });
                req.on('end', () => {
                    const day = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD (로컬)
                    fs.mkdirSync(root, { recursive: true });
                    fs.appendFileSync(path.join(root, `${prefix}-${day}.jsonl`), Buffer.concat(chunks));
                    res.statusCode = 204;
                    res.end();
                });
            });
        },
    };
}

// `npm run dev:lan` 을 남과 같이 쓰는 망(학교 와이파이)에서 띄울 때 — ALLOW_IP 밖 주소는 페이지도 HMR 도 막는다.
// (allow-ip.mjs. ALLOW_IP 가 없으면 전부 받는다 = 예전 그대로)
function allowIp() {
    return {
        name: 'asemic-allow-ip',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (isAllowed(req.socket.remoteAddress)) return next();
                res.statusCode = 403;
                res.end('forbidden\n');
            });
            const http = server.httpServer;
            http?.prependListener('upgrade', (req, socket) => {
                if (!isAllowed(socket.remoteAddress)) socket.destroy();
            });
            if (server.config.server.host !== 'localhost') server.config.logger.info(`  ${describeAllow()}`);
        },
    };
}

export default defineConfig({
    // trail receiver 가 .frag/.vert/.glsl 를 직접 import 한다 (sketch 프로젝트와 파일을
    // 바이트 단위로 동일하게 유지하기 위함 — 다른 receiver 들처럼 템플릿 문자열로
    // 옮겨 적으면 두 곳이 갈라진다). #include 도 이 플러그인이 처리.
    plugins: [glsl(), allowIp(), bakeSink(), diagSink(), diagSink('/__chat', 'chat')],
    base: '/asemic/',
    // 기본은 localhost만 — 공용 와이파이에서 소스·/__bake가 남에게 열리지 않게(2026-10-08).
    // iPad(dial.html)를 붙일 땐 `npm run dev:lan`(vite --host)으로 LAN에 연다. 브릿지(:9980)는 원래 모든 인터페이스에서 듣는다
    server: {
        host: 'localhost',
        watch: { ignored: ['**/bake/**/~*.idlk'] },
    },
    build: {
        target: 'esnext',
        // gh-pages 시연용 — 스탠드얼론 외에 전시 화면(output)과 시연 입구(demo = output?llm=lorem&gui=1)도 싣는다
        rollupOptions: {
            input: {
                main: 'index.html',
                output: 'src/dev/output.html',
                demo: 'src/dev/demo.html',
            },
        },
    },
});
