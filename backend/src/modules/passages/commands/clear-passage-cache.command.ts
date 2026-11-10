import { logger } from '../../../shared/logger';
import { todayInNigeria } from '../../../shared/time';
import { deleteCachedPassagesBefore } from '../data/passages.writes';

/**
 * Empties the Bible text cache of every day before today. Run by the cron job on Sunday, when that is the whole week.
 * Safe to call any day or more than once.
 */
export async function clearPassageCache(): Promise<{ date: string; daysCleared: number }> {
  const today = todayInNigeria();
  const daysCleared = await deleteCachedPassagesBefore(today);
  logger.info('Passage cache cleared', { date: today, daysCleared });
  return { date: today, daysCleared };
}
