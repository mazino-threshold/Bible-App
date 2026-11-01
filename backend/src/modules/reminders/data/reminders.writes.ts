import { db } from '../../../db/pool';

/** Marks a slot as started. Returns false if it was already started, so it must not be sent again. */
export async function claimReminderRun(date: string, hour: number): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO reminder_runs (reminder_date, hour) VALUES ($1, $2)
     ON CONFLICT (reminder_date, hour) DO NOTHING`,
    [date, hour],
  );
  return result.rowCount === 1;
}

export async function finishReminderRun(
  date: string,
  hour: number,
  stats: { users: number; devices: number; sent: number; failed: number },
): Promise<void> {
  await db.query(
    `UPDATE reminder_runs
        SET finished_at = now(), users = $3, devices = $4, sent = $5, failed = $6
      WHERE reminder_date = $1 AND hour = $2`,
    [date, hour, stats.users, stats.devices, stats.sent, stats.failed],
  );
}
