# Decisiones (ADR)

## ADR-001 — Independiente de ClarivEye Suite
Lite vive en `ClarivSuite/ClarivEyeLite/`, no dentro de ClarivEye. Otro Supabase, otro deploy, otro repo.

## ADR-002 — ClarivScan incrustado
ClarivScan **no se abre como app externa**. Es un módulo/ruta dentro de Lite que mantiene la **marca ClarivScan**. El operario no sale de ClarivEye Lite.

## ADR-003 — Marca Clariv siempre
Watermark / branding ClarivEye Lite visible en Free y Pro. Pro no quita la marca.

## ADR-004 — Datos en nube por cuenta/negocio
Pedidos activos + log entregados en Supabase. No sync ERP v1. Export CSV en Pro.

## ADR-005 — Negocio + operarios
Al registrarse se crea 1 negocio. Free = owner. Pro = hasta 3 usuarios (owner invita).

## ADR-006 — Freemium
3 pedidos **abiertos** en Free. Pro: ilimitados + historial largo + operarios + export.

## ADR-007 — Stack
Vite + React + TS + Tailwind + Capacitor (Android). Supabase. Stripe. PostHog. Parser ClarivScan (shared / API).

## ADR-008 — Token barcode de pedido (`CEL1`)
El PDF/etiqueta no embebe el pedido completo. El código (Code128 + QR) lleva `CEL1:{orderId}`.
Al escanear, Lite resuelve el pedido por `id` en el store local (luego Supabase, ADR-004).
Texto humano bajo el barcode = `docNumber`. Las líneas usan su `barcode` o `reference` para picking.

## ADR-009 — Aislamiento multi-negocio
Cada cuenta pertenece a un `businessId`. Pedidos y plan viven en claves
`clariveye-lite.orders.{businessId}.v1` / `plan.{businessId}`.
Un negocio no lee el almacén de otro en el mismo navegador.
Auth MVP es local; producción usará Supabase Auth + RLS (ADR-004).
