import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus, Search, Pencil, Trash2, Package, X,
  Download, Eye, EyeOff, Image, Upload, ChevronDown, Smartphone, Monitor, RotateCcw,
} from 'lucide-react';
import { useCatalogAdmin } from '../../hooks/useCatalogAdmin';
import { useProducts } from '../../hooks/useProducts';
import DateRangeModal from '../../components/DateRangeModal';
import type { CatalogProduct, CatalogCategoria, Product } from '../../lib/types';
import type { StorageImage } from '../../lib/storage';
import { getImageUrl, getPhoneImageUrl } from '../../lib/storage';

// ──────────────────────────────────────────────────────────
// Tipos — Accesorios
// ──────────────────────────────────────────────────────────
type FormData = {
  sku: string; nombre: string; categoria: CatalogCategoria;
  descripcion: string; precio: string; stock: string;
  imagen_path: string; imagen_url: string; activo: boolean; slug: string;
};

const EMPTY_FORM: FormData = {
  sku: '', nombre: '', categoria: 'accesorios',
  descripcion: '', precio: '', stock: '0',
  imagen_path: '', imagen_url: '', activo: true, slug: '',
};

const CATEGORIAS: CatalogCategoria[] = ['fundas', 'cargadores', 'cables', 'airpods', 'accesorios'];

// ──────────────────────────────────────────────────────────
// Tipos — Celulares / Macs
// ──────────────────────────────────────────────────────────
type PhoneFormData = {
  model: string; color: string; capacity: string;
  price: string; imei: string;
  image_url: string; image_path: string;
  status: 'available' | 'reserved';
  visible_catalogo: boolean;
};

const EMPTY_PHONE_FORM: PhoneFormData = {
  model: '', color: '', capacity: '', price: '',
  imei: '', image_url: '', image_path: '',
  status: 'available', visible_catalogo: false,
};

