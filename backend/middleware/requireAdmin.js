/**
 * requireAdmin.js — debe montarse DESPUÉS de requireAuth en la cadena
 * (necesita req.user ya cargado). Verifica el rol leyendo public.users
 * con el cliente administrativo — la misma fuente real que usa
 * is_admin() en Supabase, nunca algo que mande el cliente.
 */
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'requireAdmin debe usarse después de requireAuth.' });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (error || data?.role !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol de administrador.' });
  }

  next();
}
