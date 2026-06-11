const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function readCache<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { data: T[]; ts: number };
    if (Date.now() - parsed.ts > maxAgeMs) {
      localStorage.removeItem(key);
      return [];
    }
    return parsed.data ?? [];
  } catch { return []; }
}

export function writeCache<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function invalidateCache(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}
