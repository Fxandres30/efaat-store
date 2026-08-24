/**
 * commerceRepository.js — única capa que habla con Supabase para
 * configuración comercial: envío (`shipping_settings`, fila única
 * id=true) y cupones (`coupons`). Nace en la reorganización
 * arquitectónica junto con la migración de catálogo — antes vivían
 * en localStorage (Storage.getShippingConfig/getCoupons).
 *
 * NOTA OPERATIVA: ninguna de las dos tablas viene sembrada por
 * backend/scripts/seedCatalog.js (solo siembra categories/drops/
 * products/product_variants). Hasta que un admin guarde la
 * configuración de envío una vez desde /admin/shipping, la fila
 * singleton de shipping_settings no existe — getShippingSettings()
 * devuelve null y la UI debe mostrar un estado claro, nunca inventar
 * un valor. Igual con coupons: la lista viene vacía hasta que un
 * admin cree cupones desde /admin/promotions.
 */
const CommerceRepository = (() => {
  async function getShippingSettings() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('shipping_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();
    if (error) throw error;
    return data; // null si nunca se ha guardado
  }

  // Upsert sobre la fila singleton (id=true) — la primera vez que un
  // admin guarda /admin/shipping, esto la crea.
  async function saveShippingSettings(patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('shipping_settings')
      .upsert({ id: true, ...patch })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // minSubtotal (alias de min_subtotal): el resto de la app ya lee
  // coupon.minSubtotal en camelCase (cart.js/checkout.js/orders.js) —
  // se alía acá en la consulta en vez de agregar un mapper aparte.
  async function listCoupons() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('code, type, value, minSubtotal:min_subtotal, active, label')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function insertCoupon(payload) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('coupons').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function updateCoupon(code, patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('coupons').update(patch).eq('code', code).select().single();
    if (error) throw error;
    return data;
  }

  async function removeCoupon(code) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.from('coupons').delete().eq('code', code);
    if (error) throw error;
  }

  return { getShippingSettings, saveShippingSettings, listCoupons, insertCoupon, updateCoupon, removeCoupon };
})();
