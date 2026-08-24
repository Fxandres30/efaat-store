/**
 * promotions.js (admin) — /admin/promotions: cupones (extraído de
 * js/admin.js en la reorganización arquitectónica). Escribe en
 * Supabase vía AdminOrchestrator/CommerceRepository.
 */
const AdminPromotions = (() => {
  function renderPromotions() {
    const coupons = Store.state.coupons;
    AdminShell.shell('/admin/promotions', `
      <div class="admin-toolbar"><button class="btn btn-primary btn-sm" id="btnNewCoupon">+ Nuevo cupón</button></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Mínimo</th><th>Estado</th><th></th></tr></thead>
          <tbody>${coupons.map((c) => `<tr><td class="mono">${c.code}</td><td>${couponTypeLabel(c.type)}</td>
            <td>${c.type === 'percent' ? c.value + '%' : '—'}</td><td class="mono">${Utils.formatMoney(c.minSubtotal || 0)}</td>
            <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}" style="clip-path:none;border-radius:4px;">${c.active ? 'Activo' : 'Inactivo'}</span></td>
            <td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm" data-toggle-coupon="${c.code}">${c.active ? 'Desactivar' : 'Activar'}</button>
            <button class="btn btn-ghost btn-sm" data-del-coupon="${c.code}" style="color:var(--c-red);">Eliminar</button></div></td></tr>`).join('') || `<tr><td colspan="6" class="dim" style="text-align:center;padding:24px;">Sin cupones.</td></tr>`}</tbody>
        </table>
      </div>`);
    Utils.qsa('[data-toggle-coupon]').forEach((b) => b.addEventListener('click', async () => {
      const c = coupons.find((x) => x.code === b.dataset.toggleCoupon);
      b.disabled = true;
      const res = await AdminOrchestrator.toggleCoupon(c);
      b.disabled = false;
      if (res.ok) renderPromotions(); else Notify.error(res.error);
    }));
    Utils.qsa('[data-del-coupon]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const res = await AdminOrchestrator.deleteCoupon(b.dataset.delCoupon);
      b.disabled = false;
      if (res.ok) renderPromotions(); else Notify.error(res.error);
    }));
    Utils.qs('#btnNewCoupon').addEventListener('click', () => {
      Ui.openModal(`
        <div class="modal-head"><h3>Nuevo cupón</h3></div>
        <div class="form-row"><label>Código</label><input id="cpCode" placeholder="WELCOME10" style="text-transform:uppercase;"></div>
        <div class="form-row"><label>Tipo</label><select id="cpType"><option value="percent">Porcentaje</option><option value="free_shipping">Envío gratis</option></select></div>
        <div class="form-row"><label>Valor (% si aplica)</label><input type="number" id="cpValue" value="10"></div>
        <div class="form-row"><label>Compra mínima</label><input type="number" id="cpMin" value="0"></div>
        <div class="form-row"><label>Descripción</label><input id="cpLabel" placeholder="10% de descuento"></div>
        <button class="btn btn-primary btn-block" id="btnSaveCoupon">Guardar cupón</button>`);
      Utils.qs('#btnSaveCoupon').addEventListener('click', async () => {
        const code = Utils.qs('#cpCode').value.trim().toUpperCase();
        if (!code) { Notify.error('Ingresa un código.'); return; }
        const btn = Utils.qs('#btnSaveCoupon'); btn.disabled = true;
        const res = await AdminOrchestrator.saveCoupon({
          code, type: Utils.qs('#cpType').value, value: +Utils.qs('#cpValue').value || 0,
          minSubtotal: +Utils.qs('#cpMin').value || 0, label: Utils.qs('#cpLabel').value.trim() || code,
        });
        btn.disabled = false;
        if (!res.ok) { Notify.error(res.error); return; }
        Ui.closeModal(); Notify.success('Cupón creado.'); renderPromotions();
      });
    });
  }
  function couponTypeLabel(t) { return t === 'percent' ? 'Porcentaje' : t === 'free_shipping' ? 'Envío gratis' : t; }

  return { renderPromotions };
})();
