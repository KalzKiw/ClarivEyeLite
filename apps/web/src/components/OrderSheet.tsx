import type { Order, OrderLine, OrderStatus } from "@clariveye-lite/domain";
import {
  ORDER_STATUS_LABEL,
  allLinesPicked,
  normalizeOrderLine,
} from "@clariveye-lite/domain";
import { Check, FileDown, PackageCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "@/components/Sheet";
import { Button, Field, StatusPill, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { downloadOrderPdf } from "@/lib/order-pdf";
import {
  patchOrderDeliveryNotes,
  patchOrderLines,
  patchOrderNotes,
  patchOrderStatus,
} from "@/lib/store";

const STATUSES: OrderStatus[] = ["por_preparar", "preparando", "listo", "entregado"];

const STATUS_HINT: Record<OrderStatus, string> = {
  por_preparar: "Pendiente de empezar el picking",
  preparando: "En almacén · marca líneas o escanea",
  listo: "Listo para salir / entregar",
  entregado: "Cerrado · ya entregado",
};

function statusIndex(s: OrderStatus): number {
  return STATUSES.indexOf(s);
}

export function OrderSheet({
  order,
  onClose,
  readOnly = false,
}: {
  order: Order | null;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const { business } = useAuth();
  const [notes, setNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);

  useEffect(() => {
    if (!order) return;
    setNotes(order.notes ?? "");
    setDeliveryNotes(order.deliveryNotes ?? "");
    setLines(order.lines.map(normalizeOrderLine));
  }, [order]);

  if (!order) return null;

  const currentIdx = statusIndex(order.status);
  const canPick = order.status === "por_preparar" || order.status === "preparando";

  function goPicking() {
    if (readOnly) return;
    if (order!.status === "por_preparar") patchOrderStatus(order!.id, "preparando");
    onClose();
    navigate(`/picking/${order!.id}`);
  }

  function setStatus(status: OrderStatus) {
    if (readOnly) return;
    if (status === "entregado" && order!.status !== "entregado") {
      void deliver();
      return;
    }
    patchOrderStatus(order!.id, status);
  }

  function advanceStatus() {
    if (readOnly) return;
    if (order!.status === "por_preparar") {
      goPicking();
      return;
    }
    if (order!.status === "preparando") {
      if (!allLinesPicked(order!)) {
        const ok = window.confirm("Hay unidades sin marcar. ¿Pasar a listo igual?");
        if (!ok) return;
      }
      patchOrderStatus(order!.id, "listo");
      return;
    }
    if (order!.status === "listo") {
      void deliver();
    }
  }

  function saveNotes() {
    if (readOnly) return;
    patchOrderNotes(order!.id, notes.trim() || null);
    setNotesSaved(true);
    window.setTimeout(() => setNotesSaved(false), 1600);
  }

  function saveDeliveryNotes() {
    if (readOnly) return;
    patchOrderDeliveryNotes(order!.id, deliveryNotes.trim() || null);
    setDeliverySaved(true);
    window.setTimeout(() => setDeliverySaved(false), 1600);
  }

  function updateLine(lineId: string, patch: Partial<OrderLine>) {
    if (readOnly) return;
    const next = lines.map((l) =>
      l.id === lineId ? normalizeOrderLine({ ...l, ...patch }) : l,
    );
    setLines(next);
    patchOrderLines(order!.id, next);
  }

  function orderSnapshot(): Order {
    return {
      ...order!,
      notes: notes.trim() || null,
      deliveryNotes: deliveryNotes.trim() || null,
      lines,
    };
  }

  /** PDF de almacén: siempre picking (para pistola). */
  async function downloadPickingPdf() {
    setPdfBusy(true);
    try {
      await downloadOrderPdf(orderSnapshot(), {
        businessName: business?.name,
        kind: "picking",
      });
    } finally {
      setPdfBusy(false);
    }
  }

  /** Al pasar a entregado: genera comprobante de entrega (sin punteo). */
  async function deliver() {
    if (readOnly) return;
    patchOrderDeliveryNotes(order!.id, deliveryNotes.trim() || null);
    setPdfBusy(true);
    try {
      await downloadOrderPdf(
        { ...orderSnapshot(), status: "entregado" },
        { businessName: business?.name, kind: "cierre" },
      );
    } catch {
      /* descarga fallida: igual cerramos el pedido */
    } finally {
      setPdfBusy(false);
    }
    patchOrderStatus(order!.id, "entregado");
    onClose();
  }

  /** Reimprimir entrega solo si ya está entregado. */
  async function downloadEntregaPdf() {
    setPdfBusy(true);
    try {
      await downloadOrderPdf(orderSnapshot(), {
        businessName: business?.name,
        kind: "cierre",
      });
    } finally {
      setPdfBusy(false);
    }
  }

  const nextLabel =
    order.status === "por_preparar"
      ? "Empezar picking"
      : order.status === "preparando"
        ? "Marcar listo"
        : order.status === "listo"
          ? "Confirmar entrega"
          : null;

  return (
    <Sheet
      open={Boolean(order)}
      onClose={onClose}
      title={order.docNumber}
      description={STATUS_HINT[order.status]}
      headerAction={
        !readOnly && canPick ? (
          <Button type="button" className="w-full gap-2" onClick={goPicking}>
            <PackageCheck size={16} />
            {order.status === "por_preparar" ? "Empezar picking" : "Ir a picking"}
          </Button>
        ) : null
      }
      footer={
        <div className="space-y-2">
          <div className="flex gap-2">
            {order.status === "entregado" ? (
              <Button
                type="button"
                variant="ghost"
                className="flex-1 gap-1"
                disabled={pdfBusy}
                onClick={() => void downloadEntregaPdf()}
              >
                <FileDown size={16} />
                {pdfBusy ? "…" : "PDF entrega"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="flex-1 gap-1"
                disabled={pdfBusy}
                onClick={() => void downloadPickingPdf()}
              >
                <FileDown size={16} />
                {pdfBusy ? "…" : "PDF picking"}
              </Button>
            )}
            <Button type="button" className="flex-1" onClick={onClose}>
              Cerrar
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            {order.status === "entregado"
              ? "Comprobante de entrega (firmas · sin punteo)"
              : "Hoja de almacén con barcodes. El PDF de entrega se genera al confirmar entrega."}
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            <StatusPill status={order.status}>{ORDER_STATUS_LABEL[order.status]}</StatusPill>
          </div>

          {/* Stepper */}
          <ol className="grid grid-cols-4 gap-1">
            {STATUSES.map((status, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <li key={status} className="min-w-0 text-center">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setStatus(status)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                      active
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : done
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                    } ${readOnly ? "cursor-default" : "hover:brightness-110"}`}
                    title={ORDER_STATUS_LABEL[status]}
                  >
                    {done ? <Check size={14} /> : i + 1}
                  </button>
                  <p
                    className={`mt-1 truncate text-[10px] font-medium ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {ORDER_STATUS_LABEL[status]}
                  </p>
                </li>
              );
            })}
          </ol>

          {!readOnly && nextLabel && order.status !== "entregado" ? (
            <Button
              type="button"
              variant={order.status === "listo" ? "primary" : "ghost"}
              className="w-full gap-2"
              onClick={advanceStatus}
            >
              {order.status === "listo" ? <Truck size={16} /> : null}
              Siguiente: {nextLabel}
            </Button>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-muted-foreground">Notas del pedido</label>
              {notesSaved ? (
                <span className="text-[11px] font-medium text-emerald-600">Guardado</span>
              ) : null}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Instrucciones internas, ubicación…"
              disabled={readOnly}
              rows={3}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary focus:ring-2 disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-muted-foreground">Notas de entrega</label>
              {deliverySaved ? (
                <span className="text-[11px] font-medium text-emerald-600">Guardado</span>
              ) : null}
            </div>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              onBlur={saveDeliveryNotes}
              placeholder="Quién recibe, horario, incidencias…"
              disabled={readOnly}
              rows={3}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary focus:ring-2 disabled:opacity-60"
            />
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Productos ({lines.length})
          </p>
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li
                key={line.id}
                className="space-y-2 rounded-xl border border-border bg-background p-3"
              >
                <p className="text-xs font-medium text-primary">#{index + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Ref">
                    <TextInput
                      value={line.reference}
                      onChange={(e) => updateLine(line.id, { reference: e.target.value })}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Uds">
                    <TextInput
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, { quantity: Number(e.target.value) || 1 })
                      }
                      disabled={readOnly}
                    />
                  </Field>
                </div>
                <Field label="Nombre">
                  <TextInput
                    value={line.name ?? ""}
                    onChange={(e) => updateLine(line.id, { name: e.target.value || null })}
                    disabled={readOnly}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Barcode">
                    <TextInput
                      value={line.barcode ?? ""}
                      onChange={(e) =>
                        updateLine(line.id, { barcode: e.target.value || null })
                      }
                      placeholder="EAN"
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Prep.">
                    <TextInput
                      type="number"
                      min={0}
                      max={line.quantity}
                      value={line.pickedQty}
                      onChange={(e) =>
                        updateLine(line.id, {
                          pickedQty: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      disabled={readOnly}
                    />
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Sheet>
  );
}
