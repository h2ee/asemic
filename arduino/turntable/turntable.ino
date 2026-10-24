// asemic 턴테이블 — Uno R3 + 17HS3430(NEMA17) + TMC2208 + TCRT5000
// 시리얼로 0~3(또는 receiver 이름)을 받으면 그 사물을 앞으로 돌리고, 도착하면 "arrived <이름>"을 보낸다.
// 순서는 dial.js 구멍 순서와 같다: 0 mycelium / 1 signal / 2 dandelion / 3 sora
//
// 판 아랫면에 검은 테이프 4개(90° 간격): 0번만 넓게(4cm), 1~3번은 좁게(1cm).
// 모터가 판을 다 못 돌리고 미끄러져도(스텝 손실) 센서로 테이프를 직접 찾아 그 가운데에 선다.
// 전제: 판은 덜 돌기만 하고 더 돌지는 않는다, 한 번에 밀리는 양 < 45°.
//
// 2026-10-14 28BYJ-48 → NEMA17 직결로 교체. 28BYJ는 짐을 올리면 90°에 5~20° 덜 감아서
// 처음부터 끝까지 느린 SEEK로 돌 수밖에 없었다. NEMA17은 토크가 남아서 목표 APPROACH 앞까지는
// 가감속으로 빠르게 가고, 마지막만 센서로 찾는다. 예전 모터로 되돌리려면 NEMA17을 0으로.
#include <AccelStepper.h>

#define NEMA17 1

#if NEMA17
// TMC2208 스탠드얼론: MS1·MS2 비워 두면 1/8 마이크로스텝(내부 256 보간). EN은 LOW일 때 켜짐
const int STEP_PIN = 3, DIR_PIN = 4, EN_PIN = 5;
AccelStepper m(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);
const bool DIR_INVERT = false;  // 0→1→2→3 순서가 거꾸로 돌면 true
const long REV = 200L * 8;      // 1.8° × 1/8 마이크로스텝 = 1600 스텝/바퀴 (직결)
const long SEEK = REV * 20 / 360;      // 테이프 찾을 때 속도 20°/초. 센서 판정(STABLE_MS)이 따라올 만큼 느리게
const long FAST = REV * 90 / 360;      // 빠른 구간 최고 속도 90°/초
const long ACCEL = REV * 90 / 360;     // 90°/초². 판(30cm·2kg)이 모터를 밀고 가지 않게 완만히 — 멈출 때 출렁이면 줄인다
const long APPROACH = REV * 15 / 360;  // 목표 15° 앞까지 빠르게, 거기서부터 천천히 찾는다
const bool HOLD = false;        // 서 있을 땐 전류 끔. 켜 두면 정지 중에 "지잉" 소리가 크다(2026-10-15 실측).
                                // 대신 판이 손에 돈다 — 다음 이동에서 센서가 바로잡고, 45° 넘게 밀리면 wrong_mark → 재호밍
#else
AccelStepper m(AccelStepper::FULL4WIRE, 8, 10, 9, 11);  // ⚠️ IN1,IN3,IN2,IN4 순서. 8,9,10,11로 쓰면 떨기만 하고 안 돈다
const long REV = 2038;          // 풀스텝 1바퀴 (반스텝이면 4076)
const long SEEK = 150;          // 테이프 찾을 때 속도(스텝/초). 느릴수록 힘이 세다
const long FAST = 200;
const long ACCEL = 100;
const long APPROACH = REV * 30 / 360;  // 목표 30° 앞에서 멈추고 거기서부터 천천히 찾는다
const bool HOLD = false;        // 서 있을 땐 전류 끔 (과열 방지)
#endif
// 이보다 넓으면 0번 테이프. 실측(2026-10-06, 2038스텝/바퀴): 넓은 것 174~177, 좁은 것 85~94 → 130을 바퀴 비율로.
// 시작값일 뿐 — home()이 테이프 4개를 재서 (가장 넓은 것 + 두 번째) / 2 로 다시 잡는다(모터·센서 높이가 바뀌어도 맞게)
long wideMin = REV * 130 / 2038;
// 테이프 i의 실제 가운데 − 정확한 90° 자리(i × REV/4). 손으로 붙인 테이프는 몇 °씩 어긋나 있다
// (2026-10-15 실측: signal −4°, dandelion −9°, sora −7°). home()이 매번 다시 잰다
long markOff[4] = {0, 0, 0, 0};
// true = 테이프를 찾은 뒤 어긋난 만큼 더 돌아 정확한 90° 자리에 선다(사물이 정확히 90° 간격일 때 맞음)
// false = 테이프 가운데에 선다(사물을 테이프에 맞춰 놓았을 때 맞음). 시리얼 `g`로 바꿔 가며 비교
bool snapGrid = true;
const int HOME = 7;             // 센서 신호선 (TCRT5000 DO)
const int HOME_ACTIVE = HIGH;   // 검은 테이프일 때 값
const int STABLE_MS = 15;       // 이만큼 연속으로 같은 값이어야 믿는다 (떨림 무시)
const char* NAMES[] = {"mycelium", "signal", "dandelion", "sora"};

