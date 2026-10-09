/**
 * Reconstruye líneas/columnas a partir de items PDF con coordenadas.
 * pdf.js da transform[4]=x, transform[5]=y (origen abajo-izquierda).
 */

import type { ColumnOcrBundle, ColumnTableRow } from "./column-merge";

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type PdfLayoutResult = {
  /** Texto con saltos de línea reales (filas por Y) */
  text: string;
  lines: string[];
  /** Columnas aproximadas sku / desc / nums para parseColumnBundle */
  columnBundle: ColumnOcrBundle;
};

type Placed = PdfTextItem & { str: string };

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

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

/** Cortes de columna: gaps grandes en X; fallback cuantiles. */
function findColumnCuts(xs: number[]): [number, number] {
  if (xs.length < 4) {
    const sortedX = [...xs].sort((a, b) => a - b);
    const q1 = sortedX[Math.floor(sortedX.length * 0.28)] ?? sortedX[0] ?? 0;
    const q2 = sortedX[Math.floor(sortedX.length * 0.72)] ?? sortedX[sortedX.length - 1] ?? 1;
    return [q1, q2];
  }
  const uniq = [...new Set(xs.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
  const gaps: Array<{ mid: number; gap: number }> = [];
  for (let i = 1; i < uniq.length; i++) {
    gaps.push({ mid: (uniq[i - 1] + uniq[i]) / 2, gap: uniq[i] - uniq[i - 1] });
  }
  gaps.sort((a, b) => b.gap - a.gap);
  const top = gaps.slice(0, 2).sort((a, b) => a.mid - b.mid);
  if (top.length >= 2 && top[0].gap > 8 && top[1].gap > 8) {
    return [top[0].mid, top[1].mid];
  }
  const sortedX = [...xs].sort((a, b) => a - b);
  return [
    sortedX[Math.floor(sortedX.length * 0.28)] ?? 0,
    sortedX[Math.floor(sortedX.length * 0.72)] ?? 1,
  ];
}

function splitColumns(rows: Placed[][]): {
  sku: string[];
  desc: string[];
  nums: string[];
  tableRows: ColumnTableRow[];
} {
  const xs = rows.flat().map((i) => i.x);
  if (xs.length < 3) {
    const desc = rows.map(joinRow).filter(Boolean);
    return {
      sku: [],
      desc,
      nums: [],
      tableRows: desc.map((d) => ({ sku: "", desc: d, nums: "" })),
    };
  }
  const [q1, q2] = findColumnCuts(xs);

  const sku: string[] = [];
  const desc: string[] = [];
  const nums: string[] = [];
  const tableRows: ColumnTableRow[] = [];

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
    if (!s && !d && !n) continue;
    sku.push(s);
    desc.push(d);
    nums.push(n);
    tableRows.push({ sku: s, desc: d, nums: n });
  }
  return { sku, desc, nums, tableRows };
}

/**
 * Detecta inicio de tabla por espaciado Y repetido (filas de productos).
 * Devuelve índice de fila donde empieza el cuerpo.
 */
export function detectTableStart(rows: Placed[][]): number {
  if (rows.length < 4) return Math.max(1, Math.floor(rows.length * 0.15));
  const centers = rows.map((r) => median(r.map((i) => i.y)));
  const gaps: number[] = [];
  for (let i = 1; i < centers.length; i++) {
    gaps.push(Math.abs(centers[i - 1] - centers[i]));
  }
  const medGap = median(gaps.filter((g) => g > 0.5));
  if (!medGap) return Math.max(1, Math.floor(rows.length * 0.22));

  // Busca la primera racha de ≥3 gaps ≈ mediana (tabla)
  let streak = 0;
  let start = Math.max(1, Math.floor(rows.length * 0.1));
  for (let i = 0; i < gaps.length; i++) {
    if (Math.abs(gaps[i] - medGap) / medGap < 0.45) {
      streak += 1;
      if (streak >= 3) {
        start = Math.max(0, i - streak + 1);
        break;
      }
    } else {
      streak = 0;
    }
  }
  return Math.min(start, Math.floor(rows.length * 0.45));
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

  const heights = placed.map((i) => i.height).filter((h): h is number => typeof h === "number" && h > 0);
  const medH = median(heights);
  const ys = placed.map((i) => i.y);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  const yTolerance =
    opts?.yTolerance ??
    (medH > 0 ? Math.max(medH * 0.55, 2) : Math.max(3, Math.min(12, ySpan * 0.012)));

  const rows = clusterByY(placed, yTolerance);
  const lines = rows.map(joinRow).filter(Boolean);
  const text = lines.join("\n");

  const headerCut = detectTableStart(rows);
  const headerText = lines.slice(0, headerCut).join("\n");
  const bodyRows = rows.slice(headerCut);
  const cols = splitColumns(bodyRows.length ? bodyRows : rows);

  const columnBundle: ColumnOcrBundle = {
    headerText,
    skuText: cols.sku.join("\n"),
    descText: cols.desc.join("\n"),
    numsText: cols.nums.join("\n"),
    fullText: text,
    rows: cols.tableRows,
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
