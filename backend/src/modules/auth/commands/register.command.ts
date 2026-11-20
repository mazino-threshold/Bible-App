import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { checkEmailDomain } from '../../email-domains/queries/check-email-domain.query';
import { insertUser } from '../../users/data/users.writes';
import type { RegisterInput } from '../auth.schemas';
import { sendLoginCode } from './send-login-code.command';

/** Creates an account and emails a login code. Refused for disposable or blocked email domains. */
export async function register(input: RegisterInput): Promise<void> {
  const domainCheck = await checkEmailDomain(input.email);
  if (domainCheck.blocked) {
    // The domain only, not the address
    logger.warn('Register refused: email domain not allowed', {
      domain: domainCheck.domain,
      source: domainCheck.source,
      matched: domainCheck.matched,
    });
    const message = "Sign-ups from this email provider aren't allowed. Please use a different email address";
    throw new HttpError(400, message, [{ field: 'email', message }]);
  }

  const user = await insertUser(input);
  if (!user) {
    logger.warn('Register refused: email already registered', { email: input.email });
    throw new HttpError(409, 'This email is already registered. Please sign in instead');
  }

  logger.info('User registered', { newUserId: user.id, email: user.email });
  await sendLoginCode(user);
}
