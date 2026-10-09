import type { Order } from "@clariveye-lite/domain";
import { ORDER_STATUS_LABEL } from "@clariveye-lite/domain";
import { useEffect, useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { Card } from "@/components/ui";
import { loadOrders } from "@/lib/store";

export function LogPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  const events = orders
    .flatMap((order) => {
      const items = [
        {
          id: `${order.id}-created`,
          at: order.createdAt,
          text: `Pedido ${order.docNumber} creado vía ClarivScan (${order.lines.length} líneas)`,
        },
      ];
      if (order.deliveredAt) {
        items.push({
          id: `${order.id}-delivered`,
          at: order.deliveredAt,
          text: `Pedido ${order.docNumber} → ${ORDER_STATUS_LABEL.entregado}`,
        });
      } else {
        items.push({
          id: `${order.id}-status`,
          at: order.createdAt,
          text: `Pedido ${order.docNumber} → ${ORDER_STATUS_LABEL[order.status]}`,
        });
      }
      return items;
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="space-y-4">
      <SettingsBack />
      <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin eventos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="p-3">
                <p className="text-sm">{event.text}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(event.at).toLocaleString()}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
