import { Search, MessageSquare } from 'lucide-react';

// Datos de ejemplo simulando lo que vendrá de Supabase
const products = [
  {
    id: 1,
    model: "iPhone 15 Pro",
    config: "128GB • 256GB • 512GB",
    price: "Desde $999",
    image: "https://www.mockupworld.co/wp-content/uploads/dynamic/2023/03/ui-iphone-free-mockup-536x0-c-default.jpg",
  },
  {
    id: 2,
    model: "iPhone 15",
    config: "128GB • 256GB",
    price: "Desde $799",
    image: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-blue-select-202309",
  },
  {
    id: 3,
    model: "iPhone 14 Pro",
    config: "Space Black • 256GB",
    price: "$1,099",
    image: "https://mobilestoreonline.com/wp-content/uploads/2025/08/iphone-14-pro.jpg",
  },
  {
    id: 4,
    model: "iPhone 13",
    config: "Starlight • 128GB",
    price: "$699",
    image: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-13-starlight-select-2021",
  },
];

export default function Catalog() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-24 md:pb-12" id="inicio">
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="catalogo">
        
        {/* Buscador */}
        <div className="mb-12 max-w-xl mx-auto md:mx-0">
          <div className="bg-gray-50 rounded-3xl flex items-center px-6 py-4 shadow-sm border border-gray-200">
            <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar por modelo, capacidad..." 
              className="bg-transparent outline-none w-full text-base text-gray-700 placeholder:text-gray-400" 
            />
          </div>
        </div>

        {/* Encabezado de sección */}
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold tracking-tighter">Equipos Disponibles</h2>
          <p className="text-gray-500 mt-2 max-w-xl">Todos nuestros iPhones son revisados y certificados.</p>
        </div>

        {/* Contenedor gris de fondo (Estilo Apple Web) */}
        <div className="bg-[#f5f5f7] -mx-4 sm:mx-0 px-4 sm:px-8 py-12 sm:rounded-3xl">
          
          {/* Cuadrícula de tarjetas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="group flex flex-col h-full bg-white sm:bg-gray-100/70 rounded-3xl p-6 shadow-sm sm:shadow-none hover:shadow-lg transition-all duration-300 sm:border border-gray-200 hover:-translate-y-1"
              >
                {/* Imagen */}
                <div className="h-52 flex items-center justify-center mb-8 w-full flex-1">
                  <img 
                    src={product.image} 
                    alt={product.model} 
                    className="max-h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                
                {/* Detalles (Alineados a la izquierda) */}
                <div className="w-full text-left mt-auto">
                  <h3 className="font-extrabold text-xl text-black tracking-tight">{product.model}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4 leading-relaxed">{product.config}</p>
                  <p className="font-extrabold text-gray-900 tracking-tight text-xl mb-6">{product.price}</p>
                </div>

                {/* Botón */}
                <button className="bg-black text-white w-full py-3.5 rounded-2xl flex justify-center items-center gap-2 font-semibold hover:bg-gray-800 transition shadow-md text-sm">
                  <MessageSquare className="w-4 h-4" /> Consultar
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

    </div>
  );
}