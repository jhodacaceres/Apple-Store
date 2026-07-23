# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

- `npm run dev` — servidor de desarrollo (Vite).
- `npm run build` — `tsc -b && vite build` (el build falla si hay errores de tipos).
- `npm run lint` — ESLint sobre todo el repo.
- `npm run preview` — sirve el build de producción localmente.
- No hay test runner configurado (no hay Jest/Vitest ni scripts de test).
- No hay alias de importación (`@/...`): todas las importaciones son relativas. `tsconfig.app.json` tiene `noUnusedLocals`/`noUnusedParameters` activos — el build falla por variables/imports sin usar.

## Arquitectura

SPA de e-commerce ("Apple Zone", venta de equipos y accesorios Apple en Bolivia) con **React 19 + Vite 8 + TypeScript 6 + Tailwind 4**, backend **Supabase** (Postgres + Auth + Storage + Edge Functions). No hay servidor propio: toda la lógica de servidor vive en funciones/RPCs de Postgres y en Edge Functions de Supabase (`supabase/functions/`).

### Capas de la app (`src/`)

- `pages/` — vistas de rutas (públicas: `Home`, `Catalog`, `ProductDetail`, `Contact`, `Login`, `ResetPassword`, `PrivacyPolicy`, `TermsOfService`; admin: `pages/admin/*`).
- `pages/admin/` — panel protegido por `ProtectedRoute` bajo `/admin/*`, montado dentro de `AdminLayout` (sidebar + `<Outlet/>`, ver `App.tsx`). Páginas: `Dashboard`, `Inventory`, `Sales`, `Metrics`, `Chats`, `Settings`.
- `hooks/` — toda la obtención/mutación de datos de Supabase vive aquí (`useProducts`, `useOrders`, `useCatalogAdmin`, `useCatalogProducts`, `useUsers`, `useSettings`, `useAnalytics`, `useAnalyticsTracker`, `useConversaciones`, `useMensajes`). Las páginas no llaman a `supabase` directamente salvo casos puntuales. Nota de nomenclatura: `useProducts`/`useOrders`/`useCatalogAdmin`/`useCatalogProducts` operan sobre las tablas `equipos`/`ventas`/`accesorios` (los nombres de los hooks se mantuvieron para no romper imports, pero ya no coinciden literalmente con los nombres de tabla).
- `contexts/` — `AuthContext` (sesión + perfil de Supabase Auth) y `AdminThemeContext` (modo oscuro del admin, ver abajo).
- `lib/` — `supabase.ts` (cliente único), `types.ts` (interfaces espejo del esquema DB), `analytics.ts` (tracking propio de visitas), `whatsapp.ts` (helpers de enlaces `wa.me`), `cache.ts` (cache de listas en `localStorage` con TTL), `storage.ts`.
- `components/` — compartidos entre público y admin (`Navbar`, `Footer`, `Pagination`, `SearchableSelect`, `DateRangeModal`, `OrderModal`, `WhatsAppIcon`, etc.).

### Capa de datos (Supabase)

- Esquema canónico: **`supabase/schema_completo.sql`** (snapshot completo para levantar una BD nueva desde cero). Los cambios incrementales sobre una BD existente viven en **`supabase/migrations/`** (`20260722000001_rename_a_espanol.sql`, `20260722000002_papelera_productos.sql`, `20260722000003_chatbot_whatsapp.sql`) — aplicar en ese orden.
- **Todo el esquema está en español**: `equipos` (celulares/Macs), `equipos_eliminados` (papelera), `accesorios`, `accesorios_eliminados` (papelera), `ventas`, `perfiles`, `configuracion` (fila única `id=1`), `analitica_sesiones`, `analitica_eventos`, `conversaciones`, `mensajes`. Los nombres de RPCs y de columnas de las funciones de analítica (`track_session_start`, `get_analytics_summary`, etc.) se mantuvieron sin traducir para no romper las llamadas del frontend — solo se tradujo su implementación interna.
- **Papelera de productos** (no soft-delete): `equipos` y `accesorios` **no tienen** columna de eliminación — solo contienen datos vigentes, para que cualquier consumidor (incluida la IA del chatbot) no necesite filtrar eliminados. Archivar mueve la fila físicamente a `equipos_eliminados`/`accesorios_eliminados` vía las RPCs `archivar_equipo`/`archivar_accesorio` (`SECURITY DEFINER`); restaurar usa `restaurar_equipo`/`restaurar_accesorio`; borrado físico de la papelera usa `eliminar_equipo_definitivo`/`eliminar_accesorio_definitivo`. `ventas.equipo_id`/`ventas.accesorio_id` tienen `ON DELETE SET NULL`, así que una venta histórica sobrevive al archivado de su producto.
- **`ventas` y `perfiles` sí conservan soft-delete** con `eliminado_en TIMESTAMPTZ` (NULL = vigente), igual que antes: `.is('eliminado_en', null)` para activos, `.not('eliminado_en', 'is', null)` para la papelera, `UPDATE` en vez de `DELETE` salvo las funciones `hardDelete*`.
- **RPCs de analítica** (`supabase.rpc(...)`, sin cambios de nombre): `track_session_start`, `track_ping`, `track_event` (escritura anónima `SECURITY DEFINER`, fire-and-forget desde `lib/analytics.ts`); `get_analytics_summary`, `get_visits_by_day`, `get_top_products`, `get_storage_stats` (lectura autenticada, `useAnalytics.ts`).
- **RPC del chatbot**: `marcar_conversacion_leida(p_id)` limpia `conversaciones.no_leidos`.
- **Edge Functions** (`supabase/functions/`, Deno; helpers compartidos en `_shared/`):
  - `admin-create-user`, `admin-delete-user` — validan que el llamador sea admin (`perfiles.rol`).
  - `whatsapp-webhook` — GET responde el verify challenge de Meta; POST valida la firma `X-Hub-Signature-256` (`_shared/whatsapp-api.ts`), registra al cliente y su mensaje en `conversaciones`/`mensajes`, y si `configuracion.ia_activa_global` y `conversaciones.ia_activa` están en `true`, llama a DeepSeek (`_shared/deepseek.ts`) con el catálogo vigente (`equipos`/`accesorios`) y el historial reciente. Si la IA decide `escalar`, apaga `ia_activa`, prende `requiere_humano` e inserta un mensaje `sistema` — **no** envía respuesta automática. Si no escala, envía la respuesta por WhatsApp Cloud API y la guarda como mensaje `ia`.
  - `whatsapp-send` — invocada por el admin (`supabase.functions.invoke`) para responder manualmente; envía por WhatsApp Cloud API, guarda el mensaje como `humano`, y apaga `ia_activa`/`requiere_humano` de esa conversación.
  - Secrets requeridos (Supabase → Edge Functions, nunca en `.env`/`VITE_*`): `DEEPSEEK_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (además de `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, ya presentes por defecto).
