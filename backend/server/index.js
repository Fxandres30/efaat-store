/**
 * server/index.js — bootstrap del backend. Arranca un servidor Express
 * independiente del frontend estático (index.html sigue sirviéndose
 * tal cual, sin ningún cambio, y no depende de este servidor todavía).
 */
import express from 'express';
import cors from 'cors';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { ordersRouter } from '../routes/orders.route.js';
import { inventoryRouter } from '../routes/inventory.route.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());

// GET /health — confirma que el backend arrancó Y que puede hablar de
// verdad con Supabase (no solo que el cliente se instanció en memoria).
// Consulta de solo lectura, limitada, sobre una tabla pública que ya
// sabemos que tiene datos de referencia. Nunca expone credenciales ni
// el detalle interno de un error — eso solo va al log del servidor.
app.get('/health', async (req, res) => {
  const base = { ok: true, service: 'efaat-store-backend' };

  const { error } = await supabaseAdmin.from('categories').select('id').limit(1);

  if (error) {
    console.error('[health] Supabase no respondió:', error.message);
    return res.status(503).json({ ...base, ok: false, supabase: 'unavailable' });
  }

  res.json({ ...base, supabase: 'connected' });
});

app.use('/orders', ordersRouter);
app.use('/inventory', inventoryRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[efaat-store-backend] escuchando en http://localhost:${env.port}`);
  console.log(`[efaat-store-backend] clave administrativa cargada desde ${env.supabaseAdminKeyName}`);
});
