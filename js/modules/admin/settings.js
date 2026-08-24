/**
 * settings.js (admin) — /admin/settings (extraído de js/admin.js en
 * la reorganización arquitectónica).
 */
const AdminSettings = (() => {
  function renderSettings() {
    const admin = Store.state.currentUser;
    AdminShell.shell('/admin/settings', `
      <div class="admin-panel" style="max-width:480px;">
        <h3 style="margin-bottom:16px;">Cuenta de administrador</h3>
        <div class="form-row"><label>Nombre</label><input value="${Utils.escapeHtml(admin ? admin.name : '')}" disabled></div>
        <div class="form-row"><label>Correo</label><input value="${Utils.escapeHtml(admin ? admin.email : '')}" disabled></div>
        <p class="dim" style="font-size:13px;">La edición de datos de cuenta y permisos avanzados llegará en una futura versión. Por ahora, la gestión de tienda (envío, promociones, catálogo) está disponible en sus respectivas secciones del panel.</p>
      </div>`);
  }

  return { renderSettings };
})();
