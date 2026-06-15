-- =============================================================================
-- Apple Zone — Esquema completo de base de datos
-- Proyecto : Apple Zone
-- Project ID: adgfaakylpwttgiwplfv
-- Región   : sa-east-1 (São Paulo)
-- Generado : 2026-06-13
-- Descripción: Archivo único para recrear tablas, índices, funciones, triggers,
--              políticas RLS, bucket y políticas de Storage.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- 2. SECUENCIAS
-- =============================================================================

-- Usada por fn_generate_order_number() para producir #ORD-1000, #ORD-1001, …
CREATE SEQUENCE IF NOT EXISTS public.order_seq START 1000;


-- =============================================================================
-- 3. TABLAS
-- Orden respeta dependencias de claves foráneas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- Una fila por usuario de auth.users.
-- El primer usuario registrado recibe role='admin' (ver handle_new_user).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT        NOT NULL DEFAULT 'employee'
                          CHECK (role IN ('admin', 'employee')),
  email       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- products
-- Teléfonos y Macs en inventario. Soft-delete con deleted_at.
-- Comentarios de columna reproducen los que existen en producción.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  model            TEXT        NOT NULL,
  color            TEXT,
  capacity         TEXT,
  price            NUMERIC     NOT NULL CHECK (price >= 0),
  imei             TEXT        UNIQUE,
  image_url        TEXT,
  image_path       TEXT,
  visible_catalogo BOOLEAN     NOT NULL DEFAULT false,
  status           TEXT        NOT NULL DEFAULT 'available'
                               CHECK (status IN ('available', 'sold', 'reserved')),
  device_type      TEXT        DEFAULT 'phone'
                               CHECK (device_type IN ('phone', 'mac')),
  created_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,

  PRIMARY KEY (id)
);

COMMENT ON COLUMN public.products.status IS
  'available = en venta, sold = vendido, reserved = apartado.';
COMMENT ON COLUMN public.products.deleted_at IS
  'Soft delete: NULL = activo, valor = eliminado lógicamente.';

-- -----------------------------------------------------------------------------
-- catalog_products
-- Accesorios Apple con gestión de stock. Soft-delete con deleted_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  sku         TEXT        NOT NULL UNIQUE,
  nombre      TEXT        NOT NULL,
  categoria   TEXT        NOT NULL
              CHECK (categoria IN ('fundas', 'cargadores', 'cables', 'airpods', 'accesorios')),
  descripcion TEXT,
  precio      NUMERIC     NOT NULL CHECK (precio >= 0),
  stock       INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  imagen_url  TEXT,
  imagen_path TEXT,
  slug        TEXT        NOT NULL UNIQUE,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- orders
-- Ventas/pedidos. Puede referenciar un product (teléfono) o un catalog_product
-- (accesorio); ambas FKs son opcionales para soportar ambos flujos.
-- Soft-delete con deleted_at. order_number generado automáticamente por trigger.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  order_number       TEXT        UNIQUE,
  customer_name      TEXT        NOT NULL,
  customer_phone     TEXT,
  product_id         UUID        REFERENCES public.products(id),
  catalog_product_id UUID        REFERENCES public.catalog_products(id),
  total_price        NUMERIC     NOT NULL CHECK (total_price >= 0),
  status             TEXT        NOT NULL DEFAULT 'completed'
                                 CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes              TEXT,
  created_by         UUID        REFERENCES auth.users(id),
  created_by_name    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,

  PRIMARY KEY (id)
);

COMMENT ON COLUMN public.orders.notes IS
  'Notas internas del administrador (no visibles al cliente).';
COMMENT ON COLUMN public.orders.deleted_at IS
  'Soft delete: NULL = activo, valor = eliminado lógicamente.';

-- -----------------------------------------------------------------------------
-- settings
-- Configuración global. Siempre una única fila (id = 1).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id                INTEGER     NOT NULL DEFAULT 1,
  contact_phone     TEXT        NOT NULL DEFAULT '68531959',
  whatsapp_message  TEXT        NOT NULL DEFAULT 'Hola, me gustaría saber más sobre un equipo.',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID        REFERENCES auth.users(id),
  updated_by_email  TEXT,

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- analytics_sessions
-- Una fila por visita a la web pública.
-- Duración = last_seen_at - started_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  session_id   TEXT        NOT NULL,
  visitor_id   TEXT        NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_views   INTEGER     NOT NULL DEFAULT 1,
  entry_path   TEXT,
  referrer     TEXT,
  device       TEXT        CHECK (device IN ('mobile', 'desktop', 'tablet')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (session_id)
);

COMMENT ON TABLE public.analytics_sessions IS
  'Una fila por visita. Duración = last_seen_at - started_at.';
COMMENT ON COLUMN public.analytics_sessions.visitor_id IS
  'ID persistente del navegador para contar visitantes únicos / recurrentes.';

