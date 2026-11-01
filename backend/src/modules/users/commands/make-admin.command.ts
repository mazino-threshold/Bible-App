import { HttpError } from '../../../shared/errors';
import { setUserRoleByEmail } from '../data/users.writes';
import { toUserDto } from '../users.mapper';
import type { UserDto } from '../users.types';

export async function makeAdmin(email: string): Promise<UserDto> {
  const user = await setUserRoleByEmail(email.trim().toLowerCase(), 'admin');
  if (!user) {
    throw new HttpError(404, `No user with email ${email}. They need to register in the app first`);
  }
  return toUserDto(user);
}
