-- ============================================================
-- APPLE ZONE — Schema completo con Soft Deletes
-- Ver SUPABASE_SETUP.md en la raíz para instrucciones completas
-- gen_random_uuid() es nativo en PostgreSQL 13+ (Supabase) — sin extensiones
-- ============================================================

-- products
CREATE TABLE IF NOT EXISTS products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  model       TEXT          NOT NULL,
  color       TEXT,
  capacity    TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  imei        TEXT          UNIQUE,
  image_url   TEXT,
  status      TEXT          NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'sold', 'reserved')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ            DEFAULT NULL
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number   TEXT          UNIQUE,
  customer_name  TEXT          NOT NULL,
  customer_phone TEXT,
  product_id     UUID          REFERENCES products(id) ON DELETE SET NULL,
  total_price    NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  status         TEXT          NOT NULL DEFAULT 'completed'
                 CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ            DEFAULT NULL
);

-- settings (single row)
CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER     PRIMARY KEY DEFAULT 1,
  contact_phone    TEXT        NOT NULL DEFAULT '68531959',
  whatsapp_message TEXT        NOT NULL DEFAULT 'Hola, me gustaría saber más sobre un equipo.',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO settings (id, contact_phone, whatsapp_message, updated_at)
VALUES (1, '68531959', 'Hola, me gustaría saber más sobre un equipo.', now())
ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_status      ON products (status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at  ON products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders   (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders   (status)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_product_id    ON orders   (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at    ON orders   (deleted_at);

-- Triggers
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE SEQUENCE IF NOT EXISTS order_seq START 1000 INCREMENT 1;
CREATE OR REPLACE FUNCTION fn_generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := '#ORD-' || LPAD(nextval('order_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION fn_generate_order_number();

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_anon_read"   ON products;
CREATE POLICY "products_anon_read"   ON products FOR SELECT TO anon
  USING (status = 'available' AND deleted_at IS NULL);
DROP POLICY IF EXISTS "products_auth_read"   ON products;
CREATE POLICY "products_auth_read"   ON products FOR SELECT TO authenticated
  USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "products_auth_insert" ON products;
CREATE POLICY "products_auth_insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "products_auth_update" ON products;
CREATE POLICY "products_auth_update" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_auth_read"     ON orders;
CREATE POLICY "orders_auth_read"     ON orders FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "orders_auth_insert"   ON orders;
CREATE POLICY "orders_auth_insert"   ON orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "orders_auth_update"   ON orders;
CREATE POLICY "orders_auth_update"   ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "settings_anon_read"   ON settings;
CREATE POLICY "settings_anon_read"   ON settings FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "settings_auth_read"   ON settings;
CREATE POLICY "settings_auth_read"   ON settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings_auth_update" ON settings;
CREATE POLICY "settings_auth_update" ON settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
