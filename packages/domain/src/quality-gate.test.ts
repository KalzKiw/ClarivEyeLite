import { describe, expect, it } from "vitest";
import {
  cleanLines,
  extractAssistedCandidates,
  isJunkContent,
  isJunkReference,
  namedLineRatio,
  passesQualityGate,
  scoreParseResult,
} from "./quality-gate";
import type { DocumentParseResult } from "./document-parser";

function doc(lines: DocumentParseResult["lines"], extra?: Partial<DocumentParseResult>): DocumentParseResult {
  return {
    documentNumber: null,
    documentType: "albaran",
    lines,
    raw_text: "",
    ...extra,
  };
}

describe("quality-gate", () => {
  it("rechaza 1 línea basura", () => {
    expect(
      passesQualityGate(
        doc([{ reference: "TOTAL", name: null, quantity: 1, packages: 0, unitPrice: null, confidence: 0.5 }]),
      ),
    ).toBe(false);
  });

  it("acepta ≥2 refs sólidas", () => {
    const d = doc([
      { reference: "Item12", name: "Cookies", quantity: 1, packages: 0, unitPrice: null, confidence: 0.9 },
      { reference: "Item02", name: "Sauce", quantity: 1, packages: 0, unitPrice: null, confidence: 0.9 },
    ]);
    expect(passesQualityGate(d)).toBe(true);
    expect(scoreParseResult(d)).toBeGreaterThan(4);
  });

  it("acepta 1 Item con nombre", () => {
    expect(
      passesQualityGate(
        doc([
          {
            reference: "Item12",
            name: "Chocolate cookies",
            quantity: 1,
            packages: 0,
            unitPrice: null,
            confidence: 0.9,
          },
        ]),
      ),
    ).toBe(true);
  });

  it("extrae candidatos asistidos", () => {
    const c = extractAssistedCandidates("Item12 Chocolate 1 [UN]\n000113 20.00 48.83");
    expect(c.some((x) => x.reference === "Item12")).toBe(true);
    expect(c.some((x) => x.reference === "000113")).toBe(true);
  });

  it("rechaza ≥2 refs sin nombre (éxito vacío)", () => {
    const d = doc([
      { reference: "78958", name: null, quantity: 1, packages: 0, unitPrice: null, confidence: 0.8 },
      { reference: "14455", name: null, quantity: 1, packages: 0, unitPrice: null, confidence: 0.8 },
      { reference: "66888", name: null, quantity: 1, packages: 0, unitPrice: null, confidence: 0.8 },
    ]);
    expect(namedLineRatio(d)).toBe(0);
    expect(passesQualityGate(d)).toBe(false);
  });

  it("acepta mayoría con nombre aunque alguna línea vaya sin él", () => {
    const d = doc([
      { reference: "78958", name: "Producto X", quantity: 2, packages: 0, unitPrice: "10.00", confidence: 0.9 },
      { reference: "14455", name: "Producto T", quantity: 5, packages: 0, unitPrice: "50.00", confidence: 0.9 },
      { reference: "66888", name: null, quantity: 1, packages: 0, unitPrice: null, confidence: 0.7 },
    ]);
    expect(namedLineRatio(d)).toBeGreaterThanOrEqual(0.5);
    expect(passesQualityGate(d)).toBe(true);
  });

  it("limpia teléfono/CP/observaciones pegadas del OCR", () => {
    expect(isJunkReference("TLFCONTACTO34600000000")).toBe(true);
    expect(isJunkContent("41001 Sevilla, España")).toBe(true);
    expect(
      isJunkContent(
        "ENTREGARPORELMUELLEDECARGATRASEROHORARIODERECEPCINDE0900A1400HLAMERCANCADEBE",
      ),
    ).toBe(true);
    expect(isJunkReference("ART-0012")).toBe(false);

    const cleaned = cleanLines([
      {
        reference: "ART-0012",
        name: "Monitores LED",
        quantity: 10,
        packages: 10,
        unitPrice: null,
        confidence: 0.9,
      },
      {
        reference: "TLFCONTACTO34600000000",
        name: null,
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.4,
      },
      {
        reference: "41001 Sevilla, España",
        name: null,
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.4,
      },
      {
        reference: "ENTREGARPORELMUELLEDECARGATRASEROHORARIODERECEPCINDE0900A1400HLAMERCANCADEBE",
        name: null,
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.3,
      },
    ]);
    expect(cleaned.map((l) => l.reference)).toEqual(["ART-0012"]);
  });
});
