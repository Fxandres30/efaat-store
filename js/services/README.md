# js/services/

Reglas de negocio del frontend, sin SQL ni llamadas directas a
Supabase (eso vive en `repositories/`). Un archivo por dominio
(`productService.js`, `cartService.js`, `authService.js`, etc.) — se
crean a medida que cada dominio se migra (Fases C a H del mapa de
migración).
