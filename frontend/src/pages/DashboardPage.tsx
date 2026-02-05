import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TimetableGrid, { TimetableCell } from '../components/TimetableGrid';
import MonthlyCalendar, { CalendarDay } from '../components/MonthlyCalendar';
import { api } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  onLogout: () => void;
}

export default function DashboardPage({ onLogout }: Props) {
  const [timetableCells, setTimetableCells] = useState<TimetableCell[]>([]);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [periods, setPeriods] = useState(8);
  const [locked, setLocked] = useState(true);
  const [rules, setRules] = useState<{
    minPercentage: number;
    semesterStart: string;
    semesterEnd: string;
  } | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const [ttRes, rulesRes, calRes, summaryRes] = await Promise.all([
          api.get('/timetable/'),
          api.get('/attendance/rules'),
          api.get('/calendar/'),
          api.get('/attendance/summary'),
        ]);
        const cells: TimetableCell[] = ttRes.data.map((e: any) => ({
          dayOfWeek: e.dayOfWeek,
          periodIndex: e.periodIndex,
          subjectName: e.subjectName,
          classType: e.classType,
        }));
        setTimetableCells(cells);
        setRules(rulesRes.data);
        setCalendarDays(calRes.data);
        setSummary(summaryRes.data);
        buildInsights(summaryRes.data);
      } catch {
        // ignore for first load
      }
    })();
  }, []);

  const handleSaveTimetable = async () => {
    await api.post('/timetable/', { cells: timetableCells });
    setLocked(true);
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rules) return;
    await api.post('/attendance/rules', {
      minPercentage: rules.minPercentage,
      semesterStart: rules.semesterStart,
      semesterEnd: rules.semesterEnd,
    });
  };

  const handleSelectDate = async (iso: string) => {
    // Placeholder: In a fuller version, we would fetch subject-wise impact for this date.
    // For now, just reload summary and insights.
    const res = await api.get('/attendance/summary');
    setSummary(res.data);
    buildInsights(res.data);
  };

  const buildInsights = (subjectSummaries: any[]) => {
    const msgs: string[] = [];
    subjectSummaries.forEach((s) => {
      if (s.safeToMissHours > 0) {
        msgs.push(`You can safely skip ${s.subjectName} for ${s.safeToMissHours} more hour(s).`);
      } else if (s.percentage < (rules?.minPercentage ?? 75)) {
        msgs.push(`If you miss ${s.subjectName} today, attendance may drop further below ${rules?.minPercentage ?? 75}%.`);
      }
    });
    setInsights(msgs);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">ClassGrid</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              One-time timetable, on-going clarity about what you can miss.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center rounded-full border border-red-500/60 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Weekly timetable</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set it once per semester. Edit only when your college changes it.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-700"
                  checked={includeSaturday}
                  onChange={(e) => setIncludeSaturday(e.target.checked)}
                  disabled={locked}
                />
                <span>Include Saturday</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <span>Periods/day</span>
                <select
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-1 py-0.5"
                  value={periods}
                  onChange={(e) => setPeriods(Number(e.target.value))}
                  disabled={locked}
                >
                  {[6, 7, 8, 9, 10].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              {locked ? (
                <button
                  type="button"
                  onClick={() => setLocked(false)}
                  className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Edit timetable
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveTimetable}
                  className="rounded-full bg-brand-light px-3 py-1 font-medium text-white hover:bg-brand-dark"
                >
                  Save & lock
                </button>
              )}
            </div>
          </div>
          <TimetableGrid
            initialCells={timetableCells}
            includeSaturday={includeSaturday}
            periods={periods}
            locked={locked}
            onChange={setTimetableCells}
          />
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Attendance rules</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We only ask this once per semester and use it everywhere.
            </p>
            <form onSubmit={handleSaveRules} className="grid grid-cols-1 gap-3 text-xs">
              <label className="space-y-1">
                <span className="block font-medium">Minimum required attendance (%)</span>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={rules?.minPercentage ?? 75}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...(prev ?? {
                        semesterStart: '',
                        semesterEnd: '',
                        minPercentage: 75,
                      }),
                      minPercentage: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="block font-medium">Semester start</span>
                  <input
                    type="date"
                    value={rules?.semesterStart ?? ''}
                    onChange={(e) =>
                      setRules((prev) => ({
                        ...(prev ?? {
                          minPercentage: 75,
                          semesterEnd: '',
                        }),
                        semesterStart: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="block font-medium">Semester end</span>
                  <input
                    type="date"
                    value={rules?.semesterEnd ?? ''}
                    onChange={(e) =>
                      setRules((prev) => ({
                        ...(prev ?? {
                          minPercentage: 75,
                          semesterStart: '',
                        }),
                        semesterEnd: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                    required
                  />
                </label>
              </div>
              <div>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full bg-brand-light px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
                >
                  Save rules
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Semester calendar</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tap a day to see how skipping classes impacts your attendance.
            </p>
            <MonthlyCalendar days={calendarDays} onSelect={handleSelectDate} />
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Subject-wise attendance</h2>
            <div className="overflow-x-auto text-xs">
              <table className="min-w-full border border-slate-200 dark:border-slate-800 text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-2 py-1 border-b border-slate-200 dark:border-slate-800">Subject</th>
                    <th className="px-2 py-1 border-b border-slate-200 dark:border-slate-800">Attended</th>
                    <th className="px-2 py-1 border-b border-slate-200 dark:border-slate-800">Missed</th>
                    <th className="px-2 py-1 border-b border-slate-200 dark:border-slate-800">% now</th>
                    <th className="px-2 py-1 border-b border-slate-200 dark:border-slate-800">Safe to miss</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.subjectId} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-950 dark:even:bg-slate-900/40">
                      <td className="px-2 py-1 border-t border-slate-200 dark:border-slate-800">{s.subjectName}</td>
                      <td className="px-2 py-1 border-t border-slate-200 dark:border-slate-800">{s.attendedHours}</td>
                      <td className="px-2 py-1 border-t border-slate-200 dark:border-slate-800">{s.missedHours}</td>
                      <td className="px-2 py-1 border-t border-slate-200 dark:border-slate-800">
                        {s.percentage.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1 border-t border-slate-200 dark:border-slate-800">
                        {s.safeToMissHours} hrs
                      </td>
                    </tr>
                  ))}
                  {summary.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-2 py-4 text-center text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800"
                      >
                        Once you start marking attendance, we&apos;ll show subject-wise stats here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Smart leave suggestions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We translate percentages into simple, actionable statements.
            </p>
            <ul className="space-y-2 text-xs">
              {insights.map((msg, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-emerald-700 dark:text-emerald-200"
                >
                  {msg}
                </li>
              ))}
              {insights.length === 0 && (
                <li className="text-slate-500 dark:text-slate-400">
                  As you fill in your timetable and mark attendance, we&apos;ll highlight which classes you can
                  safely skip.
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

