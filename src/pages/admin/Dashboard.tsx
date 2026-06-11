import { useMemo, useState } from 'react';
import { TrendUp, DeviceMobile, Package, CurrencyDollar, Calendar, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useAdminTheme } from '../../contexts/AdminThemeContext';
import { useProducts } from '../../hooks/useProducts';
import { useOrders } from '../../hooks/useOrders';
import type { Order } from '../../lib/types';

type MetricColor = 'emerald' | 'blue' | 'violet' | 'amber';

const colorMap: Record<MetricColor, { bg: string; icon: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50',  icon: 'text-emerald-600', border: 'border-emerald-100' },
  blue:    { bg: 'bg-blue-50',     icon: 'text-blue-600',    border: 'border-blue-100'    },
  violet:  { bg: 'bg-violet-50',   icon: 'text-violet-600',  border: 'border-violet-100'  },
  amber:   { bg: 'bg-amber-50',    icon: 'text-amber-600',   border: 'border-amber-100'   },
};

type CategoryFilter = 'todos' | 'celulares' | 'macs' | 'fundas' | 'cargadores' | 'cables' | 'airpods' | 'accesorios';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'celulares',  label: 'Celulares' },
  { key: 'macs',       label: 'Macs' },
  { key: 'fundas',     label: 'Fundas' },
  { key: 'cargadores', label: 'Cargadores' },
  { key: 'cables',     label: 'Cables' },
  { key: 'airpods',    label: 'AirPods' },
  { key: 'accesorios', label: 'Accesorios' },
];

function toDateInput(d: Date) {
  return d.toISOString().split('T')[0];
}

function last30Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateInput(from), to: toDateInput(to) };
}

const chartBars = [40, 65, 50, 80, 45, 90, 70, 55, 85, 60, 75, 95];

