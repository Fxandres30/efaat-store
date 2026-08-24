/**
 * router.js — enrutador basado en hash (relocado de js/router.js en
 * la reorganización arquitectónica). Funciona sin servidor, incluso
 * abriendo index.html directamente con file://. No recarga la página.
 */
const Router = (() => {
  const routes = [];

  function add(pattern, handler, opts = {}) {
    const paramNames = [];
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, (m) => { paramNames.push(m.slice(1)); return '([^/]+)'; }) + '$');
    routes.push({ regex, paramNames, handler, opts });
  }

  function parseHash() {
    let hash = location.hash.replace(/^#/, '') || '/';
    const [path, queryStr] = hash.split('?');
    const query = {};
    if (queryStr) queryStr.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { path: path || '/', query };
  }

  function resolve() {
    Ui.loaderStart();
    Ui.closeCartDrawer(); Ui.closeMobileDrawer(); Ui.closeSearch(); Ui.closeModal();
    const { path, query } = parseHash();
    document.body.classList.toggle('admin-mode', path.startsWith('/admin'));
    const match = routes.find((r) => r.regex.test(path));
    const root = Utils.qs('#viewRoot');

    if (!match) {
      root.innerHTML = `<div class="wrap state-block"><div class="ic">🧭</div><h3>Página no encontrada</h3><a class="btn btn-primary" href="#/">Volver al inicio</a></div>`;
      finish(); return;
    }
    if (match.opts.adminOnly && !AuthModule.requireAdmin()) {
      const dest = AuthModule.isLoggedIn() ? '#/account' : '#/login';
      if (AuthModule.isLoggedIn()) Notify.error('No tienes permisos para acceder al panel administrativo.');
      location.hash = dest;
      return;
    }
    const params = match.regex.exec(path).slice(1);
    const namedParams = {};
    match.paramNames.forEach((name, i) => { namedParams[name] = decodeURIComponent(params[i]); });
    match.handler(namedParams, query);
    finish();
  }

  function finish() {
    Utils.scrollTop();
    const root = Utils.qs('#viewRoot');
    root.classList.remove('page-fade'); void root.offsetWidth; root.classList.add('page-fade');
    Ui.updateHeaderState();
    Ui.loaderDone();
  }

  function init() {
    window.addEventListener('hashchange', resolve);
    window.addEventListener('load', resolve);
  }

  return { add, resolve, init };
})();
