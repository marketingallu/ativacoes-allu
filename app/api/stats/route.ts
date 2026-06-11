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
    const base = rows[0] ?? EMPTY;

    // Add campaign touch results on top
    let campSent = 0, campDelivered = 0, campRead = 0, campReplied = 0;
    let campGross = 0, campNet = 0, campBase = 0;
    try {
      if (month) {
        const [y, m] = month.split('-');
        const touchRows = tf
          ? await sql`
              SELECT
                COALESCE(SUM(COALESCE((ct.results->>'sent')::numeric,0)),0)::bigint as sent,
                COALESCE(SUM(COALESCE((ct.results->>'delivered')::numeric,0)),0)::bigint as delivered,
                COALESCE(SUM(COALESCE((ct.results->>'read')::numeric,0)),0)::bigint as read_count,
                COALESCE(SUM(COALESCE((ct.results->>'replied')::numeric,0)),0)::bigint as replied,
                COALESCE(SUM(COALESCE((ct.results->>'gross_sales')::numeric,0)),0)::numeric as gross_sales,
                COALESCE(SUM(COALESCE((ct.results->>'net_sales')::numeric,0)),0)::numeric as net_sales
              FROM campaign_touches ct
              WHERE ct.type = ${tf}
                AND EXTRACT(YEAR FROM ct.date)=${y} AND EXTRACT(MONTH FROM ct.date)=${m}`
          : await sql`
              SELECT
                COALESCE(SUM(COALESCE((ct.results->>'sent')::numeric,0)),0)::bigint as sent,
                COALESCE(SUM(COALESCE((ct.results->>'delivered')::numeric,0)),0)::bigint as delivered,
                COALESCE(SUM(COALESCE((ct.results->>'read')::numeric,0)),0)::bigint as read_count,
                COALESCE(SUM(COALESCE((ct.results->>'replied')::numeric,0)),0)::bigint as replied,
                COALESCE(SUM(COALESCE((ct.results->>'gross_sales')::numeric,0)),0)::numeric as gross_sales,
                COALESCE(SUM(COALESCE((ct.results->>'net_sales')::numeric,0)),0)::numeric as net_sales
              FROM campaign_touches ct
              WHERE EXTRACT(YEAR FROM ct.date)=${y} AND EXTRACT(MONTH FROM ct.date)=${m}`;

        const baseRows = await sql`
          SELECT COALESCE(SUM(segment_volume),0)::bigint as camp_base
          FROM campaigns
          WHERE start_date <= (make_date(${y}::int, ${m}::int, 1) + interval '1 month - 1 day')::date
            AND end_date   >= make_date(${y}::int, ${m}::int, 1)`;

        campSent      = Number(touchRows[0]?.sent      ?? 0);
        campDelivered = Number(touchRows[0]?.delivered ?? 0);
        campRead      = Number(touchRows[0]?.read_count ?? 0);
        campReplied   = Number(touchRows[0]?.replied   ?? 0);
        campGross     = Number(touchRows[0]?.gross_sales ?? 0);
        campNet       = Number(touchRows[0]?.net_sales  ?? 0);
        campBase      = Number(baseRows[0]?.camp_base  ?? 0);
      }
    } catch { /* campaign tables may not exist yet */ }

    const combined = {
      ...base,
      total_base:   Number(base.total_base)   + campBase,
      sent:         Number(base.sent)         + campSent,
      delivered:    Number(base.delivered)    + campDelivered,
      read_count:   Number(base.read_count)   + campRead,
      replied:      Number(base.replied)      + campReplied,
      gross_sales:  Number(base.gross_sales)  + campGross,
      net_sales:    Number(base.net_sales)    + campNet,
      whatsapp_sent: Number(base.whatsapp_sent) + (tf === 'whatsapp' || !tf ? campSent : 0),
    };

    return NextResponse.json({ data: combined });
  } catch (err) {
    console.error('stats error:', err);
    return NextResponse.json({ data: EMPTY });
  }
}
