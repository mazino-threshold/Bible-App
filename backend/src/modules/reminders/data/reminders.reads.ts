import { db } from '../../../db/pool';
import type { ReminderFrequency } from '../../users/users.types';
import type { ReminderRecipientRow } from '../reminders.types';

/** Devices of active users with one of the given frequencies who haven't checked in on the given date. */
export async function findReminderRecipients(
  date: string,
  frequencies: ReminderFrequency[],
): Promise<ReminderRecipientRow[]> {
  const { rows } = await db.query<ReminderRecipientRow>(
    `SELECT pt.token, pt.user_id
       FROM push_tokens pt
       JOIN users u ON u.id = pt.user_id
      WHERE u.reminder_frequency = ANY($2::text[])
        AND u.deactivated_at IS NULL
        AND NOT EXISTS (
              SELECT 1 FROM check_ins c WHERE c.user_id = u.id AND c.check_in_date = $1
            )`,
    [date, frequencies],
  );
  return rows;
}
