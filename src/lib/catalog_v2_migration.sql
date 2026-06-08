-- ============================================================
-- Apple Zone — Migración Fase 1 v2
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Agregar soft-delete real a catalog_products
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Agregar imagen_path para Supabase Storage
--    (imagen_url queda como fallback para datos existentes)
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS imagen_path TEXT;

-- 3. Actualizar RLS: anon solo ve activos Y no eliminados
DROP POLICY IF EXISTS "anon_read_active" ON catalog_products;
CREATE POLICY "anon_read_active" ON catalog_products
  FOR SELECT TO anon
  USING (activo = true AND deleted_at IS NULL);

-- 4. Vista pública segura (sin columnas privadas futuras)
CREATE OR REPLACE VIEW public_catalog_products AS
  SELECT id, sku, nombre, categoria, descripcion, precio, stock,
         imagen_path, imagen_url, slug, activo, updated_at
  FROM catalog_products
  WHERE activo = true AND deleted_at IS NULL;

GRANT SELECT ON public_catalog_products TO anon;

-- 5. Supabase Storage — ejecutar desde Dashboard → Storage:
--    Crear bucket: product-images
--    Tipo: Public
--    Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--    (No se puede crear con SQL; hacerlo desde la UI de Supabase)

-- 6. Política de Storage para uploads del staff autenticado
--    (Ejecutar después de crear el bucket)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
--   ON CONFLICT DO NOTHING;

-- CREATE POLICY "staff_upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'product-images');

-- CREATE POLICY "public_read" ON storage.objects
--   FOR SELECT TO anon
--   USING (bucket_id = 'product-images');

-- CREATE POLICY "staff_update_delete" ON storage.objects
--   FOR ALL TO authenticated
--   USING (bucket_id = 'product-images');
