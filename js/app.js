/**
 * app.js — punto de entrada. Siembra datos demo, monta la interfaz
 * persistente y registra todas las rutas de la SPA.
 */
(function bootstrap() {
  Store.init();
  Ui.mountShell();

  // ---------- Rutas de tienda ----------
  Router.add('/', () => Views.renderHome());
  Router.add('/shop', (params, qp) => ProductsModule.renderCatalog(null, qp));
  Router.add('/shop/:category', (params, qp) => ProductsModule.renderCatalog(params.category, qp));
  Router.add('/product/:id', (params) => ProductsModule.renderProductDetail(params.id));

  Router.add('/cart', () => CartModule.renderCartPage());
  Router.add('/checkout', () => CheckoutModule.start());

  Router.add('/favorites', () => Views.renderFavorites());
  Router.add('/track', () => OrdersModule.renderTrackPage());

  Router.add('/login', () => Views.renderLogin());
  Router.add('/register', () => Views.renderRegister());

  Router.add('/account', () => Views.renderAccountHome());
  Router.add('/account/orders', () => OrdersModule.renderMyOrders());
  Router.add('/account/orders/:id', (params) => OrdersModule.renderOrderDetail(params.id));
  Router.add('/account/addresses', () => Views.renderAddresses());
  Router.add('/account/settings', () => Views.renderSettings());

  // ---------- Rutas admin ----------
  Router.add('/admin', () => AdminModule.renderDashboard(), { adminOnly: true });
  Router.add('/admin/orders', () => AdminModule.renderOrders(), { adminOnly: true });
  Router.add('/admin/inventory', () => AdminModule.renderInventory(), { adminOnly: true });
  Router.add('/admin/products', () => AdminModule.renderProducts(), { adminOnly: true });
  Router.add('/admin/customers', () => AdminModule.renderCustomers(), { adminOnly: true });
  Router.add('/admin/categories', () => AdminModule.renderCategories(), { adminOnly: true });
  Router.add('/admin/promotions', () => AdminModule.renderPromotions(), { adminOnly: true });
  Router.add('/admin/drops', () => AdminModule.renderDrops(), { adminOnly: true });
  Router.add('/admin/reviews', () => AdminModule.renderReviews(), { adminOnly: true });
  Router.add('/admin/shipping', () => AdminModule.renderShipping(), { adminOnly: true });
  Router.add('/admin/analytics', () => AdminModule.renderAnalytics(), { adminOnly: true });
  Router.add('/admin/settings', () => AdminModule.renderSettings(), { adminOnly: true });

  Router.init();
  Router.resolve();
})();
