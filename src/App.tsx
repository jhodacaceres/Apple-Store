import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabase';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Contact from './pages/Contact';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Sales from './pages/admin/Sales';
import Settings from './pages/admin/Settings';

function App() {
  const [isAdminDarkMode, setIsAdminDarkMode] = useState(false);
  const [sweeping, setSweeping]     = useState(false);
  const [sweepTarget, setSweepTarget] = useState(false);
  const sweepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSetDarkMode = (val: boolean) => {
    sweepTimers.current.forEach(clearTimeout);
    setSweepTarget(val);
    setSweeping(true);
    sweepTimers.current = [
      setTimeout(() => {
        localStorage.setItem('admin-dark-mode', String(val));
        setIsAdminDarkMode(val);
      }, 260),
      setTimeout(() => setSweeping(false), 600),
    ];
  };
  const [contactPhone, setContactPhone] = useState('68531959');
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, me gustaría saber más sobre un equipo.');

  // Cargar configuración desde Supabase al iniciar
  useEffect(() => {
    supabase
      .from('settings')
      .select('contact_phone, whatsapp_message')
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setContactPhone(data.contact_phone);
          setWhatsappMessage(data.whatsapp_message);
        }
        // Si hay error (Supabase no configurado) se usan los valores por defecto del useState
      });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar isAdminDarkMode={isAdminDarkMode} />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/producto/:slug" element={<ProductDetail />} />
          <Route path="/contact" element={
            <Contact contactPhone={contactPhone} whatsappMessage={whatsappMessage} />
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout isAdminDarkMode={isAdminDarkMode} />}>
              <Route index element={<Navigate to="inventory" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="sales" element={<Sales />} />
              <Route path="settings" element={
                <Settings
                  isAdminDarkMode={isAdminDarkMode}
                  setIsAdminDarkMode={handleSetDarkMode}
                  contactPhone={contactPhone}
                  setContactPhone={setContactPhone}
                  whatsappMessage={whatsappMessage}
                  setWhatsappMessage={setWhatsappMessage}
                />
              } />
            </Route>
          </Route>
        </Routes>
        <Footer />

        {sweeping && (
          <div
            className="theme-sweep fixed inset-0 z-[9999] pointer-events-none"
            style={{ background: sweepTarget ? '#0A0A0A' : '#FAFAFA' }}
          />
        )}
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
