import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [ready, setReady]         = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase escribe la sesión del token en la URL hash automáticamente
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    // Escuchar el evento de cambio de sesión (token de reset)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      navigate('/admin');
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] p-8 md:p-10 rounded-3xl border border-white/[0.08] w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-2xl font-black text-white">Apple</span>
            <span className="text-2xl font-black bg-white text-zinc-950 px-2 py-0.5 rounded-md">Zone</span>
          </div>
          <div className="w-px h-7 bg-white/10 mb-5" />
          <h2 className="text-xl font-bold tracking-tight text-white">Nueva contraseña</h2>
          <p className="text-sm text-white/40 mt-1">Elige una contraseña segura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Nueva contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-white/40 transition-all text-sm text-white placeholder:text-white/25" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1.5">Confirmar contraseña</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-white/40 transition-all text-sm text-white placeholder:text-white/25" />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-white text-zinc-950 py-4 rounded-xl font-semibold hover:bg-white/90 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />}
            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
