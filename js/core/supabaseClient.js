/**
 * supabaseClient.js — ÚNICO cliente Supabase del frontend (regla 21
 * del proyecto: "Supabase debe tener un único cliente centralizado").
 * Usa exclusivamente la publishable key — protegida por RLS, nunca la
 * secret/service_role key (esa vive solo en backend/).
 *
 * El proyecto no tiene bundler todavía (regla del brief: no introducir
 * Vite/webpack en esta fase), así que el SDK de Supabase se carga por
 * import() dinámico desde CDN — la misma versión que usa el backend
 * (@supabase/supabase-js@2.112.4) — en vez de agregar una segunda
 * etiqueta <script src> a index.html. import() dinámico funciona
 * dentro de un <script> clásico (no hace falta type="module"), así
 * que este archivo se mantiene con el mismo patrón IIFE que el resto
 * de js/.
 *
 * La carga es asíncrona: todo lo que necesite el cliente debe esperar
 * la promesa de getClient().
 */
const SupabaseClient = (() => {
  const SDK_URL = 'https://esm.sh/@supabase/supabase-js@2.112.4';
  let clientPromise = null;

  function getClient() {
    const env = window.EFAAT_SUPABASE_ENV;
    if (!env || !env.url || !env.publishableKey) {
      return Promise.reject(new Error(
        '[SupabaseClient] Falta js/core/env.js (o sus valores) — asegurate de cargarlo antes que este archivo.'
      ));
    }
    if (!clientPromise) {
      clientPromise = import(SDK_URL).then(({ createClient }) =>
        createClient(env.url, env.publishableKey)
      );
    }
    return clientPromise;
  }

  return { getClient };
})();
