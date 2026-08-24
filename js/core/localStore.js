/**
 * localStore.js — Persistencia local (relocado de js/storage.js en la
 * reorganización arquitectónica).
 *
 * REGLA DE ARQUITECTURA — ALCANCE REDUCIDO A PROPÓSITO: este archivo
 * ya NO es una capa general de "base de datos en localStorage". Solo
 * existe para los dominios que en esta fase siguen siendo locales de
 * verdad: carrito, favoritos, pedidos, reseñas — pendientes de sus
 * propias fases de migración (ver informe de arquitectura, "Fuera de
 * alcance"). Usuarios y sesión YA NO viven acá — Fase 1 (Auth real)
 * los reemplazó por Supabase Auth + `public.users`, ver
 * js/repositories/authRepository.js y js/orchestrators/
 * authOrchestrator.js.
 *
 * Catálogo, categorías, drops, envío y cupones tampoco viven acá — su
 * ÚNICA fuente es Supabase (js/repositories/productRepository.js,
 * categoryRepository.js, commerceRepository.js vía
 * js/orchestrators/catalogOrchestrator.js). No hay fallback local ni
 * seed local para esos dominios: si Supabase no responde, la vista
 * correspondiente muestra un estado de error real, nunca datos
 * inventados. Si un módulo nuevo necesita leer/escribir catálogo,
 * comercio o usuarios, NO agregues funciones acá — usa el repository/
 * service correspondiente.
 *
 * El global exportado sigue llamándose `Storage` para no romper los
 * archivos que ya lo consumen (cart, checkout, orders, account).
 */
const Storage = (() => {
  const NS = 'efaat_';
  const KEYS = {
    seeded: NS + 'seeded_v1',
    cart: NS + 'cart',
    favorites: NS + 'favorites',
    orders: NS + 'orders',
    reviews: NS + 'reviews',
    orderSeq: NS + 'order_seq',
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Storage read error', key, e);
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error', key, e);
      return false;
    }
  }

  // ---------- Seed (solo primera carga) ----------
  // Ya NO siembra usuarios/sesión (Fase 1 — Auth real) ni productos/
  // categorías/drops/cupones (fase anterior). Las reseñas demo se
  // siembran aparte, en seedReviewsFromProducts(), porque necesitan
  // ids reales de producto que solo existen después de la primera
  // carga exitosa de Supabase (ver catalogOrchestrator.loadCatalog()).
  function isSeeded() { return read(KEYS.seeded, false) === true; }

  function seed() {
    if (isSeeded()) return;
    write(KEYS.orders, []);
    write(KEYS.cart, []);
    write(KEYS.favorites, []);
    write(KEYS.reviews, []);
    write(KEYS.orderSeq, 0);
    write(KEYS.seeded, true);
  }

  // Siembra reseñas demo usando productos REALES ya cargados desde
  // Supabase (sus ids uuid) — se llama una sola vez desde
  // catalogOrchestrator tras el primer loadCatalog() exitoso, nunca
  // en el arranque síncrono (antes no existen ids de producto reales).
  function seedReviewsFromProducts(products) {
    if (getReviews().length || !products || !products.length) return;
    const pool = products.filter(() => Math.random() < 0.6);
    const names = ['Camilo R.', 'Valentina G.', 'Andrés M.', 'Laura P.', 'Santiago T.', 'Mariana C.'];
    const comments = [
      'Excelente calidad, llegó rápido y tal cual la foto.',
      'Me quedó perfecto, el material se siente premium.',
      'Muy buena compra, el empaque también estuvo cuidado.',
      'Cómodos desde el primer uso, los recomiendo.',
      'El color es más bonito en persona.',
    ];
    const reviews = pool.slice(0, 20).map((p) => ({
      id: Utils.uid('rev'),
      productId: p.id,
      user: names[Math.floor(Math.random() * names.length)],
      rating: Math.round(3.5 + Math.random() * 1.5),
      comment: comments[Math.floor(Math.random() * comments.length)],
      date: Date.now() - Math.floor(Math.random() * 40) * 86400000,
    }));
    saveReviews(reviews);
  }

  // ---------- Carrito (local — Fase 3, todavía no migrada) ----------
  function getCart() { return read(KEYS.cart, []); }
  function saveCart(items) { return write(KEYS.cart, items); }

  // ---------- Favoritos (local — Fase 4, todavía no migrada) ----------
  function getFavorites() { return read(KEYS.favorites, []); }
  function saveFavorites(ids) { return write(KEYS.favorites, ids); }

  // ---------- Pedidos (local — Fase 5, todavía no migrada) ----------
  function getOrders() { return read(KEYS.orders, []); }
  function saveOrders(list) { return write(KEYS.orders, list); }
  function saveOrder(order) {
    const list = getOrders();
    const idx = list.findIndex((o) => o.orderId === order.orderId);
    if (idx >= 0) list[idx] = order; else list.push(order);
    saveOrders(list);
    return order;
  }
  function nextOrderNumber() {
    const seq = read(KEYS.orderSeq, 0) + 1;
    write(KEYS.orderSeq, seq);
    const prefix = window.EFAAT_CONFIG.orderNumberPrefix;
    return `${prefix}-${String(seq).padStart(6, '0')}`;
  }

  // ---------- Reseñas (local) ----------
  function getReviews() { return read(KEYS.reviews, []); }
  function saveReviews(list) { return write(KEYS.reviews, list); }
  function addReview(review) {
    const list = getReviews();
    list.unshift(review);
    saveReviews(list);
  }

  return {
    KEYS, seed, isSeeded, seedReviewsFromProducts,
    getCart, saveCart,
    getFavorites, saveFavorites,
    getOrders, saveOrders, saveOrder, nextOrderNumber,
    getReviews, saveReviews, addReview,
  };
})();
