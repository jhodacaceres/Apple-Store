import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Conversacion } from '../lib/types';

function byUltimoMensaje(a: Conversacion, b: Conversacion): number {
  const ta = a.ultimo_mensaje_en ? new Date(a.ultimo_mensaje_en).getTime() : 0;
  const tb = b.ultimo_mensaje_en ? new Date(b.ultimo_mensaje_en).getTime() : 0;
  return tb - ta;
}

export function useConversaciones() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  // Nombre único por instancia: AdminLayout (badge) y Chats.tsx montan este
  // hook a la vez, y Supabase Realtime no permite dos suscripciones al mismo
  // nombre de canal en simultáneo.
  const channelNameRef = useRef(`conversaciones_realtime_${crypto.randomUUID()}`);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('conversaciones')
      .select('*')
      .order('ultimo_mensaje_en', { ascending: false, nullsFirst: false });
    setConversaciones((data ?? []) as Conversacion[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('conversaciones')
      .select('*')
      .order('ultimo_mensaje_en', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (!isMounted) return;
        setConversaciones((data ?? []) as Conversacion[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversaciones' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Conversacion;
            setConversaciones((prev) => [inserted, ...prev].sort(byUltimoMensaje));
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Conversacion;
            setConversaciones((prev) =>
              prev.some((c) => c.id === updated.id)
                ? prev.map((c) => (c.id === updated.id ? updated : c)).sort(byUltimoMensaje)
                : [updated, ...prev].sort(byUltimoMensaje),
            );
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setConversaciones((prev) => prev.filter((c) => c.id !== id));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleIA = useCallback(async (id: string, activa: boolean) => {
    const { error: err } = await supabase
      .from('conversaciones')
      .update(activa ? { ia_activa: true, requiere_humano: false } : { ia_activa: false })
      .eq('id', id);
    return err;
  }, []);

  const marcarLeida = useCallback(async (id: string) => {
    const { error: err } = await supabase.rpc('marcar_conversacion_leida', { p_id: id });
    return err;
  }, []);

  return { conversaciones, loading, toggleIA, marcarLeida, reload: load };
}
