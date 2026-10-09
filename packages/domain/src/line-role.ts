/**
 * Clasificador estructural de líneas: deny-by-default.
 * Una línea solo entra al pedido si parece producto por FORMA, no por blacklist de un albarán.
 */

import type { DocumentLine } from "./document-parser";

export type LineRole = "product" | "phone" | "address" | "prose" | "meta" | "unknown";

export type TextClassification = {
  role: LineRole;
  /** Confianza del rol detectado 0–1 */
  score: number;
  reasons: string[];
};

/** Compacta OCR (sin espacios/acentos) para densidad de dígitos, etc. */
export function compactOcr(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

const DOC_META_PREFIX = /^(ALB|PED|OC|OT|FAC|INV|NIF|CIF|IVA|OUT|DL|BATCH|PACK|REF)$/i;

/** Forma de SKU de artículo (no nº de documento). */
export function looksLikeArticleSku(token: string): boolean {
  const t = (token || "").trim();
  if (!t || t.length > 20) return false;
  if (/^Item\d+$/i.test(t) || /^SKU\d+/i.test(t)) return true;
  if (/^0\d{4,5}$/.test(t) || /^\d{4,8}$/.test(t)) return true;
  // Códigos cortos tipo Tosma (77) solo si son 2–3 dígitos
  if (/^\d{2,3}$/.test(t)) return true;
  const m = t.match(/^([A-Za-zÁÉÍÓÚÑ]{2,5})-(\d{3,6})$/i);
  if (m && !DOC_META_PREFIX.test(m[1])) return true;
  // Alfanumérico compacto con dígitos, sin ser frase (MESA-01, ABC123)
  if (/^[A-Z]{2,}[A-Z0-9\-\/]*\d[A-Z0-9\-\/]*$/i.test(t) && t.length <= 16 && !/\s/.test(t)) {
    if (DOC_META_PREFIX.test(t.split(/[-\/]/)[0] ?? "")) return false;
    return true;
  }
  return false;
}

function digitDensity(compact: string): number {
  if (!compact.length) return 0;
  const digits = (compact.match(/\d/g) || []).length;
  return digits / compact.length;
}

function wordCount(raw: string): number {
  return raw.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Localidad / país: "Ciudad, País" sin dígitos ni razón social (S.A./S.L.).
 * Estructural — no lista de ciudades.
 */
function looksLikePlaceName(raw: string): boolean {
  const t = raw.trim();
  if (!t || /\d/.test(t)) return false;
  if (/\bS\.?\s*[AL]\.?\s*$/i.test(t)) return false;
  const words = wordCount(t);
  if (words < 1 || words > 4) return false;
  // "Sevilla, España" / "Viladecans, Catalunya"
  if (/,/.test(t) && /^[A-ZÁÉÍÓÚÑ]/.test(t)) return true;
  return false;
}

/**
 * Clasifica un fragmento de texto por forma estructural.
 * No usa listas de ciudades ni frases de un proveedor concreto.
 */
export function classifyText(text: string | null | undefined): TextClassification {
  const raw = (text || "").trim();
  const reasons: string[] = [];
  if (!raw) return { role: "unknown", score: 0, reasons: ["empty"] };

  const compact = compactOcr(raw);
  const density = digitDensity(compact);
  const words = wordCount(raw);

  // --- meta: nº documento, fecha, NIF, página ---
  if (/^(ALB|PED|FAC|INV)-\d/i.test(raw) || /\bOC\s*\d{3,}/i.test(raw)) {
    reasons.push("doc_number");
    return { role: "meta", score: 0.9, reasons };
  }
  if (/^[A-Z]-?\d{7,8}[A-Z]?$/i.test(compact) && compact.length <= 12) {
    reasons.push("tax_id_shape");
    return { role: "meta", score: 0.85, reasons };
  }
  if (
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(raw) ||
    /\b(19|20)\d{2}-\d{2}-\d{2}\b/.test(raw) ||
    /\b\d{1,2}\s+de\s+[a-záéíóú]+/i.test(raw)
  ) {
    reasons.push("date_shape");
    return { role: "meta", score: 0.8, reasons };
  }
  if (/^p[aá]gina\s*\d+/i.test(raw) || /^page\s*\d+/i.test(raw)) {
    reasons.push("page_marker");
    return { role: "meta", score: 0.95, reasons };
  }
  if (/^(art|descrip|cantid|total|subtotal|iva|empresa|cliente|fecha|orden|compra|batch|tareas?)$/i.test(raw)) {
    reasons.push("header_label");
    return { role: "meta", score: 0.9, reasons };
  }

  // --- product SKU shape (early win) ---
  if (looksLikeArticleSku(raw)) {
    reasons.push("sku_shape");
    return { role: "product", score: 0.92, reasons };
  }

  // --- phone: corrida de 9–15 dígitos (puro o mezclado con letras) ---
  const onlyDigits = compact.replace(/\D/g, "");
  if (
    !looksLikeArticleSku(raw) &&
    onlyDigits.length >= 9 &&
    onlyDigits.length <= 15 &&
    (density >= 0.55 ||
      /^\+\d{8,15}$/.test(raw.replace(/\s/g, "")) ||
      (density >= 0.35 && /[A-Z]{2,}/.test(compact) && onlyDigits.length >= 9))
  ) {
    reasons.push("phone_digit_run");
    return { role: "phone", score: 0.9, reasons };
  }

  // --- address: tipología de vía O CP(5) + token capitalizado ---
  // C/ no usa \b tras la barra (barra y espacio son ambos non-word)
  if (
    /^(?:C\/\s*|CL\s+|CALLE\b|AV\.?\s*|AVENIDA\b|PLAZA\b|PASEO\b|CRTA\.?\s*|CARRETERA\b|CAMINO\b|URB\.?\s*)/i.test(
      raw,
    )
  ) {
    reasons.push("street_type");
    return { role: "address", score: 0.9, reasons };
  }
  // ##### + palabra con mayúscula (localidad), sin qty de línea de producto
  if (/\b\d{5}\b/.test(raw) && /\b\d{5}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ]{2,}/.test(raw) && words <= 6) {
    reasons.push("postal_plus_place");
    return { role: "address", score: 0.88, reasons };
  }
  // Compact: 5 dígitos seguidos de letras (41001Ciudad) sin forma SKU
  if (/^\d{5}[A-Z]{3,}$/i.test(compact) && !looksLikeArticleSku(raw)) {
    reasons.push("postal_place_compact");
    return { role: "address", score: 0.85, reasons };
  }
  // Solo localidad (“Sevilla, España”) — forma Ciudad, Región/País
  if (looksLikePlaceName(raw)) {
    reasons.push("place_name_shape");
    return { role: "address", score: 0.86, reasons };
  }

  // --- prose: muchas palabras O blob largo sin espacios ---
  if (words >= 8) {
    reasons.push("many_words");
    return { role: "prose", score: 0.85, reasons };
  }
  if (!/\s/.test(raw) && compact.length >= 22 && !looksLikeArticleSku(raw)) {
    reasons.push("mashed_ocr_blob");
    return { role: "prose", score: 0.9, reasons };
  }
  // Nombre de producto típico: pocas palabras con espacios (no rol negativo)
  if (words >= 2 && words <= 7 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(raw) && density < 0.4) {
    reasons.push("short_phrase");
    return { role: "unknown", score: 0.4, reasons };
  }

  reasons.push("unclassified");
  return { role: "unknown", score: 0.3, reasons };
}

const PRODUCT_THRESHOLD = 0.65;

/**
 * Score 0–1 de “parece línea de pedido”.
 * Deny-by-default: sin SKU sólido cae bajo el umbral.
 */
export function productScore(line: DocumentLine): number {
  const ref = (line.reference || "").trim();
  const name = (line.name || "").trim();
  const refClass = classifyText(ref);
  const nameClass = name ? classifyText(name) : null;

  // CP (exactamente 5 dígitos) + localidad → dirección partida en columnas, no SKU
  if (/^\d{5}$/.test(ref) && (looksLikePlaceName(name) || nameClass?.role === "address")) {
    return 0.1;
  }

  // Roles negativos en ref → fuera
  if (refClass.role === "phone" || refClass.role === "address" || refClass.role === "prose" || refClass.role === "meta") {
    return Math.min(0.2, 1 - refClass.score);
  }
  // Nombre claramente no producto
  if (nameClass && (nameClass.role === "phone" || nameClass.role === "address" || nameClass.role === "prose" || nameClass.role === "meta")) {
    return Math.min(0.25, 1 - nameClass.score);
  }

  let score = 0;
  if (looksLikeArticleSku(ref)) score += 0.55;
  else if (refClass.role === "product") score += 0.5;
  else if (ref.length >= 2 && ref.length <= 20 && /\d/.test(ref) && !/\s/.test(ref)) score += 0.25;
  else return 0.15; // sin forma de ref → deny

  if (name && nameClass?.role !== "prose" && nameClass?.role !== "address" && nameClass?.role !== "phone") {
    if (wordCount(name) >= 1 && wordCount(name) <= 7) score += 0.2;
    else if (wordCount(name) > 7) score -= 0.25;
  }
  if (line.quantity >= 1) score += 0.1;
  if (line.quantity > 1) score += 0.05;
  if (line.unitPrice) score += 0.05;
  if (line.packages > 0) score += 0.05;

  return Math.max(0, Math.min(1, score));
}

export function isProductLine(line: DocumentLine): boolean {
  return productScore(line) >= PRODUCT_THRESHOLD;
}

export function filterProductLines(lines: DocumentLine[]): DocumentLine[] {
  return lines.filter(isProductLine);
}

/** Texto que no debería ser ref ni nombre de producto (roles negativos). */
export function isNonProductText(text: string | null | undefined): boolean {
  const c = classifyText(text);
  return c.role === "phone" || c.role === "address" || c.role === "prose" || c.role === "meta";
}
