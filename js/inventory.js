/**
 * inventory.js — reglas de inventario (regla 42 del brief):
 *  - Agregar al carrito NO descuenta stock definitivo.
 *  - Crear el pedido RESERVA (solo valida disponibilidad, no descuenta).
 *  - Confirmar el pago (simulado) DESCUENTA inventario real (commit).
 *  - Cancelar un pedido YA comprometido DEVUELVE el inventario (release).
 *  - Un pedido pendiente que se cancela sin haber comprometido inventario
 *    no necesita devolver nada.
 *
 * Preparado para, en el futuro, reemplazarse por reservas temporales
 * reales (con expiración) contra un backend.
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
      Storage.saveProduct(product);
    });
    Store.state.products = Storage.getProducts();
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
      Storage.saveProduct(product);
    });
    Store.state.products = Storage.getProducts();
    order.inventoryCommitted = false;
    Store.emit('products:changed');
  }

  function stockLevel(stock) {
    if (stock <= 0) return 'out';
    if (stock <= LOW_STOCK_THRESHOLD) return 'low';
    return 'normal';
  }

  function updateVariantStock(productId, variantId, newStock) {
    const product = Store.getProductById(productId);
    if (!product) return;
    const variant = Store.getVariant(product, variantId);
    if (!variant) return;
    variant.stock = Math.max(0, Math.round(newStock));
    recomputeProductStock(product);
    Store.upsertProduct(product);
  }

  return { LOW_STOCK_THRESHOLD, checkAvailability, commitInventory, releaseInventory, stockLevel, updateVariantStock };
})();
