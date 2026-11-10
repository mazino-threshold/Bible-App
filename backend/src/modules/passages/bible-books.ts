// The 66 books of the Protestant canon, in order, with their USFM codes (what YouVersion uses in passage ids)
// and chapter counts (checked against YouVersion's NIV index). Extra names are common abbreviations admins may type.

export interface BibleBook {
  /** USFM code, e.g. 'GEN', '1CO'. */
  code: string;
  name: string;
  chapters: number;
}

// [code, name, chapters, ...other names]
const BOOKS: [string, string, number, ...string[]][] = [
  ['GEN', 'Genesis', 50, 'gen', 'ge', 'gn'],
  ['EXO', 'Exodus', 40, 'exo', 'ex', 'exod'],
  ['LEV', 'Leviticus', 27, 'lev', 'le', 'lv'],
  ['NUM', 'Numbers', 36, 'num', 'nu', 'nm', 'nb'],
  ['DEU', 'Deuteronomy', 34, 'deut', 'deu', 'de', 'dt'],
  ['JOS', 'Joshua', 24, 'josh', 'jos', 'jsh'],
  ['JDG', 'Judges', 21, 'judg', 'jdg', 'jg', 'jdgs'],
  ['RUT', 'Ruth', 4, 'rut', 'ru', 'rth'],
  ['1SA', '1 Samuel', 31, '1sam', '1sa', '1sm'],
  ['2SA', '2 Samuel', 24, '2sam', '2sa', '2sm'],
  ['1KI', '1 Kings', 22, '1kgs', '1ki', '1kin', '1kings'],
  ['2KI', '2 Kings', 25, '2kgs', '2ki', '2kin', '2kings'],
  ['1CH', '1 Chronicles', 29, '1chr', '1ch', '1chron'],
  ['2CH', '2 Chronicles', 36, '2chr', '2ch', '2chron'],
  ['EZR', 'Ezra', 10, 'ezr'],
  ['NEH', 'Nehemiah', 13, 'neh', 'ne'],
  ['EST', 'Esther', 10, 'est', 'esth', 'es'],
  ['JOB', 'Job', 42, 'jb'],
  ['PSA', 'Psalms', 150, 'psalm', 'ps', 'psa', 'psm', 'pss'],
  ['PRO', 'Proverbs', 31, 'prov', 'pro', 'prv', 'pr', 'proverb'],
  ['ECC', 'Ecclesiastes', 12, 'eccl', 'ecc', 'eccles', 'ec', 'qoh'],
  ['SNG', 'Song of Songs', 8, 'songofsolomon', 'song', 'sos', 'sng', 'canticles', 'songs'],
  ['ISA', 'Isaiah', 66, 'isa', 'is'],
  ['JER', 'Jeremiah', 52, 'jer', 'je', 'jr'],
  ['LAM', 'Lamentations', 5, 'lam', 'la'],
  ['EZK', 'Ezekiel', 48, 'ezek', 'eze', 'ezk'],
  ['DAN', 'Daniel', 12, 'dan', 'da', 'dn'],
  ['HOS', 'Hosea', 14, 'hos', 'ho'],
  ['JOL', 'Joel', 3, 'jol', 'joe', 'jl'],
  ['AMO', 'Amos', 9, 'amo', 'am'],
  ['OBA', 'Obadiah', 1, 'obad', 'oba', 'ob'],
  ['JON', 'Jonah', 4, 'jon', 'jnh'],
  ['MIC', 'Micah', 7, 'mic', 'mc'],
  ['NAM', 'Nahum', 3, 'nah', 'nam', 'na'],
  ['HAB', 'Habakkuk', 3, 'hab', 'hb'],
  ['ZEP', 'Zephaniah', 3, 'zeph', 'zep', 'zp'],
  ['HAG', 'Haggai', 2, 'hag', 'hg'],
  ['ZEC', 'Zechariah', 14, 'zech', 'zec', 'zc'],
  ['MAL', 'Malachi', 4, 'mal', 'ml'],
  ['MAT', 'Matthew', 28, 'matt', 'mat', 'mt'],
  ['MRK', 'Mark', 16, 'mrk', 'mar', 'mk', 'mr'],
  ['LUK', 'Luke', 24, 'luk', 'lk'],
  ['JHN', 'John', 21, 'jhn', 'joh', 'jn'],
  ['ACT', 'Acts', 28, 'act', 'ac'],
  ['ROM', 'Romans', 16, 'rom', 'ro', 'rm'],
  ['1CO', '1 Corinthians', 16, '1cor', '1co'],
  ['2CO', '2 Corinthians', 13, '2cor', '2co'],
  ['GAL', 'Galatians', 6, 'gal', 'ga'],
  ['EPH', 'Ephesians', 6, 'eph', 'ephes'],
  ['PHP', 'Philippians', 4, 'phil', 'php', 'pp'],
  ['COL', 'Colossians', 4, 'col', 'co'],
  ['1TH', '1 Thessalonians', 5, '1thess', '1th', '1thes'],
  ['2TH', '2 Thessalonians', 3, '2thess', '2th', '2thes'],
  ['1TI', '1 Timothy', 6, '1tim', '1ti', '1tm'],
  ['2TI', '2 Timothy', 4, '2tim', '2ti', '2tm'],
  ['TIT', 'Titus', 3, 'tit', 'ti'],
  ['PHM', 'Philemon', 1, 'philem', 'phm', 'pm'],
  ['HEB', 'Hebrews', 13, 'heb'],
  ['JAS', 'James', 5, 'jas', 'jm', 'jam'],
  ['1PE', '1 Peter', 5, '1pet', '1pe', '1pt'],
  ['2PE', '2 Peter', 3, '2pet', '2pe', '2pt'],
  ['1JN', '1 John', 5, '1jn', '1jhn', '1jo', '1joh'],
  ['2JN', '2 John', 1, '2jn', '2jhn', '2jo', '2joh'],
  ['3JN', '3 John', 1, '3jn', '3jhn', '3jo', '3joh'],
  ['JUD', 'Jude', 1, 'jud', 'jd'],
  ['REV', 'Revelation', 22, 'rev', 're', 'revelations', 'rv'],
];

export const BIBLE_BOOKS: BibleBook[] = BOOKS.map(([code, name, chapters]) => ({ code, name, chapters }));

/** Lower case, no spaces or dots, and a leading I/II/III, First/Second/Third or 1st/2nd/3rd turned into 1/2/3. */
export function bookKey(name: string): string {
  const prefixed = name
    .trim()
    .toLowerCase()
    .replace(/^(iii|third|3rd)\s+/, '3')
    .replace(/^(ii|second|2nd)\s+/, '2')
    .replace(/^(i|first|1st)\s+/, '1');
  return prefixed.replace(/[^a-z0-9]/g, '');
}

const byKey = new Map<string, { book: BibleBook; index: number }>();
BOOKS.forEach(([, name, , ...others], index) => {
  for (const key of new Set([bookKey(name), ...others])) {
    // Catches a typo in the table above giving two books the same short name
    if (byKey.has(key)) throw new Error(`Bible book name "${key}" is used twice`);
    byKey.set(key, { book: BIBLE_BOOKS[index]!, index });
  }
});

/** Finds a book by any of its names, e.g. 'Genesis', 'gen', '1 Cor', 'I John'. index is its place in the Bible (0 = Genesis). */
export function findBook(name: string): { book: BibleBook; index: number } | undefined {
  return byKey.get(bookKey(name));
}
