/**
 * Auditoría de líneas parseadas: marca lo que “parece” producto pero huele mal
 * (fecha, teléfono, qty colada como SKU, sin nombre…).
 */

import type { DocumentLine } from "./document-parser";
import { isJunkContent, isJunkReference } from "./quality-gate";

export type LineWarningCode =
  | "missing_name"
  | "date_like_ref"
  | "phone_like_ref"
  | "qty_like_ref"
  | "low_confidence"
  | "junk_ref"
  | "empty_ref";

export type LineWarning = {
  code: LineWarningCode;
  message: string;
};

export type AuditedLine = DocumentLine & {
  warnings: LineWarning[];
  /** true si hay que mirarla antes de crear el pedido */
  suspicious: boolean;
};

const WARN_LABEL: Record<LineWarningCode, string> = {
  missing_name: "Sin nombre — ¿es un producto real?",
  date_like_ref: "La ref parece una fecha",
  phone_like_ref: "La ref parece un teléfono / nº largo",
  qty_like_ref: "La ref parece una cantidad, no un código",
  low_confidence: "Poca confianza del lector",
  junk_ref: "Referencia basura (cabecera/total…)",
  empty_ref: "Referencia vacía",
};

export function auditLine(line: DocumentLine): AuditedLine {
  const warnings: LineWarning[] = [];
  const ref = (line.reference || "").trim();

  const push = (code: LineWarningCode) => {
    if (warnings.some((w) => w.code === code)) return;
    warnings.push({ code, message: WARN_LABEL[code] });
  };

  if (!ref) push("empty_ref");
  else if (isJunkReference(ref) || isJunkContent(ref)) push("junk_ref");
  if (line.name && isJunkContent(line.name)) push("junk_ref");

  // Fechas ddmmyyyy / yyyymmdd
  if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(ref) || /^(19|20)\d{6}$/.test(ref)) {
    push("date_like_ref");
  }
  // Números largos pelados (teléfono / id) sin nombre — no EAN-13 ni SKU 0xxxxx
  if (
    /^\d{7,11}$/.test(ref) &&
    !(line.name && line.name.trim().length >= 2) &&
    !/^\d{13}$/.test(ref) &&
    !/^0\d{4,5}$/.test(ref)
  ) {
    push("phone_like_ref");
  }
  // Qty colada: 1–3 dígitos sin nombre
  if (/^\d{1,3}$/.test(ref) && !(line.name && line.name.trim().length >= 2)) {
    push("qty_like_ref");
  }
  if (!line.name || line.name.trim().length < 2) push("missing_name");
  if (line.confidence < 0.7) push("low_confidence");

  const suspicious =
    warnings.some((w) =>
      ["date_like_ref", "phone_like_ref", "qty_like_ref", "junk_ref", "empty_ref"].includes(w.code),
    ) ||
    (warnings.some((w) => w.code === "missing_name") && warnings.some((w) => w.code === "low_confidence"));

  return { ...line, warnings, suspicious };
}

export function auditLines(lines: DocumentLine[]): AuditedLine[] {
  return lines.map(auditLine);
}

/** ¿Hay algo que el usuario debería revisar? */
export function needsLineReview(lines: DocumentLine[]): boolean {
  return auditLines(lines).some((l) => l.suspicious || l.warnings.length > 0);
}