// want(테이프/흰 면)가 STABLE_MS 동안 유지될 때까지 현재 setSpeed로 돈다. maxSteps 안에 못 찾으면 false
bool runUntil(bool want, long maxSteps) {
  long start = m.currentPosition();
  unsigned long since = 0;
  bool was = false;
  while (labs(m.currentPosition() - start) < maxSteps) {
    m.runSpeed();
    bool now = (digitalRead(HOME) == HOME_ACTIVE) == want;
    if (now && !was) since = millis();
    was = now;
    if (now && millis() - since >= STABLE_MS) return true;
  }
  return false;
}

// dir 방향으로 다음 테이프를 찾아 그 가운데에 선다. 테이프 폭(스텝)을 돌려주고, 못 찾으면 -1
long seekMark(int dir, long maxSteps) {
  if (digitalRead(HOME) == HOME_ACTIVE) {               // 이미 테이프 위면 뒤로 물러나서 시작 (가운데 계산이 틀어지지 않게)
    m.setSpeed(-dir * SEEK);
    runUntil(false, REV / 4);
  }
  m.setSpeed(dir * SEEK);
  if (!runUntil(true, maxSteps)) return -1;             // 테이프 시작
  long a = m.currentPosition();
  if (!runUntil(false, REV / 4)) return -1;             // 테이프 끝 (90° 넘게 검으면 이상)
  long b = m.currentPosition();
  m.moveTo((a + b) / 2);                                // 양 끝의 가운데로 돌아온다 → 어느 방향에서 와도 같은 자리
  m.runToPosition();
  Serial.print("mark "); Serial.println(labs(b - a));   // 테이프 폭(스텝). 넓은/좁은 구분이 wideMin 양쪽으로 갈리는지 확인용
  return labs(b - a);
}

long wrap(long d) {                                     // -REV/2 ~ REV/2
  d %= REV;
  if (d >  REV / 2) d -= REV;
  if (d < -REV / 2) d += REV;
  return d;
}

// 넓은 테이프는 두 번째로 넓은 것보다 이만큼(5°) 이상 넓어야 한다. 비율이 아니라 차이로 본다 —
// 판을 다시 끼워 센서 거리가 바뀌면 모든 폭이 비슷한 양만큼 늘고 줄어서, 비율은 흔들려도 차이는 거의 그대로다
// (2026-10-15 실측: 36·53·60/101 → 판 다시 끼운 뒤 76·78·91/127. 비율 1.7 → 1.4, 차이 41 → 36)
const long WIDE_GAP = REV * 5 / 360;

