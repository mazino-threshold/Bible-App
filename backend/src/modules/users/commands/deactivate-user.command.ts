import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { findUserById } from '../data/users.reads';
import { deactivateUser as deactivateUserRow } from '../data/users.writes';
import { toAdminUserDto } from '../users.mapper';
import type { StatusChangeInput } from '../users.schemas';
import type { AdminUserDto } from '../users.types';

/** Deactivates a user: they are signed out, can't sign in and get no reminders. Safe to call twice. */
export async function deactivateUser(userId: string, input: StatusChangeInput, adminId: string): Promise<AdminUserDto> {
  if (userId === adminId) {
    logger.warn('Deactivate refused: admin tried to deactivate themselves');
    throw new HttpError(400, "You can't deactivate your own account");
  }

  const user = await findUserById(userId);
  if (!user) {
    logger.warn('Deactivate refused: user not found', { targetUserId: userId });
    throw new HttpError(404, 'User not found');
  }
  if (user.deactivated_at) {
    logger.info('Deactivate: user was already deactivated', { targetUserId: userId });
    return toAdminUserDto(user);
  }

  // undefined only if another admin deactivated them a moment ago
  const updated = (await deactivateUserRow(userId, input.reason || null, adminId)) ?? (await findUserById(userId))!;

  logger.info('User deactivated', { targetUserId: userId, email: updated.email, reason: input.reason });
  return toAdminUserDto(updated);
}
