# 수신자별 구현 레퍼런스

> 각 receiver의 내부 구현·알고리즘·함정. **해당 파일을 건드리기 전에 그 항목을 읽을 것.**
> ⚠️ 숫자 상수는 h2ee가 자주 바꾼다 — 이 문서의 값은 참고용, 실제 값은 파일에서 확인.

공통 인터페이스는 `src/js/receivers/ReceiverManager.js` (init / update / dispose + registry).
레지스트리에 등록된 건 `sora`, `signal`, `dandelion`, `mycelium` 네 개. 기본값은 `mycelium`.

**submit 계약** (`flushQueue` / `captureFrame` / `clearAccum` / `finishGrowing`) 구현 현황:

| receiver | 구현 | 비고 |
| --- | --- | --- |
| mycelium | ✅ | |
| dandelion | ✅ | |
| signal | ❌ | **최우선 작업** |
| sora | ❌ | |

---

## 🍄 mycelium.js — 균사체 (기본 수신자, 가장 진행된 상태)

**모티브(패널 기준)**: Language / mycelium network — 균사체가 위험신호 등을 주고받는 네트워크라는 점에서, 이전 음절에 닿도록 뻗는 연결 실 구조가 유래했다(강한 소리가 나는 자음에서 트리거).

- Three.js + GLSL 레이마칭, **3-pass**: grow(1음절만) → accum(ping-pong 누적) → display
- `syllablePath`: ep1/ep2/ep3(3중 에피사이클, alien.js 원형) + **ep4**(작은 에피사이클, 균사 끝 미세 흔들림)
- `map()`: 캡슐 경로 SDF + **lump(혹)** 시스템(경로 위 20~54개 구, stratified 분산, growT 따라 순차 등장) + **연결 실(mother tree hub)** 시스템
    - 허브 등록: 음절 확정 시 `cho.y < 0.75`(비음/유음 제외)면 허브 후보로 등록
    - 연결 트리거: 된/거센소리(`cho.z >= 0.65`) / 연음(이전 종성 + 현재 초성 ㅇ) / 종성 존재 — 만족 개수로 연결 0~2개, `connections+1` 가중치로 rich-get-richer 선택
    - `u_hubCenters[2]`, `u_connCount` uniform으로 셰이더에 전달
- 재질: 금속(toon quantized diffuse) + body/lump 색 분리 옵션 A(현재 다른 색) + 검은 edge glow
- `sylSize = 100`, `lineHeightRatio = 4.0`, `layoutScale = {x:1.28, y:1.0}` (카메라 오프셋 보정용)
- 배경색 `vec3(0.7)` (회색)
- **해상도 독립 (2026-09-26)** — 글자 모양은 `sylSize/H` 비율 하나로 정해진다(셰이더의 캡슐 반경·혹·노이즈가 월드 상수라서). `refHeight`(859)를 들고 있으면 `layoutFor`가 px 값을 `H/refHeight` 배로 스케일 → 어느 화면에서든 맥북 브라우저에서 잡은 룩 그대로
- **배치 = 정확한 역투영** — `screenToWorld(u,v)`가 셰이더 광선식을 뒤집어 음절 중심을 z=0 평면에 놓는다. 예전 `sceneH`/`layoutScale`/`startOffsetX` 근사(화면 중심 쪽으로 가로 0.91·세로 0.71배 압축)는 `project` 없을 때의 fallback으로만 남음
- **`glyphExtent`(1.5)** — 음절 중심→글자 끝(sylSize 배수). `layoutFor(rect)`가 이걸로 가장자리 여백을 잡고, 아래로 넘치면 `FIT_STEPS`로 단계 축소(번역기 입력창식)
- **크기 변경 시 재굽기** — `update()`가 이미 있던 음절 중심이 움직였으면 `_rebake()`로 전부 instant 재굽기. 연결 실은 `_sylHubIds`에 기억해 둔 허브에 그대로 다시 붙는다(랜덤 재선택 없음)

