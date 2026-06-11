import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  dark?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pagination({ page, total, pageSize, dark = false, onPrev, onNext }: PaginationProps) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = page * pageSize + 1;
  const end   = Math.min((page + 1) * pageSize, total);

  if (dark) {
    const btn = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-gray-700';
    return (
      <div className="flex items-center justify-between px-5 py-3 border-t text-xs border-gray-700 text-gray-400">
        <span>{start}–{end} de {total}</span>
        <div className="flex gap-1">
          <button onClick={onPrev} disabled={page === 0} className={btn}>
            <CaretLeft className="w-3.5 h-3.5" /> Anterior
          </button>
          <button onClick={onNext} disabled={page >= pages - 1} className={btn}>
            Siguiente <CaretRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const btnLight = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-colors hover:bg-gray-100';
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t text-xs border-gray-100 text-gray-500">
      <span>{start}–{end} de {total}</span>
      <div className="flex gap-1">
        <button onClick={onPrev} disabled={page === 0} className={btnLight}>
          <CaretLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <button onClick={onNext} disabled={page >= pages - 1} className={btnLight}>
          Siguiente <CaretRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function PaginationDark({ page, total, pageSize, onPrev, onNext }: Omit<PaginationProps, 'dark'>) {
  return <Pagination page={page} total={total} pageSize={pageSize} dark onPrev={onPrev} onNext={onNext} />;
}
