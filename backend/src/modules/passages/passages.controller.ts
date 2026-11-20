import type { Request, Response } from 'express';
import { purgeDeletedUsers } from '../users/commands/purge-deleted-users.command';
import { clearPassageCache } from './commands/clear-passage-cache.command';
import { loadTodayPassage } from './commands/load-today-passage.command';

/** GET /passages/today */
export async function getTodayPassageHandler(_req: Request, res: Response) {
  res.json({ passage: await loadTodayPassage() });
}

/** POST /internal/passage-cache/clear */
export async function clearPassageCacheHandler(_req: Request, res: Response) {
  const result = await clearPassageCache();
  // Covers Sundays, when the reminders cron job doesn't call in
  await purgeDeletedUsers();
  res.json(result);
}
