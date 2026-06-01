'use client';
import { useState } from 'react';
import { Activation } from '@/lib/types';
import TypeBadge from './TypeBadge';

interface Props {
  activation: Activation;
  onEdit: (a: Activation) => void;
  onDelete: (id: string) => void;
}

export default function ActivationCard({ activation: a, onEdit, onDelete }: Props) {
  const [showFullCopy, setShowFullCopy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const copy = a.copy ?? '';
  const truncatedCopy = copy.length > 80 ? copy.slice(0, 80) + '…' : copy;

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await fetch(`/api/activations/${a.id}`, { method: 'DELETE' });
    onDelete(a.id);
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={a.type} />
          {a.description && (
            <span className="text-sm text-[#2E2F39] truncate">{a.description}</span>
          )}
        </div>
        {a.image_url && (
          <img src={a.image_url} alt="criativo" className="w-12 h-12 rounded object-cover shrink-0" />
        )}
      </div>

      {(a.segment || a.segment_volume || a.intercom_tag) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {a.segment && <span>Seg: <strong className="text-[#2E2F39]">{a.segment}</strong></span>}
          {a.segment_volume && <span>Vol: <strong className="text-[#2E2F39]">{a.segment_volume.toLocaleString('pt-BR')}</strong></span>}
          {a.intercom_tag && <span>Tag: <strong className="text-[#2E2F39]">{a.intercom_tag}</strong></span>}
        </div>
      )}

      {a.dispatch_schedules?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {a.dispatch_schedules.map((s, i) => (
            <span key={i} className="bg-[#F7F8FA] border border-[#E5E7EB] rounded px-1.5 py-0.5 text-xs text-[#2E2F39]">
              {s.time} · {s.volume.toLocaleString('pt-BR')}
            </span>
          ))}
        </div>
      )}

      {a.coupon && (
        <div className="text-xs text-gray-500">Cupom: <strong className="text-[#2E2F39]">{a.coupon}</strong></div>
      )}

      {copy && (
        <div className="text-xs text-gray-600 bg-[#F7F8FA] rounded p-2">
          {showFullCopy ? copy : truncatedCopy}
          {copy.length > 80 && (
            <button onClick={() => setShowFullCopy(v => !v)} className="ml-1 text-[#27AE60] font-medium hover:underline">
              {showFullCopy ? 'ver menos' : 'ver mais'}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onEdit(a)}
          className="text-xs text-gray-500 hover:text-[#27AE60] flex items-center gap-1"
        >
          ✏️ Editar
        </button>
        <button
          onClick={handleDelete}
          className={`text-xs flex items-center gap-1 ${confirming ? 'text-red-600 font-semibold' : 'text-gray-500 hover:text-red-500'}`}
        >
          🗑 {confirming ? 'Confirmar exclusão?' : 'Deletar'}
        </button>
        {confirming && (
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
