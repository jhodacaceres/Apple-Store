import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface LoginProps {
  setIsLoggedIn: (value: boolean) => void;
}

export default function Login({ setIsLoggedIn }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Por ahora simulamos el éxito. Próximamente aquí conectaremos Supabase Auth.
    if (email && password) {
      setIsLoggedIn(true);
      navigate('/admin'); // Te redirige automáticamente al panel al entrar
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f5f7] flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-200 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mb-4 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Acceso de Empleados</h2>
          <p className="text-sm text-gray-500 mt-1">Ingresa tus credenciales para gestionar Apple Zone.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@APPLEZONE.com" 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 outline-none focus:bg-white focus:border-black transition-all text-sm text-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 outline-none focus:bg-white focus:border-black transition-all text-sm text-gray-800"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition shadow-md text-sm mt-2"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}