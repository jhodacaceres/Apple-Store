import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users, UserCheck, Clock, MessageCircle, LogOut, Calendar, RotateCcw,
  HardDrive, Database, Eye, TrendingUp,
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';

// Límites del plan Free de Supabase (configurables si cambias de plan).
const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024;   // 1 GB
const DB_LIMIT_BYTES      = 500 * 1024 * 1024;        // 500 MB

type MetricColor = 'blue' | 'violet' | 'amber' | 'emerald' | 'rose';

const colorMap: Record<MetricColor, { bg: string; icon: string; border: string }> = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    border: 'border-blue-100'    },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100'  },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100'   },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    border: 'border-rose-100'    },
};

function toDateInput(d: Date) {
  return d.toISOString().split('T')[0];
}

function last30Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateInput(from), to: toDateInput(to) };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

/** Devuelve color e indicación según el % de uso de espacio. */
function gaugeState(pct: number) {
  if (pct >= 90) return { bar: 'bg-rose-500',    text: 'text-rose-600',    note: 'Crítico: conviene liberar espacio ya.' };
  if (pct >= 70) return { bar: 'bg-amber-500',   text: 'text-amber-600',   note: 'Atención: planifica un mantenimiento pronto.' };
  return            { bar: 'bg-emerald-500', text: 'text-emerald-600', note: 'Espacio saludable.' };
}

