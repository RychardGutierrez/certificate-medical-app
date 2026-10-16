/** Id for a saved certificate. Falls back when crypto.randomUUID is missing (non-secure http origins). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * True on touch-first devices (phones, most tablets). Their browsers cannot show a PDF
 * inside an iframe, so the preview opens the PDF in its own tab instead.
 */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Error desconocido';
}
