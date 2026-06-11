import { NextResponse } from 'next/server';
import getSql from '@/lib/db';

export const dynamic = 'force-dynamic';

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
        results     JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_act_date ON activations(date)`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS hubspot_flow_url TEXT`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS is_fup BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS parent_activation_id UUID REFERENCES activations(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS parent_date TEXT`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS fup_target_leads TEXT`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS dispatch_category TEXT DEFAULT 'regular'`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS base_temperature TEXT`;
    await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS template_name TEXT`;
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            TEXT NOT NULL,
        start_date      DATE NOT NULL,
        end_date        DATE NOT NULL,
        segment         TEXT,
        segment_volume  INT,
        intercom_tag    TEXT,
        hubspot_flow_url TEXT,
        coupon          TEXT,
        offer_condition TEXT,
        offer_trigger   TEXT,
        focus_product   TEXT,
        offer_category  TEXT,
        dispatch_category TEXT DEFAULT 'regular',
        base_temperature  TEXT,
        color           TEXT DEFAULT '#E91E63',
        created_at      TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_touches (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id  UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        date         DATE NOT NULL,
        type         TEXT NOT NULL,
        template_name TEXT,
        description  TEXT,
        copy         TEXT,
        image_url    TEXT,
        dispatch_schedules JSONB DEFAULT '[]',
        results      JSONB DEFAULT '{}',
        sort_order   INT DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_camp_dates ON campaigns(start_date, end_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ct_campaign ON campaign_touches(campaign_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ct_date ON campaign_touches(date)`;
    return NextResponse.json({ ok: true, message: 'Schema criado com sucesso' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
