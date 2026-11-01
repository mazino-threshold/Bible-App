import { db } from '../../../db/pool';
import { APP_TIME_ZONE } from '../../../shared/time';
import type { WeeklyReportRow } from '../reports.types';

/**
 * Every user who had registered by the end of the week (admins included), with their check-ins that week.
 * Most days read first, then by name.
 */
export async function findWeeklyReportRows(weekStart: string, weekEnd: string): Promise<WeeklyReportRow[]> {
  const { rows } = await db.query<WeeklyReportRow>(
    `SELECT u.id, u.name, u.email, u.role,
            count(c.check_in_date)::int AS days_read,
            -- ::text keeps dates as 'YYYY-MM-DD' strings (pg would turn a date[] into JS Dates)
            coalesce(
              array_agg(c.check_in_date::text ORDER BY c.check_in_date) FILTER (WHERE c.check_in_date IS NOT NULL),
              '{}'
            ) AS checked_in_dates
       FROM users u
       LEFT JOIN check_ins c
              ON c.user_id = u.id
             AND c.check_in_date BETWEEN $1 AND $2
      WHERE (u.created_at AT TIME ZONE $3)::date <= $2
      GROUP BY u.id
      ORDER BY days_read DESC, lower(u.name)`,
    [weekStart, weekEnd, APP_TIME_ZONE],
  );
  return rows;
}
