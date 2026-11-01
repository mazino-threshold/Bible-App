import { logger } from '../../../shared/logger';
import { todayInNigeria } from '../../../shared/time';
import type { TodayCheckInDto } from '../checkins.types';
import { deleteCheckIn } from '../data/checkins.writes';
import { getStreak } from '../queries/get-streak.query';
import { ensureReadingToday } from './ensure-reading-today';

/** Unticks today's reading. Only today can be undone; earlier days are locked. Safe to call twice. */
export async function undoCheckInToday(userId: string): Promise<TodayCheckInDto> {
  const today = todayInNigeria();
  await ensureReadingToday(today);

  const removed = await deleteCheckIn(userId, today);
  const streak = await getStreak(userId, today);

  logger.info(removed ? 'Check-in undone' : 'Undo repeated (was not checked in)', { date: today, streak });
  return { date: today, checkedIn: false, streak };
}
