/**
 * productRepository.js — única capa que habla con Supabase para
 * catálogo (products, product_variants, categories, drops,
 * disponibilidad). Responsabilidad única: leer/mutar datos.
 *
 * NO renderiza HTML, NO toca Store, NO llama a Ui ni a Notify — eso
 * es de productService.js / catalogOrchestrator.js hacia arriba.
 */
const ProductRepository = (() => {
  async function listCategories() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, image, active')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data;
  }

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

  return { listCategories, listDrops, listProducts, getProductById, listVariantsAvailability };
})();
