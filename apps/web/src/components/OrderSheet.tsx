import type { Order, OrderLine, OrderStatus } from "@clariveye-lite/domain";
import {
  ORDER_STATUS_LABEL,
  allLinesPicked,
  normalizeOrderLine,
} from "@clariveye-lite/domain";
import { FileDown, PackageCheck, Truck } from "lucide-react";
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
  const [pdfMenu, setPdfMenu] = useState(false);

  useEffect(() => {
    if (!order) return;
    setNotes(order.notes ?? "");
    setDeliveryNotes(order.deliveryNotes ?? "");
    setLines(order.lines.map(normalizeOrderLine));
  }, [order]);

  if (!order) return null;

  function setStatus(status: OrderStatus) {
    if (readOnly) return;
    patchOrderStatus(order!.id, status);
  }

  function saveNotes() {
    if (readOnly) return;
    patchOrderNotes(order!.id, notes.trim() || null);
  }

  function saveDeliveryNotes() {
    if (readOnly) return;
    patchOrderDeliveryNotes(order!.id, deliveryNotes.trim() || null);
  }

  function updateLine(lineId: string, patch: Partial<OrderLine>) {
    if (readOnly) return;
    const next = lines.map((l) =>
      l.id === lineId ? normalizeOrderLine({ ...l, ...patch }) : l,
    );
    setLines(next);
    patchOrderLines(order!.id, next);
  }

  function deliver() {
    if (readOnly) return;
    patchOrderDeliveryNotes(order!.id, deliveryNotes.trim() || null);
    patchOrderStatus(order!.id, "entregado");
    onClose();
  }

  async function onPdf(kind: "cierre" | "picking") {
    setPdfBusy(true);
    setPdfMenu(false);
    try {
      const fresh = {
        ...order!,
        notes: notes.trim() || null,
        deliveryNotes: deliveryNotes.trim() || null,
        lines,
      };
      await downloadOrderPdf(fresh, { businessName: business?.name, kind });
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
        <div className="space-y-2">
          {pdfMenu ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 gap-1"
                disabled={pdfBusy}
                onClick={() => void onPdf("cierre")}
              >
                <FileDown size={16} />
                Cierre
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 gap-1"
                disabled={pdfBusy}
                onClick={() => void onPdf("picking")}
              >
                <FileDown size={16} />
                Picking
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 gap-1"
                disabled={pdfBusy}
                onClick={() => setPdfMenu(true)}
              >
                <FileDown size={16} />
                Generar PDF
              </Button>
              <Button type="button" className="flex-1" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
          {pdfMenu ? (
            <p className="text-center text-[11px] text-muted-foreground">
              Cierre = entrega/firmas · Picking = barcodes separados para pistola
            </p>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Estado
          </p>
          {!readOnly ? (
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
          ) : (
            <StatusPill status={order.status}>{ORDER_STATUS_LABEL[order.status]}</StatusPill>
          )}

          {!readOnly ? (
            <div className="flex flex-col gap-2 pt-1">
              {(order.status === "por_preparar" || order.status === "preparando") && (
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={() => {
                    if (order.status === "por_preparar") patchOrderStatus(order.id, "preparando");
                    onClose();
                    navigate(`/picking/${order.id}`);
                  }}
                >
                  <PackageCheck size={16} />
                  {order.status === "por_preparar" ? "Empezar picking" : "Ir a picking"}
                </Button>
              )}
              {order.status === "preparando" && allLinesPicked(order) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => patchOrderStatus(order.id, "listo")}
                >
                  Marcar listo para entrega
                </Button>
              )}
              {order.status === "listo" && (
                <Button type="button" className="w-full gap-2" onClick={deliver}>
                  <Truck size={16} />
                  Confirmar entrega
                </Button>
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <Field label="Notas">
            <TextInput
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Notas del pedido"
              disabled={readOnly}
            />
          </Field>
          <Field label="Notas de entrega">
            <TextInput
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              onBlur={saveDeliveryNotes}
              placeholder="Quién recibe, incidencias…"
              disabled={readOnly}
            />
          </Field>
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
