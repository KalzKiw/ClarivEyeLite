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
      [0.28, 0.88], // hoja de picking (tabla desde ~30%)
      [0.48, 0.78],
      [0.45, 0.82],
    ],
    // Artículo ItemXX centrado; albarán DL usa bandas parecidas
    columns: { sku: [0.28, 0.42], desc: [0.42, 0.72], nums: [0.72, 0.95] },
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
  if (
    /hoja\s*de\s*picking|easy\s*wms|orden\s+de\s+salida|cant\.?\s*enviada|pack\s*:|\bItem\d+\b.*\[\s*UN\s*\]|\bOUT\d+\/\d+/i.test(
      t,
    )
  ) {
    return "easywms";
  }
  if (/picking\s*list|order\s*id|\bsku\b[\s\S]{0,40}\bqty\b/i.test(t)) return "picking_list";
  if (/\bSKU\d{5,}/i.test(t) || (/fashion\s*shop/i.test(t) && /albar[aá]n/i.test(t))) return "fashion_sku";
  if (
    /\bcod\.?\b|b\.\s*imponible|firma\s*aceptaci[oó]n|cloud\s*gestion|total\s*albar[aá]n|tosma|fontaner/i.test(
      t,
    )
  ) {
    return "tosma_cod";
  }
  // OCR sucio: bloque de códigos tipo 000113 / 77 / 00120 sin cabecera legible
  {
    const artCodes = [...t.matchAll(/(?:^|\n)\s*(0\d{4,5}|\d{2,3})\s*$/gm)].map((x) => x[1]);
    const uniq = [...new Set(artCodes)].filter((c) => !isNoiseArticleCode(c));
    if (uniq.length >= 3 && /\d+[.,]\d{2}/.test(t)) return "tosma_cod";
  }
  if (/orden\s+de\s+compra|\bOC\s*\d|art[ií]culo\s*#/i.test(t)) return "oc_tabla";
  if (/base\s*ud|concepto/i.test(t) && /albar[aá]n/i.test(t)) return "fashion_sku";
  if (/albar[aá]n/i.test(t)) return "tosma_cod";
  return "generic";
}

function detectType(text: string): DocumentType {
  if (/orden\s+de\s+compra|\bOC\s*\d/i.test(text)) return "orden_compra";
  if (/hoja\s*de\s*picking|picking\s*list|tareas\s*:\s*\d+/i.test(text)) return "pedido";
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
      /orden\s*:\s*(OUT[\d\/]+)/i,
      /\b(OUT\d+\/\d+)\b/i,
      /\b(DL_[A-Z0-9]+)\b/i,
      /orden\s+de\s+salida\s*:\s*([A-Z0-9_\-\/]+)/i,
      /batch\s*:?\s*(Batch\d+)/i,
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

/** easyWMS albarán DL + hoja de picking (ItemXX) */
function extractEasyWms(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];
  let m: RegExpExecArray | null;

  // Hoja de picking: Item12 Chocolate cookies 1 [UN]
  const pickRe =
    /\b(Item\d+)\s+([A-Za-z][^\n\[\]]{2,70}?)\s+(\d{1,5})\s*(?:\[\s*UN\s*\]|UN\b)/gi;
  while ((m = pickRe.exec(text))) {
    const name = m[2].replace(/\s+/g, " ").trim();
    if (/ubicaci[oó]n|art[ií]culo|descripci[oó]n|rpt_/i.test(name)) continue;
    out.push(line(m[1], name, Number(m[3]), null, 0.94));
  }
  if (out.length >= 2) return dedupe(out);

  // Fallback OCR: ItemXX en una línea, qty [UN] cerca
  const items = [...text.matchAll(/\b(Item\d+)\b/gi)].map((x) => x[1]);
  const uniqItems = [...new Set(items.map((i) => i.replace(/^item/i, "Item")))];
  if (uniqItems.length >= 2) {
    const names = [
      ...text.matchAll(
        /\bItem\d+\s+([A-Za-z][A-Za-z0-9 ,.\-%]{2,50}?)(?:\s+\d+\s*\[|\s+\d+\s*$)/gim,
      ),
    ].map((x) => x[1].trim());
    const qtys = [...text.matchAll(/(\d{1,4})\s*\[\s*UN\s*\]/gi)].map((x) => Number(x[1]));
    for (let i = 0; i < uniqItems.length; i++) {
      out.push(line(uniqItems[i], names[i] ?? null, qtys[i] ?? 1, null, names[i] ? 0.88 : 0.75));
    }
    if (out.length >= 2) return dedupe(out);
  }

  // Albarán clásico: 086872 CALZADO DEPORTIVO 6 …
  const re =
    /(?:^|\n)\s*(?:\d+\s+)?(\d{5,8})\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 \/\-]{2,40}?)\s+(\d{1,5})(?:\s+\d+[.,]\d+\s*kg)?/gim;
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

