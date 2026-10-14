import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildCertificatePdf } from '../src/lib/pdf';
import type { CertificateData } from '../src/lib/types';

const template = readFileSync(join(process.cwd(), 'public/templates/certificado-ms.pdf'));

const base: CertificateData = {
  lugar: 'La Paz',
  fecha: '2026-10-13',
  doctorName: 'Juan Pérez Mamani',
  matricula: 'P-1234',
  patient: { name: 'Carlos Quispe Rojas', ci: '4567890 LP', age: '34', diagnosis: 'Faringoamigdalitis aguda' },
  body: 'Que el Sr. Carlos Quispe Rojas, con C.I. 4567890 LP, de 34 años de edad.\n\nSe indica reposo médico de 3 días.',
};

beforeAll(() => {
  // The app loads the template with fetch(); serve the local file instead.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(template, { status: 200 })),
  );
});

describe('buildCertificatePdf', () => {
  it('writes a one-page PDF with the official page size', async () => {
    const { bytes, overflow } = await buildCertificatePdf(base);
    expect(overflow).toBe(false);

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([width, height]).toEqual([612, 792]);
  });

  it('reports overflow when the body is too long for the box', async () => {
    const huge = Array.from({ length: 400 }, () => 'Texto de relleno para el certificado.').join('\n');
    const { overflow } = await buildCertificatePdf({ ...base, body: huge });
    expect(overflow).toBe(true);
  });

  it('accepts Spanish accents and ñ', async () => {
    const { overflow } = await buildCertificatePdf({ ...base, body: 'Señor Núñez, diagnóstico: ¿cefalea? ¡Reposo!' });
    expect(overflow).toBe(false);
  });
});
