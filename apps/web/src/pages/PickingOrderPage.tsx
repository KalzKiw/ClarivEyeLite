import type { Order } from "@clariveye-lite/domain";
import {
  ORDER_STATUS_LABEL,
  allLinesPicked,
  matchBarcode,
  matchOrderIdFromToken,
} from "@clariveye-lite/domain";
import { Check, FileDown, ScanLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Button, Card, StatusPill } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { downloadOrderPdf } from "@/lib/order-pdf";
import { loadOrders, patchOrderLines, patchOrderStatus } from "@/lib/store";

function loadPickingOrder(id: string): Order | null {
  const order = loadOrders().find((o) => o.id === id) ?? null;
  if (!order) return null;
  if (order.status === "entregado") return order;
  return order;
}

/** Detalle de picking en página propia (no modal): al volver no se pierde el trabajo. */
export function PickingOrderPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  function refresh() {
    const next = loadPickingOrder(id);
    setOrder(next);
    return next;
  }

  useEffect(() => {
    const next = loadPickingOrder(id);
    if (!next) {
      setOrder(null);
      return;
    }
    if (next.status === "por_preparar" || next.status === "listo") {
      patchOrderStatus(next.id, "preparando");
      setOrder(loadPickingOrder(id));
      return;
    }
    setOrder(next);
  }, [id]);

  function toggleLine(lineId: string) {
    if (!order) return;
    const lines = order.lines.map((line) =>
      line.id === lineId ? { ...line, picked: !line.picked } : line,
    );
    if (order.status === "por_preparar") {
      patchOrderLines(order.id, lines);
      patchOrderStatus(order.id, "preparando");
    } else {
      patchOrderLines(order.id, lines);
    }
    refresh();
  }

  function markLinePicked(lineId: string) {
    if (!order) return;
    const lines = order.lines.map((line) =>
      line.id === lineId ? { ...line, picked: true } : line,
    );
    if (order.status === "por_preparar") {
      patchOrderLines(order.id, lines);
      patchOrderStatus(order.id, "preparando");
    } else {
      patchOrderLines(order.id, lines);
    }
    refresh();
  }

  const onScan = useCallback(
    (raw: string) => {
      const ids = loadOrders().map((o) => o.id);
      const orderId = matchOrderIdFromToken(raw, ids);
      if (orderId) {
        setScanning(false);
        if (orderId === id) {
          setScanMsg("Este pedido ya está abierto");
          return;
        }
        navigate(`/picking/${orderId}`);
        return;
      }

      const current = loadPickingOrder(id);
      if (!current) {
        setScanMsg("Pedido no encontrado");
        return;
      }

      const line = current.lines.find((l) => matchBarcode(l, raw));
      if (!line) {
        setScanMsg(`“${raw}” no está en este pedido`);
        return;
      }
      markLinePicked(line.id);
      setScanMsg(`OK · ${line.reference}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, navigate],
  );

  function markReady() {
    if (!order || !allLinesPicked(order)) return;
    patchOrderStatus(order.id, "listo");
    navigate("/picking");
  }

  async function onPdf() {
    if (!order) return;
    setPdfBusy(true);
    try {
      await downloadOrderPdf(order, { businessName: business?.name });
    } finally {
      setPdfBusy(false);
    }
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link to="/picking" className="text-sm font-medium text-primary hover:underline">
          ← Picking
        </Link>
        <Card className="text-sm text-muted-foreground">Pedido no encontrado.</Card>
      </div>
    );
  }

  const picked = order.lines.filter((l) => l.picked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to="/picking" className="text-sm font-medium text-primary hover:underline">
            ← Pedidos
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{order.docNumber}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={order.status}>{ORDER_STATUS_LABEL[order.status]}</StatusPill>
            <span className="text-xs text-muted-foreground">
              {picked}/{order.lines.length} líneas
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button type="button" className="gap-1.5" onClick={() => setScanning(true)}>
            <ScanLine size={16} />
            Escanear
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="gap-1.5"
            disabled={pdfBusy}
            onClick={() => void onPdf()}
          >
            <FileDown size={16} />
            PDF
          </Button>
        </div>
      </div>

      {scanMsg ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{scanMsg}</p>
      ) : null}

      <ul className="space-y-2">
        {order.lines.map((line) => (
          <li key={line.id}>
            <button
              type="button"
              onClick={() => toggleLine(line.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition active:scale-[0.99] ${
                line.picked
                  ? "border-[hsl(var(--status-delivered-bg))]/40 bg-[hsl(var(--status-delivered-bg))]/10"
                  : "border-border bg-card"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  line.picked
                    ? "border-[hsl(var(--status-delivered-bg))] bg-[hsl(var(--status-delivered-bg))] text-white"
                    : "border-border"
                }`}
              >
                {line.picked ? <Check size={12} /> : null}
              </span>
              <span>
                <span className="block text-sm font-semibold">{line.reference}</span>
                <span className="block text-xs text-muted-foreground">
                  {line.name || "Sin nombre"} · x{line.quantity} · {line.packages} bultos
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        onClick={markReady}
        disabled={!allLinesPicked(order)}
        className="w-full"
      >
        Marcar listo para entrega
      </Button>

      {scanning ? <BarcodeScanner onScan={onScan} onClose={() => setScanning(false)} /> : null}
    </div>
  );
}
