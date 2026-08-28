# 아세믹 한글 (Asemic Hangul) — 프로젝트 컨텍스트

> 마지막 동기화: 실제 파일 기준 (2026-08-27) — 아래 내용은 project_summary_v4~v8.md보다 최신입니다.
> **2026-08-24 변경**: `signal.js`가 기존 Canvas 2D 셀룰러 오토마타 구현에서 WebGL2 가중 Voronoi(power diagram) 구현으로 완전히 교체됨(구 파일명 `signal_voronoi.js`였던 실험판이 검증 후 `signal.js`로 승격, 구버전 `signal.js`는 삭제). 섹션 2/5/6이 이 내용을 반영해 갱신됨.
> **2026-08-25 변경**: `signal.js`의 `stepWord()` CA 전이 규칙이 확률 기반(단일 이웃 + `Math.random()`)에서 **결정적 2-pass 규칙셋**으로 전면 개편됨(`signal_ca_rework_prompt.md` 스펙 기준). 렌더링 파이프라인은 무변경, 색상 계산도 무변경. 섹션 5의 signal.js 항목이 이 내용을 반영해 갱신됨.
> **2026-08-27 변경**: signal 전용 **Shelf 레이아웃 + 포먼트 기반 가변 음절 크기** 도입. `main.js`에 `calcShelfLayout`/`calcSignalLatticeSize` 추가(기존 `calcTextboxLayout`·타 수신자 무변경), `reLayout()`이 `rm.name==='signal'`일 때만 분기. `signal.js`는 음절마다 다른 `width`/`height`를 받아 point 생성/adjacency/렌더/셰이더 전 경로가 "누적 폭" 기반으로 동작(`sylMeta.w/h`, `wordWidth/wordHeight`, 셰이더 `u_sylOffsetX/Width/Height[]` uniform 배열). 섹션 4/5 반영.
> **2026-08-27 변경 (2)**: signal 셰이더에 radial gradient 두 겹 추가 — (a) 음절 센터 배경 halo(`BG_GRAY` + `SYL_GRADIENT_*`), (b) 셀 내부 gradient(컬러 모드 전용, site 중심→가장자리 채도/명도 변화, `CELL_GRADIENT_*`). CA·레이아웃 무관, `main()` 색 합성 단계만 바뀜. 섹션 5 반영. **값은 h2ee가 자주 바꿈 — 파일 재확인 필수.**
> **2026-08-27 변경 (3)**: signal 음절 실루엣을 **스퀘어클(squircle) 단일 방식으로 확정** — `GLOBE_STYLE` 토글과 style 0(크리스프 원형 클리핑) 및 관련 상수/유니폼(`GLOBE_RADIUS_RATIO`/`HALO_EXTRA`/`u_globeStyle`/`u_globeRadiusRatio`/`u_haloExtra`) 전부 제거. 비주얼 무변화(스퀘어클이 원래 기본값이었음). 앞으로 signal 발전은 이 비주얼을 베이스로. 섹션 5 반영.
> **주의**: 사용자(h2ee)가 세션 사이에 셰이더 파라미터를 직접 수정하는 경우가 많음.
> 값(숫자 상수 등)은 이 문서를 믿지 말고 항상 실제 파일을 다시 읽어서 확인할 것.

---

## 1. 프로젝트 개념

