import type { Role } from '../users/users.types';

/** One user's check-ins for a week, as returned by the database. */
export interface WeeklyReportRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  days_read: number;
  checked_in_dates: string[];
}

export interface ReportUserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Whether the account is active now (someone deactivated mid-week still appears for that week). */
  active: boolean;
  daysRead: number;
  checkedInDates: string[];
}

export interface WeeklyReportDto {
  weekStart: string;
  weekEnd: string;
  /** Days the admin scheduled a reading for this week (normally 6). */
  daysScheduled: number;
  /** Totals over everyone, before minDays/maxDays filters. */
  summary: {
    totalUsers: number;
    readEveryDay: number;
    averageDaysRead: number;
  };
  filters: { minDays: number | null; maxDays: number | null };
  /** Most days read first, then by name. */
  users: ReportUserDto[];
}
