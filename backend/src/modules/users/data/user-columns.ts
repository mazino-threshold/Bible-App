const USER_FIELDS = ['id', 'name', 'email', 'phone', 'role', 'reminder_frequency', 'created_at'];

/** Column list for SELECTs, e.g. userColumns('u.') -> 'u.id, u.name, ...' */
export function userColumns(prefix = ''): string {
  return USER_FIELDS.map((f) => prefix + f).join(', ');
}
