const int recordButtonPin = 8;    // Record button
const int sfxButtonPin = 7;       // SFX button
const int muteButtonPin = 6;      // Mute button
const int sceneButtonPin = 5;     // Scene toggle button

const int recordLedPin = 13;      // LED for recording
const int muteLedPin = 12;        // LED for mute
const int generalLedPin = 11;     // LED for "General" scene
const int brbLedPin = 10;         // LED for "BRB" scene

// Button states
int lastRecordButtonState = HIGH;
int lastSfxButtonState = HIGH;
int lastMuteButtonState = HIGH;
int lastSceneButtonState = HIGH;

// Debounce timestamps
unsigned long lastRecordDebounceTime = 0;
unsigned long lastSfxDebounceTime = 0;
unsigned long lastMuteDebounceTime = 0;
unsigned long lastSceneDebounceTime = 0;

const unsigned long debounceDelay = 500; // 500ms debounce delay

void setup() {
  pinMode(recordButtonPin, INPUT_PULLUP);
  pinMode(sfxButtonPin, INPUT_PULLUP);
  pinMode(muteButtonPin, INPUT_PULLUP);
  pinMode(sceneButtonPin, INPUT_PULLUP);

  pinMode(recordLedPin, OUTPUT);
  pinMode(muteLedPin, OUTPUT);
  pinMode(generalLedPin, OUTPUT);
  pinMode(brbLedPin, OUTPUT);

  digitalWrite(recordLedPin, LOW);
  digitalWrite(muteLedPin, LOW);
  digitalWrite(generalLedPin, LOW);
  digitalWrite(brbLedPin, LOW);

  Serial.begin(9600);
}

void loop() {
  int currentRecordButtonState = digitalRead(recordButtonPin);
  int currentSfxButtonState = digitalRead(sfxButtonPin);
  int currentMuteButtonState = digitalRead(muteButtonPin);
  int currentSceneButtonState = digitalRead(sceneButtonPin);

  // --- Record button (pin 8) ---
  if (lastRecordButtonState == HIGH && currentRecordButtonState == LOW) {
    if ((millis() - lastRecordDebounceTime) > debounceDelay) {
      Serial.println("BTN-RECORD");
      lastRecordDebounceTime = millis();
    }
  }
  lastRecordButtonState = currentRecordButtonState;

  // --- SFX button (pin 7) ---
  if (lastSfxButtonState == HIGH && currentSfxButtonState == LOW) {
    if ((millis() - lastSfxDebounceTime) > debounceDelay) {
      Serial.println("BTN-SFX");
      lastSfxDebounceTime = millis();
    }
  }
  lastSfxButtonState = currentSfxButtonState;

  // --- Mute button (pin 6) ---
  if (lastMuteButtonState == HIGH && currentMuteButtonState == LOW) {
    if ((millis() - lastMuteDebounceTime) > debounceDelay) {
      Serial.println("BTN-MUTE");
      lastMuteDebounceTime = millis();
    }
  }
  lastMuteButtonState = currentMuteButtonState;

  // --- Scene toggle button (pin 5) ---
  if (lastSceneButtonState == HIGH && currentSceneButtonState == LOW) {
    if ((millis() - lastSceneDebounceTime) > debounceDelay) {
      Serial.println("BTN-SCENE");
      lastSceneDebounceTime = millis();
    }
  }
  lastSceneButtonState = currentSceneButtonState;

  // --- Handle incoming LED commands from PC ---
  if (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '1') {              // Recording ON
      digitalWrite(recordLedPin, HIGH);
    } else if (c == '0') {       // Recording OFF
      digitalWrite(recordLedPin, LOW);
    } else if (c == '2') {       // Mute OFF
      digitalWrite(muteLedPin, LOW);
    } else if (c == '3') {       // Mute ON
      digitalWrite(muteLedPin, HIGH);
    } else if (c == '4') {       // Scene = General
      digitalWrite(generalLedPin, HIGH);
      digitalWrite(brbLedPin, LOW);
    } else if (c == '5') {       // Scene = BRB
      digitalWrite(generalLedPin, LOW);
      digitalWrite(brbLedPin, HIGH);
    }
  }
}