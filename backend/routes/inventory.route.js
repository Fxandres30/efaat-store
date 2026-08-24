/**
 * inventory.route.js — rutas de inventario. SIN lógica real todavía;
 * llega en la Fase G del mapa de migración. El inventario en sí ya
 * vive en Supabase (funciones reserve_inventory/commit_inventory/
 * release_inventory de la migración 0001) — estas rutas solo lo van a
 * exponer de forma controlada desde el backend cuando corresponda.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const inventoryRouter = Router();

// POST /inventory/reserve — hoy reserve_inventory ya es llamable por
// RPC directo desde el frontend (así quedó diseñado en la migración
// 0001). Esta ruta queda lista para cuando el checkout se mueva
// detrás del backend (Fase F/G).
inventoryRouter.post('/reserve', requireAuth, (req, res) => {
  res.status(501).json({ error: 'No implementado todavía. Llega en la Fase G del mapa de migración.' });
});

// GET /inventory/movements — bitácora de stock_movements, solo admin.
inventoryRouter.get('/movements', requireAuth, requireAdmin, (req, res) => {
  res.status(501).json({ error: 'No implementado todavía. Llega en la Fase G del mapa de migración.' });
});
