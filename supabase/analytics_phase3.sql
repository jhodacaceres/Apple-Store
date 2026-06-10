-- ============================================================
-- APPLE ZONE — Fase 3: Analítica de visitantes y espacio
-- Ejecutar en Supabase Dashboard → SQL Editor → Run
-- (o vía el MCP de Supabase con apply_migration)
--
-- Crea:
--   · Tablas analytics_sessions y analytics_events
--   · Índices + RLS (lectura solo admin/empleado autenticado)
--   · 3 RPC de escritura para visitantes anónimos (SECURITY DEFINER)
--   · 4 RPC de lectura/agregación para el panel admin
-- ============================================================


-- ============================================================
-- TABLA: analytics_sessions
-- Una fila por visita (sesión de navegación de un visitante).
-- La duración se calcula como (last_seen_at - started_at).
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id   TEXT        PRIMARY KEY,            -- generado en cliente (sessionStorage)
  visitor_id   TEXT        NOT NULL,               -- persistente en cliente (localStorage)
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_views   INT         NOT NULL DEFAULT 1,
  entry_path   TEXT,
  referrer     TEXT,
  device       TEXT        CHECK (device IN ('mobile', 'desktop', 'tablet')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  analytics_sessions IS 'Una fila por visita. Duración = last_seen_at - started_at.';
COMMENT ON COLUMN analytics_sessions.visitor_id IS 'ID persistente del navegador para contar visitantes únicos / recurrentes.';


-- ============================================================
-- TABLA: analytics_events
-- Eventos puntuales: page_view, whatsapp_click, product_view.
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT,
  visitor_id  TEXT,
  type        TEXT        NOT NULL
              CHECK (type IN ('page_view', 'whatsapp_click', 'product_view')),
  path        TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  analytics_events IS 'Eventos de la web pública. metadata ej: {"source":"home","product":"iPhone 15"}.';


-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at
  ON analytics_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id
  ON analytics_sessions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_at
  ON analytics_events (type, created_at DESC);


-- ============================================================
-- ROW LEVEL SECURITY
-- Sin políticas para anon (acceso directo denegado).
-- La escritura anónima entra solo por las RPC SECURITY DEFINER.
-- Lectura: solo usuarios autenticados (admin / empleado).
-- ============================================================
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_sessions_auth_read" ON analytics_sessions;
CREATE POLICY "analytics_sessions_auth_read"
  ON analytics_sessions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "analytics_events_auth_read" ON analytics_events;
CREATE POLICY "analytics_events_auth_read"
  ON analytics_events FOR SELECT TO authenticated
  USING (true);


-- ============================================================
-- RPC DE ESCRITURA (visitante anónimo) — SECURITY DEFINER
-- Cuerpo fijo y acotado: el anónimo no puede leer ni alterar
-- datos arbitrarios, solo disparar estas operaciones.
-- ============================================================

-- Inicia (o ignora si ya existe) una sesión de visita.
CREATE OR REPLACE FUNCTION track_session_start(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_path       TEXT DEFAULT NULL,
  p_referrer   TEXT DEFAULT NULL,
  p_device     TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Heartbeat: mantiene viva la sesión para medir permanencia.
CREATE OR REPLACE FUNCTION track_ping(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE analytics_sessions
  SET last_seen_at = now()
  WHERE session_id = p_session_id;
END;
$$;

-- Inserta un evento. Si es page_view, además bumpea la sesión.
CREATE OR REPLACE FUNCTION track_event(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_type       TEXT,
  p_path       TEXT  DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_type NOT IN ('page_view', 'whatsapp_click', 'product_view') THEN
    RETURN;  -- ignora tipos desconocidos
  END IF;

  INSERT INTO analytics_events (session_id, visitor_id, type, path, metadata)
  VALUES (p_session_id, p_visitor_id, p_type, LEFT(p_path, 300), COALESCE(p_metadata, '{}'::jsonb));

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

REVOKE ALL ON FUNCTION track_session_start(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION track_ping(TEXT)                                 FROM PUBLIC;
REVOKE ALL ON FUNCTION track_event(TEXT, TEXT, TEXT, TEXT, JSONB)       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION track_session_start(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_ping(TEXT)                                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_event(TEXT, TEXT, TEXT, TEXT, JSONB)       TO anon, authenticated;


-- ============================================================
-- RPC DE LECTURA / AGREGACIÓN (solo admin autenticado)
-- ============================================================

-- Resumen de tráfico en un rango de fechas.
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
) RETURNS JSON
LANGUAGE sql SECURITY INVOKER STABLE AS $$
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

-- Visitas agrupadas por día.
CREATE OR REPLACE FUNCTION get_visits_by_day(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
) RETURNS TABLE(day DATE, visits BIGINT)
LANGUAGE sql SECURITY INVOKER STABLE AS $$
  SELECT started_at::date AS day, count(*) AS visits
  FROM analytics_sessions
  WHERE started_at >= p_from AND started_at <= p_to
  GROUP BY 1
  ORDER BY 1;
$$;

-- Productos más vistos.
CREATE OR REPLACE FUNCTION get_top_products(
  p_from  TIMESTAMPTZ,
  p_to    TIMESTAMPTZ,
  p_limit INT DEFAULT 8
) RETURNS TABLE(product TEXT, views BIGINT)
LANGUAGE sql SECURITY INVOKER STABLE AS $$
  SELECT COALESCE(metadata->>'product', '—') AS product, count(*) AS views
  FROM analytics_events
  WHERE type = 'product_view'
    AND created_at >= p_from AND created_at <= p_to
  GROUP BY 1
  ORDER BY views DESC
  LIMIT p_limit;
$$;

-- Espacio usado: Storage (bucket product-images) y base de datos.
-- SECURITY DEFINER para poder leer storage.objects y pg_database_size.
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE
  v_storage_bytes   BIGINT;
  v_storage_objects BIGINT;
  v_db_bytes        BIGINT;
BEGIN
  -- Solo usuarios autenticados (admin / empleado)
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

REVOKE ALL ON FUNCTION get_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ)      FROM PUBLIC;
REVOKE ALL ON FUNCTION get_visits_by_day(TIMESTAMPTZ, TIMESTAMPTZ)          FROM PUBLIC;
REVOKE ALL ON FUNCTION get_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION get_storage_stats()                                 FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ)   TO authenticated;
GRANT EXECUTE ON FUNCTION get_visits_by_day(TIMESTAMPTZ, TIMESTAMPTZ)       TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT)   TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_stats()                              TO authenticated;


-- ============================================================
-- VERIFICACIÓN (opcional)
--   SELECT tablename FROM pg_tables WHERE tablename LIKE 'analytics%';
--   SELECT type, count(*) FROM analytics_events GROUP BY type;
--   SELECT * FROM get_storage_stats();
-- ============================================================
