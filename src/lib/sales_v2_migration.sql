-- ============================================================
-- Apple Zone — Migración Ventas v2
-- Permite registrar ventas de accesorios del catálogo además de celulares
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS catalog_product_id UUID
  REFERENCES catalog_products(id) ON DELETE SET NULL;

-- Un pedido puede tener product_id (celular) o catalog_product_id (accesorio), no ambos
-- Ambos son nullable para compatibilidad con registros anteriores

-- Visibilidad pública del celular en el catálogo
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS visible_catalogo BOOLEAN NOT NULL DEFAULT false;

-- Ruta de imagen en Supabase Storage (igual que catalog_products.imagen_path)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_path TEXT;
