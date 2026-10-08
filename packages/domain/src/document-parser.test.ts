import { describe, expect, it } from "vitest";
import { parseDocumentOCR } from "./document-parser";

const CLEAN_OC = `
Empresa Falsa A
ORDEN DE COMPRA
FECHA: 15/01/2020
Número de Orden: OC 00005
VENDEDOR Empresa Falsa B
ENVIAR A Cliente Falso
ARTÍCULO # DESCRIPCIÓN Cantidad P/U TOTAL
78958 Producto X 2 10,00 € 20,00 €
14455 Producto T 5 50,00 € 250,00 €
66888 Producto H 1 200,00 € 200,00 €
Subtotal 570,00 €
21 % IVA 119,70 €
TOTAL 689,70 €
`;

const NOISY_OCR = `
ORDEN DE COMPRA Espot cn: 10200 i Ocomos E E Er Camel
Epresa Falsa A FECHA 15/01/2020 Numero de Orden: OC 00005
VENDEDOR Empresa Falsa B ENVIAR A Cliente Falso
ARTICULO # DESCRIPCION Cantidad P/U TOTAL
78958 Producto X 2 10.00 20.00
14455 Producto T 5 50.00 250.00
66888 Producto H 1 200.00 200.00
Subtotal 570.00 IVA 119.70 TOTAL 689.70
`;

const ALBARAN = `
ALBARÁN N° ALB-2026-118
Cliente: Tienda Centro
REF DESCRIPCION CANT BULTOS
MESA-01 Mesa roble 1 2
SILLA-22 Silla negra 4 1
`;

describe("parseDocumentOCR", () => {
  it("extrae 3 líneas y OC de una orden de compra limpia", () => {
    const doc = parseDocumentOCR(CLEAN_OC);
    expect(doc.documentType).toBe("orden_compra");
    expect(doc.documentNumber).toMatch(/OC\s*00005/i);
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
    expect(doc.lines[0].name).toMatch(/Producto X/i);
    expect(doc.lines[0].quantity).toBe(2);
    expect(doc.lines[1].quantity).toBe(5);
    expect(doc.lines[2].quantity).toBe(1);
  });

  it("aguanta OCR ruidoso sin inventar 10200 como artículo", () => {
    const doc = parseDocumentOCR(NOISY_OCR);
    expect(doc.documentNumber).toMatch(/OC\s*00005/i);
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toContain("78958");
    expect(refs).toContain("14455");
    expect(refs).toContain("66888");
    expect(refs).not.toContain("10200");
    expect(refs).not.toContain("00005");
  });

  it("lee albarán con refs alfanuméricas", () => {
    const doc = parseDocumentOCR(ALBARAN);
    expect(doc.documentType).toBe("albaran");
    expect(doc.documentNumber).toMatch(/ALB-2026-118/i);
    expect(doc.lines).toHaveLength(2);
    expect(doc.lines[0].reference).toBe("MESA-01");
    expect(doc.lines[1].quantity).toBe(4);
  });
});
