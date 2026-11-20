export type Role = 'user' | 'admin';

/** A user as stored in the database. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  /** Push reminders at 6 AM and 9 PM. */
  reminders_enabled: boolean;
  created_at: Date;
  /** null while the account is active. */
  deactivated_at: Date | null;
  deactivation_reason: string | null;
}

/** A user as sent to the app. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  remindersEnabled: boolean;
  createdAt: Date;
}

export type DeletionRequestedBy = 'user' | 'admin';

/** A deleted account waiting to be erased (deleted_users), without the archived check-ins and history. */
export interface DeletedUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  requested_by: DeletionRequestedBy;
  deleted_by: string | null;
  deletion_reason: string | null;
  deleted_at: Date;
  purge_after: Date;
  check_in_count: number;
}

/** A deleted account as shown to admins. */
export interface DeletedUserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  requestedBy: DeletionRequestedBy;
  deletedBy: string | null;
  deletionReason: string | null;
  deletedAt: Date;
  /** Erased for good after this; until then an admin can restore it. */
  purgeAfter: Date;
  checkInCount: number;
}

/** Sent to a user who has just deleted their own account. */
export interface MyDeletionDto {
  deletedAt: Date;
  purgeAfter: Date;
}

/** A user as shown on the admin's user list. */
export interface AdminUserDto extends UserDto {
  active: boolean;
  deactivatedAt: Date | null;
  deactivationReason: string | null;
}
