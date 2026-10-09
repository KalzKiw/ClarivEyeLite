import type { Order, OrderLine, OrderStatus } from "@clariveye-lite/domain";
import { ORDER_STATUS_LABEL } from "@clariveye-lite/domain";
import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { Button, Field, StatusPill, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { downloadOrderPdf } from "@/lib/order-pdf";
import { patchOrderLines, patchOrderNotes, patchOrderStatus } from "@/lib/store";

const STATUSES: OrderStatus[] = ["por_preparar", "preparando", "listo", "entregado"];

export function OrderSheet({
  order,
  onClose,
  onChange,
}: {
  order: Order | null;
  onClose: () => void;
  onChange: (orders: Order[]) => void;
}) {
  const { business } = useAuth();
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!order) return;
    setNotes(order.notes ?? "");
    setLines(order.lines);
  }, [order]);

  if (!order) return null;

  function setStatus(status: OrderStatus) {
    onChange(patchOrderStatus(order!.id, status));
  }

  function saveNotes() {
    onChange(patchOrderNotes(order!.id, notes.trim() || null));
  }

  function updateLine(lineId: string, patch: Partial<OrderLine>) {
    const next = lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l));
    setLines(next);
    onChange(patchOrderLines(order!.id, next));
  }

  async function onPdf() {
    setPdfBusy(true);
    try {
      const fresh = { ...order!, notes: notes.trim() || null, lines };
      await downloadOrderPdf(fresh, { businessName: business?.name });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Sheet
      open={Boolean(order)}
      onClose={onClose}
      title={order.docNumber}
      description={`Pedido · ${ORDER_STATUS_LABEL[order.status]}`}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1 gap-1" disabled={pdfBusy} onClick={() => void onPdf()}>
            <FileDown size={16} />
            PDF / barcode
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <button key={status} type="button" onClick={() => setStatus(status)}>
                <StatusPill status={status}>
                  <span className={order.status === status ? "underline" : ""}>
                    {ORDER_STATUS_LABEL[status]}
                  </span>
                </StatusPill>
              </button>
            ))}
          </div>
        </div>

        <Field label="Notas">
          <TextInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notas del pedido"
          />
        </Field>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Productos ({lines.length})
          </p>
          <ul className="space-y-3">
            {lines.map((line, index) => (
              <li key={line.id} className="space-y-2 rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-medium text-primary">Producto {index + 1}</p>
                <Field label="Referencia / SKU">
                  <TextInput
                    value={line.reference}
                    onChange={(e) => updateLine(line.id, { reference: e.target.value })}
                  />
                </Field>
                <Field label="Barcode (opcional, no uses la ref corta)">
                  <TextInput
                    value={line.barcode ?? ""}
                    onChange={(e) => updateLine(line.id, { barcode: e.target.value || null })}
                    placeholder="EAN / código de barras"
                  />
                </Field>
                <Field label="Nombre">
                  <TextInput
                    value={line.name ?? ""}
                    onChange={(e) => updateLine(line.id, { name: e.target.value || null })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Cantidad">
                    <TextInput
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 1 })}
                    />
                  </Field>
                  <Field label="Bultos">
                    <TextInput
                      type="number"
                      min={0}
                      value={line.packages}
                      onChange={(e) => updateLine(line.id, { packages: Number(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={line.picked}
                    onChange={(e) => updateLine(line.id, { picked: e.target.checked })}
                  />
                  Preparado / picked
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}
