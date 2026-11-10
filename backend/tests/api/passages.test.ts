import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { deleteTestData, fakeYouVersion, pool, setNigeriaTime, startApi, type TestApi } from '../helpers/harness';

const P = 'test.passages.';
const MONDAY = '2099-01-05';
const WEDNESDAY = '2099-01-07';
const SUNDAY = '2099-01-11';
const NEXT_MONDAY = '2099-01-12';
const CRON = { 'X-Cron-Secret': 'test-cron-secret-1234567890' };

async function setReading(date: string, passage: string, notes: string | null = null) {
  await pool.query(
    `INSERT INTO readings (reading_date, passage, notes) VALUES ($1, $2, $3)
     ON CONFLICT (reading_date) DO UPDATE SET passage = EXCLUDED.passage, notes = EXCLUDED.notes`,
    [date, passage, notes],
  );
}

async function cachedDates(): Promise<string[]> {
  const { rows } = await pool.query<{ reading_date: string }>(
    "SELECT reading_date FROM passage_cache WHERE reading_date >= '2098-12-01' ORDER BY 1",
  );
  return rows.map((r) => r.reading_date);
}

describe('passages', () => {
  let api: TestApi;
  let token: string;
  let adminToken: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    token = await api.signUp(`${P}user@example.com`, 'Passage Reader');
    adminToken = await api.signUp(`${P}admin@example.com`, 'Passage Admin');
    await makeAdmin(`${P}admin@example.com`);
  });
  beforeEach(async () => {
    fakeYouVersion.reset();
    setNigeriaTime(WEDNESDAY);
    await pool.query("DELETE FROM readings WHERE reading_date >= '2098-12-01'"); // also empties their cached text
  });
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  it('requires sign-in', async () => {
    assert.equal((await api.request('GET', '/passages/today')).status, 401);
  });

  it('has nothing on Sundays or unscheduled days', async () => {
    const unscheduled = await api.request('GET', '/passages/today', { token });
    assert.equal(unscheduled.status, 404);
    assert.equal(unscheduled.body.error, 'No reading has been scheduled for today');

    setNigeriaTime(SUNDAY);
    const sunday = await api.request('GET', '/passages/today', { token });
    assert.equal(sunday.status, 404);
    assert.equal(sunday.body.error, "There's no reading on Sundays");
    assert.equal(fakeYouVersion.calls.length, 0);
  });

  it('fetches every chapter on the first request, then serves from the cache', async () => {
    await setReading(WEDNESDAY, 'Genesis 16-18', 'Focus on chapter 17');

    const first = await api.request('GET', '/passages/today', { token });
    assert.equal(first.status, 200);
    assert.deepEqual(fakeYouVersion.passageCalls().sort(), ['GEN.16', 'GEN.17', 'GEN.18']);
    const { passage } = first.body;
    assert.equal(passage.date, WEDNESDAY);
    assert.equal(passage.passage, 'Genesis 16-18');
    assert.equal(passage.notes, 'Focus on chapter 17');
    assert.deepEqual(passage.version, {
      id: 111,
      abbreviation: 'NIV',
      title: 'New International Version 2011',
      copyright: 'Test copyright notice',
    });
    // In reading order, whatever order YouVersion answered in
    assert.deepEqual(passage.chapters, [
      { id: 'GEN.16', reference: 'Reference GEN.16', html: '<div>Text of GEN.16</div>' },
      { id: 'GEN.17', reference: 'Reference GEN.17', html: '<div>Text of GEN.17</div>' },
      { id: 'GEN.18', reference: 'Reference GEN.18', html: '<div>Text of GEN.18</div>' },
    ]);

    fakeYouVersion.reset();
    setNigeriaTime(WEDNESDAY, '20:00');
    const later = await api.request('GET', '/passages/today', { token: adminToken });
    assert.equal(later.status, 200);
    assert.deepEqual(later.body.passage, passage);
    assert.equal(fakeYouVersion.calls.length, 0, 'served from the cache');
  });

  it('fetches once when many people open the app at the same moment', async () => {
    await setReading(WEDNESDAY, 'Psalm 23');
    const responses = await Promise.all(Array.from({ length: 5 }, () => api.request('GET', '/passages/today', { token })));
    assert.ok(responses.every((r) => r.status === 200));
    assert.deepEqual(fakeYouVersion.passageCalls(), ['PSA.23']);
  });

  it('fetches the new text when the admin changes the reading', async () => {
    await setReading(WEDNESDAY, 'Psalm 23');
    await api.request('GET', '/passages/today', { token });

    await setReading(WEDNESDAY, 'Psalm 24; John 3:1-21');
    fakeYouVersion.reset();
    const r = await api.request('GET', '/passages/today', { token });
    assert.equal(r.body.passage.passage, 'Psalm 24; John 3:1-21');
    assert.deepEqual(
      r.body.passage.chapters.map((c: { id: string }) => c.id),
      ['PSA.24', 'JHN.3.1-21'],
    );
    assert.equal(fakeYouVersion.passageCalls().length, 2);
  });

  it('says so when YouVersion is down, and caches nothing', async () => {
    await setReading(WEDNESDAY, 'Psalm 23');
    fakeYouVersion.down = true;
    const down = await api.request('GET', '/passages/today', { token });
    assert.equal(down.status, 503);
    assert.match(down.body.error, /couldn't be loaded right now/);
    assert.deepEqual(await cachedDates(), []);

    fakeYouVersion.down = false;
    assert.equal((await api.request('GET', '/passages/today', { token })).status, 200);
  });

  it("explains a reading that can't be fetched", async () => {
    // Saved straight into the database, as older readings were, before the admin form checked passages
    await setReading(WEDNESDAY, 'Read chapter one');
    const unreadable = await api.request('GET', '/passages/today', { token });
    assert.equal(unreadable.status, 422);
    assert.match(unreadable.body.error, /couldn't be understood/);

    await setReading(WEDNESDAY, 'John 3:1-99');
    fakeYouVersion.missing = ['JHN.3.1-99'];
    const missing = await api.request('GET', '/passages/today', { token });
    assert.equal(missing.status, 422);
    assert.match(missing.body.error, /couldn't be found in this Bible version/);
  });

  it('clears the week on Sunday (cron job only)', async () => {
    for (const [date, passage] of [
      [MONDAY, 'Genesis 1'],
      [WEDNESDAY, 'Genesis 3'],
    ] as const) {
      await setReading(date, passage);
      setNigeriaTime(date);
      assert.equal((await api.request('GET', '/passages/today', { token })).status, 200);
    }
    assert.deepEqual(await cachedDates(), [MONDAY, WEDNESDAY]);

    setNigeriaTime(SUNDAY, '23:00');
    assert.equal((await api.request('POST', '/internal/passage-cache/clear')).status, 401);
    const cleared = await api.request('POST', '/internal/passage-cache/clear', { headers: CRON });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.date, SUNDAY);
    assert.ok(cleared.body.daysCleared >= 2);
    assert.deepEqual(await cachedDates(), []);
  });

  it('drops last week if the Sunday clear was missed', async () => {
    await setReading(WEDNESDAY, 'Genesis 3');
    await api.request('GET', '/passages/today', { token });

    await setReading(NEXT_MONDAY, 'Genesis 4');
    setNigeriaTime(NEXT_MONDAY);
    await api.request('GET', '/passages/today', { token });
    assert.deepEqual(await cachedDates(), [NEXT_MONDAY]);
  });
});
