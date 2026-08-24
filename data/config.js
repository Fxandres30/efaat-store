/**
 * config.js — Configuración ESTÁTICA de la tienda (métodos de pago,
 * guía de tallas, estados de pedido, credenciales demo). NO es
 * catálogo ni comercio — envío y cupones viven en Supabase
 * (shipping_settings/coupons, ver js/repositories/commerceRepository.js)
 * desde la reorganización arquitectónica; moneda vive en
 * js/services/currencyService.js. No dupliques acá nada que ya tenga
 * fila real en Supabase.
 */
window.EFAAT_CONFIG = {
  // Guía de tallas de tenis — fácilmente editable
  sizeGuide: {
    tenis: [
      { eu: 36, us: 4.5, cm: 22.5 },
      { eu: 37, us: 5,   cm: 23.5 },
      { eu: 38, us: 6,   cm: 24 },
      { eu: 39, us: 7,   cm: 25 },
      { eu: 40, us: 8,   cm: 26 },
      { eu: 41, us: 9,   cm: 27 },
      { eu: 42, us: 10,  cm: 28 },
      { eu: 43, us: 10.5,cm: 28.5 },
      { eu: 44, us: 11,  cm: 29.5 },
      { eu: 45, us: 12,  cm: 30.5 },
    ]
  },

  // Métodos de pago disponibles (todos simulados en esta versión)
  paymentMethods: [
    { id: 'card',        label: 'Tarjeta crédito / débito', icon: '💳', note: 'Visa, Mastercard, Amex' },
    { id: 'pse',         label: 'PSE',                       icon: '🏦', note: 'Débito desde tu banco' },
    { id: 'transfer',    label: 'Transferencia bancaria',     icon: '🔁', note: 'Confirmación manual' },
    { id: 'cod',         label: 'Pago contraentrega',         icon: '📦', note: 'Paga al recibir tu pedido' },
    { id: 'mercadopago', label: 'Mercado Pago',                icon: '💠', note: 'Wallet y tarjetas' },
    { id: 'wompi',       label: 'Wompi',                       icon: '⚡', note: 'Pagos en línea Colombia' },
  ],

  orderNumberPrefix: 'EF',

  // Estados de pedido en orden de flujo normal
  orderStatuses: [
    { key: 'pending',          label: 'Pedido recibido',    group: 'active' },
    { key: 'payment_pending',  label: 'Pago pendiente',     group: 'active' },
    { key: 'confirmed',        label: 'Pago confirmado',    group: 'proceso' },
    { key: 'preparing',        label: 'En preparación',     group: 'proceso' },
    { key: 'ready',            label: 'Listo para envío',   group: 'proceso' },
    { key: 'shipped',          label: 'Enviado',            group: 'enviado' },
    { key: 'in_transit',       label: 'En tránsito',        group: 'enviado' },
    { key: 'delivered',        label: 'Entregado',          group: 'entregado' },
    { key: 'cancelled',        label: 'Cancelado',          group: 'cancelado' },
    { key: 'returned',         label: 'Devuelto',           group: 'devuelto' },
  ],

  // Documentación de las credenciales demo — ya NO se leen en código
  // (Fase 1, informe de arquitectura: el login es Supabase Auth real,
  // sin seed local de usuarios). Sirven como referencia de qué
  // usuarios crear en el dashboard de Supabase Auth para que el hint
  // de /login siga siendo cierto.
  demoUsers: {
    customer: { email: 'cliente@demo.com', password: '123456', name: 'Cliente Demo' },
    admin:    { email: 'admin@demo.com',    password: 'admin123', name: 'Admin EFAAT' },
  }
};
