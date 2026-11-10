// Client for the YouVersion Platform Bible API: https://developers.youversion.com/api/bibles
import { env } from '../config/env';
import { logger } from './logger';

const BASE_URL = 'https://api.youversion.com/v1';
const TIMEOUT_MS = 15_000;

/** A failed call to YouVersion. status is 0 when no response came back (timeout, network, no key). */
export class YouVersionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface YouVersionPassage {
  /** e.g. 'GEN.16' or 'JHN.3.1-21' */
  id: string;
  /** e.g. 'Genesis 16' */
  reference: string;
  /** HTML with verse numbers and headings. Style it with YouVersion's bible.css. */
  content: string;
}

export interface YouVersionBible {
  id: number;
  abbreviation: string;
  localized_abbreviation?: string;
  title: string;
  localized_title?: string;
  /** Must be shown with the text. Falls back to promotional_content when empty. */
  copyright?: string | null;
  promotional_content?: string | null;
}

/** One chapter (e.g. 'GEN.16') or verses within one chapter (e.g. 'JHN.3.1-21'), as HTML with headings. */
export function fetchPassage(bibleId: number, passageId: string): Promise<YouVersionPassage> {
  return get(`/bibles/${bibleId}/passages/${encodeURIComponent(passageId)}?format=html&include_headings=true`);
}

/** A Bible version's name and copyright notice. */
export function fetchBible(bibleId: number): Promise<YouVersionBible> {
  return get(`/bibles/${bibleId}`);
}

async function get<T>(path: string): Promise<T> {
  if (!env.YOUVERSION_APP_KEY) throw new YouVersionError(0, 'YOUVERSION_APP_KEY is not set');

  // One retry for a busy or briefly broken YouVersion; anything else (403 licence, 404 bad passage) won't change
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(BASE_URL + path, {
        headers: { 'X-YVP-App-Key': env.YOUVERSION_APP_KEY, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt < 2) continue;
      throw new YouVersionError(0, `YouVersion request failed: ${(err as Error).message}`);
    }

    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 2) {
      // Retry-After is in seconds; wait at most 3 so the user isn't left hanging
      const retryAfter = Number(res.headers.get('retry-after') ?? 1);
      const wait = Math.min(Number.isFinite(retryAfter) ? retryAfter : 1, 3) * 1000;
      logger.warn('YouVersion busy, retrying', { path, status: res.status, waitMs: wait });
      await new Promise((resolve) => setTimeout(resolve, wait));
      continue;
    }
    const body = (await res.text()).slice(0, 300);
    throw new YouVersionError(res.status, `YouVersion error ${res.status} for ${path}: ${body}`);
  }
}
