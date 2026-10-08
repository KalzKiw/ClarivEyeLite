import { canCreateOrder } from "@clariveye-lite/domain";
import { Camera, FileUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { recognizeDocumentStructured } from "@/lib/ocr";
import { createOrderFromLines, loadOrders, loadPlan, saveOrders } from "@/lib/store";

interface DraftLine {
  reference: string;
  barcode: string;
  name: string;
  quantity: number;
  packages: number;
}

/** Solo EAN/UPC típicos van a barcode; refs cortas (78958) no — evita choques en picking */
function barcodeFromRef(ref: string): string {
  return /^\d{8,14}$/.test(ref.trim()) ? ref.trim() : "";
}

export function ClarivScanPage() {
  const navigate = useNavigate();
  const [docNumber, setDocNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [rawPreview, setRawPreview] = useState("");
  const [docType, setDocType] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    setStatus("Preparando…");
    try {
      const parsed = await recognizeDocumentStructured(file, setStatus);
      setRawPreview(parsed.raw_text.slice(0, 800));
      const profileLabel = parsed.profile ? ` · ${parsed.profile}` : "";
      setDocType(`${parsed.documentType}${profileLabel}`);
      if (parsed.documentNumber) setDocNumber(parsed.documentNumber);

      if (parsed.lines.length === 0) {
        setError(
          "No pude interpretar productos. Revisa el preview OCR o añade productos a mano.",
        );
        setLines([]);
        return;
      }

      setLines(
        parsed.lines.map((line) => ({
          reference: line.reference,
          barcode: barcodeFromRef(line.reference),
          name: line.name ?? "",
          quantity: line.quantity,
          packages: line.packages,
        })),
      );
      setStatus(`${parsed.lines.length} producto(s)${profileLabel}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer el documento");
      setStatus("");
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
            Interpreta tablas · OC / albarán / factura / OT
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center shadow-sm transition active:scale-[0.99]">
        <Camera className="text-primary" size={28} />
        <span className="text-sm font-medium">{busy ? status || "Leyendo…" : "Foto o imagen"}</span>
        <span className="text-xs text-muted-foreground">Lee por columnas · revisa y confirma</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <Button type="button" variant="ghost" className="w-full gap-2" onClick={addManual}>
        <Plus size={16} />
        Producto manual
      </Button>

      <Field label="Nº documento">
        <TextInput
          value={docNumber}
          onChange={(event) => setDocNumber(event.target.value)}
          placeholder="OC 00005 / ALB-…"
        />
      </Field>

      {docType && !error ? (
        <p className="text-xs text-muted-foreground">
          Tipo: <span className="font-medium text-foreground">{docType}</span>
          {status ? ` · ${status}` : ""}
        </p>
      ) : null}

      <ErrorNote message={error} />
      {rawPreview ? (
        <details className="rounded-md bg-muted p-2 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer text-xs font-medium text-foreground">Preview OCR</summary>
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
