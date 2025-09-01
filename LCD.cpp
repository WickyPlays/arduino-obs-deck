#include "LCD.h"
#include <SPI.h>
#include <Adafruit_GFX.h>
#include "ST7789_AVR.h"
#include <stdio.h>

#define TFT_DC 30
#define TFT_CS -1
#define TFT_RST 31
#define SCR_WD 240
#define SCR_HT 240

ST7789_AVR lcd = ST7789_AVR(TFT_DC, TFT_RST, TFT_CS);

static inline int textWidth6x8(int len, int size) { return len * 6 * size; }
static inline int textHeight6x8(int size) { return 8 * size; }

static void drawCenteredText(const char *s, int y, int size, uint16_t fg, uint16_t bg)
{
  int len = 0;
  while (s[len] != '\0')
    len++;
  int w = textWidth6x8(len, size);
  int x = (SCR_WD - w) / 2;
  lcd.setTextColor(fg, bg);
  lcd.setTextSize(size);
  lcd.setCursor(x, y);
  lcd.print(s);
}

void lcdSetup()
{
  lcd.init(SCR_WD, SCR_HT);
  lcd.fillScreen(BLACK);
}

void lcdUpdateBorders(bool recordActive, bool streamActive)
{
  for (int i = 0; i < 4; i++)
  {
    uint16_t c = BLACK;
    if (i < 2 && recordActive)
      c = RED;
    if (i >= 2 && streamActive)
      c = MAGENTA;
    for (int x = i; x < SCR_WD - i; x++)
    {
      lcd.drawPixel(x, i, c);
      lcd.drawPixel(x, SCR_HT - 1 - i, c);
    }
    for (int y = i; y < SCR_HT - i; y++)
    {
      lcd.drawPixel(i, y, c);
      lcd.drawPixel(SCR_WD - 1 - i, y, c);
    }
  }
}

void lcdUpdateScene(int currentScene)
{
  int topBand = 2 + textHeight6x8(2) + 4;
  int bottomBand = SCR_HT - 2 - textHeight6x8(2) - 4;
  if (bottomBand < topBand)
    bottomBand = topBand;
  lcd.fillRect(2, topBand, SCR_WD - 4, bottomBand - topBand, BLACK);
  int yScene = topBand + 8;
  drawCenteredText("Scene", yScene, 2, WHITE, BLACK);
  char num[4];
  if (currentScene >= 1 && currentScene <= 9)
    sprintf(num, "%d", currentScene);
  else
    sprintf(num, "-");
  int textH = textHeight6x8(5);
  int yNum = yScene + textHeight6x8(2) + 12;
  if (yNum + textH > bottomBand - 30)
  {
    yNum = bottomBand - 30 - textH;
    if (yNum < yScene + 4)
      yNum = yScene + 4;
  }
  drawCenteredText(num, yNum, 5, YELLOW, BLACK);
}

void lcdUpdateMic(bool micOn)
{
  int topBand = 2 + textHeight6x8(2) + 4;
  int bottomBand = SCR_HT - 2 - textHeight6x8(2) - 4;
  int yScene = topBand + 8;
  int yNum = yScene + textHeight6x8(2) + 12 + textHeight6x8(5) + 8;
  lcd.fillRect(2, yNum, SCR_WD - 4, textHeight6x8(2), BLACK);
  drawCenteredText(micOn ? "Mic: ON" : "Mic: OFF", yNum, 2, micOn ? GREEN : RED, BLACK);
}

void lcdUpdateRecTime(uint32_t recElapsed)
{
  char buf[16];
  uint32_t totalSec = recElapsed / 1000;
  uint32_t hh = (totalSec / 3600) % 100;
  uint32_t mm = (totalSec / 60) % 60;
  uint32_t ss = totalSec % 60;
  sprintf(buf, "%02lu:%02lu:%02lu", (unsigned long)hh, (unsigned long)mm, (unsigned long)ss);
  int textH = textHeight6x8(2);
  int y = SCR_HT - 2 - textH * 2 - 8;
  lcd.fillRect(2, y, SCR_WD - 4, textH, BLACK);
  drawCenteredText(buf, y, 2, WHITE, BLACK);
}

void lcdUpdateVolume(float p)
{
  char buf[24];
  snprintf(buf, sizeof(buf), "Vol: %d%%", (int)p);
  int textH = textHeight6x8(2);
  int y = SCR_HT - 2 - textH;
  lcd.fillRect(2, y, SCR_WD - 4, textH, BLACK);
  drawCenteredText(buf, y, 2, WHITE, BLACK);
}
