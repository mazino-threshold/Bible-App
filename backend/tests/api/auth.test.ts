import '../helpers/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeAdmin } from '../../src/modules/users/commands/make-admin.command';
import { deleteTestData, lastLoginCode, pool, startApi, type TestApi } from '../helpers/harness';

const P = 'test.auth.';
const EMAIL = `${P}Ada@Example.com`;

describe('auth and profile', () => {
  let api: TestApi;
  let token: string;
  let firstCode: string;

  before(async () => {
    api = await startApi();
    await deleteTestData(P.toLowerCase());
  });
  after(async () => {
    await deleteTestData(P.toLowerCase());
    await api.close();
  });

  it('rejects invalid registration details', async () => {
    const r = await api.request('POST', '/auth/register', { body: { name: 'A', email: 'bad', phone: 'x' } });
    assert.equal(r.status, 400);
    assert.deepEqual(r.body.details.map((d: { field: string }) => d.field), ['name', 'email', 'phone']);
  });

  it('registers and emails a 6-digit code', async () => {
    const r = await api.request('POST', '/auth/register', {
      body: { name: 'Ada Test', email: EMAIL, phone: '+234 803 000 0000' },
    });
    assert.equal(r.status, 201);
    firstCode = lastLoginCode();
    assert.match(firstCode, /^\d{6}$/);
  });

  it('rejects the same email again, whatever the capitalisation', async () => {
    const r = await api.request('POST', '/auth/register', {
      body: { name: 'Again', email: EMAIL.toUpperCase(), phone: '08030000000' },
    });
    assert.equal(r.status, 409);
  });

  it('allows only one code per minute', async () => {
    const r = await api.request('POST', '/auth/request-code', { body: { email: EMAIL } });
    assert.equal(r.status, 429);
  });

  it('tells unknown emails to register', async () => {
    const r = await api.request('POST', '/auth/request-code', { body: { email: `${P}nobody@example.com` } });
    assert.equal(r.status, 404);
  });

  it('rejects a wrong code', async () => {
    const wrong = firstCode === '000000' ? '111111' : '000000';
    const r = await api.request('POST', '/auth/verify-code', { body: { email: EMAIL, code: wrong } });
    assert.equal(r.status, 400);
  });

  it('signs in with the right code', async () => {
    const r = await api.request('POST', '/auth/verify-code', { body: { email: EMAIL.toLowerCase(), code: firstCode } });
    assert.equal(r.status, 200);
    assert.equal(typeof r.body.token, 'string');
    assert.equal(r.body.user.email, EMAIL.toLowerCase());
    token = r.body.token;
  });

  it('does not accept the same code twice', async () => {
    const r = await api.request('POST', '/auth/verify-code', { body: { email: EMAIL, code: firstCode } });
    assert.equal(r.status, 400);
  });

  it('locks a code after 5 wrong guesses, even if the 6th is right', async () => {
    // Skip the 1-minute wait
    await pool.query(
      "UPDATE login_codes SET created_at = created_at - interval '2 minutes' WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [EMAIL.toLowerCase()],
    );
    assert.equal((await api.request('POST', '/auth/request-code', { body: { email: EMAIL } })).status, 200);
    const code = lastLoginCode();
    const wrong = code === '999999' ? '888888' : '999999';
    for (let i = 0; i < 5; i++) {
      await api.request('POST', '/auth/verify-code', { body: { email: EMAIL, code: wrong } });
    }
    const r = await api.request('POST', '/auth/verify-code', { body: { email: EMAIL, code } });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Too many wrong attempts/);
  });

  it('needs a token for /me', async () => {
    assert.equal((await api.request('GET', '/me')).status, 401);
  });

  it('returns the profile with mid reminders by default', async () => {
    const r = await api.request('GET', '/me', { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.reminderFrequency, 'mid');
    assert.equal(r.body.user.role, 'user');
  });

  it('updates only the fields sent', async () => {
    const r = await api.request('PATCH', '/me', { token, body: { reminderFrequency: 'high' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.reminderFrequency, 'high');
    assert.equal(r.body.user.name, 'Ada Test');
  });

  it('rejects an invalid reminder frequency', async () => {
    const r = await api.request('PATCH', '/me', { token, body: { reminderFrequency: 'sometimes' } });
    assert.equal(r.status, 400);
  });

  it('rejects a malformed JSON body with 400, not 500', async () => {
    const r = await api.request('POST', '/auth/request-code', { rawBody: '{"email": ' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'The request body is not valid JSON');
  });

  it('make-admin promotes an existing user and rejects unknown emails', async () => {
    const admin = await makeAdmin(EMAIL);
    assert.equal(admin.role, 'admin');
    assert.equal((await api.request('GET', '/me', { token })).body.user.role, 'admin');
    await assert.rejects(makeAdmin(`${P}nobody@example.com`), /No user with email/);
  });

  it('health check works', async () => {
    const r = await api.request('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
  });

  it('logout kills the token', async () => {
    assert.equal((await api.request('POST', '/auth/logout', { token, body: {} })).status, 204);
    assert.equal((await api.request('GET', '/me', { token })).status, 401);
  });
});
