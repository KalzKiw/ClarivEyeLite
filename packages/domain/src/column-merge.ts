import { type DocumentLine, type DocumentParseResult, type DocumentType } from "./document-parser";
import { parseAnyDocument } from "./document-profiles";

/** Una fila de tabla (co-ocurrencia SKU + desc + nums). */
export type ColumnTableRow = {
  sku: string;
  desc: string;
  nums: string;
};

/** Textos de OCR por regiones (cabecera + columnas de tabla). */
export type ColumnOcrBundle = {
  headerText: string;
  skuText: string;
  descText: string;
  numsText: string;
  fullText?: string;
  /** Filas afines (layout PDF o OCR alineado). Prioridad sobre blobs. */
  rows?: ColumnTableRow[];
};

function linesOf(text: string): string[] {
  return (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function isHeaderish(line: string): boolean {
  return /art[ií]culo|descripci|cantidad|total|p\/?u|c[oó]digo|ref\.?|sku|ulo\b|cantid/i.test(line);
}

function isJunkSku(token: string): boolean {
  const t = token.toUpperCase();
  if (!t) return true;
  if (
    /ART|DESCRIP|CANTID|TOTAL|SUBTOTAL|IVA|EMPRESA|CLIENTE|VENDEDOR|FECHA|ORDEN|COMPRA|LL\b/.test(t) &&
    !/\d{4,}/.test(t)
  ) {
    return true;
  }
  if (/^[A-ZÁÉÍÓÚÑ]{2,8}$/.test(t) && !/\d/.test(t)) return true;
  return false;
}

/** Refs: 78958 / MESA-01 / 77 (Tosma) — ignora cabeceras OCR rotas */
export function extractSkuLines(skuText: string): string[] {
  const out: string[] = [];
  for (const line of linesOf(skuText)) {
    if (isHeaderish(line)) continue;
    if (/albar[aá]n|n[ºo°.]?\s*alb|fecha|cliente|empresa/i.test(line)) continue;
    const digits = line.match(/\b(\d{4,14})\b/g) || [];
    for (const d of digits) {
      if (!isJunkSku(d)) out.push(d);
    }
    if (digits.length) continue;
    // Código corto tipo Tosma: "77" o "77 Membrana…" al inicio de celda
    const short = line.trim().match(/^(\d{2,6})(?:\s|$)/);
    if (short) {
      out.push(short[1]);
      continue;
    }
    const cleaned = line.replace(/[^\w\-\/]/g, "").toUpperCase();
    if (isJunkSku(cleaned)) continue;
    if (/^[A-Z]{2,}[A-Z0-9\-\/]*\d[A-Z0-9\-\/]*$/.test(cleaned) || /^[A-Z]{2,}-\d+/.test(cleaned)) {
      out.push(cleaned);
    }
    const item = cleaned.match(/^(ITEM\d+)$/i);
    if (item) out.push(item[1].replace(/^ITEM/i, "Item"));
  }
  return [...new Set(out)];
}

function expandShortName(name: string): string {
  const t = name.trim();
  const m = t.match(/^P([A-Z0-9])$/i);
  if (m) return `Producto ${m[1].toUpperCase()}`;
  const m2 = t.match(/^Prod(?:ucto)?\.?\s*([A-Z0-9]+)$/i);
  if (m2) return `Producto ${m2[1]}`;
  return t;
}

export function extractDescLines(descText: string): string[] {
  const raw: string[] = [];
  for (const line of linesOf(descText)) {
    if (isHeaderish(line)) continue;
    if (/^[\d.,€\s|_\-]+$/.test(line)) continue;
    const cleaned = expandShortName(line.replace(/^[#|]+/, "").trim());
    if (cleaned.length < 2) continue;
    if (/^[Ee\s]+$/.test(cleaned)) continue;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(cleaned)) continue;
    if (isHeaderish(cleaned)) continue;
    raw.push(cleaned);
  }
  const products = raw.filter((l) => /producto\s*\w+|art[ií]culo\s+\w+/i.test(l));
  return products.length >= 1 ? products : raw;
}

export function namesNearRefs(skus: string[], fullText: string): Array<string | null> {
  const flat = fullText.replace(/\s+/g, " ");
  const globalProducts = [...flat.matchAll(/\bProducto\s+([A-Z0-9][\w\-]*)/gi)].map(
    (m) => `Producto ${m[1]}`,
  );
  return skus.map((sku, i) => {
    const re = new RegExp(
      `${sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+([A-Za-zÁÉÍÓÚÑ][\\wÁÉÍÓÚÑáéíóúñ .\\-]{1,40}?)(?=\\s+\\d|$)`,
      "i",
    );
    const m = flat.match(re);
    if (m?.[1] && !isHeaderish(m[1])) return expandShortName(m[1].trim());
    if (globalProducts[i]) return globalProducts[i];
    return null;
  });
}

export type QtyPrice = { quantity: number; unitPrice: string | null };

export function extractQtyPriceLines(numsText: string): QtyPrice[] {
  const out: QtyPrice[] = [];
  for (const line of linesOf(numsText)) {
    if (isHeaderish(line) && !/\d/.test(line)) continue;
    const prices = [...line.matchAll(/(\d+[.,]\d{2})/g)].map((m) => m[1].replace(",", "."));
    const qtyPrice = line.match(/(?:^|[^\d])(\d{1,4})\s*[\]|lI]?\s+(\d+[.,]\d{2})/);
    if (qtyPrice) {
      let qty = Number(qtyPrice[1]);
      if (qty >= 10 && prices[0] && Number(prices[0]) >= 100 && String(qty).startsWith("1")) {
        qty = 1;
      }
      out.push({ quantity: Math.max(1, qty), unitPrice: qtyPrice[2].replace(",", ".") });
      continue;
    }
    // "1 [UN]" / "6 [UN]"
    const un = line.match(/\b(\d{1,4})\s*\[\s*UN\s*\]/i);
    if (un) {
      out.push({ quantity: Math.max(1, Number(un[1])), unitPrice: null });
      continue;
    }
    if (prices.length) {
      out.push({ quantity: 1, unitPrice: prices[0] });
    }
  }
  return out;
}

/**
 * Alinea una lista secundaria a N slots (anclados a SKUs).
 * Si hay de más, recorta; si hay de menos, rellena undefined.
 */
export function alignToSlots<T>(slots: number, items: T[]): Array<T | undefined> {
  if (slots <= 0) return [];
  if (items.length === slots) return [...items];
  if (items.length > slots) return items.slice(0, slots);
  const out: Array<T | undefined> = [...items];
  while (out.length < slots) out.push(undefined);
  return out;
}

/**
 * Construye filas desde tres blobs OCR (línea a línea, sin cabeceras).
 * Ancla al número de líneas SKU cuando hay refs.
 */
export function buildColumnRowsFromTexts(
  skuText: string,
  descText: string,
  numsText: string,
): ColumnTableRow[] {
  const skuLines = linesOf(skuText).filter((l) => !isHeaderish(l) && !isJunkSku(l.replace(/\s/g, "")));
  const descLines = linesOf(descText).filter((l) => {
    if (isHeaderish(l)) return false;
    if (/^[\d.,€\s|_\-]+$/.test(l)) return false;
    return /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(l);
  });
  const numLines = linesOf(numsText).filter((l) => !isHeaderish(l) || /\d/.test(l));

  const count = skuLines.length > 0 ? skuLines.length : Math.max(descLines.length, numLines.length);
  if (!count) return [];

  const descSlots = alignToSlots(count, descLines);
  const numSlots = alignToSlots(count, numLines);

  return Array.from({ length: count }, (_, i) => ({
    sku: skuLines[i] || "",
    desc: descSlots[i] || "",
    nums: numSlots[i] || "",
  }));
}

function detectType(text: string): DocumentType {
  if (/orden\s+de\s+compra|\bOC\s*\d/i.test(text)) return "orden_compra";
  if (/albar[aá]n/i.test(text)) return "albaran";
  if (/factura/i.test(text)) return "factura";
  if (/orden\s+de\s+trabajo|\bO\.?T\.?\b/i.test(text)) return "ot";
  if (/pedido/i.test(text)) return "pedido";
  return "desconocido";
}

function extractDocNumber(text: string): string | null {
  const m =
    text.match(/n[uú]mero\s+de\s+orden\s*[:#]?\s*(OC\s*[\d\-]+)/i) ||
    text.match(/\b(OC\s*\d{3,})\b/i) ||
    text.match(/(?:albar[aá]n|alb\.?)\s*(?:n[ºo°.]?)?\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i) ||
    text.match(/(?:factura|pedido)\s*(?:n[ºo°.]?)?\s*[:#]?\s*([A-Z0-9][\w\-\/]{2,})/i);
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function enrichFromFullText(lines: DocumentLine[], fullText: string): DocumentLine[] {
  if (!fullText) return lines;
  const flat = fullText.replace(/\s+/g, " ");
  return lines.map((line) => {
    if (line.quantity > 1 && line.unitPrice) return line;
    const re = new RegExp(
      `${line.reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]{0,48}?(\\d{1,4})\\s+(\\d+[.,]\\d{2})`,
      "i",
    );
    const m = flat.match(re);
    if (!m) return line;
    let qty = Number(m[1]);
    const price = m[2].replace(",", ".");
    if (qty >= 10 && Number(price) >= 100 && String(qty).startsWith("1")) qty = 1;
    return {
      ...line,
      quantity: line.quantity > 1 ? line.quantity : Math.max(1, qty),
      unitPrice: line.unitPrice ?? price,
      confidence: Math.max(line.confidence, 0.8),
    };
  });
}

function lineFromRow(row: ColumnTableRow, index: number, fullText: string): DocumentLine | null {
  const cell = `${row.sku} ${row.desc} ${row.nums}`;
  if (/n[ºo°.]?\s*albar|albar[aá]n\s*:|fecha\s*:|cliente\s*:/i.test(cell) && !/\b\d{4,}\b/.test(cell)) {
    return null;
  }
  // SKU puede venir pegado al nombre en la misma celda tras mal corte X
  const skus = extractSkuLines(`${row.sku}\n${row.desc}`);
  const descs = extractDescLines(row.desc || row.sku);
  const nums = extractQtyPriceLines(row.nums || row.desc);
  if (!skus.length && !descs.length) return null;

  const reference = skus[0] || `PROD-${index + 1}`;
  if (/^N?ALBAR|^FECHA|^CLIENTE|^ORDEN/i.test(reference)) return null;

  let name = descs[0] || null;
  if (!name && skus[0]) {
    name = namesNearRefs([skus[0]], fullText || cell)[0];
  }
  // Nombre en misma celda que el código: "000113 Válvula…"
  if (!name && row.sku) {
    const m = row.sku.match(/^\d{2,6}\s+([A-Za-zÁÉÍÓÚÑ].+)$/);
    if (m?.[1] && !isHeaderish(m[1])) name = m[1].trim();
  }
  const qp = nums[0];
  return {
    reference,
    name,
    quantity: qp?.quantity ?? 1,
    packages: 0,
    unitPrice: qp?.unitPrice ?? null,
    confidence: skus[0] && name ? 0.92 : skus[0] ? 0.8 : 0.55,
  };
}

function linesFromRows(rows: ColumnTableRow[], fullText: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  for (let i = 0; i < rows.length; i++) {
    const line = lineFromRow(rows[i], i, fullText);
    if (line) out.push(line);
  }
  return out;
}

/**
 * Une OCR/layout por columnas en líneas de pedido.
 * Prioridad: rows afines > blobs alineados > parseAnyDocument.
 */
export function parseColumnBundle(bundle: ColumnOcrBundle): DocumentParseResult {
  const joined = [bundle.headerText, bundle.skuText, bundle.descText, bundle.numsText, bundle.fullText]
    .filter(Boolean)
    .join("\n");

  let lines: DocumentLine[] = [];

  if (bundle.rows && bundle.rows.length > 0) {
    lines = linesFromRows(bundle.rows, bundle.fullText || joined);
  }

  if (!lines.length) {
    const skus = extractSkuLines(bundle.skuText);
    const descs = extractDescLines(bundle.descText);
    const nearNames = namesNearRefs(skus, joined);
    const nums = extractQtyPriceLines(bundle.numsText);

    const count = skus.length > 0 ? skus.length : descs.length;
    const descSlots = alignToSlots(count, descs);
    const numSlots = alignToSlots(count, nums);

    for (let i = 0; i < count; i++) {
      const reference = skus[i] || `PROD-${i + 1}`;
      const name =
        (descs.length === skus.length ? descs[i] : undefined) ||
        descSlots[i] ||
        nearNames[i] ||
        (skus.length === 0 ? descs[i] : null) ||
        null;
      const qp = nums.length === count ? nums[i] : numSlots[i];
      lines.push({
        reference,
        name,
        quantity: qp?.quantity ?? 1,
        packages: 0,
        unitPrice: qp?.unitPrice ?? null,
        confidence: skus[i] && name ? 0.9 : skus[i] ? 0.75 : 0.5,
      });
    }
  }

  lines = enrichFromFullText(lines, bundle.fullText || joined);

  if (lines.length > 0) {
    return {
      documentNumber: extractDocNumber(joined),
      documentType: detectType(joined),
      lines,
      raw_text: joined,
    };
  }

  return parseAnyDocument(bundle.fullText || joined);
}
