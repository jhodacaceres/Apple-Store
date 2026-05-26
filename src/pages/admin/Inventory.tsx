import { Plus, Search, MoreVertical } from 'lucide-react';

export default function Inventory() {
  return (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Inventario de Equipos</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Gestiona el catálogo actual, disponibilidad y precios.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="bg-white border rounded-lg flex items-center px-3 py-2 shadow-sm w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <input type="text" placeholder="Buscar por IMEI, Modelo..." className="outline-none text-sm w-full bg-transparent" />
          </div>
          <button className="bg-black text-white px-4 py-2 rounded-lg flex justify-center items-center gap-2 text-sm font-semibold hover:bg-gray-800 transition shadow-md w-full sm:w-auto flex-shrink-0">
            <Plus className="w-4 h-4" /> Agregar nuevo equipo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Miniatura</th>
              <th className="px-6 py-4">Modelo</th>
              <th className="px-6 py-4">Color</th>
              <th className="px-6 py-4">Capacidad</th>
              <th className="px-6 py-4">IMEI</th>
              <th className="px-6 py-4">Precio</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50 transition">
              <td className="px-6 py-4"><div className="w-8 h-10 bg-gray-200 rounded"></div></td>
              <td className="px-6 py-4 font-medium text-gray-900">iPhone 14 Pro</td>
              <td className="px-6 py-4 text-gray-500">Space Black</td>
              <td className="px-6 py-4">256GB</td>
              <td className="px-6 py-4 text-gray-400 text-xs tracking-wider font-mono bg-gray-100 rounded px-2">359021...</td>
              <td className="px-6 py-4 font-semibold text-gray-900">$1,099</td>
              <td className="px-6 py-4"><span className="bg-white text-gray-700 text-xs px-3 py-1 rounded-full font-medium border border-gray-200 shadow-sm">Disponible</span></td>
              <td className="px-6 py-4"><button className="p-1 hover:bg-gray-200 rounded-full transition"><MoreVertical className="w-5 h-5 text-gray-400"/></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}