import { db } from '../../../db/pool';

/** Throws if the database can't be reached. */
export async function pingDatabase(): Promise<void> {
  await db.query('SELECT 1');
}
