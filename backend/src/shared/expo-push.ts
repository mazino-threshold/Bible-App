// Client for Expo's push service: https://docs.expo.dev/push-notifications/sending-notifications/
import { env } from '../config/env';
import { logger } from './logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo accepts at most 100 messages per request
const BATCH_SIZE = 100;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  token: string;
  ok: boolean;
  /** Expo's error code, e.g. 'DeviceNotRegistered' when the app was uninstalled. */
  error?: string;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/** Sends messages in batches. Never throws: a failed batch is reported as failed results. */
export async function sendPushMessages(messages: PushMessage[]): Promise<PushResult[]> {
  const results: PushResult[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    results.push(...(await sendBatch(messages.slice(i, i + BATCH_SIZE))));
  }
  return results;
}

async function sendBatch(batch: PushMessage[]): Promise<PushResult[]> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(batch.map((m) => ({ ...m, sound: 'default', priority: 'high' }))),
    });
    if (!res.ok) {
      throw new Error(`Expo push error ${res.status}: ${await res.text()}`);
    }

    // Tickets come back in the same order as the messages
    const { data: tickets } = (await res.json()) as { data: ExpoTicket[] };
    return batch.map((message, i) => {
      const ticket = tickets[i];
      if (ticket?.status === 'ok') return { token: message.to, ok: true };
      return { token: message.to, ok: false, error: ticket?.details?.error ?? ticket?.message ?? 'Unknown' };
    });
  } catch (err) {
    logger.error('Push batch failed', { size: batch.length, error: err });
    return batch.map((m) => ({ token: m.to, ok: false, error: 'RequestFailed' }));
  }
}
