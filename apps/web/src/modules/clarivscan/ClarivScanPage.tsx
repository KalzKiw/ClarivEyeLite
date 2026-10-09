import {
  auditLine,
  canCreateOrder,
  countOpenOrders,
  isProductLine,
  type AssistedCandidate,
  type LineWarning,
} from "@clariveye-lite/domain";
import { Camera, CheckCircle2, FileUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClarivBox } from "@/components/ClarivBox";
import { FreeLimitBanner } from "@/components/FreeLimitBanner";
import { UpgradeModal } from "@/components/UpgradeModal";
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
  unitPrice: string;
  included: boolean;
  suspicious: boolean;
  warnings: LineWarning[];
  /** Usuario marcó «confirmar» en una línea sospechosa */
  confirmed: boolean;
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

function draftFromParsed(line: {
  reference: string;
  name: string | null;
  quantity: number;
  packages: number;
  unitPrice: string | null;
  confidence: number;
}): DraftLine {
  const audited = auditLine(line);
  return {
    reference: audited.reference,
    barcode: barcodeFromRef(audited.reference),
    name: audited.name ?? "",
    quantity: audited.quantity,
    packages: audited.packages,
    unitPrice: audited.unitPrice ?? "",
    included: !audited.suspicious,
    suspicious: audited.suspicious,
    warnings: audited.warnings,
    confirmed: false,
  };
}

function reauditDraft(line: DraftLine): DraftLine {
  const audited = auditLine({
    reference: line.reference.trim(),
    name: line.name.trim() || null,
    quantity: line.quantity,
    packages: line.packages,
    unitPrice: line.unitPrice.trim() || null,
    confidence: line.suspicious && !line.confirmed ? 0.55 : 0.9,
  });
  return {
    ...line,
    suspicious: audited.suspicious,
    warnings: audited.warnings,
  };
}

