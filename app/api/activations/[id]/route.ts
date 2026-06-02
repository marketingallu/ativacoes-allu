import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';
import { Activation } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    } = body;

    const schedules = JSON.stringify(dispatch_schedules ?? []);

    const rows = await sql`
      UPDATE activations SET
        date = ${date}, type = ${type},
        description = ${description ?? null}, segment = ${segment ?? null},
        segment_volume = ${segment_volume ?? null}, intercom_tag = ${intercom_tag ?? null},
        dispatch_schedules = ${schedules}::jsonb, coupon = ${coupon ?? null},
        offer_condition = ${offer_condition ?? null}, offer_trigger = ${offer_trigger ?? null},
        focus_product = ${focus_product ?? null}, offer_category = ${offer_category ?? null},
        image_url = ${image_url ?? null}, copy = ${copy ?? null},
        hubspot_flow_url = ${hubspot_flow_url ?? null},
        fup_target_leads = ${body.fup_target_leads ?? null}
      WHERE id = ${params.id}
      RETURNING *
    ` as Activation[];

    if (!rows.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sql = getSql();
  try {
    const { results } = await req.json();
    const rows = await sql`
      UPDATE activations SET results = ${JSON.stringify(results ?? {})}::jsonb
      WHERE id = ${params.id}
      RETURNING *
    ` as Activation[];
    if (!rows.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sql = getSql();
  try {
    await sql`DELETE FROM activations WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
