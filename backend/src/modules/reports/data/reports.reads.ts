import { db } from '../../../db/pool';
import { APP_TIME_ZONE } from '../../../shared/time';
import type { WeeklyReportRow } from '../reports.types';

/**
 * Every user who had registered by the end of the week and was active for at least part of it (admins included),
 * with their check-ins that week. Most days read first, then by name.
 */
export async function findWeeklyReportRows(weekStart: string, weekEnd: string): Promise<WeeklyReportRow[]> {
  const { rows } = await db.query<WeeklyReportRow>(
    `SELECT u.id, u.name, u.email, u.role,
            u.deactivated_at IS NULL AS active,
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
        -- Leave out anyone deactivated for the whole week: deactivated before Monday, and not reactivated during it
        AND NOT (
              coalesce(
                (SELECT h.action FROM user_status_changes h
                  WHERE h.user_id = u.id AND h.changed_at < ($1::date::timestamp AT TIME ZONE $3)
                  ORDER BY h.changed_at DESC LIMIT 1),
                'reactivated'
              ) = 'deactivated'
              AND NOT EXISTS (
                SELECT 1 FROM user_status_changes h
                 WHERE h.user_id = u.id
                   AND h.changed_at >= ($1::date::timestamp AT TIME ZONE $3)
                   AND h.changed_at < (($2::date + 1)::timestamp AT TIME ZONE $3)
              )
            )
      GROUP BY u.id
      ORDER BY days_read DESC, lower(u.name)`,
    [weekStart, weekEnd, APP_TIME_ZONE],
  );
  return rows;
}
