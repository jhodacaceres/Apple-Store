import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AnalyticsSummary, VisitsByDay, TopProduct, StorageStats } from '../lib/types';

interface DateRange {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
}

interface AnalyticsData {
  summary: AnalyticsSummary | null;
  visitsByDay: VisitsByDay[];
  topProducts: TopProduct[];
  storage: StorageStats | null;
}

const EMPTY: AnalyticsData = { summary: null, visitsByDay: [], topProducts: [], storage: null };

/** Lee las métricas del panel admin para un rango de fechas (RPC de Supabase). */
export function useAnalytics(range: DateRange) {
  const [data, setData]   = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fromIso = `${range.from}T00:00:00`;
  const toIso   = `${range.to}T23:59:59`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, visitsRes, productsRes, storageRes] = await Promise.all([
        supabase.rpc('get_analytics_summary', { p_from: fromIso, p_to: toIso }),
        supabase.rpc('get_visits_by_day',     { p_from: fromIso, p_to: toIso }),
        supabase.rpc('get_top_products',      { p_from: fromIso, p_to: toIso, p_limit: 8 }),
        supabase.rpc('get_storage_stats'),
      ]);

      const firstErr = summaryRes.error ?? visitsRes.error ?? productsRes.error ?? storageRes.error;
      if (firstErr) {
        setError(firstErr.message);
      } else {
        setData({
          summary:     (summaryRes.data as AnalyticsSummary) ?? null,
          visitsByDay: (visitsRes.data as VisitsByDay[]) ?? [],
          topProducts: (productsRes.data as TopProduct[]) ?? [],
          storage:     (storageRes.data as StorageStats) ?? null,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
    setLoading(false);
  }, [fromIso, toIso]);

  useEffect(() => { load(); }, [load]);

  return { ...data, loading, error, reload: load };
}
