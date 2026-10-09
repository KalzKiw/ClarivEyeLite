import { ORDER_STATUS_LABEL } from "@clariveye-lite/domain";
import { useState } from "react";
import { OrderSheet } from "@/components/OrderSheet";
import { SettingsBack } from "@/components/SettingsNavRow";
import { Card } from "@/components/ui";
import { useOrders } from "@/lib/use-app-store";

export function LogPage() {
  const orders = useOrders();
  const [openId, setOpenId] = useState<string | null>(null);
  const viewing = orders.find((o) => o.id === openId) ?? null;

  const events = orders
    .flatMap((order) => {
      const items = [
        {
          id: `${order.id}-created`,
          orderId: order.id,
          at: order.createdAt,
          text: `Pedido ${order.docNumber} creado (${order.lines.length} líneas)`,
        },
      ];
      if (order.deliveredAt) {
        items.push({
          id: `${order.id}-delivered`,
          orderId: order.id,
          at: order.deliveredAt,
          text: `Pedido ${order.docNumber} → ${ORDER_STATUS_LABEL.entregado}`,
        });
      } else if (order.status !== "por_preparar") {
        items.push({
          id: `${order.id}-status`,
          orderId: order.id,
          at: order.createdAt,
          text: `Pedido ${order.docNumber} · ${ORDER_STATUS_LABEL[order.status]}`,
        });
      }
      return items;
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="space-y-4">
      <SettingsBack />
      <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
      <p className="text-sm text-muted-foreground">Toca un evento para ver el pedido</p>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin eventos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <button type="button" className="w-full text-left" onClick={() => setOpenId(event.orderId)}>
                <Card className="p-3 transition hover:border-primary/40 active:scale-[0.99]">
                  <p className="text-sm">{event.text}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(event.at).toLocaleString()}
                  </p>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <OrderSheet order={viewing} onClose={() => setOpenId(null)} />
    </div>
  );
}
