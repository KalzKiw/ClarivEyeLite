# Changelog — ClarivEye Lite

## 0.3.5 — 2026-10-09

### Login — escena 3D + alta simplificada
- Panel izquierdo con **React Three Fiber** (pasillo, estanterías, cajas, haz de scan); SVG CSS retirado.
- Título **ClarivEye Lite** fijo arriba (desktop y móvil).
- Crear cuenta en **2 pasos** (datos negocio+tú → contraseña ×2), menos “entrevista”.

## 0.3.4 — 2026-10-09

### Login v2 — “muelle de salida”
- Panel full-bleed con ilustración SVG propia (pasillo + haz de scan animado).
- Formulario quiet (sin card glass); campos tablet 52px; CTA con acento ámbar en hover.
- Hero móvil con la misma arte; marca ClarivEye Lite como señal principal.

## 0.3.3 — 2026-10-09

### Login
- Pantalla de acceso rediseñada: panel de marca + formulario glass, tipografía Fraunces/Sora, campos con iconos y ver contraseña, animaciones de paso (`motion`).

## 0.3.2 — 2026-10-09

### Lector PDF — contrato “nunca te dejo tirado”
- **QualityGate**: rechaza éxitos con 1 línea basura; score unificado.
- **Cascada**: pdf-layout → perfil entrenado en texto → OCR **todas las páginas** → modo asistido.
- **pdf-layout**: tolerancia Y por altura de glyph, columnas por gaps X, detección de inicio de tabla.
- **UI asistida**: chips de candidatos + “Entrenar con este doc” + línea vacía.
- Stats locales en Ajustes (ok / asistidas / fallos).

## 0.3.1 — 2026-10-08

### Entrenar lector (por negocio)
- Wizard `/entrenar`: ¿mismo albarán? → muestra → señalar SKU / nombre / cantidad.
- Perfiles en localStorage por `businessId`; OCR usa bandas entrenadas antes que genéricas (`source: trained`).
- Enlace desde Ajustes y ClarivScan.
- Skill agente: `.cursor/skills/clariveye-lite/` + agent `parser-fixer`.

## 0.3.0 — 2026-10-08

### Cuenta y negocio (pasos, no muro de campos)
- **Crear cuenta** en 3 pasos: negocio → tú → contraseña + confirmación.
- **Ajustes** (icono en header): renombrar negocio, plan Free/Pro, cambiar contraseña (×2), enlaces a equipo y log, logout.
- **Equipo**: invitar operario en 3 pasos (nombre → email → PIN ×2); plan se gestiona en Ajustes.
- Doc: [`docs/08-product-loop.md`](./docs/08-product-loop.md) — bucle del producto + ideas siguientes.

## 0.2.4 — 2026-10-08

### Lectura de documentos (visión híbrida)
- **pdf.js con layout**: agrupa texto por coordenadas Y/X (líneas reales + columnas) antes de parsear.
- **OCR endurecido**: gris/contraste primero; Otsu solo si falla; sin umbral fijo a ciegas.
- UI ClarivScan: muestra fuente (`PDF layout` / `PDF texto` / `OCR`) + botón **Forzar OCR**.

## 0.2.3 — 2026-10-08

### Parser easyWMS
- **Hoja de picking**: `OUT00602/050`, artículos `Item12`…`Item09`, cantidad `1 [UN]`, tipo pedido.
- OCR: bandas alternativas para tabla de tareas (Item + descripción + [UN]).

## 0.2.2 — 2026-10-08

### ClarivScan / PDF
- **Subir PDF**: primero texto nativo con pdf.js (sin OCR). Solo si el PDF es escaneado → raster + OCR.
- UI: dos entradas — PDF y foto.

### Parser Tosma
- OCR sucio tipo albarán fontanería: recupera `000113` / `77` / `00120` / `000107` / `97` y cantidades (incluye qty OCR `1200`→12 y dto en importe).

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
