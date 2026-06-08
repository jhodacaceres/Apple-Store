import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';

type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

export function useProducts(deviceType: 'phone' | 'mac' = 'phone') {
  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .eq('device_type', deviceType)
      .order('created_at', { ascending: false });
    if (!err) setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [deviceType]);

  useEffect(() => { load(); }, [load]);

  const loadDeletedProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .not('deleted_at', 'is', null)
      .eq('device_type', deviceType)
      .order('deleted_at', { ascending: false });
    setDeletedProducts((data ?? []) as Product[]);
  }, [deviceType]);

  const addProduct = useCallback(async (input: ProductInput) => {
    const { data, error: err } = await supabase
      .from('products')
      .insert({ ...input, device_type: deviceType })
      .select()
      .single();
    if (!err && data) setProducts((prev) => [data as Product, ...prev]);
    return err;
  }, [deviceType]);

  const updateProduct = useCallback(async (id: string, input: Partial<ProductInput>) => {
    const { data, error: err } = await supabase
      .from('products')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (!err && data) {
      setProducts((prev) => prev.map((p) => (p.id === id ? (data as Product) : p)));
    }
    return err;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (!err) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return err;
  }, []);

  const restoreProduct = useCallback(async (id: string) => {
    const { data, error: err } = await supabase
      .from('products')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single();
    if (!err && data) {
      setDeletedProducts((prev) => prev.filter((p) => p.id !== id));
      setProducts((prev) => [data as Product, ...prev]);
    }
    return err;
  }, []);

  const hardDeleteProduct = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
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
