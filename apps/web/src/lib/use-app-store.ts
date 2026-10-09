import { useMemo, useSyncExternalStore } from "react";
import {
  getStoreSnapshot,
  getStoreVersion,
  subscribeStore,
  type Plan,
} from "@/lib/store";
import type { Order } from "@clariveye-lite/domain";

/** Pedidos reactivos: se actualizan al mutar el store (ClarivScan, picking, etc.). */
export function useOrders(): Order[] {
  const version = useSyncExternalStore(subscribeStore, getStoreVersion, getStoreVersion);
  return useMemo(() => getStoreSnapshot().orders, [version]);
}

export function usePlan(): Plan {
  const version = useSyncExternalStore(subscribeStore, getStoreVersion, getStoreVersion);
  return useMemo(() => getStoreSnapshot().plan, [version]);
}

export function useAppStore() {
  const version = useSyncExternalStore(subscribeStore, getStoreVersion, getStoreVersion);
  return useMemo(() => {
    const snap = getStoreSnapshot();
    return { orders: snap.orders, plan: snap.plan, version };
  }, [version]);
}
