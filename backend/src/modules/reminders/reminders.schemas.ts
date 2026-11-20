import { z } from 'zod';
import { REMINDER_HOURS } from './reminders.constants';

/** Body of POST /internal/reminders/run. Empty in normal use: the slot comes from the clock. */
export const runRemindersSchema = z.object({
  // Testing only (refused in production): send this slot now, e.g. { "hour": 6 }
  hour: z
    .number()
    .int()
    .refine((h) => (REMINDER_HOURS as readonly number[]).includes(h), 'hour must be 6 or 21')
    .optional(),
});
