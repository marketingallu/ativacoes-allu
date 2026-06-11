'use client';
import { useState } from 'react';
import { Campaign, CampaignTouch, DispatchResult } from '@/lib/types';
import TypeBadge from './TypeBadge';
import Tooltip from './Tooltip';
import { toast } from './Toaster';

interface Props {
  campaign: Campaign;
  touch: CampaignTouch;
  onResultsSaved?: () => void;
}

const resultFields: { key: keyof DispatchResult; label: string; decimal?: boolean }[] = [
  { key: 'sent',        label: 'Enviadas' },
  { key: 'delivered',   label: 'Entregues' },
  { key: 'read',        label: 'Lidas' },
  { key: 'replied',     label: 'Respondidas' },
  { key: 'gross_sales', label: 'Vendas brutas (R$)', decimal: true },
  { key: 'net_sales',   label: 'Vendas líquidas (R$)', decimal: true },
];

export default function CampaignTouchCard({ campaign, touch, onResultsSaved }: Props) {
  const [showCopy, setShowCopy] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<DispatchResult>(touch.results ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const copy = touch.copy ?? '';
  const hasResults = Object.values(touch.results ?? {}).some(v => v !== undefined && v !== null && v !== 0);

  async function saveResults() {
    setSaving(true);
    try {
      toast('Salvando resultados…', 'saving');
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touch_id: touch.id, results }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Resultados salvos ✓', 'success');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onResultsSaved?.();
    } catch (err) {
      toast(`Erro: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  function setField(key: keyof DispatchResult, val: string) {
    const num = parseFloat(val);
    setResults(r => ({ ...r, [key]: isNaN(num) ? undefined : num }));
  }

  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: campaign.color }}
    >
      {/* Campaign badge */}
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wide"
          style={{ backgroundColor: campaign.color }}
        >
          🎯 {campaign.name}
        </span>
      </div>

      {/* Touch header */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <TypeBadge type={touch.type} />
        {(touch.description || touch.template_name) && (
          <span className="text-sm font-semibold text-[#0F172A] truncate">
            {touch.description || touch.template_name}
          </span>
        )}
      </div>

      {/* Template name */}
      {touch.template_name && touch.description && (
        <div className="px-3 pb-1 text-xs text-[#64748B]">
          Template: <strong className="text-[#0F172A]">{touch.template_name}</strong>
        </div>
      )}

      {/* Campaign info */}
      {campaign.segment && (
        <div className="px-3 pb-1 text-xs text-[#64748B]">
          Seg: <strong className="text-[#0F172A]">{campaign.segment}</strong>
          {campaign.segment_volume && (
            <span className="ml-2">Vol: <strong className="text-[#0F172A]">{campaign.segment_volume.toLocaleString('pt-BR')}</strong></span>
          )}
        </div>
      )}

      {/* Image */}
      {touch.image_url && (
        <div className="px-3 pb-2">
          <img src={touch.image_url} alt="criativo" className="h-16 rounded-lg object-cover" />
        </div>
      )}

      {/* Copy */}
      {copy && (
        <div className="mx-3 mb-2.5 text-xs text-[#475569] bg-[#F8FAFC] rounded-lg p-2.5 border border-[#E2E8F0]">
          <span className="whitespace-pre-wrap break-words">{showCopy ? copy : copy.slice(0, 100) + (copy.length > 100 ? '…' : '')}</span>
          {copy.length > 100 && (
            <button onClick={() => setShowCopy(v => !v)} className="ml-1 text-[#27AE60] font-semibold hover:underline text-[11px]">
              {showCopy ? 'ver menos' : 'ver mais'}
            </button>
          )}
        </div>
      )}

      {/* Results toggle */}
      <div className="px-3 pb-3 border-t border-[#F1F5F9] pt-2">
        <Tooltip text="Inserir métricas reais deste toque" wide>
          <button onClick={() => setShowResults(v => !v)}
            className="text-xs font-semibold flex items-center gap-1.5 text-[#64748B] hover:text-[#27AE60] transition-colors">
            <span>📊 Resultados</span>
            {hasResults && <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] inline-block" />}
            <span className="text-[#CBD5E1] text-[10px]">{showResults ? '▲' : '▼'}</span>
          </button>
        </Tooltip>
        {showResults && (
          <div className="mt-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {resultFields.map(({ key, label, decimal }) => (
                <div key={key}>
                  <label className="text-[10px] text-[#94A3B8] font-semibold block mb-0.5 uppercase tracking-wide">{label}</label>
                  <input
                    type="number" step={decimal ? '0.01' : '1'}
                    value={results[key] ?? ''}
                    onChange={e => setField(key, e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#27AE60]/30 bg-white"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <button onClick={saveResults} disabled={saving}
              className="text-xs bg-[#27AE60] hover:bg-[#219653] text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 transition-colors">
              {saved ? '✓ Salvo!' : saving ? 'Salvando…' : 'Salvar resultados'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
