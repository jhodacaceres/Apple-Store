import { TrendingUp, Smartphone, Users, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const metrics = [
    { title: 'Ingresos Totales', value: '$24,500', icon: DollarSign, trend: '+12%', trendUp: true },
    { title: 'Equipos Vendidos', value: '143', icon: Smartphone, trend: '+8%', trendUp: true },
    { title: 'Nuevos Clientes', value: '28', icon: Users, trend: '-2%', trendUp: false },
    { title: 'Tasa de Conversión', value: '4.2%', icon: TrendingUp, trend: '+1.1%', trendUp: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 mt-1 text-sm md:text-base">Resumen general del rendimiento de la tienda.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <metric.icon className="w-6 h-6 text-gray-700" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${metric.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {metric.trend}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{metric.title}</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-64 flex items-center justify-center">
        <p className="text-gray-400 text-sm font-medium">Aquí irá el gráfico de ventas próximamente...</p>
      </div>
    </div>
  );
}