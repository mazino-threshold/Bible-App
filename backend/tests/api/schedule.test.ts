import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { pool, deleteTestData, setNigeriaTime, startApi, type TestApi } from '../helpers/harness';

const P = 'test.schedule.';
const WEEK = '2099-01-05'; // a Monday
const NEXT_WEEK = '2099-01-12';

/** A full week form: { monday: { passage: 'Psalm 1' }, ... }. Monday also has notes with spaces around them. */
function weekForm(prefix: string) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return Object.fromEntries(
    days.map((d, i) => [d, { passage: `${prefix} ${i + 1}`, ...(i === 0 ? { notes: '  Note for Monday  ' } : {}) }]),
  );
}

describe('schedule', () => {
  let api: TestApi;
  let adminToken: string;
  let userToken: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    setNigeriaTime('2099-01-07'); // Wednesday of WEEK
    adminToken = await api.signUp(`${P}admin@example.com`, 'Schedule Admin');
    await makeAdmin(`${P}admin@example.com`);
    userToken = await api.signUp(`${P}user@example.com`, 'Schedule User');
  });
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  it('only admins can save or list weeks', async () => {
    assert.equal((await api.request('PUT', `/admin/schedule/weeks/${NEXT_WEEK}`, { token: userToken, body: weekForm('Psalm') })).status, 403);
    assert.equal((await api.request('GET', '/admin/schedule/weeks', { token: userToken })).status, 403);
  });

  it('requires all six days', async () => {
    const form = weekForm('Psalm');
    delete form.saturday;
    const r = await api.request('PUT', `/admin/schedule/weeks/${NEXT_WEEK}`, { token: adminToken, body: form });
    assert.equal(r.status, 400);
    assert.deepEqual(r.body.details, [{ field: 'saturday', message: "Enter this day's reading" }]);
  });

  it('requires weekStart to be a real Monday', async () => {
    const tuesday = await api.request('PUT', '/admin/schedule/weeks/2099-01-06', { token: adminToken, body: weekForm('Psalm') });
    assert.equal(tuesday.status, 400);
    assert.equal(tuesday.body.details[0].message, 'weekStart must be a Monday');
    const impossible = await api.request('PUT', '/admin/schedule/weeks/2026-02-30', { token: adminToken, body: weekForm('Psalm') });
    assert.equal(impossible.body.details[0].message, 'Not a real date');
  });

  it('locks weeks that have ended', async () => {
    const r = await api.request('PUT', '/admin/schedule/weeks/2098-12-29', { token: adminToken, body: weekForm('Psalm') });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /already ended/);
  });

  it('saves the current week (it has not ended yet)', async () => {
    const r = await api.request('PUT', `/admin/schedule/weeks/${WEEK}`, { token: adminToken, body: weekForm('Psalm') });
    assert.equal(r.status, 200);
    assert.ok(r.body.week.days.every((d: { passage: string }) => d.passage));
    assert.equal(r.body.week.weekEnd, '2099-01-10');
    assert.equal(r.body.week.days[0].notes, 'Note for Monday');
    assert.equal(r.body.week.days[1].notes, null);
  });

  it('saving again replaces the week', async () => {
    const r = await api.request('PUT', `/admin/schedule/weeks/${WEEK}`, { token: adminToken, body: weekForm('Proverbs') });
    assert.equal(r.body.week.days[5].passage, 'Proverbs 6');
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM readings WHERE reading_date BETWEEN $1 AND '2099-01-10'", [WEEK]);
    assert.equal(rows[0].n, 6);
  });

  it('any signed-in user can view a week', async () => {
    const r = await api.request('GET', `/schedule/weeks/${WEEK}`, { token: userToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.week.days[0].day, 'monday');
    assert.equal(r.body.week.days[0].date, WEEK);
    assert.equal(r.body.week.days[0].passage, 'Proverbs 1');
  });

  it('shows empty days for a week not scheduled yet', async () => {
    const r = await api.request('GET', '/schedule/weeks/2099-03-02', { token: userToken });
    assert.ok(r.body.week.days.every((d: { passage: string | null }) => d.passage === null));
  });

  it('current week follows the clock, and on Sunday is the week just ended', async () => {
    assert.equal((await api.request('GET', '/schedule/current', { token: userToken })).body.week.weekStart, WEEK);
    setNigeriaTime('2099-01-11'); // Sunday
    assert.equal((await api.request('GET', '/schedule/current', { token: userToken })).body.week.weekStart, WEEK);
    setNigeriaTime('2099-01-07');
  });

  it('needs sign-in to view', async () => {
    assert.equal((await api.request('GET', '/schedule/current')).status, 401);
  });

  it('admin list shows the week with 6 days filled', async () => {
    const r = await api.request('GET', '/admin/schedule/weeks', { token: adminToken });
    const week = r.body.weeks.find((w: { weekStart: string }) => w.weekStart === WEEK);
    assert.deepEqual(week, { weekStart: WEEK, weekEnd: '2099-01-10', daysScheduled: 6 });
  });
});
