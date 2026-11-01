import { Pool, types } from 'pg';
import { env } from '../config/env';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
// A JS Date would shift the day depending on the server's time zone.
types.setTypeParser(types.builtins.DATE, (value) => value);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  // Neon sleeps when idle, so allow time for it to wake up
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

export const db = {
  query: pool.query.bind(pool),
};
