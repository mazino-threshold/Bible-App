import { db } from '../../../db/pool';
import type { ReminderRecipientRow } from '../reminders.types';

/** Devices of active users with reminders on who haven't checked in on the given date. */
export async function findReminderRecipients(date: string): Promise<ReminderRecipientRow[]> {
  const { rows } = await db.query<ReminderRecipientRow>(
    `SELECT pt.token, pt.user_id
       FROM push_tokens pt
       JOIN users u ON u.id = pt.user_id
      WHERE u.reminders_enabled
        AND u.deactivated_at IS NULL
        AND NOT EXISTS (
              SELECT 1 FROM check_ins c WHERE c.user_id = u.id AND c.check_in_date = $1
            )`,
    [date],
  );
  return rows;
}
