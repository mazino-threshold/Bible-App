import { sendEmail } from '../../../shared/email';
import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { findUserById } from '../data/users.reads';
import { setUserRole } from '../data/users.writes';
import { roleChangedEmail } from '../templates/role-changed.email';
import { toAdminUserDto } from '../users.mapper';
import type { RoleChangeInput } from '../users.schemas';
import type { AdminUserDto } from '../users.types';

/**
 * An admin makes someone an admin, or removes their admin access. Safe to call twice.
 * Admins can't change their own role, so there is always at least one admin (the one making the change).
 * The change applies from the person's next request: the role is read fresh on every request.
 */
export async function setRole(userId: string, input: RoleChangeInput, adminId: string): Promise<AdminUserDto> {
  if (userId === adminId) {
    logger.warn('Role change refused: admin tried to change their own role');
    throw new HttpError(400, "You can't change your own admin access. Ask another admin to do it");
  }

  const user = await findUserById(userId);
  if (!user) {
    logger.warn('Role change refused: user not found', { targetUserId: userId });
    throw new HttpError(404, 'User not found');
  }
  if (user.role === input.role) {
    logger.info('Role change: user already has this role', { targetUserId: userId, role: input.role });
    return toAdminUserDto(user);
  }
  if (input.role === 'admin' && user.deactivated_at) {
    logger.warn('Role change refused: user is deactivated', { targetUserId: userId });
    throw new HttpError(400, 'Reactivate them before making them an admin');
  }

  // undefined only if they were deleted a moment ago
  const updated = await setUserRole(userId, input.role);
  if (!updated) throw new HttpError(404, 'User not found');

  logger.info(input.role === 'admin' ? 'User made admin' : 'Admin access removed', {
    targetUserId: userId,
    changedBy: adminId,
  });

  // A failed email doesn't undo the change
  try {
    await sendEmail({ to: updated.email, ...roleChangedEmail(updated.name, input.role) });
  } catch (err) {
    logger.error('Role change: email to the user failed', { targetUserId: userId, error: err });
  }

  return toAdminUserDto(updated);
}
