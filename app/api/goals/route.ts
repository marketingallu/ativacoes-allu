import { NextRequest, NextResponse } from 'next/server';
import getSql from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureTable(sql: ReturnType<typeof getSql>) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS dispatch_goals (
        date DATE PRIMARY KEY,
        goal INTEGER NOT NULL DEFAULT 0
      )
    `;
  } catch { /* ignore */ }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const sql = getSql();
  await ensureTable(sql);
  try {
    if (!month) return NextResponse.json({ error: 'month obrigatório' }, { status: 400 });
    const [year, m] = month.split('-');
    const rows = await sql`
      SELECT date::text, goal FROM dispatch_goals
      WHERE EXTRACT(YEAR FROM date) = ${year} AND EXTRACT(MONTH FROM date) = ${m}
    `;
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const sql = getSql();
  await ensureTable(sql);
  try {
    const { date, goal } = await req.json();
    if (goal === 0 || goal === null) {
      await sql`DELETE FROM dispatch_goals WHERE date = ${date}`;
    } else {
      await sql`
        INSERT INTO dispatch_goals (date, goal) VALUES (${date}, ${goal})
        ON CONFLICT (date) DO UPDATE SET goal = ${goal}
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
