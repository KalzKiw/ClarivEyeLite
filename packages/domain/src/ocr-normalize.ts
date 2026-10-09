/**
 * Normalización OCR adaptable + extracción de fecha de documento.
 * Forma, no reglas por un albarán concreto.
 */

const MONTHS: Record<string, number> = {
  enero: 1,
  february: 2,
  febrero: 2,
  marzo: 3,
  march: 3,
  abril: 4,
  april: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  june: 6,
  julio: 7,
  july: 7,
  agosto: 8,
  august: 8,
  septiembre: 9,
  september: 9,
  setiembre: 9,
  octubre: 10,
  october: 10,
  noviembre: 11,
  november: 11,
  diciembre: 12,
  december: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Normaliza un token que parece código de artículo tras OCR:
 * O/o→0, I/l→1 en contexto dígito; quita espacios internos.
 * Ej: "SKUO 00009" → "SKU000009"
 */
export function normalizeOcrCode(raw: string): string {
  let t = (raw || "").trim().toUpperCase();
  if (!t) return t;
  t = t.replace(/\s+/g, "");
  t = t.replace(/^SKUO+/, "SKU0");
  t = t.replace(/^1TEM/i, "ITEM");
  // O entre letra y dígito / entre dígitos
  t = t.replace(/([A-Z])O+(\d)/g, (_, a: string, d: string) => `${a}${"0".repeat(1)}${d}`);
  // Si quedó SKU009 (5 dígitos tras SKU a veces), pad no automático — SKUO00009 → SKU000009
  t = t.replace(/([A-Z])O(\d)/g, "$10$2");
  t = t.replace(/(?<=\d)O(?=\d)/g, "0");
  t = t.replace(/(?<=[A-Z])O(?=\d)/g, "0");
  t = t.replace(/(?<=\d)[IL](?=\d)/gi, "1");
  t = t.replace(/(?<=[A-Z])[IL](?=\d)/gi, "1");
  // SKU + 5 dígitos: si hay 5, dejar; si OCR comió un 0, no inventar
  return t;
}

/** Precio OCR: "7,00" / "7.00" / "700€" (céntimos si múltiplo de 100). */
export function normalizeOcrPrice(raw: string): string | null {
  const t = (raw || "").replace(/\s/g, "").replace(/€/g, "");
  if (!t) return null;
  const dec = t.match(/^(\d+)[.,](\d{2})$/);
  if (dec) return `${Number(dec[1])}.${dec[2]}`;
  if (/^\d{2,5}$/.test(t)) {
    const n = Number(t);
    if (n >= 100 && n % 100 === 0 && n <= 99900) {
      return (n / 100).toFixed(2);
    }
    return n.toFixed(2);
  }
  return null;
}

/**
 * Extrae fecha de cabecera → YYYY-MM-DD o null.
 */
export function extractDocumentDate(text: string): string | null {
  const t = text || "";

  const labeled = t.match(
    /fecha(?:\s*(?:albar[aá]n|doc(?:umento)?|orden)?)?\s*[:#]?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i,
  );
  if (labeled) {
    let y = Number(labeled[3]);
    if (y < 100) y += 2000;
    const iso = toIso(y, Number(labeled[2]), Number(labeled[1]));
    if (iso) return iso;
  }

  const isoHit = t.match(/\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/);
  if (isoHit) {
    const iso = toIso(Number(isoHit[1]), Number(isoHit[2]), Number(isoHit[3]));
    if (iso) return iso;
  }

  const dmy = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.]((?:19|20)\d{2})\b/);
  if (dmy) {
    const iso = toIso(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
    if (iso) return iso;
  }

  const monthRe =
    /\b(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:de\s+)?((?:19|20)\d{2})\b/i;
  const mm = t.match(monthRe);
  if (mm) {
    const month = MONTHS[mm[2].toLowerCase()];
    if (month) {
      const iso = toIso(Number(mm[3]), month, Number(mm[1]));
      if (iso) return iso;
    }
  }

  return null;
}

/**
 * Filas tipo: CODE - nombre qty precio€
 * Tolerante a OCR: SKUO 00009, 40], 700€, precio opcional.
 */
export function extractShapedProductLines(
  text: string,
  makeLine: (
    reference: string,
    name: string | null,
    quantity: number,
    unitPrice: string | null,
    confidence: number,
  ) => { reference: string; name: string | null; quantity: number; packages: number; unitPrice: string | null; confidence: number },
): Array<{
  reference: string;
  name: string | null;
  quantity: number;
  packages: number;
  unitPrice: string | null;
  confidence: number;
}> {
  const out: ReturnType<typeof makeLine>[] = [];
  // CODE (letras/dígitos/espacios OCR) - nombre qty[basura] precio?
  const re =
    /\b((?:SKU|ITEM|ART)[\sO0Il1]*\d{3,}|\d{4,8}|[A-Z]{2,5}\s*-\s*\d{3,6})\s*[-–]\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n]{2,60}?)\s+(\d{1,5})[\]|lI]?\s+(\d+[.,]\d{2}|\d{2,5})\s*€?/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let refRaw = m[1].replace(/\s*-\s*/g, "-");
    let ref = normalizeOcrCode(refRaw);
    // ART-0012 style: normalize may strip hyphen wrongly — restore
    if (/^[A-Z]{2,5}-\d{3,6}$/i.test(refRaw.replace(/\s/g, ""))) {
      ref = refRaw.replace(/\s/g, "").toUpperCase();
    }
    if (/^SKU\d+$/i.test(ref) && ref.length < 9) {
      // SKU00009 (8) → pad to SKU000009 if 5 digit body
      const body = ref.replace(/^SKU/i, "");
      if (/^\d{5}$/.test(body)) ref = `SKU0${body}`;
    }
    let name = m[2].replace(/\s+/g, " ").trim();
    name = name.replace(/\s+\d+[.,]\d{2}.*$/, "").trim();
    const qty = Math.max(1, Number(m[3]) || 1);
    const price = normalizeOcrPrice(m[4]);
    out.push(makeLine(ref, name || null, qty, price, price ? 0.92 : 0.85));
  }

  // Variante sin guión obligatorio: SKU000009 Nombre 40 7,00€
  if (out.length < 2) {
    const re2 =
      /\b((?:SKU|ITEM)[\sO0Il1]*\d{4,})\s+([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n\d]{2,50}?)\s+(\d{1,5})[\]|]?\s+(\d+[.,]\d{2}|\d{2,5})\s*€?/gi;
    while ((m = re2.exec(text))) {
      let ref = normalizeOcrCode(m[1]);
      const body = ref.replace(/^SKU/i, "");
      if (/^SKU/i.test(ref) && /^\d{5}$/.test(body)) ref = `SKU0${body}`;
      const name = m[2].replace(/\s+/g, " ").trim();
      const qty = Math.max(1, Number(m[3]) || 1);
      const price = normalizeOcrPrice(m[4]);
      if (!out.some((l) => l.reference === ref)) {
        out.push(makeLine(ref, name || null, qty, price, 0.88));
      }
    }
  }

  return out;
}
