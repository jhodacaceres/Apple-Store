-- =============================================================================
-- Apple Zone — Migración: renombrado de esquema a español coherente
-- Aplica sobre el esquema descrito en supabase/schema_completo.sql (versión previa).
-- Renombra tablas y columnas, actualiza el cuerpo de funciones/RPCs, y traduce
-- valores de enums (estado/tipo_dispositivo/rol).
-- Los nombres de funciones y RPCs se mantienen (solo cambia su implementación
-- interna) para no romper las llamadas `supabase.rpc(...)` del frontend.
--
-- IMPORTANTE sobre el orden: las funciones de trigger (fn_set_updated_at, etc.)
-- se actualizan ANTES de las traducciones de enums, porque esa sección ejecuta
-- UPDATE sobre equipos/perfiles y esos UPDATE disparan los triggers BEFORE
-- UPDATE — si la función siguiera referenciando la columna vieja (updated_at)
-- después de haberla renombrado a actualizado_en, el UPDATE fallaría con
-- "record NEW has no field updated_at".
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. RENOMBRAR TABLAS
-- =============================================================================

ALTER TABLE public.products           RENAME TO equipos;
ALTER TABLE public.catalog_products   RENAME TO accesorios;
ALTER TABLE public.orders             RENAME TO ventas;
ALTER TABLE public.profiles           RENAME TO perfiles;
ALTER TABLE public.settings           RENAME TO configuracion;
ALTER TABLE public.analytics_sessions RENAME TO analitica_sesiones;
ALTER TABLE public.analytics_events   RENAME TO analitica_eventos;

ALTER SEQUENCE public.order_seq RENAME TO venta_seq;

-- =============================================================================
-- 2. RENOMBRAR COLUMNAS
-- =============================================================================

-- equipos (ex products)
ALTER TABLE public.equipos RENAME COLUMN model       TO modelo;
ALTER TABLE public.equipos RENAME COLUMN capacity    TO capacidad;
ALTER TABLE public.equipos RENAME COLUMN price       TO precio;
ALTER TABLE public.equipos RENAME COLUMN image_url   TO imagen_url;
ALTER TABLE public.equipos RENAME COLUMN image_path  TO imagen_path;
ALTER TABLE public.equipos RENAME COLUMN status      TO estado;
ALTER TABLE public.equipos RENAME COLUMN device_type TO tipo_dispositivo;
ALTER TABLE public.equipos RENAME COLUMN created_by  TO creado_por;
ALTER TABLE public.equipos RENAME COLUMN created_at  TO creado_en;
ALTER TABLE public.equipos RENAME COLUMN updated_at  TO actualizado_en;
ALTER TABLE public.equipos RENAME COLUMN deleted_at  TO eliminado_en;

-- accesorios (ex catalog_products) — ya usaba columnas en español, solo faltan estas
ALTER TABLE public.accesorios RENAME COLUMN updated_at TO actualizado_en;
ALTER TABLE public.accesorios RENAME COLUMN deleted_at TO eliminado_en;

-- ventas (ex orders)
ALTER TABLE public.ventas RENAME COLUMN order_number       TO numero_venta;
ALTER TABLE public.ventas RENAME COLUMN customer_name      TO cliente_nombre;
ALTER TABLE public.ventas RENAME COLUMN customer_phone     TO cliente_telefono;
ALTER TABLE public.ventas RENAME COLUMN product_id         TO equipo_id;
ALTER TABLE public.ventas RENAME COLUMN catalog_product_id TO accesorio_id;
ALTER TABLE public.ventas RENAME COLUMN total_price        TO precio_total;
ALTER TABLE public.ventas RENAME COLUMN status              TO estado;
ALTER TABLE public.ventas RENAME COLUMN notes                TO notas;
ALTER TABLE public.ventas RENAME COLUMN created_by           TO creado_por;
ALTER TABLE public.ventas RENAME COLUMN created_by_name      TO creado_por_nombre;
ALTER TABLE public.ventas RENAME COLUMN created_at           TO creado_en;
ALTER TABLE public.ventas RENAME COLUMN deleted_at           TO eliminado_en;

