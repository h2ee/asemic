// TCRT5000 반사 테스트 — 우드락 흰 면 / 흰 전기테이프 / 검은 테이프 비교용
// 배선: VCC → 5V, GND → GND, DO → D7 (턴테이블과 같음), AO → A0 (이 테스트에만 추가)
// 시리얼 모니터 115200. 0.5초마다 한 줄: AO 평균·최소·최대, DO에서 1(검정)이 나온 비율
// AO는 반사가 셀수록 낮다(흰 면 ≈ 낮음, 검은 테이프 ≈ 높음). DO는 모듈 가변저항 기준으로 자른 값

const int AO_PIN = A0, DO_PIN = 7;
const unsigned long WINDOW_MS = 500;

void setup() {
  Serial.begin(115200);
  pinMode(DO_PIN, INPUT);
  Serial.println("ao_avg ao_min ao_max do_black%");
}

void loop() {
  unsigned long start = millis();
  long sum = 0;
  int n = 0, lo = 1023, hi = 0, black = 0;
  while (millis() - start < WINDOW_MS) {
    int v = analogRead(AO_PIN);
    sum += v; n++;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    if (digitalRead(DO_PIN) == HIGH) black++;
    delay(2);
  }
  Serial.print(sum / n); Serial.print(' ');
  Serial.print(lo); Serial.print(' ');
  Serial.print(hi); Serial.print(' ');
  Serial.println(black * 100L / n);
}
