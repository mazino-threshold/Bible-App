import { Pool, types, type QueryResult, type QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../shared/logger';

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
  logger.error('Unexpected database error', { error: err });
});

// Queries slower than this are logged as warnings. The first query after Neon wakes up is usually slow.
const SLOW_QUERY_MS = 500;

export const db = {
  /** pool.query, plus a log line per query: the SQL (never the values), duration and row count. */
  async query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
    const started = performance.now();
    const sql = text.replace(/\s+/g, ' ').trim().slice(0, 120);
    try {
      const result = await pool.query<R>(text, values);
      const ms = Math.round(performance.now() - started);
      logger.log(ms > SLOW_QUERY_MS ? 'warn' : 'debug', ms > SLOW_QUERY_MS ? `Slow SQL: ${sql}` : `SQL: ${sql}`, {
        ms,
        rows: result.rowCount,
      });
      return result;
    } catch (err) {
      // debug, not error: some failures are expected and handled (e.g. a duplicate email on register).
      // Unhandled ones are logged as errors by the error handler.
      logger.debug(`SQL failed: ${sql}`, {
        ms: Math.round(performance.now() - started),
        code: (err as { code?: string }).code,
      });
      throw err;
    }
  },
};
