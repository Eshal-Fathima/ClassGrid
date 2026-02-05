import { useState } from 'react';

export type TimetableCell = {
  dayOfWeek: number;
  periodIndex: number;
  subjectName: string;
  classType?: 'Lecture' | 'Lab';
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  initialCells: TimetableCell[];
  includeSaturday: boolean;
  periods: number;
  locked: boolean;
  onChange: (cells: TimetableCell[]) => void;
}

export default function TimetableGrid({ initialCells, includeSaturday, periods, locked, onChange }: Props) {
  const [cells, setCells] = useState<TimetableCell[]>(initialCells);

  const handleCellChange = (dayIndex: number, periodIndex: number, field: 'subjectName' | 'classType', value: string) => {
    const next = [...cells];
    const existingIndex = next.findIndex(
      (c) => c.dayOfWeek === dayIndex && c.periodIndex === periodIndex,
    );
    if (existingIndex === -1) {
      next.push({
        dayOfWeek: dayIndex,
        periodIndex,
        subjectName: field === 'subjectName' ? value : '',
        classType: field === 'classType' && (value === 'Lecture' || value === 'Lab') ? value : undefined,
      });
    } else {
      const updated = { ...next[existingIndex], [field]: value };
      next[existingIndex] = updated;
    }
    setCells(next);
    onChange(next);
  };

  const visibleDays = includeSaturday ? 6 : 5;

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full border border-slate-200 dark:border-slate-800 text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/60">
          <tr>
            <th className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 text-left font-medium text-slate-500 dark:text-slate-400">
              Period
            </th>
            {Array.from({ length: visibleDays }).map((_, d) => (
              <th
                key={d}
                className="px-2 py-2 border-b border-l border-slate-200 dark:border-slate-800 text-left font-medium text-slate-600 dark:text-slate-300"
              >
                {DAYS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: periods }).map((_, p) => (
            <tr key={p} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-950 dark:even:bg-slate-900/40">
              <td className="px-2 py-2 border-t border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                {p + 1}
              </td>
              {Array.from({ length: visibleDays }).map((_, d) => {
                const cell = cells.find((c) => c.dayOfWeek === d && c.periodIndex === p);
                return (
                  <td key={d} className="px-2 py-1 border-t border-l border-slate-200 dark:border-slate-800 align-top">
                    {locked ? (
                      <div className="space-y-0.5">
                        <div className="font-medium text-xs text-slate-800 dark:text-slate-100">
                          {cell?.subjectName || '-'}
                        </div>
                        {cell?.classType && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{cell.classType}</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-1 py-1 text-[11px] text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-light"
                          placeholder="Subject"
                          value={cell?.subjectName || ''}
                          onChange={(e) =>
                            handleCellChange(d, p, 'subjectName', e.target.value)
                          }
                        />
                        <select
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-1 py-1 text-[11px] text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-light"
                          value={cell?.classType || ''}
                          onChange={(e) =>
                            handleCellChange(
                              d,
                              p,
                              'classType',
                              e.target.value as 'Lecture' | 'Lab',
                            )
                          }
                        >
                          <option value="">Type</option>
                          <option value="Lecture">Lecture</option>
                          <option value="Lab">Lab</option>
                        </select>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

