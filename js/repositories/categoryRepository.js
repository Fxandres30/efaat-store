/**
 * categoryRepository.js — única capa que habla con Supabase para
 * categorías (separado de productRepository.js en la reorganización
 * arquitectónica — antes vivía ahí). Responsabilidad única: leer/
 * mutar la tabla `categories`. NO renderiza HTML, NO toca Store.
 */
const CategoryRepository = (() => {
  async function list() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image, active')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data;
  }

  // Admin: lista todas (incl. inactivas) — RLS p_products_read-equivalente
  // para categories exige is_admin() para ver las inactivas también.
  async function listAll() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image, active')
      .order('name');
    if (error) throw error;
    return data;
  }

  async function insert(payload) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('categories').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function update(id, patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  return { list, listAll, insert, update };
})();
