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

## Próximas ideas (alineadas a la tesis)

1. **Modo solo picking** para operarios (ocultar ClarivScan / Ajustes de dueño).
2. **Plantillas de proveedor** (Tosma, easyWMS, fashion) elegibles a mano si el auto-perfil falla.
3. **Cola offline** de fotos: subir varias, parsear en segundo plano.
4. **Supabase Auth** cuando salgamos de MVP local (mismo modelo businessId + roles).
5. **PDF CEL1** como único ticket de picking en almacén (ya generado; push a impresora Bluetooth).
6. **Lead a Suite**: banner Pro “¿Necesitas stock y facturas? ClarivEye Suite”.
7. **Demo seed** con 1 pedido easyWMS + 1 Tosma para onboarding en 30 s.

## Criterio de “funciona”

- Un dueño crea negocio en pasos y ve pedidos vacíos.
- Sube PDF picking → líneas ItemXX.
- Crea pedido → picking → entrega → aparece en log.
- Invita operario (Pro) con PIN confirmado; el operario entra y solo trabaja pedidos.