export default function Metrics() {
  const { isAdminDarkMode } = useOutletContext<{ isAdminDarkMode: boolean }>();
  const [dateRange, setDateRange] = useState(last30Days);
  const { summary, visitsByDay, topProducts, storage, loading } = useAnalytics(dateRange);

  const dark = isAdminDarkMode;
  const cardClass  = `p-5 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const panelClass = `rounded-2xl border shadow-sm ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-gray-400';
  const valueClass = `text-3xl font-black mt-1 ${dark ? 'text-white' : 'text-[#0A0A0A]'}`;
  const inputClass = `border rounded-xl px-3 py-2 text-sm outline-none transition-all ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#0A0A0A]'}`;

  const cards: { title: string; value: string; sub: string; icon: typeof Users; color: MetricColor }[] = [
    { title: 'Visitas',          value: String(summary?.total_visits ?? 0),                       sub: 'En el período',                                  icon: Users,         color: 'blue'    },
    { title: 'Visitantes únicos', value: String(summary?.unique_visitors ?? 0),                   sub: 'Personas distintas',                             icon: UserCheck,     color: 'violet'  },
    { title: 'Permanencia media', value: formatDuration(summary?.avg_duration_seconds ?? 0),      sub: 'Tiempo por visita',                              icon: Clock,         color: 'amber'   },
    { title: 'Clics WhatsApp',    value: String(summary?.whatsapp_clicks ?? 0),                   sub: `${summary?.conversion_rate ?? 0}% de conversión`, icon: MessageCircle, color: 'emerald' },
    { title: 'Tasa de rebote',    value: `${summary?.bounce_rate ?? 0}%`,                          sub: 'Entran y se van',                                icon: LogOut,        color: 'rose'    },
  ];

  const maxVisits = Math.max(1, ...visitsByDay.map((d) => d.visits));
  const maxViews  = Math.max(1, ...topProducts.map((p) => p.views));

  const storageBytes = storage?.storage_bytes ?? 0;
  const dbBytes      = storage?.db_bytes ?? 0;
  const storagePct   = Math.min(100, (storageBytes / STORAGE_LIMIT_BYTES) * 100);
  const dbPct        = Math.min(100, (dbBytes / DB_LIMIT_BYTES) * 100);

  return (
    <div className="space-y-6">
      {/* Encabezado + rango de fechas */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl md:text-3xl font-black ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Métricas</h2>
          <p className="text-gray-400 mt-1 text-sm">Tráfico de la web y espacio del sistema.</p>
        </div>

        <div className={`flex flex-wrap items-center gap-2 p-3 rounded-2xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400">Desde</label>
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400">Hasta</label>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))} className={inputClass} />
          </div>
          <button
            onClick={() => setDateRange(last30Days())}
            title="Últimos 30 días"
            className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tarjetas de tráfico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const colors = colorMap[c.color];
          return (
            <div key={c.title} className={cardClass}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl border ${colors.bg} ${colors.border}`}>
                  <c.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
              </div>
              <p className={labelClass}>{c.title}</p>
              {loading ? (
                <div className="h-8 bg-gray-100 rounded mt-1 animate-pulse w-20" />
              ) : (
                <p className={valueClass}>{c.value}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Espacio y mantenimiento */}
      <div className={panelClass}>
        <div className={`px-6 py-5 border-b ${dark ? 'border-gray-700' : 'border-gray-50'}`}>
          <h3 className={`font-black text-base ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Espacio y mantenimiento</h3>
          <p className="text-xs text-gray-400 mt-0.5">Uso del plan Free de Supabase. Limpia cuando se acerque al límite.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage */}
          <SpaceGauge
            dark={dark} loading={loading}
            icon={HardDrive} title="Almacenamiento (imágenes)"
            usedLabel={formatBytes(storageBytes)} limitLabel={formatBytes(STORAGE_LIMIT_BYTES)}
            pct={storagePct} extra={`${storage?.storage_objects ?? 0} archivos`}
          />
          {/* Base de datos */}
          <SpaceGauge
            dark={dark} loading={loading}
            icon={Database} title="Base de datos"
            usedLabel={formatBytes(dbBytes)} limitLabel={formatBytes(DB_LIMIT_BYTES)}
            pct={dbPct} extra="Registros y tablas"
          />
        </div>
      </div>

      {/* Visitas por día + Productos más vistos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas por día */}
        <div className={panelClass}>
          <div className={`px-6 py-5 border-b ${dark ? 'border-gray-700' : 'border-gray-50'}`}>
            <h3 className={`font-black text-base ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Visitas por día</h3>
            <p className="text-xs text-gray-400 mt-0.5">Tendencia del período seleccionado</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visitsByDay.length === 0 ? (
              <EmptyState icon={TrendingUp} text="Sin visitas en el período" />
            ) : (
              <div className="flex items-end gap-1.5 h-40 overflow-x-auto">
                {visitsByDay.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1 min-w-[14px] group">
                    <div
                      className={`w-full rounded-t ${dark ? 'bg-blue-500/70' : 'bg-blue-500'} transition-all`}
                      style={{ height: `${(d.visits / maxVisits) * 100}%` }}
                      title={`${d.day}: ${d.visits} visita${d.visits !== 1 ? 's' : ''}`}
                    />
                    <span className="text-[9px] text-gray-400 rotate-0">{d.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Productos más vistos */}
        <div className={panelClass}>
          <div className={`px-6 py-5 border-b ${dark ? 'border-gray-700' : 'border-gray-50'}`}>
            <h3 className={`font-black text-base ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>Productos más vistos</h3>
            <p className="text-xs text-gray-400 mt-0.5">Top 8 del período</p>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : topProducts.length === 0 ? (
              <EmptyState icon={Eye} text="Aún no hay vistas de producto" />
            ) : (
              <div className="space-y-1">
                {topProducts.map((p, i) => (
                  <div key={`${p.product}-${i}`} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-semibold truncate pr-2 ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                        {i + 1}. {p.product}
                      </span>
                      <span className="text-xs font-bold text-gray-400 flex-shrink-0">{p.views}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────

interface SpaceGaugeProps {
  dark: boolean;
  loading: boolean;
  icon: typeof HardDrive;
  title: string;
  usedLabel: string;
  limitLabel: string;
  pct: number;
  extra: string;
}

function SpaceGauge({ dark, loading, icon: Icon, title, usedLabel, limitLabel, pct, extra }: SpaceGaugeProps) {
  const state = gaugeState(pct);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${dark ? 'text-gray-300' : 'text-gray-500'}`} />
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{title}</span>
        </div>
        <span className={`text-sm font-black ${state.text}`}>{loading ? '…' : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className={`h-3 rounded-full overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className={`h-full rounded-full ${state.bar} transition-all duration-500`} style={{ width: `${loading ? 0 : pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{loading ? '—' : `${usedLabel} de ${limitLabel}`}</span>
        <span className="text-xs text-gray-400">{extra}</span>
      </div>
      {!loading && <p className={`text-xs font-semibold mt-1.5 ${state.text}`}>{state.note}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Eye; text: string }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center gap-3">
      <Icon className="w-8 h-8 text-gray-200" />
      <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest">{text}</p>
    </div>
  );
}
