import { HttpError } from '../../../shared/errors';
import { generateSessionToken, hashesMatch, sha256 } from '../../../shared/tokens';
import { findUserByEmail } from '../../users/data/users.reads';
import { toUserDto } from '../../users/users.mapper';
import type { UserDto } from '../../users/users.types';
import { MAX_CODE_ATTEMPTS } from '../auth.constants';
import type { VerifyCodeInput } from '../auth.schemas';
import { findActiveLoginCode } from '../data/auth.reads';
import { incrementLoginCodeAttempts, insertSession, markLoginCodeUsed } from '../data/auth.writes';
import { hashLoginCode } from './send-login-code.command';

/** Exchanges a valid login code for a session token. */
export async function verifyCode(input: VerifyCodeInput): Promise<{ token: string; user: UserDto }> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new HttpError(400, 'Incorrect code');
  }

  const loginCode = await findActiveLoginCode(user.id);
  if (!loginCode || loginCode.expired) {
    throw new HttpError(400, 'This code has expired. Please request a new one');
  }
  if (loginCode.attempts >= MAX_CODE_ATTEMPTS) {
    throw new HttpError(400, 'Too many wrong attempts. Please request a new code');
  }
  if (!hashesMatch(loginCode.code_hash, hashLoginCode(user.id, input.code))) {
    await incrementLoginCodeAttempts(loginCode.id);
    throw new HttpError(400, 'Incorrect code');
  }

  if (!(await markLoginCodeUsed(loginCode.id))) {
    throw new HttpError(400, 'This code has already been used. Please request a new one');
  }

  const token = generateSessionToken();
  await insertSession(user.id, sha256(token));

  return { token, user: toUserDto(user) };
}
