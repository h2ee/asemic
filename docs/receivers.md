# 수신자별 구현 레퍼런스

> 각 receiver의 내부 구현·알고리즘·함정. **해당 파일을 건드리기 전에 그 항목을 읽을 것.**
> ⚠️ 숫자 상수는 h2ee가 자주 바꾼다 — 이 문서의 값은 참고용, 실제 값은 파일에서 확인.

공통 인터페이스는 `src/js/receivers/ReceiverManager.js` (init / update / dispose + registry).
레지스트리에 등록된 건 `sora`, `signal`, `dandelion`, `mycelium` 네 개. 기본값은 `mycelium`.
PNG 굽기(bake.html / bake-text.html)가 전시와 다르게 그리는 부분은 맨 아래 [bake 절](#-bake--전시-화면과-다른-점).

**submit 계약** (`flushQueue` / `captureFrame` / `clearAccum` / `finishGrowing`) 구현 현황:

| receiver | 구현 | 비고 |
| --- | --- | --- |
| mycelium | ✅ | |
| dandelion | ✅ | |
| signal | ✅ | 2026-09-25 |
| sora | ✅ | 2026-09-26 |

---

## 🍄 mycelium.js — 균사체 (기본 수신자, 가장 진행된 상태)

**모티브(패널 기준)**: Language / mycelium network — 균사체가 위험신호 등을 주고받는 네트워크라는 점에서, 이전 음절에 닿도록 뻗는 연결 실 구조가 유래했다(강한 소리가 나는 자음에서 트리거).

- Three.js + GLSL 레이마칭, **3-pass**: grow(1음절만) → accum(ping-pong 누적) → display
- `syllablePath`: ep1/ep2/ep3(3중 에피사이클, alien.js 원형) + **ep4**(작은 에피사이클, 균사 끝 미세 흔들림)
- `map()`: 캡슐 경로 SDF + **lump(혹)** 시스템(경로 위 20~54개 구, stratified 분산, growT 따라 순차 등장) + **연결 실(mother tree hub)** 시스템
    - 허브 등록: 음절 확정 시 `cho.y < 0.75`(비음/유음 제외)면 허브 후보로 등록
    - 연결 트리거: 된/거센소리(`cho.z >= 0.65`) / 연음(이전 종성 + 현재 초성 ㅇ) / 종성 존재 — 만족 개수로 연결 0~2개, `connections+1` 가중치로 rich-get-richer 선택
    - `u_hubCenters[2]`, `u_connCount` uniform으로 셰이더에 전달
- 재질: 4단 toon diffuse + 검은 edge glow(`rim² × 1.68`). 몸통(경로)은 회색(`monoCol`, 초성색 대신 0.48), **혹(구슬)만 색**(`baseCol × 0.95`), 이음매는 `g_matID`(smooth union 폭 0.012)로 섞인다
    - **혹 색 = 초성 좌표 그대로 RGB** — `choCol = u_cho`(R = 조음위치 x, G = 조음방법 y, B = 긴장도 z, `jamo_data.csv` 값). HSL 매핑 `choToColor()`는 주석 처리돼 안 쓴다. 중성·종성은 색에 안 들어간다. `u_cho`가 음절마다 하나라 한 음절의 혹은 전부 같은 색
    - 명암: `mix(choCol, 거의 흰색, 3 − band) × 1.2`. 조명 L(정규화 안 함, 픽셀마다 xz 지터 = 띠 경계 점묘)이라 diff가 1을 넘는다 — diff ≥ 1 면만 초성색(≥ 1.5면 비율이 음수라 더 진해짐), 그늘(diff < 1)은 흰 쪽으로 외삽돼 거의 흰색. 즉 **빛 받는 면에만 색, 그늘은 하얗게** 날아가는 반전 명암
    - 초성은 혹 개수(`20 + z·34`)·배치 난수 씨앗(`x·13.7 + z·5.3 + …`)도 정한다
- `sylSize = 100`, `lineHeightRatio = 4.0`, `layoutScale = {x:1.28, y:1.0}` (카메라 오프셋 보정용)
- 배경색 `vec3(0.7)` (회색)
- **해상도 독립 (2026-09-26)** — 글자 모양은 `sylSize/H` 비율 하나로 정해진다(셰이더의 캡슐 반경·혹·노이즈가 월드 상수라서). `refHeight`(859)를 들고 있으면 `layoutFor`가 px 값을 `H/refHeight` 배로 스케일 → 어느 화면에서든 맥북 브라우저에서 잡은 룩 그대로
- **배치 = 정확한 역투영** — `screenToWorld(u,v)`가 셰이더 광선식을 뒤집어 음절 중심을 z=0 평면에 놓는다. 예전 `sceneH`/`layoutScale`/`startOffsetX` 근사(화면 중심 쪽으로 가로 0.91·세로 0.71배 압축)는 `project` 없을 때의 fallback으로만 남음
- **`glyphExtent`(1.5)** — 음절 중심→글자 끝(sylSize 배수). `layoutFor(rect)`가 이걸로 가장자리 여백을 잡고, 아래로 넘치면 `FIT_STEPS`로 단계 축소(번역기 입력창식)
- **균일 스케일 `u_glyphScale`** — 단계 축소·크기 노브로 작아질 때 모양은 늘 기준 크기(`layoutFor`의 `glyphScale` = 지금 sylSize ÷ 노브 안 댄 기본 sylSize×H/refHeight)로 계산하고, 셰이더가 음절 중심 기준으로 통째로 줄인다: `map(p) = s·map_ref(center+(p−center)/s)`, 명중 임계 `EPS·s`, 법선 오프셋 `0.005·s`, bump는 기준 공간 좌표, 허브도 기준 공간으로 변환. 안 그러면 `rad`/혹/노이즈가 월드 상수라 작을수록 두꺼워 보인다. 실측: s=0.72 면적비 0.518(=s²), s=0.5 0.249 — bbox도 정확히 s배. 브릿지 `param{size}`(TD 시절 노브)는 기본값 자체를 바꾸므로 모양이 바뀐다(노브 `size`는 균일 스케일 — 2026-10-08부터 배치는 그대로 두고 글자마다 중심 기준으로만 커진다)
- **크기 변경 시 재굽기** — `update()`가 이미 있던 음절 중심이 움직였으면 `_rebake()`로 전부 instant 재굽기. 연결 실은 `_sylHubIds`에 기억해 둔 허브에 그대로 다시 붙는다(랜덤 재선택 없음)

**GPU 비용 (2026-09-26, M3 Max · 2560×1440 · 음절 한 패스)** — 처음엔 growT=1 한 패스가 **392~482ms**라 TD(같은 GPU)가 fps 1~5로 떨어졌다. 두 가지로 줄였다:
- **경계 판정** `hitSyllableBounds()` — 광선이 음절 경계 구(`1.3·amp` 또는 `|u_end|` + `BOUND_MARGIN`)와 연결 실 캡슐에 안 닿으면 레이마칭 생략. 닿는 픽셀은 예전 그대로라 **비트 단위 동일**(실측 diff 0). 글자 끝이 잘려 보이면 `BOUND_MARGIN`을 올릴 것
- **경로 사전계산** `pathFrag` → `_pathTarget`(151×3 float) — 경로 점·테이퍼 노이즈·혹 위치를 음절마다 `_dequeue()`→`_bakePath()`에서 한 번 굽고 `map()`은 읽기만. `u_usePathTex=0`이면 예전 직접 계산(비교용). 실루엣 가장자리 픽셀 수십 개만 float 오차로 다름
- 결과: growT 0.5 → 21ms, growT 1 → 49ms, 연결 실 2개 → 66ms (처음 대비 ~8~10배)
- 측정은 당시 TD에서 `web_glyph.executeJavaScript()`로 페이지 안에 프로브를 넣고 `bridge.send({t:'jserror'})`로 받아 `bridge.par.Lasterror`에서 읽었다. ANGLE에선 `gl.finish()`가 안 기다리므로 `readPixels(1px)`로 동기화해야 시간이 잡힌다

**프레임레이트**: 성장 루프가 자체적으로 24fps로 스로틀된다(`_FRAME_INTERVAL = 1000/24`) — webrenderTOP의 `maxrenderrate=24`에 맞춘 값. `growT`는 **렌더된 프레임당** `prev + (1-prev)*0.08`로 전진하며 경과시간 기준이 아니다.

**사운드 훅**: `emitsSyllableStart = true` — `_dequeue()`가 instant가 아닌 음절을 꺼낼 때 `onSyllableStart(item.syl)`를 부른다(`ReceiverManager`가 페이지로 넘김). `item.syl`은 큐에 넣을 때의 스냅샷이라 그 뒤 붙은 받침은 페이지의 `lateEnding`이 처리한다. 다른 3종은 이 훅이 없어 페이지가 입력 순간에 대신 울린다 — 같은 훅을 달면 페이지 대체 트리거는 자동으로 꺼진다

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
- **플래싱 사이클** (음절 단위 자율 순환, `CYCLE_*`/`MONO_*` 상수): 음절 생성 순간부터 무한 반복 `NORMAL`(원본 CA 렌더링) → `BLINK`(시작부터 `CYCLE_BLINK_MONO_MS` 동안 모노 흑백 도형 → 남은 시간 원본) → `FREEZE`(CA 전이·밝기 완전 정지) → 다시 NORMAL. 사이클 시작 시각 = `performance.now() + sylIndex * CYCLE_PHASE_STEP_MS`(음절마다 지연 → 신호가 순차 전파). `getCyclePhase()`(JS)와 셰이더가 `u_time`/`u_sylPhaseStart[]`로 **같은 공식을 재현**한다(단일 소스는 JS 상수, `#define`으로 주입). BLINK 모노는 `MONO_STYLE`로 갈린다 — **`'ascii'`(기본, 2026-10-17)**: 단어 로컬 좌표를 `ASCII_PITCH`×`u_cellSize` 고정 격자로 나누고 칸 중심 아래 site의 state가 글자 줄을, 그 셀의 크기(squircle 축소 Cx·Cy ×1.4의 기하평균 — 같은 state 안에선 이것만 크기를 가른다)가 줄 안의 글자를 큰 순으로 고른다(`ASCII_GLYPHS` — CHO `$%#&+÷-` / JUNG `8965023471` / JONG `WBRNSCXLI` / BLANK `?!:·` — 잉크 많은 순(Zalando Sans Expanded 400 알파 합, 숫자는 값과 무관), 실루엣 가장자리로 갈수록 오른쪽 글자). 글자 고르는 기준은 `ASCII_PICK` — `'distance'`(기본): site의 음절 중심 거리(반폭/반높이 정규화, `ASCII_DIST_RANGE`·`ASCII_DIST_CURVE`)로 매끄럽게 / `'size'`: 셀 크기를 `ASCII_SPLIT` [경계, 몫]으로 비대칭 — 경계~1에 앞쪽 몫만큼의 글자(가운데 고원 = 크기 정확히 1인 셀은 늘 0번). 셀 크기는 글자 크기도 정한다(`ASCII_GLYPH_SCALE` [바깥, 안쪽], 칸 가운데 기준 축소 — 칸 하나에서 읽으므로 1이 최대). 굵기 레벨(`ASCII_FONT_WEIGHTS` — 가변 폰트 wght, 예전 Inconsolata 땐 stroke 덧칠)은 `ASCII_WEIGHT_BY` — `'pick'`(기본): 글자 고르기와 같은 값으로 안쪽 굵게 → 바깥 가늘게 / `'brightness'`: CA 밝기(row2.y, 1~2.5 → 0~1, 주변 BLANK와 비교한 값이라 구멍 가장자리만 굵어진다). 글자는 시작 때 Canvas 2D로 구운 아틀라스(폰트 = Zalando Sans Expanded, `public/fonts/` 파일을 signal이 FontFace로 직접 싣는다. 폭 넓은 비례 폰트라 가장 넓은 글자가 칸 폭 `ASCII_FONT_FIT` 안에 들도록 전체 크기를 줄여 굽는다)(`buildAsciiAtlas`, TEXTURE1), 칸 중심에서 가장 가까운 site가 `ASCII_FILL`×MIN_DIST 안이고 셀 크기가 `ASCII_MIN_SIZE` 이상이면(맨 바깥 고리 = 컬러에서 실처럼 가는 셀은 뺌, 글자 고르기는 [MIN, 1]을 나눔) 흰 글자만 그리고(처음엔 squircle 박스로 판정했는데 박스가 |g|≈0.35부터 셀 간격 절반보다 좁아져 격자와 엇박인 줄·열이 통째로 빠졌다) 바탕은 배경 그대로(모노 동안은 음절 센터 halo도 끈다 — 흰 글자가 glow에 묻혀서. 투명 모드면 글자 말고는 완전 투명. 처음안의 흰 칸 + 검은 글자는 주석으로 남김). 모노 차례도 칸 중심의 음절로 판정(글자가 반쪽만 안 바뀌게). **그런지 displacement(실험)** `ASCII_DISPLACE` — 포토샵 Displace처럼 맵 R/G(0.5 = 그대로)만큼 ASCII를 읽는 좌표(`aP` — 칸·site·글자 전부)를 ±px 민다. 맵은 화면 좌표에 고정·거울 반복(TEXTURE2) — `img` = `public/imgs/grunge.jpg`(회색조 사진, `imgScale`로 비율 그대로), 없으면 `buildGrungeCanvas()`의 절차적 임시 그런지. 기준값 = 맵 평균(밝은 사진이 글자를 한쪽으로 통째로 밀지 않게), 회색조라 R = G라서 세로(G)는 `gOffset`만큼 비켜 읽어 대각선으로만 휘지 않게. 컬러 모드(와 shape 모노)도 같은 맵 — `colorPx`(0 = 끔), main() 첫머리에서 민 좌표 `cL`을 컬러 경로 전체(음절 판정·site·halo·가장자리)가 v_local 대신 쓴다. ASCII는 자기 `aP`를 v_local에서 따로 민다(두 번 밀리지 않게). mip 선택은 밀리기 전 좌표(`cellD`)의 미분으로. **선명도**: `ASCII_INK_LOD`(미분 배율 — 덜 흐린 mip) + `ASCII_INK_SHARP`(잉크를 0.5 근처 smoothstep으로 자름) — 아틀라스를 크게 줄여 읽어 획 가장자리가 흐렸다. 아틀라스는 `textureGrad`로 읽는다 — `fract` 경계에서 mip이 튀어 이음선이 생기므로. `'shape'`: 예전 SDF 도형(셀마다 `. / \ X` 선 + 셀 테두리, `MONO_*` 비율).
- **유휴 감속** (2026-10-17, 예전엔 유휴 정지): 입력 없이 30초(`IDLE_PAUSE_MS`) 지나면 프레임을 `IDLE_FPS`(7)로 낮춘다. 신호등 사이클은 wall-clock이라 속도 그대로, CA 스텝도 그대로(60Hz에서 7fps = 150ms 간격 = 평소 스텝 간격), 셀 크기 보간(매 프레임)만 느려진다. 입력·리사이즈·스크롤이 `_wake()`로 `_lastActivity`를 갱신해 24fps로 돌아온다. 예전 정지 코드와 `_wake()`의 `_paused` 복귀 분기(멈춰 있던 만큼 `cyclePhaseStart`를 미는 것)는 기록으로 남김. (TD 임베드 시절엔 `web_glyph.par.alwayscook = Off`여야 TOP 쿡도 같이 멈췄다.)
- **가변 음절 크기**: `calcSignalLatticeSize()`가 `w = clamp((F1-250)/600, 0, 1)`, `scaleX = 1 + (yang ? +1 : -1) * K * w`로 계산(`K`는 파일에서 확인 — 0.2~0.5 사이로 자주 바뀜). 비이중모음은 등방(width = height = `base*scaleX`), 이중모음은 가로축만(`width = base*scaleX`, `height = base`). `update(...,widths,heights)` → `_syncRows`가 음절 item에 `w/h` 부착 → `appendSyllable(...,sylW,sylH)`가 `sylMeta.w/h`에 저장. `offsetX`는 `wordWidth()`(이전 음절 폭 누적합) 기반이고 `recomputeAdjacency`의 `cols`·`_draw`/`_drawWord`도 누적합 기반. 셰이더는 `u_sylOffsetX/Width/Height[MAX_SYL_UNIFORM]` 배열로 픽셀→음절 매핑을 나눗셈 대신 오프셋 구간 탐색으로 한다. squircle은 `radialWarp` 정규화 원을 `sylW×sylH` 박스로 되돌려 비등방 실루엣을 만든다.
- 글자 크기 기준(base)은 `DEFAULT_SYL_SIZE`(현재 180) 하나 — 실제 음절 크기는 `calcShelfLayout`이 음절마다 계산해 넘긴다.

### 색 합성

- **음절 센터 배경 radial gradient**: 셀을 그리기 전 단계에서 각 음절 중심을 기준으로 배경(`BG_GRAY`)보다 밝은 halo가 깔리고 바깥으로 페이드 → 셀 색은 `mix(bg, cellShaded, edge)`로 그 위에 얹힌다. 상수 `SYL_GRADIENT_STRENGTH` / `SYL_GRADIENT_RADIUS_RATIO` / `SYL_GRADIENT_FALLOFF`. 단어 quad 밖(단어 사이 여백)엔 안 깔린다.
- **셀 내부 미세 radial gradient (컬러 모드 전용)**: `cellT = pow(clamp(|v_local - bestPos| / (√bestW * CELL_GRADIENT_RADIUS_RATIO)), CELL_GRADIENT_FALLOFF)`, 채도항 `mix(vec3(luma), color, 1 + CELL_GRADIENT_SAT*cellT)` + 명도항 `*(1 - CELL_GRADIENT_DEPTH*cellT)`, 최종 clamp. 둘 다 `cellT` 구동이라 각 상수가 0이면 그 항만 꺼진다. 기준 반경을 `√bestW`(≈ `currentScale × MIN_DIST`)에 맞춘 것은 셀 크기가 weight로 제각각이기 때문. mono(BLINK) 모드는 `finalColor`를 통째로 덮어쓰므로 영향 없음.

### 배치 — `calcShelfLayout`이 원본 (2026-10-08)

`core.js calcShelfLayout`이 음절 **중심**(positions)·폭·높이를 정하고 `_draw()`는 그걸 그대로 그린다 — `_syncRows`가 단어마다 첫 음절 왼쪽 위를 `ws._origin`에, 음절마다 단어 안 x(`sylMeta.x`, 자간 포함)를 둔다. 줄 구분은 x가 뒤로 돌아가는 것으로 본다(y는 음절 높이마다 달라서 못 씀). 단어는 줄 안 세로 가운데, 음절은 단어 박스 위쪽 정렬. 띄어쓰기 = `sylSize × SHELF_WORD_GAP`(0.6).

- **자간**: `layoutFor`가 `letterGap = (wrapStep − _ctlBase.wrapStep) × z`를 넘긴다 — 노브 가운데면 0(음절이 붙은 기본 룩), 줄이면 음수(겹침). 하한은 `minSpacing`(×0.96) — 그보다 겹치면 형태가 무너진다. 셰이더의 `u_sylOffsetX`도 `sylMeta.x`라 틈 픽셀은 site 박스 클리핑으로 비어 보인다.
- **크기·자간이 바뀌면 단어를 다시 만든다** — 점은 생성 때 크기로 박히므로 `syncWord`가 글자뿐 아니라 w/h/x도 비교한다. 다시 만들 때 `cyclePhaseStart`와 텍스처는 이어받는다.
- 예전(2026-09-26)엔 `_draw()`가 `PAD_X/PAD_Y`로 직접 깔고 rect는 `setRect()`로 받았다. 지금 `setRect()`는 값만 든다 — 영역은 `layoutFor(rect)`가 positions에 넣는다.

### 세로 scroll — 2026-10-08

`scrollTo(t)`는 `scrollBase`를 바로 t로 두고(페이지가 positions에서 뺀다) 화면은 `_slide`만큼 뒤처져 있다가 그린 프레임마다 `SCROLL_EASE`(0.12)로 따라간다 — `_draw()`가 단어 원점에 `_slide`를 더할 뿐, 단어 캐시는 안 건드린다. 줄 높이가 음절마다 달라서 `layoutFor`는 줄 번호가 아니라 첫 줄·마지막 줄 아래끝 차로 `scrollY`를 잰다.

### 투명 출력 — 2026-09-26

`new SignalReceiver({ transparentOutput: true })`면 배경을 안 칠하고 **셀 + halo만** 알파로 내보낸다(output.html — 배경은 페이지 CSS가 깐다). 안 주면 예전처럼 `BG_GRAY` 위에 그린다(index.html 스탠드얼론).

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

> 캡처의 투명 여부는 `transparentOutput`을 따라간다 — output.html에선 투명 PNG(실측 88% 완전투명), 스탠드얼론에선 불투명. 어느 쪽이든 화면에는 안 쓰이고 아카이빙(PRD 3-E)용이다.

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
- 색상: `heatmap3()` — 초성 조음위치(choX)→hue, 긴장도(choZ)→채도. **2026-10-28부터 단어 원마다 고유 색** — 초성 값은 가장 가까운 원(중심까지 거리 / 반경)을 따르고 경계에서만 `COLOR_BLEND_K`(20) 폭으로 섞는다. 그 위에 색 띠 몫 `(0.5, 0.33)·(d²+0.001)`(d = 합친 무늬)을 얹는다 — 예전 식(초기값 0.5/0.33에서 SDF 1/d² 가중평균)을 원 하나일 때 그대로 풀어 쓴 것이라 단어 하나면 예전과 픽셀까지 같다. 예전 식은 원이 여럿이면 가중치 합이 커져 색 띠가 바래고 초성끼리 평균이 돼서, 문장 안 단어 원들이 단독일 때보다 옅고 비슷했다
- displacement(사인/노이즈)로 클라드니 마디선을 비틀어 손그림 느낌 추가
- **종성 → 나선 잔물결 (2026-10-28)** — 사인 displacement `sin(r·freq + θ·2 + phase)`의 r 주파수 = 종성 조음방법(`JONG_FREQ`), 위상 = 조음위치 × `JONG_PHASE`(1.5π). 받침 없음 = (12, 0)으로 예전 그대로. 본체(m·n)·색·팔 수(θ 계수 2)는 안 건드려서 받침만 다른 글자는 "같은 집안, 다른 결"로 보인다. m/n과 같이 `MORPH_DUR` 모프(`u_ripplePrev` → `u_ripple`)
- `sylSize = 150`, 화면에 띄우는 단어 수 `maxWords` = `MAX_WORDS` 9 (bake-text 박스 나누기는 남는 단어가 `MERGE_WORDS` 3개 이하면 앞 박스에 붙인다 — `wordBoxSizes`. 전시는 안 씀). 셰이더 슬롯 상한 `MAX_SYL`은 32(2026-10-28) — bake-text가 한 행의 문장들을 한 캔버스에 그릴 때만 `maxWords`를 늘린다. 셰이더 루프는 `u_sylCount`에서 끊겨 전시 비용은 같다
- **음절 네모 = 단어마다 하나 (2026-10-08)** — `wordAnchors()`가 떠 있는 원들의 중심·보이는 반경(px)을 내놓고, 페이지(`sylTags`)가 원 가운데 아래(`SORA_TAG_Y` × 반경)에 그 단어 음절을 한 네모에 이어 붙인다(관람객 = 원문, 수신자 = 구조 블록 여럿). 세로 scroll은 없다(랜덤 자리라 줄 개념이 없음)
- **LLM 드러내기 0.8자/초** (`llm.js revealRateFor.sora`, 다른 수신자 2) — 2자/초면 모프가 끝나기 전에 다음 음절이 덮는다

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

엔진은 `receivers/trail/` 에 있다. sketch 프로젝트 `~/sketch/projects/04_trail_gl` 에서 왔고
예전엔 바이트 단위로 동일하게 맞췄지만, **2026-10-27부터 sketch와 맞추지 않는다** — 엔진은
asemic 쪽에서 직접 고친다(첫 분기: `createTrail({ dprCap })`, bake 고해상도용). `.frag/.vert/.glsl` 을 직접 import 하므로
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
   각도 오차가 누적되지 않는다. 순 전진에는 하한(`NET_FLOOR` = 음절 bbox 긴 변 × 0.4)이 있다 —
   이중모음처럼 획이 출발점 근처로 되돌아오는 음절이 `wrapStep` 의 17배까지 커지던 것을 막는다(2026-10-27).
3. **CPU 경로 가공** (`trail/path.js`) — 리샘플 → 스무딩 → 동반 곡선(점선, 방황·사행·루프 이벤트)·장식 사각형.
   난수는 전부 시드 기반(mulberry32 + FNV-1a)이고 하위 시스템마다 스트림이 분리돼 있다
   (공유하면 `decorGap` 만 바꿔도 루프 위치가 따라 변한다). 난수 소비가 **경로 길이에만** 의존하므로
   점진 렌더와 일괄 생성 결과가 동일하다.
   - **구간 계획 `plan` (2026-10-01)** — 획을 음절 구간 `[{px0, seed}]` 으로 나누고 동반 곡선·루프·장식·orb·선 효과·reach 변화를
     전부 (음절 시드, 음절 안 국소 px)의 순수 함수로 만든다. 시드 = 음절 내용(`hashSeed('syl', cho, jung, jong)`)이라
     **같은 음절은 어느 단어·자리에서든, ㅇ→아→안 으로 쳤든 한 번에 '안'이든 같은 모양**(브라우저에서 픽셀 동일 확인).
     예전엔 단어 시드가 *큐에 처음 들어간 순간의 키*로 고정돼(replaceTail 이 시드를 유지) 타이핑 경로마다 점선이 달랐다.
     경계는 `segBlend`(24px) 크로스페이드. plan 이 없으면(sketch 마우스) 한 구간 = 예전과 같은 난수 순서
   - 구간 경계는 `jamoWordTrail(..., meta)` 가 `meta.starts` 로 알려 준다. 동반 곡선은 스무딩으로 짧아진 기준 경로 위에서
     만들어지므로 경계·루프 위치를 `toBase` 로 옮긴다 — 안 하면 뒤 음절 경계가 앞 음절 모양에 따라 수십 px 밀린다
4. **GPU 밀도장 goo** (`trail/field.js`) — 세그먼트를 캡슐 SDF 커널로 누적 텍스처에 인스턴스 스탬프
   (baked = 구운 획 / live = 자라는 획), 합성 패스가 임계 + 셰이딩. 파라미터가 직교한다:
   `reach`(px 사거리) / `th`(≈겹쳐야 하는 선 개수) / `edge`(물렁함).
   - `goo.reach` 를 `[lo, hi]` 로 주면 경로를 따라 노이즈로 오간다(파장 `reachLen`). 커널이 길이로 정규화돼 코어 밀도는 R 과 무관
   - **`goo.compCap`** — 동반 곡선 밀도를 `.a` 채널에 따로 쌓고 읽을 때 soft cap(`c/(1+(c/cap)^4)^¼`)으로 눌러 더한다.
     점선 자기 겹침(올록볼록 반복 goo — mycelium 캡슐과 닮아 보이던 것)은 cap 을 못 넘고 실선과의 교차만 임계를 넘는다.
     0 = 끔(예전). th 1.8 기준 1.0 이면 점선 고리 goo 가 거의 사라진다. th 이상이면 효과 없음. 바꾸면 `engine().replay()`
5. **단어 윤곽선** (`trail/marchingSquares.js`) — 구울 때 한 번, 밀도장을 CPU 격자로 다시 계산해
   등고선을 **폴리라인**으로 뽑는다(셰이더 isoline 과 달리 점선·벡터가 가능). 단어당 닫힌 윤곽선 1개, ~7ms.
   `outline.anim.on` 이면 획 시작점(`spine[0]`)에 가장 가까운 꼭짓점에서 출발해 `speed` px/s 로 한 바퀴 돌아 닫힌다
   (진행 중엔 오버레이, 다 돌면 ink2d 로 확정. `flushQueue`/`replay` 는 즉시 완성)
   - **`outline.live` (2026-10-09)** — 자라는 중에도 `interval`(ms)마다 윤곽선을 다시 뽑아 실선과 같이 자란다(한 단어 ~6ms). 켜면 위 `anim`은 안 쓴다. 구울 때 최종 기하로 한 번 더 계산(`dropLiveCache`)
   - **`outline.glow` (2026-10-16)** — 검정 선 대신 바깥으로 옅어지는 띠. `steps` 겹의 넓이·알파를 맞춰 윤곽 `edge` → `width` px 바깥 0으로 선형, 그린 뒤 모든 획의 윤곽 안을 지워 바깥만 남긴다. 스티플에 밀려 지금은 안 쓴다(켜 둬도 stipple 이 우선)
   - **`outline.stipple` (2026-10-16, 현행 — 노란 점 띠)** — 같은 그라데이션을 점 밀도로(켜면 glow 대신). `gap` = 블록 윤곽에서 띄우는 거리. 화면 고정 지터 격자 칸마다 윤곽 거리로 생존 확률, 점은 원 두 개 겹친 콩 모양. 획마다 bbox 캔버스에 구워 두고 붙이기만 — **Path2D/ellipse로 바꾸지 말 것**(수천 개면 수십~백 ms). 부채로 윤곽이 계속 바뀌는 획은 한 그리기 1획·`interval` ms 제한. 윤곽 안 칸엔 점을 안 둔다(스캔라인) — 지우개로 지우면 경계 점이 반쪽이 된다. `px` > 0 = 저해상도 + 알파 이진화 + nearest
   - **`bead.main.stipple` (2026-10-16)** — main bead 의 radial glow 를 점 밀도로. 스프라이트 `frames`장을 미리 찍고 `fps`로 바꿔 끓게. 점 설정은 outline.stipple 을 따르되 size/cell 은 따로
   - **`halo` (2026-10-09)** — 윤곽선 뒤 픽셀 블록(처음엔 회색, 지금은 초록 그라데이션). 같은 밀도장(`reach`/`th` null = outline 값)을 화면 고정 격자 `cell` px의 칸 중심에서 재서(`wordCells`) 넘는 칸을 칠한다. underlay(orb 아래)에 깔리고 자라는 획도 `interval`마다 다시 잰다. 격자 원점 `ox`/`oy`는 dandelion.js `update()`가 스크롤만큼 민다. `fill`은 불투명으로(겹친 칸이 두 번 칠해지지 않게 — 옅게는 `opacity`)
     - `halo.gradient` (2026-10-16) — 켜면 fill 대신 linear gradient. `whole: true` = 단어 블록 범위(`cellsBox`)에 하나 / false = 칸마다 같은 타일 패턴 반복(`haloFill`, 각도·톤별 패턴 캐시)
     - `gradient.perSyl` (2026-10-16~17, whole false 일 때) — 칸을 가장 가까운 실선 점의 음절(구간)별로 묶어 `plan[j].haloAngle`(0/90/180/270)과 `plan[j].haloTone`({h,s,l} HSL 이동)으로 칠한다. dandelion: 각도 = 중성이 뻗는 쪽(`HALO_VOWEL_DIR` — ㅏ계 0 / ㅜ계 90 / ㅓ계 180 / ㅗ계 270, 겹모음은 앞 글자, ㅡ ㅣ ㅢ 는 초성 조음위치 `HALO_CHO_DIR`), 톤 = 초성 x→색상 / y→채도 / z→명도(`HALO_TONE`)
     - `halo.edge` (2026-10-17) — 블록 덩어리(구운 것 + 자라는 것 + 부채 칸) 바깥 테두리. 덩어리를 edge 색으로 물들인 `edge2d`를 8방향 `width` px 밀어 깔고 그 위에 블록. invert 모드에서만 켠다
6. **장식 레이어 (2026-10-01)** — 전부 `CFG_OVERRIDE` 에서 `on` 으로 켜고 끈다
   - `spineFx` — 실선에 Roughen(`size`/`gap`/`mode` smooth·corner) · Pucker&Bloat(`amount` +bloat/−pucker, `gap`).
     `target:'ink'` 는 2D 실선만, `'all'` 은 goo·윤곽선까지
   - **`spineCasing` (2026-10-16)** — 메인 실선 = 흰 몸통 + 검정 테두리. 테두리를 전부 긋고 몸통을 전부 칠해 자기 교차·가시(`orb.spike`)가 한 몸으로 이어진다(`drawStrokeInk`). 끄면 `baseStyle`·`lineWidth` 한 줄
   - `bead` — 실선을 타고 `speed` px/s 로 흐르는 구슬 여럿. 굽지 않고 매 프레임 오버레이에 그린다. `shape`: 'circle' / 'star'(`*`) / 'glyph'(✦✢✤ 중 하나, 위치와 별도 난수열), `cluster`로 무리 짓기. **dandelion 은 지금 끔**(`bead.on: false`)
   - **`bead.walker` (2026-10-16) — 도장 찍는 bead** — 단어마다 하나가 왕복하며 ✦(끝 뾰족·가운데 뚱뚱) ↔ ✤(끝 둥긂·가는 목)로 morph(`MORPH_A`/`MORPH_B` cubic 제어점 보간), `every`초마다 `prob`로 발동해 `gap`px 간격 `count`개 발자국, 단어당 `max`개(넘으면 오래된 것부터 즉시 사라짐). 상태 없이 (시드, 시각)의 순수 함수 + 단어 키(시드·순번·길이)별 처음 본 시각(`stampEpochs`)이라 전면 재구성에도 유지, `resetStamps()`(clearAccum)로 잊는다. 크기는 지나는 음절의 `plan[j].walkerSize`(dandelion `ORB_JAMO.walkerSize` ← 초성 z). 자라는 획은 다 자란 뒤부터. dandelion 은 h2ee가 꺼 둔 상태(2026-10-17)
   - `bead.main` — 획마다 하나, 실선을 **왕복**(ping-pong — 끝에서 처음으로 순간이동하지 않음)하는 큰 원.
     `fps` > 0 이면 위치를 초당 fps 번만 갱신해 끊기며 움직인다(2026-10-16 — 이걸 따르는 부채 펼침도 같이 끊김).
     `waitLive`(2026-10-17)면 입력 중인 획에선 실선 끝(머리)에 붙어 있다가 완결되면 그 끝에서 출발해 왕복 — 완결 시각은 `mainEpochs`에 단어 키로 기억(재구성에도 유지, `resetStamps()`가 같이 비움).
     orb 의 flow field 가 이 진행 방향을 따른다. `glow.on` 이면 배경 투명 radial gradient(가운데 `radius×core` 까지 fill 색,
     밖은 알파 `(1-s)^falloff`) — fill 이 어떤 CSS 색이든 2D 컨텍스트로 rgb 를 뽑아 알파만 바꾼다
   - **orb = 종성 후크 (2026-10-09)** — 무작위 배치 대신 dandelion.js `ORB_JAMO`가 구간(음절)마다 `plan[j].orbs = [{at, r, fill, off, auto, rays, width, spikes}]`로 지정한다. 받침 있는 음절만, 후크 자리(구간 길이 × 0.93), 반지름 = 중성 F1, 색 = 초성 x/y/z → 노란 계열 hue/채도/명도. `auto`면 법선 양쪽 중 실선이 덜 붐비는 쪽으로 (r+22)px(`settleSide` — orb 자리 + 40px까지만 세서 뒤에 자라는 경로가 쪽을 안 뒤집는다). `orb.bulge`가 orb를 윤곽선·halo 밀도장에 원으로 더해 윤곽이 orb를 감싸며 부푼다
   - **부채 `orb.style: 'fan'` (2026-10-16)** — 원 대신 접부채. 밑변이 실선 방향(뒤쪽), 바깥쪽으로 반원까지 펼쳐진다. 펼침 = main bead 거리(`fan.near`~`far`). 살 개수 = 초성 y, 굵기 = 초성 z(dandelion.js `ORB_JAMO.rays/width`). 'disc'로 되돌리면 예전 원 + hatch. 윤곽선·halo는 살 실루엣을 매 프레임 따라간다(캐시한 단어 밀도 격자 + 살 캡슐, `fan.reach` 짧을수록 바싹 — 길면 둥근 덩어리). 이때 윤곽선은 ink2d에 굽지 않고 오버레이에 매 프레임
   - **부채 `fan.heart` (2026-10-16)** — 살마다 중심에서 radial gradient: 중심 = fill에 `tint`(붉은색)를 `amount`만큼 섞은 색 → `extent`(길이 비율)에서 fill(`fanStroke`)
   - **성게 가시 `orb.spike` (2026-10-16)** — orb 항목에 `spikes: {n, len}`이 있으면 부채 반대편 법선 쪽 반구(±`spread`)로 실선 옆구리에서 불규칙한 가시(`jitter`, 골짜기 `depth`)를 orb 시드의 순수 함수로(`spikePaths`). 색은 spineCasing 을 따라 실선과 한 몸. dandelion: 받침이 울림소리(ㄴㄹㅁㅇ, z 0)가 아닐 때만 — 종성 x → 개수(`ORB_JAMO.spikeN`), z → 길이(`spikeLen`). 다 그린 단어는 ink2d에 구워서 튀어나오는 애니메이션은 없다
   - **바탕 `base` (2026-10-16~17)** — underlay 맨 아래. `shape: 'outline'` = 윤곽 폴리곤을 하나씩 채우고 2·`pad` 굵기로 그어 불린 실루엣(pad null = 스티플 gap + width) / `'halo'` = halo 칸 모양 그대로. `offset` [dx, dy]로 그림자처럼 어긋나게, `gradient`(halo.gradient 꼴)를 주면 칸마다 그 그라데이션. dandelion: 흰 halo 모양, [7, 7]. 부채 칸은 매 프레임 계산이라 base 에 안 들어간다
   - **underlay 쌓는 순서** (아래 → 위): base → halo(edge 포함) → orb/부채. 그 위에 goo(GL) → 오버레이(윤곽선·실선·bead)
   - **`goo.pixel` / `goo.grain` (2026-10-09)** — 캡슐 이어진 metaball 상쇄. pixel = 칸(CSS px, halo와 같은 원점) 안 3×3 최댓값으로 칸 단위 칠하기(노멀도 칸마다 하나). `[lo, hi]`로 주면(2026-10-16) `pixelVar.block` px 블록마다 lo~hi 정수 중 하나(`pixelVar.scale` 노이즈, 0 = 블록마다 독립), 칸은 블록 원점에 다시 맞춘다. grain = 밀도값을 띠 좌표로(등고선이 획과 나란하므로 띠도 획을 따라간다) 띠마다 밀도를 `amount`만큼 깎고 노이즈(`warp`/`scale`)로 흔든다. 둘 다 composite.frag
   - `orb`(`style: 'disc'` — 부채 이전, dandelion 은 지금 'fan') — 경로 주변 노란 원 + 내부 **hatch 형 flow field**(짧은 대시를 격자에 놓고 벡터장 방향으로 돌림).
     벡터장 = 노이즈 기본장을 그 획 main bead 진행 방향 쪽으로 `follow` 만큼 돌린 것(거리 `falloff` 로 약해짐),
     bead 가 간 만큼 노이즈 표본을 `drift` 배로 밀어 무늬가 흐른다. 대시는 방향 없는 선이라 각도 차를 π 로 접는다
     (bead 가 되돌아와도 결이 안 튄다). **goo 아래**의 underlay 캔버스에 매 프레임 다시 그린다(굽지 않음)

### 색 · 모드 (2026-10-16~17)

- **goo 색 = 최상위 `ink`**(hex만 — `hex2rgb`). 엔진 기본 `shade: 2`(toon)는 ink × (amb 0.55 + 명암 계단)이라 흰색도 회색이 된다 — 색 그대로 내려면 `shade: 0`. dandelion 은 지금 흰 goo(`ink '#ffffff'`, `shade 0`) + 흰 점선(`companionStyle`)
- **invert 모드 `?dandelion=invert`** — `cfgForMode()`가 CFG_OVERRIDE 위에 덮는다(원래 룩은 그대로): halo 흰 채움 + 초록 `edge`, goo `INVERT_INK` 초록, base = 원래 halo 초록 그라데이션. halo stops 를 바꾸면 invert 의 base·edge 색도 따라간다. 흰 실선이 흰 블록 위라 잘 안 보인다
- **index.html(스탠드얼론)만 회색 종이** — transparentOutput 이 없을 때만 `paper: STANDALONE_PAPER`(#cfcfcc)를 넘겨 흰 base 가 보이게. output.html(전시)은 투명 합성이라 receiver 배경(BG_d 하늘) 그대로. output 쪽 회색 배경 옵션은 만들었다가 걷어냈다(2026-10-17)

### 점진 렌더 · 한글 조합

- `growPx` px/frame 으로 큐에서 획이 자란다. **프레임 기준**이라 120Hz 에선 2배 — `advanceGrowing()` 한 줄로 dt 기반 전환 가능.
- 타이핑 중인 단어는 `hold` 상태라 끝에 도달해도 완성되지 않고 음절이 더 붙기를 기다린다. 공백(`finishGrowing`)/제출(`flushQueue`)에서 구워진다.
- **`UNSTABLE_TAIL = 2`** — 한글은 종성이 다음 글자 초성으로 넘어간다("반가"+ㅇ→"반강"→"반가우").
  이때 이미 그려진 *중간* 음절이 바뀌므로 뒤 2음절을 불안정으로 보고 `replaceTail()` 로 갈아끼운다.
  소비량을 유지해서 끝이 움찔거리지 않는다. (1로 두면 연음마다 단어 전체가 다시 그려진다)
- 앵커가 움직이거나(줄바꿈) 안정 구간이 깨지면 전면 재구성 — 결정론 덕분에 같은 글자는 같은 모양으로 복원된다.

### 출력 · 정리

- 합성 셰이더는 **straight alpha** 로 잉크만 낸다. 종이색은 캔버스 CSS 배경 → 화면은 그대로, `captureFrame()` 은 투명 PNG(99% 투명). 불투명이면 히스토리에서 앞 턴을 덮어버린다.
- `dispose()` 가 리스너·캔버스 3장(underlay/goo/overlay)·body 배경을 전부 되돌린다. 투명 합성이면 `bodyBg:false` + `paperBg:false`. **`keys` 옵션은 끈 채로 둘 것** — 켜면 `c`/`z`/`s` 가 한글 입력창을 가로챈다.
- `sylSize = 110`, `wrapStep = 130`, `lineHeightRatio = 1.8`
- **세로 scroll (2026-10-08)** — 밀도장·윤곽선·잉크가 따로 구워져 픽셀로 못 민다. 줄이 늘면 페이지가 민 positions로 앵커가 바뀌어 **전부 다시 굽고**(결정론이라 같은 모양), 캔버스 세 장을 민 거리만큼 CSS `translateY`로 내려 뒀다가 `SCROLL_EASE`로 0까지 끌어올린다. 다시 굽는 앞 단어들은 윤곽선이 한 바퀴 도는 애니메이션 없이 바로 그린다(`addStroke` 동안만 `CFG.outline.anim.on = false`). 엔진이 body 끝에 붙이는 오버레이 캔버스는 `init()`이 goo 캔버스 뒤(`#glyph-window` 안)로 옮긴다 — 안 그러면 위쪽 페이드 mask·말풍선 clip이 안 걸린다
- **음절 네모 높이 = 실선 맨 아래 + 간격 (2026-10-17)** — `buildWord`가 `meta.starts`(음절마다 경로 몇 px에서 시작하는지)로 메인 경로 점을 음절 구간에 나눠, 구간마다 가장 아래 점이 줄 기준선(anchor y)보다 몇 px 아래인지 `_sylDrop[음절 번호]`에 적는다. 페이지(`sylTags`)는 `sylDrop(i)` + `TAG_DROP_GAP`(output-main.js)에 네모 윗변을 둔다. 동반 곡선·장식·goo 두께는 안 셈 — 간격으로 맞춘다
- 자주 바뀌는 값: `CFG_OVERRIDE`(dandelion.js 상단, goo/grow/part/outline/halo/base/bead/orb 포함), 자모 → 시각 매핑 표(`ORB_JAMO` — orb·부채·가시·walker 크기 / `HALO_VOWEL_DIR`·`HALO_CHO_DIR`·`HALO_TONE`), `jamoTrail.js` 의 `MEANDER_*` / `DC_TURNS` / `AC_TURN` / `JOIN_STEER` / `LINE_PULL`
- 성장장·파티클 레이어는 구현돼 있으나 **기본 off** (`grow.on` / `part.on`)
- 콘솔: `rm.current.cfg()` / `rm.current.engine()` / `rm.current.setGenerator('anchor')`(구 앵커 보간 방식과 A/B). 구운 것까지 바꾸려면 `rm.current.engine().replay()`
- **엔진 새 옵션은 기본 off** — 엔진(`trail/`, 원래 sketch 사본) 기본값은 예전 룩 그대로 두고 dandelion 이 `CFG_OVERRIDE`로 켠다. (2026-10-27부터 sketch 쪽에 복사·`cmp` 하지 않는다)

---

## 🖨 bake — 전시 화면과 다른 점

굽기 도구는 `src/dev/` 두 페이지(저장 = vite.config.js `/__bake` → `bake/<dir>/`, gitignore). 쿼리 옵션은 각 파일 머리 주석이 원본.

- **bake.html** (`bake.js`) — 음절 하나 = 정사각 PNG 하나. 기본 KS X 1001 2350자, `?text=`로 일부만
- **bake-text.html** (`bake-text.js` + 다른 수신자는 `bake-text-others.js`) — 텍스트 = 세로로 긴 PNG. 한 줄 최대 `perLine`(7)음절로 접고(`breakLines`, 단어는 안 쪼갬), `---` 줄에서 이미지를 나눈다. 문장 끝 = 단어 끝 `.?!…。`(뒤 따옴표·괄호 허용) 또는 줄바꿈. 출력 가로 기본 2160(인쇄용)

### 수신자 코드 안의 bake 전용 훅 (전시에선 늘 기본값)

| 훅 | 위치 | 전시 | bake |
| --- | --- | --- | --- |
| `_gapPxOverride` | signal `_draw()` | null → `GAP_PX` 0.5 CSS px | bake-text `?edge`(출력 px로 고정) |
| `dprCap` | dandelion 옵션 → trail `createTrail` | 없음 → `DPR_CAP` 2 | `?dpr`(bake 2, bake-text 3) — `devicePixelRatio`도 덮음 |
| `maxWords` | sora 인스턴스 | `MAX_WORDS` 9 | bake-text가 `MAX_SYL` 32로 올림(한 행 한 캔버스) |
| `wordBoxSizes` / `MERGE_WORDS` | sora.js export | 안 씀 | bake-text 문장 박스 나누기 |

### 수신자별 차이

**공통으로 전시와 같은 것**: 자모 → 모양 매핑, 색, 셰이더. 위 훅 말고 수신자 코드는 전시와 같은 경로를 탄다.

- **mycelium**
  - 프레임을 페이지가 직접 돌린다(rAF 끊고 MessageChannel 루프 + 1px `readPixels` 동기화) — 24fps 스로틀 없이 빠르지만 성장은 렌더 프레임당 전진이라 모양은 같다. `?instant=1`이면 성장 생략(성장 자취가 없는 다른 모양)
  - 글자 크기: 기준 크기 모양을 `glyphScaleFor`로 균일 확대 — 전시 그 글자를 키운 것. 출력이 원본(창 × DPR)보다 크면 확대 저장 + 경고
  - bake.html: 음절이 화면 정중앙에 하나뿐이라 **허브·연결 실이 없다**
  - bake-text: 줄을 **늘 화면 세로 정중앙**에서 키운다(전시는 줄마다 화면 높이가 달라 카메라 원근이 다르다). 연결 실은 **문장 단위**(전시 = 엔터로 낸 한 문장이 한 누적 버퍼) — 줄이 바뀌면 남은 허브를 한 줄 위로 옮겨 다시 심고, 다른 문장 허브는 지운다. 띄어쓰기 0.2칸(calcTextboxLayout)
- **sora**
  - rAF·resize를 끊고 출력 크기 캔버스에 바로 그린다 — 창 크기와 무관. 모프·파동을 끝난 상태로 스냅(`_prevRipple`까지)
  - bake.html: 음절 하나 = 원 하나, **정중앙·고정 반경**(전시는 단어마다 랜덤 자리·반경 0.25~1배). 선이 fwidth 기반 ~1px라 출력이 클수록 원 대비 선이 가늘다
  - bake-text: 문장마다 보이지 않는 정사각 박스(9단어씩, 꼬리 3단어 이하는 앞 박스에 붙임), 박스를 읽는 순서로 한 행 `?boxes`(3)개. 한 행을 캔버스 하나에 그려 옆 문장 원과도 smin으로 이어진다(전시엔 문장이 한 화면씩이라 없는 일). 원 자리 = 박스 안 랜덤, 여백 `SORA_MARGIN` 0.12, 옆 박스 쪽 `SORA_SPILL` 0.25. 단어는 하나씩 `update()`에 넣는다 — 한꺼번에 넣으면 뒤에 단어가 있는 슬롯이 초기값으로 남는다(sora는 마지막 단어 슬롯만 갱신)
- **signal**
  - `_animate`를 가짜 60Hz 시각으로 직접 돌린다 — 24fps 스로틀·셀 보간·FREEZE 구간 CA 정지까지 전시 시간축 그대로. 색은 신호등 사이클을 NORMAL로 고정(BLINK 모노로 안 굳게, `captureFrame`과 같음). 지터·신호등 셀은 매번 랜덤
  - 셀 격자는 CSS px(MIN_DIST 12)라 셀 개수 = `?sylsize`가 정한다. 캔버스는 CSS 박스를 출력 px로 키운 backing store
  - bake.html `?steps`/`?settle` — 전부 넣고 N step. bake-text 기본 `typing` — `?interval` ms마다 한 음절(앞 글자일수록 CA가 더 진행, 전시 타이핑처럼) + 끝난 뒤 `?after` step
  - bake-text: 줄 안 배치는 calcShelfLayout 규칙, 줄 구성만 breakLines. 페이지 가로 = 한 줄 최대 음절 × 1.5·sylSize라 오른쪽이 보통 빈다. 슈퍼샘플 `?ss`(2), 세로 청크(8192px, 면적 3200만 px 이하 — 넘으면 Chrome이 버퍼를 말없이 줄여 빈 PNG)
- **dandelion**
  - orb·halo 칸·오프셋이 전부 CSS px라 셰이더로 못 키운다 — **전시 크기 그대로** 그려 잘라낸다. 해상도는 `?dpr`로만 올린다(모양 같고 선명도만)
  - `flushQueue`로 즉시 완성 → 두 프레임 뒤 찍는다. 성장 애니메이션·윤곽선 도는 애니메이션 없음. main bead(`waitLive`)는 실선 끝에 막 선 자리
  - bake.html: 음절 하나 = 단어 하나 = 획 하나, `?box`(540 CSS px) 정사각을 알파 범위 가운데로 잘라냄 — 넘으면 '잘림'
  - bake-text: 줄마다 비우고 화면 가운데 기준선에 놓고 굽는다(페이지 가로 = 2·1.5·wrapStep + 음절 수 × 100px). 단어가 줄을 넘으면 획도 끊긴다(전시와 같음)

### 백그라운드 탭

| | bake.html | bake-text |
| --- | --- | --- |
| mycelium · sora · signal | 탭 뒤로 보내도 됨 | 탭 뒤로 보내도 됨 |
| dandelion | **앞에 둘 것** | **앞에 둘 것** |

dandelion은 엔진이 rAF로 돌아 백그라운드에서 멈춘다. 나머지는 rAF를 안 쓰고, 이벤트 루프 양보도 MessageChannel이다(setTimeout은 백그라운드에서 1초, 오래 숨기면 1분으로 늘어남). 이 노트북처럼 발열 감속이 있으면 오래 구울수록 느려지지만 메모리가 쌓이는 건 아니다.

### 굽기 결과가 낡는 경우

모양·색 상수를 바꾸면 그 수신자의 `bake/` 출력은 다시 구워야 한다. 2026-10-28 기준: sora는 종성 잔물결·단어 원 고유 색·`heatmap3` 0.82 이전 출력이 전부 낡음, dandelion은 `NET_FLOOR` 이전 177자(`bake/_dandelion-before-floor/`로 옮겨 둠).
