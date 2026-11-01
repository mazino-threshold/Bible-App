import { addDays, readingDaysOfWeek } from '../../shared/time';
import { DAY_NAMES, type DayDto, type ReadingRow, type WeekDto } from './schedule.types';

/** Builds all six days of a week, filling in whichever readings exist. */
export function toWeekDto(weekStart: string, readings: ReadingRow[]): WeekDto {
  const byDate = new Map(readings.map((r) => [r.reading_date, r]));

  const days: DayDto[] = readingDaysOfWeek(weekStart).map((date, i) => {
    const reading = byDate.get(date);
    return {
      date,
      day: DAY_NAMES[i]!,
      passage: reading?.passage ?? null,
      notes: reading?.notes ?? null,
    };
  });

  return { weekStart, weekEnd: addDays(weekStart, 5), days };
}
