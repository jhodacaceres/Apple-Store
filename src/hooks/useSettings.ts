import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AppSettings } from '../lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as AppSettings);
        setLoading(false);
      });
  }, []);

  const saveSettings = useCallback(async (
    phone: string,
    message: string,
    userId?: string,
    userEmail?: string,
  ) => {
    const { data, error } = await supabase
      .from('settings')
      .update({ contact_phone: phone, whatsapp_message: message, updated_by: userId ?? null, updated_by_email: userEmail ?? null })
      .eq('id', 1)
      .select()
      .single();
    if (!error && data) setSettings(data as AppSettings);
    return error;
  }, []);

  return { settings, loading, saveSettings };
}
