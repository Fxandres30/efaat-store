/**
 * app.js — punto de entrada (relocado de js/app.js en la
 * reorganización arquitectónica). Monta la interfaz persistente,
 * resuelve la sesión de Supabase, carga el catálogo y registra todas
 * las rutas de la SPA.
 */
(async function bootstrap() {
  Store.init();
  Ui.mountShell();

  // Fase 1 (Auth real): la sesión (anónima o real) TIENE que estar
  // resuelta antes del primer Router.resolve() — el guard adminOnly
  // del Router redirige de inmediato si no hay sesión admin, así que
  // si esto no se espera, un admin que recarga /admin sería expulsado
  // antes de que su sesión real llegara a confirmarse.
  const authResult = await AuthOrchestrator.bootstrapSession();
  if (!authResult.ok) {
    console.warn('[app] no se pudo inicializar la sesión de Supabase:', authResult.error);
  }

  // Supabase es la única fuente del catálogo — no hay siembra local
  // de productos/categorías/drops/envío/cupones (ver informe de
  // arquitectura). Mientras esta promesa resuelve, Store.state.
  // catalogLoading queda en true y las vistas muestran un estado de
  // carga; si falla, catalogError queda seteado y las vistas muestran
  // un estado de error real — nunca se inventa un fallback local.
  CatalogOrchestrator.loadCatalog().then((result) => {
    Router.resolve(); // re-renderiza la vista actual con datos reales (o el estado de error)
    if (result.ok) {
      CatalogOrchestrator.subscribeToChanges?.();
    } else {
      console.warn('[app] no se pudo cargar el catálogo desde Supabase:', result.error);
    }
  });

  // ---------- Rutas de tienda ----------
  Router.add('/', () => HomeView.renderHome());
  Router.add('/shop', (params, qp) => ProductsModule.renderCatalog(null, qp));
  Router.add('/shop/:category', (params, qp) => ProductsModule.renderCatalog(params.category, qp));
  Router.add('/product/:id', (params) => ProductsModule.renderProductDetail(params.id));

  Router.add('/cart', () => CartModule.renderCartPage());
  Router.add('/checkout', () => CheckoutModule.start());

  Router.add('/favorites', () => FavoritesViews.renderFavorites());
  Router.add('/track', () => OrdersModule.renderTrackPage());

  Router.add('/login', () => AuthViews.renderLogin());
  Router.add('/register', () => AuthViews.renderRegister());

  Router.add('/account', () => AccountViews.renderAccountHome());
  Router.add('/account/orders', () => OrdersModule.renderMyOrders());
  Router.add('/account/orders/:id', (params) => OrdersModule.renderOrderDetail(params.id));
  Router.add('/account/addresses', () => AccountViews.renderAddresses());
  Router.add('/account/settings', () => AccountViews.renderSettings());

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
