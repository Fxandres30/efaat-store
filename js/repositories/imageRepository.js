/**
 * imageRepository.js — única capa que habla con Supabase Storage
 * (bucket `product-images`, ver supabase/migrations/
 * 0002_product_images_storage.sql). NO toca la tabla `products` — esa
 * escritura la hace productRepository.updateImages(), coordinada por
 * adminOrchestrator.js.
 */
const ImageRepository = (() => {
  const BUCKET = 'product-images';

  async function uploadFile(path, file) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    return getPublicUrl(path);
  }

  function getPublicUrl(path) {
    return SupabaseClient.getClient().then((supabase) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    });
  }

  // Recibe la URL pública guardada en products.images y recupera el
  // path relativo al bucket para poder borrarla — evita tener que
  // guardar el path por separado de la URL.
  function pathFromPublicUrl(url) {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx >= 0 ? url.slice(idx + marker.length) : null;
  }

  async function removeFile(path) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }

  async function removeByPublicUrl(url) {
    const path = pathFromPublicUrl(url);
    if (!path) return; // URL externa (loremflickr/picsum de demo) — nada que borrar en Storage
    await removeFile(path);
  }

  return { BUCKET, uploadFile, getPublicUrl, pathFromPublicUrl, removeFile, removeByPublicUrl };
})();
