/**
 * shell.js (admin) — navegación y armazón del panel /admin (extraído
 * de js/admin.js en la reorganización arquitectónica).
 */
const AdminShell = (() => {
  const NAV = [
    { grp: 'General', items: [['/admin', 'Dashboard', '📊']] },
    { grp: 'Ventas', items: [['/admin/orders', 'Pedidos', '📦'], ['/admin/customers', 'Clientes', '👥'] ] },
    { grp: 'Catálogo', items: [['/admin/products', 'Productos', '👟'], ['/admin/inventory', 'Inventario', '📦'], ['/admin/categories', 'Categorías', '🏷️'], ['/admin/drops', 'Drops', '⚡']] },
    { grp: 'Marketing', items: [['/admin/promotions', 'Promociones', '🎟️'], ['/admin/reviews', 'Reseñas', '⭐']] },
    { grp: 'Operación', items: [['/admin/shipping', 'Envíos', '🚚'], ['/admin/analytics', 'Analytics', '📈'], ['/admin/settings', 'Configuración', '⚙️']] },
  ];

  // Pedidos que requieren atención del admin (recién creados o con pago pendiente)
  function pendingCount() {
    return Store.state.orders.filter((o) => o.orderStatus === 'pending' || o.paymentStatus === 'payment_pending').length;
  }

  function title(active) {
    const found = NAV.flatMap((g) => g.items).find(([href]) => href === active);
    return found ? found[1] : 'Admin';
  }

  function shell(active, contentHtml) {
    document.body.classList.add('admin-mode');
    const root = Utils.qs('#viewRoot');
    const admin = Store.state.currentUser;
    const pending = pendingCount();
    root.innerHTML = `
      <div class="admin-shell">
        <div class="drawer-backdrop" id="adminBackdrop"></div>
        <aside class="admin-sidebar" id="adminSidebar">
          <div class="logo">EFAAT<span>.</span> <span class="faint" style="font-size:11px;">ADMIN</span></div>
          <nav class="admin-nav">
            ${NAV.map((g) => `<div class="grp-label">${g.grp}</div>${g.items.map(([href, label, ic]) => `<a href="#${href}" class="${active === href ? 'active' : ''}">${ic} ${label}</a>`).join('')}`).join('')}
          </nav>
          <a href="#/" class="admin-back">← Volver a la tienda</a>
          <button class="admin-back" id="btnAdminLogout" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;">${Ui.ICONS.logout} Cerrar sesión</button>
        </aside>
        <main class="admin-main">
          <div class="admin-topbar">
            <div style="display:flex;align-items:center;gap:12px;">
              <button class="icon-btn admin-sidebar-toggle" id="btnAdminMenu">${Ui.ICONS.menu}</button>
              <h1>${title(active)}</h1>
            </div>
            <div class="admin-topbar-actions">
              <button class="icon-btn" id="btnAdminNotif" title="Pedidos pendientes por atender" style="position:relative;">
                ${Ui.ICONS.bell}${pending ? `<span class="count-bubble" style="position:absolute;top:-4px;right:-4px;">${pending}</span>` : ''}
              </button>
              <span class="admin-whoami">${admin ? admin.name : 'Administrador'} <span class="faint">· Administrador</span></span>
            </div>
          </div>
          ${contentHtml}
        </main>
      </div>`;
    Utils.qs('#btnAdminMenu').addEventListener('click', () => { Utils.qs('#adminSidebar').classList.add('open'); Utils.qs('#adminBackdrop').classList.add('open'); });
    Utils.qs('#adminBackdrop').addEventListener('click', () => { Utils.qs('#adminSidebar').classList.remove('open'); Utils.qs('#adminBackdrop').classList.remove('open'); });
    Utils.qs('#btnAdminLogout').addEventListener('click', async () => { await AuthModule.logout(); });
    Utils.qs('#btnAdminNotif').addEventListener('click', () => { location.hash = '#/admin/orders'; });
  }

  return { NAV, pendingCount, title, shell };
})();
