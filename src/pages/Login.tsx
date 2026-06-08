import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'forgot';

export default function Login() {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } else {
      navigate('/admin');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError('No se pudo enviar el correo. Verifica el email.');
    } else {
      setInfo('Revisa tu correo. Recibirás un enlace para restablecer tu contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] p-8 md:p-10 rounded-3xl border border-white/[0.08] w-full max-w-md animate-fade-in-up">

        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-2xl font-black text-white">Apple</span>
            <span className="text-2xl font-black bg-white text-zinc-950 px-2 py-0.5 rounded-md">Zone</span>
          </div>
          <div className="w-px h-7 bg-white/10 mb-5" />
          <h2 className="text-xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Acceso de Empleados' : 'Restablecer contraseña'}
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {mode === 'login' ? 'Gestiona tu tienda de iPhones' : 'Te enviaremos un enlace por correo'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1.5">Correo Electrónico</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@applezone.bo"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/5 transition-all text-sm text-white placeholder:text-white/25" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1.5">Contraseña</label>
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/5 transition-all text-sm text-white placeholder:text-white/25" />
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
            )}
            <button type="submit" disabled={loading}
              className="group relative overflow-hidden w-full bg-white text-zinc-950 py-4 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 text-sm mt-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-950/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />}
                {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
              </span>
            </button>
            <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
              className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors pt-1">
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1.5">Correo Electrónico</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@applezone.bo"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/5 transition-all text-sm text-white placeholder:text-white/25" />
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
            )}
            {info && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">{info}</p>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-white text-zinc-950 py-4 rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />}
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors pt-1">
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
