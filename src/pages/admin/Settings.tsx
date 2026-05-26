import { Save, Phone, Moon, Sun, Info, BookOpen } from 'lucide-react';

interface SettingsProps {
  isAdminDarkMode: boolean;
  setIsAdminDarkMode: (val: boolean) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  // Añadimos las nuevas propiedades a la interfaz
  whatsappMessage: string;
  setWhatsappMessage: (val: string) => void;
}

export default function Settings({ 
  isAdminDarkMode, 
  setIsAdminDarkMode, 
  contactPhone, 
  setContactPhone,
  whatsappMessage,
  setWhatsappMessage
}: SettingsProps) {
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('¡Configuración guardada con éxito!');
  };

  return (
    <div className={`space-y-6 max-w-4xl ${isAdminDarkMode ? 'text-white' : 'text-gray-800'}`}>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">Configuración del Sistema</h2>
        <p className={`mt-1 text-sm md:text-base ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Ajusta la apariencia del panel y los datos públicos de la tienda.
        </p>
      </div>

      <form onSubmit={handleSave} className={`rounded-2xl border shadow-sm overflow-hidden ${isAdminDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Sección: Apariencia */}
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              {isAdminDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Apariencia del Panel
            </h3>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${isAdminDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div>
                <p className="font-semibold text-sm">Modo Oscuro</p>
                <p className={`text-xs ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aplica solo para las pantallas de administración.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsAdminDarkMode(!isAdminDarkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAdminDarkMode ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAdminDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Sección: Contacto */}
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5" />
              Contacto Público
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Número de WhatsApp
                </label>
                <input 
                  type="text" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+591..." 
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium ${
                    isAdminDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-black'
                  }`} 
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isAdminDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Mensaje predeterminado
                </label>
                <textarea 
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Hola, me gustaría..." 
                  rows={2}
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium resize-none ${
                    isAdminDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-black'
                  }`} 
                />
              </div>
            </div>
          </div>

          {/* Sección: Instrucciones de uso */}
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5" />
              Instrucciones Básicas
            </h3>
            <div className={`p-4 rounded-xl border space-y-3 text-sm ${isAdminDarkMode ? 'bg-blue-900/20 border-blue-800/30 text-blue-100' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
              <p className="flex gap-2 items-start"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> <strong>Inventario:</strong> Aquí puedes agregar nuevos iPhones, cambiar sus precios o marcarlos como vendidos.</p>
              <p className="flex gap-2 items-start"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> <strong>Ventas:</strong> Revisa el historial de compras. Las métricas del Dashboard se actualizan en base a esto.</p>
              <p className="flex gap-2 items-start"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> <strong>Cerrar Sesión:</strong> Haz clic en tus iniciales "LU" en la barra superior derecha para volver a la vista de cliente.</p>
            </div>
          </div>

          <div className={`pt-6 border-t flex justify-end ${isAdminDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <button type="submit" className={`px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition shadow-md ${isAdminDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-black text-white hover:bg-gray-800'}`}>
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}