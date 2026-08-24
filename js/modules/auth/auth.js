/**
 * auth.js — Facade de sesión (Fase 1, informe de arquitectura).
 * `login`/`register`/`logout`/`updateProfile`/direcciones ahora
 * delegan en `authOrchestrator.js` (Supabase Auth real) — dejaron de
 * ser síncronos, ahora son `async`. `isLoggedIn`/`isAdmin`/
 * `requireAdmin` NO cambiaron: siguen leyendo `Store.state.
 * currentUser`, que sigue siendo null para invitado (incl. sesión
 * anónima) y poblado solo con sesión real — ver authOrchestrator.js.
 *
 * `toggleFavorite`/`isFavorite` siguen sobre `Storage` (local) — la
 * migración de favoritos a Supabase es su propia fase, no esta.
 */
const AuthModule = (() => {
  function isLoggedIn() { return !!Store.state.currentUser; }
  function isAdmin() { return isLoggedIn() && Store.state.currentUser.role === 'admin'; }
  function requireAdmin() { return isAdmin(); }

  async function register({ name, email, phone, password }) {
    return AuthOrchestrator.register({ name, email, phone, password });
  }

  async function login(email, password) {
    return AuthOrchestrator.login(email, password);
  }

  async function logout() {
    await AuthOrchestrator.logout();
    Notify.info('Sesión cerrada.');
    location.hash = '#/';
  }

  async function updateProfile(patch) {
    return AuthOrchestrator.updateProfile(patch);
  }

  // ---------- Direcciones (Supabase, ver authOrchestrator.js) ----------
  async function listAddresses() { return AuthOrchestrator.listAddresses(); }
  async function getDefaultAddress() { return AuthOrchestrator.getDefaultAddress(); }
  async function saveAddress(address) { return AuthOrchestrator.saveAddress(address); }
  async function deleteAddress(addressId) { return AuthOrchestrator.deleteAddress(addressId); }
  async function setDefaultAddress(addressId) { return AuthOrchestrator.setDefaultAddress(addressId); }

  // ---------- Favoritos (local — Fase 4, todavía no migrada) ----------
  function toggleFavorite(productId) {
    const list = Store.state.favorites.slice();
    const idx = list.indexOf(productId);
    if (idx >= 0) { list.splice(idx, 1); Notify.info('Eliminado de favoritos.'); }
    else { list.push(productId); Notify.success('Agregado a favoritos.'); }
    Store.setFavorites(list);
    Utils.qsa(`[data-fav-toggle="${productId}"]`).forEach((btn) => btn.classList.toggle('active', list.includes(productId)));
  }
  function isFavorite(productId) { return Store.state.favorites.includes(productId); }

  return {
    isLoggedIn, isAdmin, requireAdmin, register, login, logout, updateProfile,
    listAddresses, getDefaultAddress, saveAddress, deleteAddress, setDefaultAddress,
    toggleFavorite, isFavorite,
  };
})();
