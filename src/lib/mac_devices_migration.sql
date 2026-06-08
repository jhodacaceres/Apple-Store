-- Migración: soporte para dispositivos Mac en la tabla products
-- Ejecutar en el panel SQL de Supabase

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'phone'
    CHECK (device_type IN ('phone', 'mac'));

CREATE INDEX IF NOT EXISTS idx_products_device_type ON products(device_type);

-- Marcar todos los registros existentes como 'phone' por si acaso
UPDATE products SET device_type = 'phone' WHERE device_type IS NULL;
