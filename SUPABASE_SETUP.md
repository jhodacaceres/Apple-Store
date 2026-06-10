# Apple Zone — Configuración de Base de Datos Supabase

## Instrucciones

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral haz clic en **SQL Editor**
4. Copia TODO el bloque SQL de abajo y pégalo en el editor
5. Haz clic en **Run** (o Ctrl+Enter)
6. Listo — las tablas, políticas e índices quedarán creados

> **Nota sobre soft deletes:** Los registros nunca se eliminan físicamente.
> Al "borrar" un producto o una venta, se marca con `deleted_at = ahora()`.
> Los datos quedan en la base de datos para auditoría y recuperación futura.

---

## Paso 2 — Usuario administrador

El SQL de abajo ya incluye la creación del primer admin. **Antes de ejecutarlo**, busca este bloque al final y cambia el email y la contraseña:

```sql
'admin@applezone.bo'        -- ← pon tu email real
'CambiaTuContraseña123!'    -- ← pon tu contraseña real (mínimo 8 caracteres)
```

> Para crear **admins adicionales** en el futuro: ir a Supabase Dashboard → **Authentication → Users → Add user**.

---

## Paso 3 — Variables de entorno

En el archivo `.env` de tu proyecto pon:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Encuentra estos valores en **Settings → API** de tu proyecto Supabase.

---

## SQL completo — Copiar y pegar

