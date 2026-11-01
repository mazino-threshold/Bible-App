import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from './logger';
import { runWithRequestContext } from './request-context';

/**
 * Gives every request an id (sent back as X-Request-Id), makes it available to every log line
 * written during the request, and logs one line when it finishes: method, path, status and duration.
 * Bodies, tokens and codes are never logged.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const started = process.hrtime.bigint();
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const path = req.originalUrl.split('?')[0];
  const isHealthCheck = path === '/health';

  runWithRequestContext({ requestId: req.id }, () => {
    logger.log(isHealthCheck ? 'debug' : 'http', `→ ${req.method} ${path}`);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      const status = res.statusCode;
      // Health checks are frequent and boring; keep them out of normal logs
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : isHealthCheck ? 'debug' : 'info';

      // Passed explicitly: 'finish' isn't guaranteed to run inside the request's context
      logger.log(level, `← ${req.method} ${path} ${status} ${durationMs.toFixed(0)}ms`, {
        requestId: req.id,
        userId: req.user?.id,
      });
    });

    next();
  });
};
