import type { Order, OrderLine } from "@clariveye-lite/domain";
import { ORDER_STATUS_LABEL, encodeOrderToken } from "@clariveye-lite/domain";
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

export type OrderPdfOptions = {
  businessName?: string;
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

function checkbox(picked: boolean): string {
  // ASCII: Helvetica de jsPDF no dibuja bien ☐/☑
  return picked ? "[x]" : "[ ]";
}

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
}

function drawPageFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, FOOTER_Y - 4, CONTENT_RIGHT, FOOTER_Y - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      "ClarivEye Lite · Documento operativo · No sustituye factura fiscal",
      MARGIN,
      FOOTER_Y,
    );
    doc.text(`Pág. ${i}/${total}`, CONTENT_RIGHT, FOOTER_Y, { align: "right" });
  }
  doc.setTextColor(...INK);
}

function drawSignatures(doc: jsPDF, y: number): number {
  const need = 42;
  if (y + need > FOOTER_Y - 8) {
    doc.addPage();
    y = MARGIN + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("Conformidad", MARGIN, y);
  y += 6;

  const colW = (CONTENT_RIGHT - MARGIN - 8) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 8;

  for (const [x, label] of [
    [leftX, "Preparador"] as const,
    [rightX, "Receptor"] as const,
  ]) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Nombre / firma", x, y + 5);
    doc.setDrawColor(160, 160, 170);
    doc.setLineWidth(0.3);
    doc.line(x, y + 22, x + colW, y + 22);
    doc.setTextColor(...MUTED);
    doc.text("Fecha _______________", x, y + 28);
    doc.setTextColor(...INK);
  }

  return y + 34;
}

function ensureY(doc: jsPDF, y: number, need: number): number {
  if (y + need <= FOOTER_Y - 10) return y;
  doc.addPage();
  return MARGIN + 6;
}

/** Logo oficial ClarivEye (mismo asset que ClarivEye Oficial / privado). */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/icons/clariv-eye.png");
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

