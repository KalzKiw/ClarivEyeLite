/**
 * Perfiles de documento para OCR multi-albarán.
 * Detecta layout y extrae líneas con reglas específicas.
 */

import {
  parseDocumentOCR,
  type DocumentLine,
  type DocumentParseResult,
  type DocumentType,
} from "./document-parser";

export type DocumentProfile =
  | "easywms"
  | "picking_list"
  | "fashion_sku"
  | "tosma_cod"
  | "oc_tabla"
  | "generic";

export type ProfileBand = {
  /** Bandas verticales [y0,y1] relativas 0–1 para filas de artículos */
  tableBands: Array<[number, number]>;
  /** Columnas relativas [x0,x1] sku / desc / nums */
  columns: { sku: [number, number]; desc: [number, number]; nums: [number, number] };
};

export const PROFILE_BANDS: Record<DocumentProfile, ProfileBand> = {
  easywms: {
    tableBands: [
      [0.48, 0.78],
      [0.45, 0.82],
    ],
    columns: { sku: [0.12, 0.28], desc: [0.28, 0.55], nums: [0.55, 0.72] },
  },
  picking_list: {
    tableBands: [
      [0.12, 0.95],
      [0.1, 0.98],
    ],
    columns: { sku: [0.55, 0.72], desc: [0.4, 0.55], nums: [0.72, 0.9] },
  },
  fashion_sku: {
    tableBands: [
      [0.32, 0.72],
      [0.3, 0.78],
    ],
    columns: { sku: [0.05, 0.55], desc: [0.05, 0.55], nums: [0.55, 0.7] },
  },
  tosma_cod: {
    tableBands: [
      [0.38, 0.72],
      [0.35, 0.78],
    ],
    columns: { sku: [0.02, 0.12], desc: [0.12, 0.55], nums: [0.55, 0.7] },
  },
  oc_tabla: {
    tableBands: [
      [0.45, 0.58],
      [0.43, 0.62],
      [0.4, 0.65],
    ],
    columns: { sku: [0.01, 0.15], desc: [0.12, 0.5], nums: [0.48, 0.99] },
  },
  generic: {
    tableBands: [
      [0.4, 0.7],
      [0.35, 0.75],
    ],
    columns: { sku: [0.02, 0.18], desc: [0.15, 0.55], nums: [0.5, 0.95] },
  },
};

function line(reference: string, name: string | null, quantity: number, unitPrice: string | null = null, confidence = 0.9): DocumentLine {
  return {
    reference,
    name,
    quantity: Math.max(1, Math.round(quantity) || 1),
    packages: 0,
    unitPrice,
    confidence,
  };
}

