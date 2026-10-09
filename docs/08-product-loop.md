# Bucle del producto — ClarivEye Lite

## Idea principal (no negociable)

Lite **no es un ERP**. Cierra la **salida**:

1. **Captura** — ClarivScan lee PDF/foto (albarán, OC, hoja de picking).
2. **Pedido** — Kanban con productos editables.
3. **Picking** — Escaneo barcode / CEL1, check verde.
4. **Entrega** — Log + notas.

Todo lo demás (cuenta, equipo, plan) debe estar en **Ajustes** o flujos cortos por pasos, sin tapar el picking.

## UX cuenta / negocio

| Flujo | Cómo |
|-------|------|
| Crear cuenta | 3 pasos: Negocio → Tú (nombre+email) → Contraseña ×2 |
| Entrar | Solo email + contraseña |
| Operario | 3 pasos: Nombre → Email → PIN ×2 (requiere Pro) |
| Ajustes (icono ⚙) | Renombrar negocio, plan, cambiar contraseña, equipo, log, logout |

## Lectura de documentos

- PDF digital → **pdf.js layout** (coordenadas), sin OCR.
- PDF escaneado / foto → Tesseract (gris → Otsu si falla).
- UI muestra fuente: `PDF layout` | `PDF texto` | `OCR` + **Forzar OCR**.

## Contrato lectura PDF (0.3.2)

Nunca pantalla muerta: QualityGate → cascada layout/OCR multipágina → asistido (chips + entrenar).
OCR cloud = Pro futuro; esta versión es 100% cliente.

## Entrenar lector (por negocio)

Flujo `/entrenar` (también desde Ajustes / ClarivScan):

1. ¿Siempre usas el mismo albarán?
2. Sube una muestra (PDF/foto).
3. Señala con el dedo: columna SKU → nombre → cantidad.
4. Se guarda en `clariveye-lite.doc-profiles.{businessId}.v1`.
5. El OCR prioriza esas bandas (`source: trained`) y cuenta ok/fail.

## Próximas ideas (alineadas a la tesis)

1. **Modo solo picking** para operarios (ocultar ClarivScan / Ajustes de dueño).
2. **Aprender de correcciones**: si el usuario edita refs tras el parse, reforzar `refStyle` / muestras.
3. **Varios perfiles** por proveedor (Tosma vs easyWMS) con selector rápido.
4. **Cola offline** de fotos: subir varias, parsear en segundo plano.
5. **Supabase Auth** cuando salgamos de MVP local (mismo modelo businessId + roles).
6. **PDF CEL1** + impresora Bluetooth.
7. **Lead a Suite**: banner Pro → ClarivEye Suite.
8. **Demo seed** con 1 picking + 1 Tosma para onboarding en 30 s.

## Criterio de “funciona”

- Un dueño crea negocio en pasos y ve pedidos vacíos.
- Sube PDF picking → líneas ItemXX.
- Crea pedido → picking → entrega → aparece en log.
- Invita operario (Pro) con PIN confirmado; el operario entra y solo trabaja pedidos.
