// Pure rules for the weekly report: no database, no HTTP.
import type { ReportFilters } from './reports.schemas';
import type { WeeklyReportDto, WeeklyReportRow } from './reports.types';

export function summarize(rows: WeeklyReportRow[], daysScheduled: number): WeeklyReportDto['summary'] {
  const totalDaysRead = rows.reduce((sum, r) => sum + r.days_read, 0);
  return {
    totalUsers: rows.length,
    // Nobody "read every day" in a week with nothing scheduled
    readEveryDay: daysScheduled === 0 ? 0 : rows.filter((r) => r.days_read >= daysScheduled).length,
    averageDaysRead: rows.length === 0 ? 0 : Math.round((totalDaysRead / rows.length) * 10) / 10,
  };
}

export function applyFilters(rows: WeeklyReportRow[], filters: ReportFilters): WeeklyReportRow[] {
  return rows.filter(
    (r) =>
      (filters.minDays === undefined || r.days_read >= filters.minDays) &&
      (filters.maxDays === undefined || r.days_read <= filters.maxDays),
  );
}
