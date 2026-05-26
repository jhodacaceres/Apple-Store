import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f5f7] flex flex-col font-sans pb-20 md:pb-0">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-20">
        
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Bienvenido a</span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-gray-900 mb-6">
          APPLE ZONE
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto font-medium mb-10 leading-relaxed">
          La mejor forma de comprar tu próximo iPhone. Equipos certificados, garantía asegurada y atención premium.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            to="/catalog" 
            className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300"
          >
            Ver Catálogo
          </Link>
          <Link 
            to="/contact" 
            className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
          >
            Contáctanos
          </Link>
        </div>

      </main>
    </div>
  );
}