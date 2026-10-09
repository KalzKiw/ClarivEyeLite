import type { Order, OrderStatus } from "@clariveye-lite/domain";
import {
  FREE_OPEN_LIMIT,
  ORDER_COLUMNS,
  ORDER_STATUS_LABEL,
  canCreateOrder,
  countOpenOrders,
} from "@clariveye-lite/domain";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FreeLimitBanner } from "@/components/FreeLimitBanner";
import { OrderSheet } from "@/components/OrderSheet";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Card, StatusPill } from "@/components/ui";
import { loadOrders, loadPlan } from "@/lib/store";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [plan, setPlan] = useState(loadPlan());
  const [openId, setOpenId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    setOrders(loadOrders());
    setPlan(loadPlan());
  }, []);

  const openCount = countOpenOrders(orders);
  const freeBlocked = !canCreateOrder(orders, plan);
  const viewing = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos de salida</h1>
          <p className="text-sm text-muted-foreground">
            Plan {plan} · {openCount}/{plan === "free" ? FREE_OPEN_LIMIT : "∞"} abiertos · toca un
            pedido
          </p>
        </div>
        {freeBlocked ? (
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition active:scale-[0.97] hover:brightness-110"
          >
            <Plus size={16} />
            ClarivScan
          </button>
        ) : (
          <Link
            to="/clarivscan"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition active:scale-[0.97] hover:brightness-110"
          >
            <Plus size={16} />
            ClarivScan
          </Link>
        )}
      </div>

      {freeBlocked ? (
        <FreeLimitBanner openCount={openCount} onOpenUpgrade={() => setUpgradeOpen(true)} />
      ) : null}

      <div className="space-y-3">
        {ORDER_COLUMNS.map((status: OrderStatus) => {
          const items = orders.filter((order) => order.status === status);
          return (
            <Card key={status} className="space-y-3 p-3">
              <header className="flex items-center justify-between gap-2">
                <StatusPill status={status}>{ORDER_STATUS_LABEL[status]}</StatusPill>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </header>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Vacío</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(order.id)}
                        className="w-full rounded-lg border border-border bg-background p-3 text-left shadow-sm transition hover:border-primary/40 active:scale-[0.99]"
                      >
                        <p className="font-semibold">{order.docNumber}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {order.lines.length} productos ·{" "}
                          {order.lines.reduce((sum, line) => sum + line.quantity, 0)} uds ·{" "}
                          {order.lines.reduce((sum, line) => sum + line.packages, 0)} bultos
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <OrderSheet
        order={viewing}
        onClose={() => {
          setOpenId(null);
          setOrders(loadOrders());
          setPlan(loadPlan());
        }}
        onChange={(next) => {
          setOrders(next);
          setPlan(loadPlan());
        }}
      />

      <UpgradeModal
        open={upgradeOpen}
        openCount={openCount}
        onClose={() => setUpgradeOpen(false)}
        onUpgraded={() => {
          setPlan(loadPlan());
          setOrders(loadOrders());
        }}
      />
    </div>
  );
}
