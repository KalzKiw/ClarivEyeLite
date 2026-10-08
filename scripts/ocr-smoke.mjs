/** Smoke: OCR por columnas sobre la OC de ejemplo (Node + sharp). */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { parseColumnBundle } from "../packages/domain/src/column-merge.ts";

const imgPath =
  process.argv[2] ||
  "C:/Users/alerx/.cursor/projects/d-ClarivSuite-privado/assets/c__Users_alerx_AppData_Roaming_Cursor_User_workspaceStorage_c325c53b5e6d67532239b17a0854e8db_images_Orden-compra-Ejemplo-2-99588953-7c8a-4381-bba9-912daecba4d3.png";

const meta = await sharp(imgPath).metadata();
const w = meta.width;
const h = meta.height;

async function ocrRegion(x0, y0, x1, y1, whitelist) {
  const left = Math.floor(w * x0);
  const top = Math.floor(h * y0);
  const width = Math.max(8, Math.floor(w * (x1 - x0)));
  const height = Math.max(8, Math.floor(h * (y1 - y0)));
  const buf = await sharp(imgPath)
    .extract({ left, top, width, height })
    .resize({ width: Math.max(600, width * 4), kernel: "lanczos3" })
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(172)
    .png()
    .toBuffer();
  const { data } = await Tesseract.recognize(buf, "spa+eng", {
    logger: () => {},
    tessedit_pageseg_mode: "6",
    ...(whitelist ? { tessedit_char_whitelist: whitelist } : {}),
  });
  return data.text || "";
}

const y0 = 0.45;
const y1 = 0.58;
const headerText = await ocrRegion(0.4, 0, 1, 0.22);
const skuText = await ocrRegion(0.01, y0, 0.15, y1, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/");
const descText = await ocrRegion(0.12, y0, 0.5, y1);
const numsText = await ocrRegion(0.48, y0, 0.99, y1, "0123456789.,€ ");
const fullText = await ocrRegion(0, 0, 1, 1);

const doc = parseColumnBundle({ headerText, skuText, descText, numsText, fullText });
console.log("--- regions ---");
console.log("HEADER", JSON.stringify(headerText));
console.log("SKU", JSON.stringify(skuText));
console.log("DESC", JSON.stringify(descText));
console.log("NUMS", JSON.stringify(numsText));
console.log("--- parsed ---");
console.log(JSON.stringify(doc, null, 2));
if (doc.lines.length < 3) {
  console.error("FAIL: expected >= 3 lines");
  process.exit(1);
}
console.log("OK", doc.lines.length, "lines", doc.documentNumber);
