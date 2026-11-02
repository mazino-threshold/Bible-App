// Pure rules for reminders: no database, no HTTP.
import type { ReminderFrequency } from '../users/users.types';
import { FREQUENCY_HOURS, REMINDER_HOURS, SLOT_TOLERANCE_MINUTES, type ReminderHour } from './reminders.constants';

/** The reminder slot for a time of day (minutes since midnight), or null if it isn't near one. */
export function slotForTime(minutesIntoDay: number): ReminderHour | null {
  return REMINDER_HOURS.find((hour) => Math.abs(minutesIntoDay - hour * 60) <= SLOT_TOLERANCE_MINUTES) ?? null;
}

/** Frequency settings that get a reminder at this hour, e.g. 9 -> ['high']. */
export function frequenciesForHour(hour: ReminderHour): ReminderFrequency[] {
  return (Object.keys(FREQUENCY_HOURS) as ReminderFrequency[]).filter((f) => FREQUENCY_HOURS[f].includes(hour));
}

export function reminderMessage(hour: ReminderHour, passage: string): { title: string; body: string } {
  if (hour === 6) {
    return { title: "Good morning! Today's reading", body: passage };
  }
  if (hour === 21) {
    return { title: "Last call for today's reading", body: `${passage}. Tick it off before midnight.` };
  }
  return { title: "Bible reading reminder", body: `${passage}. Tick it off once you've read.` };
}
