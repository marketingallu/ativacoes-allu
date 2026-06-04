'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Activation, ActivationType, TYPE_COLORS, TYPE_LABELS } from '@/lib/types';
import DayPanel from './DayPanel';
import StatsPanel from './StatsPanel';
import MetricsSection from './MetricsSection';
import Tooltip from './Tooltip';

const TYPE_SHORT: Record<ActivationType, string> = {
  whatsapp: 'WPP',
  email: 'Email',
  instagram_story: 'Story',
  instagram_post: 'Post',
  app_push: 'Push',
};

const TEMP_LABEL: Record<string, string> = { quente: 'Quente', frio: 'Frio', morno: 'Morno' };

function getActColor(a: Activation): string {
  if (a.is_fup) return '#a8a9b8';
  if (a.dispatch_category === 'cross_sell') return '#8d44ad';
  return TYPE_COLORS[a.type];
}

function getActLabel(a: Activation): string {
  if (a.is_fup) return 'FUP';
  if (a.dispatch_category === 'cross_sell') return 'Cross-sell';
  const base = TYPE_SHORT[a.type];
  if (a.type === 'whatsapp' && a.base_temperature) return `${base} · ${TEMP_LABEL[a.base_temperature] ?? a.base_temperature}`;
  return base;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const selectCls = "border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#27AE60]/40 bg-white cursor-pointer";

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
      goals[g.date.slice(0, 10)] = Number(g.goal);
    }
    setGoalsByDate(goals);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
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
      await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, goal: val }),
      });
    } finally { savingGoalRef.current = false; }
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
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">

      {/* ── Dark sidebar ── */}
      <aside className="w-56 bg-[#0D1117] flex flex-col shrink-0 border-r border-white/5">
        <div className="px-5 pt-6 pb-4 border-b border-white/5">
          <span className="text-white text-xl font-extrabold tracking-tight">allu.</span>
          <p className="text-white/25 text-[10px] mt-0.5 font-medium tracking-wide uppercase">Ativações</p>
        </div>

        <nav className="flex-1 px-2.5 py-4 space-y-5 overflow-y-auto">
          <div>
            <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest px-2.5 mb-1.5">Calendário</p>
            <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#27AE60]/15 text-[#4ADE80] text-xs font-semibold text-left">
              {/* wand-magic-sparkles icon */}
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 576 512">
                <path d="M458.3 34.9c3.1-3.1 8.2-3.1 11.3 0l39.4 39.4c3.1 3.1 3.1 8.2 0 11.3L388.7 206.1l-50.7-50.7L458.3 34.9zM66.9 426.3L315.3 177.9l50.7 50.7L117.7 477.1c-3.1 3.1-8.2 3.1-11.3 0L66.9 437.7c-3.1-3.1-3.1-8.2 0-11.3zM435.7 12.3L44.3 403.7c-15.6 15.6-15.6 40.9 0 56.6l39.4 39.4c15.6 15.6 40.9 15.6 56.6 0L531.7 108.3c15.6-15.6 15.6-40.9 0-56.6L492.3 12.3c-15.6-15.6-40.9-15.6-56.6 0zM128 80c0-8.8-7.2-16-16-16s-16 7.2-16 16v48H48c-8.8 0-16 7.2-16 16s7.2 16 16 16H96v48c0 8.8 7.2 16 16 16s16-7.2 16-16V160h48c8.8 0 16-7.2 16-16s-7.2-16-16-16H128V80zM464 320c-8.8 0-16 7.2-16 16v48H400c-8.8 0-16 7.2-16 16s7.2 16 16 16h48v48c0 8.8 7.2 16 16 16s16-7.2 16-16V416h48c8.8 0 16-7.2 16-16s-7.2-16-16-16H480V336c0-8.8-7.2-16-16-16z"/>
              </svg>
              Disparos
            </button>
          </div>

          <div>
            <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest px-2.5 mb-1.5">Legenda</p>
            <div className="px-2 space-y-1.5">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-white/35 text-[11px] font-medium">{TYPE_LABELS[type as ActivationType]}</span>
                </div>
              ))}
              <div className="border-t border-white/5 pt-1.5 mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#8d44ad]" />
                  <span className="text-white/35 text-[11px] font-medium">Cross sell</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#a8a9b8]" />
                  <span className="text-white/35 text-[11px] font-medium">Follow up</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#27AE60]/70 text-[10px]">🎯</span>
                  <span className="text-white/35 text-[11px] font-medium">Meta diária</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-white/15 text-[9px] font-medium truncate">central-ativacoes.vercel.app</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-bold text-[#0F172A] tracking-tight">Calendário de Ativações</h1>
            <p className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{MONTHS[month]} {year}</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text="Filtra os painéis pelo período" position="bottom">
              <select value={period} onChange={e => setPeriod(e.target.value)} className={selectCls}>
                <option value="month">Este mês</option>
                <option value="all">Todo período</option>
              </select>
            </Tooltip>
            <Tooltip text="Filtra os painéis por canal" position="bottom">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
                <option value="all">Todos os canais</option>
                {(Object.entries(TYPE_LABELS) as [ActivationType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Tooltip>
            <div className="flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
              <Tooltip text="Mês anterior" position="bottom">
                <button onClick={prevMonth} className="px-2.5 py-1.5 text-[#94A3B8] hover:bg-[#F8FAFC] text-sm transition-colors font-semibold">‹</button>
              </Tooltip>
              <span className="text-xs font-semibold text-[#0F172A] px-3 border-x border-[#E2E8F0] whitespace-nowrap">{MONTHS[month]} {year}</span>
              <Tooltip text="Próximo mês" position="bottom">
                <button onClick={nextMonth} className="px-2.5 py-1.5 text-[#94A3B8] hover:bg-[#F8FAFC] text-sm transition-colors font-semibold">›</button>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex gap-4 p-4 overflow-auto">

          {/* Stats panel */}
          <div className="w-56 shrink-0">
            <StatsPanel month={monthKey} typeFilter={typeFilter} period={period} monthGoalTotal={monthGoalTotal} />
          </div>

          {/* Calendar + metrics */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="min-h-28" />;
                const dateStr = toYMD(year, month, day);
                const acts = activationsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const goal = goalsByDate[dateStr];
                const isEditingGoal = editingGoalDate === dateStr;

                return (
                  <div key={i} className={`min-h-28 rounded-xl border flex flex-col transition-all ${
                    isSelected
                      ? 'border-[#27AE60] bg-[#f0faf5] shadow-sm'
                      : 'border-[#E2E8F0] bg-white hover:border-[#27AE60]/40 hover:shadow-sm'
                  }`}>
                    <button onClick={() => setSelectedDate(dateStr)} className="flex-1 p-2 text-left flex flex-col w-full">
                      <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full mb-1 ${
                        isToday ? 'bg-[#27AE60] text-white' : 'text-[#0F172A]'
                      }`}>
                        {day}
                      </span>

                      {!loading && acts.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-1">
                          {acts.slice(0, 5).map(a => {
                            const color = getActColor(a);
                            return (
                              <span
                                key={a.id}
                                className="text-[7px] font-semibold px-1 py-px rounded-sm leading-tight truncate"
                                style={{ backgroundColor: color + '22', color, borderLeft: `2px solid ${color}` }}
                              >
                                {getActLabel(a)}
                              </span>
                            );
                          })}
                          {acts.length > 5 && (
                            <span className="text-[7px] text-gray-400">+{acts.length - 5} mais</span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="px-2 pb-1.5 border-t border-[#F3F4F6]">
                      {isEditingGoal ? (
                        <input
                          autoFocus type="number" min="0" value={goalDraft}
                          onChange={e => setGoalDraft(e.target.value)}
                          onBlur={() => saveGoal(dateStr)}
                          onKeyDown={e => { if (e.key === 'Enter') saveGoal(dateStr); if (e.key === 'Escape') setEditingGoalDate(null); }}
                          className="w-full text-[9px] border border-[#27AE60] rounded px-1 py-0.5 focus:outline-none mt-1"
                          placeholder="meta"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingGoalDate(dateStr); setGoalDraft(String(goal ?? '')); }}
                          className={`w-full text-left text-[8px] mt-1 transition-colors ${goal ? 'text-[#27AE60] font-semibold' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                          🎯 {goal ? goal.toLocaleString('pt-BR') : 'meta'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <MetricsSection month={monthKey} typeFilter={typeFilter} period={period} />
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayPanel date={selectedDate} onClose={() => setSelectedDate(null)} onUpdate={loadMonth} />
      )}
    </div>
  );
}
