# EFAAT Store — E-commerce de tenis y gorras (v1 funcional)

Tienda online completa construida con **HTML5 + CSS3 + JavaScript vanilla**,
sin frameworks ni build step. Toda la aplicación (catálogo, carrito,
checkout, cuentas, pedidos y panel administrativo) es funcional de verdad:
no hay botones decorativos ni datos estáticos pegados en el HTML — todo
vive en objetos JS y se persiste en `localStorage` a través de una capa de
almacenamiento (`storage.js`) pensada para ser reemplazada por Supabase,
Firebase o una API propia sin reescribir el resto de la app.

## Cómo ejecutar

No necesita instalación ni servidor:

1. Descomprime el proyecto.
2. Abre `index.html` directamente en el navegador (doble clic), **o** sírvelo
   con cualquier servidor estático si prefieres evitar restricciones de
   `file://` en tu navegador, por ejemplo:
   ```bash
   cd efaat-store
   python3 -m http.server 8080
   # luego abre http://localhost:8080
   ```
3. La primera carga siembra automáticamente productos, categorías, cupones
   y usuarios demo en `localStorage` (solo ocurre una vez; para reiniciar
   los datos de demo, borra el localStorage del sitio desde las
   herramientas de desarrollador del navegador).

Requiere conexión a internet solo para cargar las tipografías de Google
Fonts y las imágenes de producto de demostración (`picsum.photos`); la
lógica de la tienda funciona igual sin conexión, solo se verán sin estilo
tipográfico e imágenes rotas.

## Usuarios demo

| Rol      | Correo             | Contraseña |
|----------|---------------------|------------|
| Cliente  | cliente@demo.com    | 123456     |
| Admin    | admin@demo.com      | admin123   |

> Estas credenciales son **solo para demostración**. La autenticación de
> esta v1 guarda usuarios y contraseñas en `localStorage` **en texto
> plano** — es una simulación de prototipo, no un sistema apto para
> producción. Ver sección "De prototipo a producción" más abajo.

Panel admin: inicia sesión con el usuario admin — el login te lleva
automáticamente a `#/admin` (un cliente normal va a `#/account`, y si
intenta entrar a `#/admin` es redirigido de vuelta con un aviso de que no
tiene permisos).

### Panel administrativo

Secciones disponibles en `/admin`: **Dashboard**, **Pedidos**,
**Clientes**, **Productos**, **Inventario**, **Categorías**, **Drops**,
**Promociones**, **Reseñas**, **Envíos**, **Analytics** y
**Configuración**. El costo de envío estándar/exprés y el umbral de envío
gratis se editan desde `/admin/shipping` y afectan de inmediato al
carrito y al checkout de toda la tienda (`Storage.getShippingConfig()` es
la única fuente de verdad para esos valores).

## Flujo de compra de punta a punta

1. Explora el catálogo (`Tenis` / `Gorras`), filtra por marca, precio,
   color, disponibilidad, etc.
2. Abre un producto, elige color y talla/tipo (las variantes agotadas
   aparecen tachadas y deshabilitadas).
3. Agrega al carrito o compra directo con "Comprar ahora".
4. En el carrito verás upsell (combos, "también te puede interesar") y
   un indicador de cuánto falta para envío gratis.
5. Checkout en 4 pasos: Datos → Envío → Pago (simulado) → Confirmación.
   Puedes comprar **como invitado** o iniciar sesión antes.
6. El pedido queda visible en "Mis pedidos" con número, estado y
   seguimiento visual (o vía "Seguimiento de pedido" si compraste como
   invitado).
7. Desde `/admin/orders` el administrador puede abrir el pedido y cambiar
   su estado; el cliente ve el cambio reflejado de inmediato la próxima
   vez que abre su pedido (todo lee del mismo `Store` central).

## Estructura del proyecto

```
/index.html            Documento único que carga todos los módulos
/css
  global.css            Tokens de diseño (color/tipografía), reset, utilidades
  components.css        Header, cards, botones, modales, drawers, formularios...
  responsive.css         Media queries mobile-first
  admin.css              Estilos exclusivos del panel /admin
/js
  utils.js               Helpers puros (moneda, fechas, debounce, etc.)
  storage.js              ÚNICA puerta de entrada a localStorage
  store.js                 Estado central compartido (pub/sub)
  notifications.js          Sistema de toasts
  ui.js                      Header/footer/drawers/modal + tarjeta de producto
  auth.js                     Sesión, registro, login, direcciones, favoritos
  inventory.js                  Reglas de stock (reserva / commit / release)
  products.js                    Filtros, orden, búsqueda, vistas de catálogo/PDP
  cart.js                         Carrito, totales, cupones, combos, upsell
  orders.js                        Ciclo de vida del pedido + vistas de pedidos
  checkout.js                       Checkout de 4 pasos + pago simulado
  views.js                          Home, login/registro, cuenta, favoritos
  admin.js                          Panel administrativo completo
  router.js                         Enrutador hash-based (sin servidor)
  app.js                            Bootstrap: siembra datos y registra rutas
/data
  config.js               Configuración editable (envío, pagos, cupones, estados)
  categories.js             Categorías y marcas
  products.js                Generador de los 30 productos de demostración
```

