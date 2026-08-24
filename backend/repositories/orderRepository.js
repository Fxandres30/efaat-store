/**
 * orderRepository.js — única capa que va a hablar con Supabase para
 * pedidos, usando supabaseAdmin. VACÍO A PROPÓSITO — se completa en
 * la Fase F del mapa de migración, cuando el checkout real se
 * construya. No se duplica antes la lógica que hoy vive en
 * js/checkout.js y js/orders.js.
 *
 * Lo que va a vivir acá:
 *   - insertOrder(orderRow)
 *   - insertOrderItems(orderId, items)
 *   - callReserveInventory(orderId, items)   -- RPC reserve_inventory
 *   - findOrderById(orderId)
 *   - findOrdersByUser(userId)
 */
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export const orderRepository = {
  // se completa en la Fase F — supabaseAdmin ya está importado y listo
};
