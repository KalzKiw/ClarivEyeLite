import { currentBusinessId } from "@/lib/auth";

export type ScanStatEvent = {
  at: string;
  source: string;
  score: number;
  ok: boolean;
  assisted: boolean;
};

type ScanStats = {
  ok: number;
  fail: number;
  assisted: number;
  recent: ScanStatEvent[];
};

function key(businessId: string) {
  return `clariveye-lite.scan-stats.${businessId}.v1`;
}

export function loadScanStats(): ScanStats {
  const businessId = currentBusinessId();
  if (!businessId) return { ok: 0, fail: 0, assisted: 0, recent: [] };
  try {
    return JSON.parse(localStorage.getItem(key(businessId)) ?? "null") ?? {
      ok: 0,
      fail: 0,
      assisted: 0,
      recent: [],
    };
  } catch {
    return { ok: 0, fail: 0, assisted: 0, recent: [] };
  }
}

export function recordScanStat(event: Omit<ScanStatEvent, "at">) {
  const businessId = currentBusinessId();
  if (!businessId) return;
  const stats = loadScanStats();
  if (event.assisted) stats.assisted += 1;
  else if (event.ok) stats.ok += 1;
  else stats.fail += 1;
  stats.recent = [{ ...event, at: new Date().toISOString() }, ...stats.recent].slice(0, 30);
  localStorage.setItem(key(businessId), JSON.stringify(stats));
}
