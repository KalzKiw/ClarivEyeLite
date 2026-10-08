import { describe, expect, it } from "vitest";
import { parseColumnBundle } from "./column-merge";
import { parseAnyDocument } from "./document-profiles";
import { layoutPdfItems, scoreLayoutText } from "./pdf-layout";

/** Simula items de hoja picking (Y decrece hacia abajo en PDF). */
function pickingItems() {
  const rows: Array<{ y: number; cells: Array<{ x: number; str: string }> }> = [
    { y: 700, cells: [{ x: 200, str: "Hoja de picking" }, { x: 450, str: "easy WMS" }] },
    { y: 680, cells: [{ x: 40, str: "Orden:" }, { x: 100, str: "OUT00602/050" }] },
    { y: 660, cells: [{ x: 40, str: "Tareas:" }, { x: 100, str: "6" }] },
    {
      y: 600,
      cells: [
        { x: 40, str: "8805" },
        { x: 100, str: "5D 1 1" },
        { x: 200, str: "Item12" },
        { x: 280, str: "Chocolate cookies" },
        { x: 480, str: "1 [UN]" },
      ],
    },
    {
      y: 580,
      cells: [
        { x: 40, str: "8803" },
        { x: 100, str: "5I 1 1" },
        { x: 200, str: "Item02" },
        { x: 280, str: "Tomato sauce" },
        { x: 480, str: "1 [UN]" },
      ],
    },
    {
      y: 560,
      cells: [
        { x: 40, str: "8802" },
        { x: 100, str: "5D 4 1" },
        { x: 200, str: "Item01" },
        { x: 280, str: "Aftershave lotion" },
        { x: 480, str: "1 [UN]" },
      ],
    },
  ];
  return rows.flatMap((r) => r.cells.map((c) => ({ str: c.str, x: c.x, y: r.y, width: c.str.length * 5 })));
}

describe("pdf-layout", () => {
  it("agrupa por Y y preserva Item + descripción + qty", () => {
    const layout = layoutPdfItems(pickingItems());
    expect(layout.lines.some((l) => /Item12/.test(l) && /Chocolate/.test(l))).toBe(true);
    expect(layout.text).toMatch(/OUT00602\/050/);
    expect(scoreLayoutText(layout.text)).toBeGreaterThan(10);

    const doc = parseAnyDocument(layout.text);
    expect(doc.lines.map((l) => l.reference)).toEqual(
      expect.arrayContaining(["Item12", "Item02", "Item01"]),
    );
  });

  it("columnBundle alimenta parseColumnBundle", () => {
    const layout = layoutPdfItems(pickingItems());
    const doc = parseColumnBundle(layout.columnBundle);
    expect(layout.columnBundle.fullText).toMatch(/Item12/);
    expect(doc.raw_text.length).toBeGreaterThan(20);
  });
});
