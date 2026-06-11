import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AppSettings } from '../lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data, error: err }) => {
        if (!isMounted) return;
        if (err) setError(err.message);
        else if (data) setSettings(data as AppSettings);
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const saveSettings = useCallback(async (
    phone: string,
    message: string,
    userId?: string,
    userEmail?: string,
  ) => {
    const { data, error: err } = await supabase
      .from('settings')
      .update({ contact_phone: phone, whatsapp_message: message, updated_by: userId ?? null, updated_by_email: userEmail ?? null })
      .eq('id', 1)
      .select()
      .single();
    if (!err && data) setSettings(data as AppSettings);
    return err;
  }, []);

  return { settings, loading, error, saveSettings };
}
