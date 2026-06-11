import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uploadProductImage, listStorageImages } from '../lib/storage';
import type { CatalogProduct } from '../lib/types';

export type { StorageImage } from '../lib/storage';

type ProductInput = Omit<CatalogProduct, 'id' | 'updated_at' | 'deleted_at'>;

function sortProducts(list: CatalogProduct[]): CatalogProduct[] {
  return [...list].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
  );
}

export function useCatalogAdmin() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('catalog_products')
      .select('*')
      .order('categoria')
      .order('nombre');
    if (err) setError(err.message);
    else setProducts((data ?? []) as CatalogProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addProduct = useCallback(async (input: ProductInput): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('catalog_products')
      .insert([input])
      .select()
      .single();
    if (err) return err.message;
    setProducts(prev => sortProducts([...prev, data as CatalogProduct]));
    return null;
  }, []);

  const updateProduct = useCallback(async (id: string, input: Partial<ProductInput>): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from('catalog_products')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (err) return err.message;
    setProducts(prev => prev.map(p => p.id === id ? (data as CatalogProduct) : p));
    return null;
  }, []);

  const softDeleteProduct = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase
      .from('catalog_products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (err) return err.message;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p));
    return null;
  }, []);

  const toggleActive = useCallback(async (id: string, activo: boolean): Promise<string | null> => {
    const { error: err } = await supabase
      .from('catalog_products')
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
    const { error: err } = await supabase
      .from('catalog_products')
      .update({ deleted_at: null })
      .eq('id', id);
    if (err) return err.message;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, deleted_at: null } : p));
    return null;
  }, []);

  const hardDeleteProduct = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase
      .from('catalog_products')
      .delete()
      .eq('id', id);
    if (err) return err.message;
    setProducts(prev => prev.filter(p => p.id !== id));
    return null;
  }, []);

  return {
    products,
    loading,
    error,
    reload: fetch,
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
