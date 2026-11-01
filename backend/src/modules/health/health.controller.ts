import type { Request, Response } from 'express';
import { getHealth } from './queries/get-health.query';

/** GET /health: quick check that the API is up and can reach the database */
export async function healthHandler(_req: Request, res: Response) {
  res.json(await getHealth());
}
