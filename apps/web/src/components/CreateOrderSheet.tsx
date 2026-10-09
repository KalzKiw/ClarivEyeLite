import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ErrorNote, Field, TextInput } from "@/components/ui";
import { canCreateOrder, countOpenOrders } from "@clariveye-lite/domain";
import { createOrderFromLines, saveOrders } from "@/lib/store";
import { useOrders, usePlan } from "@/lib/use-app-store";
import { UpgradeModal } from "@/components/UpgradeModal";

type DraftLine = {
  reference: string;
  name: string;
  quantity: number;
  packages: number;
  barcode: string;
};

/**
 * Sheet para crear pedido a mano (estilo apps grandes: formulario dedicado).
 */
export function CreateOrderSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const orders = useOrders();
  const plan = usePlan();
  const [docNumber, setDocNumber] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { reference: "", name: "", quantity: 1, packages: 1, barcode: "" },
  ]);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDocNumber("");
    setLines([{ reference: "", name: "", quantity: 1, packages: 1, barcode: "" }]);
    setError("");
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

  function save() {
    if (!canCreateOrder(orders, plan)) {
      setUpgradeOpen(true);
      return;
    }
    const clean = lines
      .map((l) => ({
        reference: l.reference.trim(),
        name: l.name.trim() || null,
        quantity: Math.max(1, Number(l.quantity) || 1),
        packages: Math.max(0, Number(l.packages) || 0),
        barcode: l.barcode.trim() || null,
      }))
      .filter((l) => l.reference);
    if (clean.length === 0) {
      setError("Añade al menos un producto con referencia");
      return;
    }
    const order = createOrderFromLines(docNumber, clean, null);
    saveOrders([order, ...orders]);
    onClose();
    navigate("/");
  }

  return (
    <>
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
        <div className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Crear pedido</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">A mano, sin documento</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <Field label="Nº documento">
              <TextInput
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="ALB-001 (opcional)"
              />
            </Field>

            {lines.map((line, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-primary">Producto {index + 1}</p>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
                <Field label="Referencia">
                  <TextInput
                    value={line.reference}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, reference: e.target.value } : l,
                        ),
                      )
                    }
                    placeholder="SKU"
                  />
                </Field>
                <Field label="Nombre">
                  <TextInput
                    value={line.name}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)),
                      )
                    }
                  />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Uds">
                    <TextInput
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index
                              ? { ...l, quantity: Number(e.target.value) || 1 }
                              : l,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Bultos">
                    <TextInput
                      type="number"
                      min={0}
                      value={line.packages}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index
                              ? { ...l, packages: Number(e.target.value) || 0 }
                              : l,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="EAN">
                    <TextInput
                      value={line.barcode}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, barcode: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="w-full gap-1"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { reference: "", name: "", quantity: 1, packages: 1, barcode: "" },
                ])
              }
            >
              <Plus size={16} />
              Añadir línea
            </Button>

            <ErrorNote message={error} />
          </div>

          <div className="border-t border-border p-4">
            <Button type="button" className="w-full" onClick={save}>
              Guardar pedido
            </Button>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        openCount={countOpenOrders(orders)}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
