/** OC con columna desc ruidosa (más líneas que SKUs) — no debe cruzar filas. */
export const FIXTURE_OC_COLUMNS_SKEW = {
  headerText: "ORDEN DE COMPRA\nNumero de Orden: OC 00005\n",
  skuText: "ARTIC!\n78958\n14455\n66888\n",
  // Basura extra + 3 productos (longitud ≠ skus antes de filtrar)
  descText: "ULO # DESCRIPCIÓN\n--\nProducto X\nProducto T\nProducto H\nnota basura\n",
  numsText: "Cantidad P/U\n2] 10,00\n5 50,00\n1 200,00\n",
  fullText: "ORDEN DE COMPRA OC 00005",
};
