import type { Order, OrderLine, OrderStatus } from "@clariveye-lite/domain";
import { normalizeOrder, normalizeOrderLine } from "@clariveye-lite/domain";
import { currentBusinessId } from "@/lib/auth";
import { supabase, supabaseConfigured, type DbOrder } from "@/lib/supabase";

const LEGACY_ORDERS = "clariveye-lite.orders.v1";
const LEGACY_PLAN = "clariveye-lite.plan";

export type Plan = "free" | "pro";

type StoreSnapshot = {
  businessId: string | null;
  orders: Order[];
  plan: Plan;
  version: number;
};

const listeners = new Set<() => void>();

let snapshot: StoreSnapshot = {
  businessId: null,
  orders: [],
  plan: "free",
  version: 0,
};

let cloudHydrated = false;

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

function migrateLegacyOrders(businessId: string) {
  if (localStorage.getItem(ordersKey(businessId))) return;
  const legacy = localStorage.getItem(LEGACY_ORDERS);
  if (!legacy) return;
  localStorage.setItem(ordersKey(businessId), legacy);
  const legacyPlan = localStorage.getItem(LEGACY_PLAN);
  if (legacyPlan) localStorage.setItem(planKey(businessId), legacyPlan);
}

function readOrdersFromStorage(businessId: string): Order[] {
  migrateLegacyOrders(businessId);
  try {
    const raw = JSON.parse(localStorage.getItem(ordersKey(businessId)) ?? "[]") as Order[];
    return raw.map(normalizeOrder);
  } catch {
    return [];
  }
}

function readPlanFromStorage(businessId: string): Plan {
  migrateLegacyOrders(businessId);
  return localStorage.getItem(planKey(businessId)) === "pro" ? "pro" : "free";
}

function orderToRow(order: Order, businessId: string) {
  return {
    id: order.id,
    business_id: businessId,
    doc_number: order.docNumber,
    doc_date: order.docDate ?? null,
    status: order.status,
    notes: order.notes,
    delivery_notes: order.deliveryNotes,
    lines: order.lines,
    created_at: order.createdAt,
    delivered_at: order.deliveredAt,
  };
}

function rowToOrder(row: DbOrder): Order {
  return normalizeOrder({
    id: row.id,
    docNumber: row.doc_number,
    docDate: row.doc_date,
    status: row.status as OrderStatus,
    notes: row.notes,
    deliveryNotes: row.delivery_notes,
    lines: (row.lines as OrderLine[]) ?? [],
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  });
}

function cacheLocal(businessId: string, orders: Order[], plan: Plan) {
  localStorage.setItem(ordersKey(businessId), JSON.stringify(orders));
  localStorage.setItem(planKey(businessId), plan);
}

function rebuildSnapshotFromMemory(orders: Order[], plan: Plan, businessId: string | null): StoreSnapshot {
  return {
    businessId,
    orders,
    plan,
    version: snapshot.version + 1,
  };
}

function rebuildSnapshot(): StoreSnapshot {
  const businessId = currentBusinessId();
  if (!businessId) {
    return {
      businessId: null,
      orders: [],
      plan: "free",
      version: snapshot.version + 1,
    };
  }
  return {
    businessId,
    orders: readOrdersFromStorage(businessId),
    plan: readPlanFromStorage(businessId),
    version: snapshot.version + 1,
  };
}

function notify() {
  if (!supabaseConfigured || !cloudHydrated) {
    snapshot = rebuildSnapshot();
  } else {
    snapshot = {
      ...snapshot,
      version: snapshot.version + 1,
      businessId: currentBusinessId(),
    };
  }
  listeners.forEach((l) => l());
}

function ensureSnapshot(): StoreSnapshot {
  const businessId = currentBusinessId();
  if (snapshot.businessId !== businessId && !(supabaseConfigured && cloudHydrated)) {
    snapshot = rebuildSnapshot();
  }
  return snapshot;
}

