import { supabase } from './supabase';

// ──────────────────────────────────────────────────────────
// Tracking de la web pública (visitas, permanencia, eventos).
// Escribe vía RPC SECURITY DEFINER: el visitante anónimo solo
// dispara operaciones acotadas, nunca lee datos.
// Toda llamada es "fire and forget": el tracking jamás debe
// romper la experiencia del usuario.
// ──────────────────────────────────────────────────────────

const VISITOR_KEY = 'az_visitor_id';   // persistente (localStorage)
const SESSION_KEY = 'az_session_id';   // por pestaña/visita (sessionStorage)

export type WhatsappSource = 'home' | 'contact' | 'order_modal';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeGet(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try { storage.setItem(key, value); } catch { /* modo privado / bloqueado */ }
}

export function getVisitorId(): string {
  let id = safeGet(localStorage, VISITOR_KEY);
  if (!id) {
    id = uuid();
    safeSet(localStorage, VISITOR_KEY, id);
  }
  return id;
}

export function getSessionId(): string {
  let id = safeGet(sessionStorage, SESSION_KEY);
  if (!id) {
    id = uuid();
    safeSet(sessionStorage, SESSION_KEY, id);
  }
  return id;
}

export function detectDevice(): 'mobile' | 'desktop' | 'tablet' {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/** Inicia la sesión de visita (idempotente del lado servidor). */
export function initSession(path: string): void {
  supabase
    .rpc('track_session_start', {
      p_session_id: getSessionId(),
      p_visitor_id: getVisitorId(),
      p_path: path,
      p_referrer: document.referrer || null,
      p_device: detectDevice(),
    })
    .then(undefined, () => {});
}

function emit(type: 'page_view' | 'whatsapp_click' | 'product_view', path: string, metadata: Record<string, unknown> = {}): void {
  supabase
    .rpc('track_event', {
      p_session_id: getSessionId(),
      p_visitor_id: getVisitorId(),
      p_type: type,
      p_path: path,
      p_metadata: metadata,
    })
    .then(undefined, () => {});
}

export function trackPageView(path: string): void {
  emit('page_view', path);
}

export function trackProductView(product: string): void {
  emit('product_view', window.location.pathname, { product });
}

export function trackWhatsappClick(source: WhatsappSource, product?: string): void {
  emit('whatsapp_click', window.location.pathname, product ? { source, product } : { source });
}

/** Heartbeat de permanencia: mantiene viva la sesión. */
export function sendPing(): void {
  supabase.rpc('track_ping', { p_session_id: getSessionId() }).then(undefined, () => {});
}
