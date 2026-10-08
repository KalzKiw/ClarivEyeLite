# Changelog — ClarivEye Lite

## 0.2.1 — 2026-10-08

### Auth / multi-tenant
- Varios negocios en el mismo dispositivo; email único global.
- Pedidos y plan aislados por `businessId` (un negocio no ve el de otro).
- Login: pestaña **Crear cuenta** (negocio + dueño) o **Entrar**.

### Parser
- Extractor `oc_tabla` para OCR ruidoso (refs + PX/Producto + qty).
- `parseAnyDocument` elige el mejor entre perfil y parser genérico.

## 0.2.0 — 2026-10-08

### ClarivScan / OCR
- Perfiles multi-albarán: easyWMS, fashion SKU, Tosma, picking list, OC.
- OCR por columnas según perfil + merge de nombres (incluye expansión PX→Producto X).
- UI: “Producto” (no “Línea”), labels Cantidad/Bultos, barcode solo si EAN 8–14 (evita choque con refs cortas).
- Bultos por defecto **0** si el documento no los trae (ya no se inventa 1).

### Pedidos
- Kanban: tocar pedido abre panel lateral (sheet) con estado, notas, productos editables y PDF.
- PDF albarán/picking con Code128 + QR `CEL1:{orderId}` y barcodes por línea.

### Picking
- Escaneo cámara (ZXing): `CEL1` abre pedido; barcode/ref marca producto.
- Botón PDF / barcode en picking.

### Auth / negocio
- Login y “Crear negocio” (localStorage MVP).
- Equipo: listar usuarios, invitar operarios (Pro demo), quitar operarios, logout.
- Toggle plan Free/Pro local para demos.

### Infra
- Repo GitHub + deploy Vercel.
- Watermark ClarivEye Lite, shell con tabs Pedidos / ClarivScan / Picking / Equipo.

## 0.1.0 — 2026-10-08

- Scaffold Vite + domain package.
- ClarivScan embebido, Kanban salida, picking checklist, log local, freemium 3 abiertos.
