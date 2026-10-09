/**
 * Contrato “nunca te dejo tirado”: QualityGate + candidatos asistidos.
 */

import type { DocumentLine, DocumentParseResult } from "./document-parser";

const JUNK_REF =
  /^(art|descrip|cantid|total|subtotal|iva|empresa|cliente|fecha|orden|compra|page|pagina|batch|tareas?)$/i;

export function isJunkReference(ref: string): boolean {
  const t = (ref || "").trim();
  if (!t || t.length < 2) return true;
  if (JUNK_REF.test(t)) return true;
  if (/^[A-ZÁÉÍÓÚÑ]{2,10}$/i.test(t) && !/\d/.test(t) && !/^Item/i.test(t)) return true;
  return false;
}

export function cleanLines(lines: DocumentLine[]): DocumentLine[] {
  return lines.filter((l) => !isJunkReference(l.reference));
}

/** Score de calidad del parse (más alto = mejor). */
export function scoreParseResult(doc: DocumentParseResult): number {
  const lines = cleanLines(doc.lines);
  if (!lines.length) return 0;
  let score = 0;
  for (const l of lines) {
    score += 2;
    if (l.name && l.name.trim().length >= 2) score += 1.5;
    if (l.quantity > 0) score += 0.5;
    if (l.quantity > 1) score += 0.3;
    if (l.unitPrice) score += 0.2;
    if (/^Item\d+$/i.test(l.reference) || /^\d{4,8}$/.test(l.reference) || /^SKU/i.test(l.reference)) {
      score += 0.5;
    }
  }
  if (doc.documentNumber) score += 1;
  if (doc.profile && doc.profile !== "generic") score += 0.5;
  return score;
}

/** % de líneas con nombre usable (≥2 chars). */
export function namedLineRatio(doc: DocumentParseResult): number {
  const lines = cleanLines(doc.lines);
  if (!lines.length) return 0;
  const named = lines.filter((l) => !!l.name && l.name.trim().length >= 2).length;
  return named / lines.length;
}

/**
 * Gate duro: refs limpias + ratio de nombres (evita “OK” con solo códigos pelados).
 * ≥2 líneas: score≥4 y (namedRatio≥0.5 o ≥2 nombres).
 * 1 línea: Item/SKU con nombre, o nombre≥3 + qty.
 */
export function passesQualityGate(doc: DocumentParseResult): boolean {
  const lines = cleanLines(doc.lines);
  const score = scoreParseResult({ ...doc, lines });
  const ratio = namedLineRatio({ ...doc, lines });
  const namedCount = lines.filter((l) => !!l.name && l.name.trim().length >= 2).length;

  if (lines.length >= 2) {
    return score >= 4 && (ratio >= 0.5 || namedCount >= 2);
  }
  if (lines.length === 1) {
    const l = lines[0];
    const solid =
      (!!l.name && l.name.trim().length >= 3 && l.quantity >= 1) ||
      (/^Item\d+$/i.test(l.reference) && !!l.name) ||
      (/^SKU\d+/i.test(l.reference) && !!l.name);
    return solid && score >= 3.5;
  }
  return false;
}

export type AssistedCandidate = {
  reference: string;
  kind: "ref" | "qty" | "money";
};

/** Extrae chips de candidatos del raw_text cuando el gate falla. */
export function extractAssistedCandidates(rawText: string): AssistedCandidate[] {
  const text = rawText || "";
  const out: AssistedCandidate[] = [];
  const seen = new Set<string>();

  const push = (reference: string, kind: AssistedCandidate["kind"]) => {
    const k = `${kind}:${reference}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ reference, kind });
  };

  for (const m of text.matchAll(/\b(Item\d+)\b/gi)) push(m[1], "ref");
  for (const m of text.matchAll(/\b(SKU\d+)\b/gi)) push(m[1], "ref");
  for (const m of text.matchAll(/\b(0\d{4,5}|\d{5,8})\b/g)) {
    if (!/^(19|20)\d{2}$/.test(m[1])) push(m[1], "ref");
  }
  for (const m of text.matchAll(/\b(\d{1,4})\s*\[\s*UN\s*\]/gi)) push(m[1], "qty");
  for (const m of text.matchAll(/\b(\d+[.,]\d{2})\s*€?/g)) {
    if (out.filter((c) => c.kind === "money").length < 8) push(m[1], "money");
  }

  return out.slice(0, 40);
}

export function withCleanLines(doc: DocumentParseResult): DocumentParseResult {
  return { ...doc, lines: cleanLines(doc.lines) };
}
