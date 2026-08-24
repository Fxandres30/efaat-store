/**
 * accountViews.js — Mi cuenta: resumen, direcciones, configuración
 * (extraído de js/views.js en la reorganización arquitectónica).
 * Direcciones ahora vienen de Supabase vía AuthModule (Fase 1,
 * informe de arquitectura) — dejaron de vivir embebidas en el usuario.
 */
const AccountViews = (() => {
  function accountNav(active) {
    const items = [
      ['/account', 'Resumen'], ['/account/orders', 'Pedidos'], ['/account/addresses', 'Direcciones'],
      ['/favorites', 'Favoritos'], ['/account/settings', 'Configuración'],
    ];
    return `<nav class="account-nav">
      ${items.map(([href, label]) => `<a href="#${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('')}
      <a href="#/" id="btnLogout" style="color:var(--c-red);">Cerrar sesión</a>
    </nav>`;
  }

  function requireAuthOrPrompt(root) {
    if (AuthModule.isLoggedIn()) return true;
    root.innerHTML = `<div class="wrap state-block"><div class="ic">🔒</div><h3>Inicia sesión para continuar</h3>
      <a class="btn btn-primary" href="#/login">Iniciar sesión</a></div>`;
    return false;
  }

  function wireLogout(scope) {
    const btn = Utils.qs('#btnLogout', scope);
    if (btn) btn.addEventListener('click', async (e) => { e.preventDefault(); await AuthModule.logout(); });
  }

  function renderAccountHome() {
    const root = Utils.qs('#viewRoot');
    if (!requireAuthOrPrompt(root)) return;
    const u = Store.state.currentUser;
    const orders = Store.myOrders();
    root.innerHTML = `
      <div class="wrap section">
        <h1 class="h-display section-title" style="margin-bottom:20px;">Mi cuenta</h1>
        <div class="account-layout">
          ${accountNav('/account')}
          <div>
            <div class="admin-panel">
              <h3>Datos personales</h3>
              <div class="mini-stat-row"><span>Nombre</span><span>${Utils.escapeHtml(u.name)}</span></div>
              <div class="mini-stat-row"><span>Correo</span><span>${Utils.escapeHtml(u.email)}</span></div>
              <div class="mini-stat-row"><span>Teléfono</span><span>${Utils.escapeHtml(u.phone || '—')}</span></div>
              <div class="mini-stat-row"><span>Cliente desde</span><span>${Utils.formatDate(u.createdAt)}</span></div>
            </div>
            <div class="admin-panel">
              <h3>Pedidos recientes</h3>
              ${orders.length ? orders.slice(0, 3).map((o) => `
                <div class="mini-stat-row"><span>${o.orderNumber} · ${Utils.formatDate(o.createdAt)}</span>
                <span><span class="status-pill status-${o.orderStatus}"><span class="dot"></span>${OrdersModule.statusLabel(o.orderStatus)}</span></span></div>`).join('')
                : `<p class="dim">Todavía no has realizado ningún pedido.</p>`}
              <a href="#/account/orders" class="btn btn-outline btn-sm" style="margin-top:12px;">Ver todos</a>
            </div>
          </div>
        </div>
      </div>`;
    wireLogout(root);
  }

  async function renderAddresses() {
    const root = Utils.qs('#viewRoot');
    if (!requireAuthOrPrompt(root)) return;
    root.innerHTML = `<div class="wrap section"><h1 class="h-display section-title" style="margin-bottom:20px;">Mis direcciones</h1><div class="account-layout">${accountNav('/account/addresses')}<div id="addrList" class="dim">Cargando…</div></div></div>`;
    wireLogout(root);

    let addrs;
    try {
      addrs = await AuthModule.listAddresses();
    } catch (err) {
      Utils.qs('#addrList').innerHTML = `<p class="dim">No se pudieron cargar las direcciones: ${Utils.escapeHtml(err.message)}</p>`;
      return;
    }

    Utils.qs('#addrList').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btnAddAddr" style="margin-bottom:16px;">+ Agregar dirección</button>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${addrs.length ? addrs.map((a) => `
          <div class="address-card ${a.isDefault ? 'default' : ''}">
            <strong>${Utils.escapeHtml(a.name)}</strong>
            <p class="dim" style="font-size:13px;margin:6px 0;">${Utils.escapeHtml(a.recipient)} · ${Utils.escapeHtml(a.phone)}<br>${Utils.escapeHtml(a.address)}, ${Utils.escapeHtml(a.city)}, ${Utils.escapeHtml(a.department)}<br>${Utils.escapeHtml(a.reference || '')}</p>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline btn-sm" data-edit-addr="${a.id}">Editar</button>
              ${!a.isDefault ? `<button class="btn btn-outline btn-sm" data-default-addr="${a.id}">Predeterminada</button>` : ''}
              <button class="btn btn-ghost btn-sm" data-del-addr="${a.id}" style="color:var(--c-red);">Eliminar</button>
            </div>
          </div>`).join('') : `<p class="dim">Aún no tienes direcciones guardadas.</p>`}
      </div>`;

    Utils.qs('#btnAddAddr').addEventListener('click', () => openAddressModal());
    Utils.qsa('[data-edit-addr]').forEach((b) => b.addEventListener('click', () => openAddressModal(addrs.find((a) => a.id === b.dataset.editAddr))));
    Utils.qsa('[data-default-addr]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const res = await AuthModule.setDefaultAddress(b.dataset.defaultAddr);
      if (res.ok) renderAddresses(); else { b.disabled = false; Notify.error(res.error); }
    }));
    Utils.qsa('[data-del-addr]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const res = await AuthModule.deleteAddress(b.dataset.delAddr);
      if (res.ok) { Notify.info('Dirección eliminada.'); renderAddresses(); } else { b.disabled = false; Notify.error(res.error); }
    }));
  }

  function openAddressModal(addr) {
    const a = addr || { name: '', recipient: Store.state.currentUser.name, phone: Store.state.currentUser.phone, address: '', city: '', department: '', reference: '', isDefault: false };
    Ui.openModal(`
      <div class="modal-head"><h3>${addr ? 'Editar' : 'Nueva'} dirección</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
      <div class="form-row"><label>Etiqueta (Casa, Trabajo...)</label><input id="aName" value="${Utils.escapeHtml(a.name)}"></div>
      <div class="form-grid-2">
        <div class="form-row"><label>Destinatario</label><input id="aRecipient" value="${Utils.escapeHtml(a.recipient)}"></div>
        <div class="form-row"><label>Teléfono</label><input id="aPhone" value="${Utils.escapeHtml(a.phone)}"></div>
      </div>
      <div class="form-grid-2">
        <div class="form-row"><label>Departamento</label><input id="aDept" value="${Utils.escapeHtml(a.department)}"></div>
        <div class="form-row"><label>Ciudad</label><input id="aCity" value="${Utils.escapeHtml(a.city)}"></div>
      </div>
      <div class="form-row"><label>Dirección</label><input id="aAddr" value="${Utils.escapeHtml(a.address)}"></div>
      <div class="form-row"><label>Referencia</label><input id="aRef" value="${Utils.escapeHtml(a.reference || '')}"></div>
      <button class="btn btn-primary btn-block" id="btnSaveAddr">Guardar dirección</button>
    `);
    Utils.qs('#btnSaveAddr').addEventListener('click', async () => {
      const payload = {
        id: addr ? addr.id : null, name: Utils.qs('#aName').value.trim() || 'Dirección',
        recipient: Utils.qs('#aRecipient').value.trim(), phone: Utils.qs('#aPhone').value.trim(),
        department: Utils.qs('#aDept').value.trim(), city: Utils.qs('#aCity').value.trim(),
        address: Utils.qs('#aAddr').value.trim(), reference: Utils.qs('#aRef').value.trim(),
        isDefault: a.isDefault,
      };
      if (!payload.recipient || !payload.address || !payload.city) { Notify.error('Completa los campos requeridos.'); return; }
      const btn = Utils.qs('#btnSaveAddr'); btn.disabled = true;
      const res = await AuthModule.saveAddress(payload);
      btn.disabled = false;
      if (!res.ok) { Notify.error(res.error); return; }
      Ui.closeModal(); Notify.success('Dirección guardada.'); renderAddresses();
    });
  }

  function renderSettings() {
    const root = Utils.qs('#viewRoot');
    if (!requireAuthOrPrompt(root)) return;
    const u = Store.state.currentUser;
    root.innerHTML = `
      <div class="wrap section">
        <h1 class="h-display section-title" style="margin-bottom:20px;">Configuración</h1>
        <div class="account-layout">
          ${accountNav('/account/settings')}
          <div class="admin-panel">
            <h3>Editar perfil</h3>
            <div class="form-row"><label>Nombre</label><input id="sName" value="${Utils.escapeHtml(u.name)}"></div>
            <div class="form-row"><label>Teléfono</label><input id="sPhone" value="${Utils.escapeHtml(u.phone || '')}"></div>
            <button class="btn btn-primary" id="btnSaveProfile">Guardar cambios</button>
          </div>
        </div>
      </div>`;
    wireLogout(root);
    Utils.qs('#btnSaveProfile').addEventListener('click', async () => {
      const btn = Utils.qs('#btnSaveProfile'); btn.disabled = true;
      const res = await AuthModule.updateProfile({ name: Utils.qs('#sName').value.trim(), phone: Utils.qs('#sPhone').value.trim() });
      btn.disabled = false;
      if (res.ok) Notify.success('Perfil actualizado.'); else Notify.error(res.error);
    });
  }

  return { accountNav, requireAuthOrPrompt, wireLogout, renderAccountHome, renderAddresses, renderSettings };
})();
