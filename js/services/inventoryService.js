/**
 * inventoryService.js — reglas de inventario (relocado de
 * js/inventory.js en la reorganización arquitectónica, el global
 * sigue llamándose InventoryModule):
 *  - Agregar al carrito NO descuenta stock definitivo.
 *  - Crear el pedido RESERVA (solo valida disponibilidad, no descuenta).
 *  - Confirmar el pago (simulado) DESCUENTA inventario real (commit).
 *  - Cancelar un pedido YA comprometido DEVUELVE el inventario (release).
 *
 * IMPORTANTE — alcance de esta fase: commitInventory()/releaseInventory()
 * ajustan Store.state.products SOLO EN MEMORIA (nunca escriben en
 * Supabase ni en localStorage). El ajuste real y auditado de stock en
 * Supabase (RPC manual_adjust_stock, con auditoría en stock_movements)
 * es exclusivo del admin vía AdminOrchestrator.adjustVariantStock() —
 * un cliente comprando no tiene sesión admin para llamar ese RPC. Esto
 * es consistente con que checkout/pedidos siguen siendo locales en
 * esta fase (ver informe de arquitectura, "Fuera de alcance"): el
 * descuento de stock por una compra es una optimización visual de la
 * sesión actual, no una escritura durable — se resetea al recargar
 * (vuelve a leer el stock real de Supabase). No se inventa una
 * segunda fuente de verdad de stock: Supabase sigue siendo la única
 * fuente real, esto es solo feedback inmediato en pantalla.
 */
const InventoryModule = (() => {
  const LOW_STOCK_THRESHOLD = 3;

  function checkAvailability(items) {
    const problems = [];
    items.forEach((it) => {
      const product = Store.getProductById(it.productId);
      const variant = product ? Store.getVariant(product, it.variantId) : null;
      if (!variant || variant.stock < it.qty) {
        problems.push({ productId: it.productId, variantId: it.variantId, name: product ? product.name : it.productId });
      }
    });
    return { ok: problems.length === 0, problems };
  }

  function recomputeProductStock(product) {
    product.stock = product.variants.reduce((s, v) => s + v.stock, 0);
  }

  function commitInventory(order) {
    if (order.inventoryCommitted) return;
    order.items.forEach((it) => {
      const product = Store.getProductById(it.productId);
      if (!product) return;
      const variant = Store.getVariant(product, it.variantId);
      if (!variant) return;
      variant.stock = Math.max(0, variant.stock - it.qty);
      recomputeProductStock(product);
    });
    order.inventoryCommitted = true;
    Store.emit('products:changed');
  }

  function releaseInventory(order) {
    if (!order.inventoryCommitted) return;
    order.items.forEach((it) => {
      const product = Store.getProductById(it.productId);
      if (!product) return;
      const variant = Store.getVariant(product, it.variantId);
      if (!variant) return;
      variant.stock += it.qty;
      recomputeProductStock(product);
    });
    order.inventoryCommitted = false;
    Store.emit('products:changed');
  }

  function stockLevel(stock) {
    if (stock <= 0) return 'out';
    if (stock <= LOW_STOCK_THRESHOLD) return 'low';
    return 'normal';
  }

  return { LOW_STOCK_THRESHOLD, checkAvailability, commitInventory, releaseInventory, stockLevel };
})();
