/**
 * home.js — vista de inicio (extraído de js/views.js en la
 * reorganización arquitectónica). Depende 100% de Store.state.products/
 * categories/drops, poblados por CatalogOrchestrator desde Supabase —
 * sin fuente local. Mientras carga o si falla, muestra un estado
 * real (nunca datos inventados).
 */
const HomeView = (() => {
  let dropTimerInterval = null;

  function renderHome() {
    clearInterval(dropTimerInterval);
    const root = Utils.qs('#viewRoot');

    if (Store.state.catalogLoading) {
      root.innerHTML = `<div class="wrap state-block"><div class="ic">⏳</div><h3>Cargando catálogo…</h3><p>Estamos trayendo los productos desde la tienda.</p></div>`;
      return;
    }
    if (Store.state.catalogError || !Store.state.products.length) {
      root.innerHTML = `<div class="wrap state-block"><div class="ic">⚠️</div><h3>No se pudo cargar el catálogo</h3><p>${Store.state.catalogError ? Utils.escapeHtml(Store.state.catalogError) : 'Todavía no hay productos publicados.'}</p></div>`;
      return;
    }

    const products = Store.state.products;
    const newArrivals = products.filter((p) => p.new).slice(0, 8);
    const bestSellers = products.filter((p) => p.bestSeller).slice(0, 8);
    const deals = products.filter((p) => p.discount > 0).slice(0, 8);
    const drop = Store.state.drops[0];
    const dropProducts = drop ? products.filter((p) => p.dropId === drop.id) : [];
    const tenisCat = Store.state.categories.find((c) => c.slug === 'tenis');
    const gorrasCat = Store.state.categories.find((c) => c.slug === 'gorras');
    const combo = CartModule.comboSuggestion();
    const heroProduct = products.find((p) => p.featured) || products[0];
    const secondHero = products.find((p) => p.category === 'gorras') || products[1] || heroProduct;

    root.innerHTML = `
      <section class="hero">
        <div class="hero-bg">
          <img src="${heroProduct.images[0] || ''}" alt="">
          <img src="${secondHero.images[0] || ''}" alt="">
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
          ${tenisCat ? `<a class="cat-tile" href="#/shop/tenis"><img src="${tenisCat.image || ''}" alt=""><span class="cat-tile-label h-display">TENIS</span><span class="cat-tile-cta">EXPLORAR →</span></a>` : ''}
          ${gorrasCat ? `<a class="cat-tile" href="#/shop/gorras"><img src="${gorrasCat.image || ''}" alt=""><span class="cat-tile-label h-display">GORRAS</span><span class="cat-tile-cta">EXPLORAR →</span></a>` : ''}
        </div>
      </section>

      <section class="wrap section" style="padding-bottom:0;">
        <div class="benefits">
          <div class="benefit"><div class="ic">🚚</div><h4>Envíos</h4><p>${Store.state.shippingConfig ? `A todo Colombia, gratis desde ${Utils.formatMoney(Store.state.shippingConfig.freeShippingThreshold)}` : 'A todo Colombia'}</p></div>
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

  return { renderHome };
})();
