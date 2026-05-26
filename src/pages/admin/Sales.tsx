import { Download, Filter, Eye } from 'lucide-react';

export default function Sales() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Historial de Ventas</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Revisa las transacciones recientes y genera reportes.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-gray-50 transition shadow-sm">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
          <button className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-gray-800 transition shadow-md">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b uppercase text-xs">
            <tr>
              <th className="px-6 py-4">ID Pedido</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Equipo</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50 transition">
              <td className="px-6 py-4 font-mono text-xs font-bold">#ORD-9021</td>
              <td className="px-6 py-4 text-gray-500">26 May 2026</td>
              <td className="px-6 py-4 font-medium">Carlos Mendoza</td>
              <td className="px-6 py-4 text-gray-600">iPhone 15 Pro Max</td>
              <td className="px-6 py-4 font-bold text-gray-900">$1,199</td>
              <td className="px-6 py-4">
                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">Completado</span>
              </td>
              <td className="px-6 py-4">
                <button className="p-1.5 hover:bg-gray-200 rounded-lg transition text-gray-500">
                  <Eye className="w-4 h-4"/>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}