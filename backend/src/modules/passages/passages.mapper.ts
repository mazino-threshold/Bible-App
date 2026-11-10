import type { DayPassageDto, PassageCacheRow } from './passages.types';

export function toDayPassageDto(row: PassageCacheRow, notes: string | null): DayPassageDto {
  return {
    date: row.reading_date,
    passage: row.passage,
    notes,
    version: {
      id: row.bible_id,
      abbreviation: row.version_abbreviation,
      title: row.version_title,
      copyright: row.copyright,
    },
    chapters: row.chapters,
    fetchedAt: row.fetched_at.toISOString(),
  };
}
