# Modelo de datos (mínimo)

- `businesses` — id, name, plan (free|pro), created_at
- `memberships` — business_id, user_id, role (owner|operario)
- `orders` — business_id, doc_number, status, notes, created_at, delivered_at
- `order_lines` — order_id, reference, barcode, name, quantity, packages, picked
- `delivery_log` — order snapshot + notes + delivered_at (o filtrar orders entregados)
- `invites` — email, business_id, role, token (v1.1)

Estados pedido: `por_preparar` | `preparando` | `listo` | `entregado`
