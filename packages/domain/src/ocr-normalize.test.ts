import { describe, expect, it } from "vitest";
import { parseAnyDocument, parseWithProfile } from "./document-profiles";
import {
  extractDocumentDate,
  normalizeOcrCode,
  normalizeOcrPrice,
} from "./ocr-normalize";
import { FIXTURE_FASHION } from "./fixtures/albaranes";

/** OCR ruidoso: Bufanda deformada + resto limpio */
const FIXTURE_FASHION_OCR_DIRTY = `
ALBARÁN
Empresa SL
16/12/2020
AL-2020-0001
SKU000002 - Pantalón Génova 20 15,00€
SKU000008 - Abrigo Polo Norte 10 80,00€
SKUO 00009 - Bufanda Pirenaica 40] 700€
SKU000001 - Jersey Navidad 10 12,00€
SKU000007 - Calcetines Sevilla 60 5,00€
TOTAL 1.815,00 €
`;

describe("ocr-normalize", () => {
  it("normaliza códigos OCR (O→0, espacios)", () => {
    expect(normalizeOcrCode("SKUO 00009")).toBe("SKU000009");
    expect(normalizeOcrCode("SKU000009")).toBe("SKU000009");
  });

  it("normaliza precios sin coma (700€ → 7.00)", () => {
    expect(normalizeOcrPrice("700€")).toBe("7.00");
    expect(normalizeOcrPrice("7,00")).toBe("7.00");
  });

  it("extrae fecha por forma", () => {
    expect(extractDocumentDate("Fecha: 16/12/2020")).toBe("2020-12-16");
    expect(extractDocumentDate("Fecha: 09 Octubre 2026")).toBe("2026-10-09");
  });

  it("fashion OCR dirty recupera Bufanda SKU000009", () => {
    const doc = parseWithProfile(FIXTURE_FASHION_OCR_DIRTY);
    expect(doc.profile).toBe("fashion_sku");
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toEqual(expect.arrayContaining(["SKU000009"]));
    const bufanda = doc.lines.find((l) => l.reference === "SKU000009");
    expect(bufanda?.name).toMatch(/Bufanda/i);
    expect(bufanda?.quantity).toBe(40);
    expect(bufanda?.unitPrice).toBe("7.00");
    expect(doc.documentDate).toBe("2020-12-16");
    expect(doc.documentNumber).toMatch(/AL-2020-0001/i);
  });

  it("fashion limpio sigue con 5 SKUs + fecha", () => {
    const doc = parseAnyDocument(FIXTURE_FASHION);
    expect(doc.lines).toHaveLength(5);
    expect(doc.documentDate).toBe("2020-12-16");
  });
});