// ──────────────────────────────────────────────────────────
// Helpers UI
// ──────────────────────────────────────────────────────────
const FIELD = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-[#0A0A0A] focus:ring-2 focus:ring-black/5 transition-all';

function statusRow(p: CatalogProduct) {
  if (p.deleted_at)  return { cls: 'bg-red-50 text-red-600 border-red-200',        label: 'Eliminado'  };
  if (!p.activo)     return { cls: 'bg-gray-100 text-gray-500 border-gray-200',     label: 'Inactivo'   };
  if (p.stock === 0) return { cls: 'bg-orange-50 text-orange-600 border-orange-200', label: 'Agotado'   };
  return                    { cls: 'bg-green-50 text-green-700 border-green-200',    label: 'Activo'    };
}

function phoneStatusRow(p: Product) {
  if (p.status === 'sold')     return { cls: 'bg-gray-100 text-gray-500 border-gray-200',   label: 'Vendido'    };
  if (p.status === 'reserved') return { cls: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Reservado'  };
  return                              { cls: 'bg-green-50 text-green-700 border-green-200',  label: 'Disponible' };
}

function toSlug(text: string) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
}

// ──────────────────────────────────────────────────────────
// Modal — Celular / Mac
// ──────────────────────────────────────────────────────────
function PhoneFormModal({
  open, title, form, onChange, onSubmit, onClose, saving,
  uploadImage, storageImages, loadingImages, deviceType,
}: {
  open: boolean; title: string; form: PhoneFormData; saving: boolean;
  loadingImages: boolean; storageImages: StorageImage[];
  deviceType: 'phone' | 'mac';
  onChange: (f: keyof PhoneFormData, v: string | boolean) => void;
  onSubmit: () => void; onClose: () => void;
  uploadImage: (file: File, sku: string, cat: string) => Promise<string>;
}) {
  const [imgTab, setImgTab]       = useState<'galeria' | 'subir'>('galeria');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = form.imei || form.model.toLowerCase().replace(/\s+/g, '-') || 'device';
    setUploading(true);
    try {
      const path = await uploadImage(file, key, deviceType === 'mac' ? 'macs' : 'celulares');
      onChange('image_path', path);
    } catch { /* silent */ }
    setUploading(false);
  };

  if (!open) return null;

  const previewUrl = form.image_path
    ? storageImages.find((i) => i.path === form.image_path)?.publicUrl ?? ''
    : form.image_url;

  const capacityLabel = deviceType === 'mac' ? 'Almacenamiento' : 'Capacidad';
  const capacityPlaceholder = deviceType === 'mac' ? '512GB SSD' : '256GB';
  const imeiLabel = deviceType === 'mac' ? 'Número de serie' : 'IMEI';
  const imeiPlaceholder = deviceType === 'mac' ? 'C02XG0JHJGH7' : '352999xxxxxxxxx';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-black text-lg text-[#0A0A0A]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Modelo *</label>
            <input className={FIELD} value={form.model}
              placeholder={deviceType === 'mac' ? 'MacBook Air M2' : 'iPhone 15 Pro'}
              onChange={(e) => onChange('model', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Color</label>
            <input className={FIELD} value={form.color}
              placeholder={deviceType === 'mac' ? 'Plata' : 'Titanio natural'}
              onChange={(e) => onChange('color', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">{capacityLabel}</label>
            <input className={FIELD} value={form.capacity} placeholder={capacityPlaceholder}
              onChange={(e) => onChange('capacity', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Precio (USD) *</label>
            <input className={FIELD} type="number" min="0" step="0.01" value={form.price}
              placeholder={deviceType === 'mac' ? '1200.00' : '750.00'}
              onChange={(e) => onChange('price', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">{imeiLabel} <span className="text-gray-300">(opcional)</span></label>
            <input className={FIELD} value={form.imei} placeholder={imeiPlaceholder}
              onChange={(e) => onChange('imei', e.target.value)} />
          </div>

          {/* Imagen */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Imagen</label>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-3 text-xs font-semibold">
              {(['galeria', 'subir'] as const).map((t) => (
                <button key={t} onClick={() => setImgTab(t)}
                  className={`flex-1 py-2 transition-colors ${imgTab === t ? 'bg-[#0A0A0A] text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  {t === 'galeria' ? (
                    <span className="flex items-center justify-center gap-1.5"><Image className="w-3.5 h-3.5" />Elegir existente</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5"><Upload className="w-3.5 h-3.5" />Subir nueva</span>
                  )}
                </button>
              ))}
            </div>

            {imgTab === 'galeria' ? (
              loadingImages ? (
                <p className="text-xs text-gray-400 py-4 text-center">Cargando imágenes…</p>
              ) : storageImages.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No hay imágenes en Storage aún.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                  {storageImages.map((img) => (
                    <button key={img.path} onClick={() => onChange('image_path', img.path)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${form.image_path === img.path ? 'border-[#0A0A0A] scale-95' : 'border-transparent hover:border-gray-300'}`}>
                      <img src={img.publicUrl} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? (
                    <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Subiendo…</>
                  ) : (
                    <><Upload className="w-4 h-4" />Seleccionar imagen</>
                  )}
                </button>
                {!form.image_path && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-1">O pega una URL directa</label>
                    <input className={FIELD} value={form.image_url} placeholder="https://…"
                      onChange={(e) => onChange('image_url', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {previewUrl && (
              <div className="mt-3 flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                <img src={previewUrl} alt="preview" className="w-12 h-12 object-contain rounded-lg bg-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{form.image_path || 'URL externa'}</p>
                </div>
                <button onClick={() => { onChange('image_path', ''); onChange('image_url', ''); }}
                  className="p-1 hover:bg-gray-200 rounded-lg text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Estado</label>
            <div className="relative">
              <select className={`${FIELD} appearance-none pr-8`} value={form.status}
                onChange={(e) => onChange('status', e.target.value)}>
                <option value="available">Disponible</option>
                <option value="reserved">Reservado</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-300 mt-1">El estado "Vendido" se asigna automáticamente al registrar una venta completada.</p>
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" id="visible_catalogo" checked={form.visible_catalogo}
              onChange={(e) => onChange('visible_catalogo', e.target.checked)}
              className="w-4 h-4 rounded accent-black" />
            <label htmlFor="visible_catalogo" className="text-sm font-medium text-gray-600 cursor-pointer">
              Visible en el catálogo público
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={saving || !form.model || !form.price}
            className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Modal — Accesorio
// ──────────────────────────────────────────────────────────
function ProductFormModal({
  open, title, form, onChange, onSubmit, onClose, saving,
  uploadImage, storageImages, loadingImages,
}: {
  open: boolean; title: string; form: FormData; saving: boolean;
  loadingImages: boolean; storageImages: StorageImage[];
  onChange: (f: keyof FormData, v: string | boolean) => void;
  onSubmit: () => void; onClose: () => void;
  uploadImage: (file: File, sku: string, cat: string) => Promise<string>;
}) {
  const [imgTab, setImgTab] = useState<'galeria' | 'subir'>('galeria');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form.sku || !form.categoria) return;
    setUploading(true);
    try {
      const path = await uploadImage(file, form.sku, form.categoria);
      onChange('imagen_path', path);
    } catch { /* silent */ }
    setUploading(false);
  };

  if (!open) return null;

  const previewUrl = form.imagen_path
    ? storageImages.find((i) => i.path === form.imagen_path)?.publicUrl ?? ''
    : form.imagen_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-black text-lg text-[#0A0A0A]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">SKU *</label>
            <input className={FIELD} value={form.sku} placeholder="FUNDA-IP15-001"
              onChange={(e) => {
                onChange('sku', e.target.value);
                if (!form.slug) onChange('slug', toSlug(form.nombre || e.target.value));
              }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Categoría *</label>
            <div className="relative">
              <select className={`${FIELD} appearance-none pr-8`} value={form.categoria}
                onChange={(e) => onChange('categoria', e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre *</label>
            <input className={FIELD} value={form.nombre} placeholder="Funda iPhone 15 Silicona Negra"
              onChange={(e) => {
                onChange('nombre', e.target.value);
                onChange('slug', toSlug(e.target.value));
              }} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Descripción</label>
            <textarea className={`${FIELD} resize-none`} rows={2} value={form.descripcion}
              placeholder="Descripción corta del producto…"
              onChange={(e) => onChange('descripcion', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Precio (Bs) *</label>
            <input className={FIELD} type="number" min="0" step="0.50" value={form.precio}
              placeholder="65.00" onChange={(e) => onChange('precio', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Stock *</label>
            <input className={FIELD} type="number" min="0" value={form.stock}
              placeholder="10" onChange={(e) => onChange('stock', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Slug (URL)</label>
            <input className={FIELD} value={form.slug} placeholder="funda-iphone-15-silicona-negra"
              onChange={(e) => onChange('slug', e.target.value)} />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Imagen</label>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-3 text-xs font-semibold">
              {(['galeria', 'subir'] as const).map((t) => (
                <button key={t} onClick={() => setImgTab(t)}
                  className={`flex-1 py-2 transition-colors ${imgTab === t ? 'bg-[#0A0A0A] text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  {t === 'galeria' ? (
                    <span className="flex items-center justify-center gap-1.5"><Image className="w-3.5 h-3.5" />Elegir existente</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5"><Upload className="w-3.5 h-3.5" />Subir nueva</span>
                  )}
                </button>
              ))}
            </div>

            {imgTab === 'galeria' ? (
              loadingImages ? (
                <p className="text-xs text-gray-400 py-4 text-center">Cargando imágenes…</p>
              ) : storageImages.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No hay imágenes en Storage aún.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                  {storageImages.map((img) => (
                    <button key={img.path} onClick={() => onChange('imagen_path', img.path)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${form.imagen_path === img.path ? 'border-[#0A0A0A] scale-95' : 'border-transparent hover:border-gray-300'}`}>
                      <img src={img.publicUrl} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={!form.sku || uploading}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? (
                    <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Subiendo…</>
                  ) : (
                    <><Upload className="w-4 h-4" />{form.sku ? 'Seleccionar imagen' : 'Completa el SKU primero'}</>
                  )}
                </button>
                {!form.imagen_path && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-1">O pega una URL directa</label>
                    <input className={FIELD} value={form.imagen_url} placeholder="https://…"
                      onChange={(e) => onChange('imagen_url', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {previewUrl && (
              <div className="mt-3 flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                <img src={previewUrl} alt="preview" className="w-12 h-12 object-contain rounded-lg bg-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{form.imagen_path || 'URL externa'}</p>
                </div>
                <button onClick={() => { onChange('imagen_path', ''); onChange('imagen_url', ''); }}
                  className="p-1 hover:bg-gray-200 rounded-lg text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" id="activo" checked={form.activo}
              onChange={(e) => onChange('activo', e.target.checked)}
              className="w-4 h-4 rounded accent-black" />
            <label htmlFor="activo" className="text-sm font-medium text-gray-600 cursor-pointer">
              Producto activo (visible en el catálogo)
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={saving || !form.sku || !form.nombre || !form.precio}
            className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-tabla reutilizable para Celulares / Macs activos
// ──────────────────────────────────────────────────────────
function DeviceTable({
  items, loading, emptyIcon: EmptyIcon, emptyText,
  onEdit, onDelete, onToggleVisibility,
}: {
  items: Product[]; loading: boolean;
  emptyIcon: React.ElementType; emptyText: string;
  onEdit: (p: Product) => void; onDelete: (p: Product) => void;
  onToggleVisibility: (p: Product) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
      <table className="w-full text-left text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-gray-100">
            {['', 'Modelo', 'Color', 'Capacidad', 'Precio (Bs)', 'Estado', 'Acciones'].map((h) => (
              <th key={h} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <EmptyIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">{emptyText}</p>
              </td>
            </tr>
          ) : (
            items.map((p) => {
              const { cls, label } = phoneStatusRow(p);
              const imgUrl = getPhoneImageUrl(p);
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-[#FAFAFA] transition-colors">
                  <td className="pl-4 py-3 w-12">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.model} className="w-10 h-10 object-contain rounded-lg bg-gray-50 border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <EmptyIcon className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{p.model}</td>
                  <td className="px-4 py-3 text-gray-500">{p.color ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.capacity ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-[#0A0A0A]">Bs {Number(p.price).toLocaleString('es-BO')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(p)} title="Editar"
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onToggleVisibility(p)} title={p.visible_catalogo ? 'Ocultar del catálogo' : 'Mostrar en catálogo'}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700">
                        {p.visible_catalogo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => onDelete(p)} title="Eliminar"
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-tabla reutilizable para eliminados (celulares / macs)
// ──────────────────────────────────────────────────────────
function DeletedDeviceTable({
  items, emptyIcon: EmptyIcon,
  onRestore, onHardDelete,
}: {
  items: Product[];
  emptyIcon: React.ElementType;
  onRestore: (p: Product) => void;
  onHardDelete: (p: Product) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
      {items.length === 0 ? (
        <div className="p-12 text-center">
          <EmptyIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No hay eliminados.</p>
        </div>
      ) : (
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Modelo', 'Color', 'Capacidad', 'Precio (USD)', 'Eliminado', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 opacity-60">
                <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{p.model}</td>
                <td className="px-4 py-3 text-gray-500">{p.color ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{p.capacity ?? '—'}</td>
                <td className="px-4 py-3 font-bold text-[#0A0A0A]">${Number(p.price).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString('es-BO') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onRestore(p)} title="Recuperar"
                      className="p-2 hover:bg-emerald-50 rounded-xl transition-colors text-gray-400 hover:text-emerald-600">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => onHardDelete(p)} title="Eliminar definitivamente"
                      className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────
type MainTab    = 'accesorios' | 'celulares' | 'macs';
type FilterStatus = 'activos' | 'inactivos' | 'eliminados' | 'todos';
type PhoneFilter  = 'activos' | 'inactivos' | 'reserved' | 'eliminados' | 'todos';

export default function Inventory() {
  // ── Accesorios ──
  const {
    products, loading, addProduct, updateProduct,
    softDeleteProduct, restoreProduct, hardDeleteProduct,
    toggleActive, uploadImage, listStorageImages,
  } = useCatalogAdmin();

  // ── Celulares ──
  const {
    products: phones, deletedProducts: deletedPhones, loading: loadingPhones,
    addProduct: addPhone, updateProduct: updatePhone, deleteProduct: deletePhone,
    restoreProduct: restorePhone, hardDeleteProduct: hardDeletePhone,
    loadDeletedProducts: loadDeletedPhones,
  } = useProducts('phone');

  // ── Macs ──
  const {
    products: macs, deletedProducts: deletedMacs, loading: loadingMacs,
    addProduct: addMac, updateProduct: updateMac, deleteProduct: deleteMac,
    restoreProduct: restoreMac, hardDeleteProduct: hardDeleteMac,
    loadDeletedProducts: loadDeletedMacs,
  } = useProducts('mac');

  // ── Tabs ──
  const [mainTab, setMainTab] = useState<MainTab>('accesorios');

  // ── Estado accesorios ──
  const [query, setQuery]               = useState('');
  const [catFilter, setCatFilter]       = useState<CatalogCategoria | 'todas'>('todas');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('activos');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<CatalogProduct | null>(null);
  const [form, setForm]                 = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete]         = useState<CatalogProduct | null>(null);
  const [confirmRestoreCatalog, setConfirmRestoreCatalog] = useState<CatalogProduct | null>(null);
  const [confirmHardDeleteCatalog, setConfirmHardDeleteCatalog] = useState<CatalogProduct | null>(null);
  const [storageImages, setStorageImages] = useState<StorageImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // ── Estado celulares ──
  const [phoneQuery, setPhoneQuery]     = useState('');
  const [phoneFilter, setPhoneFilter]   = useState<PhoneFilter>('activos');
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [editPhone, setEditPhone]           = useState<Product | null>(null);
  const [phoneForm, setPhoneForm]           = useState<PhoneFormData>(EMPTY_PHONE_FORM);
  const [savingPhone, setSavingPhone]       = useState(false);
  const [confirmDeletePhone, setConfirmDeletePhone]   = useState<Product | null>(null);
  const [confirmHardDeletePhone, setConfirmHardDeletePhone] = useState<Product | null>(null);

  // ── Estado Macs ──
  const [macQuery, setMacQuery]       = useState('');
  const [macFilter, setMacFilter]     = useState<PhoneFilter>('activos');
  const [macModalOpen, setMacModalOpen]   = useState(false);
  const [editMac, setEditMac]             = useState<Product | null>(null);
  const [macForm, setMacForm]             = useState<PhoneFormData>(EMPTY_PHONE_FORM);
  const [savingMac, setSavingMac]         = useState(false);
  const [confirmDeleteMac, setConfirmDeleteMac]     = useState<Product | null>(null);
  const [confirmHardDeleteMac, setConfirmHardDeleteMac] = useState<Product | null>(null);

  // ── Export modal ──
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // ── Cargar imágenes Storage al abrir cualquier modal ──
  useEffect(() => {
    if (!modalOpen && !phoneModalOpen && !macModalOpen) return;
    setLoadingImages(true);
    listStorageImages().then((imgs) => {
      setStorageImages(imgs);
      setLoadingImages(false);
    });
  }, [modalOpen, phoneModalOpen, macModalOpen, listStorageImages]);

  // ── Filtros accesorios ──
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => {
      const matchStatus =
        statusFilter === 'todos'      ? true :
        statusFilter === 'eliminados' ? !!p.deleted_at :
        statusFilter === 'inactivos'  ? (!p.activo && !p.deleted_at) :
        (p.activo && !p.deleted_at);
      const matchCat = catFilter === 'todas' || p.categoria === catFilter;
      const matchQ   = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchStatus && matchCat && matchQ;
    });
  }, [products, query, catFilter, statusFilter]);

  const counts = useMemo(() => ({
    activos:    products.filter((p) => p.activo && !p.deleted_at).length,
    inactivos:  products.filter((p) => !p.activo && !p.deleted_at).length,
    eliminados: products.filter((p) => !!p.deleted_at).length,
  }), [products]);

  // ── Filtros celulares ──
  const filteredPhones = useMemo(() => {
    const q = phoneQuery.toLowerCase();
    return phones.filter((p) => {
      const matchStatus =
        phoneFilter === 'todos'     ? true :
        phoneFilter === 'activos'   ? (p.visible_catalogo === true) :
        phoneFilter === 'inactivos' ? (p.visible_catalogo === false) :
        phoneFilter === 'reserved'  ? p.status === 'reserved' :
        true;
      const matchQ = !q || p.model.toLowerCase().includes(q) || (p.color ?? '').toLowerCase().includes(q) || (p.imei ?? '').toLowerCase().includes(q);
      return matchStatus && matchQ;
    });
  }, [phones, phoneQuery, phoneFilter]);

  // ── Filtros Macs ──
  const filteredMacs = useMemo(() => {
    const q = macQuery.toLowerCase();
    return macs.filter((p) => {
      const matchStatus =
        macFilter === 'todos'     ? true :
        macFilter === 'activos'   ? (p.visible_catalogo === true) :
        macFilter === 'inactivos' ? (p.visible_catalogo === false) :
        macFilter === 'reserved'  ? p.status === 'reserved' :
        true;
      const matchQ = !q || p.model.toLowerCase().includes(q) || (p.color ?? '').toLowerCase().includes(q) || (p.imei ?? '').toLowerCase().includes(q);
      return matchStatus && matchQ;
    });
  }, [macs, macQuery, macFilter]);

  // ── Handlers accesorios ──
  const openAdd    = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit   = (p: CatalogProduct) => {
    setEditTarget(p);
    setForm({ sku: p.sku, nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion ?? '', precio: String(p.precio), stock: String(p.stock), imagen_path: p.imagen_path ?? '', imagen_url: p.imagen_url ?? '', activo: p.activo, slug: p.slug });
    setModalOpen(true);
  };
  const handleChange = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    const payload = {
      sku: form.sku, nombre: form.nombre, categoria: form.categoria,
      descripcion: form.descripcion || null, precio: parseFloat(form.precio),
      stock: parseInt(form.stock, 10), imagen_path: form.imagen_path || null,
      imagen_url: form.imagen_url || null, activo: form.activo,
      slug: form.slug || toSlug(form.nombre),
    };
    try {
      if (editTarget) await updateProduct(editTarget.id, payload);
      else await addProduct(payload as Parameters<typeof addProduct>[0]);
    } catch { /* silent */ }
    setSaving(false);
    setModalOpen(false);
  };

  // ── Handlers celulares ──
  const openAddPhone  = () => { setEditPhone(null); setPhoneForm(EMPTY_PHONE_FORM); setPhoneModalOpen(true); };
  const openEditPhone = (p: Product) => {
    setEditPhone(p);
    setPhoneForm({ model: p.model, color: p.color ?? '', capacity: p.capacity ?? '', price: String(p.price), imei: p.imei ?? '', image_url: p.image_url ?? '', image_path: p.image_path ?? '', status: p.status === 'sold' ? 'available' : p.status, visible_catalogo: p.visible_catalogo ?? false });
    setPhoneModalOpen(true);
  };
  const handlePhoneChange = (field: keyof PhoneFormData, value: string | boolean) =>
    setPhoneForm((prev) => ({ ...prev, [field]: value }));

  const handlePhoneSubmit = async () => {
    setSavingPhone(true);
    const payload = { model: phoneForm.model, color: phoneForm.color || null, capacity: phoneForm.capacity || null, price: parseFloat(phoneForm.price), imei: phoneForm.imei || null, image_url: phoneForm.image_url || null, image_path: phoneForm.image_path || null, status: phoneForm.status, visible_catalogo: phoneForm.visible_catalogo };
    try {
      if (editPhone) await updatePhone(editPhone.id, payload);
      else await addPhone(payload as Parameters<typeof addPhone>[0]);
    } catch { /* silent */ }
    setSavingPhone(false);
    setPhoneModalOpen(false);
  };

  const handlePhoneFilterChange = async (v: PhoneFilter) => {
    setPhoneFilter(v);
    if (v === 'eliminados') await loadDeletedPhones();
  };

  // ── Handlers Macs ──
  const openAddMac  = () => { setEditMac(null); setMacForm(EMPTY_PHONE_FORM); setMacModalOpen(true); };
  const openEditMac = (p: Product) => {
    setEditMac(p);
    setMacForm({ model: p.model, color: p.color ?? '', capacity: p.capacity ?? '', price: String(p.price), imei: p.imei ?? '', image_url: p.image_url ?? '', image_path: p.image_path ?? '', status: p.status === 'sold' ? 'available' : p.status, visible_catalogo: p.visible_catalogo ?? false });
    setMacModalOpen(true);
  };
  const handleMacChange = (field: keyof PhoneFormData, value: string | boolean) =>
    setMacForm((prev) => ({ ...prev, [field]: value }));

  const handleMacSubmit = async () => {
    setSavingMac(true);
    const payload = { model: macForm.model, color: macForm.color || null, capacity: macForm.capacity || null, price: parseFloat(macForm.price), imei: macForm.imei || null, image_url: macForm.image_url || null, image_path: macForm.image_path || null, status: macForm.status, visible_catalogo: macForm.visible_catalogo };
    try {
      if (editMac) await updateMac(editMac.id, payload);
      else await addMac(payload as Parameters<typeof addMac>[0]);
    } catch { /* silent */ }
    setSavingMac(false);
    setMacModalOpen(false);
  };

  const handleMacFilterChange = async (v: PhoneFilter) => {
    setMacFilter(v);
    if (v === 'eliminados') await loadDeletedMacs();
  };

  // ── Exportar ──
  const handleExport = (from: Date | null, to: Date | null) => {
    setExportModalOpen(false);
    const filterByDate = <T extends { updated_at?: string; created_at?: string }>(data: T[]) => {
      if (!from && !to) return data;
      return data.filter((p) => {
        const d = new Date((p as { updated_at?: string; created_at?: string }).updated_at ?? (p as { created_at?: string }).created_at ?? '');
        if (from && d < from) return false;
        if (to && d > to)     return false;
        return true;
      });
    };
    if (mainTab === 'accesorios') {
      const rows = filterByDate(products).map((p) => ({
        SKU: p.sku, Nombre: p.nombre, Categoría: p.categoria, 'Precio (Bs)': p.precio, Stock: p.stock, Activo: p.activo ? 'Sí' : 'No', Eliminado: p.deleted_at ? 'Sí' : 'No',
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Accesorios');
      XLSX.writeFile(wb, `apple-zone-accesorios-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const data = mainTab === 'macs' ? macs : phones;
      const rows = filterByDate(data).map((p) => ({
        Modelo: p.model, Color: p.color ?? '', Capacidad: p.capacity ?? '', IMEI: p.imei ?? '', 'Precio (USD)': p.price,
        Estado: { available: 'Disponible', sold: 'Vendido', reserved: 'Reservado' }[p.status],
        Registrado: new Date(p.created_at).toLocaleDateString('es-BO'),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), mainTab === 'macs' ? 'Macs' : 'Celulares');
      XLSX.writeFile(wb, `apple-zone-${mainTab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  const deviceFilterBtns = ([
    { value: 'todos',      label: 'Todos'      },
    { value: 'activos',    label: 'Activos'    },
    { value: 'inactivos',  label: 'Inactivos'  },
    { value: 'reserved',   label: 'Reservados' },
    { value: 'eliminados', label: 'Eliminados' },
  ] as { value: PhoneFilter; label: string }[]);

  const handlePhoneToggleVisibility = (p: Product) =>
    updatePhone(p.id, { visible_catalogo: !p.visible_catalogo });

  const handleMacToggleVisibility = (p: Product) =>
    updateMac(p.id, { visible_catalogo: !p.visible_catalogo });

  return (
    <>
      {/* ── Modales accesorios ── */}
      <ProductFormModal
        open={modalOpen} title={editTarget ? 'Editar accesorio' : 'Nuevo accesorio'}
        form={form} onChange={handleChange} onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)} saving={saving}
        uploadImage={uploadImage} storageImages={storageImages} loadingImages={loadingImages}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">¿Eliminar accesorio?</h3>
            <p className="text-sm text-gray-400 mb-1">{confirmDelete.nombre}</p>
            <p className="text-xs text-gray-300 mb-6">Se marcará como eliminado. Podrás recuperarlo desde la vista de eliminados.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await softDeleteProduct(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {confirmRestoreCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">¿Recuperar accesorio?</h3>
            <p className="text-sm text-gray-400 mb-6">{confirmRestoreCatalog.nombre}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestoreCatalog(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await restoreProduct(confirmRestoreCatalog.id); setConfirmRestoreCatalog(null); }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Recuperar</button>
            </div>
          </div>
        </div>
      )}

      {confirmHardDeleteCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">Eliminar definitivamente</h3>
            <p className="text-sm text-gray-400 mb-2">{confirmHardDeleteCatalog.nombre}</p>
            <p className="text-xs text-red-400 mb-6">Esta acción es irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmHardDeleteCatalog(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await hardDeleteProduct(confirmHardDeleteCatalog.id); setConfirmHardDeleteCatalog(null); }}
                className="flex-1 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales celulares ── */}
      <PhoneFormModal
        open={phoneModalOpen} title={editPhone ? 'Editar celular' : 'Nuevo celular'}
        form={phoneForm} onChange={handlePhoneChange} onSubmit={handlePhoneSubmit}
        onClose={() => setPhoneModalOpen(false)} saving={savingPhone}
        uploadImage={uploadImage} storageImages={storageImages} loadingImages={loadingImages}
        deviceType="phone"
      />

      {confirmDeletePhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-600" /></div>
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">¿Eliminar celular?</h3>
            <p className="text-sm text-gray-400 mb-1">{confirmDeletePhone.model} {confirmDeletePhone.color ?? ''} {confirmDeletePhone.capacity ?? ''}</p>
            <p className="text-xs text-gray-300 mb-6">Podrás recuperarlo desde "Eliminados".</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeletePhone(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await deletePhone(confirmDeletePhone.id); setConfirmDeletePhone(null); }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {confirmHardDeletePhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">Eliminar definitivamente</h3>
            <p className="text-sm text-gray-400 mb-2">{confirmHardDeletePhone.model}</p>
            <p className="text-xs text-red-400 mb-6">Esta acción es irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmHardDeletePhone(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await hardDeletePhone(confirmHardDeletePhone.id); setConfirmHardDeletePhone(null); }}
                className="flex-1 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales Macs ── */}
      <PhoneFormModal
        open={macModalOpen} title={editMac ? 'Editar Mac' : 'Nueva Mac'}
        form={macForm} onChange={handleMacChange} onSubmit={handleMacSubmit}
        onClose={() => setMacModalOpen(false)} saving={savingMac}
        uploadImage={uploadImage} storageImages={storageImages} loadingImages={loadingImages}
        deviceType="mac"
      />

      {confirmDeleteMac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-600" /></div>
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">¿Eliminar Mac?</h3>
            <p className="text-sm text-gray-400 mb-1">{confirmDeleteMac.model} {confirmDeleteMac.color ?? ''}</p>
            <p className="text-xs text-gray-300 mb-6">Podrás recuperarla desde "Eliminados".</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteMac(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await deleteMac(confirmDeleteMac.id); setConfirmDeleteMac(null); }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {confirmHardDeleteMac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="font-black text-lg text-[#0A0A0A] mb-2">Eliminar definitivamente</h3>
            <p className="text-sm text-gray-400 mb-2">{confirmHardDeleteMac.model}</p>
            <p className="text-xs text-red-400 mb-6">Esta acción es irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmHardDeleteMac(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={async () => { await hardDeleteMac(confirmHardDeleteMac.id); setConfirmHardDeleteMac(null); }}
                className="flex-1 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {exportModalOpen && (
        <DateRangeModal
          title={mainTab === 'accesorios' ? 'Exportar Accesorios' : mainTab === 'macs' ? 'Exportar Macs' : 'Exportar Celulares'}
          onExport={handleExport}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#0A0A0A]">Inventario</h2>
          <p className="text-gray-400 mt-1 text-sm">
            {mainTab === 'accesorios'
              ? `${counts.activos} activos · ${counts.inactivos} inactivos · ${counts.eliminados} eliminados`
              : mainTab === 'celulares'
                ? `${phones.filter(p => p.status === 'available').length} disponibles · ${phones.filter(p => p.status === 'sold').length} vendidos`
                : `${macs.filter(p => p.status === 'available').length} disponibles · ${macs.filter(p => p.status === 'sold').length} vendidos`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setExportModalOpen(true)}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          {mainTab === 'accesorios' && (
            <button onClick={openAdd}
              className="bg-[#0A0A0A] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98]">
              <Plus className="w-4 h-4" /> Nuevo accesorio
            </button>
          )}
          {mainTab === 'celulares' && phoneFilter !== 'eliminados' && (
            <button onClick={openAddPhone}
              className="bg-[#0A0A0A] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98]">
              <Plus className="w-4 h-4" /> Nuevo celular
            </button>
          )}
          {mainTab === 'macs' && macFilter !== 'eliminados' && (
            <button onClick={openAddMac}
              className="bg-[#0A0A0A] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98]">
              <Plus className="w-4 h-4" /> Nueva Mac
            </button>
          )}
        </div>
      </div>

      {/* Tabs principales */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'accesorios', label: 'Accesorios', Icon: Package },
          { key: 'celulares',  label: 'Celulares',  Icon: Smartphone },
          { key: 'macs',       label: 'Macs',        Icon: Monitor },
        ] as { key: MainTab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
          <button key={key}
            onClick={() => setMainTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mainTab === key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB ACCESORIOS ── */}
      {mainTab === 'accesorios' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="group bg-white border border-gray-200 rounded-xl flex items-center px-4 py-2.5 shadow-sm focus-within:border-[#0A0A0A] focus-within:shadow-md transition-all w-full sm:w-56">
              <Search className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0 group-focus-within:text-[#0A0A0A] transition-colors" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="outline-none text-sm w-full bg-transparent text-gray-700 placeholder:text-gray-300" />
            </div>
            <div className="relative">
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as CatalogCategoria | 'todas')}
                className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm font-medium text-gray-600 outline-none shadow-sm cursor-pointer">
                <option value="todas">Todas las categorías</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {(['activos', 'inactivos', 'eliminados', 'todos'] as FilterStatus[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  statusFilter === s ? 'bg-[#0A0A0A] text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['', 'SKU', 'Nombre', 'Categoría', 'Precio (Bs)', 'Stock', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">{query ? `Sin resultados para "${query}"` : 'No hay productos en esta vista.'}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const { cls, label } = statusRow(p);
                    const imgUrl = getImageUrl(p);
                    const isDeleted = !!p.deleted_at;
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 transition-colors ${isDeleted ? 'opacity-50' : 'hover:bg-[#FAFAFA]'}`}>
                        <td className="pl-4 py-3 w-12">
                          {imgUrl ? (
                            <img src={imgUrl} alt={p.nombre} className="w-10 h-10 object-contain rounded-lg bg-gray-50 border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                        <td className="px-4 py-3 font-semibold text-[#0A0A0A] max-w-[200px]"><span className="line-clamp-2 leading-snug">{p.nombre}</span></td>
                        <td className="px-4 py-3 text-gray-400 capitalize">{p.categoria}</td>
                        <td className="px-4 py-3 font-bold text-[#0A0A0A]">Bs {Number(p.precio).toLocaleString('es-BO')}</td>
                        <td className="px-4 py-3 text-gray-600 font-medium">{p.stock}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {!isDeleted ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(p)} title="Editar"
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => toggleActive(p.id, !p.activo)} title={p.activo ? 'Desactivar' : 'Activar'}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700">
                                {p.activo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setConfirmDelete(p)} title="Eliminar"
                                className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setConfirmRestoreCatalog(p)} title="Recuperar"
                                className="p-2 hover:bg-emerald-50 rounded-xl transition-colors text-gray-400 hover:text-emerald-600"><RotateCcw className="w-4 h-4" /></button>
                              <button onClick={() => setConfirmHardDeleteCatalog(p)} title="Eliminar definitivamente"
                                className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB CELULARES ── */}
      {mainTab === 'celulares' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {phoneFilter !== 'eliminados' && (
              <div className="group bg-white border border-gray-200 rounded-xl flex items-center px-4 py-2.5 shadow-sm focus-within:border-[#0A0A0A] transition-all w-full sm:w-56">
                <Search className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0 group-focus-within:text-[#0A0A0A] transition-colors" />
                <input type="text" value={phoneQuery} onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="Buscar modelo, color, IMEI…"
                  className="outline-none text-sm w-full bg-transparent text-gray-700 placeholder:text-gray-300" />
              </div>
            )}
            {deviceFilterBtns.map(({ value, label }) => (
              <button key={value} onClick={() => handlePhoneFilterChange(value as PhoneFilter)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${phoneFilter === value ? 'bg-[#0A0A0A] text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>

          {phoneFilter === 'eliminados' ? (
            <DeletedDeviceTable
              items={deletedPhones} emptyIcon={Smartphone}
              onRestore={(p) => restorePhone(p.id)}
              onHardDelete={(p) => setConfirmHardDeletePhone(p)}
            />
          ) : (
            <DeviceTable
              items={filteredPhones} loading={loadingPhones}
              emptyIcon={Smartphone} emptyText={phoneQuery ? `Sin resultados para "${phoneQuery}"` : 'No hay celulares registrados.'}
              onEdit={openEditPhone} onDelete={(p) => setConfirmDeletePhone(p)}
              onToggleVisibility={handlePhoneToggleVisibility}
            />
          )}
        </>
      )}

      {/* ── TAB MACS ── */}
      {mainTab === 'macs' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {macFilter !== 'eliminados' && (
              <div className="group bg-white border border-gray-200 rounded-xl flex items-center px-4 py-2.5 shadow-sm focus-within:border-[#0A0A0A] transition-all w-full sm:w-56">
                <Search className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0 group-focus-within:text-[#0A0A0A] transition-colors" />
                <input type="text" value={macQuery} onChange={(e) => setMacQuery(e.target.value)}
                  placeholder="Buscar modelo, color, N° serie…"
                  className="outline-none text-sm w-full bg-transparent text-gray-700 placeholder:text-gray-300" />
              </div>
            )}
            {deviceFilterBtns.map(({ value, label }) => (
              <button key={value} onClick={() => handleMacFilterChange(value as PhoneFilter)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${macFilter === value ? 'bg-[#0A0A0A] text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>

          {macFilter === 'eliminados' ? (
            <DeletedDeviceTable
              items={deletedMacs} emptyIcon={Monitor}
              onRestore={(p) => restoreMac(p.id)}
              onHardDelete={(p) => setConfirmHardDeleteMac(p)}
            />
          ) : (
            <DeviceTable
              items={filteredMacs} loading={loadingMacs}
              emptyIcon={Monitor} emptyText={macQuery ? `Sin resultados para "${macQuery}"` : 'No hay Macs registradas.'}
              onEdit={openEditMac} onDelete={(p) => setConfirmDeleteMac(p)}
              onToggleVisibility={handleMacToggleVisibility}
            />
          )}
        </>
      )}
    </>
  );
}
