import dayjs from 'dayjs';

export type CalendarDay = {
  date: string;
  color: 'red' | 'green' | 'yellow' | 'grey';
};

interface Props {
  days: CalendarDay[];
  onSelect: (isoDate: string) => void;
}

export default function MonthlyCalendar({ days, onSelect }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]));

  if (days.length === 0) {
    return null;
  }

  const first = dayjs(days[0].date);
  const startOfMonth = first.startOf('month');
  const endOfMonth = first.endOf('month');

  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < startOfMonth.day(); i++) {
    cells.push(null);
  }
  for (let d = 1; d <= endOfMonth.date(); d++) {
    const iso = startOfMonth.date(d).format('YYYY-MM-DD');
    cells.push(byDate.get(iso) || { date: iso, color: 'grey' });
  }

  const colorClass = (color: CalendarDay['color']) => {
    switch (color) {
      case 'red':
        return 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/40';
      case 'green':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/40';
      case 'yellow':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/40';
      case 'grey':
      default:
        return 'bg-slate-100/60 dark:bg-slate-900/60 text-slate-400 border-slate-300/60 dark:border-slate-700/60';
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelect(cell.date)}
              className={`aspect-square rounded-lg border text-xs flex items-center justify-center hover:ring-1 hover:ring-brand-light transition ${colorClass(
                cell.color,
              )}`}
            >
              {dayjs(cell.date).date()}
            </button>
          ) : (
            <div key={`empty-${idx}`} />
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Exam (do not miss)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Safe to take leave
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Partial leave allowed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> No classes
        </span>
      </div>
    </div>
  );
}

