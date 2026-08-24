-- =====================================================================
-- Migración 0002 — Supabase Storage para imágenes de producto
-- =====================================================================
-- Aislada y aditiva a propósito: NO toca ninguna tabla, columna,
-- función ni policy de la migración 0001. Solo crea el bucket
-- `product-images` y sus policies de storage.objects.
--
-- products.images (text[], ya existe desde la migración 0001) sigue
-- siendo la única fuente de verdad de qué imágenes tiene un producto
-- y en qué orden (primer elemento = imagen principal) — este bucket
-- solo almacena los archivos; la referencia vive en esa columna.
--
-- Seguridad: lectura pública (bucket marcado `public`, coherente con
-- que las imágenes de producto ya son públicas hoy vía
-- loremflickr/picsum); escritura/actualización/borrado exigen
-- is_admin(auth.uid()) — la misma función ya definida en la migración
-- 0001, mismo patrón que el resto de policies de admin del proyecto
-- (ver p_products_admin, p_variants_admin, etc.).
--
-- Cómo aplicar: Supabase CLI (`supabase db push`) o pegar este
-- archivo completo en el SQL Editor del dashboard de Supabase.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists p_storage_product_images_read on storage.objects;
create policy p_storage_product_images_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists p_storage_product_images_admin_write on storage.objects;
create policy p_storage_product_images_admin_write on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists p_storage_product_images_admin_update on storage.objects;
create policy p_storage_product_images_admin_update on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists p_storage_product_images_admin_delete on storage.objects;
create policy p_storage_product_images_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
