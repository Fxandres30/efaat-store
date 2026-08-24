/**
 * imageService.js — reglas de negocio de imágenes de producto: qué
 * archivo es válido y cómo se nombra su ruta en el bucket. Sin
 * llamadas a Supabase (eso es de imageRepository.js) — reglas puras.
 */
const ImageService = (() => {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function isValidImageFile(file) {
    if (!file) return { ok: false, error: 'No se seleccionó ningún archivo.' };
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { ok: false, error: 'Formato no soportado. Usa JPG, PNG o WEBP.' };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { ok: false, error: 'La imagen supera el límite de 5MB.' };
    }
    return { ok: true };
  }

  function extensionFor(file) {
    const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    return map[file.type] || 'jpg';
  }

  // {productId}/{timestamp}-{random}.{ext} — evita colisiones sin
  // depender del nombre original del archivo (puede traer espacios,
  // acentos, o repetirse entre productos).
  function buildStoragePath(productId, file) {
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return `${productId}/${unique}.${extensionFor(file)}`;
  }

  return { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, isValidImageFile, buildStoragePath };
})();
