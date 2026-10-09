import { describe, expect, it } from "vitest";
import { auditLine, auditLines, needsLineReview } from "./line-audit";

describe("line-audit", () => {
  it("marca fecha y teléfono como sospechosos", () => {
    const date = auditLine({
      reference: "28042023",
      name: null,
      quantity: 1,
      packages: 0,
      unitPrice: null,
      confidence: 0.8,
    });
    expect(date.suspicious).toBe(true);
    expect(date.warnings.some((w) => w.code === "date_like_ref")).toBe(true);

    const phone = auditLine({
      reference: "12124551",
      name: null,
      quantity: 1,
      packages: 0,
      unitPrice: null,
      confidence: 0.8,
    });
    expect(phone.warnings.some((w) => w.code === "phone_like_ref")).toBe(true);
  });

  it("qty como ref sin nombre", () => {
    const a = auditLine({
      reference: "12",
      name: null,
      quantity: 1,
      packages: 0,
      unitPrice: null,
      confidence: 0.6,
    });
    expect(a.warnings.some((w) => w.code === "qty_like_ref")).toBe(true);
    expect(a.suspicious).toBe(true);
  });

  it("línea buena no es sospechosa", () => {
    const a = auditLine({
      reference: "Item12",
      name: "Chocolate cookies",
      quantity: 1,
      packages: 0,
      unitPrice: null,
      confidence: 0.9,
    });
    expect(a.suspicious).toBe(false);
  });

  it("needsLineReview si hay basura en el lote", () => {
    const lines = auditLines([
      {
        reference: "78958",
        name: "Producto X",
        quantity: 2,
        packages: 0,
        unitPrice: "10.00",
        confidence: 0.9,
      },
      {
        reference: "28042023",
        name: null,
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.5,
      },
    ]);
    expect(needsLineReview(lines)).toBe(true);
  });
});
