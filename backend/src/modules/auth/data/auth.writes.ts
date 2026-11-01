import { db } from '../../../db/pool';

/** Marks all of the user's unused codes as used, so only a newer code will work. */
export async function retireLoginCodes(userId: string): Promise<void> {
  await db.query('UPDATE login_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [userId]);
}

/** Returns the new code's id. */
export async function insertLoginCode(userId: string, codeHash: string, ttlMinutes: number): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO login_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))
     RETURNING id`,
    [userId, codeHash, ttlMinutes],
  );
  return rows[0]!.id;
}

export async function deleteLoginCode(id: string): Promise<void> {
  await db.query('DELETE FROM login_codes WHERE id = $1', [id]);
}

export async function incrementLoginCodeAttempts(id: string): Promise<void> {
  await db.query('UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1', [id]);
}

/** Returns false if the code was already used (e.g. two requests at the same moment). */
export async function markLoginCodeUsed(id: string): Promise<boolean> {
  const result = await db.query('UPDATE login_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL', [id]);
  return result.rowCount === 1;
}

export async function insertSession(userId: string, tokenHash: string): Promise<void> {
  await db.query('INSERT INTO sessions (user_id, token_hash) VALUES ($1, $2)', [userId, tokenHash]);
}

/** Keeps a session alive, writing at most about once an hour. */
export async function touchSession(id: string): Promise<void> {
  await db.query(
    `UPDATE sessions SET last_used_at = now() WHERE id = $1 AND last_used_at < now() - interval '1 hour'`,
    [id],
  );
}

export async function deleteSession(id: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE id = $1', [id]);
}

export async function deletePushToken(token: string, userId: string): Promise<void> {
  await db.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [token, userId]);
}
