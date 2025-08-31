#include "Matrix.h"

// DIN = 51 (MOSI), CLK = 52 (SCK), CS = 3
LedControl lc = LedControl(51, 52, 3, 1);

// Local buffer
static byte displayBuf[8];

// Digit bitmaps (upright 0–9)
static byte digits[10][8] = {
  {B00111100, B01100110, B01101110, B01110110, B01100110, B01100110, B00111100, B00000000}, // 0
  {B00011000, B00111000, B00011000, B00011000, B00011000, B00011000, B00111100, B00000000}, // 1
  {B00111100, B01100110, B00000110, B00001100, B00110000, B01100000, B01111110, B00000000}, // 2
  {B00111100, B01100110, B00000110, B00011100, B00000110, B01100110, B00111100, B00000000}, // 3
  {B00001100, B00011100, B00101100, B01001100, B01111110, B00001100, B00001100, B00000000}, // 4
  {B01111110, B01100000, B01111100, B00000110, B00000110, B01100110, B00111100, B00000000}, // 5
  {B00111100, B01100110, B01100000, B01111100, B01100110, B01100110, B00111100, B00000000}, // 6
  {B01111110, B00000110, B00001100, B00011000, B00110000, B00110000, B00110000, B00000000}, // 7
  {B00111100, B01100110, B01100110, B00111100, B01100110, B01100110, B00111100, B00000000}, // 8
  {B00111100, B01100110, B01100110, B00111110, B00000110, B01100110, B00111100, B00000000}  // 9
};

// Internal helpers
static void clearDisplayBuf() {
  for (int i = 0; i < 8; i++) displayBuf[i] = 0;
}

static void pushDisplayBuf() {
  for (int row = 0; row < 8; row++) {
    lc.setRow(0, row, displayBuf[row]);
  }
}

// Public API
void matrixSetup() {
  lc.shutdown(0, false);
  lc.setIntensity(0, 8); // 0..15
  lc.clearDisplay(0);
  clearDisplayBuf();
  pushDisplayBuf();
}

void showDigitWithIndicators(int digit, bool rec, bool mute) {
  if (digit < 0 || digit > 9) return;

  // Rotate 90° left
  for (int row = 0; row < 8; row++) {
    byte newRow = 0;
    for (int col = 0; col < 8; col++) {
      if (digits[digit][col] & (1 << (7 - row))) {
        newRow |= (1 << col);
      }
    }
    displayBuf[row] = newRow;
  }

  // Indicators in bottom row (row 7)
  if (rec) {
    displayBuf[7] |= (1 << 7); // bottom-right
  }
  if (!mute) {
    displayBuf[7] |= (1 << 0); // bottom-left
  }

  pushDisplayBuf();
}

void clearMatrix() {
  clearDisplayBuf();
  pushDisplayBuf();
}
