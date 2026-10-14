/** Line height as a multiple of font size. */
export const LINE_HEIGHT = 1.3;

/**
 * Breaks text into lines that fit maxWidth. Keeps the user's line breaks.
 * Words longer than maxWidth are split by characters.
 * `measure` returns the width of a string in points.
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split(/\r?\n/)) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) lines.push(line);

      // Split a word that is too wide for a whole line.
      let rest = word;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
  }

  return lines;
}

export interface FitResult {
  size: number;
  lines: string[];
  overflow: boolean;
}

/**
 * Picks the largest font size, from maxSize down to minSize in 0.5 steps,
 * where the wrapped text fits in the box height.
 * `widthAt(s, size)` returns the width of s at that size.
 * If nothing fits, returns minSize with overflow: true.
 */
export function fitText(
  text: string,
  width: number,
  height: number,
  maxSize: number,
  minSize: number,
  widthAt: (s: string, size: number) => number,
): FitResult {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    const lines = wrapText(text, width, (s) => widthAt(s, size));
    if (lines.length * size * LINE_HEIGHT <= height) {
      return { size, lines, overflow: false };
    }
  }
  const lines = wrapText(text, width, (s) => widthAt(s, minSize));
  return { size: minSize, lines, overflow: true };
}
