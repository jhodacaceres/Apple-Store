-- ================================================================
-- MIGRACIÓN: Revertir settings append-only → singleton
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- 1. Eliminar la tabla append-only (UUID)
DROP TABLE IF EXISTS public.settings CASCADE;

-- 2. Renombrar settings_old → settings
ALTER TABLE public.settings_old RENAME TO settings;

-- 3. Restaurar RLS y políticas
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_anon_read"   ON public.settings;
CREATE POLICY "settings_anon_read"   ON public.settings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "settings_auth_read"   ON public.settings;
CREATE POLICY "settings_auth_read"   ON public.settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_auth_update" ON public.settings;
CREATE POLICY "settings_auth_update" ON public.settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
