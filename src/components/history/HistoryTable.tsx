import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Download, FileDown, FolderOpen, Search, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { buildCertificatePdf } from '@/lib/pdf';
import { certificateFilename, todayIso } from '@/lib/format';
import { downloadFile } from '@/lib/download';
import { errorMessage, newId } from '@/lib/common';
import {
  clearAll,
  deleteCertificate,
  exportBackup,
  getCertificates,
  importBackup,
  upsertCertificate,
} from '@/lib/storage';
import type { SavedCertificate } from '@/lib/types';
import { cn } from '@/lib/utils';

type Filter = 'todos' | 'emitido' | 'borrador';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'emitido', label: 'Emitidos' },
  { value: 'borrador', label: 'Borradores' },
];

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function summary(c: SavedCertificate): string {
  const text = c.patient.diagnosis.trim() || c.body.trim().split('\n')[0] || 'Sin contenido';
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

export default function HistoryTable() {
  const [items, setItems] = useState<SavedCertificate[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [ready, setReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => setItems(getCertificates());

  useEffect(() => {
    refresh();
    setReady(true);
  }, []);

  const counts = useMemo(
    () => ({
      todos: items.length,
      emitido: items.filter((c) => c.status === 'emitido').length,
      borrador: items.filter((c) => c.status === 'borrador').length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (filter !== 'todos' && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.patient.name.toLowerCase().includes(q) ||
        c.fecha.includes(q) ||
        shortDate(c.fecha).toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  function handleDuplicate(c: SavedCertificate) {
    const now = new Date().toISOString();
    const copy: SavedCertificate = { ...c, id: newId(), status: 'borrador', createdAt: now, updatedAt: now };
    if (upsertCertificate(copy)) {
      refresh();
      toast.success('Copia creada como borrador');
    } else {
      toast.error('No se pudo guardar la copia.');
    }
  }

  async function handlePdf(c: SavedCertificate) {
    try {
      const { bytes, overflow } = await buildCertificatePdf(c);
      if (overflow) {
        toast.error('El texto no cabe en el certificado. Ábrelo y acórtalo.');
        return;
      }
      downloadFile(bytes, certificateFilename(c.patient.name, c.fecha), 'application/pdf');
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${errorMessage(e)}`);
    }
  }

  function handleDelete(c: SavedCertificate) {
    if (!window.confirm(`¿Eliminar el certificado de ${c.patient.name || 'paciente sin nombre'}?`)) return;
    if (deleteCertificate(c.id)) {
      refresh();
      toast.success('Certificado eliminado');
    }
  }

  function handleExport() {
    downloadFile(exportBackup(), `respaldo_certificados_${todayIso()}.json`, 'application/json');
  }

  async function handleImport(file: File) {
    try {
      const count = importBackup(await file.text());
      refresh();
      toast.success(`Respaldo importado: ${count} certificados`);
    } catch (e) {
      toast.error(`No se pudo importar: ${errorMessage(e)}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function handleClearAll() {
    if (!window.confirm('¿Borrar todos los datos de este navegador? Esta acción no se puede deshacer.')) return;
    clearAll();
    refresh();
    toast.success('Datos borrados');
  }

  return (
    <>
      {/* Outside the flex column so its gap does not add space. */}
      <Toaster position="bottom-right" />

      <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-sm text-muted-foreground">
            {ready ? `${counts.todos} certificados guardados en este navegador` : 'Cargando…'}
          </p>
        </div>
        <Button render={<a href="/" />} nativeButton={false} size="lg">
          Nuevo certificado
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar por paciente o fecha"
            placeholder="Buscar por paciente o fecha"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div role="group" aria-label="Filtrar por estado" className="flex gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                filter === f.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label} · {counts[f.value]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0 ? 'Aún no hay certificados guardados.' : 'Ningún certificado coincide con la búsqueda.'}
          </p>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Resumen</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3.5 whitespace-nowrap">{shortDate(c.fecha)}</td>
                  <td className="px-4 py-3.5 font-semibold">{c.patient.name || '—'}</td>
                  <td className="max-w-md px-4 py-3.5 text-muted-foreground">{summary(c)}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={c.status === 'emitido' ? 'default' : 'secondary'}>
                      {c.status === 'emitido' ? 'Emitido' : 'Borrador'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <Button variant="outline" size="sm" render={<a href={`/?id=${c.id}`} />} nativeButton={false}>
                        <FolderOpen /> Abrir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(c)}>
                        <Copy /> Duplicar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePdf(c)}>
                        <FileDown /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Eliminar certificado de ${c.patient.name || 'paciente sin nombre'}`}
                        onClick={() => handleDelete(c)}
                        className="text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
        <p className="max-w-xl text-sm text-muted-foreground">
          Los datos viven solo en este navegador. Si borras el historial del navegador, se pierden. Exporta un
          respaldo seguido.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download /> Exportar respaldo
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload /> Importar respaldo
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
          <Button variant="outline" className="text-destructive" onClick={handleClearAll}>
            <Trash2 /> Borrar todos los datos
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
