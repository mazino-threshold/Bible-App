import { HttpError } from '../../../shared/errors';
import { insertUser } from '../../users/data/users.writes';
import type { RegisterInput } from '../auth.schemas';
import { sendLoginCode } from './send-login-code.command';

/** Creates an account and emails a login code. */
export async function register(input: RegisterInput): Promise<void> {
  const user = await insertUser(input);
  if (!user) {
    throw new HttpError(409, 'This email is already registered. Please sign in instead');
  }
  await sendLoginCode(user);
}
