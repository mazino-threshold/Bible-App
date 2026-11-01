import { logger } from '../../../shared/logger';
import { addDays, todayInNigeria, weekStart as weekStartOf } from '../../../shared/time';
import { findReadingsBetween } from '../../schedule/data/schedule.reads';
import { findWeeklyReportRows } from '../data/reports.reads';
import { applyFilters, summarize } from '../reports.logic';
import { toReportUserDto } from '../reports.mapper';
import type { ReportFilters } from '../reports.schemas';
import type { WeeklyReportDto } from '../reports.types';

/** Everyone's consistency for the week starting on the given Monday. */
export async function getWeeklyReport(weekStart: string, filters: ReportFilters): Promise<WeeklyReportDto> {
  const weekEnd = addDays(weekStart, 5);

  const [rows, readings] = await Promise.all([
    findWeeklyReportRows(weekStart, weekEnd),
    findReadingsBetween(weekStart, weekEnd),
  ]);
  const daysScheduled = readings.length;
  const users = applyFilters(rows, filters);

  logger.info('Weekly report viewed', { weekStart, filters, totalUsers: rows.length, shown: users.length });

  return {
    weekStart,
    weekEnd,
    daysScheduled,
    summary: summarize(rows, daysScheduled),
    filters: { minDays: filters.minDays ?? null, maxDays: filters.maxDays ?? null },
    users: users.map(toReportUserDto),
  };
}

/** This week's report. On Sunday, that's the week that just ended. */
export async function getCurrentWeeklyReport(filters: ReportFilters): Promise<WeeklyReportDto> {
  return getWeeklyReport(weekStartOf(todayInNigeria()), filters);
}
