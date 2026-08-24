/**
 * env.js — valores PÚBLICOS de configuración de Supabase para el
 * frontend. Solo la URL y la publishable key: ambas están pensadas
 * para ser públicas (protegidas por RLS, no por secreto). La
 * secret/service_role key NUNCA vive acá ni en ningún archivo de js/.
 *
 * El proyecto no tiene bundler ni process.env en el navegador — este
 * archivo sigue el mismo patrón que data/config.js: un <script>
 * clásico que expone un global de solo lectura.
 *
 * Generado a partir del .env de la raíz. Si esos valores cambian,
 * hay que regenerar este archivo (no hay paso de build que lo haga
 * solo todavía).
 */
window.EFAAT_SUPABASE_ENV = Object.freeze({
  url: 'https://lexvadfwqccllqxmvmut.supabase.co',
  publishableKey: 'sb_publishable_E3FL8hj6v3BVgyMBG4OF9g_EIpxP0Sb',
});
