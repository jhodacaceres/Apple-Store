import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Configuracion } from '../lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<Configuracion | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from('configuracion')
      .select('*')
      .single()
      .then(({ data, error: err }) => {
        if (!isMounted) return;
        if (err) setError(err.message);
        else if (data) setSettings(data as Configuracion);
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
      .from('configuracion')
      .update({
        telefono_contacto: phone,
        mensaje_whatsapp: message,
        actualizado_por: userId ?? null,
        actualizado_por_correo: userEmail ?? null,
      })
      .eq('id', 1)
      .select()
      .single();
    if (!err && data) setSettings(data as Configuracion);
    return err;
  }, []);

  const saveChatbotSettings = useCallback(async (input: {
    wa_phone_number_id?: string | null;
    ia_activa_global?: boolean;
    ia_modelo?: string;
    ia_prompt_sistema?: string;
  }) => {
    const { data, error: err } = await supabase
      .from('configuracion')
      .update(input)
      .eq('id', 1)
      .select()
      .single();
    if (!err && data) setSettings(data as Configuracion);
    return err;
  }, []);

  return { settings, loading, error, saveSettings, saveChatbotSettings };
}