- **컨셉**: 한글 자모(초성/중성/종성)에 숫자 규칙을 대응시켜, 입력한 텍스트를 언어적 의미가 제거된 아세믹(asemic) 시각 형태로 변환하는 인터랙티브 설치 작품.
- **프로젝트 골: "Communication for its own sake"** — Communication = transmission(전달) + exchange(교환) + connection(연결) 세 요소로 이루어진다고 볼 때, 이 프로젝트는 그중 **exchange를 내용 없이 성립시켜서 connection for its own sake(연결 그 자체를 위한 연결)**를 남기는 실험이다. 소통의 많은 부분은 사실 "연결되고자 하는 의지의 교환"이었는지 모른다는 것이 핵심 가설.
- **핵심 질문**: 소통에서 "내용(언어적 이해)"이 차지하는 자리는 생각보다 부차적인 것일지 모른다 — 가사를 몰라도 노래를 듣고, 말이 통하지 않는 대상(동물 등)에게도 말을 건다. 언어적 이해를 제거한 소통에는 무엇이 남는가.
- **Asemic writing**: 글쓰기의 방식과 형태는 유지하되 해독 가능한 의미는 없는 글쓰기. 독자에게 해석의 여지를 남기는, "그 자체를 위한 글쓰기(writing for its own sake)".
- **송수신 구도**: Me(관람객, Audience) ↔ translator(아세믹 변환 규칙) ↔ Opponent = **Non-Human Receivers**. 비인간 사물을 소통 상대로 설정하는 것은 포스트휴머니즘적 관점의 연장이자, 인간과 사물을 나란히 "발신자"의 위치에 놓는 실험이기도 하다.
- **전시 형태**: 정사각 모니터 여러 대, 각 모니터 = 서로 다른 "수신자"(receiver) 하나. 관람객이 한글을 입력하면 실시간으로 해당 수신자의 시각 언어로 변환. 미정
- **전시 하드웨어**: MacBook Pro M3 Max (인터랙티브 스테이션 구동), Raspberry Pi (아카이빙 디스플레이), 19" 5:4 모니터, Pepper's Ghost용 11.6" 포터블 모니터 + 45도 아크릴판. 미정
    - 전시 형태/하드웨어가 미정인 이유: **LLM 연동(섹션 8-b) 여부에 따라 달라질 수 있음.** 예시로 LLM API 호출이 들어가면 각 스테이션에 안정적인 네트워크 연결이 필요해지고, 응답 대기시간이 생기면 입력/출력 UI 구조나 모니터 배치(예: 응답 전용 화면 분리 등)가 달라질 수 있다. 따라서 전시 형태는 8-b의 LLM 설계가 종료된 후에 확정하는 것이 낫다
- **자모 → 데이터 매핑 원칙(패널 기준)**: 초성 = color(색), 중성 = form/움직임(형태), 종성 = 형태가 끝나는 지점/최종 위치. 이 3단 매핑이 mycelium/sora 등 receiver 설계의 공통 기반.

---

## 2. 코드베이스 구조 (실제 확인됨)

```
asemic/
  index.html
  vite.config.js
  package.json
  public/
    jamo_data.csv          — 자모 좌표 데이터 (cho/jong/jung, 67 rows)
  src/js/
    main.js                 — 입력 UI, 음절 분해, 레이아웃 엔진, 수신자 라우팅, 전송/히스토리
    jamo_loader.js           — CSV 파싱 → JAMO 객체
    pathFunctions.js         — (레거시 참고용, 현재 receiver들은 자체 pathSrc 보유)
    receivers/
      ReceiverManager.js     — 공통 인터페이스 (init/update/dispose) + registry
      sora.js                — 🐚 클라드니 극좌표 SDF, 단어 슬롯 방식
      signal.js               — 🚦 가중 Voronoi(power diagram), WebGL2/GLSL ES 3.00, CA 규칙은 JS에 유지
      dandelion.js             — 🌼 5개 고정 민들레, 단어 순환 active
      mycelium.js              — 🍄 균사체, 3-pass 레이마칭 (alien.js 기반, 현재 기본 수신자)
```

**⚠️ alien.js는 더 이상 존재하지 않음.** ReceiverManager 레지스트리에는 `sora`, `signal`, `dandelion`, `mycelium` 네 개만 등록되어 있음. main.js의 기본 초기 수신자는 `mycelium`.

### 배포

- GitHub: `github.com/h2ee/asemic`
- `npm run deploy` → build 후 `dist`를 `gh-pages` 브랜치로 subtree push
- `npm run commit` → 커밋+푸시 단축 스크립트

---

## 3. 자모 좌표 체계 (jamo_data.csv / jamo_loader.js)

### 컬럼: `jamo, type, x, y, z, yang, diphthong, tense, cluster, cluster_front`

### 자음 (cho / jong) — pos = [x, y, z], 범위 0~1

| 축  | 의미     | 값                                                  |
| --- | -------- | --------------------------------------------------- |
| x   | 조음위치 | 양순0 / 치조0.25 / 경구개0.5 / 연구개0.75 / 후두1.0 |
| y   | 조음방법 | 파열0 / 파찰0.33 / 마찰0.5 / 비음0.75 / 유음1.0     |
| z   | 긴장도   | 울림0 / 예사0.33 / 된0.67 / 거센1.0                 |

