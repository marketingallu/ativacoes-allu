'use client';
import { useState, useEffect } from 'react';
import { InfoTip } from './Tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stats {
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

interface RevenueData {
  faturamento_bruto: number;
  pedidos_brutos: number;
  faturamento_liquido: number;
  pedidos_liquidos: number;
}

interface Props {
  month: string;        // "2026-06"
  typeFilter: string;
  period: string;
  monthGoalTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const META_BRUTO   = 351_845;
const META_LIQUIDO =  70_369;
const META_DISPAROS = 191_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_STATS: Stats = {
  activation_count: 0, total_base: 0,
  whatsapp_base: 0, whatsapp_sent: 0,
  sent: 0, delivered: 0, read_count: 0, replied: 0,
  gross_sales: 0, net_sales: 0,
  fup_sent: 0, fup_delivered: 0, fup_read_count: 0, fup_replied: 0,
  fup_gross_sales: 0, fup_net_sales: 0,
};

const EMPTY_REV: RevenueData = {
  faturamento_bruto: 0, pedidos_brutos: 0,
  faturamento_liquido: 0, pedidos_liquidos: 0,
};

const fmt    = (n: number) => Number(n || 0).toLocaleString('pt-BR');
const fmtBRL = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pctFmt = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '0%';
const sk     = 'bg-gray-100 rounded animate-pulse h-5 w-full';

function Block({ title, tip, children }: { title: string; tip: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5">
      <div className="flex items-center gap-1 mb-2.5">
        <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">{title}</span>
        <InfoTip text={tip} />
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, meta, color = '#27AE60' }: { value: number; meta: number; color?: string }) {
  const pct = meta > 0 ? Math.min(100, (value / meta) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-[#94A3B8] font-medium mb-1">
        <span>{fmtBRL(value)}</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function pace(value: number, monthKey: string): number {
  const [year, m] = monthKey.split('-').map(Number);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === m;
  if (!isCurrentMonth) return value;
  const day = today.getDate();
  const daysInMonth = new Date(year, m, 0).getDate();
  return day > 0 ? (value / day) * daysInMonth : 0;
}

// ─── Component ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StatsPanel({ month, typeFilter, period, monthGoalTotal: _mg }: Props) {
  const [stats,   setStats]   = useState<Stats>(EMPTY_STATS);
  const [rev,     setRev]     = useState<RevenueData>(EMPTY_REV);
  const [loading, setLoading] = useState(true);
  const [revLoading, setRevLoading] = useState(true);

  // Fetch dispatch stats
  useEffect(() => {
    const p = new URLSearchParams();
    if (period === 'month') p.set('month', month);
    if (typeFilter && typeFilter !== 'all') p.set('type', typeFilter);
    setLoading(true);
    fetch(`/api/stats?${p}`)
      .then(r => r.json())
      .then(j => setStats(j.data ?? EMPTY_STATS))
      .catch(() => setStats(EMPTY_STATS))
      .finally(() => setLoading(false));
  }, [month, typeFilter, period]);

  // Fetch revenue from BigQuery
  useEffect(() => {
    setRevLoading(true);
    fetch(`/api/revenue?month=${month}`)
      .then(r => r.json())
      .then(j => setRev(j.data ?? EMPTY_REV))
      .catch(() => setRev(EMPTY_REV))
      .finally(() => setRevLoading(false));
  }, [month]);

  const totalBase     = Number(stats.total_base || 0);
  const waSent        = Number(stats.whatsapp_sent || 0);
  const costUSD       = waSent * 0.06;
  const sentN         = Number(stats.sent || 0);
  const fupSentN      = Number(stats.fup_sent || 0);
  const totalDisp     = sentN + fupSentN;
  const avg           = totalBase > 0 ? totalDisp / totalBase : 0;

  const paceBruto   = pace(rev.faturamento_bruto, month);
  const paceLiquido = pace(rev.faturamento_liquido, month);

  return (
    <div className="space-y-2.5">

      {/* Faturamento Bruto */}
      <Block title="Faturamento Bruto" tip="Soma de product_price onde coupon_code é SITE10, SITE5 ou CROSS10, ancorado em date_doc_request. Meta: R$ 351.845.">
        {revLoading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">{fmtBRL(rev.faturamento_bruto)}</div>
            <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">{fmt(rev.pedidos_brutos)} pedidos · meta {fmtBRL(META_BRUTO)}</div>
            <ProgressBar value={rev.faturamento_bruto} meta={META_BRUTO} color="#27AE60" />
            <div className="mt-1.5 text-[10px] text-[#94A3B8] font-medium">
              Pace: <span className={paceBruto >= META_BRUTO ? 'text-[#27AE60] font-semibold' : 'text-amber-500 font-semibold'}>{fmtBRL(paceBruto)}</span>
            </div>
          </>
        )}
      </Block>

      {/* Faturamento Líquido */}
      <Block title="Faturamento Líquido" tip="Soma de product_price onde coupon_code é SITE10, SITE5 ou CROSS10, ancorado em date_doc_approved. Meta: R$ 70.369.">
        {revLoading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">{fmtBRL(rev.faturamento_liquido)}</div>
            <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">{fmt(rev.pedidos_liquidos)} pedidos · meta {fmtBRL(META_LIQUIDO)}</div>
            <ProgressBar value={rev.faturamento_liquido} meta={META_LIQUIDO} color="#3498db" />
            <div className="mt-1.5 text-[10px] text-[#94A3B8] font-medium">
              Pace: <span className={paceLiquido >= META_LIQUIDO ? 'text-[#27AE60] font-semibold' : 'text-amber-500 font-semibold'}>{fmtBRL(paceLiquido)}</span>
            </div>
          </>
        )}
      </Block>

      {/* Meta de disparos */}
      <Block title="Meta de disparos do mês" tip="Meta fixa de 191.000 disparos/mês. Alcance calculado sobre a base endereçável das ativações.">
        {loading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">{fmt(META_DISPAROS)}</div>
            <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">Base endereçável: {fmt(totalBase)}</div>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-[#94A3B8] font-medium mb-1">
                <span>Alcance: {fmt(totalBase)}</span>
                <span>{pctFmt(totalBase, META_DISPAROS)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (totalBase / META_DISPAROS) * 100)}%`,
                    backgroundColor: totalBase >= META_DISPAROS ? '#27AE60' : '#F59E0B',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </Block>

      {/* Base endereçável */}
      <Block title="Base endereçável" tip="Soma das pessoas únicas nas listas de segmento. FUPs não contam pois são da mesma base.">
        {loading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">{fmt(totalBase)}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{stats.activation_count} ativação{stats.activation_count !== 1 ? 'ões' : ''}</div>
          </>
        )}
      </Block>

      {/* Disparos realizados */}
      <Block title="Disparos realizados" tip="Total de mensagens enviadas (regulares + FUPs).">
        {loading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">{fmt(totalDisp)}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{fmt(sentN)} regulares + {fmt(fupSentN)} FUPs</div>
          </>
        )}
      </Block>

      {/* Média de disparos / pessoa */}
      <Block title="Média disparos / pessoa" tip="Disparos realizados ÷ Base endereçável.">
        {loading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">{totalBase > 0 ? avg.toFixed(2) : '—'}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{fmt(totalDisp)} ÷ {fmt(totalBase)}</div>
          </>
        )}
      </Block>

      {/* Custo WhatsApp */}
      <Block title="Custo WhatsApp" tip="Mensagens enviadas via WhatsApp × $0,06 por mensagem.">
        {loading ? <div className={sk} /> : (
          <>
            <div className="text-xl font-extrabold text-[#0F172A]">${costUSD.toFixed(2)}</div>
            <div className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{fmt(waSent)} msgs × $0,06</div>
          </>
        )}
      </Block>

    </div>
  );
}
