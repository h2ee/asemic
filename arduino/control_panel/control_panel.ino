// asemic 패널 — Uno R4 WiFi
// 한 줄 = 한 이벤트. id는 src/js/controls.js와 같은 이름.
struct Knob { const char* id; int pin; float last; };
//struct Sw   { const char* id; int pin; bool toggle; bool last; unsigned long t; };
struct Sw { const char* id; int pin; bool toggle; bool last; bool raw; unsigned long t; };

Knob knobs[] = { {"size", A0, -1}, {"spacing", A1, -1}, {"leading", A2, -1} };
Sw sws[] = {
  {"weather", 2, false}, {"meal", 3, false}, {"hello", 4, false},
  {"send", 5, false},
  {"joke", 6, true}, {"question", 7, true}, {"bye", 8, true},
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
    else if (r) { Serial.print("btn "); Serial.println(s.id); }
  }
}