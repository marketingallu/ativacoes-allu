'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Activation, ActivationType, Campaign, TYPE_COLORS, TYPE_LABELS } from '@/lib/types';
import DayPanel from './DayPanel';
import StatsPanel from './StatsPanel';
import MetricsSection from './MetricsSection';
import CampaignForm from './CampaignForm';
import Tooltip from './Tooltip';
import { toast } from './Toaster';

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
  const [statsKey, setStatsKey] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingGoalDate, setEditingGoalDate] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState('');
  const savingGoalRef = React.useRef(false);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const [actRes, goalRes, campRes] = await Promise.all([
      fetch(`/api/activations?month=${monthKey}`),
      fetch(`/api/goals?month=${monthKey}`),
      fetch(`/api/campaigns?month=${monthKey}`),
    ]);
    const [actJson, goalJson, campJson] = await Promise.all([actRes.json(), goalRes.json(), campRes.json()]);
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
    setCampaigns(campJson.data ?? []);
    setLoading(false);
  }, [monthKey]);

  // Auto-migrate DB on first load
  useEffect(() => { fetch('/api/init').catch(() => {}); }, []);

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

    const raw = goalDraft.trim();
    const val = parseInt(raw.replace(/\./g, '').replace(/,/g, ''));
    setEditingGoalDate(null);
    setGoalDraft('');

    if (isNaN(val) || val < 0) { savingGoalRef.current = false; return; }

    // optimistic update
    const prev = goalsByDate[dateStr];
    if (val === 0) {
      setGoalsByDate(p => { const n = { ...p }; delete n[dateStr]; return n; });
    } else {
      setGoalsByDate(p => ({ ...p, [dateStr]: val }));
    }

    try {
      toast('Salvando meta…', 'saving');
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, goal: val }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      toast(`Meta ${val > 0 ? val.toLocaleString('pt-BR') : 'removida'} salva ✓`, 'success');
    } catch (err) {
      // revert optimistic update on error
      if (prev !== undefined) {
        setGoalsByDate(p => ({ ...p, [dateStr]: prev }));
      } else {
        setGoalsByDate(p => { const n = { ...p }; delete n[dateStr]; return n; });
      }
      toast(`Erro ao salvar meta: ${String(err)}`, 'error');
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
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">


      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[#0F172A] text-lg font-extrabold tracking-tight">allu.</span>
              <span className="text-[#94A3B8] text-xs font-semibold ml-1 uppercase tracking-widest">Ativações</span>
            </div>
            <div className="w-px h-6 bg-[#E2E8F0]" />
            <p className="text-[11px] text-[#94A3B8] font-medium">{MONTHS[month]} {year}</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text="Criar nova campanha com múltiplos toques" position="bottom">
              <button
                onClick={() => { setEditingCampaign(null); setShowCampaignForm(true); }}
                className="bg-[#E91E63] hover:bg-[#C2185B] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                🎯 Nova Campanha
              </button>
            </Tooltip>
            <div className="w-px h-5 bg-[#E2E8F0]" />
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
            <StatsPanel month={monthKey} typeFilter={typeFilter} period={period} monthGoalTotal={monthGoalTotal} refreshKey={statsKey} />
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
                const allActs = activationsByDate[dateStr] ?? [];
                const acts = typeFilter === 'all' ? allActs : allActs.filter(a => a.type === typeFilter);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const goal = goalsByDate[dateStr];
                const isEditingGoal = editingGoalDate === dateStr;
                const campaignsOnDay = campaigns.filter(c =>
                  c.start_date.slice(0, 10) <= dateStr && c.end_date.slice(0, 10) >= dateStr
                );

                return (
                  <div key={i} className={`min-h-28 rounded-xl border flex flex-col transition-all ${
                    isSelected
                      ? 'border-[#27AE60] bg-[#f0faf5] shadow-sm'
                      : 'border-[#E2E8F0] bg-white hover:border-[#27AE60]/40 hover:shadow-sm'
                  }`}>
                    {/* Campaign strips */}
                    {campaignsOnDay.length > 0 && (
                      <div className="flex flex-col gap-px pt-1 px-1">
                        {campaignsOnDay.map(camp => {
                          const isStart = camp.start_date.slice(0, 10) === dateStr;
                          const isEnd   = camp.end_date.slice(0, 10)   === dateStr;
                          return (
                            <button
                              key={camp.id}
                              type="button"
                              onClick={e => { e.stopPropagation(); setEditingCampaign(camp); setShowCampaignForm(true); }}
                              title={camp.name}
                              className={`h-3.5 w-full flex items-center px-1 transition-opacity hover:opacity-75 ${
                                isStart && isEnd ? 'rounded' : isStart ? 'rounded-l' : isEnd ? 'rounded-r' : ''
                              }`}
                              style={{ backgroundColor: camp.color }}
                            >
                              <span className="text-[7px] font-bold text-white truncate leading-none">{camp.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

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

            <MetricsSection month={monthKey} typeFilter={typeFilter} period={period} refreshKey={statsKey} />
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayPanel
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onUpdate={loadMonth}
          onResultsSaved={() => setStatsKey(k => k + 1)}
          campaigns={campaigns}
        />
      )}

      {showCampaignForm && (
        <CampaignForm
          campaign={editingCampaign}
          onSave={() => { setShowCampaignForm(false); setEditingCampaign(null); loadMonth(); setStatsKey(k => k + 1); }}
          onClose={() => { setShowCampaignForm(false); setEditingCampaign(null); }}
        />
      )}
    </div>
  );
}

