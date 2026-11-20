import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  deleteTestData,
  fakeExpo,
  insertCheckIns,
  insertReadings,
  insertUser,
  pool,
  setNigeriaTime,
  startApi,
  type TestApi,
} from '../helpers/harness';

const P = 'test.reminders.';
const TODAY = '2099-01-07'; // Wednesday
const SECRET = process.env.CRON_SECRET!;
const tok = (name: string) => `ExponentPushToken[${name}]`;
const sorted = (tokens: string[]) => [...tokens].sort().join(',');

async function addUser(key: string, remindersEnabled: boolean, tokens: string[], checkedInToday = false) {
  const id = await insertUser(`${P}${key}@example.com`, { remindersEnabled });
  for (const t of tokens) await pool.query('INSERT INTO push_tokens (token, user_id) VALUES ($1, $2)', [tok(t), id]);
  if (checkedInToday) await insertCheckIns(id, [TODAY]);
  return id;
}

describe('reminders', () => {
  let api: TestApi;
  const run = async (body?: unknown) =>
    (await api.request('POST', '/internal/reminders/run', { headers: { 'X-Cron-Secret': SECRET }, body })).body.run;

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    await insertReadings([TODAY]);
    await pool.query("UPDATE readings SET passage = 'Genesis 1-3' WHERE reading_date = $1", [TODAY]);

    await addUser('on', true, ['on']);
    await addUser('off', false, ['off']);
    await addUser('read', true, ['read'], true); // already checked in today
    await addUser('notoken', true, []);
    await addUser('twophones', true, ['phoneA', 'phoneB-DEAD']);
    // Deactivated users get nothing, even if a device was somehow left registered
    const gone = await addUser('deactivated', true, ['deactivated']);
    await pool.query('UPDATE users SET deactivated_at = now() WHERE id = $1', [gone]);
  });
  beforeEach(() => fakeExpo.reset());
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  it('needs the cron secret', async () => {
    assert.equal((await api.request('POST', '/internal/reminders/run')).status, 401);
    const wrong = await api.request('POST', '/internal/reminders/run', { headers: { 'X-Cron-Secret': 'wrong-secret-0000000000' } });
    assert.equal(wrong.status, 401);
  });

  it('6 AM goes to everyone with reminders on who has not read today (5:50 counts)', async () => {
    setNigeriaTime(TODAY, '05:50');
    const result = await run();
    assert.equal(result.status, 'sent');
    assert.equal(result.hour, 6);
    assert.equal(sorted(fakeExpo.sentTo()), sorted([tok('on'), tok('phoneA'), tok('phoneB-DEAD')]));
    assert.deepEqual(
      { users: result.users, devices: result.devices, sent: result.sent, failed: result.failed },
      { users: 2, devices: 3, sent: 2, failed: 1 },
    );
  });

  it('sends the passage and data the app needs', async () => {
    // Re-run the 6 AM slot to see the message
    await pool.query('DELETE FROM reminder_runs WHERE reminder_date = $1 AND hour = 6', [TODAY]);
    setNigeriaTime(TODAY, '06:00');
    await run();
    const message = fakeExpo.calls[0]![0]!;
    assert.equal(message.title, "Good morning! Today's reading");
    assert.equal(message.body, 'Genesis 1-3');
    assert.deepEqual(message.data, { type: 'reading_reminder', date: TODAY });
  });

  it('removes devices Expo says are uninstalled', async () => {
    const { rowCount } = await pool.query('SELECT 1 FROM push_tokens WHERE token = $1', [tok('phoneB-DEAD')]);
    assert.equal(rowCount, 0);
  });

  it('never sends the same slot twice in a day', async () => {
    setNigeriaTime(TODAY, '06:10');
    const result = await run();
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'Already sent for this time today');
    assert.equal(fakeExpo.calls.length, 0);
  });

  it('ignores calls at any other time, including the old 9, 12, 15 and 18 slots', async () => {
    for (const time of ['07:00', '09:00', '12:00', '15:00', '18:00']) {
      setNigeriaTime(TODAY, time);
      assert.equal((await run()).reason, 'Not a reminder time', time);
    }
    assert.equal(fakeExpo.calls.length, 0);
  });

  it('only 6 and 21 can be forced outside production', async () => {
    const bad = await api.request('POST', '/internal/reminders/run', { headers: { 'X-Cron-Secret': SECRET }, body: { hour: 12 } });
    assert.equal(bad.status, 400);
  });

  it('sends to many devices in batches of 100', async () => {
    await addUser('bulk', true, Array.from({ length: 150 }, (_, i) => `bulk${i}`));
    setNigeriaTime(TODAY, '21:03');
    const result = await run();
    assert.equal(result.hour, 21);
    assert.deepEqual(fakeExpo.calls.map((c) => c.length), [100, 52]);
    assert.equal(result.sent, 152);
    assert.equal(fakeExpo.calls[0]![0]!.title, "Last call for today's reading");
  });

  it('if Expo is down, the run still finishes and counts failures', async () => {
    await pool.query('DELETE FROM reminder_runs WHERE reminder_date = $1 AND hour = 21', [TODAY]);
    fakeExpo.down = true;
    const result = await run({ hour: 21 });
    assert.equal(result.status, 'sent');
    assert.equal(result.sent, 0);
    assert.equal(result.failed, result.devices);
    assert.ok(result.devices > 0);
  });

  it('records each slot once', async () => {
    const { rows } = await pool.query<{ hour: number; finished: boolean }>(
      'SELECT hour, finished_at IS NOT NULL AS finished FROM reminder_runs WHERE reminder_date = $1 ORDER BY hour',
      [TODAY],
    );
    assert.deepEqual(rows.map((r) => r.hour), [6, 21]);
    assert.ok(rows.every((r) => r.finished));
  });

  it('skips days with no reading, and Sundays', async () => {
    setNigeriaTime('2099-01-08', '06:00'); // Thursday, nothing scheduled
    assert.equal((await run()).reason, 'No reading scheduled for today');
    setNigeriaTime('2099-01-11', '06:00'); // Sunday
    assert.equal((await run()).reason, 'No reminders on Sunday');
    assert.equal(fakeExpo.calls.length, 0);
  });
});

