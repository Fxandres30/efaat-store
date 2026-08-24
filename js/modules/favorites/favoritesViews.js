/**
 * favoritesViews.js — página de favoritos (extraído de js/views.js en
 * la reorganización arquitectónica).
 */
const FavoritesViews = (() => {
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

  return { renderFavorites };
})();