-- -----------------------------------------------------------------------------
-- analytics_events
-- Eventos de la web pública. metadata ej: {"source":"home","product":"iPhone 15"}.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  session_id TEXT        REFERENCES public.analytics_sessions(session_id),
  visitor_id TEXT,
  type       TEXT        NOT NULL
             CHECK (type IN ('page_view', 'whatsapp_click', 'product_view')),
  path       TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

COMMENT ON TABLE public.analytics_events IS
  'Eventos de la web pública. metadata ej: {"source":"home","product":"iPhone 15"}.';


-- =============================================================================
-- 4. ÍNDICES
-- =============================================================================

-- products
CREATE INDEX IF NOT EXISTS idx_products_status
  ON public.products (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON public.products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_device_type
  ON public.products (device_type);
CREATE INDEX IF NOT EXISTS idx_products_created_by
  ON public.products (created_by);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at
  ON public.orders (deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_product_id
  ON public.orders (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by
  ON public.orders (created_by);

-- catalog_products
CREATE INDEX IF NOT EXISTS idx_catalog_products_activo
  ON public.catalog_products (activo);
CREATE INDEX IF NOT EXISTS idx_catalog_products_categoria
  ON public.catalog_products (categoria);
CREATE INDEX IF NOT EXISTS idx_catalog_products_slug
  ON public.catalog_products (slug);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active
  ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at);

-- analytics_sessions
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at
  ON public.analytics_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id
  ON public.analytics_sessions (visitor_id);

-- analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_at
  ON public.analytics_events (type, created_at DESC);


-- =============================================================================
-- 5. FUNCIONES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de autenticación
-- -----------------------------------------------------------------------------

-- Verifica role en el JWT (app_metadata.role). Usada en algunas policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;

-- Verifica role consultando la tabla profiles directamente (más fiable).
-- SECURITY DEFINER para que RLS no bloquee la lectura interna.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- Funciones de trigger — updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Función de trigger — número de orden automático
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := '#ORD-' || LPAD(nextval('order_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Función de trigger — auto-crear perfil al registrar usuario
-- El primer usuario en registrarse recibe role='admin'.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN (SELECT COUNT(*) = 0 FROM public.profiles) THEN 'admin' ELSE 'employee' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPCs de escritura anónima (SECURITY DEFINER)
-- Permiten que la web pública registre analítica sin exponer las tablas.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.track_session_start(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_path       TEXT    DEFAULT NULL,
  p_referrer   TEXT    DEFAULT NULL,
  p_device     TEXT    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO analytics_sessions (session_id, visitor_id, entry_path, referrer, device)
  VALUES (
    p_session_id,
    p_visitor_id,
    LEFT(p_path, 300),
    LEFT(p_referrer, 500),
    CASE WHEN p_device IN ('mobile', 'desktop', 'tablet') THEN p_device ELSE NULL END
  )
  ON CONFLICT (session_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_ping(p_session_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE analytics_sessions
  SET last_seen_at = now()
  WHERE session_id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_event(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_type       TEXT,
  p_path       TEXT  DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF p_type NOT IN ('page_view', 'whatsapp_click', 'product_view') THEN
    RETURN;
  END IF;

  INSERT INTO analytics_events (session_id, visitor_id, type, path, metadata)
  VALUES (p_session_id, p_visitor_id, p_type, LEFT(p_path, 300), COALESCE(p_metadata, '{}'));

  IF p_type = 'page_view' THEN
    UPDATE analytics_sessions
    SET last_seen_at = now(),
        page_views   = page_views + 1
    WHERE session_id = p_session_id;
  ELSE
    UPDATE analytics_sessions
    SET last_seen_at = now()
    WHERE session_id = p_session_id;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPCs de lectura (requieren usuario autenticado)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH s AS (
    SELECT * FROM analytics_sessions
    WHERE started_at >= p_from AND started_at <= p_to
  ),
  e AS (
    SELECT * FROM analytics_events
    WHERE created_at >= p_from AND created_at <= p_to
  )
  SELECT json_build_object(
    'total_visits',         (SELECT count(*) FROM s),
    'unique_visitors',      (SELECT count(DISTINCT visitor_id) FROM s),
    'avg_duration_seconds', (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (last_seen_at - started_at)))), 0) FROM s),
    'bounce_rate',          (SELECT CASE WHEN count(*) = 0 THEN 0
                                    ELSE ROUND(100.0 * count(*) FILTER (WHERE page_views <= 1) / count(*)) END FROM s),
    'whatsapp_clicks',      (SELECT count(*) FROM e WHERE type = 'whatsapp_click'),
    'conversion_rate',      (SELECT CASE WHEN (SELECT count(*) FROM s) = 0 THEN 0
                                    ELSE ROUND(100.0 * (SELECT count(*) FROM e WHERE type = 'whatsapp_click')
                                                     / (SELECT count(*) FROM s), 1) END)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_visits_by_day(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(day date, visits bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT started_at::date AS day, count(*) AS visits
  FROM analytics_sessions
  WHERE started_at >= p_from AND started_at <= p_to
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.get_top_products(
  p_from  TIMESTAMPTZ,
  p_to    TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE(product text, views bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(metadata->>'product', '—') AS product, count(*) AS views
  FROM analytics_events
  WHERE type = 'product_view'
    AND created_at >= p_from AND created_at <= p_to
  GROUP BY 1
  ORDER BY views DESC
  LIMIT p_limit;
$$;

-- Devuelve uso de Storage (bucket product-images) y tamaño de la base de datos.
-- SECURITY DEFINER con search_path explícito para acceder a storage.objects.
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'storage'
AS $$
DECLARE
  v_storage_bytes   BIGINT;
  v_storage_objects BIGINT;
  v_db_bytes        BIGINT;
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0), COUNT(*)
  INTO   v_storage_bytes, v_storage_objects
  FROM   storage.objects
  WHERE  bucket_id = 'product-images';

  v_db_bytes := pg_database_size(current_database());

  RETURN json_build_object(
    'storage_bytes',   v_storage_bytes,
    'storage_objects', v_storage_objects,
    'db_bytes',        v_db_bytes
  );
END;
$$;


-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- products: actualizar updated_at en cada UPDATE
CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- profiles: actualizar updated_at en cada UPDATE
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- catalog_products: actualizar updated_at en cada UPDATE
CREATE OR REPLACE TRIGGER catalog_products_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_updated_at();

-- orders: generar order_number automático en INSERT
CREATE OR REPLACE TRIGGER trg_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_order_number();

-- auth.users: crear perfil automáticamente al registrar un nuevo usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 7. ROW LEVEL SECURITY — activar en todas las tablas
-- =============================================================================

ALTER TABLE public.products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 8. POLÍTICAS RLS — schema public
-- =============================================================================

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------

CREATE POLICY products_anon_read ON public.products
  FOR SELECT TO anon
  USING (status = 'available' AND deleted_at IS NULL);

CREATE POLICY products_auth_read ON public.products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY products_auth_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY products_auth_update ON public.products
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY products_auth_delete ON public.products
  FOR DELETE TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------

CREATE POLICY orders_auth_read ON public.orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY orders_auth_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY orders_auth_update ON public.orders
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY orders_auth_delete ON public.orders
  FOR DELETE TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- catalog_products
-- -----------------------------------------------------------------------------

-- Acceso público: solo productos activos y no eliminados
CREATE POLICY anon_read_active ON public.catalog_products
  FOR SELECT TO anon
  USING (activo = true AND deleted_at IS NULL);

-- Acceso total para autenticados (política principal)
CREATE POLICY auth_all ON public.catalog_products
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Políticas adicionales presentes en producción (redundantes con auth_all)
CREATE POLICY catalog_products_auth_all ON public.catalog_products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY catalog_products_auth_delete ON public.catalog_products
  FOR DELETE TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

-- Lectura amplia para autenticados
CREATE POLICY profiles_auth_read ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Lectura restringida: propio perfil o admin
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR current_user_is_admin());

-- Actualización: propio perfil o admin (vía is_admin / JWT)
CREATE POLICY profiles_auth_update ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id OR is_admin())
  WITH CHECK ((SELECT auth.uid()) = id OR is_admin());

-- Actualización solo admin (vía current_user_is_admin / tabla)
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (current_user_is_admin());

-- Solo admins pueden crear perfiles manualmente
CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Solo admins pueden eliminar perfiles
CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- settings
-- -----------------------------------------------------------------------------

CREATE POLICY settings_anon_read ON public.settings
  FOR SELECT TO anon
  USING (true);

CREATE POLICY settings_auth_read ON public.settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY settings_auth_update ON public.settings
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- analytics_sessions
-- -----------------------------------------------------------------------------

-- Solo lectura para autenticados. Escritura únicamente vía RPCs SECURITY DEFINER.
CREATE POLICY analytics_sessions_auth_read ON public.analytics_sessions
  FOR SELECT TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- analytics_events
-- -----------------------------------------------------------------------------

-- Solo lectura para autenticados. Escritura únicamente vía RPCs SECURITY DEFINER.
CREATE POLICY analytics_events_auth_read ON public.analytics_events
  FOR SELECT TO authenticated
  USING (true);


-- =============================================================================
-- 9. STORAGE — bucket y políticas
-- =============================================================================

-- Bucket público para imágenes de productos y accesorios
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública sin restricción
CREATE POLICY product_images_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Subida solo para autenticados
CREATE POLICY product_images_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Actualización solo para autenticados
CREATE POLICY product_images_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- Eliminación solo para autenticados
CREATE POLICY product_images_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');


-- =============================================================================
-- 10. DATOS INICIALES
-- =============================================================================

-- Configuración global por defecto (una sola fila, id siempre = 1)
INSERT INTO public.settings (id, contact_phone, whatsapp_message)
VALUES (1, '68531959', 'Hola, me gustaría saber más sobre un equipo.')
ON CONFLICT (id) DO NOTHING;
