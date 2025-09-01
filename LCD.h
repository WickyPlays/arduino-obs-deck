#ifndef LCD_H
#define LCD_H
#include <Arduino.h>

void lcdSetup();
void lcdUpdateBorders(bool recordActive, bool streamActive);
void lcdUpdateScene(int currentScene);
void lcdUpdateMic(bool micOn);
void lcdUpdateRecTime(uint32_t recElapsed);
void lcdUpdateVolume(float p);
#endif
