/**
 * orders.route.js — rutas de pedidos. SIN lógica real todavía: eso
 * llega en la Fase F del mapa de migración (checkout/pedidos). Por
 * ahora solo deja la forma de la API lista, protegida con requireAuth,
 * para que el frontend no tenga que adivinar rutas cuando llegue esa
 * fase.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

export const ordersRouter = Router();

// POST /orders — crea un pedido real (checkout). Implementación: Fase F.
ordersRouter.post('/', requireAuth, (req, res) => {
  res.status(501).json({ error: 'No implementado todavía. Llega en la Fase F del mapa de migración.' });
});

// GET /orders/:id — detalle de un pedido propio. Implementación: Fase F.
ordersRouter.get('/:id', requireAuth, (req, res) => {
  res.status(501).json({ error: 'No implementado todavía. Llega en la Fase F del mapa de migración.' });
});
