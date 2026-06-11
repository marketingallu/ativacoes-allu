import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const sql = getSql();

  try {
    let rows;
    if (month) {
      const [y, m] = month.split('-');
      const mPad = m.padStart(2, '0');
      const firstDay = `${y}-${mPad}-01`;
      const lastDayDate = new Date(parseInt(y), parseInt(m), 0);
      const lastDay = `${y}-${mPad}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
      rows = await sql`
        SELECT c.*,
          to_char(c.start_date, 'YYYY-MM-DD') as start_date,
          to_char(c.end_date,   'YYYY-MM-DD') as end_date,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ct.id, 'campaign_id', ct.campaign_id,
                'date', to_char(ct.date, 'YYYY-MM-DD'),
                'type', ct.type, 'template_name', ct.template_name,
                'description', ct.description, 'copy', ct.copy,
                'image_url', ct.image_url, 'dispatch_schedules', ct.dispatch_schedules,
                'results', ct.results, 'sort_order', ct.sort_order, 'created_at', ct.created_at
              ) ORDER BY ct.date, ct.sort_order
            ) FILTER (WHERE ct.id IS NOT NULL), '[]'
          ) as touches
        FROM campaigns c
        LEFT JOIN campaign_touches ct ON ct.campaign_id = c.id
        WHERE c.start_date <= ${lastDay}::date AND c.end_date >= ${firstDay}::date
        GROUP BY c.id
        ORDER BY c.start_date
      `;
    } else {
      rows = await sql`
        SELECT c.*,
          to_char(c.start_date, 'YYYY-MM-DD') as start_date,
          to_char(c.end_date,   'YYYY-MM-DD') as end_date,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ct.id, 'campaign_id', ct.campaign_id,
                'date', to_char(ct.date, 'YYYY-MM-DD'),
                'type', ct.type, 'template_name', ct.template_name,
                'description', ct.description, 'copy', ct.copy,
                'image_url', ct.image_url, 'dispatch_schedules', ct.dispatch_schedules,
                'results', ct.results, 'sort_order', ct.sort_order, 'created_at', ct.created_at
              ) ORDER BY ct.date, ct.sort_order
            ) FILTER (WHERE ct.id IS NOT NULL), '[]'
          ) as touches
        FROM campaigns c
        LEFT JOIN campaign_touches ct ON ct.campaign_id = c.id
        GROUP BY c.id
        ORDER BY c.start_date
      `;
    }
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('GET campaigns error:', err);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(req: NextRequest) {
  const sql = getSql();
  try {
    const body = await req.json();
    const {
      name, start_date, end_date, segment, segment_volume, intercom_tag,
      hubspot_flow_url, coupon, offer_condition, offer_trigger, focus_product,
      offer_category, dispatch_category, base_temperature, color, touches,
    } = body;

    const [camp] = await sql`
      INSERT INTO campaigns (
        name, start_date, end_date, segment, segment_volume, intercom_tag,
        hubspot_flow_url, coupon, offer_condition, offer_trigger, focus_product,
        offer_category, dispatch_category, base_temperature, color
      ) VALUES (
        ${name}, ${start_date}, ${end_date}, ${segment ?? null}, ${segment_volume ?? null},
        ${intercom_tag ?? null}, ${hubspot_flow_url ?? null}, ${coupon ?? null},
        ${offer_condition ?? null}, ${offer_trigger ?? null}, ${focus_product ?? null},
        ${offer_category ?? null}, ${dispatch_category ?? 'regular'}, ${base_temperature ?? null},
        ${color ?? '#E91E63'}
      )
      RETURNING *
    `;

    if (touches?.length) {
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        await sql`
          INSERT INTO campaign_touches
            (campaign_id, date, type, template_name, description, copy, image_url, dispatch_schedules, results, sort_order)
          VALUES (
            ${camp.id}, ${t.date}, ${t.type}, ${t.template_name ?? null}, ${t.description ?? null},
            ${t.copy ?? null}, ${t.image_url ?? null},
            ${JSON.stringify(t.dispatch_schedules ?? [])}::jsonb,
            ${JSON.stringify(t.results ?? {})}::jsonb, ${i}
          )
        `;
      }
    }

    const [full] = await sql`
      SELECT c.*,
        to_char(c.start_date, 'YYYY-MM-DD') as start_date,
        to_char(c.end_date,   'YYYY-MM-DD') as end_date,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ct.id, 'campaign_id', ct.campaign_id,
              'date', to_char(ct.date, 'YYYY-MM-DD'),
              'type', ct.type, 'template_name', ct.template_name,
              'description', ct.description, 'copy', ct.copy,
              'image_url', ct.image_url, 'dispatch_schedules', ct.dispatch_schedules,
              'results', ct.results, 'sort_order', ct.sort_order, 'created_at', ct.created_at
            ) ORDER BY ct.date, ct.sort_order
          ) FILTER (WHERE ct.id IS NOT NULL), '[]'
        ) as touches
      FROM campaigns c
      LEFT JOIN campaign_touches ct ON ct.campaign_id = c.id
      WHERE c.id = ${camp.id}
      GROUP BY c.id
    `;

    return NextResponse.json({ data: full }, { status: 201 });
  } catch (err) {
    console.error('POST campaigns error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
