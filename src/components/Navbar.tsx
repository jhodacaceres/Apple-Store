import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, LogIn, LayoutDashboard, ShoppingBag, LogOut, Home, Grid, MessageSquare } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname === '/login';

  // Función auxiliar para saber si un enlace del menú cliente está activo
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
            APPLE ZONE
          </Link>
          
          {isAdminRoute ? (
            <nav className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors">
                <ShoppingBag className="w-4 h-4" /> Volver a la tienda
              </Link>
            </nav>
          ) : (
            !isLoginRoute && (
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                <Link to="/" className={isActive('/') ? "font-bold text-black border-b-2 border-black pb-1" : "text-gray-500 hover:text-black transition-colors"}>Inicio</Link>
                <Link to="/catalog" className={isActive('/catalog') ? "font-bold text-black border-b-2 border-black pb-1" : "text-gray-500 hover:text-black transition-colors"}>Catálogo</Link>
                <Link to="/contact" className={isActive('/contact') ? "font-bold text-black border-b-2 border-black pb-1" : "text-gray-500 hover:text-black transition-colors"}>Contacto</Link>
              </nav>
            )
          )}

          <div className="flex items-center gap-4">
            {/* Botón de Búsqueda */}
            {!isAdminRoute && !isLoginRoute && (
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            {/* Botones Visibles sin Estado de Login */}
            {!isAdminRoute && !isLoginRoute && (
              <div className="flex items-center gap-4">
                <Link to="/admin" className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm">
                  <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Panel Admin</span>
                </Link>

              </div>
            )}

            {/* Botón Circular estilo Logout (Visible en Admin) */}
            {isAdminRoute && (
              <button 
                onClick={() => navigate('/')} 
                className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-xs border hover:bg-red-50 hover:text-red-600 transition-colors group" 
                title="Salir del Panel"
              >
                <span className="group-hover:hidden">SA</span>
                <LogOut className="w-4 h-4 hidden group-hover:block" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navegación inferior (Móviles) */}
      {!isAdminRoute && !isLoginRoute && (
        <footer className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-sm border-t shadow-lg z-50">
          <div className="px-4 py-4 flex justify-around text-xs font-medium">
            <Link to="/" className={`flex flex-col items-center gap-1.5 ${isActive('/') ? 'text-black font-bold' : 'text-gray-400 hover:text-black'}`}>
              <Home className="w-6 h-6" />Inicio
            </Link>
            <Link to="/catalog" className={`flex flex-col items-center gap-1.5 ${isActive('/catalog') ? 'text-black font-bold' : 'text-gray-400 hover:text-black'}`}>
              <Grid className="w-6 h-6" />Catálogo
            </Link>
            <Link to="/contact" className={`flex flex-col items-center gap-1.5 ${isActive('/contact') ? 'text-black font-bold' : 'text-gray-400 hover:text-black'}`}>
              <MessageSquare className="w-6 h-6" />Contacto
            </Link>
          </div>
        </footer>
      )}
    </>
  );
}