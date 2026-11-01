import { sendPushMessages } from '../../../shared/expo-push';
import { logger } from '../../../shared/logger';
import { isReadingDay, minutesIntoDayInNigeria, todayInNigeria } from '../../../shared/time';
import { deletePushTokens } from '../../push/data/push.writes';
import { findReadingsBetween } from '../../schedule/data/schedule.reads';
import { findReminderRecipients } from '../data/reminders.reads';
import { claimReminderRun, finishReminderRun } from '../data/reminders.writes';
import type { ReminderHour } from '../reminders.constants';
import { frequenciesForHour, reminderMessage, slotForTime } from '../reminders.logic';
import type { ReminderRunDto } from '../reminders.types';

/**
 * Sends the push reminders for the current slot (6, 9, 12, 15, 18 or 21 Nigeria time) to everyone
 * whose frequency includes it and who hasn't checked in today. Called by the cron job.
 * Each slot is sent at most once per day, however many times this is called.
 *
 * @param hourOverride for testing outside production: run this slot instead of working it out from the clock
 */
export async function sendReminders(hourOverride?: ReminderHour): Promise<ReminderRunDto> {
  const date = todayInNigeria();
  const hour = hourOverride ?? slotForTime(minutesIntoDayInNigeria());
  const skip = (reason: string): ReminderRunDto => {
    logger.info('Reminders skipped', { date, hour, reason });
    return { date, hour, status: 'skipped', reason, users: 0, devices: 0, sent: 0, failed: 0, invalidTokensRemoved: 0 };
  };

  if (hour === null) return skip('Not a reminder time');
  if (!isReadingDay(date)) return skip('No reminders on Sunday');

  const reading = (await findReadingsBetween(date, date))[0];
  if (!reading) {
    logger.warn('Reminders: no reading scheduled for today. Has the admin set up this week?', { date, hour });
    return skip('No reading scheduled for today');
  }

  if (!(await claimReminderRun(date, hour))) return skip('Already sent for this time today');

  const recipients = await findReminderRecipients(date, frequenciesForHour(hour));
  const { title, body } = reminderMessage(hour, reading.passage);

  const results = await sendPushMessages(
    recipients.map((r) => ({ to: r.token, title, body, data: { type: 'reading_reminder', date } })),
  );

  // Expo says these devices no longer have the app, so stop sending to them
  const deadTokens = results.filter((r) => r.error === 'DeviceNotRegistered').map((r) => r.token);
  const invalidTokensRemoved = deadTokens.length > 0 ? await deletePushTokens(deadTokens) : 0;

  const stats = {
    users: new Set(recipients.map((r) => r.user_id)).size,
    devices: recipients.length,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };
  await finishReminderRun(date, hour, stats);

  const errors = [...new Set(results.filter((r) => !r.ok).map((r) => r.error))];
  logger.log(stats.failed > 0 ? 'warn' : 'info', 'Reminders sent', { date, hour, ...stats, invalidTokensRemoved, errors });

  return { date, hour, status: 'sent', ...stats, invalidTokensRemoved };
}
