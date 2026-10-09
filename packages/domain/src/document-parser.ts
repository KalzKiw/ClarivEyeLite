/**
 * Lector OCR todoterreno: OC / albarán / factura / pedido / OT.
 * Extrae nº documento + varias líneas (ref, nombre, cantidad).
 * Tolera OCR ruidoso (sin saltos, precios con coma, headers basura).
 */

import { extractDocumentDate } from "./ocr-normalize";

export type DocumentType =
  | "orden_compra"
  | "albaran"
  | "factura"
  | "pedido"
  | "ot"
  | "desconocido";

export type DocumentLine = {
  reference: string;
  name: string | null;
  quantity: number;
  packages: number;
  unitPrice: string | null;
  confidence: number;
};

export type DocumentParseResult = {
  documentNumber: string | null;
  /** Fecha del documento YYYY-MM-DD si se pudo leer */
  documentDate?: string | null;
  documentType: DocumentType;
  lines: DocumentLine[];
  raw_text: string;
  /** Perfil de layout detectado (si aplica) */
  profile?: string;
};

const STOP_SECTION =
  /\b(subtotal|total\b|iva\b|impuesto|envio|env[ií]o|otro|condiciones|instrucciones|si tiene alguna duda|gracias|footer)\b/i;

const HEADER_ROW =
  /\b(art[ií]culo|art\.?\s*#|descripci[oó]n|cantidad|canti\.?|p\/u|precio|importe|c[oó]digo|referencia|ref\.?|sku|barcode|ean|uds?\.?|bultos?)\b/i;

const NOISE_NAME =
  /^(empresa|vendedor|cliente|departamento|enviado|direcci[oó]n|tel[eé]fono|e-?mail|sitio|web|horario|f\.?o\.?b\.?|mrw|producto)$/i;

const DOC_NUMBER_PATTERNS: RegExp[] = [
  /n[uú]mero\s+de\s+orden\s*[:#]?\s*(OC\s*[\d\-]+)/i,
  /\b(OC\s*\d{3,})\b/i,
  /(?:albar[aá]n|alb\.?)\s*(?:n[ºo°.]?|num(?:ero)?\.?)?\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i,
  /(?:factura|fac\.?)\s*(?:n[ºo°.]?|num(?:ero)?\.?)?\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i,
  /(?:pedido|ped\.?)\s*(?:n[ºo°.]?|num(?:ero)?\.?)?\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i,
  /(?:orden\s+de\s+trabajo|o\.?t\.?)\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i,
  /(?:n[ºo°.]\s*(?:doc(?:umento)?|orden|pedido))\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i,
];

function normalizeOcr(raw: string): string {
  return (raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[|¦]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€+/g, "€")
    .replace(/(\d),(\d{2})\b/g, "$1.$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectType(text: string): DocumentType {
  if (/orden\s+de\s+compra|\bOC\s*\d/i.test(text)) return "orden_compra";
  if (/albar[aá]n/i.test(text)) return "albaran";
  if (/factura/i.test(text)) return "factura";
  if (/orden\s+de\s+trabajo|\bO\.?T\.?\b/i.test(text)) return "ot";
  if (/pedido/i.test(text)) return "pedido";
  return "desconocido";
}

function extractDocumentNumber(text: string): string | null {
  for (const re of DOC_NUMBER_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

function parseEuro(token: string): string | null {
  const m = token.match(/(\d+[.,]\d{2})/);
  return m ? m[1].replace(",", ".") : null;
}

function isNoiseRef(ref: string, docNumber: string | null): boolean {
  const r = ref.trim();
  if (!r) return true;
  if (r.length < 3 || r.length > 24) return true;
  if (/^(19|20)\d{2}$/.test(r)) return true;
  if (/^\d{1,2}$/.test(r)) return true;
  if (/^(21|10|4|0)$/.test(r)) return true;
  if (/^(iva|total|subtotal|envio|mrw)$/i.test(r)) return true;
  if (docNumber) {
    const digits = docNumber.replace(/\D/g, "");
    if (digits && r.replace(/\D/g, "") === digits) return true;
  }
  // Fechas / horas coladas
  if (/^\d{1,2}[\/.\-]\d{1,2}/.test(r)) return true;
  return false;
}

function cleanName(name: string): string | null {
  let n = name
    .replace(/\s+/g, " ")
    .replace(/\b\d+[.,]\d{2}\s*€?\b/g, "")
    .replace(/€/g, "")
    .trim();
  n = n.replace(/^[\-–:·.\s]+|[\-–:·.\s]+$/g, "").trim();
  if (n.length < 2) return null;
  if (NOISE_NAME.test(n)) return null;
  if (HEADER_ROW.test(n) && n.length < 40) return null;
  return n;
}

function pushLine(
  bag: Map<string, DocumentLine>,
  line: Omit<DocumentLine, "confidence"> & { confidence?: number },
  docNumber: string | null,
) {
  const reference = line.reference.trim();
  if (isNoiseRef(reference, docNumber)) return;
  const key = reference.toLowerCase();
  const next: DocumentLine = {
    reference,
    name: line.name ? cleanName(line.name) : null,
    quantity: Math.max(1, Math.min(99999, Math.round(line.quantity) || 1)),
    packages: Math.max(0, Math.round(line.packages) || 0),
    unitPrice: line.unitPrice,
    confidence: line.confidence ?? 0.5,
  };
  const prev = bag.get(key);
  if (!prev || next.confidence > prev.confidence) bag.set(key, next);
  else if (prev && !prev.name && next.name) bag.set(key, { ...prev, name: next.name });
}

/** Filas clásicas de tabla con precios */
function extractTableRows(text: string, docNumber: string | null, bag: Map<string, DocumentLine>) {
  const lineRe =
    /(?:^|\n)\s*([A-Z0-9][A-Z0-9\-_\/]{2,23})\s+([^\n]{2,80}?)\s+(\d{1,5})\s+(\d+[.,]\d{2})\s*€?(?:\s+(\d+[.,]\d{2})\s*€?)?/gim;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(text))) {
    const ref = m[1];
    const name = m[2];
    if (HEADER_ROW.test(ref) || HEADER_ROW.test(name)) continue;
    if (STOP_SECTION.test(name)) continue;
    pushLine(
      bag,
      {
        reference: ref,
        name,
        quantity: Number(m[3]),
        packages: 0,
        unitPrice: parseEuro(m[4]),
        confidence: 0.92,
      },
      docNumber,
    );
  }
}

/** "Producto X", "Artículo 12", SKU alfanumérico + nombre corto */
function extractProductoPattern(text: string, docNumber: string | null, bag: Map<string, DocumentLine>) {
  const re =
    /\b([A-Z0-9][A-Z0-9\-_\/]{2,23})\s+((?:Producto|Art[ií]culo|Art\.?|Item|Ref\.?)\s+[A-Z0-9][\w\-]*)\s+(\d{1,5})(?:\s+(\d+[.,]\d{2})\s*€?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    pushLine(
      bag,
      {
        reference: m[1],
        name: m[2],
        quantity: Number(m[3]),
        packages: 0,
        unitPrice: m[4] ? parseEuro(m[4]) : null,
        confidence: 0.88,
      },
      docNumber,
    );
  }
}

/** Tras cabecera de tabla, leer líneas hasta totales */
function extractAfterHeader(text: string, docNumber: string | null, bag: Map<string, DocumentLine>) {
  const lines = text.split("\n");
  let inTable = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (HEADER_ROW.test(line) && /(art|ref|c[oó]d|desc|cant)/i.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (STOP_SECTION.test(line)) break;

    // Con precios: REF · nombre · qty · P/U · [TOTAL]
    const priced = line.match(
      /^([A-Z0-9][A-Z0-9\-_\/]{2,23})\s+(.+?)\s+(\d{1,5})\s+(\d+[.,]\d{2})(?:\s+(\d+[.,]\d{2}))?\s*€?$/i,
    );
    if (priced) {
      pushLine(
        bag,
        {
          reference: priced[1],
          name: priced[2],
          quantity: Number(priced[3]),
          packages: 0,
          unitPrice: parseEuro(priced[4]),
          confidence: 0.9,
        },
        docNumber,
      );
      continue;
    }

    // Sin precios: REF · nombre · qty · [bultos]
    const plain = line.match(
      /^([A-Z0-9][A-Z0-9\-_\/]{2,23})\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ .\-]{1,60}?)\s+(\d{1,5})(?:\s+(\d{1,5}))?\s*$/i,
    );
    if (plain && !HEADER_ROW.test(plain[2])) {
      pushLine(
        bag,
        {
          reference: plain[1],
          name: plain[2],
          quantity: Number(plain[3]),
          packages: plain[4] ? Number(plain[4]) : 0,
          unitPrice: null,
          confidence: 0.86,
        },
        docNumber,
      );
    }
  }
}

/** Fallback: refs numéricas 4–8 dígitos cerca de "Producto"/nombre + qty */
function extractCollapsed(text: string, docNumber: string | null, bag: Map<string, DocumentLine>) {
  if (bag.size >= 2) return;
  const flat = text.replace(/\n/g, " ");
  const re =
    /\b(\d{4,8})\s+([A-Za-zÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .\-]{1,40}?)\s+(\d{1,4})\s+(\d+[.,]\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat))) {
    if (STOP_SECTION.test(m[2]) || HEADER_ROW.test(m[2])) continue;
    pushLine(
      bag,
      {
        reference: m[1],
        name: m[2],
        quantity: Number(m[3]),
        packages: 0,
        unitPrice: parseEuro(m[4]),
        confidence: 0.7,
      },
      docNumber,
    );
  }
}