- `JAMO[자모].cho` — 초성 엔트리
- `JAMO[자모+'_jong']` — 종성 엔트리 (겹받침은 `cluster_front`로 대표음 참조)

### 모음 (jung) — pos = [F1, F2, F3] Hz 원본값 (정규화 안 함)

| 축     | 의미    | 실측 범위 |
| ------ | ------- | --------- |
| x (F1) | 개구도  | 250~900   |
| y (F2) | 혀 전후 | 580~2600  |
| z (F3) | —       | 2080~3200 |

- `JAMO[자모]` 직접 = 모음 엔트리 (`.pos`, `.yang`, `.diphthong`)
- 셰이더에서 쓸 때 보통 `/3200` 등으로 스케일

### jamo_loader.js 유틸 export

`YANG`, `YANG_NEG`, `DIPHTHONG`, `TENSE`, `CLUSTER`(겹받침→대표자음 맵)

---

## 4. main.js 핵심 흐름

1. `decomposeSyllables(text)` — 한글 유니코드 분해, 공백마다 `wordId++`, `{cho, jung, jong, wordId, isSpace}` 배열 생성
2. `reLayout()`이 레이아웃 함수 분기 — `rm.name === 'signal'`이면 `calcShelfLayout`, 그 외는 `calcTextboxLayout`. 둘 다 `_submitOffsetY`·receiver 자체 값(`sylSize`, `lineHeightRatio`, `wrapStep`, `wrapMargin`, `rm.current?.sylSize ?? 55` fallback) 사용.
    - `calcTextboxLayout(...)` — 고정 `sylSize` 균일 grid, 자간/줄바꿈 계산. `{positions, sylItems, lastY}` 반환.
    - `calcShelfLayout(...)` — signal 전용. `calcSignalLatticeSize()`로 음절마다 포먼트 기반 `width`/`height` 계산 후 shelf packing(왼쪽부터, 폭 초과 시 wrap, 줄 높이=음절 height 최댓값). `{positions, sylItems, widths, heights, lastY}` 반환.
3. `dispatchToReceiver(rm, sylItems, positions, sylSize, widths, heights)` — 수신자별로 다른 시그니처로 update 호출:
    - `mycelium`: `update(syllablesToUniforms(...), sylItems.length, sylItems)`
    - `sora`: `update(sylItems, positions, JAMO)` (positions는 무시, 내부에서 랜덤 위치 사용)
    - `signal`: `update(sylItems, positions, JAMO, sylSize, widths, heights)` (widths/heights = 음절별 lattice px 크기)
    - `dandelion`: `update(sylItems, positions, JAMO)` (positions 무시, 고정 슬롯 사용)
4. `handleSubmit()` — **⚠️ 현재 `rm.name === 'mycelium'`일 때만 동작.** flushQueue → captureFrame(투명 PNG) → history에 고정 이미지로 누적 → clearAccum. 나머지 세 수신자는 전송 시 히스토리 캡처가 구현되어 있지 않음.
5. UI 버튼: 🐚 sora / 🚦 signal / 🌼 dandelion / 🍄 mycelium

---

## 5. 수신자별 현재 구현 상태

### 🍄 mycelium.js — 균사체 (기본 수신자, 가장 진행된 상태)

- **모티브(패널 기준)**: Language / mycelium network — 균사체가 위험신호 등을 주고받는 네트워크라는 점에서 이전 음절에 닿도록 미치는 연결 실 구조가 유래함 (강한 소리가 나는 자음에서 트리거).
- Three.js + GLSL 레이마칭, **3-pass**: grow(1음절만) → accum(ping-pong 누적) → display
- `syllablePath`: ep1/ep2/ep3(3중 에피사이클, alien.js 원형) + **ep4**(작은 에피사이클, 균사 끝 미세 흔들림)
- `map()`: 캡슐 경로 SDF + **lump(혹)** 시스템(경로 위 20~54개 구, stratified 분산, growT 따라 순차 등장) + **연결 실(mother tree hub)** 시스템
    - 허브 등록: 음절 확정 시 `cho.y < 0.75`(비음/유음 제외)면 허브 후보로 등록
    - 연결 트리거: 된/거센소리(`cho.z>=0.65`) / 연음(이전 종성+현재 초성 ㅇ) / 종성 존재 — 만족 개수로 연결 0~2개, `connections+1` 가중치로 rich-get-richer 선택
    - `u_hubCenters[2]`, `u_connCount` uniform으로 셰이더에 전달
