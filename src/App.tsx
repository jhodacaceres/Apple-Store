import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { AuthProvider } from './contexts/AuthContext';
import { AdminThemeProvider } from './contexts/AdminThemeContext';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Cerrar sidebar al salir del área admin
  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) setIsSidebarOpen(false);
  }, [location.pathname]);

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
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AdminThemeProvider>
          <AppContent />
        </AdminThemeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
