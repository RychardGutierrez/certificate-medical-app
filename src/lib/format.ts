const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "2026-10-13" -> "13 de octubre de 2026". Parses the parts by hand to avoid timezone shifts. */
export function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return '';
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** "La Paz" + "2026-10-13" -> "La Paz, 13 de octubre de 2026" */
export function lugarFecha(lugar: string, iso: string): string {
  const fecha = fechaLarga(iso);
  if (!lugar.trim()) return fecha;
  if (!fecha) return lugar.trim();
  return `${lugar.trim()}, ${fecha}`;
}

/** Local date as yyyy-mm-dd (not toISOString, which is UTC). */
export function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** "María Choque Flores" -> "maria-choque-flores" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function certificateFilename(patientName: string, iso: string): string {
  const who = slugify(patientName) || 'certificado';
  return `certificado_${who}_${iso}.pdf`;
}
