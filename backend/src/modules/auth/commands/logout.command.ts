import { logger } from '../../../shared/logger';
import { deletePushToken } from '../../push/data/push.writes';
import type { LogoutInput } from '../auth.schemas';
import { deleteSession } from '../data/auth.writes';

/** Signs out one device and stops its reminders. */
export async function logout(sessionId: string, userId: string, input: LogoutInput): Promise<void> {
  await deleteSession(sessionId);
  const removedPushToken = input.pushToken ? await deletePushToken(input.pushToken, userId) : false;
  logger.info('User signed out', { sessionId, removedPushToken });
}
