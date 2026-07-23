import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  DownloadSimple, Plus, Eye, X, ShoppingBag, PencilSimple, Trash, ArrowCounterClockwise,
  Warning,
} from '@phosphor-icons/react';
import { useAdminTheme } from '../../contexts/AdminThemeContext';
import { readCache, writeCache } from '../../lib/cache';
import Pagination from '../../components/Pagination';
import { supabase } from '../../lib/supabase';
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCatalogProducts } from '../../hooks/useCatalogProducts';
import DateRangeModal from '../../components/DateRangeModal';
import SearchableSelect from '../../components/SearchableSelect';
import type { Venta } from '../../lib/types';

// ──────────────────────────────────────────────────────────
// Caché y paginación
// ──────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const CK_ORDERS = 'az_orders_v1';

// ──────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────
type ProductType = 'telefono' | 'mac' | 'accessory';

type NewSaleForm = {
  product_type: ProductType;
  customer_name: string;
  customer_phone: string;
  product_id: string;
  catalog_product_id: string;
  total_price: string;
  status: 'pendiente' | 'completada' | 'cancelada';
};

type EditForm = {
  customer_name: string;
  customer_phone: string;
  total_price: string;
  status: 'pendiente' | 'completada' | 'cancelada';
  notes: string;
};

const EMPTY_FORM: NewSaleForm = {
  product_type: 'telefono',
  customer_name: '',
  customer_phone: '',
  product_id: '',
  catalog_product_id: '',
  total_price: '',
  status: 'completada',
};

const statusStyle = (s: Venta['estado']) => {
  if (s === 'completada') return 'bg-emerald-100 text-emerald-700';
  if (s === 'cancelada')  return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};
const statusLabel = (s: Venta['estado']) =>
  ({ completada: 'Completado', cancelada: 'Cancelado', pendiente: 'Pendiente' })[s];

function getProductName(o: Venta): string {
  if (o.equipos) return [o.equipos.modelo, o.equipos.capacidad].filter(Boolean).join(' ');
  if (o.accesorios) return o.accesorios.nombre;
  return '—';
}

function getProductType(o: Venta): string {
  if (!o.equipo_id && !o.accesorio_id) return '—';
  if (o.accesorio_id) return 'Accesorio';
  if (o.equipos?.tipo_dispositivo === 'mac') return 'Mac';
  return 'Celular';
}

type SalesTab = 'active' | 'deleted';

type RestoreCheck =
  | { type: 'conflict'; order: Venta; conflictOrder: Venta }
  | { type: 'blocked';  order: Venta; reason: string }
  | null;