```sql
-- ============================================================
-- APPLE ZONE — Schema completo con Soft Deletes
-- Versión: 2.1
-- Supabase SQL Editor → Run
-- Nota: gen_random_uuid() es nativo en PostgreSQL 13+
--       No se necesita instalar ninguna extensión.
-- ============================================================


-- ============================================================
-- TABLA: products

-- Inventario de iPhones. Los registros nunca se borran:
-- se marca deleted_at cuando el admin los "elimina".
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  model       TEXT          NOT NULL,
  color       TEXT,
  capacity    TEXT,
  price       NUMERIC(10,2) NOT NULL    CHECK (price >= 0),
  imei        TEXT          UNIQUE,
  image_url   TEXT,
  status      TEXT          NOT NULL    DEFAULT 'available'
              CHECK (status IN ('available', 'sold', 'reserved')),
  created_at  TIMESTAMPTZ   NOT NULL    DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL    DEFAULT now(),
  deleted_at  TIMESTAMPTZ               DEFAULT NULL  -- soft delete
);

COMMENT ON COLUMN products.deleted_at IS
  'Soft delete: NULL = activo, valor = eliminado lógicamente.';
COMMENT ON COLUMN products.status IS
  'available = en venta, sold = vendido, reserved = apartado.';


-- ============================================================
-- TABLA: orders
-- Historial de ventas. Soft delete con deleted_at.
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number   TEXT          UNIQUE,
  customer_name  TEXT          NOT NULL,
  customer_phone TEXT,
  product_id     UUID          REFERENCES products(id) ON DELETE SET NULL,
  total_price    NUMERIC(10,2) NOT NULL    CHECK (total_price >= 0),
  status         TEXT          NOT NULL    DEFAULT 'completed'
                 CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL    DEFAULT now(),
  deleted_at     TIMESTAMPTZ               DEFAULT NULL  -- soft delete
);

COMMENT ON COLUMN orders.deleted_at IS
  'Soft delete: NULL = activo, valor = eliminado lógicamente.';
COMMENT ON COLUMN orders.notes IS
  'Notas internas del administrador (no visibles al cliente).';


-- ============================================================
-- TABLA: settings
-- Configuración global de la tienda (fila única id = 1).
-- No necesita soft delete: es configuración, no historial.
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER     PRIMARY KEY DEFAULT 1,
  contact_phone    TEXT        NOT NULL DEFAULT '68531959',
  whatsapp_message TEXT        NOT NULL DEFAULT 'Hola, me gustaría saber más sobre un equipo.',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertar fila inicial si no existe
INSERT INTO settings (id, contact_phone, whatsapp_message, updated_at)
VALUES (1, '68531959', 'Hola, me gustaría saber más sobre un equipo.', now())
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ÍNDICES (rendimiento en queries frecuentes)
-- ============================================================

-- Products: búsqueda por estado (catálogo público y admin)
CREATE INDEX IF NOT EXISTS idx_products_status
  ON products (status)
  WHERE deleted_at IS NULL;

-- Products: columna de soft delete (para queries de auditoría)
CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON products (deleted_at);

-- Orders: ordenar por fecha (historial de ventas)
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC)
  WHERE deleted_at IS NULL;

-- Orders: filtrar por estado
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders (status)
  WHERE deleted_at IS NULL;

-- Orders: FK a products (JOIN para traer info del equipo)
CREATE INDEX IF NOT EXISTS idx_orders_product_id
  ON orders (product_id);

-- Orders: columna de soft delete
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at
  ON orders (deleted_at);


-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Función: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger: updated_at en products
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();


-- Secuencia para numeración de órdenes
CREATE SEQUENCE IF NOT EXISTS order_seq START 1000 INCREMENT 1;

-- Función: auto-generar número de orden (#ORD-1000, #ORD-1001, …)
CREATE OR REPLACE FUNCTION fn_generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := '#ORD-' || LPAD(nextval('order_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: número de orden al crear
DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_generate_order_number();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Controla qué puede ver/hacer cada rol.
-- anon    = visitante sin sesión
-- authenticated = admin con sesión activa
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;


-- ── Products ────────────────────────────────────────────────

-- Visitantes: solo ven productos disponibles y no eliminados
DROP POLICY IF EXISTS "products_anon_read"    ON products;
CREATE POLICY "products_anon_read"
  ON products FOR SELECT TO anon
  USING (status = 'available' AND deleted_at IS NULL);

-- Admin: lee todos los no eliminados
DROP POLICY IF EXISTS "products_auth_read"    ON products;
CREATE POLICY "products_auth_read"
  ON products FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Admin: puede insertar nuevos productos
DROP POLICY IF EXISTS "products_auth_insert"  ON products;
CREATE POLICY "products_auth_insert"
  ON products FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin: puede actualizar (incluye el soft-delete que pone deleted_at)
DROP POLICY IF EXISTS "products_auth_update"  ON products;
CREATE POLICY "products_auth_update"
  ON products FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── Orders ──────────────────────────────────────────────────

-- Admin: lee órdenes no eliminadas
DROP POLICY IF EXISTS "orders_auth_read"      ON orders;
CREATE POLICY "orders_auth_read"
  ON orders FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Admin: puede insertar nuevas órdenes
DROP POLICY IF EXISTS "orders_auth_insert"    ON orders;
CREATE POLICY "orders_auth_insert"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin: puede actualizar (incluye el soft-delete)
DROP POLICY IF EXISTS "orders_auth_update"    ON orders;
CREATE POLICY "orders_auth_update"
  ON orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── Settings ────────────────────────────────────────────────

-- Visitantes: pueden leer la configuración (para contact_phone y message)
DROP POLICY IF EXISTS "settings_anon_read"    ON settings;
CREATE POLICY "settings_anon_read"
  ON settings FOR SELECT TO anon
  USING (true);

-- Admin: puede leer
DROP POLICY IF EXISTS "settings_auth_read"    ON settings;
CREATE POLICY "settings_auth_read"
  ON settings FOR SELECT TO authenticated
  USING (true);

-- Admin: puede actualizar
DROP POLICY IF EXISTS "settings_auth_update"  ON settings;
CREATE POLICY "settings_auth_update"
  ON settings FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- CREAR PRIMER USUARIO ADMINISTRADOR
-- ⚠️  CAMBIA el email y la contraseña antes de ejecutar ⚠️
-- ============================================================
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  admin_email TEXT := 'admin@applezone.bo';      -- ← cambia esto
  admin_pass  TEXT := 'CambiaTuContraseña123!';  -- ← cambia esto
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    admin_email,
    extensions.crypt(admin_pass, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(), '', '', '', ''
  );

  -- La identidad es requerida por Supabase Auth para login con email/password
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data, last_sign_in_at,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    admin_email,
    'email',
    json_build_object('sub', new_user_id::text, 'email', admin_email),
    now(), now(), now()
  );
END;
$$;


-- ============================================================
-- DATOS DE EJEMPLO (opcional — eliminar en producción)
-- ============================================================

-- Descomentar para insertar productos de muestra:
/*
INSERT INTO products (model, color, capacity, price, status) VALUES
  ('iPhone 15 Pro',  'Natural Titanium', '256GB', 999.00,  'available'),
  ('iPhone 15',      'Blue',             '128GB', 799.00,  'available'),
  ('iPhone 14 Pro',  'Space Black',      '256GB', 1099.00, 'available'),
  ('iPhone 13',      'Starlight',        '128GB', 699.00,  'available');
*/


-- ============================================================
-- VERIFICACIÓN (opcional)
-- ============================================================
-- Después de ejecutar puedes correr estas queries para confirmar:
--
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
--   SELECT * FROM products;
--   SELECT * FROM orders;
--   SELECT * FROM settings;
--   SELECT email, created_at FROM auth.users;
--
-- ============================================================
```

