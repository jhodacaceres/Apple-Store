import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, Truck, MapPin } from '@phosphor-icons/react';

const TRUST = [
  { Icon: ShieldCheck, text: 'Compra segura por WhatsApp' },
  { Icon: Clock,       text: 'Respuesta rápida' },
  { Icon: Truck,       text: 'Envío y retiro en Bolivia' },
  { Icon: MapPin,      text: 'Cochabamba, Bolivia' },
];

export default function Footer() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (pathname.startsWith('/admin') || pathname === '/login') return null;

  const scrollTo = (id: string) => {
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120);
    }
  };

  return (
    <footer className="bg-[#0A0A0A] border-t border-white/[0.06] py-10 pb-28 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Señales de confianza */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {TRUST.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 text-white/25 flex-shrink-0" />
              <span className="text-xs text-white/30 font-medium leading-snug">{text}</span>
            </div>
          ))}
        </div>

        {/* Línea inferior */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="h-5 w-auto opacity-40" aria-hidden="true"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="text-white/30 text-xs font-bold tracking-tight">Apple Zone</span>
          </div>

          <nav className="flex items-center gap-5">
            {[
              { id: 'inicio',   label: 'Inicio'   },
              { id: 'catalogo', label: 'Catálogo' },
              { id: 'contacto', label: 'Contacto' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>

          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} Apple Zone · Bolivia
          </p>
        </div>

        {/* Enlaces legales */}
        <div className="flex items-center justify-center gap-5 mt-4">
          <Link to="/privacidad" className="text-xs text-white/20 hover:text-white/50 transition-colors">
            Política de Privacidad
          </Link>
          <Link to="/terminos" className="text-xs text-white/20 hover:text-white/50 transition-colors">
            Términos de Servicio
          </Link>
        </div>

      </div>
    </footer>
  );
}
