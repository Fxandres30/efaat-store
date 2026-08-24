# js/services/

Reglas de negocio del frontend, sin SQL ni llamadas directas a
Supabase (eso vive en `repositories/`):

- `productService.js` — mapeo de filas Supabase → forma de la app, filtros/orden/búsqueda de catálogo (única implementación — ver js/modules/catalog/catalogList.js)
- `currencyService.js` — tasa COP/USD, preferencia activa, formateo de precios (única implementación de `Intl.NumberFormat` para moneda en todo el proyecto)
- `imageService.js` — validación de archivo y construcción de rutas de Storage, sin I/O
- `inventoryService.js` — reglas de reserva/commit/release de stock (ajuste real y auditado vive en `AdminOrchestrator` + `inventoryRepository`)
- `preferencesService.js` — único uso legítimo de localStorage como "base de datos": preferencias de interfaz (hoy, moneda)
