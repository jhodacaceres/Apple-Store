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
  const listOpts = { limit: 200, sortBy: { column: 'created_at', order: 'desc' as const } };

  const { data: rootItems, error } = await supabase.storage.from(STORAGE_BUCKET).list('', listOpts);
  if (error || !rootItems) return [];

  const images: StorageImage[] = [];

  for (const item of rootItems) {
    if (item.name === '.emptyFolderPlaceholder') continue;

    // En Supabase Storage las carpetas se devuelven con id === null.
    if (item.id === null) {
      const { data: subItems } = await supabase.storage.from(STORAGE_BUCKET).list(item.name, listOpts);
      subItems?.forEach((file) => {
        if (file.name === '.emptyFolderPlaceholder') return;
        const path = `${item.name}/${file.name}`;
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        images.push({ name: file.name, path, publicUrl: urlData.publicUrl });
      });
    } else {
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(item.name);
      images.push({ name: item.name, path: item.name, publicUrl: urlData.publicUrl });
    }
  }

  return images;
}
