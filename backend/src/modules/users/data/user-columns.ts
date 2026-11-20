const USER_FIELDS = [
  'id',
  'name',
  'email',
  'phone',
  'role',
  'reminders_enabled',
  'created_at',
  'deactivated_at',
  'deactivation_reason',
];

/** deleted_users columns that make a DeletedUserRow (the archived check-ins and history stay in the database). */
export const DELETED_USER_COLUMNS = `id, name, email, phone, role, requested_by, deleted_by, deletion_reason,
  deleted_at, purge_after, jsonb_array_length(check_ins) AS check_in_count`;

/** Column list for SELECTs, e.g. userColumns('u.') -> 'u.id, u.name, ...' */
export function userColumns(prefix = ''): string {
  return USER_FIELDS.map((f) => prefix + f).join(', ');
}
