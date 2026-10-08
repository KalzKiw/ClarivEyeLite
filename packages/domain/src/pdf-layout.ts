/**
 * Reconstruye líneas/columnas a partir de items PDF con coordenadas.
 * pdf.js da transform[4]=x, transform[5]=y (origen abajo-izquierda).
 */

import type { ColumnOcrBundle } from "./column-merge";

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width?: number;
};

export type PdfLayoutResult = {
  /** Texto con saltos de línea reales (filas por Y) */
  text: string;
  lines: string[];
  /** Columnas aproximadas sku / desc / nums para parseColumnBundle */
  columnBundle: ColumnOcrBundle;
};

type Placed = PdfTextItem & { str: string };

function clusterByY(items: Placed[], yTolerance: number): Placed[][] {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Placed[][] = [];
  let current: Placed[] = [sorted[0]];
  let anchorY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const it = sorted[i];
    if (Math.abs(it.y - anchorY) <= yTolerance) {
      current.push(it);
    } else {
      rows.push(current.sort((a, b) => a.x - b.x));
      current = [it];
      anchorY = it.y;
    }
  }
  rows.push(current.sort((a, b) => a.x - b.x));
  return rows;
}

function joinRow(row: Placed[]): string {
  if (!row.length) return "";
  let out = row[0].str;
  for (let i = 1; i < row.length; i++) {
    const prev = row[i - 1];
    const gap = row[i].x - (prev.x + (prev.width ?? prev.str.length * 4));
    out += gap > 2.5 ? " " : gap < -1 ? "" : " ";
    out += row[i].str;
  }
  return out.replace(/[ \t]+/g, " ").trim();
}

/** Cortes de columna por cuantiles de X (izq=sku, mid=desc, der=nums). */
function splitColumns(rows: Placed[][]): { sku: string[]; desc: string[]; nums: string[] } {
  const xs = rows.flat().map((i) => i.x);
  if (xs.length < 3) {
    return { sku: [], desc: rows.map(joinRow).filter(Boolean), nums: [] };
  }
  const sortedX = [...xs].sort((a, b) => a - b);
  const q1 = sortedX[Math.floor(sortedX.length * 0.28)] ?? sortedX[0];
  const q2 = sortedX[Math.floor(sortedX.length * 0.72)] ?? sortedX[sortedX.length - 1];

  const sku: string[] = [];
  const desc: string[] = [];
  const nums: string[] = [];

  for (const row of rows) {
    const left: Placed[] = [];
    const mid: Placed[] = [];
    const right: Placed[] = [];
    for (const it of row) {
      if (it.x < q1) left.push(it);
      else if (it.x > q2) right.push(it);
      else mid.push(it);
    }
    const s = joinRow(left);
    const d = joinRow(mid);
    const n = joinRow(right);
    // Filas de tabla: saltar cabeceras sueltas
    if (!s && !d && !n) continue;
    sku.push(s);
    desc.push(d);
    nums.push(n);
  }
  return { sku, desc, nums };
}

/**
 * Agrupa items PDF en líneas (por Y) y columnas (por X).
 */
export function layoutPdfItems(
  items: PdfTextItem[],
  opts?: { yTolerance?: number },
): PdfLayoutResult {
  const placed = items
    .map((i) => ({ ...i, str: (i.str || "").trim() }))
    .filter((i) => i.str.length > 0);

  if (!placed.length) {
    return {
      text: "",
      lines: [],
      columnBundle: { headerText: "", skuText: "", descText: "", numsText: "", fullText: "" },
    };
  }

  const ys = placed.map((i) => i.y);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  const yTolerance = opts?.yTolerance ?? Math.max(3, Math.min(12, ySpan * 0.012));

  const rows = clusterByY(placed, yTolerance);
  const lines = rows.map(joinRow).filter(Boolean);
  const text = lines.join("\n");

  // Cabecera ≈ primer 22% de filas
  const headerCut = Math.max(1, Math.floor(lines.length * 0.22));
  const headerText = lines.slice(0, headerCut).join("\n");
  const bodyRows = rows.slice(headerCut);
  const cols = splitColumns(bodyRows.length ? bodyRows : rows);

  const columnBundle: ColumnOcrBundle = {
    headerText,
    skuText: cols.sku.join("\n"),
    descText: cols.desc.join("\n"),
    numsText: cols.nums.join("\n"),
    fullText: text,
  };

  return { text, lines, columnBundle };
}

/** Score simple: ¿el texto layout parece una tabla de productos? */
export function scoreLayoutText(text: string): number {
  if (!text || text.length < 20) return 0;
  const lines = text.split("\n").filter((l) => l.trim());
  let score = Math.min(lines.length, 30) * 0.5;
  if (/\bItem\d+\b/i.test(text)) score += 8;
  if (/\bOUT\d+/i.test(text)) score += 4;
  if (/\b\d{5,8}\b/.test(text)) score += 3;
  if (/\[\s*UN\s*\]/i.test(text)) score += 5;
  if (/\d+[.,]\d{2}/.test(text)) score += 3;
  if (/albar[aá]n|orden|picking|art[ií]culo/i.test(text)) score += 2;
  return score;
}
