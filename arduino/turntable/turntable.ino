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
// 1 = TMC2208과 UART로 말해서 StealthChop(조용한 모드)을 직접 켠다. 라이브러리 TMCStepper 필요.
// 배선: Uno D11 ─[1kΩ]─┬─ 드라이버 PDN/UART 핀, Uno D10 ─────┘ (저항 뒤에서 만남). 0이면 예전 스탠드얼론 그대로
#define TMC_UART 0       // 2026-11-08 h2ee: UART는 안 쓰기로 — 코드는 기록으로 남김

#if NEMA17
// TMC2208 스탠드얼론: MS1·MS2 비워 두면 1/8 마이크로스텝(내부 256 보간). EN은 LOW일 때 켜짐
const int STEP_PIN = 3, DIR_PIN = 4, EN_PIN = 5;
AccelStepper m(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);
const bool DIR_INVERT = false;  // 0→1→2→3 순서가 거꾸로 돌면 true
const long REV = 200L * 8;      // 1.8° × 1/8 마이크로스텝 = 1600 스텝/바퀴 (직결)
#if TMC_UART
#include <TMCStepper.h>
// SoftwareSerial(RX=D10, TX=D11). 0.11 = 모듈 감지 저항(대부분 R110). 전류는 계속 가변저항이 정한다(I_scale_analog)
TMC2208Stepper drv(10, 11, 0.11f);
#endif
long SEEK = REV * 30 / 360;            // 테이프 찾을 때 속도 30°/초. 센서 판정(STABLE_MS)이 따라올 만큼 느리게
                                       // 2026-11-08 20 → 30: 느릴수록 소리가 커서(45 이하) h2ee가 고름
const long FAST = REV * 45 / 360;      // 빠른 구간 최고 속도 45°/초 (2026-11-10 90 → 60 → 45: 물건 올리고 걸림·lost, 커플러가 D컷 축에서 헛돎)
const long ACCEL = REV * 30 / 360;     // 30°/초² (2026-11-10 90 → 60 → 30: 커플러 헛돎 — 가속이 낮을수록 축을 비트는 힘이 작다. 속도보다 정확도). 판(30cm·2kg)이 모터를 밀고 가지 않게 완만히 — 멈출 때 출렁이면 줄인다
const long APPROACH = REV * 15 / 360;  // 목표 15° 앞까지 빠르게, 거기서부터 천천히 찾는다
const bool HOLD = false;        // 서 있을 땐 전류 끔. 켜 두면 정지 중에 "지잉" 소리가 크다(2026-10-15 실측).
                                // 대신 판이 손에 돈다 — 다음 이동에서 센서가 바로잡고, 45° 넘게 밀리면 wrong_mark → 재호밍
#else
AccelStepper m(AccelStepper::FULL4WIRE, 8, 10, 9, 11);  // ⚠️ IN1,IN3,IN2,IN4 순서. 8,9,10,11로 쓰면 떨기만 하고 안 돈다
const long REV = 2038;          // 풀스텝 1바퀴 (반스텝이면 4076)
long SEEK = 150;                // 테이프 찾을 때 속도(스텝/초). 느릴수록 힘이 세다
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
// 지금 판 앞에 있는 사물 번호. 호밍 성공 = 0(mycelium), 모르면 -1
int curIdx = -1;

