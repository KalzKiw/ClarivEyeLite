import { canCreateOrder, type AssistedCandidate } from "@clariveye-lite/domain";
import { Camera, FileUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { getActiveDocProfile } from "@/lib/doc-profiles-store";
import { recognizeDocumentStructured, type RecognizeSource } from "@/lib/ocr";
import { setPendingTrainFile } from "@/lib/pending-train-file";
import { createOrderFromLines, loadOrders, loadPlan, saveOrders } from "@/lib/store";

interface DraftLine {
  reference: string;
  barcode: string;
  name: string;
  quantity: number;
  packages: number;
}

const SOURCE_LABEL: Record<RecognizeSource, string> = {
  "pdf-layout": "PDF layout",
  "pdf-text": "PDF texto",
  ocr: "OCR",
  trained: "Perfil entrenado",
  assisted: "Asistido",
};

function barcodeFromRef(ref: string): string {
  return /^\d{8,14}$/.test(ref.trim()) ? ref.trim() : "";
}

export function ClarivScanPage() {
  const navigate = useNavigate();
  const trainedProfile = getActiveDocProfile();
  const [docNumber, setDocNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [rawPreview, setRawPreview] = useState("");
  const [docType, setDocType] = useState("");
  const [source, setSource] = useState<RecognizeSource | "">("");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [candidates, setCandidates] = useState<AssistedCandidate[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);

  async function onFile(file: File | null, forceOcr = false) {
    if (!file) return;
    setLastFile(file);
    setBusy(true);
    setError("");
    setAssisted(false);
    setCandidates([]);
    setStatus("Preparando…");
    try {
      const parsed = await recognizeDocumentStructured(file, {
        forceOcr,
        onStatus: setStatus,
      });
      setSource(parsed.source);
      setRawPreview(parsed.raw_text.slice(0, 1200));
      const profileLabel = parsed.profile ? ` · ${parsed.profile}` : "";
      setDocType(`${parsed.documentType}${profileLabel}`);
      if (parsed.documentNumber) setDocNumber(parsed.documentNumber);

      setAssisted(!!parsed.assisted);
      setCandidates(parsed.candidates ?? []);

      if (parsed.lines.length > 0) {
        setLines(
          parsed.lines.map((line) => ({
            reference: line.reference,
            barcode: barcodeFromRef(line.reference),
            name: line.name ?? "",
            quantity: line.quantity,
            packages: line.packages,
          })),
        );
      } else {
        setLines([]);
      }

      if (parsed.assisted) {
        setError("");
        setStatus(
          `Revisa candidatos · ${SOURCE_LABEL[parsed.source]}${profileLabel}`,
        );
      } else if (parsed.lines.length === 0) {
        setError("Sin productos claros. Usa candidatos, entrena o añade a mano.");
        setStatus("");
      } else {
        setStatus(
          `${parsed.lines.length} producto(s) · ${SOURCE_LABEL[parsed.source]}${profileLabel}`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer el documento");
      setStatus("");
      setSource("");
      setAssisted(false);
    } finally {
      setBusy(false);
    }
  }

  function addManual() {
    setLines((prev) => [
      ...prev,
      { reference: "", barcode: "", name: "", quantity: 1, packages: 0 },
    ]);
  }

  function addCandidate(c: AssistedCandidate) {
    if (c.kind === "ref") {
      setLines((prev) => {
        if (prev.some((l) => l.reference === c.reference)) return prev;
        return [
          ...prev,
          {
            reference: c.reference,
            barcode: barcodeFromRef(c.reference),
            name: "",
            quantity: 1,
            packages: 0,
          },
        ];
      });
      return;
    }
    if (c.kind === "qty") {
      setLines((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const qty = Math.max(1, Number(c.reference) || 1);
        return prev.map((l, i) => (i === prev.length - 1 ? { ...last, quantity: qty } : l));
      });
    }
  }

  function goTrain() {
    if (lastFile) setPendingTrainFile(lastFile);
    navigate("/entrenar");
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function confirmOrder() {
    const orders = loadOrders();
    const plan = loadPlan();
    if (!canCreateOrder(orders, plan)) {
      setError("Límite free: 3 pedidos abiertos. Pasa a Pro o entrega uno.");
      return;
    }
    const clean = lines
      .map((line) => ({
        reference: line.reference.trim(),
        barcode: line.barcode.trim() || null,
        name: line.name.trim() || null,
        quantity: Math.max(1, Number(line.quantity) || 1),
        packages: Math.max(0, Number(line.packages) || 0),
      }))
      .filter((line) => line.reference);
    if (clean.length === 0) {
      setError("Añade al menos un producto con referencia");
      return;
    }
    const order = createOrderFromLines(docNumber, clean);
    saveOrders([order, ...orders]);
    navigate("/");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClarivBox size={44} />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Módulo integrado
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">ClarivScan</h1>
          <p className="text-sm text-muted-foreground">
            PDF con texto o foto · OC / albarán / factura / OT
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-7 text-center shadow-sm transition active:scale-[0.99]">
          <FileUp className="text-primary" size={28} />
          <span className="text-sm font-medium">
            {busy ? status || "Leyendo…" : "Subir PDF"}
          </span>
          <span className="text-xs text-muted-foreground">
            Cascada layout → OCR · nunca te deja tirado
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={busy}
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-7 text-center shadow-sm transition active:scale-[0.99]">
          <Camera className="text-primary" size={28} />
          <span className="text-sm font-medium">
            {busy ? status || "Leyendo…" : "Foto o imagen"}
          </span>
          <span className="text-xs text-muted-foreground">OCR por columnas</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {trainedProfile ? (
        <p className="text-xs text-muted-foreground">
          Perfil activo:{" "}
          <span className="font-medium text-foreground">{trainedProfile.name}</span>
          {" · "}
          <Link to="/entrenar" className="text-primary underline">
            editar
          </Link>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          ¿Siempre el mismo albarán?{" "}
          <Link to="/entrenar" className="text-primary underline">
            Entrena el lector
          </Link>
          .
        </p>
      )}

      {assisted ? (
        <Card className="space-y-3 border-primary/40 bg-primary/5">
          <p className="text-sm font-medium">No confío del todo — revisa candidatos</p>
          <p className="text-xs text-muted-foreground">
            Toca un código para añadirlo al pedido. Luego edita nombre/cantidad.
          </p>
          {candidates.filter((c) => c.kind === "ref").length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {candidates
                .filter((c) => c.kind === "ref")
                .map((c) => (
                  <button
                    key={`${c.kind}-${c.reference}`}
                    type="button"
                    onClick={() => addCandidate(c)}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition active:scale-[0.97]"
                  >
                    {c.reference}
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin chips claros — añade a mano o entrena.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" className="w-full" onClick={goTrain} disabled={!lastFile}>
              Entrenar con este doc
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={addManual}>
              Línea vacía
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" className="flex-1 gap-2" onClick={addManual}>
          <Plus size={16} />
          Producto manual
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex-1 gap-2"
          disabled={busy || !lastFile}
          onClick={() => onFile(lastFile, true)}
        >
          Forzar OCR
        </Button>
      </div>

      <Field label="Nº documento">
        <TextInput
          value={docNumber}
          onChange={(event) => setDocNumber(event.target.value)}
          placeholder="OC 00005 / ALB-…"
        />
      </Field>

      {source || docType ? (
        <p className="text-xs text-muted-foreground">
          Fuente:{" "}
          <span className="font-medium text-foreground">
            {source ? SOURCE_LABEL[source] : "—"}
          </span>
          {docType ? ` · ${docType}` : ""}
          {status && !busy ? ` · ${status}` : ""}
        </p>
      ) : null}

      <ErrorNote message={error} />
      {rawPreview ? (
        <details className="rounded-md bg-muted p-2 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer text-xs font-medium text-foreground">
            Preview texto / OCR
            {source ? ` (${SOURCE_LABEL[source]})` : ""}
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{rawPreview}</p>
        </details>
      ) : null}

      <div className="space-y-2">
        {lines.map((line, index) => (
          <Card key={`${line.reference}-${index}`} className="space-y-2 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-primary">Producto {index + 1}</p>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="text-destructive transition active:scale-[0.96]"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <Field label="Referencia / SKU">
              <TextInput
                value={line.reference}
                onChange={(event) => updateLine(index, { reference: event.target.value })}
                placeholder="Ej. 78958"
              />
            </Field>
            <Field label="Barcode (solo EAN/UPC; opcional)">
              <TextInput
                value={line.barcode}
                onChange={(event) => updateLine(index, { barcode: event.target.value })}
                placeholder="Vacío si no hay código de barras"
              />
            </Field>
            <Field label="Nombre del producto">
              <TextInput
                value={line.name}
                onChange={(event) => updateLine(index, { name: event.target.value })}
                placeholder="Ej. Producto X"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cantidad (uds)">
                <TextInput
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}
                />
              </Field>
              <Field label="Bultos">
                <TextInput
                  type="number"
                  min={0}
                  value={line.packages}
                  onChange={(event) => updateLine(index, { packages: Number(event.target.value) })}
                />
              </Field>
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        disabled={busy || lines.length === 0}
        onClick={confirmOrder}
        className="w-full gap-2"
      >
        <FileUp size={16} />
        Crear pedido en ClarivEye Lite
      </Button>
    </div>
  );
}
