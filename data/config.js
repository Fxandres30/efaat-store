/**
 * config.js — Configuración general de la tienda.
 * Editable sin tocar lógica de negocio. Cuando se conecte un backend real,
 * este archivo pasa a ser la respuesta de un endpoint /config.
 */
window.EFAAT_CONFIG = {
  storeName: 'EFAAT',
  storeTagline: 'STORE',
  currency: 'COP',
  currencySymbol: '$',
  locale: 'es-CO',

  // Envío
  freeShippingThreshold: 250000,
  standardShippingCost: 12900,
  expressShippingCost: 22900,

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

  // Cupones demo
  coupons: [
    { code: 'WELCOME10', type: 'percent', value: 10, minSubtotal: 0,      active: true, label: '10% de descuento de bienvenida' },
    { code: 'ENVIOGRATIS', type: 'free_shipping', value: 0, minSubtotal: 0, active: true, label: 'Envío gratis' },
    { code: 'STREET20', type: 'percent', value: 20, minSubtotal: 300000, active: true, label: '20% en compras desde $300.000' },
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

  demoUsers: {
    customer: { email: 'cliente@demo.com', password: '123456', name: 'Cliente Demo' },
    admin:    { email: 'admin@demo.com',    password: 'admin123', name: 'Admin EFAAT' },
  }
};
