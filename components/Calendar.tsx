'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Activation, ActivationType, TYPE_COLORS, TYPE_LABELS } from '@/lib/types';
import DayPanel from './DayPanel';
import StatsPanel from './StatsPanel';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const selectCls = "border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm text-[#2E2F39] focus:outline-none focus:ring-2 focus:ring-[#27AE60] bg-white cursor-pointer";

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [activationsByDate, setActivationsByDate] = useState<Record<string, Activation[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [period, setPeriod] = useState('month');

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/activations?month=${monthKey}`);
    const json = await res.json();
    const grouped: Record<string, Activation[]> = {};
    for (const a of (json.data ?? []) as Activation[]) {
      const k = a.date.slice(0, 10);
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(a);
    }
    setActivationsByDate(grouped);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[#27AE60] text-xl">📣</span>
          <h1 className="text-base font-bold text-[#2E2F39] tracking-tight">Central de Ativações</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={period} onChange={e => setPeriod(e.target.value)} className={selectCls}>
            <option value="month">Este mês</option>
            <option value="all">Todo período</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="all">Todos os tipos</option>
            {(Object.entries(TYPE_LABELS) as [ActivationType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-lg px-1">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#2E2F39] transition-colors">‹</button>
            <span className="font-semibold text-[#2E2F39] w-36 text-center text-sm">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#2E2F39] transition-colors">›</button>
          </div>
        </div>
      </header>

      <div className="flex gap-4 p-4 max-w-7xl mx-auto">
        <aside className="w-60 shrink-0">
          <StatsPanel month={monthKey} typeFilter={typeFilter} period={period} />
        </aside>

        <div className="flex-1 min-w-0">
          <a href="https://allugator.com" target="_blank" rel="noopener noreferrer" className="block mb-4 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <Image
              src="/banner-allu.png"
              alt="allu - Todo lugar vira arquibancada"
              width={1520}
              height={500}
              className="w-full h-auto object-cover"
              priority
            />
          </a>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-24" />;
              const dateStr = toYMD(year, month, day);
              const acts = activationsByDate[dateStr] ?? [];
              const types = Array.from(new Set(acts.map(a => a.type))) as ActivationType[];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-24 p-2 rounded-lg border text-left flex flex-col transition-all ${
                    isSelected
                      ? 'border-[#27AE60] bg-[#f0faf4] shadow-md'
                      : 'border-[#E5E7EB] bg-white hover:border-[#27AE60] hover:shadow-sm'
                  }`}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-[#27AE60] text-white' : 'text-[#2E2F39]'
                  }`}>
                    {day}
                  </span>

                  {loading ? (
                    acts.length === 0 && <div className="flex-1" />
                  ) : (
                    <div className="flex flex-wrap gap-0.5 mt-auto">
                      {types.slice(0, 4).map(t => (
                        <span key={t} className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] }} />
                      ))}
                      {types.length > 4 && <span className="text-[9px] text-gray-400">+{types.length - 4}</span>}
                      {acts.length > 0 && <span className="text-[9px] text-gray-400 w-full">{acts.length} ativ.</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {TYPE_LABELS[type as ActivationType]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayPanel
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onUpdate={loadMonth}
        />
      )}
    </div>
  );
}
