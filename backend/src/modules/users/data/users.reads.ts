import { db } from '../../../db/pool';
import type { ListUsersInput } from '../users.schemas';
import type { UserRow } from '../users.types';
import { userColumns } from './user-columns';

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(`SELECT ${userColumns()} FROM users WHERE id = $1`, [id]);
  return rows[0];
}

/** Expects a lowercased email. */
export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(`SELECT ${userColumns()} FROM users WHERE lower(email) = $1`, [email]);
  return rows[0];
}

/** Everyone, or only active / only deactivated users, by name. */
export async function findUsers(status: ListUsersInput['status']): Promise<UserRow[]> {
  const { rows } = await db.query<UserRow>(
    `SELECT ${userColumns()}
       FROM users
      WHERE $1 = 'all' OR ($1 = 'active') = (deactivated_at IS NULL)
      ORDER BY lower(name)`,
    [status],
  );
  return rows;
}
