import { useState, useEffect, useRef } from 'react';
import { CaretDown, X } from '@phosphor-icons/react';

interface Option {
  id: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options, value, onChange,
  placeholder = 'Buscar…',
  emptyText = 'No hay opciones.',
  disabled = false,
}: Props) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input trigger */}
      <div
        onClick={() => { if (!disabled) { setOpen((o) => !o); setQuery(''); } }}
        className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex items-center justify-between gap-2 cursor-pointer transition-all ${
          open ? 'border-[#0A0A0A] bg-white ring-2 ring-black/5' : 'hover:border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={selected ? 'text-gray-900 font-medium truncate' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && !disabled && (
            <button onClick={handleClear} className="p-0.5 hover:bg-gray-200 rounded-md transition-colors">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
          <CaretDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribir para filtrar…"
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-300 transition-all"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">{emptyText}</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.id}
                  onClick={() => handleSelect(o.id)}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    o.id === value
                      ? 'bg-[#0A0A0A] text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
