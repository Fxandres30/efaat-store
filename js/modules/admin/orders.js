/**
 * orders.js (admin) — /admin/orders (extraído de js/admin.js en la
 * reorganización arquitectónica). Los pedidos siguen siendo locales
 * (ver informe de arquitectura) — este módulo no cambia de
 * comportamiento.
 */
const AdminOrders = (() => {
  function renderOrders(filterStatus) {
    const cur = filterStatus || 'todos';
    const groups = { todos: null, pendientes: ['pending'], pago_pendiente: ['payment_pending'], confirmados: ['confirmed'],
      preparacion: ['preparing', 'ready'], enviados: ['shipped', 'in_transit'], entregados: ['delivered'],
      cancelados: ['cancelled'], devueltos: ['returned'] };
    let orders = Store.state.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (groups[cur]) orders = orders.filter((o) => groups[cur].includes(o.orderStatus));

    AdminShell.shell('/admin/orders', `
      <div class="admin-toolbar">
        <div class="tabs-row" style="margin-bottom:0;" id="orderFilterTabs">
          ${Object.keys(groups).map((k) => `<button class="tab-btn ${cur === k ? 'active' : ''}" data-status-tab="${k}">${k.replace('_', ' ')}</button>`).join('')}
        </div>
      </div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${orders.map((o) => `<tr>
              <td class="mono">${o.orderNumber}</td>
              <td>${Utils.escapeHtml(o.customer.name)}${o.guestOrder ? ' <span class="faint">(invitado)</span>' : ''}</td>
              <td>${Utils.formatDate(o.createdAt)}</td>
              <td>${o.items.length}</td>
              <td class="mono">${Utils.formatMoney(o.total)}</td>
              <td><span class="status-pill status-${o.orderStatus}"><span class="dot"></span>${OrdersModule.statusLabel(o.orderStatus)}</span></td>
              <td><button class="btn btn-outline btn-sm" data-open-order="${o.orderId}">Abrir</button></td>
            </tr>`).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:30px;">Sin pedidos en este filtro.</td></tr>`}
          </tbody>
        </table>
      </div>
    `);
    Utils.qsa('[data-status-tab]').forEach((b) => b.addEventListener('click', () => renderOrders(b.dataset.statusTab)));
    Utils.qsa('[data-open-order]').forEach((b) => b.addEventListener('click', () => openOrderModal(b.dataset.openOrder, cur)));
  }

  function openOrderModal(orderId, returnTab) {
    const order = Store.state.orders.find((o) => o.orderId === orderId);
    if (!order) return;
    const statuses = window.EFAAT_CONFIG.orderStatuses;
    Ui.openModal(`
      <div class="modal-head"><h3>${order.orderNumber}</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
      <div class="mini-stat-row"><span>Cliente</span><span>${Utils.escapeHtml(order.customer.name)} · ${Utils.escapeHtml(order.customer.email)}</span></div>
      <div class="mini-stat-row"><span>Teléfono</span><span>${Utils.escapeHtml(order.customer.phone)}</span></div>
      <div class="mini-stat-row"><span>Dirección</span><span>${Utils.escapeHtml(order.shippingAddress.address)}, ${Utils.escapeHtml(order.shippingAddress.city)}</span></div>
      <div class="mini-stat-row"><span>Pago</span><span>${OrdersModule.paymentLabel(order.paymentMethod)} · ${OrdersModule.paymentStatusLabel(order.paymentStatus)}</span></div>
      <div style="margin:14px 0;">
        ${order.items.map((it) => `<div class="summary-line-item"><img src="${it.image}"><div style="flex:1;"><div style="font-weight:600;">${Utils.escapeHtml(it.name)}</div><div class="faint">${it.color} · ${it.size} · x${it.qty}</div></div><div class="mono">${Utils.formatMoney(it.price * it.qty)}</div></div>`).join('')}
      </div>
      <div class="totals-row total"><span>Total</span><span class="mono">${Utils.formatMoney(order.total)}</span></div>

      <div class="form-row" style="margin-top:16px;"><label>Cambiar estado del pedido</label>
        <select id="statusSelect">${statuses.map((s) => `<option value="${s.key}" ${order.orderStatus === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary btn-block" id="btnUpdateStatus">Actualizar estado</button>

      <div style="margin-top:16px;">
        <h5 style="font-size:12px;text-transform:uppercase;color:var(--c-text-dim);margin-bottom:8px;">Historial</h5>
        ${order.statusHistory.slice().reverse().map((h) => `<div class="mini-stat-row"><span>${OrdersModule.statusLabel(h.status)}</span><span class="faint mono" style="font-size:11px;">${Utils.formatDateTime(h.ts)}</span></div>`).join('')}
      </div>
    `);
    Utils.qs('#btnUpdateStatus').addEventListener('click', () => {
      const newStatus = Utils.qs('#statusSelect').value;
      OrdersModule.updateStatus(order, newStatus);
      Ui.closeModal();
      renderOrders(returnTab);
    });
  }

  return { renderOrders, openOrderModal };
})();
