-- Migración: Completar perfiles de usuario + auditoría en settings
-- Basada en el estado real de la BD (verificado 2026-06-05)
--
-- Estado actual en Supabase:
--   profiles: EXISTS (id, full_name, role, created_by, created_at, updated_at)
--   settings: EXISTS (id, contact_phone, whatsapp_message, updated_at)
--   products.device_type: NO EXISTE
--
-- Ejecutar en Supabase → SQL Editor

-- ──────────────────────────────────────────────────────────
-- 1. Agregar columnas faltantes a profiles (tabla ya existe)
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Poblar email desde auth.users para los perfiles ya existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ──────────────────────────────────────────────────────────
-- 2. Agregar auditoría directamente a la tabla settings
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by_email TEXT;

-- ──────────────────────────────────────────────────────────
-- 3. Función helper SECURITY DEFINER (evita recursión en RLS)
--    Usa la columna 'role' ya existente ('admin' | 'employee')
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ──────────────────────────────────────────────────────────
-- 4. Trigger: auto-crea perfil cuando Supabase Auth crea usuario
--    El primer usuario se convierte en admin automáticamente
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_is_active  ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- ──────────────────────────────────────────────────────────
-- 5. RLS: profiles (sin recursión gracias a current_user_is_admin)
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.current_user_is_admin());

-- ──────────────────────────────────────────────────────────
-- 6. products.device_type (aún no existía en la BD)
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'phone'
    CHECK (device_type IN ('phone', 'mac'));

CREATE INDEX IF NOT EXISTS idx_products_device_type ON public.products(device_type);

UPDATE public.products SET device_type = 'phone' WHERE device_type IS NULL;
