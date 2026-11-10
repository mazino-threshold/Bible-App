import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIBLE_BOOKS, findBook } from '../../src/modules/passages/bible-books';
import { MAX_CHAPTERS_PER_DAY, parsePassage } from '../../src/modules/passages/passage-parser';

/** The YouVersion ids a passage turns into, or the error message. */
function ids(text: string): string[] | string {
  const parsed = parsePassage(text);
  return parsed.ok ? parsed.parts.map((p) => p.id) : parsed.error;
}

describe('passage parser', () => {
  it('turns a chapter range into one id per chapter', () => {
    assert.deepEqual(ids('Genesis 16-18'), ['GEN.16', 'GEN.17', 'GEN.18']);
    assert.deepEqual(ids('Genesis 1 - 3'), ['GEN.1', 'GEN.2', 'GEN.3']);
    assert.deepEqual(ids('Genesis 1–3'), ['GEN.1', 'GEN.2', 'GEN.3']); // en dash
  });

  it('reads single chapters, lists and several books', () => {
    assert.deepEqual(ids('Psalm 23'), ['PSA.23']);
    assert.deepEqual(ids('Psalms 1, 23'), ['PSA.1', 'PSA.23']);
    assert.deepEqual(ids('Psalm 23; Proverbs 3'), ['PSA.23', 'PRO.3']);
    assert.deepEqual(ids('Matthew 5-6; Psalm 1;'), ['MAT.5', 'MAT.6', 'PSA.1']);
  });

  it('reads verses within a chapter', () => {
    assert.deepEqual(ids('John 3:16'), ['JHN.3.16']);
    assert.deepEqual(ids('John 3:1-21'), ['JHN.3.1-21']);
    assert.deepEqual(ids('John 3:1-3:21'), ['JHN.3.1-21']);
    const parsed = parsePassage('John 3:1-21');
    assert.equal(parsed.ok && parsed.parts[0]!.label, 'John 3:1-21');
  });

  it('runs a range across books', () => {
    assert.deepEqual(ids('Genesis 50 - Exodus 2'), ['GEN.50', 'EXO.1', 'EXO.2']);
    assert.deepEqual(ids('Obadiah 1 - Micah 1'), ['OBA.1', 'JON.1', 'JON.2', 'JON.3', 'JON.4', 'MIC.1']);
  });

  it('understands abbreviations and numbered books', () => {
    assert.deepEqual(ids('Gen 1'), ['GEN.1']);
    assert.deepEqual(ids('gen. 1'), ['GEN.1']);
    assert.deepEqual(ids('1 Cor 13'), ['1CO.13']);
    assert.deepEqual(ids('1Cor 13'), ['1CO.13']);
    assert.deepEqual(ids('I John 4'), ['1JN.4']);
    assert.deepEqual(ids('First John 4'), ['1JN.4']);
    assert.deepEqual(ids('2nd Kings 2'), ['2KI.2']);
    assert.deepEqual(ids('III John'), ['3JN.1']);
    assert.deepEqual(ids('Song of Solomon 2'), ['SNG.2']);
    assert.deepEqual(ids('Song of Songs 2'), ['SNG.2']);
  });

  it('treats single-chapter books sensibly', () => {
    assert.deepEqual(ids('Jude'), ['JUD.1']);
    assert.deepEqual(ids('Jude 1'), ['JUD.1']);
    assert.deepEqual(ids('Jude 5-10'), ['JUD.1.5-10']);
    assert.deepEqual(ids('Philemon'), ['PHM.1']);
  });

  it('removes repeats', () => {
    assert.deepEqual(ids('Psalm 23; Psalm 23'), ['PSA.23']);
  });

  it('explains what is wrong', () => {
    assert.equal(ids('Genisis 1'), `"Genisis" isn't a book of the Bible we recognise`);
    assert.equal(ids('Genesis 51'), "Genesis has 50 chapters, so there's no chapter 51");
    assert.equal(ids('Genesis 5-3'), '"Genesis 5-3": the first chapter must come before the last');
    assert.equal(ids('Genesis'), 'Add the chapters for Genesis, e.g. "Genesis 1"');
    assert.match(ids('John 3:36-4:2') as string, /runs across chapters.*"John 3-4"/);
    assert.match(ids('Exodus 2 - Genesis 1') as string, /Genesis must come after Exodus/);
    assert.match(ids('Passage 2099-01-05') as string, /isn't a book/);
    assert.match(ids('read chapter one') as string, /isn't a book|isn't a passage/);
    assert.match(ids(' ; ') as string, /Enter the passage/);
  });

  it(`refuses more than ${MAX_CHAPTERS_PER_DAY} chapters`, () => {
    assert.deepEqual((ids('Psalm 1-15') as string[]).length, 15);
    assert.match(ids('Psalm 1-150') as string, /150 chapters; a day's reading can have at most 15/);
  });

  it('knows all 66 books, in order', () => {
    assert.equal(BIBLE_BOOKS.length, 66);
    assert.equal(BIBLE_BOOKS[0]!.code, 'GEN');
    assert.equal(BIBLE_BOOKS[65]!.code, 'REV');
    assert.equal(BIBLE_BOOKS.reduce((n, b) => n + b.chapters, 0), 1189);
    for (const book of BIBLE_BOOKS) assert.equal(findBook(book.name)?.book.code, book.code);
  });
});
