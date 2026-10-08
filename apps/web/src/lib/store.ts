import type { Order, OrderLine, OrderStatus } from "@clariveye-lite/domain";

const KEY = "clariveye-lite.orders.v1";
const PLAN_KEY = "clariveye-lite.plan";

export type Plan = "free" | "pro";

export function loadOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Order[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(KEY, JSON.stringify(orders));
}

export function loadPlan(): Plan {
  return localStorage.getItem(PLAN_KEY) === "pro" ? "pro" : "free";
}

export function savePlan(plan: Plan) {
  localStorage.setItem(PLAN_KEY, plan);
}

export function newId() {
  return crypto.randomUUID();
}

export function createOrderFromLines(
  docNumber: string,
  lines: Array<Omit<OrderLine, "id" | "picked">>,
): Order {
  return {
    id: newId(),
    docNumber: docNumber || `DOC-${Date.now().toString().slice(-6)}`,
    status: "por_preparar",
    notes: null,
    lines: lines.map((line) => ({ ...line, id: newId(), picked: false })),
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    deliveryNotes: null,
  };
}

export function patchOrderStatus(id: string, status: OrderStatus): Order[] {
  const next = loadOrders().map((order) => {
    if (order.id !== id) return order;
    if (status === "entregado") {
      return { ...order, status, deliveredAt: new Date().toISOString() };
    }
    return { ...order, status };
  });
  saveOrders(next);
  return next;
}

export function patchOrderLines(id: string, lines: OrderLine[]): Order[] {
  const next = loadOrders().map((order) => (order.id === id ? { ...order, lines } : order));
  saveOrders(next);
  return next;
}

export function patchOrderNotes(id: string, notes: string | null): Order[] {
  const next = loadOrders().map((order) => (order.id === id ? { ...order, notes } : order));
  saveOrders(next);
  return next;
}

export function patchOrder(id: string, patch: Partial<Order>): Order[] {
  const next = loadOrders().map((order) => (order.id === id ? { ...order, ...patch } : order));
  saveOrders(next);
  return next;
}
