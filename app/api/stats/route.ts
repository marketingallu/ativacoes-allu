import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';

export const dynamic = 'force-dynamic';

const EMPTY = {
  activation_count: 0, total_base: 0,
  whatsapp_base: 0, whatsapp_sent: 0,
  sent: 0, delivered: 0, read_count: 0, replied: 0,
  gross_sales: 0, net_sales: 0,
  fup_sent: 0, fup_delivered: 0, fup_read_count: 0, fup_replied: 0,
  fup_gross_sales: 0, fup_net_sales: 0,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const type = searchParams.get('type');
  const sql = getSql();
  const tf = type && type !== 'all' ? type : null;

  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS is_fup BOOLEAN DEFAULT false`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'`; } catch { /* ignore */ }

  const isFup = sql`COALESCE(is_fup, false)`;
  const notFup = sql`NOT COALESCE(is_fup, false)`;

  const buildSelect = () => sql`
    COUNT(*)::int as activation_count,
    COALESCE(SUM(CASE WHEN ${notFup} THEN segment_volume ELSE 0 END),0)::bigint as total_base,
    COALESCE(SUM(CASE WHEN ${notFup} AND type='whatsapp' THEN segment_volume ELSE 0 END),0)::bigint as whatsapp_base,
    COALESCE(SUM(CASE WHEN ${notFup} AND type='whatsapp' THEN COALESCE((results->>'sent')::numeric,0) ELSE 0 END),0)::bigint as whatsapp_sent,
    COALESCE(SUM(CASE WHEN ${notFup} THEN COALESCE((results->>'sent')::numeric,0) ELSE 0 END),0)::bigint as sent,
    COALESCE(SUM(CASE WHEN ${notFup} THEN COALESCE((results->>'delivered')::numeric,0) ELSE 0 END),0)::bigint as delivered,
    COALESCE(SUM(CASE WHEN ${notFup} THEN COALESCE((results->>'read')::numeric,0) ELSE 0 END),0)::bigint as read_count,
    COALESCE(SUM(CASE WHEN ${notFup} THEN COALESCE((results->>'replied')::numeric,0) ELSE 0 END),0)::bigint as replied,
    COALESCE(SUM(CASE WHEN ${notFup} THEN COALESCE((results->>'gross_sales')::numeric,0) ELSE 0 END),0)::numeric as gross_sales,
    COALESCE(SUM(CASE WHEN ${notFup} THEN COALESCE((results->>'net_sales')::numeric,0) ELSE 0 END),0)::numeric as net_sales,
    COALESCE(SUM(CASE WHEN ${isFup} THEN COALESCE((results->>'sent')::numeric,0) ELSE 0 END),0)::bigint as fup_sent,
    COALESCE(SUM(CASE WHEN ${isFup} THEN COALESCE((results->>'delivered')::numeric,0) ELSE 0 END),0)::bigint as fup_delivered,
    COALESCE(SUM(CASE WHEN ${isFup} THEN COALESCE((results->>'read')::numeric,0) ELSE 0 END),0)::bigint as fup_read_count,
    COALESCE(SUM(CASE WHEN ${isFup} THEN COALESCE((results->>'replied')::numeric,0) ELSE 0 END),0)::bigint as fup_replied,
    COALESCE(SUM(CASE WHEN ${isFup} THEN COALESCE((results->>'gross_sales')::numeric,0) ELSE 0 END),0)::numeric as fup_gross_sales,
    COALESCE(SUM(CASE WHEN ${isFup} THEN COALESCE((results->>'net_sales')::numeric,0) ELSE 0 END),0)::numeric as fup_net_sales
  `;

  try {
    let rows;
    if (month && tf) {
      const [y, m] = month.split('-');
      rows = await sql`SELECT ${buildSelect()} FROM activations WHERE EXTRACT(YEAR FROM date)=${y} AND EXTRACT(MONTH FROM date)=${m} AND type=${tf}`;
    } else if (month) {
      const [y, m] = month.split('-');
      rows = await sql`SELECT ${buildSelect()} FROM activations WHERE EXTRACT(YEAR FROM date)=${y} AND EXTRACT(MONTH FROM date)=${m}`;
    } else if (tf) {
      rows = await sql`SELECT ${buildSelect()} FROM activations WHERE type=${tf}`;
    } else {
      rows = await sql`SELECT ${buildSelect()} FROM activations`;
    }
    return NextResponse.json({ data: rows[0] ?? EMPTY });
  } catch (err) {
    console.error('stats error:', err);
    return NextResponse.json({ data: EMPTY });
  }
}
