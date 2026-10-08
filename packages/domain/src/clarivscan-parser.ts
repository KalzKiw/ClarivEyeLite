/**
 * Parser OCR unificado (frontend + backend).
 * Heurística: refs numéricas/alfanuméricas + fracción bulto (/, of, de).
 */

export type UnifiedParseOptions = {
  mode?: 'tienda' | 'almacen'
  minRefLength?: number
  maxRefLength?: number
  /** Si se define, preferir token numérico de exactamente N dígitos */
  refDigits?: number
}

export type UnifiedParseResult = {
  product_ref?: string | null
  bulto_raw?: string | null
  bulto_n?: number | null
  bulto_d?: number | null
  product_name?: string | null
  product_price?: string | null
  raw_text: string
  candidates?: string[]
}

function extractBulto(text: string): { raw: string | null; n: number | null; d: number | null } {
  const box = text.match(/\bbox\s*(\d{1,3})\s*(?:\/|of|de)\s*(\d{1,3})\b/i)
  if (box) {
    return {
      raw: box[0],
      n: parseInt(box[1], 10),
      d: parseInt(box[2], 10),
    }
  }
  const generic = text.match(/\b(\d{1,3})\s*(?:\/|\\|of|de)\s*(\d{1,3})\b/i)
  if (generic) {
    return {
      raw: generic[0],
      n: parseInt(generic[1], 10),
      d: parseInt(generic[2], 10),
    }
  }
  return { raw: null, n: null, d: null }
}

function extractPrice(text: string): string | null {
  const m = text.match(/(\d+[.,]\d{2})\s*€?/) || text.match(/€\s*(\d+[.,]\d{2})/)
  return m ? m[1].replace(',', '.') : null
}

function extractCandidates(text: string, minLen: number, maxLen: number): string[] {
  const out: string[] = []
  const digitRuns = text.match(/\d+/g) || []
  for (const r of digitRuns) {
    if (r.length >= minLen && r.length <= maxLen) out.push(r)
  }
  const alnum = text.match(/\b([A-Z0-9][A-Z0-9\-_/]{3,})\b/gi) || []
  for (const s of alnum) {
    if (/^\d+$/.test(s)) continue
    if (s.includes('/')) continue
    out.push(s)
  }
  return out
}

export function parseOCRTextUnified(
  rawText: string,
  opts: UnifiedParseOptions = {}
): UnifiedParseResult {
  const minLen = opts.minRefLength ?? 4
  const maxLen = opts.maxRefLength ?? 32
  const mode = opts.mode ?? 'almacen'
  const text = (rawText || '').replace(/\r/g, ' ').replace(/\n+/g, ' ').trim()
  const bulto = mode === 'tienda' ? { raw: null, n: null, d: null } : extractBulto(text)
  const candidates = extractCandidates(text, minLen, maxLen)

  let product_ref: string | null = null
  if (opts.refDigits) {
    const exact = candidates.find((c) => /^\d+$/.test(c) && c.length === opts.refDigits)
    if (exact) product_ref = exact
    else {
      const m = text.match(new RegExp(`\\b(\\d{${opts.refDigits}})\\b`))
      if (m) product_ref = m[1]
    }
  }
  if (!product_ref && candidates.length > 0) {
    const digits = candidates.filter((c) => /^\d+$/.test(c))
    product_ref = (digits.sort((a, b) => b.length - a.length)[0] ||
      candidates.sort((a, b) => b.length - a.length)[0]) as string
  }

  return {
    product_ref,
    bulto_raw: bulto.raw,
    bulto_n: bulto.n,
    bulto_d: bulto.d,
    product_name: null,
    product_price: mode === 'tienda' ? extractPrice(text) : null,
    raw_text: text,
    candidates: candidates.slice(0, 6),
  }
}
