export type Role = 'user' | 'admin';
export type ReminderFrequency = 'high' | 'mid' | 'low' | 'off';

/** A user as stored in the database. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  reminder_frequency: ReminderFrequency;
  created_at: Date;
}

/** A user as sent to the app. */
export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  reminderFrequency: ReminderFrequency;
  createdAt: Date;
}
