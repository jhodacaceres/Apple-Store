-- ================================================================
-- MIGRACIÓN: settings singleton → append-only (idempotente)
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

DO $$
DECLARE
  v_needs_migration boolean;
BEGIN
  -- Detectar si settings aún usa el esquema viejo (id INTEGER)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'settings'
      AND column_name  = 'id'
      AND udt_name     = 'int4'
  ) INTO v_needs_migration;

  -- Limpiar cualquier intento fallido previo
  DROP TABLE IF EXISTS public.settings_v2;

  IF v_needs_migration THEN
    CREATE TABLE public.settings_v2 (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_phone    TEXT        NOT NULL DEFAULT '68531959',
      whatsapp_message TEXT        NOT NULL DEFAULT 'Hola, me gustaría saber más sobre un equipo.',
      user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO public.settings_v2 (contact_phone, whatsapp_message, created_at)
    SELECT contact_phone, whatsapp_message, updated_at
    FROM public.settings
    WHERE id = 1;

    ALTER TABLE public.settings    RENAME TO settings_old;
    ALTER TABLE public.settings_v2 RENAME TO settings;

    RAISE NOTICE 'Migración completada: settings ahora es append-only con UUID';
  ELSE
    RAISE NOTICE 'Migración ya aplicada, omitiendo';
  END IF;
END $$;

-- Índice, RLS y políticas (idempotentes, seguras de re-ejecutar)
CREATE INDEX IF NOT EXISTS idx_settings_created_at ON public.settings (created_at DESC);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_anon_read"  ON public.settings;
CREATE POLICY "settings_anon_read"  ON public.settings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "settings_auth_read"  ON public.settings;
CREATE POLICY "settings_auth_read"  ON public.settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_auth_update" ON public.settings;
DROP POLICY IF EXISTS "settings_auth_insert" ON public.settings;
CREATE POLICY "settings_auth_insert" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Ejecutar solo tras verificar que todo funciona:
-- DROP TABLE public.settings_old;
