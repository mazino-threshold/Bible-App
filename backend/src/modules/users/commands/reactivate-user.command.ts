import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { findUserById } from '../data/users.reads';
import { reactivateUser as reactivateUserRow } from '../data/users.writes';
import { toAdminUserDto } from '../users.mapper';
import type { StatusChangeInput } from '../users.schemas';
import type { AdminUserDto } from '../users.types';

/** Lets a deactivated user sign in and get reminders again. Safe to call twice. */
export async function reactivateUser(userId: string, input: StatusChangeInput, adminId: string): Promise<AdminUserDto> {
  const user = await findUserById(userId);
  if (!user) {
    logger.warn('Reactivate refused: user not found', { targetUserId: userId });
    throw new HttpError(404, 'User not found');
  }
  if (!user.deactivated_at) {
    logger.info('Reactivate: user was already active', { targetUserId: userId });
    return toAdminUserDto(user);
  }

  // undefined only if another admin reactivated them a moment ago
  const updated = (await reactivateUserRow(userId, input.reason || null, adminId)) ?? (await findUserById(userId))!;

  logger.info('User reactivated', { targetUserId: userId, email: updated.email, reason: input.reason });
  return toAdminUserDto(updated);
}
