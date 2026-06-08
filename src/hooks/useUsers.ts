import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';


export function useUsers() {
  const [users, setUsers]   = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (err) setError(err.message);
    else setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }, []);

  const softDeleteUser = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (!err) setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false, deleted_at: new Date().toISOString() } : u));
    return err;
  }, []);

  const restoreUser = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: true, deleted_at: null })
      .eq('id', id);
    if (!err) setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: true, deleted_at: null } : u));
    return err;
  }, []);

  const hardDeleteUser = useCallback(async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return new Error('Sin sesión');

    const res = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: id },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.error) {
      try {
        const body = await (res.error as any).context?.json?.();
        return body?.error ? new Error(body.error) : res.error;
      } catch { return res.error; }
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    return null;
  }, []);

  const createUser = useCallback(async (opts: {
    email: string; password: string; full_name?: string; is_admin?: boolean;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { error: 'Sin sesión' };

    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: opts,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) {
      try {
        const body = await (error as any).context?.json?.();
        return { error: body?.error ?? error.message ?? 'Error al crear usuario' };
      } catch { return { error: error.message ?? 'Error al crear usuario' }; }
    }
    return { data };
  }, []);

  const setAdminRole = useCallback(async (id: string, isAdmin: boolean) => {
    const newRole: Profile['role'] = isAdmin ? 'admin' : 'employee';
    const { error: err } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);
    if (!err) setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    return err;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return err;
  }, []);

  return { users, loading, error, loadUsers, softDeleteUser, restoreUser, hardDeleteUser, createUser, setAdminRole, sendPasswordReset };
}
