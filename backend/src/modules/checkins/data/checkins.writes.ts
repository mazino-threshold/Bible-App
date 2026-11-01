import { db } from '../../../db/pool';

/** Does nothing if the user already checked in on that date. */
export async function insertCheckIn(userId: string, date: string): Promise<void> {
  await db.query(
    `INSERT INTO check_ins (user_id, check_in_date) VALUES ($1, $2)
     ON CONFLICT (user_id, check_in_date) DO NOTHING`,
    [userId, date],
  );
}

export async function deleteCheckIn(userId: string, date: string): Promise<void> {
  await db.query('DELETE FROM check_ins WHERE user_id = $1 AND check_in_date = $2', [userId, date]);
}
