import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFull(sql: any, id: string) {
  const [row] = await sql`
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
    WHERE c.id = ${id}
    GROUP BY c.id
  `;
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sql = getSql();
  try {
    const row = await fetchFull(sql, params.id);
    if (!row) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sql = getSql();
  try {
    const body = await req.json();
    const {
      name, start_date, end_date, segment, segment_volume, intercom_tag,
      hubspot_flow_url, coupon, offer_condition, offer_trigger, focus_product,
      offer_category, dispatch_category, base_temperature, color, touches,
    } = body;

    await sql`
      UPDATE campaigns SET
        name = ${name}, start_date = ${start_date}, end_date = ${end_date},
        segment = ${segment ?? null}, segment_volume = ${segment_volume ?? null},
        intercom_tag = ${intercom_tag ?? null}, hubspot_flow_url = ${hubspot_flow_url ?? null},
        coupon = ${coupon ?? null}, offer_condition = ${offer_condition ?? null},
        offer_trigger = ${offer_trigger ?? null}, focus_product = ${focus_product ?? null},
        offer_category = ${offer_category ?? null}, dispatch_category = ${dispatch_category ?? 'regular'},
        base_temperature = ${base_temperature ?? null}, color = ${color ?? '#E91E63'}
      WHERE id = ${params.id}
    `;

    await sql`DELETE FROM campaign_touches WHERE campaign_id = ${params.id}`;

    if (touches?.length) {
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        await sql`
          INSERT INTO campaign_touches
            (campaign_id, date, type, template_name, description, copy, image_url, dispatch_schedules, results, sort_order)
          VALUES (
            ${params.id}, ${t.date}, ${t.type}, ${t.template_name ?? null}, ${t.description ?? null},
            ${t.copy ?? null}, ${t.image_url ?? null},
            ${JSON.stringify(t.dispatch_schedules ?? [])}::jsonb,
            ${JSON.stringify(t.results ?? {})}::jsonb, ${i}
          )
        `;
      }
    }

    const row = await fetchFull(sql, params.id);
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sql = getSql();
  try {
    await sql`DELETE FROM campaigns WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sql = getSql();
  try {
    const { touch_id, results } = await req.json();
    const rows = await sql`
      UPDATE campaign_touches SET results = ${JSON.stringify(results ?? {})}::jsonb
      WHERE id = ${touch_id} AND campaign_id = ${params.id}
      RETURNING *
    `;
    if (!rows.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