// 테이프 i의 폭(스텝). home()이 잰다. goTo()가 한 번에 돌며 테이프 들어가는 끝만 보고 가운데를 셈할 때 쓴다
long markW[4] = {REV * 17 / 360, REV * 17 / 360, REV * 17 / 360, REV * 17 / 360};
// 이보다 작게 어긋나면 고치러 다시 움직이지 않는다(1°) — 바로잡는 작은 움직임도 "팍"으로 느껴져서
const long FIX_TOL = REV / 360;    // 2026-11-10부터 goTo는 도는 중에 고쳐서 안 씀 (기록)
// 마지막 runUntil에서 센서 값이 처음 바뀐 스텝 (STABLE_MS 확인 전). 확인 지연만큼 밀리지 않아 속도와 상관없이 같은 자리
long edgePos = 0;
// 호밍 뒤 첫 이동은 가속을 FIRST_ACCEL_PCT%로 (2026-11-09, h2ee 실측 — 호밍 뒤 1만 덜컹, 2·3·0은 괜찮음).
// 추정 원인: 호밍은 30°/초로만 돌아서 TMC2208 StealthChop 자동 보정(AT#2, 중간 속도에서 함)이 첫 빠른 이동에서야 맞춰진다.
// ⚠️ 이동 도중 setAcceleration()을 부르지 말 것 — AccelStepper는 부를 때마다 스텝 없이 속도를 한 칸 올리고(computeNewSpeed)
// 출발 직후엔 _n이 0으로 잘려 속도가 튄다. 그렇게 가속을 20%→100%로 올리던 "부드러운 출발"이 물건 올린 판을
// 탈조시켜 매번 lost가 났다(2026-11-10). 가속은 출발 전에 한 번만 정한다
const int FIRST_ACCEL_PCT = 50;
bool firstMove = true;              // home()이 끝나면 다시 true
// 뒤로(스텝 −방향) 갈 때 (2026-11-10 h2ee: 물건을 올리면 뒤로 가는 걸 잘 못한다 — 원인 미확인).
// BACK_PCT = 뒤로 갈 때 최고 속도·가속을 평소의 몇 %로. forwardOnly = 뒤로 가야 할 때도 앞으로 한 바퀴 돌아서 간다
// (90° 뒤 대신 270° 앞 — 2초쯤 더 걸린다). 시리얼 `b 60`, `r`로 현장에서 바꿔 본다(전원 끄면 원래대로)
int BACK_PCT = 60;
bool forwardOnly = false;
long fastNow = 0;                   // 지금 쓰는 최고 속도(스텝/초). setup에서 FAST, 시리얼 `f`로 바뀜
long accelNow = 0;                  // 지금 쓰는 가속(스텝/초²). setup에서 ACCEL, 시리얼 `a`로 바뀜
// true = 테이프를 찾은 뒤 어긋난 만큼 더 돌아 정확한 90° 자리에 선다(사물이 정확히 90° 간격일 때 맞음)
// false = 테이프 가운데에 선다(사물을 테이프에 맞춰 놓았을 때 맞음). 시리얼 `g`로 바꿔 가며 비교
bool snapGrid = false;              // 2026-11-10 h2ee: 물건 올리고 비교해 보니 테이프 가운데(false)가 더 맞음
const int HOME = 7;             // 센서 신호선 (TCRT5000 DO)
const int HOME_ACTIVE = HIGH;   // 검은 테이프일 때 값
const int STABLE_MS = 15;       // 이만큼 연속으로 같은 값이어야 믿는다 (떨림 무시)
const char* NAMES[] = {"mycelium", "signal", "dandelion", "sora"};

// 드라이버를 켜고 잠깐 선 채로 기다린다. TMC2208 StealthChop은 전류가 켜진 채 멈춰 있는 동안(≥130ms)
// 자동 보정(AT#1)을 한다 — HOLD=false라 켜자마자 돌면 그 보정이 안 돼서 돌 때 웅웅 소리가 난다는 추정(2026-11-08).
// 효과 없으면 ENABLE_SETTLE_MS = 0 으로 예전과 같다. → 들어 보니 차이 없음(2026-11-08). 해는 없어서 남겨 둠
const int ENABLE_SETTLE_MS = 150;
void enableDriver() {
  m.enableOutputs();
  if (ENABLE_SETTLE_MS > 0) delay(ENABLE_SETTLE_MS);
}

// 도착한 뒤 전류를 바로 끄지 않고 잠깐 잡고 있다가 끈다 (2026-11-10 h2ee: 물건 올리니 몇 자리가 늘 조금 더 간다).
// 무거운 판은 멈출 때 모터보다 살짝 앞서 있다(관성으로 자석을 끌고 감). 그 순간 전류를 끄면 앞선 만큼 그대로 더 미끄러진다.
// 잡고 있는 동안 판이 모터 자리로 되돌아와 가라앉는다. 0이면 예전과 같다
const int RELEASE_MS = 400;
void releaseDriver() {
  if (HOLD) return;
  if (RELEASE_MS > 0) delay(RELEASE_MS);
  m.disableOutputs();
}

