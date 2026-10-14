import { PDFDocument, StandardFonts } from 'pdf-lib';
import { FIELDS, type Box } from './layout';
import { lugarFecha } from './format';
import { fitText, LINE_HEIGHT } from './wrap';
import type { CertificateData } from './types';

export interface PdfResult {
  bytes: Uint8Array;
  /** True when the body text does not fit even at the smallest size. */
  overflow: boolean;
}

let templatePromise: Promise<ArrayBuffer> | null = null;

function loadTemplate(): Promise<ArrayBuffer> {
  templatePromise ??= fetch(`${import.meta.env.BASE_URL}templates/certificado-ms.pdf`).then((res) => {
    if (!res.ok) throw new Error(`No se pudo cargar el formato oficial (${res.status})`);
    return res.arrayBuffer();
  });
  return templatePromise;
}

/** Writes the doctor's data onto the official form. Returns PDF bytes. */
export async function buildCertificatePdf(data: CertificateData): Promise<PdfResult> {
  const doc = await PDFDocument.load(await loadTemplate());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPage(0);

  const drawLine = (text: string, box: Box) => {
    // Vertically center a single line in its box.
    const baseline = box.y + (box.height - box.size * 0.7) / 2;
    page.drawText(text, { x: box.x + 4, y: baseline, size: box.size, font });
  };

  drawLine(lugarFecha(data.lugar, data.fecha), FIELDS.lugarFecha);
  drawLine(data.doctorName.trim(), FIELDS.medico);
  drawLine(data.matricula.trim(), FIELDS.matricula);

  const body = FIELDS.cuerpo;
  const fit = fitText(
    data.body,
    body.width - 8,
    body.height,
    body.size,
    body.minSize ?? body.size,
    (s, size) => font.widthOfTextAtSize(s, size),
  );

  // Draw from the top of the body box downward.
  let y = body.y + body.height - fit.size;
  for (const line of fit.lines) {
    if (line) page.drawText(line, { x: body.x + 4, y, size: fit.size, font });
    y -= fit.size * LINE_HEIGHT;
  }

  return { bytes: await doc.save(), overflow: fit.overflow };
}
