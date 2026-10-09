import type { OrderStatus } from "@clariveye-lite/domain";
import {
  FREE_OPEN_LIMIT,
  ORDER_COLUMNS,
  ORDER_STATUS_LABEL,
  countOpenOrders,
  orderPickProgress,
} from "@clariveye-lite/domain";
import { PackageCheck, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FreeLimitBanner } from "@/components/FreeLimitBanner";
import { OrderSheet } from "@/components/OrderSheet";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button, Card, StatusPill } from "@/components/ui";
import { patchOrderStatus } from "@/lib/store";
import { useOrders, usePlan } from "@/lib/use-app-store";

export function OrdersPage() {
  const navigate = useNavigate();
  const orders = useOrders();
  const plan = usePlan();
  const [openId, setOpenId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const openCount = countOpenOrders(orders);
  const viewing = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos de salida</h1>
        <p className="text-sm text-muted-foreground">
          {openCount}/{plan === "free" ? FREE_OPEN_LIMIT : "∞"} abiertos
        </p>
      </div>

      {plan === "free" ? (
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
                  {items.map((order) => {
                    const progress = orderPickProgress(order);
                    return (
                      <li key={order.id}>
                        <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setOpenId(order.id)}
                            className="w-full text-left transition hover:opacity-90 active:scale-[0.99]"
                          >
                            <p className="font-semibold">{order.docNumber}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {order.lines.length} productos · {progress.unitsDone}/
                              {progress.unitsTotal} uds
                            </p>
                          </button>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(order.status === "por_preparar" || order.status === "preparando") && (
                              <Button
                                type="button"
                                className="h-8 gap-1 px-2.5 text-xs"
                                onClick={() => {
                                  if (order.status === "por_preparar") {
                                    patchOrderStatus(order.id, "preparando");
                                  }
                                  navigate(`/picking/${order.id}`);
                                }}
                              >
                                <PackageCheck size={14} />
                                {order.status === "por_preparar" ? "Empezar picking" : "Seguir picking"}
                              </Button>
                            )}
                            {order.status === "listo" && (
                              <Button
                                type="button"
                                className="h-8 gap-1 px-2.5 text-xs"
                                onClick={() => setOpenId(order.id)}
                              >
                                <Truck size={14} />
                                Entregar
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <OrderSheet order={viewing} onClose={() => setOpenId(null)} />

      <UpgradeModal
        open={upgradeOpen}
        openCount={openCount}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
