# js/orchestrators/

Coordinan operaciones que tocan varios services/repositories a la
vez. No contienen lógica de acceso a datos (eso es de
services/repositories) ni renderizan HTML (eso es de la UI/módulos).

- `catalogOrchestrator.js` — carga products/categories/drops/shipping_settings/coupons desde Supabase hacia Store; suscripción realtime a esas tablas. Sin fallback local: si Supabase falla, Store queda con `catalogError` seteado, nunca con datos inventados.
- `adminOrchestrator.js` — todas las escrituras de `/admin` (productos, variantes/stock, categorías, drops, cupones, envío, imágenes). Cada función espera la sesión admin de Supabase (`authRepository`, Fase 0) antes de escribir y devuelve `{ ok, error, ... }`, nunca lanza ni llama a Notify/Ui directamente.
