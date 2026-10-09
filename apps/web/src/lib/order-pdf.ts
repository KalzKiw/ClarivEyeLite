import type { Order, OrderLine } from "@clariveye-lite/domain";
import {
  ORDER_STATUS_LABEL,
  encodeOrderBarcodeToken,
  encodeOrderToken,
} from "@clariveye-lite/domain";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { code128DataUrl, qrDataUrl } from "@/lib/order-barcode";

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_RIGHT = PAGE_W - MARGIN;
const FOOTER_Y = 287;
const PRIMARY: [number, number, number] = [37, 99, 235];
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [113, 113, 122];

/** Landscape A4 for picking sheet */
const LS_W = 297;
const LS_H = 210;
const LS_MARGIN = 12;
const LS_FOOTER_Y = 200;
const LS_CONTENT_RIGHT = LS_W - LS_MARGIN;

export type OrderPdfKind = "cierre" | "picking";

export type OrderPdfOptions = {
  businessName?: string;
  kind?: OrderPdfKind;
};

function parseUnitPrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function lineAmount(line: OrderLine): number | null {
  const unit = parseUnitPrice(line.unitPrice);
  if (unit === null) return null;
  return unit * line.quantity;
}

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
}

function drawPageFooters(doc: jsPDF, label = "ClarivPack · Documento operativo · No sustituye factura fiscal") {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, FOOTER_Y - 4, CONTENT_RIGHT, FOOTER_Y - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label, MARGIN, FOOTER_Y);
    doc.text(`Pág. ${i}/${total}`, CONTENT_RIGHT, FOOTER_Y, { align: "right" });
  }
  doc.setTextColor(...INK);
}

function drawLandscapeFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.2);
    doc.line(LS_MARGIN, LS_FOOTER_Y - 4, LS_CONTENT_RIGHT, LS_FOOTER_Y - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("ClarivPack · Hoja de picking · Códigos separados para pistola", LS_MARGIN, LS_FOOTER_Y);
    doc.text(`Pág. ${i}/${total}`, LS_CONTENT_RIGHT, LS_FOOTER_Y, { align: "right" });
  }
  doc.setTextColor(...INK);
}

function drawSignatures(doc: jsPDF, y: number): number {
  const need = 28;
  if (y + need > FOOTER_Y - 8) {
    doc.addPage();
    y = MARGIN + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("Conformidad", MARGIN, y);
  y += 4;

  const colW = (CONTENT_RIGHT - MARGIN - 8) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 8;

  for (const [x, label] of [
    [leftX, "Preparador"] as const,
    [rightX, "Receptor"] as const,
  ]) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text("Nombre / firma", x, y + 3.5);
    doc.setDrawColor(160, 160, 170);
    doc.setLineWidth(0.3);
    doc.line(x, y + 14, x + colW, y + 14);
    doc.text("Fecha _______________", x, y + 18);
  }

  return y + 22;
}

function ensureY(doc: jsPDF, y: number, need: number): number {
  if (y + need <= FOOTER_Y - 10) return y;
  doc.addPage();
  return MARGIN + 6;
}

function ensureLandscapeY(doc: jsPDF, y: number, need: number): number {
  if (y + need <= LS_FOOTER_Y - 8) return y;
  doc.addPage();
  return LS_MARGIN + 6;
}

