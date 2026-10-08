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

/** Texto + líneas + columnas usando coordenadas pdf.js. */
export async function extractPdfLayout(file: File): Promise<PdfLayoutResult> {
  const pdf = await loadPdf(file);
  const allItems: PdfTextItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageOffsetY = (i - 1) * 2000; // separar páginas en el eje Y lógico
    for (const item of content.items) {
      if (!("str" in item) || !item.str?.trim()) continue;
      const t = "transform" in item ? (item.transform as number[]) : [1, 0, 0, 1, 0, 0];
      const width = "width" in item && typeof item.width === "number" ? item.width : undefined;
      allItems.push({
        str: item.str,
        x: t[4] ?? 0,
        y: (t[5] ?? 0) - pageOffsetY,
        width,
      });
    }
  }

  return layoutPdfItems(allItems);
}

/** Renderiza página 1 a canvas (fallback OCR si el PDF es imagen). */
export async function renderPdfPageToCanvas(file: File, scale = 3.2): Promise<HTMLCanvasElement> {
  const pdf = await loadPdf(file);
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
