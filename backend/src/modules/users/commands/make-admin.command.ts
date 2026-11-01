import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { setUserRoleByEmail } from '../data/users.writes';
import { toUserDto } from '../users.mapper';
import type { UserDto } from '../users.types';

export async function makeAdmin(email: string): Promise<UserDto> {
  const user = await setUserRoleByEmail(email.trim().toLowerCase(), 'admin');
  if (!user) {
    logger.warn('Make admin failed: no user with this email', { email });
    throw new HttpError(404, `No user with email ${email}. They need to register in the app first`);
  }

  logger.info('User made admin', { adminUserId: user.id, email: user.email });
  return toUserDto(user);
}
