// Shared helpers for API tests: a running app, HTTP calls, signed-in users, a fake clock, captured logs and a fake Expo.
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after } from 'node:test';
import { Writable } from 'node:stream';
import winston from 'winston';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { logger } from '../../src/shared/logger';
import { setClockForTests } from '../../src/shared/time';

export { pool };

// Close the database connection once every test in the file has finished
after(() => pool.end());

// ---------- Logs ----------
// Logs are kept in memory instead of printed (set TEST_LOGS=1 to see them), so tests can read login codes from them.

const logLines: string[] = [];
if (!process.env.TEST_LOGS) {
  for (const transport of logger.transports) transport.silent = true;
}
logger.add(
  new winston.transports.Stream({
    stream: new Writable({
      write(chunk, _encoding, done) {
        logLines.push(String(chunk));
        done();
      },
    }),
  }),
);

/** The most recent login code "emailed" (printed by EMAIL_PROVIDER=console). */
export function lastLoginCode(): string {
  for (let i = logLines.length - 1; i >= 0; i--) {
    const match = logLines[i]!.match(/sign-in code is (\d{6})/);
    if (match) return match[1]!;
  }
  throw new Error('No login code has been sent');
}

// ---------- Clock ----------

/** Makes the app believe it is this date and time in Nigeria, e.g. setNigeriaTime('2099-01-07', '09:00'). */
export function setNigeriaTime(date: string, time = '09:00'): void {
  const moment = new Date(`${date}T${time}:00+01:00`);
  setClockForTests(() => moment);
}

export function resetClock(): void {
  setClockForTests();
}

// ---------- Fake Expo push service ----------

export interface FakeExpo {
  /** Each call's messages, in order. */
  calls: { to: string; title: string; body: string; data?: Record<string, unknown> }[][];
  /** When true, Expo answers 503 to every call. */
  down: boolean;
  sentTo(): string[];
  reset(): void;
}

const realFetch = globalThis.fetch;

export const fakeExpo: FakeExpo = {
  calls: [],
  down: false,
  sentTo() {
    return this.calls.flat().map((m) => m.to);
  },
  reset() {
    this.calls = [];
    this.down = false;
  },
};

// Any push token containing 'DEAD' is answered like an uninstalled app
globalThis.fetch = async (input, init) => {
  if (String(input).startsWith('https://exp.host/')) {
    const messages = JSON.parse(String(init?.body)) as FakeExpo['calls'][number];
    fakeExpo.calls.push(messages);
    if (fakeExpo.down) return new Response('Service unavailable', { status: 503 });
    const data = messages.map((m) =>
      m.to.includes('DEAD')
        ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: 'fake' },
    );
    return Response.json({ data });
  }
  return realFetch(input, init);
};

// ---------- App + HTTP ----------

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export interface TestApi {
  request<T = any>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      /** Sent exactly as given (as JSON content), e.g. to test a broken body. */
      rawBody?: string;
      token?: string;
      headers?: Record<string, string>;
    },
  ): Promise<ApiResponse<T>>;
  /** Registers and signs in a new user, returning their session token. */
  signUp(email: string, name?: string): Promise<string>;
  close(): Promise<void>;
}

export async function startApi(): Promise<TestApi> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const request: TestApi['request'] = async (method, path, options = {}) => {
    const body = options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined);
    const res = await realFetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  return {
    request,
    async signUp(email, name = 'Test User') {
      const registered = await request('POST', '/auth/register', { body: { name, email, phone: '08030000000' } });
      if (registered.status !== 201) throw new Error(`Register failed: ${JSON.stringify(registered.body)}`);
      const verified = await request('POST', '/auth/verify-code', { body: { email, code: lastLoginCode() } });
      if (verified.status !== 200) throw new Error(`Verify failed: ${JSON.stringify(verified.body)}`);
      return verified.body.token;
    },
    async close() {
      resetClock();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

// ---------- Test data ----------

/** Deletes test users (by email prefix) and everything from 2099 onwards. */
export async function deleteTestData(emailPrefix: string): Promise<void> {
  await pool.query('DELETE FROM users WHERE email LIKE $1', [`${emailPrefix}%`]);
  await pool.query("DELETE FROM readings WHERE reading_date >= '2099-01-01'");
  await pool.query("DELETE FROM reminder_runs WHERE reminder_date >= '2099-01-01'");
}

/** Inserts a user directly (faster than signing up) and returns their id. */
export async function insertUser(
  email: string,
  options: { name?: string; frequency?: string; createdAt?: string } = {},
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, phone, reminder_frequency, created_at)
     VALUES ($1, $2, '08030000000', $3, COALESCE($4::timestamptz, now()))
     RETURNING id`,
    [options.name ?? email, email, options.frequency ?? 'mid', options.createdAt ?? null],
  );
  return rows[0]!.id;
}

export async function userIdByEmail(email: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  return rows[0]!.id;
}

export async function insertReadings(dates: string[]): Promise<void> {
  for (const date of dates) {
    await pool.query('INSERT INTO readings (reading_date, passage) VALUES ($1, $2)', [date, `Passage ${date}`]);
  }
}

export async function insertCheckIns(userId: string, dates: string[]): Promise<void> {
  for (const date of dates) {
    await pool.query('INSERT INTO check_ins (user_id, check_in_date) VALUES ($1, $2)', [userId, date]);
  }
}