// 멈춘 데서 SEEK로 출발할 때 20%에서 SEEK_RAMP_MS 동안 100%까지 올린다 (2026-11-10).
// runSpeed는 가속 없이 바로 그 속도로 튀어 나가서, 물건 올린 판에선 출발 순간 탈조 → 모터는 스텝을 셌는데
// 판은 덜 감 → 호밍이 잰 테이프 간격이 틀어져 사물 번호가 밀렸다. (setSpeed는 이동 중에 불러도 안전하다 —
// 위험한 건 setAcceleration)
const int SEEK_RAMP_MS = 400;

// want(테이프/흰 면)가 STABLE_MS 동안 유지될 때까지 현재 setSpeed로 돈다. maxSteps 안에 못 찾으면 false.
// soft = 멈춘 데서 출발(속도를 서서히 올림). 이미 돌고 있는 중이면 false
bool runUntil(bool want, long maxSteps, bool soft = true) {
  long start = m.currentPosition();
  unsigned long since = 0;
  bool was = false;
  float full = m.speed();
  unsigned long t0 = millis(), tSet = t0;
  if (soft) m.setSpeed(full * 0.2);
  while (labs(m.currentPosition() - start) < maxSteps) {
    if (soft && millis() - tSet >= 5) {
      tSet = millis();
      unsigned long e = tSet - t0;
      if (e >= (unsigned long)SEEK_RAMP_MS) { m.setSpeed(full); soft = false; }
      else m.setSpeed(full * (0.2 + 0.8 * e / SEEK_RAMP_MS));
    }
    m.runSpeed();
    bool now = (digitalRead(HOME) == HOME_ACTIVE) == want;
    if (now && !was) { since = millis(); edgePos = m.currentPosition(); }
    was = now;
    if (now && millis() - since >= STABLE_MS) { m.setSpeed(full); return true; }
  }
  m.setSpeed(full);
  return false;
}

// dir 방향으로 다음 테이프를 찾아 그 가운데에 선다. 테이프 폭(스텝)을 돌려주고, 못 찾으면 -1
// fromRest = 멈춘 데서 부름 (호밍 중 테이프 사이를 이어 달릴 때만 false)
long seekMark(int dir, long maxSteps, bool fromRest = true) {
  if (digitalRead(HOME) == HOME_ACTIVE) {               // 이미 테이프 위면 뒤로 물러나서 시작 (가운데 계산이 틀어지지 않게)
    m.setSpeed(-dir * SEEK);
    runUntil(false, REV / 4);
    fromRest = true;                                    // 방향을 뒤집으니 다시 서서히
  }
  m.setSpeed(dir * SEEK);
  if (!runUntil(true, maxSteps, fromRest)) return -1;   // 테이프 시작
  long a = edgePos;                                     // 2026-11-09: 확인이 끝난 자리 대신 처음 바뀐 자리 — goTo의 가운데 계산과 같은 기준
  if (!runUntil(false, REV / 4, false)) return -1;      // 테이프 끝 (90° 넘게 검으면 이상)
  long b = edgePos;
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
// 실패하면 한 번 더 (판이 한 번 걸린 것뿐일 수 있다). 두 번 다 실패하면 예전 값(markOff 등)을 그대로 쓴다
bool homeOnce();
void home() {
  if (!homeOnce()) homeOnce();
}
bool homeOnce() {
  enableDriver();
  m.setSpeed(SEEK);
  const char* err = nullptr;
  long w[4], pos[4];
  if (!runUntil(false, REV / 4)) err = "home_fail no_plate";      // 이미 테이프 위면 먼저 벗어난다. 흰 면이 안 보이면 실패
  else for (int i = 0; i < 4; i++) {
    w[i] = seekMark(1, REV / 2, false);                            // 바로 앞 runUntil에서 이어 달린다
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
      // 넓은 테이프 기준으로 나머지가 몇 번 자리인지, 얼마나 어긋났는지. 먼저 검사만 하고 맞을 때만 쓴다 —
      // 판이 걸려 미끄러지면 간격이 틀어져 두 테이프가 같은 번호로 잡히거나 크게 어긋나 사물 번호가 밀린다(2026-11-10)
      long off[4], ww[4];
      bool got[4] = {false, false, false, false};
      for (int i = 0; i < 4; i++) {
        long rel = ((pos[i] - pos[k]) % REV + REV) % REV;
        int j = (rel * 4 + REV / 2) / REV % 4;
        long o = wrap(rel - j * REV / 4);
        if (got[j] || labs(o) > REV / 16) { err = "home_fail spacing"; break; }   // 한 자리에 둘, 또는 22.5° 넘게 어긋남
        got[j] = true; off[j] = o; ww[j] = w[i];
      }
      if (!err) {
        m.moveTo(m.currentPosition() + wrap(pos[k] - m.currentPosition()));  // 가장 넓은 테이프 가운데로 (최단 경로)
        m.runToPosition();
        m.setCurrentPosition(0);
        for (int j = 0; j < 4; j++) { markOff[j] = off[j]; markW[j] = ww[j]; }
        wideMin = (w[k] + second) / 2;
      }
    }
    if (!err) {
      Serial.print("wide_min "); Serial.println(wideMin);
      Serial.print("offsets");
      for (int i = 0; i < 4; i++) { Serial.print(' '); Serial.print(markOff[i]); }
      Serial.println();
    }
  }
  releaseDriver();
  firstMove = true;
  curIdx = err ? -1 : 0;                                // 성공하면 넓은 테이프(0번) 위
  Serial.println(err ? err : "homed");
  return !err;
}

