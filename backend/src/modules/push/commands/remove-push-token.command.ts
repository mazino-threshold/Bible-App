import { logger } from '../../../shared/logger';
import { deletePushToken } from '../data/push.writes';
import type { PushTokenInput } from '../push.schemas';

/** Stops reminders to this device. */
export async function removePushToken(userId: string, input: PushTokenInput): Promise<void> {
  const removed = await deletePushToken(input.token, userId);
  logger.info(removed ? 'Push token removed' : 'Push token remove: was not registered');
}
