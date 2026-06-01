import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';
import { Activation } from '@/lib/types';

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
  try {
    const body = await req.json();
    const {
      date, type, description, segment, segment_volume, intercom_tag,
      dispatch_schedules, coupon, offer_condition, offer_trigger,
      focus_product, offer_category, image_url, copy,
    } = body;

    const schedules = JSON.stringify(dispatch_schedules ?? []);

    const rows = await sql`
      INSERT INTO activations (
        date, type, description, segment, segment_volume, intercom_tag,
        dispatch_schedules, coupon, offer_condition, offer_trigger,
        focus_product, offer_category, image_url, copy
      ) VALUES (
        ${date}, ${type}, ${description ?? null}, ${segment ?? null},
        ${segment_volume ?? null}, ${intercom_tag ?? null},
        ${schedules}::jsonb, ${coupon ?? null}, ${offer_condition ?? null},
        ${offer_trigger ?? null}, ${focus_product ?? null},
        ${offer_category ?? null}, ${image_url ?? null}, ${copy ?? null}
      )
      RETURNING *
    ` as Activation[];

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
