/**
 * imageManager.js (admin) — gestor de imágenes de un producto,
 * incrustado en el modal de "Editar producto" (ver products.js).
 * Flujo: seleccionar archivo → preview local (FileReader, antes de
 * subir) → ImageService.isValidImageFile → AdminOrchestrator.
 * addProductImage() → ImageRepository (Supabase Storage) →
 * ProductRepository.updateImages() → Store se actualiza → esta UI se
 * re-renderiza con el producto fresco.
 *
 * No es un componente con estado propio complejo: cada acción vuelve
 * a llamar a render() con el producto actualizado que devuelve
 * AdminOrchestrator — más simple y menos propenso a desincronizarse
 * que mantener una copia local del array de imágenes.
 */
const AdminImageManager = (() => {
  function render(container, product, onChange) {
    container.innerHTML = `
      <h5 style="font-size:12px;text-transform:uppercase;color:var(--c-text-dim);margin-bottom:10px;">Imágenes del producto</h5>
      <div class="img-manager-grid" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        ${product.images.length ? product.images.map((url, i) => `
          <div class="img-manager-item" data-img-url="${Utils.escapeHtml(url)}" style="width:96px;">
            <div style="position:relative;width:96px;height:96px;border-radius:6px;overflow:hidden;border:1px solid var(--c-border);${i === 0 ? 'outline:2px solid var(--c-red);' : ''}">
              <img src="${url}" style="width:100%;height:100%;object-fit:cover;">
              ${i === 0 ? '<span class="badge badge-red" style="position:absolute;top:4px;left:4px;clip-path:none;border-radius:3px;font-size:9px;">Principal</span>' : ''}
            </div>
            <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">
              ${i !== 0 ? `<button class="btn btn-ghost btn-sm" data-set-primary style="font-size:10px;padding:4px 6px;">Principal</button>` : ''}
              ${i > 0 ? `<button class="btn btn-ghost btn-sm" data-move="-1" style="font-size:10px;padding:4px 6px;">↑</button>` : ''}
              ${i < product.images.length - 1 ? `<button class="btn btn-ghost btn-sm" data-move="1" style="font-size:10px;padding:4px 6px;">↓</button>` : ''}
              <button class="btn btn-ghost btn-sm" data-remove-img style="font-size:10px;padding:4px 6px;color:var(--c-red);">Eliminar</button>
            </div>
          </div>`).join('') : `<p class="dim" style="font-size:12.5px;">Sin imágenes todavía.</p>`}
      </div>
      <div id="imgPreviewBox" style="margin-bottom:8px;"></div>
      <input type="file" id="imgFileInput" accept="image/jpeg,image/png,image/webp" style="font-size:12.5px;">
      <p class="faint" style="font-size:11px;margin-top:6px;">JPG, PNG o WEBP · máx. 5MB. La primera imagen es la principal (se muestra en cards y catálogo).</p>
    `;

    async function reload() {
      const full = await ProductRepository.getProductById(product.id);
      const mapped = ProductService.mapProduct(full);
      render(container, mapped, onChange);
      if (onChange) onChange(mapped);
    }

    function busy(isBusy) {
      Utils.qsa('button, input', container).forEach((el) => { el.disabled = isBusy; });
    }

    Utils.qsa('[data-set-primary]', container).forEach((btn) => btn.addEventListener('click', async () => {
      const url = btn.closest('[data-img-url]').dataset.imgUrl;
      busy(true);
      const res = await AdminOrchestrator.setPrimaryImage(product, url);
      busy(false);
      if (res.ok) await reload(); else Notify.error(res.error);
    }));

    Utils.qsa('[data-remove-img]', container).forEach((btn) => btn.addEventListener('click', async () => {
      const url = btn.closest('[data-img-url]').dataset.imgUrl;
      busy(true);
      const res = await AdminOrchestrator.removeProductImage(product, url);
      busy(false);
      if (res.ok) { Notify.success('Imagen eliminada.'); await reload(); } else Notify.error(res.error);
    }));

    Utils.qsa('[data-move]', container).forEach((btn) => btn.addEventListener('click', async () => {
      const url = btn.closest('[data-img-url]').dataset.imgUrl;
      const idx = product.images.indexOf(url);
      const delta = +btn.dataset.move;
      const target = idx + delta;
      if (target < 0 || target >= product.images.length) return;
      const newOrder = product.images.slice();
      [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
      busy(true);
      const res = await AdminOrchestrator.reorderImages(product, newOrder);
      busy(false);
      if (res.ok) await reload(); else Notify.error(res.error);
    }));

    const fileInput = Utils.qs('#imgFileInput', container);
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      const previewBox = Utils.qs('#imgPreviewBox', container);
      if (!file) { previewBox.innerHTML = ''; return; }
      const check = ImageService.isValidImageFile(file);
      if (!check.ok) { Notify.error(check.error); fileInput.value = ''; previewBox.innerHTML = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        previewBox.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${reader.result}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--c-border);">
            <button class="btn btn-primary btn-sm" id="btnConfirmUpload">Subir esta imagen</button>
          </div>`;
        Utils.qs('#btnConfirmUpload', container).addEventListener('click', async () => {
          busy(true);
          const res = await AdminOrchestrator.addProductImage(product, file);
          busy(false);
          if (res.ok) { Notify.success('Imagen subida.'); fileInput.value = ''; await reload(); }
          else Notify.error(res.error);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  return { render };
})();
