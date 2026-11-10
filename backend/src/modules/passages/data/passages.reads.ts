import { db } from '../../../db/pool';
import type { PassageCacheRow } from '../passages.types';

/** The cached Bible text for a day in one version, if there is any. */
export async function findCachedPassage(date: string, bibleId: number): Promise<PassageCacheRow | undefined> {
  const { rows } = await db.query<PassageCacheRow>(
    `SELECT reading_date, bible_id, passage, version_abbreviation, version_title, copyright, chapters, fetched_at
       FROM passage_cache
      WHERE reading_date = $1 AND bible_id = $2`,
    [date, bibleId],
  );
  return rows[0];
}
