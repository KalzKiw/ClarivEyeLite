export type OrderStatus = "por_preparar" | "preparando" | "listo" | "entregado";

export interface OrderLine {
  id: string;
  reference: string;
  barcode: string | null;
  name: string | null;
  quantity: number;
  packages: number;
  picked: boolean;
}

export interface Order {
  id: string;
  docNumber: string;
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

export function allLinesPicked(order: Order): boolean {
  return order.lines.length > 0 && order.lines.every((line) => line.picked);
}
