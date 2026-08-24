/**
 * orders.js — ciclo de vida completo del pedido (relocado de
 * js/orders.js en la reorganización arquitectónica). Sigue siendo
 * local (Storage) — ver informe de arquitectura, "Fuera de alcance".
 */
const OrdersModule = (() => {
  const STATUS_GROUPS = {
    activos: ['pending', 'payment_pending', 'confirmed', 'preparing', 'ready'],
    proceso: ['confirmed', 'preparing', 'ready'],
    enviados: ['shipped', 'in_transit'],
    entregados: ['delivered'],
    cancelados: ['cancelled'],
    devueltos: ['returned'],
  };

  function statusLabel(key) {
    const s = window.EFAAT_CONFIG.orderStatuses.find((x) => x.key === key);
    return s ? s.label : key;
  }

  function createOrder({ customer, items, shippingAddress, shippingMethod, paymentMethod, couponCode, guestOrder, userId }) {
    const cfg = CartModule.shippingCfg();
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = Store.state.coupons.find((c) => c.code.toUpperCase() === couponCode.toUpperCase() && c.active);
      if (coupon && coupon.type === 'percent') discount = Math.round(subtotal * (coupon.value / 100));
    }
    let shippingCost = shippingMethod === 'express' ? cfg.expressShippingCost : cfg.standardShippingCost;
    const freeShip = (coupon && coupon.type === 'free_shipping') || (cfg.freeShippingThreshold > 0 && (subtotal - discount) >= cfg.freeShippingThreshold);
    if (freeShip) shippingCost = 0;
    const total = Math.max(0, subtotal - discount) + shippingCost;

    const order = {
      orderId: Utils.uid('ord'),
      orderNumber: Storage.nextOrderNumber(),
      userId: userId || null,
      guestOrder: !!guestOrder,
      customer,
      items,
      subtotal, discount, couponCode: coupon ? coupon.code : null,
      shippingCost, total,
      paymentMethod,
      paymentStatus: 'pending',
      shippingAddress,
      shippingMethod: shippingMethod || 'standard',
      orderStatus: 'pending',
      inventoryCommitted: false,
      statusHistory: [{ status: 'pending', ts: Date.now(), note: 'Pedido creado.' }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    Store.upsertOrder(order);
    return order;
  }

  function updateStatus(order, newStatus, note) {
    order.orderStatus = newStatus;
    order.updatedAt = Date.now();
    order.statusHistory.push({ status: newStatus, ts: Date.now(), note: note || statusLabel(newStatus) });

    if (['confirmed', 'preparing', 'ready', 'shipped', 'in_transit', 'delivered'].includes(newStatus)) {
      if (!order.inventoryCommitted) InventoryModule.commitInventory(order);
      if (newStatus === 'confirmed') order.paymentStatus = order.paymentMethod === 'cod' ? 'pending' : 'paid';
      if (newStatus === 'delivered' && order.paymentMethod === 'cod') order.paymentStatus = 'paid';
    }
    if (newStatus === 'cancelled') {
      InventoryModule.releaseInventory(order);
      if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
    }
    if (newStatus === 'returned') {
      InventoryModule.releaseInventory(order);
      order.paymentStatus = 'refunded';
    }
    Store.upsertOrder(order);
    Notify.info(`Pedido ${order.orderNumber}: ${statusLabel(newStatus)}`);
    return order;
  }

  function cancelOrder(order, reason) {
    if (!canCancel(order)) { Notify.error('Este pedido ya no se puede cancelar.'); return order; }
    return updateStatus(order, 'cancelled', reason || 'Cancelado por el cliente.');
  }
  function canCancel(order) { return ['pending', 'payment_pending', 'confirmed', 'preparing', 'ready'].includes(order.orderStatus); }

  function findByNumberAndContact(orderNumber, contact) {
    return Store.state.orders.find((o) => o.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase() &&
      (o.customer.email.toLowerCase() === contact.toLowerCase() || o.customer.phone === contact));
  }

  // ================= Vista: Mis pedidos =================
  function renderMyOrders(activeTab = 'todos') {
    const root = Utils.qs('#viewRoot');
    if (!AuthModule.isLoggedIn()) { root.innerHTML = guestOrdersPrompt(); return; }
    const all = Store.myOrders();
    const tabs = [
      ['todos', 'Todos'], ['activos', 'Activos'], ['proceso', 'En proceso'],
      ['enviados', 'Enviados'], ['entregados', 'Entregados'], ['cancelados', 'Cancelados'],
    ];
    root.innerHTML = `
      <div class="wrap section">
        <h1 class="h-display section-title" style="margin-bottom:20px;">Mis pedidos</h1>
        <div class="tabs-row" id="orderTabs">
          ${tabs.map(([k, l]) => `<button class="tab-btn ${activeTab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
        </div>
        <div id="ordersList"></div>
      </div>`;
    renderOrdersList(all, activeTab);
    Utils.qsa('#orderTabs .tab-btn').forEach((btn) => btn.addEventListener('click', () => renderMyOrders(btn.dataset.tab)));
  }

  function guestOrdersPrompt() {
    return `<div class="wrap state-block"><div class="ic">📦</div><h3>Inicia sesión para ver tus pedidos</h3>
      <p>O consulta el estado de una compra como invitado desde Seguimiento de pedido.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <a class="btn btn-primary" href="#/login">Iniciar sesión</a>
        <a class="btn btn-outline" href="#/track">Seguimiento de pedido</a>
      </div></div>`;
  }

  function renderOrdersList(orders, tab) {
    let filtered = orders;
    if (tab !== 'todos') filtered = orders.filter((o) => (STATUS_GROUPS[tab] || []).includes(o.orderStatus));
    const box = Utils.qs('#ordersList');
    if (!filtered.length) { box.innerHTML = `<div class="state-block"><div class="ic">📦</div><h3>Todavía no has realizado ningún pedido.</h3><a class="btn btn-primary" href="#/shop">Ir a comprar</a></div>`; return; }
    box.innerHTML = filtered.map((o) => `
      <div class="order-row">
        <div class="order-thumbs">${o.items.slice(0, 3).map((it) => `<img src="${it.image}" alt="">`).join('')}</div>
        <div>
          <div style="font-weight:700;">${o.orderNumber}</div>
          <div class="faint" style="font-size:12px;">${Utils.formatDate(o.createdAt)} · ${o.items.length} producto(s)</div>
        </div>
        <span class="status-pill status-${o.orderStatus}"><span class="dot"></span>${statusLabel(o.orderStatus)}</span>
        <a class="btn btn-outline btn-sm" href="#/account/orders/${o.orderId}">Ver pedido</a>
      </div>`).join('');
  }

  // ================= Vista: Detalle de pedido =================
  function renderOrderDetail(orderId) {
    const root = Utils.qs('#viewRoot');
    const order = Store.state.orders.find((o) => o.orderId === orderId);
    if (!order) { root.innerHTML = `<div class="wrap state-block"><h3>Pedido no encontrado</h3></div>`; return; }
    root.innerHTML = `
      <div class="wrap section" style="max-width:900px;">
        <a href="#/account/orders" class="dim" style="font-size:12.5px;">← Volver a mis pedidos</a>
        <div class="order-ticket" style="margin:18px 0 26px;">
          <div class="order-ticket-main">
            <div class="order-num">PEDIDO</div>
            <h2 class="h-display" style="font-size:26px;">${order.orderNumber}</h2>
            <div class="dim" style="font-size:12.5px;margin-top:4px;">${Utils.formatDateTime(order.createdAt)}</div>
          </div>
          <div class="order-ticket-stub">
            <span class="status-pill status-${order.orderStatus}"><span class="dot"></span>${statusLabel(order.orderStatus)}</span>
            <b class="mono">${Utils.formatMoney(order.total)}</b>
          </div>
        </div>

        ${tracker(order)}

        <div class="admin-panel">
          <h3>Productos</h3>
          ${order.items.map((it) => `
            <div class="summary-line-item">
              <img src="${it.image}" alt="">
              <div style="flex:1;">
                <div style="font-weight:600;">${Utils.escapeHtml(it.name)}</div>
                <div class="faint">${it.color} · ${it.size} · x${it.qty}</div>
              </div>
              <div class="mono">${Utils.formatMoney(it.price * it.qty)}</div>
            </div>`).join('')}
          <div class="totals-row" style="margin-top:10px;"><span>Subtotal</span><span class="mono">${Utils.formatMoney(order.subtotal)}</span></div>
          ${order.discount ? `<div class="totals-row"><span>Descuento</span><span class="mono">-${Utils.formatMoney(order.discount)}</span></div>` : ''}
          <div class="totals-row"><span>Envío</span><span class="mono">${order.shippingCost === 0 ? 'Gratis' : Utils.formatMoney(order.shippingCost)}</span></div>
          <div class="totals-row total"><span>Total</span><span class="mono">${Utils.formatMoney(order.total)}</span></div>
        </div>

        <div class="admin-panel">
          <h3>Entrega y pago</h3>
          <div class="mini-stat-row"><span>Dirección</span><span>${order.shippingAddress.address}, ${order.shippingAddress.city}</span></div>
          <div class="mini-stat-row"><span>Método de envío</span><span>${order.shippingMethod === 'express' ? 'Exprés' : 'Estándar'}</span></div>
          <div class="mini-stat-row"><span>Método de pago</span><span>${paymentLabel(order.paymentMethod)}</span></div>
          <div class="mini-stat-row"><span>Estado de pago</span><span>${paymentStatusLabel(order.paymentStatus)}</span></div>
        </div>

        ${canCancel(order) ? `<button class="btn btn-outline" id="btnCancelOrder">Cancelar pedido</button>` : ''}
      </div>`;

    const cancelBtn = Utils.qs('#btnCancelOrder');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      Ui.openModal(`
        <div class="modal-head"><h3>¿Cancelar pedido?</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
        <p class="dim" style="margin-bottom:18px;">Esta acción liberará el inventario reservado. No se puede deshacer.</p>
        <div style="display:flex;gap:10px;"><button class="btn btn-outline btn-block" onclick="Ui.closeModal()">Volver</button>
        <button class="btn btn-primary btn-block" id="confirmCancel">Sí, cancelar</button></div>`);
      Utils.qs('#confirmCancel').addEventListener('click', () => {
        cancelOrder(order);
        Ui.closeModal();
        renderOrderDetail(orderId);
      });
    });
  }

  function tracker(order) {
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'returned') {
      return `<div class="admin-panel"><span class="status-pill status-${order.orderStatus}"><span class="dot"></span>${statusLabel(order.orderStatus)}</span>
        <p class="dim" style="margin-top:10px;font-size:13px;">${order.statusHistory[order.statusHistory.length - 1].note}</p></div>`;
    }
    const flow = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
    const currentIdx = flow.indexOf(['payment_pending'].includes(order.orderStatus) ? 'pending' : ['ready'].includes(order.orderStatus) ? 'preparing' : ['in_transit'].includes(order.orderStatus) ? 'shipped' : order.orderStatus);
    const labels = { pending: 'Pedido recibido', confirmed: 'Pago confirmado', preparing: 'Preparando pedido', shipped: 'Enviado', delivered: 'Entregado' };
    return `<div class="tracker">
      ${flow.map((key, i) => {
        const done = i <= currentIdx;
        const hist = order.statusHistory.find((h) => h.status === key);
        return `<div class="tracker-step ${done ? 'done' : ''}">
          <div class="tracker-dot-col"><div class="tracker-dot"></div>${i < flow.length - 1 ? '<div class="tracker-line"></div>' : ''}</div>
          <div><div class="tracker-label">${labels[key]}</div>${hist ? `<div class="tracker-time">${Utils.formatDateTime(hist.ts)}</div>` : ''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function paymentLabel(id) {
    const m = window.EFAAT_CONFIG.paymentMethods.find((x) => x.id === id);
    return m ? m.label : id;
  }
  function paymentStatusLabel(s) {
    return { pending: 'Pendiente', paid: 'Pagado', failed: 'Fallido', refunded: 'Reembolsado' }[s] || s;
  }

  // ================= Vista: Seguimiento (invitado) =================
  function renderTrackPage() {
    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap section" style="max-width:520px;">
        <h1 class="h-display section-title" style="margin-bottom:6px;">Seguimiento de pedido</h1>
        <p class="dim" style="margin-bottom:24px;font-size:13.5px;">Consulta el estado de tu compra con tu número de pedido y el correo o teléfono usado al comprar.</p>
        <div class="form-row"><label>Número de pedido</label><input id="trackNum" placeholder="EF-000001"></div>
        <div class="form-row"><label>Correo o teléfono</label><input id="trackContact" placeholder="tu@correo.com"></div>
        <button class="btn btn-primary btn-block" id="btnTrack">Consultar</button>
        <div id="trackResult" style="margin-top:26px;"></div>
      </div>`;
    Utils.qs('#btnTrack').addEventListener('click', () => {
      const num = Utils.qs('#trackNum').value;
      const contact = Utils.qs('#trackContact').value;
      const order = findByNumberAndContact(num, contact);
      const box = Utils.qs('#trackResult');
      if (!order) { box.innerHTML = `<p style="color:var(--c-red);font-size:13px;">No encontramos un pedido con esos datos.</p>`; return; }
      box.innerHTML = `<div class="order-ticket" style="margin-bottom:18px;">
          <div class="order-ticket-main"><div class="order-num">PEDIDO</div><h2 class="h-display" style="font-size:22px;">${order.orderNumber}</h2></div>
          <div class="order-ticket-stub"><span class="status-pill status-${order.orderStatus}"><span class="dot"></span>${statusLabel(order.orderStatus)}</span></div>
        </div>${tracker(order)}`;
    });
  }

  return { STATUS_GROUPS, statusLabel, createOrder, updateStatus, cancelOrder, canCancel,
    findByNumberAndContact, renderMyOrders, renderOrderDetail, renderTrackPage, tracker, paymentLabel, paymentStatusLabel };
})();
