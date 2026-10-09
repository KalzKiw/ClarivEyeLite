import type { Order } from "@clariveye-lite/domain";
import { ORDER_STATUS_LABEL, matchOrderIdFromToken } from "@clariveye-lite/domain";
import { ScanLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Button, Card, StatusPill } from "@/components/ui";
import { loadOrders, patchOrderStatus } from "@/lib/store";

function pickingPool() {
  return loadOrders().filter(
    (order) => order.status === "por_preparar" || order.status === "preparando",
  );
}

function openForPicking(id: string): { ok: true; order: Order } | { ok: false; error: string } {
  const order = loadOrders().find((o) => o.id === id);
  if (!order) return { ok: false, error: "Pedido no encontrado en este dispositivo" };
  if (order.status === "entregado") {
    return { ok: false, error: `Pedido ${order.docNumber} ya entregado` };
  }
  if (order.status === "por_preparar" || order.status === "listo") {
    patchOrderStatus(order.id, "preparando");
  }
  const fresh = loadOrders().find((o) => o.id === id);
  if (!fresh) return { ok: false, error: "Pedido no encontrado" };
  return { ok: true, order: fresh };
}

/** Lista: elige pedido. El detalle vive en /picking/:id (página, no modal). */
export function PickingPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  useEffect(() => {
    setOrders(pickingPool());
  }, []);

  function goToOrder(id: string) {
    const result = openForPicking(id);
    if (!result.ok) {
      setScanMsg(result.error);
      return;
    }
    setOrders(pickingPool());
    navigate(`/picking/${result.order.id}`);
  }

  const onScan = useCallback(
    (raw: string) => {
      const ids = loadOrders().map((o) => o.id);
      const orderId = matchOrderIdFromToken(raw, ids);
      if (orderId) {
        setScanning(false);
        goToOrder(orderId);
        return;
      }
      setScanMsg("Escanea la barra o el QR del pedido, o elige uno de la lista");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Picking</h1>
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
          No hay pedidos en picking. Crea uno con ClarivScan.
        </Card>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const picked = order.lines.filter((l) => l.picked).length;
            const total = order.lines.length;
            return (
              <li key={order.id}>
                <Link
                  to={`/picking/${order.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    goToOrder(order.id);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{order.docNumber}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {picked}/{total} líneas · {order.lines.reduce((s, l) => s + l.quantity, 0)} uds
                    </p>
                  </div>
                  <StatusPill status={order.status}>{ORDER_STATUS_LABEL[order.status]}</StatusPill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {scanning ? <BarcodeScanner onScan={onScan} onClose={() => setScanning(false)} /> : null}
    </div>
  );
}
