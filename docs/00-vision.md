# Visión — ClarivEye Lite

## Tesis
ClarivEye Lite **no gestiona el negocio**: cierra el agujero de la **salida** de pedidos.

1. Entra un albarán / factura / OT (PDF o foto) vía **ClarivScan** (incrustado).
2. Se convierte en pedido activo (Kanban).
3. El operario hace picking con barcode (check verde).
4. Al entregar → log + notas.

## Posicionamiento
| Producto | Rol |
|----------|-----|
| ClarivEye Suite | ERP/CRM B2B potente |
| ClarivScan | Motor de captura (marca propia, embebido en Lite) |
| ClarivEye Lite | Gancho Play Store / freemium / tráfico → Suite |

## Independencia
- Carpeta y repo propios (`ClarivEyeLite/`).
- Supabase propio (previsto; MVP actual = localStorage multi-tenant).
- Reutiliza ideas y parser de ClarivScan/ClarivEye; no es un fork del monorepo Suite.

## UX
Cuenta y equipo en **pasos cortos**; configuración en **Ajustes**. El operario no debe sentir un ERP. Detalle: [08-product-loop.md](./08-product-loop.md).
