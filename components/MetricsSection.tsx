'use client';
import { useState, useEffect } from 'react';
import { InfoTip } from './Tooltip';

interface Stats {
  sent: number; delivered: number; read_count: number; replied: number;
  gross_sales: number; net_sales: number;
  fup_sent: number; fup_delivered: number; fup_read_count: number; fup_replied: number;
  fup_gross_sales: number; fup_net_sales: number;
}

const EMPTY: Stats = {
  sent: 0, delivered: 0, read_count: 0, replied: 0,
  gross_sales: 0, net_sales: 0,
  fup_sent: 0, fup_delivered: 0, fup_read_count: 0, fup_replied: 0,
  fup_gross_sales: 0, fup_net_sales: 0,
};

const fmt    = (n: number) => Number(n || 0).toLocaleString('pt-BR');
const fmtBRL = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct    = (p: number, t: number) => t > 0 ? ((p / t) * 100).toFixed(1) + '%' : '—';
const sk     = 'bg-gray-100 rounded animate-pulse h-4 w-20';

function MetricRow({ label, value, base }: { label: string; value: number; base: number | null }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-xs font-bold text-[#2E2F39]">{fmt(value)}</span>
        {base !== null && base > 0 && (
          <span className="ml-2 text-[10px] text-[#27AE60]">{pct(value, base)}</span>
        )}
      </div>
    </div>
  );
}

interface Props { month: string; typeFilter: string; period: string; refreshKey?: number; }

export default function MetricsSection({ month, typeFilter, period, refreshKey }: Props) {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (period === 'month') p.set('month', month);
    if (typeFilter && typeFilter !== 'all') p.set('type', typeFilter);
    setLoading(true);
    fetch(`/api/stats?${p}`)
      .then(r => r.json())
      .then(j => setStats({ ...EMPTY, ...(j.data ?? {}) }))
      .catch(() => setStats(EMPTY))
      .finally(() => setLoading(false));
  }, [month, typeFilter, period, refreshKey]);

  const sentN    = Number(stats.sent    || 0);
  const fupSentN = Number(stats.fup_sent || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

      {/* Métricas de Disparos */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="flex items-center mb-3">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Métricas de Disparos</span>
          <InfoTip text="Resultados dos disparos regulares (excluindo FUPs). Percentuais sobre o total de enviadas." />
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className={sk} />)}</div>
        ) : (
          <>
            <MetricRow label="Enviadas"    value={sentN}              base={null} />
            <MetricRow label="Entregues"   value={stats.delivered}    base={sentN} />
            <MetricRow label="Lidas"       value={stats.read_count}   base={sentN} />
            <MetricRow label="Respondidas" value={stats.replied}      base={sentN} />
            {(stats.gross_sales > 0 || stats.net_sales > 0) && (
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-gray-400">Vendas brutas</div>
                  <div className="text-sm font-bold text-[#2E2F39]">{fmtBRL(stats.gross_sales)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Vendas líquidas</div>
                  <div className="text-sm font-bold text-[#27AE60]">{fmtBRL(stats.net_sales)}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Métricas de FUPs */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="flex items-center mb-3">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Métricas de FUPs</span>
          <InfoTip text="Resultados exclusivos dos disparos de follow up. Percentuais sobre o total de enviadas nos FUPs." />
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className={sk} />)}</div>
        ) : (
          <>
            <MetricRow label="Enviadas"    value={fupSentN}             base={null} />
            <MetricRow label="Entregues"   value={stats.fup_delivered}  base={fupSentN} />
            <MetricRow label="Lidas"       value={stats.fup_read_count} base={fupSentN} />
            <MetricRow label="Respondidas" value={stats.fup_replied}    base={fupSentN} />
            {(stats.fup_gross_sales > 0 || stats.fup_net_sales > 0) && (
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-gray-400">Vendas brutas</div>
                  <div className="text-sm font-bold text-[#2E2F39]">{fmtBRL(stats.fup_gross_sales)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Vendas líquidas</div>
                  <div className="text-sm font-bold text-[#27AE60]">{fmtBRL(stats.fup_net_sales)}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
