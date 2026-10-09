import { Camera, FileUp, X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Modal: PDF o cámara/foto (sin entrada manual — eso es Crear pedido). */
export function ImportDocSheet({
  open,
  onClose,
  busy,
  onPdf,
  onImage,
}: {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  onPdf: (file: File | null) => void;
  onImage: (file: File | null) => void;
}) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Escanear albarán</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">PDF o foto del documento</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            onPdf(e.target.files?.[0] ?? null);
            onClose();
            e.target.value = "";
          }}
        />
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            onImage(e.target.files?.[0] ?? null);
            onClose();
            e.target.value = "";
          }}
        />

        <div className="space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => pdfRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl bg-primary px-4 py-3.5 text-left text-primary-foreground shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-white/15">
              <FileUp size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold">Subir PDF</span>
              <span className="block text-xs text-primary-foreground/80">
                Recomendado · layout + OCR
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => imgRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-left transition active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Camera size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Cámara o foto</span>
              <span className="block text-xs text-muted-foreground">Imagen del albarán</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
