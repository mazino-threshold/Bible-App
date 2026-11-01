import type { Request, Response } from 'express';
import { currentSessionId, currentUser } from './auth.middleware';
import { logoutSchema, registerSchema, requestCodeSchema, verifyCodeSchema } from './auth.schemas';
import { logout } from './commands/logout.command';
import { register } from './commands/register.command';
import { requestCode } from './commands/request-code.command';
import { verifyCode } from './commands/verify-code.command';

/** POST /auth/register */
export async function registerHandler(req: Request, res: Response) {
  await register(registerSchema.parse(req.body));
  res.status(201).json({ message: 'Account created. We sent a 6-digit code to your email' });
}

/** POST /auth/request-code */
export async function requestCodeHandler(req: Request, res: Response) {
  await requestCode(requestCodeSchema.parse(req.body));
  res.json({ message: 'We sent a 6-digit code to your email' });
}

/** POST /auth/verify-code */
export async function verifyCodeHandler(req: Request, res: Response) {
  const result = await verifyCode(verifyCodeSchema.parse(req.body));
  res.json(result);
}

/** POST /auth/logout */
export async function logoutHandler(req: Request, res: Response) {
  await logout(currentSessionId(req), currentUser(req).id, logoutSchema.parse(req.body ?? {}));
  res.status(204).end();
}
