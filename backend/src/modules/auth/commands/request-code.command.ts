import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { findUserByEmail } from '../../users/data/users.reads';
import type { RequestCodeInput } from '../auth.schemas';
import { sendLoginCode } from './send-login-code.command';

/** Emails a login code to an existing user. */
export async function requestCode(input: RequestCodeInput): Promise<void> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    logger.warn('Login code refused: no account with this email', { email: input.email });
    throw new HttpError(404, 'No account found with this email. Please register first');
  }
  await sendLoginCode(user);
}
