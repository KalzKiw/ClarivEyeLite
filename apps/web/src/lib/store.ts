import type { Order, OrderLine, OrderStatus } from "@clariveye-lite/domain";
import { currentBusinessId } from "@/lib/auth";

const LEGACY_ORDERS = "clariveye-lite.orders.v1";
const LEGACY_PLAN = "clariveye-lite.plan";

export type Plan = "free" | "pro";

function requireBusinessId(): string {
  const id = currentBusinessId();
  if (!id) throw new Error("Sin sesión de negocio");
  return id;
}

function ordersKey(businessId: string) {
  return `clariveye-lite.orders.${businessId}.v1`;
}

function planKey(businessId: string) {
  return `clariveye-lite.plan.${businessId}`;
}

/** Migra pedidos legacy al negocio de la sesión actual (una vez). */
function migrateLegacyOrders(businessId: string) {
  if (localStorage.getItem(ordersKey(businessId))) return;
  const legacy = localStorage.getItem(LEGACY_ORDERS);
  if (!legacy) return;
  localStorage.setItem(ordersKey(businessId), legacy);
  const legacyPlan = localStorage.getItem(LEGACY_PLAN);
  if (legacyPlan) localStorage.setItem(planKey(businessId), legacyPlan);
}

export function loadOrders(): Order[] {
  const businessId = currentBusinessId();
  if (!businessId) return [];
  migrateLegacyOrders(businessId);
  try {
    return JSON.parse(localStorage.getItem(ordersKey(businessId)) ?? "[]") as Order[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  const businessId = requireBusinessId();
  localStorage.setItem(ordersKey(businessId), JSON.stringify(orders));
}

export function loadPlan(): Plan {
  const businessId = currentBusinessId();
  if (!businessId) return "free";
  migrateLegacyOrders(businessId);
  return localStorage.getItem(planKey(businessId)) === "pro" ? "pro" : "free";
}

export function savePlan(plan: Plan) {
  const businessId = requireBusinessId();
  localStorage.setItem(planKey(businessId), plan);
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
