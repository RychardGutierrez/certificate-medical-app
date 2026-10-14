import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Eraser, FilePlus, FileDown, Printer, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/sonner';
import { BodyHelper } from './BodyHelper';
import { PdfPreview } from './PdfPreview';
import { buildCertificatePdf } from '@/lib/pdf';
import { certificateFilename, fechaLarga, lugarFecha, todayIso } from '@/lib/format';
import { downloadFile } from '@/lib/download';
import { errorMessage, newId } from '@/lib/common';
import { PHRASES, patientParagraph } from '@/lib/phrases';
import {
  clearDraft,
  getCertificate,
  getDoctor,
  getDraft,
  saveDoctor,
  saveDraft,
  upsertCertificate,
} from '@/lib/storage';
import {
  EMPTY_PATIENT,
  type CertificateData,
  type CertificateStatus,
  type PatientInfo,
  type SavedCertificate,
} from '@/lib/types';

const DEFAULT_LUGAR = 'La Paz';
const PREVIEW_DELAY_MS = 500;

function blankForm(): CertificateData {
  return {
    lugar: DEFAULT_LUGAR,
    fecha: todayIso(),
    doctorName: '',
    matricula: '',
    patient: { ...EMPTY_PATIENT },
    body: '',
  };
}

export default function CertificateEditor() {
  const [data, setData] = useState<CertificateData>(blankForm);
  // Set when the form is editing a saved certificate (opened with ?id=).
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<CertificateStatus | null>(null);
  const [savedCreatedAt, setSavedCreatedAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<{ url: string; overflow: boolean } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // On load: ?id= opens a saved certificate, otherwise restore the draft,
  // otherwise start blank with the doctor's details filled in.
  useEffect(() => {
    const openId = new URLSearchParams(window.location.search).get('id');
    if (openId) {
      const saved = getCertificate(openId);
      if (saved) {
        setData({
          lugar: saved.lugar,
          fecha: saved.fecha,
          doctorName: saved.doctorName,
          matricula: saved.matricula,
          patient: saved.patient,
          body: saved.body,
        });
        setSavedId(saved.id);
        setSavedStatus(saved.status);
        setSavedCreatedAt(saved.createdAt);
      } else {
        toast.error('No se encontró ese certificado');
      }
    } else {
      const draft = getDraft() ?? blankForm();
      const doctor = getDoctor();
      setData({
        ...draft,
        lugar: doctor?.lugar || draft.lugar,
        doctorName: draft.doctorName || doctor?.name || '',
        matricula: draft.matricula || doctor?.matricula || '',
      });
    }
    setReady(true);
  }, []);

  // Autosave the unsaved form, so a closed tab does not lose work.
  useEffect(() => {
    if (ready && !savedId) saveDraft(data);
  }, [data, ready, savedId]);

  // Rebuild the preview after the user stops typing.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(async () => {
      try {
        const { bytes, overflow } = await buildCertificatePdf(data);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreview({ url, overflow });
        setPreviewError(null);
      } catch (e) {
        setPreviewError(`No se pudo generar la vista previa: ${errorMessage(e)}`);
      }
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, ready]);

  // Free the last preview URL when the page closes.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const setField = <K extends keyof CertificateData>(key: K, value: CertificateData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const setPatient = (patient: PatientInfo) => setField('patient', patient);

  const appendToBody = (text: string) =>
    setData((d) => ({ ...d, body: d.body.trim() ? `${d.body.trimEnd()}\n\n${text}` : text }));

  const insertPatientText = () =>
    appendToBody(patientParagraph(data.patient, fechaLarga(data.fecha)));

  // Writes the record to localStorage and remembers the doctor. Returns the saved record.
  function commit(status: CertificateStatus): SavedCertificate | null {
    const now = new Date().toISOString();
    const record: SavedCertificate = {
      ...data,
      id: savedId ?? newId(),
      status,
      createdAt: savedCreatedAt ?? now,
      updatedAt: now,
    };
    if (!upsertCertificate(record)) {
      toast.error('No se pudo guardar en este navegador (almacenamiento lleno o desactivado).');
      return null;
    }
    saveDoctor({ name: data.doctorName, matricula: data.matricula, lugar: data.lugar });
    clearDraft();
    setSavedId(record.id);
    setSavedStatus(record.status);
    setSavedCreatedAt(record.createdAt);
    window.history.replaceState(null, '', `/?id=${record.id}`);
    return record;
  }

  function handleSave() {
    const status: CertificateStatus = savedStatus === 'emitido' ? 'emitido' : 'borrador';
    if (commit(status)) toast.success('Certificado guardado en este navegador');
  }

  async function handleGenerate() {
    setBusy(true);
    try {
      const { bytes, overflow } = await buildCertificatePdf(data);
      if (overflow) {
        toast.error('El texto no cabe en el certificado. Acórtalo y vuelve a intentar.');
        return;
      }
      downloadFile(bytes, certificateFilename(data.patient.name, data.fecha), 'application/pdf');
      if (commit('emitido')) {
        toast.success('PDF generado. Imprímelo al tamaño real y fírmalo y séllalo a mano.');
      }
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win || !preview || preview.overflow) {
      toast.error('Corrige el texto antes de imprimir.');
      return;
    }
    win.focus();
    win.print();
  }

  function handleClear() {
    if (!window.confirm('¿Borrar el contenido del formulario? Los certificados guardados no se borran.')) return;
    const doctor = getDoctor();
    setData({
      ...blankForm(),
      lugar: doctor?.lugar || DEFAULT_LUGAR,
      doctorName: doctor?.name || '',
      matricula: doctor?.matricula || '',
    });
    setSavedId(null);
    setSavedStatus(null);
    setSavedCreatedAt(null);
    clearDraft();
    window.history.replaceState(null, '', '/');
  }

  const lugarFechaTexto = lugarFecha(data.lugar, data.fecha);

  return (
    <>
      {/* Outside the grid: the Toaster renders a grid item and would take a column. */}
      <Toaster position="bottom-right" />

      <div className="grid items-start gap-6 md:grid-cols-2">
      <div className="@container flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {savedId ? 'Editar certificado' : 'Nuevo certificado'}
            {savedStatus && (
              <Badge variant={savedStatus === 'emitido' ? 'default' : 'secondary'}>
                {savedStatus === 'emitido' ? 'Emitido' : 'Borrador'}
              </Badge>
            )}
          </h1>
          <span className="text-sm text-muted-foreground">
            {savedId ? 'Guardado en este navegador' : 'Borrador guardado automáticamente'}
          </span>
        </div>

        <section className="grid gap-5 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Lugar y fecha</h2>
          <div className="grid gap-4 @md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lugar">Lugar</Label>
              <Input id="lugar" value={data.lugar} onChange={(e) => setField('lugar', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={data.fecha} onChange={(e) => setField('fecha', e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Se imprimirá como: <strong className="text-foreground">{lugarFechaTexto || '—'}</strong>
          </p>
        </section>

        <section className="grid gap-5 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Médico</h2>
          <div className="grid gap-4 @md:grid-cols-3">
            <div className="grid gap-1.5 @md:col-span-2">
              <Label htmlFor="medico">Nombres y apellidos</Label>
              <Input id="medico" value={data.doctorName} onChange={(e) => setField('doctorName', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="matricula">Matrícula profesional</Label>
              <Input id="matricula" value={data.matricula} onChange={(e) => setField('matricula', e.target.value)} />
            </div>
          </div>
        </section>

        <BodyHelper patient={data.patient} onChange={setPatient} onInsert={insertPatientText} />

        <section className="grid gap-3 rounded-xl border bg-card p-5">
          <Label htmlFor="cuerpo" className="text-base font-bold">
            El médico que suscribe Certifica:
          </Label>
          <div className="flex flex-wrap gap-2">
            {PHRASES.map((phrase) => (
              <Button
                key={phrase.label}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => appendToBody(phrase.text)}
              >
                {phrase.label}
              </Button>
            ))}
          </div>
          <Textarea
            id="cuerpo"
            rows={9}
            className="leading-relaxed"
            value={data.body}
            onChange={(e) => setField('body', e.target.value)}
          />
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>{data.body.length} caracteres</span>
            <span>Tamaño de letra en PDF: 11 pt, se reduce hasta 9 pt si hace falta</span>
          </div>
        </section>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-4 backdrop-blur">
          <Button type="button" size="lg" onClick={handleGenerate} disabled={busy}>
            <FileDown /> Generar PDF
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={handlePrint}>
            <Printer /> Imprimir
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={handleSave}>
            <Save /> Guardar
          </Button>
          {savedId && (
            <Button type="button" size="lg" variant="ghost" nativeButton={false} render={<a href="/" />}>
              <FilePlus /> Nuevo
            </Button>
          )}
          <span className="flex-1" />
          <Button type="button" size="lg" variant="ghost" onClick={handleClear}>
            <Eraser /> Limpiar
          </Button>
        </div>
      </div>

      <PdfPreview
        url={preview?.url ?? null}
        overflow={preview?.overflow ?? false}
        error={previewError}
        iframeRef={iframeRef}
      />
      </div>
    </>
  );
}
