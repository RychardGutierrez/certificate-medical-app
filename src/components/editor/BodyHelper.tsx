import { useState, type ChangeEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PatientInfo } from '@/lib/types';

interface Props {
  patient: PatientInfo;
  onChange: (patient: PatientInfo) => void;
  onInsert: () => void;
}

function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Optional form that writes a standard opening sentence into the body. */
export function BodyHelper({ patient, onChange, onInsert }: Props) {
  const [open, setOpen] = useState(true);

  const update = (key: keyof PatientInfo) => (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...patient, [key]: e.target.value });

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="body-helper-panel"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 border-b bg-muted/50 px-5 py-4 text-left"
      >
        <span>
          <span className="block font-semibold">Asistente de texto</span>
          <span className="block text-sm text-muted-foreground">
            Opcional. Llena los datos del paciente y genera un párrafo editable.
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={cn('size-5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id="body-helper-panel" className="grid gap-4 p-5 @md:grid-cols-4">
          <Field id="paciente" label="Paciente" className="@md:col-span-2">
            <Input id="paciente" value={patient.name} onChange={update('name')} autoComplete="off" />
          </Field>
          <Field id="ci" label="C.I.">
            <Input id="ci" value={patient.ci} onChange={update('ci')} autoComplete="off" />
          </Field>
          <Field id="edad" label="Edad">
            <Input id="edad" inputMode="numeric" value={patient.age} onChange={update('age')} />
          </Field>
          <Field id="diagnostico" label="Diagnóstico" className="@md:col-span-3">
            <Input id="diagnostico" value={patient.diagnosis} onChange={update('diagnosis')} />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="w-full" onClick={onInsert}>
              Insertar texto
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