- Variables de entorno del frontend: solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (`.env`, no versionado). Cualquier secreto va **solo** en secrets de Edge Functions — nunca en `VITE_*`, que termina en el bundle público.
- El número de WhatsApp, el mensaje prefijado y los ajustes no sensibles del chatbot (`wa_phone_number_id`, `ia_activa_global`, `ia_modelo`, `ia_prompt_sistema`) se guardan en `configuracion` y se editan desde Ajustes del admin (`admin/Settings.tsx`, sección "Chatbot de WhatsApp (IA)", solo visible para `rol='admin'`).

### Patrón de tiempo real (Supabase Realtime)

Todo canal sigue: `supabase.channel(nombre).on('postgres_changes', { event: '*', schema: 'public', table: '...' }, cb).subscribe()`, con cleanup `supabase.removeChannel(channel)` en el `return` del `useEffect`. Dos variantes conviven:
- **Patrón A (reducer local)** — el hook aplica el payload de INSERT/UPDATE/DELETE directamente al estado, sin refetch. Ejemplo: `useOrders.ts` (mueve entre `orders`/`deletedOrders` según `deleted_at`), `useProducts.ts`, `useCatalogProducts.ts`.
- **Patrón B (refetch on change)** — la página se suscribe y llama a `reload()` del hook ante cualquier cambio. Ejemplo: `admin/Sales.tsx`, `admin/Inventory.tsx`, `Home.tsx`, `Catalog.tsx`.

Para features nuevas sobre datos que cambian con frecuencia (listas), preferir el patrón A.

### Modo oscuro del admin

`AdminThemeContext` expone `isAdminDarkMode` (persistido en `localStorage['admin-dark-mode']`). **No se usa la clase `dark:` de Tailwind** — cada componente del admin lee `const dark = isAdminDarkMode` y aplica clases condicionales a mano (`dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'`). Este patrón manual debe replicarse en cualquier página nueva del admin; los componentes públicos (`SearchableSelect`, etc.) no todos lo soportan.

### Convenciones de UI recurrentes (admin)

Clases repetidas a reutilizar en vez de reinventar: tarjeta (`cardClass`/`panelClass` en `Dashboard.tsx`/`Metrics.tsx`), campo dark-aware (`FIELD`/`fieldClass(dark)` en `Sales.tsx`/`Inventory.tsx`), tabla (`thClass`/`trClass`/`tdClass`), tabs (botones `rounded-xl` con estado activo `bg-[#0A0A0A]`/`bg-zinc-700`), modal (`fixed inset-0 z-50 ... bg-black/40 backdrop-blur-sm` + caja `rounded-3xl shadow-2xl`), avatar de iniciales (`getInitials()` en `AdminLayout.tsx`), spinner (`border-2 border-white border-t-transparent rounded-full animate-spin`), `Pagination` y `EmptyState` (definido inline en `Metrics.tsx`).

### Chatbot de WhatsApp (`admin/Chats.tsx`)

Interfaz de mensajería en `/admin/chats` (hooks `useConversaciones`/`useMensajes`, patrón realtime A): lista de conversaciones a la izquierda (avatar, no leídos, alerta si `requiere_humano`) y el hilo a la derecha (burbujas `cliente`/`ia`/`humano`/`sistema`) con un input para responder como humano. El toggle de IA por conversación llama directamente `conversaciones.ia_activa` desde el cliente (RLS ya restringe a `authenticated`); enviar un mensaje humano pasa por la Edge Function `whatsapp-send` (necesita `service_role` para llamar a la Cloud API). El sidebar (`AdminLayout.tsx`) muestra un badge rojo con la cantidad de conversaciones en `requiere_humano`.

Nota: el sitio público sigue usando además enlaces `wa.me` de "click-to-chat" (`lib/whatsapp.ts`, `pages/Contact.tsx`) para pedidos desde el catálogo — son dos vías independientes hacia WhatsApp, no reemplaza una a la otra.

### Pendiente de aplicar por el usuario (fuera del alcance de esta sesión)

Este refactor quedó escrito en el repo pero **no aplicado** contra la base de datos en producción (el MCP de Supabase no estaba autorizado en la sesión que lo generó): aplicar en orden las migraciones de `supabase/migrations/`, desplegar las Edge Functions (`admin-create-user`, `admin-delete-user`, `whatsapp-webhook`, `whatsapp-send`), configurar los 4 secrets del chatbot, y registrar la URL de `whatsapp-webhook` + el Verify Token en la app de Meta.
