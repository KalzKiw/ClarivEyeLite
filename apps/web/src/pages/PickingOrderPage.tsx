import {
  ORDER_STATUS_LABEL,
  allLinesPicked,
  bumpPickedQty,
  cyclePickedQty,
  matchBarcode,
  matchOrderIdFromToken,
  normalizeOrderLine,
  orderPickProgress,
} from "@clariveye-lite/domain";
import { Check, FileDown, ScanLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Button, Card, StatusPill } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { downloadOrderPdf } from "@/lib/order-pdf";
import { patchOrderLines, patchOrderStatus } from "@/lib/store";
import { useOrders } from "@/lib/use-app-store";

/** Detalle de picking en página propia (no modal): al volver no se pierde el trabajo. */
export function PickingOrderPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const orders = useOrders();
  const order = useMemo(() => orders.find((o) => o.id === id) ?? null, [orders, id]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMenu, setPdfMenu] = useState(false);
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    if (!order) return;
    if (order.status === "por_preparar" || order.status === "listo") {
      patchOrderStatus(order.id, "preparando");
    }
  }, [order?.id, order?.status]);

  function persistLines(
    lines: ReturnType<typeof normalizeOrderLine>[],
    ensurePreparing = false,
  ) {
    if (!order) return;
    patchOrderLines(order.id, lines);
    if (ensurePreparing && order.status === "por_preparar") {
      patchOrderStatus(order.id, "preparando");
    }
  }

  function toggleLine(lineId: string) {
    if (!order) return;
    const lines = order.lines.map((line) =>
      line.id === lineId ? cyclePickedQty(line) : normalizeOrderLine(line),
    );
    persistLines(lines, true);
  }

  function scanLineUnit(lineId: string): { ok: true; msg: string } | { ok: false; msg: string } {
    if (!order) return { ok: false, msg: "Pedido no encontrado" };
    const target = order.lines.find((l) => l.id === lineId);
    if (!target) return { ok: false, msg: "Línea no encontrada" };
    const current = normalizeOrderLine(target);
    if (current.pickedQty >= current.quantity) {
      return {
        ok: false,
        msg: `${current.reference} ya completo (${current.pickedQty}/${current.quantity})`,
      };
    }
    const lines = order.lines.map((line) =>
      line.id === lineId ? bumpPickedQty(line, 1) : normalizeOrderLine(line),
    );
    persistLines(lines, true);
    const next = bumpPickedQty(current, 1);
    return {
      ok: true,
      msg: `OK · ${next.reference} · ${next.pickedQty}/${next.quantity}`,
    };
  }

  const onScan = useCallback(
    (raw: string) => {
      const ids = orders.map((o) => o.id);
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

      const current = orders.find((o) => o.id === id);
      if (!current) {
        setScanMsg("Pedido no encontrado");
        return;
      }

      const line = current.lines.find((l) => matchBarcode(l, raw));
      if (!line) {
        setScanMsg(`“${raw}” no está en este pedido`);
        return;
      }
      const result = scanLineUnit(line.id);
      setScanMsg(result.msg);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, navigate, orders],
  );

  function markReady(force: boolean) {
    if (!order) return;
    if (!force && !allLinesPicked(order)) return;
    if (force && !allLinesPicked(order)) {
      const ok = window.confirm(
        "Hay unidades pendientes. ¿Marcar listo para entrega de todos modos?",
      );
      if (!ok) return;
    }
    patchOrderStatus(order.id, "listo");
    navigate("/picking");
  }

  async function onPdf(kind: "cierre" | "picking") {
    if (!order) return;
    setPdfBusy(true);
    setPdfMenu(false);
    try {
      await downloadOrderPdf(order, { businessName: business?.name, kind });
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

  const progress = orderPickProgress(order);
  const complete = allLinesPicked(order);

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
              {progress.unitsDone}/{progress.unitsTotal} uds · {progress.linesDone}/
              {progress.linesTotal} líneas
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button type="button" className="gap-1.5" onClick={() => setScanning(true)}>
            <ScanLine size={16} />
            Escanear
          </Button>
          {pdfMenu ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5"
                disabled={pdfBusy}
                onClick={() => void onPdf("cierre")}
              >
                <FileDown size={16} />
                Cierre
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5"
                disabled={pdfBusy}
                onClick={() => void onPdf("picking")}
              >
                <FileDown size={16} />
                Picking
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5"
              disabled={pdfBusy}
              onClick={() => setPdfMenu(true)}
            >
              <FileDown size={16} />
              PDF
            </Button>
          )}
        </div>
      </div>

      {pdfMenu ? (
        <p className="text-xs text-muted-foreground">
          Cierre = entrega/firmas · Picking = barcodes separados para pistola
        </p>
      ) : null}

      {scanMsg ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{scanMsg}</p>
      ) : null}

      <ul className="space-y-2">
        {order.lines.map((raw) => {
          const line = normalizeOrderLine(raw);
          const full = line.pickedQty >= line.quantity;
          return (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => toggleLine(line.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition active:scale-[0.99] ${
                  full
                    ? "border-[hsl(var(--status-delivered-bg))]/40 bg-[hsl(var(--status-delivered-bg))]/10"
                    : line.pickedQty > 0
                      ? "border-primary/35 bg-primary/5"
                      : "border-border bg-card"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                    full
                      ? "border-[hsl(var(--status-delivered-bg))] bg-[hsl(var(--status-delivered-bg))] text-white"
                      : line.pickedQty > 0
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                  }`}
                >
                  {full ? <Check size={12} /> : line.pickedQty > 0 ? line.pickedQty : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="block text-sm font-semibold">{line.reference}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {line.pickedQty}/{line.quantity}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {line.name || "Sin nombre"} · {line.packages} bultos
                    {line.quantity > 1 ? " · toca o escanea +1" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <Button
          type="button"
          onClick={() => markReady(false)}
          disabled={!complete}
          className="w-full"
        >
          Marcar listo para entrega
        </Button>
        {!complete ? (
          forceReady ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-amber-700"
              onClick={() => markReady(true)}
            >
              Confirmar listo incompleto
            </Button>
          ) : (
            <button
              type="button"
              className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setForceReady(true)}
            >
              Marcar listo con unidades pendientes…
            </button>
          )
        ) : null}
      </div>

      {scanning ? <BarcodeScanner onScan={onScan} onClose={() => setScanning(false)} /> : null}
    </div>
  );
}
