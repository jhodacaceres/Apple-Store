import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Settings as SettingsIcon, Menu, X } from 'lucide-react';

interface AdminLayoutProps {
  isAdminDarkMode: boolean;
}

export default function AdminLayout({ isAdminDarkMode }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const bgMain = isAdminDarkMode ? 'bg-gray-900 text-white' : 'bg-[#FAFAFA] text-[#1C1C1E]';
  const bgSidebar = isAdminDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-[#1C1C1E]';
  const bgMobileHeader = isAdminDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-[#1C1C1E]';

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

      {/* Header móvil */}
      <div className={`md:hidden flex items-center justify-between border-b p-4 absolute top-0 w-full z-20 ${bgMobileHeader}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black text-[#0A0A0A]">
            Apple
          </span>
          <span className="text-lg font-black bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-md">Zone</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Menú Lateral (Sidebar) */}
      <div className={`flex-col justify-between w-64 border-r p-5 ${bgSidebar} ${isSidebarOpen ? 'flex fixed inset-y-0 left-0 z-10 pt-16' : 'hidden md:flex md:relative md:pt-6'}`}>
        <div>
          <div className="mb-8 hidden md:block">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg font-black text-[#0A0A0A]">
                Apple
              </span>
              <span className="text-lg font-black bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-md">Zone</span>
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
            <NavLink to="/admin/settings" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <SettingsIcon className="w-4 h-4 flex-shrink-0" /> Configuración
            </NavLink>
          </nav>
        </div>

        {/* Perfil al fondo */}
        <div className={`flex items-center gap-3 pt-4 border-t ${isAdminDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${isAdminDarkMode ? 'bg-gray-600 text-white' : 'bg-[#0A0A0A] text-white'}`}>
            AZ
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">Admin User</p>
            <p className={`text-xs truncate ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>admin@applezone.bo</p>
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 p-5 md:p-10 pt-20 md:pt-10 overflow-auto w-full">
        <Outlet context={{ isAdminDarkMode }} />
      </div>
    </div>
  );
}
