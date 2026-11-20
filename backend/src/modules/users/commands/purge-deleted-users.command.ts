import { logger } from '../../../shared/logger';
import { purgeExpiredDeletedUsers } from '../data/users.writes';

/**
 * Erases deleted accounts whose holding time is over. It has no cron job of its own: it runs whenever the existing
 * cron jobs call in (reminders, 6 AM and 9 PM Mon-Sat; passage cache, Sundays) and when an admin lists or
 * restores deleted accounts. Never throws, so it can't break the job it runs alongside.
 */
export async function purgeDeletedUsers(): Promise<number> {
  try {
    const erased = await purgeExpiredDeletedUsers();
    if (erased > 0) logger.info('Deleted accounts erased for good', { erased });
    return erased;
  } catch (err) {
    logger.error('Erasing deleted accounts failed; will retry on the next run', { error: err });
    return 0;
  }
}
