import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { logoutHandler, registerHandler, requestCodeHandler, verifyCodeHandler } from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRouter = Router();

// Per-IP limit. Generous, because a whole church may share one Wi-Fi network.
// The per-user limits on login codes do the real protecting.
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a few minutes' },
  }),
);

authRouter.post('/register', registerHandler);
authRouter.post('/request-code', requestCodeHandler);
authRouter.post('/verify-code', verifyCodeHandler);
authRouter.post('/logout', requireAuth, logoutHandler);
