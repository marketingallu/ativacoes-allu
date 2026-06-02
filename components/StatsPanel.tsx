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
}

interface Props {
  month: string;
  typeFilter: string;
  period: string;
}

const WA_COST = 0.06;
const fmt = (n: number) => Number(n).toLocaleString('pt-BR');
const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '—';

export default function StatsPanel({ month, typeFilter, period }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (period === 'month') p.set('month', month);
    if (typeFilter && typeFilter !== 'all') p.set('type', typeFilter);
    setLoading(true);
    fetch(`/api/stats?${p}`)
      .then(r => r.json())
      .then(j => { setStats(j.data ?? null); setLoading(false); });
  }, [month, typeFilter, period]);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-[#E5E7EB]" />
      ))}
    </div>
  );

  if (!stats) return null;

  const waBase = Number(stats.whatsapp_base);
  const waSent = Number(stats.whatsapp_sent);
  const costBase = waSent > 0 ? waSent : waBase;
  const costUSD = costBase * WA_COST;
  const sentN = Number(stats.sent);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Base disparada</div>
        <div className="text-2xl font-bold text-[#2E2F39]">{fmt(stats.total_base)}</div>
        <div className="text-xs text-gray-400 mt-0.5">{stats.activation_count} ativação{stats.activation_count !== 1 ? 'ões' : ''}</div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Custo WhatsApp</div>
        <div className="text-2xl font-bold text-[#2E2F39]">${costUSD.toFixed(2)}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {fmt(costBase)} msgs × $0,06
          {waSent === 0 && waBase > 0 && ' (estimado)'}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Métricas de disparo</div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          {([
            ['Enviadas', stats.sent, null],
            ['Entregues', stats.delivered, sentN],
            ['Lidas', stats.read_count, sentN],
            ['Respondidas', stats.replied, sentN],
          ] as [string, number, number | null][]).map(([label, value, base]) => (
            <div key={label}>
              <div className="text-[10px] text-gray-400">{label}</div>
              <div className="text-sm font-bold text-[#2E2F39]">{fmt(value)}</div>
              {base !== null && <div className="text-[10px] text-[#27AE60]">{pct(Number(value), base)}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Vendas</div>
        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-gray-400">Bruta</div>
            <div className="text-sm font-bold text-[#2E2F39]">{fmtBRL(stats.gross_sales)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400">Líquida</div>
            <div className="text-sm font-bold text-[#27AE60]">{fmtBRL(stats.net_sales)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
