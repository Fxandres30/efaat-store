/**
 * adminOrchestrator.js — coordina TODAS las escrituras del panel
 * /admin hacia Supabase: productos, variantes/stock, categorías,
 * envío, cupones e imágenes. Cada función:
 *   1) espera la sesión admin de Supabase (Fase 0 — AuthRepository),
 *   2) llama al repository correspondiente,
 *   3) actualiza Store.state en memoria + emite el evento de cambio,
 *   4) devuelve { ok, error, ...datos } — nunca lanza, nunca llama a
 *      Notify/Ui directamente (eso lo hace el módulo admin que llama).
 *
 * No duplica lógica de productService/categoryRepository/etc. — solo
 * coordina.
 */
const AdminOrchestrator = (() => {
  // Fase 1 (Auth real) reemplazó el puente admin-only de la fase
  // anterior: ya no hay "sesión de Supabase separada" que esperar —
  // admin ES una sesión real como cualquier otra, ya sincronizada en
  // Store.state.currentUser por AuthOrchestrator antes de que el
  // Router resuelva ninguna ruta (ver js/app/app.js).
  async function ensureAdminSession() {
    if (!AuthModule.isAdmin()) {
      return { ok: false, error: 'Esta acción requiere una sesión de administrador activa.' };
    }
    return { ok: true };
  }

  function wrapError(err) {
    return { ok: false, error: err && err.message ? err.message : 'Ocurrió un error al guardar en Supabase.' };
  }

  // Store.state.products es SOLO el catálogo público (activos —
  // Store.init()/catalogOrchestrator lo pueblan así). Si un producto
  // recién editado quedó inactivo, hay que sacarlo de ahí en vez de
  // hacer upsert — de lo contrario un producto desactivado seguiría
  // visible en el catálogo en memoria hasta el próximo reload.
  function syncProductToStorefront(mapped) {
    if (mapped.active === false) Store.removeProductLocal(mapped.id);
    else Store.upsertProductLocal(mapped);
  }

  // ================= PRODUCTOS =================
  const COLOR_PALETTE = ['#111111', '#f5f5f5', '#e21f2c', '#8a8a8a', '#2b4c8c', '#cbb894'];

  function buildColorsAndVariants(colorNames, sizeVals, existingVariants) {
    const colors = colorNames.map((n, i) => ({ name: n, hex: COLOR_PALETTE[i % COLOR_PALETTE.length] }));
    const sizes = sizeVals.map((s) => (isNaN(+s) ? s : +s));
    const existingByKey = new Map((existingVariants || []).map((v) => [`${v.color}|${v.size}`, v]));
    const newVariantRows = [];
    colors.forEach((c) => sizes.forEach((s) => {
      const key = `${c.name}|${s}`;
      if (existingByKey.has(key)) return; // variante ya existe — se deja intacta (stock/precio no se tocan acá)
      newVariantRows.push({
        size: String(s), color: c.name, color_hex: c.hex,
        sku: `${Utils.slugify(c.name).toUpperCase()}-${s}-${Date.now().toString(36).slice(-4)}`,
        stock: 0, // se completa abajo con el valor que eligió el admin
      });
    }));
    return { colors, sizes, newVariantRows };
  }

  // payload = { id, name, brand, category (slug), price, comparePrice,
  //   description, colorNames[], sizeVals[], stockEach, featured, isNew,
  //   bestSeller, existingProduct (objeto ya mapeado, o null si es nuevo) }
  async function saveProduct(payload) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;

    const category = Store.state.categories.find((c) => c.slug === payload.category);
    if (!category) return { ok: false, error: `Categoría "${payload.category}" no encontrada.` };

    const discount = payload.comparePrice ? Math.round(100 - (payload.price / payload.comparePrice) * 100) : 0;
    const existing = payload.existingProduct;
    const { colors, sizes, newVariantRows } = buildColorsAndVariants(
      payload.colorNames, payload.sizeVals, existing ? existing.variants.map((v) => ({ ...v, size: String(v.size) })) : []
    );

    try {
      let productRow;
      if (!existing) {
        productRow = await ProductRepository.insert({
          sku: `SKU-${Date.now()}`,
          name: payload.name,
          description: payload.description,
          category_id: category.id,
          brand: payload.brand,
          price: payload.price,
          compare_price: payload.comparePrice || null,
          discount,
          images: [], // el gestor de imágenes las agrega después de crear el producto
          colors, sizes,
          featured: !!payload.featured,
          is_new: !!payload.isNew,
          best_seller: !!payload.bestSeller,
          active: true,
        });
        if (newVariantRows.length) {
          const rows = newVariantRows.map((v) => ({ ...v, product_id: productRow.id, stock: payload.stockEach, price: payload.price }));
          await ProductRepository.insertVariants(rows);
        }
      } else {
        productRow = await ProductRepository.update(existing.id, {
          name: payload.name,
          description: payload.description,
          category_id: category.id,
          brand: payload.brand,
          price: payload.price,
          compare_price: payload.comparePrice || null,
          discount,
          colors, sizes,
          featured: !!payload.featured,
          is_new: !!payload.isNew,
          best_seller: !!payload.bestSeller,
        });
        if (newVariantRows.length) {
          const rows = newVariantRows.map((v) => ({ ...v, product_id: existing.id, stock: payload.stockEach, price: payload.price }));
          await ProductRepository.insertVariants(rows);
        }
      }

      const full = await ProductRepository.getProductById(productRow.id);
      const mapped = ProductService.mapProduct(full);
      syncProductToStorefront(mapped);
      return { ok: true, product: mapped };
    } catch (err) {
      return wrapError(err);
    }
  }

  async function deleteProduct(id) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      await ProductRepository.remove(id);
      Store.removeProductLocal(id);
      return { ok: true };
    } catch (err) { return wrapError(err); }
  }

  async function toggleProductActive(product) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const row = await ProductRepository.update(product.id, { active: product.active === false });
      const full = await ProductRepository.getProductById(row.id);
      const mapped = ProductService.mapProduct(full);
      syncProductToStorefront(mapped);
      return { ok: true, product: mapped };
    } catch (err) { return wrapError(err); }
  }

  // ================= STOCK =================
  async function adjustVariantStock(productId, variantId, newStock) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      await InventoryRepository.adjustStock(variantId, newStock, 'Ajuste manual desde /admin/inventory');
      const full = await ProductRepository.getProductById(productId);
      const mapped = ProductService.mapProduct(full);
      syncProductToStorefront(mapped);
      return { ok: true, product: mapped };
    } catch (err) { return wrapError(err); }
  }

  // ================= CATEGORÍAS =================
  async function saveCategory({ name, image }) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const slug = Utils.slugify(name);
      const category = await CategoryRepository.insert({ name, slug, image: image || null, active: true });
      Store.setCategories([...Store.state.categories, category]);
      return { ok: true, category };
    } catch (err) { return wrapError(err); }
  }

  async function toggleCategoryActive(category) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const updated = await CategoryRepository.update(category.id, { active: !category.active });
      Store.setCategories(Store.state.categories.map((c) => (c.id === updated.id ? updated : c)));
      return { ok: true, category: updated };
    } catch (err) { return wrapError(err); }
  }

  // ================= DROPS =================
  async function saveDrop({ name, description, days, limitedStock }) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const now = Date.now();
      const row = await ProductRepository.insertDrop({
        name, description,
        start_at: new Date(now).toISOString(),
        end_at: new Date(now + days * 86400000).toISOString(),
        limited_stock: limitedStock,
        status: 'active',
      });
      Store.setDrops([ProductService.mapDrop(row), ...Store.state.drops]);
      return { ok: true, drop: row };
    } catch (err) { return wrapError(err); }
  }

  async function toggleDrop(drop) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const newStatus = drop.status === 'active' ? 'inactive' : 'active';
      await ProductRepository.updateDrop(drop.id, { status: newStatus });
      Store.setDrops(Store.state.drops.map((d) => (d.id === drop.id ? { ...d, status: newStatus } : d)));
      return { ok: true };
    } catch (err) { return wrapError(err); }
  }

  async function deleteDrop(id) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      await ProductRepository.removeDrop(id);
      Store.setDrops(Store.state.drops.filter((d) => d.id !== id));
      return { ok: true };
    } catch (err) { return wrapError(err); }
  }

  // ================= CUPONES =================
  async function saveCoupon(payload) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const coupon = await CommerceRepository.insertCoupon({
        code: payload.code, type: payload.type, value: payload.value,
        min_subtotal: payload.minSubtotal, active: true, label: payload.label,
      });
      Store.setCoupons([{ ...coupon, minSubtotal: coupon.min_subtotal }, ...Store.state.coupons]);
      return { ok: true, coupon };
    } catch (err) { return wrapError(err); }
  }

  async function toggleCoupon(coupon) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      await CommerceRepository.updateCoupon(coupon.code, { active: !coupon.active });
      Store.setCoupons(Store.state.coupons.map((c) => (c.code === coupon.code ? { ...c, active: !c.active } : c)));
      return { ok: true };
    } catch (err) { return wrapError(err); }
  }

  async function deleteCoupon(code) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      await CommerceRepository.removeCoupon(code);
      Store.setCoupons(Store.state.coupons.filter((c) => c.code !== code));
      return { ok: true };
    } catch (err) { return wrapError(err); }
  }

  // ================= ENVÍO =================
  async function saveShippingConfig({ standardShippingCost, expressShippingCost, freeShippingThreshold }) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const row = await CommerceRepository.saveShippingSettings({
        standard_shipping_cost: standardShippingCost,
        express_shipping_cost: expressShippingCost,
        free_shipping_threshold: freeShippingThreshold,
      });
      const mapped = {
        standardShippingCost: Number(row.standard_shipping_cost),
        expressShippingCost: Number(row.express_shipping_cost),
        freeShippingThreshold: Number(row.free_shipping_threshold),
      };
      Store.setShippingConfig(mapped);
      return { ok: true, config: mapped };
    } catch (err) { return wrapError(err); }
  }

  // ================= IMÁGENES =================
  async function addProductImage(product, file) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    const check = ImageService.isValidImageFile(file);
    if (!check.ok) return check;
    try {
      const path = ImageService.buildStoragePath(product.id, file);
      const url = await ImageRepository.uploadFile(path, file);
      const images = [...product.images, url];
      await ProductRepository.updateImages(product.id, images);
      const mapped = { ...product, images };
      syncProductToStorefront(mapped);
      return { ok: true, images, product: mapped };
    } catch (err) { return wrapError(err); }
  }

  async function removeProductImage(product, url) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const images = product.images.filter((u) => u !== url);
      await ProductRepository.updateImages(product.id, images);
      await ImageRepository.removeByPublicUrl(url);
      const mapped = { ...product, images };
      syncProductToStorefront(mapped);
      return { ok: true, images, product: mapped };
    } catch (err) { return wrapError(err); }
  }

  async function setPrimaryImage(product, url) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      const images = [url, ...product.images.filter((u) => u !== url)];
      await ProductRepository.updateImages(product.id, images);
      const mapped = { ...product, images };
      syncProductToStorefront(mapped);
      return { ok: true, images, product: mapped };
    } catch (err) { return wrapError(err); }
  }

  async function reorderImages(product, newOrder) {
    const guard = await ensureAdminSession();
    if (!guard.ok) return guard;
    try {
      await ProductRepository.updateImages(product.id, newOrder);
      const mapped = { ...product, images: newOrder };
      syncProductToStorefront(mapped);
      return { ok: true, images: newOrder, product: mapped };
    } catch (err) { return wrapError(err); }
  }

  return {
    saveProduct, deleteProduct, toggleProductActive, adjustVariantStock,
    saveCategory, toggleCategoryActive,
    saveDrop, toggleDrop, deleteDrop,
    saveCoupon, toggleCoupon, deleteCoupon,
    saveShippingConfig,
    addProductImage, removeProductImage, setPrimaryImage, reorderImages,
  };
})();
