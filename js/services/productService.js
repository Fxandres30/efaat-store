/**
 * productService.js — reglas de catálogo: obtener, filtrar, buscar,
 * ordenar, y sobre todo TRADUCIR la forma de las filas de Supabase
 * (snake_case, category_id, product_variants anidado) a la forma
 * exacta que ya esperan las vistas (js/modules/catalog/*, js/ui/,
 * js/modules/cart/...).
 *
 * NO accede a Supabase directamente — todo pasa por ProductRepository
 * / CategoryRepository.
 *
 * applyFilters()/search() son la ÚNICA implementación de filtrado y
 * búsqueda de catálogo del proyecto — js/modules/catalog/catalogList.js
 * llama a estas funciones en vez de tener su propia copia (la tenía
 * antes de la reorganización arquitectónica; era una duplicación ya
 * señalada en este mismo archivo).
 */
const ProductService = (() => {
  // ---------- Mapeo Supabase → forma que ya usa el resto de la app ----------
  function mapCategoryRef(row) {
    // PostgREST puede devolver la relación N:1 como objeto o, según la
    // versión/consulta, como array de 1 — se cubre cualquiera de las dos.
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    return cat ? cat.slug : null;
  }

  function mapVariant(v) {
    const size = isNaN(Number(v.size)) ? v.size : Number(v.size);
    return {
      variantId: v.id,
      size,
      color: v.color,
      colorHex: v.color_hex,
      sku: v.sku,
      stock: v.stock,
      price: v.price,
    };
  }

  function mapProduct(row) {
    const variants = (row.product_variants || []).map(mapVariant);
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category: mapCategoryRef(row),
      brand: row.brand,
      price: row.price,
      comparePrice: row.compare_price,
      discount: row.discount,
      images: row.images || [],
      colors: row.colors || [],
      sizes: row.sizes || [],
      variants,
      stock: row.stock,
      featured: row.featured,
      new: row.is_new,
      bestSeller: row.best_seller,
      onDrop: row.on_drop,
      dropId: row.drop_id,
      rating: row.rating,
      reviewsCount: row.reviews_count,
      tags: row.tags || [],
      active: row.active,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    };
  }

  function mapDrop(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      startDate: row.start_at ? new Date(row.start_at).getTime() : null,
      endDate: row.end_at ? new Date(row.end_at).getTime() : null,
      limitedStock: row.limited_stock,
      status: row.status,
    };
  }

  // ---------- Lecturas ----------
  async function getAllProducts() {
    const rows = await ProductRepository.listProducts();
    return rows.map(mapProduct);
  }

  async function getProductById(id) {
    const row = await ProductRepository.getProductById(id);
    return row ? mapProduct(row) : null;
  }

  async function getCategories() {
    return CategoryRepository.list();
  }

  async function getAllProductsForAdmin() {
    const rows = await ProductRepository.listAllForAdmin();
    return rows.map(mapProduct);
  }

  async function getDrops() {
    const rows = await ProductRepository.listDrops();
    return rows.map(mapDrop);
  }

  // ---------- Filtro/orden/búsqueda ----------
  // Misma lógica que ProductsModule.applyFilters()/search() en
  // js/products.js — se reimplementa acá porque ese archivo no se
  // modifica todavía en esta fase (ver informe de Fase B). Cuando se
  // conecte products.js de verdad, debería llamar a ESTA función en
  // vez de tener su propia copia.
  function applyFilters(list, f) {
    let out = list.filter((p) => p.active !== false);
    if (f.category) out = out.filter((p) => p.category === f.category);
    if (f.brands?.length) out = out.filter((p) => f.brands.includes(p.brand));
    if (f.priceMin != null) out = out.filter((p) => p.price >= f.priceMin);
    if (f.priceMax != null) out = out.filter((p) => p.price <= f.priceMax);
    if (f.colors?.length) out = out.filter((p) => p.colors.some((c) => f.colors.includes(c.name)));
    if (f.availability) out = out.filter((p) => p.stock > 0);
    if (f.discount) out = out.filter((p) => p.discount > 0);
    if (f.isNew) out = out.filter((p) => p.new);
    if (f.bestSeller) out = out.filter((p) => p.bestSeller);
    if (f.q) {
      const t = f.q.toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(t) || p.brand.toLowerCase().includes(t));
    }
    switch (f.sort) {
      case 'newest': out = out.slice().sort((a, b) => b.createdAt - a.createdAt); break;
      case 'price_asc': out = out.slice().sort((a, b) => a.price - b.price); break;
      case 'price_desc': out = out.slice().sort((a, b) => b.price - a.price); break;
      case 'bestseller': out = out.slice().sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0) || b.reviewsCount - a.reviewsCount); break;
      default: out = out.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return out;
  }

  function search(list, term) {
    const t = term.toLowerCase();
    return list.filter((p) => p.active !== false && (
      p.name.toLowerCase().includes(t) ||
      p.brand.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      (p.category || '').toLowerCase().includes(t) ||
      (p.tags || []).some((tg) => tg.toLowerCase().includes(t))
    ));
  }

  return {
    getAllProducts, getAllProductsForAdmin, getProductById, getCategories, getDrops,
    mapProduct, mapDrop, applyFilters, search,
  };
})();
