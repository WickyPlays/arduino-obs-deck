#ifndef LCD_H
#define LCD_H
#include <Arduino.h>
void lcdSetup();
void lcdRender(bool recordActive, bool streamActive, int currentScene, float percent, uint32_t recElapsed, bool micOn);
#endif
