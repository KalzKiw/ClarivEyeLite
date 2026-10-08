# ClarivEye Lite

Producto **independiente** (hermano de ClarivEye Suite): app de **salida / picking**.

- **ClarivScan** va **incrustado** (marca ClarivScan, sin abrir otra app).
- Freemium → Pro → leads a ClarivEye Suite.
- Destino: Play Store (Capacitor) + web móvil.

| | URL |
|---|---|
| GitHub | https://github.com/KalzKiw/ClarivEyeLite |
| Producción | https://clariveye-lite.vercel.app |
| Changelog | [CHANGELOG.md](./CHANGELOG.md) |

```
ClarivSuite/
  ClarivEye/       Suite ERP
  ClarivScan/      Motor OCR de referencia
  ClarivEyeLite/   Este producto
```

## Docs
[`docs/`](./docs/) — visión, ADRs, alcance, requisitos, casos de uso, datos, analytics, stack, **[bucle del producto](./docs/08-product-loop.md)**.

## Flujo rápido
1. `/login` → **Crear cuenta** (3 pasos) o Entrar.
2. **ClarivScan** → PDF o foto → revisa líneas → crear pedido.
3. **Picking** → escanea CEL1 / barcodes → entrega.
4. **⚙ Ajustes** → negocio, plan, contraseña, equipo.

## Dev
```bash
npm install
npm run dev
```

Abre http://localhost:5174 — crea un negocio en `/login` y empieza por ClarivScan.

## Scripts
- `npm run build` — build web
- `npm test` — tests domain (OCR / CEL1)
