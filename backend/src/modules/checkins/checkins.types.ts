import type { DayName } from '../schedule/schedule.types';

/**
 * read        - checked in
 * pending     - today, has a reading, not checked in yet
 * missed      - past day with a reading, not checked in
 * upcoming    - future day
 * no_reading  - today or a past day with nothing scheduled
 */
export type DayStatus = 'read' | 'pending' | 'missed' | 'upcoming' | 'no_reading';

/** A scheduled reading day and whether this user checked in on it. */
export interface ReadingHistoryRow {
  reading_date: string;
  checked_in: boolean;
}

export interface MyDayDto {
  date: string;
  day: DayName;
  passage: string | null;
  notes: string | null;
  status: DayStatus;
  /** True only for today when there is a reading: the checkbox can be ticked or unticked. */
  canToggle: boolean;
}

export interface MyWeekDto {
  today: string;
  weekStart: string;
  weekEnd: string;
  daysRead: number;
  streak: number;
  days: MyDayDto[];
}

export interface TodayCheckInDto {
  date: string;
  checkedIn: boolean;
  streak: number;
}
