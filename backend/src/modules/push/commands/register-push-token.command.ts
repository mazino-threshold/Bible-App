import { logger } from '../../../shared/logger';
import { upsertPushToken } from '../data/push.writes';
import type { PushTokenInput } from '../push.schemas';

/** Registers this device for reminders. Safe to call on every app start. */
export async function registerPushToken(userId: string, input: PushTokenInput): Promise<void> {
  await upsertPushToken(input.token, userId);
  logger.info('Push token registered');
}
