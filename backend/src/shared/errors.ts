import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

/** Which input field an error is about, in the same shape as validation errors. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Throw this from anywhere to send a specific status code and message to the app.
 * Pass details when the error is about a particular field, so the app can show it next to that field.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: FieldError[],
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json(err.details ? { error: err.message, details: err.details } : { error: err.message });
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
