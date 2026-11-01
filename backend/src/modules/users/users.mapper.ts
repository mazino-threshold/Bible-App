import type { UserDto, UserRow } from './users.types';

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
