/** Preferencia de modo de escaneo (pistola vs automático). */

export type ScanMode = "pistola" | "automatico";

const KEY = "clarivpack.scanMode";

export function getScanMode(): ScanMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "pistola" || v === "automatico") return v;
  } catch {
    /* private mode */
  }
  return "automatico";
}

export function setScanMode(mode: ScanMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}
