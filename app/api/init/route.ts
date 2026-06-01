import { NextResponse } from 'next/server';
import getSql from '@/lib/db';

export async function GET() {
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS activations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date        DATE NOT NULL,
        type        TEXT NOT NULL CHECK(type IN ('whatsapp','email','instagram_story','instagram_post','app_push')),
        description TEXT,
        segment     TEXT,
        segment_volume INT,
        intercom_tag TEXT,
        dispatch_schedules JSONB DEFAULT '[]',
        coupon      TEXT,
        offer_condition TEXT,
        offer_trigger   TEXT,
        focus_product   TEXT,
        offer_category  TEXT,
        image_url   TEXT,
        copy        TEXT,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_act_date ON activations(date)`;
    return NextResponse.json({ ok: true, message: 'Schema criado com sucesso' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
