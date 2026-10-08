import { type DocumentLine, type DocumentParseResult, type DocumentType } from "./document-parser";
import { parseAnyDocument } from "./document-profiles";

/** Textos de OCR por regiones (cabecera + columnas de tabla). */
export type ColumnOcrBundle = {
  headerText: string;
  skuText: string;
  descText: string;
  numsText: string;
  fullText?: string;
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
  if (/ART|DESCRIP|CANTID|TOTAL|SUBTOTAL|IVA|EMPRESA|CLIENTE|VENDEDOR|FECHA|ORDEN|COMPRA|LL\b/.test(t) && !/\d{4,}/.test(t)) {
    return true;
  }
  // Solo letras cortas (cabecera rota): ARTICU, CULO, EE
  if (/^[A-ZÁÉÍÓÚÑ]{2,8}$/.test(t) && !/\d/.test(t)) return true;
  return false;
}

/** Refs: 78958 / MESA-01 — ignora cabeceras OCR rotas (ARTIC, LL…) */
export function extractSkuLines(skuText: string): string[] {
  const out: string[] = [];
  for (const line of linesOf(skuText)) {
    if (isHeaderish(line)) continue;
    const digits = line.match(/\b(\d{4,14})\b/g) || [];
    for (const d of digits) {
      if (!isJunkSku(d)) out.push(d);
    }
    if (digits.length) continue;
    const cleaned = line.replace(/[^\w\-\/]/g, "").toUpperCase();
    if (isJunkSku(cleaned)) continue;
    if (/^[A-Z]{2,}[A-Z0-9\-\/]*\d[A-Z0-9\-\/]*$/.test(cleaned) || /^[A-Z]{2,}-\d+/.test(cleaned)) {
      out.push(cleaned);
    }
  }
  return [...new Set(out)];
}

/** Expande fragmentos OCR tipo PX → Producto X */
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
    // Permitir PX/PT cortos ya expandidos, o nombres con 3+ letras
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(cleaned)) continue;
    if (isHeaderish(cleaned)) continue;
    raw.push(cleaned);
  }
  const products = raw.filter((l) => /producto\s*\w+|art[ií]culo\s+\w+/i.test(l));
  return products.length >= 1 ? products : raw;
}

/** Busca "Producto X" / nombres cerca de cada ref en texto completo */
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

/** De columnas numéricas ruidosas: "2] 10,00", "11 200.00", "5 50,00€" */
export function extractQtyPriceLines(numsText: string): QtyPrice[] {
  const out: QtyPrice[] = [];
  for (const line of linesOf(numsText)) {
    if (isHeaderish(line) && !/\d/.test(line)) continue;
    const prices = [...line.matchAll(/(\d+[.,]\d{2})/g)].map((m) => m[1].replace(",", "."));
    // qty al inicio: 2] 10,00  |  5 50.00  |  1 200,00
    const qtyPrice = line.match(/(?:^|[^\d])(\d{1,4})\s*[\]|lI]?\s+(\d+[.,]\d{2})/);
    if (qtyPrice) {
      let qty = Number(qtyPrice[1]);
      // OCR "11 200" suele ser qty 1 + precio 200
      if (qty >= 10 && prices[0] && Number(prices[0]) >= 100 && String(qty).startsWith("1")) {
        qty = 1;
      }
      // OCR "3 350,00" / "3 50" — si precio empieza raro, intentar corregir 350→50 con qty 5 no fiable; dejar qty
      out.push({ quantity: Math.max(1, qty), unitPrice: qtyPrice[2].replace(",", ".") });
      continue;
    }
    if (prices.length) {
      out.push({ quantity: 1, unitPrice: prices[0] });
    }
  }
  return out;
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

/** Si la columna numérica falla, busca qty/precio cerca de cada ref en el texto plano */
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

/**
 * Une OCR por columnas en líneas de pedido.
 * Prioridad: columnas > parser de texto completo.
 */
export function parseColumnBundle(bundle: ColumnOcrBundle): DocumentParseResult {
  const joined = [bundle.headerText, bundle.skuText, bundle.descText, bundle.numsText, bundle.fullText]
    .filter(Boolean)
    .join("\n");

  const skus = extractSkuLines(bundle.skuText);
  const descs = extractDescLines(bundle.descText);
  const nearNames = namesNearRefs(skus, joined);
  const nums = extractQtyPriceLines(bundle.numsText);

  let lines: DocumentLine[] = [];
  const count = skus.length || descs.length;

  for (let i = 0; i < count; i++) {
    const reference = skus[i] || `PROD-${i + 1}`;
    // Preferir columna descripción (ya expandida); fullText solo si falta
    const name = descs[i] || nearNames[i] || null;
    const qp = nums[i];
    lines.push({
      reference,
      name,
      quantity: qp?.quantity ?? 1,
      // Sin bultos en el doc → 0 (no inventar 1)
      packages: 0,
      unitPrice: qp?.unitPrice ?? null,
      confidence: skus[i] && name ? 0.9 : skus[i] ? 0.75 : 0.5,
    });
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

  // Fallback: perfiles + parser genérico
  return parseAnyDocument(bundle.fullText || joined);
}
