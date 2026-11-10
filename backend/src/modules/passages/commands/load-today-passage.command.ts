import { env } from '../../../config/env';
import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { isReadingDay, todayInNigeria, weekStart } from '../../../shared/time';
import { fetchBible, fetchPassage, YouVersionError } from '../../../shared/youversion';
import { findReadingsBetween } from '../../schedule/data/schedule.reads';
import { findCachedPassage } from '../data/passages.reads';
import { saveCachedPassage } from '../data/passages.writes';
import { parsePassage } from '../passage-parser';
import { toDayPassageDto } from '../passages.mapper';
import type { DayPassageDto, PassageCacheRow } from '../passages.types';

// Requests that arrive while today's text is being fetched wait for that fetch instead of starting another
const inFlight = new Map<string, Promise<PassageCacheRow>>();

/**
 * Today's Bible text, in full. The first request of the day fetches it from YouVersion and saves it;
 * every request after that is served from the database. (A command, not a query, because it fills the cache.)
 */
export async function loadTodayPassage(): Promise<DayPassageDto> {
  const today = todayInNigeria();
  if (!isReadingDay(today)) throw new HttpError(404, "There's no reading on Sundays");

  const [reading] = await findReadingsBetween(today, today);
  if (!reading) throw new HttpError(404, 'No reading has been scheduled for today');

  const bibleId = env.YOUVERSION_BIBLE_ID;
  const cached = await findCachedPassage(today, bibleId);
  // If the admin has changed today's reading since it was cached, the old text is no good
  if (cached && cached.passage === reading.passage) {
    logger.debug('Passage served from cache', { date: today, bibleId });
    return toDayPassageDto(cached, reading.notes);
  }

  const key = `${today}|${bibleId}|${reading.passage}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetchAndSave(today, bibleId, reading.passage, Boolean(cached)).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return toDayPassageDto(await pending, reading.notes);
}

async function fetchAndSave(date: string, bibleId: number, passage: string, replacing: boolean): Promise<PassageCacheRow> {
  const parsed = parsePassage(passage);
  if (!parsed.ok) {
    // Readings saved before the admin form checked passages could be in a form we don't understand
    logger.error('Passage not loaded: reading not understood', { date, passage, reason: parsed.error });
    throw new HttpError(422, `Today's reading "${passage}" couldn't be understood, so the Bible text can't be shown`);
  }

  const started = performance.now();
  try {
    // Every chapter at once, plus the version's name and copyright
    const [bible, chapters] = await Promise.all([
      fetchBible(bibleId),
      Promise.all(parsed.parts.map((part) => fetchPassage(bibleId, part.id))),
    ]);

    const row = await saveCachedPassage(
      {
        reading_date: date,
        bible_id: bibleId,
        passage,
        version_abbreviation: bible.localized_abbreviation || bible.abbreviation,
        version_title: bible.localized_title || bible.title,
        copyright: bible.copyright || bible.promotional_content || bible.title,
        chapters: chapters.map((c) => ({ id: c.id, reference: c.reference, html: c.content })),
      },
      weekStart(date),
    );

    logger.info(replacing ? 'Passage refetched after the reading changed' : 'Passage fetched from YouVersion and cached', {
      date,
      bibleId,
      passage,
      chapters: chapters.length,
      ms: Math.round(performance.now() - started),
    });
    return row;
  } catch (err) {
    if (!(err instanceof YouVersionError)) throw err;

    logger.error('Passage not loaded: YouVersion call failed', {
      date,
      bibleId,
      passage,
      status: err.status,
      error: err,
      // 403 means the app key isn't licensed for this version: accept its licence in the YouVersion Platform portal
      ...(err.status === 403 ? { hint: `Licence for Bible ${bibleId} not accepted, or wrong YOUVERSION_APP_KEY` } : {}),
    });
    if (err.status === 404) {
      throw new HttpError(422, `Part of today's reading "${passage}" couldn't be found in this Bible version`);
    }
    throw new HttpError(503, "The Bible text couldn't be loaded right now. Please try again in a few minutes");
  }
}