- 재질: 금속(toon quantized diffuse) + body/lump 색 분리 옵션 A(현재 다른 색) + 검은 edge glow
- `this.sylSize = 100`, `lineHeightRatio = 4.0`, `layoutScale = {x:1.28, y:1.0}` (카메라 오프셋 보정용)
- 배경색 `vec3(0.7)` (회색)
- **⚠️ 파라미터가 자주 바뀜** — num/k/rad, lump 개수·크기 공식, 색상 계수 등은 작업 시작 전 재확인 필수

### 🚦 signal.js — 신호등 (WebGL2 / GLSL ES 3.00, 가중 Voronoi/power diagram)

- **모티브(패널 기준)**: Light / Man-made / Society — 사회와 규칙을 표상하는 수신자. 셀들이 규칙에 따라 상호작용하며 형상을 만드는 셀룰러 오토마타 방식으로 구현. (모티브는 아래 재구성 전후로 동일)
- **2026-08-24 재구성**: 원래 있던 Canvas 2D 셀룰러 오토마타 구현(정수 인덱스 5×5 격자 `Lattice`/`Word` 클래스)을 폐기하고, `signal_voronoi.js`라는 별도 실험 파일로 WebGL2 가중 Voronoi 렌더링을 새로 만든 뒤 검증을 거쳐 `signal.js`로 승격·교체함. 이 시점엔 "다이어그램을 그리는 방식"만 바뀌었고, CA 상태 전이 규칙 자체는 구버전 그대로(단일 이웃 체크 + `Math.random() < 0.15` 확률) 유지됐었음.
- **2026-08-25 CA 규칙 전면 개편**: `stepWord()`의 상태 전이 규칙을 확률 기반에서 **결정적(OR 조건, 확률 없음) 2-pass 규칙**으로 전면 교체함(`signal_ca_rework_prompt.md` 스펙). 패턴 배정(`patternState`)·색상 계산(`cellColor`/`pointColor`)·렌더링 파이프라인은 무변경.
    - **순환 규칙**: CHO→JUNG(전체 이웃 JUNG≥3 또는 동+남 방향 JUNG≥1) → JUNG→JONG(전체 JONG≥2 또는 남쪽 JONG≥1, **단 `sylMeta.jongEntry`가 없으면 이 전이 자체가 발동 안 하고 JUNG 유지**) → (JONG 전이가 안 됐을 때만) JUNG→CHO(동쪽 이웃에 CHO/BLANK가 있으면) → JONG→CHO(전체 CHO≥3 또는 동+북 CHO≥1). 임계값은 전부 파일 상단 `*_THRESHOLD` 상수로 이름 붙여짐.
    - **부활 시 상태 선택**: 균등 랜덤이 아니라 점 생성 시(`appendSyllable()`) 계산해 저장해둔 `p.originalState`로 복귀 — 같은 자모를 입력하면 매번 비슷한 비주얼이 나오게 하기 위함.
    - **"배경 BLANK" 제외(`p.isBackground`)**: `patternState()`가 애초에 BLANK로 남긴 "여백" 점(`originalState===BLANK`)은 CA 트리거/부활 대상에서 제외됨 — 자기 자신은 절대 안 바뀌면서 이웃에 blank를 계속 퍼뜨리는 무한 소스가 되는 걸 방지(다른 점의 이웃 카운트에는 여전히 정상 포함).
    - **BLANK 관련 규칙 두 개, 우선순위 A>B**: 규칙A(즉시 확산) — 자신이 BLANK면 이웃 BLANK≥`BLANK_SPREAD_THRESHOLD_FROM_BLANK`(2), 활성 상태면 이웃 BLANK≥`BLANK_SPREAD_THRESHOLD_FROM_ACTIVE`(4, 비대칭)일 때 이웃 중 서/북 방향 우선 2개(`BLANK_SPREAD_TARGET_COUNT`)를 BLANK로 전파하고, 트리거한 점 자신은 BLANK 상태였을 때만 `originalState`로 복귀. 규칙B(지속 부활) — 5스텝 연속(`BLANK_REVIVE_STREAK_LENGTH`)으로 이웃 BLANK≥3(`BLANK_REVIVE_NEIGHBOR_THRESHOLD`)이면 `originalState`로 복귀. 신호등 셀은 두 규칙 모두 전이 대상에서 제외(카운트에는 정상 포함).
    - 구현: `stepWord()`가 2-pass 구조(1차 패스 — 순환 규칙+규칙B를 스텝 시작 시점 상태 기준으로 계산 / 2차 패스 — 규칙A가 다른 점의 상태에 씀, `p.changedThisStep`으로 "1차 패스에서 이미 전이된 타겟은 안 덮어씀" 우선순위 보장)이고, 방향 조건은 재사용 가능한 헬퍼 `inDirection(p, q, dirs)`로 통일됨.
