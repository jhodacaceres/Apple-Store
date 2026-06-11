import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FloppyDisk, Phone, Moon, Sun, Info, BookOpen, CheckCircle,
  Users, Plus, X, Trash, ArrowCounterClockwise, Shield, ShieldSlash, Key, SignOut,
} from '@phosphor-icons/react';
import { useSettings } from '../../hooks/useSettings';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminTheme } from '../../contexts/AdminThemeContext';
import type { Profile } from '../../lib/types';

interface SettingsProps {
  contactPhone: string;
  setContactPhone: (val: string) => void;
  whatsappMessage: string;
  setWhatsappMessage: (val: string) => void;
}

type SettingsTab = 'general' | 'users';

// ── Modal crear usuario ──────────────────────────────────────
function CreateUserModal({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (opts: { email: string; password: string; full_name?: string; is_admin?: boolean }) => Promise<{ error?: string }>;
}) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [isAdmin, setIsAdmin]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    const result = await onCreate({ email, password, full_name: fullName || undefined, is_admin: isAdmin });
    setSaving(false);
    if (result.error) { setErr(result.error); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="font-black text-lg text-[#0A0A0A]">Nuevo usuario</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Ana García" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0A0A0A]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@applezone.bo" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0A0A0A]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Contraseña *</label>
            <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0A0A0A]" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="w-4 h-4 accent-black" />
            <label htmlFor="is_admin" className="text-sm text-gray-600 cursor-pointer">Otorgar permisos de administrador</label>
          </div>
          {err && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila de usuario ──────────────────────────────────────────
function UserRow({
  u, currentUserId, onSoftDelete, onRestore, onHardDelete, onToggleAdmin, onResetPassword,
}: {
  u: Profile;
  currentUserId: string;
  onSoftDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onHardDelete: (id: string) => void;
  onToggleAdmin: (id: string, val: boolean) => void;
  onResetPassword: (email: string) => void;
}) {
  const isSelf     = u.id === currentUserId;
  const isInactive = !u.is_active;
  const initials   = (u.full_name ?? u.email ?? u.id).slice(0, 2).toUpperCase();

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
      isInactive ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-gray-200'
    }`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${
        isInactive ? 'bg-gray-200 text-gray-400' : 'bg-[#0A0A0A] text-white'
      }`}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-[#0A0A0A] truncate">{u.full_name ?? '—'}</p>
          {u.role === 'admin' && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Admin</span>
          )}
          {isInactive && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactivo</span>
          )}
          {isSelf && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">Tú</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{u.email}</p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Enviar reset de contraseña */}
        <button onClick={() => u.email && onResetPassword(u.email)} title="Enviar reset de contraseña"
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-blue-500">
          <Key className="w-4 h-4" />
        </button>

        {/* Promover/Degradar admin — no se puede degradar a sí mismo */}
        {!isSelf && (
          <button onClick={() => onToggleAdmin(u.id, u.role !== 'admin')}
            title={u.role === 'admin' ? 'Quitar permisos de admin' : 'Hacer admin'}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-amber-500">
            {u.role === 'admin' ? <ShieldSlash className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </button>
        )}

        {/* Activar / Desactivar — no se puede hacer a sí mismo */}
        {!isSelf && !isInactive && (
          <button onClick={() => onSoftDelete(u.id)} title="Desactivar cuenta"
            className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500">
            <Trash className="w-4 h-4" />
          </button>
        )}
        {!isSelf && isInactive && (
          <>
            <button onClick={() => onRestore(u.id)} title="Restaurar cuenta"
              className="p-2 hover:bg-emerald-50 rounded-xl transition-colors text-gray-400 hover:text-emerald-600">
              <ArrowCounterClockwise className="w-4 h-4" />
            </button>
            <button onClick={() => onHardDelete(u.id)} title="Eliminar definitivamente"
              className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-700">
              <Trash className="w-4 h-4 text-red-400" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function Settings({
  contactPhone, setContactPhone,
  whatsappMessage, setWhatsappMessage,
}: SettingsProps) {
  const { settings, saveSettings } = useSettings();
  const { user, profile, signOut } = useAuth();
  const { isAdminDarkMode, setIsAdminDarkMode } = useAdminTheme();
  const navigate = useNavigate();
  const { users, loading: loadingUsers, loadUsers, softDeleteUser, restoreUser, hardDeleteUser, createUser, setAdminRole, sendPasswordReset } = useUsers();

  const [phone, setPhone]         = useState(contactPhone);
  const [message, setMessage]     = useState(whatsappMessage);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [tab, setTab]             = useState<SettingsTab>('general');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmHardDelete, setConfirmHardDelete] = useState<Profile | null>(null);
  const [confirmResetEmail, setConfirmResetEmail] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (settings) { setPhone(settings.contact_phone); setMessage(settings.whatsapp_message); }
  }, [settings]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, loadUsers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const err = await saveSettings(phone, message, user?.id, user?.email);
    setSaving(false);
    if (!err) {
      setContactPhone(phone);
      setWhatsappMessage(message);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleResetPassword = async (email: string) => {
    const err = await sendPasswordReset(email);
    if (!err) { setResetSent(email); setTimeout(() => setResetSent(''), 4000); }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSoftDelete  = async (id: string) => { await softDeleteUser(id); };
  const handleRestore     = async (id: string) => { await restoreUser(id); };
  const handleHardDelete  = async () => {
    if (!confirmHardDelete) return;
    await hardDeleteUser(confirmHardDelete.id);
    setConfirmHardDelete(null);
  };
  const handleToggleAdmin = async (id: string, val: boolean) => {
    await setAdminRole(id, val);
    setActionMsg(val ? 'Usuario promovido a admin.' : 'Permisos de admin eliminados.');
    setTimeout(() => setActionMsg(''), 3000);
  };

  const inputClass = isAdminDarkMode
    ? 'bg-gray-700 border-gray-600 text-white focus:border-white/50'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#0A0A0A] focus:ring-2 focus:ring-black/5';

  const isAdmin = profile?.role === 'admin';

  return (
    <div className={`space-y-6 max-w-4xl ${isAdminDarkMode ? 'text-white' : 'text-[#1C1C1E]'}`}>
      <div>
        <h2 className="text-2xl md:text-3xl font-black">Configuración del Sistema</h2>
        <p className="mt-1 text-sm text-gray-400">Ajusta la apariencia del panel y los datos públicos de la tienda.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {([
          { key: 'general', label: 'General' },
          ...(isAdmin ? [{ key: 'users', label: 'Usuarios' }] : []),
        ] as { key: SettingsTab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === key
                ? isAdminDarkMode ? 'bg-zinc-700 text-white' : 'bg-[#0A0A0A] text-white'
                : isAdminDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB GENERAL ── */}
      {tab === 'general' && (
        <form onSubmit={handleSave}
          className={`rounded-2xl border shadow-sm overflow-hidden ${isAdminDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="p-6 sm:p-8 space-y-0">

            {/* Apariencia */}
            <div className="py-6">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                {isAdminDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Apariencia del Panel
              </h3>
              <div className={`flex items-center justify-between p-4 rounded-xl border ${isAdminDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <div>
                  <p className="font-semibold text-sm">Modo Oscuro</p>
                  <p className="text-xs mt-0.5 text-gray-400">Aplica solo para las pantallas de administración.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${isAdminDarkMode ? 'text-white/60' : 'text-gray-400'}`}>
                    {isAdminDarkMode ? 'Activado' : 'Desactivado'}
                  </span>
                  <button type="button" onClick={() => setIsAdminDarkMode(!isAdminDarkMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${isAdminDarkMode ? 'bg-zinc-600' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isAdminDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`h-px ${isAdminDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />

            {/* Contacto */}
            <div className="py-6">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4" />Contacto Público
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-400">Número de WhatsApp</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="68531359"
                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium ${inputClass}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-400">Mensaje predeterminado</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium resize-none ${inputClass}`} />
                  <p className={`text-right text-xs mt-1 ${isAdminDarkMode ? 'text-gray-500' : 'text-gray-300'}`}>{message.length} caracteres</p>
                </div>
              </div>
            </div>

            <div className={`h-px ${isAdminDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />

            {/* Recuperar contraseña propia */}
            <div className="py-6">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <Key className="w-4 h-4" />Seguridad
              </h3>
              <div className={`flex items-center justify-between p-4 rounded-xl border ${isAdminDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <div>
                  <p className="font-semibold text-sm">Restablecer contraseña</p>
                  <p className="text-xs mt-0.5 text-gray-400">Recibirás un enlace en {user?.email}</p>
                </div>
                <button type="button"
                  onClick={() => user?.email && setConfirmResetEmail(user.email)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isAdminDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  {resetSent === user?.email ? '✓ Enviado' : 'Enviar enlace'}
                </button>
              </div>
            </div>

            <div className={`h-px ${isAdminDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />

            {/* Cerrar sesión */}
            <div className="py-6">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <SignOut className="w-4 h-4" />Sesión
              </h3>
              <div className={`flex items-center justify-between p-4 rounded-xl border ${isAdminDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <div>
                  <p className="font-semibold text-sm">Cerrar sesión</p>
                  <p className="text-xs mt-0.5 text-gray-400">{user?.email}</p>
                </div>
                <button type="button" onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-red-50 border border-red-200 hover:bg-red-100 text-red-600">
                  Cerrar sesión
                </button>
              </div>
            </div>

            <div className={`h-px ${isAdminDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />

            {/* Instrucciones */}
            <div className="py-6">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4" />Instrucciones Básicas
              </h3>
              <div className={`p-4 rounded-xl border space-y-3 text-sm ${isAdminDarkMode ? 'bg-gray-700/30 border-gray-600 text-gray-300' : 'bg-[#0A0A0A]/[0.03] border-gray-100 text-gray-600'}`}>
                {[
                  ['Inventario', 'Agrega iPhones, edita precios o elimina equipos.'],
                  ['Ventas', 'Registra cada venta. El equipo se marca automáticamente como vendido.'],
                  ['Cerrar Sesión', 'Ve a Configuración → sección "Sesión" y haz clic en "Cerrar sesión".'],
                  ['Restablecimiento de contraseña', 'Supabase permite enviar máximo 2 correos por hora por dirección. Si el enlace no llega, espera antes de reenviar.'],
                ].map(([title, desc]) => (
                  <p key={title} className="flex gap-2 items-start">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <span><strong>{title}:</strong> {desc}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className={`h-px ${isAdminDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />

            <div className="pt-6 flex items-center justify-between">
              {saved ? (
                <span className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Configuración guardada
                </span>
              ) : settings?.updated_at ? (
                <span className="text-xs text-gray-400">
                  Última actualización:{' '}
                  {new Date(settings.updated_at).toLocaleDateString('es-BO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
              ) : <span />}
              <button type="submit" disabled={saving}
                className={`px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-60 ${
                  isAdminDarkMode ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-[#0A0A0A] text-white hover:bg-gray-800'
                }`}>
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                {saving ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB USUARIOS ── */}
      {tab === 'users' && isAdmin && (
        <div className="space-y-4">
          {showCreateModal && (
            <CreateUserModal
              onClose={() => setShowCreateModal(false)}
              onCreate={async (opts) => {
                const result = await createUser(opts);
                if (!result.error) await loadUsers();
                return result;
              }}
            />
          )}

          {confirmHardDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
                <h3 className="font-black text-lg mb-2 text-[#0A0A0A]">Eliminar definitivamente</h3>
                <p className="text-sm text-gray-400 mb-2">{confirmHardDelete.email}</p>
                <p className="text-xs text-red-400 mb-6">Esta acción es irreversible. El usuario perderá acceso permanentemente.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmHardDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
                  <button onClick={handleHardDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Eliminar</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-4 h-4" />Gestión de Usuarios
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all">
              <Plus className="w-4 h-4" />Nuevo usuario
            </button>
          </div>

          {actionMsg && (
            <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />{actionMsg}
            </p>
          )}
          {resetSent && (
            <p className="text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              Enlace de recuperación enviado a {resetSent}
            </p>
          )}

          {loadingUsers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <UserRow key={u.id}
                  u={u}
                  currentUserId={user?.id ?? ''}
                  onSoftDelete={handleSoftDelete}
                  onRestore={handleRestore}
                  onHardDelete={(id) => setConfirmHardDelete(users.find(x => x.id === id) ?? null)}
                  onToggleAdmin={handleToggleAdmin}
                  onResetPassword={(email) => setConfirmResetEmail(email)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal confirmación reset — disponible en ambas pestañas */}
      {confirmResetEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Key className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-black text-lg mb-2 text-[#0A0A0A]">Enviar enlace de restablecimiento</h3>
            <p className="text-sm text-gray-400 mb-3">{confirmResetEmail}</p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-6">
              Supabase limita el envío a 2 correos por hora. Confirma solo si es necesario.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmResetEmail(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={() => { handleResetPassword(confirmResetEmail); setConfirmResetEmail(null); }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                Confirmar envío
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
