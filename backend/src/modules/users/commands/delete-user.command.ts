import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { archiveAndDeleteUser } from '../data/users.writes';
import { DELETED_ACCOUNT_RETENTION_DAYS } from '../users.constants';
import { toDeletedUserDto } from '../users.mapper';
import type { StatusChangeInput } from '../users.schemas';
import type { DeletedUserDto } from '../users.types';
import { notifyAccountDeleted } from './notify-account-deleted';

/**
 * An admin deletes someone's account (e.g. they asked by message instead of in the app). The account is held for
 * DELETED_ACCOUNT_RETENTION_DAYS so it can be restored, then erased. The user is emailed.
 */
export async function deleteUser(userId: string, input: StatusChangeInput, adminId: string): Promise<DeletedUserDto> {
  if (userId === adminId) {
    logger.warn('Delete refused: admin tried to delete themselves here');
    throw new HttpError(400, "You can't delete your own account here. Use Delete my account in your profile");
  }

  const deleted = await archiveAndDeleteUser(userId, {
    requestedBy: 'admin',
    adminId,
    reason: input.reason || null,
    retentionDays: DELETED_ACCOUNT_RETENTION_DAYS,
  });
  if (!deleted) {
    // Never existed, or was deleted a moment ago
    logger.warn('Delete refused: user not found', { targetUserId: userId });
    throw new HttpError(404, 'User not found');
  }

  // Ids only: logs outlive the holding period, so no personal details go in them
  logger.info('User deleted by admin', { targetUserId: userId, purgeAfter: deleted.purge_after });
  await notifyAccountDeleted(deleted);
  return toDeletedUserDto(deleted);
}
