import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Perfil } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  profile: Perfil | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error || !mounted) return;
      if (data) {
        if (data.activo === false) {
          await supabase.auth.signOut();
          if (mounted) setProfile(null);
          return;
        }
        if (mounted) setProfile(data as Perfil);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      if (mounted) setUser(u);

      // INITIAL_SESSION siempre dispara una vez al inicio (con o sin sesión).
      // Es el momento correcto para marcar loading=false: el estado auth ya está resuelto.
      if (event === 'INITIAL_SESSION') {
        if (mounted) setLoading(false);
      }

      if (u) {
        // Diferido con setTimeout: saca loadProfile del lock interno de supabase-js
        // y evita el deadlock del LockManager al llamar supabase.from() desde aquí.
        setTimeout(() => { if (mounted) loadProfile(u.id); }, 0);
      } else if (mounted) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
