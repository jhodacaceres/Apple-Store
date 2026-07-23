-- =============================================================================
-- Apple Zone — Migración: backend del chatbot de WhatsApp (conversaciones/mensajes)
-- Crea las tablas que consume la interfaz de Chats del admin y las Edge
-- Functions whatsapp-webhook / whatsapp-send. Requiere haber aplicado antes
-- 20260722000001_rename_a_espanol.sql y 20260722000002_papelera_productos.sql.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. TABLAS
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_creado_en
  ON public.mensajes (conversacion_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_conversaciones_ultimo_mensaje_en
  ON public.conversaciones (ultimo_mensaje_en DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_requiere_humano
  ON public.conversaciones (requiere_humano) WHERE requiere_humano = true;

-- =============================================================================
-- 2. TRIGGER — actualizar la conversación al llegar un mensaje nuevo
-- =============================================================================

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

CREATE OR REPLACE TRIGGER trg_mensajes_actualizar_conversacion
  AFTER INSERT ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_conversacion_en_mensaje();

-- =============================================================================
-- 3. RPC — marcar conversación como leída (limpia el badge de no_leidos)
-- =============================================================================

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
-- 4. RLS — solo el panel admin (authenticated) lee/edita.
--    El webhook y el envío de WhatsApp corren en Edge Functions con
--    SUPABASE_SERVICE_ROLE_KEY, que ignora RLS (mismo patrón que
--    admin-create-user / admin-delete-user).
-- =============================================================================

ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes       ENABLE ROW LEVEL SECURITY;

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
-- 5. REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;

-- =============================================================================
-- 6. CONFIGURACIÓN DEL CHATBOT (valores no sensibles; los secretos van en
--    secrets de Edge Functions, nunca aquí ni en VITE_*)
-- =============================================================================

ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS wa_phone_number_id TEXT;
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS ia_activa_global   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS ia_modelo          TEXT    NOT NULL DEFAULT 'deepseek-chat';
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS ia_prompt_sistema  TEXT    NOT NULL DEFAULT
  'Eres el asistente de ventas de Apple Zone, una tienda de equipos y accesorios Apple en Cochabamba, Bolivia. '
  'Responde de forma breve, cordial y en español. Usa el catálogo vigente que se te proporciona para dar precios '
  'y disponibilidad exactos; nunca inventes precios ni stock. Si el cliente pide hablar con una persona, reporta '
  'un reclamo, o la consulta excede lo que puedes resolver con el catálogo, marca escalar=true y explica el motivo.';

COMMIT;
