/**
 * productDetail.js — página de detalle de producto (PDP), extraído de
 * js/products.js en la reorganización arquitectónica.
 */
const ProductDetail = (() => {
  let selectedVariant = { color: null, size: null };
  let galleryIndex = 0;

  function renderProductDetail(productId) {
    const root = Utils.qs('#viewRoot');

    if (Store.state.catalogLoading) {
      root.innerHTML = `<div class="wrap state-block"><div class="ic">⏳</div><h3>Cargando producto…</h3></div>`;
      return;
    }

    const p = Store.getProductById(productId);
    if (!p) {
      root.innerHTML = `<div class="wrap state-block"><h3>Producto no encontrado</h3><a class="btn btn-primary" href="#/shop">Ver catálogo</a></div>`;
      return;
    }

    selectedVariant = { color: p.colors[0].name, size: null };
    galleryIndex = 0;

    root.innerHTML = `
      <div class="wrap section">
        <div class="pd-layout">
          <div>
            <div class="pd-gallery-main"><img id="pdMainImg" src="${p.images[0] || ''}" alt="${Utils.escapeHtml(p.name)}"></div>
            <div class="pd-thumbs">${p.images.map((img, i) => `<div class="pd-thumb ${i === 0 ? 'active' : ''}" data-thumb="${i}"><img src="${img}"></div>`).join('')}</div>
          </div>
          <div>
            <span class="pd-brand">${Utils.escapeHtml(p.brand)}</span>
            <h1 class="h-display pd-name">${Utils.escapeHtml(p.name)}</h1>
            <div class="pd-rating-row">${Utils.starsHtml(p.rating)} <span class="dim">${p.rating.toFixed(1)} · ${p.reviewsCount} reseñas</span></div>
            <div class="pd-price-row">
              <span class="pd-price">${Utils.formatMoney(p.price)}</span>
              ${p.comparePrice ? `<span class="pd-price-old">${Utils.formatMoney(p.comparePrice)}</span><span class="badge badge-red">-${p.discount}%</span>` : ''}
            </div>
            <p class="pd-desc">${Utils.escapeHtml(p.description)}</p>

            <div class="option-block">
              <h5>Color: <span id="colorLabel">${selectedVariant.color}</span></h5>
              <div class="color-opt-row" id="colorRow">
                ${p.colors.map((c) => `<div class="color-opt ${c.name === selectedVariant.color ? 'selected' : ''}" data-color="${c.name}">
                  <button class="color-swatch-btn" style="background:${c.hex}"></button><span>${c.name}</span></div>`).join('')}
              </div>
            </div>

            <div class="option-block">
              <h5 class="${p.category === 'tenis' ? 'h5-flex' : ''}">${p.category === 'tenis' ? 'Talla' : 'Tipo'}
                ${p.category === 'tenis' ? `<button id="btnSizeGuide">Guía de tallas</button>` : ''}
              </h5>
              <div class="size-grid" id="sizeGrid"></div>
              <div class="stock-hint" id="stockHint"></div>
            </div>

            <div class="option-block">
              <h5>Cantidad</h5>
              <div class="qty-selector" id="qtySelector">
                <button data-qty="dec">−</button><span id="qtyVal">1</span><button data-qty="inc">+</button>
              </div>
            </div>

            <div class="pd-actions">
              <button class="btn btn-outline" id="btnAddCart">Agregar al carrito</button>
              <button class="btn btn-primary" id="btnBuyNow">Comprar ahora</button>
              <button class="btn btn-ghost btn-icon p-fav ${AuthModule.isFavorite(p.id) ? 'active' : ''}" data-fav-toggle="${p.id}" style="position:static;">${Ui.ICONS.heart}</button>
            </div>

            <div class="pd-info-accordion">
              <div class="acc-item open"><div class="acc-head">Envíos <span>+</span></div><div class="acc-body" style="max-height:200px;">Envío estándar 3-5 días hábiles.${Store.state.shippingConfig ? ` Envío gratis en compras desde ${Utils.formatMoney(Store.state.shippingConfig.freeShippingThreshold)}.` : ''} Envío exprés disponible en checkout (1-2 días hábiles).</div></div>
              <div class="acc-item"><div class="acc-head">Cambios y devoluciones <span>+</span></div><div class="acc-body">Tienes 15 días calendario para solicitar un cambio o devolución, siempre que el producto esté sin uso y con su empaque original.</div></div>
              <div class="acc-item"><div class="acc-head">SKU y detalles <span>+</span></div><div class="acc-body">SKU base: ${p.sku} · Categoría: ${p.category === 'tenis' ? 'Tenis' : 'Gorras'} · Marca: ${p.brand}</div></div>
            </div>
          </div>
        </div>

        <div class="section related-strip">
          <div class="section-head"><h2 class="h-display section-title" style="font-size:26px;">También te puede interesar</h2></div>
          <div id="relatedGrid"></div>
        </div>

        <div class="section" id="reviewsSection"></div>
      </div>`;

    renderSizeGrid(p);
    renderRelated(p);
    renderReviews(p);
    wireProductDetailEvents(p);
  }

  function renderSizeGrid(p) {
    const sizesForColor = p.variants.filter((v) => v.color === selectedVariant.color);
    Utils.qs('#sizeGrid').innerHTML = sizesForColor.map((v) => `
      <button class="size-opt ${v.stock <= 0 ? 'disabled' : ''} ${selectedVariant.size === v.size ? 'selected' : ''}"
        data-size="${Utils.escapeHtml(String(v.size))}" ${v.stock <= 0 ? 'disabled title="Agotado"' : ''}>
        ${v.size}
      </button>`).join('');
    updateStockHint(p);
  }

  function currentVariant(p) {
    return p.variants.find((v) => v.color === selectedVariant.color && v.size === selectedVariant.size) || null;
  }

  function updateStockHint(p) {
    const hint = Utils.qs('#stockHint');
    const v = currentVariant(p);
    if (!v) { hint.textContent = p.category === 'tenis' ? 'Selecciona una talla.' : 'Selecciona un tipo.'; hint.className = 'stock-hint'; return; }
    if (v.stock <= 0) { hint.textContent = 'Agotado en esta variante.'; hint.className = 'stock-hint low'; }
    else if (v.stock <= 3) { hint.textContent = `¡Solo queda${v.stock === 1 ? '' : 'n'} ${v.stock} unidad${v.stock === 1 ? '' : 'es'}!`; hint.className = 'stock-hint low'; }
    else { hint.textContent = `${v.stock} unidades disponibles.`; hint.className = 'stock-hint ok'; }
  }

  function renderRelated(p) {
    const related = Store.state.products.filter((x) => x.id !== p.id && x.active !== false &&
      (x.category === p.category || x.brand === p.brand)).slice(0, 6);
    Utils.qs('#relatedGrid').innerHTML = Ui.productGrid(related);
  }

  function renderReviews(p) {
    const reviews = Storage.getReviews().filter((r) => r.productId === p.id);
    const box = Utils.qs('#reviewsSection');
    box.innerHTML = `
      <div class="section-head"><h2 class="h-display section-title" style="font-size:26px;">Reseñas (${reviews.length})</h2></div>
      ${reviews.length ? reviews.map((r) => `
        <div class="review-card">
          <div class="review-head"><strong>${Utils.escapeHtml(r.user)}</strong><span class="faint mono" style="font-size:11px;">${Utils.formatDate(r.date)}</span></div>
          ${Utils.starsHtml(r.rating)}
          <p class="dim" style="margin-top:6px;font-size:13.5px;">${Utils.escapeHtml(r.comment)}</p>
        </div>`).join('') : `<p class="dim">Este producto aún no tiene reseñas.</p>`}
    `;
  }

  function wireProductDetailEvents(p) {
    let qty = 1;
    Utils.qsa('.pd-thumb').forEach((t) => t.addEventListener('click', () => {
      galleryIndex = +t.dataset.thumb;
      Utils.qs('#pdMainImg').src = p.images[galleryIndex];
      Utils.qsa('.pd-thumb').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
    }));
    Utils.qsa('#colorRow .color-opt').forEach((el) => el.addEventListener('click', () => {
      selectedVariant.color = el.dataset.color;
      selectedVariant.size = null;
      Utils.qs('#colorLabel').textContent = selectedVariant.color;
      Utils.qsa('#colorRow .color-opt').forEach((x) => x.classList.toggle('selected', x.dataset.color === selectedVariant.color));
      renderSizeGrid(p);
    }));
    Utils.qs('#sizeGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('.size-opt');
      if (!btn || btn.disabled) return;
      selectedVariant.size = isNaN(+btn.dataset.size) ? btn.dataset.size : +btn.dataset.size;
      renderSizeGrid(p);
    });
    Utils.qs('#qtySelector').addEventListener('click', (e) => {
      const v = currentVariant(p);
      const max = v ? v.stock : 10;
      if (e.target.dataset.qty === 'inc') qty = Utils.clamp(qty + 1, 1, Math.max(1, max));
      if (e.target.dataset.qty === 'dec') qty = Utils.clamp(qty - 1, 1, Math.max(1, max));
      Utils.qs('#qtyVal').textContent = qty;
    });
    const doAdd = () => {
      const v = currentVariant(p);
      if (!v) { Notify.error(p.category === 'tenis' ? 'Selecciona una talla.' : 'Selecciona un tipo.'); return false; }
      if (v.stock <= 0) { Notify.error('Esta variante está agotada.'); return false; }
      CartModule.addItem(p.id, v.variantId, qty);
      return true;
    };
    Utils.qs('#btnAddCart').addEventListener('click', () => { if (doAdd()) Ui.openCartDrawer(); });
    Utils.qs('#btnBuyNow').addEventListener('click', () => { if (doAdd()) location.hash = '#/checkout'; });

    Utils.qsa('.acc-head').forEach((h) => h.addEventListener('click', () => {
      const item = h.closest('.acc-item');
      const body = item.querySelector('.acc-body');
      const willOpen = !item.classList.contains('open');
      item.classList.toggle('open');
      body.style.maxHeight = willOpen ? body.scrollHeight + 'px' : '0';
    }));

    const guideBtn = Utils.qs('#btnSizeGuide');
    if (guideBtn) guideBtn.addEventListener('click', openSizeGuide);
  }

  function openSizeGuide() {
    const rows = window.EFAAT_CONFIG.sizeGuide.tenis;
    Ui.openModal(`
      <div class="modal-head"><h3>Guía de tallas — Tenis</h3><button class="icon-btn" onclick="Ui.closeModal()">${Ui.ICONS.close}</button></div>
      <table class="size-table">
        <thead><tr><th>EU</th><th>US</th><th>CM</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${r.eu}</td><td>${r.us}</td><td>${r.cm} cm</td></tr>`).join('')}</tbody>
      </table>
      <p class="dim" style="margin-top:14px;font-size:12.5px;">Mide tu pie descalzo desde el talón hasta el dedo más largo y compara con la columna CM.</p>
    `);
  }

  return { renderProductDetail, openSizeGuide };
})();