void goToSeek(int idx, bool retry);
void relocateTo(int idx, bool retry);

// 도는 중에 테이프 j에 들어설 때마다 (2026-11-10 정확도): 그 테이프의 실제 가운데(들어선 끝 + 폭/2)와 호밍 때 기억한
// 가운데를 비교해서 어긋난 만큼 목표를 민다(moveTo는 도는 중에 바꿔도 부드럽다). 지나가는 테이프마다 고치니
// 목표에 다가갈수록 좌표가 맞아지고, 마지막 테이프에서 고친 값으로 바로 선다 — 예전처럼 멈춘 뒤 다시 움직이는 보정이 없다.
// shift = 지금까지 쌓인 어긋남(좌표 − 실제). 멈춘 뒤 setCurrentPosition(pos − shift)로 좌표를 바로잡는다
const long TRUST = REV / 16;                            // 22.5° 넘게 어긋난 값은 안 믿는다(깜빡임 등) — 세는 데엔 그대로 센다
void correctAt(int j, long entryPos, int dir, long &shift, long &target) {
  long c = j * REV / 4 + markOff[j];
  long seen = entryPos + dir * (markW[j] / 2);
  long err = wrap(seen - shift - c);
  if (labs(err) > TRUST) return;
  shift += err;
  target += err;
  m.moveTo(target);
}
// 2026-11-10 NEMA17용 — 테이프를 세어서 간다 (h2ee 아이디어). 호밍으로 0번(넓은 테이프)을 잡은 뒤로는
// 앞으로 1번째 테이프 = signal, 2번째 = dandelion, 3번째 = sora. 스텝 수는 부드러운 한 번 이동을 계획하는 데만 쓰고,
// 몇 번 테이프인지는 지나간 테이프 개수로 정한다 → 판이 걸려 덜 가도(탈조) 번호가 밀리지 않는다.
//   - 서야 할 자리까지 가감속 한 번에 간다. 가는 길에 테이프에 들어설 때마다 센다(STABLE_MS 확인, 들어선 자리는 처음 바뀐 스텝)
//   - k번째(목표) 테이프에 들어선 끝 + 폭/2 = 실제 가운데로 위치를 바로잡고, 1° 넘게 어긋났을 때만 조금 더 간다
//   - 덜 셌으면(걸려서 덜 감) SEEK로 마저 세며 찾는다. 목표에서는 테이프 폭으로 0번/나머지가 맞는지 한 번 더 본다
//   - 출발할 때 테이프 위가 아니면 서 있는 동안 손에 밀린 것 → 번호를 못 믿으니 호밍부터
// 예전(2026-11-09~10 오전)은 "목표 테이프가 있어야 할 자리 ±45° 안의 끝"을 스텝 좌표로 골라서, 미끄러져 좌표가
// 틀어지면 옆 테이프를 목표로 잡아 사물 번호가 밀렸다
void goTo(int idx, bool retry) {
#if !NEMA17
  goToSeek(idx, retry); return;                         // 28BYJ-48은 스텝을 놓치니 예전 방식
#endif
  if (curIdx < 0) {                                     // 어디인지 모름 (호밍 실패 뒤 등) — 테이프 간격부터 다시 잰다
    Serial.println("unknown");
    home();
    if (curIdx < 0) return;                             // 호밍 실패 — home이 이미 home_fail을 알렸다
  }
  if (digitalRead(HOME) != HOME_ACTIVE) {               // 테이프에서 벗어나 있음 = 서 있는 동안 손에 밀림(관람객이 돌려 봄)
    Serial.println("moved");
    relocateTo(idx, retry);
    return;
  }
  if (idx == curIdx) { Serial.print("arrived "); Serial.println(NAMES[idx]); return; }
  int fwd = (idx - curIdx + 4) % 4;                     // 앞으로 몇 칸
  int dir = (fwd <= 2 || forwardOnly) ? 1 : -1;         // 2칸(180°)은 앞으로
  int k = dir > 0 ? fwd : 4 - fwd;                      // 들어설 테이프 수 (마지막 = 목표)

  long tape = idx * REV / 4 + markOff[idx];
  long stop = snapGrid ? idx * REV / 4 : tape;
  long cur  = m.currentPosition();
  long target = cur + wrap(stop - cur);
  if (dir > 0 && target <= cur) target += REV;          // 방향은 칸 수로 정했으니 좌표가 그 반대로 나오면 한 바퀴 보탠다
  if (dir < 0 && target >= cur) target -= REV;

  enableDriver();
  long acc = firstMove ? accelNow * FIRST_ACCEL_PCT / 100 : accelNow;
  if (dir < 0) acc = acc * BACK_PCT / 100;
  m.setMaxSpeed(dir < 0 ? fastNow * BACK_PCT / 100 : fastNow);
  m.setAcceleration(acc);                               // 이동 도중엔 안 바꾼다
  firstMove = false;
  m.moveTo(target);
  // 센서 상태를 STABLE_MS 확인으로 굳혀서 센다 — 테이프 가운데 흠집 같은 깜빡임이 테이프 하나를 둘로 세지 않게
  bool st = true, raw = true;                           // 테이프 위에서 출발 (위에서 확인함)
  long rawPos = cur, shift = 0;
  unsigned long rawT = millis();
  int count = 0;
  while (m.distanceToGo() != 0) {
    m.run();
    bool on = digitalRead(HOME) == HOME_ACTIVE;
    if (on != raw) { raw = on; rawPos = m.currentPosition(); rawT = millis(); }
    if (raw != st && millis() - rawT >= STABLE_MS) {
      st = raw;
      if (st && ++count <= k) correctAt(((curIdx + dir * count) % 4 + 4) % 4, rawPos, dir, shift, target);
    }
  }
  if (raw != st) {                                      // 멈추기 직전에 바뀌었으면 선 채로 확인 (여기선 목표를 못 고친다 — 들어선 것만 센다)
    delay(STABLE_MS);
    if ((digitalRead(HOME) == HOME_ACTIVE) == raw) { st = raw; if (st) ++count; }
  }
  m.setMaxSpeed(fastNow);
  m.setAcceleration(accelNow);                          // 멈춰 있을 때(목표 = 현재) 되돌려야 속도가 안 튄다

  long fix;
  if (count == k && st) {                               // 정상: 목표 테이프 위에 섰다 (도는 중에 이미 고친 자리)
    fix = -shift;                                       // 이번 이동에서 바로잡은 양. 0 근처가 정상
    m.setCurrentPosition(m.currentPosition() - shift);
  } else {
    long w;
    if (count < k) {                                    // 덜 갔다(걸림/탈조) — 가던 방향으로 마저 센다
      Serial.print("slip "); Serial.println(k - count);
      if (st) { m.setSpeed(dir * SEEK); runUntil(false, REV / 4); }   // 이미 센 테이프 위면 먼저 벗어난다
      w = -1;
      while (count < k) {
        w = seekMark(dir, REV / 2);                     // 다음 테이프 가운데에 선다
        if (w < 0) break;
        if (++count < k) { m.setSpeed(dir * SEEK); runUntil(false, REV / 4); }
      }
    } else {                                            // 더 갔다(목표를 지나침) — 뒤로 가장 가까운 테이프 = 목표
      Serial.println("overshoot");
      w = count == k ? seekMark(-dir, REV / 4) : -1;    // 목표 다음 테이프까지 셌으면 믿지 않는다
    }
    if (w < 0 || (w >= wideMin) != (idx == 0)) {        // 못 찾음 / 0번인데 좁음·나머지인데 넓음
      releaseDriver();
      Serial.println(w < 0 ? "lost" : "wrong_mark");
      curIdx = -1;
      home();
      if (retry && curIdx >= 0) goTo(idx, false);
      return;
    }
    long here = m.currentPosition();                    // 목표 테이프 가운데 — 번호는 센 것으로 확실하니 좌표를 그 테이프에 맞춘다
    fix = wrap(tape - here);
    m.setCurrentPosition(here + fix);
    m.moveTo(m.currentPosition() + wrap(stop - m.currentPosition()));
    m.runToPosition();
  }
  curIdx = idx;
  releaseDriver();
  Serial.print("fix "); Serial.println(fix);
  Serial.print("arrived "); Serial.println(NAMES[idx]);
}

