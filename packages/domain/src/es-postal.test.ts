import { describe, expect, it } from "vitest";
import {
  isSpanishPostalCode,
  lookupSpanishPostal,
  postalMatchesPlaceName,
} from "./es-postal";
import { isProductLine } from "./line-role";

describe("es-postal", () => {
  it("reconoce prefijos provinciales 01–52", () => {
    expect(isSpanishPostalCode("41001")).toBe(true);
    expect(isSpanishPostalCode("28045")).toBe(true);
    expect(isSpanishPostalCode("08001")).toBe(true);
    expect(isSpanishPostalCode("99999")).toBe(false);
    expect(isSpanishPostalCode("4100")).toBe(false);
    expect(lookupSpanishPostal("41001")?.community).toBe("Andalucía");
    expect(lookupSpanishPostal("28045")?.province).toBe("Madrid");
  });

  it("cruza CP con provincia/CCAA/país en el nombre", () => {
    expect(postalMatchesPlaceName("41001", "Sevilla, España")).toBe(true);
    expect(postalMatchesPlaceName("41001", "Andalucía")).toBe(true);
    expect(postalMatchesPlaceName("08001", "Barcelona")).toBe(true);
    expect(postalMatchesPlaceName("41001", "Monitores LED")).toBe(false);
  });

  it("no tumba SKU 5 dígitos tipo picking (10031) con nombre de producto", () => {
    expect(
      isProductLine({
        reference: "10031",
        name: "Product name",
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.9,
      }),
    ).toBe(true);
  });

  it("desprecia CP + localidad de la misma provincia", () => {
    expect(
      isProductLine({
        reference: "41001",
        name: "Sevilla, España",
        quantity: 1,
        packages: 0,
        unitPrice: null,
        confidence: 0.5,
      }),
    ).toBe(false);
  });
});
