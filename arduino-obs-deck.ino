#include <Arduino.h>

const int recR = 13;
const int recG = 12;
const int recB = 11;
const int muteR = 10;
const int muteG = 9;
const int muteB = 8;
const int sceneR = 7;
const int sceneG = 6;
const int sceneB = 5;

const int sceneBtnPins[6] = {14, 15, 16, 17, 18, 19};
const int recordButtonPin = 22;
const int sfxButtonPin = 23;
const int muteButtonPin = 24;

const int potPin = A0;

int lastSceneBtnState[6] = {HIGH, HIGH, HIGH, HIGH, HIGH, HIGH};
int lastRecordButtonState = HIGH;
int lastSfxButtonState = HIGH;
int lastMuteButtonState = HIGH;

unsigned long lastSceneDebounceTime[6] = {0,0,0,0,0,0};
unsigned long lastRecordDebounceTime = 0;
unsigned long lastSfxDebounceTime = 0;
unsigned long lastMuteDebounceTime = 0;

const unsigned long debounceDelay = 250;

float lastVoltage = -1;

float floatMap(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void setRGB(int rPin, int gPin, int bPin, int r, int g, int b) {
  digitalWrite(rPin, r ? HIGH : LOW);
  digitalWrite(gPin, g ? HIGH : LOW);
  digitalWrite(bPin, b ? HIGH : LOW);
}

void setup() {
  pinMode(recR, OUTPUT);
  pinMode(recG, OUTPUT);
  pinMode(recB, OUTPUT);
  pinMode(muteR, OUTPUT);
  pinMode(muteG, OUTPUT);
  pinMode(muteB, OUTPUT);
  pinMode(sceneR, OUTPUT);
  pinMode(sceneG, OUTPUT);
  pinMode(sceneB, OUTPUT);

  for (int i = 0; i < 6; i++) pinMode(sceneBtnPins[i], INPUT_PULLUP);
  pinMode(recordButtonPin, INPUT_PULLUP);
  pinMode(sfxButtonPin, INPUT_PULLUP);
  pinMode(muteButtonPin, INPUT_PULLUP);

  setRGB(recR, recG, recB, 0,0,0);
  setRGB(muteR, muteG, muteB, 0,0,0);
  setRGB(sceneR, sceneG, sceneB, 0,0,0);

  Serial.begin(9600);
}

void handleLine(char *buf, size_t n) {
  if (n < 4) return;
  if (buf[0] == 'r') {
    setRGB(recR, recG, recB, buf[1]=='1', buf[2]=='1', buf[3]=='1');
  } else if (buf[0] == 'm') {
    setRGB(muteR, muteG, muteB, buf[1]=='1', buf[2]=='1', buf[3]=='1');
  } else if (buf[0] == 'c') {
    setRGB(sceneR, sceneG, sceneB, buf[1]=='1', buf[2]=='1', buf[3]=='1');
  }
}

void loop() {
  int currentRecordButtonState = digitalRead(recordButtonPin);
  int currentSfxButtonState = digitalRead(sfxButtonPin);
  int currentMuteButtonState = digitalRead(muteButtonPin);

  if (lastRecordButtonState == HIGH && currentRecordButtonState == LOW) {
    if ((millis() - lastRecordDebounceTime) > debounceDelay) {
      Serial.println("BTN-RECORD");
      lastRecordDebounceTime = millis();
    }
  }
  lastRecordButtonState = currentRecordButtonState;

  if (lastSfxButtonState == HIGH && currentSfxButtonState == LOW) {
    if ((millis() - lastSfxDebounceTime) > debounceDelay) {
      Serial.println("BTN-SFX");
      lastSfxDebounceTime = millis();
    }
  }
  lastSfxButtonState = currentSfxButtonState;

  if (lastMuteButtonState == HIGH && currentMuteButtonState == LOW) {
    if ((millis() - lastMuteDebounceTime) > debounceDelay) {
      Serial.println("BTN-MUTE");
      lastMuteDebounceTime = millis();
    }
  }
  lastMuteButtonState = currentMuteButtonState;

  for (int i = 0; i < 6; i++) {
    int cur = digitalRead(sceneBtnPins[i]);
    if (lastSceneBtnState[i] == HIGH && cur == LOW) {
      if ((millis() - lastSceneDebounceTime[i]) > debounceDelay) {
        Serial.print("BTN-SCENE");
        Serial.println(i+1);
        lastSceneDebounceTime[i] = millis();
      }
    }
    lastSceneBtnState[i] = cur;
  }

  int analogValue = analogRead(potPin);
  float voltage = floatMap(analogValue, 0, 1023, 0, 5);
  if (abs(voltage - lastVoltage) > 0.02) {
    Serial.print("VOL:");
    Serial.println(voltage, 2);
    lastVoltage = voltage;
  }

  static char buf[16];
  static uint8_t idx = 0;
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (idx >= 4) handleLine(buf, idx);
      idx = 0;
      memset(buf, 0, sizeof(buf));
    } else {
      if (idx < sizeof(buf)-1) buf[idx++] = c;
    }
  }
}
