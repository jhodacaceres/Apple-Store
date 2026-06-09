import { Link, useLocation } from 'react-router-dom';
import { SquaresFour, ShoppingBag, House, GridFour, ChatCircle } from '@phosphor-icons/react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  isAdminDarkMode?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

function getNavInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? 'AZ';
}

export default function Navbar({ isAdminDarkMode = false, isSidebarOpen = false, onToggleSidebar }: NavbarProps) {
  const location = useLocation();
  const { user, profile } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname === '/login';

  const isActive = (path: string) => location.pathname === path;
  const initials = getNavInitials(profile?.full_name, user?.email);

  return (
    <>
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${
        isAdminRoute && !isAdminDarkMode
          ? 'border-gray-200/80 bg-white/95'
          : 'border-white/10 bg-zinc-950/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo-mark.png"
              alt="Apple Zone"
              className="h-8 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className={`text-lg font-black tracking-tight hidden sm:inline ${isAdminRoute && !isAdminDarkMode ? 'text-[#0A0A0A]' : 'text-white'}`}>
              Apple<span className={isAdminRoute && !isAdminDarkMode ? 'text-gray-400' : 'text-white/40'}>Zone</span>
            </span>
          </Link>

          {isAdminRoute ? (
            <nav className="flex items-center gap-4">
              {/* Hamburger — solo mobile */}
              <button
                className={`md:hidden p-1.5 rounded-lg transition-colors ${isAdminDarkMode ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={onToggleSidebar}
                aria-label="Abrir menú"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/" className={`flex items-center gap-2 text-sm font-medium transition-colors ${isAdminDarkMode ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Volver a la tienda</span>
              </Link>
            </nav>
          ) : (
            !isLoginRoute && (
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                {[
                  { to: '/', label: 'Inicio' },
                  { to: '/catalog', label: 'Catálogo' },
                  { to: '/contact', label: 'Contacto' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} className="relative pb-0.5 group">
                    <span className={isActive(to) ? 'font-bold text-white' : 'text-white/60 group-hover:text-white transition-colors duration-200'}>
                      {label}
                    </span>
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-white rounded-full transition-all duration-300 ${isActive(to) ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                  </Link>
                ))}
              </nav>
            )
          )}

          <div className="flex items-center gap-3">
            {!isAdminRoute && !isLoginRoute && !user && (
              <Link
                to="/admin"
                className="flex items-center gap-2 border border-white/20 text-white/70 px-4 py-2 rounded-full text-xs font-semibold hover:bg-white hover:text-zinc-950 hover:border-transparent transition-all duration-200"
              >
                <SquaresFour className="w-4 h-4" />
                <span className="hidden sm:inline">Panel Admin</span>
              </Link>
            )}

            {!isAdminRoute && !isLoginRoute && user && (
              <Link
                to="/admin"
                className="flex items-center gap-2 bg-white text-zinc-950 px-4 py-2 rounded-full text-xs font-semibold hover:bg-white/90 transition-all duration-200"
              >
                <SquaresFour className="w-4 h-4" />
                <span className="hidden sm:inline">Panel Admin</span>
              </Link>
            )}

            {isAdminRoute && (
              <Link
                to="/admin/settings"
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border transition-all duration-200 ${
                  isAdminDarkMode
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
                title="Configuración"
              >
                {initials}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Navegación inferior (Móviles) */}
      {!isAdminRoute && !isLoginRoute && (
        <footer className="md:hidden fixed bottom-0 w-full bg-zinc-950/95 backdrop-blur-sm border-t border-white/10 shadow-lg z-50">
          <div className="px-6 py-3 flex justify-around">
            {[
              { to: '/', label: 'Inicio', Icon: House },
              { to: '/catalog', label: 'Catálogo', Icon: GridFour },
              { to: '/contact', label: 'Contacto', Icon: ChatCircle },
            ].map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                  isActive(to) ? 'bg-white text-zinc-950' : 'text-white/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        </footer>
      )}
    </>
  );
}
