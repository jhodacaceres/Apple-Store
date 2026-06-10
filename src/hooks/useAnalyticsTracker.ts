import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initSession, trackPageView, sendPing } from '../lib/analytics';

const PING_INTERVAL_MS = 20_000;

// Rutas internas que NO se cuentan como tráfico de visitantes.
function isInternalPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password')
  );
}

/**
 * Registra visitas, vistas de página y permanencia de la web pública.
 * Se monta una sola vez en AppContent.
 */
export function useAnalyticsTracker(): void {
  const location = useLocation();
  const startedRef = useRef(false);

  // Inicio de sesión (una sola vez; guard contra el doble montaje de StrictMode).
  useEffect(() => {
    if (startedRef.current) return;
    if (isInternalPath(window.location.pathname)) return;
    startedRef.current = true;
    initSession(window.location.pathname);
  }, []);

  // Vista de página en cada navegación pública.
  useEffect(() => {
    if (isInternalPath(location.pathname)) return;
    // Asegura que la sesión exista aunque la primera carga fuese en /admin.
    if (!startedRef.current) {
      startedRef.current = true;
      initSession(location.pathname);
      return;
    }
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Heartbeat de permanencia mientras la pestaña esté visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && !isInternalPath(window.location.pathname)) {
        sendPing();
      }
    };
    const interval = window.setInterval(tick, PING_INTERVAL_MS);

    const onHide = () => {
      if (!isInternalPath(window.location.pathname)) sendPing();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);
}