function isNoiseArticleCode(code: string): boolean {
  const c = code.trim();
  if (!c) return true;
  if (/^(19|20)\d{2}$/.test(c)) return true;
  if (c.length >= 8) return true; // NIF / tel
  if (/^(37|45|1129|45001|28011|28042)$/.test(c)) return true;
  if (/^121245/.test(c)) return true;
  return false;
}

function normalizeMoney(raw: string): string {
  let s = raw.replace(/[€\s]/g, "").replace(",", ".");
  // 6.303.€ / 2.101.00 → quitar miles con punto
  if (/^\d{1,3}(\.\d{3})+(\.\d{2})?$/.test(s)) {
    const parts = s.split(".");
    if (parts[parts.length - 1].length === 2) {
      const dec = parts.pop();
      s = `${parts.join("")}.${dec}`;
    } else {
      s = parts.join("");
    }
  }
  return s;
}

/** Códigos de artículo en bloque (OCR Tosma: 000113 / 77 / 00120…) */
function extractTosmaArticleCodes(text: string): string[] {
  const codes: string[] = [];
  const push = (c: string) => {
    if (isNoiseArticleCode(c)) return;
    if (!codes.includes(c)) codes.push(c);
  };

  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (/^\d{2,6}$/.test(line)) {
      push(line);
      continue;
    }
    // "000113 2 50 … 48.83 976.60"
    const head = line.match(/^(\d{2,6})\b/);
    if (head && /\d+[.,]\d{2}/.test(line)) push(head[1]);
  }

  // Fallback: secuencia típica de albarán fontanería
  if (codes.length < 2) {
    for (const m of text.matchAll(/\b(0\d{4,5}|\d{2,3})\b/g)) {
      push(m[1]);
    }
  }
  return codes.slice(0, 40);
}

type NumRow = { quantity: number; unitPrice: string | null };

/** De una línea con código: qty + P/U (usa importe/precio si qty OCR está rota) */
function parseTosmaCodeLine(raw: string): NumRow | null {
  const line = raw.trim();
  if (!/^\d{2,6}\b/.test(line)) return null;
  const money = [...line.matchAll(/(\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d+[.,]\d{2})/g)].map((x) =>
    normalizeMoney(x[1]),
  );
  if (money.length < 2) {
    // "00120" solo código
    return null;
  }
  const unitPrice = money[money.length - 2];
  const total = Number(money[money.length - 1]);
  const price = Number(unitPrice);
  if (!(price > 0) || !(total > 0)) return { quantity: 1, unitPrice };

  // qty: "97 3.00 …", "000107 21.00 …", OCR "1200"=12.00 / "2000"=20.00
  const afterCode = line.replace(/^\d{2,6}\s+/, "");
  const beforeMoney = afterCode.split(/\d+[.,]\d{2}/)[0] ?? "";
  const ocrHundred = beforeMoney.match(/\b(\d{1,3})00\b/);
  let qty = NaN;
  if (ocrHundred) {
    qty = Number(ocrHundred[1]);
  } else {
    const qtyMatch = afterCode.match(/^(\d+(?:[.,]\d{2})?)\s/);
    qty = qtyMatch ? Number(qtyMatch[1].replace(",", ".")) : NaN;
    if (qty >= 100 && qty % 100 === 0 && qty <= 9900) qty = qty / 100;
  }

  const fromMoney = Math.round(total / price);
  if (!Number.isFinite(qty) || qty < 0.5 || qty > 9999) qty = fromMoney;
  // Importe puede llevar dto (12×25=300 → 285): no pisar qty OCR razonable
  if (fromMoney >= 1 && fromMoney <= 9999 && !ocrHundred) {
    const ratio = Math.abs(qty - fromMoney) / fromMoney;
    if (ratio > 0.35 || !Number.isInteger(qty)) qty = fromMoney;
  }
  return { quantity: Math.max(1, Math.round(qty)), unitPrice };
}

