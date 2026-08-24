# js/realtime/

Vacía a propósito por ahora. La única suscripción realtime que existe
hoy (products/product_variants/categories/drops/shipping_settings/
coupons) vive dentro de `js/orchestrators/catalogOrchestrator.js`
(`subscribeToChanges()`/`unsubscribe()`) — es un único canal, simple,
que no justificaba todavía extraer un `realtimeManager.js` genérico
aparte. Si en el futuro se necesitan más suscripciones con lógica de
limpieza más compleja (por vista, con múltiples canales), ese es el
momento de crear ese archivo acá.
