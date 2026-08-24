/**
 * supabaseAdmin.js — ÚNICO lugar de todo el proyecto donde se
 * inicializa un cliente Supabase con la clave administrativa
 * (service_role/secret). Ningún otro archivo debe llamar
 * createClient() con esa clave — todo lo que necesite acceso
 * administrativo importa `supabaseAdmin` desde acá (repositories,
 * middleware).
 *
 * Este cliente bypassa RLS por diseño (es exactamente para eso que
 * existe la clave administrativa) — por eso vive solo en backend/ y
 * cada uso debe pasar antes por requireAuth/requireAdmin cuando
 * corresponda.
 */
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseAdminKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