// 판이 손에 밀렸을 때 (2026-11-10 h2ee: 관람객이 돌려 봤는데 한 바퀴 호밍으로 다 찾으면 당황스럽다).
// 멈춰 재고 돌아오는 호밍 대신, 평소 이동처럼 앞으로 부드럽게 돌다가 넓은 테이프(0번)를 지나는 순간 거기를 기준으로
// 목표를 다시 정해(moveTo는 도는 중에 바꿔도 부드럽다) 그대로 이어서 세어 간다 — 보는 사람에겐 한 번 쭉 도는 것.
// 더 돌게 되는 양은 평균 반 바퀴쯤(넓은 테이프가 어디 있느냐에 따라 0~1바퀴). 테이프 간격(markOff)은 예전 호밍 값을 그대로 쓴다.
// ⚠️ 도는 중에 setCurrentPosition·setAcceleration은 부르지 않는다(속도가 0으로 튄다) — 좌표는 base를 빼서 셈하고 멈춘 뒤에 맞춘다
void relocateTo(int idx, bool retry) {
  enableDriver();
  m.setMaxSpeed(fastNow);
  m.setAcceleration(accelNow);
  long cur = m.currentPosition();
  m.moveTo(cur + 2 * REV);                              // 일단 넉넉히. 넓은 테이프를 지나면 진짜 목표로 바꾼다
  bool st = digitalRead(HOME) == HOME_ACTIVE, raw = st;
  bool skip = st;                                       // 테이프 위에서 출발했으면 들어선 끝을 못 봐서 폭을 모른다 → 그 테이프는 안 잰다
  long rawPos = cur, entry = 0, base = 0, target = 0, shift = 0;
  unsigned long rawT = millis();
  bool found = false;
  int count = 0, k = 0;
  while (m.distanceToGo() != 0) {
    m.run();
    bool on = digitalRead(HOME) == HOME_ACTIVE;
    if (on != raw) { raw = on; rawPos = m.currentPosition(); rawT = millis(); }
    if (raw != st && millis() - rawT >= STABLE_MS) {
      st = raw;
      if (st) {                                         // 테이프에 들어섬
        entry = rawPos;
        if (found && ++count <= k) correctAt(count % 4, rawPos, 1, shift, target);
      } else if (skip) {
        skip = false;
      } else if (!found && rawPos - entry >= wideMin) { // 방금 지난 테이프가 넓다 = 0번
        found = true;
        base = (entry + rawPos) / 2;                    // 0번 가운데 (지금 좌표)
        shift = base;                                   // 실제 좌표 = 지금 좌표 − base
        long turn = idx == 0 ? REV : 0;                 // 0번이 목표면 한 바퀴 더 돌아 다시 만난다
        target = base + turn + idx * REV / 4 + (snapGrid ? 0 : markOff[idx]);
        k = idx == 0 ? 4 : idx;
        m.moveTo(target);
      }
    }
  }
  if (raw != st) {                                      // 멈추기 직전에 들어섰으면 선 채로 확인
    delay(STABLE_MS);
    if ((digitalRead(HOME) == HOME_ACTIVE) == raw) { st = raw; if (st && found) ++count; }
  }
  if (!found || count != k || !st) {                    // 두 바퀴 안에 넓은 테이프를 못 봤거나, 세다가 어긋남(걸림)
    releaseDriver();
    Serial.println(!found ? "lost" : "slip");
    curIdx = -1;
    home();
    if (retry && curIdx >= 0) goTo(idx, false);
    return;
  }
  long fix = base - shift;                              // 넓은 테이프 뒤로 바로잡은 양
  m.setCurrentPosition(m.currentPosition() - shift);    // 멈춘 뒤 좌표를 0번 가운데 = 0 기준으로
  curIdx = idx;
  releaseDriver();
  Serial.print("fix "); Serial.println(fix);
  Serial.print("arrived "); Serial.println(NAMES[idx]);
}

