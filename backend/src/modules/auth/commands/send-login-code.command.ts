import { sendEmail } from '../../../shared/email';
import { HttpError } from '../../../shared/errors';
import { generateLoginCode, sha256 } from '../../../shared/tokens';
import type { UserRow } from '../../users/users.types';
import { CODE_TTL_MINUTES, MAX_CODES_PER_HOUR } from '../auth.constants';
import { countRecentLoginCodes } from '../data/auth.reads';
import { deleteLoginCode, insertLoginCode, retireLoginCodes } from '../data/auth.writes';
import { loginCodeEmail } from '../templates/login-code.email';

/** Emails the user a fresh login code. Used by register and request-code. */
export async function sendLoginCode(user: UserRow): Promise<void> {
  const recent = await countRecentLoginCodes(user.id);
  if (recent.lastMinute > 0) {
    throw new HttpError(429, 'Please wait a minute before requesting another code');
  }
  if (recent.lastHour >= MAX_CODES_PER_HOUR) {
    throw new HttpError(429, 'Too many codes requested. Please try again in an hour');
  }

  const code = generateLoginCode();

  // Only the newest code works
  await retireLoginCodes(user.id);
  const codeId = await insertLoginCode(user.id, hashLoginCode(user.id, code), CODE_TTL_MINUTES);

  try {
    await sendEmail({ to: user.email, ...loginCodeEmail(user.name, code, CODE_TTL_MINUTES) });
  } catch (err) {
    console.error('Failed to send login code', err);
    // Remove the unsent code so it doesn't count against the user's limits
    await deleteLoginCode(codeId);
    throw new HttpError(502, "We couldn't send the email. Please try again shortly");
  }
}

export function hashLoginCode(userId: string, code: string): string {
  return sha256(`${userId}:${code}`);
}
