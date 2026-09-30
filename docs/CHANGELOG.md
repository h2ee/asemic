# 변경 이력

> 현행 상태는 [CLAUDE.md](../CLAUDE.md)(코드)와 [PRD.md](../PRD.md)(전시)에 반영돼 있다.
> 아래는 "왜 그렇게 됐는지"가 필요할 때만 참고.
> 이 기록들은 `project_summary_v4~v8.md`보다 최신이다.

| 날짜 | 내용 | 상태 |
| --- | --- | --- |
| 2026-09-30 | **문장 단위 분할 보류** — 응답이 한 문장(`Maxchars` 60, mycelium 두세 어절)이고 긴 문장은 `glyphmode`가 처리해 필요 없어짐. 여러 문장 연출을 택할 때만 되살림 (PRD 3-E) | 보류 |
| 2026-09-27 | **`glyphmode` step/page/scroll/disperse + `LLM_MODE`(web/td/off)** — 긴 문장 표시를 모드로, LLM 주인을 페이지마다 하나로. `turn`에 `llm` 필드 | 현행 |
| 2026-09-26 | **LLM 배관 (TD `/chat/llm`)** — 키를 웹 번들 밖에 두려고 TD가 호출을 맡는다. 비스트리밍 HTTP + TD측 느린 드러내기. `turn.speaker` 가드로 자기응답 무한루프 차단 | 현행 |
| 2026-09-26 | **교육 라이선스 적용 확인 + `/field` → `/chat/glyph` 통합** — TOP 1280 상한이 풀려 별도 루트를 둘 이유가 없어졌다. 글자 레이어가 드디어 `/chat` 컴포짓에 들어감(`comp_glyph`), webrenderTOP도 2560×1440으로 | 현행 |
| 2026-09-26 | **sora 제출 계약 구현** — 4종 전부 제출 가능해짐. 모프/파동 스냅 + `preserveDrawingBuffer` + 투명 PNG 캡처 | 현행 |
| 2026-09-26 | **signal 투명 출력** — `transparentOutput` opt + 유니폼 `u_bgAlpha`. `bg`를 "어두운 바탕 + 흰 halo" 두 항으로 보고 바탕을 버리고 halo를 알파로 옮김. 불투명 모드는 식이 접혀 룩 그대로 | 현행 |
| 2026-09-26 | **sora 프리멀티플라이드 알파 수정** — 셰이더 출력·blendFunc·clearColor가 제각각이라 투명해야 할 자리를 흰색으로 칠하고 있었다. TD 투명 합성에서 흰 상자로 드러남 | 현행 |
| 2026-09-26 | **sora / signal에 `setRect()`** — positions를 배치에 안 쓰는 두 receiver를 글자 영역 rect 안으로. signal은 `_syncRows()` 줄바꿈 판정도 uv → px 기준으로 | 현행 |
| 2026-09-26 | **화면 구성 재설계** — 가운데 말풍선 안에 글자를 그리는 안 폐기. 글자는 고정 rect에 한 화자·한 문장, 화자는 하단 토스트로, 기록은 오른쪽 채팅창에 6종 구조 SVG로 | 현행 (PRD 2장·3-A) |
| 2026-09-25 | **signal 제출 계약 구현** (PRD 3-A 선행조건) — `flushQueue`/`captureFrame`/`clearAccum` + `preserveDrawingBuffer`. 캡처는 플래싱 위상 0(NORMAL) 고정. 아직 불투명 PNG | 현행 |
| 2026-09-25 | 레이아웃 분기를 `core.js`의 `layoutFor()`로, 제출 가능 판정을 `canSubmit()`으로 모음 — main.js/output-main.js 네 곳에 흩어져 있었고 handleSubmit 두 곳이 signal 분기를 빠뜨리고 있었다 | 현행 |
| 2026-09-25 | TD `/chat`(가로 모니터)에 `icons` 추가 — 왼쪽 네모에 선택된 receiver 아이콘. `geo1/uv_map`으로 BG 평면 UV 생성 | 현행 |
| 2026-09-25 | **`dandelion.js` 두 번째 전면 교체** — 3단 궤적 SDF 폐기, sketch `04_trail_gl` 의 자모 터틀 궤적 + GPU 밀도장 goo 엔진으로. 획 단위가 음절→**단어**, straight alpha 출력, marching squares 단어 윤곽선. 엔진은 `receivers/trail/` 에 sketch 와 바이트 동일 사본 | 현행 |
| 2026-09-18 | **문서 분리** — CLAUDE.md가 373줄로 비대해져 PRD.md(전시·작업), docs/receivers.md(수신자 구현), docs/CHANGELOG.md(이력)로 쪼갬. CLAUDE.md에는 매 세션 필요한 것만 남김 | 현행 |
| 2026-09-18 | **전시 v2 확정** — 실물 키오스크 + 가로 모니터 1대, 말풍선 화자당 1개, 모터 턴테이블, 양방향 사운드, LLM 느린 스트리밍, 교육 라이선스 | 현행 (PRD 2장) |
| 2026-09-17 | `src/dev/chrome/`의 Figma 크롬 PNG 전량 삭제(디자인 폐기), `img/`(아이콘)·`model/`(OBJ)로 교체. `output.html`의 죽은 `<img>` 참조 정리 | 현행 |
| 2026-09-17 | TD 연동 구조 확인 — `/controller`(3D 크롬) + `/field`(webrenderTOP으로 `output.html?chrome=0` 임베드), WebSocket 브릿지 | 현행 |
| 2026-09-17 | 순수 로직이 `main.js` → **`src/js/core.js`로 분리**. main.js와 output-main.js가 공유 | 현행 |
| 2026-09-17 | TD Non-Commercial의 TOP 1280×1280 상한 발견 — 세로형 출력 불가 문제 | 해소됨 (교육 라이선스) |
| 2026-08-31 | `dandelion.js` 전면 재설계 — 구버전(5개 고정 식물 + p5 flower math Canvas 2D) 폐기, 3단 궤적 + WebGL2 SDF로 교체. submit 파이프라인 편입 | 현행 |
| 2026-08-28 | 전시 형태를 세로형 디바이스 + 채팅 스크롤로 잠정 결정. "턴 단위 PNG 누적" 전제 | **폐기됨** (v2가 뒤집음) |
| 2026-08-27 | signal 스퀘어클 실루엣 단일 방식 확정, `GLOBE_STYLE` 토글 및 관련 상수/유니폼 전부 제거 | 현행 |
| 2026-08-27 | signal 셰이더에 radial gradient 두 겹 추가(음절 센터 halo `SYL_GRADIENT_*`, 셀 내부 `CELL_GRADIENT_*`) | 현행 |
| 2026-08-27 | signal 전용 Shelf 레이아웃 + 포먼트 기반 가변 음절 크기 도입 | 현행 |
| 2026-08-25 | signal `stepWord()` CA 규칙을 확률 기반 → **결정적 2-pass 규칙셋**으로 전면 개편 | 현행 |
| 2026-08-24 | `signal.js`를 Canvas 2D 셀룰러 오토마타 → **WebGL2 가중 Voronoi**로 전면 교체 | 현행 |