/** Filas numéricas por código (o lista ordenada si OCR no alinea) */
function extractTosmaNumericByCode(text: string): {
  byCode: Map<string, NumRow>;
  ordered: NumRow[];
} {
  const byCode = new Map<string, NumRow>();
  for (const raw of text.split(/\n/)) {
    const head = raw.trim().match(/^(\d{2,6})\b/);
    if (!head || isNoiseArticleCode(head[1])) continue;
    const row = parseTosmaCodeLine(raw);
    if (row) byCode.set(head[1], row);
  }
  if (byCode.size >= 2) return { byCode, ordered: [...byCode.values()] };

  const ordered: NumRow[] = [];
  const loose =
    /(\d{1,4})(?:\s+00)?\s+(\d+[.,]\d{2})\s+(?:\d+\s+)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{1,2}|\d+[.,]\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = loose.exec(text.replace(/\n/g, " ")))) {
    let qty = Number(m[1]);
    if (qty >= 100 && qty % 100 === 0 && qty <= 9900) qty = qty / 100;
    if (qty < 1 || qty > 500) continue;
    const unitPrice = normalizeMoney(m[2]);
    const total = Number(normalizeMoney(m[3]));
    const price = Number(unitPrice);
    if (price > 0 && total > 0) {
      const fromMoney = Math.round(total / price);
      if (fromMoney >= 1 && Math.abs(qty - fromMoney) / fromMoney > 0.25) qty = fromMoney;
    }
    ordered.push({ quantity: Math.max(1, Math.round(qty)), unitPrice });
  }
  return { byCode, ordered };
}

/** Tosma limpio + OCR destrozado */
function extractTosma(text: string): DocumentLine[] {
  const out: DocumentLine[] = [];

  // 1) Filas bien formadas con nombre
  const re =
    /(?:^|\n)\s*(\d{2,6})\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n]{3,70}?)\s+(\d+(?:[.,]\d{2})?)\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[2].replace(/\s+\d+[.,]\d{2}.*$/, "").trim();
    if (/peso\s*total|b\.\s*imponible|total\s*albar|forma\s*de\s*pago|cliente|madrid/i.test(name)) {
      continue;
    }
    if (isNoiseArticleCode(m[1])) continue;
    const qty = Number(m[3].replace(",", "."));
    out.push(
      line(m[1], name, qty >= 100 && qty % 100 === 0 ? qty / 100 : qty, normalizeMoney(m[4]), 0.92),
    );
  }
  if (out.length >= 2) return dedupe(out);

  // 2) OCR roto: zip códigos + filas numéricas
  const codes = extractTosmaArticleCodes(text);
  const { byCode, ordered } = extractTosmaNumericByCode(text);
  const nameHints = ["Válvula", "Membrana", "Racor", "Aro cera", "Caldera"];
  for (let i = 0; i < codes.length; i++) {
    const n = byCode.get(codes[i]) ?? ordered[i];
    out.push(
      line(
        codes[i],
        nameHints[i] ?? null,
        n?.quantity ?? 1,
        n?.unitPrice ?? null,
        n ? 0.78 : 0.65,
      ),
    );
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
