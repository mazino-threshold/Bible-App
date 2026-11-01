import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { addDays } from '../../src/shared/time';
import {
  deleteTestData,
  insertCheckIns,
  insertReadings,
  insertUser,
  setNigeriaTime,
  startApi,
  userIdByEmail,
  type TestApi,
} from '../helpers/harness';

const P = 'test.reports.';
const W = '2099-01-05';
const day = (i: number) => addDays(W, i);

interface ReportUser {
  name: string;
  email: string;
  role: string;
  daysRead: number;
  checkedInDates: string[];
}
// The report includes real users too, so most checks look only at this test's users
const mine = (users: ReportUser[]) => users.filter((u) => u.email.startsWith(P));
const firstNames = (users: ReportUser[]) => mine(users).map((u) => u.name.split(' ')[0]).join(',');

describe('weekly report', () => {
  let api: TestApi;
  let adminToken: string;
  let userToken: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    setNigeriaTime(day(5)); // Saturday

    await insertReadings([0, 1, 2, 3, 4, 5].map(day));
    const users: [string, number[], string?][] = [
      ['Ada', [0, 1, 2, 3, 4, 5]],
      ['Bola', [0, 2, 3, 5]],
      ['Chidi', [1, 2, 3, 4]],
      ['Dayo', []],
      ['Late', [], '2099-01-20T09:00:00+01:00'], // registered after the week
    ];
    for (const [name, days, createdAt] of users) {
      const id = await insertUser(`${P}${name.toLowerCase()}@example.com`, { name: `${name} Test`, createdAt });
      await insertCheckIns(id, days.map(day));
    }

    adminToken = await api.signUp(`${P}admin@example.com`, 'Admin Test');
    await makeAdmin(`${P}admin@example.com`);
    await insertCheckIns(await userIdByEmail(`${P}admin@example.com`), [0, 1, 2, 3, 4].map(day));
    userToken = await api.signUp(`${P}plain@example.com`, 'Plain Test');
  });
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  it('is for admins only', async () => {
    assert.equal((await api.request('GET', `/admin/reports/weekly/${W}`, { token: userToken })).status, 403);
    assert.equal((await api.request('GET', `/admin/reports/weekly/${W}`)).status, 401);
  });

  it('lists everyone by days read, then name, admins included', async () => {
    const { report } = (await api.request('GET', `/admin/reports/weekly/${W}`, { token: adminToken })).body;
    assert.equal(report.daysScheduled, 6);
    assert.equal(report.weekEnd, day(5));
    assert.equal(
      mine(report.users).map((u) => `${u.name.split(' ')[0]}:${u.daysRead}`).join(' '),
      'Ada:6 Admin:5 Bola:4 Chidi:4 Dayo:0 Plain:0',
    );
    assert.ok(report.users.every((u: ReportUser, i: number, all: ReportUser[]) => i === 0 || all[i - 1]!.daysRead >= u.daysRead));
    assert.equal(report.users.find((u: ReportUser) => u.email === `${P}admin@example.com`).role, 'admin');
  });

  it('leaves out people who joined after the week', async () => {
    const { report } = (await api.request('GET', `/admin/reports/weekly/${W}`, { token: adminToken })).body;
    assert.ok(!report.users.some((u: ReportUser) => u.email === `${P}late@example.com`));
  });

  it('lists the dates each person checked in', async () => {
    const { report } = (await api.request('GET', `/admin/reports/weekly/${W}`, { token: adminToken })).body;
    const bola = report.users.find((u: ReportUser) => u.email === `${P}bola@example.com`);
    assert.deepEqual(bola.checkedInDates, [day(0), day(2), day(3), day(5)]);
  });

  it('summary counts everyone, even when filtered', async () => {
    const all = (await api.request('GET', `/admin/reports/weekly/${W}`, { token: adminToken })).body.report;
    assert.equal(all.summary.totalUsers, all.users.length);
    assert.equal(all.summary.readEveryDay, all.users.filter((u: ReportUser) => u.daysRead === 6).length);

    const filtered = (await api.request('GET', `/admin/reports/weekly/${W}?minDays=6`, { token: adminToken })).body.report;
    assert.deepEqual(filtered.summary, all.summary);
    assert.deepEqual(filtered.filters, { minDays: 6, maxDays: null });
  });

  it('filters by days read', async () => {
    const get = async (query: string) =>
      (await api.request('GET', `/admin/reports/weekly/${W}?${query}`, { token: adminToken })).body.report.users;
    assert.equal(firstNames(await get('minDays=6')), 'Ada');
    assert.equal(firstNames(await get('minDays=4&maxDays=5')), 'Admin,Bola,Chidi');
    assert.equal(firstNames(await get('maxDays=3')), 'Dayo,Plain');
  });

  it('rejects bad filters', async () => {
    const get = (query: string) => api.request('GET', `/admin/reports/weekly/${W}?${query}`, { token: adminToken });
    assert.equal((await get('minDays=5&maxDays=2')).body.details[0].message, 'minDays cannot be more than maxDays');
    assert.equal((await get('minDays=9')).status, 400);
    assert.equal((await get('minDays=abc')).status, 400);
    assert.equal((await api.request('GET', '/admin/reports/weekly/2099-01-06', { token: adminToken })).status, 400);
  });

  it('current report follows the clock, and on Sunday is the week just ended', async () => {
    assert.equal((await api.request('GET', '/admin/reports/weekly/current', { token: adminToken })).body.report.weekStart, W);
    setNigeriaTime(addDays(W, 6));
    assert.equal((await api.request('GET', '/admin/reports/weekly/current', { token: adminToken })).body.report.weekStart, W);
  });

  it('a week with nothing scheduled has nobody reading every day', async () => {
    const { report } = (await api.request('GET', '/admin/reports/weekly/2099-03-02', { token: adminToken })).body;
    assert.equal(report.daysScheduled, 0);
    assert.equal(report.summary.readEveryDay, 0);
  });
});
