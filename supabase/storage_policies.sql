-- ─────────────────────────────────────────────────────────────
-- Políticas RLS para el bucket de Storage `product-images`
-- ─────────────────────────────────────────────────────────────
-- Sin estas políticas, storage.objects (que tiene RLS activado por
-- defecto) bloquea las subidas: la lectura funciona porque el bucket
-- es público, pero INSERT/UPDATE/DELETE quedan denegados.
--
-- Patrón consistente con public.products: los usuarios `authenticated`
-- (admin logueado vía Supabase Auth) tienen acceso total; el público
-- (anon) solo puede leer.
--
-- Idempotente: se puede reejecutar sin error.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_auth_insert" on storage.objects;
drop policy if exists "product_images_auth_update" on storage.objects;
drop policy if exists "product_images_auth_delete" on storage.objects;

-- Lectura pública
create policy "product_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

-- Subir (admin autenticado)
create policy "product_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

-- Reemplazar (admin autenticado)
create policy "product_images_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

-- Borrar (admin autenticado)
create policy "product_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