function drawTotalsBox(
  doc: jsPDF,
  y: number,
  rows: Array<{ label: string; value: string; emphasize?: boolean }>,
): number {
  const boxW = 78;
  const rowH = 8;
  const padX = 5;
  const padY = 4;
  const boxH = padY * 2 + rows.length * rowH;
  const boxX = CONTENT_RIGHT - boxW;

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");

  rows.forEach((row, i) => {
    const rowMidY = y + padY + i * rowH + rowH / 2 + 1.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(row.label, boxX + padX, rowMidY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(row.emphasize ? 10 : 9);
    doc.setTextColor(...(row.emphasize ? PRIMARY : INK));
    doc.text(row.value, boxX + boxW - padX, rowMidY, { align: "right" });
  });

  return y + boxH + 6;
}

/** PDF A4: orden de picking + comprobante del pedido. */
export async function downloadOrderPdf(order: Order, opts?: OrderPdfOptions) {
  const token = encodeOrderToken(order.id);
  const barcodeImg = code128DataUrl(token, 48);
  const qrImg = await qrDataUrl(token, 110);
  const logoImg = await loadLogoDataUrl();
  const businessName = opts?.businessName?.trim() || "Negocio";
  const printedAt = fmtDate(new Date().toISOString());

  const totalQty = order.lines.reduce((s, l) => s + l.quantity, 0);
  const totalPkg = order.lines.reduce((s, l) => s + l.packages, 0);
  const pickedCount = order.lines.filter((l) => l.picked).length;
  const amounts = order.lines.map(lineAmount);
  const hasPrices = amounts.some((a) => a !== null);
  const totalAmount = hasPrices
    ? amounts.reduce<number>((s, a) => s + (a ?? 0), 0)
    : null;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // —— Cabecera (sin franja azul: ahorro de tinta; el azul solo en tablas) ——
  const logoSize = 22;
  let textLeft = MARGIN;
  if (logoImg) {
    // Logo oficial ClarivEye (caja + wordmark) sobre blanco
    doc.addImage(logoImg, "PNG", MARGIN, y - 2, logoSize, logoSize);
    textLeft = MARGIN + logoSize + 5;
  }

  // El PNG ya lleva “CLARIVEYE”; al lado solo producto + tipo de doc
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Lite", textLeft, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Orden de picking / Comprobante", textLeft, y + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(businessName, CONTENT_RIGHT, y + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Impreso: ${printedAt}`, CONTENT_RIGHT, y + 11, { align: "right" });

  y = MARGIN + logoSize + 4;
  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y, CONTENT_RIGHT, y);
  y += 8;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(order.docNumber, MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const metaBits = [
    `Estado: ${ORDER_STATUS_LABEL[order.status]}`,
    `Alta: ${fmtDate(order.createdAt)}`,
  ];
  if (order.docDate) metaBits.push(`Doc.: ${order.docDate}`);
  if (order.deliveredAt) metaBits.push(`Entrega: ${fmtDate(order.deliveredAt)}`);
  doc.text(metaBits.join("  ·  "), MARGIN, y);
  y += 5;
  if (order.notes?.trim()) {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(`Notas: ${order.notes.trim()}`, CONTENT_RIGHT - MARGIN);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 3.5 + 2;
    doc.setFont("helvetica", "normal");
  }

  // —— Códigos escaneables ——
  y = Math.max(y + 2, 52);
  doc.setDrawColor(230, 230, 235);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(MARGIN, y, CONTENT_RIGHT - MARGIN, 48, 2, 2, "FD");

  doc.addImage(barcodeImg, "PNG", MARGIN + 4, y + 6, 100, 16);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(token, MARGIN + 4, y + 28);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(order.docNumber, MARGIN + 4, y + 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("Escanea CEL1 o el QR para abrir en Picking", MARGIN + 4, y + 40);

  doc.addImage(qrImg, "PNG", CONTENT_RIGHT - 44, y + 4, 40, 40);

  y += 54;

  // —— Resumen ——
  const boxW = (CONTENT_RIGHT - MARGIN - 9) / 4;
  const summary = [
    { label: "Líneas", value: String(order.lines.length) },
    { label: "Unidades", value: String(totalQty) },
    { label: "Bultos", value: String(totalPkg) },
    { label: "Preparadas", value: `${pickedCount}/${order.lines.length}` },
  ];
  summary.forEach((item, i) => {
    const x = MARGIN + i * (boxW + 3);
    doc.setFillColor(245, 247, 255);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, 14, 1.5, 1.5, "FD");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, x + boxW / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(item.value, x + boxW / 2, y + 11, { align: "center" });
  });
  y += 20;

  // —— Tabla ——
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Líneas del pedido", MARGIN, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [["", "#", "Ref", "Descripción", "Ud", "Bultos", "P.unit", "Importe", "Código"]],
    body: order.lines.map((line, idx) => {
      const unit = parseUnitPrice(line.unitPrice);
      const amount = lineAmount(line);
      return [
        checkbox(line.picked),
        String(idx + 1),
        line.reference,
        line.name || "—",
        String(line.quantity),
        String(line.packages),
        unit !== null ? fmtMoney(unit) : line.unitPrice?.trim() || "—",
        amount !== null ? fmtMoney(amount) : "—",
        line.barcode || line.reference,
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 1.6, textColor: INK, overflow: "linebreak" },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 7, halign: "center" },
      2: { cellWidth: 24 },
      3: { cellWidth: 42 },
      4: { cellWidth: 10, halign: "right" },
      5: { cellWidth: 12, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 20, halign: "right" },
      8: { cellWidth: 22 },
    },
    didParseCell(data) {
      if (data.section !== "body") return;
      const line = order.lines[data.row.index];
      if (line?.picked) {
        data.cell.styles.textColor = [140, 140, 148];
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = lastTableY(doc) + 8;

  // —— Totales (etiqueta izq + valor dcha, filas alineadas) ——
  const totalRows: Array<{ label: string; value: string; emphasize?: boolean }> = [
    { label: "Total unidades", value: String(totalQty) },
    { label: "Total bultos", value: String(totalPkg) },
  ];
  if (hasPrices && totalAmount !== null) {
    totalRows.push({ label: "Importe", value: fmtMoney(totalAmount), emphasize: true });
  }
  y = ensureY(doc, y, 8 + totalRows.length * 8 + 10);
  y = drawTotalsBox(doc, y, totalRows);

  // —— Anexo barcodes compacto ——
  if (order.lines.length > 0) {
    y = ensureY(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("Picking rápido — barcodes de línea", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    for (const line of order.lines) {
      const value = (line.barcode || line.reference).trim();
      y = ensureY(doc, y, 16);
      // Fila: checkbox + ref/qty + barcode
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(`${checkbox(line.picked)}  ${line.reference}  ·  x${line.quantity}`, MARGIN, y + 3);
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      const desc = (line.name || "").slice(0, 40);
      if (desc) doc.text(desc, MARGIN + 2, y + 7);

      if (value) {
        try {
          const img = code128DataUrl(value, 22);
          doc.addImage(img, "PNG", 110, y - 1, 72, 9);
          doc.setFontSize(6);
          doc.text(value, 110, y + 11);
        } catch {
          doc.setFontSize(7);
          doc.setTextColor(...MUTED);
          doc.text(value, 110, y + 4);
        }
      }
      y += 15;
    }
  }

  // —— Firmas ——
  y = drawSignatures(doc, y + 4);

  if (order.deliveryNotes?.trim()) {
    y = ensureY(doc, y, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const dn = doc.splitTextToSize(`Notas de entrega: ${order.deliveryNotes.trim()}`, CONTENT_RIGHT - MARGIN);
    doc.text(dn, MARGIN, y);
  }

  drawPageFooters(doc);
  doc.save(`pedido-${order.docNumber.replace(/[^\w\-]+/g, "_")}.pdf`);
}
