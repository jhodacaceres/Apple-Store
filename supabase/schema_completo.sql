-- =============================================================================
-- Apple Zone — Esquema completo de base de datos
-- Proyecto : Apple Zone
-- Project ID: adgfaakylpwttgiwplfv
-- Región   : sa-east-1 (São Paulo)
-- Generado : 2026-07-22
-- Descripción: Archivo único para recrear tablas, índices, funciones, triggers,
--              políticas RLS, bucket y políticas de Storage — en español,
--              con papelera de productos en tablas de archivo y el backend
--              del chatbot de WhatsApp (conversaciones/mensajes).
--
-- Sobre una base de datos EXISTENTE (con el esquema anterior en inglés),
-- no ejecutar este archivo: aplicar en orden las migraciones incrementales
-- en supabase/migrations/ (20260722000001, 000002, 000003). Este snapshot
-- sirve para levantar una base nueva desde cero.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- 2. SECUENCIAS
-- =============================================================================

-- Usada por fn_generate_order_number() para producir #VTA-1000, #VTA-1001, …
CREATE SEQUENCE IF NOT EXISTS public.venta_seq START 1000;


-- =============================================================================
-- 3. TABLAS
-- Orden respeta dependencias de claves foráneas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- perfiles
-- Una fila por usuario de auth.users.
-- El primer usuario registrado recibe rol='admin' (ver handle_new_user).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo   TEXT,
  rol               TEXT        NOT NULL DEFAULT 'empleado'
                                CHECK (rol IN ('admin', 'empleado')),
  correo            TEXT,
  activo            BOOLEAN     NOT NULL DEFAULT true,
  creado_por        UUID        REFERENCES auth.users(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en      TIMESTAMPTZ,

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- equipos
-- Teléfonos y Macs en inventario. Sin soft-delete: al archivar, la fila se
-- mueve físicamente a equipos_eliminados (ver sección de RPCs).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipos (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  modelo           TEXT        NOT NULL,
  color            TEXT,
  capacidad        TEXT,
  precio           NUMERIC     NOT NULL CHECK (precio >= 0),
  imei             TEXT        UNIQUE,
  imagen_url       TEXT,
  imagen_path      TEXT,
  visible_catalogo BOOLEAN     NOT NULL DEFAULT false,
  estado           TEXT        NOT NULL DEFAULT 'disponible'
                               CHECK (estado IN ('disponible', 'vendido', 'reservado')),
  tipo_dispositivo TEXT        DEFAULT 'telefono'
                               CHECK (tipo_dispositivo IN ('telefono', 'mac')),
  creado_por       UUID        REFERENCES auth.users(id),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

COMMENT ON COLUMN public.equipos.estado IS
  'disponible = en venta, vendido = vendido, reservado = apartado.';

-- -----------------------------------------------------------------------------
-- equipos_eliminados (papelera de equipos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipos_eliminados (
  id               UUID        NOT NULL,
  modelo           TEXT        NOT NULL,
  color            TEXT,
  capacidad        TEXT,
  precio           NUMERIC     NOT NULL,
  imei             TEXT,
  imagen_url       TEXT,
  imagen_path      TEXT,
  visible_catalogo BOOLEAN     NOT NULL DEFAULT false,
  estado           TEXT        NOT NULL
                   CHECK (estado IN ('disponible', 'vendido', 'reservado')),
  tipo_dispositivo TEXT
                   CHECK (tipo_dispositivo IN ('telefono', 'mac')),
  creado_por       UUID,
  creado_en        TIMESTAMPTZ NOT NULL,
  actualizado_en   TIMESTAMPTZ NOT NULL,
  eliminado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_por    UUID        REFERENCES auth.users(id),

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- accesorios
-- Accesorios Apple con gestión de stock. Sin soft-delete (ver accesorios_eliminados).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accesorios (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  sku            TEXT        NOT NULL UNIQUE,
  nombre         TEXT        NOT NULL,
  categoria      TEXT        NOT NULL
                 CHECK (categoria IN ('fundas', 'cargadores', 'cables', 'airpods', 'accesorios')),
  descripcion    TEXT,
  precio         NUMERIC     NOT NULL CHECK (precio >= 0),
  stock          INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  imagen_url     TEXT,
  imagen_path    TEXT,
  slug           TEXT        NOT NULL UNIQUE,
  activo         BOOLEAN     NOT NULL DEFAULT true,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- accesorios_eliminados (papelera de accesorios)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accesorios_eliminados (
  id             UUID        NOT NULL,
  sku            TEXT        NOT NULL,
  nombre         TEXT        NOT NULL,
  categoria      TEXT        NOT NULL
                 CHECK (categoria IN ('fundas', 'cargadores', 'cables', 'airpods', 'accesorios')),
  descripcion    TEXT,
  precio         NUMERIC     NOT NULL,
  stock          INTEGER     NOT NULL DEFAULT 0,
  imagen_url     TEXT,
  imagen_path    TEXT,
  slug           TEXT        NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL,
  eliminado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_por  UUID        REFERENCES auth.users(id),

  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_equipos_eliminados_eliminado_en
  ON public.equipos_eliminados (eliminado_en DESC);
CREATE INDEX IF NOT EXISTS idx_accesorios_eliminados_eliminado_en
  ON public.accesorios_eliminados (eliminado_en DESC);

-- -----------------------------------------------------------------------------
-- ventas
-- Puede referenciar un equipo (teléfono/mac) o un accesorio; ambas FKs son
-- opcionales para soportar ambos flujos. Si el producto referenciado se
-- archiva, la FK pone equipo_id/accesorio_id en NULL (la venta conserva
-- precio_total/notas como registro histórico). Mantiene su propio soft-delete
-- (eliminado_en) con lógica de restauración/conflictos en el frontend.
-- numero_venta generado automáticamente por trigger.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ventas (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  numero_venta       TEXT        UNIQUE,
  cliente_nombre     TEXT        NOT NULL,
  cliente_telefono   TEXT,
  equipo_id          UUID        REFERENCES public.equipos(id) ON DELETE SET NULL,
  accesorio_id       UUID        REFERENCES public.accesorios(id) ON DELETE SET NULL,
  precio_total       NUMERIC     NOT NULL CHECK (precio_total >= 0),
  estado             TEXT        NOT NULL DEFAULT 'completada'
                                 CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
  notas              TEXT,
  creado_por         UUID        REFERENCES auth.users(id),
  creado_por_nombre  TEXT,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en       TIMESTAMPTZ,

  PRIMARY KEY (id)
);

COMMENT ON COLUMN public.ventas.notas IS
  'Notas internas del administrador (no visibles al cliente).';
COMMENT ON COLUMN public.ventas.eliminado_en IS
  'Soft delete: NULL = activa, valor = eliminada lógicamente.';

-- -----------------------------------------------------------------------------
-- configuracion
-- Configuración global. Siempre una única fila (id = 1). Incluye ajustes no
-- sensibles del chatbot de WhatsApp/IA; los secretos van en secrets de Edge
-- Functions (DEEPSEEK_API_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET,
-- WHATSAPP_VERIFY_TOKEN), nunca en esta tabla ni en VITE_*.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracion (
  id                      INTEGER     NOT NULL DEFAULT 1,
  telefono_contacto       TEXT        NOT NULL DEFAULT '68531959',
  mensaje_whatsapp        TEXT        NOT NULL DEFAULT 'Hola, me gustaría saber más sobre un equipo.',
  wa_phone_number_id      TEXT,
  ia_activa_global        BOOLEAN     NOT NULL DEFAULT true,
  ia_modelo               TEXT        NOT NULL DEFAULT 'deepseek-chat',
  ia_prompt_sistema       TEXT        NOT NULL DEFAULT
    'Eres el asistente de ventas de Apple Zone, una tienda de equipos y accesorios Apple en Cochabamba, Bolivia. '
    'Responde de forma breve, cordial y en español. Usa el catálogo vigente que se te proporciona para dar precios '
    'y disponibilidad exactos; nunca inventes precios ni stock. Si el cliente pide hablar con una persona, reporta '
    'un reclamo, o la consulta excede lo que puedes resolver con el catálogo, marca escalar=true y explica el motivo.',
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por         UUID        REFERENCES auth.users(id),
  actualizado_por_correo  TEXT,

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- analitica_sesiones
-- Una fila por visita a la web pública.
-- Duración = ultima_actividad_en - iniciado_en.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analitica_sesiones (
  id_sesion            TEXT        NOT NULL,
  id_visitante         TEXT        NOT NULL,
  iniciado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_actividad_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  vistas_pagina        INTEGER     NOT NULL DEFAULT 1,
  ruta_entrada         TEXT,
  referente            TEXT,
  dispositivo          TEXT        CHECK (dispositivo IN ('mobile', 'desktop', 'tablet')),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id_sesion)
);

COMMENT ON TABLE public.analitica_sesiones IS
  'Una fila por visita. Duración = ultima_actividad_en - iniciado_en.';
COMMENT ON COLUMN public.analitica_sesiones.id_visitante IS
  'ID persistente del navegador para contar visitantes únicos / recurrentes.';

-- -----------------------------------------------------------------------------
-- analitica_eventos
-- Eventos de la web pública. metadata ej: {"source":"home","product":"iPhone 15"}.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analitica_eventos (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  id_sesion  TEXT        REFERENCES public.analitica_sesiones(id_sesion),
  id_visitante TEXT,
  tipo       TEXT        NOT NULL
             CHECK (tipo IN ('page_view', 'whatsapp_click', 'product_view')),
  ruta       TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- conversaciones / mensajes
-- Backend del chatbot de WhatsApp. El webhook (Edge Function) y el envío de
-- mensajes usan SUPABASE_SERVICE_ROLE_KEY (bypass de RLS); el panel admin
-- (authenticated) solo lee y alterna ia_activa / marca leído.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversaciones (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  telefono_cliente   TEXT        NOT NULL UNIQUE,
  nombre_cliente     TEXT,
  ia_activa          BOOLEAN     NOT NULL DEFAULT true,
  requiere_humano    BOOLEAN     NOT NULL DEFAULT false,
  estado             TEXT        NOT NULL DEFAULT 'abierta'
                      CHECK (estado IN ('abierta', 'cerrada')),
  ultimo_mensaje_en  TIMESTAMPTZ,
  no_leidos          INTEGER     NOT NULL DEFAULT 0,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

COMMENT ON COLUMN public.conversaciones.ia_activa IS
  'Si es false, el webhook no genera respuesta automática para esta conversación.';
COMMENT ON COLUMN public.conversaciones.requiere_humano IS
  'La IA lo marca en true cuando decide escalar; se limpia al responder o reactivar la IA.';

CREATE TABLE IF NOT EXISTS public.mensajes (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  conversacion_id  UUID        NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  remitente        TEXT        NOT NULL
                    CHECK (remitente IN ('cliente', 'ia', 'humano', 'sistema')),
  contenido        TEXT        NOT NULL,
  wa_message_id    TEXT,
  estado_entrega   TEXT
                    CHECK (estado_entrega IN ('enviado', 'entregado', 'leido', 'fallido')),
  metadata         JSONB       NOT NULL DEFAULT '{}',
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

COMMENT ON COLUMN public.mensajes.remitente IS
  'cliente = mensaje entrante de WhatsApp; ia = respuesta automática; humano = respuesta manual desde el admin; sistema = notas internas (p.ej. motivo de escalamiento).';


-- =============================================================================
-- 4. ÍNDICES
-- =============================================================================

-- equipos
CREATE INDEX IF NOT EXISTS idx_equipos_estado
  ON public.equipos (estado);
CREATE INDEX IF NOT EXISTS idx_equipos_tipo_dispositivo
  ON public.equipos (tipo_dispositivo);
CREATE INDEX IF NOT EXISTS idx_equipos_creado_por
  ON public.equipos (creado_por);

-- ventas
CREATE INDEX IF NOT EXISTS idx_ventas_estado
  ON public.ventas (estado) WHERE eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_ventas_creado_en
  ON public.ventas (creado_en DESC) WHERE eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_ventas_eliminado_en
  ON public.ventas (eliminado_en);
CREATE INDEX IF NOT EXISTS idx_ventas_equipo_id
  ON public.ventas (equipo_id);
CREATE INDEX IF NOT EXISTS idx_ventas_creado_por
  ON public.ventas (creado_por);

-- accesorios
CREATE INDEX IF NOT EXISTS idx_accesorios_activo
  ON public.accesorios (activo);
CREATE INDEX IF NOT EXISTS idx_accesorios_categoria
  ON public.accesorios (categoria);
CREATE INDEX IF NOT EXISTS idx_accesorios_slug
  ON public.accesorios (slug);

-- perfiles
CREATE INDEX IF NOT EXISTS idx_perfiles_rol
  ON public.perfiles (rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_activo
  ON public.perfiles (activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_eliminado_en
  ON public.perfiles (eliminado_en);

-- analitica_sesiones
CREATE INDEX IF NOT EXISTS idx_analitica_sesiones_iniciado_en
  ON public.analitica_sesiones (iniciado_en DESC);
CREATE INDEX IF NOT EXISTS idx_analitica_sesiones_id_visitante
  ON public.analitica_sesiones (id_visitante);

-- analitica_eventos
CREATE INDEX IF NOT EXISTS idx_analitica_eventos_tipo_creado_en
  ON public.analitica_eventos (tipo, creado_en DESC);

-- conversaciones / mensajes
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_creado_en
  ON public.mensajes (conversacion_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_conversaciones_ultimo_mensaje_en
  ON public.conversaciones (ultimo_mensaje_en DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_requiere_humano
  ON public.conversaciones (requiere_humano) WHERE requiere_humano = true;


-- =============================================================================
-- 5. FUNCIONES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de autenticación
-- -----------------------------------------------------------------------------

-- Verifica rol en el JWT (app_metadata.role). Usada en algunas policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;

-- Verifica rol consultando la tabla perfiles directamente (más fiable).
-- SECURITY DEFINER para que RLS no bloquee la lectura interna.
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

-- -----------------------------------------------------------------------------
-- Funciones de trigger — actualizado_en
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Función de trigger — número de venta automático
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Función de trigger — auto-crear perfil al registrar usuario
-- El primer usuario en registrarse recibe rol='admin'.
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- RPCs de papelera de productos (equipos/accesorios)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.archivar_equipo(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO equipos_eliminados (
    id, modelo, color, capacidad, precio, imei, imagen_url, imagen_path,
    visible_catalogo, estado, tipo_dispositivo, creado_por, creado_en,
    actualizado_en, eliminado_por
  )
  SELECT
    id, modelo, color, capacidad, precio, imei, imagen_url, imagen_path,
    visible_catalogo, estado, tipo_dispositivo, creado_por, creado_en,
    actualizado_en, auth.uid()
  FROM equipos
  WHERE id = p_id;

  DELETE FROM equipos WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurar_equipo(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO equipos (
    id, modelo, color, capacidad, precio, imei, imagen_url, imagen_path,
    visible_catalogo, estado, tipo_dispositivo, creado_por, creado_en, actualizado_en
  )
  SELECT
    id, modelo, color, capacidad, precio, imei, imagen_url, imagen_path,
    visible_catalogo, estado, tipo_dispositivo, creado_por, creado_en, actualizado_en
  FROM equipos_eliminados
  WHERE id = p_id;

  DELETE FROM equipos_eliminados WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_equipo_definitivo(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM equipos_eliminados WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archivar_accesorio(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO accesorios_eliminados (
    id, sku, nombre, categoria, descripcion, precio, stock,
    imagen_url, imagen_path, slug, actualizado_en, eliminado_por
  )
  SELECT
    id, sku, nombre, categoria, descripcion, precio, stock,
    imagen_url, imagen_path, slug, actualizado_en, auth.uid()
  FROM accesorios
  WHERE id = p_id;

  DELETE FROM accesorios WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurar_accesorio(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO accesorios (
    id, sku, nombre, categoria, descripcion, precio, stock,
    imagen_url, imagen_path, slug, actualizado_en
  )
  SELECT
    id, sku, nombre, categoria, descripcion, precio, stock,
    imagen_url, imagen_path, slug, actualizado_en
  FROM accesorios_eliminados
  WHERE id = p_id;

  DELETE FROM accesorios_eliminados WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_accesorio_definitivo(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM accesorios_eliminados WHERE id = p_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger + RPC del chatbot
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_actualizar_conversacion_en_mensaje()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversaciones
  SET ultimo_mensaje_en = NEW.creado_en,
      actualizado_en    = now(),
      no_leidos         = CASE WHEN NEW.remitente = 'cliente' THEN no_leidos + 1 ELSE no_leidos END
  WHERE id = NEW.conversacion_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_conversacion_leida(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.conversaciones SET no_leidos = 0 WHERE id = p_id;
END;
$$;


-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- equipos: actualizar actualizado_en en cada UPDATE
CREATE OR REPLACE TRIGGER trg_equipos_actualizado_en
  BEFORE UPDATE ON public.equipos
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- perfiles: actualizar actualizado_en en cada UPDATE
CREATE OR REPLACE TRIGGER trg_perfiles_actualizado_en
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- accesorios: actualizar actualizado_en en cada UPDATE
CREATE OR REPLACE TRIGGER trg_accesorios_actualizado_en
  BEFORE UPDATE ON public.accesorios
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_updated_at();

-- ventas: generar numero_venta automático en INSERT
CREATE OR REPLACE TRIGGER trg_venta_numero
  BEFORE INSERT ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_order_number();

-- mensajes: propagar el mensaje nuevo a la conversación (último mensaje / no_leidos)
CREATE OR REPLACE TRIGGER trg_mensajes_actualizar_conversacion
  AFTER INSERT ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_conversacion_en_mensaje();

-- auth.users: crear perfil automáticamente al registrar un nuevo usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 7. ROW LEVEL SECURITY — activar en todas las tablas
-- =============================================================================

ALTER TABLE public.equipos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos_eliminados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesorios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesorios_eliminados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analitica_sesiones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analitica_eventos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes             ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 8. POLÍTICAS RLS — schema public
-- =============================================================================

-- -----------------------------------------------------------------------------
-- equipos
-- -----------------------------------------------------------------------------

CREATE POLICY equipos_anon_lectura ON public.equipos
  FOR SELECT TO anon
  USING (estado = 'disponible');

CREATE POLICY equipos_auth_lectura ON public.equipos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY equipos_auth_insercion ON public.equipos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY equipos_auth_actualizacion ON public.equipos
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY equipos_auth_eliminacion ON public.equipos
  FOR DELETE TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- equipos_eliminados / accesorios_eliminados (papelera)
-- Solo lectura directa para authenticated; las mutaciones ocurren vía RPCs
-- SECURITY DEFINER (archivar_*/restaurar_*/eliminar_*_definitivo).
-- -----------------------------------------------------------------------------

CREATE POLICY equipos_eliminados_auth_lectura ON public.equipos_eliminados
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY accesorios_eliminados_auth_lectura ON public.accesorios_eliminados
  FOR SELECT TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- ventas
-- -----------------------------------------------------------------------------

CREATE POLICY ventas_auth_lectura ON public.ventas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ventas_auth_insercion ON public.ventas
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY ventas_auth_actualizacion ON public.ventas
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY ventas_auth_eliminacion ON public.ventas
  FOR DELETE TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- accesorios
-- -----------------------------------------------------------------------------

-- Acceso público: solo accesorios activos
CREATE POLICY accesorios_anon_lectura_activos ON public.accesorios
  FOR SELECT TO anon
  USING (activo = true);

-- Acceso total para autenticados (política principal)
CREATE POLICY accesorios_auth_todo ON public.accesorios
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Políticas adicionales presentes en producción (redundantes con accesorios_auth_todo)
CREATE POLICY accesorios_auth_lectura ON public.accesorios
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY accesorios_auth_eliminacion ON public.accesorios
  FOR DELETE TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- perfiles
-- -----------------------------------------------------------------------------

-- Lectura amplia para autenticados
CREATE POLICY perfiles_auth_lectura ON public.perfiles
  FOR SELECT TO authenticated
  USING (true);

-- Lectura restringida: propio perfil o admin
CREATE POLICY perfiles_lectura_propia_o_admin ON public.perfiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR current_user_is_admin());

-- Actualización: propio perfil o admin (vía is_admin / JWT)
CREATE POLICY perfiles_auth_actualizacion ON public.perfiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id OR is_admin())
  WITH CHECK ((SELECT auth.uid()) = id OR is_admin());

-- Actualización solo admin (vía current_user_is_admin / tabla)
CREATE POLICY perfiles_actualizacion_admin ON public.perfiles
  FOR UPDATE TO authenticated
  USING (current_user_is_admin());

-- Solo admins pueden crear perfiles manualmente
CREATE POLICY perfiles_admin_insercion ON public.perfiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Solo admins pueden eliminar perfiles
CREATE POLICY perfiles_admin_eliminacion ON public.perfiles
  FOR DELETE TO authenticated
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- configuracion
-- -----------------------------------------------------------------------------

CREATE POLICY configuracion_anon_lectura ON public.configuracion
  FOR SELECT TO anon
  USING (true);

CREATE POLICY configuracion_auth_lectura ON public.configuracion
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY configuracion_auth_actualizacion ON public.configuracion
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- analitica_sesiones / analitica_eventos
-- -----------------------------------------------------------------------------

-- Solo lectura para autenticados. Escritura únicamente vía RPCs SECURITY DEFINER.
CREATE POLICY analitica_sesiones_auth_lectura ON public.analitica_sesiones
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY analitica_eventos_auth_lectura ON public.analitica_eventos
  FOR SELECT TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- conversaciones / mensajes
-- Solo el panel admin (authenticated) lee/edita. El webhook y el envío de
-- WhatsApp corren en Edge Functions con SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- -----------------------------------------------------------------------------

CREATE POLICY conversaciones_auth_lectura ON public.conversaciones
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY conversaciones_auth_actualizacion ON public.conversaciones
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY mensajes_auth_lectura ON public.mensajes
  FOR SELECT TO authenticated
  USING (true);


-- =============================================================================
-- 8.5. VISTAS
-- =============================================================================

-- Vista de accesorios activos para consumo público (no formaba parte del
-- snapshot original; se detectó como dependencia real en producción al
-- quitar accesorios.eliminado_en en la migración de papelera de productos).
-- Definición confirmada en producción vía pg_get_viewdef; alias updated_at
-- se conserva tal cual porque algún consumidor externo puede esperarlo.
CREATE OR REPLACE VIEW public.public_catalog_products AS
  SELECT id, sku, nombre, categoria, descripcion, precio, stock, imagen_path,
         imagen_url, slug, activo, actualizado_en AS updated_at
  FROM public.accesorios
  WHERE activo = true;


-- =============================================================================
-- 9. REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accesorios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accesorios_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;


-- =============================================================================
-- 10. STORAGE — bucket y políticas
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
-- 11. DATOS INICIALES
-- =============================================================================

-- Configuración global por defecto (una sola fila, id siempre = 1)
INSERT INTO public.configuracion (id, telefono_contacto, mensaje_whatsapp)
VALUES (1, '68531959', 'Hola, me gustaría saber más sobre un equipo.')
ON CONFLICT (id) DO NOTHING;
