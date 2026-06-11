import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Order } from '../lib/types';

type OrderInput = {
  customer_name: string;
  customer_phone?: string;
  product_id?: string;
  catalog_product_id?: string;
  total_price: number;
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
};

type OrderUpdate = Partial<Pick<OrderInput, 'customer_name' | 'customer_phone' | 'total_price' | 'status' | 'notes'>>;

// device_type se omite del join hasta que exista la columna (se agrega con mac_devices_migration.sql)
const ORDER_SELECT = '*, products(model, color, capacity, deleted_at, device_type), catalog_products(nombre, precio, deleted_at, categoria), created_by_name';

export function useOrders() {
  const { user, profile } = useAuth();
  const [orders, setOrders]               = useState<Order[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<Order[]>([]);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('orders')
      .select(ORDER_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!isMounted) return;
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });

    const channel = supabase
      .channel('orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Order;
            if (!inserted.deleted_at) {
              setOrders((prev) => [inserted, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order;
            if (updated.deleted_at) {
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
      .from('orders')
      .select(ORDER_SELECT)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    setDeletedOrders((data ?? []) as Order[]);
  }, []);

  const addOrder = useCallback(async (input: OrderInput) => {
    const { data, error: err } = await supabase
      .from('orders')
      .insert({
        ...input,
        status: input.status ?? 'completed',
        created_by: user?.id ?? null,
        created_by_name: profile?.full_name ?? user?.email ?? null,
      })
      .select(ORDER_SELECT)
      .single();
    if (!err && data) setOrders((prev) => [data as Order, ...prev]);
    return err;
  }, [user, profile]);

  const updateOrder = useCallback(async (id: string, input: OrderUpdate) => {
    const { data, error: err } = await supabase
      .from('orders')
      .update(input)
      .eq('id', id)
      .select(ORDER_SELECT)
      .single();
    if (!err && data) {
      setOrders((prev) => prev.map((o) => (o.id === id ? (data as Order) : o)));
    }
    return err;
  }, []);

  const cancelOrder = useCallback(async (order: Order) => {
    if (order.status === 'completed') {
      if (order.product_id) {
        await supabase.from('products').update({ status: 'available' }).eq('id', order.product_id);
      } else if (order.catalog_product_id) {
        const { data: acc } = await supabase
          .from('catalog_products').select('stock').eq('id', order.catalog_product_id).single();
        if (acc) {
          await supabase.from('catalog_products').update({ stock: acc.stock + 1 }).eq('id', order.catalog_product_id);
        }
      }
    }
    const { error: err } = await supabase
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', order.id);
    if (!err) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
    return err;
  }, []);

  const restoreOrder = useCallback(async (order: Order) => {
    if (order.status === 'completed') {
      if (order.product_id) {
        await supabase.from('products').update({ status: 'sold' }).eq('id', order.product_id);
      } else if (order.catalog_product_id) {
        const { data: acc } = await supabase
          .from('catalog_products').select('stock').eq('id', order.catalog_product_id).single();
        if (acc) {
          await supabase.from('catalog_products')
            .update({ stock: Math.max(0, acc.stock - 1) })
            .eq('id', order.catalog_product_id);
        }
      }
    }
    const { data, error: err } = await supabase
      .from('orders')
      .update({ deleted_at: null })
      .eq('id', order.id)
      .select(ORDER_SELECT)
      .single();
    if (!err && data) {
      setDeletedOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOrders((prev) => [data as Order, ...prev]);
    }
    return err;
  }, []);

  const hardDeleteOrder = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('orders')
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
