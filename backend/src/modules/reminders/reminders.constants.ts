import type { ReminderFrequency } from '../users/users.types';

/** Reminder times, as hours in Nigeria time. */
export const REMINDER_HOURS = [6, 9, 12, 15, 18, 21] as const;
export type ReminderHour = (typeof REMINDER_HOURS)[number];

/** Which reminder times each frequency setting gets. */
export const FREQUENCY_HOURS: Record<ReminderFrequency, readonly ReminderHour[]> = {
  high: REMINDER_HOURS,
  mid: [6, 12, 18, 21],
  low: [6, 21],
  off: [],
};

/** How far from the exact hour a cron call still counts, e.g. 5:52 or 6:10 both count as the 6 AM slot. */
export const SLOT_TOLERANCE_MINUTES = 15;
