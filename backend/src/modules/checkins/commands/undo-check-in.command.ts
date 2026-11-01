import { todayInNigeria } from '../../../shared/time';
import type { TodayCheckInDto } from '../checkins.types';
import { deleteCheckIn } from '../data/checkins.writes';
import { getStreak } from '../queries/get-streak.query';
import { ensureReadingToday } from './ensure-reading-today';

/** Unticks today's reading. Only today can be undone; earlier days are locked. Safe to call twice. */
export async function undoCheckInToday(userId: string): Promise<TodayCheckInDto> {
  const today = todayInNigeria();
  await ensureReadingToday(today);

  await deleteCheckIn(userId, today);

  return { date: today, checkedIn: false, streak: await getStreak(userId, today) };
}
