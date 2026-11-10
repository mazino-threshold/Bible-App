// Turns the passage an admin types, e.g. "Genesis 16-18" or "Psalm 23; Proverbs 3", into the
// YouVersion passage ids to fetch: one per chapter, since YouVersion can't fetch across chapters in one call.
import { BIBLE_BOOKS, findBook, type BibleBook } from './bible-books';

/** One YouVersion request: a whole chapter ('GEN.16') or verses within one chapter ('JHN.3.1-21'). */
export interface PassagePart {
  id: string;
  label: string;
}

export type ParsedPassage = { ok: true; parts: PassagePart[] } | { ok: false; error: string };

/** Each chapter is one call to YouVersion; this stops a typo like "Psalm 1-150" making hundreds. */
export const MAX_CHAPTERS_PER_DAY = 15;

const EXAMPLE = 'e.g. "Genesis 1-3", "Psalm 23; Proverbs 3" or "John 3:1-21"';

class PassageError extends Error {}

// A book name (optionally starting 1-3) followed by whatever comes after it
const BOOK_THEN_REST = /^((?:[1-3]\s*)?[a-z][a-z.' ]*?)\.?\s*(\d.*)?$/i;
// "50 - Exodus 2": the rest of a range that runs into another book
const INTO_NEXT_BOOK = /^(\d+)\s*-\s*((?:[1-3]\s*)?[a-z][a-z.' ]*?)\.?\s*(\d+)$/i;

/**
 * Understands, separated by ";":
 *   Genesis 1        Genesis 1-3        Psalm 1, 23        John 3:1-21        John 3:16
 *   Jude / Obadiah   (single-chapter books need no chapter)
 *   Genesis 50 - Exodus 2   (runs across books)
 * Book names can be abbreviated (Gen, 1 Cor, I John, Ps). Any kind of dash works.
 */
export function parsePassage(text: string): ParsedPassage {
  try {
    const segments = text
      .replace(/[‒-―−]/g, '-')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const parts = segments.flatMap(parseSegment).filter((p) => !seen.has(p.id) && seen.add(p.id));

    if (parts.length === 0) throw new PassageError(`Enter the passage, ${EXAMPLE}`);
    if (parts.length > MAX_CHAPTERS_PER_DAY) {
      throw new PassageError(`That's ${parts.length} chapters; a day's reading can have at most ${MAX_CHAPTERS_PER_DAY}`);
    }
    return { ok: true, parts };
  } catch (err) {
    if (err instanceof PassageError) return { ok: false, error: err.message };
    throw err;
  }
}

function parseSegment(segment: string): PassagePart[] {
  const match = BOOK_THEN_REST.exec(segment);
  if (!match) throw new PassageError(`"${segment}" isn't a passage we understand. Use a book and chapters, ${EXAMPLE}`);

  const found = findBook(match[1]!);
  if (!found) throw new PassageError(`"${match[1]!.trim()}" isn't a book of the Bible we recognise`);
  const { book } = found;
  const rest = (match[2] ?? '').replace(/\s+/g, ' ').trim();

  if (!rest) {
    if (book.chapters === 1) return [chapter(book, 1)];
    throw new PassageError(`Add the chapters for ${book.name}, e.g. "${book.name} 1"`);
  }

  const intoNextBook = INTO_NEXT_BOOK.exec(rest);
  if (intoNextBook) return acrossBooks(found, Number(intoNextBook[1]), intoNextBook[2]!, Number(intoNextBook[3]));

  return rest
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((item) => parseItem(book, item));
}

/** One comma-separated piece after the book name: "3", "1-3", "3:16" or "3:1-21". */
function parseItem(book: BibleBook, item: string): PassagePart[] {
  let m: RegExpExecArray | null;
  // In a single-chapter book like Jude, "Jude 5-10" means verses (but "Jude 1" means the whole book)
  const singleChapter = book.chapters === 1;

  if ((m = /^(\d+)$/.exec(item))) {
    const n = Number(m[1]);
    return singleChapter && n !== 1 ? [verses(book, 1, n, n)] : [chapter(book, n)];
  }
  if ((m = /^(\d+) ?- ?(\d+)$/.exec(item))) {
    const [from, to] = [Number(m[1]), Number(m[2])];
    return singleChapter ? [verses(book, 1, from, to)] : chapterRange(book, from, to);
  }
  if ((m = /^(\d+) ?[:.] ?(\d+)(?: ?- ?(\d+))?$/.exec(item))) {
    return [verses(book, Number(m[1]), Number(m[2]), Number(m[3] ?? m[2]))];
  }
  if ((m = /^(\d+) ?[:.] ?(\d+) ?- ?(\d+) ?[:.] ?(\d+)$/.exec(item))) {
    if (m[1] === m[3]) return [verses(book, Number(m[1]), Number(m[2]), Number(m[4]))];
    throw new PassageError(
      `"${book.name} ${item}" runs across chapters. Use whole chapters instead, e.g. "${book.name} ${m[1]}-${m[3]}"`,
    );
  }
  throw new PassageError(`"${book.name} ${item}" isn't a passage we understand. Use ${EXAMPLE}`);
}

function checkChapter(book: BibleBook, n: number): void {
  if (n < 1 || n > book.chapters) {
    throw new PassageError(
      `${book.name} has ${book.chapters} chapter${book.chapters === 1 ? '' : 's'}, so there's no chapter ${n}`,
    );
  }
}

function chapter(book: BibleBook, n: number): PassagePart {
  checkChapter(book, n);
  return { id: `${book.code}.${n}`, label: `${book.name} ${n}` };
}

function chapterRange(book: BibleBook, from: number, to: number): PassagePart[] {
  if (from > to) throw new PassageError(`"${book.name} ${from}-${to}": the first chapter must come before the last`);
  checkChapter(book, from);
  checkChapter(book, to);
  return Array.from({ length: to - from + 1 }, (_, i) => chapter(book, from + i));
}

function verses(book: BibleBook, ch: number, from: number, to: number): PassagePart {
  checkChapter(book, ch);
  if (from < 1 || from > to) throw new PassageError(`"${book.name} ${ch}:${from}-${to}": the first verse must come before the last`);
  const range = from === to ? `${from}` : `${from}-${to}`;
  return { id: `${book.code}.${ch}.${range}`, label: `${book.name} ${ch}:${range}` };
}

/** "Genesis 50 - Exodus 2": the rest of the first book, any books in between, then the start of the last. */
function acrossBooks(
  start: { book: BibleBook; index: number },
  fromChapter: number,
  endName: string,
  toChapter: number,
): PassagePart[] {
  const end = findBook(endName);
  if (!end) throw new PassageError(`"${endName.trim()}" isn't a book of the Bible we recognise`);
  if (end.index <= start.index) {
    throw new PassageError(`"${start.book.name} - ${end.book.name}": ${end.book.name} must come after ${start.book.name}`);
  }
  checkChapter(start.book, fromChapter);
  checkChapter(end.book, toChapter);

  const parts = chapterRange(start.book, fromChapter, start.book.chapters);
  for (const book of BIBLE_BOOKS.slice(start.index + 1, end.index)) parts.push(...chapterRange(book, 1, book.chapters));
  parts.push(...chapterRange(end.book, 1, toChapter));
  return parts;
}
