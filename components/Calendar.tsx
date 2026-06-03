'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Activation, ActivationType, TYPE_COLORS, TYPE_LABELS } from '@/lib/types';
import DayPanel from './DayPanel';
import StatsPanel from './StatsPanel';
import Tooltip from './Tooltip';

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
  const [goalsByDate, setGoalsByDate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [editingGoalDate, setEditingGoalDate] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState('');
  const savingGoalRef = React.useRef(false);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const [actRes, goalRes] = await Promise.all([
      fetch(`/api/activations?month=${monthKey}`),
      fetch(`/api/goals?month=${monthKey}`),
    ]);
    const [actJson, goalJson] = await Promise.all([actRes.json(), goalRes.json()]);

    const grouped: Record<string, Activation[]> = {};
    for (const a of (actJson.data ?? []) as Activation[]) {
      const k = a.date.slice(0, 10);
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(a);
    }
    setActivationsByDate(grouped);

    const goals: Record<string, number> = {};
    for (const g of (goalJson.data ?? []) as { date: string; goal: number }[]) {
      goals[g.date.slice(0, 10)] = g.goal;
    }
    setGoalsByDate(goals);
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

  async function saveGoal(dateStr: string) {
    if (savingGoalRef.current) return;
    savingGoalRef.current = true;
    const val = parseInt(goalDraft);
    setEditingGoalDate(null);
    setGoalDraft('');
    if (isNaN(val) || val < 0) { savingGoalRef.current = false; return; }
    if (val === 0) {
      setGoalsByDate(prev => { const next = { ...prev }; delete next[dateStr]; return next; });
    } else {
      setGoalsByDate(prev => ({ ...prev, [dateStr]: val }));
    }
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, goal: val }),
      });
      if (!res.ok) console.error('saveGoal failed:', await res.text());
    } finally {
      savingGoalRef.current = false;
    }
  }

  const monthGoalTotal = Object.values(goalsByDate).reduce((a, b) => a + b, 0);

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
          <Tooltip text="Filtra os painéis laterais pelo período selecionado" position="bottom">
            <select value={period} onChange={e => setPeriod(e.target.value)} className={selectCls}>
              <option value="month">Este mês</option>
              <option value="all">Todo período</option>
            </select>
          </Tooltip>
          <Tooltip text="Filtra os painéis laterais por tipo de canal de disparo" position="bottom">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
              <option value="all">Todos os tipos</option>
              {(Object.entries(TYPE_LABELS) as [ActivationType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Tooltip>
          <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-lg px-1">
            <Tooltip text="Mês anterior" position="bottom">
              <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#2E2F39] transition-colors">‹</button>
            </Tooltip>
            <span className="font-semibold text-[#2E2F39] w-36 text-center text-sm">{MONTHS[month]} {year}</span>
            <Tooltip text="Próximo mês" position="bottom">
              <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#2E2F39] transition-colors">›</button>
            </Tooltip>
          </div>
        </div>
      </header>

      <div className="flex gap-4 p-4 max-w-7xl mx-auto">
        <aside className="w-60 shrink-0">
          <StatsPanel month={monthKey} typeFilter={typeFilter} period={period} monthGoalTotal={monthGoalTotal} />
        </aside>

        <div className="flex-1 min-w-0">
          <a href="https://allugator.com" target="_blank" rel="noopener noreferrer" className="block mb-4 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <Image
              src="/banner-allu.png"
              alt="allu - Todo lugar vira arquibancada"
              width={1520}
              height={500}
              className="w-full object-cover max-h-56 object-top"
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
              if (!day) return <div key={i} className="h-28" />;
              const dateStr = toYMD(year, month, day);
              const acts = activationsByDate[dateStr] ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const goal = goalsByDate[dateStr];
              const isEditingGoal = editingGoalDate === dateStr;

              return (
                <div key={i} className={`h-28 rounded-lg border flex flex-col transition-all ${
                  isSelected
                    ? 'border-[#27AE60] bg-[#f0faf4] shadow-md'
                    : 'border-[#E5E7EB] bg-white hover:border-[#27AE60] hover:shadow-sm'
                }`}>
                  <button
                    onClick={() => setSelectedDate(dateStr)}
                    className="flex-1 p-2 text-left flex flex-col w-full"
                  >
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-[#27AE60] text-white' : 'text-[#2E2F39]'
                    }`}>
                      {day}
                    </span>

                    {!loading && (
                      <div className="flex flex-col gap-0.5 mt-auto">
                        {acts.map((act, idx) => {
                          const tempEmoji = act.base_temperature === 'frio' ? '🧊' : act.base_temperature === 'morno' ? '🌤' : act.base_temperature === 'quente' ? '🔥' : '';
                          const label = act.is_fup ? 'FUP' : act.dispatch_category === 'cross_sell' ? 'Cross-sell' : TYPE_LABELS[act.type];
                          return (
                            <div key={idx} className="flex items-center gap-0.5 text-[7px] font-semibold px-1 py-0.5 rounded-sm leading-tight text-white" style={{ backgroundColor: TYPE_COLORS[act.type] }}>
                              <span>{label}</span>
                              {tempEmoji && <span>{tempEmoji}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </button>

                  {/* Goal row */}
                  <div className="px-2 pb-1.5 border-t border-[#F0F1F3]">
                    {isEditingGoal ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={goalDraft}
                        onChange={e => setGoalDraft(e.target.value)}
                        onBlur={() => saveGoal(dateStr)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveGoal(dateStr);
                          if (e.key === 'Escape') setEditingGoalDate(null);
                        }}
                        className="w-full text-[10px] border border-[#27AE60] rounded px-1 py-0.5 focus:outline-none mt-1"
                        placeholder="meta"
                      />
                    ) : (
                      <Tooltip text={goal ? `Meta: ${goal.toLocaleString('pt-BR')} disparos — clique para editar` : 'Clique para definir a meta de disparos do dia'} position="bottom">
                        <button
                          onClick={() => { setEditingGoalDate(dateStr); setGoalDraft(String(goal ?? '')); }}
                          className={`w-full text-left text-[9px] mt-1 transition-colors ${
                            goal ? 'text-[#27AE60] font-semibold' : 'text-gray-300 hover:text-gray-400'
                          }`}
                        >
                          🎯 {goal ? goal.toLocaleString('pt-BR') : 'meta'}
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {TYPE_LABELS[type as ActivationType]}
              </span>
            ))}
            <span className="flex items-center gap-1.5"><span className="text-[8px] bg-blue-50 text-blue-600 font-semibold px-1 rounded-sm">novos</span> Regular</span>
            <span className="flex items-center gap-1.5"><span className="text-[8px] bg-orange-50 text-orange-600 font-semibold px-1 rounded-sm">CS</span> Cross sell</span>
            <span className="flex items-center gap-1.5"><span className="text-[8px] bg-purple-50 text-purple-700 font-semibold px-1 rounded-sm">FUP</span> Follow up</span>
            <span className="flex items-center gap-1.5"><span className="text-[#27AE60]">🎯</span> Meta (clique p/ editar)</span>
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
