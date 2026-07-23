-- =============================================================================
-- Apple Zone — Migración: papelera de productos (equipos y accesorios)
-- Los eliminados dejan de convivir en la tabla vigente (columna eliminado_en)
-- y pasan a tablas de archivo dedicadas. Así, cualquier consulta directa a
-- `equipos`/`accesorios` (incluida la que hará la IA del chatbot) solo ve
-- datos vigentes, sin necesidad de filtrar eliminado_en.
-- Ventas y perfiles NO se tocan: conservan su soft-delete actual (eliminado_en).
-- Requiere haber aplicado 20260722000001_rename_a_espanol.sql antes.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. TABLAS DE ARCHIVO
-- =============================================================================

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

-- =============================================================================
-- 2. AJUSTAR FKs DE ventas PARA SOPORTAR EL ARCHIVADO FÍSICO
-- (los nombres de constraint originales no cambian con ALTER TABLE RENAME,
--  siguen siendo los auto-generados en la creación original de `orders`)
-- =============================================================================

ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS orders_product_id_fkey;
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_equipo_id_fkey
  FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE SET NULL;

ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS orders_catalog_product_id_fkey;
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_accesorio_id_fkey
  FOREIGN KEY (accesorio_id) REFERENCES public.accesorios(id) ON DELETE SET NULL;

-- =============================================================================
-- 3. QUITAR EL SOFT-DELETE DE LAS TABLAS VIGENTES
-- =============================================================================

DROP POLICY IF EXISTS equipos_anon_lectura ON public.equipos;
CREATE POLICY equipos_anon_lectura ON public.equipos
  FOR SELECT TO anon
  USING (estado = 'disponible');

DROP POLICY IF EXISTS accesorios_anon_lectura_activos ON public.accesorios;
CREATE POLICY accesorios_anon_lectura_activos ON public.accesorios
  FOR SELECT TO anon
  USING (activo = true);

-- La vista public_catalog_products (creada fuera de este esquema versionado,
-- no estaba en el snapshot schema_completo.sql) depende de accesorios.eliminado_en.
-- Definición original confirmada en producción vía pg_get_viewdef:
--   SELECT id, sku, nombre, categoria, descripcion, precio, stock, imagen_path,
--          imagen_url, slug, activo, actualizado_en AS updated_at
--   FROM accesorios WHERE activo = true AND eliminado_en IS NULL;
-- Se recrea igual, quitando solo "AND eliminado_en IS NULL" (columna eliminada;
-- accesorios ya solo contiene filas vigentes tras el archivado).
DROP VIEW IF EXISTS public.public_catalog_products;

ALTER TABLE public.equipos    DROP COLUMN IF EXISTS eliminado_en;
ALTER TABLE public.accesorios DROP COLUMN IF EXISTS eliminado_en;

CREATE VIEW public.public_catalog_products AS
  SELECT id, sku, nombre, categoria, descripcion, precio, stock, imagen_path,
         imagen_url, slug, activo, actualizado_en AS updated_at
  FROM public.accesorios
  WHERE activo = true;

-- =============================================================================
-- 4. RPCs DE ARCHIVADO / RESTAURACIÓN / ELIMINACIÓN DEFINITIVA
-- =============================================================================

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

-- =============================================================================
-- 5. RLS DE LAS TABLAS DE ARCHIVO (solo lectura para authenticated;
--    las escrituras solo ocurren a través de las RPCs SECURITY DEFINER)
-- =============================================================================

ALTER TABLE public.equipos_eliminados    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesorios_eliminados ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipos_eliminados_auth_lectura ON public.equipos_eliminados
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY accesorios_eliminados_auth_lectura ON public.accesorios_eliminados
  FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- 6. REALTIME (para que la pestaña de papelera se actualice en vivo)
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.equipos_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accesorios_eliminados;

COMMIT;
