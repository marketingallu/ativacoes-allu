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
      rows = await sql`SELECT * FROM activations WHERE date = ${date} ORDER BY created_at ASC` as Activation[];
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
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS parent_date TEXT`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS dispatch_category TEXT DEFAULT 'regular'`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS base_temperature TEXT`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS template_name TEXT`; } catch { /* ignore */ }

  try {
    const body = await req.json();
    const {
      date, type, description, segment, segment_volume, intercom_tag,
      dispatch_schedules, coupon, offer_condition, offer_trigger,
      focus_product, offer_category, image_url, copy, hubspot_flow_url,
      template_name,
      dispatch_category, base_temperature,
      fup_date, fup_target_leads, fup_copy,
    } = body;

    const schedules = JSON.stringify(dispatch_schedules ?? []);
    const category = dispatch_category || 'regular';

    const rows = await sql`
      INSERT INTO activations (
        date, type, description, segment, segment_volume, intercom_tag,
        dispatch_schedules, coupon, offer_condition, offer_trigger,
        focus_product, offer_category, image_url, copy, hubspot_flow_url,
        template_name, is_fup, dispatch_category, base_temperature, results
      ) VALUES (
        ${date}, ${type}, ${description ?? null}, ${segment ?? null},
        ${segment_volume ?? null}, ${intercom_tag ?? null},
        ${schedules}::jsonb, ${coupon ?? null}, ${offer_condition ?? null},
        ${offer_trigger ?? null}, ${focus_product ?? null},
        ${offer_category ?? null}, ${image_url ?? null}, ${copy ?? null},
        ${hubspot_flow_url ?? null}, ${template_name ?? null},
        false, ${category}, ${base_temperature ?? null}, '{}'::jsonb
      )
      RETURNING *
    ` as Activation[];

    const parent = rows[0];

    if (fup_date) {
      const fupDesc = `Follow up do disparo "${description || type}" do dia ${fmtDateBR(date)}`;
      await sql`
        INSERT INTO activations (
          date, type, description, segment, intercom_tag,
          dispatch_schedules, copy, is_fup, parent_activation_id,
          parent_date, fup_target_leads, dispatch_category, results
        ) VALUES (
          ${fup_date}, ${type}, ${fupDesc}, ${segment ?? null}, ${intercom_tag ?? null},
          '[]'::jsonb, ${fup_copy ?? null},
          true, ${parent.id}, ${date}, ${fup_target_leads ?? null}, 'regular', '{}'::jsonb
        )
      `;
    }

    return NextResponse.json({ data: parent }, { status: 201 });
  } catch (err) {
    console.error('POST activations error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
