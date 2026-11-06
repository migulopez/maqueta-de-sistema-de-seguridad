/* NEXO Smart Home — Arduino UNO reference firmware.
   Serial: 115200 baud, newline-delimited JSON. See README for wiring and safety.
   The gate position is TIME-ESTIMATED (there are no gate limit switches).
   Adjust GATE_TRAVEL_MS and sound calibration before connecting a physical gate.
*/
#include <Servo.h>

const byte TRIG_PIN = 2, ECHO_PIN = 3;
const byte LIMIT_CLOSED_PIN = 4, LIMIT_OPEN_PIN = 5;
const byte RELAY_PIN = 6, LED_PIN = 7, LIGHT_PIN = 8;
const byte SERVO_PIN = 9;
const byte M1A = 10, M1B = 11, M2A = 12, M2B = 13;
const byte LDR_PIN = A0, SOUND_PIN = A1;
const unsigned long GATE_TRAVEL_MS = 1600; // calibrate for your mechanism
const int LDR_DARK_THRESHOLD = 390;
const int SOUND_PEAK_AT_100 = 250; // calibrate using actual mic readings

Servo doorServo;
int detectionRange = 100, soundThreshold = 58;
int servoAngle = 0, ldr = 0, soundLevel = 0;
long distanceCm = 300;
bool detected = false, alarmActive = false, lights = false;
bool buzzer = false, relayOn = false;
unsigned long lastSeen = 0, buzzerUntil = 0, lastTelemetry = 0, lastServo = 0;
unsigned long gateUpdated = 0;
float gateProgress = 0; // estimate, NOT a measured gate position
char commandBuffer[120]; byte commandLength = 0;

int commandNumber(const char* text, const char* key, int fallback) {
  const char* field = strstr(text, key);
  if (!field) return fallback;
  const char* colon = strchr(field, ':');
  return colon ? atoi(colon + 1) : fallback;
}
void motors(int direction) {
  //  1 = descend, -1 = ascend, 0 = stop. External motor power is required.
  digitalWrite(M1A, direction == 1); digitalWrite(M1B, direction == -1);
  digitalWrite(M2A, direction == 1); digitalWrite(M2B, direction == -1);
}
void handleCommand(const char* line) {
  if (strstr(line, "\"reset\"")) {
    alarmActive = false;
    gateUpdated = millis();
  }
  if (strstr(line, "\"config\"")) {
    detectionRange = constrain(commandNumber(line, "\"detectionRange\"", detectionRange), 40, 180);
    soundThreshold = constrain(commandNumber(line, "\"soundThreshold\"", soundThreshold), 25, 90);
  }
}
void readCommands() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') { commandBuffer[commandLength] = 0; handleCommand(commandBuffer); commandLength = 0; }
    else if (c != '\r' && commandLength < sizeof(commandBuffer)-1) commandBuffer[commandLength++] = c;
    else if (commandLength >= sizeof(commandBuffer)-1) commandLength = 0;
  }
}
void publishTelemetry(const char* gateState, bool motorMoving) {
  Serial.print(F("{\"distanceCm\":")); Serial.print(distanceCm);
  Serial.print(F(",\"ldr\":")); Serial.print(ldr);
  Serial.print(F(",\"sound\":")); Serial.print(soundLevel);
  Serial.print(F(",\"detected\":")); Serial.print(detected ? F("true") : F("false"));
  Serial.print(F(",\"openLimit\":")); Serial.print(digitalRead(LIMIT_OPEN_PIN) == LOW ? F("true") : F("false"));
  Serial.print(F(",\"closedLimit\":")); Serial.print(digitalRead(LIMIT_CLOSED_PIN) == LOW ? F("true") : F("false"));
  Serial.print(F(",\"servoAngle\":")); Serial.print(servoAngle);
  Serial.print(F(",\"lights\":")); Serial.print(lights ? F("true") : F("false"));
  Serial.print(F(",\"buzzer\":")); Serial.print(buzzer ? F("true") : F("false"));
  Serial.print(F(",\"relay\":")); Serial.print(relayOn ? F("true") : F("false"));
  Serial.print(F(",\"alarm\":")); Serial.print(alarmActive ? F("true") : F("false"));
  Serial.print(F(",\"motor1\":")); Serial.print(motorMoving ? F("true") : F("false"));
  Serial.print(F(",\"motor2\":")); Serial.print(motorMoving ? F("true") : F("false"));
  Serial.print(F(",\"gateProgress\":")); Serial.print(gateProgress, 2);
  Serial.print(F(",\"gateState\":\"")); Serial.print(gateState); Serial.println(F("\"}"));
}
void setup() {
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  pinMode(LIMIT_CLOSED_PIN, INPUT_PULLUP); pinMode(LIMIT_OPEN_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT); pinMode(LED_PIN, OUTPUT); pinMode(LIGHT_PIN, OUTPUT);
  pinMode(M1A, OUTPUT); pinMode(M1B, OUTPUT); pinMode(M2A, OUTPUT); pinMode(M2B, OUTPUT);
  motors(0); digitalWrite(RELAY_PIN, LOW);
  doorServo.attach(SERVO_PIN); doorServo.write(0);
  Serial.begin(115200);
  gateUpdated = millis();
}
void loop() {
  readCommands();
  unsigned long now = millis();
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 18000);
  distanceCm = duration ? constrain((long)(duration / 58), 2, 300) : 300;
  detected = distanceCm <= detectionRange;
  if (detected) { if (now - lastSeen > 700) buzzerUntil = now + 450; lastSeen = now; }
  bool openDoor = detected || now - lastSeen < 1300;
  // FC1/FC2 are physically read for telemetry. Servo angle is commanded, not measured.
  if (now - lastServo >= 15) {
    lastServo = now;
    if (openDoor && servoAngle < 90) servoAngle++;
    else if (!openDoor && servoAngle > 0) servoAngle--;
    doorServo.write(servoAngle);
  }
  ldr = analogRead(LDR_PIN);
  lights = ldr < LDR_DARK_THRESHOLD;
  digitalWrite(LIGHT_PIN, lights ? HIGH : LOW);

  // Peak-to-peak analog envelope rather than raw DC bias (typical microphone modules).
  int low = 1023, high = 0;
  unsigned long windowStart = millis();
  while (millis() - windowStart < 18) {
    int sample = analogRead(SOUND_PIN);
    if (sample < low) low = sample;
    if (sample > high) high = sample;
  }
  soundLevel = constrain((high - low) * 100 / SOUND_PEAK_AT_100, 0, 100);
  if (soundLevel >= soundThreshold) alarmActive = true; // latched until reset
  digitalWrite(LED_PIN, alarmActive ? HIGH : LOW);
  buzzer = alarmActive || now < buzzerUntil;
  relayOn = buzzer;
  digitalWrite(RELAY_PIN, relayOn ? HIGH : LOW); // invert for active-LOW relay boards

  // Timed travel: stop both motors on completion; never hold motors energized.
  float delta = (float)(now - gateUpdated) / GATE_TRAVEL_MS;
  gateUpdated = now;
  gateProgress = constrain(gateProgress + (alarmActive ? delta : -delta), 0.0f, 1.0f);
  bool descending = alarmActive && gateProgress < 1;
  bool ascending = !alarmActive && gateProgress > 0;
  motors(descending ? 1 : ascending ? -1 : 0);
  const char* gateState = descending ? "Descendiendo" : ascending ? "Ascendiendo" : alarmActive ? "Desplegada" : "Levantada";
  if (now - lastTelemetry >= 150) {
    lastTelemetry = now;
    publishTelemetry(gateState, descending || ascending);
  }
}
