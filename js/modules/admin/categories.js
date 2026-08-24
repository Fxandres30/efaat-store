/**
 * categories.js (admin) — /admin/categories (extraído de js/admin.js
 * en la reorganización arquitectónica). Escribe en Supabase vía
 * AdminOrchestrator/CategoryRepository — ya no toca localStorage.
 */
const AdminCategories = (() => {
  let list = [];

  async function renderCategories() {
    AdminShell.shell('/admin/categories', `
      <div class="admin-toolbar"><button class="btn btn-primary btn-sm" id="btnNewCat">+ Nueva categoría</button></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Slug</th><th>Estado</th><th></th></tr></thead>
          <tbody id="catBody"><tr><td colspan="4" class="dim" style="text-align:center;padding:24px;">Cargando…</td></tr></tbody>
        </table>
      </div>`);
    Utils.qs('#btnNewCat').addEventListener('click', () => {
      Ui.openModal(`
        <div class="modal-head"><h3>Nueva categoría</h3></div>
        <div class="form-row"><label>Nombre</label><input id="cName"></div>
        <div class="form-row"><label>URL de imagen (opcional)</label><input id="cImg" placeholder="https://..."></div>
        <button class="btn btn-primary btn-block" id="btnSaveCat">Guardar</button>`);
      Utils.qs('#btnSaveCat').addEventListener('click', async () => {
        const name = Utils.qs('#cName').value.trim();
        if (!name) { Notify.error('Ingresa un nombre.'); return; }
        const btn = Utils.qs('#btnSaveCat'); btn.disabled = true;
        const res = await AdminOrchestrator.saveCategory({ name, image: Utils.qs('#cImg').value.trim() });
        btn.disabled = false;
        if (!res.ok) { Notify.error(res.error); return; }
        Ui.closeModal(); Notify.success('Categoría creada.'); await refresh();
      });
    });
    await refresh();
  }

  async function refresh() {
    try {
      list = await CategoryRepository.listAll();
    } catch (err) {
      Utils.qs('#catBody').innerHTML = `<tr><td colspan="4" class="dim" style="text-align:center;padding:24px;">No se pudo cargar: ${Utils.escapeHtml(err.message)}</td></tr>`;
      return;
    }
    renderRows();
  }

  function renderRows() {
    Utils.qs('#catBody').innerHTML = list.map((c) => `<tr><td>${Utils.escapeHtml(c.name)}</td><td class="mono">${c.slug}</td>
      <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}" style="clip-path:none;border-radius:4px;">${c.active ? 'Activa' : 'Inactiva'}</span></td>
      <td><button class="btn btn-ghost btn-sm" data-toggle-cat="${c.id}">${c.active ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('');
    Utils.qsa('[data-toggle-cat]').forEach((b) => b.addEventListener('click', async () => {
      const c = list.find((x) => x.id === b.dataset.toggleCat);
      b.disabled = true;
      const res = await AdminOrchestrator.toggleCategoryActive(c);
      b.disabled = false;
      if (res.ok) await refresh(); else Notify.error(res.error);
    }));
  }

  return { renderCategories };
})();
