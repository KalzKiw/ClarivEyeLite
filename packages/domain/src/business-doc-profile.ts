/**
 * Perfil de documento entrenado por negocio.
 * El usuario señala regiones; el OCR/parser prioriza ese layout.
 */

import type { DocumentProfile } from "./document-profiles";
import type { ProfileBand } from "./document-profiles";

/** Rectángulo normalizado 0–1 (origen arriba-izquierda, como canvas). */
export type NormRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type DocRegionKey = "header" | "table" | "skuCol" | "descCol" | "numsCol" | "docNumber";

export type BusinessDocRegions = Partial<Record<DocRegionKey, NormRect>>;

export type BusinessDocProfile = {
  id: string;
  businessId: string;
  name: string;
  /** El usuario dijo que casi siempre es el mismo formato */
  alwaysSameFormat: boolean;
  regions: BusinessDocRegions;
  hints: {
    baseProfile?: DocumentProfile;
    /** Fragmento de texto de muestra (cabecera) para detectar */
    sampleHeader?: string;
    /** Patrón de refs visto (Item\d+|^\d{5,}$) */
    refStyle?: "item_xx" | "numeric_cod" | "sku_alpha" | "mixed";
  };
  successCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
};

export function clampRect(r: NormRect): NormRect {
  const x0 = Math.max(0, Math.min(1, Math.min(r.x0, r.x1)));
  const x1 = Math.max(0, Math.min(1, Math.max(r.x0, r.x1)));
  const y0 = Math.max(0, Math.min(1, Math.min(r.y0, r.y1)));
  const y1 = Math.max(0, Math.min(1, Math.max(r.y0, r.y1)));
  return { x0, y0, x1, y1 };
}

export function rectArea(r: NormRect): number {
  const c = clampRect(r);
  return Math.max(0, c.x1 - c.x0) * Math.max(0, c.y1 - c.y0);
}

/** Convierte regiones de negocio → ProfileBand para OCR por columnas. */
export function businessProfileToBands(profile: BusinessDocProfile): ProfileBand | null {
  const { skuCol, descCol, numsCol, table } = profile.regions;
  if (!skuCol || !descCol || !numsCol) return null;
  const y0 = table?.y0 ?? Math.min(skuCol.y0, descCol.y0, numsCol.y0);
  const y1 = table?.y1 ?? Math.max(skuCol.y1, descCol.y1, numsCol.y1);
  return {
    tableBands: [
      [y0, y1],
      [Math.max(0, y0 - 0.03), Math.min(1, y1 + 0.03)],
    ],
    columns: {
      sku: [skuCol.x0, skuCol.x1],
      desc: [descCol.x0, descCol.x1],
      nums: [numsCol.x0, numsCol.x1],
    },
  };
}

export function inferRefStyle(sampleRefs: string[]): BusinessDocProfile["hints"]["refStyle"] {
  if (!sampleRefs.length) return "mixed";
  if (sampleRefs.every((r) => /^Item\d+$/i.test(r))) return "item_xx";
  if (sampleRefs.every((r) => /^\d{2,8}$/.test(r))) return "numeric_cod";
  if (sampleRefs.every((r) => /^SKU/i.test(r))) return "sku_alpha";
  return "mixed";
}

export function profileCompleteness(p: BusinessDocProfile): number {
  const keys: DocRegionKey[] = ["skuCol", "descCol", "numsCol"];
  const hit = keys.filter((k) => p.regions[k] && rectArea(p.regions[k]!) > 0.002).length;
  return hit / keys.length;
}

export function isProfileReady(p: BusinessDocProfile): boolean {
  return profileCompleteness(p) >= 1 && p.alwaysSameFormat;
}
