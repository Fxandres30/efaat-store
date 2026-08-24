/**
 * productCard.js — tarjeta de producto reutilizable (extraído de
 * js/ui.js en la reorganización arquitectónica). Se agrega al facade
 * `Ui` en js/ui/shell.js — no se consume directo desde otros módulos.
 */
const UiProductCard = (() => {
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
        <button class="p-fav ${isFav ? 'active' : ''}" data-fav-toggle="${p.id}" aria-label="Favorito">${Ui.ICONS.heart}</button>
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

  return { badgesHtml, productCard, productGrid };
})();