// 예전 방식 (2026-11-09까지 NEMA17도 이것): 빠르게 APPROACH 앞까지 → 멈춤 → SEEK로 테이프 끝까지 → 가운데로 되돌아옴.
// 테이프 폭으로 0번/나머지를 확인하는 wrong_mark가 여기만 있다. 28BYJ-48은 지금도 이걸 쓴다
void goToSeek(int idx, bool retry) {
  long tape = idx * REV / 4 + markOff[idx];             // 그 테이프의 실제 가운데
  long stop = snapGrid ? idx * REV / 4 : tape;          // 서야 할 자리
  long cur  = m.currentPosition();
  if (wrap(stop - cur) == 0) { Serial.print("arrived "); Serial.println(NAMES[idx]); return; }
  long diff = wrap(tape - cur);                         // 최단 경로
  int dir = diff >= 0 ? 1 : -1;
  enableDriver();
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
  releaseDriver();
  Serial.print("fix "); Serial.println(fix);
  Serial.print("arrived "); Serial.println(NAMES[idx]);
}

#if NEMA17 && TMC_UART
// 2026-11-08: 판 없이도 돌 때 "끼릭" — 스탠드얼론에선 드라이버가 SpreadCycle인지 StealthChop인지 알 수 없어서
// UART로 직접 StealthChop을 켠다. 연결이 안 되면 아무것도 안 쓴다(스탠드얼론 그대로 — 핀 MS1·MS2로 1/8).
// ⚠️ 쓰기 시작하면 마이크로스텝도 레지스터가 정한다(mstep_reg_select) — 기본이 1/256이라 반드시 8로 다시 쓴다
bool tmcOk = false;
void tmcSetup() {
  drv.beginSerial(57600);                               // TMC2208은 보율을 알아서 맞춘다. SoftwareSerial엔 115200이 버거워서 낮춤
  delay(5);
  if (drv.test_connection() != 0) { Serial.println("tmc none"); return; }
  Serial.print("tmc was ");                             // 손대기 전 상태(OTP 기본값) — 범인 확인용
  Serial.println(drv.en_spreadCycle() ? "spreadcycle" : "stealthchop");
  drv.pdn_disable(true);                                // PDN_UART 핀을 UART 전용으로
  drv.I_scale_analog(true);                             // 전류는 지금처럼 가변저항(Vref)
  drv.mstep_reg_select(true);
  drv.microsteps(8);                                    // REV(1600)와 맞춘다
  drv.intpol(true);                                     // 256 보간
  drv.toff(3);
  drv.en_spreadCycle(false);                            // StealthChop
  drv.pwm_autoscale(true);
  drv.pwm_autograd(true);
  tmcOk = drv.microsteps() == 8 && !drv.en_spreadCycle();
  Serial.println(tmcOk ? "tmc stealthchop" : "tmc write_fail");
}
void tmcStatus() {                                      // `u` — 지금 드라이버 상태
  if (drv.test_connection() != 0) { Serial.println("tmc none"); return; }
  Serial.print("tmc mode ");  Serial.println(drv.en_spreadCycle() ? "spreadcycle" : "stealthchop");
  Serial.print("tmc mstep "); Serial.println(drv.microsteps());
  Serial.print("tmc pwm_auto "); Serial.println(drv.pwm_autoscale());
  Serial.print("tmc stealth_now "); Serial.println(drv.stealth());  // 실제 지금 쓰고 있는 쪽 (도는 중에 의미 있음)
}
#endif

