import { describe, expect, it } from "vitest";
import { detectProfile, parseWithProfile } from "./document-profiles";
import {
  FIXTURE_EASYWMS,
  FIXTURE_FASHION,
  FIXTURE_OC,
  FIXTURE_PICKING_LIST,
  FIXTURE_TOSMA,
} from "./fixtures/albaranes";
import { FIXTURE_TOSMA_OCR_DIRTY } from "./fixtures/tosma-ocr-dirty";
import { parseDocumentOCR } from "./document-parser";

describe("document profiles", () => {
  it("detecta easywms y saca 3 líneas + DL_004", () => {
    expect(detectProfile(FIXTURE_EASYWMS)).toBe("easywms");
    const doc = parseWithProfile(FIXTURE_EASYWMS);
    expect(doc.documentNumber).toMatch(/DL_004/i);
    expect(doc.lines.map((l) => l.reference)).toEqual(["086872", "011134", "000357"]);
    expect(doc.lines.map((l) => l.quantity)).toEqual([6, 10, 1]);
    expect(doc.lines[0].name).toMatch(/CALZADO/i);
  });

  it("detecta picking_list y SKUs con qty", () => {
    expect(detectProfile(FIXTURE_PICKING_LIST)).toBe("picking_list");
    const doc = parseWithProfile(FIXTURE_PICKING_LIST);
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toContain("10031");
    expect(refs).toContain("20054");
    expect(refs).toContain("20031");
    expect(doc.lines.length).toBeGreaterThanOrEqual(3);
  });

  it("detecta fashion_sku y 5 SKUs", () => {
    expect(detectProfile(FIXTURE_FASHION)).toBe("fashion_sku");
    const doc = parseWithProfile(FIXTURE_FASHION);
    expect(doc.documentNumber).toMatch(/AL-2020-0001/i);
    expect(doc.lines).toHaveLength(5);
    expect(doc.lines[0].reference).toBe("SKU000002");
    expect(doc.lines[0].quantity).toBe(20);
    expect(doc.lines[0].name).toMatch(/Pantalón|Pantalon/i);
  });

  it("detecta tosma_cod y líneas de fontanería", () => {
    expect(detectProfile(FIXTURE_TOSMA)).toBe("tosma_cod");
    const doc = parseWithProfile(FIXTURE_TOSMA);
    expect(doc.documentNumber).toMatch(/A\s*\/\s*129/i);
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toContain("000113");
    expect(refs).toContain("000107");
    expect(refs).toContain("97");
    expect(doc.lines.find((l) => l.reference === "000113")?.quantity).toBe(20);
  });

  it("Tosma OCR sucio recupera códigos y cantidades", () => {
    expect(detectProfile(FIXTURE_TOSMA_OCR_DIRTY)).toBe("tosma_cod");
    const doc = parseWithProfile(FIXTURE_TOSMA_OCR_DIRTY);
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toEqual(expect.arrayContaining(["000113", "77", "00120", "000107", "97"]));
    expect(doc.lines.find((l) => l.reference === "000113")?.quantity).toBe(20);
    expect(doc.lines.find((l) => l.reference === "77")?.quantity).toBe(12);
    expect(doc.lines.find((l) => l.reference === "000107")?.quantity).toBe(21);
    expect(doc.lines.find((l) => l.reference === "97")?.quantity).toBe(3);
  });

  it("oc_tabla sigue funcionando vía parseDocumentOCR", () => {
    expect(detectProfile(FIXTURE_OC)).toBe("oc_tabla");
    const doc = parseDocumentOCR(FIXTURE_OC);
    expect(doc.documentNumber).toMatch(/OC\s*00005/i);
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
  });

  it("OC ruidoso tipo columnas rotas saca 3 productos con nombre", () => {
    const noisy = `
ORDEN DE COMPRA
Numero de Orden: OC 00005
ARTICU
CULO
78938
14455
66888
PX
PT
PH
2] 10,00
5 50,00
1 200,00
TOTAL 689,70
`;
    const doc = parseWithProfile(noisy);
    expect(doc.profile).toBe("oc_tabla");
    expect(doc.documentNumber).toMatch(/OC\s*00005/i);
    expect(doc.lines.length).toBeGreaterThanOrEqual(3);
    expect(doc.lines.map((l) => l.name).filter(Boolean).length).toBeGreaterThanOrEqual(2);
    expect(doc.lines.some((l) => /Producto/i.test(l.name ?? ""))).toBe(true);
  });
});
