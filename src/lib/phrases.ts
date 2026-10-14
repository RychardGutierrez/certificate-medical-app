/** Standard sentences the doctor can add to the body with one click. */
export const PHRASES = [
  {
    label: '+ Reposo médico',
    text: 'Se indica reposo médico de ____ días, desde el ____ hasta el ____.',
  },
  {
    label: '+ Apto para trabajar',
    text: 'Se encuentra apto(a) para realizar sus actividades laborales.',
  },
  {
    label: '+ Cierre “Es cuanto certifico…”',
    text: 'Es cuanto certifico en honor a la verdad, para fines que convengan al interesado.',
  },
] as const;

/** Opening sentence built from the patient fields and the certificate date. */
export function patientParagraph(
  p: { name: string; ci: string; age: string; diagnosis: string },
  fechaTexto: string,
): string {
  const name = p.name.trim() || '____';
  const ci = p.ci.trim() || '____';
  const age = p.age.trim() || '____';
  const diagnosis = p.diagnosis.trim() || '____';
  return `Que el/la Sr(a). ${name}, con C.I. ${ci}, de ${age} años de edad, fue atendido(a) en consulta en fecha ${fechaTexto}, presentando diagnóstico de ${diagnosis}.`;
}
