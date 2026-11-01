// All "what day is it" logic lives here. The app runs on Nigeria time (WAT, UTC+1, no daylight saving),
// no matter where the server or the user's phone is.

export const APP_TIME_ZONE = 'Africa/Lagos';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const minuteFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const realClock = () => new Date();
let clock = realClock;

/**
 * Tests only: makes the whole app believe it is a different moment, e.g.
 * setClockForTests(() => new Date('2099-01-07T09:00:00+01:00')). Call with no argument to restore the real clock.
 */
export function setClockForTests(fn?: () => Date): void {
  clock = fn ?? realClock;
}

/** Today's date in Nigeria as 'YYYY-MM-DD'. */
export function todayInNigeria(now: Date = clock()): string {
  return dateFormatter.format(now);
}

/** Minutes since midnight in Nigeria, e.g. 6:05 AM -> 365. */
export function minutesIntoDayInNigeria(now: Date = clock()): number {
  const [hours, minutes] = minuteFormatter.format(now).split(':').map(Number);
  return hours! * 60 + minutes!;
}

/** Day of week for a 'YYYY-MM-DD' date: 1 = Monday ... 7 = Sunday. */
export function isoDayOfWeek(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Adds days to a 'YYYY-MM-DD' date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday that starts the week containing the given date. */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoDayOfWeek(date));
}

/** Monday to Saturday reading days for the week starting on the given Monday. */
export function readingDaysOfWeek(monday: string): string[] {
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
}

/** True for Monday to Saturday. */
export function isReadingDay(date: string): boolean {
  return isoDayOfWeek(date) <= 6;
}
