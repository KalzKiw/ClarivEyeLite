import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { layoutPdfItems, type PdfLayoutResult, type PdfTextItem } from "@clariveye-lite/domain";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

async function loadPdf(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

/** Texto plano (legacy): items unidos sin layout. */
export async function extractPdfText(file: File): Promise<string> {
  const layout = await extractPdfLayout(file);
  return layout.text;
}

export type PdfLayoutMeta = PdfLayoutResult & {
  numPages: number;
  itemCount: number;
};

/** Texto + líneas + columnas usando coordenadas pdf.js. */
export async function extractPdfLayout(file: File): Promise<PdfLayoutMeta> {
  const pdf = await loadPdf(file);
  const allItems: PdfTextItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageOffsetY = (i - 1) * 2000;
    for (const item of content.items) {
      if (!("str" in item) || !item.str?.trim()) continue;
      const t = "transform" in item ? (item.transform as number[]) : [1, 0, 0, 1, 0, 0];
      const width = "width" in item && typeof item.width === "number" ? item.width : undefined;
      const height =
        "height" in item && typeof item.height === "number"
          ? item.height
          : Math.abs(t[3] ?? 0) || undefined;
      allItems.push({
        str: item.str,
        x: t[4] ?? 0,
        y: (t[5] ?? 0) - pageOffsetY,
        width,
        height,
      });
    }
  }

  const layout = layoutPdfItems(allItems);
  return { ...layout, numPages: pdf.numPages, itemCount: allItems.length };
}

/** Renderiza una página a canvas. */
export async function renderPdfPageToCanvas(
  file: File,
  scale = 3.2,
  pageNumber = 1,
): Promise<HTMLCanvasElement> {
  const pdf = await loadPdf(file);
  const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

/** Número de páginas del PDF (para OCR página a página). */
export async function getPdfNumPages(file: File): Promise<number> {
  const pdf = await loadPdf(file);
  return pdf.numPages;
}

/** Raster de cada página por separado (bandas Y correctas por hoja). */
export async function renderPdfPagesSeparately(
  file: File,
  scale = 2.8,
  maxPages = 6,
): Promise<HTMLCanvasElement[]> {
  const pdf = await loadPdf(file);
  const n = Math.min(pdf.numPages, maxPages);
  const pages: HTMLCanvasElement[] = [];
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.ceil(viewport.width);
    c.height = Math.ceil(viewport.height);
    const ctx = c.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas: c }).promise;
    pages.push(c);
  }
  return pages;
}

/** @deprecated Preferir renderPdfPagesSeparately — apilar rompe bandas Y multipágina. */
export async function renderAllPdfPagesToCanvas(
  file: File,
  scale = 2.8,
  maxPages = 6,
): Promise<{ canvas: HTMLCanvasElement; numPages: number }> {
  const pages = await renderPdfPagesSeparately(file, scale, maxPages);
  let totalH = 0;
  let maxW = 0;
  for (const p of pages) {
    totalH += p.height;
    maxW = Math.max(maxW, p.width);
  }
  const canvas = document.createElement("canvas");
  canvas.width = maxW;
  canvas.height = totalH || 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let y = 0;
  for (const p of pages) {
    ctx.drawImage(p, 0, y);
    y += p.height;
  }
  return { canvas, numPages: pages.length };
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
