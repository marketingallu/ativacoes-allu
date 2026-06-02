import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const type = searchParams.get('type');
  const sql = getSql();

  try {
    const typeFilter = type && type !== 'all' ? type : null;
    let rows;

    if (month && typeFilter) {
      const [year, m] = month.split('-');
      rows = await sql`
        SELECT
          COUNT(*)::int as activation_count,
          COALESCE(SUM(segment_volume), 0)::bigint as total_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN segment_volume ELSE 0 END), 0)::bigint as whatsapp_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN (results->>'sent')::numeric ELSE 0 END), 0)::bigint as whatsapp_sent,
          COALESCE(SUM((results->>'sent')::numeric), 0)::bigint as sent,
          COALESCE(SUM((results->>'delivered')::numeric), 0)::bigint as delivered,
          COALESCE(SUM((results->>'read')::numeric), 0)::bigint as read_count,
          COALESCE(SUM((results->>'replied')::numeric), 0)::bigint as replied,
          COALESCE(SUM((results->>'gross_sales')::numeric), 0)::numeric as gross_sales,
          COALESCE(SUM((results->>'net_sales')::numeric), 0)::numeric as net_sales
        FROM activations
        WHERE EXTRACT(YEAR FROM date) = ${year}
          AND EXTRACT(MONTH FROM date) = ${m}
          AND type = ${typeFilter}
      `;
    } else if (month) {
      const [year, m] = month.split('-');
      rows = await sql`
        SELECT
          COUNT(*)::int as activation_count,
          COALESCE(SUM(segment_volume), 0)::bigint as total_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN segment_volume ELSE 0 END), 0)::bigint as whatsapp_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN (results->>'sent')::numeric ELSE 0 END), 0)::bigint as whatsapp_sent,
          COALESCE(SUM((results->>'sent')::numeric), 0)::bigint as sent,
          COALESCE(SUM((results->>'delivered')::numeric), 0)::bigint as delivered,
          COALESCE(SUM((results->>'read')::numeric), 0)::bigint as read_count,
          COALESCE(SUM((results->>'replied')::numeric), 0)::bigint as replied,
          COALESCE(SUM((results->>'gross_sales')::numeric), 0)::numeric as gross_sales,
          COALESCE(SUM((results->>'net_sales')::numeric), 0)::numeric as net_sales
        FROM activations
        WHERE EXTRACT(YEAR FROM date) = ${year}
          AND EXTRACT(MONTH FROM date) = ${m}
      `;
    } else if (typeFilter) {
      rows = await sql`
        SELECT
          COUNT(*)::int as activation_count,
          COALESCE(SUM(segment_volume), 0)::bigint as total_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN segment_volume ELSE 0 END), 0)::bigint as whatsapp_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN (results->>'sent')::numeric ELSE 0 END), 0)::bigint as whatsapp_sent,
          COALESCE(SUM((results->>'sent')::numeric), 0)::bigint as sent,
          COALESCE(SUM((results->>'delivered')::numeric), 0)::bigint as delivered,
          COALESCE(SUM((results->>'read')::numeric), 0)::bigint as read_count,
          COALESCE(SUM((results->>'replied')::numeric), 0)::bigint as replied,
          COALESCE(SUM((results->>'gross_sales')::numeric), 0)::numeric as gross_sales,
          COALESCE(SUM((results->>'net_sales')::numeric), 0)::numeric as net_sales
        FROM activations WHERE type = ${typeFilter}
      `;
    } else {
      rows = await sql`
        SELECT
          COUNT(*)::int as activation_count,
          COALESCE(SUM(segment_volume), 0)::bigint as total_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN segment_volume ELSE 0 END), 0)::bigint as whatsapp_base,
          COALESCE(SUM(CASE WHEN type='whatsapp' THEN (results->>'sent')::numeric ELSE 0 END), 0)::bigint as whatsapp_sent,
          COALESCE(SUM((results->>'sent')::numeric), 0)::bigint as sent,
          COALESCE(SUM((results->>'delivered')::numeric), 0)::bigint as delivered,
          COALESCE(SUM((results->>'read')::numeric), 0)::bigint as read_count,
          COALESCE(SUM((results->>'replied')::numeric), 0)::bigint as replied,
          COALESCE(SUM((results->>'gross_sales')::numeric), 0)::numeric as gross_sales,
          COALESCE(SUM((results->>'net_sales')::numeric), 0)::numeric as net_sales
        FROM activations
      `;
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
