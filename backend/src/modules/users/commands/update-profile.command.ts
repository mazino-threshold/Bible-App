import { HttpError } from '../../../shared/errors';
import { updateUser } from '../data/users.writes';
import { toUserDto } from '../users.mapper';
import type { UpdateProfileInput } from '../users.schemas';
import type { UserDto } from '../users.types';

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
  const user = await updateUser(userId, input);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  return toUserDto(user);
}
