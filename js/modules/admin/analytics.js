/**
 * analytics.js (admin) — /admin/analytics (extraído de js/admin.js en
 * la reorganización arquitectónica). Pedidos siguen siendo locales
 * (ver informe de arquitectura) — sin cambios de comportamiento.
 */
const AdminAnalytics = (() => {
  function renderAnalytics() {
    const orders = Store.state.orders;
    const paid = orders.filter((o) => o.paymentStatus === 'paid' || o.orderStatus === 'delivered');
    const revenueByCategory = {};
    Store.state.categories.forEach((c) => { revenueByCategory[c.slug] = 0; });
    paid.forEach((o) => o.items.forEach((it) => {
      const p = Store.getProductById(it.productId);
      if (p) revenueByCategory[p.category] = (revenueByCategory[p.category] || 0) + it.price * it.qty;
    }));
    const statusCounts = {};
    orders.forEach((o) => { statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1; });
    const byCustomer = {};
    paid.forEach((o) => { byCustomer[o.customer.email] = (byCustomer[o.customer.email] || { name: o.customer.name, total: 0, count: 0 }); byCustomer[o.customer.email].total += o.total; byCustomer[o.customer.email].count += 1; });
    const topCustomers = Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, 5);
    const maxCat = Math.max(1, ...Object.values(revenueByCategory));

    AdminShell.shell('/admin/analytics', `
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">Ingresos totales</span><span class="kpi-value">${Utils.formatMoney(paid.reduce((s, o) => s + o.total, 0))}</span></div>
        <div class="kpi-card"><span class="kpi-label">Pedidos pagados</span><span class="kpi-value">${paid.length}</span></div>
        <div class="kpi-card"><span class="kpi-label">Tasa de cancelación</span><span class="kpi-value">${orders.length ? Math.round((statusCounts.cancelled || 0) / orders.length * 100) : 0}%</span></div>
      </div>
      <div class="admin-panel" style="margin-top:16px;">
        <h3 style="margin-bottom:14px;">Ingresos por categoría</h3>
        ${Object.entries(revenueByCategory).map(([cat, val]) => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="width:70px;text-transform:capitalize;font-size:13px;">${cat}</span>
            <div style="flex:1;background:var(--c-bg);border-radius:4px;height:10px;overflow:hidden;"><div style="width:${(val / maxCat) * 100}%;background:var(--c-red);height:100%;"></div></div>
            <span class="mono" style="font-size:13px;">${Utils.formatMoney(val)}</span>
          </div>`).join('')}
      </div>
      <div class="admin-panel" style="margin-top:16px;">
        <h3 style="margin-bottom:14px;">Pedidos por estado</h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${Object.entries(statusCounts).map(([k, v]) => `<span class="badge badge-gray" style="clip-path:none;border-radius:4px;">${OrdersModule.statusLabel(k)}: ${v}</span>`).join('') || '<span class="dim">Sin datos aún.</span>'}
        </div>
      </div>
      <div class="admin-panel" style="margin-top:16px;">
        <h3 style="margin-bottom:14px;">Top clientes</h3>
        ${topCustomers.length ? topCustomers.map((c, i) => `
          <div class="mini-stat-row"><span>${i + 1}. ${Utils.escapeHtml(c.name)}</span><span class="mono">${Utils.formatMoney(c.total)} · ${c.count} pedido(s)</span></div>`).join('')
          : '<p class="dim">Aún no hay ventas registradas.</p>'}
      </div>`);
  }

  return { renderAnalytics };
})();
