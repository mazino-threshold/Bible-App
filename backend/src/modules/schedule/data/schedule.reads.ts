import { db } from '../../../db/pool';
import type { ReadingRow } from '../schedule.types';

/** Readings from one date to another, inclusive. */
export async function findReadingsBetween(from: string, to: string): Promise<ReadingRow[]> {
  const { rows } = await db.query<ReadingRow>(
    `SELECT reading_date, passage, notes
       FROM readings
      WHERE reading_date BETWEEN $1 AND $2
      ORDER BY reading_date`,
    [from, to],
  );
  return rows;
}

/** Every week that has at least one reading, newest first. */
export async function findScheduledWeeks(): Promise<{ week_start: string; days_scheduled: number }[]> {
  // date_trunc('week') rounds down to Monday
  const { rows } = await db.query<{ week_start: string; days_scheduled: number }>(
    `SELECT date_trunc('week', reading_date)::date AS week_start, count(*)::int AS days_scheduled
       FROM readings
      GROUP BY 1
      ORDER BY 1 DESC`,
  );
  return rows;
}
