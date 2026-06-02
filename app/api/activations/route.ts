import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';
import { Activation } from '@/lib/types';

export const dynamic = 'force-dynamic';

function fmtDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const date = searchParams.get('date');
  const sql = getSql();

  try {
    let rows: Activation[];
    if (date) {
      rows = await sql`
        SELECT * FROM activations WHERE date = ${date} ORDER BY created_at ASC
      ` as Activation[];
    } else if (month) {
      const [year, m] = month.split('-');
      rows = await sql`
        SELECT * FROM activations
        WHERE EXTRACT(YEAR FROM date) = ${year} AND EXTRACT(MONTH FROM date) = ${m}
        ORDER BY date ASC, created_at ASC
      ` as Activation[];
    } else {
      return NextResponse.json({ error: 'Param month ou date obrigatório' }, { status: 400 });
    }
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sql = getSql();
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS hubspot_flow_url TEXT`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS is_fup BOOLEAN DEFAULT false`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS fup_target_leads TEXT`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS parent_activation_id UUID`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'`; } catch { /* ignore */ }
  try {
    const body = await req.json();
    const {
      date, type, description, segment, segment_volume, intercom_tag,
      dispatch_schedules, coupon, offer_condition, offer_trigger,
      focus_product, offer_category, image_url, copy, hubspot_flow_url,
      fup_date, fup_target_leads, fup_copy,
    } = body;

    const schedules = JSON.stringify(dispatch_schedules ?? []);

    const rows = await sql`
      INSERT INTO activations (
        date, type, description, segment, segment_volume, intercom_tag,
        dispatch_schedules, coupon, offer_condition, offer_trigger,
        focus_product, offer_category, image_url, copy, hubspot_flow_url,
        is_fup, results
      ) VALUES (
        ${date}, ${type}, ${description ?? null}, ${segment ?? null},
        ${segment_volume ?? null}, ${intercom_tag ?? null},
        ${schedules}::jsonb, ${coupon ?? null}, ${offer_condition ?? null},
        ${offer_trigger ?? null}, ${focus_product ?? null},
        ${offer_category ?? null}, ${image_url ?? null}, ${copy ?? null},
        ${hubspot_flow_url ?? null}, false, '{}'::jsonb
      )
      RETURNING *
    ` as Activation[];

    const parent = rows[0];

    if (fup_date) {
      const fupDesc = `Follow up do disparo "${description || type}" do dia ${fmtDateBR(date)}`;
      await sql`
        INSERT INTO activations (
          date, type, description, segment, segment_volume, intercom_tag,
          dispatch_schedules, copy, is_fup, parent_activation_id, fup_target_leads, results
        ) VALUES (
          ${fup_date}, ${type}, ${fupDesc}, ${segment ?? null},
          null, ${intercom_tag ?? null},
          '[]'::jsonb, ${fup_copy ?? null},
          true, ${parent.id}, ${fup_target_leads ?? null}, '{}'::jsonb
        )
      `;
    }

    return NextResponse.json({ data: parent }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
