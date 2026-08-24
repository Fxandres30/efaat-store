/**
 * inventoryRepository.js — única capa que ajusta stock de variante en
 * Supabase. NUNCA hace un `update` crudo sobre `product_variants.stock`
 * — siempre llama al RPC `manual_adjust_stock(p_variant_id, p_new_stock,
 * p_reason)` (ver migración 0001, Sección 7.6), que es la única vía
 * que deja auditoría en `stock_movements` y que la propia base de
 * datos exige (el RPC revisa is_admin(auth.uid()) internamente).
 */
const InventoryRepository = (() => {
  async function adjustStock(variantId, newStock, reason) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.rpc('manual_adjust_stock', {
      p_variant_id: variantId,
      p_new_stock: Math.max(0, Math.round(newStock)),
      p_reason: reason || 'Ajuste manual desde /admin/inventory',
    });
    if (error) throw error;
  }

  return { adjustStock };
})();