int parse(String s) {
  s.trim();
  if (s.length() == 1 && s[0] >= '0' && s[0] <= '3') return s[0] - '0';
  for (int i = 0; i < 4; i++) if (s == NAMES[i]) return i;
  if (s == "h") return 9;
  if (s == "g") return 8;
  if (s == "r") return 6;
  if (s == "u") return 7;
  return -1;
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(20);
  pinMode(HOME, INPUT);         // 모듈에 저항이 이미 있다
#if NEMA17
  m.setPinsInverted(DIR_INVERT, false, true);           // EN은 LOW가 켜짐 — setEnablePin보다 먼저(안 그러면 켜질 때 한 번 반대로 씀)
  m.setEnablePin(EN_PIN);
#if TMC_UART
  tmcSetup();                                           // 12V가 없으면 드라이버가 대답을 안 할 수 있다 → 12V 넣은 뒤 `u` 또는 리셋
#endif
#endif
  fastNow = FAST;
  m.setMaxSpeed(fastNow);
  accelNow = ACCEL;
  m.setAcceleration(accelNow);
  home();
}

// 소리 시험용 (2026-11-08). 속도 단위는 °/초, 전원 끄면 펌웨어 값으로 돌아간다
//   v 30  — 30°/초로 한 바퀴 일정하게 돈다(센서 안 봄, 음수면 반대로). 속도별 소리 비교용
//   f 45  — 이동 최고 속도(FAST)를 45°/초로
//   a 45  — 이동 가속(ACCEL)을 45°/초²로
//   s 30  — 테이프 찾는 속도(SEEK)를 30°/초로. 호밍·이동 마지막 구간이 이 속도. 빠르면 테이프 폭 측정이 거칠어진다
//   b 60  — 뒤로 갈 때 속도·가속을 평소의 60%로 (5~100)
//   r     — 앞으로만 돌기 켜기/끄기 (parse 쪽)
// 맞는 값을 찾으면 위 FAST·ACCEL·SEEK·BACK_PCT 상수에 옮겨 적을 것.
// 도는 동안엔 명령을 못 받는다(v 10 한 바퀴 = 36초) — 그래서 v는 아무 줄이나 오면 그 자리에서 멈춘다
bool tuneCmd(String s) {
  s.trim();
  if (s.length() < 3 || s[1] != ' ') return false;
  char k = s[0];
  if (k == 'b') {
    BACK_PCT = constrain(s.substring(2).toInt(), 5, 100);
    Serial.print("back "); Serial.println(BACK_PCT);
    return true;
  }
  if (k != 'v' && k != 'f' && k != 'a' && k != 's') return false;
  long deg = s.substring(2).toInt();
  long mag = constrain(labs(deg), 5, 360);             // Uno + AccelStepper 여유 안에서 (360°/초 = 1600스텝/초)
  long sps = REV * mag / 360;
  if (k == 'v') {
    Serial.print("spin "); Serial.println(deg < 0 ? -mag : mag);
    enableDriver();
    long start = m.currentPosition();
    m.setSpeed(deg < 0 ? -sps : sps);
    bool stopped = false;
    while (labs(m.currentPosition() - start) < REV) {   // 한 바퀴 = 같은 자리. 중간에 멈춰도 스텝을 셌으니 위치 기준은 그대로
      m.runSpeed();
      if (Serial.available()) { stopped = true; break; } // 뭐든 보내면 멈춤 (그 줄은 버린다)
    }
    if (!HOLD) m.disableOutputs();
    if (stopped) { while (Serial.available()) Serial.read(); Serial.println("stopped"); }
    else Serial.println("spun");
  } else if (k == 'f') {
    fastNow = sps;
    m.setMaxSpeed(sps);
    Serial.print("fast "); Serial.println(mag);
  } else if (k == 's') {
    SEEK = sps;
    Serial.print("seek "); Serial.println(mag);
  } else {
    accelNow = sps;                                     // goTo가 이동마다 이 값으로 다시 정한다
    m.setAcceleration(sps);
    Serial.print("accel "); Serial.println(mag);
  }
  return true;
}

void loop() {
  int cmd = -1;
  while (Serial.available()) {                          // 도는 동안 쌓인 명령은 마지막 것만 (다이얼을 빨리 돌린 경우)
    String line = Serial.readStringUntil('\n');
    if (tuneCmd(line)) continue;
    int c = parse(line);
    if (c >= 0) cmd = c;
  }
  if (cmd == 9) home();
#if NEMA17 && TMC_UART
  else if (cmd == 7) { if (!tmcOk) tmcSetup(); tmcStatus(); }
#endif
  else if (cmd == 6) { forwardOnly = !forwardOnly; Serial.print("forward_only "); Serial.println(forwardOnly ? 1 : 0); }
  else if (cmd == 8) { snapGrid = !snapGrid; Serial.print("grid "); Serial.println(snapGrid ? 1 : 0); }
  else if (cmd >= 0) goTo(cmd, true);
}
