/**
 * index.js (admin) — facade `AdminModule` que compone todas las
 * secciones de /admin. Se mantiene este nombre porque js/app/app.js
 * registra las 12 rutas /admin/* contra él.
 */
const AdminModule = (() => {
  return {
    renderDashboard: AdminDashboard.renderDashboard,
    renderOrders: AdminOrders.renderOrders,
    renderInventory: AdminInventory.renderInventory,
    renderProducts: AdminProducts.renderProducts,
    renderCustomers: AdminCustomers.renderCustomers,
    renderCategories: AdminCategories.renderCategories,
    renderPromotions: AdminPromotions.renderPromotions,
    renderDrops: AdminDrops.renderDrops,
    renderReviews: AdminReviews.renderReviews,
    renderShipping: AdminShipping.renderShipping,
    renderAnalytics: AdminAnalytics.renderAnalytics,
    renderSettings: AdminSettings.renderSettings,
  };
})();
