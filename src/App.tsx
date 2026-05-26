import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Contact from './pages/Contact';
import Navbar from './components/Navbar';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Sales from './pages/admin/Sales';
import Settings from './pages/admin/Settings';

function App() {
  
  const [isAdminDarkMode, setIsAdminDarkMode] = useState(false);
  const [contactPhone, setContactPhone] = useState('+59170000000');
  // Nuevo estado para el mensaje predeterminado
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, me gustaría saber más sobre un equipo.');

  return (
    <BrowserRouter>
      <Navbar />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        {/* Pasamos el teléfono y el mensaje a la página de Contacto */}
        <Route path="/contact" element={
          <Contact contactPhone={contactPhone} whatsappMessage={whatsappMessage} />
        } />
        <Route path="/login" />
        
        <Route path="/admin" element={<AdminLayout isAdminDarkMode={isAdminDarkMode} />}>
          <Route index element={<Navigate to="inventory" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<Sales />} />
          {/* Pasamos los estados y sus modificadores a Settings */}
          <Route path="settings" element={
            <Settings 
              isAdminDarkMode={isAdminDarkMode} 
              setIsAdminDarkMode={setIsAdminDarkMode}
              contactPhone={contactPhone}
              setContactPhone={setContactPhone}
              whatsappMessage={whatsappMessage}
              setWhatsappMessage={setWhatsappMessage}
            />
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;