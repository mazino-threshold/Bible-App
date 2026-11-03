import type { AdminUserDto, UserDto, UserRow } from './users.types';

export function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    reminderFrequency: user.reminder_frequency,
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
