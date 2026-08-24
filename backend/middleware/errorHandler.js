/**
 * errorHandler.js — manejador global de errores, montado al final de
 * la cadena en server/index.js. Nunca expone stack traces, mensajes
 * internos de Postgres/Supabase ni secretos al cliente: eso queda
 * solo en el log del servidor. El cliente recibe un mensaje genérico
 * salvo que el error ya venga con un status < 500 (errores esperables
 * como validación, que sí pueden traer un mensaje útil).
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Error interno del servidor.';

  res.status(status).json({ error: message });
}
