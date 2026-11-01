import { logger } from '../../../shared/logger';
import { addDays, todayInNigeria, weekStart as weekStartOf } from '../../../shared/time';
import { findReadingsBetween } from '../data/schedule.reads';
import { toWeekDto } from '../schedule.mapper';
import type { WeekDto } from '../schedule.types';

/** The six readings of the week starting on the given Monday. */
export async function getWeek(weekStart: string): Promise<WeekDto> {
  const readings = await findReadingsBetween(weekStart, addDays(weekStart, 5));
  logger.debug('Week loaded', { weekStart, daysScheduled: readings.length });
  return toWeekDto(weekStart, readings);
}

/** This week's readings. On Sunday, that's the week that just ended. */
export async function getCurrentWeek(): Promise<WeekDto> {
  return getWeek(weekStartOf(todayInNigeria()));
}
