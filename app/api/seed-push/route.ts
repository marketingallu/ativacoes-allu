import { NextResponse } from 'next/server';
import getSql from '@/lib/db';

export const dynamic = 'force-dynamic';

// Rota temporária — apagar após uso
export async function GET() {
  const sql = getSql();
  const year = 2026;
  const month = 6; // junho
  const daysInMonth = new Date(year, month, 0).getDate(); // 30

  let created = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    try {
      await sql`
        INSERT INTO activations (date, type, dispatch_schedules, dispatch_category, results)
        VALUES (${date}, 'app_push', '[]'::jsonb, 'regular', '{}'::jsonb)
      `;
      created++;
    } catch (err) {
      console.error(`Erro no dia ${date}:`, err);
    }
  }

  return NextResponse.json({ ok: true, created, month: 'junho 2026' });
}
