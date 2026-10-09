import {
  PROFILE_BANDS,
  businessProfileToBands,
  detectProfile,
  extractAssistedCandidates,
  parseAnyDocument,
  parseColumnBundle,
  passesQualityGate,
  scoreLayoutText,
  scoreParseResult,
  withCleanLines,
  type AssistedCandidate,
  type DocumentParseResult,
  type DocumentProfile,
  type ProfileBand,
} from "@clariveye-lite/domain";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { getActiveDocProfile, recordProfileOutcome } from "@/lib/doc-profiles-store";
import {
  extractPdfLayout,
  isPdfFile,
  renderAllPdfPagesToCanvas,
  renderPdfPageToCanvas,
} from "@/lib/pdf-text";
import { recordScanStat } from "@/lib/scan-stats";

export type RecognizeSource = "pdf-text" | "pdf-layout" | "ocr" | "trained" | "assisted";

export type RecognizeResult = DocumentParseResult & {
  source: RecognizeSource;
  /** Gate falló: UI debe mostrar candidatos / entrenar */
  assisted?: boolean;
  candidates?: AssistedCandidate[];
  qualityScore?: number;
};

export type RecognizeOptions = {
  forceOcr?: boolean;
  onStatus?: (msg: string) => void;
};

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("spa+eng");
  }
  return workerPromise;
}

function toGrayContrast(ctx: CanvasRenderingContext2D, width: number, height: number, contrast = 1.3) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(image, 0, 0);
}

function otsuCut(data: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) hist[data[i]]++;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let cut = 160;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) {
      maxVar = v;
      cut = t;
    }
  }
  return cut;
}

function applyBin(ctx: CanvasRenderingContext2D, width: number, height: number, cut: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] > cut ? 255 : 0;
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
  mode: "gray" | "otsu" = "gray",
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
  toGrayContrast(ctx, dw, dh, 1.3);
  if (mode === "otsu") {
    const img = ctx.getImageData(0, 0, dw, dh);
    applyBin(ctx, dw, dh, otsuCut(img.data));
  }
  return canvas;
}

async function ocrCanvas(
  canvas: HTMLCanvasElement,
  opts?: { whitelist?: string; psm?: string },
): Promise<string> {
  const worker = await getWorker();
  await worker.setParameters({
    tessedit_pageseg_mode: opts?.psm === "4" ? PSM.SINGLE_COLUMN : PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: opts?.whitelist ?? "",
  });
  const { data } = await worker.recognize(canvas);
  return data.text || "";
}

function parseFromText(text: string, profileOverride?: DocumentProfile): DocumentParseResult {
  const profile = profileOverride || detectProfile(text);
  const doc = parseAnyDocument(text);
  return withCleanLines({ ...doc, profile: profileOverride || doc.profile || profile });
}

function withSource(
  doc: DocumentParseResult,
  source: RecognizeSource,
  extra?: Partial<RecognizeResult>,
): RecognizeResult {
  const cleaned = withCleanLines(doc);
  return {
    ...cleaned,
    source,
    qualityScore: scoreParseResult(cleaned),
    ...extra,
  };
}

function assistedFrom(doc: DocumentParseResult, rawFallback: string): RecognizeResult {
  const raw = doc.raw_text || rawFallback;
  const candidates = extractAssistedCandidates(raw);
  return withSource(doc, "assisted", {
    assisted: true,
    candidates,
    raw_text: raw,
  });
}

function pickBest(a: DocumentParseResult, b: DocumentParseResult): DocumentParseResult {
  return scoreParseResult(a) >= scoreParseResult(b) ? a : b;
}

