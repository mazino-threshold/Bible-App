import type { Request, RequestHandler } from 'express';
import { HttpError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { setContextUser } from '../../shared/request-context';
import type { UserRow } from '../users/users.types';
import { touchSession } from './data/auth.writes';
import { getSessionUser } from './queries/get-session-user.query';

/** Requires an 'Authorization: Bearer <token>' header from a signed-in device. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    logger.debug('Auth: no bearer token');
    throw new HttpError(401, 'Please sign in');
  }

  const session = await getSessionUser(token);
  if (!session) {
    logger.warn('Auth: unknown or expired session token');
    throw new HttpError(401, 'Your session has expired. Please sign in again');
  }

  req.user = session.user;
  req.sessionId = session.sessionId;
  // Every log line from here to the end of the request will include this user
  setContextUser(session.user.id);
  logger.debug('Auth: signed in', { role: session.user.role, sessionId: session.sessionId });

  await touchSession(session.sessionId);

  next();
};

/** Use after requireAuth. Only lets admins through. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') {
    logger.warn('Auth: non-admin tried an admin endpoint', { path: req.originalUrl });
    throw new HttpError(403, 'Only admins can do this');
  }
  next();
};

/** The signed-in user. Only call in routes behind requireAuth. */
export function currentUser(req: Request): UserRow {
  if (!req.user) {
    throw new HttpError(401, 'Please sign in');
  }
  return req.user;
}

/** The current session id. Only call in routes behind requireAuth. */
export function currentSessionId(req: Request): string {
  if (!req.sessionId) {
    throw new HttpError(401, 'Please sign in');
  }
  return req.sessionId;
}
