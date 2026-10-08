/** Token de pedido en barcode/QR: CEL1:{orderId} */

export const ORDER_TOKEN_PREFIX = "CEL1:";

export function encodeOrderToken(orderId: string): string {
  const id = orderId.trim();
  if (!id) throw new Error("orderId vacío");
  return `${ORDER_TOKEN_PREFIX}${id}`;
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

export function isOrderToken(raw: string): boolean {
  return parseOrderToken(raw) !== null;
}
