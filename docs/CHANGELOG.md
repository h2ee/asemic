# 변경 이력

> 현행 상태는 [CLAUDE.md](../CLAUDE.md)(코드)와 [PRD.md](../PRD.md)(전시)에 반영돼 있다.
> 아래는 "왜 그렇게 됐는지"가 필요할 때만 참고.
> 이 기록들은 `project_summary_v4~v8.md`보다 최신이다. 2026-10-08 이전 항목의 "TD"는 당시 전시 출력이던 TouchDesigner 프로젝트다.

| 날짜 | 내용 | 상태 |
| --- | --- | --- |
| 2026-10-09 | **dandelion orb = 종성 후크 + 윤곽 봉오리, goo 픽셀화 + 결** — orb 무작위 배치(gap/prob/spread) 대신 dandelion.js `ORB_JAMO`가 음절마다 지정(`plan[j].orbs`, 엔진 path.js): 받침 있는 음절의 후크(구간 0.93)에 하나, 반지름 = 중성 F1, 색 = 노란 계열 안에서 초성 x→hue·y→채도·z→명도. 실선에서 (r+22)px 밀되 쪽은 실선이 덜 붐비는 쪽(`auto`, `settleSide`). `orb.bulge`(3) — orb를 윤곽선·halo 밀도장에 원으로 더해(marchingSquares 원 커널) 윤곽이 orb를 감싸며 부풀어 나온다. `goo.pixel`(5px, halo 격자와 같은 원점) — 칸 안 3×3 최댓값으로 칸 단위로 칠한다(중심 하나만 읽으면 가는 선이 점선이 된다). `goo.grain` — 밀도값을 띠 좌표로 써서(등고선 = 획과 나란) 띠마다 밀도를 깎아 덩어리를 가닥으로 가른다. 캡슐 이어진 metaball 느낌을 상쇄하려는 것. 엔진 기본값은 전부 off — sketch에도 복사 | 현행 |
| 2026-10-09 | **dandelion 픽셀 블록 + 윤곽선 동시 생성** — `halo`: 윤곽선과 같은 밀도장을 화면 고정 격자(`cell` 10px)로 재서 넘는 칸을 회색으로(underlay, orb 아래, `marchingSquares.wordCells`). 격자 원점은 `update()`가 scrollBase만큼 따라 옮겨 스크롤 재굽기에도 칸이 글자에 붙어 있다. `outline.live`: 자라는 획의 윤곽선·블록을 `interval`(60ms)마다 다시 뽑아 실선과 같이 왼→오로 자란다(켜면 한 바퀴 도는 `anim`은 안 씀). 엔진 기본값은 둘 다 off — sketch `04_trail_gl`에도 복사. 같은 날: 점선 끝 화살촉 없앰(`arrowSize: 0`), 장식 사각형 = 테두리 없는 흰 채움(엔진에 `decorFill` 추가, `decorStyle: null` = 테두리 없음) | 현행 |
| 2026-10-08 | **시연 페이지 `demo.html`** (gh-pages, 교수님 시연용) — `output.html?llm=lorem&gui=1`로 넘긴다. `?llm=lorem` = 무엇을 입력하든 `loremKo(loremLength)`(정해진 음절 수의 한글 로렘 입숨, `llm.js`)를 수신자 답으로 드러냄. `?gui=1` = 화면 옆 lil-gui(`gui.js`) — 수신자·표시 모드·답 음절 수 + controls.js 표 전부, `applyControl`/`switchReceiver` 직접 호출(허브 불필요). 빌드 입력에 output·demo 추가 | 현행 |
| 2026-10-08 | **말풍선 유리 = Figma Glass** (`glass.js`, WebGL) — Light -45° 80% / Refraction 100 / Depth 100 / Dispersion 50 / Frost 54를 `--glass-*`로. 흐린 배경 텍스처(frost) + 흐린 모양 마스크의 기울기로 가장자리 띠에서 안쪽 배경을 끌어오는 굴절, 채널별 분산, 각도 쪽 테 빛. SVG foreignObject로 그림자와 면 사이에 넣어 등장 애니메이션을 같이 탄다. BG_d↔BG_n은 텍스처 두 장 mix(`setMix`). 예전 SVG 난류 변위 유리는 WebGL2가 없을 때 fallback으로 남김 | 현행 |
| 2026-10-08 | dandelion 다시 굽는 앞 단어는 윤곽선 애니메이션 없이(그 순간만 `CFG.outline.anim.on` 끔). BG_n(signal)일 때 안내 토스트 `#hint` 글자·아이콘 흰색(배경과 같이 전환). 말풍선 테 `path.rim` 1.5 → 0.5px, 알파 0.85 → 0.6 — **BG_n(어두운 배경)일 때만**, 밝은 배경은 예전 그대로. 수신자 음절 네모는 뜬 지 3초 뒤 흐려져 사라짐(`caption.js RECEIVER_TAG_MS`, 관람객 네모는 그대로) | 현행 |
| 2026-10-08 | **signal·dandelion 세로 scroll + 위쪽 페이드** — `layoutFor` stack을 ext 없는 receiver에도(`firstY`/`lastY`/`padBottom`/`top`). signal은 그릴 때 `_slide`, dandelion은 새 자리로 다시 굽고 캔버스 CSS 슬라이드. dandelion 오버레이 캔버스를 `#glyph-window` 안으로(예전엔 mask·clip 밖이었다). 가로 tape는 mycelium만. **sora** — LLM 드러내기 0.8자/초(`revealRateFor`), 음절 네모를 단어 원마다 하나로(`wordAnchors`, 단어 음절을 한 네모에) | 현행 |
| 2026-10-08 | **receiver별 배경 — signal = `BG_n`** (나머지 BG_d). `body::before` 한 겹을 `html.bg-alt`로 크로스페이드(`--bg-fade` 1.2s), 말풍선 유리도 `glassAlt`로 같이. 처음 띄울 땐 바로(`bg-instant`). body에 `isolation: isolate` — 없으면 z -1 레이어가 body 배경 뒤에 깔린다. signal 자간 하한 ×0.96(`minSpacing`, 더 겹치면 형태가 무너짐) | 현행 |
| 2026-10-08 | **signal 배치를 `calcShelfLayout` 한 곳으로** — `_draw()`가 positions를 줄 구분에만 쓰고 자기 규칙(단어 사이 sylSize·0.6, 줄 안 세로 가운데)으로 따로 깔아 음절 네모(positions = 음절 왼쪽 끝)와 어긋났고, 자간(`wrapStep`)은 띄어쓰기 폭에만 들어가 사실상 안 먹었다. 이제 positions = 음절 중심이고 `_draw()`는 그대로 그린다. 자간 = 노브가 기본값에서 늘린 만큼 음절 사이 간격(`letterGap`, 가운데 = 0이라 기본 룩 그대로, 줄이면 겹침). 단어 캐시(`syncWord`)가 글자만 비교해 크기 노브를 돌려도 예전 크기로 남던 것 — w/h/x가 바뀌면 다시 만들고 신호등 위상은 이어받음. 두 줄에 걸친 단어는 줄마다 따로 캐시 |
| 2026-10-08 | 크기 노브의 행간 복원 — 가로는 고정(왼쪽 정렬), 줄 간격만 노브를 따라 붙고 벌어짐. **노브 돌릴 때 첫 글자 깜박임** 수정 — instant bake 뒤 rAF로 예약된 `_dequeue`가 재굽기가 이미 꺼낸 첫 음절을 덮어썼다(가드 `!_growing`) | 현행 |
| 2026-10-08 | **mycelium 크기 노브 = 글자 중심 기준** — 배치는 노브 안 댄 크기로, 노브는 `glyphScale`에만(중심 고정, `_bakedScale`로 재굽기). **음절 네모가 글자보다 먼저 움직이고 튀던 것** 수정 — 원인 둘: ① `scrollTo` 뒤처짐 보정이 `scrollBase`를 즉시 밀지만 화면은 다음 24fps 표시 패스에야 바뀜 ② 재굽기 동안 표시 패스를 안 그려 글자는 예전 자리인데 네모만 새 자리로. `shownScrollBase`/`rebaking` 노출, 재굽기 중간(dequeue 대기) 프레임에 반쯤 구운 accum을 내보내던 것도 막음 | 현행 |
| 2026-10-08 | **패널·턴테이블 Web Serial 직결 (`src/dev/serial.js`)** — TD serialDAT 대신 `output.html`이 두 아두이노를 직접 연다. 포트 구분은 첫 줄(`knob/btn/tog` = 패널), 권한은 처음 한 번 `#serial` 버튼/Alt+S, 이후 `getPorts()`·`connect` 이벤트로 자동. 다이얼 `receiver` → `switchReceiver` → 화면 전환 + 턴테이블 이름 전송, `homed` 때 재전송. `?serial=0`으로 끔 | 현행 |
| 2026-10-08 | **TD → 웹 네이티브 전환** — 전시 출력이 TD `/chat` 합성에서 브라우저 `output.html` 한 장으로. 배경·프로필·웹캠·말풍선·글자·소리·LLM 전부 웹, 패널은 `control.html` Web Serial, 다이얼은 `dial.html`, 허브는 `npm run bridge`. 입력은 브라우저 IME라 TD 두벌식 조합기 불필요. 페르소나·드러내기 속도 원본은 `llm.js`(TD 사본은 이 날짜에서 멈춤). LLM 드러내기 2.5 → 2자/초. TD 경로(`?chrome=0`, `?llm=td`)는 코드에 후퇴용으로 남김. 턴테이블은 아직 미연결 | 현행 |
| 2026-10-08 | **영어 입력 fallback** — 알파벳이 섞이면 글자는 안 그리고 친 그대로 `#caption .cap-latin`에. Enter → `llm.js translateToKorean`(Ollama)로 한국어 한 문장 → 프리셋처럼 관람객 차례로 흘려 제출 → 수신자가 그 문장에 답. 두벌식 자모 변환은 안 씀(화면이 고장 난 것처럼 보이고 영어 단어는 대부분 낱자라 0음절). 페르소나 4종에 "어떤 언어로 말해도 한국어로 대답" 추가 | 현행 |
| 2026-10-08 | 말풍선 등장 = 꼬리 끝 축 감쇠 스프링(`SPRING_*`), 줄이 늘 때 높이도 스프링 추종(`H_STIFF/H_DAMP` — 연달아 늘어도 안 끊김). 말풍선이 떠 있는 동안 `#glyph-window`·`#syl-tags`를 말풍선 모양 `clip-path: path()`로 잘라 둥근 모서리 밖으로 글자가 안 비침. 빈 화면 안내 토스트 `#hint`("(아이콘)에게 하고 싶은 말을 건네보세요", `syncIdle`). 카메라 임시 끄기 버튼 `#cam-toggle` | 현행 |
| 2026-10-08 | **말풍선 = 수신자 차례만 + 유리** — 관람객 입력 땐 말풍선 없음, LLM `onAsk`부터 아래에서 떠오름(`setVisible`). 유리: 배경 사본을 말풍선 모양으로 오려 난류 변위(`--glass-*`, 브라우저 모드만). 수신자 문장도 음절마다 네모(안은 구조 블록), 문장 상자(#caption)는 안 씀. 배치 사각형 `#glyph-rect`와 자르는 창 `#glyph-window` 분리(획 잘림). 남겨 둔 수신자 문장으로 재배치해 제출 뒤 말풍선이 한 줄로 줄던 것 수정. LLM 드러내기 3.5 → 2.5자/초, mycelium 페르소나 25~45자로 | 현행 |
| 2026-10-07 | **세로 스크롤 + 자라는 말풍선** — `glyphmode scroll`을 세로로(줄이 아래에서 쌓이고 말풍선이 위로 자라다 프로필 아래에서 멈춘 뒤 오래된 줄이 위로 밀려 페이드). mycelium `_shiftAccum` 축 일반화(`setScrollAxis`), `layoutFor` `stack` 옵션, 가로 테이프는 `glyphmode tape`. 말풍선 바깥 그림자(반투명 면이라 불투명 사본으로 그리고 안쪽은 파냄), 꼬리 `--tail-scale` 0.8, 모서리·꼬리는 고정 기준 높이(`--bubble-ref`)로. 웹캠 모자이크를 영상 쪽 격자로(fisheye 따라 휨, 11칸) + 반사광·테 | 현행 |
| 2026-10-07 | **채팅 화면 개편 (`output.html`)** — 화면 전체를 말풍선 하나로(Figma 'AI브랜딩' chat bubble 시안 1~4, 기본 1, `?bubble=N`/Alt+1..4, `bubble.js`가 화면 px로 경로 생성 — 꼬리는 아래 가운데 = 모니터 밑 수신자). 맨 위 수신자 아이콘 + 관람객 fisheye 웹캠 + 말하는 쪽 LED(`speakers.js`, 토스트 대체). 노란 입력 바 → 글자 밑 작은 상자(`caption.js`: 관람객 = 치는 음절 / 수신자 = 구조 블록 문장). 채팅 기록·WILSON은 `?chat=1`일 때만 작게. 브라우저 배경 `public/imgs/BG_d.jpg` | 현행 |
| 2026-10-06 | **모터 턴테이블 프로토타입 (`arduino/turntable`)** — 가진 부품으로: Uno R3 + 28BYJ-48 + ULN2003, 알루미늄 레이지수잔, 우드락. 리드 스위치 모듈이 불안정·파손 → TCRT5000 + 검은 테이프로 호밍. 조립 후 90°에 10~20° 덜 도는 스텝 손실(판은 손으로 가볍게 돎 = 모터 힘 한계) → 5V 2A 별도 전원 + FULL4WIRE + 감속, 그리고 **테이프 4개를 센서로 찾아 가운데 서는 닫힌 루프**로 전환(0번만 넓은 테이프, 폭으로 구분). 실측 보정량 ≤5° | 현행 |
| 2026-10-02 | **iPad 다이얼 웹 이식 (`src/dev/dial.html`)** — TD `/controller` 를 three.js 로: dial_* OBJ + `frag_toon`/`lightlib` 원문 + 그림자 맵(half float) + phongMAT 근사(림라이트 `RIM_POW` 1.2, TD 렌더와 대조). 제스처는 `dial_ext` 줄 단위 이식. `dial_outer.obj` 의 떠돌이 `l` 한 줄 때문에 OBJLoader 가 통째로 선분이 되던 것 → 로드 시 제거. 글자 영역 `#glyph-window` 화면 중앙으로 | 현행 |
| 2026-10-01 | **피지컬 패널 구성 확정 + 시리얼 방식** — Pro Micro/MIDI 대신 Uno R4 시리얼(`knob size 0.512` / `btn send` / `tog bye 1`, id = `controls.js`). 프리셋 날씨/밥/안녕 + `bye` 토글(안녕 hi↔bye: 글자는 같고 `hints`로 LLM 대답만 갈림, `turn.hint`). 패널에 없는 항목은 `hidden`. `control.html`에 Web Serial(USB 패널 직결 테스트) | 현행 |
| 2026-10-01 | **사운드 — 사물 공명 합성** — 자모 수치를 목소리가 아니라 사물로 해석(공명 모드 + 건드리는 방식 + 끝맺기 + receiver별 재질). `core.voiceFor` / `src/js/sound.js`, TD `web_audio`→`audio_out`. 늦게 붙는 받침은 울리는 소리에 실시간으로 끝맺음 | 현행 |
| 2026-10-01 | LLM 드러내기 속도 4 → 3.5자/초 (TD `Revealrate` + `llm.js`). `bridge_ext` 가 `turn.png = null` 에서 죽던 버그 수정 | 현행 |
| 2026-10-01 | **dandelion 결정성 + 장식 레이어** — 음절 구간 plan 으로 같은 음절 = 같은 점선(타이핑 경로 무관). `goo.compCap`(점선 자기 겹침 goo 억제), `goo.reach` 범위, 윤곽선 애니메이션, spineFx(roughen/pucker&bloat), bead, orb. 엔진 변경은 sketch `04_trail_gl` 에도 복사 | 현행 |
| 2026-09-30 | **문장 단위 분할 보류** — 응답이 한 문장(`Maxchars` 60, mycelium 두세 어절)이고 긴 문장은 `glyphmode`가 처리해 필요 없어짐. 여러 문장 연출을 택할 때만 되살림 (PRD 3-E) | 보류 |
| 2026-09-27 | **`glyphmode` step/page/scroll/disperse + `LLM_MODE`(web/td/off)** — 긴 문장 표시를 모드로, LLM 주인을 페이지마다 하나로. `turn`에 `llm` 필드 | 현행 |
| 2026-09-26 | **LLM 배관 (TD `/chat/llm`)** — 키를 웹 번들 밖에 두려고 TD가 호출을 맡는다. 비스트리밍 HTTP + TD측 느린 드러내기. `turn.speaker` 가드로 자기응답 무한루프 차단 | 폐기 (웹 네이티브) |
| 2026-09-26 | **교육 라이선스 적용 확인 + `/field` → `/chat/glyph` 통합** — TOP 1280 상한이 풀려 별도 루트를 둘 이유가 없어졌다. 글자 레이어가 드디어 `/chat` 컴포짓에 들어감(`comp_glyph`), webrenderTOP도 2560×1440으로 | 폐기 (웹 네이티브) |
| 2026-09-26 | **sora 제출 계약 구현** — 4종 전부 제출 가능해짐. 모프/파동 스냅 + `preserveDrawingBuffer` + 투명 PNG 캡처 | 현행 |
| 2026-09-26 | **signal 투명 출력** — `transparentOutput` opt + 유니폼 `u_bgAlpha`. `bg`를 "어두운 바탕 + 흰 halo" 두 항으로 보고 바탕을 버리고 halo를 알파로 옮김. 불투명 모드는 식이 접혀 룩 그대로 | 현행 |
| 2026-09-26 | **sora 프리멀티플라이드 알파 수정** — 셰이더 출력·blendFunc·clearColor가 제각각이라 투명해야 할 자리를 흰색으로 칠하고 있었다. TD 투명 합성에서 흰 상자로 드러남 | 현행 |
| 2026-09-26 | **sora / signal에 `setRect()`** — positions를 배치에 안 쓰는 두 receiver를 글자 영역 rect 안으로. signal은 `_syncRows()` 줄바꿈 판정도 uv → px 기준으로 | 현행 |
| 2026-09-26 | **화면 구성 재설계** — 가운데 말풍선 안에 글자를 그리는 안 폐기. 글자는 고정 rect에 한 화자·한 문장, 화자는 하단 토스트로, 기록은 오른쪽 채팅창에 6종 구조 SVG로 | 대체됨 (2026-10-07 말풍선 화면) |
| 2026-09-25 | **signal 제출 계약 구현** (PRD 3-A 선행조건) — `flushQueue`/`captureFrame`/`clearAccum` + `preserveDrawingBuffer`. 캡처는 플래싱 위상 0(NORMAL) 고정. 아직 불투명 PNG | 현행 |
| 2026-09-25 | 레이아웃 분기를 `core.js`의 `layoutFor()`로, 제출 가능 판정을 `canSubmit()`으로 모음 — main.js/output-main.js 네 곳에 흩어져 있었고 handleSubmit 두 곳이 signal 분기를 빠뜨리고 있었다 | 현행 |
| 2026-09-25 | TD `/chat`(가로 모니터)에 `icons` 추가 — 왼쪽 네모에 선택된 receiver 아이콘. `geo1/uv_map`으로 BG 평면 UV 생성 | 폐기 (웹 네이티브) |
| 2026-09-25 | **`dandelion.js` 두 번째 전면 교체** — 3단 궤적 SDF 폐기, sketch `04_trail_gl` 의 자모 터틀 궤적 + GPU 밀도장 goo 엔진으로. 획 단위가 음절→**단어**, straight alpha 출력, marching squares 단어 윤곽선. 엔진은 `receivers/trail/` 에 sketch 와 바이트 동일 사본 | 현행 |
| 2026-09-18 | **문서 분리** — CLAUDE.md가 373줄로 비대해져 PRD.md(전시·작업), docs/receivers.md(수신자 구현), docs/CHANGELOG.md(이력)로 쪼갬. CLAUDE.md에는 매 세션 필요한 것만 남김 | 현행 |
| 2026-09-18 | **전시 v2 확정** — 실물 키오스크 + 가로 모니터 1대, 말풍선 화자당 1개, 모터 턴테이블, 양방향 사운드, LLM 느린 스트리밍, 교육 라이선스 | 현행 (PRD 2장) |
| 2026-09-17 | `src/dev/chrome/`의 Figma 크롬 PNG 전량 삭제(디자인 폐기), `img/`(아이콘)·`model/`(OBJ)로 교체. `output.html`의 죽은 `<img>` 참조 정리 | 현행 |
| 2026-09-17 | TD 연동 구조 확인 — `/controller`(3D 크롬) + `/field`(webrenderTOP으로 `output.html?chrome=0` 임베드), WebSocket 브릿지 | 폐기 (웹 네이티브) |
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

**2026-10-01 포먼트 필터 합성** — 톱니파(130~150Hz) → F1/F2/F3 밴드패스 3개 → 엔벨로프, 초성은 VOT(모음 시작 지연)·버스트·비음 웅얼거림으로. 숫자대로 잘 동작했지만 **실제 모음 발음과 너무 비슷해** 사람 목소리처럼 들리고 의미와 연결되는 느낌이 났다 — 아세믹의 반대. 원인은 셋이 겹친 것: 성대 같은 음원(사람 음역 톱니파), 포먼트를 필터로 쓰는 것(= 성도가 하는 일, 전체를 배로 옮겨도 "아이 목소리의 아"로 들림), 자음→모음→감쇠의 음절 리듬. 같은 숫자를 공명 모드(울리는 음)로 바꿔 해결. 포먼트를 필터로 되돌리면 다시 목소리가 된다는 점이 핵심 교훈. 다른 후보였던 "포먼트 = 화음의 세 음"은 말과 완전히 끊기지만 음악처럼 들려서 보류

**2026-09-26 가운데 1열 말풍선** — 관람객·수신자 말풍선을 화면 가운데 세로 1열에 각 1개씩 띄우고, 그 안쪽 폭을 글자 wrap 기준으로 쓰며, 문장이 끝나면 `captureFrame()`을 말풍선 rect로 크롭해 배경 이미지로 굳히는 안이었다. 폐기 이유는 **아세믹 그래픽을 더 크게 보여주려고** — 말풍선 테두리가 차지하는 폭과 두 말풍선이 나눠 갖는 세로 공간이 아까웠다. 파생 결론:

- sora/signal의 capture 계약이 "최우선"이던 근거(캔버스 하나로 말풍선 둘을 번갈아 그려야 해서)가 사라졌다. 문장 교체는 `clearAccum()`만으로 되고, `captureFrame`은 아카이빙(E)용으로만 남는다. **signal 캡처의 불투명 PNG 문제도 같이 무의미해졌다.**
- 화자를 말풍선 위치로 구분하던 것이 하단 토스트 하나로 바뀌면서, **브릿지 `{t:'text'}`에 `speaker` 필드가 필요해졌다**(이전엔 페이지가 화자를 몰라도 됐다).
- signal의 "고정 박스 + 단어 개수 상한" / Skyline 빈패킹 아이디어는 다시 근거를 잃었다 — 글자 영역이 큰 고정 rect 하나이고 문장마다 비워지므로.

**2026-08-28 세로형 + 채팅 스크롤** — 큰 세로형 디바이스(대형 TV 세로 설치 또는 단초점 프로젝터) 하나에 수신자를 채팅 형식으로 출력하고, 턴(제출)마다 전체 화면 PNG를 아래로 쌓아 스크롤을 만드는 안이었다. 이때 파생된 결론들:

- signal의 "고정 박스 + 단어 개수 상한 + 오래된 것부터 교체" 및 Skyline 빈패킹 아이디어를 폐기 — 공간이 더 이상 고정이 아니게 되었기 때문. **v2에서 말풍선이 다시 유한한 박스가 되면서 되살릴 여지가 생겼다.**
- sora/signal의 capture 계약 구현이 최우선이 된 근거가 "PNG를 쌓기 위해"였다. v2에서 우선순위는 유지되지만 **근거는 "캔버스 하나로 두 말풍선을 번갈아 그려야 해서"로 바뀌었다.**
- DPR 캡(2)은 기기 확정 후 재조정 예정이었다 — 여전히 미확정.
