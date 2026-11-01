import { addDays, todayInNigeria, weekStart as weekStartOf } from '../../../shared/time';
import { getWeek } from '../../schedule/queries/get-week.query';
import { canToggle, dayStatus } from '../checkins.logic';
import type { MyWeekDto } from '../checkins.types';
import { findCheckInDates } from '../data/checkins.reads';
import { getStreak } from './get-streak.query';

/** A week's readings with this user's status for each day. Defaults to the current week. */
export async function getMyWeek(userId: string, weekStart?: string): Promise<MyWeekDto> {
  const today = todayInNigeria();
  const start = weekStart ?? weekStartOf(today);

  const [week, checkIns, streak] = await Promise.all([
    getWeek(start),
    findCheckInDates(userId, start, addDays(start, 5)),
    getStreak(userId, today),
  ]);
  const checked = new Set(checkIns);

  const days = week.days.map((day) => {
    const hasReading = day.passage !== null;
    return {
      ...day,
      status: dayStatus(day.date, today, hasReading, checked.has(day.date)),
      canToggle: canToggle(day.date, today, hasReading),
    };
  });

  return {
    today,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    daysRead: checked.size,
    streak,
    days,
  };
}
