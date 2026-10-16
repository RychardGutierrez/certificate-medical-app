import type { RefObject } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isTouchDevice } from '@/lib/common';

interface Props {
  url: string | null;
  overflow: boolean;
  error: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * Shows the generated PDF in an iframe. Touch devices cannot render PDFs inside an iframe,
 * so they get a button that opens the PDF in a new tab. Printing is started by the editor's action bar.
 */
export function PdfPreview({ url, overflow, error, iframeRef }: Props) {
  const inline = !isTouchDevice();

  return (
    <section aria-labelledby="preview-title" className="flex min-w-0 flex-col gap-3 self-start md:sticky md:top-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="preview-title" className="text-lg font-semibold">Vista previa</h2>
        <span className="text-sm text-muted-foreground">Se actualiza al escribir</span>
      </div>

      <div className="rounded-xl border bg-muted p-4">
        <div className="mx-auto aspect-[8.5/11] w-full max-w-xl overflow-hidden rounded-md bg-white shadow-md">
          {url && inline ? (
            <iframe ref={iframeRef} src={url} title="Vista previa del certificado" className="size-full border-0" />
          ) : url ? (
            <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm text-muted-foreground">Este dispositivo no muestra la vista previa aquí.</p>
              <Button size="lg" nativeButton={false} render={<a href={url} target="_blank" rel="noopener" />}>
                <ExternalLink /> Abrir vista previa
              </Button>
            </div>
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              Generando vista previa…
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {overflow && (
        <p role="alert" className="text-sm font-medium text-destructive">
          El texto no cabe en el recuadro. Acórtalo para poder generar el PDF.
        </p>
      )}

      <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-accent p-3 text-sm text-accent-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Imprime en <strong>tamaño real (100 %)</strong>, sin “ajustar a la página”. Firma y sella a mano: el
          certificado no es válido sin ellos.
        </span>
      </div>
    </section>
  );
}
