import {
  clampRect,
  inferRefStyle,
  type BusinessDocProfile,
  type DocumentProfile,
  type NormRect,
} from "@clariveye-lite/domain";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RegionPainter } from "@/components/RegionPainter";
import { StepProgress } from "@/components/StepProgress";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { currentBusinessId } from "@/lib/auth";
import { deleteDocProfile, loadDocProfiles, upsertDocProfile } from "@/lib/doc-profiles-store";
import { takePendingTrainFile } from "@/lib/pending-train-file";
import { isPdfFile, renderPdfPageToCanvas } from "@/lib/pdf-text";

const STEPS = ["Formato", "Muestra", "SKU", "Nombre", "Cantidad", "Guardar"] as const;

const BASE_OPTIONS: { id: DocumentProfile | ""; label: string }[] = [
  { id: "", label: "Auto (recomendado)" },
  { id: "easywms", label: "easyWMS / hoja picking" },
  { id: "tosma_cod", label: "Albarán códigos cortos (Tosma…)" },
  { id: "oc_tabla", label: "Orden de compra" },
  { id: "fashion_sku", label: "Fashion SKU…" },
  { id: "picking_list", label: "Picking list web" },
];

export function TrainParserPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [alwaysSame, setAlwaysSame] = useState<boolean | null>(null);
  const [name, setName] = useState("Mi albarán");
  const [baseProfile, setBaseProfile] = useState<DocumentProfile | "">("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [skuCol, setSkuCol] = useState<NormRect | null>(null);
  const [descCol, setDescCol] = useState<NormRect | null>(null);
  const [numsCol, setNumsCol] = useState<NormRect | null>(null);
  const [saved, setSaved] = useState(loadDocProfiles());

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    const pending = takePendingTrainFile();
    if (pending) {
      setAlwaysSame(true);
      setStep(2);
      void onSample(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSample(file: File | null) {
    if (!file) return;
    setError("");
    try {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (isPdfFile(file)) {
        const canvas = await renderPdfPageToCanvas(file, 2);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        setImageUrl(url);
      } else {
        setImageUrl(URL.createObjectURL(file));
      }
      setStep(3);
    } catch {
      setError("No se pudo abrir el documento");
    }
  }

  function saveProfile() {
    setError("");
    const businessId = currentBusinessId();
    if (!businessId) {
      setError("Sin sesión");
      return;
    }
    if (!skuCol || !descCol || !numsCol) {
      setError("Faltan las 3 zonas (SKU, nombre, cantidad)");
      return;
    }
    const now = new Date().toISOString();
    const table = clampRect({
      x0: Math.min(skuCol.x0, descCol.x0, numsCol.x0),
      y0: Math.min(skuCol.y0, descCol.y0, numsCol.y0),
      x1: Math.max(skuCol.x1, descCol.x1, numsCol.x1),
      y1: Math.max(skuCol.y1, descCol.y1, numsCol.y1),
    });
    const profile: BusinessDocProfile = {
      id: crypto.randomUUID(),
      businessId,
      name: name.trim() || "Mi albarán",
      alwaysSameFormat: alwaysSame === true,
      regions: {
        skuCol: clampRect(skuCol),
        descCol: clampRect(descCol),
        numsCol: clampRect(numsCol),
        table,
      },
      hints: {
        baseProfile: baseProfile || undefined,
        refStyle: baseProfile === "easywms" ? "item_xx" : baseProfile === "tosma_cod" ? "numeric_cod" : inferRefStyle([]),
      },
      successCount: 0,
      failCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    upsertDocProfile(profile);
    setSaved(loadDocProfiles());
    navigate("/clarivscan");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Entrenar lector</h1>
        <p className="text-sm text-muted-foreground">
          Por negocio: enseña dónde están SKU, nombre y cantidad en <em>tu</em> albarán.
        </p>
      </div>

      {saved.length > 0 ? (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Perfiles guardados</p>
          <ul className="space-y-2 text-sm">
            {saved.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 border-b border-border pb-2">
                <span>
                  {p.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · ok {p.successCount} / fail {p.failCount}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs text-destructive"
                  onClick={() => {
                    deleteDocProfile(p.id);
                    setSaved(loadDocProfiles());
                  }}
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <StepProgress step={step} total={6} labels={[...STEPS]} />

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">¿Siempre usas el mismo formato de albarán / OC?</p>
            <p className="text-xs text-muted-foreground">
              Si casi siempre es el mismo PDF o plantilla, el lector prioriza tus zonas.
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setAlwaysSame(true);
                setStep(2);
              }}
            >
              Sí, casi siempre el mismo
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setAlwaysSame(false);
                setStep(2);
              }}
            >
              No, cambian bastante
            </Button>
            {alwaysSame === false ? (
              <p className="text-xs text-muted-foreground">
                Igual puedes marcar zonas de tu formato más habitual; el auto-perfil seguirá de
                respaldo.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm">Sube un ejemplo típico (PDF o foto).</p>
            <Field label="Nombre del perfil">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Tipo base (opcional)">
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-base"
                value={baseProfile}
                onChange={(e) => setBaseProfile(e.target.value as DocumentProfile | "")}
              >
                {BASE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <span className="text-sm font-medium">Elegir documento</span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => onSample(e.target.files?.[0] ?? null)}
              />
            </label>
            <ErrorNote message={error} />
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>
              Atrás
            </Button>
          </div>
        ) : null}

        {step >= 3 && step <= 5 && imageUrl ? (
          <div className="space-y-3">
            {step === 3 ? (
              <RegionPainter
                imageUrl={imageUrl}
                value={skuCol}
                onChange={setSkuCol}
                label="¿Dónde está la columna de código / SKU / Item?"
                colorClass="border-sky-500 bg-sky-500/25"
              />
            ) : null}
            {step === 4 ? (
              <RegionPainter
                imageUrl={imageUrl}
                value={descCol}
                onChange={setDescCol}
                label="¿Dónde está el nombre / descripción del producto?"
                colorClass="border-emerald-500 bg-emerald-500/25"
              />
            ) : null}
            {step === 5 ? (
              <RegionPainter
                imageUrl={imageUrl}
                value={numsCol}
                onChange={setNumsCol}
                label="¿Dónde están las cantidades (y precios si los hay)?"
                colorClass="border-amber-500 bg-amber-500/25"
              />
            ) : null}
            <ErrorNote message={error} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                Atrás
              </Button>
              <Button
                type="button"
                disabled={
                  (step === 3 && !skuCol) || (step === 4 && !descCol) || (step === 5 && !numsCol)
                }
                onClick={() => setStep(step + 1)}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-3">
            <p className="text-sm">
              Perfil <strong>{name}</strong>
              {alwaysSame ? " · formato fijo" : " · formato habitual"}
            </p>
            <p className="text-xs text-muted-foreground">
              ClarivScan usará estas zonas antes que el layout genérico. Puedes reentrenar cuando
              cambie el proveedor.
            </p>
            <ErrorNote message={error} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(5)}>
                Atrás
              </Button>
              <Button type="button" onClick={saveProfile}>
                Guardar y probar
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Link to="/ajustes" className="block text-center text-sm text-primary underline">
        Volver a Ajustes
      </Link>
    </div>
  );
}
