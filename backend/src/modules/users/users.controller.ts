import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { deactivateUser } from './commands/deactivate-user.command';
import { reactivateUser } from './commands/reactivate-user.command';
import { updateProfile } from './commands/update-profile.command';
import { getProfile } from './queries/get-profile.query';
import { listUsers } from './queries/list-users.query';
import { listUsersSchema, statusChangeSchema, updateProfileSchema, userIdParams } from './users.schemas';

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

/** GET /admin/users */
export async function listUsersHandler(req: Request, res: Response) {
  res.json({ users: await listUsers(listUsersSchema.parse(req.query)) });
}

/** POST /admin/users/:id/deactivate */
export async function deactivateUserHandler(req: Request, res: Response) {
  const { id } = userIdParams.parse(req.params);
  const user = await deactivateUser(id, statusChangeSchema.parse(req.body ?? {}), currentUser(req).id);
  res.json({ user });
}

/** POST /admin/users/:id/reactivate */
export async function reactivateUserHandler(req: Request, res: Response) {
  const { id } = userIdParams.parse(req.params);
  const user = await reactivateUser(id, statusChangeSchema.parse(req.body ?? {}), currentUser(req).id);
  res.json({ user });
}
