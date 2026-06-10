import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabase';
import { useAnalyticsTracker } from './hooks/useAnalyticsTracker';

import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Sales from './pages/admin/Sales';
import Metrics from './pages/admin/Metrics';
import Settings from './pages/admin/Settings';

function AppContent() {
  const location = useLocation();
  useAnalyticsTracker();
  const [isAdminDarkMode, setIsAdminDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen]     = useState(false);
  const [sweeping, setSweeping]               = useState(false);
  const [sweepTarget, setSweepTarget]         = useState(false);
  const sweepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cerrar sidebar al salir del área admin
  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) setIsSidebarOpen(false);
  }, [location.pathname]);

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

  const [contactPhone, setContactPhone]       = useState('68531959');
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, me gustaría saber más sobre un equipo.');

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
      });
  }, []);

  return (
    <>
      <Navbar
        isAdminDarkMode={isAdminDarkMode}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(v => !v)}
      />

      <Routes>
        <Route path="/" element={<Home contactPhone={contactPhone} whatsappMessage={whatsappMessage} />} />
        <Route path="/catalog" element={<Navigate to="/" replace />} />
        <Route path="/producto/:slug" element={<ProductDetail />} />
        <Route path="/contact" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={
            <AdminLayout
              isAdminDarkMode={isAdminDarkMode}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
            />
          }>
            <Route index element={<Navigate to="inventory" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<Sales />} />
            <Route path="metrics" element={<Metrics />} />
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
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
