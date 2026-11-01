import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { updateProfile } from './commands/update-profile.command';
import { getProfile } from './queries/get-profile.query';
import { updateProfileSchema } from './users.schemas';

/** GET /me */
export async function getMeHandler(req: Request, res: Response) {
  const user = await getProfile(currentUser(req).id);
  res.json({ user });
}

/** PATCH /me */
export async function updateMeHandler(req: Request, res: Response) {
  const user = await updateProfile(currentUser(req).id, updateProfileSchema.parse(req.body));
  res.json({ user });
}
