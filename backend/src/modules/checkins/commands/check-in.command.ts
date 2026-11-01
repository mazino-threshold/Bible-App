import { todayInNigeria } from '../../../shared/time';
import type { TodayCheckInDto } from '../checkins.types';
import { insertCheckIn } from '../data/checkins.writes';
import { getStreak } from '../queries/get-streak.query';
import { ensureReadingToday } from './ensure-reading-today';

/** Ticks today's reading. "Today" is always decided by the server in Nigeria time. Safe to call twice. */
export async function checkInToday(userId: string): Promise<TodayCheckInDto> {
  const today = todayInNigeria();
  await ensureReadingToday(today);

  await insertCheckIn(userId, today);

  return { date: today, checkedIn: true, streak: await getStreak(userId, today) };
}