/** Marca ClarivPack (caja isométrica del Shell). */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/icons/clarivpack-mark.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** PDF A4 vertical: cierre / entrega con firmas (layout actual). */
export async function downloadOrderCierrePdf(order: Order, opts?: OrderPdfOptions) {
  const barcodeToken = encodeOrderBarcodeToken(order.id);
  const qrToken = encodeOrderToken(order.id);
  const barcodeImg = code128DataUrl(barcodeToken, 64, { barWidth: 3, margin: 14 });
  const qrImg = await qrDataUrl(qrToken, 220);
  const logoImg = await loadLogoDataUrl();
  const businessName = opts?.businessName?.trim() || "Negocio";
  const printedAt = fmtDate(new Date().toISOString());

  const totalQty = order.lines.reduce((s, l) => s + l.quantity, 0);
  const totalPkg = order.lines.reduce((s, l) => s + l.packages, 0);
  const amounts = order.lines.map(lineAmount);
  const hasPrices = amounts.some((a) => a !== null);
  const totalAmount = hasPrices
    ? amounts.reduce<number>((s, a) => s + (a ?? 0), 0)
    : null;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const logoSize = 16;
  let textLeft = MARGIN;
  if (logoImg) {
    doc.addImage(logoImg, "PNG", MARGIN, y - 1, logoSize, logoSize);
    textLeft = MARGIN + logoSize + 4;
  }

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ClarivPack", textLeft, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Comprobante de entrega · no es hoja de picking", textLeft, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(businessName, CONTENT_RIGHT, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Impreso: ${printedAt}`, CONTENT_RIGHT, y + 9, { align: "right" });

  y = MARGIN + logoSize + 2;
  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, CONTENT_RIGHT, y);
  y += 6;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(order.docNumber, MARGIN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const metaBits = [ORDER_STATUS_LABEL[order.status], `Alta ${fmtDate(order.createdAt)}`];
  if (order.docDate) metaBits.push(`Doc. ${order.docDate}`);
  if (order.deliveredAt) metaBits.push(`Entrega ${fmtDate(order.deliveredAt)}`);
  doc.text(metaBits.join(" · "), MARGIN, y);
  y += 4;
  if (order.notes?.trim()) {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    const noteLines = doc.splitTextToSize(`Notas: ${order.notes.trim()}`, CONTENT_RIGHT - MARGIN);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 3.2 + 1;
    doc.setFont("helvetica", "normal");
  }

  y += 2;
  // Identificación del pedido (referencia, no para puntear productos)
  const codeH = 28;
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, y, CONTENT_RIGHT - MARGIN, codeH, 1.5, 1.5, "S");
  doc.addImage(barcodeImg, "PNG", MARGIN + 3, y + 5, 100, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Ref. pedido ${order.docNumber}`, MARGIN + 3, y + 24);
  doc.addImage(qrImg, "PNG", CONTENT_RIGHT - 30, y + 2, 24, 24);
  y += codeH + 5;

  // Resumen de lo entregado — sin casillas de picking
  autoTable(doc, {
    startY: y,
    head: [["#", "Ref", "Descripción", "Ud", "Bultos", "P.unit", "Importe"]],
    body: order.lines.map((line, idx) => {
      const unit = parseUnitPrice(line.unitPrice);
      const amount = lineAmount(line);
      return [
        String(idx + 1),
        line.reference,
        line.name || "—",
        String(line.quantity),
        String(line.packages),
        unit !== null ? fmtMoney(unit) : line.unitPrice?.trim() || "—",
        amount !== null ? fmtMoney(amount) : "—",
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 1.3, textColor: INK, overflow: "linebreak" },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 62 },
      3: { cellWidth: 12, halign: "right" },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 24, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = lastTableY(doc) + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  const totalLine = [
    `Total: ${totalQty} uds`,
    `${totalPkg} bultos`,
    hasPrices && totalAmount !== null ? fmtMoney(totalAmount) : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(totalLine, CONTENT_RIGHT, y, { align: "right" });
  y += 6;

  if (order.deliveryNotes?.trim()) {
    y = ensureY(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text("Notas de entrega", MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const dn = doc.splitTextToSize(order.deliveryNotes.trim(), CONTENT_RIGHT - MARGIN);
    doc.text(dn, MARGIN, y);
    y += dn.length * 3.5 + 2;
  }

  y = drawSignatures(doc, y + 2);

  drawPageFooters(doc, "ClarivPack · Comprobante de entrega · No sustituye factura fiscal");
  doc.save(`entrega-${order.docNumber.replace(/[^\w\-]+/g, "_")}.pdf`);
}

/**
 * PDF A4 apaisado: una fila por producto con barcode grande y bien separado
 * para pistola (evita leer el código vecino).
 */
export async function downloadOrderPickingPdf(order: Order, opts?: OrderPdfOptions) {
  const logoImg = await loadLogoDataUrl();
  const businessName = opts?.businessName?.trim() || "Negocio";
  const printedAt = fmtDate(new Date().toISOString());

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  let y = LS_MARGIN;

  const logoSize = 12;
  let textLeft = LS_MARGIN;
  if (logoImg) {
    doc.addImage(logoImg, "PNG", LS_MARGIN, y - 1, logoSize, logoSize);
    textLeft = LS_MARGIN + logoSize + 3;
  }

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ClarivPack", textLeft, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Hoja de picking · barcodes separados para pistola", textLeft, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(businessName, LS_CONTENT_RIGHT, y + 3, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Impreso: ${printedAt}`, LS_CONTENT_RIGHT, y + 8, { align: "right" });

  y = LS_MARGIN + logoSize + 2;
  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.3);
  doc.line(LS_MARGIN, y, LS_CONTENT_RIGHT, y);
  y += 5;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(order.docNumber, LS_MARGIN, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const meta = [
    ORDER_STATUS_LABEL[order.status],
    `Alta ${fmtDate(order.createdAt)}`,
    order.docDate ? `Doc. ${order.docDate}` : null,
    `${order.lines.length} líneas`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, LS_MARGIN, y);
  y += 6;

  // Cabecera de columnas
  doc.setFillColor(37, 99, 235);
  doc.rect(LS_MARGIN, y, LS_CONTENT_RIGHT - LS_MARGIN, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("#", LS_MARGIN + 2, y + 4.8);
  doc.text("Ref / SKU", LS_MARGIN + 12, y + 4.8);
  doc.text("Producto", LS_MARGIN + 48, y + 4.8);
  doc.text("Ud", LS_MARGIN + 118, y + 4.8);
  doc.text("Código de barras (uno por fila · bien separados)", LS_MARGIN + 138, y + 4.8);
  y += 12;

  /** Altura de bloque por línea: barcode + etiqueta + aire para pistola. */
  const ROW_H = 42;
  /** Hueco blanco entre un código y el siguiente (anti-lectura del vecino). */
  const ROW_GAP = 10;
  const BAR_W = 130;
  const BAR_H = 18;
  const BAR_X = LS_MARGIN + 138;

  order.lines.forEach((line, idx) => {
    y = ensureLandscapeY(doc, y, ROW_H + ROW_GAP);
    const value = (line.barcode || line.reference).trim();
    const rowTop = y;

    // Franja de separación clara entre códigos (no pegados)
    if (idx > 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(LS_MARGIN, rowTop - ROW_GAP, LS_CONTENT_RIGHT - LS_MARGIN, ROW_GAP, "F");
      doc.setDrawColor(180, 180, 190);
      doc.setLineWidth(0.4);
      doc.line(LS_MARGIN, rowTop - ROW_GAP / 2, LS_CONTENT_RIGHT, rowTop - ROW_GAP / 2);
    }

    // Fondo suave del bloque (no del barcode: quiet zone blanca)
    doc.setFillColor(idx % 2 === 1 ? 248 : 252, idx % 2 === 1 ? 250 : 252, idx % 2 === 1 ? 252 : 253);
    doc.rect(LS_MARGIN, rowTop, BAR_X - LS_MARGIN - 4, ROW_H - 2, "F");

    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(idx + 1), LS_MARGIN + 2, rowTop + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const refLines = doc.splitTextToSize(line.reference || "—", 32);
    doc.text(refLines.slice(0, 2), LS_MARGIN + 12, rowTop + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const nameLines = doc.splitTextToSize(line.name || "—", 64);
    doc.text(nameLines.slice(0, 3), LS_MARGIN + 48, rowTop + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`×${line.quantity}`, LS_MARGIN + 118, rowTop + 10);

    // Zona barcode: fondo blanco + quiet zone amplia
    doc.setFillColor(255, 255, 255);
    doc.rect(BAR_X - 2, rowTop, BAR_W + 4, ROW_H - 2, "F");
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.3);
    doc.rect(BAR_X - 2, rowTop, BAR_W + 4, ROW_H - 2, "S");

    if (value) {
      try {
        const img = code128DataUrl(value, 56, { barWidth: 2.4, margin: 14 });
        doc.addImage(img, "PNG", BAR_X, rowTop + 2, BAR_W, BAR_H);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(value, BAR_X + BAR_W / 2, rowTop + BAR_H + 8, { align: "center" });
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(value, BAR_X, rowTop + 12);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("Sin código", BAR_X + 4, rowTop + 12);
    }

    y = rowTop + ROW_H + ROW_GAP;
  });

  drawLandscapeFooters(doc);
  doc.save(`picking-${order.docNumber.replace(/[^\w\-]+/g, "_")}.pdf`);
}

/** Descarga PDF según tipo: cierre (entrega) o picking (pistola). */
export async function downloadOrderPdf(order: Order, opts?: OrderPdfOptions) {
  if (opts?.kind === "picking") {
    return downloadOrderPickingPdf(order, opts);
  }
  return downloadOrderCierrePdf(order, opts);
}