---

## Estructura de tablas creadas

### `products`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria (auto-generada) |
| `model` | TEXT | Nombre del modelo (ej: "iPhone 15 Pro") |
| `color` | TEXT | Color del equipo |
| `capacity` | TEXT | Almacenamiento (ej: "256GB") |
| `price` | NUMERIC | Precio en USD |
| `imei` | TEXT | IMEI único del equipo |
| `image_url` | TEXT | URL de la imagen |
| `status` | TEXT | `available` / `sold` / `reserved` |
| `created_at` | TIMESTAMPTZ | Fecha de alta |
| `updated_at` | TIMESTAMPTZ | Última modificación (auto) |
| `deleted_at` | TIMESTAMPTZ | **Soft delete** — `NULL` = activo |

### `orders`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `order_number` | TEXT | Número de venta (ej: `#ORD-1000`, auto-generado) |
| `customer_name` | TEXT | Nombre del cliente |
| `customer_phone` | TEXT | Teléfono del cliente |
| `product_id` | UUID | FK a `products.id` |
| `total_price` | NUMERIC | Precio de la venta |
| `status` | TEXT | `pending` / `completed` / `cancelled` |
| `notes` | TEXT | Notas internas del admin |
| `created_at` | TIMESTAMPTZ | Fecha de la venta |
| `deleted_at` | TIMESTAMPTZ | **Soft delete** — `NULL` = activo |

### `settings`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER | Siempre `1` (fila única) |
| `contact_phone` | TEXT | Número de WhatsApp visible en /contact |
| `whatsapp_message` | TEXT | Mensaje predeterminado |
| `updated_at` | TIMESTAMPTZ | Última modificación |

---

## Políticas de seguridad (RLS)

| Tabla | Rol | Operación | Condición |
|---|---|---|---|
| `products` | `anon` | SELECT | `status = 'available' AND deleted_at IS NULL` |
| `products` | `authenticated` | SELECT | `deleted_at IS NULL` |
| `products` | `authenticated` | INSERT / UPDATE | sin restricción |
| `orders` | `authenticated` | SELECT | `deleted_at IS NULL` |
| `orders` | `authenticated` | INSERT / UPDATE | sin restricción |
| `settings` | `anon` | SELECT | sin restricción |
| `settings` | `authenticated` | SELECT / UPDATE | sin restricción |

---

## Fase 2 — Sistema de usuarios multi-rol

Esta fase añade soporte para múltiples empleados con roles diferenciados (`admin` / `employee`).

**Ejecutar en el SQL Editor de Supabase en dos pasos, en orden.**

### Bloque A — Schema (ejecutar primero)

```sql
-- ============================================================
-- APPLE ZONE — Fase 2: Sistema de usuarios multi-rol
-- Ejecutar en Supabase Dashboard → SQL Editor → Run
-- ============================================================


-- ── TABLA: profiles ─────────────────────────────────────────
-- Extiende auth.users con nombre y rol.
-- 1 fila por usuario. Se elimina en cascada si el usuario es borrado.

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'employee'
              CHECK (role IN ('admin', 'employee')),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

COMMENT ON TABLE  profiles           IS 'Perfil extendido de cada usuario. 1 fila por auth.user.';
COMMENT ON COLUMN profiles.role      IS 'admin = puede crear usuarios; employee = gestiona inventario y ventas.';
COMMENT ON COLUMN profiles.created_by IS 'UUID del admin que creó esta cuenta.';


-- ── Trigger: updated_at en profiles ─────────────────────────

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();   -- función ya existe del Bloque 1


-- ── COLUMNAS: created_by en products y orders ───────────────
-- Registra qué empleado creó cada producto u orden.

ALTER TABLE products ADD COLUMN IF NOT EXISTS
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_by   ON orders   (created_by);


-- ── FUNCIÓN: is_admin() ──────────────────────────────────────
-- Devuelve TRUE si el JWT del usuario actual tiene role=admin
-- en app_metadata (no en user_metadata, que es editable por el usuario).

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;


-- ── RLS: profiles ────────────────────────────────────────────

-- Cualquier empleado autenticado puede ver todos los perfiles
DROP POLICY IF EXISTS "profiles_auth_read" ON profiles;
CREATE POLICY "profiles_auth_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede insertar perfiles (crear nuevos usuarios desde la app)
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
CREATE POLICY "profiles_admin_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Cada usuario puede editar su propio perfil; admin puede editar cualquiera
DROP POLICY IF EXISTS "profiles_auth_update" ON profiles;
CREATE POLICY "profiles_auth_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING  ((select auth.uid()) = id OR is_admin())
  WITH CHECK ((select auth.uid()) = id OR is_admin());

-- Solo admin puede eliminar perfiles
DROP POLICY IF EXISTS "profiles_admin_delete" ON profiles;
CREATE POLICY "profiles_admin_delete"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());


-- ── Verificación opcional ────────────────────────────────────
-- Ejecutar después para confirmar:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
```

