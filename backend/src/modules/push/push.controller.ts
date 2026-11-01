import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { registerPushToken } from './commands/register-push-token.command';
import { removePushToken } from './commands/remove-push-token.command';
import { pushTokenSchema } from './push.schemas';

/** POST /me/push-tokens */
export async function registerPushTokenHandler(req: Request, res: Response) {
  await registerPushToken(currentUser(req).id, pushTokenSchema.parse(req.body));
  res.status(204).end();
}

/** DELETE /me/push-tokens */
export async function removePushTokenHandler(req: Request, res: Response) {
  await removePushToken(currentUser(req).id, pushTokenSchema.parse(req.body));
  res.status(204).end();
}
