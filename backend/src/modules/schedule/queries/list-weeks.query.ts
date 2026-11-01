import { logger } from '../../../shared/logger';
import { addDays } from '../../../shared/time';
import { findScheduledWeeks } from '../data/schedule.reads';
import type { WeekSummaryDto } from '../schedule.types';

/** Weeks the admin has scheduled, newest first, with how many of the six days are filled in. */
export async function listWeeks(): Promise<WeekSummaryDto[]> {
  const weeks = await findScheduledWeeks();
  logger.debug('Scheduled weeks listed', { count: weeks.length });
  return weeks.map((w) => ({
    weekStart: w.week_start,
    weekEnd: addDays(w.week_start, 5),
    daysScheduled: w.days_scheduled,
  }));
}
