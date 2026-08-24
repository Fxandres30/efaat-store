/**
 * preferencesService.js — ÚNICO uso legítimo de localStorage como
 * "base de datos" en todo el proyecto: preferencias de interfaz que
 * son locales por naturaleza (viven en este navegador, para este
 * visitante, y no describen ningún dato de la tienda). No es una capa
 * general de persistencia — no le agregues productos, pedidos, ni
 * nada que tenga una fila real en Supabase. Hoy solo tiene una
 * preferencia (moneda); si se necesita otra preferencia de UI en el
 * futuro (ej. tema, densidad de tabla), se agrega acá, no se inventa
 * un mecanismo nuevo.
 */
const PreferencesService = (() => {
  const NS = 'efaat_pref_';

  function readKey(key, fallback) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('PreferencesService read error', key, e);
      return fallback;
    }
  }
  function writeKey(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('PreferencesService write error', key, e);
      return false;
    }
  }

  function getCurrency() { return readKey('currency', null); }
  function setCurrency(code) { return writeKey('currency', code); }

  return { getCurrency, setCurrency };
})();
