import { db } from '../../../db/pool';
import type { ReadingHistoryRow } from '../checkins.types';

/** Dates the user checked in on, from one date to another, inclusive. */
export async function findCheckInDates(userId: string, from: string, to: string): Promise<string[]> {
  const { rows } = await db.query<{ check_in_date: string }>(
    `SELECT check_in_date
       FROM check_ins
      WHERE user_id = $1 AND check_in_date BETWEEN $2 AND $3`,
    [userId, from, to],
  );
  return rows.map((r) => r.check_in_date);
}

/** Every scheduled reading day up to and including the given date, newest first, with whether the user checked in. */
export async function findReadingHistory(userId: string, upTo: string): Promise<ReadingHistoryRow[]> {
  const { rows } = await db.query<ReadingHistoryRow>(
    `SELECT r.reading_date, (c.user_id IS NOT NULL) AS checked_in
       FROM readings r
       LEFT JOIN check_ins c ON c.check_in_date = r.reading_date AND c.user_id = $1
      WHERE r.reading_date <= $2
      ORDER BY r.reading_date DESC`,
    [userId, upTo],
  );
  return rows;
}
