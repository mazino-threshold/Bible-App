// Pure rules for check-ins: no database, no HTTP. Dates are 'YYYY-MM-DD' strings, which compare correctly as text.
import type { DayStatus, ReadingHistoryRow } from './checkins.types';

export function dayStatus(date: string, today: string, hasReading: boolean, checkedIn: boolean): DayStatus {
  if (checkedIn) return 'read';
  if (date > today) return 'upcoming';
  if (!hasReading) return 'no_reading';
  return date === today ? 'pending' : 'missed';
}

/** Only today's box can be changed, and only if there is a reading today. */
export function canToggle(date: string, today: string, hasReading: boolean): boolean {
  return date === today && hasReading;
}

/**
 * Consecutive scheduled reading days the user checked in on, counting back from today.
 * - Sundays and days with no reading scheduled are skipped, so they never break a streak.
 * - Today not ticked yet doesn't break it either: the day isn't over.
 *
 * @param history scheduled reading days up to and including today, newest first
 */
export function calculateStreak(history: ReadingHistoryRow[], today: string): number {
  let streak = 0;
  for (const day of history) {
    if (day.checked_in) {
      streak++;
    } else if (day.reading_date !== today) {
      break;
    }
  }
  return streak;
}
