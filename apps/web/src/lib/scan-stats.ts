import { currentBusinessId } from "@/lib/auth";

export type ScanStatEvent = {
  at: string;
  source: string;
  score: number;
  ok: boolean;
  assisted: boolean;
  lineCount?: number;
  namedLineCount?: number;
  /** 0–1: líneas con nombre usable */
  namedLineRate?: number;
};

type ScanStats = {
  ok: number;
  fail: number;
  assisted: number;
  /** Media móvil simple de namedLineRate en éxitos */
  avgNamedLineRate: number;
  recent: ScanStatEvent[];
};

function key(businessId: string) {
  return `clariveye-lite.scan-stats.${businessId}.v1`;
}

export function loadScanStats(): ScanStats {
  const businessId = currentBusinessId();
  if (!businessId) return { ok: 0, fail: 0, assisted: 0, avgNamedLineRate: 0, recent: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(key(businessId)) ?? "null") ?? {};
    return {
      ok: raw.ok ?? 0,
      fail: raw.fail ?? 0,
      assisted: raw.assisted ?? 0,
      avgNamedLineRate: raw.avgNamedLineRate ?? 0,
      recent: raw.recent ?? [],
    };
  } catch {
    return { ok: 0, fail: 0, assisted: 0, avgNamedLineRate: 0, recent: [] };
  }
}

export function recordScanStat(event: Omit<ScanStatEvent, "at">) {
  const businessId = currentBusinessId();
  if (!businessId) return;
  const stats = loadScanStats();
  if (event.assisted) stats.assisted += 1;
  else if (event.ok) stats.ok += 1;
  else stats.fail += 1;
  if (event.ok && typeof event.namedLineRate === "number") {
    const n = stats.ok;
    stats.avgNamedLineRate =
      n <= 1 ? event.namedLineRate : (stats.avgNamedLineRate * (n - 1) + event.namedLineRate) / n;
  }
  stats.recent = [{ ...event, at: new Date().toISOString() }, ...stats.recent].slice(0, 30);
  localStorage.setItem(key(businessId), JSON.stringify(stats));
}
