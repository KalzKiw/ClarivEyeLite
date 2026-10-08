import type { BusinessDocProfile } from "@clariveye-lite/domain";
import { currentBusinessId } from "@/lib/auth";

function key(businessId: string) {
  return `clariveye-lite.doc-profiles.${businessId}.v1`;
}

export function loadDocProfiles(): BusinessDocProfile[] {
  const businessId = currentBusinessId();
  if (!businessId) return [];
  try {
    return JSON.parse(localStorage.getItem(key(businessId)) ?? "[]") as BusinessDocProfile[];
  } catch {
    return [];
  }
}

export function saveDocProfiles(profiles: BusinessDocProfile[]) {
  const businessId = currentBusinessId();
  if (!businessId) throw new Error("Sin sesión de negocio");
  localStorage.setItem(key(businessId), JSON.stringify(profiles));
}

export function getActiveDocProfile(): BusinessDocProfile | null {
  const list = loadDocProfiles();
  // Preferido: alwaysSame + completo; si no, el más usado con éxito
  const ready = list.filter((p) => p.alwaysSameFormat && p.regions.skuCol && p.regions.descCol && p.regions.numsCol);
  if (ready.length) {
    return ready.sort((a, b) => b.successCount - a.successCount)[0] ?? null;
  }
  return list.sort((a, b) => b.successCount - a.successCount)[0] ?? null;
}

export function upsertDocProfile(profile: BusinessDocProfile) {
  const list = loadDocProfiles().filter((p) => p.id !== profile.id);
  list.unshift(profile);
  saveDocProfiles(list);
}

export function deleteDocProfile(id: string) {
  saveDocProfiles(loadDocProfiles().filter((p) => p.id !== id));
}

export function recordProfileOutcome(id: string, ok: boolean) {
  const list = loadDocProfiles();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  if (ok) p.successCount += 1;
  else p.failCount += 1;
  p.updatedAt = new Date().toISOString();
  saveDocProfiles(list);
}
