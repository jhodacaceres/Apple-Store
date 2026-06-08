  -- ============================================================
  -- Catálogo de accesorios Apple Zone — Migración Fase 1
  -- Tabla independiente de la tabla 'products' (iPhones por IMEI)
  -- Ejecutar en: Supabase Dashboard → SQL Editor
  -- ============================================================

  CREATE TABLE IF NOT EXISTS catalog_products (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         TEXT        UNIQUE NOT NULL,
    nombre      TEXT        NOT NULL,
    categoria   TEXT        NOT NULL
                CHECK (categoria IN ('fundas','cargadores','cables','airpods','accesorios')),
    descripcion TEXT,
    precio      NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock       INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen_url  TEXT,
    slug        TEXT        UNIQUE NOT NULL,
    activo      BOOLEAN     NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Trigger: actualiza updated_at automáticamente en cada UPDATE
  CREATE OR REPLACE FUNCTION set_catalog_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS catalog_products_updated_at ON catalog_products;
  CREATE TRIGGER catalog_products_updated_at
    BEFORE UPDATE ON catalog_products
    FOR EACH ROW EXECUTE FUNCTION set_catalog_updated_at();

  -- Índices para consultas frecuentes
  CREATE INDEX IF NOT EXISTS idx_catalog_products_categoria ON catalog_products (categoria);
  CREATE INDEX IF NOT EXISTS idx_catalog_products_activo    ON catalog_products (activo);
  CREATE INDEX IF NOT EXISTS idx_catalog_products_slug      ON catalog_products (slug);

  -- ============================================================
  -- Row Level Security
  -- ============================================================
  ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

  -- Visitantes anónimos: solo lectura de productos activos
  -- (stock=0 es visible para mostrar badge "Agotado")
  CREATE POLICY "anon_read_active" ON catalog_products
    FOR SELECT TO anon
    USING (activo = true);

  -- Usuarios autenticados (admin + Apps Script vía service key): acceso total
  CREATE POLICY "auth_all" ON catalog_products
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

  -- ============================================================
  -- Datos de ejemplo (eliminar o comentar en producción)
  -- ============================================================
  INSERT INTO catalog_products (sku, nombre, categoria, descripcion, precio, stock, slug, activo)
  VALUES
    ('FUNDA-IP15-NEG-001', 'Funda iPhone 15 Silicona Negra', 'fundas',
    'Funda de silicona premium compatible con iPhone 15. Bordes elevados y acabado anti-huellas.',
    65.00, 10, 'funda-iphone-15-silicona-negra', true),

    ('FUNDA-IP15PM-TRN-002', 'Funda iPhone 15 Pro Max Transparente', 'fundas',
    'Funda transparente rígida con protección de esquinas. Compatible iPhone 15 Pro Max.',
    75.00, 5, 'funda-iphone-15-pro-max-transparente', true),

    ('CARG-20W-USB-003', 'Cargador 20W USB-C Apple Original', 'cargadores',
    'Cargador de pared Apple 20W con puerto USB-C. Carga rápida compatible con iPhone 8 en adelante.',
    150.00, 8, 'cargador-20w-usb-c-apple-original', true),

    ('CABLE-USBC-1M-004', 'Cable USB-C a Lightning 1m', 'cables',
    'Cable trenzado USB-C a Lightning de 1 metro. Compatible con carga rápida 20W.',
    85.00, 15, 'cable-usbc-lightning-1m', true),

    ('AIRP-PRO-2GEN-005', 'AirPods Pro 2da Generación', 'airpods',
    'Cancelación activa de ruido, audio espacial personalizado y estuche con carga MagSafe.',
    850.00, 3, 'airpods-pro-2da-generacion', true),

    ('ACC-MAGSAFE-CHG-006', 'Cargador MagSafe 15W', 'accesorios',
    'Carga inalámbrica MagSafe de 15W para iPhone 12 en adelante. Cable de 1m incluido.',
    210.00, 0, 'cargador-magsafe-15w', true)
  ON CONFLICT (sku) DO NOTHING;
