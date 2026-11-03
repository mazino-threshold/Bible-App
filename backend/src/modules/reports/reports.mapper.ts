import type { ReportUserDto, WeeklyReportRow } from './reports.types';

export function toReportUserDto(row: WeeklyReportRow): ReportUserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    daysRead: row.days_read,
    checkedInDates: row.checked_in_dates,
  };
}
