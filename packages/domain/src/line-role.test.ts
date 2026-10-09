import { describe, expect, it } from "vitest";
import {
  classifyText,
  filterProductLines,
  isProductLine,
  looksLikeArticleSku,
  productScore,
} from "./line-role";
import type { DocumentLine } from "./document-parser";

function line(ref: string, name: string | null = null, qty = 1): DocumentLine {
  return {
    reference: ref,
    name,
    quantity: qty,
    packages: 0,
    unitPrice: null,
    confidence: 0.8,
  };
}

describe("line-role structural classifier", () => {
  it("SKU shapes son product", () => {
    expect(looksLikeArticleSku("ART-0012")).toBe(true);
    expect(looksLikeArticleSku("CBL-1020")).toBe(true);
    expect(looksLikeArticleSku("78958")).toBe(true);
    expect(looksLikeArticleSku("Item12")).toBe(true);
    expect(looksLikeArticleSku("SKU000002")).toBe(true);
    expect(classifyText("XX-1234").role).toBe("product");
  });

  it("teléfono genérico (densidad de dígitos), no keyword de marca", () => {
    expect(classifyText("+34 611 222 333").role).toBe("phone");
    expect(classifyText("ABCCONTACTO611222333").role).toBe("phone");
    expect(isProductLine(line("ABCCONTACTO611222333"))).toBe(false);
  });

  it("dirección: tipología de vía o CP + localidad inventada", () => {
    expect(classifyText("C/ Mayor 12, Planta Baja").role).toBe("address");
    expect(classifyText("Av. Industria 45").role).toBe("address");
    // Ciudad inventada — no hay lista de ciudades
    expect(classifyText("08210 Viladecans, Catalunya").role).toBe("address");
    expect(classifyText("35001 Las Palmas").role).toBe("address");
    expect(isProductLine(line("08210 Viladecans, Catalunya"))).toBe(false);
  });

  it("prose: párrafo largo o OCR pegado sin espacios", () => {
    expect(
      classifyText(
        "Entregar por el acceso lateral en horario de manana y revisar la mercancia antes de firmar",
      ).role,
    ).toBe("prose");
    expect(
      classifyText("ENTREGARPORELMUELLEDECARGATRASEROHORARIORECEPCION09001400").role,
    ).toBe("prose");
    expect(
      isProductLine(line("ENTREGARPORELMUELLEDECARGATRASEROHORARIORECEPCION09001400")),
    ).toBe(false);
  });

  it("meta: nº documento, NIF, página", () => {
    expect(classifyText("ALB-2026-0842").role).toBe("meta");
    expect(classifyText("PED-9931-X").role).toBe("meta");
    expect(classifyText("B-12345678").role).toBe("meta");
    expect(classifyText("Página 1").role).toBe("meta");
  });

  it("línea producto real supera umbral", () => {
    const good = line("ART-0012", "Monitores LED 24 Resolut Pro", 10);
    expect(productScore(good)).toBeGreaterThanOrEqual(0.65);
    expect(isProductLine(good)).toBe(true);
  });

  it("filterProductLines deja solo productos", () => {
    const kept = filterProductLines([
      line("ART-0012", "Monitores LED", 10),
      line("CBL-1020", "Cables HDMI", 50),
      line("ABCCONTACTO611222333"),
      line("08210 Viladecans"),
      line("ENTREGARPORELMUELLEDECARGATRASEROHORARIORECEPCION09001400"),
      line("ALB-2026-0842"),
    ]);
    expect(kept.map((l) => l.reference)).toEqual(["ART-0012", "CBL-1020"]);
  });
});
