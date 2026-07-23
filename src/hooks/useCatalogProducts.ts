import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Accesorio } from '../lib/types';

export function useCatalogProducts() {
  const [products, setProducts] = useState<Accesorio[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('accesorios')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .order('nombre')
      .then(({ data, error: err }) => {
        if (!isMounted) return;
        if (err) setError(err.message);
        else if (data) setProducts(data as Accesorio[]);
        setLoading(false);
      });

    // Suscripción Realtime: actualiza stock sin recargar la página
    const channel = supabase
      .channel('accesorios_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accesorios' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Accesorio;
            setProducts((prev) =>
              updated.activo
                ? prev.map((p) => (p.id === updated.id ? updated : p))
                : prev.filter((p) => p.id !== updated.id),
            );
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Accesorio;
            if (inserted.activo) {
              setProducts((prev) => [...prev, inserted]);
            }
          } else if (payload.eventType === 'DELETE') {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading, error };
}
