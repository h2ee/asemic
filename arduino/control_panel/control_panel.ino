// asemic 패널 — Uno R4 WiFi
// 한 줄 = 한 이벤트. id는 src/js/controls.js와 같은 이름.
struct Knob { const char* id; int pin; float last; };
//struct Sw   { const char* id; int pin; bool toggle; bool last; unsigned long t; };
//struct Sw { const char* id; int pin; bool toggle; bool last; bool raw; unsigned long t; };
// led: 버튼 조명을 끄고 켜는 핀(ULN2003 IN, -1 = 조명 제어 없음). flash: 누른 순간 millis(0 = 안 반짝임)
struct Sw { const char* id; int pin; bool toggle; int led; bool last; bool raw; unsigned long t; unsigned long flash; };

// 누른 버튼만 반짝 (2026-11-09) — 평소엔 켜 두고, 누르면 꺼짐/켜짐을 FLASH_N번 되풀이한 뒤 다시 켜짐.
// 아두이노 혼자 한다(화면과 상관없음). 농담·질문 링은 스위치에 붙어 있어 제어 못 하고, INVERSE LED는 토글 배선 그대로
const unsigned long FLASH_MS = 80;   // 꺼짐·켜짐 한 번의 길이
const int FLASH_N = 3;               // 몇 번 깜빡일지
const bool LED_IDLE_ON = true;       // 평소 상태(false면 평소엔 꺼 두고 누를 때만 깜빡)
// LED_HOLD = true면 버튼 상태를 그대로 따른다 — 위 깜빡임 설정은 안 쓰인다(되돌릴 때 false)
const bool LED_HOLD = true;
// LED_HOLD일 때 평소 상태: true = 평소 켜짐 · 누르는 동안 꺼짐 (2026-11-09 h2ee 결정) / false = 평소 꺼짐 · 누르는 동안 켜짐
const bool LED_HOLD_IDLE_ON = true;

Knob knobs[] = { {"size", A0, -1}, {"spacing", A1, -1}, {"leading", A2, -1} };
Sw sws[] = {
  {"weather", 3, false, 10}, {"meal", 2, false, 9}, {"hello", 4, false, 11},   // 2026-11-09 실물 배선에 맞춰 날씨↔밥 핀 교체
  {"send", 5, false, 12},
  {"joke", 6, true, -1}, {"question", 7, true, -1}, {"bye", 8, true, -1},
};
const int NK = sizeof(knobs) / sizeof(knobs[0]);
const int NS = sizeof(sws) / sizeof(sws[0]);

float readKnob(int pin) {                 // 16번 평균 → 0~1
  long s = 0;
  for (int i = 0; i < 16; i++) s += analogRead(pin);
  float v = s / 16.0 / 1023.0;
  if (v < 0.01) v = 0;
  if (v > 0.99) v = 1;
  return v;
}

void sendKnob(Knob& k, float v) {
  k.last = v;
  Serial.print("knob "); Serial.print(k.id); Serial.print(" "); Serial.println(v, 3);
}
void sendTog(Sw& s) {
  Serial.print("tog "); Serial.print(s.id); Serial.print(" "); Serial.println(s.last ? 1 : 0);
}
void dumpAll() {
  for (int i = 0; i < NK; i++) sendKnob(knobs[i], readKnob(knobs[i].pin));
  for (int i = 0; i < NS; i++) if (sws[i].toggle) sendTog(sws[i]);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < NS; i++) {
    pinMode(sws[i].pin, INPUT_PULLUP);
    sws[i].last = sws[i].raw = digitalRead(sws[i].pin) == LOW;
    if (sws[i].led >= 0) { pinMode(sws[i].led, OUTPUT); digitalWrite(sws[i].led, (LED_HOLD ? LED_HOLD_IDLE_ON : LED_IDLE_ON) ? HIGH : LOW); }
  }
  delay(500);
  dumpAll();
}

void loop() {
  if (Serial.available() && Serial.read() == '?') dumpAll();   // 페이지가 붙으면 현재 상태 다시 보냄

  for (int i = 0; i < NK; i++) {
    float v = readKnob(knobs[i].pin);
    if (fabs(v - knobs[i].last) > 0.01) sendKnob(knobs[i], v);
  }

  unsigned long now = millis();
  for (int i = 0; i < NS; i++) {
    Sw& s = sws[i];
    bool r = digitalRead(s.pin) == LOW;
    if (r != s.raw) { s.raw = r; s.t = now; continue; }   // 흔들리는 중 — 타이머 다시 시작
    if (r == s.last || now - s.t < 50) continue;          // 50ms 동안 그대로여야 인정
    s.last = r;
    if (s.toggle) sendTog(s);
    else if (r) { Serial.print("btn "); Serial.println(s.id); s.flash = now | 1; }
  }

  for (int i = 0; i < NS; i++) {                          // 조명 — HIGH = ULN2003이 LED −를 GND로 당김 = 켜짐
    Sw& s = sws[i];
    if (s.led < 0) continue;
    if (LED_HOLD) { digitalWrite(s.led, s.raw != LED_HOLD_IDLE_ON ? HIGH : LOW); continue; }   // 흔들림 거르기 전 값 — 누르자마자 바뀐다
    bool on = LED_IDLE_ON;
    if (s.flash) {
      unsigned long e = now - s.flash;
      if (e < FLASH_MS * 2 * FLASH_N) on = (e / FLASH_MS) % 2 == (LED_IDLE_ON ? 1 : 0);   // 평소와 반대로 시작
      else s.flash = 0;
    }
    digitalWrite(s.led, on ? HIGH : LOW);
  }
}