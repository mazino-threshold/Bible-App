import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { countOtherActiveAdmins, findUserById } from '../data/users.reads';
import { archiveAndDeleteUser } from '../data/users.writes';
import { DELETED_ACCOUNT_RETENTION_DAYS } from '../users.constants';
import type { StatusChangeInput } from '../users.schemas';
import type { MyDeletionDto } from '../users.types';
import { notifyAccountDeleted } from './notify-account-deleted';

/**
 * A user deletes their own account. They are signed out everywhere at once, and the account is held for
 * DELETED_ACCOUNT_RETENTION_DAYS (an admin can restore it on request), then erased. They and the admins are told.
 */
export async function deleteMyAccount(userId: string, input: StatusChangeInput): Promise<MyDeletionDto> {
  const user = await findUserById(userId);
  if (user?.role === 'admin' && (await countOtherActiveAdmins(userId)) === 0) {
    logger.warn('Delete my account refused: last admin', { userId });
    throw new HttpError(400, "You're the only admin. Make someone else an admin before deleting your account");
  }

  const deleted = await archiveAndDeleteUser(userId, {
    requestedBy: 'user',
    adminId: null,
    reason: input.reason || null,
    retentionDays: DELETED_ACCOUNT_RETENTION_DAYS,
  });
  if (!deleted) {
    // Only if the same request was sent twice at once and the other one got there first
    throw new HttpError(404, 'Account not found');
  }

  logger.info('User deleted their own account', { targetUserId: userId, purgeAfter: deleted.purge_after });
  await notifyAccountDeleted(deleted);
  return { deletedAt: deleted.deleted_at, purgeAfter: deleted.purge_after };
}
