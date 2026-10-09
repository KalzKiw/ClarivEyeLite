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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [scanOk, setScanOk] = useState<boolean | null>(null);
  const [lastScannedLineId, setLastScannedLineId] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [lastHit, setLastHit] = useState<{
    name: string;
    ref: string;
    picked: number;
    qty: number;
    complete: boolean;
  } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const lineRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!order) return;
    if (order.status === "por_preparar" || order.status === "listo") {
      patchOrderStatus(order.id, "preparando");
    }
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (!lastScannedLineId) return;
    const el = lineRefs.current.get(lastScannedLineId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lastScannedLineId, order?.lines]);

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
    setLastScannedLineId(lineId);
  }

  function scanLineUnit(lineId: string): { ok: true; msg: string } | { ok: false; msg: string } {
    if (!order) return { ok: false, msg: "Pedido no encontrado" };
    const target = order.lines.find((l) => l.id === lineId);
    if (!target) return { ok: false, msg: "Línea no encontrada" };
    const current = normalizeOrderLine(target);
    if (current.pickedQty >= current.quantity) {
      setLastHit({
        name: current.name || current.reference,
        ref: current.reference,
        picked: current.pickedQty,
        qty: current.quantity,
        complete: true,
      });
      return {
        ok: false,
        msg: `Ya completo · ${current.reference} · ${current.pickedQty}/${current.quantity}`,
      };
    }
    const lines = order.lines.map((line) =>
      line.id === lineId ? bumpPickedQty(line, 1) : normalizeOrderLine(line),
    );
    persistLines(lines, true);
    const next = bumpPickedQty(current, 1);
    const done = next.pickedQty >= next.quantity;
    setLastHit({
      name: next.name || next.reference,
      ref: next.reference,
      picked: next.pickedQty,
      qty: next.quantity,
      complete: done,
    });
    setPulseKey((k) => k + 1);
    return {
      ok: true,
      msg: done
        ? `¡Línea completa! · ${next.reference} · ${next.pickedQty}/${next.quantity}`
        : `+1 registrado · ${next.reference} · ${next.pickedQty} de ${next.quantity}`,
    };
  }

  const onScan = useCallback(
    (raw: string): boolean => {
      const ids = orders.map((o) => o.id);
      const orderId = matchOrderIdFromToken(raw, ids);
      if (orderId) {
        if (orderId === id) {
          setScanMsg("Este pedido ya está abierto");
          setScanOk(true);
          return true;
        }
        setScanning(false);
        navigate(`/picking/${orderId}`);
        return true;
      }

      const current = orders.find((o) => o.id === id);
      if (!current) {
        setScanMsg("Pedido no encontrado");
        setScanOk(false);
        setLastScannedLineId(null);
        return false;
      }

      const line = current.lines.find((l) => matchBarcode(l, raw));
      if (!line) {
        setScanMsg(`“${raw}” no está en este pedido`);
        setScanOk(false);
        setLastScannedLineId(null);
        return false;
      }
      const result = scanLineUnit(line.id);
      setScanMsg(result.msg);
      setScanOk(result.ok);
      setLastScannedLineId(line.id);
      return result.ok;
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

  async function downloadPickingPdf() {
    if (!order) return;
    setPdfBusy(true);
    try {
      await downloadOrderPdf(order, { businessName: business?.name, kind: "picking" });
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
          {!scanning ? (
            <Button type="button" className="gap-1.5" onClick={() => setScanning(true)}>
              <ScanLine size={16} />
              Escanear
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="gap-1.5"
            disabled={pdfBusy}
            onClick={() => void downloadPickingPdf()}
          >
            <FileDown size={16} />
            {pdfBusy ? "…" : "PDF picking"}
          </Button>
        </div>
      </div>

      {scanning ? (
        <div className="space-y-3">
          <BarcodeScanner
            layout="embedded"
            onScan={onScan}
            onClose={() => setScanning(false)}
          />
          {lastHit && scanOk !== false ? (
            <div
              key={pulseKey}
              className="animate-in fade-in zoom-in-95 rounded-xl border border-emerald-400 bg-emerald-50 px-4 py-3 shadow-sm dark:bg-emerald-950/50"
              role="status"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {lastHit.complete ? "Línea completa" : "Producto registrado"}
              </p>
              <p className="mt-1 text-base font-semibold text-emerald-950 dark:text-emerald-50">
                {lastHit.name}
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">{lastHit.ref}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                  {lastHit.picked}
                  <span className="text-lg font-semibold text-emerald-600/70">/{lastHit.qty}</span>
                </p>
                <p className="pb-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {lastHit.complete ? "Listo" : `Faltan ${lastHit.qty - lastHit.picked}`}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-900">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
                  style={{ width: `${Math.min(100, (lastHit.picked / lastHit.qty) * 100)}%` }}
                />
              </div>
            </div>
          ) : scanMsg ? (
            <p
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                scanOk === false
                  ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              }`}
              role="status"
            >
              {scanMsg}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Cada lectura suma 1 ud · verás la barra y el contador abajo
            </p>
          )}
        </div>
      ) : scanMsg ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            scanOk === false
              ? "bg-red-100 text-red-800"
              : "bg-primary/10 text-foreground"
          }`}
        >
          {scanMsg}
        </p>
      ) : null}

      <ul className="space-y-2">
        {order.lines.map((raw) => {
          const line = normalizeOrderLine(raw);
          const full = line.pickedQty >= line.quantity;
          const partial = line.pickedQty > 0 && !full;
          const highlight = lastScannedLineId === line.id;
          const pct = Math.min(100, (line.pickedQty / line.quantity) * 100);
          return (
            <li
              key={line.id}
              ref={(el) => {
                if (el) lineRefs.current.set(line.id, el);
                else lineRefs.current.delete(line.id);
              }}
            >
              <button
                type="button"
                onClick={() => toggleLine(line.id)}
                className={`flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left shadow-sm transition active:scale-[0.99] ${
                  full
                    ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-50"
                    : partial
                      ? "border-amber-400/70 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
                      : "border-border bg-card"
                } ${highlight ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
              >
                <span className="flex w-full items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                      full
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : partial
                          ? "border-amber-600 bg-amber-500 text-white"
                          : "border-border bg-background"
                    }`}
                  >
                    {full ? <Check size={14} /> : line.pickedQty > 0 ? line.pickedQty : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="block text-sm font-semibold">{line.reference}</span>
                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${
                          full
                            ? "text-emerald-700 dark:text-emerald-300"
                            : partial
                              ? "text-amber-800 dark:text-amber-200"
                              : "text-muted-foreground"
                        }`}
                      >
                        {line.pickedQty}/{line.quantity}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {line.name || "Sin nombre"} · {line.packages} bultos
                      {line.quantity > 1 ? " · cada scan +1" : ""}
                    </span>
                  </span>
                </span>
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-300 ${
                      full ? "bg-emerald-600" : partial ? "bg-amber-500" : "bg-transparent"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
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
    </div>
  );
}
