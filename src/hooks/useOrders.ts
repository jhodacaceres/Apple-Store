import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Venta } from '../lib/types';

type OrderInput = {
  cliente_nombre: string;
  cliente_telefono?: string;
  equipo_id?: string;
  accesorio_id?: string;
  precio_total: number;
  estado?: 'pendiente' | 'completada' | 'cancelada';
  notas?: string;
};

type OrderUpdate = Partial<Pick<OrderInput, 'cliente_nombre' | 'cliente_telefono' | 'precio_total' | 'estado' | 'notas'>>;

const ORDER_SELECT = '*, equipos(modelo, color, capacidad, tipo_dispositivo), accesorios(nombre, precio, categoria), creado_por_nombre';

export function useOrders() {
  const { user, profile } = useAuth();
  const [orders, setOrders]               = useState<Venta[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<Venta[]>([]);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ventas')
      .select(ORDER_SELECT)
      .is('eliminado_en', null)
      .order('creado_en', { ascending: false });
    setOrders((data ?? []) as Venta[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('ventas')
      .select(ORDER_SELECT)
      .is('eliminado_en', null)
      .order('creado_en', { ascending: false })
      .then(({ data }) => {
        if (!isMounted) return;
        setOrders((data ?? []) as Venta[]);
        setLoading(false);
      });

    const channel = supabase
      .channel('ventas_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Venta;
            if (!inserted.eliminado_en) {
              setOrders((prev) => [inserted, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Venta;
            if (updated.eliminado_en) {
              setOrders((prev) => prev.filter((o) => o.id !== updated.id));
            } else {
              setOrders((prev) =>
                prev.some((o) => o.id === updated.id)
                  ? prev.map((o) => (o.id === updated.id ? updated : o))
                  : [updated, ...prev],
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            setOrders((prev) => prev.filter((o) => o.id !== id));
            setDeletedOrders((prev) => prev.filter((o) => o.id !== id));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDeletedOrders = useCallback(async () => {
    const { data } = await supabase
      .from('ventas')
      .select(ORDER_SELECT)
      .not('eliminado_en', 'is', null)
      .order('eliminado_en', { ascending: false });
    setDeletedOrders((data ?? []) as Venta[]);
  }, []);

  const addOrder = useCallback(async (input: OrderInput) => {
    const { data, error: err } = await supabase
      .from('ventas')
      .insert({
        ...input,
        estado: input.estado ?? 'completada',
        creado_por: user?.id ?? null,
        creado_por_nombre: profile?.nombre_completo ?? user?.email ?? null,
      })
      .select(ORDER_SELECT)
      .single();
    if (!err && data) setOrders((prev) => [data as Venta, ...prev]);
    return err;
  }, [user, profile]);

  const updateOrder = useCallback(async (id: string, input: OrderUpdate) => {
    const { data, error: err } = await supabase
      .from('ventas')
      .update(input)
      .eq('id', id)
      .select(ORDER_SELECT)
      .single();
    if (!err && data) {
      setOrders((prev) => prev.map((o) => (o.id === id ? (data as Venta) : o)));
    }
    return err;
  }, []);

  const cancelOrder = useCallback(async (order: Venta) => {
    if (order.estado === 'completada') {
      if (order.equipo_id) {
        await supabase.from('equipos').update({ estado: 'disponible' }).eq('id', order.equipo_id);
      } else if (order.accesorio_id) {
        const { data: acc } = await supabase
          .from('accesorios').select('stock').eq('id', order.accesorio_id).single();
        if (acc) {
          await supabase.from('accesorios').update({ stock: acc.stock + 1 }).eq('id', order.accesorio_id);
        }
      }
    }
    const { error: err } = await supabase
      .from('ventas')
      .update({ eliminado_en: new Date().toISOString() })
      .eq('id', order.id);
    if (!err) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
    return err;
  }, []);

  const restoreOrder = useCallback(async (order: Venta) => {
    if (order.estado === 'completada') {
      if (order.equipo_id) {
        await supabase.from('equipos').update({ estado: 'vendido' }).eq('id', order.equipo_id);
      } else if (order.accesorio_id) {
        const { data: acc } = await supabase
          .from('accesorios').select('stock').eq('id', order.accesorio_id).single();
        if (acc) {
          await supabase.from('accesorios')
            .update({ stock: Math.max(0, acc.stock - 1) })
            .eq('id', order.accesorio_id);
        }
      }
    }
    const { data, error: err } = await supabase
      .from('ventas')
      .update({ eliminado_en: null })
      .eq('id', order.id)
      .select(ORDER_SELECT)
      .single();
    if (!err && data) {
      setDeletedOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOrders((prev) => [data as Venta, ...prev]);
    }
    return err;
  }, []);

  const hardDeleteOrder = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('ventas')
      .delete()
      .eq('id', id);
    if (!err) {
      setDeletedOrders((prev) => prev.filter((o) => o.id !== id));
    }
    return err;
  }, []);

  return {
    orders,
    deletedOrders,
    loading,
    addOrder,
    updateOrder,
    cancelOrder,
    restoreOrder,
    hardDeleteOrder,
    loadDeletedOrders,
    reload: load,
  };
}
