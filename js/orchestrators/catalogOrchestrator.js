/**
 * catalogOrchestrator.js — coordina
 * ProductRepository/CategoryRepository/CommerceRepository →
 * ProductService → Store → UI para catálogo y configuración
 * comercial (envío, cupones). No hace consultas a Supabase acá (eso
 * es del repository) y no contiene reglas de negocio (eso es del
 * service).
 *
 * FUENTE ÚNICA — sin fallback local: Supabase es la única fuente de
 * verdad de products/categories/drops/shipping_settings/coupons. Si
 * la carga falla, NO se inventa ni se reutiliza ningún dato local —
 * Store.state queda con catalogError seteado y catalogLoading:false,
 * y las vistas (home/catálogo/PDP/carrito) deben mostrar un estado de
 * error real, nunca datos de relleno. Nunca se escribe en
 * localStorage desde este archivo.
 */
const CatalogOrchestrator = (() => {
  async function loadCatalog() {
    Store.state.catalogLoading = true;
    Store.state.catalogError = null;

    try {
      const [products, categories, drops, shippingConfig, coupons] = await Promise.all([
        ProductService.getAllProducts(),
        ProductService.getCategories(),
        ProductService.getDrops(),
        CommerceRepository.getShippingSettings(),
        CommerceRepository.listCoupons(),
      ]);

      Store.state.products = products;
      Store.state.categories = categories;
      Store.state.drops = drops;
      Store.state.shippingConfig = shippingConfig ? mapShippingRow(shippingConfig) : null;
      Store.state.coupons = coupons;
      Store.state.catalogSource = 'supabase';
      Store.state.catalogLoading = false;

      Store.emit('products:changed');
      Store.emit('categories:changed');
      Store.emit('drops:changed');
      Store.emit('shipping:changed');
      Store.emit('coupons:changed');

      // Reseñas demo: se siembran una sola vez, ahora que hay ids de
      // producto reales (uuid de Supabase) — ver core/localStore.js.
      Storage.seedReviewsFromProducts(products);

      return { ok: true, productCount: products.length };
    } catch (err) {
      console.error('[CatalogOrchestrator] no se pudo cargar el catálogo desde Supabase:', err.message);
      Store.state.catalogError = err.message;
      Store.state.catalogLoading = false;
      Store.emit('products:changed'); // las vistas re-renderizan y muestran el estado de error
      return { ok: false, error: err.message };
    }
  }

  function mapShippingRow(row) {
    return {
      standardShippingCost: Number(row.standard_shipping_cost),
      expressShippingCost: Number(row.express_shipping_cost),
      freeShippingThreshold: Number(row.free_shipping_threshold),
    };
  }

  // ---------- Realtime ----------
  // Supabase → Realtime → acá (re-lee y reemplaza el estado en memoria,
  // igual que loadCatalog) → Store → UI. Nunca orders/inventory/cart
  // (esos siguen siendo locales, ver informe de arquitectura). No hay
  // parche fila-por-fila — cada evento vuelve a pedir el catálogo
  // entero, barato porque son ~30 productos.
  let channel = null;

  async function subscribeToChanges() {
    if (channel) return channel; // evita suscripciones duplicadas
    const supabase = await SupabaseClient.getClient();

    channel = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipping_settings' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, loadCatalog)
      .subscribe();

    return channel;
  }

  function unsubscribe() {
    if (channel) { channel.unsubscribe(); channel = null; }
  }

  return { loadCatalog, subscribeToChanges, unsubscribe };
})();
