import type { Order } from "@clariveye-lite/domain";
import {
  ORDER_STATUS_LABEL,
  allLinesPicked,
  matchBarcode,
  parseOrderToken,
} from "@clariveye-lite/domain";
import { Check, FileDown, ScanLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { OrderSheet } from "@/components/OrderSheet";
import { Button, Card, StatusPill } from "@/components/ui";
import { downloadOrderPdf } from "@/lib/order-pdf";
import { loadOrders, patchOrderLines, patchOrderStatus } from "@/lib/store";

function pickingPool() {
  return loadOrders().filter(
    (order) => order.status === "por_preparar" || order.status === "preparando",
  );
}

export function PickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  function refresh() {
    const list = pickingPool();
    setOrders(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
  }

  useEffect(() => {
    refresh();
  }, []);

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  function openOrder(id: string) {
    const all = loadOrders();
    const order = all.find((o) => o.id === id);
    if (!order) {
      setScanMsg("Pedido no encontrado en este dispositivo");
      return false;
    }
    if (order.status === "entregado") {
      setScanMsg(`Pedido ${order.docNumber} ya entregado`);
      return false;
    }
    if (order.status === "por_preparar" || order.status === "listo") {
      patchOrderStatus(order.id, "preparando");
    }
    const list = pickingPool();
    setOrders(list);
    setSelectedId(order.id);
    setScanMsg(`Pedido ${order.docNumber} abierto`);
    return true;
  }

  function toggleLine(lineId: string) {
    if (!selected) return;
    const lines = selected.lines.map((line) =>
      line.id === lineId ? { ...line, picked: !line.picked } : line,
    );
    if (selected.status === "por_preparar") {
      patchOrderLines(selected.id, lines);
      setOrders(
        patchOrderStatus(selected.id, "preparando").filter(
          (order) => order.status === "por_preparar" || order.status === "preparando",
        ),
      );
      return;
    }
    setOrders(
      patchOrderLines(selected.id, lines).filter(
        (order) => order.status === "por_preparar" || order.status === "preparando",
      ),
    );
  }

  function markLinePicked(lineId: string) {
    if (!selected) return;
    const lines = selected.lines.map((line) =>
      line.id === lineId ? { ...line, picked: true } : line,
    );
    if (selected.status === "por_preparar") {
      patchOrderLines(selected.id, lines);
      setOrders(
        patchOrderStatus(selected.id, "preparando").filter(
          (order) => order.status === "por_preparar" || order.status === "preparando",
        ),
      );
      return;
    }
    setOrders(
      patchOrderLines(selected.id, lines).filter(
        (order) => order.status === "por_preparar" || order.status === "preparando",
      ),
    );
  }

  const onScan = useCallback(
    (raw: string) => {
      const orderId = parseOrderToken(raw);
      if (orderId) {
        openOrder(orderId);
        setScanning(false);
        return;
      }

      const current =
        orders.find((o) => o.id === selectedId) ??
        loadOrders().find((o) => o.id === selectedId) ??
        null;

      if (!current) {
        setScanMsg("Abre un pedido (escanea CEL1) o selecciónalo");
        return;
      }

      const line = current.lines.find((l) => matchBarcode(l, raw));
      if (!line) {
        setScanMsg(`“${raw}” no está en este pedido`);
        return;
      }
      markLinePicked(line.id);
      setScanMsg(`OK · ${line.reference}`);
      // Re-read selected after patch
      const next = loadOrders().find((o) => o.id === current.id);
      if (next) {
        setOrders(
          loadOrders().filter((o) => o.status === "por_preparar" || o.status === "preparando"),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, selectedId],
  );

  function markReady() {
    if (!selected || !allLinesPicked(selected)) return;
    setOrders(
      patchOrderStatus(selected.id, "listo").filter(
        (order) => order.status === "por_preparar" || order.status === "preparando",
      ),
    );
    setSelectedId(null);
  }

  async function onPdf() {
    if (!selected) return;
    setPdfBusy(true);
    try {
      await downloadOrderPdf(selected);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Picking</h1>
          <p className="text-sm text-muted-foreground">Scan CEL1 o referencia de línea</p>
        </div>
        <Button type="button" className="gap-1.5 shrink-0" onClick={() => setScanning(true)}>
          <ScanLine size={16} />
          Escanear
        </Button>
      </div>

      {scanMsg ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{scanMsg}</p>
      ) : null}

      {orders.length === 0 ? (
        <Card className="border-dashed text-center text-sm text-muted-foreground">
          No hay pedidos en picking. Crea uno con ClarivScan o escanea un PDF CEL1.
        </Card>
      ) : (
        <>
          <select
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.docNumber} · {ORDER_STATUS_LABEL[order.status]}
              </option>
            ))}
          </select>

          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setSheetOpen(true)}>
                  <StatusPill status={selected.status}>{ORDER_STATUS_LABEL[selected.status]}</StatusPill>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-xs"
                  onClick={() => setSheetOpen(true)}
                >
                  Ver / editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-xs"
                  disabled={pdfBusy}
                  onClick={() => void onPdf()}
                >
                  <FileDown size={12} />
                  PDF
                </Button>
              </div>
              <ul className="space-y-2">
                {selected.lines.map((line) => (
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
                disabled={!allLinesPicked(selected)}
                className="w-full"
              >
                Marcar listo para entrega
              </Button>
            </>
          ) : null}
        </>
      )}

      {scanning ? <BarcodeScanner onScan={onScan} onClose={() => setScanning(false)} /> : null}

      <OrderSheet
        order={sheetOpen ? selected : null}
        onClose={() => {
          setSheetOpen(false);
          refresh();
        }}
        onChange={(next) => {
          setOrders(
            next.filter((o) => o.status === "por_preparar" || o.status === "preparando"),
          );
        }}
      />
    </div>
  );
}