export function detectProfile(text: string): DocumentProfile {
  const t = text || "";
  if (/easy\s*wms|orden\s+de\s+salida|cant\.?\s*enviada|pack\s*:/i.test(t)) return "easywms";
  if (/picking\s*list|order\s*id|\bsku\b[\s\S]{0,40}\bqty\b/i.test(t)) return "picking_list";
  if (/\bSKU\d{5,}/i.test(t) || (/fashion\s*shop/i.test(t) && /albar[aá]n/i.test(t))) return "fashion_sku";
  if (
    /\bcod\.?\b|b\.\s*imponible|firma\s*aceptaci[oó]n|cloud\s*gestion|total\s*albar[aá]n/i.test(t)
  ) {
    return "tosma_cod";
  }
  if (/orden\s+de\s+compra|\bOC\s*\d|art[ií]culo\s*#/i.test(t)) return "oc_tabla";
  if (/base\s*ud|concepto/i.test(t) && /albar[aá]n/i.test(t)) return "fashion_sku";
  if (/albar[aá]n/i.test(t)) return "tosma_cod";
  return "generic";
}

function detectType(text: string): DocumentType {
  if (/orden\s+de\s+compra|\bOC\s*\d/i.test(text)) return "orden_compra";
  if (/picking\s*list/i.test(text)) return "pedido";
  if (/albar[aá]n|orden\s+de\s+salida/i.test(text)) return "albaran";
  if (/factura/i.test(text)) return "factura";
  if (/orden\s+de\s+trabajo|\bO\.?T\.?\b/i.test(text)) return "ot";
  if (/pedido|order\s*id/i.test(text)) return "pedido";
  return "desconocido";
}

export function extractDocumentNumberForProfile(text: string, profile: DocumentProfile): string | null {
  const patterns: RegExp[] = [];
  if (profile === "easywms") {
    patterns.push(
      /\b(DL_[A-Z0-9]+)\b/i,
      /orden\s+de\s+salida\s*:\s*([A-Z0-9_\-]+)/i,
      /pack\s*:\s*(\d+)/i,
    );
  }
  if (profile === "picking_list") {
    patterns.push(/order\s*id\s*[#:]?\s*([A-Z0-9_\-#]+)/i);
  }
  if (profile === "fashion_sku") {
    patterns.push(/\b(AL-\d{4}-\d+)\b/i, /albar[aá]n\s*[:#]?\s*([A-Z0-9\-\/]+)/i);
  }
  if (profile === "tosma_cod") {
    patterns.push(/n[ºo°.]?\s*albar[aá]n\s*[:#]?\s*([A-Z0-9\s\/\-]+)/i, /\b(A\s*\/\s*\d+)\b/i);
  }
  if (profile === "oc_tabla") {
    patterns.push(/n[uú]mero\s+de\s+orden\s*[:#]?\s*(OC\s*[\d\-]+)/i, /\b(OC\s*\d{3,})\b/i);
  }
  patterns.push(
    /n[uú]mero\s+de\s+orden\s*[:#]?\s*(OC\s*[\d\-]+)/i,
    /\b(OC\s*\d{3,})\b/i,
    /(?:albar[aá]n|alb\.?)\s*(?:n[ºo°.]?)?\s*[:#]?\s*([A-Z0-9][\w\-\/\s]{1,})/i,
    /orden\s+de\s+salida\s*[:#]?\s*([A-Z0-9_\-]+)/i,
    /order\s*id\s*[#:]?\s*([A-Z0-9_\-#]+)/i,
    /\b(AL-\d{4}-\d+)\b/i,
    /\b(A\s*\/\s*\d+)\b/i,
  );
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

/** easyWMS: 086872 CALZADO DEPORTIVO 6 … */
function extractEasyWms(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  const re =
    /(?:^|\n)\s*(?:\d+\s+)?(\d{5,8})\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 \/\-]{2,40}?)\s+(\d{1,5})(?:\s+\d+[.,]\d+\s*kg)?/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(line(m[1], m[2].trim(), Number(m[3]), null, 0.92));
  }
  return dedupe(out);
}

/** Picking list: SKU + QTY (10031 … 1) */
function extractPickingList(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  const re = /(?:^|\n)\s*(?:Product\s*name\s*)?(\d{4,8})\s+(\d{1,4})\s*(?=\n|$)/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(line(m[1], null, Number(m[2]), null, 0.88));
  }
  // Alternativa: fila "Product name  10031  1"
  const re2 = /Product\s*name\s+(\d{4,8})\s+(\d{1,4})/gi;
  while ((m = re2.exec(text))) {
    out.push(line(m[1], "Product name", Number(m[2]), null, 0.9));
  }
  return dedupe(out);
}

/** fashion: SKU000002 - Pantalón Génova … 20  15,00€ */
function extractFashionSku(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  const re =
    /\b(SKU\d{5,})\s*[-–]\s*([^\n]+?)\s+(\d{1,5})\s+(\d+[.,]\d{2})\s*€?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // nombre puede traer descripción extra en la misma captura; cortar en salto lógico
    let name = m[2].trim();
    name = name.replace(/\s+\d+[.,]\d{2}.*$/, "").trim();
    out.push(line(m[1].toUpperCase(), name, Number(m[3]), m[4].replace(",", "."), 0.93));
  }
  return dedupe(out);
}

/** Orden de compra / tabla clásica + OCR ruidoso (78958 Producto X 2 10,00) */
function extractOcTabla(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  const priced =
    /\b(\d{4,8})\s+((?:Producto|Art[ií]culo)\s+[A-Z0-9]+|[A-Za-zÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ .\-]{1,40}?)\s+(\d{1,4})\s+(\d+[.,]\d{2})/gi;
  let m: RegExpExecArray | null;
  while ((m = priced.exec(text))) {
    if (/subtotal|total|iva|orden|fecha/i.test(m[2])) continue;
    out.push(line(m[1], m[2].trim(), Number(m[3]), m[4].replace(",", "."), 0.94));
  }
  if (out.length >= 2) return dedupe(out);

  // OCR por columnas rotas: refs 5 dígitos + Producto X/T/H o PX/PT/PH
  const refs = [
    ...text.matchAll(/\b(\d{5,8})\b/g),
  ]
    .map((x) => x[1])
    .filter((r) => !/^(19|20)\d{2}$/.test(r) && !/^0000/.test(r));
  const uniqRefs: string[] = [];
  for (const r of refs) {
    if (!uniqRefs.includes(r) && !/OC|00005/i.test(r)) uniqRefs.push(r);
  }
  // Quitar nº de orden tipo 00005 si hay OC cerca
  const cleanRefs = uniqRefs.filter((r) => r !== "00005" && r !== "10200");

  let names = [...text.matchAll(/\bProducto\s+([A-Z0-9]+)\b/gi)].map((x) => `Producto ${x[1]}`);
  if (names.length < cleanRefs.length) {
    const shorts = [...text.matchAll(/\bP([XTHA-Z0-9])\b/g)].map((x) => `Producto ${x[1]}`);
    if (shorts.length >= cleanRefs.length) names = shorts;
  }

  const qtys: number[] = [];
  const qtyPrice = [...text.matchAll(/(?:^|\n|[^\d])(\d{1,3})\s*[\]|]?\s+(\d+[.,]\d{2})/g)];
  for (const q of qtyPrice) {
    let qty = Number(q[1]);
    const price = Number(q[2].replace(",", "."));
    if (qty >= 10 && price >= 100 && String(qty).startsWith("1")) qty = 1;
    if (qty >= 1 && qty <= 999) qtys.push(qty);
  }

  const n = Math.min(cleanRefs.length, Math.max(names.length, cleanRefs.length));
  for (let i = 0; i < Math.min(cleanRefs.length, n || cleanRefs.length); i++) {
    if (i >= 12) break;
    out.push(
      line(cleanRefs[i], names[i] ?? null, qtys[i] ?? 1, null, names[i] ? 0.86 : 0.7),
    );
  }
  return dedupe(out);
}

/** Tosma: 000113 Válvula… 20.00 48,83 */
function extractTosma(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  const re =
    /(?:^|\n)\s*(\d{2,6})\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n]{3,70}?)\s+(\d+(?:[.,]\d{2})?)\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[2].replace(/\s+\d+[.,]\d{2}.*$/, "").trim();
    if (/peso\s*total|b\.\s*imponible|total\s*albar|forma\s*de\s*pago/i.test(name)) continue;
    const qty = Number(m[3].replace(",", "."));
    out.push(line(m[1], name, qty, m[4].replace(/\./g, "").replace(",", "."), 0.9));
  }
  // Códigos cortos 77, 97
  const short =
    /(?:^|\n)\s*(\d{2,3})\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n]{5,60}?)\s+(\d+(?:[.,]\d{2})?)\s+(\d+[.,]\d{2})/gim;
  while ((m = short.exec(text))) {
    if (out.some((l) => l.reference === m![1])) continue;
    const name = m[2].trim();
    if (/imponible|iva|total|firma|p[aá]gina/i.test(name)) continue;
    out.push(line(m[1], name, Number(m[3].replace(",", ".")), m[4].replace(",", "."), 0.85));
  }
  return dedupe(out);
}

function dedupe(lines: DocumentLine[]): DocumentLine[] {
  const bag = new Map<string, DocumentLine>();
  for (const l of lines) {
    const key = l.reference.toLowerCase();
    const prev = bag.get(key);
    if (!prev || l.confidence > prev.confidence) bag.set(key, l);
  }
  return [...bag.values()];
}

export function extractByProfile(text: string, profile: DocumentProfile): DocumentLine[] {
  switch (profile) {
    case "easywms":
      return extractEasyWms(text);
    case "picking_list":
      return extractPickingList(text);
    case "fashion_sku":
      return extractFashionSku(text);
    case "tosma_cod":
      return extractTosma(text);
    case "oc_tabla":
      return extractOcTabla(text);
    case "generic":
      return extractOcTabla(text);
    default:
      return [];
  }
}

function scoreLines(lines: DocumentLine[]): number {
  return lines.reduce(
    (sum, l) => sum + l.confidence + (l.name ? 0.3 : 0) + (l.quantity > 1 ? 0.1 : 0),
    lines.length,
  );
}

export type ProfileParseResult = DocumentParseResult & { profile: DocumentProfile };

/** Parsea con perfil; si el perfil no saca líneas, el caller puede caer a generic. */
export function parseWithProfile(rawText: string): ProfileParseResult {
  const raw_text = (rawText || "").replace(/\r\n/g, "\n").trim();
  const profile = detectProfile(raw_text);
  const documentType = detectType(raw_text);
  const documentNumber = extractDocumentNumberForProfile(raw_text, profile);
  const lines = extractByProfile(raw_text, profile);
  return { profile, documentNumber, documentType, lines, raw_text };
}

/**
 * Entrada principal: elige el mejor entre perfil y parser genérico.
 */
export function parseAnyDocument(rawText: string): ProfileParseResult {
  const profiled = parseWithProfile(rawText);
  const generic = parseDocumentOCR(rawText);
  const bestLines =
    scoreLines(profiled.lines) >= scoreLines(generic.lines) ? profiled.lines : generic.lines;
  return {
    profile: profiled.profile,
    documentNumber: profiled.documentNumber || generic.documentNumber,
    documentType: profiled.documentType !== "desconocido" ? profiled.documentType : generic.documentType,
    lines: bestLines,
    raw_text: profiled.raw_text || generic.raw_text,
  };
}
