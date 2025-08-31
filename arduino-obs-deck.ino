#include <Arduino.h>
#include <LedControl.h>
#include "Matrix.h"

const int recR = 13;
const int recG = 12;
const int recB = 11;
const int streamR = 10;
const int streamG = 9;
const int streamB = 8;
const int muteR = 7;
const int muteG = 6;
const int muteB = 5;

const int sceneBtnPins[6] = {19, 18, 17, 16, 15, 14};
const int recordButtonPin = 22;
const int streamButtonPin = 23;
const int muteButtonPin = 24;
const int sfxButtonPin = 25;
const int a2ButtonPin = 26;
const int a3ButtonPin = 27;

const int potPin = A0;

int lastSceneBtnState[6] = {HIGH, HIGH, HIGH, HIGH, HIGH, HIGH};
int lastRecordButtonState = HIGH;
int lastSfxButtonState = HIGH;
int lastMuteButtonState = HIGH;
int lastStreamButtonState = HIGH;
int lastA2ButtonState = HIGH;
int lastA3ButtonState = HIGH;
unsigned long lastSceneDebounceTime[6] = {0,0,0,0,0,0};
unsigned long lastRecordDebounceTime = 0;
unsigned long lastSfxDebounceTime = 0;
unsigned long lastMuteDebounceTime = 0;
unsigned long lastStreamDebounceTime = 0;
unsigned long lastA2DebounceTime = 0;
unsigned long lastA3DebounceTime = 0;
const unsigned long debounceDelay = 250;

float lastVoltage = -1;
int currentScene = 0;
bool recordActive = false;
bool muteActive = false;
bool streamActive = false;

float floatMap(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void setRGB(int rPin, int gPin, int bPin, int r, int g, int b) {
  digitalWrite(rPin, r ? HIGH : LOW);
  digitalWrite(gPin, g ? HIGH : LOW);
  digitalWrite(bPin, b ? HIGH : LOW);
}

void setup() {
  matrixSetup();

  pinMode(recR, OUTPUT);
  pinMode(recG, OUTPUT);
  pinMode(recB, OUTPUT);
  pinMode(streamR, OUTPUT);
  pinMode(streamG, OUTPUT);
  pinMode(streamB, OUTPUT);
  pinMode(muteR, OUTPUT);
  pinMode(muteG, OUTPUT);
  pinMode(muteB, OUTPUT);

  for (int i = 0; i < 6; i++) pinMode(sceneBtnPins[i], INPUT_PULLUP);
  pinMode(recordButtonPin, INPUT_PULLUP);
  pinMode(streamButtonPin, INPUT_PULLUP);
  pinMode(sfxButtonPin, INPUT_PULLUP);
  pinMode(muteButtonPin, INPUT_PULLUP);
  pinMode(a2ButtonPin, INPUT_PULLUP);
  pinMode(a3ButtonPin, INPUT_PULLUP);

  setRGB(recR, recG, recB, 0,0,0);
  setRGB(streamR, streamG, streamB, 0,0,0);
  setRGB(muteR, muteG, muteB, 0,0,0);

  Serial.begin(9600);

  clearMatrix();
}

void handleLine(char *buf, size_t n) {
  if (n < 1) return;
  if (buf[0] == 'r') {
    if (n >= 4) {
      setRGB(recR, recG, recB, buf[1]=='1', buf[2]=='1', buf[3]=='1');
      recordActive = (buf[1]=='1');
    }
  } else if (buf[0] == 'm') {
    if (n >= 4) {
      setRGB(muteR, muteG, muteB, buf[1]=='1', buf[2]=='1', buf[3]=='1');
      muteActive = (buf[1]=='1');
    }
  } else if (buf[0] == 't') {
    if (n >= 4) {
      setRGB(streamR, streamG, streamB, buf[1]=='1', buf[2]=='1', buf[3]=='1');
      streamActive = (buf[1]=='1');
    }
  } else if (buf[0] == 's' && n >= 2) {
    currentScene = buf[1]-'0';
  } else if (buf[0] == 'c' && n >= 4) {
    int r = buf[1]=='1';
    int g = buf[2]=='1';
    int b = buf[3]=='1';
    // showColorOnMatrix(r,g,b);
  }

  if (currentScene > 0 && currentScene < 10) {
    showDigitWithIndicators(currentScene, recordActive, muteActive);
  } else {
    clearMatrix();
  }
}

void loop() {
  int currentRecordButtonState = digitalRead(recordButtonPin);
  int currentSfxButtonState = digitalRead(sfxButtonPin);
  int currentMuteButtonState = digitalRead(muteButtonPin);
  int currentStreamButtonState = digitalRead(streamButtonPin);
  int currentA2ButtonState = digitalRead(a2ButtonPin);
  int currentA3ButtonState = digitalRead(a3ButtonPin);

  if (lastRecordButtonState == HIGH && currentRecordButtonState == LOW) {
    if ((millis() - lastRecordDebounceTime) > debounceDelay) {
      Serial.println("BTN-RECORD");
      recordActive = !recordActive;
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
      muteActive = !muteActive;
      lastMuteDebounceTime = millis();
    }
  }
  lastMuteButtonState = currentMuteButtonState;

  if (lastStreamButtonState == HIGH && currentStreamButtonState == LOW) {
    if ((millis() - lastStreamDebounceTime) > debounceDelay) {
      Serial.println("BTN-STREAM");
      streamActive = !streamActive;
      lastStreamDebounceTime = millis();
    }
  }
  lastStreamButtonState = currentStreamButtonState;

  if (lastA2ButtonState == HIGH && currentA2ButtonState == LOW) {
    if ((millis() - lastA2DebounceTime) > debounceDelay) {
      Serial.println("BTN-A2");
      lastA2DebounceTime = millis();
    }
  }
  lastA2ButtonState = currentA2ButtonState;

  if (lastA3ButtonState == HIGH && currentA3ButtonState == LOW) {
    if ((millis() - lastA3DebounceTime) > debounceDelay) {
      Serial.println("BTN-A3");
      lastA3DebounceTime = millis();
    }
  }
  lastA3ButtonState = currentA3ButtonState;

  for (int i = 0; i < 6; i++) {
    int cur = digitalRead(sceneBtnPins[i]);
    if (lastSceneBtnState[i] == HIGH && cur == LOW) {
      if ((millis() - lastSceneDebounceTime[i]) > debounceDelay) {
        Serial.print("BTN-SCENE");
        Serial.println(i+1);
        currentScene = i+1;
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
      if (idx >= 1) handleLine(buf, idx);
      idx = 0;
      memset(buf, 0, sizeof(buf));
    } else {
      if (idx < sizeof(buf)-1) buf[idx++] = c;
    }
  }

  if (currentScene > 0 && currentScene < 10) {
    showDigitWithIndicators(currentScene, recordActive, muteActive);
  } else {
    clearMatrix();
  }

  yield();
}
