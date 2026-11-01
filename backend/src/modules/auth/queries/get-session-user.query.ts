import { sha256 } from '../../../shared/tokens';
import type { UserRow } from '../../users/users.types';
import { SESSION_IDLE_DAYS } from '../auth.constants';
import { findSessionUser } from '../data/auth.reads';

/** Finds who a session token belongs to. Undefined if the token is unknown or has gone idle. */
export async function getSessionUser(token: string): Promise<{ sessionId: string; user: UserRow } | undefined> {
  return findSessionUser(sha256(token), SESSION_IDLE_DAYS);
}
