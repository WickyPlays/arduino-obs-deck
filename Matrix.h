#pragma once
#include <Arduino.h>
#include <LedControl.h>

extern LedControl lc;

void matrixSetup();
void showDigitWithIndicators(int digit, bool rec, bool mute);
void clearMatrix();
