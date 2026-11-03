import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import type { UserRow } from '../../users/users.types';

/** Deactivated users can't sign in or use the app until an admin reactivates them. */
export function ensureActive(user: UserRow): void {
  if (user.deactivated_at) {
    logger.warn('Refused: account is deactivated', { email: user.email });
    throw new HttpError(403, 'Your account has been deactivated. Please contact an admin to reactivate it');
  }
}
