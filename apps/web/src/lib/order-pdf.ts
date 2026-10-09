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

/** PDF A4: orden de picking + comprobante del pedido. */
export async function downloadOrderPdf(order: Order, opts?: OrderPdfOptions) {
  const token = encodeOrderToken(order.id);
  const barcodeImg = code128DataUrl(token, 40);
  const qrImg = await qrDataUrl(token, 96);
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

  // —— Cabecera compacta (sin franja azul) ——
  const logoSize = 16;
  let textLeft = MARGIN;
  if (logoImg) {
    doc.addImage(logoImg, "PNG", MARGIN, y - 1, logoSize, logoSize);
    textLeft = MARGIN + logoSize + 4;
  }

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Lite", textLeft, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Orden de picking / Comprobante", textLeft, y + 9);
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

  // Doc + meta + resumen en texto (sin KPIs)
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(order.docNumber, MARGIN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const metaBits = [
    ORDER_STATUS_LABEL[order.status],
    `Alta ${fmtDate(order.createdAt)}`,
    `${order.lines.length} líneas`,
    `${totalQty} uds`,
    `${totalPkg} bultos`,
    `${pickedCount}/${order.lines.length} prep.`,
  ];
  if (order.docDate) metaBits.splice(1, 0, `Doc. ${order.docDate}`);
  if (hasPrices && totalAmount !== null) metaBits.push(fmtMoney(totalAmount));
  doc.text(metaBits.join("  ·  "), MARGIN, y);
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

  // —— Códigos escaneables (compactos) ——
  y += 2;
  const codeH = 28;
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, y, CONTENT_RIGHT - MARGIN, codeH, 1.5, 1.5, "S");
  doc.addImage(barcodeImg, "PNG", MARGIN + 3, y + 4, 95, 12);
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${token}  ·  Escanea CEL1 / QR → Picking`, MARGIN + 3, y + 22);
  doc.addImage(qrImg, "PNG", CONTENT_RIGHT - 30, y + 2, 24, 24);
  y += codeH + 5;

  // —— Tabla (empieza pronto; sin título grande ni KPIs) ——
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
    styles: { fontSize: 7, cellPadding: 1.1, textColor: INK, overflow: "linebreak" },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 6, halign: "center" },
      2: { cellWidth: 24 },
      3: { cellWidth: 44 },
      4: { cellWidth: 10, halign: "right" },
      5: { cellWidth: 12, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 20, halign: "right" },
      8: { cellWidth: 21 },
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

  y = lastTableY(doc) + 4;

  // Totales en una sola línea (sin caja KPI)
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

  // —— Anexo barcodes (filas más densas) ——
  if (order.lines.length > 0) {
    y = ensureY(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text("Picking rápido", MARGIN, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");

    for (const line of order.lines) {
      const value = (line.barcode || line.reference).trim();
      y = ensureY(doc, y, 11);
      doc.setFontSize(7.5);
      doc.setTextColor(...INK);
      doc.text(
        `${checkbox(line.picked)} ${line.reference} · x${line.quantity}${line.name ? ` · ${line.name.slice(0, 28)}` : ""}`,
        MARGIN,
        y + 2.5,
      );
      if (value) {
        try {
          const img = code128DataUrl(value, 18);
          doc.addImage(img, "PNG", 118, y - 1, 64, 7);
        } catch {
          doc.setFontSize(6.5);
          doc.setTextColor(...MUTED);
          doc.text(value, 118, y + 2.5);
        }
      }
      y += 10;
    }
  }

  // —— Firmas ——
  y = drawSignatures(doc, y + 2);

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
