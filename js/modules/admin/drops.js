/**
 * drops.js (admin) — /admin/drops (extraído de js/admin.js en la
 * reorganización arquitectónica). Escribe en Supabase vía
 * AdminOrchestrator/ProductRepository.
 */
const AdminDrops = (() => {
  let list = [];

  async function renderDrops() {
    AdminShell.shell('/admin/drops', `
      <div class="admin-toolbar"><button class="btn btn-primary btn-sm" id="btnNewDrop">+ Nuevo drop</button></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Stock límite</th><th>Productos</th><th>Estado</th><th></th></tr></thead>
          <tbody id="dropBody"><tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Cargando…</td></tr></tbody>
        </table>
      </div>`);
    Utils.qs('#btnNewDrop').addEventListener('click', () => {
      Ui.openModal(`
        <div class="modal-head"><h3>Nuevo drop</h3></div>
        <div class="form-row"><label>Nombre</label><input id="dpName" placeholder="DROP #02 — ..."></div>
        <div class="form-row"><label>Descripción</label><input id="dpDesc" placeholder="Edición limitada..."></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Días de duración</label><input type="number" id="dpDays" value="3"></div>
          <div class="form-row"><label>Stock límite</label><input type="number" id="dpStock" value="30"></div>
        </div>
        <button class="btn btn-primary btn-block" id="btnSaveDrop">Guardar drop</button>`);
      Utils.qs('#btnSaveDrop').addEventListener('click', async () => {
        const name = Utils.qs('#dpName').value.trim();
        if (!name) { Notify.error('Ingresa un nombre.'); return; }
        const btn = Utils.qs('#btnSaveDrop'); btn.disabled = true;
        const res = await AdminOrchestrator.saveDrop({
          name, description: Utils.qs('#dpDesc').value.trim(),
          days: +Utils.qs('#dpDays').value || 3, limitedStock: +Utils.qs('#dpStock').value || 30,
        });
        btn.disabled = false;
        if (!res.ok) { Notify.error(res.error); return; }
        Ui.closeModal(); Notify.success('Drop creado.'); await refresh();
      });
    });
    await refresh();
  }

  async function refresh() {
    try {
      const rows = await ProductRepository.listAllDropsForAdmin();
      list = rows.map(ProductService.mapDrop);
    } catch (err) {
      Utils.qs('#dropBody').innerHTML = `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">No se pudo cargar: ${Utils.escapeHtml(err.message)}</td></tr>`;
      return;
    }
    renderRows();
  }

  function renderRows() {
    Utils.qs('#dropBody').innerHTML = list.map((d) => {
      const prodCount = Store.state.products.filter((p) => p.dropId === d.id).length;
      const ended = d.endDate < Date.now();
      return `<tr><td>${Utils.escapeHtml(d.name)}</td><td>${Utils.formatDate(d.startDate)}</td><td>${Utils.formatDate(d.endDate)}</td>
        <td class="mono">${d.limitedStock}</td><td>${prodCount}</td>
        <td><span class="badge ${d.status === 'active' && !ended ? 'badge-green' : 'badge-gray'}" style="clip-path:none;border-radius:4px;">${ended ? 'Finalizado' : d.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
        <td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm" data-toggle-drop="${d.id}">${d.status === 'active' ? 'Pausar' : 'Activar'}</button>
        <button class="btn btn-ghost btn-sm" data-del-drop="${d.id}" style="color:var(--c-red);">Eliminar</button></div></td></tr>`;
    }).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Sin drops creados.</td></tr>`;
    Utils.qsa('[data-toggle-drop]').forEach((b) => b.addEventListener('click', async () => {
      const d = list.find((x) => x.id === b.dataset.toggleDrop);
      b.disabled = true;
      const res = await AdminOrchestrator.toggleDrop(d);
      b.disabled = false;
      if (res.ok) await refresh(); else Notify.error(res.error);
    }));
    Utils.qsa('[data-del-drop]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const res = await AdminOrchestrator.deleteDrop(b.dataset.delDrop);
      b.disabled = false;
      if (res.ok) await refresh(); else Notify.error(res.error);
    }));
  }

  return { renderDrops };
})();
