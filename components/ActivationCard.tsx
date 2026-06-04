'use client';
import { useState } from 'react';
import { Activation, DispatchResult, TYPE_COLORS } from '@/lib/types';
import TypeBadge from './TypeBadge';
import Tooltip from './Tooltip';
import { toast } from './Toaster';

interface Props {
  activation: Activation;
  onEdit: (a: Activation) => void;
  onDelete: (id: string) => void;
}

function formatDateBR(dateStr: string) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

const resultFields: { key: keyof DispatchResult; label: string; decimal?: boolean; tip: string }[] = [
  { key: 'sent',        label: 'Enviadas',             tip: 'Mensagens efetivamente enviadas pelo canal' },
  { key: 'delivered',   label: 'Entregues',            tip: 'Mensagens que chegaram ao destinatário' },
  { key: 'read',        label: 'Lidas',                tip: 'Mensagens abertas/lidas pelo destinatário' },
  { key: 'replied',     label: 'Respondidas',          tip: 'Destinatários que responderam' },
  { key: 'gross_sales', label: 'Vendas brutas (R$)',   tip: 'Valor total de vendas geradas por este disparo', decimal: true },
  { key: 'net_sales',   label: 'Vendas líquidas (R$)', tip: 'Valor líquido após descontos e devoluções', decimal: true },
];

function getCardColor(a: Activation): string {
  if (a.is_fup) return '#a8a9b8';
  if (a.dispatch_category === 'cross_sell') return '#8d44ad';
  return TYPE_COLORS[a.type];
}