### Por qué esta arquitectura

- **Sistema de roles real.** Cada usuario tiene `role: 'customer' | 'admin'`.
  El login redirige según el rol (`#/account` vs `#/admin`), y todas las
  rutas `/admin/*` están protegidas server-side... bueno, cliente-side por
  ahora vía `Router` (`opts.adminOnly` + `AuthModule.requireAdmin()`): un
  cliente que intente entrar a `/admin` es redirigido a `#/account` con un
  aviso, nunca ve la interfaz administrativa ni por un instante.
- **`storage.js` es la única capa que toca `localStorage`.** Todo lo demás
  llama a `Storage.getProducts()`, `Storage.saveOrder()`, etc. Cuando
  conectes un backend real, reescribes el cuerpo de esas funciones para
  hacer `fetch`/consultas — las vistas y la lógica de negocio no cambian.
- **`store.js` es el estado central** que todos los módulos leen y
  mutan (patrón pub/sub simple). Nadie guarda copias propias de
  productos/carrito/pedidos.
- **Los productos son objetos JS con variantes reales** (`talla × color`
  para tenis, `tipo × color` para gorras), no tarjetas HTML fijas — ver
  `data/products.js`.
- **El inventario sigue la regla de reserva/compromiso** (ver
  `inventory.js`): agregar al carrito nunca descuenta stock; crear el
  pedido solo reserva (valida disponibilidad); confirmar el pago
  descuenta de verdad; cancelar un pedido ya comprometido devuelve el
  inventario.

## De prototipo a producción

Este proyecto está pensado como v1 desacoplable. Los puntos de reemplazo
son:

1. **`storage.js`** → reemplazar las funciones internas por llamadas a
   Supabase/Firebase/tu API. El resto de módulos no debería necesitar
   cambios porque todos pasan por esta capa.
2. **`auth.js`** → hoy simula login/registro comparando contraseñas en
   texto plano contra `localStorage`. Reemplazar por Supabase Auth,
   Firebase Auth, o tu propio backend con hashing real de contraseñas.
3. **`checkout.js` → `processPayment()`** → hoy simula el resultado del
   pago con un `setTimeout`. Reemplazar por la integración real con
   Wompi/Mercado Pago/PSE, manteniendo el mismo contrato: al confirmar el
   pago se llama a `OrdersModule.updateStatus(order, 'confirmed')`.
4. **Autorización de admin** → hoy la protección de `/admin/*`
   (`AuthModule.requireAdmin()` en el `Router`) vive solo en el cliente,
   como es inevitable en una SPA sin backend. En producción esa misma
   verificación debe repetirse en el servidor/API (nunca confiar solo en
   ocultar rutas del lado del cliente).

## Agregar o editar productos

- **Desde el panel admin** (`/admin/products` → "+ Nuevo producto"): la
  forma recomendada, genera variantes automáticamente a partir de los
  colores y tallas/tipos que escribas.
- **Editando el generador de datos demo** (`data/products.js`): útil si
  quieres cambiar el catálogo de demostración que se siembra en la
  primera carga. Sigue el mismo patrón `makeProduct({...})` que ya usan
  los 30 productos existentes.
- **Guía de tallas de tenis**: editable en `data/config.js` →
  `EFAAT_CONFIG.sizeGuide.tenis`.

## Qué es simulado en esta v1 (a propósito)

- Pagos (tarjeta, PSE, transferencia, contraentrega, Mercado Pago, Wompi):
  no se procesa ninguna transacción real.
- Autenticación: sesión guardada en `localStorage`, sin hashing de
  contraseña ni backend.
- Envíos: no hay integración con transportadoras; los costos y tiempos
  son configurables en `data/config.js`.

## Notas de accesibilidad y responsive

- Probado sin overflow horizontal en 320/375/390/414/768/1024/1440px.
- Estados de foco visibles (`:focus-visible`) en toda la app.
- Imágenes con `alt`, botones con `aria-label` donde no hay texto visible.
- `prefers-reduced-motion` respetado (desactiva animaciones).
