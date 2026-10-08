# Stack tecnológico

## Cliente
- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router
- @dnd-kit (Kanban)
- @zxing/browser (barcode)
- tesseract.js (OCR local fallback) + parser ClarivScan shared
- lucide-react, motion
- Capacitor (Android / Play Store)

## ClarivScan embebido
- Ruta `/clarivscan` dentro de Lite
- UI con marca **ClarivScan**
- Reutiliza `shared/parser` de ClarivScan (copiado/adaptado en `packages/domain` o symlink)
- Opcional: `VITE_CLARIVSCAN_API_URL` para Vision API del backend ClarivScan

## Backend
- Supabase (proyecto lite): Auth, Postgres, RLS
- Stripe (Pro)
- PostHog
- Sentry
- Deploy web: Vercel

## No incluido
- Next.js (Suite sí; Lite = Vite SPA)
- Metabase
- React Native