-- perfiles (ex profiles)
ALTER TABLE public.perfiles RENAME COLUMN full_name  TO nombre_completo;
ALTER TABLE public.perfiles RENAME COLUMN role        TO rol;
ALTER TABLE public.perfiles RENAME COLUMN email       TO correo;
ALTER TABLE public.perfiles RENAME COLUMN is_active   TO activo;
ALTER TABLE public.perfiles RENAME COLUMN created_by  TO creado_por;
ALTER TABLE public.perfiles RENAME COLUMN created_at  TO creado_en;
ALTER TABLE public.perfiles RENAME COLUMN updated_at  TO actualizado_en;
ALTER TABLE public.perfiles RENAME COLUMN deleted_at  TO eliminado_en;

-- configuracion (ex settings)
ALTER TABLE public.configuracion RENAME COLUMN contact_phone    TO telefono_contacto;
ALTER TABLE public.configuracion RENAME COLUMN whatsapp_message TO mensaje_whatsapp;
ALTER TABLE public.configuracion RENAME COLUMN updated_at       TO actualizado_en;
ALTER TABLE public.configuracion RENAME COLUMN updated_by       TO actualizado_por;
ALTER TABLE public.configuracion RENAME COLUMN updated_by_email TO actualizado_por_correo;

-- analitica_sesiones (ex analytics_sessions)
ALTER TABLE public.analitica_sesiones RENAME COLUMN session_id   TO id_sesion;
ALTER TABLE public.analitica_sesiones RENAME COLUMN visitor_id   TO id_visitante;
ALTER TABLE public.analitica_sesiones RENAME COLUMN started_at   TO iniciado_en;
ALTER TABLE public.analitica_sesiones RENAME COLUMN last_seen_at TO ultima_actividad_en;
ALTER TABLE public.analitica_sesiones RENAME COLUMN page_views   TO vistas_pagina;
ALTER TABLE public.analitica_sesiones RENAME COLUMN entry_path   TO ruta_entrada;
ALTER TABLE public.analitica_sesiones RENAME COLUMN referrer     TO referente;
ALTER TABLE public.analitica_sesiones RENAME COLUMN device       TO dispositivo;
ALTER TABLE public.analitica_sesiones RENAME COLUMN created_at   TO creado_en;

-- analitica_eventos (ex analytics_events)
ALTER TABLE public.analitica_eventos RENAME COLUMN session_id TO id_sesion;
ALTER TABLE public.analitica_eventos RENAME COLUMN visitor_id TO id_visitante;
ALTER TABLE public.analitica_eventos RENAME COLUMN type       TO tipo;
ALTER TABLE public.analitica_eventos RENAME COLUMN path       TO ruta;
ALTER TABLE public.analitica_eventos RENAME COLUMN created_at TO creado_en;

-- =============================================================================
-- 3. ACTUALIZAR FUNCIONES (mismo nombre, cuerpo con columnas/tablas nuevas)
-- Debe ir ANTES de la sección 4: los triggers BEFORE UPDATE que disparan estas
-- funciones se activan con los UPDATE de la traducción de enums.
-- =============================================================================

-- current_user_is_admin: perfiles/rol
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT rol = 'admin' FROM public.perfiles WHERE id = auth.uid()),
    false
  );
$$;

-- fn_set_updated_at: usado por equipos y perfiles -> actualizado_en
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

-- set_catalog_updated_at: usado por accesorios -> actualizado_en
CREATE OR REPLACE FUNCTION public.set_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

