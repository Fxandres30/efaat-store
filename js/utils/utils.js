/**
 * utils.js — helpers puros, sin dependencias de estado (relocado de
 * js/utils.js en la reorganización arquitectónica).
 */
const Utils = (() => {
  // Alias de compatibilidad: la única implementación real de
  // formateo de moneda vive en CurrencyService (ver
  // js/services/currencyService.js) — este helper solo delega, así
  // los ~90 call sites existentes (`Utils.formatMoney(...)`) siguen
  // funcionando sin cambios y sin una segunda implementación de
  // Intl.NumberFormat.
  function formatMoney(value) {
    return CurrencyService.formatPrice(value);
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function qs(selector, scope = document) { return scope.querySelector(selector); }
  function qsa(selector, scope = document) { return Array.from(scope.querySelectorAll(selector)); }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatDateTime(ts) {
    return new Date(ts).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

  function starsHtml(rating) {
    const full = Math.round(rating);
    let html = '<span class="rating-stars">';
    for (let i = 0; i < 5; i++) {
      html += `<svg viewBox="0 0 20 20" style="${i < full ? '' : 'fill:#3a3a3a'}"><polygon points="10,1 12.6,7 19.5,7.6 14.2,12 15.8,19 10,15.3 4.2,19 5.8,12 0.5,7.6 7.4,7"/></svg>`;
    }
    html += '</span>';
    return html;
  }

  function timeLeftParts(endTs) {
    const diff = Math.max(0, endTs - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, ended: diff <= 0 };
  }

  // Rango de marcas diacríticas combinantes (U+0300–U+036F) construido
  // por código de carácter a propósito: evita pegar el rango literal
  // en el código fuente, donde editores/herramientas de texto tienden
  // a normalizarlo o corromperlo silenciosamente.
  const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
  function slugify(str) {
    return String(str).toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }

  return { formatMoney, uid, debounce, escapeHtml, qs, qsa, formatDate, formatDateTime, clamp, starsHtml, timeLeftParts, slugify, scrollTop };
})();
