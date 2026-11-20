import { db } from '../../../db/pool';
import type { DeletedUserRow, DeletionRequestedBy, Role, UserRow } from '../users.types';
import { DELETED_USER_COLUMNS, userColumns } from './user-columns';

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
  changes: { name?: string; phone?: string; remindersEnabled?: boolean },
): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(
    `UPDATE users
        SET name = COALESCE($2, name),
            phone = COALESCE($3, phone),
            reminders_enabled = COALESCE($4, reminders_enabled)
      WHERE id = $1
      RETURNING ${userColumns()}`,
    [id, changes.name ?? null, changes.phone ?? null, changes.remindersEnabled ?? null],
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

/** Returns the updated user, or undefined if no one has this id. */
export async function setUserRole(id: string, role: Role): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(`UPDATE users SET role = $2 WHERE id = $1 RETURNING ${userColumns()}`, [
    id,
    role,
  ]);
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

/**
 * Copies the user, their check-in dates and their status history into deleted_users (to be erased after
 * retentionDays), then deletes them from users, which cascades to their sessions, login codes, push tokens,
 * check-ins and status history. All in one statement. Returns undefined if no user has this id.
 */
export async function archiveAndDeleteUser(
  id: string,
  deletion: { requestedBy: DeletionRequestedBy; adminId: string | null; reason: string | null; retentionDays: number },
): Promise<DeletedUserRow | undefined> {
  const { rows } = await db.query<DeletedUserRow>(
    `WITH target AS (
       SELECT ${userColumns()} FROM users WHERE id = $1 FOR UPDATE
     ), archived AS (
       INSERT INTO deleted_users (id, name, email, phone, role, reminders_enabled, created_at,
                                  deactivated_at, deactivation_reason, check_ins, status_changes,
                                  requested_by, deleted_by, deletion_reason, purge_after)
       SELECT t.id, t.name, t.email, t.phone, t.role, t.reminders_enabled, t.created_at,
              t.deactivated_at, t.deactivation_reason,
              coalesce(
                (SELECT jsonb_agg(c.check_in_date ORDER BY c.check_in_date) FROM check_ins c WHERE c.user_id = t.id),
                '[]'
              ),
              coalesce(
                (SELECT jsonb_agg(
                          jsonb_build_object('action', h.action, 'reason', h.reason,
                                             'changedBy', h.changed_by, 'changedAt', h.changed_at)
                          ORDER BY h.changed_at)
                   FROM user_status_changes h WHERE h.user_id = t.id),
                '[]'
              ),
              $2, $3, $4, now() + make_interval(days => $5)
         FROM target t
       RETURNING ${DELETED_USER_COLUMNS}
     ), removed AS (
       DELETE FROM users WHERE id IN (SELECT id FROM archived)
     )
     SELECT * FROM archived`,
    [id, deletion.requestedBy, deletion.adminId, deletion.reason, deletion.retentionDays],
  );
  return rows[0];
}

/**
 * Puts a deleted account back: the user (same id, signed out), their check-ins (for days still on the schedule)
 * and their status history, then removes the archived copy. All in one statement.
 * Returns undefined if there is no archived account with this id, and 'email_taken' if someone has registered
 * with the same email since.
 */
export async function restoreDeletedUser(id: string): Promise<UserRow | 'email_taken' | undefined> {
  try {
    const { rows } = await db.query<UserRow>(
      `WITH archived AS (
         DELETE FROM deleted_users WHERE id = $1 RETURNING *
       ), restored AS (
         INSERT INTO users (id, name, email, phone, role, reminders_enabled, created_at,
                            deactivated_at, deactivation_reason)
         SELECT id, name, email, phone, role, reminders_enabled, created_at, deactivated_at, deactivation_reason
           FROM archived
         RETURNING ${userColumns()}
       ), check_ins_restored AS (
         INSERT INTO check_ins (user_id, check_in_date)
         SELECT a.id, r.reading_date
           FROM archived a
          CROSS JOIN LATERAL jsonb_array_elements_text(a.check_ins) AS d(day)
           JOIN readings r ON r.reading_date = d.day::date
       ), history_restored AS (
         INSERT INTO user_status_changes (user_id, action, reason, changed_by, changed_at)
         SELECT a.id, h->>'action', h->>'reason', admin.id, (h->>'changedAt')::timestamptz
           FROM archived a
          CROSS JOIN LATERAL jsonb_array_elements(a.status_changes) AS h
           -- null if the admin who made the change has since been deleted
           LEFT JOIN users admin ON admin.id = (h->>'changedBy')::uuid
       )
       SELECT * FROM restored`,
      [id],
    );
    return rows[0];
  } catch (err) {
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
      return 'email_taken';
    }
    throw err;
  }
}

/** Erases every deleted account whose holding time is over. Returns how many were erased. */
export async function purgeExpiredDeletedUsers(): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM deleted_users WHERE purge_after <= now()');
  return rowCount ?? 0;
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
