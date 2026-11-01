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
