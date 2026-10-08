import { describe, expect, it } from "vitest";
import {
  extractDescLines,
  extractQtyPriceLines,
  extractSkuLines,
  parseColumnBundle,
} from "./column-merge";

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
});
