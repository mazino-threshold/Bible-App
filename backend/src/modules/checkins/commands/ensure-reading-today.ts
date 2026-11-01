import { HttpError } from '../../../shared/errors';
import { isReadingDay } from '../../../shared/time';
import { findReadingsBetween } from '../../schedule/data/schedule.reads';

/** Throws unless there is a reading scheduled for the given day. */
export async function ensureReadingToday(today: string): Promise<void> {
  if (!isReadingDay(today)) {
    throw new HttpError(400, "There's no reading on Sundays");
  }
  const readings = await findReadingsBetween(today, today);
  if (readings.length === 0) {
    throw new HttpError(400, 'No reading has been scheduled for today');
  }
}
