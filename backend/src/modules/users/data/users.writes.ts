import { db } from '../../../db/pool';
import type { ReminderFrequency, Role, UserRow } from '../users.types';
import { userColumns } from './user-columns';

const UNIQUE_VIOLATION = '23505';

/** Returns null if the email is already registered. */
export async function insertUser(user: { name: string; email: string; phone: string }): Promise<UserRow | null> {
  try {
    const { rows } = await db.query<UserRow>(
      `INSERT INTO users (name, email, phone) VALUES ($1, $2, $3) RETURNING ${userColumns()}`,
      [user.name, user.email, user.phone],
    );
    return rows[0]!;
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return null;
    }
    throw err;
  }
}

/** Only the fields given are changed. */
export async function updateUser(
  id: string,
  changes: { name?: string; phone?: string; reminderFrequency?: ReminderFrequency },
): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(
    `UPDATE users
        SET name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            reminder_frequency = COALESCE($4, reminder_frequency)
      WHERE id = $1
      RETURNING ${userColumns()}`,
    [id, changes.name ?? null, changes.phone ?? null, changes.reminderFrequency ?? null],
  );
  return rows[0];
}

/** Expects a lowercased email. Returns the updated user, or undefined if no one has that email. */
export async function setUserRoleByEmail(email: string, role: Role): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(
    `UPDATE users SET role = $2 WHERE lower(email) = $1 RETURNING ${userColumns()}`,
    [email, role],
  );
  return rows[0];
}

/**
 * Deactivates an active user, records it in their history, and signs them out everywhere
 * (sessions, unused login codes and push tokens), all in one statement.
 * Returns undefined if no active user has this id.
 */
export async function deactivateUser(id: string, reason: string | null, adminId: string): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(
    `WITH updated AS (
       UPDATE users SET deactivated_at = now(), deactivation_reason = $2
        WHERE id = $1 AND deactivated_at IS NULL
        RETURNING ${userColumns()}
     ), history AS (
       INSERT INTO user_status_changes (user_id, action, reason, changed_by)
       SELECT id, 'deactivated', $2, $3 FROM updated
     ), sessions_removed AS (
       DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated)
     ), codes_retired AS (
       UPDATE login_codes SET used_at = now() WHERE used_at IS NULL AND user_id IN (SELECT id FROM updated)
     ), push_tokens_removed AS (
       DELETE FROM push_tokens WHERE user_id IN (SELECT id FROM updated)
     )
     SELECT * FROM updated`,
    [id, reason, adminId],
  );
  return rows[0];
}

/** Reactivates a deactivated user and records it in their history. Returns undefined if no deactivated user has this id. */
export async function reactivateUser(id: string, reason: string | null, adminId: string): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(
    `WITH updated AS (
       UPDATE users SET deactivated_at = NULL, deactivation_reason = NULL
        WHERE id = $1 AND deactivated_at IS NOT NULL
        RETURNING ${userColumns()}
     ), history AS (
       INSERT INTO user_status_changes (user_id, action, reason, changed_by)
       SELECT id, 'reactivated', $2, $3 FROM updated
     )
     SELECT * FROM updated`,
    [id, reason, adminId],
  );
  return rows[0];
}
