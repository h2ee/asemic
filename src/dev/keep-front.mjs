// `npm run keepfront` — 전시 중 크롬을 맨 앞에 붙잡아 둔다 (2026-11-13).
// 가끔 다른 창이 포커스를 가져가 키 입력이 크롬으로 안 가고, 크롬을 한 번 눌러야 했다. 페이지(output-main.js)는
// 자기 안의 포커스만 되잡을 수 있고 다른 앱이 앞에 나온 건 못 되돌린다 — 그래서 바깥에서.
//
// CHECK_MS마다 맨 앞 앱을 보고, 크롬이 아니면 그 앱 이름을 logs/focus-<날짜>.log 에 남기고 크롬을 다시 앞으로.
// 운영자용 앱(LEAVE — 터미널·시스템 설정·활성 상태 보기)이 앞이면 가만히 둔다 — 이걸 끄러 터미널을 눌렀는데 뺏기지 않게.
// (키보드 입력 유무로 운영자를 가리면 안 된다 — 관람객도 같은 키보드라, 크롬이 뒤로 간 채 관람객이 계속 치면 영영 안 돌아온다)
// 권한이 필요 없다(lsappinfo·open). 끄기: 터미널에서 Ctrl+C
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHECK_MS = 2000;
// loginwindow·화면 보호기 = 화면이 잠겼다(전시 끝, 2026-11-13 로그에서 잠금 화면 위로 2초마다 크롬을 부르고 있었다)
const LEAVE = new Set(['com.apple.Terminal', 'com.googlecode.iterm2', 'com.apple.systempreferences', 'com.apple.ActivityMonitor', 'com.apple.loginwindow', 'com.apple.ScreenSaver.Engine']);
const APP = 'Google Chrome';

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const frontApp = () => {
    const asn = sh('lsappinfo', ['front']);
    const m = sh('lsappinfo', ['info', '-only', 'bundleid,name', asn]);
    return {
        bundle: m.match(/"CFBundleIdentifier"="([^"]*)"/)?.[1] ?? '',
        name: m.match(/"LSDisplayName"="([^"]*)"/)?.[1] ?? '?',
    };
};

const logDir = path.resolve('logs');
function log(line) {
    const day = new Date().toLocaleDateString('sv-SE');
    const row = `${new Date().toLocaleTimeString('sv-SE')}  ${line}`;
    console.log(row);
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, `focus-${day}.log`), row + '\n');
}

let away = null; // 지금 앞에 나와 있는 다른 앱 이름
log(`keepfront 시작 — ${APP}을 앞에 (확인 ${CHECK_MS}ms, 터미널·시스템 설정이 앞이면 가만히)`);
setInterval(() => {
    try {
        const f = frontApp();
        if (f.bundle === 'com.google.Chrome') {
            if (away) log(`크롬 복귀 (${away} 뒤)`);
            away = null;
            return;
        }
        if (away !== f.name) log(`다른 앱이 앞에: ${f.name} (${f.bundle})`);
        away = f.name;
        if (LEAVE.has(f.bundle)) return;
        execFileSync('open', ['-a', APP]);
        log(`→ ${APP} 다시 앞으로`);
    } catch (err) {
        log(`오류: ${err.message.split('\n')[0]}`);
    }
}, CHECK_MS);
