// asemic 턴테이블 — Uno R3 + 28BYJ-48 + ULN2003 + TCRT5000
// 시리얼로 0~3(또는 receiver 이름)을 받으면 그 사물을 앞으로 돌리고, 도착하면 "arrived <이름>"을 보낸다.
// 순서는 dial.js 구멍 순서와 같다: 0 mycelium / 1 signal / 2 dandelion / 3 sora
//
// 판 아랫면에 검은 테이프 4개(90° 간격): 0번만 넓게(4cm), 1~3번은 좁게(1cm).
// 모터가 판을 다 못 돌리고 미끄러져도(스텝 손실) 센서로 테이프를 직접 찾아 그 가운데에 선다.
// 전제: 판은 덜 돌기만 하고 더 돌지는 않는다, 한 번에 밀리는 양 < 45°.
#include <AccelStepper.h>

AccelStepper m(AccelStepper::FULL4WIRE, 8, 10, 9, 11);  // ⚠️ IN1,IN3,IN2,IN4 순서. 8,9,10,11로 쓰면 떨기만 하고 안 돈다
const long REV = 2038;          // 풀스텝 1바퀴 (반스텝이면 4076)
const long SEEK = 150;          // 테이프 찾을 때 속도(스텝/초). 느릴수록 힘이 세다
const long APPROACH = REV * 30 / 360;  // 목표 30° 앞에서 멈추고 거기서부터 천천히 찾는다
const long WIDE_MIN = 130;      // 이보다 넓으면 0번 테이프. 실측(2026-10-06): 넓은 것 174~177, 좁은 것 85~94
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
  Serial.print("mark "); Serial.println(labs(b - a));   // 테이프 폭(스텝). 넓은/좁은 구분이 WIDE_MIN 양쪽으로 갈리는지 확인용
  return labs(b - a);
}

long wrap(long d) {                                     // -REV/2 ~ REV/2
  d %= REV;
  if (d >  REV / 2) d -= REV;
  if (d < -REV / 2) d += REV;
  return d;
}

void home() {
  m.enableOutputs();
  m.setSpeed(SEEK);
  const char* err = "home_fail no_wide";
  if (!runUntil(false, REV / 4)) err = "home_fail no_plate";      // 이미 테이프 위면 먼저 벗어난다. 흰 면이 안 보이면 실패
  else for (int i = 0; i < 6; i++) {                              // 테이프를 하나씩 지나가며 넓은 것(0번)을 찾는다
    long w = seekMark(1, REV / 2);
    if (w < 0) { err = "home_fail no_mark"; break; }
    if (w >= WIDE_MIN) { m.setCurrentPosition(0); err = nullptr; break; }
    m.setSpeed(SEEK);
    runUntil(false, REV / 4);                                      // 가운데에서 다시 테이프 밖으로
  }
  m.disableOutputs();                                   // 서 있을 땐 전류 끔 (과열 방지)
  Serial.println(err ? err : "homed");
}

void goTo(int idx, bool retry) {
  long cur  = m.currentPosition();
  long diff = wrap(idx * REV / 4 - cur);                // 최단 경로
  if (diff == 0) { Serial.print("arrived "); Serial.println(NAMES[idx]); return; }
  int dir = diff >= 0 ? 1 : -1;
  m.enableOutputs();
  m.moveTo(cur + diff - dir * APPROACH);                // 빠르게 30° 앞까지
  m.runToPosition();
  long w = seekMark(dir, REV / 4 + APPROACH);           // 나머지는 센서로 찾는다
  m.disableOutputs();

  bool bad = w < 0 || (w >= WIDE_MIN) != (idx == 0);    // 테이프를 못 찾았거나 엉뚱한 테이프
  if (bad) {
    Serial.println(w < 0 ? "lost" : "wrong_mark");
    home();                                             // 0점부터 다시 잡고 한 번만 재시도
    if (retry) goTo(idx, false);
    return;
  }

  long here = m.currentPosition();
  long fix = wrap(idx * REV / 4 - here);                // 미끄러진 만큼(센서가 찾은 실제 위치와 계산 위치의 차이)
  m.setCurrentPosition(here + fix);
  Serial.print("fix "); Serial.println(fix);
  Serial.print("arrived "); Serial.println(NAMES[idx]);
}

int parse(String s) {
  s.trim();
  if (s.length() == 1 && s[0] >= '0' && s[0] <= '3') return s[0] - '0';
  for (int i = 0; i < 4; i++) if (s == NAMES[i]) return i;
  if (s == "h") return 9;
  return -1;
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(20);
  pinMode(HOME, INPUT);         // 모듈에 저항이 이미 있다
  m.setMaxSpeed(200);
  m.setAcceleration(100);
  home();
}

void loop() {
  int cmd = -1;
  while (Serial.available()) {                          // 도는 동안 쌓인 명령은 마지막 것만 (다이얼을 빨리 돌린 경우)
    int c = parse(Serial.readStringUntil('\n'));
    if (c >= 0) cmd = c;
  }
  if (cmd == 9) home();
  else if (cmd >= 0) goTo(cmd, true);
}
