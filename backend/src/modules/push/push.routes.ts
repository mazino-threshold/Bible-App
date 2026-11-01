import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { registerPushTokenHandler, removePushTokenHandler } from './push.controller';

/** The signed-in user's devices. Mounted at /me/push-tokens */
export const pushTokensRouter = Router();

pushTokensRouter.use(requireAuth);

pushTokensRouter.post('/', registerPushTokenHandler);
pushTokensRouter.delete('/', removePushTokenHandler);
