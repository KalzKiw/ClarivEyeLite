# Changelog — ClarivEye Lite

## 0.3.24 — 2026-10-09

### Contrato lectura adaptable
- `documentDate` + UI fecha; líneas con ref, nombre, qty, bultos, precio.
- `ocr-normalize`: códigos OCR (SKUO→SKU0) y precios sin coma; extractor por forma de fila.
- Fashion dirty recupera Bufanda `SKU000009` sin hardcode del nombre.

## 0.3.23 — 2026-10-09

### Clasificador estructural de líneas (deny-by-default)
- `line-role`: product / phone / address / prose / meta por forma, no por frases de un albarán.
- Solo entra al pedido si `productScore ≥ 0.65`; quality-gate y ClarivScan delegan ahí.
- CP (5 dígitos) + “Ciudad, País” no pasa como SKU/nombre (dirección partida en columnas).
- Catálogo `es-postal`: prefijos 01–52 → provincia/CCAA; si CP + nombre cuadran, se descarta (sin tumbar SKUs tipo 10031).

## 0.3.22 — 2026-10-09

### Perfil alb_codigo — albarán ART-/CBL- con OCR por columnas
- Reglas: SKU `XX-NNNN` (sin ALB/PED), zip descripciones + `N M uds` (bultos/total).
- `column-merge`: no recortar `ART-0012`→`0012`; no inventar `PROD-N` con direcciones; compite con `parseAnyDocument`.

## 0.3.21 — 2026-10-09

### ClarivScan — comprobar líneas antes del pedido
- `line-audit`: marca refs que parecen fecha, teléfono, qty o basura.
- UI: casilla incluir/excluir, badges de aviso, «confirmar producto» en sospechosas.
- Crear pedido solo con líneas incluidas y sin sospechosas pendientes.

## 0.3.20 — 2026-10-09

### Motor lectura — gate, OCR por página, matriz de ejemplos
- QualityGate exige ratio de nombres (≥50% o ≥2); evita “OK” solo con códigos.
- OCR PDF página a página (bandas Y correctas); merge de líneas entre páginas.
- `scan-stats`: namedLineRate; test matriz con easyWMS/picking/fashion/Tosma/OC.

## 0.3.19 — 2026-10-09

### Motor lectura — filas afines
- `pdf-layout` emite `rows[]` (SKU+desc+nums por Y); `parseColumnBundle` las prioriza.
- OCR `scanColumns` construye filas con `buildColumnRowsFromTexts`; blobs con `alignToSlots`.
- Códigos cortos Tosma (`77`) y fixtures skew; 36 tests domain.

## 0.3.18 — 2026-10-09

### Parse — multi-formato más robusto
- `parseAnyDocument` compite todos los perfiles + genérico (mejor score).
- Tosma: sin nombres inventados; descripción solo si aparece junto al código.
- Columnas: no cruzar SKU/desc/qty por índice si las longitudes no cuadran.
- PackSpinner por defecto `sm` (carga); login sigue en `lg`.

## 0.3.17 — 2026-10-09

### PackSpinner — loop más fluido
- Timeline solapada (~5 s): fill/pack/spin sin cortes; yaw y wrap con damp continuo.
- Papel con crossfade hoja→cáscara; squash de salida más suave.

## 0.3.16 — 2026-10-09

### PackSpinner — papel al girar + relleno alto
- Cajitas a la altura del contenedor (lectura desde arriba); paredes laterales cerradas.
- Al girar: hoja de papel + cáscara con franja que envuelve; luego whoosh.

## 0.3.15 — 2026-10-09

### PackSpinner — solo caja, fill + giro
- Canvas transparente (sin fondo/suelo); loop: llega → 3 cajitas → cierra → gira → whoosh (~4.4 s).

## 0.3.14 — 2026-10-09

### Lite — PackSpinner como carga
- Escena outbound pesada retirada; `PackSpinner` / `LoadingMark` (caja embala y sale, ~3.6 s).
- Login desktop: marca + spinner; móvil sin franja 3D.

## 0.3.13 — 2026-10-09

### Login — bultos embalados en el fill
- Sustituye cubos de colores por cartón sellado, mailer y tubo kraft (layouts por ciclo).
- Prefabs a tamaño fijo + squash interno; labio/luz interior para leer el hueco.

## 0.3.12 — 2026-10-09

### Login — pack hueco, giro y cámara por fase
- Caja hueca (labio frontal + luz interior); ítems hover→drop con squash; 2 solapas.
- Seal: giro 360° nítido + cinta/etiqueta; ship con anticipación; fondo almacén.
- Variantes por ciclo (paleta, sentido, cámara) para menos repetición (~8.4 s).

## 0.3.11 — 2026-10-09

### Login — pack cartoon con contenido + puff
- Caja abierta: 3 ítems caen al interior (fill), tapa con overshoot, cinta + etiqueta pop.
- Salida ship: squash/stretch, speed streaks y puff burst procedural (~6.2 s loop).

## 0.3.10 — 2026-10-09

### Login — almacén vivo, no solo scan en loop
- Halo ámbar en L (frente + cara derecha); racks densos al fondo.
- Ciclo ~14 s alterno: un pase con scan de 2 cajas + swap; el siguiente solo logística (ambient, puerta, pallet) sin escanear.

## 0.3.9 — 2026-10-09

### Login — haz sin atravesar
- Trazadora roja clipada con ray–AABB al primer cartón; laser dual + punto de impacto.
- Halo ámbar en cara frontal; pistola reposicionada para mejor línea de visión.

## 0.3.8 — 2026-10-09

### Login — scan por caja
- Halo ámbar se adapta (posición + tamaño) a cada cartón del pallet; `pointLight` sigue el corte.
- Ciclo caja-a-caja (~7 s): approach → slice → hit; pistola al `aimPoint`; flash de etiqueta en la activa.

## 0.3.7 — 2026-10-09

### Login — loop de scan sincronizado
- Ciclo ~4.5 s: apuntar → barrer → hit → idle; pistola `lookAt` al pallet, haz y volumen con la misma `scanY`.
- Sin Float; flash emissive en etiqueta al “leer”; auto-rotate más lento.

## 0.3.6 — 2026-10-09

### Login — diorama 3D legible
- Escena R3F reescrita: pallet de madera, cartones con cinta, racks metálicos, hand scanner y volumen de scan emissive.
- Iluminación de estudio + cámara cercana + `OrbitControls` auto-rotate (sin zoom/pan).
- Overlay solo en el 30% inferior; fallback Suspense con pulso y “Cargando escena…”.

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
