import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Settings as SettingsIcon, Menu, X } from 'lucide-react';

interface AdminLayoutProps {
  isAdminDarkMode: boolean;
}

export default function AdminLayout({ isAdminDarkMode }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Colores dinámicos basados en el tema
  const bgMain = isAdminDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black';
  const bgSidebar = isAdminDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-200 text-black';
  const bgMobileHeader = isAdminDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black';

  const navItemStyle = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      return `flex items-center gap-3 p-3 rounded-lg transition-colors font-medium text-sm shadow-md ${isAdminDarkMode ? 'bg-blue-600 text-white' : 'bg-black text-white'}`;
    }
    return `flex items-center gap-3 p-3 rounded-lg transition-colors font-medium text-sm ${isAdminDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`;
  };

  return (
    <div className={`flex h-[calc(100vh-73px)] overflow-hidden font-sans relative transition-colors duration-300 ${bgMain}`}>
      
      {/* Header móvil */}
      <div className={`md:hidden flex items-center justify-between border-b p-4 absolute top-0 w-full z-20 ${bgMobileHeader}`}>
        <h1 className="text-xl font-bold">LUXE Admin</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Menú Lateral (Sidebar) */}
      <div className={`fixed inset-y-0 left-0 z-10 transform ${isSidebarOpen ? 'translate-x-0 pt-16' : '-translate-x-full'} md:relative md:translate-x-0 md:pt-5 transition-transform duration-300 ease-in-out w-64 border-r p-5 flex flex-col justify-between ${bgSidebar}`}>
        <div>
          <div className="mb-10 hidden md:block">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className={`text-xs ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Luxe iStore Management</p>
          </div>
          <nav className="space-y-2">
            <NavLink to="/admin/dashboard" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <LayoutDashboard className="w-5 h-5"/> Dashboard
            </NavLink>
            <NavLink to="/admin/inventory" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <Package className="w-5 h-5"/> Inventario
            </NavLink>
            <NavLink to="/admin/sales" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <ShoppingCart className="w-5 h-5"/> Ventas
            </NavLink>
            <NavLink to="/admin/settings" className={navItemStyle} onClick={() => setIsSidebarOpen(false)}>
              <SettingsIcon className="w-5 h-5"/> Configuración
            </NavLink>
          </nav>
        </div>
        
        {/* Perfil al fondo */}
        <div className={`flex items-center gap-3 pt-4 border-t mt-10 ${isAdminDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`w-10 h-10 rounded-full flex-shrink-0 ${isAdminDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">Admin User</p>
            <p className={`text-xs truncate ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>admin@luxeistore.com</p>
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 p-5 md:p-10 pt-20 md:pt-10 overflow-auto w-full">
        <Outlet /> 
      </div>
    </div>
  );
}