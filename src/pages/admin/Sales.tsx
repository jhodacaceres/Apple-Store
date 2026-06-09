import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useOutletContext } from 'react-router-dom';
import {
  Download, Plus, Eye, X, ShoppingBag, Pencil, Trash2, RotateCcw,
  AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCatalogProducts } from '../../hooks/useCatalogProducts';
import DateRangeModal from '../../components/DateRangeModal';
import SearchableSelect from '../../components/SearchableSelect';
import type { Order } from '../../lib/types';

// ──────────────────────────────────────────────────────────
// Caché y paginación
// ──────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const CK_ORDERS = 'az_orders_v1';

function readCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ((JSON.parse(raw) as { data: T[] }).data ?? []) : [];
  } catch { return []; }
}
function writeCache<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function Pagination({ page, total, dark, onPrev, onNext }: {
  page: number; total: number; dark: boolean;
  onPrev: () => void; onNext: () => void;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const start = page * PAGE_SIZE + 1;
  const end   = Math.min((page + 1) * PAGE_SIZE, total);
  const btn   = `flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-colors ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`;
  return (
    <div className={`flex items-center justify-between px-5 py-3 border-t text-xs ${dark ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
      <span>{start}–{end} de {total}</span>
      <div className="flex gap-1">
        <button onClick={onPrev} disabled={page === 0} className={btn}>
          <ChevronLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <button onClick={onNext} disabled={page >= pages - 1} className={btn}>
          Siguiente <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────
type ProductType = 'phone' | 'mac' | 'accessory';

type NewSaleForm = {
  product_type: ProductType;
  customer_name: string;
  customer_phone: string;
  product_id: string;
  catalog_product_id: string;
  total_price: string;
  status: 'pending' | 'completed' | 'cancelled';
};

type EditForm = {
  customer_name: string;
  customer_phone: string;
  total_price: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
};

const EMPTY_FORM: NewSaleForm = {
  product_type: 'phone',
  customer_name: '',
  customer_phone: '',
  product_id: '',
  catalog_product_id: '',
  total_price: '',
  status: 'completed',
};

const statusStyle = (s: Order['status']) => {
  if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (s === 'cancelled')  return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};
const statusLabel = (s: Order['status']) =>
  ({ completed: 'Completado', cancelled: 'Cancelado', pending: 'Pendiente' })[s];

function getProductName(o: Order): string {
  if (o.products) return [o.products.model, o.products.capacity].filter(Boolean).join(' ');
  if (o.catalog_products) return o.catalog_products.nombre;
  return '—';
}

function getProductType(o: Order): string {
  if (!o.product_id && !o.catalog_product_id) return '—';
  if (o.catalog_product_id) return 'Accesorio';
  if (o.products?.device_type === 'mac') return 'Mac';
  return 'Celular';
}

type SalesTab = 'active' | 'deleted';

// ──────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────
export default function Sales() {
  const { isAdminDarkMode: dark } = useOutletContext<{ isAdminDarkMode: boolean }>();

  const {
    orders, deletedOrders, loading,
    addOrder, updateOrder, cancelOrder,
    restoreOrder, hardDeleteOrder, loadDeletedOrders, reload,
  } = useOrders();
  const { products: phones }       = useProducts('phone');
  const { products: macs }         = useProducts('mac');
  const { products: catalogItems } = useCatalogProducts();

  // ── Caché inicial ──
  const [cachedOrders] = useState<Order[]>(() => readCache(CK_ORDERS));
  const ordersData = (loading && orders.length === 0) ? cachedOrders : orders;

  // Escribir caché cuando los datos cambian
  useEffect(() => { if (!loading) writeCache(CK_ORDERS, orders); }, [orders, loading]);

  // ── Real-time: sincronizar desde cualquier cuenta ──
  useEffect(() => {
    const ch = supabase
      .channel('sales_orders_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { reload(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);

  // ── UI state ──
  const [tab, setTab]                   = useState<SalesTab>('active');
  const [modalOpen, setModalOpen]       = useState(false);
  const [detailOrder, setDetailOrder]   = useState<Order | null>(null);
  const [editOrder, setEditOrder]       = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder]   = useState<Order | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Order | null>(null);
  const [form, setForm]                 = useState<NewSaleForm>(EMPTY_FORM);
  const [editForm, setEditForm]         = useState<EditForm>({ customer_name: '', customer_phone: '', total_price: '', status: 'completed', notes: '' });
  const [saving, setSaving]             = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // ── Paginación ──
  const [ordersPage,  setOrdersPage]  = useState(0);
  const [deletedPage, setDeletedPage] = useState(0);

  useEffect(() => { setOrdersPage(0); setDeletedPage(0); }, [tab]);

  const paginatedOrders  = useMemo(() => ordersData.slice(ordersPage * PAGE_SIZE, (ordersPage + 1) * PAGE_SIZE),   [ordersData, ordersPage]);
  const paginatedDeleted = useMemo(() => deletedOrders.slice(deletedPage * PAGE_SIZE, (deletedPage + 1) * PAGE_SIZE), [deletedOrders, deletedPage]);

  // Clases dark-aware
  const FIELD = `w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${
    dark
      ? 'bg-gray-700 border-gray-600 text-white focus:border-white/50 placeholder-gray-400'
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#0A0A0A] focus:ring-2 focus:ring-black/5'
  }`;
  const cardClass = `rounded-2xl border shadow-sm overflow-x-auto ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const thClass   = `px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 ${dark ? 'border-gray-700' : 'border-gray-100'}`;
  const trClass   = `border-b transition-colors ${dark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-50 hover:bg-[#FAFAFA]'}`;
  const tdClass   = `px-5 py-4`;

  const availablePhones = useMemo(() => phones.filter((p) => p.status === 'available'), [phones]);
  const availableMacs   = useMemo(() => macs.filter((p) => p.status === 'available'), [macs]);
  const availableAcc    = useMemo(() => catalogItems.filter((p) => !p.deleted_at && p.activo && p.stock > 0), [catalogItems]);

  const handleChange = (field: keyof NewSaleForm, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'product_type') {
        updated.product_id         = '';
        updated.catalog_product_id = '';
        updated.total_price        = '';
      }
      if (field === 'product_id') {
        const p = [...phones, ...macs].find((pr) => pr.id === value);
        if (p) updated.total_price = String(p.price);
      }
      if (field === 'catalog_product_id') {
        const p = catalogItems.find((pr) => pr.id === value);
        if (p) updated.total_price = String(p.precio);
      }
      return updated;
    });
  };

  const handleSave = async () => {
    const isPhone = form.product_type !== 'accessory';
    if (!form.customer_name || !form.total_price) return;
    if (isPhone && !form.product_id)           return;
    if (!isPhone && !form.catalog_product_id)  return;

    setSaving(true);
    const err = await addOrder({
      customer_name:      form.customer_name,
      customer_phone:     form.customer_phone || undefined,
      product_id:         isPhone ? form.product_id : undefined,
      catalog_product_id: !isPhone ? form.catalog_product_id : undefined,
      total_price:        parseFloat(form.total_price),
      status:             form.status,
    });

    if (!err) {
      if (form.status === 'completed') {
        if (isPhone) {
          await supabase.from('products').update({ status: 'sold' }).eq('id', form.product_id);
        } else {
          const { data: acc } = await supabase
            .from('catalog_products').select('stock').eq('id', form.catalog_product_id).single();
          if (acc && acc.stock > 0) {
            await supabase.from('catalog_products').update({ stock: acc.stock - 1 }).eq('id', form.catalog_product_id);
          }
        }
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      reload();
    }
    setSaving(false);
  };

  const openEdit = (o: Order) => {
    setEditOrder(o);
    setEditForm({ customer_name: o.customer_name, customer_phone: o.customer_phone ?? '', total_price: String(o.total_price), status: o.status, notes: o.notes ?? '' });
  };

  const handleEditSave = async () => {
    if (!editOrder) return;
    setSaving(true);
    await updateOrder(editOrder.id, {
      customer_name:  editForm.customer_name,
      customer_phone: editForm.customer_phone || undefined,
      total_price:    parseFloat(editForm.total_price),
      status:         editForm.status,
      notes:          editForm.notes || undefined,
    });
    setSaving(false);
    setEditOrder(null);
  };

  const handleDelete = async () => {
    if (!deleteOrder) return;
    await cancelOrder(deleteOrder.id);
    setDeleteOrder(null);
  };

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return;
    await hardDeleteOrder(hardDeleteTarget.id);
    setHardDeleteTarget(null);
  };

  const handleTabChange = async (t: SalesTab) => {
    setTab(t);
    if (t === 'deleted') await loadDeletedOrders();
  };

  const handleExport = (from: Date | null, to: Date | null) => {
    setExportModalOpen(false);
    let data = orders;
    if (from || to) {
      data = data.filter((o) => {
        const d = new Date(o.created_at);
        if (from && d < from) return false;
        if (to && d > to)     return false;
        return true;
      });
    }
    const rows = data.map((o) => ({
      'ID Pedido':   o.order_number,
      Fecha:         new Date(o.created_at).toLocaleDateString('es-BO'),
      Cliente:       o.customer_name,
      Teléfono:      o.customer_phone ?? '',
      Producto:      getProductName(o),
      Tipo:          getProductType(o),
      'Total (Bs)':  o.total_price,
      Estado:        statusLabel(o.status),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `apple-zone-ventas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const modalBg   = dark ? 'bg-gray-800' : 'bg-white';
  const modalHead = dark ? 'border-gray-700' : 'border-gray-100';
  const modalText = dark ? 'text-white' : 'text-[#0A0A0A]';

  return (
    <div className="space-y-6">

      {/* Modal nueva venta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`flex items-center justify-between px-6 py-5 border-b ${modalHead}`}>
              <h3 className={`font-black text-lg ${modalText}`}>Registrar Venta</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100/10 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre del cliente *</label>
                <input type="text" value={form.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder="Carlos Mendoza" className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Teléfono (opcional)</label>
                <input type="text" value={form.customer_phone}
                  onChange={(e) => handleChange('customer_phone', e.target.value)}
                  placeholder="78901234" className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Tipo de producto *</label>
                <div className="flex gap-2">
                  {([
                    { value: 'phone',     label: 'Celular'   },
                    { value: 'mac',       label: 'Mac'       },
                    { value: 'accessory', label: 'Accesorio' },
                  ] as { value: ProductType; label: string }[]).map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => handleChange('product_type', value)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        form.product_type === value
                          ? 'bg-[#0A0A0A] text-white border-transparent'
                          : dark
                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-400'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.product_type === 'phone' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Equipo *</label>
                  <SearchableSelect
                    options={availablePhones.map((p) => ({
                      id: p.id,
                      label: `${p.model} ${p.color ?? ''} ${p.capacity ?? ''} — Bs ${p.price}`.replace(/\s+/g, ' ').trim(),
                    }))}
                    value={form.product_id}
                    onChange={(id) => handleChange('product_id', id)}
                    placeholder="Buscar celular…"
                    emptyText="No hay celulares disponibles."
                  />
                </div>
              )}
              {form.product_type === 'mac' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Mac *</label>
                  <SearchableSelect
                    options={availableMacs.map((p) => ({
                      id: p.id,
                      label: `${p.model} ${p.color ?? ''} ${p.capacity ?? ''} — Bs ${p.price}`.replace(/\s+/g, ' ').trim(),
                    }))}
                    value={form.product_id}
                    onChange={(id) => handleChange('product_id', id)}
                    placeholder="Buscar Mac…"
                    emptyText="No hay Macs disponibles."
                  />
                </div>
              )}
              {form.product_type === 'accessory' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Accesorio *</label>
                  <SearchableSelect
                    options={availableAcc.map((p) => ({
                      id: p.id,
                      label: `${p.nombre} — Bs ${p.precio}`,
                    }))}
                    value={form.catalog_product_id}
                    onChange={(id) => handleChange('catalog_product_id', id)}
                    placeholder="Buscar accesorio…"
                    emptyText="No hay accesorios con stock."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Total (Bs) *</label>
                <input type="number" value={form.total_price}
                  onChange={(e) => handleChange('total_price', e.target.value)}
                  placeholder="0" className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Estado</label>
                <select value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className={FIELD}
                  style={{ colorScheme: dark ? 'dark' : 'light' }}>
                  <option value="completed">Completado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${modalHead} flex justify-end gap-3`}>
              <button onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100/10 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving || !form.customer_name || !form.total_price ||
                  (form.product_type !== 'accessory' ? !form.product_id : !form.catalog_product_id)
                }
                className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar venta */}
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`flex items-center justify-between px-6 py-5 border-b ${modalHead}`}>
              <h3 className={`font-black text-lg ${modalText}`}>Editar Venta <span className="text-gray-400 text-sm font-mono">{editOrder.order_number}</span></h3>
              <button onClick={() => setEditOrder(null)} className="p-2 hover:bg-gray-100/10 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre del cliente *</label>
                <input type="text" value={editForm.customer_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Teléfono</label>
                <input type="text" value={editForm.customer_phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Total (Bs)</label>
                <input type="number" value={editForm.total_price}
                  onChange={(e) => setEditForm((f) => ({ ...f, total_price: e.target.value }))}
                  className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Estado</label>
                <select value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as EditForm['status'] }))}
                  className={FIELD}
                  style={{ colorScheme: dark ? 'dark' : 'light' }}>
                  <option value="completed">Completado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notas</label>
                <textarea value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={`${FIELD} resize-none`} />
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${modalHead} flex justify-end gap-3`}>
              <button onClick={() => setEditOrder(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100/10 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving || !editForm.customer_name || !editForm.total_price}
                className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar venta (soft delete) */}
      {deleteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${modalText}`}>¿Eliminar esta venta?</h3>
                  <p className="text-gray-400 text-sm mt-1">{deleteOrder.order_number} — {deleteOrder.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-amber-700 text-xs font-medium">
                  Las ventas eliminadas no se toman en cuenta en el cálculo del dashboard.
                </p>
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${modalHead} flex justify-end gap-3`}>
              <button onClick={() => setDeleteOrder(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100/10 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all active:scale-[0.98]">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar definitivamente */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${modalText}`}>Eliminar definitivamente</h3>
                  <p className="text-gray-400 text-sm mt-1">{hardDeleteTarget.order_number} — {hardDeleteTarget.customer_name}</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm">Esta acción es irreversible. La venta se borrará permanentemente.</p>
            </div>
            <div className={`px-6 py-4 border-t ${modalHead} flex justify-end gap-3`}>
              <button onClick={() => setHardDeleteTarget(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100/10 transition-colors">
                Cancelar
              </button>
              <button onClick={handleHardDelete}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-[0.98]">
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden`}>
            <div className={`flex items-center justify-between px-6 py-5 border-b ${modalHead}`}>
              <h3 className={`font-black text-lg ${modalText}`}>{detailOrder.order_number}</h3>
              <button onClick={() => setDetailOrder(null)} className="p-2 hover:bg-gray-100/10 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Cliente',  detailOrder.customer_name],
                ['Teléfono', detailOrder.customer_phone ?? '—'],
                ['Producto', getProductName(detailOrder)],
                ['Tipo',     getProductType(detailOrder)],
                ['Total',    `Bs ${Number(detailOrder.total_price).toLocaleString()}`],
                ['Fecha',    new Date(detailOrder.created_at).toLocaleString('es-BO')],
                ...(detailOrder.notes ? [['Notas', detailOrder.notes]] : []),
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider shrink-0">{label}</span>
                  <span className={`font-semibold text-right ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{val}</span>
                </div>
              ))}
              <div className="pt-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${statusStyle(detailOrder.status)}`}>
                  {statusLabel(detailOrder.status)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {exportModalOpen && (
        <DateRangeModal title="Exportar Ventas" onExport={handleExport} onClose={() => setExportModalOpen(false)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl md:text-3xl font-black ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Historial de Ventas</h2>
          <p className="text-gray-400 mt-1 text-sm">Revisa las transacciones y genera reportes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={orders.length === 0}
            className={`border px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-40 ${
              dark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}
            className="bg-[#0A0A0A] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 transition-all duration-200 shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Registrar Venta
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {([
          { key: 'active',  label: 'Activas' },
          { key: 'deleted', label: 'Eliminadas' },
        ] as { key: SalesTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === key
                ? dark ? 'bg-zinc-700 text-white' : 'bg-[#0A0A0A] text-white'
                : dark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabla activas */}
      {tab === 'active' && (
        <div className={cardClass}>
          <table className="w-full text-left text-sm min-w-[760px]">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                {['ID Pedido', 'Fecha', 'Cliente', 'Vendedor', 'Producto', 'Tipo', 'Total (Bs)', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && ordersData.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={trClass}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className={tdClass}>
                        <div className={`h-4 rounded animate-pulse w-20 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Aún no hay ventas. Registra la primera.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={o.id} className={trClass}>
                    <td className={tdClass}>
                      <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border ${dark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        {o.order_number}
                      </span>
                    </td>
                    <td className={`${tdClass} text-gray-400 text-xs`}>{new Date(o.created_at).toLocaleDateString('es-BO')}</td>
                    <td className={`${tdClass} font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{o.customer_name}</td>
                    <td className={`${tdClass} text-gray-400 text-xs`}>{o.created_by_name ?? '—'}</td>
                    <td className={`${tdClass} text-gray-500`}>{getProductName(o)}</td>
                    <td className={tdClass}>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        o.products?.device_type === 'mac'
                          ? 'bg-gray-100 text-gray-600'
                          : o.products
                            ? 'bg-blue-50 text-blue-600'
                            : o.catalog_products
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-gray-50 text-gray-400'
                      }`}>
                        {getProductType(o)}
                      </span>
                    </td>
                    <td className={`${tdClass} font-bold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                      Bs {Number(o.total_price).toLocaleString()}
                    </td>
                    <td className={tdClass}>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyle(o.status)}`}>
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className={`${tdClass} flex items-center gap-1`}>
                      <button onClick={() => setDetailOrder(o)}
                        className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(o)}
                        className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-blue-500" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteOrder(o)}
                        className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-red-500" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination page={ordersPage} total={ordersData.length} dark={dark}
            onPrev={() => setOrdersPage(p => p - 1)} onNext={() => setOrdersPage(p => p + 1)} />
        </div>
      )}

      {/* Tabla eliminadas */}
      {tab === 'deleted' && (
        <div className={cardClass}>
          {deletedOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No hay ventas eliminadas.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead>
                  <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                    {['ID Pedido', 'Fecha', 'Cliente', 'Producto', 'Total (Bs)', 'Eliminada', 'Acciones'].map((h) => (
                      <th key={h} className={thClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedDeleted.map((o) => (
                    <tr key={o.id} className={`${trClass} opacity-70`}>
                      <td className={tdClass}>
                        <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border ${dark ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                          {o.order_number}
                        </span>
                      </td>
                      <td className={`${tdClass} text-gray-400 text-xs`}>{new Date(o.created_at).toLocaleDateString('es-BO')}</td>
                      <td className={`${tdClass} font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{o.customer_name}</td>
                      <td className={`${tdClass} text-gray-500`}>{getProductName(o)}</td>
                      <td className={`${tdClass} font-bold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                        Bs {Number(o.total_price).toLocaleString()}
                      </td>
                      <td className={`${tdClass} text-gray-400 text-xs`}>
                        {o.deleted_at ? new Date(o.deleted_at).toLocaleDateString('es-BO') : '—'}
                      </td>
                      <td className={`${tdClass} flex items-center gap-1`}>
                        <button onClick={() => restoreOrder(o.id)}
                          className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-emerald-500" title="Recuperar">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => setHardDeleteTarget(o)}
                          className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-red-500" title="Eliminar definitivamente">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={deletedPage} total={deletedOrders.length} dark={dark}
                onPrev={() => setDeletedPage(p => p - 1)} onNext={() => setDeletedPage(p => p + 1)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
