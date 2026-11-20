import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { deleteTestData, pool, startApi, userIdByEmail, type TestApi } from '../helpers/harness';

const P = 'test.emaildomains.';
// Test domains under the reserved .example top-level domain, so no real domain is touched
const SPAM = 'spam-test.example';
const ALLOWED = 'mailinator.com';

describe('blocked email domains', () => {
  let api: TestApi;
  let adminToken: string;
  let memberToken: string;

  const register = (email: string) =>
    api.request('POST', '/auth/register', { body: { name: 'Domain Test', email, phone: '08030000000' } });
  const setRule = (domain: string, body: unknown, token = adminToken) =>
    api.request('PUT', `/admin/email-domains/${domain}`, { token, body });

  before(async () => {
    api = await startApi();
    await deleteTestData(P);
    await pool.query('DELETE FROM email_domain_rules WHERE domain IN ($1, $2)', [SPAM, ALLOWED]);

    adminToken = await api.signUp(`${P}admin@example.com`, 'Admin Test');
    await makeAdmin(`${P}admin@example.com`);
    memberToken = await api.signUp(`${P}member@example.com`, 'Member Test');
  });
  after(async () => {
    await pool.query('DELETE FROM email_domain_rules WHERE domain IN ($1, $2)', [SPAM, ALLOWED]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`${P}%`]);
    await deleteTestData(P);
    await api.close();
  });

  it('refuses sign-up with a disposable email, including subdomains', async () => {
    for (const email of [`${P}a@mailinator.com`, `${P}b@x.mailinator.com`, `${P}c@10MinuteMail.com`]) {
      const r = await register(email);
      assert.equal(r.status, 400, email);
      const message = "Sign-ups from this email provider aren't allowed. Please use a different email address";
      assert.equal(r.body.error, message);
      assert.deepEqual(r.body.details, [{ field: 'email', message }]);
    }
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE email LIKE $1 AND email LIKE '%mailinator.com'", [
      `${P}%`,
    ]);
    assert.equal(rowCount, 0);
  });

  it('managing rules is for admins only', async () => {
    assert.equal((await api.request('GET', '/admin/email-domains', { token: memberToken })).status, 403);
    assert.equal((await setRule(SPAM, { action: 'block' }, memberToken)).status, 403);
    assert.equal((await api.request('GET', '/admin/email-domains')).status, 401);
  });

  it('rejects a bad domain or action', async () => {
    assert.equal((await setRule('not a domain', { action: 'block' })).status, 400);
    assert.equal((await setRule(SPAM, { action: 'ban' })).status, 400);
  });

  it('an admin can block a domain, and its sign-ups are refused', async () => {
    assert.equal((await register(`${P}before@${SPAM}`)).status, 201);

    const r = await setRule(SPAM.toUpperCase(), { action: 'block', reason: 'Spam sign-ups' });
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.rule.domain, r.body.rule.action, r.body.rule.reason], [SPAM, 'block', 'Spam sign-ups']);

    assert.equal((await register(`${P}after@${SPAM}`)).status, 400);
    assert.equal((await register(`${P}sub@mx.${SPAM}`)).status, 400);
  });

  it('existing accounts on a blocked domain can still sign in', async () => {
    // Clear the code sent at sign-up so the once-a-minute limit doesn't apply
    await pool.query('DELETE FROM login_codes WHERE user_id = $1', [await userIdByEmail(`${P}before@${SPAM}`)]);
    const r =await api.request('POST', '/auth/request-code', { body: { email: `${P}before@${SPAM}` } });
    assert.equal(r.status, 200);
  });

  it("an admin can allow a domain from the disposable list", async () => {
    assert.equal((await setRule(ALLOWED, { action: 'allow', reason: 'Testing' })).status, 200);
    const r = await register(`${P}allowed@${ALLOWED}`);
    assert.equal(r.status, 201);
  });

  it('lists the rules and checks a domain', async () => {
    const list = await api.request('GET', '/admin/email-domains', { token: adminToken });
    const mine = list.body.rules.filter((r: { domain: string }) => [SPAM, ALLOWED].includes(r.domain));
    assert.equal(mine.length, 2);

    const check = await api.request('GET', `/admin/email-domains/check?email=someone@mx.${SPAM}`, { token: adminToken });
    assert.equal(check.status, 200);
    assert.deepEqual(check.body.check, { domain: `mx.${SPAM}`, blocked: true, source: 'admin_block', matched: SPAM });

    const listed = await api.request('GET', '/admin/email-domains/check?domain=10minutemail.com', { token: adminToken });
    assert.equal(listed.body.check.source, 'disposable_list');
  });

  it('removing a rule puts the domain back to the default', async () => {
    assert.equal((await api.request('DELETE', `/admin/email-domains/${SPAM}`, { token: adminToken })).status, 204);
    assert.equal((await api.request('DELETE', `/admin/email-domains/${SPAM}`, { token: adminToken })).status, 404);
    assert.equal((await register(`${P}again@${SPAM}`)).status, 201);
  });

  it('records which admin set the rule', async () => {
    const adminId = await userIdByEmail(`${P}admin@example.com`);
    const { rows } = await pool.query('SELECT created_by FROM email_domain_rules WHERE domain = $1', [ALLOWED]);
    assert.equal(rows[0].created_by, adminId);
  });
});
