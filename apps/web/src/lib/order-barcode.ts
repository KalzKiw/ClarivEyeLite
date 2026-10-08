import { encodeOrderToken, parseOrderToken } from "@clariveye-lite/domain";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export { encodeOrderToken, parseOrderToken };

/** Code128 → data URL PNG */
export function code128DataUrl(value: string, height = 56): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    width: 2,
    height,
    displayValue: false,
    margin: 4,
    background: "#ffffff",
  });
  return canvas.toDataURL("image/png");
}

/** QR → data URL PNG */
export async function qrDataUrl(value: string, size = 120): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
