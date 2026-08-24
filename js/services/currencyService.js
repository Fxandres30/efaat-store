/**
 * currencyService.js — ÚNICO responsable de moneda en todo el
 * proyecto: la tasa de cambio, la preferencia activa y el formateo de
 * precios. El precio maestro de cualquier producto/variante/pedido
 * SIEMPRE permanece en COP en Supabase y en memoria — este servicio
 * nunca convierte ni reescribe ese valor, solo decide cómo se
 * DIBUJA en pantalla.
 *
 * Nadie más en el proyecto debe:
 *   - instanciar `new Intl.NumberFormat(...)` para precios,
 *   - hacer `precio / 4000` a mano,
 *   - guardar la moneda elegida en un lugar distinto a este archivo.
 * Todo pasa por getCurrency()/setCurrency()/formatPrice().
 */
const CurrencyService = (() => {
  const DEFAULT_CURRENCY = 'COP';
  // Tasa fija de referencia — no hay integración con un proveedor de
  // tasas en tiempo real en esta fase. Único lugar del proyecto donde
  // existe este número.
  const USD_COP_RATE = 4000;

  const COP_FORMATTER = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  let current = null;

  function getCurrency() {
    if (!current) {
      const saved = PreferencesService.getCurrency();
      current = saved === 'USD' ? 'USD' : DEFAULT_CURRENCY;
    }
    return current;
  }

  function setCurrency(code) {
    current = code === 'USD' ? 'USD' : 'COP';
    PreferencesService.setCurrency(current);
    if (typeof Store !== 'undefined') Store.emit('currency:changed', current);
    return current;
  }

  function getExchangeRate() { return USD_COP_RATE; }

  function convertCOPToUSD(valueCOP) { return valueCOP / USD_COP_RATE; }

  // Formatea un precio maestro en COP según la moneda activa. COP se
  // ve exactamente igual que siempre ($599.900). USD se muestra como
  // aproximación explícita (≈ US$150) para no confundirse con el
  // símbolo $ de COP.
  function formatPrice(valueCOP) {
    if (valueCOP == null || isNaN(valueCOP)) return '';
    if (getCurrency() === 'USD') {
      return `≈ ${USD_FORMATTER.format(Math.round(convertCOPToUSD(valueCOP)))}`;
    }
    try {
      return COP_FORMATTER.format(valueCOP);
    } catch (e) {
      return `$${Math.round(valueCOP).toLocaleString('es-CO')}`;
    }
  }

  // Formatos explícitos, para los pocos lugares (checkout real,
  // recibos) que necesitan mostrar COP sin importar la preferencia
  // activa de presentación.
  function formatCOP(valueCOP) {
    try { return COP_FORMATTER.format(valueCOP); } catch (e) { return `$${Math.round(valueCOP).toLocaleString('es-CO')}`; }
  }

  return { getCurrency, setCurrency, getExchangeRate, convertCOPToUSD, formatPrice, formatCOP };
})();