## 폐기된 설계 (되살릴 때 참고)

**2026-09-26 가운데 1열 말풍선** — 관람객·수신자 말풍선을 화면 가운데 세로 1열에 각 1개씩 띄우고, 그 안쪽 폭을 글자 wrap 기준으로 쓰며, 문장이 끝나면 `captureFrame()`을 말풍선 rect로 크롭해 배경 이미지로 굳히는 안이었다. 폐기 이유는 **아세믹 그래픽을 더 크게 보여주려고** — 말풍선 테두리가 차지하는 폭과 두 말풍선이 나눠 갖는 세로 공간이 아까웠다. 파생 결론:

- sora/signal의 capture 계약이 "최우선"이던 근거(캔버스 하나로 말풍선 둘을 번갈아 그려야 해서)가 사라졌다. 문장 교체는 `clearAccum()`만으로 되고, `captureFrame`은 아카이빙(E)용으로만 남는다. **signal 캡처의 불투명 PNG 문제도 같이 무의미해졌다.**
- 화자를 말풍선 위치로 구분하던 것이 하단 토스트 하나로 바뀌면서, **브릿지 `{t:'text'}`에 `speaker` 필드가 필요해졌다**(이전엔 페이지가 화자를 몰라도 됐다).
- signal의 "고정 박스 + 단어 개수 상한" / Skyline 빈패킹 아이디어는 다시 근거를 잃었다 — 글자 영역이 큰 고정 rect 하나이고 문장마다 비워지므로.

**2026-08-28 세로형 + 채팅 스크롤** — 큰 세로형 디바이스(대형 TV 세로 설치 또는 단초점 프로젝터) 하나에 수신자를 채팅 형식으로 출력하고, 턴(제출)마다 전체 화면 PNG를 아래로 쌓아 스크롤을 만드는 안이었다. 이때 파생된 결론들:

- signal의 "고정 박스 + 단어 개수 상한 + 오래된 것부터 교체" 및 Skyline 빈패킹 아이디어를 폐기 — 공간이 더 이상 고정이 아니게 되었기 때문. **v2에서 말풍선이 다시 유한한 박스가 되면서 되살릴 여지가 생겼다.**
- sora/signal의 capture 계약 구현이 최우선이 된 근거가 "PNG를 쌓기 위해"였다. v2에서 우선순위는 유지되지만 **근거는 "캔버스 하나로 두 말풍선을 번갈아 그려야 해서"로 바뀌었다.**
- DPR 캡(2)은 기기 확정 후 재조정 예정이었다 — 여전히 미확정.
