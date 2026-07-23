import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uploadProductImage, listStorageImages } from '../lib/storage';
import type { Accesorio, AccesorioEliminado } from '../lib/types';

export type { StorageImage } from '../lib/storage';

type ProductInput = Omit<Accesorio, 'id' | 'actualizado_en'>;

function sortProducts(list: Accesorio[]): Accesorio[] {
  return [...list].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
  );
}

export function useCatalogAdmin() {
  const [products, setProducts]   = useState<Accesorio[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<AccesorioEliminado[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('accesorios')
      .select('*')
      .order('categoria')
      .order('nombre');
    if (err) setError(err.message);
    else setProducts((data ?? []) as Accesorio[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const loadDeletedProducts = useCallback(async () => {
    const { data } = await supabase
      .from('accesorios_eliminados')
      .select('*')
      .order('eliminado_en', { ascending: false });
    setDeletedProducts((data ?? []) as AccesorioEliminado[]);
  }, []);

  const addProduct = useCallback(async (input: ProductInput): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('accesorios')
      .insert([input])
      .select()
      .single();
    if (err) return err.message;
    setProducts(prev => sortProducts([...prev, data as Accesorio]));
    return null;
  }, []);

  const updateProduct = useCallback(async (id: string, input: Partial<ProductInput>): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('accesorios')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (err) return err.message;
    setProducts(prev => prev.map(p => p.id === id ? (data as Accesorio) : p));
    return null;
  }, []);

  const softDeleteProduct = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase.rpc('archivar_accesorio', { p_id: id });
    if (err) return err.message;
    setProducts(prev => prev.filter(p => p.id !== id));
    return null;
  }, []);

  const toggleActive = useCallback(async (id: string, activo: boolean): Promise<string | null> => {
    const { error: err } = await supabase
      .from('accesorios')
      .update({ activo })
      .eq('id', id);
    if (err) return err.message;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, activo } : p));
    return null;
  }, []);

  const uploadImage = useCallback(async (file: File, sku: string, categoria: string): Promise<string> => {
    return uploadProductImage(file, sku, categoria);
  }, []);

  const restoreProduct = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase.rpc('restaurar_accesorio', { p_id: id });
    if (err) return err.message;
    const { data } = await supabase.from('accesorios').select('*').eq('id', id).single();
    setDeletedProducts(prev => prev.filter(p => p.id !== id));
    if (data) setProducts(prev => sortProducts([...prev, data as Accesorio]));
    return null;
  }, []);

  const hardDeleteProduct = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase.rpc('eliminar_accesorio_definitivo', { p_id: id });
    if (err) return err.message;
    setDeletedProducts(prev => prev.filter(p => p.id !== id));
    return null;
  }, []);

  return {
    products,
    deletedProducts,
    loading,
    error,
    reload: fetch,
    loadDeletedProducts,
    addProduct,
    updateProduct,
    softDeleteProduct,
    restoreProduct,
    hardDeleteProduct,
    toggleActive,
    uploadImage,
    listStorageImages,
  };
}
