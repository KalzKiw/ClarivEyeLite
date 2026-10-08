import type { Order } from "@clariveye-lite/domain";
import { ORDER_STATUS_LABEL, encodeOrderToken } from "@clariveye-lite/domain";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { code128DataUrl, qrDataUrl } from "@/lib/order-barcode";

export async function downloadOrderPdf(order: Order) {
  const token = encodeOrderToken(order.id);
  const barcodeImg = code128DataUrl(token, 48);
  const qrImg = await qrDataUrl(token, 110);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ClarivEye Lite", margin, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Albarán / Hoja de picking", margin, 25);

  doc.setFontSize(10);
  doc.text(`Documento: ${order.docNumber}`, margin, 36);
  doc.text(`Estado: ${ORDER_STATUS_LABEL[order.status]}`, margin, 42);
  doc.text(`Alta: ${new Date(order.createdAt).toLocaleString()}`, margin, 48);
  doc.text(`Líneas: ${order.lines.length}`, margin, 54);

  // Code128
  doc.addImage(barcodeImg, "PNG", margin, 60, 110, 18);
  doc.setFontSize(8);
  doc.text(token, margin, 82);
  doc.text(order.docNumber, margin, 86);

  // QR
  doc.addImage(qrImg, "PNG", 150, 58, 42, 42);

  autoTable(doc, {
    startY: 94,
    head: [["Ref", "Nombre", "Cant.", "Bultos", "Barcode"]],
    body: order.lines.map((line) => [
      line.reference,
      line.name || "—",
      String(line.quantity),
      String(line.packages),
      line.barcode || line.reference,
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  let y = finalY + 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Barcodes de línea (picking rápido)", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");

  for (const line of order.lines) {
    const value = (line.barcode || line.reference).trim();
    if (!value || y > 270) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      if (!value) continue;
    }
    try {
      const img = code128DataUrl(value, 28);
      doc.setFontSize(8);
      doc.text(`${line.reference} · x${line.quantity}`, margin, y);
      y += 2;
      doc.addImage(img, "PNG", margin, y, 70, 10);
      y += 14;
    } catch {
      /* valor no válido para Code128 */
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text("ClarivEye Lite · Escanea CEL1 o el QR para abrir el pedido en Picking", margin, 285);
  doc.save(`pedido-${order.docNumber.replace(/[^\w\-]+/g, "_")}.pdf`);
}
