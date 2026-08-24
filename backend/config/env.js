/**
 * env.js — valida y centraliza las variables de entorno del backend.
 * Ningún otro archivo debe leer `process.env` directamente: todos
 * importan `env` desde acá. Así hay un único lugar que sabe qué
 * variables existen, y un único lugar que puede fallar el arranque
 * con un mensaje claro si falta algo.
 */
import { config as loadDotenv } from 'dotenv';

loadDotenv();

function requireVar(name, value) {
  if (!value || !value.trim()) {
    throw new Error(
      `[env] Falta la variable de entorno "${name}". ` +
      'Copiá backend/.env.example a backend/.env y completá los valores reales.'
    );
  }
  return value.trim();
}

const supabaseUrl = requireVar('SUPABASE_URL', process.env.SUPABASE_URL);

// El proyecto puede tener la clave administrativa bajo cualquiera de
// dos nombres, según la generación de claves de Supabase (ver
// backend/.env.example). Se acepta cualquiera de las dos — nunca se
// asume una sin comprobar, y se registra CUÁL se usó (nunca el valor).
const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabaseAdminKeyRaw = rawServiceRoleKey || rawSecretKey;

if (!supabaseAdminKeyRaw || !supabaseAdminKeyRaw.trim()) {
  throw new Error(
    '[env] Falta la clave administrativa de Supabase. Definí ' +
    'SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY en backend/.env.'
  );
}

export const env = {
  supabaseUrl,
  supabaseAdminKey: supabaseAdminKeyRaw.trim(),
  supabaseAdminKeyName: rawServiceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SECRET_KEY',
  port: Number(process.env.PORT) || 3001,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