async function scanColumns(
  full: HTMLCanvasElement,
  headerText: string,
  fullText: string,
  profile: DocumentProfile,
  mode: "gray" | "otsu",
  onStatus?: (msg: string) => void,
  trainedBand?: ProfileBand | null,
): Promise<RecognizeResult> {
  const w = full.width;
  const h = full.height;
  const layout = trainedBand ?? PROFILE_BANDS[profile];
  onStatus?.(trainedBand ? `Perfil entrenado · ${mode}…` : `Perfil ${profile} · ${mode}…`);

  let best: DocumentParseResult | null = null;
  let bestScore = -1;

  const columnVariants: Array<ProfileBand["columns"]> = trainedBand
    ? [trainedBand.columns]
    : profile === "easywms" || profile === "tosma_cod"
      ? [
          layout.columns,
          { sku: [0.12, 0.28], desc: [0.28, 0.55], nums: [0.55, 0.72] },
          { sku: [0.02, 0.14], desc: [0.14, 0.55], nums: [0.55, 0.72] },
          { sku: [0.3, 0.45], desc: [0.45, 0.75], nums: [0.75, 0.98] },
        ]
      : [layout.columns];

  for (const [y0, y1] of layout.tableBands) {
    for (const cols of columnVariants) {
      const [sx0, sx1] = cols.sku;
      const [dx0, dx1] = cols.desc;
      const [nx0, nx1] = cols.nums;
      const skuText = await ocrCanvas(regionCanvas(full, w, h, sx0, y0, sx1, y1, 500, mode), {
        psm: "6",
      });
      const descText = await ocrCanvas(regionCanvas(full, w, h, dx0, y0, dx1, y1, 700, mode), {
        psm: "6",
      });
      const numsText = await ocrCanvas(regionCanvas(full, w, h, nx0, y0, nx1, y1, 800, mode), {
        whitelist: "0123456789.,€ []UNun",
        psm: "6",
      });

      const joined = `${headerText}\n${skuText}\n${descText}\n${numsText}\n${fullText}`;
      const fromColumns = withCleanLines(
        parseColumnBundle({
          headerText,
          skuText,
          descText,
          numsText,
          fullText: joined,
        }),
      );
      const fromProfile = parseFromText(joined, profile);
      const candidate = pickBest(fromProfile, fromColumns);
      const s = scoreParseResult(candidate);
      if (s > bestScore) {
        bestScore = s;
        best = candidate;
      }
    }
  }

  const fallback = parseFromText(`${headerText}\n${fullText}`, profile);
  const chosen = best && bestScore >= scoreParseResult(fallback) ? best : fallback;
  return withSource(
    { ...chosen, profile: chosen.profile || profile },
    trainedBand ? "trained" : "ocr",
  );
}

async function recognizeFromCanvas(
  full: HTMLCanvasElement,
  onStatus?: (msg: string) => void,
): Promise<RecognizeResult> {
  const w = full.width;
  const h = full.height;

  const trained = getActiveDocProfile();
  const trainedBand = trained ? businessProfileToBands(trained) : null;

  onStatus?.("OCR cabecera…");
  const headerRect = trained?.regions.header;
  const headerText = await ocrCanvas(
    regionCanvas(
      full,
      w,
      h,
      headerRect?.x0 ?? 0.3,
      headerRect?.y0 ?? 0,
      headerRect?.x1 ?? 1,
      headerRect?.y1 ?? 0.22,
      700,
      "gray",
    ),
    { psm: "6" },
  );

  onStatus?.("OCR página…");
  const fullText = await ocrCanvas(full, { psm: "6" });
  const detected = detectProfile(`${headerText}\n${fullText}`);
  const profile: DocumentProfile = trained?.hints.baseProfile || detected;

  let best: RecognizeResult | null = null;
  if (trainedBand) {
    onStatus?.(`Usando perfil: ${trained!.name}…`);
    best = await scanColumns(full, headerText, fullText, profile, "gray", onStatus, trainedBand);
    if (!passesQualityGate(best)) {
      const otsuTrained = await scanColumns(
        full,
        headerText,
        fullText,
        profile,
        "otsu",
        onStatus,
        trainedBand,
      );
      if (scoreParseResult(otsuTrained) > scoreParseResult(best)) best = otsuTrained;
    }
    recordProfileOutcome(trained!.id, passesQualityGate(best));
  }

  if (!best || !passesQualityGate(best)) {
    let generic = await scanColumns(full, headerText, fullText, detected, "gray", onStatus);
    if (!passesQualityGate(generic)) {
      onStatus?.("OCR reintento Otsu…");
      const otsuTry = await scanColumns(full, headerText, fullText, detected, "otsu", onStatus);
      if (scoreParseResult(otsuTry) > scoreParseResult(generic)) generic = otsuTry;
    }
    if (!best || scoreParseResult(generic) > scoreParseResult(best)) best = generic;
  }

  return best;
}

