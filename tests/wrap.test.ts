import { describe, expect, it } from 'vitest';
import { fitText, wrapText } from '../src/lib/wrap';

// Fake font: every character is 5 points wide.
const measure = (s: string) => s.length * 5;

describe('wrapText', () => {
  it('keeps the user line breaks', () => {
    expect(wrapText('uno\ndos', 100, measure)).toEqual(['uno', 'dos']);
  });

  it('wraps at word boundaries to fit the width', () => {
    // "uno dos" = 35pt, "tres" = 20pt; width 40 fits "uno dos" only.
    expect(wrapText('uno dos tres', 40, measure)).toEqual(['uno dos', 'tres']);
  });

  it('keeps empty lines from blank paragraphs', () => {
    expect(wrapText('a\n\nb', 100, measure)).toEqual(['a', '', 'b']);
  });

  it('splits a word wider than the whole line', () => {
    const lines = wrapText('abcdefghij', 25, measure); // 5 chars per line
    expect(lines).toEqual(['abcde', 'fghij']);
    lines.forEach((l) => expect(measure(l)).toBeLessThanOrEqual(25));
  });
});

describe('fitText', () => {
  const widthAt = (s: string, size: number) => s.length * size * 0.5;

  it('uses the largest size when the text fits', () => {
    const r = fitText('Hola', 200, 100, 11, 9, widthAt);
    expect(r.size).toBe(11);
    expect(r.overflow).toBe(false);
  });

  it('shrinks the font when the text is too tall at the largest size', () => {
    // 9 lines: at 11pt needs 128.7pt (too tall for 120), at 10pt needs 117pt (fits).
    const nine = Array.from({ length: 9 }, (_, i) => `línea ${i}`).join('\n');
    const r = fitText(nine, 400, 120, 11, 9, widthAt);
    expect(r.size).toBe(10);
    expect(r.overflow).toBe(false);
  });

  it('reports overflow when even the smallest size does not fit', () => {
    const huge = Array.from({ length: 200 }, () => 'palabra').join('\n');
    const r = fitText(huge, 100, 50, 11, 9, widthAt);
    expect(r.size).toBe(9);
    expect(r.overflow).toBe(true);
  });
});
