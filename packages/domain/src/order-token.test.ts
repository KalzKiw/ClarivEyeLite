import { describe, expect, it } from "vitest";
import {
  encodeOrderBarcodeToken,
  encodeOrderToken,
  isOrderToken,
  matchOrderIdFromToken,
  parseOrderToken,
} from "./order-token";

describe("order token CEL1", () => {
  it("encode/parse roundtrip", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const token = encodeOrderToken(id);
    expect(token).toBe(`CEL1:${id}`);
    expect(parseOrderToken(token)).toBe(id);
    expect(isOrderToken(token)).toBe(true);
  });

  it("acepta separadores CEL1- y CEL1_", () => {
    expect(parseOrderToken("CEL1-abc123")).toBe("abc123");
    expect(parseOrderToken("cel1_xyz")).toBe("xyz");
  });

  it("rechaza basura", () => {
    expect(parseOrderToken("78958")).toBeNull();
    expect(isOrderToken("SKU000002")).toBe(false);
  });

  it("barcode corto escaneable + match", () => {
    const id = "9a2447ee-17c3-429b-8aed-fe9b20f266dc";
    const short = encodeOrderBarcodeToken(id);
    expect(short).toBe("CEL1:9A2447EE");
    expect(short.length).toBeLessThan(20);
    expect(matchOrderIdFromToken(short, [id, "other-id"])).toBe(id);
    expect(matchOrderIdFromToken(encodeOrderToken(id), [id])).toBe(id);
  });
});
