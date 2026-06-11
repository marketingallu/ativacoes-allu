'use client';
import { useState, useEffect } from 'react';
import { Activation, ActivationType, Campaign, TYPE_LABELS, TYPE_COLORS } from '@/lib/types';
import ActivationCard from './ActivationCard';
import ActivationForm from './ActivationForm';
import CampaignTouchCard from './CampaignTouchCard';
import Tooltip from './Tooltip';

interface Props {
  date: string;
  onClose: () => void;
  onUpdate: () => void;
  onResultsSaved?: () => void;
  campaigns?: Campaign[];
}

export default function DayPanel({ date, onClose, onUpdate, onResultsSaved, campaigns = [] }: Props) {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Activation | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [date]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/activations?date=${date}`);
    const json = await res.json();
    setActivations(json.data ?? []);
    setLoading(false);
  }

  function handleSave(a: Activation) {
    setActivations(prev => {
      const idx = prev.findIndex(x => x.id === a.id);
      if (idx >= 0) return prev.map(x => x.id === a.id ? a : x);
      return [...prev, a];
    });
    setShowForm(false);
    setEditing(null);
    onUpdate();
  }

  function handleDelete(id: string) {
    setActivations(prev => prev.filter(x => x.id !== id));
    onUpdate();
  }

  function openEdit(a: Activation) {
    setEditing(a);
    setShowForm(true);
  }

  const [y, m, d] = date.split('-').map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const filtered = typeFilter === 'all'
    ? activations
    : activations.filter(a => a.type === typeFilter);

  const countByType = (type: string) =>
    activations.filter(a => a.type === type).length;

  const activeTypes = (Object.keys(TYPE_LABELS) as ActivationType[]).filter(t => countByType(t) > 0);

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-[460px] bg-[#F8FAFC] shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-0.5">Ativações</p>
            <h2 className="font-bold text-[#0F172A] capitalize text-sm">{dateLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text="Criar nova ativação para este dia" position="bottom">
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="bg-[#27AE60] hover:bg-[#219653] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                + Nova ativação
              </button>
            </Tooltip>
            <button
              onClick={onClose}
              className="text-[#94A3B8] hover:text-[#0F172A] w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0F2F5] transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        {!loading && activations.length > 0 && (
          <div className="bg-white border-b border-[#E2E8F0] px-4 py-2.5 flex gap-1.5 flex-wrap shrink-0">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                typeFilter === 'all'
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F0F2F5] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              Todos · {activations.length}
            </button>
            {activeTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  typeFilter === type
                    ? 'text-white'
                    : 'bg-[#F0F2F5] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
                style={typeFilter === type ? { backgroundColor: TYPE_COLORS[type] } : {}}
              >
                {TYPE_LABELS[type]} · {countByType(type)}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Campaign touches for this day */}
          {(() => {
            const campTouches = campaigns.flatMap(c =>
              (c.touches ?? []).filter(t => t.date.slice(0, 10) === date).map(t => ({ campaign: c, touch: t }))
            );
            if (campTouches.length === 0) return null;
            return (
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest px-0.5">Campanhas</p>
                {campTouches.map(({ campaign, touch }) => (
                  <CampaignTouchCard key={touch.id} campaign={campaign} touch={touch} onResultsSaved={onResultsSaved} />
                ))}
              </div>
            );
          })()}

          {loading ? (
            <div className="space-y-2.5 pt-1">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl h-28 animate-pulse border border-[#E2E8F0]" />
              ))}
            </div>
          ) : filtered.length === 0 && campaigns.flatMap(c => c.touches.filter(t => t.date.slice(0, 10) === date)).length === 0 ? (
            <div className="text-center py-16 text-[#94A3B8]">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm font-medium">
                {activations.length === 0 ? 'Nenhuma ativação neste dia' : 'Nenhuma ativação com esse filtro'}
              </p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-2.5">
              {filtered.length > 0 && campaigns.flatMap(c => c.touches.filter(t => t.date.slice(0, 10) === date)).length > 0 && (
                <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest px-0.5">Ativações avulsas</p>
              )}
              {filtered.map(a => (
                <ActivationCard key={a.id} activation={a} onEdit={openEdit} onDelete={handleDelete} onResultsSaved={onResultsSaved} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showForm && (
        <ActivationForm
          date={date}
          activation={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </>
  );
}
