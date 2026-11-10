import { db } from '../../../db/pool';
import type { PassageCacheRow } from '../passages.types';

/** Saves (or replaces) a day's Bible text and, in the same statement, removes anything cached for earlier weeks. */
export async function saveCachedPassage(
  row: Omit<PassageCacheRow, 'fetched_at'>,
  weekStart: string,
): Promise<PassageCacheRow> {
  const { rows } = await db.query<PassageCacheRow>(
    `WITH old_weeks AS (DELETE FROM passage_cache WHERE reading_date < $8)
     INSERT INTO passage_cache
       (reading_date, bible_id, passage, version_abbreviation, version_title, copyright, chapters)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (reading_date, bible_id) DO UPDATE
       SET passage = EXCLUDED.passage,
           version_abbreviation = EXCLUDED.version_abbreviation,
           version_title = EXCLUDED.version_title,
           copyright = EXCLUDED.copyright,
           chapters = EXCLUDED.chapters,
           fetched_at = now()
     RETURNING reading_date, bible_id, passage, version_abbreviation, version_title, copyright, chapters, fetched_at`,
    [
      row.reading_date,
      row.bible_id,
      row.passage,
      row.version_abbreviation,
      row.version_title,
      row.copyright,
      JSON.stringify(row.chapters),
      weekStart,
    ],
  );
  return rows[0]!;
}

/** Removes cached Bible text for every day before the given date. Returns how many days were removed. */
export async function deleteCachedPassagesBefore(date: string): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM passage_cache WHERE reading_date < $1', [date]);
  return rowCount ?? 0;
}
