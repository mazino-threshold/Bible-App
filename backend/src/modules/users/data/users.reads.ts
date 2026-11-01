import { db } from '../../../db/pool';
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