/** Último recurso: secuencia ref + Producto X sin qty clara */
function extractLooseSkuName(text: string, docNumber: string | null, bag: Map<string, DocumentLine>) {
  if (bag.size >= 1) return;
  const re = /\b(\d{4,10}|[A-Z]{2,}\-?\d{2,})\s+(Producto\s+[A-Z0-9]+|Art[ií]culo\s+[\w\-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    pushLine(
      bag,
      {
        reference: m[1],
        name: m[2],
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.55,
      },
      docNumber,
    );
  }
}

/** Fracciones bulto tipo 2/5 o box 1 of 3 → packages */
function applyBultoHints(text: string, lines: DocumentLine[]): DocumentLine[] {
  const bulto = text.match(/\bbox\s*(\d{1,3})\s*(?:\/|of|de)\s*(\d{1,3})\b/i);
  if (!bulto || lines.length !== 1) return lines;
  return lines.map((line) => ({
    ...line,
    packages: Math.max(line.packages, Number(bulto[2]) || 0),
  }));
}

export function parseDocumentOCR(rawText: string): DocumentParseResult {
  const raw_text = normalizeOcr(rawText);
  const documentType = detectType(raw_text);
  const documentNumber = extractDocumentNumber(raw_text);
  const bag = new Map<string, DocumentLine>();

  extractTableRows(raw_text, documentNumber, bag);
  extractProductoPattern(raw_text, documentNumber, bag);
  extractAfterHeader(raw_text, documentNumber, bag);
  extractCollapsed(raw_text, documentNumber, bag);
  extractLooseSkuName(raw_text, documentNumber, bag);

  let lines = [...bag.values()].sort((a, b) => b.confidence - a.confidence);
  lines = lines.sort((a, b) => {
    const ia = raw_text.toLowerCase().indexOf(a.reference.toLowerCase());
    const ib = raw_text.toLowerCase().indexOf(b.reference.toLowerCase());
    return (ia < 0 ? 99999 : ia) - (ib < 0 ? 99999 : ib);
  });
  lines = applyBultoHints(raw_text, lines);
  const documentDate = extractDocumentDate(raw_text);

  return { documentNumber, documentDate, documentType, lines, raw_text };
}

/** Compat: primera línea → API antigua de etiqueta */
export function firstLineAsUnified(doc: DocumentParseResult) {
  const line = doc.lines[0];
  return {
    product_ref: line?.reference ?? null,
    product_name: line?.name ?? null,
    product_price: line?.unitPrice ?? null,
    bulto_n: line?.packages ? 1 : null,
    bulto_d: line?.packages || null,
    bulto_raw: null as string | null,
    raw_text: doc.raw_text,
    candidates: doc.lines.map((l) => l.reference).slice(0, 8),
  };
}
