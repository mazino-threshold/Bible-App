import { HttpError } from '../../../shared/errors';
import { addDays, readingDaysOfWeek, todayInNigeria } from '../../../shared/time';
import { findReadingsBetween } from '../data/schedule.reads';
import { upsertReadings } from '../data/schedule.writes';
import { toWeekDto } from '../schedule.mapper';
import type { SaveWeekInput } from '../schedule.schemas';
import { DAY_NAMES, type WeekDto } from '../schedule.types';

/** Creates or replaces the readings for a whole week (Monday to Saturday). */
export async function saveWeek(weekStart: string, input: SaveWeekInput, adminId: string): Promise<WeekDto> {
  const weekEnd = addDays(weekStart, 5);
  if (weekEnd < todayInNigeria()) {
    throw new HttpError(400, 'This week has already ended and can no longer be changed');
  }

  const readings = readingDaysOfWeek(weekStart).map((date, i) => {
    const day = input[DAY_NAMES[i]!];
    return { date, passage: day.passage, notes: day.notes || null };
  });

  await upsertReadings(readings, adminId);

  return toWeekDto(weekStart, await findReadingsBetween(weekStart, weekEnd));
}
