// Pure rules for reminders: no database, no HTTP.
import { REMINDER_HOURS, SLOT_TOLERANCE_MINUTES, type ReminderHour } from './reminders.constants';

/** The reminder slot for a time of day (minutes since midnight), or null if it isn't near one. */
export function slotForTime(minutesIntoDay: number): ReminderHour | null {
  return REMINDER_HOURS.find((hour) => Math.abs(minutesIntoDay - hour * 60) <= SLOT_TOLERANCE_MINUTES) ?? null;
}

export function reminderMessage(hour: ReminderHour, passage: string): { title: string; body: string } {
  if (hour === 6) {
    return { title: "Good morning! Today's reading", body: passage };
  }
  return { title: "Last call for today's reading", body: `${passage}. Tick it off before midnight.` };
}
