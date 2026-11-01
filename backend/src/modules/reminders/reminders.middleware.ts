import type { RequestHandler } from 'express';
import { env } from '../../config/env';
import { HttpError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { hashesMatch, sha256 } from '../../shared/tokens';

/**
 * Only lets the cron job in: it must send the X-Cron-Secret header matching CRON_SECRET.
 * In development with no CRON_SECRET set, anyone may call it so you can test easily.
 */
export const requireCronSecret: RequestHandler = (req, _res, next) => {
  if (!env.CRON_SECRET) {
    logger.debug('Cron: no CRON_SECRET set, allowing call (development)');
    next();
    return;
  }

  const sent = req.get('x-cron-secret') ?? '';
  // Compare hashes so the check takes the same time whatever was sent
  if (!hashesMatch(sha256(sent), sha256(env.CRON_SECRET))) {
    logger.warn('Cron: call with a missing or wrong secret');
    throw new HttpError(401, 'Invalid cron secret');
  }
  next();
};
