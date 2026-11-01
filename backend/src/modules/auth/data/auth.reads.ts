import { db } from '../../../db/pool';
import { userColumns } from '../../users/data/user-columns';
import type { UserRow } from '../../users/users.types';

export interface ActiveLoginCode {
  id: string;
  code_hash: string;
  attempts: number;
  expired: boolean;
}

/** The user's newest unused login code, if any. */
export async function findActiveLoginCode(userId: string): Promise<ActiveLoginCode | undefined> {
  const { rows } = await db.query<ActiveLoginCode>(
    `SELECT id, code_hash, attempts, expires_at < now() AS expired
       FROM login_codes
      WHERE user_id = $1 AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId],
  );
  return rows[0];
}

/** How many codes the user requested in the last minute and the last hour. */
export async function countRecentLoginCodes(userId: string): Promise<{ lastMinute: number; lastHour: number }> {
  const { rows } = await db.query<{ last_minute: number; last_hour: number }>(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 minute')::int AS last_minute,
            count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int   AS last_hour
       FROM login_codes
      WHERE user_id = $1`,
    [userId],
  );
  return { lastMinute: rows[0]!.last_minute, lastHour: rows[0]!.last_hour };
}

/** The user behind a session token hash, if the session exists and hasn't gone idle. */
export async function findSessionUser(
  tokenHash: string,
  idleDays: number,
): Promise<{ sessionId: string; user: UserRow } | undefined> {
  const { rows } = await db.query<UserRow & { session_id: string }>(
    `SELECT ${userColumns('u.')}, s.id AS session_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.last_used_at > now() - make_interval(days => $2)`,
    [tokenHash, idleDays],
  );
  const row = rows[0];
  if (!row) return undefined;

  const { session_id, ...user } = row;
  return { sessionId: session_id, user };
}
