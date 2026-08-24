/**
 * products.js — lógica de catálogo (filtros/orden/búsqueda) + vistas de
 * catálogo y detalle de producto.
 */
const ProductsModule = (() => {
  let filters = defaultFilters();
  let selectedVariant = { color: null, size: null };
  let galleryIndex = 0;

  function defaultFilters() {
    return {
      category: null, brands: [], priceMin: null, priceMax: null,
      colors: [], availability: false, discount: false, isNew: false,
      bestSeller: false, sort: 'recommended', q: '',
    };
  }

  // ---------- Búsqueda ----------
  function search(term) {
    const t = term.toLowerCase();
    return Store.state.products.filter((p) => p.active !== false && (
      p.name.toLowerCase().includes(t) ||
      p.brand.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.category.toLowerCase().includes(t) ||
      (p.tags || []).some((tg) => tg.toLowerCase().includes(t))
    ));
  }

  // ---------- Filtro + orden ----------
  function applyFilters(list, f) {
    let out = list.filter((p) => p.active !== false);
    if (f.category) out = out.filter((p) => p.category === f.category);
    if (f.brands.length) out = out.filter((p) => f.brands.includes(p.brand));
    if (f.priceMin != null) out = out.filter((p) => p.price >= f.priceMin);
    if (f.priceMax != null) out = out.filter((p) => p.price <= f.priceMax);
    if (f.colors.length) out = out.filter((p) => p.colors.some((c) => f.colors.includes(c.name)));
    if (f.availability) out = out.filter((p) => p.stock > 0);
    if (f.discount) out = out.filter((p) => p.discount > 0);
    if (f.isNew) out = out.filter((p) => p.new);
    if (f.bestSeller) out = out.filter((p) => p.bestSeller);
    if (f.q) {
      const t = f.q.toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(t) || p.brand.toLowerCase().includes(t));
    }
    switch (f.sort) {
      case 'newest': out = out.slice().sort((a, b) => b.createdAt - a.createdAt); break;
      case 'price_asc': out = out.slice().sort((a, b) => a.price - b.price); break;
      case 'price_desc': out = out.slice().sort((a, b) => b.price - a.price); break;
      case 'bestseller': out = out.slice().sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0) || b.reviewsCount - a.reviewsCount); break;
      default: out = out.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return out;
  }

  function availableBrands(category) {
    const src = category ? Store.state.products.filter((p) => p.category === category) : Store.state.products;
    return Array.from(new Set(src.map((p) => p.brand))).sort();
  }
  function availableColors(category) {
    const src = category ? Store.state.products.filter((p) => p.category === category) : Store.state.products;
    const map = new Map();
    src.forEach((p) => p.colors.forEach((c) => map.set(c.name, c.hex)));
    return Array.from(map.entries());
  }

  // ================= VISTA: CATÁLOGO =================
  function renderCatalog(category, queryParams = {}) {
    filters = defaultFilters();
    filters.category = category || null;
    if (queryParams.filter === 'ofertas') filters.discount = true;
    if (queryParams.filter === 'nuevos') filters.isNew = true;
    if (queryParams.filter === 'bestsellers') filters.bestSeller = true;
    if (queryParams.q) filters.q = queryParams.q;

    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap section">
        <div class="section-head">
          <h1 class="h-display section-title">${categoryTitle(category, queryParams)}</h1>
          <button class="btn btn-outline btn-sm filters-toggle-mobile" id="btnToggleFilters">Filtros</button>
        </div>
        <div class="catalog-layout">
          <aside class="filters-panel" id="filtersPanel"></aside>
          <div>
            <div class="catalog-toolbar">
              <span class="dim mono" id="resultCount" style="font-size:12.5px;"></span>
              <select class="select-native" id="sortSelect">
                <option value="recommended">Recomendados</option>
                <option value="newest">Más recientes</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
                <option value="bestseller">Más vendidos</option>
              </select>
            </div>
            <div class="chips-active" id="chipsActive"></div>
            <div id="catalogGrid"></div>
          </div>
        </div>
      </div>`;

    renderFiltersPanel();
    wireCatalogEvents();
    renderResults();
  }

  function categoryTitle(category, qp) {
    if (qp.filter === 'ofertas') return 'Ofertas';
    if (qp.filter === 'nuevos') return 'Nuevos';
    if (qp.filter === 'bestsellers') return 'Más vendidos';
    if (category === 'tenis') return 'Tenis';
    if (category === 'gorras') return 'Gorras';
    return 'Catálogo';
  }

  function renderFiltersPanel() {
    const brands = availableBrands(filters.category);
    const colors = availableColors(filters.category);
    const cats = Store.state.categories;
    Utils.qs('#filtersPanel').innerHTML = `
      <div class="filter-group">
        <h4>Categoría</h4>
        <div class="filter-list">
          <label class="filter-check"><input type="radio" name="cat" value="" ${!filters.category ? 'checked' : ''}> Todas</label>
          ${cats.map((c) => `<label class="filter-check"><input type="radio" name="cat" value="${c.slug}" ${filters.category === c.slug ? 'checked' : ''}> ${c.name}</label>`).join('')}
        </div>
      </div>
      <div class="filter-group">
        <h4>Marca</h4>
        <div class="filter-list">
          ${brands.map((b) => `<label class="filter-check"><input type="checkbox" value="${b}" data-f="brand" ${filters.brands.includes(b) ? 'checked' : ''}> ${b}</label>`).join('')}
        </div>
      </div>
      <div class="filter-group">
        <h4>Precio</h4>
        <div class="price-range">
          <input type="number" placeholder="Mín" id="priceMin" value="${filters.priceMin ?? ''}">
          <input type="number" placeholder="Máx" id="priceMax" value="${filters.priceMax ?? ''}">
        </div>
      </div>
      <div class="filter-group">
        <h4>Color</h4>
        <div class="swatch-row">
          ${colors.map(([name, hex]) => `<span class="swatch ${filters.colors.includes(name) ? 'selected' : ''}" data-color="${name}" style="background:${hex}" title="${name}"></span>`).join('')}
        </div>
      </div>
      <div class="filter-group" style="border-bottom:none;">
        <h4>Más filtros</h4>
        <div class="filter-list">
          <label class="filter-check"><input type="checkbox" id="fAvail" ${filters.availability ? 'checked' : ''}> Disponibilidad</label>
          <label class="filter-check"><input type="checkbox" id="fDiscount" ${filters.discount ? 'checked' : ''}> En oferta</label>
          <label class="filter-check"><input type="checkbox" id="fNew" ${filters.isNew ? 'checked' : ''}> Nuevos</label>
          <label class="filter-check"><input type="checkbox" id="fBest" ${filters.bestSeller ? 'checked' : ''}> Más vendidos</label>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" id="btnClearFilters">Limpiar filtros</button>
    `;
  }

  function wireCatalogEvents() {
    const panel = Utils.qs('#filtersPanel');
    panel.addEventListener('change', (e) => {
      if (e.target.name === 'cat') filters.category = e.target.value || null;
      if (e.target.dataset.f === 'brand') {
        const v = e.target.value;
        filters.brands = e.target.checked ? [...filters.brands, v] : filters.brands.filter((x) => x !== v);
      }
      if (e.target.id === 'fAvail') filters.availability = e.target.checked;
      if (e.target.id === 'fDiscount') filters.discount = e.target.checked;
      if (e.target.id === 'fNew') filters.isNew = e.target.checked;
      if (e.target.id === 'fBest') filters.bestSeller = e.target.checked;
      renderFiltersPanel(); wireCatalogEvents(); renderResults();
    });
    Utils.qs('#priceMin').addEventListener('change', (e) => { filters.priceMin = e.target.value ? +e.target.value : null; renderResults(); });
    Utils.qs('#priceMax').addEventListener('change', (e) => { filters.priceMax = e.target.value ? +e.target.value : null; renderResults(); });
    Utils.qsa('.swatch').forEach((s) => s.addEventListener('click', () => {
      const name = s.dataset.color;
      filters.colors = filters.colors.includes(name) ? filters.colors.filter((c) => c !== name) : [...filters.colors, name];
      renderFiltersPanel(); wireCatalogEvents(); renderResults();
    }));
    Utils.qs('#btnClearFilters').addEventListener('click', () => {
      const cat = filters.category; filters = defaultFilters(); filters.category = cat;
      renderFiltersPanel(); wireCatalogEvents(); renderResults();
    });
    Utils.qs('#sortSelect').addEventListener('change', (e) => { filters.sort = e.target.value; renderResults(); });
    const toggleBtn = Utils.qs('#btnToggleFilters');
    if (toggleBtn) toggleBtn.addEventListener('click', () => Utils.qs('#filtersPanel').classList.toggle('open'));
  }

  function renderResults() {
    const results = applyFilters(Store.state.products, filters);
    Utils.qs('#catalogGrid').innerHTML = Ui.productGrid(results, { emptyMsg: 'Prueba quitando algunos filtros.' });
    Utils.qs('#resultCount').textContent = `${results.length} producto${results.length === 1 ? '' : 's'}`;
    renderChips();
  }

  function renderChips() {
    const chips = [];
    filters.brands.forEach((b) => chips.push({ label: b, clear: () => { filters.brands = filters.brands.filter((x) => x !== b); } }));
    filters.colors.forEach((c) => chips.push({ label: c, clear: () => { filters.colors = filters.colors.filter((x) => x !== c); } }));
    if (filters.discount) chips.push({ label: 'En oferta', clear: () => { filters.discount = false; } });
    if (filters.isNew) chips.push({ label: 'Nuevos', clear: () => { filters.isNew = false; } });
    if (filters.bestSeller) chips.push({ label: 'Más vendidos', clear: () => { filters.bestSeller = false; } });
    if (filters.availability) chips.push({ label: 'Disponibles', clear: () => { filters.availability = false; } });
    const box = Utils.qs('#chipsActive');
    if (!chips.length) { box.innerHTML = ''; return; }
    box.innerHTML = chips.map((c, i) => `<span class="chip">${Utils.escapeHtml(c.label)} <button data-chip="${i}">✕</button></span>`).join('');
    Utils.qsa('[data-chip]').forEach((btn) => btn.addEventListener('click', () => {
      chips[+btn.dataset.chip].clear();
      renderFiltersPanel(); wireCatalogEvents(); renderResults();
    }));
  }

  // ================= VISTA: DETALLE DE PRODUCTO =================
  function renderProductDetail(productId) {
    const p = Store.getProductById(productId);
    const root = Utils.qs('#viewRoot');
    if (!p) { root.innerHTML = `<div class="wrap state-block"><h3>Producto no encontrado</h3><a class="btn btn-primary" href="#/shop">Ver catálogo</a></div>`; return; }

    selectedVariant = { color: p.colors[0].name, size: null };
    galleryIndex = 0;

    root.innerHTML = `
      <div class="wrap section">
        <div class="pd-layout">
          <div>
            <div class="pd-gallery-main"><img id="pdMainImg" src="${p.images[0]}" alt="${Utils.escapeHtml(p.name)}"></div>
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
              <div class="acc-item open"><div class="acc-head">Envíos <span>+</span></div><div class="acc-body" style="max-height:200px;">Envío estándar 3-5 días hábiles. Envío gratis en compras desde ${Utils.formatMoney(window.EFAAT_CONFIG.freeShippingThreshold)}. Envío exprés disponible en checkout (1-2 días hábiles).</div></div>
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

  return { search, applyFilters, defaultFilters, renderCatalog, renderProductDetail, openSizeGuide };
})();
