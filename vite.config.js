// vite.config.js
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import fs from 'node:fs';
import path from 'node:path';

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

export default defineConfig({
    // trail receiver 가 .frag/.vert/.glsl 를 직접 import 한다 (sketch 프로젝트와 파일을
    // 바이트 단위로 동일하게 유지하기 위함 — 다른 receiver 들처럼 템플릿 문자열로
    // 옮겨 적으면 두 곳이 갈라진다). #include 도 이 플러그인이 처리.
    plugins: [glsl(), bakeSink()],
    base: '/asemic/',
    // 같은 와이파이의 iPad(dial.html)가 붙을 수 있게 LAN에도 연다 — 브릿지(:9980)는 원래 모든 인터페이스에서 듣는다
    server: { host: true },
    build: {
        target: 'esnext',
    },
});
