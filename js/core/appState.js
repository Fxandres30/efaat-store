/**
 * appState.js — Estado central compartido por toda la app (relocado de
 * js/store.js, patrón pub/sub simple). El global exportado sigue
 * llamándose `Store`.
 *
 * Productos/categorías/drops/envío/cupones viven SOLO en memoria acá
 * — nunca se persisten a localStorage (su única persistencia real es
 * Supabase, vía repositories/orchestrators). `catalogOrchestrator`
 * los puebla al arrancar y `adminOrchestrator` los actualiza tras cada
 * escritura exitosa; ninguno de los dos vuelve a escribir en
 * localStorage.
 *
 * `currentUser` (Fase 1, informe de arquitectura): ya NO se restaura
 * acá — lo puebla `AuthOrchestrator.bootstrapSession()` desde la
 * sesión real de Supabase, antes de la primera resolución de rutas
 * (ver js/app/app.js). `init()` ya no toca sesión ni usuarios.
 *
 * Carrito/favoritos/pedidos/reseñas siguen persistiendo vía `Storage`
 * (ver js/core/localStore.js) — no migrados todavía en esta fase (ver
 * informe de arquitectura).
 */
const Store = (() => {
  const state = {
    currentUser: null,
    products: [],
    categories: [],
    drops: [],
    shippingConfig: null,
    coupons: [],
    catalogLoading: true,   // true hasta que la primera carga de Supabase resuelva (ok o error)
    catalogSource: null,    // 'supabase' | null — ya no existe el valor 'local', no hay fallback local
    catalogError: null,
    cart: [],
    favorites: [],
    orders: [],
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
    state.cart = Storage.getCart();
    state.favorites = Storage.getFavorites();
    state.orders = Storage.getOrders();
    state.reviews = Storage.getReviews();
    // currentUser: lo puebla AuthOrchestrator.bootstrapSession() (Fase
    // 1) — ver js/app/app.js. products/categories/drops/shippingConfig/
    // coupons quedan en sus valores iniciales (vacíos, catalogLoading:
    // true) hasta que CatalogOrchestrator.loadCatalog() responda.
  }

  // ---------- Getters ----------
  function getProductById(id) { return state.products.find((p) => p.id === id) || null; }
  function getVariant(product, variantId) {
    if (!product) return null;
    return product.variants.find((v) => v.variantId === variantId) || null;
  }

  // ---------- Mutations de catálogo/comercio: SOLO en memoria ----------
  // Quien llama es catalogOrchestrator (tras leer Supabase) o
  // adminOrchestrator (tras escribir en Supabase con éxito) — nunca
  // se persiste nada acá, la persistencia ya ocurrió en Supabase.
  function setProducts(list) { state.products = list; emit('products:changed'); }
  function upsertProductLocal(product) {
    const idx = state.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) state.products[idx] = product; else state.products.push(product);
    emit('products:changed');
  }
  function removeProductLocal(id) {
    state.products = state.products.filter((p) => p.id !== id);
    emit('products:changed');
  }
  function setCategories(list) { state.categories = list; emit('categories:changed'); }
  function setDrops(list) { state.drops = list; emit('drops:changed'); }
  function setShippingConfig(cfg) { state.shippingConfig = cfg; emit('shipping:changed'); }
  function setCoupons(list) { state.coupons = list; emit('coupons:changed'); }

  // ---------- Mutations locales (persisten vía Storage) ----------
  function setCart(items) { state.cart = items; Storage.saveCart(items); emit('cart:changed'); }

  function setFavorites(ids) {
    state.favorites = ids;
    Storage.saveFavorites(ids);
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

  function setReviews(list) { state.reviews = list; Storage.saveReviews(list); emit('reviews:changed'); }

  function myOrders() {
    if (!state.currentUser) return [];
    return state.orders
      .filter((o) => o.userId === state.currentUser.userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  return {
    state, on, off, emit, init, getProductById, getVariant,
    setProducts, upsertProductLocal, removeProductLocal,
    setCategories, setDrops, setShippingConfig, setCoupons,
    setCart, setFavorites, setUser,
    setOrders, upsertOrder, setReviews, myOrders,
  };
})();
