/**
 * dashboard.js (admin) — /admin (extraído de js/admin.js en la
 * reorganización arquitectónica).
 */
const AdminDashboard = (() => {
  async function renderDashboard() {
    const orders = Store.state.orders;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid' || o.orderStatus === 'delivered');
    const salesToday = paidOrders.filter((o) => o.createdAt >= today.getTime()).reduce((s, o) => s + o.total, 0);
    const salesMonth = paidOrders.filter((o) => o.createdAt >= monthStart).reduce((s, o) => s + o.total, 0);
    let customers = 0;
    try {
      customers = (await AuthRepository.listCustomers()).length;
    } catch (err) {
      console.warn('[AdminDashboard] no se pudo cargar el conteo de clientes:', err.message);
    }
    const avgTicket = paidOrders.length ? Math.round(paidOrders.reduce((s, o) => s + o.total, 0) / paidOrders.length) : 0;
    const lowStockCount = Store.state.products.reduce((s, p) => s + p.variants.filter((v) => InventoryModule.stockLevel(v.stock) !== 'normal').length, 0);

    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(); day.setDate(day.getDate() - (6 - i)); day.setHours(0, 0, 0, 0);
      const next = day.getTime() + 86400000;
      const total = orders.filter((o) => o.createdAt >= day.getTime() && o.createdAt < next).reduce((s, o) => s + o.total, 0);
      return { label: day.toLocaleDateString('es-CO', { weekday: 'short' }), total };
    });
    const max = Math.max(1, ...last7.map((d) => d.total));

    const topProducts = productSalesRanking().slice(0, 5);

    AdminShell.shell('/admin', `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="lbl">Ventas de hoy</div><div class="val">${Utils.formatMoney(salesToday)}</div></div>
        <div class="kpi-card"><div class="lbl">Ventas del mes</div><div class="val">${Utils.formatMoney(salesMonth)}</div></div>
        <div class="kpi-card"><div class="lbl">Pedidos totales</div><div class="val">${orders.length}</div></div>
        <div class="kpi-card"><div class="lbl">Clientes</div><div class="val">${customers}</div></div>
        <div class="kpi-card"><div class="lbl">Ticket promedio</div><div class="val">${Utils.formatMoney(avgTicket)}</div></div>
        <div class="kpi-card"><div class="lbl">Productos activos</div><div class="val">${Store.state.products.filter((p) => p.active !== false).length}</div></div>
        <div class="kpi-card"><div class="lbl">Variantes con stock bajo</div><div class="val" style="color:var(--c-yellow);">${lowStockCount}</div></div>
        <div class="kpi-card"><div class="lbl">Pedidos activos</div><div class="val">${orders.filter((o) => OrdersModule.STATUS_GROUPS.activos.includes(o.orderStatus)).length}</div></div>
      </div>
      <div class="admin-panel">
        <h3>Ventas — últimos 7 días</h3>
        <div class="bar-chart">${last7.map((d) => `<div class="bar" style="height:${Math.max(3, (d.total / max) * 140)}px"><span>${d.label}</span></div>`).join('')}</div>
      </div>
      <div class="admin-panel">
        <h3>Top productos vendidos</h3>
        ${topProducts.length ? topProducts.map((tp) => `<div class="mini-stat-row"><span>${Utils.escapeHtml(tp.name)}</span><span class="mono">${tp.qty} und · ${Utils.formatMoney(tp.revenue)}</span></div>`).join('') : '<p class="dim">Aún no hay ventas registradas.</p>'}
      </div>
    `);
  }

  function productSalesRanking() {
    const map = new Map();
    Store.state.orders.filter((o) => o.orderStatus !== 'cancelled').forEach((o) => {
      o.items.forEach((it) => {
        const cur = map.get(it.productId) || { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty; cur.revenue += it.price * it.qty;
        map.set(it.productId, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }

  return { renderDashboard, productSalesRanking };
})();
