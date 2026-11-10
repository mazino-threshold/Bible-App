/** One chapter (or verses within one chapter) of the day's reading. */
export interface PassageChapter {
  /** YouVersion passage id, e.g. 'GEN.16' */
  id: string;
  /** e.g. 'Genesis 16' */
  reference: string;
  html: string;
}

/** A day's Bible text as stored in passage_cache. */
export interface PassageCacheRow {
  reading_date: string;
  bible_id: number;
  passage: string;
  version_abbreviation: string;
  version_title: string;
  copyright: string;
  chapters: PassageChapter[];
  fetched_at: Date;
}

/** The day's Bible text as sent to the app. */
export interface DayPassageDto {
  date: string;
  /** The reading as the admin entered it, e.g. 'Genesis 16-18' */
  passage: string;
  notes: string | null;
  version: {
    id: number;
    abbreviation: string;
    title: string;
    /** Must be shown with the text */
    copyright: string;
  };
  chapters: PassageChapter[];
  fetchedAt: string;
}
