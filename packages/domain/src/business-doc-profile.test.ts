import { describe, expect, it } from "vitest";
import {
  businessProfileToBands,
  clampRect,
  inferRefStyle,
  isProfileReady,
  type BusinessDocProfile,
} from "./business-doc-profile";

function sample(partial?: Partial<BusinessDocProfile>): BusinessDocProfile {
  return {
    id: "p1",
    businessId: "b1",
    name: "Mi albarán",
    alwaysSameFormat: true,
    regions: {
      skuCol: { x0: 0.05, y0: 0.35, x1: 0.2, y1: 0.8 },
      descCol: { x0: 0.2, y0: 0.35, x1: 0.65, y1: 0.8 },
      numsCol: { x0: 0.65, y0: 0.35, x1: 0.95, y1: 0.8 },
      table: { x0: 0.05, y0: 0.35, x1: 0.95, y1: 0.8 },
    },
    hints: { baseProfile: "tosma_cod", refStyle: "numeric_cod" },
    successCount: 0,
    failCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("business-doc-profile", () => {
  it("clampRect ordena esquinas", () => {
    expect(clampRect({ x0: 0.8, y0: 0.9, x1: 0.1, y1: 0.2 })).toEqual({
      x0: 0.1,
      y0: 0.2,
      x1: 0.8,
      y1: 0.9,
    });
  });

  it("businessProfileToBands genera columnas", () => {
    const bands = businessProfileToBands(sample());
    expect(bands).not.toBeNull();
    expect(bands!.columns.sku[0]).toBeCloseTo(0.05);
    expect(bands!.tableBands[0][0]).toBeCloseTo(0.35);
  });

  it("isProfileReady exige 3 columnas + alwaysSame", () => {
    expect(isProfileReady(sample())).toBe(true);
    expect(isProfileReady(sample({ alwaysSameFormat: false }))).toBe(false);
    expect(
      isProfileReady(
        sample({ regions: { skuCol: { x0: 0, y0: 0, x1: 0.2, y1: 0.5 } } }),
      ),
    ).toBe(false);
  });

  it("inferRefStyle", () => {
    expect(inferRefStyle(["Item12", "Item02"])).toBe("item_xx");
    expect(inferRefStyle(["000113", "77"])).toBe("numeric_cod");
  });
});