export function ClarivScanPage() {
  const navigate = useNavigate();
  const trainedProfile = getActiveDocProfile();
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");
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
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [openCount, setOpenCount] = useState(() => countOpenOrders(loadOrders()));
  const [freeBlocked, setFreeBlocked] = useState(() => !canCreateOrder(loadOrders(), loadPlan()));

  useEffect(() => {
    const orders = loadOrders();
    const plan = loadPlan();
    setOpenCount(countOpenOrders(orders));
    setFreeBlocked(!canCreateOrder(orders, plan));
  }, []);

  const includedCount = useMemo(() => lines.filter((l) => l.included).length, [lines]);
  const suspiciousPending = useMemo(
    () => lines.filter((l) => l.included && l.suspicious && !l.confirmed).length,
    [lines],
  );
  const excludedSuspicious = useMemo(
    () => lines.filter((l) => !l.included && l.suspicious).length,
    [lines],
  );

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
      if (parsed.documentDate) setDocDate(parsed.documentDate);

      setAssisted(!!parsed.assisted);
      setCandidates(parsed.candidates ?? []);

      if (parsed.lines.length > 0) {
        const drafted = parsed.lines.filter(isProductLine).map(draftFromParsed);
        setLines(drafted);
        const bad = drafted.filter((l) => l.suspicious).length;
        if (bad > 0) {
          setStatus(
            `${drafted.length} línea(s) · ${bad} a revisar · ${SOURCE_LABEL[parsed.source]}${profileLabel}`,
          );
        } else if (parsed.assisted) {
          setStatus(`Revisa candidatos · ${SOURCE_LABEL[parsed.source]}${profileLabel}`);
        } else {
          setStatus(
            `${parsed.lines.length} producto(s) · ${SOURCE_LABEL[parsed.source]}${profileLabel}`,
          );
        }
      } else {
        setLines([]);
        if (parsed.assisted) {
          setStatus(`Revisa candidatos · ${SOURCE_LABEL[parsed.source]}${profileLabel}`);
        } else {
          setError("Sin productos claros. Usa candidatos, entrena o añade a mano.");
          setStatus("");
        }
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
      {
        reference: "",
        barcode: "",
        name: "",
        quantity: 1,
        packages: 0,
        unitPrice: "",
        included: true,
        suspicious: false,
        warnings: [],
        confirmed: true,
      },
    ]);
  }

  function addCandidate(c: AssistedCandidate) {
    if (c.kind === "ref") {
      setLines((prev) => {
        if (prev.some((l) => l.reference === c.reference)) return prev;
        return [
          ...prev,
          draftFromParsed({
            reference: c.reference,
            name: null,
            quantity: 1,
            packages: 0,
            unitPrice: null,
            confidence: 0.6,
          }),
        ];
      });
      return;
    }
    if (c.kind === "qty") {
      setLines((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const qty = Math.max(1, Number(c.reference) || 1);
        return prev.map((l, i) =>
          i === prev.length - 1 ? reauditDraft({ ...last, quantity: qty }) : l,
        );
      });
    }
  }

  function goTrain() {
    if (lastFile) setPendingTrainFile(lastFile);
    navigate("/entrenar");
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if ("reference" in patch || "name" in patch) {
          return reauditDraft({ ...next, confirmed: false });
        }
        return next;
      }),
    );
  }

  function toggleIncluded(index: number) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, included: !line.included } : line)),
    );
  }

  function confirmSuspicious(index: number) {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, confirmed: true, included: true, suspicious: false, warnings: [] } : line,
      ),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function refreshPlanGate() {
    const orders = loadOrders();
    const plan = loadPlan();
    setOpenCount(countOpenOrders(orders));
    setFreeBlocked(!canCreateOrder(orders, plan));
  }

  function confirmOrder() {
    const orders = loadOrders();
    const plan = loadPlan();
    if (!canCreateOrder(orders, plan)) {
      setFreeBlocked(true);
      setOpenCount(countOpenOrders(orders));
      setUpgradeOpen(true);
      return;
    }
    if (suspiciousPending > 0) {
      setError(
        `Hay ${suspiciousPending} línea(s) sospechosa(s) incluidas. Confírmalas o exclúyelas antes de crear el pedido.`,
      );
      return;
    }
    const clean = lines
      .filter((line) => line.included)
      .map((line) => ({
        reference: line.reference.trim(),
        barcode: line.barcode.trim() || null,
        name: line.name.trim() || null,
        quantity: Math.max(1, Number(line.quantity) || 1),
        packages: Math.max(0, Number(line.packages) || 0),
        unitPrice: line.unitPrice.trim() || null,
      }))
      .filter((line) => line.reference);
    if (clean.length === 0) {
      setError("Incluye al menos un producto con referencia (marca la casilla)");
      return;
    }
    const order = createOrderFromLines(docNumber, clean, docDate || null);
    saveOrders([order, ...orders]);
    navigate("/");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClarivBox size={44} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ClarivScan</h1>
        </div>
      </div>

      {freeBlocked ? (
        <FreeLimitBanner openCount={openCount} onOpenUpgrade={() => setUpgradeOpen(true)} />
      ) : null}

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

      {lines.some((l) => l.suspicious) ? (
        <Card className="space-y-2 border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            Revisa antes de crear el pedido
          </p>
          <p className="text-xs text-muted-foreground">
            El texto se leyó bien, pero algunas líneas no parecen productos (fechas, teléfonos,
            cantidades…). Desmarca lo que no sea, o confirma si sí lo es.
            {excludedSuspicious > 0
              ? ` · ${excludedSuspicious} excluida(s) automáticamente.`
              : ""}
          </p>
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

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Nº documento / albarán">
          <TextInput
            value={docNumber}
            onChange={(event) => setDocNumber(event.target.value)}
            placeholder="OC 00005 / ALB-…"
          />
        </Field>
        <Field label="Fecha">
          <TextInput
            type="date"
            value={docDate}
            onChange={(event) => setDocDate(event.target.value)}
          />
        </Field>
      </div>

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
          <Card
            key={`${line.reference}-${index}`}
            className={`space-y-2 p-3 ${
              !line.included
                ? "opacity-55 border-dashed"
                : line.suspicious && !line.confirmed
                  ? "border-amber-500/60 bg-amber-500/5"
                  : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={line.included}
                  onChange={() => toggleIncluded(index)}
                  className="size-4 accent-primary"
                />
                <span className={line.included ? "text-primary" : "text-muted-foreground"}>
                  {line.included ? `Incluir · producto ${index + 1}` : `Excluida · línea ${index + 1}`}
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="text-destructive transition active:scale-[0.96]"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {line.warnings.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {line.warnings.map((w) => (
                  <li
                    key={w.code}
                    className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 dark:text-amber-100"
                  >
                    {w.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {line.suspicious && !line.confirmed ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-full gap-1.5 text-xs"
                onClick={() => confirmSuspicious(index)}
              >
                <CheckCircle2 size={14} />
                Confirmar: sí es un producto
              </Button>
            ) : null}

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
            <div className="grid grid-cols-3 gap-2">
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
              <Field label="Precio">
                <TextInput
                  value={line.unitPrice}
                  onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                  placeholder="—"
                />
              </Field>
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        disabled={busy || includedCount === 0 || suspiciousPending > 0}
        onClick={confirmOrder}
        className="w-full gap-2"
      >
        <FileUp size={16} />
        {suspiciousPending > 0
          ? `Confirma o excluye ${suspiciousPending} sospechosa(s)`
          : `Crear pedido · ${includedCount} línea(s)`}
      </Button>

      <UpgradeModal
        open={upgradeOpen}
        openCount={openCount}
        onClose={() => setUpgradeOpen(false)}
        onUpgraded={refreshPlanGate}
      />
    </div>
  );
}
