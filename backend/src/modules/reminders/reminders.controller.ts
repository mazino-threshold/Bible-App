import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { HttpError } from '../../shared/errors';
import { purgeDeletedUsers } from '../users/commands/purge-deleted-users.command';
import { sendReminders } from './commands/send-reminders.command';
import type { ReminderHour } from './reminders.constants';
import { runRemindersSchema } from './reminders.schemas';

/** POST /internal/reminders/run */
export async function runRemindersHandler(req: Request, res: Response) {
  const { hour } = runRemindersSchema.parse(req.body ?? {});
  if (hour !== undefined && env.NODE_ENV === 'production') {
    throw new HttpError(400, 'Choosing the hour is only allowed outside production');
  }
  const run = await sendReminders(hour as ReminderHour | undefined);
  // Rides along with this cron job so deleted accounts are erased on time without a cron job of their own
  await purgeDeletedUsers();
  res.json({ run });
}
