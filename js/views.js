/**
 * views.js — Home, autenticación y páginas de cuenta (perfil, direcciones,
 * favoritos). Las vistas de catálogo/producto viven en products.js,
 * carrito en cart.js, checkout en checkout.js y pedidos en orders.js.
 */
const Views = (() => {
  let dropTimerInterval = null;

  // ================= HOME =================
  function renderHome() {
    clearInterval(dropTimerInterval);
    const products = Store.state.products;
    const newArrivals = products.filter((p) => p.new).slice(0, 8);
    const bestSellers = products.filter((p) => p.bestSeller).slice(0, 8);
    const deals = products.filter((p) => p.discount > 0).slice(0, 8);
    const drop = Store.state.drops[0];
    const dropProducts = drop ? products.filter((p) => p.dropId === drop.id) : [];
    const tenisCat = Store.state.categories.find((c) => c.id === 'tenis');
    const gorrasCat = Store.state.categories.find((c) => c.id === 'gorras');
    const combo = CartModule.comboSuggestion();
    const heroProduct = products.find((p) => p.featured) || products[0];

    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <section class="hero">
        <div class="hero-bg">
          <img src="${heroProduct.images[0]}" alt="">
          <img src="${(products.find((p) => p.category === 'gorras') || products[1]).images[0]}" alt="">
        </div>
        <div class="hero-content">
          <span class="eyebrow">Colección actual</span>
          <h1 class="h-display hero-title">DEFINE<br>YOUR STYLE</h1>
          <p class="hero-sub">Tenis y gorras seleccionados para tu estilo. Piezas premium, streetwear, sin ruido.</p>
          <div class="hero-ctas">
            <a href="#/shop/tenis" class="btn btn-primary">Ver tenis</a>
            <a href="#/shop/gorras" class="btn btn-white">Ver gorras</a>
          </div>
        </div>
      </section>

      ${drop ? dropSection(drop, dropProducts) : ''}

      <section class="wrap section">
        <div class="section-head"><h2 class="h-display section-title">Nueva colección</h2><a href="#/shop?filter=nuevos" class="dim mono" style="font-size:12px;">Ver todos →</a></div>
        ${Ui.productGrid(newArrivals)}
      </section>

      <section class="wrap section">
        <div class="section-head"><h2 class="h-display section-title">Más vendidos</h2><a href="#/shop?filter=bestsellers" class="dim mono" style="font-size:12px;">Ver todos →</a></div>
        ${Ui.productGrid(bestSellers)}
      </section>

      <section class="wrap section">
        <div class="section-head"><h2 class="h-display section-title" style="color:var(--c-red);">Ofertas</h2><a href="#/shop?filter=ofertas" class="dim mono" style="font-size:12px;">Ver todas →</a></div>
        ${Ui.productGrid(deals)}
      </section>

      ${combo ? `
      <section class="wrap section">
        <div class="section-head"><h2 class="h-display section-title">Combina tu estilo</h2></div>
        <div class="combo-card">
          <div class="combo-imgs"><img src="${combo.tenis.images[0]}"><img src="${combo.gorra.images[0]}"></div>
          <div>
            <div style="font-weight:700;">${combo.tenis.name} + ${combo.gorra.name}</div>
            <div class="faint" style="font-size:12px;">Combo Street</div>
            <div style="margin-top:4px;"><span class="mono" style="text-decoration:line-through;color:var(--c-text-faint);font-size:12px;">${Utils.formatMoney(combo.individual)}</span>
            <span class="mono" style="font-weight:700;margin-left:6px;">${Utils.formatMoney(combo.comboPrice)}</span></div>
            <div class="combo-save">Ahorras ${Utils.formatMoney(combo.save)}</div>
          </div>
          <a href="#/cart" class="btn btn-primary btn-sm" id="btnHomeCombo">Agregar combo</a>
        </div>
      </section>` : ''}

      <section class="wrap section">
        <div class="section-head"><h2 class="h-display section-title">Categorías</h2></div>
        <div class="cat-tiles">
          <a class="cat-tile" href="#/shop/tenis"><img src="${tenisCat.image}" alt=""><span class="cat-tile-label h-display">TENIS</span><span class="cat-tile-cta">EXPLORAR →</span></a>
          <a class="cat-tile" href="#/shop/gorras"><img src="${gorrasCat.image}" alt=""><span class="cat-tile-label h-display">GORRAS</span><span class="cat-tile-cta">EXPLORAR →</span></a>
        </div>
      </section>

      <section class="wrap section" style="padding-bottom:0;">
        <div class="benefits">
          <div class="benefit"><div class="ic">🚚</div><h4>Envíos</h4><p>A todo Colombia, gratis desde ${Utils.formatMoney(window.EFAAT_CONFIG.freeShippingThreshold)}</p></div>
          <div class="benefit"><div class="ic">🔒</div><h4>Compra segura</h4><p>Checkout protegido</p></div>
          <div class="benefit"><div class="ic">↩️</div><h4>Cambios fáciles</h4><p>15 días para cambios</p></div>
          <div class="benefit"><div class="ic">💬</div><h4>Soporte</h4><p>Te acompañamos siempre</p></div>
        </div>
      </section>
    `;

    if (drop) startDropTimer(drop);
    const comboBtn = Utils.qs('#btnHomeCombo');
    if (comboBtn) comboBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const availT = combo.tenis.variants.find((v) => v.stock > 0);
      const availG = combo.gorra.variants.find((v) => v.stock > 0);
      if (availT) CartModule.addItem(combo.tenis.id, availT.variantId, 1);
      if (availG) CartModule.addItem(combo.gorra.id, availG.variantId, 1);
      Ui.openCartDrawer();
    });
  }

  function dropSection(drop, dropProducts) {
    return `
    <section class="wrap section">
      <div class="drop-banner">
        <img src="${dropProducts[0] ? dropProducts[0].images[0] : ''}" alt="">
        <div class="drop-inner">
          <div>
            <span class="eyebrow">Edición limitada</span>
            <h2 class="h-display" style="font-size:clamp(28px,4vw,44px);">${drop.name}</h2>
            <p class="dim" style="margin-top:6px;max-width:420px;">${drop.description}</p>
          </div>
          <div class="drop-timer" id="dropTimer"></div>
        </div>
      </div>
      <div style="margin-top:18px;">${Ui.productGrid(dropProducts)}</div>
    </section>`;
  }

  function startDropTimer(drop) {
    const el = Utils.qs('#dropTimer');
    function tick() {
      if (!el) { clearInterval(dropTimerInterval); return; }
      const t = Utils.timeLeftParts(drop.endDate);
      if (t.ended) { el.innerHTML = `<div class="t-box"><b>Finalizado</b></div>`; clearInterval(dropTimerInterval); return; }
      el.innerHTML = ['d', 'h', 'm', 's'].map((u) => `<div class="t-box"><b>${String(t[u]).padStart(2, '0')}</b><span>${{ d: 'días', h: 'hrs', m: 'min', s: 'seg' }[u]}</span></div>`).join('');
    }
    tick();
    dropTimerInterval = setInterval(tick, 1000);
  }

  // ================= AUTH =================
  function renderLogin() {
    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap auth-box">
        <h2 class="h-display">Iniciar sesión</h2>
        <p class="sub">Accede a tus pedidos, favoritos y direcciones guardadas.</p>
        <div class="form-row"><label>Correo</label><input id="lEmail" type="email"></div>
        <div class="form-row"><label>Contraseña</label><input id="lPass" type="password"></div>
        <button class="btn btn-primary btn-block" id="btnLogin">Entrar</button>
        <div class="auth-switch">¿No tienes cuenta? <a href="#/register">Crear cuenta</a></div>
        <div class="auth-switch"><a href="#/checkout" style="color:var(--c-text-dim);">Continuar como invitado →</a></div>
        <div class="auth-demo-hint">DEMO — Cliente: cliente@demo.com / 123456<br>DEMO — Admin: admin@demo.com / admin123</div>
      </div>`;
    Utils.qs('#btnLogin').addEventListener('click', () => {
      const res = AuthModule.login(Utils.qs('#lEmail').value.trim(), Utils.qs('#lPass').value);
      if (res.ok) { Notify.success(`Hola, ${res.user.name.split(' ')[0]}.`); location.hash = res.user.role === 'admin' ? '#/admin' : '#/account'; }
      else Notify.error(res.error);
    });
  }

  function renderRegister() {
    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap auth-box">
        <h2 class="h-display">Crear cuenta</h2>
        <p class="sub">Guarda tus direcciones y revisa tus pedidos cuando quieras.</p>
        <div class="form-row"><label>Nombre completo</label><input id="rName"></div>
        <div class="form-row"><label>Correo</label><input id="rEmail" type="email"></div>
        <div class="form-row"><label>Teléfono</label><input id="rPhone"></div>
        <div class="form-row"><label>Contraseña</label><input id="rPass" type="password"></div>
        <button class="btn btn-primary btn-block" id="btnRegister">Crear cuenta</button>
        <div class="auth-switch">¿Ya tienes cuenta? <a href="#/login">Iniciar sesión</a></div>
      </div>`;
    Utils.qs('#btnRegister').addEventListener('click', () => {
      const name = Utils.qs('#rName').value.trim();
      const email = Utils.qs('#rEmail').value.trim();
      const phone = Utils.qs('#rPhone').value.trim();
      const pass = Utils.qs('#rPass').value;
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || pass.length < 6) { Notify.error('Revisa los datos: correo válido y contraseña de mínimo 6 caracteres.'); return; }
      const res = AuthModule.register({ name, email, phone, password: pass });
      if (res.ok) { Notify.success('Cuenta creada.'); location.hash = '#/account'; }
      else Notify.error(res.error);
    });
  }

  // ================= ACCOUNT =================
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
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); AuthModule.logout(); });
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

  function renderAddresses() {
    const root = Utils.qs('#viewRoot');
    if (!requireAuthOrPrompt(root)) return;
    const addrs = Store.state.currentUser.addresses || [];
    root.innerHTML = `
      <div class="wrap section">
        <h1 class="h-display section-title" style="margin-bottom:20px;">Mis direcciones</h1>
        <div class="account-layout">
          ${accountNav('/account/addresses')}
          <div>
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
            </div>
          </div>
        </div>
      </div>`;
    wireLogout(root);
    Utils.qs('#btnAddAddr').addEventListener('click', () => openAddressModal());
    Utils.qsa('[data-edit-addr]').forEach((b) => b.addEventListener('click', () => openAddressModal(addrs.find((a) => a.id === b.dataset.editAddr))));
    Utils.qsa('[data-default-addr]').forEach((b) => b.addEventListener('click', () => { AuthModule.setDefaultAddress(b.dataset.defaultAddr); renderAddresses(); }));
    Utils.qsa('[data-del-addr]').forEach((b) => b.addEventListener('click', () => { AuthModule.deleteAddress(b.dataset.delAddr); Notify.info('Dirección eliminada.'); renderAddresses(); }));
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
    Utils.qs('#btnSaveAddr').addEventListener('click', () => {
      const payload = {
        id: addr ? addr.id : null, name: Utils.qs('#aName').value.trim() || 'Dirección',
        recipient: Utils.qs('#aRecipient').value.trim(), phone: Utils.qs('#aPhone').value.trim(),
        department: Utils.qs('#aDept').value.trim(), city: Utils.qs('#aCity').value.trim(),
        address: Utils.qs('#aAddr').value.trim(), reference: Utils.qs('#aRef').value.trim(),
        isDefault: a.isDefault,
      };
      if (!payload.recipient || !payload.address || !payload.city) { Notify.error('Completa los campos requeridos.'); return; }
      AuthModule.saveAddress(payload);
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
    Utils.qs('#btnSaveProfile').addEventListener('click', () => {
      AuthModule.updateProfile({ name: Utils.qs('#sName').value.trim(), phone: Utils.qs('#sPhone').value.trim() });
      Notify.success('Perfil actualizado.');
    });
  }

  // ================= FAVORITOS =================
  function renderFavorites() {
    const root = Utils.qs('#viewRoot');
    const favIds = Store.state.favorites;
    const products = Store.state.products.filter((p) => favIds.includes(p.id));
    root.innerHTML = `
      <div class="wrap section">
        <h1 class="h-display section-title" style="margin-bottom:20px;">Mis favoritos</h1>
        ${products.length ? Ui.productGrid(products) : `<div class="state-block"><div class="ic">🤍</div><h3>Aún no tienes favoritos.</h3><p>Toca el corazón en cualquier producto para guardarlo aquí.</p><a class="btn btn-primary" href="#/shop">Explorar productos</a></div>`}
      </div>`;
  }

  return { renderHome, renderLogin, renderRegister, renderAccountHome, renderAddresses, renderSettings, renderFavorites };
})();
