/**
 * productRepository.js — única capa que habla con Supabase para
 * productos y sus variantes (categorías viven en categoryRepository.js
 * desde la reorganización arquitectónica — antes estaban acá).
 * Responsabilidad única: leer/mutar datos.
 *
 * NO renderiza HTML, NO toca Store, NO llama a Ui ni a Notify — eso
 * es de productService.js / catalogOrchestrator.js / adminOrchestrator.js
 * hacia arriba.
 */
const ProductRepository = (() => {
  async function listDrops() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('drops')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Admin: incluye drops inactivos/finalizados, para /admin/drops.
  async function listAllDropsForAdmin() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('drops').select('*').order('start_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function insertDrop(payload) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('drops').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function updateDrop(id, patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('drops').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function removeDrop(id) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.from('drops').delete().eq('id', id);
    if (error) throw error;
  }

  // Trae cada producto con sus variantes y el slug de categoría ya
  // unidos (una sola consulta) — evita que el service tenga que hacer
  // N+1 llamadas.
  async function listProducts() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), categories(slug, name)')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Admin: incluye inactivos (RLS p_products_read los expone solo a
  // is_admin()) — usado por el panel de administración de productos.
  async function listAllForAdmin() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), categories(slug, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function getProductById(id) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), categories(slug, name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // Disponibilidad real (stock - reservas activas) — vista ya creada
  // en la migración 0001, ver product_variants_availability.
  async function listVariantsAvailability(productId) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('product_variants_availability')
      .select('*')
      .eq('product_id', productId);
    if (error) throw error;
    return data;
  }

  // ---------- Escritura (admin — requiere sesión is_admin(auth.uid())) ----------
  async function insert(payload) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('products').insert(payload).select('*, product_variants(*), categories(slug, name)').single();
    if (error) throw error;
    return data;
  }

  async function update(id, patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('products').update(patch).eq('id', id)
      .select('*, product_variants(*), categories(slug, name)').single();
    if (error) throw error;
    return data;
  }

  async function remove(id) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  // Único punto que escribe la columna `images` — lo usa
  // adminOrchestrator después de subir/borrar/reordenar en Storage
  // (ver imageRepository.js).
  async function updateImages(id, images) {
    return update(id, { images });
  }

  async function insertVariants(rows) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('product_variants').insert(rows).select();
    if (error) throw error;
    return data;
  }

  // Solo para campos que NO son stock (color/size/sku/price) — el
  // stock de una variante existente se ajusta vía
  // inventoryRepository.adjustStock() (RPC manual_adjust_stock), nunca
  // con un update crudo, para que quede auditado en stock_movements.
  async function updateVariant(variantId, patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('product_variants').update(patch).eq('id', variantId).select().single();
    if (error) throw error;
    return data;
  }

  async function removeVariant(variantId) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
    if (error) throw error;
  }

  return {
    listDrops, listAllDropsForAdmin, insertDrop, updateDrop, removeDrop,
    listProducts, listAllForAdmin, getProductById, listVariantsAvailability,
    insert, update, remove, updateImages, insertVariants, updateVariant, removeVariant,
  };
})();
