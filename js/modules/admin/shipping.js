/**
 * shipping.js (admin) — /admin/shipping (extraído de js/admin.js en
 * la reorganización arquitectónica). Escribe en Supabase vía
 * AdminOrchestrator.saveShippingConfig() — es el único lugar que crea
 * la fila singleton shipping_settings si todavía no existe.
 */
const AdminShipping = (() => {
  function renderShipping() {
    const cfg = Store.state.shippingConfig || { standardShippingCost: 0, expressShippingCost: 0, freeShippingThreshold: 0 };
    AdminShell.shell('/admin/shipping', `
      <div class="admin-panel" style="max-width:520px;">
        <h3 style="margin-bottom:16px;">Configuración de envíos</h3>
        ${!Store.state.shippingConfig ? `<p class="dim" style="font-size:12.5px;margin-bottom:14px;">Todavía no hay configuración guardada en Supabase — completa y guarda para crearla.</p>` : ''}
        <div class="form-row"><label>Costo envío estándar</label><input type="number" id="shStandard" value="${cfg.standardShippingCost}"></div>
        <div class="form-row"><label>Costo envío exprés</label><input type="number" id="shExpress" value="${cfg.expressShippingCost}"></div>
        <div class="form-row"><label>Envío gratis a partir de</label><input type="number" id="shThreshold" value="${cfg.freeShippingThreshold}"></div>
        <button class="btn btn-primary" id="btnSaveShipping">Guardar cambios</button>
        <p class="dim" style="font-size:13px;margin-top:12px;">Estos valores se aplican de inmediato al carrito y al checkout de toda la tienda.</p>
      </div>`);
    Utils.qs('#btnSaveShipping').addEventListener('click', async () => {
      const btn = Utils.qs('#btnSaveShipping'); btn.disabled = true;
      const res = await AdminOrchestrator.saveShippingConfig({
        standardShippingCost: +Utils.qs('#shStandard').value || 0,
        expressShippingCost: +Utils.qs('#shExpress').value || 0,
        freeShippingThreshold: +Utils.qs('#shThreshold').value || 0,
      });
      btn.disabled = false;
      if (res.ok) { Notify.success('Configuración de envíos actualizada.'); renderShipping(); }
      else Notify.error(res.error);
    });
  }

  return { renderShipping };
})();