**GPU 비용 (2026-09-26, M3 Max · 2560×1440 · 음절 한 패스)** — 처음엔 growT=1 한 패스가 **392~482ms**라 TD(같은 GPU)가 fps 1~5로 떨어졌다. 두 가지로 줄였다:
- **경계 판정** `hitSyllableBounds()` — 광선이 음절 경계 구(`1.3·amp` 또는 `|u_end|` + `BOUND_MARGIN`)와 연결 실 캡슐에 안 닿으면 레이마칭 생략. 닿는 픽셀은 예전 그대로라 **비트 단위 동일**(실측 diff 0). 글자 끝이 잘려 보이면 `BOUND_MARGIN`을 올릴 것
- **경로 사전계산** `pathFrag` → `_pathTarget`(151×3 float) — 경로 점·테이퍼 노이즈·혹 위치를 음절마다 `_dequeue()`→`_bakePath()`에서 한 번 굽고 `map()`은 읽기만. `u_usePathTex=0`이면 예전 직접 계산(비교용). 실루엣 가장자리 픽셀 수십 개만 float 오차로 다름
- 결과: growT 0.5 → 21ms, growT 1 → 49ms, 연결 실 2개 → 66ms (처음 대비 ~8~10배)
- 측정은 TD에서 `web_glyph.executeJavaScript()`로 페이지 안에 프로브를 넣고 `bridge.send({t:'jserror'})`로 받아 `bridge.par.Lasterror`에서 읽었다. ANGLE에선 `gl.finish()`가 안 기다리므로 `readPixels(1px)`로 동기화해야 시간이 잡힌다

**프레임레이트**: 성장 루프가 자체적으로 24fps로 스로틀된다(`_FRAME_INTERVAL = 1000/24`) — webrenderTOP의 `maxrenderrate=24`에 맞춘 값. `growT`는 **렌더된 프레임당** `prev + (1-prev)*0.08`로 전진하며 경과시간 기준이 아니다.

**알려진 이슈**: 연결 실/mother tree 효과가 화면에서 잘 안 보일 수 있다 — `growT >= 0.99`에서만 그려지므로 instant bake 음절은 한 프레임만 노출될 가능성. 해결됐는지 파일 재확인 필요.

---

## 🚦 signal.js — 신호등 (WebGL2 / GLSL ES 3.00, 가중 Voronoi / power diagram)

**모티브(패널 기준)**: Light / Man-made / Society — 사회와 규칙을 표상하는 수신자. 셀들이 규칙에 따라 상호작용하며 형상을 만드는 셀룰러 오토마타 방식으로 구현.

### CA 규칙 (결정적 2-pass, 확률 없음)

- **순환 규칙**: CHO→JUNG(전체 이웃 JUNG≥3 또는 동+남 방향 JUNG≥1) → JUNG→JONG(전체 JONG≥2 또는 남쪽 JONG≥1, **단 `sylMeta.jongEntry`가 없으면 이 전이 자체가 발동 안 하고 JUNG 유지**) → (JONG 전이가 안 됐을 때만) JUNG→CHO(동쪽 이웃에 CHO/BLANK가 있으면) → JONG→CHO(전체 CHO≥3 또는 동+북 CHO≥1). 임계값은 전부 파일 상단 `*_THRESHOLD` 상수.
- **부활 시 상태 선택**: 균등 랜덤이 아니라 점 생성 시(`appendSyllable()`) 계산해 저장해둔 `p.originalState`로 복귀 — 같은 자모를 입력하면 매번 비슷한 비주얼이 나오게 하기 위함.
- **"배경 BLANK" 제외(`p.isBackground`)**: `patternState()`가 애초에 BLANK로 남긴 "여백" 점(`originalState === BLANK`)은 CA 트리거/부활 대상에서 제외. 자기 자신은 안 바뀌면서 이웃에 blank를 계속 퍼뜨리는 무한 소스가 되는 걸 방지한다(이웃 카운트에는 여전히 포함).
- **BLANK 규칙 두 개, 우선순위 A > B**
    - 규칙A(즉시 확산) — 자신이 BLANK면 이웃 BLANK≥`BLANK_SPREAD_THRESHOLD_FROM_BLANK`(2), 활성 상태면 이웃 BLANK≥`BLANK_SPREAD_THRESHOLD_FROM_ACTIVE`(4, 비대칭)일 때 서/북 방향 우선 2개(`BLANK_SPREAD_TARGET_COUNT`)를 BLANK로 전파. 트리거한 점 자신은 BLANK였을 때만 `originalState`로 복귀.
    - 규칙B(지속 부활) — 5스텝 연속(`BLANK_REVIVE_STREAK_LENGTH`)으로 이웃 BLANK≥3(`BLANK_REVIVE_NEIGHBOR_THRESHOLD`)이면 `originalState`로 복귀.
    - 신호등 셀은 두 규칙 모두 전이 대상에서 제외(카운트에는 포함).
