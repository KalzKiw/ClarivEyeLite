import {
  PROFILE_BANDS,
  detectProfile,
  parseAnyDocument,
  parseColumnBundle,
  type DocumentParseResult,
  type ProfileBand,
} from "@clariveye-lite/domain";
import { createWorker, type Worker } from "tesseract.js";
import { extractPdfText, isPdfFile, renderPdfPageToCanvas } from "@/lib/pdf-text";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("spa+eng");
  }
  return workerPromise;
}

function applyThreshold(ctx: CanvasRenderingContext2D, width: number, height: number, cut = 172) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let v = (gray - 128) * 1.45 + 128;
    v = v > cut ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
}

function regionCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  minWidth = 600,
  threshold = true,
): HTMLCanvasElement {
  const sx = Math.floor(srcW * x0);
  const sy = Math.floor(srcH * y0);
  const sw = Math.max(8, Math.floor(srcW * (x1 - x0)));
  const sh = Math.max(8, Math.floor(srcH * (y1 - y0)));
  const scale = Math.max(3, minWidth / sw);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, dw, dh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);
  if (threshold) applyThreshold(ctx, dw, dh);
  return canvas;
}

async function ocrCanvas(
  canvas: HTMLCanvasElement,
  opts?: { whitelist?: string; psm?: string },
): Promise<string> {
  const worker = await getWorker();
  const params: Record<string, string> = {
    tessedit_pageseg_mode: opts?.psm ?? "6",
    preserve_interword_spaces: "1",
  };
  if (opts?.whitelist) params.tessedit_char_whitelist = opts.whitelist;
  await worker.setParameters(params);
  const { data } = await worker.recognize(canvas);
  return data.text || "";
}

function scoreDoc(doc: DocumentParseResult): number {
  return doc.lines.reduce((s, l) => s + 1 + (l.name ? 1.5 : 0) + (l.quantity > 1 ? 0.5 : 0), 0);
}

function parseFromText(text: string): DocumentParseResult {
  const profile = detectProfile(text);
  const doc = parseAnyDocument(text);
  return { ...doc, profile: doc.profile || profile };
}

/** OCR sobre un canvas ya preparado (imagen o PDF rasterizado) */
async function recognizeFromCanvas(
  full: HTMLCanvasElement,
  onStatus?: (msg: string) => void,
): Promise<DocumentParseResult> {
  const w = full.width;
  const h = full.height;

  onStatus?.("OCR cabecera…");
  const headerText = await ocrCanvas(regionCanvas(full, w, h, 0.35, 0, 1, 0.24, 700, true), {
    psm: "6",
  });

  onStatus?.("OCR página…");
  const fullText = await ocrCanvas(full, { psm: "6" });
  const probe = `${headerText}\n${fullText}`;
  const profile = detectProfile(probe);
  const layout = PROFILE_BANDS[profile];
  onStatus?.(`Perfil ${profile} · columnas…`);

  let bestSku = "";
  let bestDesc = "";
  let bestNums = "";
  let bestScore = -1;

  const columnVariants: Array<ProfileBand["columns"]> =
    profile === "easywms"
      ? [
          layout.columns,
          { sku: [0.12, 0.28], desc: [0.28, 0.55], nums: [0.55, 0.72] }, // albarán DL
          { sku: [0.3, 0.45], desc: [0.45, 0.75], nums: [0.75, 0.98] }, // hoja picking Item
        ]
      : [layout.columns];

  for (const [y0, y1] of layout.tableBands) {
    for (const cols of columnVariants) {
      const [sx0, sx1] = cols.sku;
      const [dx0, dx1] = cols.desc;
      const [nx0, nx1] = cols.nums;
      const skuText = await ocrCanvas(regionCanvas(full, w, h, sx0, y0, sx1, y1, 500, true), {
        whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/",
        psm: "6",
      });
      const descText = await ocrCanvas(regionCanvas(full, w, h, dx0, y0, dx1, y1, 700, true), {
        psm: "6",
      });
      const numsText = await ocrCanvas(regionCanvas(full, w, h, nx0, y0, nx1, y1, 800, true), {
        whitelist: "0123456789.,€ []UNun",
        psm: "6",
      });
      const score =
        (skuText.match(/\bItem\d+\b/gi) || []).length * 5 +
        (skuText.match(/\b\d{2,}\b/g) || []).length * 3 +
        (descText.match(/[A-Za-zÁÉÍÓÚ]{3,}/gi) || []).length +
        (numsText.match(/\d+\s*\[\s*UN\s*\]/gi) || []).length * 3 +
        (numsText.match(/\d+[.,]\d{2}/g) || []).length * 2;
      if (score > bestScore) {
        bestScore = score;
        bestSku = skuText;
        bestDesc = descText;
        bestNums = numsText;
      }
      if (score >= 12) break;
    }
    if (bestScore >= 12) break;
  }

  onStatus?.("Interpretando…");
  const joined = `${headerText}\n${bestSku}\n${bestDesc}\n${bestNums}\n${fullText}`;
  const fromColumns = parseColumnBundle({
    headerText,
    skuText: bestSku,
    descText: bestDesc,
    numsText: bestNums,
    fullText: joined,
  });
  const fromProfile = parseFromText(joined);
  const best = scoreDoc(fromProfile) >= scoreDoc(fromColumns) ? fromProfile : fromColumns;
  return { ...best, profile: best.profile || profile };
}

/**
 * PDF con texto → parse directo (fiable).
 * PDF escaneado / foto → OCR.
 */
export async function recognizeDocumentStructured(
  file: File,
  onStatus?: (msg: string) => void,
): Promise<DocumentParseResult> {
  if (isPdfFile(file)) {
    onStatus?.("Leyendo PDF (texto nativo)…");
    try {
      const pdfText = await extractPdfText(file);
      if (pdfText.length >= 40) {
        const parsed = parseFromText(pdfText);
        if (parsed.lines.length >= 1) {
          onStatus?.(`PDF texto · ${parsed.lines.length} producto(s)`);
          return parsed;
        }
      }
      onStatus?.("PDF sin texto útil · raster + OCR…");
      const canvas = await renderPdfPageToCanvas(file, 2.8);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      applyThreshold(ctx, canvas.width, canvas.height, 165);
      return recognizeFromCanvas(canvas, onStatus);
    } catch (err) {
      console.warn("PDF path failed, image fallback", err);
    }
  }

  onStatus?.("Preparando imagen…");
  const bitmap = await createImageBitmap(file);
  const full = document.createElement("canvas");
  const scale = Math.max(bitmap.width, bitmap.height) < 1400 ? 2.2 : 1.4;
  full.width = Math.round(bitmap.width * scale);
  full.height = Math.round(bitmap.height * scale);
  const fctx = full.getContext("2d", { willReadFrequently: true })!;
  fctx.fillStyle = "#fff";
  fctx.fillRect(0, 0, full.width, full.height);
  fctx.drawImage(bitmap, 0, 0, full.width, full.height);
  applyThreshold(fctx, full.width, full.height, 168);
  bitmap.close();
  return recognizeFromCanvas(full, onStatus);
}

export async function recognizeDocument(file: File): Promise<string> {
  const doc = await recognizeDocumentStructured(file);
  return doc.raw_text;
}