-- fn_generate_order_number: numero_venta / venta_seq, nuevo prefijo #VTA-
CREATE OR REPLACE FUNCTION public.fn_generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_venta IS NULL THEN
    NEW.numero_venta := '#VTA-' || LPAD(nextval('venta_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- handle_new_user: crea fila en perfiles con rol
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.perfiles (id, correo, rol)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN (SELECT COUNT(*) = 0 FROM public.perfiles) THEN 'admin' ELSE 'empleado' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- track_session_start: analitica_sesiones
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
  INSERT INTO analitica_sesiones (id_sesion, id_visitante, ruta_entrada, referente, dispositivo)
  VALUES (
    p_session_id,
    p_visitor_id,
    LEFT(p_path, 300),
    LEFT(p_referrer, 500),
    CASE WHEN p_device IN ('mobile', 'desktop', 'tablet') THEN p_device ELSE NULL END
  )
  ON CONFLICT (id_sesion) DO NOTHING;
END;
$$;

-- track_ping: analitica_sesiones
CREATE OR REPLACE FUNCTION public.track_ping(p_session_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE analitica_sesiones
  SET ultima_actividad_en = now()
  WHERE id_sesion = p_session_id;
END;
$$;

-- track_event: analitica_eventos + analitica_sesiones
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

  INSERT INTO analitica_eventos (id_sesion, id_visitante, tipo, ruta, metadata)
  VALUES (p_session_id, p_visitor_id, p_type, LEFT(p_path, 300), COALESCE(p_metadata, '{}'));

  IF p_type = 'page_view' THEN
    UPDATE analitica_sesiones
    SET ultima_actividad_en = now(),
        vistas_pagina       = vistas_pagina + 1
    WHERE id_sesion = p_session_id;
  ELSE
    UPDATE analitica_sesiones
    SET ultima_actividad_en = now()
    WHERE id_sesion = p_session_id;
  END IF;
END;
$$;

-- get_analytics_summary: analitica_sesiones/analitica_eventos
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH s AS (
    SELECT * FROM analitica_sesiones
    WHERE iniciado_en >= p_from AND iniciado_en <= p_to
  ),
  e AS (
    SELECT * FROM analitica_eventos
    WHERE creado_en >= p_from AND creado_en <= p_to
  )
  SELECT json_build_object(
    'total_visits',         (SELECT count(*) FROM s),
    'unique_visitors',      (SELECT count(DISTINCT id_visitante) FROM s),
    'avg_duration_seconds', (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (ultima_actividad_en - iniciado_en)))), 0) FROM s),
    'bounce_rate',          (SELECT CASE WHEN count(*) = 0 THEN 0
                                    ELSE ROUND(100.0 * count(*) FILTER (WHERE vistas_pagina <= 1) / count(*)) END FROM s),
    'whatsapp_clicks',      (SELECT count(*) FROM e WHERE tipo = 'whatsapp_click'),
    'conversion_rate',      (SELECT CASE WHEN (SELECT count(*) FROM s) = 0 THEN 0
                                    ELSE ROUND(100.0 * (SELECT count(*) FROM e WHERE tipo = 'whatsapp_click')
                                                     / (SELECT count(*) FROM s), 1) END)
  );
$$;

