/**
 * storage.js — Capa de persistencia local.
 *
 * REGLA DE ARQUITECTURA: ningún otro módulo debe tocar `localStorage`
 * directamente. Todo pasa por las funciones de este archivo. El día que
 * se conecte Supabase/Firebase/una API real, solo hay que reescribir el
 * cuerpo de estas funciones (getProducts, saveOrder, etc.) para que hagan
 * fetch/consultas en vez de leer localStorage — el resto de la app no
 * debería tener que cambiar.
 */
const Storage = (() => {
  const NS = 'efaat_';
  const KEYS = {
    seeded: NS + 'seeded_v1',
    products: NS + 'products',
    categories: NS + 'categories',
    drops: NS + 'drops',
    users: NS + 'users',
    session: NS + 'session',
    cart: NS + 'cart',
    favorites: NS + 'favorites',
    orders: NS + 'orders',
    coupons: NS + 'coupons',
    reviews: NS + 'reviews',
    orderSeq: NS + 'order_seq',
    shipping: NS + 'shipping_config',
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
  function isSeeded() { return read(KEYS.seeded, false) === true; }

  function seed() {
    if (isSeeded()) return;
    write(KEYS.products, window.EFAAT_PRODUCTS || []);
    write(KEYS.categories, window.EFAAT_CATEGORIES || []);
    write(KEYS.drops, window.EFAAT_DROPS || []);
    write(KEYS.coupons, (window.EFAAT_CONFIG && window.EFAAT_CONFIG.coupons) || []);
    write(KEYS.orders, []);
    write(KEYS.cart, []);
    write(KEYS.favorites, []);
    write(KEYS.reviews, seedReviews());
    write(KEYS.orderSeq, 0);

    const demo = window.EFAAT_CONFIG.demoUsers;
    const users = [
      {
        userId: 'u_admin_demo',
        name: demo.admin.name,
        email: demo.admin.email,
        password: demo.admin.password, // DEMO ONLY — nunca guardar contraseñas en texto plano en producción
        phone: '3000000000',
        role: 'admin',
        avatar: null,
        addresses: [],
        favorites: [],
        createdAt: Date.now() - 90 * 86400000,
        lastLogin: null,
      },
      {
        userId: 'u_customer_demo',
        name: demo.customer.name,
        email: demo.customer.email,
        password: demo.customer.password, // DEMO ONLY
        phone: '3111234567',
        role: 'customer',
        avatar: null,
        addresses: [
          {
            id: Utils.uid('addr'),
            name: 'Casa',
            recipient: 'Cliente Demo',
            phone: '3111234567',
            address: 'Cra 45 # 12-30, Apto 502',
            city: 'Medellín',
            department: 'Antioquia',
            postalCode: '050021',
            reference: 'Edificio Torres del Parque, portería principal',
            isDefault: true,
          },
        ],
        favorites: [],
        createdAt: Date.now() - 40 * 86400000,
        lastLogin: null,
      },
    ];
    write(KEYS.users, users);
    write(KEYS.seeded, true);
  }

  function seedReviews() {
    const products = (window.EFAAT_PRODUCTS || []).filter((p) => Math.random() < 0.6);
    const names = ['Camilo R.', 'Valentina G.', 'Andrés M.', 'Laura P.', 'Santiago T.', 'Mariana C.'];
    const comments = [
      'Excelente calidad, llegó rápido y tal cual la foto.',
      'Me quedó perfecto, el material se siente premium.',
      'Muy buena compra, el empaque también estuvo cuidado.',
      'Cómodos desde el primer uso, los recomiendo.',
      'El color es más bonito en persona.',
    ];
    return products.slice(0, 20).map((p) => ({
      id: Utils.uid('rev'),
      productId: p.id,
      user: names[Math.floor(Math.random() * names.length)],
      rating: Math.round(3.5 + Math.random() * 1.5),
      comment: comments[Math.floor(Math.random() * comments.length)],
      date: Date.now() - Math.floor(Math.random() * 40) * 86400000,
    }));
  }

  // ---------- Productos ----------
  function getProducts() { return read(KEYS.products, []); }
  function saveProducts(list) { return write(KEYS.products, list); }
  function saveProduct(product) {
    const list = getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) list[idx] = product; else list.push(product);
    saveProducts(list);
    return product;
  }
  function deleteProduct(productId) {
    saveProducts(getProducts().filter((p) => p.id !== productId));
  }

  // ---------- Categorías / Drops ----------
  function getCategories() { return read(KEYS.categories, []); }
  function saveCategories(list) { return write(KEYS.categories, list); }
  function getDrops() { return read(KEYS.drops, []); }
  function saveDrops(list) { return write(KEYS.drops, list); }

  // ---------- Configuración de envíos (editable desde admin) ----------
  // Devuelve { freeShippingThreshold, standardShippingCost, expressShippingCost },
  // combinando los valores por defecto de data/config.js con lo que el admin
  // haya guardado. Todo el resto de la app (cart.js) debe leer de aquí, no
  // directamente de window.EFAAT_CONFIG, para que los cambios del admin apliquen.
  function getShippingConfig() {
    const base = window.EFAAT_CONFIG || {};
    const defaults = {
      freeShippingThreshold: base.freeShippingThreshold,
      standardShippingCost: base.standardShippingCost,
      expressShippingCost: base.expressShippingCost,
    };
    return Object.assign({}, defaults, read(KEYS.shipping, {}));
  }
  function saveShippingConfig(cfg) { return write(KEYS.shipping, cfg); }

  // ---------- Usuarios ----------
  function getUsers() { return read(KEYS.users, []); }
  function saveUsers(list) { return write(KEYS.users, list); }
  function saveUser(user) {
    const list = getUsers();
    const idx = list.findIndex((u) => u.userId === user.userId);
    if (idx >= 0) list[idx] = user; else list.push(user);
    saveUsers(list);
    return user;
  }
  function getUserById(userId) { return getUsers().find((u) => u.userId === userId) || null; }
  function getUserByEmail(email) {
    return getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  // ---------- Sesión ----------
  function getSession() { return read(KEYS.session, null); }
  function saveSession(userId) { return write(KEYS.session, userId); }
  function clearSession() { return write(KEYS.session, null); }

  // ---------- Carrito ----------
  function getCart() { return read(KEYS.cart, []); }
  function saveCart(items) { return write(KEYS.cart, items); }

  // ---------- Favoritos ----------
  function getFavorites() { return read(KEYS.favorites, []); }
  function saveFavorites(ids) { return write(KEYS.favorites, ids); }

  // ---------- Pedidos ----------
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

  // ---------- Cupones / promociones ----------
  function getCoupons() { return read(KEYS.coupons, []); }
  function saveCoupons(list) { return write(KEYS.coupons, list); }

  // ---------- Reseñas ----------
  function getReviews() { return read(KEYS.reviews, []); }
  function saveReviews(list) { return write(KEYS.reviews, list); }
  function addReview(review) {
    const list = getReviews();
    list.unshift(review);
    saveReviews(list);
  }

  return {
    KEYS, seed, isSeeded,
    getProducts, saveProducts, saveProduct, deleteProduct,
    getCategories, saveCategories, getDrops, saveDrops,
    getShippingConfig, saveShippingConfig,
    getUsers, saveUsers, saveUser, getUserById, getUserByEmail,
    getSession, saveSession, clearSession,
    getCart, saveCart,
    getFavorites, saveFavorites,
    getOrders, saveOrders, saveOrder, nextOrderNumber,
    getCoupons, saveCoupons,
    getReviews, saveReviews, addReview,
  };
})();
