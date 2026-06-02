'use client';
import { useState, useEffect } from 'react';

interface Stats {
  activation_count: number;
  total_base: number;
  whatsapp_base: number;
  whatsapp_sent: number;
  sent: number;
  delivered: number;
  read_count: number;
  replied: number;
  gross_sales: number;
  net_sales: number;
  fup_sent: number;
  fup_delivered: number;
  fup_read_count: number;
  fup_replied: number;
  fup_gross_sales: number;
  fup_net_sales: number;
}

interface Props {
  month: string;
  typeFilter: string;
  period: string;
}

const EMPTY: Stats = {
  activation_count: 0, total_base: 0,
  whatsapp_base: 0, whatsapp_sent: 0,
  sent: 0, delivered: 0, read_count: 0, replied: 0,
  gross_sales: 0, net_sales: 0,
  fup_sent: 0, fup_delivered: 0, fup_read_count: 0, fup_replied: 0,
  fup_gross_sales: 0, fup_net_sales: 0,
};

const fmt = (n: number) => Number(n || 0).toLocaleString('pt-BR');
const fmtBRL = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '—';
const sk = 'bg-gray-100 rounded animate-pulse h-5 w-24';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</div>
      {children}
    </div>
  );
}

function MetricsGrid({ rows, loading }: { rows: [string, number, number | null][]; loading: boolean }) {
  if (loading) return <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className={sk} />)}</div>;
  return (
    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
      {rows.map(([label, value, base]) => (
        <div key={label}>
          <div className="text-[10px] text-gray-400">{label}</div>
          <div className="text-sm font-bold text-[#2E2F39]">{fmt(value)}</div>
          {base !== null && <div className="text-[10px] text-[#27AE60]">{pct(Number(value), base)}</div>}
        </div>
      ))}
    </div>
  );
}

export default function StatsPanel({ month, typeFilter, period }: Props) {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (period === 'month') p.set('month', month);
    if (typeFilter && typeFilter !== 'all') p.set('type', typeFilter);
    setLoading(true);
    fetch(`/api/stats?${p}`)
      .then(r => r.json())
      .then(j => setStats(j.data ?? EMPTY))
      .catch(() => setStats(EMPTY))
      .finally(() => setLoading(false));
  }, [month, typeFilter, period]);

  const waBase = Number(stats.whatsapp_base || 0);
  const waSent = Number(stats.whatsapp_sent || 0);
  const costBase = waSent > 0 ? waSent : waBase;
  const costUSD = costBase * 0.06;
  const sentN = Number(stats.sent || 0);
  const fupSentN = Number(stats.fup_sent || 0);

  return (
    <div className="space-y-3">
      <Block title="Base endereçável">
        {loading
          ? <div className={sk} />
          : <>
              <div className="text-2xl font-bold text-[#2E2F39]">{fmt(stats.total_base)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stats.activation_count} ativação{stats.activation_count !== 1 ? 'ões' : ''}</div>
            </>
        }
      </Block>

      <Block title="Custo WhatsApp">
        {loading
          ? <div className={sk} />
          : <>
              <div className="text-2xl font-bold text-[#2E2F39]">${costUSD.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {fmt(costBase)} msgs × $0,06{waSent === 0 && waBase > 0 ? ' (estimado)' : ''}
              </div>
            </>
        }
      </Block>

      <Block title="Métricas de disparos">
        <MetricsGrid loading={loading} rows={[
          ['Enviadas', stats.sent, null],
          ['Entregues', stats.delivered, sentN],
          ['Lidas', stats.read_count, sentN],
          ['Respondidas', stats.replied, sentN],
        ]} />
        {!loading && (Number(stats.gross_sales) > 0 || Number(stats.net_sales) > 0) && (
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-400">Vendas brutas</div>
              <div className="text-xs font-bold text-[#2E2F39]">{fmtBRL(stats.gross_sales)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Vendas líquidas</div>
              <div className="text-xs font-bold text-[#27AE60]">{fmtBRL(stats.net_sales)}</div>
            </div>
          </div>
        )}
      </Block>

      <Block title="Métricas de FUPs">
        <MetricsGrid loading={loading} rows={[
          ['Enviadas', stats.fup_sent, null],
          ['Entregues', stats.fup_delivered, fupSentN],
          ['Lidas', stats.fup_read_count, fupSentN],
          ['Respondidas', stats.fup_replied, fupSentN],
        ]} />
        {!loading && (Number(stats.fup_gross_sales) > 0 || Number(stats.fup_net_sales) > 0) && (
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-400">Vendas brutas</div>
              <div className="text-xs font-bold text-[#2E2F39]">{fmtBRL(stats.fup_gross_sales)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Vendas líquidas</div>
              <div className="text-xs font-bold text-[#27AE60]">{fmtBRL(stats.fup_net_sales)}</div>
            </div>
          </div>
        )}
      </Block>
    </div>
  );
}
