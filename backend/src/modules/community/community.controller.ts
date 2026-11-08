import type { Request, Response } from 'express';
import { listCommunityLinks } from './queries/list-community-links.query';

/** GET /community */
export async function listCommunityLinksHandler(_req: Request, res: Response) {
  res.json({ links: await listCommunityLinks() });
}
