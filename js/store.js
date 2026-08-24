/**
 * store.js — Estado central compartido por toda la app (patrón pub/sub simple).
 * Ningún módulo debe guardar copias propias de productos/carrito/pedidos:
 * todos leen y escriben sobre Store.state y Store persiste vía storage.js.
 */
const Store = (() => {
  const state = {
    currentUser: null,
    products: [],
    categories: [],
    drops: [],
    cart: [],
    favorites: [],
    orders: [],
    users: [],
    coupons: [],
    reviews: [],
    appliedCoupon: null,
  };

  const listeners = {}; // eventName -> [fn]

  function on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
    return () => off(event, fn);
  }
  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((f) => f !== fn);
  }
  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('listener error', event, e); }
    });
  }

  function init() {
    Storage.seed();
    state.products = Storage.getProducts();
    state.categories = Storage.getCategories();
    state.drops = Storage.getDrops();
    state.cart = Storage.getCart();
    state.favorites = Storage.getFavorites();
    state.orders = Storage.getOrders();
    state.users = Storage.getUsers();
    state.coupons = Storage.getCoupons();
    state.reviews = Storage.getReviews();
    const sessionId = Storage.getSession();
    state.currentUser = sessionId ? Storage.getUserById(sessionId) : null;
    if (state.currentUser) {
      state.favorites = state.currentUser.favorites || [];
    }
  }

  // ---------- Getters ----------
  function getProductById(id) { return state.products.find((p) => p.id === id) || null; }
  function getVariant(product, variantId) {
    if (!product) return null;
    return product.variants.find((v) => v.variantId === variantId) || null;
  }

  // ---------- Mutations (persisten y emiten evento) ----------
  function setProducts(list) { state.products = list; Storage.saveProducts(list); emit('products:changed'); }
  function upsertProduct(product) {
    Storage.saveProduct(product);
    state.products = Storage.getProducts();
    emit('products:changed');
  }
  function removeProduct(id) {
    Storage.deleteProduct(id);
    state.products = Storage.getProducts();
    emit('products:changed');
  }

  function setCart(items) { state.cart = items; Storage.saveCart(items); emit('cart:changed'); }

  function setFavorites(ids) {
    state.favorites = ids;
    Storage.saveFavorites(ids);
    if (state.currentUser) {
      state.currentUser.favorites = ids;
      Storage.saveUser(state.currentUser);
    }
    emit('favorites:changed');
  }

  function setUser(user) {
    state.currentUser = user;
    emit('auth:changed');
  }

  function setOrders(list) { state.orders = list; emit('orders:changed'); }
  function upsertOrder(order) {
    Storage.saveOrder(order);
    state.orders = Storage.getOrders();
    emit('orders:changed');
  }

  function setCoupons(list) { state.coupons = list; Storage.saveCoupons(list); emit('coupons:changed'); }

  function setDrops(list) { state.drops = list; Storage.saveDrops(list); emit('drops:changed'); }

  function setReviews(list) { state.reviews = list; Storage.saveReviews(list); emit('reviews:changed'); }

  function myOrders() {
    if (!state.currentUser) return [];
    return state.orders
      .filter((o) => o.userId === state.currentUser.userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  return { state, on, off, emit, init, getProductById, getVariant,
    setProducts, upsertProduct, removeProduct, setCart, setFavorites, setUser,
    setOrders, upsertOrder, setCoupons, setDrops, setReviews, myOrders };
})();
