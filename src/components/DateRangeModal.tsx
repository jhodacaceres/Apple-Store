import { useState } from 'react';
import { DownloadSimple, X } from '@phosphor-icons/react';

interface Props {
  title?: string;
  onExport: (from: Date | null, to: Date | null) => void;
  onClose: () => void;
}

const FIELD = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-[#0A0A0A] focus:ring-2 focus:ring-black/5 transition-all';

export default function DateRangeModal({ title = 'Exportar Excel', onExport, onClose }: Props) {
  const [mode, setMode] = useState<'all' | 'range'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const handleExport = () => {
    const fromDate = mode === 'range' && from ? new Date(from + 'T00:00:00') : null;
    const toDate   = mode === 'range' && to   ? new Date(to   + 'T23:59:59') : null;
    onExport(fromDate, toDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="font-black text-lg text-[#0A0A0A]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="export-mode" value="all"
                checked={mode === 'all'} onChange={() => setMode('all')}
                className="accent-black" />
              <span className="text-sm font-medium text-gray-700">Todos los registros</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="export-mode" value="range"
                checked={mode === 'range'} onChange={() => setMode('range')}
                className="accent-black" />
              <span className="text-sm font-medium text-gray-700">Rango de fechas</span>
            </label>
          </div>

          {mode === 'range' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Desde</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Hasta</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD} />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button onClick={handleExport}
            className="px-6 py-2.5 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center gap-2">
            <DownloadSimple className="w-4 h-4" />
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}
