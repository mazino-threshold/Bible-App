import type { UserRow } from '../modules/users/users.types';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth for signed-in requests. */
      user?: UserRow;
      sessionId?: string;
    }
  }
}

export {};
