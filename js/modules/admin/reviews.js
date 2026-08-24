/**
 * reviews.js (admin) — /admin/reviews (extraído de js/admin.js en la
 * reorganización arquitectónica). Reseñas siguen siendo locales (ver
 * informe de arquitectura) — sin cambios de comportamiento.
 */
const AdminReviews = (() => {
  function renderReviews() {
    const reviews = Store.state.reviews.slice().sort((a, b) => b.date - a.date);
    AdminShell.shell('/admin/reviews', `
      <div class="admin-panel table-scroll">
        <table class="data-table">
          <thead><tr><th>Producto</th><th>Cliente</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th></th></tr></thead>
          <tbody>${reviews.map((r) => {
            const p = Store.getProductById(r.productId);
            return `<tr><td>${p ? Utils.escapeHtml(p.name) : '—'}</td><td>${Utils.escapeHtml(r.user)}</td>
              <td class="mono">${r.rating.toFixed(1)} ★</td>
              <td style="max-width:320px;">${Utils.escapeHtml(r.comment)}</td><td>${Utils.formatDate(r.date)}</td>
              <td><button class="btn btn-ghost btn-sm" data-del-review="${r.id}" style="color:var(--c-red);">Eliminar</button></td></tr>`;
          }).join('') || `<tr><td colspan="6" class="dim" style="text-align:center;padding:24px;">Sin reseñas.</td></tr>`}</tbody>
        </table>
      </div>`);
    Utils.qsa('[data-del-review]').forEach((b) => b.addEventListener('click', () => {
      Store.setReviews(Store.state.reviews.filter((r) => r.id !== b.dataset.delReview));
      Notify.success('Reseña eliminada.'); renderReviews();
    }));
  }

  return { renderReviews };
})();
