import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Equipo, EquipoEliminado } from '../lib/types';

type ProductInput = Omit<Equipo, 'id' | 'creado_en' | 'actualizado_en'>;

export function useProducts(deviceType: 'telefono' | 'mac' = 'telefono') {
  const [products, setProducts]               = useState<Equipo[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<EquipoEliminado[]>([]);
  const [loading, setLoading]                 = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('equipos')
      .select('*')
      .eq('tipo_dispositivo', deviceType)
      .order('creado_en', { ascending: false });
    if (!err) setProducts((data ?? []) as Equipo[]);
    setLoading(false);
  }, [deviceType]);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('equipos')
      .select('*')
      .eq('tipo_dispositivo', deviceType)
      .order('creado_en', { ascending: false })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) setProducts(data as Equipo[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`equipos_realtime_${deviceType}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipos' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Equipo;
            if (inserted.tipo_dispositivo === deviceType) {
              setProducts((prev) => [inserted, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Equipo;
            if (updated.tipo_dispositivo !== deviceType) return;
            setProducts((prev) =>
              prev.some((p) => p.id === updated.id)
                ? prev.map((p) => (p.id === updated.id ? updated : p))
                : [updated, ...prev],
            );
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setProducts((prev) => prev.filter((p) => p.id !== id));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [deviceType]);

  const loadDeletedProducts = useCallback(async () => {
    const { data } = await supabase
      .from('equipos_eliminados')
      .select('*')
      .eq('tipo_dispositivo', deviceType)
      .order('eliminado_en', { ascending: false });
    setDeletedProducts((data ?? []) as EquipoEliminado[]);
  }, [deviceType]);

  const addProduct = useCallback(async (input: ProductInput) => {
    const { data, error: err } = await supabase
      .from('equipos')
      .insert({ ...input, tipo_dispositivo: deviceType })
      .select()
      .single();
    if (!err && data) setProducts((prev) => [data as Equipo, ...prev]);
    return err;
  }, [deviceType]);

  const updateProduct = useCallback(async (id: string, input: Partial<ProductInput>) => {
    const { data, error: err } = await supabase
      .from('equipos')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (!err && data) {
      setProducts((prev) => prev.map((p) => (p.id === id ? (data as Equipo) : p)));
    }
    return err;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error: err } = await supabase.rpc('archivar_equipo', { p_id: id });
    if (!err) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return err;
  }, []);

  const restoreProduct = useCallback(async (id: string) => {
    const { error: err } = await supabase.rpc('restaurar_equipo', { p_id: id });
    if (!err) {
      const { data } = await supabase.from('equipos').select('*').eq('id', id).single();
      setDeletedProducts((prev) => prev.filter((p) => p.id !== id));
      if (data) setProducts((prev) => [data as Equipo, ...prev]);
    }
    return err;
  }, []);

  const hardDeleteProduct = useCallback(async (id: string) => {
    const { error: err } = await supabase.rpc('eliminar_equipo_definitivo', { p_id: id });
    if (!err) {
      setDeletedProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return err;
  }, []);

  return {
    products,
    deletedProducts,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    hardDeleteProduct,
    loadDeletedProducts,
    reload: load,
  };
}