async function ocrFromFile(file: File, onStatus?: (msg: string) => void): Promise<RecognizeResult> {
  let sourceCanvas: HTMLCanvasElement;

  if (isPdfFile(file)) {
    onStatus?.("PDF raster (todas las páginas)…");
    const { canvas } = await renderAllPdfPagesToCanvas(file, 2.8, 6);
    sourceCanvas = canvas;
  } else {
    onStatus?.("Preparando imagen…");
    const bitmap = await createImageBitmap(file);
    sourceCanvas = document.createElement("canvas");
    const scale = Math.max(bitmap.width, bitmap.height) < 1400 ? 2.4 : 1.5;
    sourceCanvas.width = Math.round(bitmap.width * scale);
    sourceCanvas.height = Math.round(bitmap.height * scale);
    const fctx = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
    fctx.fillStyle = "#fff";
    fctx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    fctx.drawImage(bitmap, 0, 0, sourceCanvas.width, sourceCanvas.height);
    bitmap.close();
  }

  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
  toGrayContrast(ctx, sourceCanvas.width, sourceCanvas.height, 1.25);

  return recognizeFromCanvas(sourceCanvas, onStatus);
}

function finish(result: RecognizeResult): RecognizeResult {
  const ok = passesQualityGate(result) && !result.assisted;
  recordScanStat({
    source: result.source,
    score: result.qualityScore ?? scoreParseResult(result),
    ok,
    assisted: !!result.assisted,
  });
  return result;
}

/**
 * Cascada: layout → trained text → OCR multipágina → asistido.
 */
export async function recognizeDocumentStructured(
  file: File,
  onStatusOrOpts?: ((msg: string) => void) | RecognizeOptions,
): Promise<RecognizeResult> {
  const opts: RecognizeOptions =
    typeof onStatusOrOpts === "function" ? { onStatus: onStatusOrOpts } : onStatusOrOpts ?? {};
  const onStatus = opts.onStatus;

  if (opts.forceOcr) {
    const ocr = await ocrFromFile(file, onStatus);
    if (passesQualityGate(ocr)) return finish(ocr);
    return finish(assistedFrom(ocr, ocr.raw_text));
  }

  if (isPdfFile(file)) {
    onStatus?.("Leyendo PDF (layout)…");
    try {
      const layout = await extractPdfLayout(file);
      const layoutScore = scoreLayoutText(layout.text);
      const trained = getActiveDocProfile();

      let bestDoc: DocumentParseResult | null = null;
      let source: RecognizeSource = "pdf-layout";

      if (layout.text.length >= 40 && layoutScore >= 4) {
        const fromText = parseFromText(layout.text, trained?.hints.baseProfile);
        const fromCols = withCleanLines(parseColumnBundle(layout.columnBundle));
        bestDoc = pickBest(fromText, fromCols);
        source = "pdf-layout";

        // Perfil entrenado: re-parse con baseProfile sobre texto nativo
        if (trained?.hints.baseProfile) {
          const forced = parseFromText(layout.text, trained.hints.baseProfile);
          if (scoreParseResult(forced) > scoreParseResult(bestDoc)) {
            bestDoc = forced;
            source = "trained";
          }
        }

        if (bestDoc && passesQualityGate(bestDoc)) {
          onStatus?.(`PDF layout · ${bestDoc.lines.length} producto(s)`);
          return finish(withSource(bestDoc, source));
        }
      }

      // Poco texto nativo o gate falló → OCR multipágina
      const weakNative = layout.itemCount < 15 || layout.text.length < 40 || layoutScore < 6;
      if (weakNative || !bestDoc || !passesQualityGate(bestDoc)) {
        onStatus?.("PDF · OCR cascada…");
        const ocr = await ocrFromFile(file, onStatus);
        if (passesQualityGate(ocr)) return finish(ocr);
        if (bestDoc && scoreParseResult(bestDoc) > scoreParseResult(ocr)) {
          return finish(assistedFrom(bestDoc, layout.text || ocr.raw_text));
        }
        return finish(assistedFrom(ocr, ocr.raw_text || layout.text));
      }

      return finish(assistedFrom(bestDoc, layout.text));
    } catch (err) {
      console.warn("PDF path failed, OCR fallback", err);
      const ocr = await ocrFromFile(file, onStatus);
      if (passesQualityGate(ocr)) return finish(ocr);
      return finish(assistedFrom(ocr, ocr.raw_text));
    }
  }

  const ocr = await ocrFromFile(file, onStatus);
  if (passesQualityGate(ocr)) return finish(ocr);
  return finish(assistedFrom(ocr, ocr.raw_text));
}

export async function recognizeDocument(file: File): Promise<string> {
  const doc = await recognizeDocumentStructured(file);
  return doc.raw_text;
}

/** @deprecated use renderAllPdfPagesToCanvas — kept for TrainParserPage single preview */
export { renderPdfPageToCanvas };
