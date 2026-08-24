/**
 * customers.js (admin) — /admin/customers (extraído de js/admin.js en
 * la reorganización arquitectónica). Fase 1 (Auth real): la lista de
 * clientes ahora viene de `public.users` vía AuthRepository (antes
 * era `Store.state.users`, local). Pedidos siguen siendo locales (ver
 * informe de arquitectura) — sin cambios de comportamiento ahí.
 */
const AdminCustomers = (() => {
  async function renderCustomers() {
    AdminShell.shell('/admin/customers', `
      <div class="admin-panel table-scroll">
        <h3>Clientes registrados</h3>
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Pedidos</th><th>Total comprado</th><th>Última compra</th><th>Registro</th><th></th></tr></thead>
          <tbody id="customersBody"><tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Cargando…</td></tr></tbody>
        </table>
      </div>
      <div class="admin-panel table-scroll">
        <h3>Clientes invitados</h3>
        <table class="data-table">
          <thead><tr><th>Correo</th><th>Pedidos</th><th>Total comprado</th></tr></thead>
          <tbody>${guestRows()}</tbody>
        </table>
      </div>
    `);

    let users;
    try {
      users = await AuthRepository.listCustomers();
    } catch (err) {
      Utils.qs('#customersBody').innerHTML = `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">No se pudo cargar: ${Utils.escapeHtml(err.message)}</td></tr>`;
      return;
    }
    renderCustomerRows(users.map(AuthService.mapProfile));
  }

  function statsFor(email) {
    const os = Store.state.orders.filter((o) => o.customer.email === email);
    const total = os.reduce((s, o) => s + (o.orderStatus !== 'cancelled' ? o.total : 0), 0);
    const last = os.sort((a, b) => b.createdAt - a.createdAt)[0];
    return { count: os.length, total, last };
  }

  function renderCustomerRows(users) {
    Utils.qs('#customersBody').innerHTML = users.map((u) => {
      const s = statsFor(u.email);
      return `<tr><td>${Utils.escapeHtml(u.name)}</td><td>${Utils.escapeHtml(u.email || '—')}</td><td>${s.count}</td>
        <td class="mono">${Utils.formatMoney(s.total)}</td><td>${s.last ? Utils.formatDate(s.last.createdAt) : '—'}</td>
        <td>${Utils.formatDate(u.createdAt)}</td>
        <td><button class="btn btn-outline btn-sm" data-view-customer="${Utils.escapeHtml(u.email || '')}">Ver</button></td></tr>`;
    }).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Sin clientes registrados.</td></tr>`;
    wireViewCustomer();
  }

  function guestEmails() {
    return Array.from(new Set(Store.state.orders.filter((o) => o.guestOrder).map((o) => o.customer.email)));
  }

  function guestRows() {
    return guestEmails().map((email) => {
      const s = statsFor(email);
      return `<tr><td>${Utils.escapeHtml(email)}</td><td>${s.count}</td><td class="mono">${Utils.formatMoney(s.total)}</td></tr>`;
    }).join('') || `<tr><td colspan="3" class="dim" style="text-align:center;padding:24px;">Sin compras de invitados.</td></tr>`;
  }

  function wireViewCustomer() {
    Utils.qsa('[data-view-customer]').forEach((b) => b.addEventListener('click', () => {
      const email = b.dataset.viewCustomer;
      const orders = Store.state.orders.filter((o) => o.customer.email === email);
      Ui.openModal(`
        <div class="modal-head"><h3>${Utils.escapeHtml(email)}</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
        ${orders.map((o) => `<div class="mini-stat-row"><span>${o.orderNumber} · ${Utils.formatDate(o.createdAt)}</span><span class="mono">${Utils.formatMoney(o.total)}</span></div>`).join('') || '<p class="dim">Sin pedidos.</p>'}
      `);
    }));
  }

  return { renderCustomers };
})();
