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

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('catalog_products')
      .select('*')
      .order('categoria')
      .order('nombre');
    setProducts((data ?? []) as CatalogProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function addProduct(input: ProductInput) {
    const { data, error } = await supabase
      .from('catalog_products')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    setProducts(prev => sortProducts([...prev, data as CatalogProduct]));
  }

  async function updateProduct(id: string, input: Partial<ProductInput>) {
    const { data, error } = await supabase
      .from('catalog_products')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === id ? (data as CatalogProduct) : p));
  }

  async function softDeleteProduct(id: string) {
    const { error } = await supabase
      .from('catalog_products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function toggleActive(id: string, activo: boolean) {
    const { error } = await supabase
      .from('catalog_products')
      .update({ activo })
      .eq('id', id);
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, activo } : p));
  }

  async function uploadImage(file: File, sku: string, categoria: string): Promise<string> {
    return uploadProductImage(file, sku, categoria);
  }

  async function restoreProduct(id: string) {
    const { error } = await supabase
      .from('catalog_products')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, deleted_at: null } : p));
  }

  async function hardDeleteProduct(id: string) {
    const { error } = await supabase
      .from('catalog_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  return {
    products,
    loading,
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
