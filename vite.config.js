// vite.config.js
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
    // trail receiver 가 .frag/.vert/.glsl 를 직접 import 한다 (sketch 프로젝트와 파일을
    // 바이트 단위로 동일하게 유지하기 위함 — 다른 receiver 들처럼 템플릿 문자열로
    // 옮겨 적으면 두 곳이 갈라진다). #include 도 이 플러그인이 처리.
    plugins: [glsl()],
    base: '/asemic/',
    build: {
        target: 'esnext',
    },
});
