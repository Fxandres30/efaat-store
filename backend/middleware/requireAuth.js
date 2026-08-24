/**
 * requireAuth.js — exige un JWT válido de Supabase Auth en el header
 * `Authorization: Bearer <token>`. Usa supabaseAdmin.auth.getUser()
 * para verificarlo contra Supabase de verdad — no es un middleware
 * simulado, y NO acepta ningún valor de Authorization como si fuera
 * válido.
 *
 * Todavía ninguna ruta lo usa con lógica real detrás (eso llega con
 * el checkout/pedidos reales, Fase F del mapa de migración) — por
 * ahora protege los endpoints placeholder de orders.route.js /
 * inventory.route.js para que su forma final ya esté correcta.
 */
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta un token Bearer válido en Authorization.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  req.user = data.user; // { id, email, ... } — el resto de la ruta lo lee de acá
  next();
}
