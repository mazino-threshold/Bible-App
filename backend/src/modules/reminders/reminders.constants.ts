/**
 * Reminder times, as hours in Nigeria time: a morning reminder and a last call. The same for everyone with
 * reminders on. The cron job only needs to call at these times.
 */
export const REMINDER_HOURS = [6, 21] as const;
export type ReminderHour = (typeof REMINDER_HOURS)[number];

/** How far from the exact hour a cron call still counts, e.g. 5:52 or 6:10 both count as the 6 AM slot. */
export const SLOT_TOLERANCE_MINUTES = 15;
