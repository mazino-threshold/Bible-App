import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { addDays } from '../../src/shared/time';
import {
  deleteTestData,
  insertUser,
  lastLoginCode,
  pool,
  setNigeriaTime,
  startApi,
  userIdByEmail,
  type TestApi,
} from '../helpers/harness';

const P = 'test.adminusers.';
const W = '2099-01-05'; // a Monday
const day = (i: number) => addDays(W, i);

interface AdminUser {
  id: string;
  email: string;
  active: boolean;
  deactivatedAt: string | null;
  deactivationReason: string | null;
}
const mine = (users: AdminUser[]) => users.filter((u) => u.email.startsWith(P));

/** Writes a status change straight into the history, at a given Nigeria time. */
async function statusChange(userId: string, action: 'deactivated' | 'reactivated', at: string) {
  await pool.query('INSERT INTO user_status_changes (user_id, action, changed_at) VALUES ($1, $2, $3)', [
    userId,
    action,
    `${at}+01:00`,
  ]);
  await pool.query('UPDATE users SET deactivated_at = $2 WHERE id = $1', [
    userId,
    action === 'deactivated' ? `${at}+01:00` : null,
  ]);
}

describe('admin: deactivate and reactivate users', () => {
  let api: TestApi;
  let adminToken: string;
  let adminId: string;
  let ifeToken: string;
  let ifeId: string;
  const PUSH_TOKEN = 'ExponentPushToken[adminusers-ife]';

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    setNigeriaTime(day(2)); // Wednesday

    adminToken = await api.signUp(`${P}admin@example.com`, 'Admin Test');
    await makeAdmin(`${P}admin@example.com`);
    adminId = await userIdByEmail(`${P}admin@example.com`);

    ifeToken = await api.signUp(`${P}ife@example.com`, 'Ife Test');
    ifeId = await userIdByEmail(`${P}ife@example.com`);
    await api.request('POST', '/me/push-tokens', { token: ifeToken, body: { token: PUSH_TOKEN } });
  });
  after(async () => {
    await deleteTestData(P);
    await api.close();
  });

  const deactivate = (id: string, body?: unknown, token = adminToken) =>
    api.request('POST', `/admin/users/${id}/deactivate`, { token, body });
  const reactivate = (id: string, body?: unknown, token = adminToken) =>
    api.request('POST', `/admin/users/${id}/reactivate`, { token, body });
  const list = async (query = '') =>
    mine((await api.request('GET', `/admin/users${query}`, { token: adminToken })).body.users);

  it('is for admins only', async () => {
    assert.equal((await api.request('GET', '/admin/users', { token: ifeToken })).status, 403);
    assert.equal((await deactivate(adminId, undefined, ifeToken)).status, 403);
    assert.equal((await api.request('GET', '/admin/users')).status, 401);
  });

  it('lists everyone as active to begin with', async () => {
    const users = await list();
    assert.equal(users.length, 2);
    assert.ok(users.every((u) => u.active && u.deactivatedAt === null));
  });

  it('rejects a bad or unknown user id, and deactivating yourself', async () => {
    assert.equal((await deactivate('not-a-uuid')).status, 400);
    assert.equal((await deactivate('00000000-0000-4000-8000-000000000000')).status, 404);
    const self = await deactivate(adminId);
    assert.equal(self.status, 400);
    assert.equal(self.body.error, "You can't deactivate your own account");
  });

  it('deactivates a user with a reason', async () => {
    const r = await deactivate(ifeId, { reason: 'Missed three weeks' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.active, false);
    assert.equal(r.body.user.deactivationReason, 'Missed three weeks');
    assert.ok(r.body.user.deactivatedAt);
  });

  it('signs them out and removes their devices', async () => {
    assert.equal((await api.request('GET', '/me', { token: ifeToken })).status, 401);
    const { rowCount } = await pool.query('SELECT 1 FROM push_tokens WHERE token = $1', [PUSH_TOKEN]);
    assert.equal(rowCount, 0);
  });

  it('stops them signing in again', async () => {
    const message = 'Your account has been deactivated. Please contact an admin to reactivate it';
    const requested = await api.request('POST', '/auth/request-code', { body: { email: `${P}ife@example.com` } });
    assert.equal(requested.status, 403);
    assert.equal(requested.body.error, message);
    const verified = await api.request('POST', '/auth/verify-code', {
      body: { email: `${P}ife@example.com`, code: lastLoginCode() },
    });
    assert.equal(verified.status, 403);
  });

  it('deactivating twice is harmless and keeps the first reason', async () => {
    const r = await deactivate(ifeId, { reason: 'Something else' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.deactivationReason, 'Missed three weeks');
  });

  it('filters the list by status', async () => {
    assert.deepEqual((await list('?status=deactivated')).map((u) => u.id), [ifeId]);
    assert.deepEqual((await list('?status=active')).map((u) => u.id), [adminId]);
    assert.equal((await api.request('GET', '/admin/users?status=gone', { token: adminToken })).status, 400);
  });

  it('reactivates them, and they can sign in again', async () => {
    const r = await reactivate(ifeId, { reason: 'Back from travel' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.active, true);
    assert.equal(r.body.user.deactivationReason, null);

    // Codes sent before deactivating were retired; clear them so the once-a-minute limit doesn't apply
    await pool.query('DELETE FROM login_codes WHERE user_id = $1', [ifeId]);
    const requested = await api.request('POST', '/auth/request-code', { body: { email: `${P}ife@example.com` } });
    assert.equal(requested.status, 200);
    const verified = await api.request('POST', '/auth/verify-code', {
      body: { email: `${P}ife@example.com`, code: lastLoginCode() },
    });
    assert.equal(verified.status, 200);
  });

  it('reactivating an active user is harmless', async () => {
    assert.equal((await reactivate(ifeId)).status, 200);
  });

  it('keeps a history of every change', async () => {
    const { rows } = await pool.query(
      'SELECT action, reason, changed_by FROM user_status_changes WHERE user_id = $1 ORDER BY changed_at',
      [ifeId],
    );
    assert.deepEqual(rows, [
      { action: 'deactivated', reason: 'Missed three weeks', changed_by: adminId },
      { action: 'reactivated', reason: 'Back from travel', changed_by: adminId },
    ]);
  });

  describe('weekly report', () => {
    before(async () => {
      const created = '2099-01-01T09:00:00+01:00';
      const away = await insertUser(`${P}away@example.com`, { name: 'Away Test', createdAt: created });
      await statusChange(away, 'deactivated', '2099-01-03T10:00:00'); // before the week, never back

      const midweek = await insertUser(`${P}midweek@example.com`, { name: 'Midweek Test', createdAt: created });
      await statusChange(midweek, 'deactivated', `${day(2)}T10:00:00`); // left on Wednesday

      const back = await insertUser(`${P}back@example.com`, { name: 'Back Test', createdAt: created });
      await statusChange(back, 'deactivated', '2099-01-03T10:00:00');
      await statusChange(back, 'reactivated', `${day(3)}T10:00:00`); // came back on Thursday

      const later = await insertUser(`${P}later@example.com`, { name: 'Later Test', createdAt: created });
      await statusChange(later, 'deactivated', `${day(6)}T10:00:00`); // left on Sunday, after the week
    });

    it('leaves out only people who were deactivated for the whole week', async () => {
      const { report } = (await api.request('GET', `/admin/reports/weekly/${W}`, { token: adminToken })).body;
      const status = mine(report.users)
        .map((u) => `${u.email.slice(P.length).split('@')[0]}:${u.active ? 'active' : 'deactivated'}`)
        .sort()
        .join(' ');
      assert.equal(status, 'admin:active back:active ife:active later:deactivated midweek:deactivated');
    });

    it('leaves them out of the following week too', async () => {
      const { report } = (await api.request('GET', `/admin/reports/weekly/${addDays(W, 7)}`, { token: adminToken })).body;
      const emails = mine(report.users).map((u) => u.email.slice(P.length).split('@')[0]);
      assert.ok(!emails.includes('midweek') && !emails.includes('later') && !emails.includes('away'));
      assert.ok(emails.includes('back'));
    });
  });
});
