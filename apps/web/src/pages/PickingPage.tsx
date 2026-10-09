import {
  ORDER_STATUS_LABEL,
  matchOrderIdFromToken,
  orderPickProgress,
  type OrderStatus,
} from "@clariveye-lite/domain";
import { ScanLine } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Button, Card, StatusPill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { patchOrderStatus } from "@/lib/store";
import { useOrders } from "@/lib/use-app-store";

type Filter = "todos" | OrderStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "por_preparar", label: "Por preparar" },
  { id: "preparando", label: "Preparando" },
  { id: "listo", label: "Listos" },
];

export function PickingPage() {
  const navigate = useNavigate();
  const allOrders = useOrders();
  const [filter, setFilter] = useState<Filter>("todos");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  const pool = useMemo(
    () =>
      allOrders.filter(
        (o) =>
          o.status === "por_preparar" ||
          o.status === "preparando" ||
          o.status === "listo",
      ),
    [allOrders],
  );

  const orders = useMemo(() => {
    if (filter === "todos") return pool;
    return pool.filter((o) => o.status === filter);
  }, [pool, filter]);

  function goToOrder(id: string) {
    const order = allOrders.find((o) => o.id === id);
    if (!order) {
      setScanMsg("Pedido no encontrado en este dispositivo");
      return;
    }
    if (order.status === "entregado") {
      setScanMsg(`Pedido ${order.docNumber} ya entregado`);
      return;
    }
    if (order.status === "por_preparar" || order.status === "listo") {
      patchOrderStatus(order.id, "preparando");
    }
    navigate(`/picking/${id}`);
  }

  const onScan = useCallback(
    (raw: string) => {
      const ids = allOrders.map((o) => o.id);
      const orderId = matchOrderIdFromToken(raw, ids);
      if (orderId) {
        setScanning(false);
        goToOrder(orderId);
        return;
      }
      setScanMsg("Escanea la barra o el QR del pedido, o elige uno de la lista");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOrders],
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

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {scanMsg ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{scanMsg}</p>
      ) : null}

      {orders.length === 0 ? (
        <Card className="border-dashed text-center text-sm text-muted-foreground">
          No hay pedidos en este filtro.
        </Card>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const progress = orderPickProgress(order);
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
                      {progress.unitsDone}/{progress.unitsTotal} uds · {progress.linesDone}/
                      {progress.linesTotal} líneas
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
