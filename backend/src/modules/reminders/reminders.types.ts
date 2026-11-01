import type { ReminderHour } from './reminders.constants';

export interface ReminderRecipientRow {
  token: string;
  user_id: string;
}

export interface ReminderRunDto {
  date: string;
  hour: ReminderHour | null;
  status: 'sent' | 'skipped';
  /** Why nothing was sent, when status is 'skipped'. */
  reason?: string;
  users: number;
  devices: number;
  sent: number;
  failed: number;
  invalidTokensRemoved: number;
}
