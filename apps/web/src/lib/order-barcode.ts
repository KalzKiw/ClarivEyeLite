import {
  encodeOrderBarcodeToken,
  encodeOrderToken,
  parseOrderToken,
} from "@clariveye-lite/domain";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export { encodeOrderBarcodeToken, encodeOrderToken, parseOrderToken };

/** Code128 → data URL PNG (barras más gordas + quiet zone para móvil) */
export function code128DataUrl(
  value: string,
  height = 56,
  opts?: { barWidth?: number; margin?: number },
): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    width: opts?.barWidth ?? 2.5,
    height,
    displayValue: false,
    margin: opts?.margin ?? 12,
    background: "#ffffff",
  });
  return canvas.toDataURL("image/png");
}

/** QR → data URL PNG (margen amplio; mejor para cámara de móvil) */
export async function qrDataUrl(value: string, size = 120): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
