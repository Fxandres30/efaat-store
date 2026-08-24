/**
 * orderService.js — reglas de negocio de pedidos (Fase F del mapa de
 * migración). TODAVÍA VACÍO A PROPÓSITO: la lógica de creación de
 * pedido que hoy vive en js/checkout.js y js/orders.js no se duplica
 * acá hasta esa fase — evita tener dos versiones de la misma regla al
 * mismo tiempo (una en el frontend, otra a medio migrar acá).
 *
 * Lo que va a vivir acá cuando llegue la Fase F:
 *   - createOrder(userOrGuest, items, address, paymentMethod)
 *       · recalcula subtotal/descuento/envío/total desde los precios
 *         reales en Supabase (nunca confía en los que mande el cliente)
 *       · usa orderRepository para reservar inventario y crear el
 *         pedido + items + primer estado, todo en una sola operación
 *   - updateOrderStatus(orderId, newStatus, actingUser)
 *   - cancelOrder(orderId, actingUser)
 */
import { orderRepository } from '../repositories/orderRepository.js';

export const orderService = {
  // se completa en la Fase F — orderRepository ya está importado y listo
};
