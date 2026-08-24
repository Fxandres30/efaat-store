/**
 * catalogOrchestrator.js — coordina
 * ProductRepository → ProductService → Store → UI para el catálogo.
 * No hace consultas a Supabase acá (eso es del repository) y no
 * contiene reglas de negocio (eso es del service).
 *
 * Fuente de verdad / fallback (ver Fase B):
 *   - Si Supabase responde, sobreescribe Store.state EN MEMORIA.
 *   - Si falla, NO toca Store — el catálogo que Store.init() ya cargó
 *     desde localStorage sigue exactamente como estaba. Ese "no hacer
 *     nada" ES el fallback pedido; no hay una segunda implementación
 *     de siembra acá.
 *   - Nunca se llama a Storage.saveProducts()/saveCategories()/etc.
 *     desde este archivo — los datos de Supabase no se vuelven a
 *     escribir en localStorage bajo ningún caso.
 *
 * Nota de alcance: todavía no hay ningún <script> en index.html que
 * cargue esta cadena de archivos en la página real (ver informe de
 * Fase B) — por ahora existe y se puede probar de forma aislada, pero
 * no se ejecuta todavía en la tienda en vivo.
 */
const CatalogOrchestrator = (() => {
  async function loadCatalog() {
    Store.state.catalogSource = Store.state.catalogSource || 'local';
    Store.state.catalogError = null;

    try {
      const [products, categories, drops] = await Promise.all([
        ProductService.getAllProducts(),
        ProductService.getCategories(),
        ProductService.getDrops(),
      ]);

      Store.state.products = products;
      Store.state.categories = categories;
      Store.state.drops = drops;
      Store.state.catalogSource = 'supabase';

      Store.emit('products:changed');
      Store.emit('drops:changed');

      return { ok: true, source: 'supabase', productCount: products.length };
    } catch (err) {
      console.error('[CatalogOrchestrator] Supabase no disponible, se conserva el catálogo local:', err.message);
      Store.state.catalogError = err.message;
      return { ok: false, source: 'local', error: err.message };
    }
  }

  // ---------- Realtime (Fase C: solo products/product_variants/drops) ----------
  // Supabase → Realtime → acá (re-lee y reemplaza el estado en memoria,
  // igual que loadCatalog) → Store → UI. Nunca orders/inventory/cart.
  // No hay lógica de parche fila-por-fila todavía (eso es una mejora de
  // la Fase de Realtime completa) — cada evento simplemente vuelve a
  // pedir el catálogo entero, que ya es barato porque son ~30 productos.
  let channel = null;

  async function subscribeToChanges() {
    if (channel) return channel; // evita suscripciones duplicadas
    const supabase = await SupabaseClient.getClient();

    channel = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, loadCatalog)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, loadCatalog)
      .subscribe();

    return channel;
  }

  function unsubscribe() {
    if (channel) { channel.unsubscribe(); channel = null; }
  }

  return { loadCatalog, subscribeToChanges, unsubscribe };
})();
