-- ================================================================
-- MIGRACIÓN: Índices de performance
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- Índice faltante para el JOIN de orders → catalog_products
CREATE INDEX IF NOT EXISTS idx_orders_catalog_product_id
  ON public.orders (catalog_product_id)
  WHERE catalog_product_id IS NOT NULL;

-- Índice para filtrar products por device_type (ahora el filtro va en SQL)
CREATE INDEX IF NOT EXISTS idx_products_device_type
  ON public.products (device_type);
