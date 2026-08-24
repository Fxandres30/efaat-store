/**
 * ui.js — construcción de la interfaz persistente (header/footer/drawers/modal)
 * y de piezas reutilizables como la tarjeta de producto.
 */
const Ui = (() => {
  const ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  };

  function mountShell() {
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="loader-bar" id="loaderBar" style="width:0"></div>
      <header class="site-header" id="siteHeader"></header>
      <div class="drawer-backdrop" id="drawerBackdrop"></div>
      <nav class="mobile-drawer" id="mobileDrawer"></nav>
      <div class="search-overlay" id="searchOverlay"></div>
      <div class="cart-drawer-backdrop" id="cartBackdrop"></div>
      <aside class="cart-drawer" id="cartDrawer"></aside>
      <div class="modal-backdrop" id="modalBackdrop"><div class="modal-box" id="modalBox"></div></div>
    `);
    document.body.insertAdjacentHTML('beforeend', `<main id="viewRoot" class="page-fade"></main><footer id="siteFooter"></footer>`);
    renderHeader();
    renderFooter();
    wireGlobalEvents();
  }

  function renderHeader() {
    const el = Utils.qs('#siteHeader');
    el.innerHTML = `
      <div class="wrap">
        <a href="#/" class="logo">EFAAT<span>.</span></a>
        <nav class="main-nav" id="mainNav">
          <a href="#/" data-route="/">Inicio</a>
          <a href="#/shop/tenis" data-route="/shop/tenis">Tenis</a>
          <a href="#/shop/gorras" data-route="/shop/gorras">Gorras</a>
          <a href="#/shop?filter=ofertas" data-route="ofertas">Ofertas</a>
          <a href="#/shop?filter=nuevos" data-route="nuevos">Nuevos</a>
        </nav>
        <div class="header-actions">
          <button class="icon-btn" id="btnSearch" aria-label="Buscar">${ICONS.search}</button>
          <a href="#/favorites" class="icon-btn" aria-label="Favoritos">${ICONS.heart}<span class="count-bubble" id="favCount" hidden>0</span></a>
          <button class="icon-btn" id="btnCart" aria-label="Carrito">${ICONS.bag}<span class="count-bubble" id="cartCount" hidden>0</span></button>
          <a href="#/account" class="icon-btn" id="btnAccount" aria-label="Cuenta">${ICONS.user}</a>
          <span class="account-label" id="accountLabel"></span>
          <button class="icon-btn hamburger" id="btnHamburger" aria-label="Menú">${ICONS.menu}</button>
        </div>
      </div>`;
    updateHeaderState();
  }

  function updateHeaderState() {
    const cartCount = Store.state.cart.reduce((s, i) => s + i.qty, 0);
    const favCount = Store.state.favorites.length;
    const cartBubble = Utils.qs('#cartCount'); const favBubble = Utils.qs('#favCount');
    if (cartBubble) { cartBubble.textContent = cartCount; cartBubble.hidden = cartCount === 0; }
    if (favBubble) { favBubble.textContent = favCount; favBubble.hidden = favCount === 0; }
    const label = Utils.qs('#accountLabel');
    if (label) label.textContent = Store.state.currentUser ? `Hola, ${Store.state.currentUser.name.split(' ')[0]}` : 'Entrar';
    const route = (location.hash.replace('#', '') || '/').split('?')[0];
    Utils.qsa('.main-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${route}` || (route.startsWith('/shop') && a.dataset.route === route)));
  }

  function renderFooter() {
    const el = Utils.qs('#siteFooter');
    el.innerHTML = `
      <div class="wrap">
        <div class="footer-grid">
          <div class="footer-col">
            <div class="logo" style="margin-bottom:12px;">EFAAT<span>.</span></div>
            <p class="dim" style="font-size:13px;max-width:280px;">Tenis y gorras seleccionados para tu estilo. Streetwear premium, entrega en toda Colombia.</p>
          </div>
          <div class="footer-col"><h5>Tienda</h5>
            <a href="#/shop/tenis">Tenis</a><a href="#/shop/gorras">Gorras</a>
            <a href="#/shop?filter=ofertas">Ofertas</a><a href="#/shop?filter=nuevos">Nuevos</a>
          </div>
          <div class="footer-col"><h5>Cuenta</h5>
            <a href="#/account">Mi cuenta</a><a href="#/account/orders">Mis pedidos</a>
            <a href="#/favorites">Favoritos</a><a href="#/track">Seguimiento</a>
          </div>
          <div class="footer-col"><h5>Ayuda</h5>
            <a href="#/">Envíos</a><a href="#/">Cambios y devoluciones</a>
            <a href="#/">Guía de tallas</a><a href="#/">Contacto</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} EFAAT Store. Proyecto demo — sin transacciones reales.</span>
          <span>Hecho con HTML · CSS · JS vanilla</span>
        </div>
      </div>`;
  }

  // ---------- Product card ----------
  function badgesHtml(p) {
    const b = [];
    if (p.onDrop) b.push('<span class="badge badge-white">DROP</span>');
    if (p.new) b.push('<span class="badge badge-red">NUEVO</span>');
    if (p.bestSeller) b.push('<span class="badge badge-outline">BEST SELLER</span>');
    if (p.discount > 0) b.push(`<span class="badge badge-red">-${p.discount}%</span>`);
    return b.join('');
  }

  function productCard(p) {
    const isFav = Store.state.favorites.includes(p.id);
    const outOfStock = p.stock <= 0;
    return `
    <div class="p-card card" data-product-id="${p.id}">
      <div class="p-media">
        <a href="#/product/${p.id}">
          <img src="${p.images[0]}" alt="${Utils.escapeHtml(p.name)}" loading="lazy">
        </a>
        <div class="p-badges">${badgesHtml(p)}</div>
        <button class="p-fav ${isFav ? 'active' : ''}" data-fav-toggle="${p.id}" aria-label="Favorito">${ICONS.heart}</button>
        ${outOfStock ? `<div class="p-stockout"><span>Agotado</span></div>` : ''}
        <div class="p-quick"><button class="btn btn-white btn-block btn-sm" data-quick-add="${p.id}">Vista rápida</button></div>
      </div>
      <a href="#/product/${p.id}" class="p-body">
        <span class="p-brand">${Utils.escapeHtml(p.brand)}</span>
        <span class="p-name">${Utils.escapeHtml(p.name)}</span>
        <span class="p-rating">${Utils.starsHtml(p.rating)} <span class="faint">(${p.reviewsCount})</span></span>
        <span class="p-price-row">
          <span class="p-price mono">${Utils.formatMoney(p.price)}</span>
          ${p.comparePrice ? `<span class="p-price-old mono">${Utils.formatMoney(p.comparePrice)}</span>` : ''}
        </span>
      </a>
    </div>`;
  }

  function productGrid(products, opts = {}) {
    if (!products.length) {
      return `<div class="state-block"><div class="ic">🔎</div><h3>Sin resultados</h3><p>${opts.emptyMsg || 'No encontramos productos con esos filtros.'}</p></div>`;
    }
    return `<div class="grid-products">${products.map(productCard).join('')}</div>`;
  }

  // ---------- Modal ----------
  function openModal(html) {
    Utils.qs('#modalBox').innerHTML = html;
    Utils.qs('#modalBackdrop').classList.add('open');
  }
  function closeModal() { Utils.qs('#modalBackdrop').classList.remove('open'); }

  // ---------- Cart drawer ----------
  function openCartDrawer() {
    Utils.qs('#cartDrawer').classList.add('open');
    Utils.qs('#cartBackdrop').classList.add('open');
    CartModule.renderDrawer();
  }
  function closeCartDrawer() {
    Utils.qs('#cartDrawer').classList.remove('open');
    Utils.qs('#cartBackdrop').classList.remove('open');
  }

  // ---------- Mobile drawer ----------
  function openMobileDrawer() {
    Utils.qs('#mobileDrawer').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span class="logo">EFAAT<span>.</span></span>
        <button class="icon-btn" id="btnCloseMobile">${ICONS.close}</button>
      </div>
      <a href="#/">Inicio</a>
      <a href="#/shop/tenis">Tenis</a>
      <a href="#/shop/gorras">Gorras</a>
      <a href="#/shop?filter=ofertas">Ofertas</a>
      <a href="#/shop?filter=nuevos">Nuevos</a>
      <a href="#/favorites">Favoritos</a>
      <a href="#/account/orders">Mis pedidos</a>
      <a href="#/account">${Store.state.currentUser ? 'Mi cuenta' : 'Entrar'}</a>
    `;
    Utils.qs('#mobileDrawer').classList.add('open');
    Utils.qs('#drawerBackdrop').classList.add('open');
    Utils.qs('#btnCloseMobile').addEventListener('click', closeMobileDrawer);
    Utils.qsa('#mobileDrawer a').forEach((a) => a.addEventListener('click', closeMobileDrawer));
  }
  function closeMobileDrawer() {
    Utils.qs('#mobileDrawer').classList.remove('open');
    Utils.qs('#drawerBackdrop').classList.remove('open');
  }

  // ---------- Search overlay ----------
  function openSearch() {
    const overlay = Utils.qs('#searchOverlay');
    overlay.innerHTML = `
      <button class="icon-btn search-close" id="btnCloseSearch">${ICONS.close}</button>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Buscar tenis, gorras, marcas..." autocomplete="off">
        <div class="search-hint">Busca por nombre, marca, categoría o SKU</div>
        <div class="search-results" id="searchResults"></div>
      </div>`;
    overlay.classList.add('open');
    const input = Utils.qs('#searchInput');
    setTimeout(() => input.focus(), 50);
    Utils.qs('#btnCloseSearch').addEventListener('click', closeSearch);
    input.addEventListener('input', Utils.debounce(() => runSearch(input.value), 150));
  }
  function closeSearch() { Utils.qs('#searchOverlay').classList.remove('open'); }
  function runSearch(term) {
    const box = Utils.qs('#searchResults');
    if (!term.trim()) { box.innerHTML = ''; return; }
    const results = ProductsModule.search(term).slice(0, 8);
    if (!results.length) { box.innerHTML = `<p class="search-hint">Sin resultados para "${Utils.escapeHtml(term)}"</p>`; return; }
    box.innerHTML = results.map((p) => `
      <a class="search-result-row" href="#/product/${p.id}">
        <img src="${p.images[0]}" alt="">
        <div><div style="font-weight:600;font-size:13.5px;">${Utils.escapeHtml(p.name)}</div>
        <div class="faint" style="font-size:11.5px;">${Utils.escapeHtml(p.brand)} · ${Utils.formatMoney(p.price)}</div></div>
      </a>`).join('');
  }

  function wireGlobalEvents() {
    document.body.addEventListener('click', (e) => {
      if (e.target.closest('#btnSearch')) openSearch();
      if (e.target.closest('#btnCart')) { e.preventDefault(); openCartDrawer(); }
      if (e.target.closest('#btnHamburger')) openMobileDrawer();
      if (e.target.closest('#drawerBackdrop')) closeMobileDrawer();
      if (e.target.closest('#cartBackdrop')) closeCartDrawer();
      if (e.target.closest('#modalBackdrop') && e.target.id === 'modalBackdrop') closeModal();
      if (e.target.closest('#searchOverlay') && e.target.id === 'searchOverlay') closeSearch();

      const favBtn = e.target.closest('[data-fav-toggle]');
      if (favBtn) {
        e.preventDefault();
        AuthModule.toggleFavorite(favBtn.dataset.favToggle);
      }
      const quickAdd = e.target.closest('[data-quick-add]');
      if (quickAdd) { e.preventDefault(); location.hash = `#/product/${quickAdd.dataset.quickAdd}`; }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); closeSearch(); closeCartDrawer(); closeMobileDrawer(); }
    });
    Store.on('cart:changed', updateHeaderState);
    Store.on('favorites:changed', updateHeaderState);
    Store.on('auth:changed', updateHeaderState);
  }

  function loaderStart() { const b = Utils.qs('#loaderBar'); b.style.width = '30%'; }
  function loaderDone() { const b = Utils.qs('#loaderBar'); b.style.width = '100%'; setTimeout(() => { b.style.width = '0'; }, 250); }

  return {
    ICONS, mountShell, renderHeader, updateHeaderState, renderFooter,
    badgesHtml, productCard, productGrid,
    openModal, closeModal, openCartDrawer, closeCartDrawer,
    openMobileDrawer, closeMobileDrawer, openSearch, closeSearch,
    loaderStart, loaderDone,
  };
})();
