import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { addDays } from '../../src/shared/time';
import {
  deleteTestData,
  insertCheckIns,
  insertReadings,
  setNigeriaTime,
  startApi,
  userIdByEmail,
  type TestApi,
} from '../helpers/harness';

const P = 'test.checkins.';
const W2 = '2099-01-05'; // Monday
const W1 = addDays(W2, -7); // the Monday before
const d = (week: string, i: number) => addDays(week, i); // 0 = Monday ... 5 = Saturday

type Day = { status: string; canToggle: boolean };
const statuses = (days: Day[]) => days.map((x) => x.status).join(',');

describe('check-ins and streaks', () => {
  let api: TestApi;
  let token: string;
  let adminToken: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    setNigeriaTime(d(W2, 2)); // Wednesday of week 2

    token = await api.signUp(`${P}user@example.com`);
    adminToken = await api.signUp(`${P}admin@example.com`);
    await makeAdmin(`${P}admin@example.com`);

    // Week 1: no reading on Wednesday (admin forgot). Week 2: no reading on Thursday.
    await insertReadings([0, 1, 3, 4, 5].map((i) => d(W1, i)).concat([0, 1, 2, 4, 5].map((i) => d(W2, i))));
    // Past check-ins: week 1 Tue, Thu, Fri, Sat (missed Monday). Week 2 Mon, Tue.
    await insertCheckIns(await userIdByEmail(`${P}user@example.com`), [d(W1, 1), d(W1, 3), d(W1, 4), d(W1, 5), d(W2, 0), d(W2, 1)]);
  });
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  it('needs sign-in', async () => {
    assert.equal((await api.request('GET', '/check-ins/week')).status, 401);
  });

  it('shows each day of this week with its status', async () => {
    const { week } = (await api.request('GET', '/check-ins/week', { token })).body;
    assert.equal(week.today, d(W2, 2));
    assert.equal(week.weekStart, W2);
    assert.equal(statuses(week.days), 'read,read,pending,upcoming,upcoming,upcoming');
    assert.deepEqual(week.days.map((x: Day) => x.canToggle), [false, false, true, false, false, false]);
    assert.equal(week.daysRead, 2);
  });

  it('streak skips Sunday and unscheduled days, and today pending does not break it', async () => {
    // Week 2 Tue, Mon, week 1 Sat, Fri, Thu, (Wed unscheduled), Tue = 6; week 1 Monday was missed
    const { week } = (await api.request('GET', '/check-ins/week', { token })).body;
    assert.equal(week.streak, 6);
  });

  it('checks in today and the streak goes up', async () => {
    const r = await api.request('POST', '/check-ins/today', { token });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { date: d(W2, 2), checkedIn: true, streak: 7 });
  });

  it('checking in twice is harmless', async () => {
    const r = await api.request('POST', '/check-ins/today', { token });
    assert.equal(r.body.streak, 7);
  });

  it('today then shows read and can still be unticked', async () => {
    const { week } = (await api.request('GET', '/check-ins/week', { token })).body;
    assert.equal(week.days[2].status, 'read');
    assert.equal(week.days[2].canToggle, true);
    assert.equal(week.daysRead, 3);
  });

  it('unticks today', async () => {
    const r = await api.request('DELETE', '/check-ins/today', { token });
    assert.deepEqual(r.body, { date: d(W2, 2), checkedIn: false, streak: 6 });
    assert.equal((await api.request('DELETE', '/check-ins/today', { token })).status, 200);
  });

  it('past weeks show read / missed / no_reading and nothing can be changed', async () => {
    const { week } = (await api.request('GET', `/check-ins/weeks/${W1}`, { token })).body;
    assert.equal(statuses(week.days), 'missed,read,no_reading,read,read,read');
    assert.ok(week.days.every((x: Day) => !x.canToggle));
  });

  it('cannot check in on a day with no reading', async () => {
    setNigeriaTime(d(W2, 3)); // Thursday
    const r = await api.request('POST', '/check-ins/today', { token });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'No reading has been scheduled for today');
  });

  it("yesterday's untick is now a missed day and resets the streak", async () => {
    const { week } = (await api.request('GET', '/check-ins/week', { token })).body;
    assert.equal(week.days[2].status, 'missed');
    assert.equal(week.days[3].status, 'no_reading');
    assert.equal(week.streak, 0);
  });

  it('streak restarts at 1', async () => {
    setNigeriaTime(d(W2, 4)); // Friday
    assert.equal((await api.request('POST', '/check-ins/today', { token })).body.streak, 1);
  });

  it('no check-in on Sunday; the week view shows the week just ended', async () => {
    setNigeriaTime(addDays(W2, 6));
    const r = await api.request('POST', '/check-ins/today', { token });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "There's no reading on Sundays");
    const { week } = (await api.request('GET', '/check-ins/week', { token })).body;
    assert.equal(week.weekStart, W2);
    assert.ok(week.days.every((x: Day) => !x.canToggle));
    assert.equal(week.days[5].status, 'missed');
  });

  it('admins check in for themselves like anyone else', async () => {
    setNigeriaTime(d(W2, 5));
    const r = await api.request('POST', '/check-ins/today', { token: adminToken });
    assert.equal(r.body.checkedIn, true);
  });

  it('weekStart must be a Monday', async () => {
    assert.equal((await api.request('GET', '/check-ins/weeks/2099-01-06', { token })).status, 400);
  });
});
