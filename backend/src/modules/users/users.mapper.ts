import type { AdminUserDto, DeletedUserDto, DeletedUserRow, UserDto, UserRow } from './users.types';

export function toDeletedUserDto(user: DeletedUserRow): DeletedUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    requestedBy: user.requested_by,
    deletedBy: user.deleted_by,
    deletionReason: user.deletion_reason,
    deletedAt: user.deleted_at,
    purgeAfter: user.purge_after,
    checkInCount: user.check_in_count,
  };
}

export function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    remindersEnabled: user.reminders_enabled,
    createdAt: user.created_at,
  };
}

export function toAdminUserDto(user: UserRow): AdminUserDto {
  return {
    ...toUserDto(user),
    active: user.deactivated_at === null,
    deactivatedAt: user.deactivated_at,
    deactivationReason: user.deactivation_reason,
  };
}
