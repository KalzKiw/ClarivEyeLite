---
name: clariveye-lite
description: >-
  ClarivEye Lite (salida/picking): parsers, OCR/pdf.js, perfiles por negocio,
  auth multi-tenant, ClarivScan. Use when editing ClarivEyeLite, document
  profiles, business training, or Lite freemium flows.
---

# ClarivEye Lite — skill (ahorra tokens)

## Tesis (no olvidar)
Lite cierra **salida**: ClarivScan → pedido → picking CEL1 → entrega. No es ERP.

## Dónde está el código
| Qué | Ruta |
|-----|------|
| Perfiles genéricos | `packages/domain/src/document-profiles.ts` |
| Perfil entrenado negocio | `packages/domain/src/business-doc-profile.ts` |
| Layout PDF coords | `packages/domain/src/pdf-layout.ts` |
| OCR + pdf.js | `apps/web/src/lib/ocr.ts`, `pdf-text.ts` |
| Store perfiles | `apps/web/src/lib/doc-profiles-store.ts` |
| Entrenar UI | `apps/web/src/pages/TrainParserPage.tsx` |
| Auth / tenants | `apps/web/src/lib/auth.ts` |
| Pedidos scoped | `apps/web/src/lib/store.ts` → `orders.{businessId}` |

## Pipeline lectura (orden)
1. PDF → `extractPdfLayout` (Y/X) → parse
2. Si falla / foto → OCR; si hay `getActiveDocProfile()` → bandas entrenadas primero
3. Fallback `PROFILE_BANDS` + `parseAnyDocument`

## Al tocar parsers
- Añade fixture en `packages/domain/src/fixtures/` + test en `*.test.ts`
- No reescribir OCR cloud; offline Tesseract + pdf.js
- Perfil negocio: regiones 0–1 + `businessProfileToBands`

## UX cuenta
Pasos cortos (no modales gordos). Ajustes = plan/negocio/contraseña/entrenar. Equipo = operarios.

## Multi-agente (rápido)
- **explore** domain/fixtures cuando el parse falle
- **generalPurpose** UI (Train/Login/Settings) en paralelo al parser
- No explores el monorepo Suite salvo que lo pidan

## Deploy
Repo `KalzKiw/ClarivEyeLite` → push `master` → Vercel `clariveye-lite.vercel.app`. CHANGELOG + `docs/08-product-loop.md`.