---

### Bloque B — Bootstrap del admin existente (ejecutar segundo)

> ⚠️ **Cambia el email** en las dos líneas marcadas antes de ejecutar.

```sql
-- ============================================================
-- APPLE ZONE — Bootstrap: asignar rol admin al usuario existente
-- Cambiar 'admin@applezone.bo' por el email real antes de ejecutar
-- ============================================================


-- 1. Añadir role=admin al app_metadata del usuario existente
--    (se hace merge: no borra los campos que ya tiene)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@applezone.bo';          -- ← CAMBIA ESTO


-- 2. Crear su fila en profiles (si no existe ya)
INSERT INTO profiles (id, full_name, role, created_by)
SELECT id, 'Administrador', 'admin', id
FROM auth.users
WHERE email = 'admin@applezone.bo'           -- ← CAMBIA ESTO
ON CONFLICT (id) DO NOTHING;


-- 3. Verificar resultado
SELECT
  u.email,
  u.raw_app_meta_data -> 'role' AS rol_en_jwt,
  p.full_name,
  p.role AS rol_en_profiles
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id;
```

> **Importante:** Después de ejecutar el Bloque B, el usuario admin debe **cerrar sesión y volver a iniciar sesión** para que el token JWT refleje el nuevo `app_metadata.role = "admin"`.

---

## Políticas de seguridad — Resumen actualizado (Fase 1 + Fase 2)

| Tabla | Rol | Operación | Condición |
|---|---|---|---|
| `profiles` | `authenticated` | SELECT | cualquier empleado |
| `profiles` | `authenticated` | INSERT | solo `is_admin()` |
| `profiles` | `authenticated` | UPDATE | propio perfil o `is_admin()` |
| `profiles` | `authenticated` | DELETE | solo `is_admin()` |
| `products` | `anon` | SELECT | `status = 'available' AND deleted_at IS NULL` |
| `products` | `authenticated` | SELECT | `deleted_at IS NULL` |
| `products` | `authenticated` | INSERT / UPDATE | cualquier empleado |
| `orders` | `authenticated` | SELECT / INSERT / UPDATE | cualquier empleado |
| `settings` | `anon` | SELECT | sin restricción |
| `settings` | `authenticated` | SELECT / UPDATE | cualquier empleado |

---

## Fase 3 — Analítica de visitantes y espacio

Habilita la sección **Métricas** del panel admin: visitas, tiempo de permanencia,
clics de WhatsApp, productos más vistos, tasa de conversión/rebote y uso de espacio
(Storage + base de datos).

**Ejecutar una sola vez** el archivo `supabase/analytics_phase3.sql`:

1. Abre **Supabase Dashboard → SQL Editor**.
2. Copia y pega TODO el contenido de `supabase/analytics_phase3.sql`.
3. Haz clic en **Run**.

> Alternativa: aplicarlo con el MCP de Supabase (`apply_migration`).

### Qué crea

- **Tablas:** `analytics_sessions` (una fila por visita; duración = `last_seen_at - started_at`)
  y `analytics_events` (eventos `page_view` / `whatsapp_click` / `product_view`).
- **RPC de escritura** (anon, `SECURITY DEFINER`, cuerpo acotado): `track_session_start`,
  `track_ping`, `track_event`. El visitante anónimo solo dispara estas operaciones; no lee datos.
- **RPC de lectura** (solo `authenticated`): `get_analytics_summary`, `get_visits_by_day`,
  `get_top_products`, `get_storage_stats`.

### Políticas (Fase 3)

| Tabla / Función | Rol | Operación | Condición |
|---|---|---|---|
| `analytics_sessions` / `analytics_events` | `authenticated` | SELECT | sin restricción (admin/empleado) |
| `analytics_sessions` / `analytics_events` | `anon` | INSERT/UPDATE | **denegado** (solo vía RPC) |
| `track_*` (escritura) | `anon`, `authenticated` | EXECUTE | sí |
| `get_*` (lectura/espacio) | `authenticated` | EXECUTE | sí |

> El medidor de espacio asume el **plan Free** (1 GB Storage, 500 MB base de datos).
> Si cambias de plan, ajusta `STORAGE_LIMIT_BYTES` / `DB_LIMIT_BYTES` en `src/pages/admin/Metrics.tsx`.
