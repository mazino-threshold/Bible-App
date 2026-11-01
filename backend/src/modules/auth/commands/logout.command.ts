import { logger } from '../../../shared/logger';
import type { LogoutInput } from '../auth.schemas';
import { deletePushToken, deleteSession } from '../data/auth.writes';

/** Signs out one device and stops its reminders. */
export async function logout(sessionId: string, userId: string, input: LogoutInput): Promise<void> {
  await deleteSession(sessionId);
  if (input.pushToken) {
    await deletePushToken(input.pushToken, userId);
  }
  logger.info('User signed out', { sessionId, removedPushToken: Boolean(input.pushToken) });
}
