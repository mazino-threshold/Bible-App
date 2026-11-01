import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

/** Throw this from anywhere to send a specific status code and message to the app. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  // Errors from express.json(), e.g. a malformed JSON body
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'The request body is not valid JSON' });
    return;
  }

  logger.error('Unhandled error', { requestId: req.id, error: err });
  res.status(500).json({ error: 'Something went wrong', requestId: req.id });
};
