# js/supabase/

Va a vivir acá `client.js` — el ÚNICO cliente Supabase del frontend,
inicializado con la publishable key (nunca la secret/service_role key,
esa vive solo en `backend/`). Se crea en la Fase B del mapa de
migración.

Por ahora esta carpeta está vacía a propósito: el frontend actual
sigue funcionando 100% con localStorage, sin cambios.
