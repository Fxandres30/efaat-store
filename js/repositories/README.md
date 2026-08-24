# js/repositories/

Única capa autorizada a llamar al SDK de Supabase desde el frontend
(`supabase.from(...)`, `supabase.storage.*`, `supabase.auth.*`,
`supabase.rpc(...)`). Un archivo por dominio:

- `productRepository.js` — products + product_variants (lectura y escritura admin)
- `categoryRepository.js` — categories
- `commerceRepository.js` — shipping_settings, coupons
- `inventoryRepository.js` — ajuste de stock vía RPC `manual_adjust_stock`
- `imageRepository.js` — Supabase Storage (bucket `product-images`)
- `authRepository.js` — Supabase Auth, acotado al puente de sesión admin (Fase 0)

Ningún service, orchestrator ni vista debe importar
`js/core/supabaseClient.js` directamente: siempre a través de un
repository de esta carpeta.