- **구현**: `stepWord()`가 2-pass — 1차는 순환 규칙+규칙B를 스텝 시작 시점 상태 기준으로 계산, 2차는 규칙A가 다른 점의 상태에 쓴다. `p.changedThisStep`으로 "1차에서 이미 전이된 타겟은 안 덮어씀"을 보장. 방향 조건은 헬퍼 `inDirection(p, q, dirs)`로 통일.

### 지오메트리 · 렌더링

- **사이트 배치**: 지터드 그리드 샘플링(`jitteredGridSample()`). Bridson's Poisson-disk를 쓰지 않는 이유는 jitter를 낮춰도 구조적으로 blue-noise/육각 패킹에 수렴해 **격자 느낌을 낼 수 없기 때문**. `JITTER`를 낮출수록 사각 격자에 가까워진다.
- **이웃 관계**: `d3-delaunay`로 단어 전체 point set의 Delaunay triangulation을 계산해 CA 이웃 그래프로 사용(정수 grid index 아님). 포인트는 음절 입력 즉시 해당 단어(wordId)에 append되고 그 단어 전체로 Delaunay 재계산(append-only 캐싱, `syncWord()`).
- **렌더링**: 단어 하나 = draw call 하나. CPU에서 그 단어의 point들(x, y, weight, color, `cellCx/cellCy`)을 RGBA32F 데이터 텍스처(2행×N: row0 = x,y,weight,cellCx / row1 = r,g,b,cellCy)에 패킹하고, 프래그먼트 셰이더가 픽셀마다 power distance(`dist² - weight`)가 최소인 site를 찾아 그 색으로 칠한다 — 폴리곤 클리핑 없이 GPU에서 직접 power diagram 계산. 셀 경계 코너는 smooth-min(`smin`/`smax`)으로 라운딩.
- **음절 실루엣 = 스퀘어클(squircle)** — 음절 하나하나를 스퀘어클로 잘라 "구슬이 이어진" 느낌. `appendSyllable()`에서 `radialWarp()`(위치를 원형으로 압축, 반경 방향 단조 증가라 site 충돌 없음)와 `gain()`(IQ 스타일 bias/gain 곡선으로 셀 크기 축소)를 site 위치/크기(`cellCx/cellCy` → row0.w/row1.w)에 적용. 셰이더는 그 값으로 축별 박스 클리핑을 `edgeDist`에 `smin`.
  > ⚠️ **`gain()`은 반드시 압축 *전* 좌표로 계산한다.** 압축 후 좌표로 계산하면 바깥쪽 셀이 과하게 사라진다.

### 시간 · 크기

