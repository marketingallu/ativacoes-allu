'use client';
import { useState, useEffect } from 'react';
import { Activation } from '@/lib/types';
import ActivationCard from './ActivationCard';
import ActivationForm from './ActivationForm';

interface Props {
  date: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DayPanel({ date, onClose, onUpdate }: Props) {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Activation | null>(null);

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

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-[440px] bg-[#F7F8FA] shadow-2xl flex flex-col">
        <div className="bg-white border-b border-[#E5E7EB] px-5 py-4 flex items-start justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Ativações</div>
            <h2 className="font-semibold text-[#2E2F39] capitalize">{dateLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-[#27AE60] hover:bg-[#219653] text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + Nova ativação
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-1">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-lg h-24 animate-pulse border border-[#E5E7EB]" />
              ))}
            </div>
          ) : activations.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">Nenhuma ativação neste dia</p>
            </div>
          ) : (
            activations.map(a => (
              <ActivationCard key={a.id} activation={a} onEdit={openEdit} onDelete={handleDelete} />
            ))
          )}
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