export default function ActivationCard({ activation: a, onEdit, onDelete }: Props) {
  const [showFullCopy, setShowFullCopy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<DispatchResult>(a.results ?? {});
  const [savingResults, setSavingResults] = useState(false);
  const [savedResults, setSavedResults] = useState(false);

  const copy = a.copy ?? '';
  const truncatedCopy = copy.length > 100 ? copy.slice(0, 100) + '…' : copy;
  const cardColor = getCardColor(a);
  const hasResults = Object.values(a.results ?? {}).some(v => v !== undefined && v !== null && v !== 0);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await fetch(`/api/activations/${a.id}`, { method: 'DELETE' });
    onDelete(a.id);
  }

  async function saveResults() {
    setSavingResults(true);
    try {
      toast('Salvando resultados…', 'saving');
      const res = await fetch(`/api/activations/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Resultados salvos ✓', 'success');
      setSavedResults(true);
      setTimeout(() => setSavedResults(false), 2000);
    } catch (err) {
      toast(`Erro ao salvar resultados: ${String(err)}`, 'error');
    } finally {
      setSavingResults(false);
    }
  }

  function setField(key: keyof DispatchResult, val: string) {
    const num = parseFloat(val);
    setResults(r => ({ ...r, [key]: isNaN(num) ? undefined : num }));
  }

  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: cardColor }}
    >
      {/* Header row */}
      <div className="px-3.5 pt-3 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TypeBadge type={a.type} />
          {a.description && (
            <span className="text-sm font-semibold text-[#0F172A] truncate">{a.description}</span>
          )}
        </div>
        {a.image_url && (
          <img src={a.image_url} alt="criativo" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#E2E8F0]" />
        )}
      </div>

      {/* Tags row */}
      {(a.is_fup || (!a.is_fup && a.dispatch_category === 'cross_sell') || a.base_temperature) && (
        <div className="px-3.5 pb-2 flex gap-1.5 flex-wrap">
          {a.is_fup && (
            <div className="inline-flex items-center gap-1 text-[11px] bg-purple-50 border border-purple-200 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
              🔁 FUP
              {a.parent_date && <span className="font-normal text-purple-500"> · dia {formatDateBR(a.parent_date)}</span>}
            </div>
          )}
          {!a.is_fup && a.dispatch_category === 'cross_sell' && (
            <div className="inline-flex items-center gap-1 text-[11px] bg-purple-50 border border-purple-200 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
              🔄 Cross sell
            </div>
          )}
          {a.base_temperature === 'frio' && <span className="text-[11px] bg-blue-50 border border-blue-200 text-blue-600 font-semibold px-2 py-0.5 rounded-full">🧊 Frio</span>}
          {a.base_temperature === 'morno' && <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-600 font-semibold px-2 py-0.5 rounded-full">🌤 Morno</span>}
          {a.base_temperature === 'quente' && <span className="text-[11px] bg-red-50 border border-red-200 text-red-600 font-semibold px-2 py-0.5 rounded-full">🔥 Quente</span>}
        </div>
      )}

      {/* Meta info */}
      {(a.segment || a.segment_volume || a.intercom_tag) && (
        <div className="px-3.5 pb-2 space-y-0.5">
          {a.segment && (
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <span className="text-[#94A3B8] shrink-0">Seg:</span>
              <span className="font-semibold text-[#0F172A] truncate max-w-[280px]">{a.segment}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#64748B]">
            {a.segment_volume && (
              <span>Vol: <strong className="text-[#0F172A]">{a.segment_volume.toLocaleString('pt-BR')}</strong></span>
            )}
            {a.type === 'whatsapp' && a.segment_volume && (
              <Tooltip text="Custo estimado baseado no volume da lista">
                <span className="cursor-help">Custo est.: <strong className="text-[#0F172A]">${(a.segment_volume * 0.06).toFixed(2)}</strong></span>
              </Tooltip>
            )}
            {a.intercom_tag && (
              <span>Tag: <strong className="text-[#0F172A] truncate">{a.intercom_tag}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Schedules */}
      {a.dispatch_schedules?.length > 0 && (
        <div className="px-3.5 pb-2 flex flex-wrap gap-1">
          {a.dispatch_schedules.map((s, i) => (
            <span key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-0.5 text-[11px] font-medium text-[#475569]">
              {s.time} · {s.volume.toLocaleString('pt-BR')}
            </span>
          ))}
        </div>
      )}

      {/* Coupon */}
      {a.coupon && (
        <div className="px-3.5 pb-2 text-xs text-[#64748B]">
          Cupom: <strong className="text-[#0F172A] font-semibold">{a.coupon}</strong>
        </div>
      )}

      {/* HubSpot */}
      {a.hubspot_flow_url && (
        <div className="px-3.5 pb-2">
          <Tooltip text="Abrir fluxo no HubSpot" position="right">
            <a
              href={a.hubspot_flow_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-600 font-semibold hover:underline"
            >
              🔗 Fluxo HubSpot
            </a>
          </Tooltip>
        </div>
      )}

      {/* Copy */}
      {copy && (
        <div className="mx-3.5 mb-2.5 text-xs text-[#475569] bg-[#F8FAFC] rounded-lg p-2.5 border border-[#E2E8F0]">
          <span className="whitespace-pre-wrap break-words">{showFullCopy ? copy : truncatedCopy}</span>
          {copy.length > 100 && (
            <button onClick={() => setShowFullCopy(v => !v)} className="ml-1 text-[#27AE60] font-semibold hover:underline text-[11px]">
              {showFullCopy ? 'ver menos' : 'ver mais'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-3.5 py-2 border-t border-[#F1F5F9] flex items-center gap-3">
        <Tooltip text="Editar esta ativação">
          <button onClick={() => onEdit(a)} className="text-xs text-[#64748B] hover:text-[#27AE60] flex items-center gap-1 font-medium transition-colors">
            ✏️ Editar
          </button>
        </Tooltip>
        <Tooltip text={confirming ? 'Clique novamente para confirmar' : 'Deletar permanentemente'}>
          <button
            onClick={handleDelete}
            className={`text-xs flex items-center gap-1 font-medium transition-colors ${confirming ? 'text-red-600' : 'text-[#64748B] hover:text-red-500'}`}
          >
            🗑 {confirming ? 'Confirmar?' : 'Deletar'}
          </button>
        </Tooltip>
        {confirming && (
          <button onClick={() => setConfirming(false)} className="text-xs text-[#94A3B8] hover:text-[#64748B] font-medium">
            Cancelar
          </button>
        )}
      </div>

      {/* Results toggle */}
      <div className="px-3.5 pb-3">
        <Tooltip text="Inserir métricas reais do disparo" wide>
          <button
            onClick={() => setShowResults(v => !v)}
            className="text-xs font-semibold flex items-center gap-1.5 text-[#64748B] hover:text-[#27AE60] transition-colors"
          >
            <span>📊 Resultados</span>
            {hasResults && <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] inline-block" />}
            <span className="text-[#CBD5E1] text-[10px]">{showResults ? '▲' : '▼'}</span>
          </button>
        </Tooltip>

        {showResults && (
          <div className="mt-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {resultFields.map(({ key, label, decimal, tip }) => (
                <div key={key}>
                  <Tooltip text={tip} position="top">
                    <label className="text-[10px] text-[#94A3B8] font-semibold block mb-0.5 cursor-help uppercase tracking-wide">{label}</label>
                  </Tooltip>
                  <input
                    type="number"
                    step={decimal ? '0.01' : '1'}
                    value={results[key] ?? ''}
                    onChange={e => setField(key, e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#27AE60]/30 bg-white"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveResults}
              disabled={savingResults}
              className="text-xs bg-[#27AE60] hover:bg-[#219653] text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 transition-colors"
            >
              {savedResults ? '✓ Salvo!' : savingResults ? 'Salvando…' : 'Salvar resultados'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