describe('push tokens', () => {
  let api: TestApi;
  let token: string;
  const EMAIL = `${P}tokens@example.com`;

  before(async () => {
    api = await startApi();
    await pool.query('DELETE FROM users WHERE email = $1', [EMAIL]);
    await insertUser(`${P}previous-owner@example.com`, {});
    await pool.query(
      `INSERT INTO push_tokens (token, user_id) SELECT $1, id FROM users WHERE email = $2`,
      [tok('shared-phone'), `${P}previous-owner@example.com`],
    );
    token = await api.signUp(EMAIL);
  });
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  it('rejects something that is not an Expo push token', async () => {
    const r = await api.request('POST', '/me/push-tokens', { token, body: { token: 'not-a-token' } });
    assert.equal(r.status, 400);
    assert.equal(r.body.details[0].message, 'Not a valid Expo push token');
  });

  it('registers a device, moving it from its previous owner', async () => {
    assert.equal((await api.request('POST', '/me/push-tokens', { token, body: { token: tok('shared-phone') } })).status, 204);
    const { rows } = await pool.query(
      'SELECT u.email FROM push_tokens t JOIN users u ON u.id = t.user_id WHERE t.token = $1',
      [tok('shared-phone')],
    );
    assert.equal(rows[0].email, EMAIL);
  });

  it('registering again is harmless', async () => {
    assert.equal((await api.request('POST', '/me/push-tokens', { token, body: { token: tok('shared-phone') } })).status, 204);
  });

  it('removes a device', async () => {
    assert.equal((await api.request('DELETE', '/me/push-tokens', { token, body: { token: tok('shared-phone') } })).status, 204);
    assert.equal((await pool.query('SELECT 1 FROM push_tokens WHERE token = $1', [tok('shared-phone')])).rowCount, 0);
  });

  it('needs sign-in', async () => {
    assert.equal((await api.request('POST', '/me/push-tokens', { body: { token: tok('x') } })).status, 401);
  });
});