// ──────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────
export default function Sales() {
  const { isAdminDarkMode: dark } = useAdminTheme();

  const {
    orders, deletedOrders, loading,
    addOrder, updateOrder, cancelOrder,
    restoreOrder, hardDeleteOrder, loadDeletedOrders, reload,
  } = useOrders();
  const { products: phones, reload: reloadPhones } = useProducts('telefono');
  const { products: macs,   reload: reloadMacs   } = useProducts('mac');
  const { products: catalogItems } = useCatalogProducts();

  // ── Caché inicial ──
  const [cachedOrders] = useState<Venta[]>(() => readCache(CK_ORDERS));
  const ordersData = (loading && orders.length === 0) ? cachedOrders : orders;

  // Escribir caché cuando los datos cambian
  useEffect(() => { if (!loading) writeCache(CK_ORDERS, orders); }, [orders, loading]);

  // ── Real-time: sincronizar desde cualquier cuenta ──
  useEffect(() => {
    const ch = supabase
      .channel('sales_orders_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => { reload(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);

  // ── UI state ──
  const [tab, setTab]                   = useState<SalesTab>('active');
  const [modalOpen, setModalOpen]       = useState(false);
  const [detailOrder, setDetailOrder]   = useState<Venta | null>(null);
  const [editOrder, setEditOrder]       = useState<Venta | null>(null);
  const [deleteOrder, setDeleteOrder]   = useState<Venta | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Venta | null>(null);
  const [form, setForm]                 = useState<NewSaleForm>(EMPTY_FORM);
  const [editForm, setEditForm]         = useState<EditForm>({ customer_name: '', customer_phone: '', total_price: '', status: 'completada', notes: '' });
  const [saving, setSaving]             = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [restoreCheck, setRestoreCheck] = useState<RestoreCheck>(null);
  const [resolvingSaving, setResolvingSaving] = useState(false);

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

  const availablePhones = useMemo(() => phones.filter((p) => p.estado === 'disponible'), [phones]);
  const availableMacs   = useMemo(() => macs.filter((p) => p.estado === 'disponible'), [macs]);
  const availableAcc    = useMemo(() => catalogItems.filter((p) => p.activo && p.stock > 0), [catalogItems]);

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
        if (p) updated.total_price = String(p.precio);
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
      cliente_nombre:  form.customer_name,
      cliente_telefono: form.customer_phone || undefined,
      equipo_id:       isPhone ? form.product_id : undefined,
      accesorio_id:    !isPhone ? form.catalog_product_id : undefined,
      precio_total:    parseFloat(form.total_price),
      estado:          form.status,
    });

    if (!err) {
      if (form.status === 'completada') {
        if (isPhone) {
          await supabase.from('equipos').update({ estado: 'vendido' }).eq('id', form.product_id);
        } else {
          const { data: acc } = await supabase
            .from('accesorios').select('stock').eq('id', form.catalog_product_id).single();
          if (acc && acc.stock > 0) {
            await supabase.from('accesorios').update({ stock: acc.stock - 1 }).eq('id', form.catalog_product_id);
          }
        }
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      reload();
      reloadPhones();
      reloadMacs();
    }
    setSaving(false);
  };

  const openEdit = (o: Venta) => {
    setEditOrder(o);
    setEditForm({ customer_name: o.cliente_nombre, customer_phone: o.cliente_telefono ?? '', total_price: String(o.precio_total), status: o.estado, notes: o.notas ?? '' });
  };

  const handleEditSave = async () => {
    if (!editOrder) return;
    setSaving(true);
    await updateOrder(editOrder.id, {
      cliente_nombre:  editForm.customer_name,
      cliente_telefono: editForm.customer_phone || undefined,
      precio_total:    parseFloat(editForm.total_price),
      estado:          editForm.status,
      notas:           editForm.notes || undefined,
    });
    setSaving(false);
    setEditOrder(null);
  };

  const handleDelete = async () => {
    if (!deleteOrder) return;
    await cancelOrder(deleteOrder);
    reloadPhones();
    reloadMacs();
    setDeleteOrder(null);
  };

  const checkAndRestore = async (order: Venta) => {
    if (order.estado !== 'completada') {
      await restoreOrder(order);
      reloadPhones(); reloadMacs();
      return;
    }

    if (order.equipo_id) {
      const { data: conflict } = await supabase
        .from('ventas')
        .select('id, numero_venta, cliente_nombre, cliente_telefono, creado_en, precio_total, estado, eliminado_en, notas, equipo_id, accesorio_id')
        .eq('equipo_id', order.equipo_id)
        .is('eliminado_en', null)
        .neq('id', order.id)
        .maybeSingle();

      if (conflict) {
        setRestoreCheck({ type: 'conflict', order, conflictOrder: conflict as Venta });
        return;
      }
    } else if (order.accesorio_id) {
      const { data: acc } = await supabase
        .from('accesorios')
        .select('stock, nombre')
        .eq('id', order.accesorio_id)
        .single();

      if (acc && acc.stock === 0) {
        setRestoreCheck({
          type: 'blocked',
          order,
          reason: `El accesorio "${acc.nombre}" no tiene stock disponible.`,
        });
        return;
      }
    }

    await restoreOrder(order);
    reloadPhones(); reloadMacs();
  };

  const handleConflictKeepThis = async () => {
    if (!restoreCheck || restoreCheck.type !== 'conflict') return;
    setResolvingSaving(true);
    await cancelOrder(restoreCheck.conflictOrder);
    await restoreOrder(restoreCheck.order);
    reloadPhones(); reloadMacs();
    setResolvingSaving(false);
    setRestoreCheck(null);
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
        const d = new Date(o.creado_en);
        if (from && d < from) return false;
        if (to && d > to)     return false;
        return true;
      });
    }
    const rows = data.map((o) => ({
      'ID Pedido':   o.numero_venta,
      Fecha:         new Date(o.creado_en).toLocaleDateString('es-BO'),
      Cliente:       o.cliente_nombre,
      Teléfono:      o.cliente_telefono ?? '',
      Producto:      getProductName(o),
      Tipo:          getProductType(o),
      'Total (Bs)':  o.precio_total,
      Estado:        statusLabel(o.estado),
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
                    { value: 'telefono',  label: 'Celular'   },
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

              {form.product_type === 'telefono' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Equipo *</label>
                  <SearchableSelect
                    options={availablePhones.map((p) => ({
                      id: p.id,
                      label: `${p.modelo} ${p.color ?? ''} ${p.capacidad ?? ''} — Bs ${p.precio}`.replace(/\s+/g, ' ').trim(),
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
                      label: `${p.modelo} ${p.color ?? ''} ${p.capacidad ?? ''} — Bs ${p.precio}`.replace(/\s+/g, ' ').trim(),
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
                  <option value="completada">Completado</option>
                  <option value="pendiente">Pendiente</option>
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
              <h3 className={`font-black text-lg ${modalText}`}>Editar Venta <span className="text-gray-400 text-sm font-mono">{editOrder.numero_venta}</span></h3>
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
                  <option value="completada">Completado</option>
                  <option value="pendiente">Pendiente</option>
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
                  <Warning className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${modalText}`}>¿Eliminar esta venta?</h3>
                  <p className="text-gray-400 text-sm mt-1">{deleteOrder.numero_venta} — {deleteOrder.cliente_nombre}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Warning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
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
                  <Trash className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${modalText}`}>Eliminar definitivamente</h3>
                  <p className="text-gray-400 text-sm mt-1">{hardDeleteTarget.numero_venta} — {hardDeleteTarget.cliente_nombre}</p>
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
              <h3 className={`font-black text-lg ${modalText}`}>{detailOrder.numero_venta}</h3>
              <button onClick={() => setDetailOrder(null)} className="p-2 hover:bg-gray-100/10 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Cliente',  detailOrder.cliente_nombre],
                ['Teléfono', detailOrder.cliente_telefono ?? '—'],
                ['Producto', getProductName(detailOrder)],
                ['Tipo',     getProductType(detailOrder)],
                ['Total',    `Bs ${Number(detailOrder.precio_total).toLocaleString()}`],
                ['Fecha',    new Date(detailOrder.creado_en).toLocaleString('es-BO')],
                ...(detailOrder.notas ? [['Notas', detailOrder.notas]] : []),
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider shrink-0">{label}</span>
                  <span className={`font-semibold text-right ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{val}</span>
                </div>
              ))}
              <div className="pt-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${statusStyle(detailOrder.estado)}`}>
                  {statusLabel(detailOrder.estado)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {exportModalOpen && (
        <DateRangeModal title="Exportar Ventas" onExport={handleExport} onClose={() => setExportModalOpen(false)} />
      )}

      {/* Modal conflicto de equipo */}
      {restoreCheck?.type === 'conflict' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden`}>
            <div className={`flex items-center justify-between px-6 py-5 border-b ${modalHead}`}>
              <h3 className={`font-black text-lg ${modalText}`}>Conflicto de equipo</h3>
              <button onClick={() => setRestoreCheck(null)} className="p-2 hover:bg-gray-100/10 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Warning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-amber-700 text-xs font-medium">
                  Este equipo ya tiene otra venta activa. Elige cuál conservar como válida.
                </p>
              </div>
              <div className={`rounded-xl border overflow-hidden text-sm ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b ${dark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'}`}>
                  Venta a restaurar
                </div>
                <div className={`px-4 py-3 flex items-center justify-between gap-4 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                  <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border ${dark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                    {restoreCheck.order.numero_venta}
                  </span>
                  <span className={`font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{restoreCheck.order.cliente_nombre}</span>
                  <span className="text-gray-400 text-xs">{new Date(restoreCheck.order.creado_en).toLocaleDateString('es-BO')}</span>
                  <span className={`font-bold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Bs {Number(restoreCheck.order.precio_total).toLocaleString()}</span>
                </div>
                <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-t border-b ${dark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'}`}>
                  Venta activa en conflicto
                </div>
                <div className={`px-4 py-3 flex items-center justify-between gap-4 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
                  <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border ${dark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                    {restoreCheck.conflictOrder.numero_venta}
                  </span>
                  <span className={`font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{restoreCheck.conflictOrder.cliente_nombre}</span>
                  <span className="text-gray-400 text-xs">{new Date(restoreCheck.conflictOrder.creado_en).toLocaleDateString('es-BO')}</span>
                  <span className={`font-bold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Bs {Number(restoreCheck.conflictOrder.precio_total).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${modalHead} flex justify-end gap-3`}>
              <button onClick={() => setRestoreCheck(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100/10 transition-colors">
                Mantener la otra
              </button>
              <button onClick={handleConflictKeepThis} disabled={resolvingSaving}
                className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-2">
                {resolvingSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Conservar esta venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal restauración bloqueada */}
      {restoreCheck?.type === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`${modalBg} rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl shrink-0">
                  <Warning className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${modalText}`}>No se puede restaurar</h3>
                  <p className="text-gray-400 text-sm mt-1">{restoreCheck.reason}</p>
                </div>
              </div>
            </div>
            <div className={`px-6 py-4 border-t ${modalHead} flex justify-end`}>
              <button onClick={() => setRestoreCheck(null)}
                className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all active:scale-[0.98]">
                Entendido
              </button>
            </div>
          </div>
        </div>
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
            <DownloadSimple className="w-4 h-4" /> Exportar Excel
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
                        {o.numero_venta}
                      </span>
                    </td>
                    <td className={`${tdClass} text-gray-400 text-xs`}>{new Date(o.creado_en).toLocaleDateString('es-BO')}</td>
                    <td className={`${tdClass} font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{o.cliente_nombre}</td>
                    <td className={`${tdClass} text-gray-400 text-xs`}>{o.creado_por_nombre ?? '—'}</td>
                    <td className={`${tdClass} text-gray-500`}>{getProductName(o)}</td>
                    <td className={tdClass}>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        o.equipos?.tipo_dispositivo === 'mac'
                          ? 'bg-gray-100 text-gray-600'
                          : o.equipos
                            ? 'bg-blue-50 text-blue-600'
                            : o.accesorios
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-gray-50 text-gray-400'
                      }`}>
                        {getProductType(o)}
                      </span>
                    </td>
                    <td className={`${tdClass} font-bold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                      Bs {Number(o.precio_total).toLocaleString()}
                    </td>
                    <td className={tdClass}>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyle(o.estado)}`}>
                        {statusLabel(o.estado)}
                      </span>
                    </td>
                    <td className={`${tdClass} flex items-center gap-1`}>
                      <button onClick={() => setDetailOrder(o)}
                        className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(o)}
                        className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-blue-500" title="Editar">
                        <PencilSimple className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteOrder(o)}
                        className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-red-500" title="Eliminar">
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination page={ordersPage} total={ordersData.length} pageSize={PAGE_SIZE} dark={dark}
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
                          {o.numero_venta}
                        </span>
                      </td>
                      <td className={`${tdClass} text-gray-400 text-xs`}>{new Date(o.creado_en).toLocaleDateString('es-BO')}</td>
                      <td className={`${tdClass} font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{o.cliente_nombre}</td>
                      <td className={`${tdClass} text-gray-500`}>{getProductName(o)}</td>
                      <td className={`${tdClass} font-bold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                        Bs {Number(o.precio_total).toLocaleString()}
                      </td>
                      <td className={`${tdClass} text-gray-400 text-xs`}>
                        {o.eliminado_en ? new Date(o.eliminado_en).toLocaleDateString('es-BO') : '—'}
                      </td>
                      <td className={`${tdClass} flex items-center gap-1`}>
                        <button onClick={() => checkAndRestore(o)}
                          className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-emerald-500" title="Recuperar">
                          <ArrowCounterClockwise className="w-4 h-4" />
                        </button>
                        <button onClick={() => setHardDeleteTarget(o)}
                          className="p-1.5 hover:bg-gray-100/20 rounded-lg transition-colors text-gray-400 hover:text-red-500" title="Eliminar definitivamente">
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={deletedPage} total={deletedOrders.length} pageSize={PAGE_SIZE} dark={dark}
                onPrev={() => setDeletedPage(p => p - 1)} onNext={() => setDeletedPage(p => p + 1)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
