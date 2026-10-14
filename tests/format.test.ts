import { describe, expect, it } from 'vitest';
import { certificateFilename, fechaLarga, lugarFecha, slugify } from '../src/lib/format';
import { patientParagraph } from '../src/lib/phrases';

describe('fechaLarga', () => {
  it('formats an ISO date in Spanish', () => {
    expect(fechaLarga('2026-10-13')).toBe('13 de octubre de 2026');
  });

  it('returns empty text for an invalid date', () => {
    expect(fechaLarga('')).toBe('');
    expect(fechaLarga('2026-13-01')).toBe('');
  });
});

describe('lugarFecha', () => {
  it('joins place and date', () => {
    expect(lugarFecha('La Paz', '2026-10-13')).toBe('La Paz, 13 de octubre de 2026');
  });

  it('falls back to the place alone when the date is invalid', () => {
    expect(lugarFecha('La Paz', '')).toBe('La Paz');
  });
});

describe('slugify and filename', () => {
  it('removes accents and symbols', () => {
    expect(slugify('María Choque Flores')).toBe('maria-choque-flores');
  });

  it('builds the download filename', () => {
    expect(certificateFilename('Carlos Quispe', '2026-10-13')).toBe('certificado_carlos-quispe_2026-10-13.pdf');
  });

  it('uses a generic name when the patient has no name', () => {
    expect(certificateFilename('', '2026-10-13')).toBe('certificado_certificado_2026-10-13.pdf');
  });
});

describe('patientParagraph', () => {
  it('fills the opening sentence and marks missing fields with blanks', () => {
    const text = patientParagraph({ name: 'Ana Gutiérrez', ci: '', age: '34', diagnosis: '' }, '13 de octubre de 2026');
    expect(text).toBe(
      'Que el/la Sr(a). Ana Gutiérrez, con C.I. ____, de 34 años de edad, fue atendido(a) en consulta en fecha 13 de octubre de 2026, presentando diagnóstico de ____.',
    );
  });
});
