import { db } from '../../../db/pool';

/** Saves a device's token for a user. If the device was used by someone else before, it moves to this user. */
export async function upsertPushToken(token: string, userId: string): Promise<void> {
  await db.query(
    `INSERT INTO push_tokens (token, user_id) VALUES ($1, $2)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, created_at = now()`,
    [token, userId],
  );
}

/** Removes one of the user's devices. Returns false if it wasn't registered to them. */
export async function deletePushToken(token: string, userId: string): Promise<boolean> {
  const result = await db.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [token, userId]);
  return result.rowCount === 1;
}

/** Removes tokens Expo reported as dead (e.g. the app was uninstalled). */
export async function deletePushTokens(tokens: string[]): Promise<number> {
  const result = await db.query('DELETE FROM push_tokens WHERE token = ANY($1)', [tokens]);
  return result.rowCount ?? 0;
}
