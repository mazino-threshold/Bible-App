import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { restoreDeletedUser as restoreDeletedUserRow } from '../data/users.writes';
import { toAdminUserDto } from '../users.mapper';
import type { AdminUserDto } from '../users.types';
import { purgeDeletedUsers } from './purge-deleted-users.command';

/** Brings back a deleted account that hasn't been erased yet. The user then signs in with an emailed code as usual. */
export async function restoreDeletedUser(userId: string, adminId: string): Promise<AdminUserDto> {
  // Never restore an account whose holding time is over, even if no cron job has called in since
  await purgeDeletedUsers();

  const restored = await restoreDeletedUserRow(userId);
  if (restored === 'email_taken') {
    logger.warn('Restore refused: email registered again since', { targetUserId: userId });
    throw new HttpError(409, 'Someone has registered with this email since the account was deleted, so it cannot be restored');
  }
  if (!restored) {
    logger.warn('Restore refused: no deleted account with this id', { targetUserId: userId });
    throw new HttpError(404, 'Deleted account not found. It may have been erased already');
  }

  logger.info('Deleted account restored', { targetUserId: userId, adminId });
  return toAdminUserDto(restored);
}
