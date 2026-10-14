import type { CertificateData, DoctorInfo, SavedCertificate } from './types';

const KEYS = {
  doctor: 'mc.doctor',
  certificates: 'mc.certificates',
  draft: 'mc.draft',
} as const;

export const BACKUP_VERSION = 1;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or disabled. The app keeps working without saving.
    return false;
  }
}

export function getDoctor(): DoctorInfo | null {
  return read<DoctorInfo | null>(KEYS.doctor, null);
}

export function saveDoctor(doctor: DoctorInfo): boolean {
  return write(KEYS.doctor, doctor);
}

export function getCertificates(): SavedCertificate[] {
  return read<SavedCertificate[]>(KEYS.certificates, []);
}

export function getCertificate(id: string): SavedCertificate | undefined {
  return getCertificates().find((c) => c.id === id);
}

/** Inserts or replaces a certificate by id. Newest first. */
export function upsertCertificate(cert: SavedCertificate): boolean {
  const rest = getCertificates().filter((c) => c.id !== cert.id);
  return write(KEYS.certificates, [cert, ...rest]);
}

export function deleteCertificate(id: string): boolean {
  return write(KEYS.certificates, getCertificates().filter((c) => c.id !== id));
}

export function getDraft(): CertificateData | null {
  return read<CertificateData | null>(KEYS.draft, null);
}

export function saveDraft(data: CertificateData): boolean {
  return write(KEYS.draft, data);
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEYS.draft);
  } catch {
    /* ignore */
  }
}

export function clearAll(): void {
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function exportBackup(): string {
  return JSON.stringify(
    {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      doctor: getDoctor(),
      certificates: getCertificates(),
    },
    null,
    2,
  );
}

/** Replaces local certificates with a backup. Throws if the file is not a valid backup. */
export function importBackup(json: string): number {
  const data = JSON.parse(json) as {
    version?: number;
    doctor?: DoctorInfo | null;
    certificates?: SavedCertificate[];
  };
  if (data.version !== BACKUP_VERSION || !Array.isArray(data.certificates)) {
    throw new Error('Respaldo no válido');
  }
  if (data.doctor) saveDoctor(data.doctor);
  write(KEYS.certificates, data.certificates);
  return data.certificates.length;
}
