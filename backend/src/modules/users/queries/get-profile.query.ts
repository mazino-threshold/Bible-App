import { HttpError } from '../../../shared/errors';
import { findUserById } from '../data/users.reads';
import { toUserDto } from '../users.mapper';
import type { UserDto } from '../users.types';

export async function getProfile(userId: string): Promise<UserDto> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  return toUserDto(user);
}
