import { calculateStreak } from '../checkins.logic';
import { findReadingHistory } from '../data/checkins.reads';

/** The user's current streak as of the given day. */
export async function getStreak(userId: string, today: string): Promise<number> {
  return calculateStreak(await findReadingHistory(userId, today), today);
}
