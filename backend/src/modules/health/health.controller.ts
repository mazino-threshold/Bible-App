import type { Request, Response } from 'express';
import { getHealth } from './queries/get-health.query';

/** GET /health: quick check that the API is up and can reach the database */
export async function healthHandler(_req: Request, res: Response) {
  res.json(await getHealth());
}

/**
 * GET /health/live: the server is up. Never touches the database, so the keep-alive cron job can call it every few
 * minutes to stop Render's free plan putting the server to sleep, while Neon is still free to sleep when idle.
 */
export function liveHandler(_req: Request, res: Response) {
  res.json({ status: 'ok' });
}