- **사이트 배치**: 지터드 그리드 샘플링(`jitteredGridSample()`) — Bridson's Poisson-disk 대신 사용(Poisson-disk는 jitter를 낮춰도 구조적으로 blue-noise/육각 패킹에 수렴해 격자 느낌을 낼 수 없음). `JITTER`값을 낮출수록 사각 격자에 가까운 배치가 됨.
- **이웃 관계**: `d3-delaunay`로 단어 전체 point set의 Delaunay triangulation을 계산해 CA 이웃 그래프로 사용(정수 grid index가 아님). 포인트는 음절 입력 즉시 해당 단어(wordId)의 point set에 append되고 그 단어 전체로 Delaunay가 다시 계산됨(append-only 캐싱, `syncWord()`).
- **렌더링**: 단어 하나 = draw call 하나. CPU에서 그 단어의 point들(x, y, weight, color, `cellCx/cellCy`)을 RGBA32F 데이터 텍스처(2행×N포인트: row0=x,y,weight,cellCx / row1=r,g,b,cellCy)에 패킹하고, 프래그먼트 셰이더가 픽셀마다 power distance(`dist² - weight`)가 최소인 site를 찾아 그 색으로 칠함 — 폴리곤 클리핑 없이 GPU에서 직접 power diagram을 계산. 셀 경계 코너는 smooth-min(`smin`/`smax`)으로 라운딩.
- **음절 실루엣 = 스퀘어클(squircle) 단일 방식 확정(2026-08-27)** — 음절 하나하나를 스퀘어클로 잘라 "구슬이 이어진" 느낌. 과거엔 `GLOBE_STYLE` 상수로 (0)크리스프 원형 클리핑 / (2)스퀘어클을 토글했으나(그 이전 style `1` "소프트 블러"는 2026-08-24 제거), style 0 및 관련 상수/유니폼(`GLOBE_STYLE`, `GLOBE_RADIUS_RATIO`, `HALO_EXTRA`, `u_globeStyle`, `u_globeRadiusRatio`, `u_haloExtra`)을 전부 제거하고 스퀘어클을 베이스로 확정. `appendSyllable()`에서 원본(비압축) 격자좌표 기준으로 `radialWarp()`(위치를 원형으로 압축, 반경 방향 단조 증가라 site 충돌 없음)와 `gain()`(IQ 스타일 bias/gain 곡선으로 셀 크기 축소, **반드시 압축 전 좌표로 계산** — 압축 후 좌표로 계산하면 바깥쪽 셀이 과하게 사라짐)를 site 위치/크기(`cellCx/cellCy` → row0.w/row1.w)에 적용, 셰이더는 그 값으로 축별 박스 클리핑을 `edgeDist`에 `smin`.
- **DPR**: `mycelium.js`와 동일하게 2로 캡. `u_resolution` 유니폼은 CSS px(논리 단위) 유지, 캔버스 backing store(`canvas.width/height`)만 DPR 스케일 — 반대로 하면 렌더링 좌표가 한쪽 구석으로 쪼그라듦.
- 신호등 랜덤 셀: 음절당 개수는 `SIGNAL_DENSITY_MIN`/`MAX` 상수(현재 2~3개)로 조절. 2026-08-25 개편으로 색 인덱스와 state가 `appendSyllable()` 생성 시점에 함께 확정됨(`SIGNAL_STATE_FOR_COLOR` — 빨강→JONG/초록→CHO/노랑→JUNG, 이전엔 색은 랜덤·state는 `patternState()`가 독립적으로 정해 서로 안 맞을 수 있었음).
- **신호등 플래싱 사이클** (음절 단위 자율 상태 순환, `CYCLE_*`/`MONO_*` 상수): 음절 생성 순간부터 무한 반복 `NORMAL`(원본 CA 렌더링 그대로) → `BLINK`(모노 흑백 도형 ↔ 원본 교차 노출, `CYCLE_BLINK_RATE_MS` 반주기) → `FREEZE`(CA 전이·밝기 완전 정지, 그 순간 렌더링 유지) → 다시 NORMAL. 사이클 시작 시각 = `performance.now() + sylIndex * CYCLE_PHASE_STEP_MS`(음절 인덱스마다 지연 → 신호가 순차 전파). `getCyclePhase()`(JS, `stepWord`에서 `isFrozen()`로 FREEZE 음절 스킵) + 셰이더가 `u_time`/`u_sylPhaseStart[]`로 **같은 공식을 재현**(단일 소스는 JS 상수, `#define`으로 주입). BLINK 모노 도형은 셀의 CA state(`u_data` row2)에 따라 점/대각선/X — `.` = BLANK, `/` = CHO, `\` = JUNG, `X` = JONG.
- ⚠️ 구버전 `p.flash`/`pointColor`의 `fv===1|2` 알파블렌드 분기는 위 사이클로 대체돼 **죽은 코드**(어디서도 0이 아닌 값으로 안 세팅됨). 임의 삭제 금지 원칙으로 보존 중.
- 글자 크기는 `DEFAULT_SYL_SIZE`(파일 상단, 현재 180) 상수 하나가 **기준(base)** — 실제 음절 크기는 `main.js` `calcShelfLayout`이 음절마다 계산해 넘김.
- **가변 음절 크기(2026-08-27)**: `main.js` `calcSignalLatticeSize()`가 `w = clamp((F1-250)/600, 0, 1)`, `scaleX = 1 + (yang?+1:-1)*K*w`(현재 `K`는 파일에서 확인 — 0.2~0.5 사이로 자주 바뀜)로 계산 — 비이중모음은 등방(width=height=`base*scaleX`), 이중모음은 가로축만(`width=base*scaleX`, `height=base`). Shelf 레이아웃(`calcShelfLayout`)은 왼쪽부터 쌓고 컨테이너 폭 넘으면 wrap, 줄 높이 = 그 줄 음절 height 최댓값(이미 배치된 음절 재배치 안 함), `{positions, sylItems, widths, heights, lastY}` 반환. `signal.js`: `update(...,widths,heights)` → `_syncRows`가 음절 item에 `w/h` 부착 → `appendSyllable(...,sylW,sylH)`가 `sylMeta.w/h`에 저장. `offsetX`는 `wordWidth()`(이전 음절 폭 누적합), `recomputeAdjacency`의 `cols`·`_draw`/`_drawWord`도 누적합(`wordWidth`/`wordHeight`) 기반. 셰이더는 `u_sylOffsetX/Width/Height[MAX_SYL_UNIFORM]` 배열로 픽셀→음절 매핑을 나눗셈 대신 오프셋 구간 탐색으로 하고(`sylI`, 신호등 플래싱 + 음절 센터 배경 gradient 중심/반경 계산에 씀). squircle은 `radialWarp` 정규화 원을 `sylW×sylH` 박스로 되돌려 비등방(가로/세로로 긴) 실루엣을 냄.
- **음절 센터 배경 radial gradient(2026-08-27)**: 셀을 그리기 전 단계에서 각 음절 중심을 기준으로 배경(`BG_GRAY`, 현재 clearColor·mono BG도 이 값 참조)보다 밝은 halo가 깔리고 바깥으로 페이드 → 셀 색은 `mix(bg, cellShaded, edge)`로 그 위에 얹힘. 상수 `SYL_GRADIENT_STRENGTH`(중심 밝기 증가량) / `SYL_GRADIENT_RADIUS_RATIO`(반경/`min(음절 w,h)`) / `SYL_GRADIENT_FALLOFF`(곡선). `sylCenter`/`sylW_i`/`sylH_i`(가변 크기용으로 이미 계산돼 있던 값) 재사용. 단어 quad 밖(단어 사이 여백)엔 안 깔림 — 거긴 `clearColor(BG_GRAY)` 그대로.
- **셀 내부 미세 radial gradient(2026-08-27, 컬러 모드 전용)**: 각 셀이 `bestPos`(site) 중심에선 원래 색, 가장자리로 갈수록 색 변화 — `cellT = pow(clamp(|v_local-bestPos| / (√bestW * CELL_GRADIENT_RADIUS_RATIO)), CELL_GRADIENT_FALLOFF)`, 채도항 `mix(vec3(luma), color, 1 + CELL_GRADIENT_SAT*cellT)`(>0이면 채도↑) + 명도항 `*(1 - CELL_GRADIENT_DEPTH*cellT)`, 최종 clamp. 둘 다 `cellT` 구동이라 각 상수 0이면 그 항만 꺼짐. 셀 크기가 weight로 제각각이라 기준 반경을 `√bestW`(≈`currentScale×MIN_DIST`)에 맞춤. mono(BLINK) 모드는 `finalColor`를 통째로 덮어써서 영향 없음.

### 🐚 sora.js — 소라고둥 (WebGL2/GLSL ES 3.0)

- **모티브(패널 기준)**: Sea / 파도소리 — 소라고둥에 귀를 대면 들리는 파도소리를 소재로 삼아, 주파수가 시각화된 결과물인 클라드니 도형을 형태 생성 방법으로 삼음. 구형 공간 안에서 클라드니 도형을 만드는 공식 + 나선형 변형을 더해 소라의 나선형 구조를 의도.
- 클라드니 극좌표 공식을 SDF로 취급 → `smin()`으로 합산
- **단어 슬롯 방식**: 화면의 원 개수 = 단어 수 (음절 개수 아님). 각 슬롯은 해당 단어의 마지막 음절 파라미터를 표시하고, 새 음절 입력 시 슬롯 내부에서 m/n 모프(MORPH_DUR=0.8s)
- 슬롯 위치/반경은 wordId별로 화면 내 **랜덤 배정 후 유지**(고정 레이아웃 아님, main.js의 positions는 무시)
- `M_MAX=2.0, N_MAX=7.0` (복잡도 상한, 낮출수록 단순)
- 색상: `heatmap3()` — 초성 조음위치(choX)→hue, 긴장도(choZ)→채도, 근접 가중 평균으로 슬롯 간 보간
- displacement(사인/노이즈)로 클라드니 마디선을 비틀어 손그림 느낌 추가
- `this.sylSize = 150`, `MAX_SYL = 9`(단어 슬롯 최대 개수)

### 🌼 dandelion.js — 민들레 (Canvas 2D)

- **모티브(패널 기준)**: Plant / Wind — 식물과 바람이라는 비인간적 수신자.
- 화면에 **5개 민들레 고정**(`PLANT_SLOTS`, 위치/바람위상/키배율 고정), 상시 바람 흔들림 애니메이션
- **단어 완성(공백) 순환**: 공백이 생길 때마다 active 식물이 0→1→2→3→4→0... 순환 (음절마다가 아니라 단어 경계마다 전환)
- active 식물은 해당 단어의 마지막 음절 자모값으로 파라미터 갱신 (`mapParams`) → `updateParams`에서 부드럽게 모프(MORPH_DUR=550ms, easeInOut)
- 꽃/홀씨 렌더링은 **p5.js 수학 공식을 Canvas 2D로 포팅**(`renderFlowerOffscreen`, `buildSeeds` — 피보나치 나선 배치), 오프스크린 캔버스에 캐시 후 blit
- 매핑: 초성 조음위치(x)→잎 펼침폭/색조, 조음방법(y)→톱니 깊이, F1→줄기 높이, F2→꽃머리 크기, 종성 유무→꽃(노랑)/홀씨(흰색) 전환, 종성 긴장도→홀씨 밀도
- `this.sylSize = 130`, `lineHeightRatio = 1.8`

---

## 6. 알려진 이슈 / 다음 작업 후보

- **signal.js**: 신호등 플래싱은 이제 자율 사이클(`NORMAL/BLINK/FREEZE`, 섹션 5 참고)로 동작 — RGB 색상 분석 결과와 연동하는(예: 빨강 셀이 많으면 FREEZE 유발) 로직은 아직 없음, 순수 타이머. 구버전 `p.flash` 알파블렌드 경로는 죽은 코드. 구버전 "도형 오버레이 레이어(원/별/사각형)" placeholder는 2026-08-24 재구성 때 사라짐(BLINK 모노 도형이 그 역할을 부분적으로 대체).
- **sora / signal / dandelion**: 전송(submit) 시 히스토리 캡처가 mycelium과 달리 구현 안 됨 — `main.js`의 `handleSubmit()`이 `rm.name === 'mycelium'`으로 하드코딩되어 있음 (signal.js가 2026-08-24에 WebGL2로 교체된 뒤에도 이 부분은 아직 손대지 않음)
- **mycelium**: 연결 실/mother tree 효과가 화면에서 잘 안 보일 수 있음(v8 시점 이슈) — growT≥0.99에서만 그려지므로 instant bake 음절은 한 프레임만 노출될 가능성 있음. 실제로 해결됐는지 파일 재확인 필요
- 줄바꿈을 가로지르는 단어 간 연결(mycelium 허브)은 보류 상태

---

## 7. 작업 규칙 (h2ee 선호)

- 파라미터가 대화 사이에 자주 바뀜, 이 문서의 숫자값도 참고용일 뿐 확정 아님
- 주석 처리된 코드/미사용 함수는 의도적 기록물 — 임의로 삭제 금지

---

## 8. Further Plan (패널 기준 향후 계획 — 여름방학~2학기)

### a) 비주얼 고도화

- 민들레 수신자 및 타 수신자 글자의 비주얼 고도화 (패널에서 특히 dandelion 지명)
- 현재 구현 상태(위 섹션 5) 기준으로 mycelium이 가장 진행됨, sora/signal/dandelion은 상대적으로 덜 다듬어진 상태

### b) 입력/출력 경험의 인터렉션/인터페이스 디자인

- **LLM 연동 인터렉션**: 대형 언어 모델(LLM)을 이용해 관람객의 질문(한글 입력)에 각 수신자가 본인의 "언어"(=각 receiver의 시각 규칙)로 답변을 생성하는 구조. 패널 다이어그램: Audience → [LLM + Receivers] → 응답
    - 설계 고려 사항: LLM이 "답변 텍스트"를 생성하면 그 텍스트가 다시 각 receiver의 기존 파이프라인(decomposeSyllables → dispatchToReceiver)을 타고 시각화되는 구조가 자연스러움 (새로운 렌더링 경로 따로 만들 필요 없음)
    - API 호출/응답 대기 중 UI 상태(loading), 응답이 너무 길 경우 MAX_SYL 초과 처리 등 고려 필요
- 전송(submit) 흐름을 mycelium 외 수신자에도 확장하는 것과 동시에 진행하면 효율적 (알려진 이슈, section 6 참고)

### c) 책자 제작 — 수신자별 언어 소개 + 아세믹 한글 그래픽 정리

각 수신자마다 다음 세 가지를 담은 페이지(예: 07~09번 패널 포맷 참고) 구성:

1. **의의(motivation/meaning)** — 왜 이 수신자를 선택했는지, 어떤 모티브(위 5번 각 수신자의 "모티브" 항목 참고)와 연결되는지
2. **Procedural 기법 설명** — 자모 데이터(초/중/종성)가 어떻게 수학적/시각적 규칙(에피사이클, 클라드니 공식, 셀룰러 오토마타, 꽃 수학 포팅 등)으로 변환되는지 — 위 5번 섹션 내용이 이 목적을 위해 설명형으로 변환 가능한 출발점
3. **글자 비주얼** — 실제 출력 이미지/스크린샷, 각 수신자별 입력 예시("안녕" → "안녕하세요" 같은 누적 과정) 포함

> 책자 작업은 코드 작업과 별개로 진행되지만, 각 receiver의 "모티브"와 "핵심 알고리즘/공식"은 이 CLAUDE.md 섹션 5에서 발췌해서 쓰면 됩니다.
