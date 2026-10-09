import { describe, expect, it } from "vitest";
import {
  alignToSlots,
  buildColumnRowsFromTexts,
  extractDescLines,
  extractQtyPriceLines,
  extractSkuLines,
  parseColumnBundle,
} from "./column-merge";
import { FIXTURE_ALB_CODIGO_OCR } from "./fixtures/albaranes";
import { FIXTURE_OC_COLUMNS_SKEW } from "./fixtures/oc-columns-skew";

describe("column OCR merge (OC real)", () => {
  it("saca refs desde columna SKU ruidosa", () => {
    expect(extractSkuLines("LL\nARTIC!\n78958\n14455\n66888\n")).toEqual([
      "78958",
      "14455",
      "66888",
    ]);
    expect(extractSkuLines("_\nARTÍCU\n78938\n14455\n66888\n")).toEqual([
      "78938",
      "14455",
      "66888",
    ]);
  });

  it("conserva prefijo ART-0012 (no solo 0012)", () => {
    expect(extractSkuLines("Código\nART-0012\nART-0054\nCBL-1020\nSOP-9921\n")).toEqual([
      "ART-0012",
      "ART-0054",
      "CBL-1020",
      "SOP-9921",
    ]);
  });

  it("no inventa PROD con direcciones; usa alb_codigo del fullText", () => {
    const doc = parseColumnBundle({
      headerText: "ALBARÁN DE ENTREGA\nALB-2026-0842\n",
      skuText: "Lugar de Entrega\n",
      descText: "Lugar de Entrega (Destinatario)\nComercializadora del Sur, S.A.\nC/ Gran Vía, 12, Planta Baja\n",
      numsText: "",
      fullText: FIXTURE_ALB_CODIGO_OCR,
    });
    expect(doc.lines.map((l) => l.reference)).toEqual([
      "ART-0012",
      "ART-0054",
      "CBL-1020",
      "SOP-9921",
    ]);
    expect(doc.lines[0].name).toMatch(/Monitores/i);
    expect(doc.lines[0].quantity).toBe(10);
    expect(doc.lines.every((l) => !/^PROD-/i.test(l.reference))).toBe(true);
  });

  it("saca nombres Producto X/T/H", () => {
    expect(
      extractDescLines("ULO it DESCRIPCIÓN\nProducto X\nProducto T\nProducto H\n"),
    ).toEqual(["Producto X", "Producto T", "Producto H"]);
  });

  it("parsea qty+precio ruidoso", () => {
    const rows = extractQtyPriceLines("tidad PU\n2] 10,00\n5 50,00\n1 200.00\n");
    expect(rows[0]).toEqual({ quantity: 2, unitPrice: "10.00" });
    expect(rows[1].quantity).toBe(5);
    expect(rows[2].quantity).toBe(1);
  });

  it("arma el pedido completo como en la OC de ejemplo", () => {
    const doc = parseColumnBundle({
      headerText: "ORDEN DE COMPRA\nFECHA: 15/01/2020\nNumero de Orden: OC 00005\n",
      skuText: "ARTIC!\n78958\n14455\n66888\n",
      descText: "ULO # DESCRIPCIÓN\nProducto X\nProducto T\nProducto H\n",
      numsText: "Cantidad P/U\n2] 10,00\n5 50,00\n1 200,00\n",
      fullText: "ORDEN DE COMPRA basura sin lineas",
    });
    expect(doc.documentNumber).toMatch(/OC\s*00005/i);
    expect(doc.lines).toHaveLength(3);
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
    expect(doc.lines.map((l) => l.name)).toEqual(["Producto X", "Producto T", "Producto H"]);
    expect(doc.lines.map((l) => l.quantity)).toEqual([2, 5, 1]);
    expect(doc.lines.every((l) => l.packages === 0)).toBe(true);
  });

  it("expande PX/PT/PH del OCR ruidoso", () => {
    const doc = parseColumnBundle({
      headerText: "OC 00005",
      skuText: "78958\n14455\n66888\n",
      descText: "PX\nPT\nPH\n",
      numsText: "",
      fullText: "",
    });
    expect(doc.lines.map((l) => l.name)).toEqual(["Producto X", "Producto T", "Producto H"]);
  });

  it("alignToSlots recorta o rellena", () => {
    expect(alignToSlots(3, ["a", "b", "c", "d"])).toEqual(["a", "b", "c"]);
    expect(alignToSlots(3, ["a", "b"])).toEqual(["a", "b", undefined]);
  });

  it("rows afines no cruzan SKU/nombre/qty", () => {
    const doc = parseColumnBundle({
      headerText: "OC 00005",
      skuText: "",
      descText: "",
      numsText: "",
      fullText: "OC 00005",
      rows: [
        { sku: "78958", desc: "Producto X", nums: "2] 10,00" },
        { sku: "14455", desc: "Producto T", nums: "5 50,00" },
        { sku: "66888", desc: "Producto H", nums: "1 200,00" },
      ],
    });
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
    expect(doc.lines.map((l) => l.name)).toEqual(["Producto X", "Producto T", "Producto H"]);
    expect(doc.lines.map((l) => l.quantity)).toEqual([2, 5, 1]);
  });

  it("blobs con desc extra: alinea a SKUs sin cruzar", () => {
    const doc = parseColumnBundle(FIXTURE_OC_COLUMNS_SKEW);
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
    expect(doc.lines.map((l) => l.name)).toEqual(["Producto X", "Producto T", "Producto H"]);
    expect(doc.lines.map((l) => l.quantity)).toEqual([2, 5, 1]);
  });

  it("buildColumnRowsFromTexts ancla a SKUs", () => {
    const rows = buildColumnRowsFromTexts(
      "78958\n14455\n66888",
      "Producto X\nProducto T\nProducto H\nnota",
      "2] 10,00\n5 50,00\n1 200,00",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].sku).toContain("78958");
    expect(rows[2].desc).toMatch(/Producto H/i);
  });
});
