/** Token de pedido en barcode/QR: CEL1:{orderId} */

export const ORDER_TOKEN_PREFIX = "CEL1:";

export function encodeOrderToken(orderId: string): string {
  const id = orderId.trim();
  if (!id) throw new Error("orderId vacío");
  return `${ORDER_TOKEN_PREFIX}${id}`;
}

/**
 * Token corto para Code128 (móvil).
 * UUID completo en barras lineales es demasiado denso y no escanea bien.
 * Formato: CEL1:{8 hex} — se resuelve con matchOrderIdFromToken.
 */
export function encodeOrderBarcodeToken(orderId: string): string {
  const hex = orderId.replace(/-/g, "").trim().slice(0, 8).toUpperCase();
  if (hex.length < 8) throw new Error("orderId demasiado corto para barcode");
  return `${ORDER_TOKEN_PREFIX}${hex}`;
}

export function parseOrderToken(raw: string): string | null {
  const text = (raw || "").trim();
  if (!text) return null;
  const m = text.match(/^CEL1[:\-_]?(.+)$/i);
  if (m?.[1]) return m[1].trim();
  // QR a veces con URL futura
  const url = text.match(/[?&#]order(?:Id)?=([A-Za-z0-9\-]+)/i);
  if (url?.[1]) return url[1];
  return null;
}

/** Resuelve payload CEL1 (completo o corto) contra la lista de ids. */
export function matchOrderIdFromToken(rawOrPayload: string, orderIds: string[]): string | null {
  const parsed = parseOrderToken(rawOrPayload) ?? rawOrPayload.trim();
  if (!parsed || orderIds.length === 0) return null;

  const needle = parsed.toLowerCase();
  const needleHex = needle.replace(/-/g, "");

  const exact = orderIds.find(
    (id) => id.toLowerCase() === needle || id.replace(/-/g, "").toLowerCase() === needleHex,
  );
  if (exact) return exact;

  // Prefijo / barcode corto (8 hex)
  const matches = orderIds.filter((id) => {
    const idLower = id.toLowerCase();
    const idHex = id.replace(/-/g, "").toLowerCase();
    return idLower.startsWith(needle) || idHex.startsWith(needleHex);
  });
  if (matches.length === 1) return matches[0];
  return null;
}

export function isOrderToken(raw: string): boolean {
  return parseOrderToken(raw) !== null;
}
