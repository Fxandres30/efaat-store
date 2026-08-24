/**
 * checkout.js — flujo de checkout en 4 pasos. No obliga a crear cuenta
 * (permite "comprar como invitado") y simula el pago (ningún dato de
 * pago real se procesa ni se transmite).
 */
const CheckoutModule = (() => {
  let step = 1;
  let data = {};
  let createdOrder = null;

  function resetState() {
    step = 1;
    createdOrder = null;
    const user = Store.state.currentUser;
    const addr = AuthModule.getDefaultAddress();
    data = {
      guest: !user,
      name: user ? user.name : '', email: user ? user.email : '', phone: user ? user.phone : '',
      addressId: addr ? addr.id : null,
      recipient: addr ? addr.recipient : (user ? user.name : ''),
      department: addr ? addr.department : '', city: addr ? addr.city : '',
      address: addr ? addr.address : '', reference: addr ? addr.reference : '',
      notes: '', saveAddress: !user,
      shippingMethod: 'standard', paymentMethod: 'card',
      couponCode: Store.state.appliedCoupon ? Store.state.appliedCoupon.code : '',
      createAccountAfter: false,
    };
  }

  function render() {
    if (step !== 4 && !CartModule.items().length) { location.hash = '#/cart'; return; }
    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap section">
        <div class="checkout-steps">
          ${['Datos', 'Envío', 'Pago', 'Confirmación'].map((l, i) => `<div class="co-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}">${i + 1}. ${l}</div>`).join('')}
        </div>
        <div class="checkout-layout">
          <div id="stepContent"></div>
          ${step < 4 ? summaryCard() : ''}
        </div>
      </div>`;
    renderStep();
  }

  function summaryCard() {
    const t = CartModule.totals();
    return `<div class="summary-card">
      <h3 style="margin-bottom:14px;">Resumen del pedido</h3>
      ${CartModule.items().map((l) => `<div class="summary-line-item"><img src="${l.product.images[0]}"><div style="flex:1;"><div style="font-weight:600;">${Utils.escapeHtml(l.product.name)}</div><div class="faint">${l.variant.color} · ${l.variant.size} · x${l.qty}</div></div><div class="mono">${Utils.formatMoney(l.variant.price * l.qty)}</div></div>`).join('')}
      <div class="totals-row" style="margin-top:10px;"><span>Subtotal</span><span class="mono">${Utils.formatMoney(t.subtotal)}</span></div>
      ${t.discount ? `<div class="totals-row"><span>Descuento</span><span class="mono">-${Utils.formatMoney(t.discount)}</span></div>` : ''}
      <div class="totals-row"><span>Envío</span><span class="mono">${data.shippingMethod === 'express' ? Utils.formatMoney(Storage.getShippingConfig().expressShippingCost) : (t.shipping === 0 ? 'Gratis' : Utils.formatMoney(t.shipping))}</span></div>
      <div class="totals-row total"><span>Total</span><span class="mono">${Utils.formatMoney(t.total)}</span></div>
    </div>`;
  }

  function renderStep() {
    if (step === 1) return renderDataStep();
    if (step === 2) return renderShippingStep();
    if (step === 3) return renderPaymentStep();
    if (step === 4) return renderConfirmationStep();
  }

  // -------- Paso 1: Datos --------
  function renderDataStep() {
    Utils.qs('#stepContent').innerHTML = `
      <div class="admin-panel">
        <h3>Datos de contacto</h3>
        ${!AuthModule.isLoggedIn() ? `<p class="dim" style="font-size:12.5px;margin-bottom:14px;">Puedes comprar como invitado. Podrás crear tu cuenta después de la compra.</p>` : ''}
        <div class="form-row"><label>Nombre completo</label><input id="fName" value="${Utils.escapeHtml(data.name)}"><div class="field-error" id="errName"></div></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Correo electrónico</label><input id="fEmail" value="${Utils.escapeHtml(data.email)}"><div class="field-error" id="errEmail"></div></div>
          <div class="form-row"><label>Teléfono</label><input id="fPhone" value="${Utils.escapeHtml(data.phone)}"><div class="field-error" id="errPhone"></div></div>
        </div>
        <button class="btn btn-primary" id="btnNext1">Continuar</button>
      </div>`;
    Utils.qs('#btnNext1').addEventListener('click', () => {
      data.name = Utils.qs('#fName').value.trim();
      data.email = Utils.qs('#fEmail').value.trim();
      data.phone = Utils.qs('#fPhone').value.trim();
      const errors = {};
      if (!data.name) errors.errName = 'Ingresa tu nombre completo.';
      if (!/^\S+@\S+\.\S+$/.test(data.email)) errors.errEmail = 'Ingresa un correo válido.';
      if (!/^\d{7,10}$/.test(data.phone.replace(/\s/g, ''))) errors.errPhone = 'Ingresa un teléfono válido.';
      if (Object.keys(errors).length) { showErrors(errors); return; }
      step = 2; render();
    });
  }

  // -------- Paso 2: Envío --------
  function renderShippingStep() {
    const cfg = Storage.getShippingConfig();
    const savedAddresses = AuthModule.isLoggedIn() ? (Store.state.currentUser.addresses || []) : [];
    Utils.qs('#stepContent').innerHTML = `
      <div class="admin-panel">
        <h3>Dirección de entrega</h3>
        ${savedAddresses.length ? `
          <div class="form-row"><label>Direcciones guardadas</label>
            <select id="savedAddrSelect">
              <option value="">Nueva dirección</option>
              ${savedAddresses.map((a) => `<option value="${a.id}" ${data.addressId === a.id ? 'selected' : ''}>${a.name} — ${a.address}</option>`).join('')}
            </select>
          </div>` : ''}
        <div class="form-grid-2">
          <div class="form-row"><label>Departamento</label><input id="fDept" value="${Utils.escapeHtml(data.department)}"><div class="field-error" id="errDept"></div></div>
          <div class="form-row"><label>Ciudad</label><input id="fCity" value="${Utils.escapeHtml(data.city)}"><div class="field-error" id="errCity"></div></div>
        </div>
        <div class="form-row"><label>Dirección</label><input id="fAddr" value="${Utils.escapeHtml(data.address)}" placeholder="Calle, número, apto..."><div class="field-error" id="errAddr"></div></div>
        <div class="form-row"><label>Referencia / barrio</label><input id="fRef" value="${Utils.escapeHtml(data.reference)}"></div>
        <div class="form-row"><label>Notas de entrega (opcional)</label><textarea id="fNotes" rows="2">${Utils.escapeHtml(data.notes)}</textarea></div>
        ${AuthModule.isLoggedIn() ? `<label class="filter-check" style="margin-bottom:16px;"><input type="checkbox" id="fSaveAddr" ${data.saveAddress ? 'checked' : ''}> Guardar esta dirección en mi cuenta</label>` : ''}

        <h3 style="margin-top:8px;">Método de envío</h3>
        <label class="radio-card ${data.shippingMethod === 'standard' ? 'selected' : ''}"><input type="radio" name="ship" value="standard" ${data.shippingMethod === 'standard' ? 'checked' : ''}>
          <div><div class="rc-title">Envío estándar — ${Utils.formatMoney(cfg.standardShippingCost)}</div><div class="rc-sub">3 a 5 días hábiles</div></div></label>
        <label class="radio-card ${data.shippingMethod === 'express' ? 'selected' : ''}"><input type="radio" name="ship" value="express" ${data.shippingMethod === 'express' ? 'checked' : ''}>
          <div><div class="rc-title">Envío exprés — ${Utils.formatMoney(cfg.expressShippingCost)}</div><div class="rc-sub">1 a 2 días hábiles</div></div></label>

        <div style="display:flex;gap:10px;margin-top:14px;">
          <button class="btn btn-outline" id="btnBack2">Volver</button>
          <button class="btn btn-primary" id="btnNext2">Continuar</button>
        </div>
      </div>`;

    const sel = Utils.qs('#savedAddrSelect');
    if (sel) sel.addEventListener('change', () => {
      const a = savedAddresses.find((x) => x.id === sel.value);
      if (a) { data.addressId = a.id; data.department = a.department; data.city = a.city; data.address = a.address; data.reference = a.reference; }
      else { data.addressId = null; data.department = ''; data.city = ''; data.address = ''; data.reference = ''; }
      renderShippingStep();
    });
    Utils.qsa('input[name="ship"]').forEach((r) => r.addEventListener('change', (e) => { data.shippingMethod = e.target.value; render(); }));
    Utils.qs('#btnBack2').addEventListener('click', () => { step = 1; render(); });
    Utils.qs('#btnNext2').addEventListener('click', () => {
      data.department = Utils.qs('#fDept').value.trim();
      data.city = Utils.qs('#fCity').value.trim();
      data.address = Utils.qs('#fAddr').value.trim();
      data.reference = Utils.qs('#fRef').value.trim();
      data.notes = Utils.qs('#fNotes').value.trim();
      const saveEl = Utils.qs('#fSaveAddr'); if (saveEl) data.saveAddress = saveEl.checked;
      const errors = {};
      if (!data.department) errors.errDept = 'Requerido.';
      if (!data.city) errors.errCity = 'Requerido.';
      if (!data.address) errors.errAddr = 'Requerido.';
      if (Object.keys(errors).length) { showErrors(errors); return; }
      step = 3; render();
    });
  }

  // -------- Paso 3: Pago --------
  function renderPaymentStep() {
    const methods = window.EFAAT_CONFIG.paymentMethods;
    Utils.qs('#stepContent').innerHTML = `
      <div class="admin-panel">
        <h3>Método de pago</h3>
        <p class="dim" style="font-size:12px;margin-bottom:14px;">Simulación de pago — no se procesan transacciones reales en esta versión.</p>
        ${methods.map((m) => `
          <label class="radio-card ${data.paymentMethod === m.id ? 'selected' : ''}"><input type="radio" name="pay" value="${m.id}" ${data.paymentMethod === m.id ? 'checked' : ''}>
            <div><div class="rc-title">${m.icon} ${m.label}</div><div class="rc-sub">${m.note}</div></div></label>`).join('')}
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button class="btn btn-outline" id="btnBack3">Volver</button>
          <button class="btn btn-primary" id="btnPay">Confirmar y pagar</button>
        </div>
      </div>`;
    Utils.qsa('input[name="pay"]').forEach((r) => r.addEventListener('change', (e) => { data.paymentMethod = e.target.value; render(); }));
    Utils.qs('#btnBack3').addEventListener('click', () => { step = 2; render(); });
    Utils.qs('#btnPay').addEventListener('click', processPayment);
  }

  function processPayment() {
    const btn = Utils.qs('#btnPay');
    btn.disabled = true; btn.textContent = 'Procesando pago...';
    const lines = CartModule.items();
    const avail = InventoryModule.checkAvailability(lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })));
    if (!avail.ok) {
      Notify.error('Uno de los productos ya no tiene stock suficiente.');
      btn.disabled = false; btn.textContent = 'Confirmar y pagar';
      step = 2; render();
      return;
    }
    setTimeout(() => {
      const order = OrdersModule.createOrder({
        customer: { name: data.name, email: data.email, phone: data.phone },
        items: lines.map((l) => ({
          productId: l.productId, variantId: l.variantId, sku: l.variant.sku,
          name: l.product.name, brand: l.product.brand, image: l.product.images[0],
          size: l.variant.size, color: l.variant.color, price: l.variant.price, qty: l.qty,
        })),
        shippingAddress: {
          recipient: data.name, phone: data.phone, department: data.department,
          city: data.city, address: data.address, reference: data.reference, notes: data.notes,
        },
        shippingMethod: data.shippingMethod,
        paymentMethod: data.paymentMethod,
        couponCode: data.couponCode || null,
        guestOrder: !AuthModule.isLoggedIn(),
        userId: AuthModule.isLoggedIn() ? Store.state.currentUser.userId : null,
      });

      // Simulación del resultado del pago:
      // - transferencia bancaria requiere confirmación manual -> queda "pago pendiente"
      // - el resto se confirma automáticamente (incl. contraentrega, que se paga al recibir)
      if (data.paymentMethod === 'transfer') {
        order.orderStatus = 'payment_pending';
        order.statusHistory.push({ status: 'payment_pending', ts: Date.now(), note: 'Esperando confirmación de la transferencia.' });
        Store.upsertOrder(order);
      } else {
        OrdersModule.updateStatus(order, 'confirmed', 'Pago simulado confirmado.');
      }

      if (AuthModule.isLoggedIn() && data.saveAddress) {
        AuthModule.saveAddress({
          id: data.addressId, name: data.addressId ? undefined : 'Dirección', recipient: data.name,
          phone: data.phone, address: data.address, city: data.city, department: data.department,
          postalCode: '', reference: data.reference, isDefault: !data.addressId,
        });
      }

      createdOrder = order;
      CartModule.clear();
      CartModule.removeCoupon();
      step = 4; render();
    }, 900);
  }

  // -------- Paso 4: Confirmación --------
  function renderConfirmationStep() {
    const order = createdOrder;
    Utils.qs('#stepContent').innerHTML = `
      <div class="admin-panel" style="text-align:center;padding:36px 20px;">
        <div style="font-size:44px;margin-bottom:10px;">✓</div>
        <h2 class="h-display" style="font-size:30px;">¡Pedido creado!</h2>
        <p class="dim" style="margin:8px 0 18px;">Tu pedido <strong class="mono">${order.orderNumber}</strong> fue registrado correctamente.</p>
        <div style="max-width:360px;margin:0 auto 22px;">${OrdersModule.tracker(order)}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a class="btn btn-outline" href="#/shop">Seguir comprando</a>
          ${AuthModule.isLoggedIn()
            ? `<a class="btn btn-primary" href="#/account/orders/${order.orderId}">Ver mi pedido</a>`
            : `<button class="btn btn-primary" id="btnCreateAccountAfter">Crear cuenta con estos datos</button>`}
        </div>
        ${!AuthModule.isLoggedIn() ? `<p class="faint" style="margin-top:14px;font-size:12px;">O consulta después el estado en Seguimiento de pedido con tu número y correo.</p>` : ''}
      </div>`;
    const createBtn = Utils.qs('#btnCreateAccountAfter');
    if (createBtn) createBtn.addEventListener('click', () => {
      Ui.openModal(`
        <div class="modal-head"><h3>Crear cuenta</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
        <div class="form-row"><label>Contraseña</label><input type="password" id="newPass" placeholder="Mínimo 6 caracteres"></div>
        <button class="btn btn-primary btn-block" id="btnDoCreate">Crear cuenta</button>`);
      Utils.qs('#btnDoCreate').addEventListener('click', () => {
        const pass = Utils.qs('#newPass').value;
        if (pass.length < 6) { Notify.error('La contraseña debe tener al menos 6 caracteres.'); return; }
        const res = AuthModule.register({ name: order.customer.name, email: order.customer.email, phone: order.customer.phone, password: pass });
        if (res.ok) {
          order.userId = res.user.userId; order.guestOrder = false; Store.upsertOrder(order);
          Ui.closeModal(); Notify.success('Cuenta creada. Este pedido ya está en tu historial.');
          location.hash = `#/account/orders/${order.orderId}`;
        } else Notify.error(res.error);
      });
    });
  }

  function showErrors(errors) {
    Utils.qsa('.field-error').forEach((e) => (e.textContent = ''));
    Utils.qsa('input.err, select.err').forEach((e) => e.classList.remove('err'));
    Object.entries(errors).forEach(([id, msg]) => {
      const el = Utils.qs('#' + id);
      if (el) el.textContent = msg;
      const inputId = '#f' + id.replace('err', '');
      const input = Utils.qs(inputId);
      if (input) input.classList.add('err');
    });
  }

  function start() { resetState(); render(); }

  return { start, render };
})();
