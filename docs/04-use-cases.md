# Casos de uso MVP

1. **UC01 Registro** — Alta → negocio + watermark.
2. **UC02 Abrir ClarivScan** — Tab/ruta ClarivScan dentro de Lite (sin salir).
3. **UC03 Capturar documento** — PDF/foto → parse → líneas editables.
4. **UC04 Crear pedido** — Confirmar → Kanban “Por preparar”.
5. **UC05 Picking** — Escaneo cámara: token `CEL1:{orderId}` abre el pedido; barcode/ref de línea marca picked / error si no está.
6. **UC06 Entregar** — Notas → log entregados.
7. **UC07 Paywall** — 4º abierto → Pro.
8. **UC08 Ver log** — Lista entregados (free 30 días).
9. **UC09 CTA Suite** — Contactar ClarivEye / a medida.
10. **UC10 Invite operario** (v1.1 Pro).
11. **UC11 PDF barcode** — Desde Pedidos/Picking generar PDF albarán/picking con Code128+QR `CEL1:{orderId}`, tabla de líneas y barcodes por línea.
12. **UC03b OCR multi-albarán** — Perfiles easyWMS / fashion SKU / Tosma / picking list / OC; columnas OCR según perfil.
