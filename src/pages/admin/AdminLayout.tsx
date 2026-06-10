import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  isAdminDarkMode: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'AZ';
}

export default function AdminLayout({ isAdminDarkMode, isSidebarOpen, setIsSidebarOpen }: AdminLayoutProps) {
  const { user, profile } = useAuth();

  const displayName  = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Usuario';
  const displayEmail = user?.email || '';
  const initials     = getInitials(profile?.full_name, user?.email);

  useEffect(() => {
    const prevBg     = document.body.style.backgroundColor;
    const prevScheme = document.documentElement.style.colorScheme;

    document.body.style.backgroundColor        = isAdminDarkMode ? '#111827' : '#FAFAFA';
    document.documentElement.style.colorScheme = isAdminDarkMode ? 'dark'    : 'light';

    return () => {
      document.body.style.backgroundColor        = prevBg;
      document.documentElement.style.colorScheme = prevScheme;
    };
  }, [isAdminDarkMode]);

  const bgMain    = isAdminDarkMode ? 'bg-gray-900 text-white' : 'bg-[#FAFAFA] text-[#1C1C1E]';
  const bgSidebar = isAdminDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-[#1C1C1E]';

  const navItemStyle = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      return `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border-l-4 ${
        isAdminDarkMode
          ? 'border-white/70 bg-white/8 text-white'
          : 'border-[#0A0A0A] bg-[#0A0A0A]/5 text-[#0A0A0A]'
      }`;
    }
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm border-l-4 border-transparent ${
      isAdminDarkMode
        ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-800'
    }`;
  };

  return (
    <div className={`flex h-[calc(100vh-73px)] overflow-hidden relative transition-colors duration-300 ${bgMain}`}>

      {/* Backdrop móvil */}
      {isSidebarOpen && (
        <div
          className="md:hidden absolute inset-0 z-10 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`flex-col justify-between w-64 border-r p-5 ${bgSidebar} ${
        isSidebarOpen ? 'flex absolute inset-y-0 left-0 z-20 pt-4' : 'hidden md:flex md:relative md:pt-6'
      }`}>
        <div>
          <div className="mb-8 hidden md:block">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-lg font-black ${isAdminDarkMode ? 'text-white' : 'text-[#0A0A0A]'}`}>Apple</span>
              <span className={`text-lg font-black px-1.5 py-0.5 rounded-md ${isAdminDarkMode ? 'bg-white text-[#0A0A0A]' : 'bg-[#0A0A0A] text-white'}`}>Zone</span>
            </div>
            <p className="text-xs font-medium text-gray-400">Panel de Gestión</p>
          </div>
          <nav className="space-y-1">
            <NavLink to="/admin/dashboard" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> Dashboard
            </NavLink>
            <NavLink to="/admin/inventory" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <Package className="w-4 h-4 flex-shrink-0" /> Inventario
            </NavLink>
            <NavLink to="/admin/sales" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <ShoppingCart className="w-4 h-4 flex-shrink-0" /> Ventas
            </NavLink>
            <NavLink to="/admin/metrics" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <TrendingUp className="w-4 h-4 flex-shrink-0" /> Métricas
            </NavLink>
            <NavLink to="/admin/settings" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <SettingsIcon className="w-4 h-4 flex-shrink-0" /> Configuración
            </NavLink>
          </nav>
        </div>

        {/* Perfil al fondo */}
        <div className={`flex items-center gap-3 pt-4 border-t ${isAdminDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${isAdminDarkMode ? 'bg-gray-600 text-white' : 'bg-[#0A0A0A] text-white'}`}>
            {initials}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className={`text-sm font-semibold truncate ${isAdminDarkMode ? 'text-white' : 'text-[#0A0A0A]'}`}>{displayName}</p>
            <p className="text-xs truncate text-gray-400">{displayEmail}</p>
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 p-5 md:p-10 overflow-auto w-full">
        <Outlet context={{ isAdminDarkMode }} />
      </div>
    </div>
  );
}