export default function Dashboard() {
  const { isAdminDarkMode } = useAdminTheme();
  const { products, loading: loadingP } = useProducts('phone');
  const { products: macs, loading: loadingM } = useProducts('mac');
  const { orders, loading: loadingO } = useOrders();

  const [category, setCategory] = useState<CategoryFilter>('todos');
  const [dateRange, setDateRange] = useState(last30Days);

  const dark = isAdminDarkMode;
  const cardClass = `p-5 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const labelClass = `text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-400'}`;
  const valueClass = `text-3xl font-black mt-1 ${dark ? 'text-white' : 'text-[#0A0A0A]'}`;
  const inputClass = `border rounded-xl px-3 py-2 text-sm outline-none transition-all ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#0A0A0A]'}`;

  const metrics = useMemo(() => {
    const fromDate = new Date(dateRange.from + 'T00:00:00');
    const toDate   = new Date(dateRange.to   + 'T23:59:59');

    const isInRange = (o: Order) => {
      const d = new Date(o.created_at);
      return d >= fromDate && d <= toDate;
    };

    const matchesCategory = (o: Order): boolean => {
      if (category === 'todos') return true;
      if (category === 'celulares') return !!o.product_id && o.products?.device_type === 'phone';
      if (category === 'macs')      return !!o.product_id && o.products?.device_type === 'mac';
      return !!o.catalog_product_id && o.catalog_products?.categoria === category;
    };

    const isProductAlive = (o: Order) =>
      !(o.products?.deleted_at) && !(o.catalog_products?.deleted_at);

    const completed = orders.filter(
      (o) => o.status === 'completed' && isInRange(o) && matchesCategory(o) && isProductAlive(o)
    );

    const totalIncome = completed.reduce((sum, o) => sum + Number(o.total_price), 0);
    const sold = completed.length;

    // Comparativa vs período anterior de igual duración
    const rangeDays = Math.max(
      1,
      Math.round((toDate.getTime() - fromDate.getTime()) / 86400000)
    );
    const prevTo   = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - rangeDays * 86400000);
    const prevCompleted = orders.filter((o) => {
      const d = new Date(o.created_at);
      return (
        o.status === 'completed' &&
        d >= prevFrom &&
        d <= prevTo &&
        matchesCategory(o) &&
        isProductAlive(o)
      );
    });
    const prevCount = prevCompleted.length;
    const trend = prevCount > 0 ? (((sold - prevCount) / prevCount) * 100).toFixed(0) : null;

    // Disponibles según categoría
    let available = 0;
    if (category === 'todos' || category === 'celulares') {
      available += products.filter((p) => p.status === 'available').length;
    }
    if (category === 'todos' || category === 'macs') {
      available += macs.filter((p) => p.status === 'available').length;
    }

    return [
      {
        title: 'Ingresos Totales',
        value: `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
        icon: CurrencyDollar,
        trend: sold > 0 ? '+activo' : '—',
        trendUp: sold > 0,
        color: 'emerald' as MetricColor,
      },
      {
        title: 'Ventas',
        value: String(sold),
        icon: DeviceMobile,
        trend: trend !== null ? `${Number(trend) >= 0 ? '+' : ''}${trend}% vs período ant.` : '—',
        trendUp: trend !== null ? Number(trend) >= 0 : true,
        color: 'blue' as MetricColor,
      },
      {
        title: 'Disponibles',
        value: (category === 'todos' || category === 'celulares' || category === 'macs')
          ? String(available)
          : '—',
        icon: Package,
        trend: available > 0 ? 'en stock' : 'sin stock',
        trendUp: available > 0,
        color: 'violet' as MetricColor,
      },
      {
        title: 'Ventas (período)',
        value: String(sold),
        icon: TrendUp,
        trend: trend !== null ? `${Number(trend) >= 0 ? '+' : ''}${trend}% vs ant.` : '—',
        trendUp: trend !== null ? Number(trend) >= 0 : true,
        color: 'amber' as MetricColor,
      },
    ];
  }, [products, macs, orders, category, dateRange]);

  const loading = loadingP || loadingM || loadingO;

  const recentOrders = useMemo(() => {
    const fromDate = new Date(dateRange.from + 'T00:00:00');
    const toDate   = new Date(dateRange.to   + 'T23:59:59');
    return orders
      .filter((o) => {
        const d = new Date(o.created_at);
        return d >= fromDate && d <= toDate;
      })
      .slice(0, 5);
  }, [orders, dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl md:text-3xl font-black ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Dashboard</h2>
          <p className="text-gray-400 mt-1 text-sm">Resumen del rendimiento de la tienda.</p>
        </div>

        {/* Selector de fechas */}
        <div className={`flex flex-wrap items-center gap-2 p-3 rounded-2xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400">Desde</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400">Hasta</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className={inputClass}
            />
          </div>
          <button
            onClick={() => setDateRange(last30Days())}
            title="Últimos 30 días"
            className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <ArrowCounterClockwise className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chips de categoría */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              category === cat.key
                ? dark
                  ? 'bg-zinc-700 text-white'
                  : 'bg-[#0A0A0A] text-white'
                : dark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const colors = colorMap[metric.color];
          return (
            <div key={index} className={cardClass}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl border ${colors.bg} ${colors.border}`}>
                  <metric.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${metric.trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {metric.trend}
                </span>
              </div>
              <p className={labelClass}>{metric.title}</p>
              {loading ? (
                <div className="h-8 bg-gray-100 rounded mt-1 animate-pulse w-24" />
              ) : (
                <p className={valueClass}>{metric.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Ventas recientes */}
      <div className={`rounded-2xl border shadow-sm ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`px-6 py-5 border-b ${dark ? 'border-gray-700' : 'border-gray-50'}`}>
          <h3 className={`font-black text-base ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Ventas recientes</h3>
          <p className="text-xs text-gray-400 mt-0.5">Últimas 5 del período seleccionado</p>
        </div>
        {loading ? (
          <div className="p-6 flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="flex items-end gap-1.5 h-16 opacity-[0.08]">
              {chartBars.map((h, i) => (
                <div key={i} className="w-4 bg-[#0A0A0A] rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest">
              Sin ventas en el período seleccionado
            </p>
          </div>
        ) : (
          <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-50'}`}>
            {recentOrders.map((order) => {
              const productName = order.products
                ? [order.products.model, order.products.color, order.products.capacity].filter(Boolean).join(' ')
                : order.catalog_products?.nombre ?? '—';
              return (
                <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{order.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{productName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>${Number(order.total_price).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('es-BO')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
