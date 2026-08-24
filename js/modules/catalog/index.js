/**
 * index.js (catalog) — facade `ProductsModule` que compone
 * CatalogList + ProductDetail. Se mantiene este nombre porque tiene
 * consumidores externos (js/ui/shell.js: búsqueda; js/app/app.js: rutas).
 */
const ProductsModule = (() => {
  return {
    search: CatalogList.search,
    applyFilters: CatalogList.applyFilters,
    defaultFilters: CatalogList.defaultFilters,
    renderCatalog: CatalogList.renderCatalog,
    renderProductDetail: ProductDetail.renderProductDetail,
    openSizeGuide: ProductDetail.openSizeGuide,
  };
})();
