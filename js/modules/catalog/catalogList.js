/**
 * catalogList.js — filtros/orden/vista de catálogo (extraído de
 * js/products.js en la reorganización arquitectónica).
 *
 * applyFilters()/search() ya NO tienen implementación propia — se
 * llama a ProductService.applyFilters()/search() (la duplicación que
 * el propio productService.js señalaba en su comentario antes de esta
 * reorganización). Una sola implementación de filtrado/búsqueda en
 * todo el proyecto.
 */
const CatalogList = (() => {
  let filters = defaultFilters();

  function defaultFilters() {
    return {
      category: null, brands: [], priceMin: null, priceMax: null,
      colors: [], availability: false, discount: false, isNew: false,
      bestSeller: false, sort: 'recommended', q: '',
    };
  }

  function search(term) { return ProductService.search(Store.state.products, term); }
  function applyFilters(list, f) { return ProductService.applyFilters(list, f); }

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
  let unsubscribeProductsChanged = null;
  function renderCatalog(category, queryParams = {}) {
    if (unsubscribeProductsChanged) unsubscribeProductsChanged();
    unsubscribeProductsChanged = Store.on('products:changed', renderResults);

    filters = defaultFilters();
    filters.category = category || null;
    if (queryParams.filter === 'ofertas') filters.discount = true;
    if (queryParams.filter === 'nuevos') filters.isNew = true;
    if (queryParams.filter === 'bestsellers') filters.bestSeller = true;
    if (queryParams.q) filters.q = queryParams.q;

    const root = Utils.qs('#viewRoot');

    if (Store.state.catalogLoading) {
      root.innerHTML = `<div class="wrap state-block"><div class="ic">⏳</div><h3>Cargando catálogo…</h3></div>`;
      return;
    }
    if (Store.state.catalogError) {
      root.innerHTML = `<div class="wrap state-block"><div class="ic">⚠️</div><h3>No se pudo cargar el catálogo</h3><p>${Utils.escapeHtml(Store.state.catalogError)}</p></div>`;
      return;
    }

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
    const cat = Store.state.categories.find((c) => c.slug === category);
    return cat ? cat.name : 'Catálogo';
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
    const grid = Utils.qs('#catalogGrid');
    if (!grid) return; // la vista ya no está montada (navegación rápida)
    grid.innerHTML = Ui.productGrid(results, { emptyMsg: 'Prueba quitando algunos filtros.' });
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

  return { search, applyFilters, defaultFilters, renderCatalog };
})();
