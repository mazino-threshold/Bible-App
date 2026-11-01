import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { findUserById } from '../data/users.reads';
import { toUserDto } from '../users.mapper';
import type { UserDto } from '../users.types';

export async function getProfile(userId: string): Promise<UserDto> {
  const user = await findUserById(userId);
  if (!user) {
    logger.warn('Get profile failed: user not found');
    throw new HttpError(404, 'User not found');
  }
  logger.debug('Profile loaded');
  return toUserDto(user);
}
