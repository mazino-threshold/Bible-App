import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { deactivateUser } from './commands/deactivate-user.command';
import { deleteMyAccount } from './commands/delete-my-account.command';
import { deleteUser } from './commands/delete-user.command';
import { restoreDeletedUser } from './commands/restore-deleted-user.command';
import { setRole } from './commands/set-role.command';
import { reactivateUser } from './commands/reactivate-user.command';
import { updateProfile } from './commands/update-profile.command';
import { getProfile } from './queries/get-profile.query';
import { listDeletedUsers } from './queries/list-deleted-users.query';
import { listUsers } from './queries/list-users.query';
import {
  listUsersSchema,
  roleChangeSchema,
  statusChangeSchema,
  updateProfileSchema,
  userIdParams,
} from './users.schemas';

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

/** DELETE /me */
export async function deleteMeHandler(req: Request, res: Response) {
  const deletion = await deleteMyAccount(currentUser(req).id, statusChangeSchema.parse(req.body ?? {}));
  res.json({ deletion });
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

/** DELETE /admin/users/:id */
export async function deleteUserHandler(req: Request, res: Response) {
  const { id } = userIdParams.parse(req.params);
  const user = await deleteUser(id, statusChangeSchema.parse(req.body ?? {}), currentUser(req).id);
  res.json({ user });
}

/** POST /admin/users/:id/reactivate */
export async function reactivateUserHandler(req: Request, res: Response) {
  const { id } = userIdParams.parse(req.params);
  const user = await reactivateUser(id, statusChangeSchema.parse(req.body ?? {}), currentUser(req).id);
  res.json({ user });
}

/** PUT /admin/users/:id/role */
export async function setRoleHandler(req: Request, res: Response) {
  const { id } = userIdParams.parse(req.params);
  const user = await setRole(id, roleChangeSchema.parse(req.body ?? {}), currentUser(req).id);
  res.json({ user });
}

/** GET /admin/deleted-users */
export async function listDeletedUsersHandler(_req: Request, res: Response) {
  res.json({ users: await listDeletedUsers() });
}

/** POST /admin/deleted-users/:id/restore */
export async function restoreDeletedUserHandler(req: Request, res: Response) {
  const { id } = userIdParams.parse(req.params);
  res.json({ user: await restoreDeletedUser(id, currentUser(req).id) });
}
