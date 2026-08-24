# EFAAT Store — E-commerce de tenis y gorras

Tienda online construida con **HTML5 + CSS3 + JavaScript vanilla**, sin
frameworks ni build step. Arquitectura por capas
(`repository → service → orchestrator → UI`), con **Supabase como única
fuente de verdad** del catálogo (productos, categorías, variantes/stock,
drops, envío, cupones) — ver "Arquitectura" abajo. Checkout, pedidos,
cuentas de cliente, favoritos y direcciones siguen siendo locales por
ahora (ver "Qué sigue local y por qué").

## Cómo ejecutar

```bash
cd efaat-store
python3 -m http.server 8080   # o cualquier servidor estático — file:// también funciona
# abre http://localhost:8080
```

Necesita conexión a internet siempre: las tipografías (Google Fonts) y el
catálogo (Supabase) se cargan por red. Si Supabase no responde, la tienda
muestra un estado de error real — ya no hay catálogo local de respaldo.

### Puesta en marcha de Supabase (una sola vez)

1. **Catálogo**: corre `backend/scripts/seedCatalog.js --commit` para
   migrar `data/products.js`/`data/categories.js` a Supabase (o carga tu
   propio catálogo desde `/admin/products`).
2. **Envío**: abre `/admin/shipping` como admin y guarda una vez — crea
   la fila de configuración (no viene sembrada).
3. **Admin real**: crea un usuario en Supabase Auth con el mismo correo
   que `EFAAT_CONFIG.demoUsers.admin` (Authentication → Users → Add
   user) y promuévelo a admin — ver `js/repositories/authRepository.js`
   para el porqué y el SQL de bootstrap exacto.
4. **Imágenes**: aplica `supabase/migrations/0002_product_images_storage.sql`
   (bucket + policies de Storage) antes de usar el gestor de imágenes.

## Usuarios demo (login local — ver "Qué sigue local")

| Rol      | Correo             | Contraseña |
|----------|---------------------|------------|
| Cliente  | cliente@demo.com    | 123456     |
| Admin    | admin@demo.com      | admin123   |

> Solo para demostración: la sesión de cliente se guarda en
> `localStorage` en texto plano. El admin, además, abre una sesión real
> de Supabase Auth en segundo plano (Fase 0 del informe de
> arquitectura) para que sus escrituras pasen RLS.

## Moneda (COP/USD)

Selector en el header. El precio maestro **siempre** es COP — en
Supabase, en `Store.state`, en el pedido creado. La moneda elegida es
solo presentación (`js/services/currencyService.js`, tasa fija
`USD_COP_RATE`) y se recuerda en `localStorage` (única preferencia local
de verdad en todo el proyecto — ver `preferencesService.js`).

## Gestión de imágenes (admin)

`/admin/products` → Editar producto → sección "Imágenes": subir,
reemplazar, eliminar, marcar principal, reordenar. Suben a Supabase
Storage (bucket `product-images`) y la URL se guarda en
`products.images` (mismo array que ya usan cards/PDP/relacionados — no
hay una segunda estructura de galería). Requiere la migración 0002
aplicada y la sesión admin de Supabase activa.

## Arquitectura

```
js/
├── core/            env.js, supabaseClient.js, localStore.js (local — ver abajo), appState.js (Store)
├── repositories/     única capa que llama al SDK de Supabase (product/category/commerce/inventory/image/authRepository)
├── services/         reglas de negocio de frontend (productService, currencyService, imageService, inventoryService, preferencesService)
├── orchestrators/     coordinan repositories/services → Store → UI (catalogOrchestrator, adminOrchestrator)
├── ui/               shell persistente (header/footer/drawers/modal) + componentes (productCard)
├── modules/           una carpeta por feature (auth, home, catalog, cart, checkout, account, favorites, orders, admin/*)
├── utils/            helpers puros
└── app/              router.js, app.js (bootstrap)
```

`UI → orchestrator → service → repository → Supabase`, siempre en ese
sentido — ninguna vista consulta Supabase directo, ningún service
conoce el SDK de Supabase, ningún repository renderiza HTML.

### Qué sigue local y por qué

Checkout/pedidos, sesión/usuarios, favoritos y direcciones siguen en
`localStorage` (`js/core/localStore.js`, global `Storage`). No es una
segunda base de datos "temporal que ya migraremos en silencio": es un
límite técnico documentado. Migrarlos requiere Auth real de Supabase
para **cada cliente** (no solo admin) y, para pedidos, un RPC de
creación que hoy no existe en el schema — ambos son trabajo futuro
explícito, no implementado en esta fase para no arriesgar el checkout
que ya funciona.

## Flujo de compra de punta a punta

1. Explora el catálogo (`Tenis` / `Gorras`, desde Supabase), filtra por
   marca, precio, color, disponibilidad, etc.
2. Abre un producto, elige color y talla/tipo.
3. Agrega al carrito o compra directo con "Comprar ahora".
4. Checkout en 4 pasos: Datos → Envío → Pago (simulado) → Confirmación.
   Como invitado o con sesión.
5. El pedido queda en "Mis pedidos" (local) con seguimiento visual.
6. Desde `/admin/orders` el administrador cambia el estado del pedido.

## Qué es simulado en esta v1 (a propósito)

- Pagos: no se procesa ninguna transacción real.
- Autenticación de cliente: sesión local, sin hashing de contraseña.
- Envíos: sin integración con transportadoras.
- Tasa de cambio USD/COP: fija, sin proveedor de tasas en tiempo real.

## Notas de accesibilidad y responsive

- Estados de foco visibles (`:focus-visible`) en toda la app.
- Imágenes con `alt`, botones con `aria-label` donde no hay texto visible.
- `prefers-reduced-motion` respetado (desactiva animaciones).
