import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { DELETED_ACCOUNT_RETENTION_DAYS } from '../../src/modules/users/users.constants';
import { addDays } from '../../src/shared/time';
import {
  deleteTestData,
  emailSubjectsTo,
  fakeExpo,
  insertCheckIns,
  insertReadings,
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

describe('deleting accounts', () => {
  const D = 'test.deleteusers.';
  const DW = '2099-02-02'; // a Monday
  let api: TestApi;
  let adminToken: string;
  let adminId: string;
  const ADMIN_PUSH = 'ExponentPushToken[deleteusers-admin]';

  /** Signs up a member with two check-ins and a push token, and returns their token and id. */
  async function member(slug: string) {
    const token = await api.signUp(`${D}${slug}@example.com`, `${slug} Test`);
    const id = await userIdByEmail(`${D}${slug}@example.com`);
    await api.request('POST', '/me/push-tokens', { token, body: { token: `ExponentPushToken[deleteusers-${slug}]` } });
    await insertCheckIns(id, [addDays(DW, 1), DW]);
    return { token, id };
  }

  const archived = async (id: string) => (await pool.query('SELECT * FROM deleted_users WHERE id = $1', [id])).rows[0];
  const exists = async (id: string) => ((await pool.query('SELECT 1 FROM users WHERE id = $1', [id])).rowCount ?? 0) > 0;

  before(async () => {
    api = await startApi();
    await deleteTestData(D);
    setNigeriaTime(addDays(DW, 2)); // Wednesday
    await insertReadings([DW, addDays(DW, 1)]);

    adminToken = await api.signUp(`${D}admin@example.com`, 'Admin Test');
    await makeAdmin(`${D}admin@example.com`);
    adminId = await userIdByEmail(`${D}admin@example.com`);
    await api.request('POST', '/me/push-tokens', { token: adminToken, body: { token: ADMIN_PUSH } });
  });
  beforeEach(() => fakeExpo.reset());
  after(async () => {
    await deleteTestData(D);
    await api.close();
  });

  describe('a user deletes their own account', () => {
    let ada: { token: string; id: string };
    let response: { status: number; body: any };

    before(async () => {
      ada = await member('ada');
      fakeExpo.reset();
      response = await api.request('DELETE', '/me', { token: ada.token, body: { reason: 'Too busy this year' } });
    });

    it('tells them when it will be erased for good', () => {
      assert.equal(response.status, 200);
      const { deletedAt, purgeAfter } = response.body.deletion;
      const days = (Date.parse(purgeAfter) - Date.parse(deletedAt)) / 86_400_000;
      assert.equal(Math.round(days), DELETED_ACCOUNT_RETENTION_DAYS);
    });

    it('signs them out and removes them and their devices', async () => {
      assert.equal((await api.request('GET', '/me', { token: ada.token })).status, 401);
      assert.equal(await exists(ada.id), false);
      assert.equal((await pool.query('SELECT 1 FROM check_ins WHERE user_id = $1', [ada.id])).rowCount, 0);
      const { rowCount } = await pool.query("SELECT 1 FROM push_tokens WHERE token LIKE '%deleteusers-ada%'");
      assert.equal(rowCount, 0);
    });

    it('holds a copy, with their check-ins, until it is erased', async () => {
      const row = await archived(ada.id);
      assert.equal(row.email, `${D}ada@example.com`);
      assert.equal(row.requested_by, 'user');
      assert.equal(row.deleted_by, null);
      assert.equal(row.deletion_reason, 'Too busy this year');
      assert.deepEqual(row.check_ins, [DW, addDays(DW, 1)]);
    });

    it('emails them, and tells the admins by email and push', () => {
      assert.ok(emailSubjectsTo(`${D}ada@example.com`).some((s) => s.includes('account has been deleted')));
      assert.ok(emailSubjectsTo(`${D}admin@example.com`).some((s) => s.includes('ada Test deleted their')));
      assert.ok(fakeExpo.sentTo().includes(ADMIN_PUSH));
    });

    it('shows up in the admin list of deleted accounts', async () => {
      const r = await api.request('GET', '/admin/deleted-users', { token: adminToken });
      assert.equal(r.status, 200);
      const listed = r.body.users.find((u: { id: string }) => u.id === ada.id);
      assert.equal(listed.requestedBy, 'user');
      assert.equal(listed.checkInCount, 2);
      assert.ok(listed.purgeAfter);
    });
  });

  describe('an admin deletes an account', () => {
    let tunde: { token: string; id: string };
    let ola: { token: string; id: string };

    before(async () => {
      tunde = await member('tunde');
      ola = await member('ola');
      await api.request('POST', `/admin/users/${tunde.id}/deactivate`, { token: adminToken, body: { reason: 'Left' } });
    });

    const remove = (id: string, body?: unknown, token = adminToken) =>
      api.request('DELETE', `/admin/users/${id}`, { token, body });

    it('is for admins only', async () => {
      assert.equal((await remove(tunde.id, undefined, ola.token)).status, 403);
      assert.equal((await api.request('DELETE', `/admin/users/${tunde.id}`)).status, 401);
      assert.equal((await api.request('GET', '/admin/deleted-users', { token: ola.token })).status, 403);
    });

    it('rejects a bad or unknown id, and deleting yourself here', async () => {
      assert.equal((await remove('not-a-uuid')).status, 400);
      assert.equal((await remove('00000000-0000-4000-8000-000000000000')).status, 404);
      assert.equal((await remove(adminId)).status, 400);
    });

    it('deletes them, keeps a copy, and emails them but not the admins', async () => {
      const r = await remove(tunde.id, { reason: 'Asked by WhatsApp' });
      assert.equal(r.status, 200);
      assert.equal(r.body.user.requestedBy, 'admin');
      assert.equal(r.body.user.deletedBy, adminId);
      assert.equal(await exists(tunde.id), false);

      const row = await archived(tunde.id);
      assert.equal(row.deactivation_reason, 'Left');
      assert.equal(row.status_changes.length, 1);
      assert.equal(row.status_changes[0].changedBy, adminId);

      assert.ok(emailSubjectsTo(`${D}tunde@example.com`).some((s) => s.includes('account has been deleted')));
      assert.ok(!emailSubjectsTo(`${D}admin@example.com`).some((s) => s.includes('tunde Test')));
      assert.equal(fakeExpo.calls.length, 0);
    });

    it('deleting twice says not found', async () => {
      assert.equal((await remove(tunde.id)).status, 404);
    });

    it('restores the account with its check-ins and history', async () => {
      const r = await api.request('POST', `/admin/deleted-users/${tunde.id}/restore`, { token: adminToken });
      assert.equal(r.status, 200);
      assert.equal(r.body.user.id, tunde.id);
      assert.equal(r.body.user.active, false); // was deactivated when deleted
      assert.equal(await archived(tunde.id), undefined);
      const checkIns = await pool.query('SELECT 1 FROM check_ins WHERE user_id = $1', [tunde.id]);
      assert.equal(checkIns.rowCount, 2);
      const history = await pool.query('SELECT changed_by FROM user_status_changes WHERE user_id = $1', [tunde.id]);
      assert.deepEqual(history.rows, [{ changed_by: adminId }]);
    });

    it("won't restore if the email has been registered again", async () => {
      await remove(ola.id);
      await api.signUp(`${D}ola@example.com`, 'Ola Again');
      const r = await api.request('POST', `/admin/deleted-users/${ola.id}/restore`, { token: adminToken });
      assert.equal(r.status, 409);
      assert.ok(await archived(ola.id)); // still held
    });
  });

  describe('erasing for good', () => {
    it('erases held accounts once their time is up, and they can no longer be restored', async () => {
      const kemi = await member('kemi');
      await api.request('DELETE', '/me', { token: kemi.token });
      await pool.query("UPDATE deleted_users SET purge_after = now() - interval '1 minute' WHERE id = $1", [kemi.id]);

      const r = await api.request('POST', `/admin/deleted-users/${kemi.id}/restore`, { token: adminToken });
      assert.equal(r.status, 404);
      assert.equal(await archived(kemi.id), undefined);
    });

    it('runs alongside the existing cron jobs', async () => {
      const bayo = await member('bayo');
      await api.request('DELETE', '/me', { token: bayo.token });
      await pool.query("UPDATE deleted_users SET purge_after = now() - interval '1 minute' WHERE id = $1", [bayo.id]);

      const r = await api.request('POST', '/internal/passage-cache/clear', {
        headers: { 'x-cron-secret': 'test-cron-secret-1234567890' },
      });
      assert.equal(r.status, 200);
      assert.equal(await archived(bayo.id), undefined);
    });
  });
});

describe('admin: changing roles', () => {
  const R = 'test.roles.';
  let api: TestApi;
  let adminToken: string;
  let adminId: string;
  let ngoziToken: string;
  let ngoziId: string;
  let emekaId: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(R);

    adminToken = await api.signUp(`${R}admin@example.com`, 'Admin Test');
    await makeAdmin(`${R}admin@example.com`);
    adminId = await userIdByEmail(`${R}admin@example.com`);

    ngoziToken = await api.signUp(`${R}ngozi@example.com`, 'Ngozi Test');
    ngoziId = await userIdByEmail(`${R}ngozi@example.com`);
    emekaId = await insertUser(`${R}emeka@example.com`, { name: 'Emeka Test' });
  });
  after(async () => {
    await deleteTestData(R);
    await api.close();
  });

  const setRole = (id: string, body: unknown, token = adminToken) =>
    api.request('PUT', `/admin/users/${id}/role`, { token, body });

  it('is for admins only', async () => {
    assert.equal((await setRole(ngoziId, { role: 'admin' }, ngoziToken)).status, 403);
    assert.equal((await api.request('PUT', `/admin/users/${ngoziId}/role`, { body: { role: 'admin' } })).status, 401);
  });

  it('rejects a bad id or role, an unknown user, and changing your own role', async () => {
    assert.equal((await setRole('not-a-uuid', { role: 'admin' })).status, 400);
    assert.equal((await setRole(ngoziId, { role: 'owner' })).status, 400);
    assert.equal((await setRole(ngoziId, {})).status, 400);
    assert.equal((await setRole('00000000-0000-4000-8000-000000000000', { role: 'admin' })).status, 404);
    const self = await setRole(adminId, { role: 'user' });
    assert.equal(self.status, 400);
    assert.equal(self.body.error, "You can't change your own admin access. Ask another admin to do it");
  });

  it('makes someone an admin, effective on their next request, and emails them', async () => {
    const r = await setRole(ngoziId, { role: 'admin' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, 'admin');
    assert.equal(r.body.user.active, true);
    // Same session, no new sign-in
    assert.equal((await api.request('GET', '/admin/users', { token: ngoziToken })).status, 200);
    assert.ok(emailSubjectsTo(`${R}ngozi@example.com`).some((s) => s.includes("You're now an admin")));
  });

  it('setting the same role again is harmless', async () => {
    const r = await setRole(ngoziId, { role: 'admin' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, 'admin');
  });

  it('removes admin access, effective on their next request', async () => {
    const r = await setRole(ngoziId, { role: 'user' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, 'user');
    assert.equal((await api.request('GET', '/admin/users', { token: ngoziToken })).status, 403);
    assert.ok(emailSubjectsTo(`${R}ngozi@example.com`).some((s) => s.includes('admin access has been removed')));
  });

  it("won't make a deactivated member an admin, but can remove admin from a deactivated admin", async () => {
    await setRole(emekaId, { role: 'admin' });
    await api.request('POST', `/admin/users/${emekaId}/deactivate`, { token: adminToken });

    const demoted = await setRole(emekaId, { role: 'user' });
    assert.equal(demoted.status, 200);
    assert.equal(demoted.body.user.role, 'user');

    const promoted = await setRole(emekaId, { role: 'admin' });
    assert.equal(promoted.status, 400);
    assert.equal(promoted.body.error, 'Reactivate them before making them an admin');
  });

  it('says not found for a deleted user', async () => {
    await api.request('DELETE', `/admin/users/${emekaId}`, { token: adminToken });
    assert.equal((await setRole(emekaId, { role: 'admin' })).status, 404);
  });
});
