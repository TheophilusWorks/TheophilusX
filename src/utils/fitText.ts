import { SKRSContext2D } from "@napi-rs/canvas";

interface FitTextOptions {
  ctx: SKRSContext2D;
  text: string;
  maxWidth: number;
  maxHeight: number;
  font: string;
  maxFontSize?: number;
  minFontSize?: number;
}

interface FitTextResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];

  // split by spaces first
  const words = text.split(" ");
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      // push current line if there is one
      if (current) lines.push(current);

      // if the word itself is too long, break it by character
      if (ctx.measureText(word).width > maxWidth) {
        let charBuf = "";
        for (const char of word) {
          const testChar = charBuf + char;
          if (ctx.measureText(testChar).width > maxWidth) {
            lines.push(charBuf);
            charBuf = char;
          } else {
            charBuf = testChar;
          }
        }
        current = charBuf;
      } else {
        current = word;
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function fitText({
  ctx,
  text,
  maxWidth,
  maxHeight,
  font,
  maxFontSize = 120,
  minFontSize = 20,
}: FitTextOptions): FitTextResult {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
    ctx.font = font.replace("{size}", String(fontSize));
    const lineHeight = fontSize * 1.2;

    const lines = wrapText(ctx, text, maxWidth);
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= maxHeight) {
      return { lines, fontSize, lineHeight };
    }
  }

  ctx.font = font.replace("{size}", String(minFontSize));
  const lineHeight = minFontSize * 1.2;
  return {
    lines: wrapText(ctx, text, maxWidth),
    fontSize: minFontSize,
    lineHeight,
  };
}