export function subscribeStore(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getStoreSnapshot(): StoreSnapshot {
  return ensureSnapshot();
}

export function getStoreVersion(): number {
  return ensureSnapshot().version;
}

export function invalidateStore() {
  cloudHydrated = false;
  snapshot = rebuildSnapshot();
  listeners.forEach((l) => l());
}

/** Carga pedidos/plan desde Supabase y sube residual local una vez. */
export async function hydrateCloudStore(): Promise<void> {
  if (!supabaseConfigured) {
    snapshot = rebuildSnapshot();
    notify();
    return;
  }
  const businessId = currentBusinessId();
  if (!businessId) {
    snapshot = rebuildSnapshot();
    cloudHydrated = false;
    notify();
    return;
  }

  const { data: orderRows, error: ordErr } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (ordErr) throw new Error(ordErr.message);

  let orders = ((orderRows as DbOrder[]) ?? []).map(rowToOrder);

  const { data: planRow } = await supabase
    .from("plans")
    .select("plan")
    .eq("business_id", businessId)
    .maybeSingle();
  let plan: Plan = planRow?.plan === "pro" ? "pro" : "free";

  // Migrar local → cloud si remoto vacío
  const localOrders = readOrdersFromStorage(businessId);
  const localPlan = readPlanFromStorage(businessId);
  if (orders.length === 0 && localOrders.length > 0) {
    const rows = localOrders.map((o) => orderToRow(o, businessId));
    const { error } = await supabase.from("orders").upsert(rows);
    if (!error) orders = localOrders;
  }
  if (!planRow && localPlan === "pro") {
    await supabase.from("plans").upsert({ business_id: businessId, plan: "pro" });
    plan = "pro";
  }

  cacheLocal(businessId, orders, plan);
  snapshot = rebuildSnapshotFromMemory(orders, plan, businessId);
  cloudHydrated = true;
  listeners.forEach((l) => l());
}

export function loadOrders(): Order[] {
  return ensureSnapshot().orders;
}

export function saveOrders(orders: Order[]) {
  const businessId = requireBusinessId();
  const normalized = orders.map(normalizeOrder);
  cacheLocal(businessId, normalized, loadPlan());
  snapshot = rebuildSnapshotFromMemory(normalized, snapshot.plan, businessId);
  notify();

  if (supabaseConfigured && cloudHydrated) {
    void (async () => {
      const rows = normalized.map((o) => orderToRow(o, businessId));
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("business_id", businessId);
      const keep = new Set(normalized.map((o) => o.id));
      const toDelete = ((existing as { id: string }[]) ?? [])
        .map((r) => r.id)
        .filter((oid) => !keep.has(oid));
      if (toDelete.length) {
        await supabase.from("orders").delete().in("id", toDelete);
      }
      await supabase.from("orders").upsert(rows);
    })();
  }
}

export function loadPlan(): Plan {
  return ensureSnapshot().plan;
}

export function savePlan(plan: Plan) {
  const businessId = requireBusinessId();
  cacheLocal(businessId, loadOrders(), plan);
  snapshot = rebuildSnapshotFromMemory(snapshot.orders, plan, businessId);
  notify();

  if (supabaseConfigured && cloudHydrated) {
    void supabase.from("plans").upsert({
      business_id: businessId,
      plan,
      updated_at: new Date().toISOString(),
    });
  }
}

export function newId() {
  return crypto.randomUUID();
}

export function createOrderFromLines(
  docNumber: string,
  lines: Array<Omit<OrderLine, "id" | "picked" | "pickedQty">>,
  docDate?: string | null,
): Order {
  return normalizeOrder({
    id: newId(),
    docNumber: docNumber || `DOC-${Date.now().toString().slice(-6)}`,
    docDate: docDate || null,
    status: "por_preparar",
    notes: null,
    lines: lines.map((line) => ({
      ...line,
      id: newId(),
      pickedQty: 0,
      picked: false,
    })),
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    deliveryNotes: null,
  });
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
  return loadOrders();
}

export function patchOrderLines(id: string, lines: OrderLine[]): Order[] {
  const next = loadOrders().map((order) =>
    order.id === id ? { ...order, lines: lines.map(normalizeOrderLine) } : order,
  );
  saveOrders(next);
  return loadOrders();
}

export function patchOrderNotes(id: string, notes: string | null): Order[] {
  const next = loadOrders().map((order) => (order.id === id ? { ...order, notes } : order));
  saveOrders(next);
  return loadOrders();
}

export function patchOrderDeliveryNotes(id: string, deliveryNotes: string | null): Order[] {
  const next = loadOrders().map((order) =>
    order.id === id ? { ...order, deliveryNotes } : order,
  );
  saveOrders(next);
  return loadOrders();
}

export function patchOrder(id: string, patch: Partial<Order>): Order[] {
  const next = loadOrders().map((order) =>
    order.id === id ? normalizeOrder({ ...order, ...patch }) : order,
  );
  saveOrders(next);
  return loadOrders();
}
