import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { updateUser } from '../data/users.writes';
import { toUserDto } from '../users.mapper';
import type { UpdateProfileInput } from '../users.schemas';
import type { UserDto } from '../users.types';

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
  const user = await updateUser(userId, input);
  if (!user) {
    logger.warn('Profile update failed: user not found');
    throw new HttpError(404, 'User not found');
  }

  // Field names only: the values (name, phone) are personal details
  logger.info('Profile updated', { fields: Object.keys(input), reminderFrequency: input.reminderFrequency });
  return toUserDto(user);
}