- **신호등 랜덤 셀**: 음절당 개수는 `SIGNAL_DENSITY_MIN`/`MAX`(현재 2~3개). 색 인덱스와 state가 `appendSyllable()` 시점에 함께 확정된다(`SIGNAL_STATE_FOR_COLOR` — 빨강→JONG / 초록→CHO / 노랑→JUNG).
- **플래싱 사이클** (음절 단위 자율 순환, `CYCLE_*`/`MONO_*` 상수): 음절 생성 순간부터 무한 반복 `NORMAL`(원본 CA 렌더링) → `BLINK`(모노 흑백 도형 ↔ 원본 교차 노출, `CYCLE_BLINK_RATE_MS` 반주기) → `FREEZE`(CA 전이·밝기 완전 정지) → 다시 NORMAL. 사이클 시작 시각 = `performance.now() + sylIndex * CYCLE_PHASE_STEP_MS`(음절마다 지연 → 신호가 순차 전파). `getCyclePhase()`(JS)와 셰이더가 `u_time`/`u_sylPhaseStart[]`로 **같은 공식을 재현**한다(단일 소스는 JS 상수, `#define`으로 주입). BLINK 모노 도형은 셀의 CA state에 따라 `.`=BLANK / `/`=CHO / `\`=JUNG / `X`=JONG.
- **유휴 정지**: 입력 없이 30초(`IDLE_PAUSE_MS`) 지나면 rAF 루프를 멈춘다. 마지막 화면은 남고 입력이 오면 즉시 재개하며, 멈춰 있던 만큼 `cyclePhaseStart`를 밀어 신호등 위상이 안 건너뛴다. TD에서는 `web_glyph.par.alwayscook = Off`여야 TOP 쿡도 같이 멈춘다.
- **가변 음절 크기**: `calcSignalLatticeSize()`가 `w = clamp((F1-250)/600, 0, 1)`, `scaleX = 1 + (yang ? +1 : -1) * K * w`로 계산(`K`는 파일에서 확인 — 0.2~0.5 사이로 자주 바뀜). 비이중모음은 등방(width = height = `base*scaleX`), 이중모음은 가로축만(`width = base*scaleX`, `height = base`). `update(...,widths,heights)` → `_syncRows`가 음절 item에 `w/h` 부착 → `appendSyllable(...,sylW,sylH)`가 `sylMeta.w/h`에 저장. `offsetX`는 `wordWidth()`(이전 음절 폭 누적합) 기반이고 `recomputeAdjacency`의 `cols`·`_draw`/`_drawWord`도 누적합 기반. 셰이더는 `u_sylOffsetX/Width/Height[MAX_SYL_UNIFORM]` 배열로 픽셀→음절 매핑을 나눗셈 대신 오프셋 구간 탐색으로 한다. squircle은 `radialWarp` 정규화 원을 `sylW×sylH` 박스로 되돌려 비등방 실루엣을 만든다.
- 글자 크기 기준(base)은 `DEFAULT_SYL_SIZE`(현재 180) 하나 — 실제 음절 크기는 `calcShelfLayout`이 음절마다 계산해 넘긴다.

### 색 합성

- **음절 센터 배경 radial gradient**: 셀을 그리기 전 단계에서 각 음절 중심을 기준으로 배경(`BG_GRAY`)보다 밝은 halo가 깔리고 바깥으로 페이드 → 셀 색은 `mix(bg, cellShaded, edge)`로 그 위에 얹힌다. 상수 `SYL_GRADIENT_STRENGTH` / `SYL_GRADIENT_RADIUS_RATIO` / `SYL_GRADIENT_FALLOFF`. 단어 quad 밖(단어 사이 여백)엔 안 깔린다.
- **셀 내부 미세 radial gradient (컬러 모드 전용)**: `cellT = pow(clamp(|v_local - bestPos| / (√bestW * CELL_GRADIENT_RADIUS_RATIO)), CELL_GRADIENT_FALLOFF)`, 채도항 `mix(vec3(luma), color, 1 + CELL_GRADIENT_SAT*cellT)` + 명도항 `*(1 - CELL_GRADIENT_DEPTH*cellT)`, 최종 clamp. 둘 다 `cellT` 구동이라 각 상수가 0이면 그 항만 꺼진다. 기준 반경을 `√bestW`(≈ `currentScale × MIN_DIST`)에 맞춘 것은 셀 크기가 weight로 제각각이기 때문. mono(BLINK) 모드는 `finalColor`를 통째로 덮어쓰므로 영향 없음.

### 글자 영역 — `setRect()` (2026-09-26)

signal은 `positions`를 줄 그룹핑에만 쓰고 실제 x/y는 `_draw()`가 자기 `PAD_X`/`PAD_Y`로 깐다. 그래서 `core.js layoutFor(rect)`만으론 영역이 안 좁혀지고 **`setRect({x,y,w,h})`**(뷰포트 px)를 따로 받는다 — 원점만 rect로 옮기는 것이고, 줄바꿈 폭은 `layoutFor`가 이미 `rect.w` 기준으로 끊어서 넘긴다.

같이 고친 것: `_syncRows()`의 줄바꿈 판정이 uv 고정값(`> 0.05`)이었는데 **px 기준(`sylSize * 0.3`)으로 바꿨다.** 글자 영역이 rect로 좁아지면 같은 줄 간격이라도 uv 차이가 `rect.h/H` 배로 줄어 여러 줄이 한 줄로 뭉쳤다.

### 투명 출력 — 2026-09-26

`new SignalReceiver({ transparentOutput: true })`면 배경을 안 칠하고 **셀 + halo만** 알파로 내보낸다(TD 합성용). 안 주면 예전처럼 `BG_GRAY` 위에 그린다(스탠드얼론 페이지).

분기는 유니폼 **`u_bgAlpha`** 하나(1.0 = 불투명, 0.0 = 투명):

```glsl
vec3 bgCol = mix(vec3(1.0), bg, u_bgAlpha);        // 투명이면 어두운 바탕(BG_GRAY)을 뺀다
float bgA  = max(u_bgAlpha, clamp(gradT * HALO_ALPHA, 0.0, 1.0));
float alpha = mix(bgA, 1.0, edge);                 // 셀 안은 늘 불투명
outColor = vec4(finalColor * alpha, alpha);        // premultiplied
```

**왜 이렇게 분해되나**: `bg = BG_GRAY + SYL_GRAD_STRENGTH * gradT`(0.25 + 0.94·gradT)라 "어두운 바탕 + 중심부 흰 halo" 두 항의 합이다. 투명 모드는 바탕 항을 버리고 halo를 **색이 아니라 알파**로 옮긴다 — 색은 흰색으로 두고 알파를 `gradT`로 주면, 배경 위에 합성했을 때 `white·gradT + 배경·(1-gradT)`가 되어 원래 halo와 같은 인상이 남는다. 멀리서는 `gradT→0`이라 배경이 그대로 비친다.

**불투명 모드는 비트 단위로 그대로다** — `u_bgAlpha = 1.0`이면 `mix(x, y, 1.0) = y`, `max(1.0, c≤1) = 1.0`이라 세 식이 전부 예전 형태로 접힌다. 새 룩을 검증할 땐 스탠드얼론 페이지(`index.html`)가 기준선이다.

`SYL_HALO_ALPHA`(파일 상단) — 투명 모드에서 halo 세기. 0이면 셀만 남는다.

> ⚠️ `clearColor`도 프리멀티플라이드여야 한다 — 투명 모드에선 `(0,0,0,0)`. RGB를 남기면 알파 0인 자리가 그 색으로 칠해진다(sora가 흰 상자를 그리던 것과 같은 사고).

### 제출(submit) 계약 — 2026-09-25 추가

`flushQueue` / `captureFrame` / `clearAccum` 세 메서드. signal은 누적 버퍼도 성장 큐도 없고 매 프레임 `_wordCache`에서 통째로 다시 그리므로 셋 다 얕다.

- `flushQueue()` — `_wake()` 후 2프레임 대기. "자라는 중"인 상태가 없으니(update()가 `_syncRows`로 즉시 반영) 남은 건 24fps 스로틀에 걸린 마지막 상태가 실제로 그려졌는지뿐.
- `captureFrame()` — `u_time`을 0으로 두고 한 장 그린 뒤 `toDataURL()`. 셰이더가 `elapsed = max(0, u_time - u_sylPhaseStart[i])`로 위상을 구하므로 모든 음절이 NORMAL이 된다. **안 그러면 제출 순간 BLINK에 걸린 음절이 흑백 모노 카드로 굳는다.** `init()`의 `getContext('webgl2', { preserveDrawingBuffer: true })`가 전제 — 기본값이면 빈 PNG가 나온다.
- `clearAccum()` — 단어 캐시의 GPU 텍스처 해제 + `_rows`/`_sylItems` 비우고 빈 배경 한 장. 다음 `_animate`를 기다리면 방금 캡처한 화면이 한 프레임 더 남는다.

> 캡처의 투명 여부는 `transparentOutput`을 따라간다 — TD 모드에선 투명 PNG(실측 88% 완전투명), 스탠드얼론에선 불투명. 어느 쪽이든 화면에는 안 쓰이고 아카이빙(PRD 3-E)용이다.

### 죽은 코드 / 미구현

- 구버전 `p.flash` / `pointColor`의 `fv === 1|2` 알파블렌드 분기는 플래싱 사이클로 대체돼 **죽은 코드**다(어디서도 0이 아닌 값으로 안 세팅됨). 임의 삭제 금지 원칙으로 보존 중.
- 플래싱이 순수 타이머 — RGB 색상 분석 결과와 연동하는(예: 빨강 셀이 많으면 FREEZE 유발) 로직은 없다. 구버전 "도형 오버레이 레이어(원/별/사각형)" placeholder는 사라졌고 BLINK 모노 도형이 그 역할을 부분적으로 대체한다.
- **skyline 아이디어**: "고정 박스 + 단어 상한 + 오래된 것 교체" / 빈패킹은 폐기됐었으나, 전시 v2의 말풍선이 다시 유한한 박스(화자당 1개, 문장마다 교체)라 되살릴 여지가 생겼다. 미검토. (Skyline "실루엣"만 원하면 `_draw()`의 `(rowMaxH - wH) * 0.5` → `(rowMaxH - wH)` 한 줄 변경)

---

## 🐚 sora.js — 소라고둥 (WebGL2 / GLSL ES 3.0)

**모티브(패널 기준)**: Sea / 파도소리 — 소라고둥에 귀를 대면 들리는 파도소리를 소재로, 주파수가 시각화된 결과물인 클라드니 도형을 형태 생성 방법으로 삼았다. 구형 공간 안의 클라드니 공식 + 나선형 변형으로 소라의 나선 구조를 의도.

- 클라드니 극좌표 공식을 SDF로 취급 → `smin()`으로 합산
- **단어 슬롯 방식**: 화면의 원 개수 = 단어 수(음절 개수 아님). 각 슬롯은 해당 단어의 마지막 음절 파라미터를 표시하고, 새 음절 입력 시 슬롯 내부에서 m/n 모프(`MORPH_DUR = 0.8s`)
- 슬롯 위치/반경은 wordId별로 화면 내 **랜덤 배정 후 유지** — 고정 레이아웃이 아니며 `positions` 인자는 무시한다
- 그래서 `core.js layoutFor(rect)`가 안 먹고 **`setRect({x,y,w,h})`**(뷰포트 px)를 따로 받는다. 랜덤 uv를 rect 안쪽으로 접고(`_toRect`), 반경 기준도 `rect.h / innerHeight` 배로 줄인다(반경은 y-uv 단위 — 셰이더가 `delta.x`에만 aspect를 곱한다). **이미 자리를 받은 단어는 그대로 둔다** — 자리를 유지하는 게 이 receiver의 규칙이라, rect를 바꿔도 기존 단어는 안 움직인다
- **2026-09-26 프리멀티플라이드 알파 수정** — 캔버스가 `premultipliedAlpha:true`인데 `fragColor = vec4(col, presence)`(곱하지 않은 RGB), `blendFunc(SRC_ALPHA, …)`, `clearColor(0.98, 0.99, 1, 0)`(알파 0인데 RGB는 흰색)이 섞여 있었다. 결과는 **투명해야 할 자리가 흰색으로 칠해지는 것** — 페이지 배경이 흰색이던 시절엔 구분이 안 됐고 TD 투명 합성으로 오면서 흰 상자로 드러났다. 셋을 프리멀티플라이드로 통일(`vec4(col * presence, presence)` / `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` / `clearColor(0,0,0,0)`). 흰 배경 위 룩은 그대로다(예전 clear가 사실상 흰색이었기 때문)
- `M_MAX = 2.0`, `N_MAX = 7.0` (복잡도 상한, 낮출수록 단순)
- 색상: `heatmap3()` — 초성 조음위치(choX)→hue, 긴장도(choZ)→채도, 근접 가중 평균으로 슬롯 간 보간
- displacement(사인/노이즈)로 클라드니 마디선을 비틀어 손그림 느낌 추가
- `sylSize = 150`, `MAX_SYL = 9`(단어 슬롯 최대 개수)

---

### 제출(submit) 계약 — 2026-09-26 추가

sora의 "자라는 중"은 성장 큐가 아니라 **슬롯별 모프**(`MORPH_DUR` 0.8s)와 **파동**(`WAVE_DUR` 2.4s)이다.

- `flushQueue()` — 진행 중인 모프/파동을 목표값으로 **스냅**시키고 2프레임 대기. 실제로 기다리면 파동만 2.4초라 제출이 늘어진다(mycelium `finishGrowing()`과 같은 취지). `_morphStart`/`_waveStart`의 `-999`가 "아주 예전" 센티널이라 거기에 넣으면 t가 곧바로 1.0이 된다.
- `captureFrame()` — `init()`의 `getContext('webgl2', { preserveDrawingBuffer: true })`가 전제. **투명 PNG**다(프리멀티플라이드 수정 이후 도형 바깥이 완전 투명 — 실측 97%).
- `clearAccum()` — 슬롯 배열 전부와 **`_wordPositions`/`_wordRadii`까지** 비운다. 안 지우면 다음 문장의 단어가 이전 문장의 자리를 그대로 물려받는다(wordId가 0부터 다시 시작하므로).

## 🌼 dandelion.js — 민들레 (자모 궤적 + GPU 밀도장 goo)

**모티브(패널 기준)**: Plant / Wind — 식물과 바람이라는 비인간적 수신자.

> 2026-09-25 전면 교체. 구버전("자모→음절→단어" 3단 궤적 + WebGL2 SDF, 2026-08-31 재설계본)은
> 폐기됐다. 필요하면 git 이력에서 꺼낼 것. `update(sylItems, positions, JAMO)` 시그니처와
> `calcTextboxLayout` 사용은 그대로.

엔진은 `receivers/trail/` 에 있고 sketch 프로젝트 `~/sketch/projects/04_trail_gl` 과
**바이트 단위로 동일**하다(`jamoTrail.js` 만 asemic 전용). 스케치에서 튜닝하고 복사해 오는
워크플로 전제 — **엔진을 고칠 땐 양쪽을 같이 맞출 것**. `.frag/.vert/.glsl` 을 직접 import 하므로
`vite-plugin-glsl` 이 필요하다(vite.config.js).

### 파이프라인

1. **자모 → 궤적** (`trail/jamoTrail.js`) — 터틀/펜 모션. 자모가 위치가 아니라 **운동**을 지시한다.
   곡률을 세 성분으로 나눈다: **MEANDER**(사행 — 접힘의 주역), **DC**(완만한 전체 curl, 약하게),
   **AC**(조음방법 질감). 파일 상단 주석에 실패한 두 모델(|회전량| 정규화 / 순회전 1~2바퀴)이
   왜 안 됐는지 남겨뒀다 — 같은 함정을 다시 밟지 않도록.
   - `cho.x` 출발 heading / `cho.y` 곡률 성격(파열=임펄스·마찰=떨림·비음=일정·유음=물결) / `cho.z` 사행 깊이·스텝 지터
   - `F1` 획 길이 / `F2` 사행 파장 수 / `yang` 회전 부호 / `diphthong` 사행 위상 반전 / 종성 = 마지막 15%의 후크·루프
2. **획 단위 = 단어** — 음절 하나는 경로가 200px 안팎이라 동반 곡선 생성기가 놀 공간이 없다.
   단어로 묶으면 1400px 안팎(루프 14~15개). 음절마다 "순 전진 = 1 walk unit"으로 국소 정규화하고
   `wrapStep` 으로 환산 → **append-only**(뒤에 붙여도 앞 좌표가 안 움직임). `LINE_PULL=1` 이라
   각도 오차가 누적되지 않는다.
3. **CPU 경로 가공** (`trail/path.js`) — 리샘플 → 스무딩 → 동반 곡선(점선, 방황·사행·루프 이벤트)·장식 사각형.
   난수는 전부 시드 기반(mulberry32 + FNV-1a)이고 하위 시스템마다 스트림이 분리돼 있다
   (공유하면 `decorGap` 만 바꿔도 루프 위치가 따라 변한다). 난수 소비가 **경로 길이에만** 의존하므로
   점진 렌더와 일괄 생성 결과가 동일하다.
4. **GPU 밀도장 goo** (`trail/field.js`) — 세그먼트를 캡슐 SDF 커널로 누적 텍스처에 인스턴스 스탬프
   (baked = 구운 획 / live = 자라는 획), 합성 패스가 임계 + 셰이딩. 파라미터가 직교한다:
   `reach`(px 사거리) / `th`(≈겹쳐야 하는 선 개수) / `edge`(물렁함).
5. **단어 윤곽선** (`trail/marchingSquares.js`) — 구울 때 한 번, 밀도장을 CPU 격자로 다시 계산해
   등고선을 **폴리라인**으로 뽑는다(셰이더 isoline 과 달리 점선·벡터가 가능). 단어당 닫힌 윤곽선 1개, ~7ms.

### 점진 렌더 · 한글 조합

- `growPx` px/frame 으로 큐에서 획이 자란다. **프레임 기준**이라 120Hz 에선 2배 — `advanceGrowing()` 한 줄로 dt 기반 전환 가능.
- 타이핑 중인 단어는 `hold` 상태라 끝에 도달해도 완성되지 않고 음절이 더 붙기를 기다린다. 공백(`finishGrowing`)/제출(`flushQueue`)에서 구워진다.
- **`UNSTABLE_TAIL = 2`** — 한글은 종성이 다음 글자 초성으로 넘어간다("반가"+ㅇ→"반강"→"반가우").
  이때 이미 그려진 *중간* 음절이 바뀌므로 뒤 2음절을 불안정으로 보고 `replaceTail()` 로 갈아끼운다.
  소비량을 유지해서 끝이 움찔거리지 않는다. (1로 두면 연음마다 단어 전체가 다시 그려진다)
- 앵커가 움직이거나(줄바꿈) 안정 구간이 깨지면 전면 재구성 — 결정론 덕분에 같은 글자는 같은 모양으로 복원된다.

### 출력 · 정리

- 합성 셰이더는 **straight alpha** 로 잉크만 낸다. 종이색은 캔버스 CSS 배경 → 화면은 그대로, `captureFrame()` 은 투명 PNG(99% 투명). 불투명이면 히스토리에서 앞 턴을 덮어버린다.
- `dispose()` 가 리스너·캔버스 2장·body 배경을 전부 되돌린다. **`keys` 옵션은 끈 채로 둘 것** — 켜면 `c`/`z`/`s` 가 한글 입력창을 가로챈다.
- `sylSize = 110`, `wrapStep = 130`, `lineHeightRatio = 1.8`
- 자주 바뀌는 값: `CFG_OVERRIDE`(dandelion.js 상단, goo/grow/part/outline 포함), `jamoTrail.js` 의 `MEANDER_*` / `DC_TURNS` / `AC_TURN` / `JOIN_STEER` / `LINE_PULL`
- 성장장·파티클 레이어는 구현돼 있으나 **기본 off** (`grow.on` / `part.on`)
- 콘솔: `rm.current.cfg()` / `rm.current.engine()` / `rm.current.setGenerator('anchor')`(구 앵커 보간 방식과 A/B)
