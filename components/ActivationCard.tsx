'use client';
import { useState } from 'react';
import { Activation, DispatchResult } from '@/lib/types';
import TypeBadge from './TypeBadge';
import Tooltip from './Tooltip';

function formatDateBR(dateStr: string) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

interface Props {
  activation: Activation;
  onEdit: (a: Activation) => void;
  onDelete: (id: string) => void;
}

const resultFields: { key: keyof DispatchResult; label: string; decimal?: boolean; tip: string }[] = [
  { key: 'sent',        label: 'Enviadas',              tip: 'Mensagens efetivamente enviadas pelo canal' },
  { key: 'delivered',   label: 'Entregues',             tip: 'Mensagens que chegaram ao destinatário' },
  { key: 'read',        label: 'Lidas',                 tip: 'Mensagens abertas/lidas pelo destinatário' },
  { key: 'replied',     label: 'Respondidas',           tip: 'Destinatários que responderam a mensagem' },
  { key: 'gross_sales', label: 'Vendas brutas (R$)',    tip: 'Valor total de vendas geradas por este disparo', decimal: true },
  { key: 'net_sales',   label: 'Vendas líquidas (R$)',  tip: 'Valor líquido após descontos e devoluções', decimal: true },
];

export default function ActivationCard({ activation: a, onEdit, onDelete }: Props) {
  const [showFullCopy, setShowFullCopy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<DispatchResult>(a.results ?? {});
  const [savingResults, setSavingResults] = useState(false);
  const [savedResults, setSavedResults] = useState(false);

  const copy = a.copy ?? '';
  const truncatedCopy = copy.length > 80 ? copy.slice(0, 80) + '…' : copy;

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await fetch(`/api/activations/${a.id}`, { method: 'DELETE' });
    onDelete(a.id);
  }

  async function saveResults() {
    setSavingResults(true);
    await fetch(`/api/activations/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    });
    setSavingResults(false);
    setSavedResults(true);
    setTimeout(() => setSavedResults(false), 2000);
  }

  function setField(key: keyof DispatchResult, val: string) {
    const num = parseFloat(val);
    setResults(r => ({ ...r, [key]: isNaN(num) ? undefined : num }));
  }

  const hasResults = Object.values(a.results ?? {}).some(v => v !== undefined && v !== null);

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

      {a.is_fup && (
        <div className="flex flex-col gap-0.5 text-xs bg-purple-50 border border-purple-200 rounded-md px-2 py-1.5 w-fit">
          <div className="flex items-center gap-1.5">
            <span>🔁</span>
            <span className="font-semibold text-purple-700">Follow up</span>
            {a.parent_date && (
              <span className="text-purple-500">· do disparo do dia {formatDateBR(a.parent_date)}</span>
            )}
          </div>
          {a.fup_target_leads && (
            <span className="text-purple-500 pl-5">{a.fup_target_leads}</span>
          )}
        </div>
      )}

      {!a.is_fup && a.dispatch_category === 'cross_sell' && (
        <div className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 rounded-md px-2 py-1 w-fit">
          <span>🔄</span>
          <span className="font-semibold text-orange-700">Cross sell</span>
        </div>
      )}

      {a.base_temperature && (
        <div className="w-fit">
          {a.base_temperature === 'frio' && <span className="text-xs bg-blue-50 border border-blue-200 text-blue-600 font-medium px-2 py-0.5 rounded-full">🧊 Frio</span>}
          {a.base_temperature === 'morno' && <span className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 font-medium px-2 py-0.5 rounded-full">🌤 Morno</span>}
          {a.base_temperature === 'quente' && <span className="text-xs bg-red-50 border border-red-200 text-red-600 font-medium px-2 py-0.5 rounded-full">🔥 Quente</span>}
        </div>
      )}

      {(a.segment || a.segment_volume || a.intercom_tag) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {a.segment && <span>Seg: <strong className="text-[#2E2F39]">{a.segment}</strong></span>}
          {a.segment_volume && <span>Vol: <strong className="text-[#2E2F39]">{a.segment_volume.toLocaleString('pt-BR')}</strong></span>}
          {a.type === 'whatsapp' && a.segment_volume && (
            <Tooltip text="Custo estimado baseado no volume da lista (antes dos resultados reais)">
              <span className="cursor-help">Custo est.: <strong className="text-[#2E2F39]">${(a.segment_volume * 0.06).toFixed(2)}</strong></span>
            </Tooltip>
          )}
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

      {a.hubspot_flow_url && (
        <Tooltip text="Abrir fluxo de automação no HubSpot" position="right">
          <a
            href={a.hubspot_flow_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 hover:underline font-medium"
          >
            🔗 Fluxo HubSpot
          </a>
        </Tooltip>
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
        <Tooltip text="Editar dados desta ativação">
          <button onClick={() => onEdit(a)} className="text-xs text-gray-500 hover:text-[#27AE60] flex items-center gap-1">
            ✏️ Editar
          </button>
        </Tooltip>
        <Tooltip text={confirming ? 'Clique novamente para confirmar a exclusão' : 'Deletar esta ativação permanentemente'}>
          <button
            onClick={handleDelete}
            className={`text-xs flex items-center gap-1 ${confirming ? 'text-red-600 font-semibold' : 'text-gray-500 hover:text-red-500'}`}
          >
            🗑 {confirming ? 'Confirmar exclusão?' : 'Deletar'}
          </button>
        </Tooltip>
        {confirming && (
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
        )}
      </div>

      <div className="border-t border-[#E5E7EB] pt-2">
        <Tooltip text="Inserir métricas reais do disparo: enviadas, entregues, lidas, respondidas e vendas" wide>
          <button
            onClick={() => setShowResults(v => !v)}
            className="text-xs font-medium flex items-center gap-1.5 text-gray-500 hover:text-[#27AE60]"
          >
            <span>📊 Resultados</span>
            {hasResults && <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] inline-block" />}
            <span className="text-gray-300">{showResults ? '▲' : '▼'}</span>
          </button>
        </Tooltip>

        {showResults && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {resultFields.map(({ key, label, decimal, tip }) => (
                <div key={key}>
                  <Tooltip text={tip} position="top">
                    <label className="text-[10px] text-gray-400 block mb-0.5 cursor-help">{label}</label>
                  </Tooltip>
                  <input
                    type="number"
                    step={decimal ? '0.01' : '1'}
                    value={results[key] ?? ''}
                    onChange={e => setField(key, e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#27AE60]"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <Tooltip text="Salva os resultados e atualiza os painéis de métricas" position="right">
              <button
                onClick={saveResults}
                disabled={savingResults}
                className="text-xs bg-[#27AE60] hover:bg-[#219653] text-white px-3 py-1.5 rounded font-medium disabled:opacity-60 transition-colors"
              >
                {savedResults ? '✓ Salvo!' : savingResults ? 'Salvando…' : 'Salvar resultados'}
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
