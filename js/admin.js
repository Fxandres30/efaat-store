/**
 * admin.js — Panel administrativo (/admin). Reutiliza Store/Storage/
 * InventoryModule/OrdersModule; no duplica lógica de negocio.
 */
const AdminModule = (() => {
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
    Utils.qs('#btnAdminLogout').addEventListener('click', () => { AuthModule.logout(); Notify.success('Sesión cerrada.'); location.hash = '#/'; });
    Utils.qs('#btnAdminNotif').addEventListener('click', () => { location.hash = '#/admin/orders'; });
  }

  function title(active) {
    const found = NAV.flatMap((g) => g.items).find(([href]) => href === active);
    return found ? found[1] : 'Admin';
  }

  function leaveAdminModeGuard() { /* body class removed by router when leaving /admin, see router hook in app.js */ }

  // ================= DASHBOARD =================
  function renderDashboard() {
    const orders = Store.state.orders;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid' || o.orderStatus === 'delivered');
    const salesToday = paidOrders.filter((o) => o.createdAt >= today.getTime()).reduce((s, o) => s + o.total, 0);
    const salesMonth = paidOrders.filter((o) => o.createdAt >= monthStart).reduce((s, o) => s + o.total, 0);
    const customers = Store.state.users.filter((u) => u.role === 'customer').length;
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

    shell('/admin', `
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

  // ================= PEDIDOS =================
  function renderOrders(filterStatus) {
    const cur = filterStatus || 'todos';
    const groups = { todos: null, pendientes: ['pending'], pago_pendiente: ['payment_pending'], confirmados: ['confirmed'],
      preparacion: ['preparing', 'ready'], enviados: ['shipped', 'in_transit'], entregados: ['delivered'],
      cancelados: ['cancelled'], devueltos: ['returned'] };
    let orders = Store.state.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (groups[cur]) orders = orders.filter((o) => groups[cur].includes(o.orderStatus));

    shell('/admin/orders', `
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

  // ================= INVENTARIO =================
  function renderInventory() {
    const rows = [];
    Store.state.products.forEach((p) => p.variants.forEach((v) => rows.push({ p, v })));
    const low = rows.filter((r) => InventoryModule.stockLevel(r.v.stock) === 'low').length;
    const out = rows.filter((r) => InventoryModule.stockLevel(r.v.stock) === 'out').length;

    shell('/admin/inventory', `
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="lbl">Variantes totales</div><div class="val">${rows.length}</div></div>
        <div class="kpi-card"><div class="lbl">Stock bajo</div><div class="val" style="color:var(--c-yellow);">${low}</div></div>
        <div class="kpi-card"><div class="lbl">Agotadas</div><div class="val" style="color:#ff6b70;">${out}</div></div>
      </div>
      <div class="admin-toolbar"><input class="admin-search" id="invSearch" placeholder="Buscar producto o SKU..."></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Producto</th><th>Color</th><th>Talla/Tipo</th><th>SKU</th><th>Stock</th><th>Estado</th><th>Actualizar</th></tr></thead>
          <tbody id="invBody"></tbody>
        </table>
      </div>
    `);
    const renderRows = (term = '') => {
      const t = term.toLowerCase();
      const filtered = rows.filter((r) => !t || r.p.name.toLowerCase().includes(t) || r.v.sku.toLowerCase().includes(t));
      Utils.qs('#invBody').innerHTML = filtered.map((r) => {
        const level = InventoryModule.stockLevel(r.v.stock);
        return `<tr>
          <td><img class="row-img" src="${r.p.images[0]}"> ${Utils.escapeHtml(r.p.name)}</td>
          <td>${r.v.color}</td><td>${r.v.size}</td><td class="mono">${r.v.sku}</td>
          <td class="mono">${r.v.stock}</td>
          <td><span class="stock-badge ${level}">${level === 'out' ? 'AGOTADO' : level === 'low' ? 'STOCK BAJO' : 'NORMAL'}</span></td>
          <td><div style="display:flex;gap:6px;">
            <input class="inline-input" type="number" min="0" value="${r.v.stock}" data-stock-input="${r.p.id}|${r.v.variantId}">
            <button class="btn btn-outline btn-sm" data-save-stock="${r.p.id}|${r.v.variantId}">Guardar</button>
          </div></td>
        </tr>`;
      }).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Sin resultados.</td></tr>`;
      Utils.qsa('[data-save-stock]').forEach((btn) => btn.addEventListener('click', () => {
        const [pid, vid] = btn.dataset.saveStock.split('|');
        const input = Utils.qs(`[data-stock-input="${pid}|${vid}"]`);
        InventoryModule.updateVariantStock(pid, vid, +input.value);
        Notify.success('Stock actualizado.');
        renderInventory();
      }));
    };
    renderRows();
    Utils.qs('#invSearch').addEventListener('input', Utils.debounce((e) => renderRows(e.target.value), 150));
  }

  // ================= PRODUCTOS =================
  function renderProducts() {
    shell('/admin/products', `
      <div class="admin-toolbar">
        <input class="admin-search" id="prodSearch" placeholder="Buscar producto...">
        <button class="btn btn-primary btn-sm" id="btnNewProduct">+ Nuevo producto</button>
      </div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th></th><th>Nombre</th><th>Categoría</th><th>Marca</th><th>Precio</th><th>Stock</th><th>Flags</th><th>Estado</th><th></th></tr></thead>
          <tbody id="prodBody"></tbody>
        </table>
      </div>
    `);
    const renderRows = (term = '') => {
      const t = term.toLowerCase();
      const list = Store.state.products.filter((p) => !t || p.name.toLowerCase().includes(t) || p.brand.toLowerCase().includes(t));
      Utils.qs('#prodBody').innerHTML = list.map((p) => `
        <tr>
          <td><img class="row-img" src="${p.images[0]}"></td>
          <td>${Utils.escapeHtml(p.name)}</td>
          <td>${p.category === 'tenis' ? 'Tenis' : 'Gorras'}</td>
          <td>${Utils.escapeHtml(p.brand)}</td>
          <td class="mono">${Utils.formatMoney(p.price)}</td>
          <td class="mono">${p.stock}</td>
          <td style="font-size:11px;">${[p.new && 'Nuevo', p.bestSeller && 'Best', p.featured && 'Destacado', p.discount > 0 && 'Oferta'].filter(Boolean).join(', ') || '—'}</td>
          <td><span class="badge ${p.active === false ? 'badge-gray' : 'badge-green'}" style="clip-path:none;border-radius:4px;">${p.active === false ? 'Inactivo' : 'Activo'}</span></td>
          <td><div style="display:flex;gap:6px;">
            <button class="btn btn-outline btn-sm" data-edit-product="${p.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-toggle-product="${p.id}">${p.active === false ? 'Activar' : 'Desactivar'}</button>
            <button class="btn btn-ghost btn-sm" data-del-product="${p.id}" style="color:var(--c-red);">Eliminar</button>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="9" class="dim" style="text-align:center;padding:24px;">Sin productos.</td></tr>`;

      Utils.qsa('[data-edit-product]').forEach((b) => b.addEventListener('click', () => openProductModal(Store.getProductById(b.dataset.editProduct))));
      Utils.qsa('[data-toggle-product]').forEach((b) => b.addEventListener('click', () => {
        const p = Store.getProductById(b.dataset.toggleProduct); p.active = p.active === false ? true : false;
        Store.upsertProduct(p); renderProducts();
      }));
      Utils.qsa('[data-del-product]').forEach((b) => b.addEventListener('click', () => {
        Ui.openModal(`<div class="modal-head"><h3>Eliminar producto</h3></div><p class="dim">Esta acción no se puede deshacer.</p>
          <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn btn-outline btn-block" onclick="Ui.closeModal()">Cancelar</button>
          <button class="btn btn-primary btn-block" id="confirmDelProduct">Eliminar</button></div>`);
        Utils.qs('#confirmDelProduct').addEventListener('click', () => { Store.removeProduct(b.dataset.delProduct); Ui.closeModal(); renderProducts(); });
      }));
    };
    renderRows();
    Utils.qs('#prodSearch').addEventListener('input', Utils.debounce((e) => renderRows(e.target.value), 150));
    Utils.qs('#btnNewProduct').addEventListener('click', () => openProductModal(null));
  }

  function openProductModal(product) {
    const isNew = !product;
    const p = product || { id: null, name: '', brand: '', category: 'tenis', price: 0, comparePrice: '', description: '',
      colors: [{ name: 'Negro', hex: '#111111' }], sizes: [38, 39, 40, 41, 42], variants: [], images: [], featured: false, new: false, bestSeller: false, active: true };
    Ui.openModal(`
      <div class="modal-head"><h3>${isNew ? 'Nuevo producto' : 'Editar producto'}</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
      <div class="form-row"><label>Nombre</label><input id="pfName" value="${Utils.escapeHtml(p.name)}"></div>
      <div class="form-grid-2">
        <div class="form-row"><label>Marca</label><input id="pfBrand" value="${Utils.escapeHtml(p.brand)}"></div>
        <div class="form-row"><label>Categoría</label><select id="pfCategory"><option value="tenis" ${p.category === 'tenis' ? 'selected' : ''}>Tenis</option><option value="gorras" ${p.category === 'gorras' ? 'selected' : ''}>Gorras</option></select></div>
      </div>
      <div class="form-grid-2">
        <div class="form-row"><label>Precio</label><input type="number" id="pfPrice" value="${p.price}"></div>
        <div class="form-row"><label>Precio anterior (opcional)</label><input type="number" id="pfCompare" value="${p.comparePrice || ''}"></div>
      </div>
      <div class="form-row"><label>Descripción</label><textarea id="pfDesc" rows="3">${Utils.escapeHtml(p.description)}</textarea></div>
      <div class="form-row"><label>Colores (separados por coma)</label><input id="pfColors" value="${p.colors.map((c) => c.name).join(', ')}"></div>
      <div class="form-row"><label>${p.category === 'tenis' ? 'Tallas' : 'Tipos'} (separados por coma)</label><input id="pfSizes" value="${p.sizes.join(', ')}"></div>
      <div class="form-row"><label>Stock por variante (nueva)</label><input type="number" id="pfStock" value="8"></div>
      <div class="filter-list" style="margin-bottom:14px;">
        <label class="filter-check"><input type="checkbox" id="pfNew" ${p.new ? 'checked' : ''}> Nuevo</label>
        <label class="filter-check"><input type="checkbox" id="pfBest" ${p.bestSeller ? 'checked' : ''}> Más vendido</label>
        <label class="filter-check"><input type="checkbox" id="pfFeatured" ${p.featured ? 'checked' : ''}> Destacado</label>
      </div>
      <button class="btn btn-primary btn-block" id="btnSaveProduct">${isNew ? 'Crear producto' : 'Guardar cambios'}</button>
    `);
    Utils.qs('#btnSaveProduct').addEventListener('click', () => {
      const name = Utils.qs('#pfName').value.trim();
      const brand = Utils.qs('#pfBrand').value.trim();
      const price = +Utils.qs('#pfPrice').value;
      if (!name || !brand || !price) { Notify.error('Completa nombre, marca y precio.'); return; }
      const category = Utils.qs('#pfCategory').value;
      const comparePrice = Utils.qs('#pfCompare').value ? +Utils.qs('#pfCompare').value : null;
      const colorNames = Utils.qs('#pfColors').value.split(',').map((s) => s.trim()).filter(Boolean);
      const sizeVals = Utils.qs('#pfSizes').value.split(',').map((s) => s.trim()).filter(Boolean);
      const stockEach = +Utils.qs('#pfStock').value || 0;
      const palette = ['#111111', '#f5f5f5', '#e21f2c', '#8a8a8a', '#2b4c8c', '#cbb894'];
      const colors = colorNames.map((n, i) => ({ name: n, hex: palette[i % palette.length] }));

      const variants = [];
      colors.forEach((c) => sizeVals.forEach((s) => {
        const sizeVal = isNaN(+s) ? s : +s;
        const existing = (p.variants || []).find((v) => v.color === c.name && String(v.size) === String(sizeVal));
        variants.push(existing || {
          variantId: Utils.uid('var'), size: sizeVal, color: c.name, colorHex: c.hex,
          sku: `${(brand + name).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)}-${c.name.slice(0, 3).toUpperCase()}-${sizeVal}`,
          stock: stockEach, price,
        });
      }));

      const saved = {
        id: p.id || Utils.uid('p'),
        sku: p.sku || `SKU-${Date.now()}`,
        name, brand, category, price, comparePrice,
        discount: comparePrice ? Math.round(100 - (price / comparePrice) * 100) : 0,
        description: Utils.qs('#pfDesc').value.trim(),
        images: p.images && p.images.length ? p.images : [1, 2, 3].map((n) => `https://picsum.photos/seed/${Utils.slugify(name)}-${n}/900/900`),
        colors, sizes: sizeVals.map((s) => (isNaN(+s) ? s : +s)), variants,
        stock: variants.reduce((s, v) => s + v.stock, 0),
        featured: Utils.qs('#pfFeatured').checked, new: Utils.qs('#pfNew').checked, bestSeller: Utils.qs('#pfBest').checked,
        onDrop: p.onDrop || false, dropId: p.dropId || null,
        rating: p.rating || 4.5, reviewsCount: p.reviewsCount || 0, tags: p.tags || [],
        active: p.active !== false, createdAt: p.createdAt || Date.now(),
      };
      Store.upsertProduct(saved);
      Ui.closeModal(); Notify.success(isNew ? 'Producto creado.' : 'Producto actualizado.'); renderProducts();
    });
  }

  // ================= CLIENTES =================
  function renderCustomers() {
    const users = Store.state.users.filter((u) => u.role === 'customer');
    const guestEmails = new Set(Store.state.orders.filter((o) => o.guestOrder).map((o) => o.customer.email));

    function statsFor(email) {
      const os = Store.state.orders.filter((o) => o.customer.email === email);
      const total = os.reduce((s, o) => s + (o.orderStatus !== 'cancelled' ? o.total : 0), 0);
      const last = os.sort((a, b) => b.createdAt - a.createdAt)[0];
      return { count: os.length, total, last };
    }

    shell('/admin/customers', `
      <div class="admin-panel table-scroll">
        <h3>Clientes registrados</h3>
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Pedidos</th><th>Total comprado</th><th>Última compra</th><th>Registro</th><th></th></tr></thead>
          <tbody>${users.map((u) => {
            const s = statsFor(u.email);
            return `<tr><td>${Utils.escapeHtml(u.name)}</td><td>${Utils.escapeHtml(u.email)}</td><td>${s.count}</td>
              <td class="mono">${Utils.formatMoney(s.total)}</td><td>${s.last ? Utils.formatDate(s.last.createdAt) : '—'}</td>
              <td>${Utils.formatDate(u.createdAt)}</td>
              <td><button class="btn btn-outline btn-sm" data-view-customer="${u.email}">Ver</button></td></tr>`;
          }).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Sin clientes registrados.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="admin-panel table-scroll">
        <h3>Clientes invitados</h3>
        <table class="data-table">
          <thead><tr><th>Correo</th><th>Pedidos</th><th>Total comprado</th></tr></thead>
          <tbody>${Array.from(guestEmails).map((email) => {
            const s = statsFor(email);
            return `<tr><td>${Utils.escapeHtml(email)}</td><td>${s.count}</td><td class="mono">${Utils.formatMoney(s.total)}</td></tr>`;
          }).join('') || `<tr><td colspan="3" class="dim" style="text-align:center;padding:24px;">Sin compras de invitados.</td></tr>`}</tbody>
        </table>
      </div>
    `);
    Utils.qsa('[data-view-customer]').forEach((b) => b.addEventListener('click', () => {
      const email = b.dataset.viewCustomer;
      const orders = Store.state.orders.filter((o) => o.customer.email === email);
      Ui.openModal(`
        <div class="modal-head"><h3>${Utils.escapeHtml(email)}</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
        ${orders.map((o) => `<div class="mini-stat-row"><span>${o.orderNumber} · ${Utils.formatDate(o.createdAt)}</span><span class="mono">${Utils.formatMoney(o.total)}</span></div>`).join('') || '<p class="dim">Sin pedidos.</p>'}
      `);
    }));
  }

  // ================= CATEGORÍAS =================
  function renderCategories() {
    const cats = Store.state.categories;
    shell('/admin/categories', `
      <div class="admin-toolbar"><button class="btn btn-primary btn-sm" id="btnNewCat">+ Nueva categoría</button></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Slug</th><th>Estado</th><th></th></tr></thead>
          <tbody>${cats.map((c) => `<tr><td>${Utils.escapeHtml(c.name)}</td><td class="mono">${c.slug}</td>
            <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}" style="clip-path:none;border-radius:4px;">${c.active ? 'Activa' : 'Inactiva'}</span></td>
            <td><button class="btn btn-ghost btn-sm" data-toggle-cat="${c.id}">${c.active ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('')}</tbody>
        </table>
      </div>`);
    Utils.qsa('[data-toggle-cat]').forEach((b) => b.addEventListener('click', () => {
      const c = cats.find((x) => x.id === b.dataset.toggleCat); c.active = !c.active;
      Store.state.categories = cats; Storage.saveCategories(cats); renderCategories();
    }));
    Utils.qs('#btnNewCat').addEventListener('click', () => {
      Ui.openModal(`
        <div class="modal-head"><h3>Nueva categoría</h3></div>
        <div class="form-row"><label>Nombre</label><input id="cName"></div>
        <div class="form-row"><label>URL de imagen (opcional)</label><input id="cImg" placeholder="https://..."></div>
        <button class="btn btn-primary btn-block" id="btnSaveCat">Guardar</button>`);
      Utils.qs('#btnSaveCat').addEventListener('click', () => {
        const name = Utils.qs('#cName').value.trim();
        if (!name) { Notify.error('Ingresa un nombre.'); return; }
        const slug = Utils.slugify(name);
        cats.push({ id: slug, name, slug, image: Utils.qs('#cImg').value.trim() || `https://picsum.photos/seed/${slug}/900/560`, active: true });
        Storage.saveCategories(cats); Store.state.categories = cats;
        Ui.closeModal(); Notify.success('Categoría creada.'); renderCategories();
      });
    });
  }

  // ================= PROMOCIONES =================
  function renderPromotions() {
    const coupons = Store.state.coupons;
    shell('/admin/promotions', `
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
    Utils.qsa('[data-toggle-coupon]').forEach((b) => b.addEventListener('click', () => {
      const c = coupons.find((x) => x.code === b.dataset.toggleCoupon); c.active = !c.active;
      Store.setCoupons(coupons); renderPromotions();
    }));
    Utils.qsa('[data-del-coupon]').forEach((b) => b.addEventListener('click', () => {
      Store.setCoupons(coupons.filter((c) => c.code !== b.dataset.delCoupon)); renderPromotions();
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
      Utils.qs('#btnSaveCoupon').addEventListener('click', () => {
        const code = Utils.qs('#cpCode').value.trim().toUpperCase();
        if (!code) { Notify.error('Ingresa un código.'); return; }
        coupons.push({ code, type: Utils.qs('#cpType').value, value: +Utils.qs('#cpValue').value || 0,
          minSubtotal: +Utils.qs('#cpMin').value || 0, active: true, label: Utils.qs('#cpLabel').value.trim() || code });
        Store.setCoupons(coupons); Ui.closeModal(); Notify.success('Cupón creado.'); renderPromotions();
      });
    });
  }
  function couponTypeLabel(t) { return t === 'percent' ? 'Porcentaje' : t === 'free_shipping' ? 'Envío gratis' : t; }

  // ================= DROPS =================
  function renderDrops() {
    const drops = Store.state.drops;
    shell('/admin/drops', `
      <div class="admin-toolbar"><button class="btn btn-primary btn-sm" id="btnNewDrop">+ Nuevo drop</button></div>
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Stock límite</th><th>Productos</th><th>Estado</th><th></th></tr></thead>
          <tbody>${drops.map((d) => {
            const prodCount = Store.state.products.filter((p) => p.dropId === d.id).length;
            const ended = d.endDate < Date.now();
            return `<tr><td>${Utils.escapeHtml(d.name)}</td><td>${Utils.formatDate(d.startDate)}</td><td>${Utils.formatDate(d.endDate)}</td>
              <td class="mono">${d.limitedStock}</td><td>${prodCount}</td>
              <td><span class="badge ${d.status === 'active' && !ended ? 'badge-green' : 'badge-gray'}" style="clip-path:none;border-radius:4px;">${ended ? 'Finalizado' : d.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
              <td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm" data-toggle-drop="${d.id}">${d.status === 'active' ? 'Pausar' : 'Activar'}</button>
              <button class="btn btn-ghost btn-sm" data-del-drop="${d.id}" style="color:var(--c-red);">Eliminar</button></div></td></tr>`;
          }).join('') || `<tr><td colspan="7" class="dim" style="text-align:center;padding:24px;">Sin drops creados.</td></tr>`}</tbody>
        </table>
      </div>`);
    Utils.qsa('[data-toggle-drop]').forEach((b) => b.addEventListener('click', () => {
      const d = drops.find((x) => x.id === b.dataset.toggleDrop); d.status = d.status === 'active' ? 'inactive' : 'active';
      Store.setDrops(drops); renderDrops();
    }));
    Utils.qsa('[data-del-drop]').forEach((b) => b.addEventListener('click', () => {
      Store.setDrops(drops.filter((d) => d.id !== b.dataset.delDrop)); renderDrops();
    }));
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
      Utils.qs('#btnSaveDrop').addEventListener('click', () => {
        const name = Utils.qs('#dpName').value.trim();
        if (!name) { Notify.error('Ingresa un nombre.'); return; }
        const days = +Utils.qs('#dpDays').value || 3;
        drops.push({ id: Utils.uid('drop'), name, description: Utils.qs('#dpDesc').value.trim(),
          startDate: Date.now(), endDate: Date.now() + days * 86400000,
          limitedStock: +Utils.qs('#dpStock').value || 30, status: 'active' });
        Store.setDrops(drops); Ui.closeModal(); Notify.success('Drop creado.'); renderDrops();
      });
    });
  }

  // ================= RESEÑAS =================
  function renderReviews() {
    const reviews = Store.state.reviews.slice().sort((a, b) => b.date - a.date);
    shell('/admin/reviews', `
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Producto</th><th>Cliente</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th></th></tr></thead>
          <tbody>${reviews.map((r) => {
            const p = Store.getProductById(r.productId);
            return `<tr><td>${p ? Utils.escapeHtml(p.name) : '—'}</td><td>${Utils.escapeHtml(r.user)}</td>
              <td class="mono">${r.rating.toFixed(1)} ★</td>
              <td style="max-width:320px;">${Utils.escapeHtml(r.comment)}</td><td>${Utils.formatDate(r.date)}</td>
              <td><button class="btn btn-ghost btn-sm" data-del-review="${r.id}" style="color:var(--c-red);">Eliminar</button></td></tr>`;
          }).join('') || `<tr><td colspan="6" class="dim" style="text-align:center;padding:24px;">Sin reseñas.</td></tr>`}</tbody>
        </table>
      </div>`);
    Utils.qsa('[data-del-review]').forEach((b) => b.addEventListener('click', () => {
      Store.setReviews(Store.state.reviews.filter((r) => r.id !== b.dataset.delReview));
      Notify.success('Reseña eliminada.'); renderReviews();
    }));
  }

  // ================= ENVÍOS =================
  function renderShipping() {
    const cfg = Storage.getShippingConfig();
    shell('/admin/shipping', `
      <div class="admin-panel" style="max-width:520px;">
        <h3 style="margin-bottom:16px;">Configuración de envíos</h3>
        <div class="form-row"><label>Costo envío estándar</label><input type="number" id="shStandard" value="${cfg.standardShippingCost}"></div>
        <div class="form-row"><label>Costo envío exprés</label><input type="number" id="shExpress" value="${cfg.expressShippingCost}"></div>
        <div class="form-row"><label>Envío gratis a partir de</label><input type="number" id="shThreshold" value="${cfg.freeShippingThreshold}"></div>
        <button class="btn btn-primary" id="btnSaveShipping">Guardar cambios</button>
        <p class="dim" style="font-size:13px;margin-top:12px;">Estos valores se aplican de inmediato al carrito y al checkout de toda la tienda.</p>
      </div>`);
    Utils.qs('#btnSaveShipping').addEventListener('click', () => {
      Storage.saveShippingConfig({
        standardShippingCost: +Utils.qs('#shStandard').value || 0,
        expressShippingCost: +Utils.qs('#shExpress').value || 0,
        freeShippingThreshold: +Utils.qs('#shThreshold').value || 0,
      });
      Notify.success('Configuración de envíos actualizada.');
    });
  }

  // ================= ANALYTICS =================
  function renderAnalytics() {
    const orders = Store.state.orders;
    const paid = orders.filter((o) => o.paymentStatus === 'paid' || o.orderStatus === 'delivered');
    const revenueByCategory = { tenis: 0, gorras: 0 };
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

    shell('/admin/analytics', `
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

  // ================= CONFIGURACIÓN =================
  function renderSettings() {
    const admin = Store.state.currentUser;
    shell('/admin/settings', `
      <div class="admin-panel" style="max-width:480px;">
        <h3 style="margin-bottom:16px;">Cuenta de administrador</h3>
        <div class="form-row"><label>Nombre</label><input value="${Utils.escapeHtml(admin ? admin.name : '')}" disabled></div>
        <div class="form-row"><label>Correo</label><input value="${Utils.escapeHtml(admin ? admin.email : '')}" disabled></div>
        <p class="dim" style="font-size:13px;">La edición de datos de cuenta y permisos avanzados llegará en una futura versión. Por ahora, la gestión de tienda (envío, promociones, catálogo) está disponible en sus respectivas secciones del panel.</p>
      </div>`);
  }

  return {
    renderDashboard, renderOrders, renderInventory, renderProducts, renderCustomers, renderCategories, renderPromotions,
    renderDrops, renderReviews, renderShipping, renderAnalytics, renderSettings,
  };
})();
