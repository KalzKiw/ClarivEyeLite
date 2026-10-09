import { describe, expect, it } from "vitest";
import {
  extractAssistedCandidates,
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
});