// 한 바퀴 돌며 테이프 4개 폭을 다 재고, 가장 넓은 것(두 번째보다 WIDE_GAP 이상)을 0번으로 잡는다.
// 예전엔 고정 WIDE_MIN을 넘는 첫 테이프에서 멈췄는데, NEMA17로 바꾼 뒤 no_wide가 나서 상대 비교로 (2026-10-15)
void home() {
  m.enableOutputs();
  m.setSpeed(SEEK);
  const char* err = nullptr;
  long w[4], pos[4];
  if (!runUntil(false, REV / 4)) err = "home_fail no_plate";      // 이미 테이프 위면 먼저 벗어난다. 흰 면이 안 보이면 실패
  else for (int i = 0; i < 4; i++) {
    w[i] = seekMark(1, REV / 2);
    if (w[i] < 0) { err = "home_fail no_mark"; break; }
    pos[i] = m.currentPosition();
    m.setSpeed(SEEK);
    runUntil(false, REV / 4);                                      // 가운데에서 다시 테이프 밖으로
  }
  if (!err) {
    int k = 0;
    for (int i = 1; i < 4; i++) if (w[i] > w[k]) k = i;
    long second = 0;
    for (int i = 0; i < 4; i++) if (i != k && w[i] > second) second = w[i];
    if (w[k] - second < WIDE_GAP) err = "home_fail no_wide";      // 넓은 게 따로 안 보인다
    else {
      wideMin = (w[k] + second) / 2;
      m.moveTo(m.currentPosition() + wrap(pos[k] - m.currentPosition()));  // 가장 넓은 테이프 가운데로 (최단 경로)
      m.runToPosition();
      m.setCurrentPosition(0);
      for (int i = 0; i < 4; i++) {                                // 넓은 테이프 기준으로 나머지가 몇 번 자리인지, 얼마나 어긋났는지
        long rel = ((pos[i] - pos[k]) % REV + REV) % REV;
        int j = (rel * 4 + REV / 2) / REV % 4;
        markOff[j] = wrap(rel - j * REV / 4);
      }
      Serial.print("wide_min "); Serial.println(wideMin);
      Serial.print("offsets");
      for (int i = 0; i < 4; i++) { Serial.print(' '); Serial.print(markOff[i]); }
      Serial.println();
    }
  }
  if (!HOLD) m.disableOutputs();
  Serial.println(err ? err : "homed");
}

void goTo(int idx, bool retry) {
  long tape = idx * REV / 4 + markOff[idx];             // 그 테이프의 실제 가운데
  long stop = snapGrid ? idx * REV / 4 : tape;          // 서야 할 자리
  long cur  = m.currentPosition();
  if (wrap(stop - cur) == 0) { Serial.print("arrived "); Serial.println(NAMES[idx]); return; }
  long diff = wrap(tape - cur);                         // 최단 경로
  int dir = diff >= 0 ? 1 : -1;
  m.enableOutputs();
  m.moveTo(cur + diff - dir * APPROACH);                // 빠르게 APPROACH 앞까지
  m.runToPosition();
  long w = seekMark(dir, REV / 4 + APPROACH);           // 나머지는 센서로 찾는다

  bool bad = w < 0 || (w >= wideMin) != (idx == 0);    // 테이프를 못 찾았거나 엉뚱한 테이프
  if (bad) {
    if (!HOLD) m.disableOutputs();
    Serial.println(w < 0 ? "lost" : "wrong_mark");
    home();                                             // 0점부터 다시 잡고 한 번만 재시도
    if (retry) goTo(idx, false);
    return;
  }

  long here = m.currentPosition();
  long fix = wrap(tape - here);                         // 미끄러진 만큼(센서가 찾은 실제 위치와 계산 위치의 차이). 이제 0 근처여야 정상
  m.setCurrentPosition(here + fix);
  if (snapGrid) {                                       // 테이프 가운데에서 어긋난 만큼 더 돌아 정확한 자리로
    m.moveTo(m.currentPosition() + wrap(stop - m.currentPosition()));
    m.runToPosition();
  }
  if (!HOLD) m.disableOutputs();
  Serial.print("fix "); Serial.println(fix);
  Serial.print("arrived "); Serial.println(NAMES[idx]);
}

int parse(String s) {
  s.trim();
  if (s.length() == 1 && s[0] >= '0' && s[0] <= '3') return s[0] - '0';
  for (int i = 0; i < 4; i++) if (s == NAMES[i]) return i;
  if (s == "h") return 9;
  if (s == "g") return 8;
  return -1;
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(20);
  pinMode(HOME, INPUT);         // 모듈에 저항이 이미 있다
#if NEMA17
  m.setPinsInverted(DIR_INVERT, false, true);           // EN은 LOW가 켜짐 — setEnablePin보다 먼저(안 그러면 켜질 때 한 번 반대로 씀)
  m.setEnablePin(EN_PIN);
#endif
  m.setMaxSpeed(FAST);
  m.setAcceleration(ACCEL);
  home();
}

void loop() {
  int cmd = -1;
  while (Serial.available()) {                          // 도는 동안 쌓인 명령은 마지막 것만 (다이얼을 빨리 돌린 경우)
    int c = parse(Serial.readStringUntil('\n'));
    if (c >= 0) cmd = c;
  }
  if (cmd == 9) home();
  else if (cmd == 8) { snapGrid = !snapGrid; Serial.print("grid "); Serial.println(snapGrid ? 1 : 0); }
  else if (cmd >= 0) goTo(cmd, true);
}