-- get_visits_by_day: analitica_sesiones
CREATE OR REPLACE FUNCTION public.get_visits_by_day(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE(day date, visits bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT iniciado_en::date AS day, count(*) AS visits
  FROM analitica_sesiones
  WHERE iniciado_en >= p_from AND iniciado_en <= p_to
  GROUP BY 1
  ORDER BY 1;
$$;

-- get_top_products: analitica_eventos
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
  FROM analitica_eventos
  WHERE tipo = 'product_view'
    AND creado_en >= p_from AND creado_en <= p_to
  GROUP BY 1
  ORDER BY views DESC
  LIMIT p_limit;
$$;

-- get_storage_stats: sin cambios de fondo (no referencia tablas renombradas)
-- se re-declara igual para dejar constancia explícita en esta migración.
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
-- 4. TRADUCIR VALORES DE ENUMS (CHECK constraints)
-- =============================================================================

-- equipos.estado: available/sold/reserved -> disponible/vendido/reservado
ALTER TABLE public.equipos DROP CONSTRAINT IF EXISTS products_status_check;
UPDATE public.equipos SET estado = CASE estado
  WHEN 'available' THEN 'disponible'
  WHEN 'sold'      THEN 'vendido'
  WHEN 'reserved'  THEN 'reservado'
  ELSE estado
END;
ALTER TABLE public.equipos
  ADD CONSTRAINT equipos_estado_check CHECK (estado IN ('disponible', 'vendido', 'reservado'));

-- equipos.tipo_dispositivo: phone/mac -> telefono/mac
ALTER TABLE public.equipos DROP CONSTRAINT IF EXISTS products_device_type_check;
UPDATE public.equipos SET tipo_dispositivo = CASE tipo_dispositivo
  WHEN 'phone' THEN 'telefono'
  ELSE tipo_dispositivo
END;
ALTER TABLE public.equipos
  ADD CONSTRAINT equipos_tipo_dispositivo_check CHECK (tipo_dispositivo IN ('telefono', 'mac'));

-- ventas.estado: pending/completed/cancelled -> pendiente/completada/cancelada
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE public.ventas SET estado = CASE estado
  WHEN 'pending'   THEN 'pendiente'
  WHEN 'completed' THEN 'completada'
  WHEN 'cancelled' THEN 'cancelada'
  ELSE estado
END;
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_estado_check CHECK (estado IN ('pendiente', 'completada', 'cancelada'));

-- perfiles.rol: admin/employee -> admin/empleado
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.perfiles SET rol = CASE rol
  WHEN 'employee' THEN 'empleado'
  ELSE rol
END;
ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check CHECK (rol IN ('admin', 'empleado'));

-- Nota: catalog_products.categoria y analytics_*.type/device ya usaban valores
-- adecuados (o son técnicos/neutros: 'mobile','desktop','tablet','page_view', etc.)
-- y no se traducen para minimizar el alcance del cambio.

-- =============================================================================
-- 5. RENOMBRAR ÍNDICES (cosmético, para coherencia con las tablas nuevas)
-- =============================================================================

ALTER INDEX IF EXISTS idx_products_status       RENAME TO idx_equipos_estado;
ALTER INDEX IF EXISTS idx_products_deleted_at    RENAME TO idx_equipos_eliminado_en;
ALTER INDEX IF EXISTS idx_products_device_type   RENAME TO idx_equipos_tipo_dispositivo;
ALTER INDEX IF EXISTS idx_products_created_by    RENAME TO idx_equipos_creado_por;

ALTER INDEX IF EXISTS idx_orders_status          RENAME TO idx_ventas_estado;
ALTER INDEX IF EXISTS idx_orders_created_at      RENAME TO idx_ventas_creado_en;
ALTER INDEX IF EXISTS idx_orders_deleted_at      RENAME TO idx_ventas_eliminado_en;
ALTER INDEX IF EXISTS idx_orders_product_id      RENAME TO idx_ventas_equipo_id;
ALTER INDEX IF EXISTS idx_orders_created_by      RENAME TO idx_ventas_creado_por;

ALTER INDEX IF EXISTS idx_catalog_products_activo    RENAME TO idx_accesorios_activo;
ALTER INDEX IF EXISTS idx_catalog_products_categoria RENAME TO idx_accesorios_categoria;
ALTER INDEX IF EXISTS idx_catalog_products_slug      RENAME TO idx_accesorios_slug;

ALTER INDEX IF EXISTS idx_profiles_role       RENAME TO idx_perfiles_rol;
ALTER INDEX IF EXISTS idx_profiles_is_active  RENAME TO idx_perfiles_activo;
ALTER INDEX IF EXISTS idx_profiles_deleted_at RENAME TO idx_perfiles_eliminado_en;

ALTER INDEX IF EXISTS idx_analytics_sessions_started_at RENAME TO idx_analitica_sesiones_iniciado_en;
ALTER INDEX IF EXISTS idx_analytics_sessions_visitor_id RENAME TO idx_analitica_sesiones_id_visitante;
ALTER INDEX IF EXISTS idx_analytics_events_type_created_at RENAME TO idx_analitica_eventos_tipo_creado_en;

-- =============================================================================
-- 6. RENOMBRAR POLÍTICAS RLS (misma lógica, solo el nombre para coherencia)
-- =============================================================================

ALTER POLICY products_anon_read     ON public.equipos RENAME TO equipos_anon_lectura;
ALTER POLICY products_auth_read     ON public.equipos RENAME TO equipos_auth_lectura;
ALTER POLICY products_auth_insert   ON public.equipos RENAME TO equipos_auth_insercion;
ALTER POLICY products_auth_update   ON public.equipos RENAME TO equipos_auth_actualizacion;
ALTER POLICY products_auth_delete   ON public.equipos RENAME TO equipos_auth_eliminacion;

ALTER POLICY orders_auth_read       ON public.ventas RENAME TO ventas_auth_lectura;
ALTER POLICY orders_auth_insert     ON public.ventas RENAME TO ventas_auth_insercion;
ALTER POLICY orders_auth_update     ON public.ventas RENAME TO ventas_auth_actualizacion;
ALTER POLICY orders_auth_delete     ON public.ventas RENAME TO ventas_auth_eliminacion;

ALTER POLICY anon_read_active            ON public.accesorios RENAME TO accesorios_anon_lectura_activos;
ALTER POLICY auth_all                    ON public.accesorios RENAME TO accesorios_auth_todo;
ALTER POLICY catalog_products_auth_all   ON public.accesorios RENAME TO accesorios_auth_lectura;
ALTER POLICY catalog_products_auth_delete ON public.accesorios RENAME TO accesorios_auth_eliminacion;

ALTER POLICY profiles_auth_read     ON public.perfiles RENAME TO perfiles_auth_lectura;
ALTER POLICY profiles_select        ON public.perfiles RENAME TO perfiles_lectura_propia_o_admin;
ALTER POLICY profiles_auth_update   ON public.perfiles RENAME TO perfiles_auth_actualizacion;
ALTER POLICY profiles_update        ON public.perfiles RENAME TO perfiles_actualizacion_admin;
ALTER POLICY profiles_admin_insert  ON public.perfiles RENAME TO perfiles_admin_insercion;
ALTER POLICY profiles_admin_delete  ON public.perfiles RENAME TO perfiles_admin_eliminacion;

ALTER POLICY settings_anon_read     ON public.configuracion RENAME TO configuracion_anon_lectura;
ALTER POLICY settings_auth_read     ON public.configuracion RENAME TO configuracion_auth_lectura;
ALTER POLICY settings_auth_update   ON public.configuracion RENAME TO configuracion_auth_actualizacion;

ALTER POLICY analytics_sessions_auth_read ON public.analitica_sesiones RENAME TO analitica_sesiones_auth_lectura;
ALTER POLICY analytics_events_auth_read   ON public.analitica_eventos  RENAME TO analitica_eventos_auth_lectura;

-- =============================================================================
-- 7. RENOMBRAR TRIGGERS (cosmético, misma función asociada)
-- =============================================================================

ALTER TRIGGER trg_products_updated_at        ON public.equipos       RENAME TO trg_equipos_actualizado_en;
ALTER TRIGGER trg_profiles_updated_at        ON public.perfiles      RENAME TO trg_perfiles_actualizado_en;
ALTER TRIGGER catalog_products_updated_at    ON public.accesorios    RENAME TO trg_accesorios_actualizado_en;
ALTER TRIGGER trg_order_number               ON public.ventas        RENAME TO trg_venta_numero;

COMMIT;
