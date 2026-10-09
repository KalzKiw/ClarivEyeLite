/**
 * Matriz de ejemplos reales del repo: cada formato debe parsear refs (+ nombres cuando el texto los trae).
 */
import { describe, expect, it } from "vitest";
import { parseColumnBundle } from "./column-merge";
import { parseAnyDocument } from "./document-profiles";
import { namedLineRatio, passesQualityGate } from "./quality-gate";
import {
  FIXTURE_ALB_CODIGO_OCR,
  FIXTURE_EASYWMS,
  FIXTURE_EASYWMS_PICKING,
  FIXTURE_FASHION,
  FIXTURE_OC,
  FIXTURE_PICKING_LIST,
  FIXTURE_TOSMA,
} from "./fixtures/albaranes";
import { FIXTURE_OC_COLUMNS_SKEW } from "./fixtures/oc-columns-skew";
import { FIXTURE_TOSMA_OCR_DIRTY } from "./fixtures/tosma-ocr-dirty";

describe("matriz fixtures ejemplo", () => {
  it("easyWMS albarán: 3 refs con nombre", () => {
    const doc = parseAnyDocument(FIXTURE_EASYWMS);
    expect(doc.lines.map((l) => l.reference)).toEqual(["086872", "011134", "000357"]);
    expect(namedLineRatio(doc)).toBe(1);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("easyWMS picking: 6 Items", () => {
    const doc = parseAnyDocument(FIXTURE_EASYWMS_PICKING);
    expect(doc.lines).toHaveLength(6);
    expect(doc.lines.every((l) => /^Item\d+$/i.test(l.reference))).toBe(true);
    expect(namedLineRatio(doc)).toBeGreaterThanOrEqual(0.8);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("picking_list: SKUs con qty", () => {
    const doc = parseAnyDocument(FIXTURE_PICKING_LIST);
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toEqual(expect.arrayContaining(["10031", "20054", "20031"]));
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("fashion: 5 SKUs", () => {
    const doc = parseAnyDocument(FIXTURE_FASHION);
    expect(doc.lines).toHaveLength(5);
    expect(doc.lines[0].reference).toBe("SKU000002");
    expect(namedLineRatio(doc)).toBeGreaterThanOrEqual(0.8);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("Tosma limpio: códigos + nombres", () => {
    const doc = parseAnyDocument(FIXTURE_TOSMA);
    expect(doc.lines.map((l) => l.reference)).toEqual(
      expect.arrayContaining(["000113", "000107", "97"]),
    );
    expect(namedLineRatio(doc)).toBeGreaterThanOrEqual(0.5);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("OC: 3 productos", () => {
    const doc = parseAnyDocument(FIXTURE_OC);
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("albarán ART- columnas OCR: 4 líneas mapeadas", () => {
    const doc = parseAnyDocument(FIXTURE_ALB_CODIGO_OCR);
    expect(doc.profile).toBe("alb_codigo");
    expect(doc.lines.map((l) => l.reference)).toEqual([
      "ART-0012",
      "ART-0054",
      "CBL-1020",
      "SOP-9921",
    ]);
    expect(namedLineRatio(doc)).toBe(1);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("OC columnas skew: sin cruzar filas", () => {
    const doc = parseColumnBundle(FIXTURE_OC_COLUMNS_SKEW);
    expect(doc.lines.map((l) => l.reference)).toEqual(["78958", "14455", "66888"]);
    expect(doc.lines.map((l) => l.name)).toEqual(["Producto X", "Producto T", "Producto H"]);
    expect(doc.lines.map((l) => l.quantity)).toEqual([2, 5, 1]);
    expect(passesQualityGate(doc)).toBe(true);
  });

  it("Tosma OCR sucio: recupera códigos; sin nombres → no gate OK (asistido)", () => {
    const doc = parseAnyDocument(FIXTURE_TOSMA_OCR_DIRTY);
    const refs = doc.lines.map((l) => l.reference);
    expect(refs).toEqual(expect.arrayContaining(["000113", "00120", "000107"]));
    // 77/97 pueden faltar en OCR muy roto; lo crítico es no inventar nombres
    expect(doc.lines.every((l) => !/Válvula|Membrana|Racor|Caldera/i.test(l.name ?? ""))).toBe(
      true,
    );
    if (namedLineRatio(doc) < 0.5) {
      expect(passesQualityGate(doc)).toBe(false);
    }
  });
});
