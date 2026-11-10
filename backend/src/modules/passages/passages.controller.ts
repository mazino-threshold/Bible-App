import type { Request, Response } from 'express';
import { clearPassageCache } from './commands/clear-passage-cache.command';
import { loadTodayPassage } from './commands/load-today-passage.command';

/** GET /passages/today */
export async function getTodayPassageHandler(_req: Request, res: Response) {
  res.json({ passage: await loadTodayPassage() });
}

/** POST /internal/passage-cache/clear */
export async function clearPassageCacheHandler(_req: Request, res: Response) {
  res.json(await clearPassageCache());
}
