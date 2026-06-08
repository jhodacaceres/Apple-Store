import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';
import type { CatalogProduct, Product } from './types';

export const STORAGE_BUCKET = 'product-images';

export function getImageUrl(product: Pick<CatalogProduct, 'imagen_path' | 'imagen_url'>): string | null {
  if (product.imagen_path) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(product.imagen_path);
    return data.publicUrl;
  }
  return product.imagen_url ?? null;
}

export function getPhoneImageUrl(product: Pick<Product, 'image_path' | 'image_url'>): string | null {
  if (product.image_path) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(product.image_path);
    return data.publicUrl;
  }
  return product.image_url ?? null;
}

export async function uploadProductImage(
  file: File,
  sku: string,
  categoria: string,
): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
  });
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${categoria}/${sku}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, compressed, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export interface StorageImage {
  name: string;
  path: string;
  publicUrl: string;
}

export async function listStorageImages(): Promise<StorageImage[]> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error || !data) return [];

  return data
    .filter((item) => item.name !== '.emptyFolderPlaceholder')
    .map((item) => {
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(item.name);
      return { name: item.name, path: item.name, publicUrl: urlData.publicUrl };
    });
}
