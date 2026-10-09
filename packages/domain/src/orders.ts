export type OrderStatus = "por_preparar" | "preparando" | "listo" | "entregado";

export interface OrderLine {
  id: string;
  reference: string;
  barcode: string | null;
  name: string | null;
  quantity: number;
  packages: number;
  /** Precio unitario si el albarán lo traía */
  unitPrice?: string | null;
  /** Unidades ya preparadas (0…quantity). */
  pickedQty: number;
  /** true cuando pickedQty >= quantity (compat PDF / UI). */
  picked: boolean;
}

export interface Order {
  id: string;
  docNumber: string;
  /** Fecha del albarán (YYYY-MM-DD) si se leyó */
  docDate?: string | null;
  status: OrderStatus;
  notes: string | null;
  lines: OrderLine[];
  createdAt: string;
  deliveredAt: string | null;
  deliveryNotes: string | null;
}

export const FREE_OPEN_LIMIT = 3;

export const ORDER_COLUMNS: OrderStatus[] = ["por_preparar", "preparando", "listo", "entregado"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  por_preparar: "Por preparar",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
};

export function isOpenStatus(status: OrderStatus): boolean {
  return status !== "entregado";
}

export function countOpenOrders(orders: Order[]): number {
  return orders.filter((order) => isOpenStatus(order.status)).length;
}

export function canCreateOrder(orders: Order[], plan: "free" | "pro"): boolean {
  if (plan === "pro") return true;
  return countOpenOrders(orders) < FREE_OPEN_LIMIT;
}

export function matchBarcode(line: OrderLine, scanned: string): boolean {
  const needle = scanned.trim().toLowerCase();
  if (!needle) return false;
  if (line.barcode?.trim().toLowerCase() === needle) return true;
  if (line.reference.trim().toLowerCase() === needle) return true;
  return false;
}

/** Normaliza pickedQty / picked (migración desde pedidos antiguos sin pickedQty). */
export function normalizeOrderLine(line: OrderLine): OrderLine {
  const quantity = Math.max(1, Number(line.quantity) || 1);
  let pickedQty =
    typeof line.pickedQty === "number" && Number.isFinite(line.pickedQty)
      ? Math.max(0, Math.floor(line.pickedQty))
      : line.picked
        ? quantity
        : 0;
  if (pickedQty > quantity) pickedQty = quantity;
  return {
    ...line,
    quantity,
    pickedQty,
    picked: pickedQty >= quantity,
  };
}

export function normalizeOrder(order: Order): Order {
  return { ...order, lines: order.lines.map(normalizeOrderLine) };
}

export function isLineFullyPicked(line: OrderLine): boolean {
  const n = normalizeOrderLine(line);
  return n.pickedQty >= n.quantity;
}

/** Incrementa unidades preparadas; no supera quantity. */
export function bumpPickedQty(line: OrderLine, delta = 1): OrderLine {
  const n = normalizeOrderLine(line);
  const pickedQty = Math.max(0, Math.min(n.quantity, n.pickedQty + delta));
  return { ...n, pickedQty, picked: pickedQty >= n.quantity };
}

/** Ciclo UI: +1 hasta completar; luego vuelve a 0. */
export function cyclePickedQty(line: OrderLine): OrderLine {
  const n = normalizeOrderLine(line);
  if (n.pickedQty >= n.quantity) {
    return { ...n, pickedQty: 0, picked: false };
  }
  return bumpPickedQty(n, 1);
}

export function allLinesPicked(order: Order): boolean {
  return order.lines.length > 0 && order.lines.every((line) => isLineFullyPicked(line));
}

export function orderPickProgress(order: Order): {
  linesDone: number;
  linesTotal: number;
  unitsDone: number;
  unitsTotal: number;
} {
  let linesDone = 0;
  let unitsDone = 0;
  let unitsTotal = 0;
  for (const raw of order.lines) {
    const line = normalizeOrderLine(raw);
    unitsTotal += line.quantity;
    unitsDone += line.pickedQty;
    if (line.pickedQty >= line.quantity) linesDone += 1;
  }
  return {
    linesDone,
    linesTotal: order.lines.length,
    unitsDone,
    unitsTotal,
  };
}
