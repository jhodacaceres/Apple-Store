import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Mensaje } from '../lib/types';

export function useMensajes(conversacionId: string | null) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    if (!conversacionId) {
      setMensajes([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversacionId)
      .order('creado_en', { ascending: true })
      .then(({ data }) => {
        if (!isMounted) return;
        setMensajes((data ?? []) as Mensaje[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`mensajes_realtime_${conversacionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${conversacionId}` },
        (payload) => {
          if (!isMounted) return;
          const inserted = payload.new as Mensaje;
          setMensajes((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversacionId]);

  const enviarComoHumano = useCallback(async (contenido: string) => {
    if (!conversacionId || !contenido.trim()) return { error: 'Mensaje vacío' };
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setSending(false); return { error: 'Sin sesión' }; }

    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: { conversacion_id: conversacionId, contenido },
      headers: { Authorization: `Bearer ${token}` },
    });
    setSending(false);
    if (error) {
      try {
        const body = await (error as any).context?.json?.();
        return { error: body?.error ?? error.message ?? 'Error al enviar el mensaje' };
      } catch { return { error: error.message ?? 'Error al enviar el mensaje' }; }
    }
    return { data };
  }, [conversacionId]);

  return { mensajes, loading, sending, enviarComoHumano };
}
