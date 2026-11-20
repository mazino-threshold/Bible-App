import { db } from '../../../db/pool';
import type { ListUsersInput } from '../users.schemas';
import type { DeletedUserRow, UserRow } from '../users.types';
import { DELETED_USER_COLUMNS, userColumns } from './user-columns';

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

/** Deleted accounts still waiting to be erased, most recently deleted first. */
export async function findDeletedUsers(): Promise<DeletedUserRow[]> {
  const { rows } = await db.query<DeletedUserRow>(
    `SELECT ${DELETED_USER_COLUMNS} FROM deleted_users WHERE purge_after > now() ORDER BY deleted_at DESC`,
  );
  return rows;
}

/** Active admins other than this user. */
export async function countOtherActiveAdmins(userId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND deactivated_at IS NULL AND id <> $1`,
    [userId],
  );
  return rows[0]!.count;
}

/** Active admins and their devices, to tell them when someone deletes their account. */
export async function findAdminContacts(): Promise<{ emails: { name: string; email: string }[]; pushTokens: string[] }> {
  const admins = await db.query<{ name: string; email: string }>(
    `SELECT name, email FROM users WHERE role = 'admin' AND deactivated_at IS NULL ORDER BY lower(name)`,
  );
  const tokens = await db.query<{ token: string }>(
    `SELECT p.token FROM push_tokens p JOIN users u ON u.id = p.user_id
      WHERE u.role = 'admin' AND u.deactivated_at IS NULL`,
  );
  return { emails: admins.rows, pushTokens: tokens.rows.map((r) => r.token) };
}
