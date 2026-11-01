export const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type DayName = (typeof DAY_NAMES)[number];

/** A day's reading as stored in the database. */
export interface ReadingRow {
  reading_date: string;
  passage: string;
  notes: string | null;
}

/** One day of a week as sent to the app. passage is null if the admin hasn't set it yet. */
export interface DayDto {
  date: string;
  day: DayName;
  passage: string | null;
  notes: string | null;
}

export interface WeekDto {
  weekStart: string;
  weekEnd: string;
  days: DayDto[];
}

export interface WeekSummaryDto {
  weekStart: string;
  weekEnd: string;
  daysScheduled: number;
}
