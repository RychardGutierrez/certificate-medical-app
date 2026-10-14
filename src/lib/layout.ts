/**
 * Where text goes on the official form, in PDF points.
 * Origin is the bottom-left corner of a US Letter page (612 x 792).
 *
 * ESTIMATED from a rendered copy of public/templates/certificado-ms.pdf.
 * Print one test certificate on real paper and adjust these numbers.
 */
export const PAGE = { width: 612, height: 792 } as const;

export interface Box {
  x: number;
  y: number; // bottom edge
  width: number;
  height: number;
  size: number; // font size for single-line fields
  minSize?: number; // smallest size allowed for the body
}

export const FIELDS = {
  lugarFecha: { x: 312, y: 580, width: 268, height: 22, size: 10 },
  medico: { x: 312, y: 541, width: 268, height: 22, size: 10 },
  matricula: { x: 312, y: 496, width: 125, height: 22, size: 10 },
  cuerpo: { x: 36, y: 143, width: 542, height: 308, size: 11, minSize: 9 },
} satisfies Record<string, Box>;
