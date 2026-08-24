/**
 * cart.js — estado del carrito, cálculos de totales, drawer y vista /cart.
 * El carrito NUNCA descuenta stock definitivo (ver inventory.js) — solo
 * referencia productId/variantId/qty; el precio y el stock siempre se
 * resuelven en vivo contra Store.state.products.
 */
const CartModule = (() => {
  function items() {
    return Store.state.cart.map((ci) => {
      const product = Store.getProductById(ci.productId);
      const variant = product ? Store.getVariant(product, ci.variantId) : null;
      return { ...ci, product, variant };
    }).filter((ci) => ci.product && ci.variant);
  }

  function addItem(productId, variantId, qty = 1) {
    const cart = Store.state.cart.slice();
    const existing = cart.find((c) => c.productId === productId && c.variantId === variantId);
    const product = Store.getProductById(productId);
    const variant = Store.getVariant(product, variantId);
    const maxQty = variant ? variant.stock : 99;
    if (existing) {
      existing.qty = Utils.clamp(existing.qty + qty, 1, maxQty);
    } else {
      cart.push({ cartItemId: Utils.uid('ci'), productId, variantId, qty: Utils.clamp(qty, 1, maxQty) });
    }
    Store.setCart(cart);
    Notify.success('Agregado al carrito');
  }

  function updateQty(cartItemId, qty) {
    const cart = Store.state.cart.slice();
    const line = cart.find((c) => c.cartItemId === cartItemId);
    if (!line) return;
    const product = Store.getProductById(line.productId);
    const variant = Store.getVariant(product, line.variantId);
    const max = variant ? variant.stock : 99;
    line.qty = Utils.clamp(qty, 1, Math.max(1, max));
    Store.setCart(cart);
  }

  function removeItem(cartItemId) {
    Store.setCart(Store.state.cart.filter((c) => c.cartItemId !== cartItemId));
    Notify.info('Producto eliminado del carrito.');
  }

  function clear() { Store.setCart([]); }

  // ---------- Cupón ----------
  function applyCoupon(code) {
    const coupon = Store.state.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.active);
    const subtotal = totals().subtotal;
    if (!coupon) return { ok: false, error: 'Cupón no válido.' };
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      return { ok: false, error: `Este cupón aplica desde ${Utils.formatMoney(coupon.minSubtotal)}.` };
    }
    Store.state.appliedCoupon = coupon;
    return { ok: true, coupon };
  }
  function removeCoupon() { Store.state.appliedCoupon = null; }

  // ---------- Totales ----------
  function totals() {
    const lines = items();
    const subtotal = lines.reduce((s, l) => s + l.variant.price * l.qty, 0);
    let discount = 0;
    let freeShip = false;
    const coupon = Store.state.appliedCoupon;
    if (coupon) {
      if (coupon.type === 'percent') discount = Math.round(subtotal * (coupon.value / 100));
      if (coupon.type === 'free_shipping') freeShip = true;
    }
    const cfg = Storage.getShippingConfig();
    let shipping = subtotal === 0 ? 0 : cfg.standardShippingCost;
    if (freeShip || subtotal - discount >= cfg.freeShippingThreshold) shipping = 0;
    const total = Math.max(0, subtotal - discount) + shipping;
    return { subtotal, discount, shipping, total, coupon, freeShip };
  }

  function freeShippingRemaining() {
    const t = totals();
    const cfg = Storage.getShippingConfig();
    return Math.max(0, cfg.freeShippingThreshold - (t.subtotal - t.discount));
  }

  // ---------- Recomendaciones / combos ----------
  function crossSell() {
    const lines = items();
    if (!lines.length) return Store.state.products.filter((p) => p.bestSeller).slice(0, 4);
    const cats = new Set(lines.map((l) => l.product.category));
    const wantCategory = cats.has('tenis') && !cats.has('gorras') ? 'gorras'
      : cats.has('gorras') && !cats.has('tenis') ? 'tenis' : null;
    let pool = Store.state.products.filter((p) => !lines.some((l) => l.productId === p.id));
    if (wantCategory) pool = pool.filter((p) => p.category === wantCategory);
    return pool.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0)).slice(0, 4);
  }

  function comboSuggestion() {
    const tenis = Store.state.products.find((p) => p.category === 'tenis' && p.stock > 0);
    const gorra = Store.state.products.find((p) => p.category === 'gorras' && p.stock > 0);
    if (!tenis || !gorra) return null;
    const individual = tenis.price + gorra.price;
    const comboPrice = Math.round(individual * 0.93);
    return { tenis, gorra, individual, comboPrice, save: individual - comboPrice };
  }

  // ================= Drawer =================
  function renderDrawer() {
    const drawer = Utils.qs('#cartDrawer');
    const lines = items();
    const t = totals();
    const remaining = freeShippingRemaining();
    const pct = Utils.clamp(100 - (remaining / Storage.getShippingConfig().freeShippingThreshold) * 100, 0, 100);

    drawer.innerHTML = `
      <div class="cart-drawer-head"><h3>Tu carrito (${lines.reduce((s, l) => s + l.qty, 0)})</h3>
        <button class="icon-btn" id="btnCloseCart">${Ui.ICONS.close}</button></div>
      <div class="cart-drawer-body">
        ${lines.length ? `
          <div class="free-ship-bar">
            ${remaining > 0 ? `Te faltan <strong>${Utils.formatMoney(remaining)}</strong> para envío gratis.` : '¡Tu pedido tiene envío gratis! 🎉'}
            <div class="free-ship-track"><div class="free-ship-fill" style="width:${pct}%"></div></div>
          </div>
          ${lines.map(cartLineHtml).join('')}
        ` : `<div class="state-block"><div class="ic">🛒</div><h3>Tu carrito está esperando algo.</h3><p>Explora tenis y gorras seleccionados para tu estilo.</p><a class="btn btn-primary" href="#/shop" id="btnGoShop">Explorar productos</a></div>`}
      </div>
      ${lines.length ? `
      <div class="cart-drawer-foot">
        <div class="totals-row"><span>Subtotal</span><span class="mono">${Utils.formatMoney(t.subtotal)}</span></div>
        ${t.discount ? `<div class="totals-row"><span>Descuento</span><span class="mono">-${Utils.formatMoney(t.discount)}</span></div>` : ''}
        <div class="totals-row total"><span>Total</span><span class="mono">${Utils.formatMoney(t.total)}</span></div>
        <a href="#/cart" class="btn btn-outline btn-block" style="margin-top:12px;">Ver carrito</a>
        <a href="#/checkout" class="btn btn-primary btn-block" style="margin-top:8px;">Ir a pagar</a>
      </div>` : ''}
    `;
    Utils.qs('#btnCloseCart').addEventListener('click', Ui.closeCartDrawer);
    const goShop = Utils.qs('#btnGoShop'); if (goShop) goShop.addEventListener('click', Ui.closeCartDrawer);
    wireLineEvents(drawer);
  }

  function cartLineHtml(l) {
    return `
    <div class="cart-line" data-cart-item="${l.cartItemId}">
      <img src="${l.product.images[0]}" alt="">
      <div>
        <div class="cart-line-name">${Utils.escapeHtml(l.product.name)}</div>
        <div class="cart-line-meta">${l.variant.color} · ${l.variant.size}</div>
        <div class="cart-line-price mono">${Utils.formatMoney(l.variant.price)}</div>
        <div class="cart-line-actions">
          <div class="qty-selector" style="height:32px;">
            <button data-line-qty="dec" style="height:30px;width:30px;">−</button>
            <span style="width:28px;">${l.qty}</span>
            <button data-line-qty="inc" style="height:30px;width:30px;">+</button>
          </div>
        </div>
      </div>
      <div class="cart-line-remove"><button class="btn-ghost" data-line-remove style="font-size:11px;color:var(--c-red);">Eliminar</button></div>
    </div>`;
  }

  function wireLineEvents(scope) {
    Utils.qsa('[data-line-qty]', scope).forEach((btn) => btn.addEventListener('click', (e) => {
      const row = e.target.closest('[data-cart-item]');
      const id = row.dataset.cartItem;
      const line = items().find((l) => l.cartItemId === id);
      if (!line) return;
      const delta = btn.dataset.lineQty === 'inc' ? 1 : -1;
      if (line.qty + delta <= 0) { removeItem(id); return; }
      updateQty(id, line.qty + delta);
    }));
    Utils.qsa('[data-line-remove]', scope).forEach((btn) => btn.addEventListener('click', (e) => {
      removeItem(e.target.closest('[data-cart-item]').dataset.cartItem);
    }));
  }

  // ================= Vista /cart =================
  function renderCartPage() {
    const root = Utils.qs('#viewRoot');
    const lines = items();
    const t = totals();
    const remaining = freeShippingRemaining();
    const pct = Utils.clamp(100 - (remaining / Storage.getShippingConfig().freeShippingThreshold) * 100, 0, 100);
    const combo = comboSuggestion();
    const cross = crossSell();

    root.innerHTML = `
      <div class="wrap section">
        <h1 class="h-display section-title" style="margin-bottom:22px;">Carrito</h1>
        ${!lines.length ? `
          <div class="state-block"><div class="ic">🛒</div><h3>Tu carrito está esperando algo.</h3>
          <p>Explora tenis y gorras seleccionados para tu estilo.</p>
          <a class="btn btn-primary" href="#/shop">Explorar productos</a></div>
        ` : `
        <div class="checkout-layout">
          <div>
            <div class="free-ship-bar">
              ${remaining > 0 ? `Te faltan <strong>${Utils.formatMoney(remaining)}</strong> para envío gratis.` : '¡Tu pedido tiene envío gratis! 🎉'}
              <div class="free-ship-track"><div class="free-ship-fill" style="width:${pct}%"></div></div>
            </div>
            ${lines.map(cartLineHtml).join('')}

            ${combo ? `
            <div class="section-head" style="margin-top:34px;"><h3 class="h-display" style="font-size:22px;">Combina tu estilo</h3></div>
            <div class="combo-card">
              <div class="combo-imgs"><img src="${combo.tenis.images[0]}"><img src="${combo.gorra.images[0]}"></div>
              <div>
                <div style="font-weight:700;font-size:13.5px;">Combo Street</div>
                <div class="faint" style="font-size:12px;">${combo.tenis.name} + ${combo.gorra.name}</div>
                <div style="margin-top:4px;"><span class="mono" style="text-decoration:line-through;color:var(--c-text-faint);font-size:12px;">${Utils.formatMoney(combo.individual)}</span>
                <span class="mono" style="font-weight:700;margin-left:6px;">${Utils.formatMoney(combo.comboPrice)}</span></div>
                <div class="combo-save">Ahorras ${Utils.formatMoney(combo.save)}</div>
              </div>
              <button class="btn btn-primary btn-sm" id="btnAddCombo">Agregar combo</button>
            </div>` : ''}

            <div class="section-head" style="margin-top:34px;"><h3 class="h-display" style="font-size:22px;">También te puede interesar</h3></div>
            <div class="grid-products">${cross.map(Ui.productCard).join('')}</div>
          </div>

          <div class="summary-card">
            <h3 style="margin-bottom:14px;">Resumen</h3>
            <div class="coupon-row">
              <input type="text" id="couponInput" placeholder="Código de cupón" value="${t.coupon ? t.coupon.code : ''}" ${t.coupon ? 'disabled' : ''}>
              ${t.coupon ? `<button class="btn btn-outline btn-sm" id="btnRemoveCoupon">Quitar</button>` : `<button class="btn btn-outline btn-sm" id="btnApplyCoupon">Aplicar</button>`}
            </div>
            <div class="totals-row"><span>Subtotal</span><span class="mono">${Utils.formatMoney(t.subtotal)}</span></div>
            ${t.discount ? `<div class="totals-row"><span>Descuento (${t.coupon.code})</span><span class="mono">-${Utils.formatMoney(t.discount)}</span></div>` : ''}
            <div class="totals-row"><span>Envío</span><span class="mono">${t.shipping === 0 ? 'Gratis' : Utils.formatMoney(t.shipping)}</span></div>
            <div class="totals-row total"><span>Total</span><span class="mono">${Utils.formatMoney(t.total)}</span></div>
            <a href="#/checkout" class="btn btn-primary btn-block" style="margin-top:16px;">Ir a pagar</a>
          </div>
        </div>`}
      </div>`;

    if (!lines.length) return;
    wireLineEvents(root);
    const couponBtn = Utils.qs('#btnApplyCoupon');
    if (couponBtn) couponBtn.addEventListener('click', () => {
      const code = Utils.qs('#couponInput').value;
      const res = applyCoupon(code);
      if (res.ok) { Notify.success(`Cupón aplicado: ${res.coupon.label}`); renderCartPage(); }
      else Notify.error(res.error);
    });
    const removeBtn = Utils.qs('#btnRemoveCoupon');
    if (removeBtn) removeBtn.addEventListener('click', () => { removeCoupon(); renderCartPage(); });
    const comboBtn = Utils.qs('#btnAddCombo');
    if (comboBtn) comboBtn.addEventListener('click', () => {
      const availT = combo.tenis.variants.find((v) => v.stock > 0);
      const availG = combo.gorra.variants.find((v) => v.stock > 0);
      if (availT) addItem(combo.tenis.id, availT.variantId, 1);
      if (availG) addItem(combo.gorra.id, availG.variantId, 1);
      renderCartPage();
    });
  }

  return { items, addItem, updateQty, removeItem, clear, totals, freeShippingRemaining,
    applyCoupon, removeCoupon, crossSell, comboSuggestion, renderDrawer, renderCartPage };
})();
