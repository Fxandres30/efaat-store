/**
 * products.js (admin) — /admin/products: lista y modal de producto
 * (extraído de js/admin.js en la reorganización arquitectónica).
 * Las escrituras pasan por AdminOrchestrator (Supabase) — ya no hay
 * lectura/escritura de localStorage para productos. La gestión de
 * imágenes vive aparte, ver imageManager.js.
 */
const AdminProducts = (() => {
  let adminList = [];

  async function renderProducts() {
    AdminShell.shell('/admin/products', `
      <div class="admin-toolbar">
        <input class="admin-search" id="prodSearch" placeholder="Buscar producto...">
        <button class="btn btn-primary btn-sm" id="btnNewProduct">+ Nuevo producto</button>
      </div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th></th><th>Nombre</th><th>Categoría</th><th>Marca</th><th>Precio</th><th>Stock</th><th>Flags</th><th>Estado</th><th></th></tr></thead>
          <tbody id="prodBody"><tr><td colspan="9" class="dim" style="text-align:center;padding:24px;">Cargando…</td></tr></tbody>
        </table>
      </div>
    `);
    Utils.qs('#btnNewProduct').addEventListener('click', () => openProductModal(null));

    try {
      adminList = await ProductService.getAllProductsForAdmin();
    } catch (err) {
      Utils.qs('#prodBody').innerHTML = `<tr><td colspan="9" class="dim" style="text-align:center;padding:24px;">No se pudo cargar la lista: ${Utils.escapeHtml(err.message)}</td></tr>`;
      return;
    }
    renderRows();
    Utils.qs('#prodSearch').addEventListener('input', Utils.debounce((e) => renderRows(e.target.value), 150));
  }

  function renderRows(term = '') {
    const t = term.toLowerCase();
    const list = adminList.filter((p) => !t || p.name.toLowerCase().includes(t) || p.brand.toLowerCase().includes(t));
    Utils.qs('#prodBody').innerHTML = list.map((p) => `
      <tr>
        <td><img class="row-img" src="${p.images[0] || ''}"></td>
        <td>${Utils.escapeHtml(p.name)}</td>
        <td>${p.category === 'tenis' ? 'Tenis' : p.category === 'gorras' ? 'Gorras' : Utils.escapeHtml(p.category || '—')}</td>
        <td>${Utils.escapeHtml(p.brand)}</td>
        <td class="mono">${Utils.formatMoney(p.price)}</td>
        <td class="mono">${p.stock}</td>
        <td style="font-size:11px;">${[p.new && 'Nuevo', p.bestSeller && 'Best', p.featured && 'Destacado', p.discount > 0 && 'Oferta'].filter(Boolean).join(', ') || '—'}</td>
        <td><span class="badge ${p.active === false ? 'badge-gray' : 'badge-green'}" style="clip-path:none;border-radius:4px;">${p.active === false ? 'Inactivo' : 'Activo'}</span></td>
        <td><div style="display:flex;gap:6px;">
          <button class="btn btn-outline btn-sm" data-edit-product="${p.id}">Editar</button>
          <button class="btn btn-ghost btn-sm" data-toggle-product="${p.id}">${p.active === false ? 'Activar' : 'Desactivar'}</button>
          <button class="btn btn-ghost btn-sm" data-del-product="${p.id}" style="color:var(--c-red);">Eliminar</button>
        </div></td>
      </tr>`).join('') || `<tr><td colspan="9" class="dim" style="text-align:center;padding:24px;">Sin productos.</td></tr>`;

    Utils.qsa('[data-edit-product]').forEach((b) => b.addEventListener('click', () => {
      openProductModal(adminList.find((p) => p.id === b.dataset.editProduct));
    }));
    Utils.qsa('[data-toggle-product]').forEach((b) => b.addEventListener('click', async () => {
      const p = adminList.find((x) => x.id === b.dataset.toggleProduct);
      b.disabled = true;
      const res = await AdminOrchestrator.toggleProductActive(p);
      b.disabled = false;
      if (res.ok) { await refresh(); } else Notify.error(res.error);
    }));
    Utils.qsa('[data-del-product]').forEach((b) => b.addEventListener('click', () => {
      Ui.openModal(`<div class="modal-head"><h3>Eliminar producto</h3></div><p class="dim">Esta acción no se puede deshacer.</p>
        <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn btn-outline btn-block" onclick="Ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary btn-block" id="confirmDelProduct">Eliminar</button></div>`);
      Utils.qs('#confirmDelProduct').addEventListener('click', async () => {
        const res = await AdminOrchestrator.deleteProduct(b.dataset.delProduct);
        Ui.closeModal();
        if (res.ok) await refresh(); else Notify.error(res.error);
      });
    }));
  }

  async function refresh() {
    adminList = await ProductService.getAllProductsForAdmin();
    renderRows();
  }

  function openProductModal(product) {
    const isNew = !product;
    const p = product || { id: null, name: '', brand: '', category: 'tenis', price: 0, comparePrice: '', description: '',
      colors: [{ name: 'Negro', hex: '#111111' }], sizes: [38, 39, 40, 41, 42], variants: [], images: [], featured: false, new: false, bestSeller: false, active: true };
    Ui.openModal(`
      <div class="modal-head"><h3>${isNew ? 'Nuevo producto' : 'Editar producto'}</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
      <div class="form-row"><label>Nombre</label><input id="pfName" value="${Utils.escapeHtml(p.name)}"></div>
      <div class="form-grid-2">
        <div class="form-row"><label>Marca</label><input id="pfBrand" value="${Utils.escapeHtml(p.brand)}"></div>
        <div class="form-row"><label>Categoría</label><select id="pfCategory">${Store.state.categories.map((c) => `<option value="${c.slug}" ${p.category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid-2">
        <div class="form-row"><label>Precio</label><input type="number" id="pfPrice" value="${p.price}"></div>
        <div class="form-row"><label>Precio anterior (opcional)</label><input type="number" id="pfCompare" value="${p.comparePrice || ''}"></div>
      </div>
      <div class="form-row"><label>Descripción</label><textarea id="pfDesc" rows="3">${Utils.escapeHtml(p.description)}</textarea></div>
      <div class="form-row"><label>Colores (separados por coma)</label><input id="pfColors" value="${p.colors.map((c) => c.name).join(', ')}"></div>
      <div class="form-row"><label>${p.category === 'tenis' ? 'Tallas' : 'Tipos'} (separados por coma)</label><input id="pfSizes" value="${p.sizes.join(', ')}"></div>
      <div class="form-row"><label>Stock por variante (nueva)</label><input type="number" id="pfStock" value="8"></div>
      <div class="filter-list" style="margin-bottom:14px;">
        <label class="filter-check"><input type="checkbox" id="pfNew" ${p.new ? 'checked' : ''}> Nuevo</label>
        <label class="filter-check"><input type="checkbox" id="pfBest" ${p.bestSeller ? 'checked' : ''}> Más vendido</label>
        <label class="filter-check"><input type="checkbox" id="pfFeatured" ${p.featured ? 'checked' : ''}> Destacado</label>
      </div>
      <button class="btn btn-primary btn-block" id="btnSaveProduct">${isNew ? 'Crear producto' : 'Guardar cambios'}</button>
      <div id="imageManagerSlot" style="margin-top:20px;"></div>
    `);

    if (!isNew) {
      AdminImageManager.render(Utils.qs('#imageManagerSlot'), p, (updatedProduct) => {
        // el gestor de imágenes ya actualizó Store — refresca el
        // objeto local del modal (p.images) para que el botón
        // "Guardar cambios" no pise las imágenes con datos viejos.
        p.images = updatedProduct.images;
        const idx = adminList.findIndex((x) => x.id === updatedProduct.id);
        if (idx >= 0) adminList[idx] = { ...adminList[idx], images: updatedProduct.images };
      });
    } else {
      Utils.qs('#imageManagerSlot').innerHTML = `<p class="dim" style="font-size:12.5px;">Guarda el producto primero para poder subir imágenes.</p>`;
    }

    Utils.qs('#btnSaveProduct').addEventListener('click', async () => {
      const name = Utils.qs('#pfName').value.trim();
      const brand = Utils.qs('#pfBrand').value.trim();
      const price = +Utils.qs('#pfPrice').value;
      if (!name || !brand || !price) { Notify.error('Completa nombre, marca y precio.'); return; }
      const category = Utils.qs('#pfCategory').value;
      const comparePrice = Utils.qs('#pfCompare').value ? +Utils.qs('#pfCompare').value : null;
      const colorNames = Utils.qs('#pfColors').value.split(',').map((s) => s.trim()).filter(Boolean);
      const sizeVals = Utils.qs('#pfSizes').value.split(',').map((s) => s.trim()).filter(Boolean);
      const stockEach = +Utils.qs('#pfStock').value || 0;
      const description = Utils.qs('#pfDesc').value.trim();
      const featured = Utils.qs('#pfFeatured').checked;
      const isNewFlag = Utils.qs('#pfNew').checked;
      const bestSeller = Utils.qs('#pfBest').checked;

      const btn = Utils.qs('#btnSaveProduct');
      btn.disabled = true; btn.textContent = 'Guardando…';
      const res = await AdminOrchestrator.saveProduct({
        existingProduct: isNew ? null : p,
        name, brand, category, price, comparePrice, description,
        colorNames, sizeVals, stockEach, featured, isNew: isNewFlag, bestSeller,
      });
      btn.disabled = false; btn.textContent = isNew ? 'Crear producto' : 'Guardar cambios';

      if (!res.ok) { Notify.error(res.error); return; }

      if (isNew) {
        Notify.success('Producto creado. Ahora puedes agregar imágenes.');
        await refresh();
        openProductModal(res.product); // reabre en modo edición, ya con id
      } else {
        Notify.success('Producto actualizado.');
        Ui.closeModal();
        await refresh();
      }
    });
  }

  return { renderProducts, openProductModal };
})();
