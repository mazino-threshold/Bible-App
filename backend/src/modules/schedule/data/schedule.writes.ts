import { db } from '../../../db/pool';

/** Creates or replaces readings for the given dates, all in one statement. */
export async function upsertReadings(
  readings: { date: string; passage: string; notes: string | null }[],
  adminId: string,
): Promise<void> {
  await db.query(
    `INSERT INTO readings (reading_date, passage, notes, created_by)
     SELECT d, p, n, $4
       FROM unnest($1::date[], $2::text[], $3::text[]) AS t(d, p, n)
     ON CONFLICT (reading_date) DO UPDATE
       SET passage = EXCLUDED.passage,
           notes = EXCLUDED.notes,
           updated_at = now()`,
    [readings.map((r) => r.date), readings.map((r) => r.passage), readings.map((r) => r.notes), adminId],
  );
}
