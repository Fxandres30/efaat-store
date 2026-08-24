# js/repositories/

Única capa autorizada a llamar al SDK de Supabase desde el frontend.
Un archivo por dominio (`productRepository.js`, `orderRepository.js`,
`cartRepository.js`, etc.) — se crean en la Fase B del mapa de
migración.

Ningún service ni vista debe importar `js/supabase/client.js`
directamente: siempre a través de un repository.
