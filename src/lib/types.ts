export interface DoctorInfo {
  name: string;
  matricula: string;
  lugar: string;
}

export interface PatientInfo {
  name: string;
  ci: string;
  age: string;
  diagnosis: string;
}

/** What the doctor types on the form. The PDF is built from this. */
export interface CertificateData {
  lugar: string;
  fecha: string; // ISO yyyy-mm-dd
  doctorName: string;
  matricula: string;
  patient: PatientInfo;
  body: string;
}

export type CertificateStatus = 'borrador' | 'emitido';

export interface SavedCertificate extends CertificateData {
  id: string;
  status: CertificateStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export const EMPTY_PATIENT: PatientInfo = { name: '', ci: '', age: '', diagnosis: '' };
