/**
 * auth.js — Autenticación LOCAL SIMULADA (prototipo).
 * IMPORTANTE: esto NO es seguro para producción. Las contraseñas se
 * guardan en texto plano en localStorage solo para efectos de demo.
 * La arquitectura (login/register/logout/session) está pensada para que,
 * al conectar un backend real, solo cambie la implementación interna de
 * estas funciones (por ejemplo llamando a Supabase Auth) sin tocar las
 * vistas que las consumen.
 */
const AuthModule = (() => {
  function isLoggedIn() { return !!Store.state.currentUser; }
  function isAdmin() { return isLoggedIn() && Store.state.currentUser.role === 'admin'; }
  function requireAdmin() { return isAdmin(); }

  function register({ name, email, phone, password }) {
    if (Storage.getUserByEmail(email)) {
      return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
    }
    const user = {
      userId: Utils.uid('u'),
      name, email, phone,
      password, // DEMO ONLY
      role: 'customer',
      avatar: null,
      addresses: [],
      favorites: Store.state.favorites.slice(), // conserva favoritos de invitado
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
    Storage.saveUser(user);
    Storage.saveSession(user.userId);
    Store.state.users = Storage.getUsers();
    Store.setUser(user);
    Store.setFavorites(user.favorites);
    return { ok: true, user };
  }

  function login(email, password) {
    const user = Storage.getUserByEmail(email);
    if (!user || user.password !== password) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
    user.lastLogin = Date.now();
    // fusiona favoritos de invitado con los guardados del usuario
    const guestFavs = Store.state.favorites || [];
    user.favorites = Array.from(new Set([...(user.favorites || []), ...guestFavs]));
    Storage.saveUser(user);
    Storage.saveSession(user.userId);
    Store.setUser(user);
    Store.setFavorites(user.favorites);
    return { ok: true, user };
  }

  function logout() {
    Storage.clearSession();
    Store.setUser(null);
    Store.setFavorites([]);
    Notify.info('Sesión cerrada.');
    location.hash = '#/';
  }

  function updateProfile(patch) {
    const user = Object.assign({}, Store.state.currentUser, patch);
    Storage.saveUser(user);
    Store.setUser(user);
    return user;
  }

  // ---------- Direcciones ----------
  function saveAddress(address) {
    const user = Store.state.currentUser;
    if (!user) return null;
    const list = user.addresses || [];
    if (address.id) {
      const idx = list.findIndex((a) => a.id === address.id);
      if (idx >= 0) list[idx] = address;
    } else {
      address.id = Utils.uid('addr');
      if (list.length === 0) address.isDefault = true;
      list.push(address);
    }
    if (address.isDefault) list.forEach((a) => { if (a.id !== address.id) a.isDefault = false; });
    user.addresses = list;
    Storage.saveUser(user);
    Store.setUser(user);
    return address;
  }
  function deleteAddress(addressId) {
    const user = Store.state.currentUser;
    if (!user) return;
    user.addresses = (user.addresses || []).filter((a) => a.id !== addressId);
    if (user.addresses.length && !user.addresses.some((a) => a.isDefault)) user.addresses[0].isDefault = true;
    Storage.saveUser(user);
    Store.setUser(user);
  }
  function setDefaultAddress(addressId) {
    const user = Store.state.currentUser;
    if (!user) return;
    (user.addresses || []).forEach((a) => { a.isDefault = a.id === addressId; });
    Storage.saveUser(user);
    Store.setUser(user);
  }
  function getDefaultAddress() {
    const user = Store.state.currentUser;
    if (!user) return null;
    return (user.addresses || []).find((a) => a.isDefault) || (user.addresses || [])[0] || null;
  }

  // ---------- Favoritos ----------
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
    saveAddress, deleteAddress, setDefaultAddress, getDefaultAddress,
    toggleFavorite, isFavorite,
  };
})();
