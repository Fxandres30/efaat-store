/**
 * inventory.js (admin) — /admin/inventory (extraído de js/admin.js en
 * la reorganización arquitectónica). El ajuste de stock ahora pasa por
 * AdminOrchestrator.adjustVariantStock() → RPC manual_adjust_stock en
 * Supabase (auditado en stock_movements) — ya no toca localStorage.
 */
const AdminInventory = (() => {
  function renderInventory() {
    const rows = [];
    Store.state.products.forEach((p) => p.variants.forEach((v) => rows.push({ p, v })));
    const low = rows.filter((r) => InventoryModule.stockLevel(r.v.stock) === 'low').length;
    const out = rows.filter((r) => InventoryModule.stockLevel(r.v.stock) === 'out').length;

    AdminShell.shell('/admin/inventory', `
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="lbl">Variantes totales</div><div class="val">${rows.length}</div></div>
        <div class="kpi-card"><div class="lbl">Stock bajo</div><div class="val" style="color:var(--c-yellow);">${low}</div></div>
        <div class="kpi-card"><div class="lbl">Agotadas</div><div class="val" style="color:#ff6b70;">${out}</div></div>
      </div>
      <div class="admin-toolbar"><input class="admin-search" id="invSearch" placeholder="Buscar producto o SKU..."></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Producto</th><th>Color</th><th>Talla/Tipo</th><th>SKU</th><th>Stock</th><th>Estado</th><th>Actualizar</th></tr></thead>
          <tbody id="invBody"></tbody>
        </table>
      </div>
    `);
    const renderRows = (term = '') => {
      const t = term.toLowerCase();
      const filtered = rows.filter((r) => !t || r.p.name.toLowerCase().includes(t) || r.v.sku.toLowerCase().includes(t));
      Utils.qs('#invBody').innerHTML = filtered.map((r) => {
        const level = InventoryModule.stockLevel(r.v.stock);
        return `<tr>
          <td><img class="row-img" src="${r.p.images[0] || ''}"> ${Utils.escapeHtml(r.p.name)}</td>
          <td>${r.v.color}</td><td>${r.v.size}</td><td class="mono">${r.v.sku}</td>
          <td class="mono">${r.v.stock}</td>
          <td><span class="stock-badge ${level}">${level === 'out' ? 'AGOTADO' : level === 'low' ? 'STOCK BAJO' : 'NORMAL'}</span></td>
          <td><div style="display:flex;gap:6px;">
            <input class="inline-input" type="number" min="0" value="${r.v.stock}" data-stock-input="${r.p.id}|${r.v.variantId}">
            <button class="btn btn-outline btn-sm" data-save-stock="${r.p.id}|${r.v.variantId}">Guardar</button>
          </div></td>
        </tr>`;
      }).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Sin resultados.</td></tr>`;
      Utils.qsa('[data-save-stock]').forEach((btn) => btn.addEventListener('click', async () => {
        const [pid, vid] = btn.dataset.saveStock.split('|');
        const input = Utils.qs(`[data-stock-input="${pid}|${vid}"]`);
        btn.disabled = true;
        const res = await AdminOrchestrator.adjustVariantStock(pid, vid, +input.value);
        btn.disabled = false;
        if (res.ok) { Notify.success('Stock actualizado.'); renderInventory(); }
        else Notify.error(res.error);
      }));
    };
    renderRows();
    Utils.qs('#invSearch').addEventListener('input', Utils.debounce((e) => renderRows(e.target.value), 150));
  }

  return { renderInventory };
})();
